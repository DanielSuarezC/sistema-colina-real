import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { toast } from 'ngx-sonner';

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
            await this.financeService.recordRefacilTransaction(
                this.amount,
                this.description || undefined,
                this.date
            );

            toast.success('¡Recarga registrada exitosamente!');
            this.resetForm();
            this.router.navigate(['/dashboard']);
        } catch (error: any) {
            toast.error('Error al registrar la recarga: ' + error.message);
        }
    }

    resetForm() {
        this.amount = 0;
        this.description = '';
        this.date = new Date();
    }

    formatCurrency(amount: number): string {
        return '$' + amount.toLocaleString('es-CO');
    }
}
