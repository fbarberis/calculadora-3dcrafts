import JSZip from 'jszip';
import { parseGcode, type GcodeInfo } from './gcodeParser';

/**
 * Parse a .3mf file (ZIP archive) looking for embedded gcode or slicer metadata.
 */
export async function parse3mf(file: File): Promise<GcodeInfo> {
  const zip = await JSZip.loadAsync(file);

  const gcodeFiles: string[] = [];
  const allFiles: string[] = [];

  zip.forEach((relativePath) => {
    allFiles.push(relativePath);
    if (relativePath.toLowerCase().endsWith('.gcode')) {
      gcodeFiles.push(relativePath);
    }
  });

  console.log('3MF contents:', allFiles);

  const info: GcodeInfo = {
    fileName: file.name.replace(/\.3mf$/i, '').replace(/\.gcode$/i, ''),
    printTime: 0,
    filamentWeight: 0,
    pieceCount: 1,
    slicer: 'unknown',
  };

  // 1. Parse slice_info.config (BambuStudio / OrcaSlicer)
  const sliceInfoFile = allFiles.find(f => f.toLowerCase().includes('slice_info'));
  if (sliceInfoFile) {
    const content = await zip.file(sliceInfoFile)?.async('string');
    if (content) {
      parseSliceInfoConfig(content, info);
    }
  }

  // 2. Parse project_settings.config for slicer detection & extra metadata
  const projectSettingsFile = allFiles.find(f => f.toLowerCase().includes('project_settings'));
  if (projectSettingsFile) {
    const content = await zip.file(projectSettingsFile)?.async('string');
    if (content) {
      if (content.includes('BambuStudio') || content.includes('Bambu Studio')) {
        info.slicer = 'bambustudio';
      } else if (content.includes('OrcaSlicer')) {
        info.slicer = 'orcaslicer';
      } else if (content.includes('PrusaSlicer') || content.includes('Slic3r')) {
        info.slicer = 'prusaslicer';
      }
    }
  }

  // 3. Parse model_settings.config for plate name
  const modelSettingsFile = allFiles.find(f => f.toLowerCase().includes('model_settings.config'));
  if (modelSettingsFile) {
    const content = await zip.file(modelSettingsFile)?.async('string');
    if (content) {
      const nameMatch = content.match(/key\s*=\s*"plater_name"\s+value\s*=\s*"([^"]+)"/);
      if (nameMatch && !info.fileName) {
        info.fileName = nameMatch[1];
      }
    }
  }

  // 4. If we still don't have data, try parsing embedded gcode
  if ((info.printTime === 0 || info.filamentWeight === 0) && gcodeFiles.length > 0) {
    gcodeFiles.sort();
    // Only read first ~50KB of gcode for metadata (comments are at top/bottom)
    const gcodeContent = await zip.file(gcodeFiles[0])?.async('string');
    if (gcodeContent) {
      // Take first 50KB and last 20KB where slicer comments typically live
      const head = gcodeContent.substring(0, 50000);
      const tail = gcodeContent.substring(Math.max(0, gcodeContent.length - 20000));
      const combined = head + '\n' + tail;
      const gcodeInfo = parseGcode(combined, info.fileName);
      if (info.printTime === 0 && gcodeInfo.printTime > 0) info.printTime = gcodeInfo.printTime;
      if (info.filamentWeight === 0 && gcodeInfo.filamentWeight > 0) info.filamentWeight = gcodeInfo.filamentWeight;
      if (info.slicer === 'unknown' && gcodeInfo.slicer !== 'unknown') info.slicer = gcodeInfo.slicer;
      if (gcodeInfo.pieceCount > 1) info.pieceCount = gcodeInfo.pieceCount;
    }
  }

  // 5. Detect slicer from header if still unknown
  if (info.slicer === 'unknown') {
    const contentTypes = await zip.file('[Content_Types].xml')?.async('string');
    if (contentTypes) {
      if (contentTypes.includes('BambuStudio')) info.slicer = 'bambustudio';
      else if (contentTypes.includes('OrcaSlicer')) info.slicer = 'orcaslicer';
    }
    // Check if BBL client header was in slice_info
    if (info.slicer === 'unknown' && sliceInfoFile) {
      const content = await zip.file(sliceInfoFile)?.async('string');
      if (content?.includes('X-BBL-Client')) info.slicer = 'bambustudio';
    }
  }

  if (info.printTime === 0 && info.filamentWeight === 0) {
    throw new Error('No se encontró información de impresión en el archivo .3mf. Asegurate de que el archivo fue sliceado (no es solo un modelo 3D).');
  }

  return info;
}

function parseSliceInfoConfig(content: string, info: GcodeInfo): void {
  // Parse prediction (print time in seconds)
  // <metadata key="prediction" value="17670"/>
  const predictionMatch = content.match(/key\s*=\s*"prediction"\s+value\s*=\s*"(\d+)"/);
  if (predictionMatch) {
    info.printTime = parseInt(predictionMatch[1]);
  }

  // Parse total weight
  // <metadata key="weight" value="90.23"/>
  const weightMatch = content.match(/key\s*=\s*"weight"\s+value\s*=\s*"([\d.]+)"/);
  if (weightMatch) {
    info.filamentWeight = parseFloat(weightMatch[1]);
  }

  // If no total weight, sum from individual filament entries
  // <filament id="1" ... used_g="89.02" .../>
  if (info.filamentWeight === 0) {
    const filamentMatches = content.matchAll(/used_g\s*=\s*"([\d.]+)"/g);
    let total = 0;
    for (const m of filamentMatches) {
      total += parseFloat(m[1]) || 0;
    }
    if (total > 0) info.filamentWeight = Math.round(total * 100) / 100;
  }

  // Count objects on the plate
  const objectMatches = content.matchAll(/<object\s[^>]*name\s*=\s*"[^"]+"/g);
  let objectCount = 0;
  for (const _ of objectMatches) {
    objectCount++;
  }
  if (objectCount > 0) info.pieceCount = objectCount;
}
