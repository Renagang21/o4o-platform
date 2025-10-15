/**
 * AI 페이지 생성 문서 자동 업데이트 스크립트
 *
 * SimpleAIGenerator와 block-registry-extractor를 분석하여
 * docs/manual/ai-page-generation.md 파일을 최신 상태로 유지
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// AI 모델 정의 (SimpleAIGenerator.ts에서 추출)
const AI_MODELS = {
  // OpenAI GPT-5 시리즈 (2025)
  'gpt-5': { name: 'GPT-5', description: '최신 추론 모델' },
  'gpt-5-mini': { name: 'GPT-5 Mini', description: '빠르고 경제적' },
  'gpt-5-nano': { name: 'GPT-5 Nano', description: '초고속' },
  'gpt-4.1': { name: 'GPT-4.1', description: '복잡한 작업용' },
  'gpt-4o': { name: 'GPT-4o', description: '멀티모달' },

  // Google Gemini 2025
  'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', description: '빠르고 강력 (권장)' },
  'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', description: '최강력' },
  'gemini-2.0-flash': { name: 'Gemini 2.0 Flash', description: '멀티모달' },

  // Claude 2025 (Anthropic)
  'claude-sonnet-4.5': { name: 'Claude Sonnet 4.5', description: '최신 모델' },
  'claude-opus-4': { name: 'Claude Opus 4', description: '최강력' },
  'claude-sonnet-4': { name: 'Claude Sonnet 4', description: '안정적' },
};

// 템플릿 정의
const TEMPLATES = {
  landing: {
    name: '랜딩 페이지',
    description: '제품/서비스 소개, 전환율 최적화',
    elements: [
      '히어로 섹션 (Hero Section)',
      '주요 기능/특징',
      '고객 후기 (Testimonials)',
      '가격 플랜',
      'CTA (Call-to-Action) 버튼',
      'FAQ'
    ],
    examplePrompt: `AI 기반 마케팅 자동화 SaaS 제품의 랜딩 페이지를 만들어주세요.
- 타겟: 중소기업 마케팅 담당자
- 주요 기능: 이메일 자동화, SNS 예약 발행, 성과 분석
- 3가지 가격 플랜 (Basic, Pro, Enterprise)`
  },
  about: {
    name: '소개 페이지',
    description: '회사/개인/팀 소개',
    elements: [
      '회사 소개',
      '비전 및 미션',
      '핵심 가치 3-4개',
      '팀 소개',
      '연혁 (Timeline)',
      '문화 및 가치'
    ],
    examplePrompt: `친환경 패션 브랜드의 About 페이지를 만들어주세요.
- 창립: 2020년, 서울
- 미션: 지속 가능한 패션 생태계 구축
- 핵심 가치: 환경 보호, 공정 무역, 윤리적 생산
- 팀: 3명의 공동 창업자 소개`
  },
  product: {
    name: '상품 페이지',
    description: '단일 상품 상세 설명',
    elements: [
      '상품 이미지 갤러리',
      '상품명 및 가격',
      '상세 설명',
      '스펙 및 옵션',
      '리뷰',
      '관련 상품'
    ],
    examplePrompt: `프리미엄 무선 이어폰 상품 페이지를 만들어주세요.
- 상품명: AirPods Pro Max
- 가격: 549,000원
- 주요 기능: ANC, 공간 음향, 20시간 배터리
- 컬러: 실버, 스페이스 그레이, 골드`
  },
  blog: {
    name: '블로그 포스트',
    description: '정보성 콘텐츠, 튜토리얼, 뉴스',
    elements: [
      '제목 및 서론',
      '목차',
      '본문 (소제목별 구조화)',
      '이미지 및 코드 블록',
      '결론',
      '관련 글 링크'
    ],
    examplePrompt: `"React 19 새로운 기능 완벽 가이드" 블로그 포스트를 작성해주세요.
- 주요 내용: React Compiler, Server Components, Actions
- 난이도: 중급 개발자
- 코드 예시 포함
- 1500-2000자 분량`
  }
};

// 블록 예시
const BLOCK_EXAMPLES = {
  'o4o/paragraph': {
    name: '단락',
    category: '텍스트',
    description: '일반 텍스트 단락',
    example: {
      type: 'o4o/paragraph',
      content: { text: '여기에 텍스트 내용이 들어갑니다.' }
    }
  },
  'o4o/heading': {
    name: '제목',
    category: '텍스트',
    description: 'H1~H6 제목 (level: 1-6)',
    example: {
      type: 'o4o/heading',
      content: { text: '페이지 제목' },
      attributes: { level: 1 }
    }
  },
  'o4o/list': {
    name: '리스트',
    category: '텍스트',
    description: '순서 있는/없는 리스트',
    example: {
      type: 'o4o/list',
      content: { items: ['항목 1', '항목 2', '항목 3'] },
      attributes: { ordered: false }
    }
  },
  'o4o/quote': {
    name: '인용구',
    category: '텍스트',
    example: {
      type: 'o4o/quote',
      content: { text: '훌륭한 제품은 디테일에서 나온다.', citation: '스티브 잡스' }
    }
  },
  'o4o/code': {
    name: '코드 블록',
    category: '텍스트',
    example: {
      type: 'o4o/code',
      content: { code: 'function greet() { return "Hello"; }', language: 'javascript' }
    }
  },
  'o4o/image': {
    name: '이미지',
    category: '미디어',
    description: '**중요**: AI 생성 시 `src`는 비워두고 `alt`만 포함',
    example: {
      type: 'o4o/image',
      content: { alt: '스마트폰을 사용하는 사람' }
    }
  },
  'o4o/video': {
    name: '비디오',
    category: '미디어',
    example: {
      type: 'o4o/video',
      content: { caption: '제품 소개 영상' }
    }
  },
  'o4o/gallery': {
    name: '갤러리',
    category: '미디어',
    example: {
      type: 'o4o/gallery',
      content: { images: [] }
    }
  },
  'o4o/button': {
    name: '버튼',
    category: '디자인',
    description: '**variant 옵션**: `primary`, `secondary`, `outline`',
    example: {
      type: 'o4o/button',
      content: { text: '지금 시작하기', url: '#' },
      attributes: { variant: 'primary' }
    }
  },
  'o4o/columns': {
    name: '다단 레이아웃',
    category: '디자인',
    example: {
      type: 'o4o/columns',
      content: {
        columns: [
          { blocks: [{ type: 'o4o/heading', content: { text: '왼쪽 칼럼' } }] },
          { blocks: [{ type: 'o4o/heading', content: { text: '오른쪽 칼럼' } }] }
        ]
      }
    }
  },
  'o4o/separator': {
    name: '구분선',
    category: '디자인',
    example: { type: 'o4o/separator' }
  }
};

/**
 * 마크다운 문서 생성
 */
