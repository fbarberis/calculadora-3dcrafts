import { useCallback, useState } from 'react';
import { parseGcode, type GcodeInfo, getSlicerLabel } from '@/lib/gcodeParser';
import { parse3mf } from '@/lib/threemfParser';
import { Upload, FileText, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface GcodeDropZoneProps {
  onGcodeParsed: (info: GcodeInfo) => void;
}

export function GcodeDropZone({ onGcodeParsed }: GcodeDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedFile, setLoadedFile] = useState<{ name: string; slicer: string; thumbnail?: string } | null>(null);

  const processFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.gcode') && !name.endsWith('.3mf')) {
      toast.error('Solo se aceptan archivos .gcode o .3mf');
      return;
    }
    setIsLoading(true);
    try {
      let info: GcodeInfo;
      let thumbnail: string | undefined;

      if (name.endsWith('.3mf')) {
        const { parse3mfWithThumbnail } = await import('@/lib/threemfParser');
        const result = await parse3mfWithThumbnail(file);
        info = result.info;
        thumbnail = result.thumbnail;
      } else {
        const content = await file.text();
        info = parseGcode(content, file.name);
      }

      setLoadedFile({ name: file.name, slicer: getSlicerLabel(info.slicer), thumbnail });
      onGcodeParsed(info);
      toast.success(`Archivo cargado: ${getSlicerLabel(info.slicer)}`, {
        description: `${info.pieceCount} pieza${info.pieceCount > 1 ? 's' : ''} detectada${info.pieceCount > 1 ? 's' : ''}`,
      });
    } catch (err) {
      console.error('Error processing file:', err);
      toast.error(err instanceof Error ? err.message : 'Error al procesar el archivo');
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
        accept=".gcode,.3mf"
        className="hidden"
        onChange={handleFileInput}
      />
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Analizando archivo...</p>
        </div>
      ) : loadedFile ? (
        <div className="flex items-center gap-4 py-2">
          {loadedFile.thumbnail ? (
            <img src={loadedFile.thumbnail} alt="Preview" className="h-16 w-16 rounded-lg object-cover border border-border" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
              <FileText className="h-8 w-8 text-primary" />
            </div>
          )}
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{loadedFile.name}</p>
            <span className="slicer-badge bg-primary/10 text-primary mt-1">
              {loadedFile.slicer}
            </span>
            <p className="text-xs text-muted-foreground mt-1">Clic o arrastra otro archivo para reemplazar</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-4">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Arrastra tu archivo .gcode o .3mf aquí</p>
            <p className="text-xs text-muted-foreground mt-1">
              PrusaSlicer · Bambu Studio · OrcaSlicer · Anycubic · Cura
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
