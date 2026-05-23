import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PayrollService } from '../../services/payroll.service';
import { Employee, PayrollLog, ShiftType } from '../../models/payroll.model';
import { DateRangePickerComponent } from '../shared/date-range-picker/date-range-picker.component';

@Component({
    selector: 'app-payroll',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, DateRangePickerComponent],
    templateUrl: './payroll.component.html',
    styles: [`
        .tab-active { @apply border-primary-500 text-primary-600 dark:text-primary-400 border-b-2; }
        .tab-inactive { @apply border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300; }
    `]
})
export class PayrollComponent implements OnInit {
    private payrollService = inject(PayrollService);
    private fb = inject(FormBuilder);

    activeTab = signal<'records' | 'employees'>('records');
    isLoading = signal(false);
    
    employees = this.payrollService.employees;
    payrollLogs = this.payrollService.payrollLogs;

    // Filters
    selectedEmployeeId = signal<string>('all');
    statusFilter = signal<'all' | 'pending' | 'paid'>('all');

    filteredLogs = computed(() => {
        let logs = this.payrollLogs();
        
        if (this.selectedEmployeeId() !== 'all') {
            logs = logs.filter(log => log.employee_id === this.selectedEmployeeId());
        }
        
        if (this.statusFilter() === 'pending') {
            logs = logs.filter(log => !log.is_paid);
        } else if (this.statusFilter() === 'paid') {
            logs = logs.filter(log => log.is_paid);
        }
        
        return logs;
    });

    totalPending = computed(() => {
        return this.payrollLogs()
            .filter(log => !log.is_paid)
            .reduce((sum, log) => sum + log.amount, 0);
    });

    // Forms
    employeeForm = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(3)]]
    });

    recordForm = this.fb.group({
        employee_id: ['', Validators.required],
        date: [new Date().toISOString().split('T')[0], Validators.required],
        shift: ['AM' as ShiftType, Validators.required],
        hours_detail: ['7 am - 12 pm', Validators.required],
        amount: [0, [Validators.required, Validators.min(0)]]
    });

    ngOnInit() {
        this.loadInitialData();
    }

    async loadInitialData() {
        this.isLoading.set(true);
        try {
            await this.payrollService.loadEmployees();
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
            await this.payrollService.loadPayrollLogs(firstDay, lastDay);
        } catch (error) {
            console.error('Error loading payroll data:', error);
        } finally {
            this.isLoading.set(false);
        }
    }

    async onDateRangeChange(range: { start: Date; end: Date }) {
        this.isLoading.set(true);
        try {
            await this.payrollService.loadPayrollLogs(
                range.start.toISOString().split('T')[0],
                range.end.toISOString().split('T')[0]
            );
        } finally {
            this.isLoading.set(false);
        }
    }

    async addEmployee() {
        if (this.employeeForm.invalid) return;
        const name = this.employeeForm.value.name!;
        try {
            await this.payrollService.addEmployee(name);
            this.employeeForm.reset();
        } catch (error) {
            alert('Error al agregar empleado');
        }
    }

    async toggleEmployeeStatus(employee: Employee) {
        try {
            await this.payrollService.updateEmployee(employee.id!, { is_active: !employee.is_active });
        } catch (error) {
            alert('Error al actualizar estado');
        }
    }

    onShiftChange() {
        const shift = this.recordForm.get('shift')?.value;
        let detail = '';
        switch (shift) {
            case 'AM': detail = '7 am - 12 pm'; break;
            case 'PM': detail = '2 pm - 7 pm'; break;
            case 'BOTH': detail = '7 am - 12 pm & 2 pm - 7 pm'; break;
            default: detail = '';
        }
        this.recordForm.patchValue({ hours_detail: detail });
    }

    async registerPayroll() {
        if (this.recordForm.invalid) return;
        
        const formValue = this.recordForm.value;
        const employee = this.employees().find(e => e.id === formValue.employee_id);
        
        try {
            this.isLoading.set(true);
            await this.payrollService.registerPayroll({
                employee_id: formValue.employee_id!,
                date: formValue.date!,
                shift: formValue.shift as ShiftType,
                hours_detail: formValue.hours_detail!,
                amount: formValue.amount!,
                is_paid: false,
                employee_name: employee?.name
            });
            
            // Reload logs for the current view
            const today = new Date();
            await this.payrollService.loadPayrollLogs(
                new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
                today.toISOString().split('T')[0]
            );
            
            this.recordForm.patchValue({
                employee_id: '',
                shift: 'AM',
                hours_detail: '7 am - 12 pm',
                amount: 0
            });
        } catch (error) {
            alert('Error al registrar nómina');
        } finally {
            this.isLoading.set(false);
        }
    }

    async deleteLog(log: PayrollLog) {
        if (!confirm('¿Estás seguro de eliminar este registro? Esto también eliminará el gasto asociado.')) return;
        
        try {
            await this.payrollService.deletePayrollLog(log.id!, log.expense_id);
            // Reload logs
            const today = new Date();
            await this.payrollService.loadPayrollLogs(
                new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
                today.toISOString().split('T')[0]
            );
        } catch (error) {
            alert('Error al eliminar registro');
        }
    }

    async togglePaidStatus(log: PayrollLog) {
        try {
            await this.payrollService.updatePayrollLogStatus(log.id!, !log.is_paid);
        } catch (error) {
            alert('Error al actualizar estado de pago');
        }
    }
}
