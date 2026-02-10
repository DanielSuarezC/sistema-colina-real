export interface RefacilTransaction {
    id: string;
    date: Date;
    total_amount: number;
    profit_generated: number;   // 5.5% of total (auto-calculated in DB)
    capital_return: number;      // 94.5% of total (auto-calculated in DB)
    description?: string;
    created_at: Date;
    updated_at: Date;
}
