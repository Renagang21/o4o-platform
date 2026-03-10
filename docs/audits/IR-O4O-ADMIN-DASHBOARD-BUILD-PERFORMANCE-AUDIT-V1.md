# IR-O4O-ADMIN-DASHBOARD-BUILD-PERFORMANCE-AUDIT-V1

**Admin Dashboard 빌드 성능 및 코드 복잡성 조사**

| 항목 | 값 |
|------|------|
| 작성일 | 2026-03-10 |
| 대상 | `apps/admin-dashboard` (admin.neture.co.kr) |
| 빌드 시간 | **1분 10초** (Vite, 로컬 Windows) |
| 판정 | **PARTIAL — 구조적 비대화 진행 중** |

---

## Executive Summary

admin-dashboard는 **단일 앱에 1,348개 소스 파일**을 포함한 초대형 프론트엔드 앱이다.
빌드 시간 자체는 70초로 치명적이지 않으나, 코드 구조가 **모놀리식 비대화** 상태이며
향후 개발 속도 저하와 빌드 시간 증가가 불가피하다.

### 핵심 수치

| 지표 | 값 | 위험도 |
|------|------|--------|
| 소스 파일 수 | **1,348개** | HIGH |
| 페이지 파일 수 | **598개** (pages/) | HIGH |
| 컴포넌트 파일 수 | **438개** (components/) | HIGH |
| App.tsx 라인 수 | **2,095줄** | CRITICAL |
| `any` 타입 사용 | **1,453회** | HIGH |
| inline style 사용 | **615회** (184 파일) | MEDIUM |
| 1,000줄 이상 파일 | **13개** | HIGH |
| 메인 번들 크기 | **1,414 KB** (gzip 405 KB) | CRITICAL |
| vendor-react 번들 | **1,534 KB** (gzip 370 KB) | HIGH |
| 빌드 출력 청크 수 | **~380개** | MEDIUM |
| Router 컴포넌트 수 | **23개** | HIGH |

---

## 1. 빌드 시간 분석

### 1.1 측정 결과

```
Vite build: 1분 10초 (로컬 Windows, esbuild minify)
출력: ~380 chunks, 총 ~5.8 MB (gzip ~1.8 MB)
```

### 1.2 빌드 시간 구성 요소 (추정)

| 단계 | 비중 | 근거 |
|------|------|------|
| TypeScript 타입 체크 | 0% | Vite는 tsc 타입 체크 안 함 (esbuild transpile only) |
| 모듈 해석 + 변환 | ~30% | 1,348 파일 + 12 workspace 패키지 |
| 번들링 + 트리쉐이킹 | ~40% | 380 chunks 생성, barrel import 최적화 |
| 코드 압축 (esbuild) | ~30% | 5.8 MB 출력 |

### 1.3 CI/CD 빌드 시간 (GitHub Actions)

CI에서는 의존성 빌드(`build:packages`) + admin-dashboard 빌드가 순차 실행되므로
전체 `pnpm build` 기준 **3-5분** 소요 (admin-dashboard만이 아닌 전체).

---

## 2. 코드 규모 분석

### 2.1 파일 분포

```
pages/          598 파일 (44%)  ← 가장 큰 영역
components/     438 파일 (33%)
hooks/           53 파일
blocks/          48 파일
features/        43 파일
styles/          32 파일
utils/           33 파일
api/             26 파일
services/        19 파일
lib/             16 파일
types/           14 파일
기타              28 파일
─────────────────────────────
합계          1,348 파일
```

### 2.2 거대 서브시스템 (패키지 분리 후보)

| 서브시스템 | 파일 수 | 설명 |
|-----------|---------|------|
| CMS Designer | **122 파일** | pages/cms/ (blocks, fields, views, slots) |
| Editor Components | **130 파일** | components/editor/ |
| Digital Signage | **42 파일** | pages/digital-signage/ (v2 template builder) |
| Cosmetics Partner | **12 파일** | pages/cosmetics-partner/ |
| LMS Yaksa | **9 파일** | pages/lms-yaksa/ |

이 3대 서브시스템만 분리하면 **294 파일 (-22%)** 감소.

### 2.3 1,000줄 이상 대형 파일 (Top 13)

| 파일 | 라인 수 | 역할 |
|------|---------|------|
| `App.tsx` | **2,095** | 라우팅 (172 lazy + 200 Route) |
| `types/dashboard-api.ts` | **1,715** | 타입 정의 |
| `pages/digital-signage/v2/ContentBlockLibrary.tsx` | **1,237** | 사이니지 블록 라이브러리 |
| `pages/vendors/VendorsCommissionAdmin.tsx` | **1,161** | 벤더 커미션 관리 |
| `pages/lms-yaksa/credits/index.tsx` | **1,141** | LMS 학점 관리 |
| `components/editor/blocks/ShortcodeBlock.tsx` | **1,129** | 에디터 블록 |
| `pages/vendors/VendorsAdmin.tsx` | **1,077** | 벤더 관리 |
| `pages/cosmetics-partner/CosmeticsPartnerRoutines.tsx` | **1,070** | 화장품 루틴 |
| `components/editor/blocks/shared/FileSelector.tsx` | **1,050** | 파일 선택기 |
| `pages/digital-signage/v2/TemplateBuilder.tsx` | **1,038** | 사이니지 템플릿 |
| `lib/api/signageV2.ts` | **977** | API 클라이언트 |
| `services/ai/SimpleAIGenerator.ts` | **960** | AI 생성기 |
| `pages/lms-yaksa/assignments/index.tsx` | **954** | LMS 과제 |

