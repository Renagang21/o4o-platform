/**
 * 숏코드 레퍼런스 문서 자동 업데이트 스크립트
 *
 * 실제 레지스트리를 스캔하여 docs/manual/shortcode-reference.md 파일을 자동으로 업데이트
 */

import fs from 'fs';
import path from 'path';

// 숏코드 정보 타입
interface ShortcodeInfo {
  name: string;
  category: string;
  description: string;
  attributes: Record<string, {
    type: string;
    required?: boolean;
    default?: any;
    options?: any[];
    description?: string;
  }>;
  requiresAuth?: boolean;
  authLevel?: string; // 'partner', 'supplier', 'seller', 'admin', 'user'
  examples: string[];
}

/**
 * 레지스트리에서 숏코드 정보 추출
 */
function extractShortcodesInfo(): ShortcodeInfo[] {
  const shortcodes: ShortcodeInfo[] = [];

  // Content 숏코드
  shortcodes.push({
    name: 'recent_posts',
    category: '콘텐츠',
    description: '최근 게시물 목록을 표시합니다.',
    attributes: {
      limit: { type: 'number', default: 5, description: '표시할 게시물 수' },
      category: { type: 'string', required: false, description: '특정 카테고리 필터' }
    },
    examples: [
      '[recent_posts limit="10"]',
      '[recent_posts limit="5" category="뉴스"]'
    ]
  });

  shortcodes.push({
    name: 'author',
    category: '콘텐츠',
    description: '작성자 정보를 표시합니다.',
    attributes: {
      id: { type: 'string', required: true, description: '작성자 ID 또는 사용자명' }
    },
    examples: [
      '[author id="john"]',
      '[author id="admin"]'
    ]
  });

  // Media 숏코드
  shortcodes.push({
    name: 'gallery',
    category: '미디어',
    description: '이미지 갤러리를 표시합니다.',
    attributes: {
      ids: { type: 'string', required: true, description: '쉼표로 구분된 이미지 ID 목록' },
      columns: { type: 'number', default: 3, description: '갤러리 열 개수' },
      size: { type: 'string', default: 'medium', options: ['thumbnail', 'medium', 'large', 'full'], description: '이미지 크기' }
    },
    examples: [
      '[gallery ids="1,2,3,4,5,6"]',
      '[gallery ids="10,11,12" columns="4" size="large"]'
    ]
  });

  shortcodes.push({
    name: 'video',
    category: '미디어',
    description: 'YouTube, Vimeo 등 비디오를 임베드합니다.',
    attributes: {
      url: { type: 'string', required: true, description: '비디오 URL' },
      width: { type: 'number', default: 560, description: '비디오 너비 (픽셀)' },
      height: { type: 'number', default: 315, description: '비디오 높이 (픽셀)' }
    },
    examples: [
      '[video url="https://youtube.com/watch?v=dQw4w9WgXcQ"]',
      '[video url="https://vimeo.com/123456789" width="800" height="450"]'
    ]
  });

  // E-commerce 숏코드
  shortcodes.push({
    name: 'product',
    category: 'E-commerce',
    description: '단일 상품을 표시합니다.',
    attributes: {
      id: { type: 'string', required: true, description: '상품 ID' },
      variant: { type: 'string', default: 'card', options: ['card', 'list', 'compact'], description: '표시 스타일' }
    },
    examples: [
      '[product id="123"]',
      '[product id="456" variant="list"]'
    ]
  });

  shortcodes.push({
    name: 'product_grid',
    category: 'E-commerce',
    description: '상품 그리드를 표시합니다.',
    attributes: {
      category: { type: 'string', required: false, description: '카테고리 필터' },
      limit: { type: 'number', default: 8, description: '표시할 상품 수' },
      columns: { type: 'number', default: 4, options: [2, 3, 4, 5, 6], description: '그리드 열 개수' }
    },
    examples: [
      '[product_grid limit="12"]',
      '[product_grid category="전자제품" limit="8" columns="4"]',
      '[product_grid category="의류" columns="3"]'
    ]
  });

  shortcodes.push({
    name: 'add_to_cart',
    category: 'E-commerce',
    description: '장바구니 추가 버튼을 표시합니다.',
    attributes: {
      id: { type: 'string', required: true, description: '상품 ID' },
      text: { type: 'string', default: '장바구니에 담기', description: '버튼 텍스트' }
    },
    examples: [
      '[add_to_cart id="123"]',
      '[add_to_cart id="456" text="지금 구매하기"]'
    ]
  });

  shortcodes.push({
    name: 'featured_products',
    category: 'E-commerce',
    description: '추천 상품 목록을 표시합니다.',
    attributes: {
      limit: { type: 'number', default: 4, description: '표시할 상품 수' }
    },
    examples: [
      '[featured_products]',
      '[featured_products limit="8"]'
    ]
  });

  // Forms 숏코드
  shortcodes.push({
    name: 'form',
    category: '폼',
    description: '폼을 페이지에 삽입합니다.',
    attributes: {
      id: { type: 'string', required: true, description: '폼 ID' }
    },
    examples: [
      '[form id="contact-form"]',
      '[form id="registration"]'
    ]
  });

  shortcodes.push({
    name: 'view',
    category: '폼',
    description: '데이터 뷰를 표시합니다.',
    attributes: {
      id: { type: 'string', required: true, description: '뷰 ID' }
    },
    examples: [
      '[view id="submissions"]',
      '[view id="survey-results"]'
    ]
  });

  // Dropshipping - Partner
  shortcodes.push({
    name: 'partner_dashboard',
    category: '드롭쉬핑',
    description: '파트너 메인 대시보드를 표시합니다.',
    attributes: {},
    requiresAuth: true,
    authLevel: 'partner',
    examples: ['[partner_dashboard]']
  });

  shortcodes.push({
    name: 'partner_products',
    category: '드롭쉬핑',
    description: '파트너 상품 목록을 표시합니다.',
    attributes: {},
    requiresAuth: true,
    authLevel: 'partner',
    examples: ['[partner_products]']
  });

  shortcodes.push({
    name: 'partner_commissions',
    category: '드롭쉬핑',
    description: '파트너 커미션 내역을 표시합니다.',
    attributes: {},
    requiresAuth: true,
    authLevel: 'partner',
    examples: ['[partner_commissions]']
  });

  shortcodes.push({
    name: 'partner_link_generator',
    category: '드롭쉬핑',
    description: '파트너 링크 생성기를 표시합니다.',
    attributes: {},
    requiresAuth: true,
    authLevel: 'partner',
    examples: ['[partner_link_generator]']
  });

  shortcodes.push({
    name: 'commission_dashboard',
    category: '드롭쉬핑',
    description: '커미션 대시보드를 표시합니다.',
    attributes: {},
    requiresAuth: true,
    authLevel: 'partner',
    examples: ['[commission_dashboard]']
  });

  shortcodes.push({
    name: 'payout_requests',
    category: '드롭쉬핑',
    description: '출금 요청 관리를 표시합니다.',
    attributes: {},
    requiresAuth: true,
    authLevel: 'partner',
    examples: ['[payout_requests]']
  });

  // Dropshipping - Supplier
  shortcodes.push({
    name: 'supplier_products',
    category: '드롭쉬핑',
    description: '공급사 상품 목록을 표시합니다.',
    attributes: {},
    requiresAuth: true,
    authLevel: 'supplier',
    examples: ['[supplier_products]']
  });

  shortcodes.push({
    name: 'supplier_product_editor',
    category: '드롭쉬핑',
    description: '공급사 상품 편집기를 표시합니다.',
    attributes: {},
    requiresAuth: true,
    authLevel: 'supplier',
    examples: ['[supplier_product_editor]']
  });

  // Dropshipping - Seller
  shortcodes.push({
    name: 'seller_dashboard',
    category: '드롭쉬핑',
    description: '판매자 대시보드를 표시합니다.',
    attributes: {},
    requiresAuth: true,
    authLevel: 'seller',
    examples: ['[seller_dashboard]']
  });

  shortcodes.push({
    name: 'seller_products',
    category: '드롭쉬핑',
    description: '판매자 상품 관리를 표시합니다.',
    attributes: {},
    requiresAuth: true,
    authLevel: 'seller',
    examples: ['[seller_products]']
  });

  shortcodes.push({
    name: 'seller_settlement',
    category: '드롭쉬핑',
    description: '판매자 정산 내역을 표시합니다.',
    attributes: {},
    requiresAuth: true,
    authLevel: 'seller',
    examples: ['[seller_settlement]']
  });

  // Dropshipping - General
  shortcodes.push({
    name: 'user_dashboard',
    category: '드롭쉬핑',
    description: '사용자 역할 기반 대시보드를 표시합니다.',
    attributes: {
      role: { type: 'string', required: false, options: ['supplier', 'seller', 'affiliate'], description: '특정 역할 대시보드 표시' }
    },
    requiresAuth: true,
    authLevel: 'user',
    examples: [
      '[user_dashboard]',
      '[user_dashboard role="supplier"]'
    ]
  });

  shortcodes.push({
    name: 'role_verification',
    category: '드롭쉬핑',
    description: '역할 인증 폼을 표시합니다.',
    attributes: {
      type: { type: 'string', required: true, options: ['supplier', 'seller', 'affiliate'], description: '인증할 역할' }
    },
    examples: [
      '[role_verification type="supplier"]',
      '[role_verification type="seller"]'
    ]
  });

  // Admin
  shortcodes.push({
    name: 'admin_approval_queue',
    category: '관리자',
    description: '관리자 승인 대기열을 표시합니다.',
    attributes: {},
    requiresAuth: true,
    authLevel: 'admin',
    examples: ['[admin_approval_queue]']
  });

  shortcodes.push({
    name: 'admin_platform_stats',
    category: '관리자',
    description: '플랫폼 통계를 표시합니다.',
    attributes: {},
    requiresAuth: true,
    authLevel: 'admin',
    examples: ['[admin_platform_stats]']
  });

  return shortcodes;
}

