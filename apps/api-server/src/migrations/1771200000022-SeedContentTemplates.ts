import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-TEMPLATE-SEED-DATA-V1
 *
 * 콘텐츠 템플릿 초기 seed 데이터 투입
 * - 상품 기본 설명 템플릿
 * - 건강기능식품 상세 템플릿
 * - 간단 설명 템플릿
 * - B2B 판매 포인트 템플릿
 * - 의약품 상세 템플릿
 *
 * 조건: content_templates 테이블에 is_public=true & service_key='neture' 템플릿이 없을 때만 실행
 */
export class SeedContentTemplates1771200000022 implements MigrationInterface {
  name = 'SeedContentTemplates1771200000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 이미 public neture 템플릿이 있으면 스킵
    const existing = await queryRunner.query(
      `SELECT COUNT(*)::int AS cnt FROM content_templates WHERE is_public = true AND service_key = 'neture' AND is_active = true`,
    );
    if (existing[0]?.cnt > 0) {
      // Public neture templates already exist — skip seed
      return;
    }

    // 시스템 사용자 조회 (admin 또는 super_admin)
    const adminRows = await queryRunner.query(`
      SELECT u.id, u.name FROM users u
      JOIN role_assignments ra ON ra.user_id = u.id AND ra.is_active = true
      WHERE ra.role IN ('admin', 'super_admin')
      LIMIT 1
    `);
    const createdById = adminRows[0]?.id || '00000000-0000-0000-0000-000000000000';
    const createdByName = adminRows[0]?.name || 'System';

    const templates = [
      {
        name: '상품 기본 설명',
        description: '일반 상품의 기본 설명 구조 (특징/복용법/주의사항)',
        category: 'product',
        contentHtml: `<p><strong>제품 특징</strong></p>
<ul>
<li>제품의 주요 특징을 입력하세요</li>
<li>사용 대상 및 효과를 작성하세요</li>
</ul>
<p><strong>복용 방법</strong></p>
<p>1일 ○회, 1회 ○정을 섭취하세요.</p>
<p><strong>주의사항</strong></p>
<ul>
<li>특이체질 및 알레르기 체질은 주의</li>
<li>의약품과 병용 시 전문가 상담</li>
</ul>`,
      },
      {
        name: '건강기능식품 상세 설명',
        description: '건강기능식품의 성분/기능성/주의사항 구조',
        category: 'product',
        contentHtml: `<p><strong>주요 성분</strong></p>
<ul>
<li>주요 성분명과 함량을 입력하세요</li>
</ul>
<p><strong>기능성 내용</strong></p>
<p>식약처 인정 기능성 내용을 작성하세요.</p>
<p><strong>섭취 방법</strong></p>
<p>1일 ○회, 1회 ○정(○mg)을 물과 함께 섭취하세요.</p>
<p><strong>섭취 시 주의사항</strong></p>
<ul>
<li>질환이 있거나 의약품 복용 시 전문가 상담</li>
<li>이상사례 발생 시 섭취를 중단하고 전문가 상담</li>
</ul>`,
      },
      {
        name: '간단 소개',
        description: '간단 소개용 1~2줄 템플릿',
        category: 'product',
        contentHtml: `<p>이 제품은 ○○에 도움을 줄 수 있는 제품입니다. 주요 성분 ○○ 함유.</p>`,
      },
      {
        name: 'B2B 판매 포인트',
        description: '매장/판매자용 B2B 가치 설명 구조',
        category: 'product',
        contentHtml: `<p><strong>판매 포인트</strong></p>
<ul>
<li>이 제품의 차별화된 판매 가치를 작성하세요</li>
<li>타겟 고객층과 추천 상황을 기술하세요</li>
</ul>
<p><strong>매장 활용 가이드</strong></p>
<ul>
<li>추천 진열 위치: ○○</li>
<li>함께 추천하면 좋은 제품: ○○</li>
<li>고객 상담 시 핵심 멘트: ○○</li>
</ul>
<p><strong>공급 조건</strong></p>
<p>최소 주문 수량: ○개 / 마진율: ○%</p>`,
      },
      {
        name: '의약품 상세 설명',
        description: '의약품/의약외품의 효능효과/용법용량/주의사항 구조',
        category: 'product',
        contentHtml: `<p><strong>효능·효과</strong></p>
<p>이 약의 효능효과를 입력하세요.</p>
<p><strong>용법·용량</strong></p>
<p>성인 1회 ○정, 1일 ○회 복용하세요.</p>
<p><strong>사용상의 주의사항</strong></p>
<ul>
<li>이 약에 과민증 환자는 복용 금지</li>
<li>임부 또는 수유부는 전문가 상담</li>
<li>다른 약과 병용 시 약사에게 상담</li>
</ul>
<p><strong>보관 방법</strong></p>
<p>실온(1~30°C) 보관, 직사광선 및 습기를 피하세요.</p>`,
      },
    ];

    for (const t of templates) {
      await queryRunner.query(
        `INSERT INTO content_templates
          (name, description, category, content_html, service_key, created_by_user_id, created_by_user_name, is_public, is_active, usage_count)
         VALUES ($1, $2, $3, $4, 'neture', $5, $6, true, true, 0)`,
        [t.name, t.description, t.category, t.contentHtml, createdById, createdByName],
      );
    }

    // Seed complete
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM content_templates WHERE service_key = 'neture' AND is_public = true AND name IN ($1, $2, $3, $4, $5)`,
      ['상품 기본 설명', '건강기능식품 상세 설명', '간단 소개', 'B2B 판매 포인트', '의약품 상세 설명'],
    );
  }
}
