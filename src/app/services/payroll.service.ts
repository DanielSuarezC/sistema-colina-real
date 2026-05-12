import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { FinanceService } from './finance.service';
import { Employee, PayrollLog } from '../models/payroll.model';
import { ExpenseType } from '../models/expense.model';

@Injectable({
    providedIn: 'root'
})
export class PayrollService {
    private supabase = inject(SupabaseService);
    private financeService = inject(FinanceService);

    employees = signal<Employee[]>([]);
    payrollLogs = signal<PayrollLog[]>([]);

    async loadEmployees() {
        const { data, error } = await this.supabase
            .from('employees')
            .select('*')
            .order('name');

        if (error) throw error;
        this.employees.set(data || []);
    }

    async addEmployee(name: string) {
        const { data, error } = await this.supabase
            .from('employees')
            .insert({ name, is_active: true })
            .select()
            .single();

        if (error) throw error;
        this.employees.update(prev => [...prev, data]);
        return data;
    }

    async updateEmployee(id: string, updates: Partial<Employee>) {
        const { error } = await this.supabase
            .from('employees')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        await this.loadEmployees();
    }

    async loadPayrollLogs(startDate: string, endDate: string) {
        const { data, error } = await this.supabase
            .from('payroll_logs')
            .select(`
                *,
                employees (name)
            `)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        if (error) throw error;
        
        const logs = (data || []).map((log: any) => ({
            ...log,
            employee_name: log.employees?.name
        }));

        this.payrollLogs.set(logs);
        return logs;
    }

    async registerPayroll(log: Omit<PayrollLog, 'id' | 'created_at' | 'expense_id'>) {
        // 1. Create the expense entry first to link it
        const expense = await this.financeService.recordExpense({
            date: new Date(log.date),
            type: ExpenseType.NOMINA,
            amount: log.amount,
            description: `Nómina: ${log.employee_name || 'Empleado'} - ${log.hours_detail}`
        });

        // 2. Create the payroll log
        const { data, error } = await this.supabase
            .from('payroll_logs')
            .insert({
                employee_id: log.employee_id,
                date: log.date,
                shift: log.shift,
                hours_detail: log.hours_detail,
                amount: log.amount,
                is_paid: false,
                expense_id: expense.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deletePayrollLog(id: string, expenseId?: string) {
        // Delete payroll log
        const { error } = await this.supabase
            .from('payroll_logs')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Delete associated expense
        if (expenseId) {
            await this.financeService.deleteExpense(expenseId);
        }
    }

    async updatePayrollLogStatus(id: string, isPaid: boolean) {
        const { error } = await this.supabase
            .from('payroll_logs')
            .update({ is_paid: isPaid })
            .eq('id', id);

        if (error) throw error;
        
        // Update local signal to reflect change
        this.payrollLogs.update(logs => 
            logs.map(log => log.id === id ? { ...log, is_paid: isPaid } : log)
        );
    }
}
