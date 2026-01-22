import { Injectable } from '@angular/core';
import { Transaction, TransactionType, TransactionCategory } from '../models/transaction.model';
import { SettlementResult, CategoryBreakdown } from '../models/settlement-result.model';

@Injectable({
    providedIn: 'root'
})
export class SettlementService {

    /**
     * Calcula la liquidación completa para un rango de fechas
     */
    public calculateSettlement(transactions: Transaction[], startDate: Date, endDate: Date): SettlementResult {
        // Filtrar transacciones del rango
        const filteredTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= startDate && tDate <= endDate;
        });

        // Separar por categoría
        const recargasTransactions = filteredTransactions.filter(
            t => t.type === TransactionType.INGRESO && t.category === TransactionCategory.RECARGAS
        );

        const serviciosTransactions = filteredTransactions.filter(
            t => t.type === TransactionType.INGRESO && t.category === TransactionCategory.SERVICIOS
        );

        const inventarioDanielTransactions = filteredTransactions.filter(
            t => t.type === TransactionType.INGRESO && t.category === TransactionCategory.INVENTARIO_DANIEL
        );

        const inventarioRobertTransactions = filteredTransactions.filter(
            t => t.type === TransactionType.INGRESO && t.category === TransactionCategory.INVENTARIO_ROBERT
        );

        const gastosTransactions = filteredTransactions.filter(
            t => t.type === TransactionType.GASTO &&
                (t.category === TransactionCategory.NOMINA || t.category === TransactionCategory.GASTO_OPERATIVO)
        );

        // Calcular por cada categoría
        const recargasBreakdown = this.calculateRecargasBreakdown(recargasTransactions);
        const serviciosBreakdown = this.calculateServiciosOrInventarioDanielBreakdown(
            serviciosTransactions,
            'Servicios'
        );
        const inventarioDanielBreakdown = this.calculateServiciosOrInventarioDanielBreakdown(
            inventarioDanielTransactions,
            'Inventario Daniel'
        );
        const inventarioRobertBreakdown = this.calculateInventarioRobertBreakdown(inventarioRobertTransactions);

        // Calcular gastos
        const totalGastos = gastosTransactions.reduce((sum, t) => sum + t.amount, 0);
        const gastosRobert = totalGastos / 2;
        const gastosDaniel = totalGastos / 2;

        // Calcular totales finales
        const totalRobertPayout =
            recargasBreakdown.robertShare +
            serviciosBreakdown.robertShare +
            inventarioDanielBreakdown.robertShare +
            inventarioRobertBreakdown.robertShare -
            gastosRobert;

        const totalDanielPayout =
            recargasBreakdown.danielShare +
            serviciosBreakdown.danielShare +
            inventarioDanielBreakdown.danielShare +
            inventarioRobertBreakdown.danielShare +
            serviciosBreakdown.danielCostRecovery +
            inventarioDanielBreakdown.danielCostRecovery -
            gastosDaniel;

        const totalRefacilFund = recargasBreakdown.refacilFund;

        // Totales generales
        const totalIngresos =
            recargasBreakdown.totalSales +
            serviciosBreakdown.totalSales +
            inventarioDanielBreakdown.totalSales +
            inventarioRobertBreakdown.totalSales;

        const totalCostos =
            recargasBreakdown.totalCost +
            serviciosBreakdown.totalCost +
            inventarioDanielBreakdown.totalCost +
            inventarioRobertBreakdown.totalCost;

        const totalUtilidad = totalIngresos - totalCostos - totalGastos;

        return {
            startDate,
            endDate,
            recargasBreakdown,
            serviciosBreakdown,
            inventarioDanielBreakdown,
            inventarioRobertBreakdown,
            totalGastos,
            gastosRobert,
            gastosDaniel,
            totalRobertPayout,
            totalDanielPayout,
            totalRefacilFund,
            totalIngresos,
            totalCostos,
            totalUtilidad
        };
    }

    /**
     * Lógica Recargas: 5.5% ganancia para Daniel, 94.5% para Refacil
     */
    private calculateRecargasBreakdown(transactions: Transaction[]): CategoryBreakdown {
        const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0);
        const ganancia = totalSales * 0.055; // 5.5% ganancia
        const refacilFund = totalSales * 0.945; // 94.5% fondo Refacil

        return {
            category: 'Recargas (Refacil)',
            totalSales,
            totalCost: refacilFund, // El capital retornable se considera como "costo"
            netProfit: ganancia,
            robertShare: 0, // Robert no recibe de recargas
            danielShare: ganancia, // Daniel recibe 100% de la ganancia
            refacilFund,
            danielCostRecovery: 0
        };
    }

    /**
     * Lógica Servicios e Inventario Daniel: Daniel recupera 100% del costo, utilidad se divide 50/50
     */
    private calculateServiciosOrInventarioDanielBreakdown(
        transactions: Transaction[],
        category: string
    ): CategoryBreakdown {
        const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0);
        const totalCost = transactions.reduce((sum, t) => sum + t.cost, 0);
        const netProfit = totalSales - totalCost;

        const robertShare = netProfit / 2;
        const danielShare = netProfit / 2;
        const danielCostRecovery = totalCost;

        return {
            category,
            totalSales,
            totalCost,
            netProfit,
            robertShare,
            danielShare,
            refacilFund: 0,
            danielCostRecovery
        };
    }

    /**
     * Lógica Inventario Robert: La venta total se divide 50/50 (no hay costo registrado)
     */
    private calculateInventarioRobertBreakdown(transactions: Transaction[]): CategoryBreakdown {
        const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0);

        return {
            category: 'Inventario Robert',
            totalSales,
            totalCost: 0,
            netProfit: totalSales, // Todo es utilidad
            robertShare: totalSales / 2,
            danielShare: totalSales / 2,
            refacilFund: 0,
            danielCostRecovery: 0
        };
    }
}
