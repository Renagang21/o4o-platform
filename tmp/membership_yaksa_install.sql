-- membership-yaksa install SQL

-- 1. yaksa_member_categories
CREATE TABLE IF NOT EXISTS yaksa_member_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "requiresAnnualFee" BOOLEAN DEFAULT true,
  "annualFeeAmount" INTEGER,
  "sortOrder" INTEGER DEFAULT 0,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. yaksa_members
CREATE TABLE IF NOT EXISTS yaksa_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE,
  "organizationId" UUID NOT NULL,
  "licenseNumber" VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  birthdate DATE NOT NULL,
  "isVerified" BOOLEAN DEFAULT false,
  "categoryId" UUID REFERENCES yaksa_member_categories(id),
  phone VARCHAR(20),
  email VARCHAR(255),
  "pharmacyName" VARCHAR(200),
  "pharmacyAddress" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. yaksa_member_affiliations
CREATE TABLE IF NOT EXISTS yaksa_member_affiliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "memberId" UUID NOT NULL REFERENCES yaksa_members(id) ON DELETE CASCADE,
  "organizationId" UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  "isPrimary" BOOLEAN DEFAULT false,
  "joinedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("memberId", "organizationId")
);

-- 4. yaksa_membership_roles
CREATE TABLE IF NOT EXISTS yaksa_membership_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "memberId" UUID NOT NULL REFERENCES yaksa_members(id) ON DELETE CASCADE,
  "organizationId" UUID NOT NULL,
  role VARCHAR(50) NOT NULL,
  "startDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "endDate" TIMESTAMP,
  "isActive" BOOLEAN DEFAULT true,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. yaksa_membership_years
CREATE TABLE IF NOT EXISTS yaksa_membership_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "memberId" UUID NOT NULL REFERENCES yaksa_members(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  paid BOOLEAN DEFAULT false,
  "paidAt" TIMESTAMP,
  amount INTEGER,
  "paymentMethod" VARCHAR(50),
  "receiptNumber" VARCHAR(100),
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("memberId", year)
);

-- 6. yaksa_member_verifications
CREATE TABLE IF NOT EXISTS yaksa_member_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "memberId" UUID NOT NULL REFERENCES yaksa_members(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  "verifiedAt" TIMESTAMP,
  "verifiedBy" UUID,
  "expiresAt" TIMESTAMP,
  data JSONB,
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_yaksa_members_user ON yaksa_members("userId");
CREATE INDEX IF NOT EXISTS idx_yaksa_members_org ON yaksa_members("organizationId");
CREATE INDEX IF NOT EXISTS idx_yaksa_members_license ON yaksa_members("licenseNumber");
CREATE INDEX IF NOT EXISTS idx_yaksa_members_verified ON yaksa_members("isVerified");
CREATE INDEX IF NOT EXISTS idx_yaksa_affiliations_member ON yaksa_member_affiliations("memberId");
CREATE INDEX IF NOT EXISTS idx_yaksa_affiliations_org ON yaksa_member_affiliations("organizationId");
CREATE INDEX IF NOT EXISTS idx_yaksa_years_member ON yaksa_membership_years("memberId");
CREATE INDEX IF NOT EXISTS idx_yaksa_verifications_member ON yaksa_member_verifications("memberId");

-- Register app
INSERT INTO app_registry ("appId", name, version, type, status, "installedAt", "updatedAt")
VALUES ('membership-yaksa', 'Membership Extension - Yaksa Organization', '1.0.0', 'extension', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("appId") DO UPDATE SET status = 'active', "updatedAt" = CURRENT_TIMESTAMP;

-- Insert default categories
INSERT INTO yaksa_member_categories (name, description, "requiresAnnualFee", "annualFeeAmount", "sortOrder")
VALUES
  ('정회원', '정규 면허 소지 및 활동 중인 약사', true, 50000, 1),
  ('준회원', '면허 소지 약사 (비활동)', true, 30000, 2),
  ('휴업약사', '휴업 중인 약사', false, null, 3),
  ('명예회원', '명예 회원', false, null, 4)
ON CONFLICT (name) DO NOTHING;
