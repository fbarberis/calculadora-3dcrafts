export interface CalculationResult {
  id: string;
  name: string;
  date: string;
  materialCostPerPiece: number;
  electricityCostPerPiece: number;
  failureCostPerPiece: number;
  depreciationCostPerPiece: number;
  laborCostPerPiece: number;
  baseCostPerPiece: number;
  totalMaterialCost: number;
  totalElectricityCost: number;
  totalFailureCost: number;
  totalDepreciationCost: number;
  totalLaborCost: number;
  consumablesCost: number;
  totalCost: number;
  totalToCharge: number;
  pieceQuantity: number;
  profitMargin: number;
  includeMercadoLibre: boolean;
  mlCommission?: number;
  shippingCost: number;
}

export interface MaterialPreset {
  id: string;
  name: string;
  cost: number;
  printerWattage: number;
  errorMargin: number;
}

export const defaultPresets: MaterialPreset[] = [
  { id: 'pla', name: 'PLA', cost: 19000, printerWattage: 120, errorMargin: 10 },
  { id: 'petg', name: 'PETG', cost: 22000, printerWattage: 150, errorMargin: 15 },
  { id: 'abs', name: 'ABS', cost: 20000, printerWattage: 180, errorMargin: 20 },
  { id: 'tpu', name: 'TPU', cost: 28000, printerWattage: 140, errorMargin: 20 },
];

export function loadPresets(): MaterialPreset[] {
  try {
    const saved = localStorage.getItem('materialPresets');
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return defaultPresets;
}

export function savePresets(presets: MaterialPreset[]): void {
  localStorage.setItem('materialPresets', JSON.stringify(presets));
}

export interface CalculateParams {
  budgetName: string;
  materialCostPerKg: number;
  materialWeight: number;
  printTimeSeconds: number;
  printerWattage: number;
  electricityRate: number;
  consumablesCost: number;
  errorMargin: number;
  profitMargin: number;
  pieceQuantity: number;
  includeMercadoLibre: boolean;
  mlCommission: number;
  shippingCost: number;
  // New fields
  printerCost: number;
  printerLifeHours: number;
  laborHours: number;
  laborRate: number;
}

export function calculate(params: CalculateParams): CalculationResult {
  const {
    budgetName, materialCostPerKg, materialWeight, printTimeSeconds,
    printerWattage, electricityRate, consumablesCost, errorMargin, profitMargin,
    pieceQuantity, includeMercadoLibre, mlCommission, shippingCost,
    printerCost, printerLifeHours, laborHours, laborRate,
  } = params;

  const hoursDecimal = printTimeSeconds / 3600;

  const totalMaterialCost = (materialWeight / 1000) * materialCostPerKg;
  const materialCostPerPiece = totalMaterialCost / pieceQuantity;

  const totalElectricityCost = hoursDecimal * (printerWattage / 1000) * electricityRate;
  const electricityCostPerPiece = totalElectricityCost / pieceQuantity;

  const totalFailureCost = (totalMaterialCost + totalElectricityCost) * (errorMargin / 100);
  const failureCostPerPiece = totalFailureCost / pieceQuantity;

  // Depreciation: printer cost / life hours * print hours
  const totalDepreciationCost = printerLifeHours > 0 ? (printerCost / printerLifeHours) * hoursDecimal : 0;
  const depreciationCostPerPiece = totalDepreciationCost / pieceQuantity;

  // Labor cost
  const totalLaborCost = laborHours * laborRate;
  const laborCostPerPiece = totalLaborCost / pieceQuantity;

  const baseCostPerPiece = materialCostPerPiece + electricityCostPerPiece + failureCostPerPiece + depreciationCostPerPiece + laborCostPerPiece;
  const totalCost = totalMaterialCost + totalElectricityCost + totalFailureCost + totalDepreciationCost + totalLaborCost + consumablesCost;

  let totalToCharge = totalCost * (1 + profitMargin / 100);

  if (shippingCost > 0) totalToCharge += shippingCost;
  if (includeMercadoLibre) totalToCharge += totalToCharge * (mlCommission / 100);

  totalToCharge = Math.ceil(totalToCharge / 10) * 10 - 1;

  return {
    id: crypto.randomUUID(),
    name: budgetName || 'Sin nombre',
    date: new Date().toLocaleDateString('es-AR'),
    materialCostPerPiece,
    electricityCostPerPiece,
    failureCostPerPiece,
    depreciationCostPerPiece,
    laborCostPerPiece,
    baseCostPerPiece,
    totalMaterialCost,
    totalElectricityCost,
    totalFailureCost,
    totalDepreciationCost,
    totalLaborCost,
    consumablesCost,
    totalCost,
    totalToCharge,
    pieceQuantity,
    profitMargin,
    includeMercadoLibre,
    mlCommission: includeMercadoLibre ? mlCommission : undefined,
    shippingCost,
  };
}

export function loadCalculations(): CalculationResult[] {
  try {
    const saved = localStorage.getItem('savedCalculations');
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

export function saveCalculations(calcs: CalculationResult[]): void {
  localStorage.setItem('savedCalculations', JSON.stringify(calcs));
}
