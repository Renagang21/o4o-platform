import { MigrationInterface, QueryRunner } from "typeorm";
import bcrypt from 'bcryptjs';

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
            // WO-O4O-SUPER-ADMIN-CREDENTIAL-HARDCODE-REMOVAL-V1 (2026-05-24):
            //   평문 비밀번호 hardcoding 제거. 새 환경에서 sohae2100 super-admin 자동 생성 시
            //   process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD 환경변수로 평문 주입.
            //
            //   환경변수 미설정 시 INSERT skip — 본 migration 은 이미 production 에 적용된
            //   상태이며 TypeORM 이 재실행하지 않으므로 기존 환경에는 무영향. 새 환경 bootstrap
            //   시에만 환경변수 필요.
            //
            //   ⚠️ 기존 git history 에는 평문이 남아 있으므로 운영 super-admin 비밀번호 회전 필수.
            const bootstrapPassword = process.env.SUPER_ADMIN_BOOTSTRAP_PASSWORD;
            if (!bootstrapPassword) {
                console.log(
                    '[Migration] SUPER_ADMIN_BOOTSTRAP_PASSWORD not set — sohae2100 INSERT skipped. ' +
                    '기존 환경에 영향 없음 (본 migration 은 이미 적용된 환경에서는 재실행되지 않음).',
                );
                return;
            }

            const hashedPassword = await bcrypt.hash(bootstrapPassword, 10);

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

            console.log('[Migration] Created sohae2100@gmail.com admin account (password from env)');
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
