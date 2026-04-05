export interface CalculationResult {
  name: string;
  date: string;
  materialCostPerPiece: number;
  electricityCostPerPiece: number;
  failureCostPerPiece: number;
  baseCostPerPiece: number;
  totalMaterialCost: number;
  totalElectricityCost: number;
  totalFailureCost: number;
  totalCost: number;
  totalToCharge: number;
  pieceQuantity: number;
  profitMargin: number;
  includeMercadoLibre: boolean;
  mlCommission?: number;
}

export interface MaterialPreset {
  name: string;
  cost: number;
  printerWattage: number;
  errorMargin: number;
}

export const materialPresets: Record<string, MaterialPreset> = {
  pla: { name: 'PLA', cost: 19000, printerWattage: 120, errorMargin: 10 },
  petg: { name: 'PETG', cost: 22000, printerWattage: 150, errorMargin: 15 },
  abs: { name: 'ABS', cost: 20000, printerWattage: 180, errorMargin: 20 },
};

export function calculate(params: {
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
}): CalculationResult {
  const {
    budgetName, materialCostPerKg, materialWeight, printTimeSeconds,
    printerWattage, electricityRate, consumablesCost, errorMargin, profitMargin,
    pieceQuantity, includeMercadoLibre, mlCommission, shippingCost,
  } = params;

  const hoursDecimal = printTimeSeconds / 3600;

  const totalMaterialCost = (materialWeight / 1000) * materialCostPerKg;
  const materialCostPerPiece = totalMaterialCost / pieceQuantity;

  const totalElectricityCost = hoursDecimal * (printerWattage / 1000) * electricityRate;
  const electricityCostPerPiece = totalElectricityCost / pieceQuantity;

  const totalFailureCost = (totalMaterialCost + totalElectricityCost) * (errorMargin / 100);
  const failureCostPerPiece = totalFailureCost / pieceQuantity;

  const baseCostPerPiece = materialCostPerPiece + electricityCostPerPiece + failureCostPerPiece;
  const totalCost = totalMaterialCost + totalElectricityCost + totalFailureCost + consumablesCost;

  let totalToCharge = totalCost * (1 + profitMargin / 100);

  if (shippingCost > 0) totalToCharge += shippingCost;
  if (includeMercadoLibre) totalToCharge += totalToCharge * (mlCommission / 100);

  totalToCharge = Math.ceil(totalToCharge / 10) * 10 - 1;

  return {
    name: budgetName || 'Sin nombre',
    date: new Date().toLocaleDateString('es-AR'),
    materialCostPerPiece,
    electricityCostPerPiece,
    failureCostPerPiece,
    baseCostPerPiece,
    totalMaterialCost,
    totalElectricityCost,
    totalFailureCost,
    totalCost,
    totalToCharge,
    pieceQuantity,
    profitMargin,
    includeMercadoLibre,
    mlCommission: includeMercadoLibre ? mlCommission : undefined,
  };
}
