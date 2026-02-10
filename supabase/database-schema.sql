-- =====================================================
-- Sistema Colina Real - Complete Database Schema
-- PostgreSQL / Supabase
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- 1. SALES TABLE
-- Tracks daily sales with gross amount, COGS, and net profit
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category TEXT NOT NULL CHECK (category IN ('SR_ROBERT', 'DANIEL', 'SERVICIOS')),
    gross_amount DECIMAL(12,2) NOT NULL CHECK (gross_amount >= 0),
    cogs DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (cogs >= 0),
    net_profit DECIMAL(12,2) GENERATED ALWAYS AS (gross_amount - cogs) STORED,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. REFÁCIL TRANSACTIONS TABLE
-- Specialized table for recharge transactions with automatic 5.5%/94.5% split
CREATE TABLE refacil_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    profit_generated DECIMAL(12,2) GENERATED ALWAYS AS (ROUND(total_amount * 0.055, 2)) STORED,
    capital_return DECIMAL(12,2) GENERATED ALWAYS AS (ROUND(total_amount * 0.945, 2)) STORED,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INVESTMENTS TABLE
-- Investment tracking with ROI calculation
CREATE TABLE investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    concept TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    source_box UUID NOT NULL,
    recovered_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (recovered_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. EXPENSES TABLE
-- Operational expenses with categorization
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type TEXT NOT NULL CHECK (type IN ('NOMINA', 'INTERNET', 'LUZ', 'RESMAS', 'OTROS')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    quantity INTEGER,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CASH BOXES TABLE (4 boxes)
-- Principal, Recargas, ROI, Beneficio Daniel
CREATE TABLE cash_boxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE CHECK (name IN ('PRINCIPAL', 'RECARGAS', 'ROI', 'BENEFICIO_DANIEL')),
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CASH BOX TRANSFERS TABLE
-- Audit trail for transfers between boxes
CREATE TABLE cash_box_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    from_box UUID NOT NULL REFERENCES cash_boxes(id),
    to_box UUID NOT NULL REFERENCES cash_boxes(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    concept TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT different_boxes CHECK (from_box != to_box)
);

-- 7. LIQUIDATIONS TABLE
-- Period closures with 50/50 profit split and change log
CREATE TABLE liquidations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    total_income DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_expenses DECIMAL(12,2) NOT NULL DEFAULT 0,
    net_profit DECIMAL(12,2) NOT NULL DEFAULT 0,
    daniel_50 DECIMAL(12,2) NOT NULL DEFAULT 0,
    robert_50 DECIMAL(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    breakdown JSONB,
    change_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- 8. AUDIT LOG TABLE
-- Comprehensive change tracking
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_sales_date ON sales(date DESC);
CREATE INDEX idx_sales_category ON sales(category);
CREATE INDEX idx_refacil_date ON refacil_transactions(date DESC);
CREATE INDEX idx_investments_source_box ON investments(source_box);
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_type ON expenses(type);
CREATE INDEX idx_transfers_date ON cash_box_transfers(date DESC);
CREATE INDEX idx_liquidations_dates ON liquidations(start_date, end_date);
CREATE INDEX idx_liquidations_status ON liquidations(status);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);

-- =====================================================
-- INITIAL DATA - Create the 4 cash boxes
-- =====================================================

INSERT INTO cash_boxes (name, balance) VALUES
    ('PRINCIPAL', 0),
    ('RECARGAS', 0),
    ('ROI', 0),
    ('BENEFICIO_DANIEL', 0)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refacil_updated_at BEFORE UPDATE ON refacil_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_boxes_updated_at BEFORE UPDATE ON cash_boxes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- BUSINESS LOGIC TRIGGERS
-- =====================================================

-- TRIGGER 1: Update PRINCIPAL cash box on sales
CREATE OR REPLACE FUNCTION update_principal_box_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    principal_box_id UUID;
BEGIN
    -- Get Principal box ID
    SELECT id INTO principal_box_id FROM cash_boxes WHERE name = 'PRINCIPAL';
    
    IF TG_OP = 'INSERT' THEN
        -- Add net profit to Principal box
        UPDATE cash_boxes 
        SET balance = balance + NEW.net_profit
        WHERE id = principal_box_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Adjust for the difference
        UPDATE cash_boxes 
        SET balance = balance - OLD.net_profit + NEW.net_profit
        WHERE id = principal_box_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove the net profit
        UPDATE cash_boxes 
        SET balance = balance - OLD.net_profit
        WHERE id = principal_box_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_principal_box_on_sale
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_principal_box_on_sale();

-- TRIGGER 2: Update Refácil boxes on transaction (RF-05: 5.5% / 94.5% split)
CREATE OR REPLACE FUNCTION update_refacil_boxes_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    beneficio_box_id UUID;
    recargas_box_id UUID;
BEGIN
    -- Get box IDs
    SELECT id INTO beneficio_box_id FROM cash_boxes WHERE name = 'BENEFICIO_DANIEL';
    SELECT id INTO recargas_box_id FROM cash_boxes WHERE name = 'RECARGAS';
    
    IF TG_OP = 'INSERT' THEN
        -- Add 5.5% to Beneficio Daniel, 94.5% to Recargas
        UPDATE cash_boxes 
        SET balance = balance + NEW.profit_generated
        WHERE id = beneficio_box_id;
        
        UPDATE cash_boxes 
        SET balance = balance + NEW.capital_return
        WHERE id = recargas_box_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Adjust for the difference
        UPDATE cash_boxes 
        SET balance = balance - OLD.profit_generated + NEW.profit_generated
        WHERE id = beneficio_box_id;
        
        UPDATE cash_boxes 
        SET balance = balance - OLD.capital_return + NEW.capital_return
        WHERE id = recargas_box_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove the amounts
        UPDATE cash_boxes 
        SET balance = balance - OLD.profit_generated
        WHERE id = beneficio_box_id;
        
        UPDATE cash_boxes 
        SET balance = balance - OLD.capital_return
        WHERE id = recargas_box_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_refacil_boxes
    AFTER INSERT OR UPDATE OR DELETE ON refacil_transactions
    FOR EACH ROW EXECUTE FUNCTION update_refacil_boxes_on_transaction();

-- TRIGGER 3: Update cash boxes on transfers (RF-12)
CREATE OR REPLACE FUNCTION update_boxes_on_transfer()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Deduct from source box
        UPDATE cash_boxes 
        SET balance = balance - NEW.amount
        WHERE id = NEW.from_box;
        
        -- Add to destination box
        UPDATE cash_boxes 
        SET balance = balance + NEW.amount
        WHERE id = NEW.to_box;
    ELSIF TG_OP = 'DELETE' THEN
        -- Reverse the transfer
        UPDATE cash_boxes 
        SET balance = balance + OLD.amount
        WHERE id = OLD.from_box;
        
        UPDATE cash_boxes 
        SET balance = balance - OLD.amount
        WHERE id = OLD.to_box;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_boxes_on_transfer
    AFTER INSERT OR DELETE ON cash_box_transfers
    FOR EACH ROW EXECUTE FUNCTION update_boxes_on_transfer();

-- TRIGGER 4: Update ROI box on investment
CREATE OR REPLACE FUNCTION update_roi_box_on_investment()
RETURNS TRIGGER AS $$
DECLARE
    roi_box_id UUID;
BEGIN
    SELECT id INTO roi_box_id FROM cash_boxes WHERE name = 'ROI';
    
    IF TG_OP = 'INSERT' THEN
        -- Deduct investment from source box (already handled by transfer logic if desired)
        -- Add recovered amount to ROI box
        UPDATE cash_boxes 
        SET balance = balance + NEW.recovered_amount
        WHERE id = roi_box_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Adjust ROI box for change in recovered amount
        UPDATE cash_boxes 
        SET balance = balance - OLD.recovered_amount + NEW.recovered_amount
        WHERE id = roi_box_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove recovered amount from ROI box
        UPDATE cash_boxes 
        SET balance = balance - OLD.recovered_amount
        WHERE id = roi_box_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_roi_box
    AFTER INSERT OR UPDATE OR DELETE ON investments
    FOR EACH ROW EXECUTE FUNCTION update_roi_box_on_investment();

-- =====================================================
-- AUDIT LOGGING TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION log_audit_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to key tables
CREATE TRIGGER audit_sales AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_refacil AFTER INSERT OR UPDATE OR DELETE ON refacil_transactions
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_investments AFTER INSERT OR UPDATE OR DELETE ON investments
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_expenses AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_transfers AFTER INSERT OR UPDATE OR DELETE ON cash_box_transfers
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_liquidations AFTER INSERT OR UPDATE OR DELETE ON liquidations
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE refacil_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_box_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can do everything
-- (In production, you'd want more granular policies)

CREATE POLICY "Authenticated users can manage sales"
    ON sales FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage refacil"
    ON refacil_transactions FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage investments"
    ON investments FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage expenses"
    ON expenses FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view cash boxes"
    ON cash_boxes FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage cash boxes"
    ON cash_boxes FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage transfers"
    ON cash_box_transfers FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage liquidations"
    ON liquidations FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view audit log"
    ON audit_log FOR SELECT
    USING (auth.role() = 'authenticated');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate liquidation for a date range (RF-10)
CREATE OR REPLACE FUNCTION calculate_liquidation(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_total_sales_gross DECIMAL(12,2);
    v_total_cogs DECIMAL(12,2);
    v_gross_profit DECIMAL(12,2);
    v_nomina DECIMAL(12,2);
    v_internet DECIMAL(12,2);
    v_luz DECIMAL(12,2);
    v_resmas DECIMAL(12,2);
    v_otros DECIMAL(12,2);
    v_total_expenses DECIMAL(12,2);
    v_net_profit DECIMAL(12,2);
    v_daniel_50 DECIMAL(12,2);
    v_robert_50 DECIMAL(12,2);
BEGIN
    -- Calculate total sales
    SELECT 
        COALESCE(SUM(gross_amount), 0),
        COALESCE(SUM(cogs), 0)
    INTO v_total_sales_gross, v_total_cogs
    FROM sales
    WHERE date >= p_start_date AND date <= p_end_date;
    
    v_gross_profit := v_total_sales_gross - v_total_cogs;
    
    -- Calculate expenses by type
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'NOMINA' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'INTERNET' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'LUZ' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'RESMAS' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'OTROS' THEN amount ELSE 0 END), 0)
    INTO v_nomina, v_internet, v_luz, v_resmas, v_otros
    FROM expenses
    WHERE date >= p_start_date AND date <= p_end_date;
    
    v_total_expenses := v_nomina + v_internet + v_luz + v_resmas + v_otros;
    
    -- Calculate net profit (RF-10: Gross Profit - Expenses)
    v_net_profit := v_gross_profit - v_total_expenses;
    
    -- 50/50 split (RF-10)
    v_daniel_50 := ROUND(v_net_profit / 2, 2);
    v_robert_50 := ROUND(v_net_profit / 2, 2);
    
    -- Build result JSON
    v_result := jsonb_build_object(
        'totalSalesGross', v_total_sales_gross,
        'totalCOGS', v_total_cogs,
        'grossProfit', v_gross_profit,
        'expenses', jsonb_build_object(
            'nomina', v_nomina,
            'internet', v_internet,
            'luz', v_luz,
            'resmas', v_resmas,
            'otros', v_otros,
            'total', v_total_expenses
        ),
        'netProfit', v_net_profit,
        'daniel_50', v_daniel_50,
        'robert_50', v_robert_50
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get cash box by name
CREATE OR REPLACE FUNCTION get_cash_box_id(box_name TEXT)
RETURNS UUID AS $$
DECLARE
    box_id UUID;
BEGIN
    SELECT id INTO box_id FROM cash_boxes WHERE name = box_name;
    RETURN box_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Current cash box balances
CREATE OR REPLACE VIEW v_current_balances AS
SELECT 
    name,
    balance,
    updated_at
FROM cash_boxes
ORDER BY 
    CASE name
        WHEN 'PRINCIPAL' THEN 1
        WHEN 'RECARGAS' THEN 2
        WHEN 'ROI' THEN 3
        WHEN 'BENEFICIO_DANIEL' THEN 4
    END;

-- View: Monthly sales summary
CREATE OR REPLACE VIEW v_monthly_sales AS
SELECT 
    DATE_TRUNC('month', date) as month,
    category,
    COUNT(*) as transaction_count,
    SUM(gross_amount) as total_gross,
    SUM(cogs) as total_cogs,
    SUM(net_profit) as total_net_profit
FROM sales
GROUP BY DATE_TRUNC('month', date), category
ORDER BY month DESC, category;

-- View: Investment ROI tracking
CREATE OR REPLACE VIEW v_investment_roi AS
SELECT 
    i.*,
    ROUND((recovered_amount / NULLIF(amount, 0)) * 100, 2) as roi_percentage,
    CASE 
        WHEN recovered_amount >= amount THEN 'RECOVERED'
        WHEN recovered_amount > 0 THEN 'PARTIAL'
        ELSE 'ACTIVE'
    END as status
FROM investments i
ORDER BY date DESC;

-- =====================================================
-- GRANT PERMISSIONS (for Supabase authenticated role)
-- =====================================================

-- This will be handled automatically by Supabase RLS,
-- but you can add specific grants if needed
