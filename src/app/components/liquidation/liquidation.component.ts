import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../services/finance.service';
import { Liquidation, LiquidationBreakdown } from '../../models/liquidation.model';

@Component({
    selector: 'app-liquidation',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './liquidation.component.html'
})
export class LiquidationComponent {
    financeService = inject(FinanceService);

    // Generation State
    startDate = '';
    endDate = '';
    previewData = signal<LiquidationBreakdown | null>(null);
    isGenerating = false;

    // View State
    expandedId: string | null = null;

    async previewLiquidation() {
        if (!this.startDate || !this.endDate) {
            alert('Seleccione un rango de fechas');
            return;
        }

        try {
            const start = new Date(this.startDate + 'T00:00:00');
            const end = new Date(this.endDate + 'T23:59:59');
            const data = await this.financeService.calculateLiquidation(start, end);
            this.previewData.set(data);
        } catch (error: any) {
            alert('Error al previsualizar: ' + error.message);
        }
    }

    async createLiquidation() {
        if (!this.startDate || !this.endDate) return;

        try {
            this.isGenerating = true;
            const start = new Date(this.startDate + 'T00:00:00');
            const end = new Date(this.endDate + 'T23:59:59');
            await this.financeService.createLiquidation(start, end);
            alert('¡Liquidación creada exitosamente!');
            this.previewData.set(null);
            this.startDate = '';
            this.endDate = '';
        } catch (error: any) {
            alert('Error al crear: ' + error.message);
        } finally {
            this.isGenerating = false;
        }
    }

    async closeLiquidation(id: string) {
        if (!confirm('¿Está seguro de cerrar este período de liquidación? Esto marcará el período como finalizado.')) return;
        try {
            await this.financeService.closeLiquidationPeriod(id);
            alert('Período cerrado');
        } catch (error: any) {
            alert('Error al cerrar: ' + error.message);
        }
    }

    toggleExpand(id: string) {
        this.expandedId = this.expandedId === id ? null : id;
    }

    formatCurrency(amount: number): string {
        return '$' + amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
}
