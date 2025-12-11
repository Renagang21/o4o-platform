/**
 * LMS-Yaksa Install Hook
 *
 * Called when the app is installed.
 * Creates all required tables for LMS-Yaksa extension.
 */

import type { DataSource } from 'typeorm';

export interface InstallContext {
  dataSource: DataSource;
  organizationId?: string;
  config?: Record<string, any>;
}

export async function install(context: InstallContext): Promise<void> {
  const { dataSource } = context;
  console.log('[lms-yaksa] Installing...');

  try {
    await createTables(dataSource);
    await createIndexes(dataSource);

    console.log('[lms-yaksa] Installation complete');
    console.log('[lms-yaksa] Features:');
    console.log('  - License profile management');
    console.log('  - Required course policies');
    console.log('  - Credit records tracking');
    console.log('  - Course assignments');
  } catch (error) {
    console.error('[lms-yaksa] Installation failed:', error);
    throw error;
  }
}

/**
 * Create LMS-Yaksa tables
 */
async function createTables(dataSource: DataSource): Promise<void> {
  // ============================================
  // 1. lms_yaksa_license_profiles table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS lms_yaksa_license_profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      organization_id UUID,
      license_number VARCHAR(50) NOT NULL,
      license_issued_at DATE NOT NULL,
      license_expires_at DATE,
      total_credits DECIMAL(8,2) DEFAULT 0,
      current_year_credits DECIMAL(8,2) DEFAULT 0,
      is_renewal_required BOOLEAN DEFAULT false,
      last_verified_at TIMESTAMP,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    );
  `);
  console.log('[lms-yaksa] Created lms_yaksa_license_profiles table');

  // ============================================
  // 2. lms_yaksa_required_course_policies table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS lms_yaksa_required_course_policies (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      required_course_ids JSONB DEFAULT '[]',
      required_credits DECIMAL(8,2) DEFAULT 0,
      target_member_types TEXT,
      target_pharmacist_types TEXT,
      validity_period VARCHAR(50) DEFAULT 'annual',
      valid_from DATE,
      valid_until DATE,
      priority INTEGER DEFAULT 100,
      note TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[lms-yaksa] Created lms_yaksa_required_course_policies table');

  // ============================================
  // 3. lms_yaksa_credit_records table
  // ============================================
  // First create the enum type if it doesn't exist
  await dataSource.query(`
    DO $$ BEGIN
      CREATE TYPE lms_yaksa_credit_type AS ENUM (
        'course_completion',
        'attendance',
        'external',
        'manual_adjustment'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS lms_yaksa_credit_records (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      course_id UUID,
      credit_type lms_yaksa_credit_type DEFAULT 'course_completion',
      credits_earned DECIMAL(8,2) DEFAULT 0,
      earned_at DATE NOT NULL,
      credit_year INTEGER NOT NULL,
      certificate_id UUID,
      enrollment_id UUID,
      course_title VARCHAR(255),
      is_verified BOOLEAN DEFAULT true,
      verified_by UUID,
      note TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[lms-yaksa] Created lms_yaksa_credit_records table');

  // ============================================
  // 4. lms_yaksa_course_assignments table
  // ============================================
  // First create the enum type if it doesn't exist
  await dataSource.query(`
    DO $$ BEGIN
      CREATE TYPE lms_yaksa_assignment_status AS ENUM (
        'pending',
        'in_progress',
        'completed',
        'expired',
        'cancelled'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS lms_yaksa_course_assignments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      organization_id UUID NOT NULL,
      course_id UUID NOT NULL,
      policy_id UUID,
      status lms_yaksa_assignment_status DEFAULT 'pending',
      is_completed BOOLEAN DEFAULT false,
      completed_at TIMESTAMP,
      due_date DATE,
      assigned_at DATE NOT NULL,
      assigned_by UUID,
      enrollment_id UUID,
      progress_percent INTEGER DEFAULT 0,
      priority INTEGER DEFAULT 0,
      is_mandatory BOOLEAN DEFAULT true,
      note TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, course_id)
    );
  `);
  console.log('[lms-yaksa] Created lms_yaksa_course_assignments table');
}

/**
 * Create indexes for LMS-Yaksa tables
 */
async function createIndexes(dataSource: DataSource): Promise<void> {
  console.log('[lms-yaksa] Creating indexes...');

  await dataSource.query(`
    -- lms_yaksa_license_profiles indexes
    CREATE INDEX IF NOT EXISTS idx_yaksa_license_org ON lms_yaksa_license_profiles(organization_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_license_number ON lms_yaksa_license_profiles(license_number);

    -- lms_yaksa_required_course_policies indexes
    CREATE INDEX IF NOT EXISTS idx_yaksa_policy_org ON lms_yaksa_required_course_policies(organization_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_policy_active ON lms_yaksa_required_course_policies(is_active);

    -- lms_yaksa_credit_records indexes
    CREATE INDEX IF NOT EXISTS idx_yaksa_credit_user ON lms_yaksa_credit_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_credit_course ON lms_yaksa_credit_records(course_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_credit_earned ON lms_yaksa_credit_records(earned_at);
    CREATE INDEX IF NOT EXISTS idx_yaksa_credit_user_course ON lms_yaksa_credit_records(user_id, course_id);

    -- lms_yaksa_course_assignments indexes
    CREATE INDEX IF NOT EXISTS idx_yaksa_assign_user ON lms_yaksa_course_assignments(user_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_assign_org ON lms_yaksa_course_assignments(organization_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_assign_course ON lms_yaksa_course_assignments(course_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_assign_status ON lms_yaksa_course_assignments(status);
  `);

  console.log('[lms-yaksa] Indexes created successfully');
}

export default install;
