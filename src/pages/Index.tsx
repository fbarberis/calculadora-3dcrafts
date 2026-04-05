import { useState, useCallback } from 'react';
import { GcodeDropZone } from '@/components/GcodeDropZone';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { SavedCalculations } from '@/components/SavedCalculations';
import { formatTime, parseTimeString, type GcodeInfo } from '@/lib/gcodeParser';
import { calculate, materialPresets, type CalculationResult } from '@/lib/calculator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Printer, Zap, Package, TrendingUp } from 'lucide-react';

const Index = () => {
  const [budgetName, setBudgetName] = useState('');
  const [materialCostPerKg, setMaterialCostPerKg] = useState(19000);
  const [materialWeight, setMaterialWeight] = useState(0);
  const [printTime, setPrintTime] = useState('00:00:00');
  const [printerWattage, setPrinterWattage] = useState(120);
  const [electricityRate, setElectricityRate] = useState(450);
  const [consumablesCost, setConsumablesCost] = useState(0);
  const [errorMargin, setErrorMargin] = useState(10);
  const [profitMargin, setProfitMargin] = useState(400);
  const [pieceQuantity, setPieceQuantity] = useState(1);
  const [quantityEnabled, setQuantityEnabled] = useState(false);
  const [includeMercadoLibre, setIncludeMercadoLibre] = useState(false);
  const [mlCommission, setMlCommission] = useState(13);
  const [shippingCost, setShippingCost] = useState(0);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [savedCalcs, setSavedCalcs] = useState<CalculationResult[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('savedCalculations') || '[]');
    } catch { return []; }
  });

  const handleGcodeParsed = useCallback((info: GcodeInfo) => {
    if (info.printTime > 0) setPrintTime(formatTime(info.printTime));
    if (info.filamentWeight > 0) setMaterialWeight(parseFloat(info.filamentWeight.toFixed(2)));
    if (info.fileName) setBudgetName(info.fileName);
    if (info.pieceCount > 1) {
      setQuantityEnabled(true);
      setPieceQuantity(info.pieceCount);
    }
  }, []);

  const loadPreset = (key: string) => {
    const p = materialPresets[key];
    if (p) {
      setMaterialCostPerKg(p.cost);
      setPrinterWattage(p.printerWattage);
      setErrorMargin(p.errorMargin);
    }
  };

  const handleCalculate = () => {
    const seconds = parseTimeString(printTime);
    if (!seconds && !materialWeight) return;

    const res = calculate({
      budgetName,
      materialCostPerKg,
      materialWeight,
      printTimeSeconds: seconds,
      printerWattage,
      electricityRate,
      consumablesCost,
      errorMargin,
      profitMargin,
      pieceQuantity: quantityEnabled ? pieceQuantity : 1,
      includeMercadoLibre,
      mlCommission,
      shippingCost,
    });

    setResult(res);
    const updated = [...savedCalcs, res];
    setSavedCalcs(updated);
    localStorage.setItem('savedCalculations', JSON.stringify(updated));
  };

  const clearSaved = () => {
    setSavedCalcs([]);
    localStorage.removeItem('savedCalculations');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-3xl py-4 flex items-center gap-3">
          <Printer className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-display font-bold text-foreground">
            Calculadora de Costos 3D
          </h1>
        </div>
      </header>

      <main className="container max-w-3xl py-6 space-y-6">
        {/* GCode Drop */}
        <GcodeDropZone onGcodeParsed={handleGcodeParsed} />

        {/* Form */}
        <div className="result-card space-y-5">
          {/* Budget name */}
          <Field label="Nombre del presupuesto">
            <Input value={budgetName} onChange={e => setBudgetName(e.target.value)} placeholder="Mi impresión" />
          </Field>

          {/* Material presets */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">Material</Label>
            <div className="flex gap-2">
              {Object.entries(materialPresets).map(([key, p]) => (
                <Button key={key} variant="outline" size="sm" onClick={() => loadPreset(key)}>
                  {p.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Cost & Weight row */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Costo material (ARS$/kg)" icon={<Package className="h-4 w-4" />}>
              <Input type="number" value={materialCostPerKg} onChange={e => setMaterialCostPerKg(Number(e.target.value))} />
            </Field>
            <Field label="Peso del material (g)">
              <Input type="number" value={materialWeight || ''} onChange={e => setMaterialWeight(Number(e.target.value))} placeholder="0" />
            </Field>
          </div>

          {/* Time & Wattage */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tiempo de impresión (HH:MM:SS)">
              <Input value={printTime} onChange={e => setPrintTime(e.target.value)} placeholder="00:00:00" />
            </Field>
            <Field label="Consumo impresora (watts)" icon={<Zap className="h-4 w-4" />}>
              <Input type="number" value={printerWattage} onChange={e => setPrinterWattage(Number(e.target.value))} />
            </Field>
          </div>

          {/* Electricity & Consumables */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Costo electricidad (ARS$/kWh)">
              <Input type="number" value={electricityRate} onChange={e => setElectricityRate(Number(e.target.value))} />
            </Field>
            <Field label="Costo insumos (ARS$)">
              <Input type="number" value={consumablesCost || ''} onChange={e => setConsumablesCost(Number(e.target.value))} placeholder="0" />
            </Field>
          </div>

          {/* Margins */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Margen de error (%)">
              <Input type="number" value={errorMargin} onChange={e => setErrorMargin(Number(e.target.value))} />
            </Field>
            <Field label="Margen de ganancia (%)" icon={<TrendingUp className="h-4 w-4" />}>
              <Input type="number" value={profitMargin} onChange={e => setProfitMargin(Number(e.target.value))} />
            </Field>
          </div>

          {/* Separator */}
          <div className="border-t border-border" />

          {/* MercadoLibre */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">Incluir costos de MercadoLibre</Label>
              <Switch checked={includeMercadoLibre} onCheckedChange={setIncludeMercadoLibre} />
            </div>
            {includeMercadoLibre && (
              <div className="grid grid-cols-2 gap-4 animate-fade-in">
                <Field label="Comisión ML (%)">
                  <Input type="number" value={mlCommission} onChange={e => setMlCommission(Number(e.target.value))} />
                </Field>
                <Field label="Costo de envío (ARS$)">
                  <Input type="number" value={shippingCost || ''} onChange={e => setShippingCost(Number(e.target.value))} placeholder="0" />
                </Field>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-border" />

          {/* Quantity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">Calcular por cantidad de piezas</Label>
              <Switch checked={quantityEnabled} onCheckedChange={setQuantityEnabled} />
            </div>
            {quantityEnabled && (
              <div className="animate-fade-in">
                <Field label="Cantidad de piezas">
                  <Input type="number" min={1} value={pieceQuantity} onChange={e => setPieceQuantity(Number(e.target.value))} />
                </Field>
              </div>
            )}
          </div>

          {/* Calculate button */}
          <Button className="w-full" size="lg" onClick={handleCalculate}>
            Calcular
          </Button>
        </div>

        {/* Results */}
        {result && <ResultsDisplay result={result} />}

        {/* Saved */}
        <SavedCalculations calculations={savedCalcs} onClear={clearSaved} />
      </main>
    </div>
  );
};

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}

export default Index;
