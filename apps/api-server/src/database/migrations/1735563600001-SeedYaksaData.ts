import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Yaksa Seed Data Migration
 *
 * Phase A-2: Yaksa DB Schema Implementation
 * Seeds initial categories and sample posts
 */
export class SeedYaksaData1735563600001 implements MigrationInterface {
  name = 'SeedYaksaData1735563600001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // Seed Categories
    // ============================================================================
    await queryRunner.query(`
      INSERT INTO "yaksa_categories" ("id", "name", "slug", "description", "status", "sort_order")
      VALUES
        ('a1b2c3d4-e5f6-7890-abcd-111111111111', '공지사항', 'notices', '약사회 공식 공지사항', 'active', 1),
        ('a1b2c3d4-e5f6-7890-abcd-222222222222', '일반 게시판', 'general', '회원 자유 게시판', 'active', 2),
        ('a1b2c3d4-e5f6-7890-abcd-333333333333', '학술 자료', 'academic', '약학 관련 학술 자료 공유', 'active', 3),
        ('a1b2c3d4-e5f6-7890-abcd-444444444444', '채용 정보', 'jobs', '약사 채용 정보', 'active', 4),
        ('a1b2c3d4-e5f6-7890-abcd-555555555555', '법규 안내', 'regulations', '약사법 및 관련 법규 안내', 'active', 5)
      ON CONFLICT (slug) DO NOTHING
    `);

    // ============================================================================
    // Seed Sample Posts
    // ============================================================================
    await queryRunner.query(`
      INSERT INTO "yaksa_posts" (
        "id", "category_id", "title", "content", "status", "is_pinned", "is_notice",
        "view_count", "created_by_user_name", "published_at"
      )
      VALUES
        (
          'b1b2c3d4-e5f6-7890-abcd-111111111111',
          'a1b2c3d4-e5f6-7890-abcd-111111111111',
          '2024년 약사회 정기총회 안내',
          '<p>안녕하세요. 2024년 정기총회 일정을 안내드립니다.</p><p>일시: 2024년 3월 15일 오후 2시</p><p>장소: 약사회관 대강당</p><p>많은 참석 부탁드립니다.</p>',
          'published',
          true,
          true,
          156,
          '관리자',
          CURRENT_TIMESTAMP
        ),
        (
          'b1b2c3d4-e5f6-7890-abcd-222222222222',
          'a1b2c3d4-e5f6-7890-abcd-111111111111',
          '회비 납부 안내',
          '<p>2024년 연회비 납부 안내드립니다.</p><p>납부 기한: 2024년 2월 28일까지</p><p>계좌번호: 국민은행 123-456-789012</p>',
          'published',
          false,
          true,
          89,
          '관리자',
          CURRENT_TIMESTAMP
        ),
        (
          'b1b2c3d4-e5f6-7890-abcd-333333333333',
          'a1b2c3d4-e5f6-7890-abcd-222222222222',
          '신규 회원 인사드립니다',
          '<p>안녕하세요. 이번에 새로 가입한 약사입니다.</p><p>서울 강남구에서 약국을 운영하고 있습니다.</p><p>앞으로 잘 부탁드립니다!</p>',
          'published',
          false,
          false,
          45,
          '김약사',
          CURRENT_TIMESTAMP
        ),
        (
          'b1b2c3d4-e5f6-7890-abcd-444444444444',
          'a1b2c3d4-e5f6-7890-abcd-333333333333',
          '최신 당뇨병 치료제 동향',
          '<p>최근 출시된 당뇨병 치료제에 대한 학술 자료를 공유합니다.</p><p>GLP-1 작용제의 새로운 적응증 확대에 대해 정리했습니다.</p>',
          'published',
          false,
          false,
          234,
          '이학술',
          CURRENT_TIMESTAMP
        ),
        (
          'b1b2c3d4-e5f6-7890-abcd-555555555555',
          'a1b2c3d4-e5f6-7890-abcd-444444444444',
          '[채용] 서울 마포구 약국 약사 모집',
          '<p>서울 마포구 소재 약국에서 약사를 모집합니다.</p><p>근무 조건: 주 5일, 9시-18시</p><p>급여: 협의</p><p>연락처: 010-1234-5678</p>',
          'published',
          false,
          false,
          78,
          '마포약국',
          CURRENT_TIMESTAMP
        )
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('[Migration] Yaksa seed data inserted successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "yaksa_posts" WHERE id IN (
        'b1b2c3d4-e5f6-7890-abcd-111111111111',
        'b1b2c3d4-e5f6-7890-abcd-222222222222',
        'b1b2c3d4-e5f6-7890-abcd-333333333333',
        'b1b2c3d4-e5f6-7890-abcd-444444444444',
        'b1b2c3d4-e5f6-7890-abcd-555555555555'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "yaksa_categories" WHERE id IN (
        'a1b2c3d4-e5f6-7890-abcd-111111111111',
        'a1b2c3d4-e5f6-7890-abcd-222222222222',
        'a1b2c3d4-e5f6-7890-abcd-333333333333',
        'a1b2c3d4-e5f6-7890-abcd-444444444444',
        'a1b2c3d4-e5f6-7890-abcd-555555555555'
      )
    `);

    console.log('[Migration] Yaksa seed data removed');
  }
}
