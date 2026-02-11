import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { ThemeService } from '../../services/theme.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { SaleCategory, SaleCategoryLabels } from '../../models/sale.model';
import { ExpenseType, ExpenseTypeLabels } from '../../models/expense.model';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { effect } from '@angular/core';

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, BaseChartDirective],
    templateUrl: './reports.component.html'
})
export class ReportsComponent {
    financeService = inject(FinanceService);
    excelService = inject(ExcelExportService);
    themeService = inject(ThemeService);

    // Filter dates
    startDate = signal<string>('');
    endDate = signal<string>('');

    // Filtered data
    filteredSales = computed(() => {
        let list = this.financeService.sales();
        if (this.startDate()) {
            const start = new Date(this.startDate() + 'T00:00:00');
            list = list.filter(s => new Date(s.date) >= start);
        }
        if (this.endDate()) {
            const end = new Date(this.endDate() + 'T23:59:59');
            list = list.filter(s => new Date(s.date) <= end);
        }
        return list;
    });

    filteredRecargas = computed(() => {
        let list = this.financeService.refacilTransactions();
        if (this.startDate()) {
            const start = new Date(this.startDate() + 'T00:00:00');
            list = list.filter(r => new Date(r.date) >= start);
        }
        if (this.endDate()) {
            const end = new Date(this.endDate() + 'T23:59:59');
            list = list.filter(r => new Date(r.date) <= end);
        }
        return list;
    });

    filteredExpenses = computed(() => {
        let list = this.financeService.expenses();
        if (this.startDate()) {
            const start = new Date(this.startDate() + 'T00:00:00');
            list = list.filter(e => new Date(e.date) >= start);
        }
        if (this.endDate()) {
            const end = new Date(this.endDate() + 'T23:59:59');
            list = list.filter(e => new Date(e.date) <= end);
        }
        return list;
    });

    // Totals
    totalSales = computed(() => this.filteredSales().reduce((sum, s) => sum + s.gross_amount, 0));
    totalProfit = computed(() => this.filteredSales().reduce((sum, s) => sum + s.net_profit, 0));
    totalRecargasAmount = computed(() => this.filteredRecargas().reduce((sum, r) => sum + r.total_amount, 0));
    totalRecargasProfit = computed(() => this.filteredRecargas().reduce((sum, r) => sum + r.profit_generated, 0));
    totalExpenses = computed(() => this.filteredExpenses().reduce((sum, e) => sum + e.amount, 0));

    netResult = computed(() => this.totalProfit() + this.totalRecargasProfit() - this.totalExpenses());

    // Charts
    salesChartData = computed<ChartData<'doughnut'>>(() => {
        const sales = this.filteredSales();
        const categories = Object.values(SaleCategory);
        const data = categories.map(cat =>
            sales.filter(s => s.category === cat).reduce((sum, s) => sum + s.gross_amount, 0)
        );

        return {
            labels: categories.map(cat => SaleCategoryLabels[cat]),
            datasets: [{
                data,
                backgroundColor: [
                    '#3b82f6', // blue
                    '#10b981', // emerald
                    '#8b5cf6', // violet
                    '#f59e0b', // amber
                    '#ef4444'  // red
                ]
            }]
        };
    });

    incomeVsExpenseChartData = computed<ChartData<'bar'>>(() => {
        return {
            labels: ['Ingresos (Utilidad)', 'Egresos (Gastos)'],
            datasets: [{
                data: [
                    this.totalProfit() + this.totalRecargasProfit(),
                    this.totalExpenses()
                ],
                label: 'Monto',
                backgroundColor: ['#10b981', '#ef4444']
            }]
        };
    });

    chartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' }
        }
    };

    constructor() {
        effect(() => {
            this.updateChartTheme(this.themeService.isDarkMode());
        });
    }

    updateChartTheme(isDark: boolean) {
        const textColor = isDark ? '#cbd5e1' : '#475569';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

        this.chartOptions = {
            ...this.chartOptions,
            plugins: {
                ...this.chartOptions?.plugins,
                legend: {
                    ...this.chartOptions?.plugins?.legend,
                    labels: {
                        color: textColor,
                        font: { family: "'Inter', sans-serif", size: 12 }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor, display: false }
                },
                y: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            }
        };
    }

    // Labels for template
    SaleCategoryLabels = SaleCategoryLabels;
    ExpenseTypeLabels = ExpenseTypeLabels;

    exportToExcel() {
        this.excelService.exportFinancialReport(
            this.filteredSales(),
            this.filteredRecargas(),
            this.filteredExpenses(),
            { start: this.startDate(), end: this.endDate() },
            `reporte-colina-real-${new Date().toISOString().split('T')[0]}.xlsx`
        );
    }

    formatCurrency(amount: number): string {
        return '$' + amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
}
