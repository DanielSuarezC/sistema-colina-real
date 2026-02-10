export enum SaleCategory {
    SR_ROBERT = 'SR_ROBERT',
    DANIEL = 'DANIEL',
    SERVICIOS = 'SERVICIOS'
}

export interface Sale {
    id: string;
    date: Date;
    category: SaleCategory;
    gross_amount: number;
    cogs: number;
    net_profit: number;
    description?: string;
    created_at: Date;
    updated_at: Date;
}

export const SaleCategoryLabels: Record<SaleCategory, string> = {
    [SaleCategory.SR_ROBERT]: 'Inventario Sr. Robert',
    [SaleCategory.DANIEL]: 'Inventario Daniel',
    [SaleCategory.SERVICIOS]: 'Servicios (Copias/Impresiones)'
};
