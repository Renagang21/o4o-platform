import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPlatformServices2026020500002 implements MigrationInterface {
  name = 'SeedPlatformServices2026020500002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "platform_services" ("code", "name", "short_description", "entry_url", "service_type", "approval_required", "is_featured", "featured_order", "icon_emoji", "status")
      VALUES
        ('glycopharm', 'GlycoPharm', '약국 진열·포럼 서비스', 'https://glycopharm.co.kr', 'tool', true, true, 1, '💊', 'active'),
        ('glucoseview', 'GlucoseView', '혈당 모니터링 서비스', 'https://glucoseview.co.kr', 'tool', true, true, 2, '📊', 'active'),
        ('neture', 'Neture', 'o4o 네뚜레 커뮤니티', 'https://neture.co.kr', 'community', false, true, 3, '🌿', 'active'),
        ('kpa-society', 'KPA Society', '약사회 SaaS 플랫폼', 'https://kpa-society.co.kr', 'community', true, false, 10, '🏛️', 'active'),
        ('k-cosmetics', 'K-Cosmetics', 'K-화장품 도매 플랫폼', 'https://k-cosmetics.site', 'extension', true, true, 4, '✨', 'active')
      ON CONFLICT ("code") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "platform_services"
      WHERE "code" IN ('glycopharm', 'glucoseview', 'neture', 'kpa-society', 'k-cosmetics')
    `);
  }
}