---

## 3. App.tsx 분석 (CRITICAL)

### 3.1 현황

```
2,095줄
172개 React.lazy() 선언
200개 <Route> 선언
23개 Router 서브컴포넌트 import
```

이 파일 하나가 **앱 전체 라우팅 구조를 정의**하며, 수정 시 전체 빌드에 영향.

### 3.2 Router 목록 (23개)

```
AnnualFeeRouter, CosmeticsPartnerRouter, CosmeticsProductsRouter,
CosmeticsProductsAdminRouter, CosmeticsSampleRouter, CosmeticsSupplierRouter,
CPTACFRouter, DigitalSignageRouter, DropshippingOffersRouter,
GlucoseViewRouter, GlycopharmRouter, LmsInstructorRouter,
LmsYaksaRouter, MarketingPublisherRouter, MembershipRouter,
NetureRouter, PagesRouter, PartnerOpsRouter, ReportingRouter,
SellerOpsRouter, StorefrontRouter, SupplierOpsRouter, YaksaForumRouter
```

---

## 4. 코드 품질 분석

### 4.1 TypeScript 설정

```json
{
  "strict": false,
  "noImplicitAny": false,
  "strictNullChecks": false
}
```

**strict: false** → 타입 안전성 최하위 설정. 1,453개의 `any` 사용이 이에 기인.

### 4.2 `any` 타입 사용 분포

| 위치 | `any` 수 (추정) |
|------|----------------|
| pages/ | ~600 |
| components/ | ~400 |
| api/ + types/ | ~200 |
| 기타 | ~253 |
| **합계** | **1,453** |

### 4.3 스타일링 패턴

| 패턴 | 사용량 | 설명 |
|------|--------|------|
| inline style (`style={{...}}`) | **615회** (184 파일) | CSS 추출 불가, 빌드 최적화 저해 |
| CSS Modules | **2회** | 거의 미사용 |
| Tailwind CSS | 0회 | 미사용 |
| styled-components | 0회 | 미사용 |

### 4.4 Legacy 패턴

| 패턴 | 수 | 위험도 |
|------|-----|--------|
| Class Component | 2개 | LOW (ErrorBoundary, DynamicRenderer) |
| CommonJS `require()` | 3개 | LOW |
| barrel index 파일 | 105개 | MEDIUM (tree-shaking 저해) |

---

## 5. 번들 크기 분석

### 5.1 최대 청크

| 청크 | 크기 | gzip | 설명 |
|------|------|------|------|
| `index-6801g0AD.js` | **1,414 KB** | **405 KB** | 메인 앱 번들 |
| `vendor-react-BWHp4W1b.js` | **1,534 KB** | **370 KB** | React + 의존성 |
| `ViewDesigner-CwHwX2Bm.js` | 117 KB | 29 KB | CMS View 디자이너 |
| `vendor-forms-DW57Vq6r.js` | 79 KB | 22 KB | 폼 라이브러리 |
| `vendor-utils-F3sCKSoz.js` | 64 KB | 22 KB | 유틸리티 |
| `index-CxZCkZQs.js` | 61 KB | 15 KB | @o4o/content-editor |
| `Menus-DAG4a9wD.js` | 55 KB | 15 KB | 메뉴 빌더 |
| `sortable.esm-CMr0Z4nr.js` | 49 KB | 16 KB | 정렬 라이브러리 |

### 5.2 메인 번들 (1,414 KB) 원인 분석

메인 번들이 비정상적으로 큰 이유:
1. **App.tsx 2,095줄** — 모든 라우트 정의가 메인 번들에 포함
2. **공통 컴포넌트** — Layout, Sidebar, Navigation이 메인 번들
3. **@o4o/ workspace 패키지** — 공유 모듈이 메인에 인라인
4. **`chunkSizeWarningLimit: 2000`** — 의도적으로 경고 숨김

### 5.3 주요 의존성 크기 영향

| 의존성 | 영향 |
|--------|------|
| React 19 + ReactDOM | ~1,500 KB (vendor-react) |
| @mui/material 7.3.1 | 트리쉐이킹 가능하나 대량 사용 시 커짐 |
| Monaco Editor | 코드 에디터 (lazy load됨) |
| Slate | 리치 텍스트 에디터 |
| recharts | 차트 (3 파일에서만 사용) |
| socket.io-client | 41 KB (vendor-socket) |

