import type { CalculationResult } from '@/lib/calculator';

interface ResultsDisplayProps {
  result: CalculationResult;
}

export function ResultsDisplay({ result }: ResultsDisplayProps) {
  return (
    <div className="result-card animate-fade-in space-y-5">
      <h3 className="text-lg font-display font-semibold text-foreground">Resultados del cálculo</h3>

      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Costos por pieza</h4>
        <div className="space-y-2">
          <Row label="Material" value={result.materialCostPerPiece} />
          <Row label="Electricidad" value={result.electricityCostPerPiece} />
          <Row label="Fallas" value={result.failureCostPerPiece} />
          <div className="border-t border-border pt-2">
            <Row label="Costo total por pieza" value={result.baseCostPerPiece} bold />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">
          Costos totales ({result.pieceQuantity} {result.pieceQuantity > 1 ? 'piezas' : 'pieza'})
        </h4>
        <div className="space-y-2">
          <Row label="Material total" value={result.totalMaterialCost} />
          <Row label="Electricidad total" value={result.totalElectricityCost} />
          <Row label="Fallas total" value={result.totalFailureCost} />
          <div className="border-t border-border pt-2">
            <Row label="Costo total" value={result.totalCost} bold />
          </div>
        </div>
      </div>

      <div className="bg-primary/10 rounded-lg p-4">
        <h4 className="text-sm font-medium text-primary mb-3">Precio final</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-foreground">
              Precio a cobrar ({result.pieceQuantity} {result.pieceQuantity > 1 ? 'piezas' : 'pieza'})
            </span>
            <span className="font-display font-bold text-xl text-primary">
              ARS$ {result.totalToCharge.toFixed(2)}
            </span>
          </div>
          {result.pieceQuantity > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Precio por pieza</span>
              <span className="font-display font-semibold text-foreground">
                ARS$ {(result.totalToCharge / result.pieceQuantity).toFixed(2)}
              </span>
            </div>
          )}
          {result.includeMercadoLibre && result.mlCommission && (
            <p className="text-xs text-muted-foreground mt-1">
              Incluye comisión de MercadoLibre ({result.mlCommission}%)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
      <span className={`text-sm ${bold ? 'font-display font-semibold text-foreground' : 'text-foreground'}`}>
        ARS$ {value.toFixed(2)}
      </span>
    </div>
  );
}
