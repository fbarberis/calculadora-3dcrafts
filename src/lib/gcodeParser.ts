export type SlicerType = 'prusaslicer' | 'bambustudio' | 'orcaslicer' | 'anycubic' | 'cura' | 'unknown';

export interface GcodeInfo {
  fileName: string;
  printTime: number; // seconds
  filamentWeight: number; // grams
  pieceCount: number;
  slicer: SlicerType;
}

function detectSlicer(content: string): SlicerType {
  const lower = content.substring(0, 5000).toLowerCase();
  
  if (lower.includes('bambustudio') || lower.includes('bambu studio')) return 'bambustudio';
  if (lower.includes('orcaslicer') || lower.includes('orca slicer')) return 'orcaslicer';
  if (lower.includes('prusaslicer') || lower.includes('prusa slicer')) return 'prusaslicer';
  if (lower.includes('anycubic') || lower.includes('source_info')) return 'anycubic';
  if (lower.includes('cura') || lower.includes(';generated with')) return 'cura';
  
  // Fallback detection by comment patterns
  if (content.includes('estimated printing time')) return 'prusaslicer';
  if (content.includes(';TIME:')) return 'cura';
  
  return 'unknown';
}

// Parse time formats like "1h 23m 45s", "1h 23m", "45m 30s", etc.
function parseHMS(timeStr: string): number {
  let total = 0;
  const h = timeStr.match(/(\d+)\s*h/);
  const m = timeStr.match(/(\d+)\s*m/);
  const s = timeStr.match(/(\d+)\s*s/);
  if (h) total += parseInt(h[1]) * 3600;
  if (m) total += parseInt(m[1]) * 60;
  if (s) total += parseInt(s[1]);
  return total;
}

function parsePrusaLike(lines: string[], info: GcodeInfo): void {
  for (const line of lines) {
    // Time: "; estimated printing time (normal mode) = 1h 23m 45s"
    if (line.includes('estimated printing time') && info.printTime === 0) {
      const match = line.match(/=\s*(.+)/);
      if (match) {
        info.printTime = parseHMS(match[1]);
      }
    }

    // Filament weight: "; filament used [g] = 12.34"
    if (line.includes('filament used [g]') && info.filamentWeight === 0) {
      const match = line.match(/=\s*(.+)/);
      if (match) {
        const values = match[1].split(',').map(v => parseFloat(v.trim()));
        info.filamentWeight = values.reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0);
      }
    }

    // Filament from mm (convert: ~1.24g per meter for 1.75mm PLA at ~1.24 g/cm³)
    if (line.includes('filament used [mm]') && info.filamentWeight === 0) {
      const match = line.match(/=\s*(.+)/);
      if (match) {
        const values = match[1].split(',').map(v => parseFloat(v.trim()));
        const totalMM = values.reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0);
        // Approximate: pi * (1.75/2)^2 * length_mm * density(1.24g/cm³) / 1000
        info.filamentWeight = Math.round(totalMM * 0.002985 * 100) / 100;
      }
    }

    // File name from input_filename
    if (line.includes('input_filename') && !info.fileName) {
      const match = line.match(/=\s*(.+)/);
      if (match) {
        info.fileName = match[1].trim().replace(/\.stl$/i, '').replace(/\.3mf$/i, '');
      }
    }
  }
}

function parseAnycubic(lines: string[], info: GcodeInfo): void {
  // First try Prusa-like patterns (Anycubic Next uses some)
  parsePrusaLike(lines, info);

  for (const line of lines) {
    // source_info JSON with model names and count
    if (line.includes('source_info') && !info.fileName) {
      try {
        const jsonStr = line.split('source_info:')[1];
        if (jsonStr) {
          const sourceInfo = JSON.parse(jsonStr);
          if (sourceInfo.models && sourceInfo.models.length > 0) {
            info.fileName = sourceInfo.models[0].name.replace(/_id_\d+_copy_\d+$/, '');
            info.pieceCount = sourceInfo.models.length;
          }
        }
      } catch { /* ignore parse errors */ }
    }
  }
}

