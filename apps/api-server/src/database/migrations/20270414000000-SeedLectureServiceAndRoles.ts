import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lecture Service Identity + role catalog only.
 * LMS data, memberships and user role assignments are intentionally untouched.
 */
export class SeedLectureServiceAndRoles20270414000000 implements MigrationInterface {
  name = 'SeedLectureServiceAndRoles20270414000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "platform_services"
        ("code", "name", "short_description", "entry_url", "service_type",
         "approval_required", "is_featured", "featured_order", "icon_emoji", "status")
      VALUES
        ('lecture', 'O4O 강의', '강의·학습·평가·수료를 제공하는 O4O 학습 서비스',
         'https://study.neture.co.kr', 'tool', false, false, 14, '🎓', 'active')
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "short_description" = EXCLUDED."short_description",
        "entry_url" = EXCLUDED."entry_url",
        "service_type" = EXCLUDED."service_type",
        "approval_required" = EXCLUDED."approval_required",
        "icon_emoji" = EXCLUDED."icon_emoji",
        "status" = EXCLUDED."status"
    `);

    const roles = [
      { name: 'lecture:admin', display: 'O4O Lecture Admin', desc: 'O4O 강의 서비스 관리자', key: 'admin', admin: true },
      { name: 'lecture:operator', display: 'O4O Lecture Operator', desc: 'O4O 강의 서비스 운영자', key: 'operator', admin: false },
      { name: 'lecture:instructor', display: 'O4O Lecture Instructor', desc: 'O4O 강의 서비스 강사', key: 'instructor', admin: false },
    ];
    for (const r of roles) {
      await queryRunner.query(
        `
        INSERT INTO roles
          (name, display_name, description, service_key, role_key,
           is_system, is_admin_role, is_assignable, is_active)
        VALUES ($1, $2, $3, 'lecture', $4, true, $5, true, true)
        ON CONFLICT (name) DO UPDATE SET
          service_key = EXCLUDED.service_key,
          role_key = EXCLUDED.role_key,
          is_admin_role = EXCLUDED.is_admin_role,
          is_assignable = EXCLUDED.is_assignable,
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          is_active = true,
          updated_at = now()
        `,
        [r.name, r.display, r.desc, r.key, r.admin],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM roles WHERE name IN ('lecture:admin', 'lecture:operator', 'lecture:instructor')`,
    );
    await queryRunner.query(`DELETE FROM "platform_services" WHERE "code" = 'lecture'`);
  }
}
