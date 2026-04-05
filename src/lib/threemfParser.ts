import JSZip from 'jszip';
import { parseGcode, type GcodeInfo } from './gcodeParser';

/**
 * Parse a .3mf file (ZIP archive) looking for embedded gcode or slicer metadata.
 * 
 * 3MF files from slicers typically contain:
 * - BambuStudio/OrcaSlicer: Metadata/plate_X.gcode inside the ZIP
 * - PrusaSlicer: Metadata/Slic3r_PE.config + embedded gcode
 * - Also: Metadata/slice_info.config, project settings, etc.
 */
export async function parse3mf(file: File): Promise<GcodeInfo> {
  const zip = await JSZip.loadAsync(file);
  
  // 1. Look for embedded gcode files (most reliable)
  const gcodeFiles: string[] = [];
  const configFiles: string[] = [];
  const allFiles: string[] = [];

  zip.forEach((relativePath) => {
    allFiles.push(relativePath);
    if (relativePath.toLowerCase().endsWith('.gcode')) {
      gcodeFiles.push(relativePath);
    }
    if (relativePath.toLowerCase().includes('config') || 
        relativePath.toLowerCase().includes('metadata')) {
      configFiles.push(relativePath);
    }
  });

  console.log('3MF contents:', allFiles);

  // Try parsing embedded gcode first
  if (gcodeFiles.length > 0) {
    // Sort to prefer plate_1.gcode or similar
    gcodeFiles.sort();
    const gcodeContent = await zip.file(gcodeFiles[0])?.async('string');
    if (gcodeContent) {
      const info = parseGcode(gcodeContent, file.name.replace(/\.3mf$/i, ''));
      if (info.printTime > 0 || info.filamentWeight > 0) {
        return info;
      }
    }
  }

  // 2. Try parsing metadata/config files for slicer info
  const info: GcodeInfo = {
    fileName: file.name.replace(/\.3mf$/i, ''),
    printTime: 0,
    filamentWeight: 0,
    pieceCount: 1,
    slicer: 'unknown',
  };

  // Look for Slic3r_PE config (PrusaSlicer)
  for (const path of configFiles) {
    const content = await zip.file(path)?.async('string');
    if (!content) continue;

    // Detect slicer from config
    if (content.includes('PrusaSlicer') || content.includes('Slic3r')) {
      info.slicer = 'prusaslicer';
    } else if (content.includes('BambuStudio') || content.includes('Bambu Studio')) {
      info.slicer = 'bambustudio';
    } else if (content.includes('OrcaSlicer') || content.includes('Orca')) {
      info.slicer = 'orcaslicer';
    }

    // Try to extract print time and filament from config/metadata
    const lines = content.split('\n');
    for (const line of lines) {
      // estimated printing time
      if (line.includes('estimated_printing_time') || line.includes('estimated printing time')) {
        const match = line.match(/[=:>"]\s*(.+?)["<\n]/);
        if (match) {
          const timeStr = match[1];
          let total = 0;
          const h = timeStr.match(/(\d+)\s*h/);
          const m = timeStr.match(/(\d+)\s*m/);
          const s = timeStr.match(/(\d+)\s*s/);
          if (h) total += parseInt(h[1]) * 3600;
          if (m) total += parseInt(m[1]) * 60;
          if (s) total += parseInt(s[1]);
          if (total > 0) info.printTime = total;
        }
      }

      // filament used weight
      if (line.includes('filament used [g]') || line.includes('filament_used_g') || line.includes('total_filament_weight')) {
        const match = line.match(/[=:>"]\s*([\d.,]+)/);
        if (match) {
          const values = match[1].split(',').map(v => parseFloat(v.trim()));
          const weight = values.reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0);
          if (weight > 0) info.filamentWeight = weight;
        }
      }
    }
  }

  // 3. Try parsing slice_info.config or project_settings XML for Bambu/Orca
  for (const path of allFiles) {
    if (!path.toLowerCase().includes('slice_info') && !path.toLowerCase().includes('project_settings')) continue;
    const content = await zip.file(path)?.async('string');
    if (!content) continue;

    // XML-based: look for prediction, weight attributes
    // <plate> <prediction normal="3600" /> <filament used_g="12.5" />
    const predictionMatch = content.match(/prediction[^>]*normal\s*=\s*"(\d+)"/);
    if (predictionMatch && info.printTime === 0) {
      info.printTime = parseInt(predictionMatch[1]);
    }

    const weightMatch = content.match(/used_g\s*=\s*"([\d.]+)"/);
    if (weightMatch && info.filamentWeight === 0) {
      info.filamentWeight = parseFloat(weightMatch[1]);
    }

    // Also check for filament_used_g or weight in attributes
    const weightMatch2 = content.match(/filament_used_g\s*=\s*"([\d.]+)"/);
    if (weightMatch2 && info.filamentWeight === 0) {
      info.filamentWeight = parseFloat(weightMatch2[1]);
    }
  }

  if (info.printTime === 0 && info.filamentWeight === 0) {
    throw new Error('No se encontró información de impresión en el archivo .3mf. Asegurate de que el archivo fue generado por un slicer (no es un modelo 3D sin slicear).');
  }

  return info;
}
