export enum TransactionType {
    INGRESO = 'INGRESO',
    GASTO = 'GASTO',
    TRANSFERENCIA = 'TRANSFERENCIA'
}

export enum TransactionCategory {
    RECARGAS = 'RECARGAS',
    SERVICIOS = 'SERVICIOS',
    INVENTARIO_DANIEL = 'INVENTARIO_DANIEL',
    INVENTARIO_ROBERT = 'INVENTARIO_ROBERT',
    NOMINA = 'NOMINA',
    GASTO_OPERATIVO = 'GASTO_OPERATIVO'
}

export enum PaymentMethod {
    EFECTIVO = 'EFECTIVO',
    NEQUI = 'NEQUI'
}

export interface Transaction {
    id: string;
    date: Date;
    amount: number;
    cost: number;
    type: TransactionType;
    category: TransactionCategory;
    paymentMethod: PaymentMethod;
    description: string;
}

// Helper para obtener etiquetas legibles
export const TransactionCategoryLabels: Record<TransactionCategory, string> = {
    [TransactionCategory.RECARGAS]: 'Recargas (Refacil)',
    [TransactionCategory.SERVICIOS]: 'Servicios (Copias/Impresiones)',
    [TransactionCategory.INVENTARIO_DANIEL]: 'Inventario Daniel',
    [TransactionCategory.INVENTARIO_ROBERT]: 'Inventario Robert',
    [TransactionCategory.NOMINA]: 'Nómina',
    [TransactionCategory.GASTO_OPERATIVO]: 'Gasto Operativo'
};

export const TransactionTypeLabels: Record<TransactionType, string> = {
    [TransactionType.INGRESO]: 'Ingreso',
    [TransactionType.GASTO]: 'Gasto',
    [TransactionType.TRANSFERENCIA]: 'Transferencia'
};

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
    [PaymentMethod.EFECTIVO]: 'Efectivo',
    [PaymentMethod.NEQUI]: 'Nequi'
};
