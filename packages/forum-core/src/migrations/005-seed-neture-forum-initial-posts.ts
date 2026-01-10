import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Forum Core Migration 005 - Seed Neture Forum Initial Posts
 *
 * Work Order: WO-NETURE-HOME-HUB-FORUM-V0.1
 *
 * 이 마이그레이션은 포럼의 톤과 방향을 설정하는 초기 운영자 글을 생성합니다:
 * - neture-forum 카테고리 생성
 * - 포럼 정체성 공지 (ANNOUNCEMENT)
 * - 참여 유도 질문 (QUESTION)
 * - 의견 범위 가이드 (GUIDE)
 */
export class SeedNetureForumInitialPosts1736600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Get system admin user (or first admin)
    const adminResult = await queryRunner.query(`
      SELECT id FROM users
      WHERE role IN ('admin', 'super_admin')
      ORDER BY created_at ASC
      LIMIT 1
    `);

    if (!adminResult || adminResult.length === 0) {
      console.log('No admin user found - skipping forum seed');
      return;
    }

    const adminId = adminResult[0].id;

    // 2. Check if neture-forum category already exists
    const existingCategory = await queryRunner.query(`
      SELECT id FROM forum_category WHERE slug = 'neture-forum'
    `);

    let categoryId: string;

    if (existingCategory && existingCategory.length > 0) {
      categoryId = existingCategory[0].id;
      console.log('neture-forum category already exists');
    } else {
      // Create neture-forum category
      const categoryResult = await queryRunner.query(`
        INSERT INTO forum_category (
          id, name, description, slug, color, "sortOrder", "isActive",
          "requireApproval", "accessLevel", "postCount", "createdBy", created_at, updated_at
        ) VALUES (
          uuid_generate_v4(),
          'Neture 포럼',
          'o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다.',
          'neture-forum',
          '#2563EB',
          1,
          true,
          false,
          'all',
          0,
          $1,
          NOW(),
          NOW()
        )
        RETURNING id
      `, [adminId]);

      categoryId = categoryResult[0].id;
      console.log('Created neture-forum category');
    }

    // 3. Check if initial posts already exist
    const existingPosts = await queryRunner.query(`
      SELECT slug FROM forum_post
      WHERE slug IN (
        'forum-purpose-and-scope',
        'what-is-o4o-question',
        'forum-welcome-guide'
      )
    `);

    const existingSlugs = new Set(existingPosts.map((p: any) => p.slug));

    // 4. Insert initial posts (only if not exist)
    const posts = [
      {
        slug: 'forum-purpose-and-scope',
        title: '이 포럼은 무엇을 위한 공간인가',
        type: 'announcement',
        isPinned: true,
        content: `이 포럼은 네뚜레나 o4o 서비스를 홍보하기 위한 공간이 아닙니다.
또한 고객 문의나 거래를 처리하는 곳도 아닙니다.

네뚜레는 o4o라는 구조를 완성된 해답으로 제시하지 않기 때문에,
이해되지 않는 지점, 납득하기 어려운 구조, 현실과 맞지 않는 부분을
외부의 시선으로 점검할 필요가 있다고 판단했습니다.

이 포럼은 그런 판단의 연장선에서 만들어졌습니다.

- o4o라는 개념이 어렵게 느껴지는 이유
- 네뚜레의 역할이 모호하게 보이는 지점
- "이 구조가 실제로 가능할까?"라는 의문

이런 질문과 의견을 편하게 남겨주시면 됩니다.

정답을 요구하지 않습니다.
설득하려 하지도 않습니다.
다만, 이 구조를 함께 검토하고 다듬기 위한 의견은 진지하게 다룹니다.`,
      },
      {
        slug: 'what-is-o4o-question',
        title: '운영자가 묻습니다: o4o는 어떻게 보이시나요?',
        type: 'question',
        isPinned: true,
        content: `이 포럼을 보시는 분들께 몇 가지를 여쭙고 싶습니다.

1. o4o라는 개념을 처음 보셨을 때, 어떤 느낌이 드셨나요?
2. "온라인이 오프라인을 지원한다"는 설명이 직관적으로 이해되셨나요?
3. 네뚜레가 정확히 어떤 역할을 하려는 서비스로 보이시나요?

전문적인 답변이 아니어도 괜찮습니다.
짧은 인상, 막연한 느낌, 혹은 "잘 모르겠다"는 말도 충분합니다.

이 포럼은 그런 반응을 모으기 위해 존재합니다.`,
      },
      {
        slug: 'forum-welcome-guide',
        title: '이 포럼에서 특히 듣고 싶은 이야기들',
        type: 'guide',
        isPinned: false,
        content: `이 포럼에서는 다음과 같은 이야기들을 특히 환영합니다.

- 이 구조가 현실과 맞지 않아 보이는 이유
- 공급자 또는 파트너 입장에서 느껴지는 거리감
- 기존 플랫폼과 비교했을 때의 장단점
- 설명이 부족하거나 오해를 부를 수 있는 표현

반대로, 아래와 같은 내용은 이 포럼의 목적과 맞지 않습니다.

- 상품 판매 또는 홍보
- 고객 문의, A/S 요청
- 특정 개인이나 조직에 대한 공격

포럼의 방향이 흐려지지 않도록,
운영자는 이 기준을 유지하려 합니다.`,
      },
    ];

    for (const post of posts) {
      if (existingSlugs.has(post.slug)) {
        console.log(`Post ${post.slug} already exists - skipping`);
        continue;
      }

      const excerpt = post.content.substring(0, 200).replace(/\n/g, ' ').trim() + '...';

      await queryRunner.query(`
        INSERT INTO forum_post (
          id, title, slug, content, excerpt, type, status,
          "categoryId", author_id, "isPinned", "isLocked", "allowComments",
          "viewCount", "commentCount", "likeCount",
          published_at, created_at, updated_at
        ) VALUES (
          uuid_generate_v4(),
          $1, $2, $3, $4, $5, 'publish',
          $6, $7, $8, false, true,
          0, 0, 0,
          NOW(), NOW(), NOW()
        )
      `, [post.title, post.slug, post.content, excerpt, post.type, categoryId, adminId, post.isPinned]);

      console.log(`Created post: ${post.slug}`);
    }

    // 5. Update category post count
    await queryRunner.query(`
      UPDATE forum_category
      SET "postCount" = (SELECT COUNT(*) FROM forum_post WHERE "categoryId" = $1)
      WHERE id = $1
    `, [categoryId]);

    console.log('Forum seed completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seeded posts
    await queryRunner.query(`
      DELETE FROM forum_post
      WHERE slug IN (
        'forum-purpose-and-scope',
        'what-is-o4o-question',
        'forum-welcome-guide'
      )
    `);

    // Note: We don't delete the category in down()
    // since other posts might have been created in it
    console.log('Forum seed posts removed');
  }
}
