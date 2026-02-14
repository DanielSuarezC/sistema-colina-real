import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { toast } from 'ngx-sonner';
import { RefacilTransaction } from '../../models/refacil-transaction.model';

@Component({
    selector: 'app-refacil-form',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './refacil-form.component.html'
})
export class RefacilFormComponent {
    financeService = inject(FinanceService);
    router = inject(Router);

    amount = 0;
    description = '';
    date = new Date();
    editingId: string | null = null;

    constructor() {
        // Ensure date is set to today on init
        this.date = new Date();
    }

    parseDate(dateString: string): Date {
        return new Date(dateString + 'T12:00:00');
    }

    formatDateInput(d: Date): string {
        return new Date(d).toISOString().split('T')[0];
    }

    get profit5_5(): number {
        return Math.round(this.amount * 0.055 * 100) / 100;
    }

    get capital94_5(): number {
        return Math.round(this.amount * 0.945 * 100) / 100;
    }

    async submitRefacil() {
        if (this.amount <= 0) {
            toast.error('El monto debe ser mayor a cero');
            return;
        }

        try {
            if (this.editingId) {
                await this.financeService.updateRefacilTransaction(
                    this.editingId,
                    this.amount,
                    this.description || undefined,
                    this.date
                );
                toast.success('¡Recarga actualizada exitosamente!');
                this.cancelEdit();
            } else {
                await this.financeService.recordRefacilTransaction(
                    this.amount,
                    this.description || undefined,
                    this.date
                );
                toast.success('¡Recarga registrada exitosamente!');
                this.resetForm();
            }
        } catch (error: any) {
            toast.error('Error al procesar la recarga: ' + error.message);
        }
    }

    editTransaction(trx: RefacilTransaction) {
        this.editingId = trx.id;
        this.amount = trx.total_amount;
        this.description = trx.description || '';
        this.date = new Date(trx.date);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    cancelEdit() {
        this.editingId = null;
        this.resetForm();
    }

    async deleteTransaction(id: string) {
        if (!confirm('¿Está seguro de eliminar esta recarga?')) return;

        try {
            await this.financeService.deleteRefacilTransaction(id);
            toast.success('Recarga eliminada');
            if (this.editingId === id) {
                this.cancelEdit();
            }
        } catch (error: any) {
            toast.error('Error al eliminar: ' + error.message);
        }
    }

    resetForm() {
        this.amount = 0;
        this.description = '';
        this.date = new Date();
        this.editingId = null;
    }

    formatCurrency(amount: number): string {
        return '$' + amount.toLocaleString('es-CO');
    }
}
