import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Sale, SaleCategoryLabels } from '../models/sale.model';
import { RefacilTransaction } from '../models/refacil-transaction.model';
import { Expense, ExpenseTypeLabels } from '../models/expense.model';

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
}
