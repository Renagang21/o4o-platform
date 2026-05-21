# IR-O4O-AI-ASSISTANCE-CANONICAL-AUDIT-V1

**작성일:** 2026-05-21
**대상:** O4O 전체 AI 콘텐츠 편집·생성 흐름
**성격:** 코드 읽기 전용 Audit — 수정 없음, 커밋 없음

---

## 1. 전체 판정

> **AI 편집 흐름은 단일 컴포넌트(`AiContentModal`)로 통합되어 있다.**
> Core 기반은 `flexible` outputType 기반으로 사용자 의도 우선 구조가 이미 반영됨.
> 다만 UI 레이블('고객용 정리', '짧게 요약')이 사용자를 사전 결과 규정 방향으로 오해하게 유도할 여지가 있다.
> Extension(템플릿) 구조는 POP/QR/Blog/제품설명 10개로 잘 정의됨.
> 즉시 제거 필요한 구조적 결함은 없음.

---

## 2. AI 컴포넌트 목록

### 2-1. 핵심 컴포넌트

| 파일 | 줄 수 | 역할 |
|------|------:|------|
| `packages/content-editor/src/components/AiContentModal.tsx` | 1,825 | 단일 통합 AI 모달 |
| `packages/content-editor/src/components/Toolbar.tsx` | — | 에디터 툴바에서 AiContentModal 호출 |

### 2-2. AiContentModal Props 전체

| Prop | 타입 | 기본값 | 비고 |
|------|------|--------|------|
| `mode` | AiMode | — | 내부 상태 초기값 (initialMode 없으면 'customer_rewrite') |
| `initialMode` | AiMode \| null | null | 진입 시 모드 고정. **설정 시 outputType 고정** |
| `outputType` | string | — | outputType 직접 전달 (미사용 추세, initialMode로 대체) |
| `tone` | ToneOption | 'professional' | 보조값. templateForcedOptions로 재정의 가능 |
| `length` | LengthOption | 'medium' | 보조값. templateForcedOptions로 재정의 가능 |
| `customPrompt` | string | '' | 사용자 자유 입력 500자. 최우선 반영 |
| `templateId` | string \| null | null | productionTemplates 레지스트리 키 |
| `templateSystemPrompt` | string \| null | null | 템플릿 시스템 프롬프트 override |
| `templateForcedOptions` | object \| null | null | tone/length 강제값 |
| `initialSourceTab` | 'text' \| 'url' | 'text' | 입력 소스 탭 기본 선택 |
| `initialText` | string | '' | 모달 진입 시 텍스트 자동 주입 |
| `showStoreSave` | boolean | false | 매장 저장 버튼 표시 여부 |
| `showCommunitySave` | boolean | false | 커뮤니티 저장 버튼 표시 여부 |
| `showProductionMaterialSave` | boolean | false | 제작 자료 저장 버튼 표시 여부 |
| `onProductionMaterialSaved` | callback | — | 제작 자료 저장 완료 콜백 |
| `aiRequestHeaders` | Headers | — | Bearer 토큰 등 인증 헤더 |

### 2-3. 사용처 목록 (13개)

| 파일 | 진입 방식 | initialMode |
|------|----------|-------------|
| `web-kpa-society/.../PharmacyBlogPage.tsx` | 블로그 글 작성 | 'blog' |
| `web-kpa-society/.../CourseEditPage.tsx` | 강의 자료 생성 | URL 탭 초기화 |
| `web-kpa-society/.../ContentWritePage.tsx` | 콘텐츠 작성 | null |
| `web-kpa-society/.../StoreQRPage.tsx` | QR 안내문 생성 | 'store_qr' |
| `web-kpa-society/.../StoreProductDescriptionsPage.tsx` | 제품 상세 설명 | 'customer_rewrite' |
| `web-kpa-society/.../StorePopPage.tsx` | POP 인쇄물 생성 | 'pop' |
| `web-kpa-society/.../StoreProductionMaterialsPage.tsx` | 제작 자료 통합 | template-driven |
| `web-kpa-society/.../StoreLibraryContentsPage.tsx` | 매장 라이브러리 | null |
| `web-kpa-society/.../ResourceWritePage.tsx` | 자료실 작성 | null |
| `web-kpa-society/.../ResourceWriteModal.tsx` | 자료실 모달 작성 | null |
| `web-glycopharm/.../PharmacyBlogPage.tsx` | 글라이코팜 블로그 | 'blog' |
| `packages/content-editor/.../Toolbar.tsx` | 에디터 내 AI 도우미 | null |

---

## 3. 현재 구조 매트릭스

### 3-1. outputType → API 시스템 프롬프트 매핑

