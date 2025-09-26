-- Create vendor_info table
CREATE TABLE IF NOT EXISTS vendor_info (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_code VARCHAR(100) UNIQUE NOT NULL,
    business_registration_number VARCHAR(50),
    contact_person VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create vendor_commissions table  
CREATE TABLE IF NOT EXISTS vendor_commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES vendor_info(id) ON DELETE CASCADE,
    product_category VARCHAR(255),
    commission_rate DECIMAL(5,2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vendor_info_vendor_code ON vendor_info(vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendor_info_status ON vendor_info(status);
CREATE INDEX IF NOT EXISTS idx_vendor_commissions_vendor_id ON vendor_commissions(vendor_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_vendor_info_updated_at ON vendor_info;
CREATE TRIGGER update_vendor_info_updated_at BEFORE UPDATE ON vendor_info
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendor_commissions_updated_at ON vendor_commissions;
CREATE TRIGGER update_vendor_commissions_updated_at BEFORE UPDATE ON vendor_commissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
