import { Component, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { CashBoxType } from '../../models/cash-box.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styles: []
})
export class DashboardComponent implements OnInit {
  financeService = inject(FinanceService);

  // Transfer modal properties
  showTransferModal = false;
  transferFromBoxId = '';
  transferToBoxId = '';
  transferAmount = 0;
  transferConcept = '';

  // Cash box type enum for template
  CashBoxType = CashBoxType;

  // Weekly sales chart
  public weeklySalesChart: ChartConfiguration['data'] = {
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
      this.loadWeeklySalesData();
    });
  }

  ngOnInit() {
    // Initial call is now handled by the effect or can be kept here
  }

  async loadWeeklySalesData() {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    const labels = last7Days.map(d =>
      d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })
    );

    // Group sales by category and day
    const salesByCategory = {
      SR_ROBERT: new Array(7).fill(0),
      DANIEL: new Array(7).fill(0),
      SERVICIOS: new Array(7).fill(0)
    };

    this.financeService.sales().forEach(sale => {
      const saleDate = new Date(sale.date);
      const dayIndex = last7Days.findIndex(d =>
        d.toDateString() === saleDate.toDateString()
      );

      if (dayIndex >= 0) {
        salesByCategory[sale.category][dayIndex] += sale.gross_amount;
      }
    });

    this.weeklySalesChart = {
      labels,
      datasets: [
        {
          label: 'Inventario Sr. Robert',
          data: salesByCategory.SR_ROBERT,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        },
        {
          label: 'Inventario Daniel',
          data: salesByCategory.DANIEL,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1
        },
        {
          label: 'Servicios',
          data: salesByCategory.SERVICIOS,
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: 1
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
      alert('Por favor seleccione las cajas de origen y destino');
      return;
    }

    if (this.transferAmount <= 0) {
      alert('Por favor ingrese un monto válido');
      return;
    }

    if (!this.transferConcept.trim()) {
      alert('El concepto es obligatorio');
      return;
    }

    if (this.transferFromBoxId === this.transferToBoxId) {
      alert('Las cajas de origen y destino deben ser diferentes');
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
      alert('Transferencia realizada exitosamente');
    } catch (error: any) {
      alert('Error: ' + error.message);
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