| outputType | 시스템 프롬프트 파일 | 결과 구조 |
|------------|-------------------|----------|
| `product_detail` | `ai-prompts/productDetail.ts` | html, title(30자), summary(3줄), bullets |
| `summary` | `ai-prompts/summary.ts` | html, bullets, shortText(40자) |
| `pop` | `ai-prompts/pop.ts` | title(15자), shortText(30자), longText, bullets |
| `blog` | `ai-prompts/blog.ts` | html, title(40자), summary(3줄), bullets |
| `store_qr` | `ai-prompts/storeQr.ts` | title(20자), shortText(50자), longText |
| `title_suggest` | `ai-prompts/titleSuggest.ts` | bullets(제목 3-5개), html(<ol>) |
| `flexible` | `ai-prompts/flexible.ts` | 사용자 요청 기반 자유 형식 |

### 3-2. effectiveOutputType 결정 로직 (핵심)

```typescript
// AiContentModal.tsx L436
const effectiveOutputType = initialMode ? currentConfig.outputType : 'flexible';
```

**의미:**
- `initialMode` 있음 (템플릿 진입) → outputType 고정 (POP=pop, QR=store_qr 등)
- `initialMode` 없음 (일반 진입) → 항상 `flexible` (사용자 의도 우선)
- **결론:** 일반 진입에서는 MODE_CONFIG 탭('고객용 정리', '짧게 요약')이 UI 레이블만 바꾸고, 실제 API outputType은 flexible로 고정됨

### 3-3. customPrompt 최우선 반영 확인

```typescript
// AiContentModal.tsx L427-430
const effectiveCustomPrompt = [
  templateSystemPrompt?.trim() ?? '',
  customPrompt.trim(),
].filter(Boolean).join('\n\n').slice(0, 500);
```

- customPrompt는 templateSystemPrompt에 **append** (뒤에 붙음)
- 순서: templateSystemPrompt → customPrompt → AI 실행
- **평가:** 사용자 프롬프트가 최우선이 되려면 순서가 templateSystemPrompt 앞에 와야 하나, 현재는 뒤에 위치. LLM이 "뒤에 나온 지시가 우선" 패턴이면 실질적으로 최우선. 하지만 명시적 "사용자 요청 = 1순위" 선언이 시스템 프롬프트에 있어야 안전.

---

## 4. 템플릿(Extension) 구조

### 4-1. productionTemplates.ts — 10개 seed 템플릿

| ID | 카테고리 | tone | length | systemPromptOverride |
|----|---------|------|--------|----------------------|
| `pop-modern` | POP | concise | short | ✅ |
| `pop-soft` | POP | friendly | medium | ✅ |
| `pop-pharmacy-pro` | POP | professional | medium | ✅ |
| `blog-health-professional` | 블로그 | professional | long | ✅ |
| `blog-consumer-friendly` | 블로그 | friendly | medium | ✅ |
| `blog-pharmacist-column` | 블로그 | professional | long | ✅ |
| `qr-product-intro` | QR | professional | short | ✅ |
| `qr-event-cta` | QR | friendly | short | ✅ |
| `qr-health-info` | QR | professional | medium | ✅ |
| `desc-b2c-persuasion` | 제품설명 | friendly | medium | ✅ |
| `desc-professional-spec` | 제품설명 | professional | long | ✅ |

### 4-2. 입력 소스 처리

| 소스 | 처리 방식 | 타임아웃 |
|------|----------|---------|
| 직접 입력 (text) | TipTap 에디터 내용 직접 전달 | — |
| URL | fetch → HTML strip → 블록 변환 | 90초 |
| YouTube | YouTube oEmbed + transcript 별도 fetcher | 90초 |

---

## 5. Core / Extension / Remove 분류

### 5-A. Core 유지 항목 (변경 금지)

| 항목 | 위치 | 비고 |
|------|------|------|
| 입력 소스 탭 (text/url/youtube) | AiContentModal | 기반 구조 |
| customPrompt 자유 입력 500자 | AiContentModal | 사용자 의도 채널 |
| tone / length 선택 | AiContentModal | 보조 제어값 |
| AI 실행 (/api/ai/content) | ai-proxy.routes.ts | 단일 실행 엔드포인트 |
| flexible.ts 시스템 프롬프트 | ai-prompts/flexible.ts | "사용자 요청 1순위" 명시 |
| effectiveOutputType = flexible (initialMode 없을 때) | AiContentModal L436 | 핵심 설계 결정 |

### 5-B. Extension 유지 항목 (템플릿 구조)

| 항목 | 위치 | 비고 |
|------|------|------|
| POP 템플릿 3개 | productionTemplates.ts | 인쇄물 특수 구조 |
| 블로그 템플릿 3개 | productionTemplates.ts | 서비스별 톤 분기 |
| QR 템플릿 3개 | productionTemplates.ts | maxBodyLength 제약 |
| 제품설명 템플릿 2개 | productionTemplates.ts | B2C/전문형 분기 |
| initialMode prop | AiContentModal | 템플릿 진입 고정 허용 |
| templateSystemPrompt prop | AiContentModal | 템플릿별 프롬프트 주입 |

