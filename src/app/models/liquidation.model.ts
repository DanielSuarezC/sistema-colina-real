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
    netProfit: number;
    daniel_50: number;
    robert_50: number;
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
