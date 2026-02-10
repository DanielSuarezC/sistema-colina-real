import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';

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

    get profit5_5(): number {
        return Math.round(this.amount * 0.055 * 100) / 100;
    }

    get capital94_5(): number {
        return Math.round(this.amount * 0.945 * 100) / 100;
    }

    async submitRefacil() {
        if (this.amount <= 0) {
            alert('El monto debe ser mayor a cero');
            return;
        }

        try {
            await this.financeService.recordRefacilTransaction(
                this.amount,
                this.description || undefined
            );

            alert('¡Recarga registrada exitosamente!');
            this.resetForm();
            this.router.navigate(['/dashboard']);
        } catch (error: any) {
            alert('Error al registrar la recarga: ' + error.message);
        }
    }

    resetForm() {
        this.amount = 0;
        this.description = '';
    }

    formatCurrency(amount: number): string {
        return '$' + amount.toLocaleString('es-CO');
    }
}
