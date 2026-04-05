import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import type { CalculationResult } from '@/lib/calculator';

interface ResultsDisplayProps {
  result: CalculationResult;
}

export function ResultsDisplay({ result }: ResultsDisplayProps) {
  const costs = [
    { label: 'Material', value: result.totalMaterialCost, color: 'bg-chart-material' },
    { label: 'Electricidad', value: result.totalElectricityCost, color: 'bg-chart-electricity' },
    { label: 'Fallas', value: result.totalFailureCost, color: 'bg-chart-failure' },
    ...(result.totalDepreciationCost > 0 ? [{ label: 'Depreciación', value: result.totalDepreciationCost, color: 'bg-muted-foreground' }] : []),
    ...(result.totalLaborCost > 0 ? [{ label: 'Mano de obra', value: result.totalLaborCost, color: 'bg-chart-consumables' }] : []),
    ...(result.consumablesCost > 0 ? [{ label: 'Insumos', value: result.consumablesCost, color: 'bg-accent' }] : []),
  ];
  const maxCost = Math.max(...costs.map(c => c.value), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Cost breakdown bar chart */}
      <div className="result-card">
        <h3 className="section-title mb-4">Desglose de costos</h3>
        <div className="space-y-3">
          {costs.map((c) => (
            <div key={c.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-medium text-foreground">$ {c.value.toFixed(0)}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={`cost-bar ${c.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.value / maxCost) * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per piece costs */}
      <div className="result-card">
        <h3 className="section-title mb-3">Costos por pieza</h3>
        <div className="space-y-2">
          <Row label="Material" value={result.materialCostPerPiece} />
          <Row label="Electricidad" value={result.electricityCostPerPiece} />
          <Row label="Fallas" value={result.failureCostPerPiece} />
          {result.depreciationCostPerPiece > 0 && <Row label="Depreciación" value={result.depreciationCostPerPiece} />}
          {result.laborCostPerPiece > 0 && <Row label="Mano de obra" value={result.laborCostPerPiece} />}
          <div className="border-t border-border pt-2">
            <Row label="Costo total/pieza" value={result.baseCostPerPiece} bold />
          </div>
        </div>
      </div>

      {/* Final price */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-primary/10 rounded-xl p-5 border border-primary/20"
      >
        <h3 className="section-title text-primary mb-3">Precio final</h3>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="font-display font-semibold text-foreground">
              {result.pieceQuantity} {result.pieceQuantity > 1 ? 'piezas' : 'pieza'}
            </span>
            <span className="font-display font-bold text-2xl text-primary">
              $ {result.totalToCharge.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {result.pieceQuantity > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Por pieza</span>
              <span className="font-display font-semibold text-foreground">
                $ {(result.totalToCharge / result.pieceQuantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {result.includeMercadoLibre && result.mlCommission && (
            <p className="text-xs text-muted-foreground mt-1">
              Incluye comisión ML ({result.mlCommission}%)
            </p>
          )}
          {result.shippingCost > 0 && (
            <p className="text-xs text-muted-foreground">
              Incluye envío ($ {result.shippingCost.toFixed(0)})
            </p>
          )}
        </div>
      </motion.div>

      {/* Info note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground/80 italic px-1">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Los datos se obtienen del archivo sliceado/laminado. Si los valores no son correctos, verificá la configuración del slicer antes de exportar.</span>
      </div>
    </motion.div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-display font-semibold text-foreground' : 'text-foreground'}`}>
        $ {value.toFixed(2)}
      </span>
    </div>
  );
}
