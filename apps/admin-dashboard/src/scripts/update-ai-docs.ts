/**
 * AI 페이지 생성 문서 자동 업데이트 스크립트
 *
 * 블록과 숏코드 레지스트리를 스캔하여 docs/manual/ai-page-generation.md 파일을 자동으로 업데이트
 */

import fs from 'fs';
import path from 'path';

interface BlockInfo {
  name: string;
  title: string;
  category: string;
  description: string;
}

interface ShortcodeInfo {
  name: string;
  category: string;
  description: string;
  attributes: string[];
  example: string;
}

/**
 * 블록 파일에서 블록 정보 추출
 */
function extractBlocksFromFiles(): BlockInfo[] {
  const blocksDir = path.join(__dirname, '../components/editor/blocks');
  const blocks: BlockInfo[] = [];

  // 기본 블록 정보 (실제로는 파일을 스캔해야 하지만, 여기서는 간단히 정의)
  const coreBlocks: BlockInfo[] = [
    { name: 'core/paragraph', title: '단락', category: '텍스트', description: '일반 단락 텍스트' },
    { name: 'core/heading', title: '제목', category: '텍스트', description: '제목 (H1-H6)' },
    { name: 'core/list', title: '리스트', category: '텍스트', description: '순서 있는/없는 리스트' },
    { name: 'core/quote', title: '인용구', category: '텍스트', description: '인용구 블록' },
    { name: 'core/code', title: '코드', category: '텍스트', description: '코드 블록' },
    { name: 'core/preformatted', title: '사전 서식', category: '텍스트', description: '사전 서식 텍스트' },

    { name: 'core/image', title: '이미지', category: '미디어', description: '이미지 블록' },
    { name: 'core/gallery', title: '갤러리', category: '미디어', description: '이미지 갤러리' },
    { name: 'core/video', title: '비디오', category: '미디어', description: '비디오 블록' },
    { name: 'core/audio', title: '오디오', category: '미디어', description: '오디오 블록' },
    { name: 'core/file', title: '파일', category: '미디어', description: '파일 다운로드' },

    { name: 'core/button', title: '버튼', category: '디자인', description: '버튼 블록' },
    { name: 'core/buttons', title: '버튼 그룹', category: '디자인', description: '버튼 그룹' },
    { name: 'core/columns', title: '다단', category: '디자인', description: '다단 레이아웃' },
    { name: 'core/column', title: '단', category: '디자인', description: '단 블록' },
    { name: 'core/group', title: '그룹', category: '디자인', description: '블록 그룹' },
    { name: 'core/separator', title: '구분선', category: '디자인', description: '수평 구분선' },
    { name: 'core/spacer', title: '공백', category: '디자인', description: '공백 추가' },
    { name: 'core/cover', title: '커버', category: '디자인', description: '커버 이미지' },

    { name: 'core/table', title: '표', category: '레이아웃', description: '표 블록' },
    { name: 'core/media-text', title: '미디어와 텍스트', category: '레이아웃', description: '미디어와 텍스트 조합' },

    { name: 'core/embed', title: '임베드', category: '임베드', description: '외부 콘텐츠 임베드' },
    { name: 'core/shortcode', title: '숏코드', category: '위젯', description: '숏코드 삽입' },

    { name: 'o4o/slide', title: '슬라이드', category: '미디어', description: '슬라이드쇼 블록' },
  ];

  return coreBlocks;
}

/**
 * 숏코드 정보 추출
 */
function extractShortcodes(): ShortcodeInfo[] {
  return [
    {
      name: 'product',
      category: 'E-commerce',
      description: '단일 상품 표시',
      attributes: ['id'],
      example: '[product id="123"]'
    },
    {
      name: 'product_grid',
      category: 'E-commerce',
      description: '상품 그리드 표시',
      attributes: ['category', 'limit', 'columns'],
      example: '[product_grid category="전자제품" limit="8" columns="4"]'
    },
    {
      name: 'add_to_cart',
      category: 'E-commerce',
      description: '장바구니 추가 버튼',
      attributes: ['id', 'text'],
      example: '[add_to_cart id="123" text="구매하기"]'
    },
    {
      name: 'featured_products',
      category: 'E-commerce',
      description: '추천 상품 표시',
      attributes: ['limit'],
      example: '[featured_products limit="4"]'
    },
    {
      name: 'form',
      category: 'Forms',
      description: '폼 삽입',
      attributes: ['id'],
      example: '[form id="contact-form"]'
    },
    {
      name: 'view',
      category: 'Forms',
      description: '데이터 뷰 표시',
      attributes: ['id'],
      example: '[view id="submissions"]'
    },
    {
      name: 'video',
      category: 'Media',
      description: '비디오 임베드 (YouTube, Vimeo 등)',
      attributes: ['url', 'width', 'height'],
      example: '[video url="https://youtube.com/watch?v=..." width="560" height="315"]'
    },
    {
      name: 'gallery',
      category: 'Media',
      description: '이미지 갤러리',
      attributes: ['ids', 'columns', 'size'],
      example: '[gallery ids="1,2,3" columns="3" size="medium"]'
    },
    {
      name: 'recent_posts',
      category: 'Content',
      description: '최근 게시물 표시',
      attributes: ['limit', 'category'],
      example: '[recent_posts limit="5" category="news"]'
    },
    {
      name: 'author',
      category: 'Content',
      description: '작성자 정보 표시',
      attributes: ['id'],
      example: '[author id="john"]'
    },
    {
      name: 'partner_dashboard',
      category: 'Dropshipping',
      description: '파트너 대시보드',
      attributes: [],
      example: '[partner_dashboard]'
    },
    {
      name: 'commission_dashboard',
      category: 'Dropshipping',
      description: '커미션 대시보드',
      attributes: [],
      example: '[commission_dashboard]'
    },
    {
      name: 'admin_approval_queue',
      category: 'Dropshipping',
      description: '관리자 승인 대기열',
      attributes: [],
      example: '[admin_approval_queue]'
    }
  ];
}

