import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { SaleCategory, SaleCategoryLabels } from '../../models/sale.model';

@Component({
    selector: 'app-sales-form',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './sales-form.component.html'
})
export class SalesFormComponent {
    financeService = inject(FinanceService);
    router = inject(Router);

    // Form model
    date = new Date();
    category: SaleCategory = SaleCategory.SERVICIOS;
    grossAmount = 0;
    cogs = 0;
    description = '';

    // Enum for template
    SaleCategory = SaleCategory;
    SaleCategoryLabels = SaleCategoryLabels;

    parseDate(dateString: string): Date {
        // Using T12:00:00 to avoid timezone shift issues with date inputs
        return new Date(dateString + 'T12:00:00');
    }

    newDate(): Date {
        return new Date();
    }

    // Computed values
    get netProfit(): number {
        return this.grossAmount - this.cogs;
    }

    get shouldShowCOGS(): boolean {
        // Show COGS for inventory categories, not for services
        return this.category !== SaleCategory.SERVICIOS;
    }

    async submitSale() {
        // Validation
        if (this.grossAmount <= 0) {
            alert('El monto bruto debe ser mayor a cero');
            return;
        }

        if (this.shouldShowCOGS && this.cogs < 0) {
            alert('El costo no puede ser negativo');
            return;
        }

        if (this.shouldShowCOGS && this.cogs >= this.grossAmount) {
            alert('El costo no puede ser mayor o igual al monto bruto');
            return;
        }

        try {
            await this.financeService.recordSale({
                date: this.date,
                category: this.category,
                gross_amount: this.grossAmount,
                cogs: this.shouldShowCOGS ? this.cogs : 0,
                description: this.description || undefined
            });

            alert('¡Venta registrada exitosamente!');
            this.resetForm();
            this.router.navigate(['/dashboard']);
        } catch (error: any) {
            alert('Error al registrar la venta: ' + error.message);
        }
    }

    resetForm() {
        this.date = new Date();
        this.category = SaleCategory.SERVICIOS;
        this.grossAmount = 0;
        this.cogs = 0;
        this.description = '';
    }

    formatCurrency(amount: number): string {
        return '$' + amount.toLocaleString('es-CO');
    }
}
