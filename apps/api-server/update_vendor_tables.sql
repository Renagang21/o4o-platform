-- Update vendor_info table to match VendorInfo entity structure
-- First, let's drop the old table and recreate with proper structure

DROP TABLE IF EXISTS vendor_commissions CASCADE;
DROP TABLE IF EXISTS vendor_info CASCADE;

-- Create vendor_info table matching the VendorInfo entity
CREATE TABLE vendor_info (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "userId" UUID UNIQUE NOT NULL,
    "vendorName" VARCHAR(255) NOT NULL,
    "vendorType" VARCHAR(50) DEFAULT 'individual' CHECK ("vendorType" IN ('individual', 'business')),
    "contactName" VARCHAR(255) NOT NULL,
    "contactPhone" VARCHAR(50) NOT NULL,
    "contactEmail" VARCHAR(255) NOT NULL,
    "mainCategories" TEXT, -- Will store as comma-separated values
    "monthlyTarget" DECIMAL(12,2),
    "affiliateCode" VARCHAR(100) UNIQUE,
    "affiliateRate" DECIMAL(5,2) DEFAULT 5.00,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    "approvedBy" UUID,
    "totalSales" INTEGER DEFAULT 0,
    "totalRevenue" DECIMAL(12,2) DEFAULT 0,
    rating DECIMAL(3,2),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    CONSTRAINT fk_vendor_info_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Recreate vendor_commissions table matching VendorCommission entity
CREATE TABLE vendor_commissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "vendorId" UUID NOT NULL,
    period VARCHAR(7) NOT NULL, -- YYYY-MM format
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalOrders" INTEGER DEFAULT 0,
    "completedOrders" INTEGER DEFAULT 0,
    "cancelledOrders" INTEGER DEFAULT 0,
    "refundedOrders" INTEGER DEFAULT 0,
    "grossSales" DECIMAL(12,2) DEFAULT 0,
    "netSales" DECIMAL(12,2) DEFAULT 0,
    "refundAmount" DECIMAL(12,2) DEFAULT 0,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "baseCommission" DECIMAL(12,2) DEFAULT 0,
    "bonusCommission" DECIMAL(12,2) DEFAULT 0,
    "totalCommission" DECIMAL(12,2) DEFAULT 0,
    "platformFee" DECIMAL(12,2) DEFAULT 0,
    "transactionFee" DECIMAL(12,2) DEFAULT 0,
    "refundDeduction" DECIMAL(12,2) DEFAULT 0,
    "otherDeductions" DECIMAL(12,2) DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) DEFAULT 0,
    "netCommission" DECIMAL(12,2) DEFAULT 0,
    "previousBalance" DECIMAL(12,2) DEFAULT 0,
    "totalPayable" DECIMAL(12,2) DEFAULT 0,
    "affiliateEarnings" DECIMAL(12,2) DEFAULT 0,
    "affiliateClicks" INTEGER DEFAULT 0,
    "affiliateConversions" INTEGER DEFAULT 0,
    "totalProductsSold" INTEGER DEFAULT 0,
    "uniqueProductsSold" INTEGER DEFAULT 0,
    "topProducts" JSONB,
    "categoryBreakdown" JSONB,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'paid', 'disputed', 'cancelled')),
    "approvedBy" VARCHAR(255),
    "approvedAt" TIMESTAMP WITH TIME ZONE,
    "approvalNotes" TEXT,
    "paymentMethod" VARCHAR(100),
    "paymentReference" VARCHAR(255),
    "paidAt" TIMESTAMP WITH TIME ZONE,
    "paidAmount" DECIMAL(12,2),
    "bankAccountNumber" VARCHAR(50),
    "bankName" VARCHAR(100),
    "isDisputed" BOOLEAN DEFAULT FALSE,
    "disputeReason" TEXT,
    "disputedAt" TIMESTAMP WITH TIME ZONE,
    "disputeResolvedAt" TIMESTAMP WITH TIME ZONE,
    "disputeResolution" TEXT,
    adjustments JSONB,
    "totalAdjustments" DECIMAL(12,2) DEFAULT 0,
    "invoiceNumber" VARCHAR(100),
    "invoiceUrl" VARCHAR(500),
    "invoiceGeneratedAt" TIMESTAMP WITH TIME ZONE,
    "internalNotes" TEXT,
    "vendorNotes" TEXT,
    metadata JSONB,
    "calculationDetails" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    CONSTRAINT fk_vendor_commissions_vendor FOREIGN KEY ("vendorId") REFERENCES vendor_info(id) ON DELETE CASCADE,
    -- Unique constraint for vendor and period
    CONSTRAINT uk_vendor_commission_period UNIQUE ("vendorId", period)
);

-- Create indexes for vendor_info
CREATE INDEX IF NOT EXISTS idx_vendor_info_userId ON vendor_info("userId");
CREATE INDEX IF NOT EXISTS idx_vendor_info_status ON vendor_info(status);
CREATE INDEX IF NOT EXISTS idx_vendor_info_affiliateCode ON vendor_info("affiliateCode") WHERE "affiliateCode" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_info_created_at ON vendor_info("createdAt");

-- Create indexes for vendor_commissions
CREATE INDEX IF NOT EXISTS idx_vendor_commissions_vendorId ON vendor_commissions("vendorId");
CREATE INDEX IF NOT EXISTS idx_vendor_commissions_status ON vendor_commissions(status);
CREATE INDEX IF NOT EXISTS idx_vendor_commissions_period ON vendor_commissions(period);
CREATE INDEX IF NOT EXISTS idx_vendor_commissions_created_at ON vendor_commissions("createdAt");

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
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