/**
 * Reporting-Yaksa Install Hook
 *
 * Called when the app is installed.
 * Creates all required tables for reporting-yaksa extension.
 */

import type { DataSource } from 'typeorm';

export interface InstallContext {
  dataSource: DataSource;
  organizationId?: string;
  config?: Record<string, any>;
  force?: boolean;
}

export async function install(context: InstallContext): Promise<void> {
  const { dataSource } = context;
  console.log('[reporting-yaksa] Installing...');

  try {
    await createTables(dataSource);
    await createRpaTables(dataSource);
    await createIndexes(dataSource);
    await seedDefaultTemplate(dataSource);

    console.log('[reporting-yaksa] Installation complete');
    console.log('[reporting-yaksa] Features:');
    console.log('  - Annual report management');
    console.log('  - Report field templates');
    console.log('  - Report assignment workflow');
    console.log('  - Audit logging');
    console.log('  - RPA-triggered reports (forum-yaksa integration)');
  } catch (error) {
    console.error('[reporting-yaksa] Installation failed:', error);
    throw error;
  }
}

/**
 * Create Reporting-Yaksa tables
 */
async function createTables(dataSource: DataSource): Promise<void> {
  // ============================================
  // 1. yaksa_report_field_templates table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS yaksa_report_field_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      year INTEGER NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      fields JSONB NOT NULL,
      active BOOLEAN DEFAULT true,
      deadline DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(year)
    );
  `);
  console.log('[reporting-yaksa] Created yaksa_report_field_templates table');

  // ============================================
  // 2. yaksa_annual_reports table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS yaksa_annual_reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      member_id UUID NOT NULL,
      organization_id UUID NOT NULL,
      year INTEGER NOT NULL,
      template_id UUID REFERENCES yaksa_report_field_templates(id),
      status VARCHAR(30) DEFAULT 'draft',
      fields JSONB NOT NULL,
      submitted_at TIMESTAMP,
      approved_at TIMESTAMP,
      approved_by UUID,
      rejected_at TIMESTAMP,
      rejected_by UUID,
      rejected_reason TEXT,
      revision_reason TEXT,
      admin_notes TEXT,
      synced_to_membership BOOLEAN DEFAULT false,
      synced_at TIMESTAMP,
      synced_changes JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(member_id, year)
    );
  `);
  console.log('[reporting-yaksa] Created yaksa_annual_reports table');

  // ============================================
  // 3. yaksa_report_logs table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS yaksa_report_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      report_id UUID NOT NULL REFERENCES yaksa_annual_reports(id) ON DELETE CASCADE,
      action VARCHAR(50) NOT NULL,
      actor_id UUID,
      actor_name VARCHAR(100),
      actor_role VARCHAR(50),
      data JSONB,
      comment TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[reporting-yaksa] Created yaksa_report_logs table');

  // ============================================
  // 4. yaksa_report_assignments table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS yaksa_report_assignments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      report_id UUID NOT NULL REFERENCES yaksa_annual_reports(id) ON DELETE CASCADE,
      assigned_to UUID NOT NULL,
      role VARCHAR(30) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      organization_id UUID,
      "order" INTEGER DEFAULT 1,
      assigned_by UUID,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      review_started_at TIMESTAMP,
      completed_at TIMESTAMP,
      result VARCHAR(20),
      comment TEXT,
      transferred_to UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[reporting-yaksa] Created yaksa_report_assignments table');
}

/**
 * Create RPA-triggered report tables (forum-yaksa integration)
 */
async function createRpaTables(dataSource: DataSource): Promise<void> {
  // ============================================
  // 5. yaksa_rpa_reports table (forum-yaksa RPA 연동)
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS yaksa_rpa_reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      member_id UUID NOT NULL,
      report_type VARCHAR(30) NOT NULL,
      source_post_id UUID NOT NULL,
      status VARCHAR(20) DEFAULT 'DRAFT',
      payload JSONB NOT NULL,
      confidence DECIMAL(5,4) DEFAULT 0,
      trigger_snapshot JSONB,
      member_snapshot JSONB,
      operator_notes TEXT,
      rejection_reason TEXT,
      reviewed_by UUID,
      reviewed_at TIMESTAMP,
      approved_by UUID,
      approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[reporting-yaksa] Created yaksa_rpa_reports table');

  // ============================================
  // 6. yaksa_rpa_report_history table
  // ============================================
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS yaksa_rpa_report_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      report_id UUID NOT NULL REFERENCES yaksa_rpa_reports(id) ON DELETE CASCADE,
      action VARCHAR(20) NOT NULL,
      previous_status VARCHAR(20),
      new_status VARCHAR(20),
      actor_id UUID,
      actor_name VARCHAR(100),
      actor_role VARCHAR(50),
      details JSONB,
      previous_payload JSONB,
      new_payload JSONB,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('[reporting-yaksa] Created yaksa_rpa_report_history table');
}

/**
 * Create indexes for Reporting-Yaksa tables
 */
