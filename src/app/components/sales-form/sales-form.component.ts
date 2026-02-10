import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { SaleCategory, SaleCategoryLabels } from '../../models/sale.model';
import { toast } from 'ngx-sonner';

interface PendingSale {
    date: Date;
    category: SaleCategory;
    grossAmount: number;
    cogs: number;
    description: string;
}

@Component({
    selector: 'app-sales-form',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './sales-form.component.html'
})
export class SalesFormComponent {
    private financeService = inject(FinanceService);
    private router = inject(Router);

    // Current form model (for single entry addition)
    date = new Date();
    category: SaleCategory = SaleCategory.SERVICIOS;
    grossAmount = 0;
    cogs = 0;
    description = '';

    // List of sales to be registered
    pendingSales = signal<PendingSale[]>([]);

    // Enum for template
    SaleCategory = SaleCategory;
    SaleCategoryLabels = SaleCategoryLabels;

    parseDate(dateString: string): Date {
        return new Date(dateString + 'T12:00:00');
    }

    newDate(): Date {
        return new Date();
    }

    // Computed values for current form
    get netProfit(): number {
        return this.grossAmount - this.cogs;
    }

    get shouldShowCOGS(): boolean {
        return this.category !== SaleCategory.SERVICIOS;
    }

    get totalGrossPending(): number {
        return this.pendingSales().reduce((sum, s) => sum + s.grossAmount, 0);
    }

    addToCart() {
        if (this.grossAmount <= 0) {
            toast.error('El monto bruto debe ser mayor a cero');
            return;
        }

        if (this.shouldShowCOGS && this.cogs < 0) {
            toast.error('El costo no puede ser negativo');
            return;
        }

        if (this.shouldShowCOGS && this.cogs >= this.grossAmount) {
            toast.error('El costo no puede ser mayor o igual al monto bruto');
            return;
        }

        this.pendingSales.update(prev => [...prev, {
            date: this.date,
            category: this.category,
            grossAmount: this.grossAmount,
            cogs: this.shouldShowCOGS ? this.cogs : 0,
            description: this.description
        }]);

        toast.success('Venta añadida a la lista');
        this.resetEntryForm();
    }

    removeSale(index: number) {
        this.pendingSales.update(prev => prev.filter((_, i) => i !== index));
        toast.info('Venta eliminada de la lista');
    }

    async submitAllSales() {
        if (this.pendingSales().length === 0) {
            toast.error('No hay ventas en la lista para registrar');
            return;
        }

        try {
            const salesToRecord = this.pendingSales().map(s => ({
                date: s.date,
                category: s.category,
                gross_amount: s.grossAmount,
                cogs: s.cogs,
                description: s.description || undefined
            }));

            await this.financeService.recordSales(salesToRecord);

            toast.success(`¡${salesToRecord.length} ${salesToRecord.length === 1 ? 'venta registrada' : 'ventas registradas'} exitosamente!`);
            this.pendingSales.set([]);
            this.router.navigate(['/dashboard']);
        } catch (error: any) {
            toast.error('Error al registrar las ventas: ' + error.message);
        }
    }

    resetEntryForm() {
        // We keep the date for convenience when adding multiple entries for the same day
        this.category = SaleCategory.SERVICIOS;
        this.grossAmount = 0;
        this.cogs = 0;
        this.description = '';
    }

    resetAll() {
        this.pendingSales.set([]);
        this.resetEntryForm();
        this.date = new Date();
    }

    formatCurrency(amount: number): string {
        return '$' + amount.toLocaleString('es-CO');
    }
}
