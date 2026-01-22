export interface CategoryBreakdown {
    category: string;
    totalSales: number;
    totalCost: number;
    netProfit: number;
    robertShare: number;
    danielShare: number;
    refacilFund: number;
    danielCostRecovery: number;
}

export interface SettlementResult {
    startDate: Date;
    endDate: Date;

    // Desglose por categoría
    recargasBreakdown: CategoryBreakdown;
    serviciosBreakdown: CategoryBreakdown;
    inventarioDanielBreakdown: CategoryBreakdown;
    inventarioRobertBreakdown: CategoryBreakdown;

    // Gastos
    totalGastos: number;
    gastosRobert: number;
    gastosDaniel: number;

    // Totales finales
    totalRobertPayout: number;
    totalDanielPayout: number;
    totalRefacilFund: number;

    // Totales generales
    totalIngresos: number;
    totalCostos: number;
    totalUtilidad: number;
}
