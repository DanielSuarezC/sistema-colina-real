import { Injectable, signal, computed, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CashBox, CashBoxType, CashBoxTransfer } from '../models/cash-box.model';
import { Sale } from '../models/sale.model';
import { RefacilTransaction } from '../models/refacil-transaction.model';
import { Expense } from '../models/expense.model';
import { Investment } from '../models/investment.model';
import { Liquidation, LiquidationBreakdown } from '../models/liquidation.model';
import { AuditLog } from '../models/audit-log.model';

@Injectable({
    providedIn: 'root'
})
export class FinanceService {
    // Signals for reactive state
    private cashBoxesSignal = signal<CashBox[]>([]);
    private salesSignal = signal<Sale[]>([]);
    private refacilSignal = signal<RefacilTransaction[]>([]);
    private expensesSignal = signal<Expense[]>([]);
    private investmentsSignal = signal<Investment[]>([]);
    private liquidationsSignal = signal<Liquidation[]>([]);

    // Readonly public signals
    public cashBoxes = this.cashBoxesSignal.asReadonly();
    public sales = this.salesSignal.asReadonly();
    public refacilTransactions = this.refacilSignal.asReadonly();
    public expenses = this.expensesSignal.asReadonly();
    public investments = this.investmentsSignal.asReadonly();
    public liquidations = this.liquidationsSignal.asReadonly();

    // Computed values
    public totalBalance = computed(() =>
        this.cashBoxesSignal().reduce((sum, box) => sum + box.balance, 0)
    );

    public principalBox = computed(() =>
        this.cashBoxesSignal().find(b => b.name === CashBoxType.PRINCIPAL)
    );

    public recargasBox = computed(() =>
        this.cashBoxesSignal().find(b => b.name === CashBoxType.RECARGAS)
    );

    public roiBox = computed(() =>
        this.cashBoxesSignal().find(b => b.name === CashBoxType.ROI)
    );

    public beneficioDanielBox = computed(() =>
        this.cashBoxesSignal().find(b => b.name === CashBoxType.BENEFICIO_DANIEL)
    );

