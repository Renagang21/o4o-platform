import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration: Rename OAuth settings key from 'oauth' to 'oauth_settings'
 *
 * Background:
 * - Old code used key='oauth', type='oauth'
 * - New code uses key='oauth_settings', type='json'
 * - This migration updates existing records to match new code
 */
export class MigrateOAuthSettingsKey2000000000006 implements MigrationInterface {
    name = 'MigrateOAuthSettingsKey2000000000006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update OAuth settings key and type
        await queryRunner.query(`
            UPDATE settings
            SET
                key = 'oauth_settings',
                type = 'json'
            WHERE
                key = 'oauth'
                AND type = 'oauth'
        `);

        console.log('✅ Migrated OAuth settings from key="oauth" to key="oauth_settings"');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback: restore original key and type
        await queryRunner.query(`
            UPDATE settings
            SET
                key = 'oauth',
                type = 'oauth'
            WHERE
                key = 'oauth_settings'
                AND type = 'json'
        `);

        console.log('✅ Rolled back OAuth settings to key="oauth"');
    }
}
