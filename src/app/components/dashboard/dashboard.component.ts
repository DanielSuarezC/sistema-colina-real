import { Component, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { ThemeService } from '../../services/theme.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { CashBoxType } from '../../models/cash-box.model';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styles: []
})
export class DashboardComponent implements OnInit {
  financeService = inject(FinanceService);
  themeService = inject(ThemeService);

  // Transfer modal properties
  showTransferModal = false;
  transferFromBoxId = '';
  transferToBoxId = '';
  transferAmount = 0;
  transferConcept = '';

  // Cash box type enum for template
  CashBoxType = CashBoxType;

  // State for chart controls
  selectedPeriod: '7d' | '30d' | '90d' = '7d';
  chartType: 'bar' | 'line' = 'bar'; // 'line' will represent the area chart

  // Weekly sales chart
  public salesChartData: ChartConfiguration['data'] = {
    datasets: [],
    labels: []
  };

  public chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        stacked: true
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return '$' + value.toLocaleString('es-CO');
          }
        }
      }
    }
  };

  constructor() {
    // Re-run chart logic automatically when signals change
    effect(() => {
      this.financeService.sales(); // Dependency tracking
      this.loadSalesChartData();
    });
  }

  ngOnInit() {
    // Initial call is now handled by the effect or can be kept here
  }

  setPeriod(period: '7d' | '30d' | '90d') {
    this.selectedPeriod = period;
    this.loadSalesChartData();
  }

  setChartType(type: 'bar' | 'line') {
    this.chartType = type;
    this.chartOptions = {
      ...this.chartOptions,
      scales: {
        ...this.chartOptions?.scales,
        x: { stacked: type === 'bar' },
        y: { stacked: type === 'bar', beginAtZero: true }
      }
    };
    this.loadSalesChartData();
  }

  async loadSalesChartData() {
    const daysCount = this.selectedPeriod === '7d' ? 7 : this.selectedPeriod === '30d' ? 30 : 90;

    const lastNDays = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (daysCount - 1 - i));
      return date;
    });

    const labels = lastNDays.map(d =>
      d.toLocaleDateString('es-CO', daysCount > 7 ? { month: 'short', day: 'numeric' } : { weekday: 'short', day: 'numeric' })
    );

    // Group sales by category and day
    const categories = ['SR_ROBERT', 'DANIEL', 'SERVICIOS'];
    const salesByCategory: Record<string, number[]> = {
      SR_ROBERT: new Array(daysCount).fill(0),
      DANIEL: new Array(daysCount).fill(0),
      SERVICIOS: new Array(daysCount).fill(0)
    };

    const periodStartDate = lastNDays[0];
    periodStartDate.setHours(0, 0, 0, 0);

    this.financeService.sales().forEach(sale => {
      const saleDate = new Date(sale.date);
      if (saleDate < periodStartDate) return;

      const dayIndex = lastNDays.findIndex(d =>
        d.toDateString() === saleDate.toDateString()
      );

      if (dayIndex >= 0) {
        salesByCategory[sale.category][dayIndex] += sale.gross_amount;
      }
    });

    const isArea = this.chartType === 'line';

    this.salesChartData = {
      labels,
      datasets: [
        {
          label: 'Inventario Sr. Robert',
          data: salesByCategory['SR_ROBERT'],
          backgroundColor: isArea ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: isArea ? 2 : 1,
          fill: isArea,
          tension: 0.4,
          type: this.chartType as any
        },
        {
          label: 'Inventario Daniel',
          data: salesByCategory['DANIEL'],
          backgroundColor: isArea ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: isArea ? 2 : 1,
          fill: isArea,
          tension: 0.4,
          type: this.chartType as any
        },
        {
          label: 'Servicios',
          data: salesByCategory['SERVICIOS'],
          backgroundColor: isArea ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.7)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: isArea ? 2 : 1,
          fill: isArea,
          tension: 0.4,
          type: this.chartType as any
        }
      ]
    };
  }

  openTransferModal() {
    this.showTransferModal = true;
    this.transferFromBoxId = '';
    this.transferToBoxId = '';
    this.transferAmount = 0;
    this.transferConcept = '';
  }

  closeTransferModal() {
    this.showTransferModal = false;
  }

  async executeTransfer() {
    if (!this.transferFromBoxId || !this.transferToBoxId) {
      toast.error('Por favor seleccione las cajas de origen y destino');
      return;
    }

    if (this.transferAmount <= 0) {
      toast.error('Por favor ingrese un monto válido');
      return;
    }

    if (!this.transferConcept.trim()) {
      toast.error('El concepto es obligatorio');
      return;
    }

    if (this.transferFromBoxId === this.transferToBoxId) {
      toast.error('Las cajas de origen y destino deben ser diferentes');
      return;
    }

    try {
      await this.financeService.transferBetweenBoxes(
        this.transferFromBoxId,
        this.transferToBoxId,
        this.transferAmount,
        this.transferConcept
      );

      this.closeTransferModal();
      toast.success('Transferencia realizada exitosamente');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  formatCurrency(amount: number): string {
    return '$' + amount.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }
}