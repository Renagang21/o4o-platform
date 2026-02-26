/**
 * WO-ROLE-NORMALIZATION-PHASE3-B-V1
 *
 * Create kpa_pharmacist_profiles table for pharmacist qualification data.
 * Separates qualification (license, activity_type) from auth (users) and
 * membership (kpa_members).
 *
 * user_id is UNIQUE: one pharmacist profile per user.
 * Backfills existing data from kpa_members.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKpaPharmacistProfiles20260227000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS kpa_pharmacist_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id),
        license_number VARCHAR(100),
        license_verified BOOLEAN DEFAULT false,
        activity_type VARCHAR(50),
        verified_at TIMESTAMP NULL,
        verified_by UUID NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_kpp_user_id
      ON kpa_pharmacist_profiles(user_id)
    `);

    // Backfill from kpa_members: copy license_number and activity_type
    // for existing pharmacist members.
    // DISTINCT ON (user_id) handles users with multiple memberships.
    await queryRunner.query(`
      INSERT INTO kpa_pharmacist_profiles (user_id, license_number, activity_type)
      SELECT DISTINCT ON (km.user_id)
        km.user_id,
        km.license_number,
        km.activity_type
      FROM kpa_members km
      WHERE km.license_number IS NOT NULL
         OR km.activity_type IS NOT NULL
      ORDER BY km.user_id, km.created_at ASC
      ON CONFLICT (user_id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kpa_pharmacist_profiles`);
  }
}
