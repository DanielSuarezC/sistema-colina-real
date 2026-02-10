export enum ExpenseType {
    NOMINA = 'NOMINA',
    INTERNET = 'INTERNET',
    LUZ = 'LUZ',
    RESMAS = 'RESMAS',
    OTROS = 'OTROS'
}

export interface Expense {
    id: string;
    date: Date;
    type: ExpenseType;
    amount: number;
    quantity?: number;
    description?: string;
    created_at: Date;
    updated_at: Date;
}

export const ExpenseTypeLabels: Record<ExpenseType, string> = {
    [ExpenseType.NOMINA]: 'Nómina',
    [ExpenseType.INTERNET]: 'Internet (Fijo $52,000)',
    [ExpenseType.LUZ]: 'Luz',
    [ExpenseType.RESMAS]: 'Resmas',
    [ExpenseType.OTROS]: 'Otros Gastos'
};
