export type ShiftType = 'AM' | 'PM' | 'BOTH' | 'OTHER';

export interface Employee {
    id?: string;
    name: string;
    is_active: boolean;
    created_at?: Date;
}

export interface PayrollLog {
    id?: string;
    employee_id: string;
    date: Date | string;
    shift: ShiftType;
    hours_detail: string;
    amount: number;
    expense_id?: string;
    created_at?: Date;
    // Helper field for UI
    employee_name?: string;
}