function parseBambuOrca(lines: string[], info: GcodeInfo): void {
  // BambuStudio and OrcaSlicer are PrusaSlicer forks - share most comment formats
  parsePrusaLike(lines, info);

  for (const line of lines) {
    // BambuStudio specific: "; total layer number: 123"
    // OrcaSlicer: "; model printing time: 1h 23m 45s"
    if (line.includes('model printing time') && info.printTime === 0) {
      const match = line.match(/:\s*(.+)/);
      if (match) {
        info.printTime = parseHMS(match[1]);
      }
    }

    // "; total estimated time: 1h 23m 45s"  
    if (line.includes('total estimated time') && info.printTime === 0) {
      const match = line.match(/[=:]\s*(.+)/);
      if (match) {
        info.printTime = parseHMS(match[1]);
      }
    }

    // BambuStudio: "; filament_density = 1.24"
    // OrcaSlicer: "; filament used [g] = ..." (already handled by parsePrusaLike)

    // Plate/model name
    if ((line.includes('plate_name') || line.includes('model_name')) && !info.fileName) {
      const match = line.match(/[=:]\s*(.+)/);
      if (match) {
        info.fileName = match[1].trim().replace(/\.stl$/i, '').replace(/\.3mf$/i, '');
      }
    }

    // OrcaSlicer: "; total filament weight [g] = 12.34"
    if (line.includes('total filament weight') && info.filamentWeight === 0) {
      const match = line.match(/=\s*(.+)/);
      if (match) {
        info.filamentWeight = parseFloat(match[1].trim()) || 0;
      }
    }
  }
}

function parseCura(lines: string[], info: GcodeInfo): void {
  for (const line of lines) {
    // ";TIME:5400"
    if (line.startsWith(';TIME:') && info.printTime === 0) {
      info.printTime = parseInt(line.split(':')[1]) || 0;
    }

    // ";PRINT.TIME:5400"
    if (line.includes(';PRINT.TIME:') && info.printTime === 0) {
      info.printTime = parseInt(line.split(':')[1]) || 0;
    }

    // ";Filament used: 1.234m"
    if (line.includes('Filament used:') && info.filamentWeight === 0) {
      const match = line.match(/Filament used:\s*([\d.]+)m/);
      if (match) {
        const meters = parseFloat(match[1]);
        // Convert meters to grams (1.75mm PLA ≈ 2.985 g/m)
        info.filamentWeight = Math.round(meters * 2.985 * 100) / 100;
      }
    }

    // ";Filament weight = 12.3"
    if (line.includes('Filament weight') && info.filamentWeight === 0) {
      const match = line.match(/=\s*([\d.]+)/);
      if (match) {
        info.filamentWeight = parseFloat(match[1]) || 0;
      }
    }
  }
}

export function parseGcode(content: string, fileName?: string): GcodeInfo {
  const slicer = detectSlicer(content);
  const lines = content.split('\n').map(l => l.trim());

  const info: GcodeInfo = {
    fileName: fileName?.replace(/\.gcode$/i, '') || '',
    printTime: 0,
    filamentWeight: 0,
    pieceCount: 1,
    slicer,
  };

  switch (slicer) {
    case 'prusaslicer':
      parsePrusaLike(lines, info);
      break;
    case 'bambustudio':
    case 'orcaslicer':
      parseBambuOrca(lines, info);
      break;
    case 'anycubic':
      parseAnycubic(lines, info);
      break;
    case 'cura':
      parseCura(lines, info);
      break;
    default:
      // Try all parsers
      parsePrusaLike(lines, info);
      if (info.printTime === 0 && info.filamentWeight === 0) {
        parseBambuOrca(lines, info);
      }
      if (info.printTime === 0 && info.filamentWeight === 0) {
        parseCura(lines, info);
      }
      if (info.printTime === 0 && info.filamentWeight === 0) {
        parseAnycubic(lines, info);
      }
      break;
  }

  return info;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function parseTimeString(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2}):(\d{2})/);
  if (!match) return 0;
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
}

export function getSlicerLabel(slicer: SlicerType): string {
  const labels: Record<SlicerType, string> = {
    prusaslicer: 'PrusaSlicer',
    bambustudio: 'Bambu Studio',
    orcaslicer: 'OrcaSlicer',
    anycubic: 'Anycubic',
    cura: 'Cura',
    unknown: 'Desconocido',
  };
  return labels[slicer];
}
