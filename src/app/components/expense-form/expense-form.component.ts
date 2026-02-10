import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { ExpenseType, ExpenseTypeLabels, Expense } from '../../models/expense.model';

@Component({
    selector: 'app-expense-form',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './expense-form.component.html'
})
export class ExpenseFormComponent {
    financeService = inject(FinanceService);

    // Form
    date = new Date();
    type: ExpenseType = ExpenseType.OTROS;
    amount = 0;
    quantity: number | null = null;
    description = '';
    editingId: string | null = null;

    // Enums for template
    ExpenseType = ExpenseType;
    ExpenseTypeLabels = ExpenseTypeLabels;
    expenseTypes = Object.values(ExpenseType);

    // Filters
    filterStart = '';
    filterEnd = '';

    get filteredExpenses(): Expense[] {
        let list = this.financeService.expenses();
        if (this.filterStart) {
            const start = new Date(this.filterStart + 'T00:00:00');
            list = list.filter(e => new Date(e.date) >= start);
        }
        if (this.filterEnd) {
            const end = new Date(this.filterEnd + 'T23:59:59');
            list = list.filter(e => new Date(e.date) <= end);
        }
        return list;
    }

    get filteredTotal(): number {
        return this.filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    }

    parseDate(dateString: string): Date {
        return new Date(dateString + 'T12:00:00');
    }

    formatDateInput(d: Date): string {
        const date = new Date(d);
        return date.toISOString().split('T')[0];
    }

    async submitExpense() {
        if (this.amount <= 0) {
            alert('El monto debe ser mayor a cero');
            return;
        }

        try {
            if (this.editingId) {
                await this.financeService.updateExpense(this.editingId, {
                    date: this.date,
                    type: this.type,
                    amount: this.amount,
                    quantity: this.quantity ?? undefined,
                    description: this.description || undefined
                });
                alert('¡Gasto actualizado exitosamente!');
            } else {
                await this.financeService.recordExpense({
                    date: this.date,
                    type: this.type,
                    amount: this.amount,
                    quantity: this.quantity ?? undefined,
                    description: this.description || undefined
                });
                alert('¡Gasto registrado exitosamente!');
            }
            this.resetForm();
        } catch (error: any) {
            alert('Error: ' + error.message);
        }
    }

    editExpense(expense: Expense) {
        this.editingId = expense.id;
        this.date = new Date(expense.date);
        this.type = expense.type;
        this.amount = expense.amount;
        this.quantity = expense.quantity ?? null;
        this.description = expense.description ?? '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async deleteExpense(expense: Expense) {
        if (!confirm(`¿Eliminar gasto "${ExpenseTypeLabels[expense.type]}" por ${this.formatCurrency(expense.amount)}?`)) return;
        try {
            await this.financeService.deleteExpense(expense.id);
        } catch (error: any) {
            alert('Error: ' + error.message);
        }
    }

    resetForm() {
        this.editingId = null;
        this.date = new Date();
        this.type = ExpenseType.OTROS;
        this.amount = 0;
        this.quantity = null;
        this.description = '';
    }

    formatCurrency(amount: number): string {
        return '$' + amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
}
