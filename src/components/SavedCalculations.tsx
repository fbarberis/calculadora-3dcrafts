import type { CalculationResult } from '@/lib/calculator';
import { Trash2 } from 'lucide-react';

interface SavedCalculationsProps {
  calculations: CalculationResult[];
  onClear: () => void;
}

export function SavedCalculations({ calculations, onClear }: SavedCalculationsProps) {
  if (calculations.length === 0) return null;

  return (
    <div className="result-card animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-semibold text-foreground">Cálculos Previos</h3>
        <button
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
        >
          <Trash2 className="h-3 w-3" />
          Limpiar
        </button>
      </div>
      <div className="space-y-3">
        {[...calculations].reverse().map((calc, i) => {
          const pricePerPiece = calc.totalToCharge / calc.pieceQuantity;
          return (
            <div
              key={i}
              className="p-4 rounded-lg bg-muted/50 border border-border hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm text-foreground">{calc.name}</p>
                  <p className="text-xs text-muted-foreground">{calc.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-foreground">
                    ARS$ {calc.totalToCharge.toFixed(2)}
                  </p>
                  {calc.pieceQuantity > 1 && (
                    <p className="text-xs text-muted-foreground">
                      ARS$ {pricePerPiece.toFixed(2)} /pieza
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <span className="text-xs text-muted-foreground">
                  Cant: {calc.pieceQuantity}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  Margen: {calc.profitMargin}%
                </span>
                {calc.includeMercadoLibre && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">ML</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
