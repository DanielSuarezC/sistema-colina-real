import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Sale, SaleCategoryLabels } from '../models/sale.model';
import { RefacilTransaction } from '../models/refacil-transaction.model';
import { Expense, ExpenseTypeLabels } from '../models/expense.model';
import { SettlementResult } from '../models/settlement-result.model';
import { Transaction } from '../models/transaction.model';

@Injectable({
    providedIn: 'root'
})
export class ExcelExportService {

    /**
     * Exporta datos financieros a un archivo Excel con múltiples hojas
     */
    public exportFinancialReport(
        sales: Sale[],
        recargas: RefacilTransaction[],
        expenses: Expense[],
        dateRange: { start: string, end: string },
        filename: string = 'reporte-financiero.xlsx'
    ): void {
        const workbook = XLSX.utils.book_new();

        // Hoja 1: Ventas
        const salesData = [
            ['REPORTE DE VENTAS'],
            ['Período:', `${dateRange.start || 'Inicio'} hasta ${dateRange.end || 'Hoy'}`],
            [],
            ['Fecha', 'Categoría', 'Monto Bruto', 'Costo (COGS)', 'Utilidad Neta', 'Descripción'],
            ...sales.map(s => [
                new Date(s.date).toLocaleDateString('es-CO'),
                SaleCategoryLabels[s.category] || s.category,
                s.gross_amount,
                s.cogs,
                s.net_profit,
                s.description || ''
            ])
        ];
        const salesSheet = XLSX.utils.aoa_to_sheet(salesData);
        XLSX.utils.book_append_sheet(workbook, salesSheet, 'Ventas');

        // Hoja 2: Recargas (Refácil)
        const recargasData = [
            ['REPORTE DE RECARGAS - REFÁCIL'],
            ['Período:', `${dateRange.start || 'Inicio'} hasta ${dateRange.end || 'Hoy'}`],
            [],
            ['Fecha', 'Monto Total', 'Utilidad (5.5%)', 'Retorno Capital (94.5%)', 'Descripción'],
            ...recargas.map(r => [
                new Date(r.date).toLocaleDateString('es-CO'),
                r.total_amount,
                r.profit_generated,
                r.capital_return,
                r.description || ''
            ])
        ];
        const recargasSheet = XLSX.utils.aoa_to_sheet(recargasData);
        XLSX.utils.book_append_sheet(workbook, recargasSheet, 'Recargas');

        // Hoja 3: Gastos
        const expensesData = [
            ['REPORTE DE GASTOS'],
            ['Período:', `${dateRange.start || 'Inicio'} hasta ${dateRange.end || 'Hoy'}`],
            [],
            ['Fecha', 'Tipo de Gasto', 'Monto', 'Cantidad', 'Descripción'],
            ...expenses.map(e => [
                new Date(e.date).toLocaleDateString('es-CO'),
                ExpenseTypeLabels[e.type] || e.type,
                e.amount,
                e.quantity || 1,
                e.description || ''
            ])
        ];
        const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
        XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Gastos');

        // Ajustar anchos
        const cols = [{ wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 }];
        salesSheet['!cols'] = cols;
        recargasSheet['!cols'] = cols;
        expensesSheet['!cols'] = cols;

        // Generar archivo
        XLSX.writeFile(workbook, filename);
    }

    /**
     * Exporta el reporte de liquidación de socios
     */
    public exportSettlementToExcel(
        settlement: SettlementResult,
        transactions: Transaction[],
        filename: string = 'liquidacion.xlsx'
    ): void {
        const workbook = XLSX.utils.book_new();

        // Hoja 1: Resumen General
        const summaryData = [
            ['RESUMEN DE LIQUIDACIÓN'],
            ['Período:', `${settlement.startDate.toLocaleDateString('es-CO')} hasta ${settlement.endDate.toLocaleDateString('es-CO')}`],
            [],
            ['CONCEPTO', 'TOTAL'],
            ['Ingresos Totales', settlement.totalIngresos],
            ['Costos Totales (COGS)', settlement.totalCostos],
            ['Gastos Operativos', settlement.totalGastos],
            ['Utilidad Neta del Período', settlement.totalUtilidad],
            [],
            ['REPARTO DE PAGOS', ''],
            ['DANIEL (PAGO TOTAL)', settlement.totalDanielPayout],
            ['ROBERT (PAGO TOTAL)', settlement.totalRobertPayout],
            ['FONDO REFÁCIL (CAPITAL)', settlement.totalRefacilFund]
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

        // Hoja 2: Desglose por Categoría
        const breakdownData = [
            ['DESGLOSE POR CATEGORÍA'],
            [],
            ['Categoría', 'Venta Bruta', 'Costo', 'Utilidad', 'Daniel Recovery', 'Daniel Share', 'Robert Share'],
            [
                settlement.recargasBreakdown.category,
                settlement.recargasBreakdown.totalSales,
                settlement.recargasBreakdown.totalCost,
                settlement.recargasBreakdown.netProfit,
                settlement.recargasBreakdown.danielCostRecovery,
                settlement.recargasBreakdown.danielShare,
                settlement.recargasBreakdown.robertShare
            ],
            [
                settlement.serviciosBreakdown.category,
                settlement.serviciosBreakdown.totalSales,
                settlement.serviciosBreakdown.totalCost,
                settlement.serviciosBreakdown.netProfit,
                settlement.serviciosBreakdown.danielCostRecovery,
                settlement.serviciosBreakdown.danielShare,
                settlement.serviciosBreakdown.robertShare
            ],
            [
                settlement.inventarioDanielBreakdown.category,
                settlement.inventarioDanielBreakdown.totalSales,
                settlement.inventarioDanielBreakdown.totalCost,
                settlement.inventarioDanielBreakdown.netProfit,
                settlement.inventarioDanielBreakdown.danielCostRecovery,
                settlement.inventarioDanielBreakdown.danielShare,
                settlement.inventarioDanielBreakdown.robertShare
            ],
            [
                settlement.inventarioRobertBreakdown.category,
                settlement.inventarioRobertBreakdown.totalSales,
                settlement.inventarioRobertBreakdown.totalCost,
                settlement.inventarioRobertBreakdown.netProfit,
                settlement.inventarioRobertBreakdown.danielCostRecovery,
                settlement.inventarioRobertBreakdown.danielShare,
                settlement.inventarioRobertBreakdown.robertShare
            ]
        ];
        const breakdownSheet = XLSX.utils.aoa_to_sheet(breakdownData);
        XLSX.utils.book_append_sheet(workbook, breakdownSheet, 'Desglose');

        // Hoja 3: Listado de Transacciones
        const transData = [
            ['DETALLE DE TRANSACCIONES'],
            [],
            ['Fecha', 'Tipo', 'Categoría', 'Monto', 'Costo', 'Descripción'],
            ...transactions.map(t => [
                new Date(t.date).toLocaleDateString('es-CO'),
                t.type,
                t.category,
                t.amount,
                t.cost || 0,
                t.description || ''
            ])
        ];
        const transSheet = XLSX.utils.aoa_to_sheet(transData);
        XLSX.utils.book_append_sheet(workbook, transSheet, 'Transacciones');

        // Estilos básicos (anchos)
        const cols = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
        breakdownSheet['!cols'] = cols;
        transSheet['!cols'] = cols;

        XLSX.writeFile(workbook, filename);
    }
}
