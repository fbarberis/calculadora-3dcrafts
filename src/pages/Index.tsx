import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GcodeDropZone } from '@/components/GcodeDropZone';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { SavedCalculations } from '@/components/SavedCalculations';
import { formatTime, parseTimeString, type GcodeInfo } from '@/lib/gcodeParser';
import {
  calculate, loadPresets, savePresets, loadCalculations, saveCalculations,
  type CalculationResult, type MaterialPreset,
} from '@/lib/calculator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Printer, Zap, Package, TrendingUp, Moon, Sun,
  Clock, Wrench, Plus, X, DollarSign,
} from 'lucide-react';

const Index = () => {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [presets, setPresets] = useState<MaterialPreset[]>(loadPresets);
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
  // New fields
  const [printerCost, setPrinterCost] = useState(0);
  const [printerLifeHours, setPrinterLifeHours] = useState(5000);
  const [laborHours, setLaborHours] = useState(0);
  const [laborRate, setLaborRate] = useState(5000);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Preset editor
  const [editingPreset, setEditingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [savedCalcs, setSavedCalcs] = useState<CalculationResult[]>(loadCalculations);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const handleGcodeParsed = useCallback((info: GcodeInfo) => {
    if (info.printTime > 0) setPrintTime(formatTime(info.printTime));
    if (info.filamentWeight > 0) setMaterialWeight(parseFloat(info.filamentWeight.toFixed(2)));
    if (info.fileName) setBudgetName(info.fileName);
    if (info.pieceCount > 1) {
      setQuantityEnabled(true);
      setPieceQuantity(info.pieceCount);
    }
  }, []);

  const loadPreset = (p: MaterialPreset) => {
    setMaterialCostPerKg(p.cost);
    setPrinterWattage(p.printerWattage);
    setErrorMargin(p.errorMargin);
    toast.success(`Preset ${p.name} cargado`);
  };

  const addPreset = () => {
    if (!newPresetName.trim()) return;
    const newP: MaterialPreset = {
      id: crypto.randomUUID(),
      name: newPresetName.trim(),
      cost: materialCostPerKg,
      printerWattage,
      errorMargin,
    };
    const updated = [...presets, newP];
    setPresets(updated);
    savePresets(updated);
    setNewPresetName('');
    setEditingPreset(false);
    toast.success(`Preset "${newP.name}" guardado`);
  };

  const removePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    savePresets(updated);
  };

  const handleCalculate = () => {
    const seconds = parseTimeString(printTime);
    if (!seconds && !materialWeight) {
      toast.error('Ingresá tiempo o peso del material');
      return;
    }

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
      printerCost,
      printerLifeHours,
      laborHours,
      laborRate,
    });

    setResult(res);
    const updated = [...savedCalcs, res];
    setSavedCalcs(updated);
    saveCalculations(updated);
    toast.success('Cálculo realizado');
  };

  const deleteCalc = (id: string) => {
    const updated = savedCalcs.filter(c => c.id !== id);
    setSavedCalcs(updated);
    saveCalculations(updated);
  };

  const clearSaved = () => {
    setSavedCalcs([]);
    saveCalculations([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Printer className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground leading-tight">
                Calculadora 3D
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Costos de impresión 3D</p>
            </div>
          </div>
          <button
            onClick={() => setDark(!dark)}
            className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main 2-column layout */}
      <main className="container max-w-7xl py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column: Form (3/5) */}
          <div className="lg:col-span-3 space-y-5">
            <GcodeDropZone onGcodeParsed={handleGcodeParsed} />

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="result-card space-y-5"
            >
              {/* Budget name */}
              <Field label="Nombre del presupuesto" icon={<DollarSign className="h-4 w-4" />}>
                <Input value={budgetName} onChange={e => setBudgetName(e.target.value)} placeholder="Mi impresión" />
              </Field>

              {/* Material presets */}
              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">Material</Label>
                <div className="flex flex-wrap gap-2">
                  {presets.map(p => (
                    <div key={p.id} className="flex items-center gap-0.5 group">
                      <Button variant="outline" size="sm" onClick={() => loadPreset(p)}>
                        {p.name}
                      </Button>
                      {presets.length > 1 && (
                        <button
                          onClick={() => removePreset(p.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all -ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {editingPreset ? (
                    <div className="flex items-center gap-1">
                      <Input
                        className="h-8 w-24 text-xs"
                        placeholder="Nombre"
                        value={newPresetName}
                        onChange={e => setNewPresetName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addPreset()}
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={addPreset} className="h-8 px-2">✓</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingPreset(false)} className="h-8 px-2">✕</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setEditingPreset(true)} className="text-muted-foreground">
                      <Plus className="h-3.5 w-3.5 mr-1" />Agregar
                    </Button>
                  )}
                </div>
              </div>

              {/* Core fields */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Costo material ($/kg)" icon={<Package className="h-4 w-4" />}>
                  <Input type="number" value={materialCostPerKg} onChange={e => setMaterialCostPerKg(Number(e.target.value))} />
                </Field>
                <Field label="Peso del material (g)">
                  <Input type="number" value={materialWeight || ''} onChange={e => setMaterialWeight(Number(e.target.value))} placeholder="0" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Tiempo impresión (HH:MM:SS)" icon={<Clock className="h-4 w-4" />}>
                  <Input value={printTime} onChange={e => setPrintTime(e.target.value)} placeholder="00:00:00" />
                </Field>
                <Field label="Consumo impresora (watts)" icon={<Zap className="h-4 w-4" />}>
                  <Input type="number" value={printerWattage} onChange={e => setPrinterWattage(Number(e.target.value))} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Costo electricidad ($/kWh)">
                  <Input type="number" value={electricityRate} onChange={e => setElectricityRate(Number(e.target.value))} />
                </Field>
                <Field label="Costo insumos ($)">
                  <Input type="number" value={consumablesCost || ''} onChange={e => setConsumablesCost(Number(e.target.value))} placeholder="0" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Margen de error (%)">
                  <Input type="number" value={errorMargin} onChange={e => setErrorMargin(Number(e.target.value))} />
                </Field>
                <Field label="Margen de ganancia (%)" icon={<TrendingUp className="h-4 w-4" />}>
                  <Input type="number" value={profitMargin} onChange={e => setProfitMargin(Number(e.target.value))} />
                </Field>
              </div>

              {/* Advanced toggle */}
              <div className="border-t border-border pt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Wrench className="h-4 w-4" />
                  {showAdvanced ? 'Ocultar opciones avanzadas' : 'Opciones avanzadas'}
                </button>

                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-4"
                  >
                    <p className="section-title">Depreciación de impresora</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Costo de la impresora ($)">
                        <Input type="number" value={printerCost || ''} onChange={e => setPrinterCost(Number(e.target.value))} placeholder="0" />
                      </Field>
                      <Field label="Vida útil estimada (horas)">
                        <Input type="number" value={printerLifeHours} onChange={e => setPrinterLifeHours(Number(e.target.value))} />
                      </Field>
                    </div>

                    <p className="section-title">Mano de obra</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Horas de trabajo">
                        <Input type="number" step="0.5" value={laborHours || ''} onChange={e => setLaborHours(Number(e.target.value))} placeholder="0" />
                      </Field>
                      <Field label="Tarifa por hora ($)">
                        <Input type="number" value={laborRate} onChange={e => setLaborRate(Number(e.target.value))} />
                      </Field>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* MercadoLibre */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">Costos de MercadoLibre</Label>
                  <Switch checked={includeMercadoLibre} onCheckedChange={setIncludeMercadoLibre} />
                </div>
                {includeMercadoLibre && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-4">
                    <Field label="Comisión ML (%)">
                      <Input type="number" value={mlCommission} onChange={e => setMlCommission(Number(e.target.value))} />
                    </Field>
                    <Field label="Costo de envío ($)">
                      <Input type="number" value={shippingCost || ''} onChange={e => setShippingCost(Number(e.target.value))} placeholder="0" />
                    </Field>
                  </motion.div>
                )}
              </div>

              {/* Quantity */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">Cantidad de piezas</Label>
                  <Switch checked={quantityEnabled} onCheckedChange={setQuantityEnabled} />
                </div>
                {quantityEnabled && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Field label="Cantidad">
                      <Input type="number" min={1} value={pieceQuantity} onChange={e => setPieceQuantity(Number(e.target.value))} />
                    </Field>
                  </motion.div>
                )}
              </div>

              {/* Calculate */}
              <Button className="w-full" size="lg" onClick={handleCalculate}>
                Calcular
              </Button>
            </motion.div>
          </div>

          {/* Right column: Results + History (2/5) */}
          <div className="lg:col-span-2 space-y-5">
            {result ? (
              <ResultsDisplay result={result} />
            ) : (
              <div className="result-card flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Los resultados aparecerán aquí
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cargá un archivo o completá el formulario
                </p>
              </div>
            )}

            <SavedCalculations
              calculations={savedCalcs}
              onDelete={deleteCalc}
              onClear={clearSaved}
            />
          </div>
        </div>
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