async function createIndexes(dataSource: DataSource): Promise<void> {
  console.log('[reporting-yaksa] Creating indexes...');

  await dataSource.query(`
    -- yaksa_report_field_templates indexes
    CREATE INDEX IF NOT EXISTS idx_yaksa_template_year ON yaksa_report_field_templates(year);
    CREATE INDEX IF NOT EXISTS idx_yaksa_template_active ON yaksa_report_field_templates(active);

    -- yaksa_annual_reports indexes
    CREATE UNIQUE INDEX IF NOT EXISTS idx_yaksa_report_member_year ON yaksa_annual_reports(member_id, year);
    CREATE INDEX IF NOT EXISTS idx_yaksa_report_org ON yaksa_annual_reports(organization_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_report_status ON yaksa_annual_reports(status);
    CREATE INDEX IF NOT EXISTS idx_yaksa_report_year ON yaksa_annual_reports(year);
    CREATE INDEX IF NOT EXISTS idx_yaksa_report_submitted ON yaksa_annual_reports(submitted_at);

    -- yaksa_report_logs indexes
    CREATE INDEX IF NOT EXISTS idx_yaksa_log_report ON yaksa_report_logs(report_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_log_actor ON yaksa_report_logs(actor_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_log_action ON yaksa_report_logs(action);
    CREATE INDEX IF NOT EXISTS idx_yaksa_log_created ON yaksa_report_logs(created_at);

    -- yaksa_report_assignments indexes
    CREATE INDEX IF NOT EXISTS idx_yaksa_assign_report ON yaksa_report_assignments(report_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_assign_to ON yaksa_report_assignments(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_yaksa_assign_status ON yaksa_report_assignments(status);
    CREATE INDEX IF NOT EXISTS idx_yaksa_assign_role ON yaksa_report_assignments(role);

    -- yaksa_rpa_reports indexes
    CREATE INDEX IF NOT EXISTS idx_yaksa_rpa_member ON yaksa_rpa_reports(member_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_rpa_status ON yaksa_rpa_reports(status);
    CREATE INDEX IF NOT EXISTS idx_yaksa_rpa_type ON yaksa_rpa_reports(report_type);
    CREATE INDEX IF NOT EXISTS idx_yaksa_rpa_source ON yaksa_rpa_reports(source_post_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_rpa_created ON yaksa_rpa_reports(created_at);

    -- yaksa_rpa_report_history indexes
    CREATE INDEX IF NOT EXISTS idx_yaksa_rpa_hist_report ON yaksa_rpa_report_history(report_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_rpa_hist_actor ON yaksa_rpa_report_history(actor_id);
    CREATE INDEX IF NOT EXISTS idx_yaksa_rpa_hist_action ON yaksa_rpa_report_history(action);
  `);

  console.log('[reporting-yaksa] Indexes created successfully');
}

/**
 * Seed default template for current year
 */
async function seedDefaultTemplate(dataSource: DataSource): Promise<void> {
  const currentYear = new Date().getFullYear();

  // Check if template already exists
  const existing = await dataSource.query(
    `SELECT id FROM yaksa_report_field_templates WHERE year = $1`,
    [currentYear]
  );

  if (existing.length > 0) {
    console.log(`[reporting-yaksa] Template for year ${currentYear} already exists`);
    return;
  }

  console.log(`[reporting-yaksa] Creating default template for year ${currentYear}...`);

  const defaultFields = [
    {
      key: 'licenseNumber',
      label: '면허번호',
      type: 'text',
      required: true,
      readonly: true,
      source: 'member.licenseNumber',
      order: 1,
      group: 'basic'
    },
    {
      key: 'workplaceType',
      label: '근무형태',
      type: 'select',
      required: true,
      options: [
        { value: 'pharmacy_owner', label: '개국약사' },
        { value: 'pharmacy_employee', label: '근무약사' },
        { value: 'hospital', label: '병원약사' },
        { value: 'industry', label: '제약회사' },
        { value: 'retired', label: '휴업' },
        { value: 'other', label: '기타' }
      ],
      order: 2,
      group: 'work'
    },
    {
      key: 'pharmacyName',
      label: '약국/직장명',
      type: 'text',
      required: false,
      order: 3,
      group: 'work'
    },
    {
      key: 'pharmacyAddress',
      label: '약국/직장 주소',
      type: 'address',
      required: false,
      order: 4,
      group: 'work'
    },
    {
      key: 'phoneNumber',
      label: '연락처',
      type: 'phone',
      required: false,
      order: 5,
      group: 'contact'
    },
    {
      key: 'email',
      label: '이메일',
      type: 'email',
      required: false,
      order: 6,
      group: 'contact'
    },
    {
      key: 'categoryChange',
      label: '회원분류 변경',
      type: 'select',
      required: false,
      syncToMembership: true,
      syncTarget: 'categoryId',
      options: [],
      order: 7,
      group: 'membership'
    },
    {
      key: 'organizationChange',
      label: '소속 변경 신청',
      type: 'organization',
      required: false,
      syncToMembership: true,
      syncTarget: 'organizationId',
      order: 8,
      group: 'membership'
    }
  ];

  await dataSource.query(
    `INSERT INTO yaksa_report_field_templates (year, name, description, fields, active)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      currentYear,
      `${currentYear}년 신상신고서`,
      `${currentYear}년도 약사 회원 신상신고 양식입니다.`,
      JSON.stringify(defaultFields),
      true
    ]
  );

  console.log(`[reporting-yaksa] Default template created for year ${currentYear}`);
}

export default install;
