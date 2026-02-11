import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { ThemeService } from '../../services/theme.service';
import { Liquidation, LiquidationBreakdown } from '../../models/liquidation.model';
import { toast } from 'ngx-sonner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
    selector: 'app-liquidation',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, BaseChartDirective],
    templateUrl: './liquidation.component.html'
})
export class LiquidationComponent {
    financeService = inject(FinanceService);
    themeService = inject(ThemeService);

    // Generation State
    startDate = '';
    endDate = '';
    previewData = signal<LiquidationBreakdown | null>(null);
    isGenerating = false;

    // View State
    expandedId: string | null = null;

    // Charts State
    public profitChartData: ChartConfiguration['data'] = {
        datasets: [],
        labels: ['Daniel', 'Robert']
    };

    public categoryChartData: ChartConfiguration['data'] = {
        datasets: [],
        labels: []
    };

    public chartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' }
        }
    };

    constructor() {
        // Update charts when preview data changes
        effect(() => {
            const data = this.previewData();
            if (data) {
                this.updateCharts(data);
            }
        });

        // Update chart theme when it change
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

    updateCharts(data: LiquidationBreakdown) {
        // Profit Distribution Chart
        this.profitChartData = {
            labels: ['Daniel (50% + ROI + Recargas)', 'Robert (50%)'],
            datasets: [{
                data: [data.daniel_50 + data.daniel_cogs_recovery + data.refacil_profit, data.robert_50],
                backgroundColor: ['#10B981', '#3B82F6'],
                hoverBackgroundColor: ['#059669', '#2563EB']
            }]
        };

        // Category Breakdown (Gross Profit)
        this.categoryChartData = {
            labels: ['Ventas Brutas', 'Costos (COGS)', 'Ganancia Recargas', 'Gastos'],
            datasets: [{
                data: [data.totalSalesGross, data.totalCOGS, data.refacil_profit, data.expenses.total],
                backgroundColor: ['#3B82F6', '#EF4444', '#F59E0B', '#6B7280']
            }]
        };
    }

    async previewLiquidation() {
        if (!this.startDate || !this.endDate) {
            toast.error('Seleccione un rango de fechas');
            return;
        }

        try {
            const start = new Date(this.startDate + 'T00:00:00');
            const end = new Date(this.endDate + 'T23:59:59');
            const data = await this.financeService.calculateLiquidation(start, end);
            this.previewData.set(data);
        } catch (error: any) {
            toast.error('Error al previsualizar: ' + error.message);
        }
    }

    async createLiquidation() {
        if (!this.startDate || !this.endDate) return;

        try {
            this.isGenerating = true;
            const start = new Date(this.startDate + 'T00:00:00');
            const end = new Date(this.endDate + 'T23:59:59');
            await this.financeService.createLiquidation(start, end);
            toast.success('¡Liquidación creada exitosamente!');
            this.previewData.set(null);
            this.startDate = '';
            this.endDate = '';
        } catch (error: any) {
            toast.error('Error al crear: ' + error.message);
        } finally {
            this.isGenerating = false;
        }
    }

    async closeLiquidation(id: string) {
        if (!confirm('¿Está seguro de cerrar este período de liquidación? Esto marcará el período como finalizado.')) return;
        try {
            await this.financeService.closeLiquidationPeriod(id);
            toast.success('Período cerrado');
        } catch (error: any) {
            toast.error('Error al cerrar: ' + error.message);
        }
    }

    toggleExpand(id: string) {
        this.expandedId = this.expandedId === id ? null : id;
    }

    exportToPDF(liq?: Liquidation) {
        const doc = new jsPDF();
        const data = liq ? liq.breakdown : this.previewData();
        if (!data) return;

        const title = liq ? `Reporte de Liquidación #${liq.id.substring(0, 8)}` : 'Previsualización de Liquidación';
        const period = liq
            ? `${liq.start_date.toLocaleDateString()} - ${liq.end_date.toLocaleDateString()}`
            : `${new Date(this.startDate).toLocaleDateString()} - ${new Date(this.endDate).toLocaleDateString()}`;

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text('SISTEMA COLINA REAL', 105, 15, { align: 'center' });

        doc.setFontSize(14);
        doc.text(title, 105, 25, { align: 'center' });

        doc.setFontSize(10);
        doc.text(`Periodo: ${period}`, 105, 32, { align: 'center' });
        doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 105, 38, { align: 'center' });

        // Summary Table
        autoTable(doc, {
            startY: 45,
            head: [['Concepto', 'Valor']],
            body: [
                ['Ventas Brutas', this.formatCurrency(data.totalSalesGross)],
                ['Costos (COGS)', this.formatCurrency(data.totalCOGS)],
                ['Utilidad Bruta en Ventas', this.formatCurrency(data.grossProfit)],
                ['Total Facturado en Recargas (Informativo)', this.formatCurrency(data.refacil_total_sales)],
                ['Comisión Recargas (5.5% para Daniel)', this.formatCurrency(data.refacil_profit)],
                ['Gastos Operativos Totales', this.formatCurrency(data.expenses.total)],
                ['UTILIDAD NETA DEL PERIODO', this.formatCurrency(data.netProfit)],
            ],
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }
        });

        // Payouts Table
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Socio / Concepto', 'Participación 50%', 'Compensación/Retorno', 'TOTAL PAGO']],
            body: [
                ['DANIEL', this.formatCurrency(data.daniel_50), this.formatCurrency(data.daniel_cogs_recovery + data.refacil_profit), this.formatCurrency(data.daniel_50 + data.daniel_cogs_recovery + data.refacil_profit)],
                ['ROBERT', this.formatCurrency(data.robert_50), '$0', this.formatCurrency(data.robert_50)]
            ],
            headStyles: { fillColor: [16, 185, 129] }
        });

        // Expenses Detail Table
        if (data.detailed_expenses && data.detailed_expenses.length > 0) {
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [['Detalle de Gastos', 'Concepto', 'Monto']],
                body: data.detailed_expenses.map(e => [e.type, e.description || '-', this.formatCurrency(e.amount)]),
                headStyles: { fillColor: [107, 114, 128] }
            });
        }

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY + 30;
        doc.line(30, finalY, 80, finalY);
        doc.line(130, finalY, 180, finalY);
        doc.text('Firma Daniel', 55, finalY + 5, { align: 'center' });
        doc.text('Firma Robert', 155, finalY + 5, { align: 'center' });

        doc.save(`liquidacion_${period.replace(/ /g, '_')}.pdf`);
        toast.success('Reporte generado exitosamente');
    }

    formatCurrency(amount: number): string {
        return '$' + amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
}