### 5-C. 검토/개선 후보

| # | 항목 | 위치 | 현상 | 권장 처리 |
|---|------|------|------|----------|
| C1 | MODE_CONFIG 탭 UI | AiContentModal L198-205 | '고객용 정리', '짧게 요약' 레이블이 사용자를 결과 사전 규정으로 오해하게 유도. 실제로는 flexible outputType 사용 | 탭 제거 또는 레이블 변경 → "자유 입력", "사용자 프롬프트" |
| C2 | initialMode 기본값 'customer_rewrite' | AiContentModal L329 | 진입 시 UI 탭이 '고객용 정리'로 시작. outputType은 flexible이지만 사용자 혼란 | 기본 선택 탭 제거 또는 중립 레이블 |
| C3 | customPrompt append 순서 | AiContentModal L427-430 | customPrompt가 templateSystemPrompt 뒤에 붙음. LLM 우선순위 불명확 | flexible.ts에 "사용자 추가 요청 블록이 1순위" 명시 강화 (이미 일부 적용됨, 확인 필요) |
| C4 | summary, product_detail 단독 진입 | StoreProductDescriptionsPage.tsx | initialMode='customer_rewrite' → effectiveOutputType='product_detail' → 결과 형식 고정 | 이 페이지의 initialMode 제거 또는 customPrompt 안내 문구 추가 |

---

## 6. 즉시 수정 필요 항목

> **HIGH 없음.** 사용자 의도가 완전히 무시되는 구조적 결함은 없음.

---

## 7. 위험도 높은 호출부 목록

| 파일 | 위험 요소 | 위험도 |
|------|----------|:------:|
| `StoreProductDescriptionsPage.tsx` | initialMode='customer_rewrite' → effectiveOutputType 고정 → customPrompt 없으면 결과 완전 고정 | MED |
| `AiContentModal.tsx` L329 | mode 기본값 'customer_rewrite' → UI 탭 첫 선택이 결과 규정 암시 | LOW |
| `AiContentModal.tsx` L427-430 | customPrompt append 순서 → templateSystemPrompt가 더 강할 수 있음 | LOW |

---

## 8. 후속 WO 제안

### 제안 WO: WO-O4O-AI-MODAL-UX-NEUTRAL-ENTRY-V1 (선택적, 경량)

```
목표:
- MODE_CONFIG 탭 레이블을 결과 규정 암시에서 중립 표현으로 변경
  예: '고객용 정리' → (제거 또는 '도구 선택'), '짧게 요약' → (제거)
- initialMode 없는 일반 진입에서 탭 선택 UI 전체를 제거하거나 숨김
  (어차피 flexible outputType이므로 탭 표시가 혼란만 줌)
- StoreProductDescriptionsPage.tsx: initialMode='customer_rewrite' 제거 검토

수정 파일: 1~2개
예상 소요: 30분 이내
우선순위: LOW (기능 문제 없음, UX 명확화 목적)
```

---

## 9. API 엔드포인트 현황

| 경로 | 역할 | 모델 |
|------|------|------|
| `POST /api/ai/content` | outputType 기반 콘텐츠 재구성 | gemini-2.5-flash |
| `POST /api/ai/url-to-blocks` | URL/YouTube → TipTap 블록 변환 | gemini-2.5-flash |
| `POST /api/ai/generate` | 범용 프록시 (systemPrompt/userPrompt 직접 전달) | 설정 가능 |
| `POST /api/ai/vision/analyze` | 이미지 분석 | gemini-2.5-flash |

---

## 10. 종합 결론

| 구분 | 결과 |
|------|------|
| 단일 진입점 | ✅ AiContentModal (통합 컴포넌트) |
| 사용자 의도 채널 | ✅ customPrompt 500자 자유 입력 |
| flexible outputType | ✅ initialMode 없는 진입에서 항상 flexible |
| 템플릿 구조 (Extension) | ✅ productionTemplates 레지스트리 10개 |
| 즉시 수정 HIGH | **0건** |
| 개선 후보 (C 항목) | 4건 (MED 1, LOW 3) |
| web-glycopharm 확장 | AiContentModal import 확인됨 (PharmacyBlogPage) |
| web-neture / web-k-cosmetics | AiContentModal 미사용 (향후 확장 시 동일 컴포넌트 사용) |

**AI 편집 흐름의 기반 구조는 정상이다.**
UX 레이블 혼란(C1~C2) 해소 WO는 긴급하지 않으며, 선택적으로 진행 가능.
