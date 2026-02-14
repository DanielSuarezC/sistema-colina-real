import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../../services/accounting.service';
import { SettlementService } from '../../services/settlement.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { SettlementResult } from '../../models/settlement-result.model';
import { toast } from 'ngx-sonner';

import { DateRangePickerComponent } from '../shared/date-range-picker/date-range-picker.component';

@Component({
  selector: 'app-settlement-report',
  standalone: true,
  imports: [CommonModule, FormsModule, DateRangePickerComponent],
  templateUrl: './settlement-report.component.html'
})
export class SettlementReportComponent {
  private accountingService = inject(AccountingService);
  private settlementService = inject(SettlementService);
  private excelService = inject(ExcelExportService);

  startDateStr = '';
  endDateStr = '';
  settlement = signal<SettlementResult | null>(null);

  constructor() {
    // Set default dates (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.endDateStr = today.toISOString().split('T')[0];
    this.startDateStr = thirtyDaysAgo.toISOString().split('T')[0];
  }

  onDateChange(): void {
    // Reset settlement when dates change
    this.settlement.set(null);
  }

  calculateSettlement(): void {
    const startDate = new Date(this.startDateStr);
    const endDate = new Date(this.endDateStr);

    if (startDate > endDate) {
      toast.error('La fecha de inicio debe ser anterior a la fecha de fin');
      return;
    }

    const transactions = this.accountingService.getTransactionsByDateRange(startDate, endDate);
    const result = this.settlementService.calculateSettlement(transactions, startDate, endDate);

    this.settlement.set(result);
  }

  exportToExcel(): void {
    const settlementData = this.settlement();
    if (!settlementData) return;

    const startDate = new Date(this.startDateStr);
    const endDate = new Date(this.endDateStr);
    const transactions = this.accountingService.getTransactionsByDateRange(startDate, endDate);

    const filename = `liquidacion_${this.startDateStr}_${this.endDateStr}.xlsx`;
    this.excelService.exportSettlementToExcel(settlementData, transactions, filename);
  }
}