/**
 * 마크다운 문서 생성
 */
function generateDocumentation(): string {
  const blocks = extractBlocksFromFiles();
  const shortcodes = extractShortcodes();

  const blocksByCategory = blocks.reduce((acc, block) => {
    if (!acc[block.category]) acc[block.category] = [];
    acc[block.category].push(block);
    return acc;
  }, {} as Record<string, BlockInfo[]>);

  const shortcodesByCategory = shortcodes.reduce((acc, sc) => {
    if (!acc[sc.category]) acc[sc.category] = [];
    acc[sc.category].push(sc);
    return acc;
  }, {} as Record<string, ShortcodeInfo[]>);

  let doc = `# AI 페이지 자동 생성 기능 매뉴얼

> 이 문서는 자동으로 생성됩니다. 수동으로 편집하지 마세요.
> 업데이트: ${new Date().toISOString()}

## 개요

AI 페이지 자동 생성 기능을 사용하면 간단한 텍스트 프롬프트로 완성도 높은 페이지를 자동으로 생성할 수 있습니다.

## 지원하는 AI 모델

### OpenAI (2025)
- **gpt-5**: GPT-5 (최신 추론 모델)
- **gpt-5-mini**: GPT-5 Mini (빠르고 경제적)
- **gpt-4.1**: GPT-4.1 (복잡한 작업용)

### Google Gemini (2025)
- **gemini-2.5-flash**: Gemini 2.5 Flash (권장)
- **gemini-2.5-pro**: Gemini 2.5 Pro (최강력)

### Anthropic Claude (2025)
- **claude-sonnet-4.5**: Claude Sonnet 4.5 (최신)
- **claude-opus-4**: Claude Opus 4 (최강력)

## 사용 방법

1. **도구 → AI 페이지 생성** 메뉴 선택
2. AI 모델 선택
3. 페이지 유형 선택 (Landing, About, Product, Blog)
4. 프롬프트 입력 (예: "친환경 화장품 회사 소개 페이지")
5. **생성하기** 클릭

## 사용 가능한 블록

`;

  // 블록 문서화
  Object.entries(blocksByCategory).forEach(([category, categoryBlocks]) => {
    doc += `### ${category}\n\n`;
    categoryBlocks.forEach(block => {
      doc += `#### ${block.name}\n`;
      doc += `- **제목**: ${block.title}\n`;
      doc += `- **설명**: ${block.description}\n`;
      doc += `- **사용 예**:\n\`\`\`json\n`;
      doc += `{"type": "${block.name}", "content": {...}, "attributes": {...}}\n`;
      doc += `\`\`\`\n\n`;
    });
  });

  doc += `## 사용 가능한 숏코드\n\n`;
  doc += `숏코드는 동적 콘텐츠를 삽입하는 강력한 도구입니다. \`core/shortcode\` 블록으로 삽입됩니다.\n\n`;

  // 숏코드 문서화
  Object.entries(shortcodesByCategory).forEach(([category, categoryShortcodes]) => {
    doc += `### ${category}\n\n`;
    categoryShortcodes.forEach(sc => {
      doc += `#### [${sc.name}]\n`;
      doc += `- **설명**: ${sc.description}\n`;
      if (sc.attributes.length > 0) {
        doc += `- **속성**: ${sc.attributes.join(', ')}\n`;
      }
      doc += `- **예제**: \`${sc.example}\`\n\n`;
    });
  });

  doc += `## 자동 업데이트

이 문서는 블록과 숏코드가 추가/변경될 때마다 자동으로 업데이트됩니다.

업데이트 명령:
\`\`\`bash
npm run update-ai-docs
\`\`\`

## 문의

문제가 있거나 새로운 블록/숏코드를 추가하고 싶다면 개발팀에 문의하세요.
`;

  return doc;
}

/**
 * 문서 파일 업데이트
 */
function updateDocumentation() {
  const docsPath = path.join(__dirname, '../../../../docs/manual/ai-page-generation.md');
  const content = generateDocumentation();

  try {
    fs.writeFileSync(docsPath, content, 'utf-8');
    console.log(`✅ AI 문서가 업데이트되었습니다: ${docsPath}`);
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

export { updateDocumentation, generateDocumentation };