    public monthlySales = computed(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return this.salesSignal().filter(s => {
            const saleDate = new Date(s.date);
            return saleDate.getMonth() === currentMonth &&
                saleDate.getFullYear() === currentYear;
        }).reduce((sum, s) => sum + s.gross_amount, 0);
    });

    public monthlyExpenses = computed(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return this.expensesSignal().filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate.getMonth() === currentMonth &&
                expenseDate.getFullYear() === currentYear;
        }).reduce((sum, e) => sum + e.amount, 0);
    });

    public pendingLiquidations = computed(() =>
        this.liquidationsSignal().filter(l => l.status === 'OPEN')
    );

    constructor(private supabase: SupabaseService) {
        this.loadInitialData();
    }

    // =====================================================
    // DATA LOADING
    // =====================================================

    private async loadInitialData() {
        await Promise.all([
            this.loadCashBoxes(),
            this.loadSales(),
            this.loadRefacilTransactions(),
            this.loadExpenses(),
            this.loadInvestments(),
            this.loadLiquidations()
        ]);
    }

    private async loadCashBoxes() {
        const { data, error } = await this.supabase
            .from('cash_boxes')
            .select('*')
            .order('name');

        if (error) throw error;

        this.cashBoxesSignal.set(data?.map(this.parseCashBox) || []);
    }

    private async loadSales() {
        const { data, error } = await this.supabase
            .from('sales')
            .select('*')
            .order('date', { ascending: false })
            .limit(100);

        if (error) throw error;

        this.salesSignal.set(data?.map(this.parseSale) || []);
    }

    private async loadRefacilTransactions() {
        const { data, error } = await this.supabase
            .from('refacil_transactions')
            .select('*')
            .order('date', { ascending: false })
            .limit(100);

        if (error) throw error;

        this.refacilSignal.set(data?.map(this.parseRefacilTransaction) || []);
    }

    private async loadExpenses() {
        const { data, error } = await this.supabase
            .from('expenses')
            .select('*')
            .order('date', { ascending: false })
            .limit(100);

        if (error) throw error;

        this.expensesSignal.set(data?.map(this.parseExpense) || []);
    }

    private async loadInvestments() {
        const { data, error } = await this.supabase
            .from('investments')
            .select('*')
            .order('date', { ascending: false })
            .limit(100);

        if (error) throw error;

        this.investmentsSignal.set(data?.map(this.parseInvestment) || []);
    }

    private async loadLiquidations() {
        const { data, error } = await this.supabase
            .from('liquidations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        this.liquidationsSignal.set(data?.map(this.parseLiquidation) || []);
    }

    // =====================================================
    // SALES OPERATIONS
    // =====================================================

    async recordSale(sale: Omit<Sale, 'id' | 'net_profit' | 'created_at' | 'updated_at'>): Promise<Sale> {
        const { data, error } = await this.supabase
            .from('sales')
            .insert({
                date: sale.date.toISOString(),
                category: sale.category,
                gross_amount: sale.gross_amount,
                cogs: sale.cogs,
                description: sale.description
            })
            .select()
            .single();

        if (error) throw error;

        const newSale = this.parseSale(data);
        this.salesSignal.update(sales => [newSale, ...sales]);

        // Refresh boxes since sales update the principal box balance
        await this.loadCashBoxes();

        return newSale;
    }

    async updateSale(id: string, updates: Partial<Sale>): Promise<void> {
        const updateData: any = {};
        if (updates.date) updateData.date = updates.date.toISOString();
        if (updates.category) updateData.category = updates.category;
        if (updates.gross_amount !== undefined) updateData.gross_amount = updates.gross_amount;
        if (updates.cogs !== undefined) updateData.cogs = updates.cogs;
        if (updates.description !== undefined) updateData.description = updates.description;

        const { error } = await this.supabase
            .from('sales')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        await this.loadInitialData(); // Refresh all to catch box updates
    }

    async deleteSale(id: string): Promise<void> {
        const { error } = await this.supabase
            .from('sales')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await this.loadInitialData();
    }

    // =====================================================
    // REFÁCIL OPERATIONS (RF-05: 5.5% / 94.5% split)
    // =====================================================

    async recordRefacilTransaction(
        amount: number,
        description?: string
    ): Promise<RefacilTransaction> {
        const { data, error } = await this.supabase
            .from('refacil_transactions')
            .insert({
                date: new Date().toISOString(),
                total_amount: amount,
                description
            })
            .select()
            .single();

        if (error) throw error;

        const newTransaction = this.parseRefacilTransaction(data);
        this.refacilSignal.update(transactions => [newTransaction, ...transactions]);

        // Refresh everything else that changed (boxes)
        await this.loadCashBoxes();

        return newTransaction;
    }

    async deleteRefacilTransaction(id: string): Promise<void> {
        const { error } = await this.supabase
            .from('refacil_transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await Promise.all([this.loadRefacilTransactions(), this.loadCashBoxes()]);
    }

    // =====================================================
    // EXPENSE OPERATIONS
    // =====================================================

    async recordExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
        const { data, error } = await this.supabase
            .from('expenses')
            .insert({
                date: expense.date.toISOString(),
                type: expense.type,
                amount: expense.amount,
                quantity: expense.quantity,
                description: expense.description
            })
            .select()
            .single();

        if (error) throw error;

        const newExpense = this.parseExpense(data);
        this.expensesSignal.update(expenses => [newExpense, ...expenses]);

        return newExpense;
    }

    async updateExpense(id: string, updates: Partial<Expense>): Promise<void> {
        const updateData: any = {};
        if (updates.date) updateData.date = updates.date instanceof Date ? updates.date.toISOString() : updates.date;
        if (updates.type) updateData.type = updates.type;
        if (updates.amount !== undefined) updateData.amount = updates.amount;
        if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
        if (updates.description !== undefined) updateData.description = updates.description;

        const { error } = await this.supabase
            .from('expenses')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        await this.loadExpenses();
    }

    async deleteExpense(id: string): Promise<void> {
        const { error } = await this.supabase
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await this.loadExpenses();
    }

    // =====================================================
    // INVESTMENT OPERATIONS
    // =====================================================

    async recordInvestment(
        investment: Omit<Investment, 'id' | 'created_at' | 'updated_at'>
    ): Promise<Investment> {
        const { data, error } = await this.supabase
            .from('investments')
            .insert({
                date: investment.date.toISOString(),
                concept: investment.concept,
                amount: investment.amount,
                description: investment.description,
                source_box: investment.source_box,
                recovered_amount: investment.recovered_amount || 0
            })
            .select()
            .single();

        if (error) throw error;

        const newInvestment = this.parseInvestment(data);
        this.investmentsSignal.update(investments => [newInvestment, ...investments]);

        await this.loadCashBoxes(); // Investments deduct from boxes

        return newInvestment;
    }

    async updateInvestmentRecovery(id: string, recoveredAmount: number): Promise<void> {
        const { error } = await this.supabase
            .from('investments')
            .update({ recovered_amount: recoveredAmount })
            .eq('id', id);

        if (error) throw error;
        await Promise.all([this.loadInvestments(), this.loadCashBoxes()]);
    }

    async deleteInvestment(id: string): Promise<void> {
        const { error } = await this.supabase
            .from('investments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await Promise.all([this.loadInvestments(), this.loadCashBoxes()]);
    }

    // =====================================================
    // CASH BOX OPERATIONS (RF-12)
    // =====================================================

    async transferBetweenBoxes(
        fromBoxId: string,
        toBoxId: string,
        amount: number,
        concept: string
    ): Promise<CashBoxTransfer> {
        // Validate sufficient balance
        const fromBox = this.cashBoxesSignal().find(b => b.id === fromBoxId);
        if (!fromBox || fromBox.balance < amount) {
            throw new Error('Saldo insuficiente en la caja de origen');
        }

        if (!concept || concept.trim() === '') {
            throw new Error('El concepto es obligatorio para las transferencias');
        }

        const { data, error } = await this.supabase
            .from('cash_box_transfers')
            .insert({
                date: new Date().toISOString(),
                from_box: fromBoxId,
                to_box: toBoxId,
                amount,
                concept
            })
            .select()
            .single();

        if (error) throw error;

        // Transfers update box balances
        await this.loadCashBoxes();

        return this.parseCashBoxTransfer(data);
    }

    async manualAdjustment(
        boxId: string,
        newBalance: number,
        reason: string
    ): Promise<void> {
        if (!reason || reason.trim() === '') {
            throw new Error('Debe proporcionar un motivo para el ajuste manual');
        }

        const { error } = await this.supabase
            .from('cash_boxes')
            .update({ balance: newBalance })
            .eq('id', boxId);

        if (error) throw error;

        // Log the manual adjustment in audit
        // The audit trigger will handle this automatically
    }

    // =====================================================
    // LIQUIDATION OPERATIONS (RF-10: 50/50 split)
    // =====================================================

    async calculateLiquidation(
        startDate: Date,
        endDate: Date
    ): Promise<LiquidationBreakdown> {
        const { data, error } = await this.supabase
            .rpc('calculate_liquidation', {
                p_start_date: startDate.toISOString(),
                p_end_date: endDate.toISOString()
            });

        if (error) throw error;

        return data as LiquidationBreakdown;
    }

    async createLiquidation(
        startDate: Date,
        endDate: Date
    ): Promise<Liquidation> {
        // First calculate the breakdown
        const breakdown = await this.calculateLiquidation(startDate, endDate);

        const { data, error } = await this.supabase
            .from('liquidations')
            .insert({
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                total_income: breakdown.totalSalesGross,
                total_expenses: breakdown.expenses.total,
                net_profit: breakdown.netProfit,
                daniel_50: breakdown.daniel_50,
                robert_50: breakdown.robert_50,
                status: 'OPEN',
                breakdown: breakdown
            })
            .select()
            .single();

        if (error) throw error;

        const newLiquidation = this.parseLiquidation(data);
        this.liquidationsSignal.update(liq => [newLiquidation, ...liq]);

        return newLiquidation;
    }

    async closeLiquidationPeriod(liquidationId: string): Promise<void> {
        const { error } = await this.supabase
            .from('liquidations')
            .update({
                status: 'CLOSED',
                closed_at: new Date().toISOString()
            })
            .eq('id', liquidationId);

        if (error) throw error;
        await this.loadLiquidations();
    }

    // =====================================================
    // AUDIT LOG OPERATIONS
    // =====================================================

    async loadAuditLogs(filters?: {
        table_name?: string;
        action?: string;
        start_date?: Date;
        end_date?: Date;
    }): Promise<AuditLog[]> {
        let query = this.supabase
            .from('audit_log')
            .select('*')
            .order('changed_at', { ascending: false })
            .limit(200);

        if (filters?.table_name) {
            query = query.eq('table_name', filters.table_name);
        }
        if (filters?.action) {
            query = query.eq('action', filters.action);
        }
        if (filters?.start_date) {
            query = query.gte('changed_at', filters.start_date.toISOString());
        }
        if (filters?.end_date) {
            query = query.lte('changed_at', filters.end_date.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((d: any) => ({
            id: d.id,
            table_name: d.table_name,
            record_id: d.record_id,
            action: d.action,
            old_data: d.old_data,
            new_data: d.new_data,
            changed_by: d.changed_by,
            changed_at: new Date(d.changed_at)
        }));
    }

    // =====================================================
    // DATA PARSERS (convert DB types to TypeScript types)
    // =====================================================

    private parseCashBox(data: any): CashBox {
        return {
            id: data.id,
            name: data.name as CashBoxType,
            balance: Number(data.balance),
            updated_at: new Date(data.updated_at)
        };
    }

    private parseSale(data: any): Sale {
        return {
            id: data.id,
            date: new Date(data.date),
            category: data.category,
            gross_amount: Number(data.gross_amount),
            cogs: Number(data.cogs),
            net_profit: Number(data.net_profit),
            description: data.description,
            created_at: new Date(data.created_at),
            updated_at: new Date(data.updated_at)
        };
    }

    private parseRefacilTransaction(data: any): RefacilTransaction {
        return {
            id: data.id,
            date: new Date(data.date),
            total_amount: Number(data.total_amount),
            profit_generated: Number(data.profit_generated),
            capital_return: Number(data.capital_return),
            description: data.description,
            created_at: new Date(data.created_at),
            updated_at: new Date(data.updated_at)
        };
    }

    private parseExpense(data: any): Expense {
        return {
            id: data.id,
            date: new Date(data.date),
            type: data.type,
            amount: Number(data.amount),
            quantity: data.quantity,
            description: data.description,
            created_at: new Date(data.created_at),
            updated_at: new Date(data.updated_at)
        };
    }

    private parseInvestment(data: any): Investment {
        return {
            id: data.id,
            date: new Date(data.date),
            concept: data.concept,
            amount: Number(data.amount),
            description: data.description,
            source_box: data.source_box,
            recovered_amount: Number(data.recovered_amount),
            created_at: new Date(data.created_at),
            updated_at: new Date(data.updated_at)
        };
    }

    private parseLiquidation(data: any): Liquidation {
        return {
            id: data.id,
            start_date: new Date(data.start_date),
            end_date: new Date(data.end_date),
            total_income: Number(data.total_income),
            total_expenses: Number(data.total_expenses),
            net_profit: Number(data.net_profit),
            daniel_50: Number(data.daniel_50),
            robert_50: Number(data.robert_50),
            status: data.status,
            breakdown: data.breakdown,
            change_log: data.change_log,
            created_at: new Date(data.created_at),
            closed_at: data.closed_at ? new Date(data.closed_at) : undefined
        };
    }

    private parseCashBoxTransfer(data: any): CashBoxTransfer {
        return {
            id: data.id,
            date: new Date(data.date),
            from_box: data.from_box,
            to_box: data.to_box,
            amount: Number(data.amount),
            concept: data.concept,
            created_by: data.created_by,
            created_at: new Date(data.created_at)
        };
    }
}
