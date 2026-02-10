import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { AuditLog } from '../../models/audit-log.model';
import { toast } from 'ngx-sonner';

@Component({
    selector: 'app-audit-log',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './audit-log.component.html'
})
export class AuditLogComponent implements OnInit {
    financeService = inject(FinanceService);

    // Logs
    logs: AuditLog[] = [];
    isLoading = false;

    // Filters
    table_name = '';
    action = '';
    startDate = '';
    endDate = '';

    tableOptions = [
        { value: 'sales', label: 'Ventas' },
        { value: 'expenses', label: 'Gastos' },
        { value: 'refacil_transactions', label: 'Refácil' },
        { value: 'investments', label: 'Inversiones' },
        { value: 'liquidations', label: 'Liquidaciones' },
        { value: 'cash_boxes', label: 'Cajas' },
        { value: 'cash_box_transfers', label: 'Transferencias' }
    ];

    actionOptions = [
        { value: 'INSERT', label: 'Creación' },
        { value: 'UPDATE', label: 'Actualización' },
        { value: 'DELETE', label: 'Eliminación' }
    ];

    // Details view
    expandedLogId: string | null = null;

    ngOnInit() {
        this.loadLogs();
    }

    async loadLogs() {
        try {
            this.isLoading = true;
            const filters: any = {};
            if (this.table_name) filters.table_name = this.table_name;
            if (this.action) filters.action = this.action;
            if (this.startDate) filters.start_date = new Date(this.startDate + 'T00:00:00');
            if (this.endDate) filters.end_date = new Date(this.endDate + 'T23:59:59');

            this.logs = await this.financeService.loadAuditLogs(filters);
        } catch (error: any) {
            toast.error('Error al cargar auditoría: ' + error.message);
        } finally {
            this.isLoading = false;
        }
    }

    resetFilters() {
        this.table_name = '';
        this.action = '';
        this.startDate = '';
        this.endDate = '';
        this.loadLogs();
    }

    toggleExpand(id: string) {
        this.expandedLogId = this.expandedLogId === id ? null : id;
    }

    formatData(data: any): string {
        if (!data) return '-';
        return JSON.stringify(data, null, 2);
    }
}
