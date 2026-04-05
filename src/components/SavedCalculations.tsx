import { motion, AnimatePresence } from 'framer-motion';
import type { CalculationResult } from '@/lib/calculator';
import { Trash2, Share2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

interface SavedCalculationsProps {
  calculations: CalculationResult[];
  onDelete: (id: string) => void;
  onClear: () => void;
}

export function SavedCalculations({ calculations, onDelete, onClear }: SavedCalculationsProps) {
  const [search, setSearch] = useState('');

  if (calculations.length === 0) return null;

  const filtered = search
    ? calculations.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : calculations;

  const shareWhatsApp = (calc: CalculationResult) => {
    const pricePerPiece = calc.totalToCharge / calc.pieceQuantity;
    let msg = `🖨️ *Presupuesto: ${calc.name}*\n`;
    msg += `📅 ${calc.date}\n\n`;
    msg += `💰 *Precio total: $ ${calc.totalToCharge.toFixed(2)}*\n`;
    if (calc.pieceQuantity > 1) {
      msg += `📦 Cantidad: ${calc.pieceQuantity} piezas\n`;
      msg += `💵 Por pieza: $ ${pricePerPiece.toFixed(2)}\n`;
    }
    if (calc.includeMercadoLibre) msg += `\n🛒 Incluye comisión MercadoLibre`;
    if (calc.shippingCost > 0) msg += `\n📬 Incluye envío: $ ${calc.shippingCost.toFixed(0)}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    toast.success('Abriendo WhatsApp...');
  };

  return (
    <div className="result-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title">Historial ({calculations.length})</h3>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Limpiar
        </Button>
      </div>

      {calculations.length > 3 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar presupuesto..."
            className="pl-9 pr-8"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      <div className="space-y-2 max-h-80 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {[...filtered].reverse().map((calc) => {
            const pricePerPiece = calc.totalToCharge / calc.pieceQuantity;
            return (
              <motion.div
                key={calc.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="p-3 rounded-lg bg-muted/50 border border-border group hover:border-primary/20 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground truncate">{calc.name}</p>
                    <p className="text-xs text-muted-foreground">{calc.date}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-display font-bold text-foreground">
                      $ {calc.totalToCharge.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                    {calc.pieceQuantity > 1 && (
                      <p className="text-xs text-muted-foreground">$ {pricePerPiece.toFixed(2)} /pieza</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>×{calc.pieceQuantity}</span>
                    <span>·</span>
                    <span>{calc.profitMargin}%</span>
                    {calc.includeMercadoLibre && <><span>·</span><span>ML</span></>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); shareWhatsApp(calc); }}
                      className="p-1.5 rounded-md hover:bg-accent/10 text-accent"
                      title="Compartir por WhatsApp"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(calc.id); }}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && search && (
          <p className="text-sm text-muted-foreground text-center py-4">No se encontraron resultados</p>
        )}
      </div>
    </div>
  );
}
