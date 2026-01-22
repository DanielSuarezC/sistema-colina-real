import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Transaction,
  TransactionType,
  TransactionCategory,
  PaymentMethod,
  TransactionCategoryLabels,
  PaymentMethodLabels
} from '../../models/transaction.model';
import { AccountingService } from '../../services/accounting.service';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './transaction-form.component.html',
})
export class TransactionFormComponent {
  private fb = inject(FormBuilder);
  private accountingService = inject(AccountingService);
  private router = inject(Router);

  categoryLabels = TransactionCategoryLabels;
  paymentMethodLabels = PaymentMethodLabels;
  showSuccess = false;
  maxDate = new Date().toISOString().split('T')[0];

  transactionForm: FormGroup;

  constructor() {
    this.transactionForm = this.fb.group({
      type: ['', Validators.required],
      category: ['', Validators.required],
      date: [this.maxDate, Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]],
      cost: [0],
      paymentMethod: ['EFECTIVO', Validators.required],
      description: ['', Validators.required]
    });

    // Watch for category changes to update cost validation
    this.transactionForm.get('category')?.valueChanges.subscribe(() => {
      this.updateCostValidation();
    });

    // Reset category when type changes
    this.transactionForm.get('type')?.valueChanges.subscribe(() => {
      this.transactionForm.patchValue({ category: '' });
    });
  }

  requiresCostField(): boolean {
    const category = this.transactionForm.get('category')?.value;
    return category === TransactionCategory.INVENTARIO_DANIEL ||
      category === TransactionCategory.SERVICIOS;
  }

  updateCostValidation(): void {
    const costControl = this.transactionForm.get('cost');
    if (this.requiresCostField()) {
      costControl?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      costControl?.clearValidators();
      costControl?.setValue(0);
    }
    costControl?.updateValueAndValidity();
  }

  setPaymentMethod(method: string): void {
    this.transactionForm.patchValue({ paymentMethod: method });
  }

  onSubmit(): void {
    if (this.transactionForm.invalid) {
      Object.keys(this.transactionForm.controls).forEach(key => {
        this.transactionForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.transactionForm.value;
    const transaction: Omit<Transaction, 'id'> = {
      type: formValue.type as TransactionType,
      category: formValue.category as TransactionCategory,
      date: new Date(formValue.date),
      amount: Number(formValue.amount),
      cost: Number(formValue.cost),
      paymentMethod: formValue.paymentMethod as PaymentMethod,
      description: formValue.description
    };

    this.accountingService.addTransaction(transaction);

    // Show success message
    this.showSuccess = true;
    setTimeout(() => {
      this.showSuccess = false;
      this.router.navigate(['/']);
    }, 2000);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
