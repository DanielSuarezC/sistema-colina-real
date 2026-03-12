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

import { DateRangePickerComponent } from '../shared/date-range-picker/date-range-picker.component';

@Component({
    selector: 'app-reports',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, BaseChartDirective, DateRangePickerComponent],
    templateUrl: './reports.component.html'
})
export class ReportsComponent {
    financeService = inject(FinanceService);
    excelService = inject(ExcelExportService);
    themeService = inject(ThemeService);

    // Filter dates
    startDate = signal<string>('');
    endDate = signal<string>('');

    // Chart type toggle: 'line' (area) or 'bar'
    chartDisplayType = signal<'line' | 'bar'>('line');

    // Time preset
    timePreset = signal<'today' | '7days' | '30days' | 'custom'>('30days');

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

    // Summary charts (keep existing)
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

    // ===== DAILY AGGREGATED CHARTS =====

    dailySalesChartData = computed(() => {
        const grouped = this.groupByDate(
            this.filteredSales().map(s => ({ date: s.date, value: s.gross_amount }))
        );
        const type = this.chartDisplayType();
        return {
            labels: grouped.map(g => g.label),
            datasets: [{
                data: grouped.map(g => g.total),
                label: 'Ventas Diarias',
                backgroundColor: type === 'bar' ? 'rgba(59, 130, 246, 0.7)' : 'rgba(59, 130, 246, 0.15)',
                borderColor: '#3b82f6',
                fill: type === 'line',
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#3b82f6'
            }]
        };
    });

    dailyRecargasChartData = computed(() => {
        const grouped = this.groupByDate(
            this.filteredRecargas().map(r => ({ date: r.date, value: r.total_amount }))
        );
        const type = this.chartDisplayType();
        return {
            labels: grouped.map(g => g.label),
            datasets: [{
                data: grouped.map(g => g.total),
                label: 'Recargas Diarias',
                backgroundColor: type === 'bar' ? 'rgba(139, 92, 246, 0.7)' : 'rgba(139, 92, 246, 0.15)',
                borderColor: '#8b5cf6',
                fill: type === 'line',
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#8b5cf6'
            }]
        };
    });

    dailyExpensesChartData = computed(() => {
        const grouped = this.groupByDate(
            this.filteredExpenses().map(e => ({ date: e.date, value: e.amount }))
        );
        const type = this.chartDisplayType();
        return {
            labels: grouped.map(g => g.label),
            datasets: [{
                data: grouped.map(g => g.total),
                label: 'Gastos Diarios',
                backgroundColor: type === 'bar' ? 'rgba(239, 68, 68, 0.7)' : 'rgba(239, 68, 68, 0.15)',
                borderColor: '#ef4444',
                fill: type === 'line',
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#ef4444'
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

    dailyChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', labels: { font: { size: 12 } } },
            tooltip: {
                callbacks: {
                    label: (ctx) => {
                        const val = ctx.parsed.y;
                        return `${ctx.dataset.label}: $${val.toLocaleString('es-CO')}`;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: { maxRotation: 45, font: { size: 10 } }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (val) => '$' + Number(val).toLocaleString('es-CO')
                }
            }
        }
    };

    constructor() {
        // Apply preset on init
        this.applyPreset('30days');

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

        this.dailyChartOptions = {
            ...this.dailyChartOptions,
            plugins: {
                ...this.dailyChartOptions?.plugins,
                legend: {
                    ...this.dailyChartOptions?.plugins?.legend,
                    labels: {
                        color: textColor,
                        font: { family: "'Inter', sans-serif", size: 12 }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor, maxRotation: 45, font: { size: 10 } },
                    grid: { color: gridColor, display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        callback: (val) => '$' + Number(val).toLocaleString('es-CO')
                    },
                    grid: { color: gridColor }
                }
            }
        };
    }

    // Labels for template
    SaleCategoryLabels = SaleCategoryLabels;
    ExpenseTypeLabels = ExpenseTypeLabels;

    applyPreset(preset: 'today' | '7days' | '30days' | 'custom') {
        this.timePreset.set(preset);
        const today = new Date();

        switch (preset) {
            case 'today':
                const todayStr = this.formatDate(today);
                this.startDate.set(todayStr);
                this.endDate.set(todayStr);
                break;
            case '7days':
                const week = new Date(today);
                week.setDate(week.getDate() - 6);
                this.startDate.set(this.formatDate(week));
                this.endDate.set(this.formatDate(today));
                break;
            case '30days':
                const month = new Date(today);
                month.setDate(month.getDate() - 29);
                this.startDate.set(this.formatDate(month));
                this.endDate.set(this.formatDate(today));
                break;
            case 'custom':
                // Don't change dates, let user pick
                break;
        }
    }

    private formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    private groupByDate(items: { date: Date; value: number }[]): { label: string; total: number }[] {
        const map = new Map<string, number>();

        for (const item of items) {
            const d = new Date(item.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            map.set(key, (map.get(key) || 0) + item.value);
        }

        // Sort by date ascending
        const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));

        return sorted.map(([key, total]) => {
            const parts = key.split('-');
            return {
                label: `${parts[2]}/${parts[1]}`,
                total
            };
        });
    }

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
