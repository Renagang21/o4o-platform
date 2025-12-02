# AI Generator

**NextGen Frontend AI-Powered View Generation**

AI Generator는 자연어 입력을 받아 자동으로 View Schema (JSON)를 생성하는 AI 기반 엔진입니다.

## 🎯 기능

- ✅ 자연어 → View JSON 자동 생성
- ✅ AI Intent 분석 (신뢰도 점수 포함)
- ✅ Rule-based fallback (LLM 없이 작동)
- ✅ 여러 LLM 지원 준비 (OpenAI, Anthropic, Google)
- ✅ 배치 생성 지원
- ✅ 미리보기 모드

## 📁 폴더 구조

```
src/ai/
├── aiGenerator.ts         # 메인 AI 생성 엔진
├── config.ts              # AI 설정 및 프롬프트
├── types.ts               # AI 관련 타입
├── index.ts               # 공개 API
├── README.md              # 이 파일
├── intent/
│   └── analyzeIntent.ts   # Intent 분석 (AI + 규칙)
├── transformers/
│   └── rules/             # 변환 규칙 (예정)
└── cli/
    └── generateFromAI.ts  # CLI 인터페이스
```

## 🚀 사용법

### CLI 명령어

```bash
# 단일 뷰 생성
npm run generate:ai "판매자 대시보드 페이지 만들어줘"
npm run generate:ai "product list with filters"

# 여러 뷰 한번에 생성
npm run generate:ai "product-list" "cart" "checkout"

# 미리보기 (저장하지 않음)
npm run generate:ai --preview "admin user management"

# AI 설정 확인
npm run generate:ai --stats
```

### 프로그래밍 방식

```typescript
import { generateFromPrompt, analyzeIntent } from '@/ai';

// 단일 뷰 생성
const result = await generateFromPrompt('판매자 대시보드 만들어줘');
if (result.success) {
  console.log('View generated:', result.filePath);
  console.log('Confidence:', result.intent?.confidence);
}

// Intent 분석만 수행
const intent = await analyzeIntent('상품 목록 페이지');
console.log('Analyzed:', intent);
```

## 📝 입력 예제

### 1. 한국어 자연어

```bash
npm run generate:ai "판매자 대시보드 페이지 만들어줘"
npm run generate:ai "상품 목록을 그리드로 보여주는 페이지"
npm run generate:ai "장바구니 화면 만들기"
```

### 2. 영어 자연어

```bash
npm run generate:ai "seller dashboard page"
npm run generate:ai "product list with filters and sorting"
npm run generate:ai "checkout flow with payment integration"
```

### 3. 간단한 키워드

```bash
npm run generate:ai "product-list"
npm run generate:ai "seller-dashboard"
npm run generate:ai "cart"
```

## 🤖 AI Intent 분석

AI Generator는 입력을 분석하여 구조화된 Intent를 생성합니다:

```typescript
{
  viewId: "seller-dashboard",
  category: "dashboard",
  action: "view",
  confidence: 0.95,
  suggestions: [
    "Add product-list for seller view",
    "Consider order-list for seller"
  ],
  reasoning: "Analyzed '판매자 대시보드' as a dashboard view..."
}
```

## 🎨 신뢰도 점수 (Confidence)

- **0.9-1.0**: 매우 확실 (정확한 패턴 매칭)
- **0.7-0.9**: 확실 (카테고리 명확)
- **0.5-0.7**: 보통 (추론 필요)
- **< 0.5**: 낮음 (확인 필요)

## 🔧 AI 설정

### 환경 변수

```bash
# .env
VITE_AI_PROVIDER=openai       # openai | anthropic | google | local
VITE_OPENAI_API_KEY=sk-...    # OpenAI API 키
VITE_ANTHROPIC_API_KEY=...    # Anthropic API 키
VITE_GOOGLE_API_KEY=...       # Google API 키
```

### 기본 동작

- LLM API 키가 없으면 자동으로 rule-based fallback 사용
- `local` 모드는 항상 사용 가능 (API 키 불필요)
- 실패 시 자동으로 rule-based로 폴백

## 🔌 LLM 통합 (예정)

현재는 rule-based 분석만 구현되어 있습니다.
향후 LLM 통합 시 다음 기능이 추가됩니다:

- 복잡한 자연어 이해
- 컨텍스트 기반 제안
- 디자인 의도 추론
- 자동 컴포넌트 조합

## 📊 ViewGenerator 연동

AI Generator는 Step 10의 ViewGenerator를 사용합니다:

```
Natural Language
     ↓
AI Intent Analysis (confidence + suggestions)
     ↓
ViewGenerator (Step 10)
     ↓
View JSON File
     ↓
AutoRoutes → ViewRenderer
```

## 🎯 성공 기준

- ✅ 자연어 입력 → Intent 분석
- ✅ Intent → View JSON 생성
- ✅ ViewGenerator 연동
- ✅ Confidence 점수 제공
- ✅ Suggestions 제공
- ✅ CLI 인터페이스 작동
- ✅ 타입 에러 없음

## 🚧 다음 단계 (향후)

- LLM API 통합 (OpenAI, Anthropic, Google)
- Antigravity UI → View JSON 변환
- 실시간 프리뷰
- 컴포넌트 자동 조합
- 디자인 패턴 학습

---

**Status**: ✅ Phase 1 완료 (Rule-based)
**Version**: 1.0.0
**Last Updated**: 2025-12-02
