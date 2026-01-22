import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { SettlementResult } from '../models/settlement-result.model';
import { Transaction } from '../models/transaction.model';

@Injectable({
    providedIn: 'root'
})
export class ExcelExportService {

    /**
     * Exporta el reporte de liquidación a un archivo Excel con dos hojas
     */
    public exportSettlementToExcel(
        settlement: SettlementResult,
        transactions: Transaction[],
        filename: string = 'liquidacion-colina-real.xlsx'
    ): void {
        // Crear el workbook
        const workbook = XLSX.utils.book_new();

        // Hoja 1: Detalle de Movimientos
        const movimientosSheet = this.createMovimientosSheet(transactions);
        XLSX.utils.book_append_sheet(workbook, movimientosSheet, 'Detalle Movimientos');

        // Hoja 2: Resumen de Liquidación
        const resumenSheet = this.createResumenSheet(settlement);
        XLSX.utils.book_append_sheet(workbook, resumenSheet, 'Resumen Liquidación');

        // Descargar el archivo
        XLSX.writeFile(workbook, filename);
    }

    /**
     * Crea la hoja de detalle de movimientos
     */
    private createMovimientosSheet(transactions: Transaction[]): XLSX.WorkSheet {
        const data = [
            // Encabezados
            ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Costo', 'Método Pago'],
            // Datos
            ...transactions.map(t => [
                new Date(t.date).toLocaleDateString('es-CO'),
                t.type,
                t.category,
                t.description,
                t.amount,
                t.cost,
                t.paymentMethod
            ])
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // Aplicar formato a los encabezados
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!worksheet[cellAddress]) continue;
            worksheet[cellAddress].s = {
                font: { bold: true },
                fill: { fgColor: { rgb: 'CCCCCC' } }
            };
        }

        // Ajustar ancho de columnas
        worksheet['!cols'] = [
            { wch: 12 }, // Fecha
            { wch: 15 }, // Tipo
            { wch: 20 }, // Categoría
            { wch: 40 }, // Descripción
            { wch: 15 }, // Monto
            { wch: 15 }, // Costo
            { wch: 15 }  // Método Pago
        ];

        return worksheet;
    }

    /**
     * Crea la hoja de resumen de liquidación
     */
    private createResumenSheet(settlement: SettlementResult): XLSX.WorkSheet {
        const formatCurrency = (value: number) => `$${value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

        const data = [
            ['RESUMEN DE LIQUIDACIÓN'],
            ['Período:', `${settlement.startDate.toLocaleDateString('es-CO')} - ${settlement.endDate.toLocaleDateString('es-CO')}`],
            [],
            ['DESGLOSE POR CATEGORÍA'],
            [],
            ['RECARGAS (REFACIL)'],
            ['Total Ventas:', formatCurrency(settlement.recargasBreakdown.totalSales)],
            ['Ganancia (5.5%):', formatCurrency(settlement.recargasBreakdown.netProfit)],
            ['Fondo Refacil (94.5%):', formatCurrency(settlement.recargasBreakdown.refacilFund)],
            ['Para Daniel:', formatCurrency(settlement.recargasBreakdown.danielShare)],
            [],
            ['SERVICIOS (COPIAS/IMPRESIONES)'],
            ['Total Ventas:', formatCurrency(settlement.serviciosBreakdown.totalSales)],
            ['Total Costos:', formatCurrency(settlement.serviciosBreakdown.totalCost)],
            ['Utilidad Neta:', formatCurrency(settlement.serviciosBreakdown.netProfit)],
            ['Recuperación Costo Daniel:', formatCurrency(settlement.serviciosBreakdown.danielCostRecovery)],
            ['Para Robert (50%):', formatCurrency(settlement.serviciosBreakdown.robertShare)],
            ['Para Daniel (50%):', formatCurrency(settlement.serviciosBreakdown.danielShare)],
            [],
            ['INVENTARIO DANIEL'],
            ['Total Ventas:', formatCurrency(settlement.inventarioDanielBreakdown.totalSales)],
            ['Total Costos:', formatCurrency(settlement.inventarioDanielBreakdown.totalCost)],
            ['Utilidad Neta:', formatCurrency(settlement.inventarioDanielBreakdown.netProfit)],
            ['Recuperación Costo Daniel:', formatCurrency(settlement.inventarioDanielBreakdown.danielCostRecovery)],
            ['Para Robert (50%):', formatCurrency(settlement.inventarioDanielBreakdown.robertShare)],
            ['Para Daniel (50%):', formatCurrency(settlement.inventarioDanielBreakdown.danielShare)],
            [],
            ['INVENTARIO ROBERT'],
            ['Total Ventas:', formatCurrency(settlement.inventarioRobertBreakdown.totalSales)],
            ['Para Robert (50%):', formatCurrency(settlement.inventarioRobertBreakdown.robertShare)],
            ['Para Daniel (50%):', formatCurrency(settlement.inventarioRobertBreakdown.danielShare)],
            [],
            ['GASTOS'],
            ['Total Gastos:', formatCurrency(settlement.totalGastos)],
            ['Robert (50%):', formatCurrency(settlement.gastosRobert)],
            ['Daniel (50%):', formatCurrency(settlement.gastosDaniel)],
            [],
            [],
            ['LIQUIDACIÓN FINAL'],
            ['PAGO A ROBERT:', formatCurrency(settlement.totalRobertPayout)],
            ['PAGO A DANIEL:', formatCurrency(settlement.totalDanielPayout)],
            ['FONDO REFACIL:', formatCurrency(settlement.totalRefacilFund)],
            [],
            ['TOTALES GENERALES'],
            ['Total Ingresos:', formatCurrency(settlement.totalIngresos)],
            ['Total Costos:', formatCurrency(settlement.totalCostos)],
            ['Total Gastos:', formatCurrency(settlement.totalGastos)],
            ['Utilidad Total:', formatCurrency(settlement.totalUtilidad)]
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // Ajustar ancho de columnas
        worksheet['!cols'] = [
            { wch: 30 },
            { wch: 25 }
        ];

        return worksheet;
    }
}
