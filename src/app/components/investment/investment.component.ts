import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { Investment } from '../../models/investment.model';
import { CashBoxType, CashBoxLabels } from '../../models/cash-box.model';
import { toast } from 'ngx-sonner';

import { DateRangePickerComponent } from '../shared/date-range-picker/date-range-picker.component';

@Component({
    selector: 'app-investment',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, DateRangePickerComponent],
    templateUrl: './investment.component.html'
})
export class InvestmentComponent {
    financeService = inject(FinanceService);

    // Form
    date = new Date();
    concept = '';
    amount = 0;
    sourceBox = '';
    description = '';

    // Recovery modal
    recoveryId: string | null = null;
    recoveryAmount = 0;

    // Filters
    filterStart = '';
    filterEnd = '';

    CashBoxLabels = CashBoxLabels;

    get filteredInvestments(): Investment[] {
        let list = this.financeService.investments();
        if (this.filterStart) {
            const start = new Date(this.filterStart + 'T00:00:00');
            list = list.filter(i => new Date(i.date) >= start);
        }
        if (this.filterEnd) {
            const end = new Date(this.filterEnd + 'T23:59:59');
            list = list.filter(i => new Date(i.date) <= end);
        }
        return list;
    }

    get totalInvested(): number {
        return this.filteredInvestments.reduce((s, i) => s + i.amount, 0);
    }

    get totalRecovered(): number {
        return this.filteredInvestments.reduce((s, i) => s + i.recovered_amount, 0);
    }

    parseDate(dateString: string): Date {
        return new Date(dateString + 'T12:00:00');
    }

    formatDateInput(d: Date): string {
        return new Date(d).toISOString().split('T')[0];
    }

    getROI(inv: Investment): number {
        if (inv.amount === 0) return 0;
        return (inv.recovered_amount / inv.amount) * 100;
    }

    getStatus(inv: Investment): string {
        if (inv.recovered_amount >= inv.amount) return 'RECOVERED';
        if (inv.recovered_amount > 0) return 'PARTIAL';
        return 'ACTIVE';
    }

    getStatusLabel(inv: Investment): string {
        const s = this.getStatus(inv);
        return s === 'RECOVERED' ? 'Recuperada' : s === 'PARTIAL' ? 'Parcial' : 'Activa';
    }

    async submitInvestment() {
        if (!this.concept.trim()) { toast.error('El concepto es obligatorio'); return; }
        if (this.amount <= 0) { toast.error('El monto debe ser mayor a cero'); return; }
        if (!this.sourceBox) { toast.error('Seleccione la caja de origen'); return; }

        try {
            await this.financeService.recordInvestment({
                date: this.date,
                concept: this.concept,
                amount: this.amount,
                source_box: this.sourceBox,
                recovered_amount: 0,
                description: this.description || undefined
            });
            toast.success('¡Inversión registrada exitosamente!');
            this.resetForm();
        } catch (error: any) {
            toast.error('Error: ' + error.message);
        }
    }

    openRecovery(inv: Investment) {
        this.recoveryId = inv.id;
        this.recoveryAmount = inv.recovered_amount;
    }

    async submitRecovery() {
        if (!this.recoveryId) return;
        try {
            await this.financeService.updateInvestmentRecovery(this.recoveryId, this.recoveryAmount);
            toast.success('Recuperación actualizada');
            this.recoveryId = null;
        } catch (error: any) {
            toast.error('Error: ' + error.message);
        }
    }

    async deleteInvestment(inv: Investment) {
        if (!confirm(`¿Eliminar inversión "${inv.concept}" por ${this.formatCurrency(inv.amount)}?`)) return;
        try {
            await this.financeService.deleteInvestment(inv.id);
        } catch (error: any) {
            toast.error('Error: ' + error.message);
        }
    }

    resetForm() {
        this.date = new Date();
        this.concept = '';
        this.amount = 0;
        this.sourceBox = '';
        this.description = '';
    }

    formatCurrency(amount: number): string {
        return '$' + amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
}
