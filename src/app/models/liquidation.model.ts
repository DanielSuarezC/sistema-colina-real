export interface LiquidationBreakdown {
    totalSalesGross: number;
    totalCOGS: number;
    grossProfit: number;
    expenses: {
        nomina: number;
        internet: number;
        luz: number;
        resmas: number;
        otros: number;
        total: number;
    };
    detailed_expenses?: any[];
    netProfit: number;
    daniel_50: number;
    robert_50: number;
    refacil_total_sales: number;
    refacil_profit: number;
    refacil_capital_return?: number;
    daniel_cogs_recovery: number;
    operatingProfit?: number; // Base for 50/50 split
}

export interface Liquidation {
    id: string;
    start_date: Date;
    end_date: Date;
    total_income: number;
    total_expenses: number;
    net_profit: number;
    daniel_50: number;
    robert_50: number;
    status: 'OPEN' | 'CLOSED';
    breakdown?: LiquidationBreakdown;
    change_log?: any[];
    created_at: Date;
    closed_at?: Date;
}
