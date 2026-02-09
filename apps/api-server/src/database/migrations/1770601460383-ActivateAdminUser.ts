import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from 'bcrypt';

/**
 * Migration: Activate Admin Users
 *
 * 1. Activate existing admin@neture.co.kr account (set status to 'active')
 * 2. Create new platform admin account (sohae2100@gmail.com)
 *
 * This migration runs automatically on deployment via CI/CD.
 */
export class ActivateAdminUser1770601460383 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Activate existing admin@neture.co.kr
        await queryRunner.query(`
            UPDATE users
            SET status = 'active',
                "isActive" = true,
                "isEmailVerified" = true,
                "updatedAt" = NOW()
            WHERE email = 'admin@neture.co.kr'
              AND (status != 'active' OR "isActive" = false)
        `);

        console.log('[Migration] Activated admin@neture.co.kr');

        // 2. Create new platform admin (sohae2100@gmail.com) if not exists
        const existingUser = await queryRunner.query(`
            SELECT id FROM users WHERE email = 'sohae2100@gmail.com'
        `);

        if (!existingUser || existingUser.length === 0) {
            // Hash password: 3Lz157727791!
            const hashedPassword = await bcrypt.hash('3Lz157727791!', 10);

            await queryRunner.query(`
                INSERT INTO users (
                    id, email, name, password, role, roles, status,
                    "isActive", "isEmailVerified", "createdAt", "updatedAt"
                )
                VALUES (
                    gen_random_uuid(),
                    'sohae2100@gmail.com',
                    'Platform Admin',
                    $1,
                    'super_admin',
                    ARRAY['super_admin', 'platform:super_admin'],
                    'active',
                    true,
                    true,
                    NOW(),
                    NOW()
                )
            `, [hashedPassword]);

            console.log('[Migration] Created sohae2100@gmail.com admin account');
        } else {
            // User exists, ensure it's active
            await queryRunner.query(`
                UPDATE users
                SET status = 'active',
                    "isActive" = true,
                    "isEmailVerified" = true,
                    role = 'super_admin',
                    roles = ARRAY['super_admin', 'platform:super_admin'],
                    "updatedAt" = NOW()
                WHERE email = 'sohae2100@gmail.com'
            `);

            console.log('[Migration] Updated sohae2100@gmail.com to active admin');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback is not recommended for admin accounts
        // Just log that this migration was reverted
        console.log('[Migration] ActivateAdminUser rollback - no action taken');
    }

}
