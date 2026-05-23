import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { PayrollService } from '../../services/payroll.service';
import { ThemeService } from '../../services/theme.service';
import { Liquidation, LiquidationBreakdown } from '../../models/liquidation.model';
import { toast } from 'ngx-sonner';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { DateRangePickerComponent } from '../shared/date-range-picker/date-range-picker.component';

@Component({
    selector: 'app-liquidation',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, BaseChartDirective, DateRangePickerComponent],
    templateUrl: './liquidation.component.html'
})
export class LiquidationComponent {
    financeService = inject(FinanceService);
    payrollService = inject(PayrollService);
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

    async togglePayrollPayment(pay: any) {
        try {
            await this.payrollService.updatePayrollLogStatus(pay.id, !pay.is_paid);
            
            // Update the preview data locally to reflect the change immediately
            const currentPreview = this.previewData();
            if (currentPreview && currentPreview.payroll_details) {
                const updatedDetails = currentPreview.payroll_details.map(p => 
                    p.id === pay.id ? { ...p, is_paid: !pay.is_paid } : p
                );
                this.previewData.set({ ...currentPreview, payroll_details: updatedDetails });
            }
            
            toast.success('Estado de pago actualizado');
        } catch (error) {
            toast.error('Error al actualizar pago');
        }
    }

    async cancelLiquidation(id: string) {
        if (!confirm('¿Está seguro de eliminar esta liquidación? Esta acción no se puede deshacer.')) return;
        try {
            await this.financeService.deleteLiquidation(id);
            toast.success('Liquidación eliminada');
        } catch (error: any) {
            toast.error('Error al eliminar: ' + error.message);
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

        let period = '';
        if (liq) {
            // Use UTC methods to avoid timezone shift
            const start = new Date(liq.start_date);
            const end = new Date(liq.end_date);
            const startStr = `${start.getUTCDate().toString().padStart(2, '0')}/${(start.getUTCMonth() + 1).toString().padStart(2, '0')}/${start.getUTCFullYear()}`;
            const endStr = `${end.getUTCDate().toString().padStart(2, '0')}/${(end.getUTCMonth() + 1).toString().padStart(2, '0')}/${end.getUTCFullYear()}`;
            period = `${startStr} - ${endStr}`;
        } else {
            // For preview, startDate/endDate are strings 'yyyy-mm-dd' from input, so direct split is safe and correct
            const startParts = this.startDate.split('-');
            const endParts = this.endDate.split('-');
            period = `${startParts[2]}/${startParts[1]}/${startParts[0]} - ${endParts[2]}/${endParts[1]}/${endParts[0]}`;
        }

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text('SISTEMA COLINA REAL', 105, 15, { align: 'center' });

        doc.setFontSize(14);
        doc.text(title, 105, 25, { align: 'center' });

        doc.setFontSize(10);
        doc.text(`Periodo: ${period}`, 105, 32, { align: 'center' });
        doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 105, 38, { align: 'center' });

        // Calculate derived values for legacy records if missing
        const operatingProfit = data.operatingProfit ?? (data.grossProfit - data.expenses.total);
        const refacilCapitalReturn = data.refacil_capital_return ?? (data.refacil_total_sales - data.refacil_profit);
        const totalDaniel = data.daniel_50 + data.daniel_cogs_recovery + data.refacil_profit;
        const totalRobert = data.robert_50;

        // 1. Resultados Operativos Table
        autoTable(doc, {
            startY: 45,
            head: [['Concepto', 'Operación', 'Valor']],
            body: [
                ['Ventas Brutas', '(+)', this.formatCurrency(data.totalSalesGross)],
                ['Costos de Mercancía (COGS)', '(-)', this.formatCurrency(data.totalCOGS)],
                ['Utilidad Bruta en Ventas', '(=)', this.formatCurrency(data.grossProfit)],
                ['Gastos Operativos Totales', '(-)', this.formatCurrency(data.expenses.total)],
                ['UTILIDAD OPERATIVA (BASE A REPARTIR)', '(=)', this.formatCurrency(operatingProfit)],
            ],
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 30, halign: 'center' },
                2: { halign: 'right' }
            }
        });

        // 2. Información Recargas Table
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Concepto Recargas (Refácil)', 'Valor']],
            body: [
                ['Retorno Capital Recargas (94.5%) -> Caja Recargas', this.formatCurrency(refacilCapitalReturn)],
                ['Comisión Recargas (5.5%) -> Daniel', this.formatCurrency(data.refacil_profit)]
            ],
            theme: 'plain',
            headStyles: { fillColor: [245, 158, 11], textColor: 255 },
            columnStyles: { 1: { halign: 'right' } }
        });

        // 3. Liquidación Final Table
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Socio', '50% Utilidad Operativa', 'Extras (Recargas/COGS)', 'TOTAL A PAGAR']],
            body: [
                ['DANIEL', this.formatCurrency(data.daniel_50), this.formatCurrency(data.daniel_cogs_recovery + data.refacil_profit), this.formatCurrency(totalDaniel)],
                ['ROBERT', this.formatCurrency(data.robert_50), '$0', this.formatCurrency(totalRobert)]
            ],
            headStyles: { fillColor: [16, 185, 129] },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right', fontStyle: 'bold' }
            }
        });

        // Expenses Detail Table
        if (data.detailed_expenses && data.detailed_expenses.length > 0) {
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [['Detalle de Gastos', 'Concepto', 'Monto']],
                body: data.detailed_expenses
                    .filter(e => e.type !== 'NOMINA')
                    .map(e => [e.type, e.description || '-', this.formatCurrency(e.amount)]),
                headStyles: { fillColor: [107, 114, 128] }
            });
        }

        // Payroll Details Table
        if (data.payroll_details && data.payroll_details.length > 0) {
            const payrollRows = data.payroll_details.map(p => [
                new Date(p.date).toLocaleDateString(), 
                p.employee_name, 
                `${p.shift} (${p.hours_detail})`, 
                this.formatCurrency(p.amount),
                p.is_paid ? 'PAGADO' : 'PENDIENTE'
            ]);

            // Add totals per employee
            const totalsByEmployee = data.payroll_details.reduce((acc: any, p: any) => {
                acc[p.employee_name] = (acc[p.employee_name] || 0) + p.amount;
                return acc;
            }, {});

            Object.keys(totalsByEmployee).forEach(empName => {
                payrollRows.push([
                    { content: `TOTAL ${empName}`, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: this.formatCurrency(totalsByEmployee[empName]), styles: { fontStyle: 'bold' } },
                    { content: '' }
                ]);
            });

            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [['Fecha', 'Empleado', 'Turno/Horario', 'Monto', 'Estado']],
                body: payrollRows,
                headStyles: { fillColor: [79, 70, 229] },
                columnStyles: { 
                    3: { halign: 'right' },
                    4: { halign: 'center' }
                }
            });
        }

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY + 30;
        doc.line(30, finalY, 80, finalY);
        doc.line(130, finalY, 180, finalY);
        doc.text('Firma Daniel', 55, finalY + 5, { align: 'center' });
        doc.text('Firma Robert', 155, finalY + 5, { align: 'center' });

        // Open in new tab instead of saving directly
        const pdfOutput = doc.output('bloburl');
        window.open(pdfOutput, '_blank');

        toast.success('Reporte generado exitosamente');
    }

    formatCurrency(amount: number): string {
        return '$' + amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
}
