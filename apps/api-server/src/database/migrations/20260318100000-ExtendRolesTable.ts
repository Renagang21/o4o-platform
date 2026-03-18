/**
 * ExtendRolesTable — roles 테이블 확장 + ROLE_REGISTRY seed
 * WO-O4O-ROLE-SYSTEM-DB-DESIGN-V1
 *
 * 기존 roles 테이블에 service_key, role_key, is_admin_role, is_assignable 추가.
 * ROLE_REGISTRY의 35개 role을 DB에 seed.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendRolesTable20260318100000 implements MigrationInterface {
  name = 'ExtendRolesTable20260318100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 컬럼 추가
    await queryRunner.query(`ALTER TABLE roles ALTER COLUMN name TYPE VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS display_name VARCHAR(200)`);
    await queryRunner.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT`);
    await queryRunner.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS service_key VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_key VARCHAR(50)`);
    await queryRunner.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_admin_role BOOLEAN DEFAULT false`);
    await queryRunner.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false`);
    await queryRunner.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
    await queryRunner.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_assignable BOOLEAN DEFAULT true`);
    await queryRunner.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()`);

    // 2. 인덱스
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_roles_service_key ON roles(service_key)`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_service_role
      ON roles(service_key, role_key) WHERE service_key IS NOT NULL
    `);

    // 3. 레거시 row 업데이트 (super_admin, admin, staff, user)
    await queryRunner.query(`
      UPDATE roles SET service_key = 'platform', role_key = name
      WHERE service_key IS NULL AND name IN ('super_admin', 'admin', 'staff', 'user')
    `);
    await queryRunner.query(`
      UPDATE roles SET is_admin_role = true
      WHERE name IN ('super_admin', 'admin')
    `);

    // 4. ROLE_REGISTRY seed (35개 prefixed roles)
    const roles = [
      // Platform
      { name: 'platform:super_admin', display: 'Platform Super Admin', desc: 'Highest privilege, cross-service access', svc: 'platform', key: 'super_admin', admin: true, assignable: false },
      { name: 'platform:admin', display: 'Platform Admin', desc: 'Platform administrator (deprecated)', svc: 'platform', key: 'admin', admin: true, assignable: false },
      { name: 'platform:operator', display: 'Platform Operator', desc: 'Platform operator (deprecated)', svc: 'platform', key: 'operator', admin: false, assignable: false },
      { name: 'platform:manager', display: 'Platform Manager', desc: 'Platform manager', svc: 'platform', key: 'manager', admin: false, assignable: false },
      { name: 'platform:vendor', display: 'Platform Vendor', desc: 'Platform vendor', svc: 'platform', key: 'vendor', admin: false, assignable: false },
      { name: 'platform:member', display: 'Platform Member', desc: 'Platform member', svc: 'platform', key: 'member', admin: false, assignable: false },
      { name: 'platform:contributor', display: 'Platform Contributor', desc: 'Platform contributor', svc: 'platform', key: 'contributor', admin: false, assignable: false },
      // KPA
      { name: 'kpa:admin', display: 'KPA Admin', desc: 'KPA service administrator', svc: 'kpa', key: 'admin', admin: true, assignable: true },
      { name: 'kpa:operator', display: 'KPA Operator', desc: 'KPA service operator', svc: 'kpa', key: 'operator', admin: false, assignable: true },
      { name: 'kpa:district_admin', display: 'District Admin', desc: 'District-level administrator', svc: 'kpa', key: 'district_admin', admin: true, assignable: true },
      { name: 'kpa:branch_admin', display: 'Branch Admin', desc: 'Branch-level administrator', svc: 'kpa', key: 'branch_admin', admin: true, assignable: true },
      { name: 'kpa:branch_operator', display: 'Branch Operator', desc: 'Branch-level operator', svc: 'kpa', key: 'branch_operator', admin: false, assignable: true },
      { name: 'kpa:pharmacist', display: 'Pharmacist', desc: 'General pharmacist/member', svc: 'kpa', key: 'pharmacist', admin: false, assignable: true },
      { name: 'kpa:student', display: 'Student', desc: 'Student member', svc: 'kpa', key: 'student', admin: false, assignable: true },
      // Neture
      { name: 'neture:admin', display: 'Neture Admin', desc: 'Neture administrator', svc: 'neture', key: 'admin', admin: true, assignable: true },
      { name: 'neture:operator', display: 'Neture Operator', desc: 'Neture operator', svc: 'neture', key: 'operator', admin: false, assignable: true },
      { name: 'neture:supplier', display: 'Neture Supplier', desc: 'Neture supplier', svc: 'neture', key: 'supplier', admin: false, assignable: true },
      { name: 'neture:partner', display: 'Neture Partner', desc: 'Neture partner', svc: 'neture', key: 'partner', admin: false, assignable: true },
      { name: 'neture:user', display: 'Neture User', desc: 'Neture user', svc: 'neture', key: 'user', admin: false, assignable: true },
      // GlycoPharm
      { name: 'glycopharm:admin', display: 'GlycoPharm Admin', desc: 'GlycoPharm administrator', svc: 'glycopharm', key: 'admin', admin: true, assignable: true },
      { name: 'glycopharm:operator', display: 'GlycoPharm Operator', desc: 'GlycoPharm operator', svc: 'glycopharm', key: 'operator', admin: false, assignable: true },
      { name: 'glycopharm:pharmacy', display: 'Pharmacy', desc: 'Pharmacy user', svc: 'glycopharm', key: 'pharmacy', admin: false, assignable: true },
      { name: 'glycopharm:supplier', display: 'GlycoPharm Supplier', desc: 'GlycoPharm supplier', svc: 'glycopharm', key: 'supplier', admin: false, assignable: true },
      { name: 'glycopharm:partner', display: 'GlycoPharm Partner', desc: 'GlycoPharm partner', svc: 'glycopharm', key: 'partner', admin: false, assignable: true },
      { name: 'glycopharm:consumer', display: 'Consumer', desc: 'Consumer/patient', svc: 'glycopharm', key: 'consumer', admin: false, assignable: true },
      // K-Cosmetics
      { name: 'cosmetics:admin', display: 'K-Cosmetics Admin', desc: 'K-Cosmetics administrator', svc: 'cosmetics', key: 'admin', admin: true, assignable: true },
      { name: 'cosmetics:operator', display: 'K-Cosmetics Operator', desc: 'K-Cosmetics operator', svc: 'cosmetics', key: 'operator', admin: false, assignable: true },
      { name: 'cosmetics:pharmacist', display: 'K-Cosmetics Pharmacist', desc: 'K-Cosmetics pharmacist', svc: 'cosmetics', key: 'pharmacist', admin: false, assignable: true },
      { name: 'cosmetics:user', display: 'K-Cosmetics User', desc: 'K-Cosmetics user', svc: 'cosmetics', key: 'user', admin: false, assignable: true },
      { name: 'cosmetics:supplier', display: 'K-Cosmetics Supplier', desc: 'K-Cosmetics supplier', svc: 'cosmetics', key: 'supplier', admin: false, assignable: true },
      { name: 'cosmetics:seller', display: 'K-Cosmetics Seller', desc: 'K-Cosmetics seller/retailer', svc: 'cosmetics', key: 'seller', admin: false, assignable: true },
      { name: 'cosmetics:partner', display: 'K-Cosmetics Partner', desc: 'K-Cosmetics partner', svc: 'cosmetics', key: 'partner', admin: false, assignable: true },
      // GlucoseView
      { name: 'glucoseview:admin', display: 'GlucoseView Admin', desc: 'GlucoseView administrator', svc: 'glucoseview', key: 'admin', admin: true, assignable: true },
      { name: 'glucoseview:operator', display: 'GlucoseView Operator', desc: 'GlucoseView operator', svc: 'glucoseview', key: 'operator', admin: false, assignable: true },
      { name: 'glucoseview:pharmacist', display: 'GlucoseView Pharmacist', desc: 'GlucoseView pharmacist', svc: 'glucoseview', key: 'pharmacist', admin: false, assignable: true },
      { name: 'glucoseview:user', display: 'GlucoseView User', desc: 'GlucoseView user', svc: 'glucoseview', key: 'user', admin: false, assignable: true },
      // LMS
      { name: 'lms:instructor', display: 'LMS Instructor', desc: 'LMS instructor', svc: 'lms', key: 'instructor', admin: false, assignable: true },
    ];

    for (const r of roles) {
      await queryRunner.query(`
        INSERT INTO roles (name, display_name, description, service_key, role_key, is_system, is_admin_role, is_assignable, is_active)
        VALUES ($1, $2, $3, $4, $5, true, $6, $7, true)
        ON CONFLICT (name) DO UPDATE SET
          service_key = EXCLUDED.service_key,
          role_key = EXCLUDED.role_key,
          is_admin_role = EXCLUDED.is_admin_role,
          is_assignable = EXCLUDED.is_assignable,
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          updated_at = now()
      `, [r.name, r.display, r.desc, r.svc, r.key, r.admin, r.assignable]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_roles_service_role`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_roles_service_key`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS updated_at`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS created_at`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS is_assignable`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS is_active`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS is_system`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS is_admin_role`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS role_key`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS service_key`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS description`);
    await queryRunner.query(`ALTER TABLE roles DROP COLUMN IF EXISTS display_name`);
    await queryRunner.query(`ALTER TABLE roles ALTER COLUMN name TYPE VARCHAR(50)`);
  }
}