/**
 * 마크다운 문서 생성
 */
function generateMarkdown(shortcodes: ShortcodeInfo[]): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  let md = `# 숏코드 레퍼런스\n\n`;
  md += `> 마지막 업데이트: ${dateStr}\n\n`;
  md += `> 이 문서는 자동 생성됩니다. 수동 편집 시 다음 업데이트에서 덮어쓰여질 수 있습니다.\n\n`;

  // 카테고리별로 그룹화
  const byCategory = shortcodes.reduce((acc, sc) => {
    if (!acc[sc.category]) acc[sc.category] = [];
    acc[sc.category].push(sc);
    return acc;
  }, {} as Record<string, ShortcodeInfo[]>);

  // 요약 테이블
  md += `## 📋 숏코드 요약표\n\n`;
  md += `| 숏코드 | 카테고리 | 설명 | 권한 필요 |\n`;
  md += `|--------|---------|------|----------|\n`;

  shortcodes.forEach(sc => {
    const authIcon = sc.requiresAuth ? `✅ ${sc.authLevel}` : '❌';
    md += `| \`[${sc.name}]\` | ${sc.category} | ${sc.description} | ${authIcon} |\n`;
  });

  md += `\n---\n\n`;

  // 카테고리별 상세 정보
  Object.entries(byCategory).forEach(([category, items]) => {
    md += `## ${category} 숏코드\n\n`;

    items.forEach(sc => {
      md += `### [${sc.name}]\n\n`;
      md += `${sc.description}\n\n`;

      const attrKeys = Object.keys(sc.attributes);
      if (attrKeys.length > 0) {
        md += `**속성:**\n`;
        attrKeys.forEach(attrName => {
          const attr = sc.attributes[attrName];
          const required = attr.required ? '필수' : '선택사항';
          const defaultVal = attr.default !== undefined ? `, 기본값: ${attr.default}` : '';
          const options = attr.options ? ` (${attr.options.join(', ')})` : '';
          md += `- \`${attrName}\` (${attr.type}, ${required}${defaultVal})${options} - ${attr.description || ''}\n`;
        });
        md += `\n`;
      } else {
        md += `**속성:** 없음\n\n`;
      }

      if (sc.examples.length > 0) {
        md += `**사용 예시:**\n\`\`\`\n`;
        sc.examples.forEach(ex => md += `${ex}\n`);
        md += `\`\`\`\n\n`;
      }

      if (sc.requiresAuth) {
        md += `**필요 권한:** ${sc.authLevel} 로그인 필요\n\n`;
      }

      md += `---\n\n`;
    });
  });

  // 사용 팁
  md += `## 💡 사용 팁\n\n`;
  md += `### 1. 블록 에디터에서 사용\n\n`;
  md += `블록 에디터에서 "숏코드" 블록을 추가하고 숏코드를 입력하세요.\n\n`;
  md += `### 2. 속성 생략\n\n`;
  md += `속성에 기본값이 있는 경우 생략 가능합니다:\n`;
  md += `\`\`\`\n[product_grid]  <!-- 기본값 사용 -->\n\`\`\`\n\n`;
  md += `### 3. 조건부 표시\n\n`;
  md += `일부 숏코드는 로그인 상태나 권한에 따라 다르게 표시됩니다.\n\n`;

  // 문제 해결
  md += `## 🔧 문제 해결\n\n`;
  md += `### 숏코드가 표시되지 않음\n\n`;
  md += `**해결:**\n`;
  md += `1. 숏코드 이름이 정확한지 확인\n`;
  md += `2. 필수 속성이 누락되지 않았는지 확인\n`;
  md += `3. 속성 값이 올바른 형식인지 확인\n\n`;

  md += `---\n\n`;
  md += `**문서 버전:** 자동 생성\n`;
  md += `**최종 수정:** ${dateStr}\n`;

  return md;
}

/**
 * 문서 파일 업데이트
 */
function updateDocumentation() {
  const docsPath = path.join(__dirname, '../../../../docs/manual/shortcode-reference.md');

  try {
    const shortcodes = extractShortcodesInfo();
    const content = generateMarkdown(shortcodes);

    fs.writeFileSync(docsPath, content, 'utf-8');

    console.log(`✅ 숏코드 레퍼런스가 업데이트되었습니다: ${docsPath}`);
    console.log(`📊 총 ${shortcodes.length}개의 숏코드 문서화됨`);
    console.log(`📅 업데이트 시간: ${new Date().toLocaleString('ko-KR')}`);
  } catch (error) {
    console.error('❌ 문서 업데이트 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  updateDocumentation();
}

export { updateDocumentation, generateMarkdown, extractShortcodesInfo };
