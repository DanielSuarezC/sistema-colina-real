import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountingService } from '../../services/accounting.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  accountingService = inject(AccountingService);
  
  // Propiedades para el modal de transferencia
  showTransferModal = false;
  transferAmount = 0;
  transferFromCash = true;

  executeTransfer(): void {
    if (this.transferAmount <= 0) {
      alert('Por favor ingrese un monto válido');
      return;
    }

    const sourceBalance = this.transferFromCash
      ? this.accountingService.cashBalance()
      : this.accountingService.nequiBalance();

    if (this.transferAmount > sourceBalance) {
      alert('Saldo insuficiente');
      return;
    }

    this.accountingService.transferBetweenAccounts(this.transferAmount, this.transferFromCash);
    this.showTransferModal = false;
    this.transferAmount = 0;
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}