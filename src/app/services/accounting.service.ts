import { Injectable, signal, computed } from '@angular/core';
import { Transaction, TransactionType, PaymentMethod } from '../models/transaction.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
    providedIn: 'root'
})
export class AccountingService {
    private readonly STORAGE_KEY = 'colina-real-transactions';

    // Signals para estado reactivo
    private transactionsSignal = signal<Transaction[]>([]);

    // Computed signals para cálculos derivados
    public transactions = this.transactionsSignal.asReadonly();

    public cashBalance = computed(() => {
        return this.transactionsSignal().reduce((balance, transaction) => {
            if (transaction.paymentMethod !== PaymentMethod.EFECTIVO) return balance;

            switch (transaction.type) {
                case TransactionType.INGRESO:
                    return balance + transaction.amount;
                case TransactionType.GASTO:
                    return balance - transaction.amount;
                case TransactionType.TRANSFERENCIA:
                    // Las transferencias EFECTIVO -> NEQUI restan del efectivo
                    return balance - transaction.amount;
                default:
                    return balance;
            }
        }, 0);
    });

    public nequiBalance = computed(() => {
        return this.transactionsSignal().reduce((balance, transaction) => {
            if (transaction.paymentMethod !== PaymentMethod.NEQUI) return balance;

            switch (transaction.type) {
                case TransactionType.INGRESO:
                    return balance + transaction.amount;
                case TransactionType.GASTO:
                    return balance - transaction.amount;
                case TransactionType.TRANSFERENCIA:
                    // Las transferencias EFECTIVO -> NEQUI suman al nequi
                    return balance + transaction.amount;
                default:
                    return balance;
            }
        }, 0);
    });

    public totalBalance = computed(() => {
        return this.cashBalance() + this.nequiBalance();
    });

    public monthlySales = computed(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return this.transactionsSignal()
            .filter(t => {
                const tDate = new Date(t.date);
                return t.type === TransactionType.INGRESO &&
                    tDate.getMonth() === currentMonth &&
                    tDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);
    });

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage(): void {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Convertir strings de fecha a objetos Date
                const transactions = parsed.map((t: any) => ({
                    ...t,
                    date: new Date(t.date)
                }));
                this.transactionsSignal.set(transactions);
            } catch (error) {
                console.error('Error loading transactions from storage:', error);
            }
        }
    }

    private saveToStorage(): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.transactionsSignal()));
    }

    public addTransaction(transaction: Omit<Transaction, 'id'>): Transaction {
        const newTransaction: Transaction = {
            ...transaction,
            id: uuidv4()
        };

        this.transactionsSignal.update(transactions => [...transactions, newTransaction]);
        this.saveToStorage();

        return newTransaction;
    }

    public updateTransaction(id: string, updates: Partial<Transaction>): boolean {
        const index = this.transactionsSignal().findIndex(t => t.id === id);
        if (index === -1) return false;

        this.transactionsSignal.update(transactions => {
            const updated = [...transactions];
            updated[index] = { ...updated[index], ...updates };
            return updated;
        });

        this.saveToStorage();
        return true;
    }

    public deleteTransaction(id: string): boolean {
        const initialLength = this.transactionsSignal().length;
        this.transactionsSignal.update(transactions =>
            transactions.filter(t => t.id !== id)
        );

        if (this.transactionsSignal().length < initialLength) {
            this.saveToStorage();
            return true;
        }

        return false;
    }

    public getTransactionsByDateRange(startDate: Date, endDate: Date): Transaction[] {
        return this.transactionsSignal().filter(t => {
            const tDate = new Date(t.date);
            return tDate >= startDate && tDate <= endDate;
        });
    }

    public transferBetweenAccounts(amount: number, fromCash: boolean): void {
        // Crear una transacción de transferencia
        const transaction: Omit<Transaction, 'id'> = {
            date: new Date(),
            amount: amount,
            cost: 0,
            type: TransactionType.TRANSFERENCIA,
            category: fromCash ?
                TransactionCategory.GASTO_OPERATIVO :
                TransactionCategory.GASTO_OPERATIVO, // No importa la categoría para transferencias
            paymentMethod: fromCash ? PaymentMethod.EFECTIVO : PaymentMethod.NEQUI,
            description: fromCash ?
                `Transferencia de Efectivo a Nequi: $${amount.toLocaleString('es-CO')}` :
                `Transferencia de Nequi a Efectivo: $${amount.toLocaleString('es-CO')}`
        };

        this.addTransaction(transaction);
    }
}

// Importar para evitar errores
import { TransactionCategory } from '../models/transaction.model';
