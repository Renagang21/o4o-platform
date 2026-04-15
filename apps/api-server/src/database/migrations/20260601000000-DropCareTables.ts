/**
 * Migration: Drop Care Module Tables
 *
 * WO-O4O-GLYCOPHARM-CARE-REMOVAL-V1
 *
 * Drops all care module tables that are no longer used after
 * the care module removal. Tables are dropped in dependency order.
 *
 * Tables dropped:
 *  - care_messages
 *  - care_appointments
 *  - care_actions
 *  - care_coaching_sessions
 *  - care_coaching_drafts
 *  - care_alerts
 *  - care_llm_insights
 *  - care_kpi_snapshots
 *  - patient_ai_insights
 *  - health_readings
 *  - care_pharmacy_link_requests
 *  - patient_health_profiles
 *  - ai_model_settings
 */

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCareTables20260601000000 implements MigrationInterface {
  name = 'DropCareTables20260601000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'care_messages',
      'care_appointments',
      'care_actions',
      'care_coaching_sessions',
      'care_coaching_drafts',
      'care_alerts',
      'care_llm_insights',
      'care_kpi_snapshots',
      'patient_ai_insights',
      'health_readings',
      'care_pharmacy_link_requests',
      'patient_health_profiles',
      'ai_model_settings',
    ];

    for (const table of tables) {
      const exists = await queryRunner.hasTable(table);
      if (exists) {
        await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Manual recovery required — care module has been permanently removed.
    // See: WO-O4O-GLYCOPHARM-CARE-REMOVAL-V1
  }
}
