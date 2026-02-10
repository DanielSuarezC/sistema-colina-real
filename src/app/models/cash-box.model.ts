export enum CashBoxType {
    PRINCIPAL = 'PRINCIPAL',
    RECARGAS = 'RECARGAS',
    ROI = 'ROI',
    BENEFICIO_DANIEL = 'BENEFICIO_DANIEL'
}

export interface CashBox {
    id: string;
    name: CashBoxType;
    balance: number;
    updated_at: Date;
}

export interface CashBoxTransfer {
    id: string;
    date: Date;
    from_box: string;
    to_box: string;
    amount: number;
    concept: string;
    created_by?: string;
    created_at: Date;
}

export const CashBoxLabels: Record<CashBoxType, string> = {
    [CashBoxType.PRINCIPAL]: 'Caja Principal',
    [CashBoxType.RECARGAS]: 'Caja Recargas',
    [CashBoxType.ROI]: 'Caja ROI',
    [CashBoxType.BENEFICIO_DANIEL]: 'Beneficio Bruto Daniel'
};
