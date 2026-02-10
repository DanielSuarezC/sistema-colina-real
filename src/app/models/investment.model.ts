export interface Investment {
    id: string;
    date: Date;
    concept: string;
    amount: number;
    description?: string;
    source_box: string;
    recovered_amount: number;
    created_at: Date;
    updated_at: Date;
}

export interface InvestmentWithROI extends Investment {
    roi_percentage: number;
    status: 'ACTIVE' | 'PARTIAL' | 'RECOVERED';
}