function generateDocumentation(): string {
  const currentDate = new Date().toISOString().split('T')[0];

  let md = `# AI 페이지 자동 생성 기능 매뉴얼

> 마지막 업데이트: ${currentDate}
> 이 문서는 자동으로 생성됩니다. 수동 편집하지 마세요.

## 목차
1. [개요](#개요)
2. [사전 준비](#사전-준비)
3. [사용 방법](#사용-방법)
4. [지원하는 AI 모델](#지원하는-ai-모델)
5. [템플릿 종류](#템플릿-종류)
6. [사용 가능한 블록](#사용-가능한-블록)
7. [사용 가능한 숏코드](#사용-가능한-숏코드)
8. [문제 해결](#문제-해결)

---

## 개요

AI 페이지 자동 생성 기능은 최신 AI 모델(GPT-5, Gemini 2.5, Claude 4.5 등)을 활용하여 간단한 프롬프트만으로 전문적인 웹 페이지를 자동으로 생성하는 기능입니다.

### 주요 기능
- ✨ 자연어 프롬프트로 페이지 생성
- 🎨 다양한 템플릿 지원 (랜딩, 소개, 상품, 블로그)
- 🤖 최신 AI 모델 지원 (2025년 기준)
- 📦 Gutenberg 블록 자동 생성
- 🔄 실시간 진행 상황 표시
- 💾 API 키 자동 저장 및 불러오기

---

## 사전 준비

### 1. AI API 키 설정

페이지 생성 기능을 사용하려면 먼저 AI API 키를 설정해야 합니다.

**설정 위치:** \`설정 → AI 설정\` 또는 \`Settings → AI Settings\`

#### OpenAI API 키 설정
1. [OpenAI Platform](https://platform.openai.com/)에 로그인
2. API Keys 메뉴에서 새 API 키 생성
3. 관리자 대시보드의 AI 설정 페이지에 키 입력 및 저장

#### Google Gemini API 키 설정
1. [Google AI Studio](https://makersuite.google.com/)에 접속
2. API 키 생성
3. 관리자 대시보드의 AI 설정 페이지에 키 입력 및 저장

#### Anthropic Claude API 키 설정
1. [Anthropic Console](https://console.anthropic.com/)에 로그인
2. API Keys 섹션에서 키 생성
3. 관리자 대시보드의 AI 설정 페이지에 키 입력 및 저장

**💡 팁**: API 키를 미리 저장해두면 AI 페이지 생성 모달에서 자동으로 불러옵니다!

### 2. 권한 확인

AI 페이지 생성 기능은 다음 권한이 필요합니다:
- 페이지 편집 권한 (\`content:write\`)
- 또는 관리자 권한 (\`system:admin\`)

---

## 사용 방법

### 1. AI 페이지 생성 모달 열기

#### 방법 1: 편집기에서
1. 페이지 또는 포스트 편집 화면 진입
2. 상단 도구 모음에서 **"AI 페이지 생성"** 버튼 클릭 (⚡ Sparkles 아이콘)

#### 방법 2: 새 페이지 생성 시
1. \`페이지 → 새 페이지 추가\` 메뉴 선택
2. 편집기 상단에서 **"AI 페이지 생성"** 버튼 클릭

### 2. 설정 선택

#### 템플릿 선택
- **랜딩 페이지**: 제품이나 서비스를 소개하는 페이지
- **회사 소개**: 회사나 팀을 소개하는 페이지
- **제품 소개**: 제품의 특징과 장점을 설명
- **블로그 포스트**: 블로그 형식의 글

#### AI 서비스 선택
- **Google Gemini (권장)**: 빠르고 정확한 최신 모델
- **OpenAI GPT**: GPT-5 시리즈 지원
- **Anthropic Claude**: Claude 4 시리즈 지원

#### 모델 선택
- 각 AI 서비스별로 사용 가능한 모델 목록이 자동으로 표시됩니다
- 권장 모델: Gemini 2.5 Flash (빠르고 정확)

#### API 키
- 설정 페이지에서 미리 저장한 경우 자동으로 입력됩니다
- 또는 직접 입력 가능 (입력한 키는 저장되지 않음)

### 3. 프롬프트 작성

효과적인 프롬프트 작성 팁:

#### ✅ 좋은 예시
\`\`\`
스마트 홈 IoT 제품을 판매하는 회사의 랜딩 페이지를 만들어주세요.
주요 내용:
- 헤더: 회사 로고와 메뉴 (Home, Products, About, Contact)
- 히어로 섹션: "스마트 홈, 더 편리하게" 슬로건과 CTA 버튼
- 제품 소개: 3가지 주요 제품 (스마트 조명, 온도 조절기, 보안 카메라)
- 특징: 간편한 설치, AI 자동화, 모바일 제어
- 고객 후기 섹션
- 문의 폼
\`\`\`

#### ❌ 나쁜 예시
\`\`\`
홈페이지 만들어줘
\`\`\`

**💡 팁**: "예시 사용" 버튼을 클릭하면 템플릿별 예시 프롬프트가 자동으로 입력됩니다!

### 4. 생성 및 완료

1. **"페이지 생성"** 버튼 클릭
2. **진행 상황 확인**:
   - 10%: AI 모델에 연결 중...
   - 30%: AI 응답 생성 중...
   - 80%: 응답 처리 중...
   - 100%: 페이지 생성 완료!
3. **결과 확인**: 생성된 블록들이 편집기에 자동 삽입
4. **수정 및 저장**: 필요한 부분 수정 후 페이지 저장

---

## 지원하는 AI 모델

`;

  // OpenAI 모델
  md += `### OpenAI (2025)\n\n| 모델 | 이름 | 특징 |\n|------|------|------|\n`;
  Object.entries(AI_MODELS)
    .filter(([key]) => key.startsWith('gpt-'))
    .forEach(([key, info]) => {
      md += `| \`${key}\` | ${info.name} | ${info.description} |\n`;
    });

  md += `\n`;

  // Gemini 모델
  md += `### Google Gemini (2025)\n\n| 모델 | 이름 | 특징 |\n|------|------|------|\n`;
  Object.entries(AI_MODELS)
    .filter(([key]) => key.startsWith('gemini-'))
    .forEach(([key, info]) => {
      md += `| \`${key}\` | ${info.name} | ${info.description} |\n`;
    });

  md += `\n`;

  // Claude 모델
  md += `### Anthropic Claude (2025)\n\n| 모델 | 이름 | 특징 |\n|------|------|------|\n`;
  Object.entries(AI_MODELS)
    .filter(([key]) => key.startsWith('claude-'))
    .forEach(([key, info]) => {
      md += `| \`${key}\` | ${info.name} | ${info.description} |\n`;
    });

  md += `\n---\n\n`;

  // 템플릿 정보
  md += `## 템플릿 종류\n\n`;
  Object.entries(TEMPLATES).forEach(([key, template]) => {
    md += `### ${key === 'landing' ? '1' : key === 'about' ? '2' : key === 'product' ? '3' : '4'}. ${template.name}\n\n`;
    md += `**용도**: ${template.description}\n\n`;
    md += `**포함 요소**:\n`;
    template.elements.forEach(el => md += `- ${el}\n`);
    md += `\n**예시 프롬프트**:\n\`\`\`\n${template.examplePrompt}\n\`\`\`\n\n`;
  });

  md += `---\n\n`;

  // 블록 정보
  md += `## 사용 가능한 블록\n\n`;
  md += `AI가 생성할 수 있는 Gutenberg 블록 목록입니다.\n\n`;

  const blocksByCategory = Object.entries(BLOCK_EXAMPLES).reduce((acc, [key, block]) => {
    const category = block.category || '기타';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ key, ...block });
    return acc;
  }, {} as Record<string, any[]>);

  Object.entries(blocksByCategory).forEach(([category, blocks]) => {
    md += `### ${category} 블록\n\n`;
    blocks.forEach(block => {
      md += `#### ${block.key} (${block.name})\n`;
      if (block.description) {
        md += `${block.description}\n`;
      }
      md += `\`\`\`json\n${JSON.stringify(block.example, null, 2)}\n\`\`\`\n\n`;
    });
  });

  md += `---\n\n`;

  // 숏코드 정보
  md += `## 사용 가능한 숏코드\n\n`;
  md += `숏코드는 특수 기능을 간단하게 삽입할 수 있는 코드입니다.\n\n`;
  md += `**자세한 내용은 [숏코드 레퍼런스](./shortcode-reference.md) 문서를 참조하세요.**\n\n`;
  md += `### 주요 숏코드 예시\n\n`;
  md += `- \`[product id="123"]\`: 단일 상품 표시\n`;
  md += `- \`[product_grid category="전자제품" limit="8"]\`: 상품 그리드\n`;
  md += `- \`[form id="contact-form"]\`: 문의 폼 삽입\n`;
  md += `- \`[gallery ids="1,2,3" columns="3"]\`: 이미지 갤러리\n`;
  md += `- \`[partner_dashboard]\`: 파트너 대시보드\n`;
  md += `- \`[recent_posts limit="5"]\`: 최근 게시물\n\n`;

  md += `---\n\n`;

  // 문제 해결
  md += `## 문제 해결\n\n`;

  md += `### 1. API 키 오류\n\n`;
  md += `**문제**: "API 키가 유효하지 않습니다" 오류 발생\n\n`;
  md += `**해결 방법**:\n`;
  md += `1. AI 설정 페이지에서 API 키 재확인\n`;
  md += `2. API 키에 공백이나 특수문자가 없는지 확인\n`;
  md += `3. AI 제공자 플랫폼에서 키가 활성화되어 있는지 확인\n`;
  md += `4. 사용량 한도를 초과하지 않았는지 확인\n\n`;

  md += `### 2. 생성 실패\n\n`;
  md += `**문제**: "AI 페이지 생성 중 오류가 발생했습니다" 메시지\n\n`;
  md += `**해결 방법**:\n`;
  md += `1. 프롬프트가 너무 길거나 복잡하지 않은지 확인 (2000자 이하 권장)\n`;
  md += `2. 인터넷 연결 확인\n`;
  md += `3. 다른 AI 모델로 시도 (예: Gemini → OpenAI)\n`;
  md += `4. 브라우저 콘솔(F12)에서 자세한 오류 메시지 확인\n\n`;

  md += `### 3. 생성된 콘텐츠가 기대와 다름\n\n`;
  md += `**해결 방법**:\n\n`;
  md += `1. **더 구체적인 프롬프트 작성**\n`;
  md += `   - ❌ "회사 소개 페이지 만들어줘"\n`;
  md += `   - ✅ "친환경 화장품 브랜드의 소개 페이지. 비건 인증, 동물실험 반대, 재활용 용기 사용 강조"\n\n`;
  md += `2. **템플릿 변경**: 목적에 맞는 템플릿 선택\n\n`;
  md += `3. **모델 변경**: 창의적 콘텐츠는 Claude, 구조화된 콘텐츠는 GPT, 빠른 생성은 Gemini\n\n`;

  md += `### 4. 이미지가 표시되지 않음\n\n`;
  md += `**설명**: 이것은 정상입니다! AI는 이미지 URL을 생성하지 않고 \`alt\` 텍스트만 제공합니다.\n\n`;
  md += `**해결 방법**:\n`;
  md += `1. 각 이미지 블록을 클릭\n`;
  md += `2. "Select image" 버튼 클릭\n`;
  md += `3. 미디어 라이브러리에서 적절한 이미지 선택\n\n`;

  md += `### 5. 권한 오류\n\n`;
  md += `**문제**: "페이지를 생성할 권한이 없습니다" 메시지\n\n`;
  md += `**해결 방법**:\n`;
  md += `1. 관리자에게 \`content:write\` 권한 요청\n`;
  md += `2. 또는 \`system:admin\` 역할 부여 요청\n\n`;

  md += `---\n\n`;

  // 추가 리소스
  md += `## 추가 리소스\n\n`;
  md += `### 관련 문서\n`;
  md += `- [숏코드 레퍼런스](./shortcode-reference.md)\n`;
  md += `- [관리자 매뉴얼](./admin-manual.md)\n`;
  md += `- [외모 커스터마이징 가이드](./appearance-customize.md)\n\n`;

  md += `### 자동 업데이트\n\n`;
  md += `이 문서는 AI 생성 시스템이 업데이트될 때마다 자동으로 갱신됩니다.\n\n`;
  md += `\`\`\`bash\n`;
  md += `# 문서 업데이트 명령\n`;
  md += `npm run update:ai-page-docs\n`;
  md += `\`\`\`\n\n`;

  md += `---\n\n`;
  md += `**마지막 업데이트**: ${currentDate}\n`;
  md += `**버전**: 2.0.0 (자동 생성)\n`;
  md += `**적용 대상**: O4O Platform Admin Dashboard v3.0+\n`;

  return md;
}

/**
 * 문서 파일 업데이트
 */
function updateDocumentation() {
  const docsPath = path.join(__dirname, '../../../../docs/manual/ai-page-generation.md');
  const content = generateDocumentation();

  try {
    fs.writeFileSync(docsPath, content, 'utf-8');
    process.stdout.write(`✅ AI 페이지 생성 문서가 업데이트되었습니다: ${docsPath}\n`);
    process.stdout.write(`📅 업데이트 시간: ${new Date().toLocaleString('ko-KR')}\n`);
  } catch (error) {
    process.stderr.write(`❌ 문서 업데이트 실패: ${error}\n`);
    process.exit(1);
  }
}

// 스크립트 실행
updateDocumentation();

export { updateDocumentation, generateDocumentation };
