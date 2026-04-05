import { useCallback, useState } from 'react';
import { parseGcode, type GcodeInfo, getSlicerLabel } from '@/lib/gcodeParser';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface GcodeDropZoneProps {
  onGcodeParsed: (info: GcodeInfo) => void;
}

export function GcodeDropZone({ onGcodeParsed }: GcodeDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedFile, setLoadedFile] = useState<{ name: string; slicer: string } | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.gcode')) {
      return;
    }
    setIsLoading(true);
    try {
      const content = await file.text();
      const info = parseGcode(content, file.name);
      setLoadedFile({ name: file.name, slicer: getSlicerLabel(info.slicer) });
      onGcodeParsed(info);
    } catch (error) {
      console.error('Error processing gcode:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onGcodeParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div
      className={`drop-zone ${isDragging ? 'active' : ''}`}
      onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
      onClick={() => document.getElementById('gcode-file-input')?.click()}
    >
      <input
        id="gcode-file-input"
        type="file"
        accept=".gcode"
        className="hidden"
        onChange={handleFileInput}
      />
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Analizando archivo G-code...</p>
        </div>
      ) : loadedFile ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <FileText className="h-10 w-10 text-primary" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{loadedFile.name}</p>
            <span className="slicer-badge bg-primary/10 text-primary mt-2">
              {loadedFile.slicer}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Clic o arrastra otro archivo para reemplazar</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-4">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Arrastra tu archivo .gcode aquí</p>
            <p className="text-xs text-muted-foreground mt-1">
              Compatible con PrusaSlicer, Bambu Studio, OrcaSlicer, Anycubic y Cura
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
