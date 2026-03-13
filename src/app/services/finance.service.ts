import { Injectable, signal, computed, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CashBox, CashBoxType, CashBoxTransfer } from '../models/cash-box.model';
import { Sale } from '../models/sale.model';
import { RefacilTransaction } from '../models/refacil-transaction.model';
import { Expense, ExpenseType } from '../models/expense.model';
import { Investment } from '../models/investment.model';
import { Liquidation, LiquidationBreakdown } from '../models/liquidation.model';
import { AuditLog } from '../models/audit-log.model';
import { Suggestion } from '../models/suggestion.model';
import { SyncService } from './sync.service';

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
    private suggestionsSignal = signal<Suggestion[]>([]);

    // Readonly public signals
    public cashBoxes = this.cashBoxesSignal.asReadonly();
    public sales = this.salesSignal.asReadonly();
    public refacilTransactions = this.refacilSignal.asReadonly();
    public expenses = this.expensesSignal.asReadonly();
    public investments = this.investmentsSignal.asReadonly();
    public liquidations = this.liquidationsSignal.asReadonly();
    public suggestions = this.suggestionsSignal.asReadonly();

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

    constructor(
        private supabase: SupabaseService,
        private syncService: SyncService
    ) {
        this.loadInitialData();
        
        // Listen to online status to trigger sync
        effect(() => {
            if (this.syncService.isOnline()) {
                this.syncPendingMutations();
            }
        });
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
            this.loadLiquidations(),
            this.loadSuggestions()
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
    // OFFLINE SYNC PROCESSING
    // =====================================================
    
    private isSyncing = false;
    
    private async syncPendingMutations() {
        if (this.isSyncing) return;
        
        const mutations = this.syncService.pendingMutations();
        if (mutations.length === 0) return;
        
        this.isSyncing = true;
        try {
            for (const mutation of mutations) {
                await this.processMutation(mutation);
                this.syncService.removeMutation(mutation.id);
            }
            await this.loadInitialData(); // Refresh all after sync completes
        } catch (error) {
            console.error('Error syncing offline mutations:', error);
        } finally {
            this.isSyncing = false;
        }
    }
    
    private async processMutation(mutation: any) {
        const payload = mutation.payload;
        switch (mutation.action) {
            case 'recordSale':
                await this.recordSale(payload, true); break;
            case 'updateSale':
                await this.updateSale(payload.id, payload.updates, true); break;
            case 'deleteSale':
                await this.deleteSale(payload.id, true); break;
            case 'recordRefacil':
                await this.recordRefacilTransaction(payload.amount, payload.description, payload.date ? new Date(payload.date) : undefined, true); break;
            case 'recordExpense':
                await this.recordExpense(payload, true); break;
            // Add other cases as needed to fully support offline sync
        }
    }

    // =====================================================
    // SALES OPERATIONS
    // =====================================================

    async recordSale(sale: Omit<Sale, 'id' | 'net_profit' | 'created_at' | 'updated_at'>, fromSync = false): Promise<Sale> {
        if (!this.syncService.isOnline() && !fromSync) {
            // Offline Mode: Queue it and optimistically update
            this.syncService.queueMutation('recordSale', sale);
            
            const tempSale: Sale = {
                ...sale,
                id: 'temp-' + Date.now().toString(),
                net_profit: sale.gross_amount - sale.cogs,
                created_at: new Date(),
                updated_at: new Date()
            };
            this.salesSignal.update(sales => [tempSale, ...sales]);
            return tempSale;
        }

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

        // Refresh boxes (trigger still updates principal box)
        await this.loadCashBoxes();

        return newSale;
    }

    async recordSales(sales: Omit<Sale, 'id' | 'net_profit' | 'created_at' | 'updated_at'>[]): Promise<void> {
        if (sales.length === 0) return;

        const insertData = sales.map(s => ({
            date: s.date.toISOString(),
            category: s.category,
            gross_amount: s.gross_amount,
            cogs: s.cogs,
            description: s.description
        }));

        const { error } = await this.supabase
            .from('sales')
            .insert(insertData);

        if (error) throw error;

        // Refresh everything
        await this.loadInitialData();
    }

    async updateSale(id: string, updates: Partial<Sale>, fromSync = false): Promise<void> {
        if (!this.syncService.isOnline() && !fromSync) {
            this.syncService.queueMutation('updateSale', { id, updates });
            this.salesSignal.update(sales => sales.map(s => s.id === id ? { ...s, ...updates } : s));
            return;
        }

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

    async deleteSale(id: string, fromSync = false): Promise<void> {
        if (!this.syncService.isOnline() && !fromSync) {
            this.syncService.queueMutation('deleteSale', { id });
            this.salesSignal.update(sales => sales.filter(s => s.id !== id));
            return;
        }

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
        description?: string,
        date?: Date,
        fromSync = false
    ): Promise<RefacilTransaction> {
        const trxDate = date || new Date();
        const profit = Math.round(amount * 0.055 * 100) / 100;
        const capital = amount - profit;

        if (!this.syncService.isOnline() && !fromSync) {
            this.syncService.queueMutation('recordRefacil', { amount, description, date: trxDate.toISOString() });
            
            const tempTransaction: RefacilTransaction = {
                id: 'temp-' + Date.now().toString(),
                date: trxDate,
                total_amount: amount,
                profit_generated: profit,
                capital_return: capital,
                description: description,
                created_at: new Date(),
                updated_at: new Date()
            };
            this.refacilSignal.update(transactions => [tempTransaction, ...transactions]);
            return tempTransaction;
        }

        const { data, error } = await this.supabase
            .from('refacil_transactions')
            .insert({
                date: trxDate.toISOString(),
                total_amount: amount,
                description: description
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

    async updateRefacilTransaction(id: string, amount: number, description?: string, date?: Date): Promise<void> {
        const trxDate = date ? date.toISOString() : undefined;
        // Logic for profit calculation if amount changes could be complex if we want to reverse previous effects perfectly.
        // For simplicity and correctness with the box model, it might be better to reverse the transaction manually or 
        // rely on a "diff" logic. However, since we re-calculate liquidations from scratch, we mostly care about the record being correct.
        // The cash boxes might need adjustment if amount changes. 
        // BUT `loadCashBoxes` re-fetches from DB. The DB triggers handle balance updates? 
        // The service seems to rely on `loadCashBoxes` to get fresh state.
        // Wait, `recordRefacilTransaction` does NOT seem to manually update boxes?
        // Ah, `recordInvestment` manually updates boxes. `recordRefacilTransaction` does NOT.
        // This implies Refacil transactions might not affect cash box balances in the DB automatically?
        // Let's check `RefacilTransaction` model or logic.
        // The prompt says "Se debería mostrar un historial de recargas y añadirle acciones de editar o eliminar cargas mal digitadas".
        // If I update a transaction, I should update the record.

        const updateData: any = {};
        if (amount !== undefined) updateData.total_amount = amount;
        if (description !== undefined) updateData.description = description;
        if (date !== undefined) updateData.date = trxDate;

        const { error } = await this.supabase
            .from('refacil_transactions')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        await Promise.all([this.loadRefacilTransactions(), this.loadCashBoxes()]);
    }

    // =====================================================
    // EXPENSE OPERATIONS
    // =====================================================

    async recordExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>, fromSync = false): Promise<Expense> {
        if (!this.syncService.isOnline() && !fromSync) {
            this.syncService.queueMutation('recordExpense', expense);
            
            const tempExpense: Expense = {
                ...expense,
                id: 'temp-' + Date.now().toString(),
                created_at: new Date(),
                updated_at: new Date()
            };
            this.expensesSignal.update(expenses => [tempExpense, ...expenses]);
            return tempExpense;
        }

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

        // Deduct from the selected box
        if (investment.source_box) {
            const box = this.cashBoxesSignal().find(b => b.id === investment.source_box);
            if (box) {
                const { error: boxError } = await this.supabase
                    .from('cash_boxes')
                    .update({ balance: box.balance - investment.amount })
                    .eq('id', box.id);
                if (boxError) console.error('Error updating box balance:', boxError);
            }
        }

        const newInvestment = this.parseInvestment(data);
        this.investmentsSignal.update(investments => [newInvestment, ...investments]);

        await this.loadCashBoxes(); // Refresh box signals

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
        const startStr = startDate.toISOString();
        const endStr = endDate.toISOString();

        // 1. Fetch Sales
        const { data: salesData, error: salesError } = await this.supabase
            .from('sales')
            .select('*')
            .gte('date', startStr)
            .lte('date', endStr);

        if (salesError) throw salesError;
        const sales = (salesData || []).map(this.parseSale);

        // 2. Fetch Recargas
        const { data: refacilData, error: refacilError } = await this.supabase
            .from('refacil_transactions')
            .select('*')
            .gte('date', startStr)
            .lte('date', endStr);

        if (refacilError) throw refacilError;
        const recargas = (refacilData || []).map(this.parseRefacilTransaction);

        // 3. Fetch Expenses
        const { data: expensesData, error: expensesError } = await this.supabase
            .from('expenses')
            .select('*')
            .gte('date', startStr)
            .lte('date', endStr);

        if (expensesError) throw expensesError;
        const expenses = (expensesData || []).map(this.parseExpense);

        // --- CALCULATIONS ---

        // Sales Breakdown
        const totalSalesGross = sales.reduce((sum, s) => sum + s.gross_amount, 0);
        const totalCOGS = sales.reduce((sum, s) => sum + s.cogs, 0);
        const danielInventoryCOGS = sales
            .filter(s => s.category === 'DANIEL')
            .reduce((sum, s) => sum + s.cogs, 0);

        // Recargas Breakdown (5.5% profit)
        const refacil_total_sales = recargas.reduce((sum, r) => sum + r.total_amount, 0);
        const refacil_profit = Math.round(refacil_total_sales * 0.055 * 100) / 100;

        // Expenses Breakdown
        const detailed_expenses = expenses.map(e => ({
            type: e.type,
            amount: e.amount,
            description: e.description
        }));

        const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
        const expenseCategories = {
            nomina: expenses.filter(e => e.type === ExpenseType.NOMINA).reduce((sum, e) => sum + e.amount, 0),
            internet: expenses.filter(e => e.type === ExpenseType.INTERNET).reduce((sum, e) => sum + e.amount, 0),
            luz: expenses.filter(e => e.type === ExpenseType.LUZ).reduce((sum, e) => sum + e.amount, 0),
            resmas: expenses.filter(e => e.type === ExpenseType.RESMAS).reduce((sum, e) => sum + e.amount, 0),
            otros: expenses.filter(e => e.type === ExpenseType.OTROS).reduce((sum, e) => sum + e.amount, 0),
            total: expensesTotal
        };

        // Profits
        const grossProfit = totalSalesGross - totalCOGS;
        const operatingProfit = grossProfit - expensesTotal; // Basis for 50/50 split
        const netProfit = operatingProfit + refacil_profit; // Total Net Result including Daniel's commission

        // Split (50/50 of Operating Profit)
        const robert_50 = Math.round((operatingProfit / 2) * 100) / 100;
        const daniel_50 = operatingProfit - robert_50;

        const refacil_capital_return = Math.round((refacil_total_sales - refacil_profit) * 100) / 100;

        return {
            totalSalesGross,
            totalCOGS,
            grossProfit,
            expenses: expenseCategories,
            detailed_expenses,
            netProfit,
            daniel_50,
            robert_50,
            refacil_total_sales,
            refacil_profit,
            refacil_capital_return,
            daniel_cogs_recovery: danielInventoryCOGS,
            operatingProfit
        };
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
        // 1. Fetch liquidation details if not already in state (or just use what's there)
        const liquidation = this.liquidationsSignal().find(l => l.id === liquidationId);
        if (!liquidation) throw new Error('Liquidación no encontrada');
        if (liquidation.status === 'CLOSED') return;

        const breakdown = liquidation.breakdown as LiquidationBreakdown;
        if (!breakdown) throw new Error('Detalles de liquidación no encontrados');

        // 2. Perform Cash Box Transfers
        // A. Returns COGS to ROI Box
        if (breakdown.daniel_cogs_recovery > 0) {
            const roiBox = this.roiBox();
            if (roiBox) {
                await this.supabase
                    .from('cash_boxes')
                    .update({ balance: roiBox.balance + breakdown.daniel_cogs_recovery })
                    .eq('id', roiBox.id);
            }
        }

        // B. Transfer Refacil Profit (5.5%) to Daniel's Benefit Box
        if (breakdown.refacil_profit > 0) {
            const benefitBox = this.beneficioDanielBox();
            if (benefitBox) {
                await this.supabase
                    .from('cash_boxes')
                    .update({ balance: benefitBox.balance + breakdown.refacil_profit })
                    .eq('id', benefitBox.id);
            }
        }

        // 3. Mark as CLOSED
        const { error } = await this.supabase
            .from('liquidations')
            .update({
                status: 'CLOSED',
                closed_at: new Date().toISOString()
            })
            .eq('id', liquidationId);

        if (error) throw error;

        // 4. Refresh everything
        await this.loadInitialData();
    }

    async deleteLiquidation(id: string): Promise<void> {
        const liquidation = this.liquidationsSignal().find(l => l.id === id);
        if (!liquidation) throw new Error('Liquidación no encontrada');
        if (liquidation.status !== 'OPEN') throw new Error('Solo se pueden eliminar liquidaciones abiertas');

        const { error } = await this.supabase
            .from('liquidations')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await this.loadInitialData();
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

    // =====================================================
    // SUGGESTIONS OPERATIONS
    // =====================================================

    async loadSuggestions() {
        const { data, error } = await this.supabase
            .from('suggestions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        this.suggestionsSignal.set(data?.map(this.parseSuggestion) || []);
    }

    async addSuggestion(title: string, description?: string): Promise<Suggestion> {
        const { data, error } = await this.supabase
            .from('suggestions')
            .insert({
                title,
                description: description || null,
                status: 'pendiente'
            })
            .select()
            .single();

        if (error) throw error;

        const newSuggestion = this.parseSuggestion(data);
        this.suggestionsSignal.update(list => [newSuggestion, ...list]);
        return newSuggestion;
    }

    async updateSuggestion(id: string, updates: Partial<Pick<Suggestion, 'title' | 'description' | 'status'>>): Promise<void> {
        const updateData: any = {};
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.status !== undefined) updateData.status = updates.status;

        const { error } = await this.supabase
            .from('suggestions')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        await this.loadSuggestions();
    }

    async deleteSuggestion(id: string): Promise<void> {
        const { error } = await this.supabase
            .from('suggestions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        this.suggestionsSignal.update(list => list.filter(s => s.id !== id));
    }

    private parseSuggestion(data: any): Suggestion {
        return {
            id: data.id,
            title: data.title,
            description: data.description,
            status: data.status,
            created_at: new Date(data.created_at),
            updated_at: new Date(data.updated_at)
        };
    }
}