---

## 6. 긍정적 발견사항

| 항목 | 상태 | 설명 |
|------|------|------|
| React.lazy 사용 | **우수** | 172개 페이지 lazy loading (App.tsx) |
| esbuild minify | **우수** | terser 대비 10x 빠른 압축 |
| 무거운 라이브러리 회피 | **우수** | moment.js, lodash, d3 미사용 |
| 코드 스플리팅 | **양호** | ~380 청크로 자동 분리 |
| Radix UI | **양호** | 트리쉐이킹 가능한 컴포넌트 |

---

## 7. 비대화 원인 진단

### 7.1 근본 원인

```
admin-dashboard = 모든 서비스의 운영 도구 통합
                = CMS + Signage + LMS + Commerce + Partner + Store + 포럼 + ...
                = 본질적으로 23개 앱이 하나로 합쳐진 상태
```

### 7.2 비대화 타임라인 (추정)

```
초기: CMS + 기본 관리 (~200 파일)
  ↓ + Digital Signage v2 (+42 파일)
  ↓ + Editor 시스템 (+130 파일)
  ↓ + Cosmetics Partner (+12 파일)
  ↓ + LMS Yaksa (+9 파일)
  ↓ + Commerce (Neture, Store, Orders) (+80 파일)
  ↓ + GlycoPharm, GlucoseView, K-Cosmetics 서비스별 페이지
  ↓ + 포럼, 회원관리, 정산, AI 도구
현재: 1,348 파일, 23 Router, 200 Route
```

### 7.3 빌드 성능 예측

| 파일 수 | 예상 빌드 시간 | 시기 |
|---------|-------------|------|
| 1,348 (현재) | **70초** | 현재 |
| 1,800 | ~100초 | 6개월 후 |
| 2,500 | ~150초 | 1년 후 |

파일 수와 빌드 시간은 **준선형** 관계. 패키지 분리 없이 계속 성장하면 CI/CD 전체 빌드 10분 이상 소요 예상.

---

## 8. 구조 판정

### 항목별 평가

| # | 항목 | 판정 | 근거 |
|---|------|------|------|
| 1 | 빌드 시간 (70초) | **SAFE** | 현재는 수용 가능 범위 |
| 2 | 소스 파일 규모 (1,348) | **PARTIAL** | 단일 앱 최대 권장치 (~500) 초과 |
| 3 | App.tsx (2,095줄) | **UNSAFE** | 수정 시 전체 영향, 유지보수 불가 |
| 4 | 메인 번들 (1,414 KB) | **PARTIAL** | 초기 로드 시간 영향 |
| 5 | TypeScript strict:false | **PARTIAL** | 1,453 `any`로 인한 런타임 에러 위험 |
| 6 | 코드 스플리팅 | **SAFE** | lazy loading 잘 적용됨 |
| 7 | 서브시스템 분리 | **UNSAFE** | CMS/Signage/Editor가 분리되지 않음 |

### 종합 판정: **PARTIAL — 구조적 비대화 진행 중**

현재 빌드 시간(70초)은 수용 가능하나, 코드 구조의 비대화가 진행 중이며
App.tsx 2,095줄과 1,348 파일 단일 앱 구조는 **지속 가능하지 않다**.

---

## 9. 정비 방향 제안 (WO 후보)

### Phase 1 — 즉시 효과 (빌드 시간 영향 없음, 유지보수성 개선)

| # | WO | 목적 |
|---|-----|------|
| 1 | WO-O4O-ADMIN-APP-ROUTING-SPLIT-V1 | App.tsx 2,095줄 → route-manifest 파일 분리 |
| 2 | WO-O4O-ADMIN-LARGE-FILE-SPLIT-V1 | 1,000줄 이상 13개 파일 분할 |

### Phase 2 — 서브시스템 분리 (빌드 시간 -20~30%)

| # | WO | 분리 대상 | 파일 수 |
|---|-----|----------|---------|
| 3 | WO-O4O-CMS-DESIGNER-EXTRACT-V1 | CMS Designer → @o4o/cms-designer | 122 |
| 4 | WO-O4O-EDITOR-EXTRACT-V1 | Editor → @o4o/content-editor-ui | 130 |
| 5 | WO-O4O-SIGNAGE-EXTRACT-V1 | Digital Signage → @o4o/signage-admin | 42 |

### Phase 3 — 코드 품질 (장기)

| # | WO | 목적 |
|---|-----|------|
| 6 | WO-O4O-ADMIN-STRICT-TS-V1 | tsconfig strict: true 단계적 적용 |
| 7 | WO-O4O-ADMIN-STYLE-SYSTEM-V1 | inline style → CSS Modules/Tailwind 전환 |

---

*조사 완료: 2026-03-10*
*빌드 측정 환경: Windows, Node 22, pnpm, Vite 6, esbuild minify*
*수정 사항: 없음 (조사만 수행)*
