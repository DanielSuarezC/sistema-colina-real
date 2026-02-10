export interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    old_data?: any;
    new_data?: any;
    changed_by?: string;
    changed_at: Date;
}
