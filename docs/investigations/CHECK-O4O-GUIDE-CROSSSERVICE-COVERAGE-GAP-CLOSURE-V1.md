# CHECK — O4O Guide 교차 서비스 coverage gap 해소 (A형 0)

- **WO**: WO-O4O-GUIDE-CROSSSERVICE-COVERAGE-GAP-CLOSURE-V1
- **작성일**: 2026-08-21
- **기준 커밋 시작점**: `602252395` (== origin/main)
- **상태**: PASS — A형 잔존 0
- **선행 트랙**: [CHECK-O4O-GUIDE-ENTRY-AND-LANDING-COMMONIZATION-V1](CHECK-O4O-GUIDE-ENTRY-AND-LANDING-COMMONIZATION-V1.md) · [CHECK-O4O-GUIDE-CROSS-SERVICE-CENSUS-V1](CHECK-O4O-GUIDE-CROSS-SERVICE-CENSUS-V1.md) · [CHECK-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1](../checks/CHECK-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1.md)

---

## 0. 카운터 (WO §15 · §22 · §25 필수 블록)

```text
조사 Guide coverage cell: 85
A형 시작: 5
A형 해소: 5
A형 잔존: 0
B형 잔존: 5
C형 잔존: 5
미조사: 0
```

- 85 = 17 기능 단위 × 5 서비스 (KPA-Society / K-Cosmetics / GlycoPharm / Neture / PharmacyHub)
- FC(Guide 있음) 70 / A 5 / B 5 / C 5

---

## 1. 판정 기준 (WO §3)

| 코드 | 정의 | 처리 |
|:--:|---|---|
| **A** | 기능이 실제로 존재하고 사용자 대면인데 Guide 가 없다 | 이번 WO 에서 해소 (완료 조건) |
| **B** | 기능 자체가 없다 | 만들지 않는다 |
| **C** | 기능은 있으나 Guide 가 불필요하거나 상위 Guide 에 흡수됨 | 억지로 만들지 않는다 |
| **FC** | 이미 Guide 로 덮여 있다 | 변경 없음 |

**재조사 원칙**: 이전 census 의 "13건" 목록을 구현 목록으로 재사용하지 않고, 현재 `origin/main` 코드(App.tsx route 표 · `storeMenuConfig.ts` · guide copy)에서 직접 재도출했다.

---

## 2. Coverage census (17 단위 × 5 서비스 = 85 cell)

> 판정 근거는 각 서비스 `src/**/*.tsx` 의 실제 `<Route>` 정의와
> `packages/shared-space-ui/src/guide/copy/{service}.ts` 의 Guide route/copy 를 정적 대조해 산출했다.

| # | 기능 단위 | KPA | K-Cos | GlycoPharm | Neture | PharmacyHub |
|:--:|---|:--:|:--:|:--:|:--:|:--:|
| 1 | 포럼 · 커뮤니티 | FC | FC | FC | FC | FC |
| 2 | 강의(LMS) | FC | FC | **A → 해소** | B | FC |
| 3 | 콘텐츠 | FC | FC | FC | FC | FC |
| 4 | 자료실(커뮤니티 자료) | FC | FC | FC | FC | FC |
| 5 | 매장 운영(허브·홈) | FC | **A → 해소** | **A → 해소** | FC | FC |
| 6 | 매장 상품 · 거래 | FC | FC | FC | FC | FC |
| 7 | QR | FC | **A → 해소** | **A → 해소** | FC | FC |
| 8 | 태블릿 | FC | FC | **C** | FC | FC |
| 9 | 디지털 사이니지 | FC | FC | FC | FC | FC |
| 10 | POP 제작 | FC | FC | FC | FC | FC |
| 11 | 매장 블로그 | FC | FC | FC | FC | FC |
| 12 | 제작 자료(매장 실행 자산) | FC | FC | FC | FC | FC |
| 13 | 상품 설명서 | FC | FC | FC | FC | FC |
| 14 | 설문 | FC | **B** | **B** | **B** | **B** |
| 15 | 서비스 소개 landing(`/service-guide`) | FC | FC | FC | **C** | FC |
| 16 | O4O 개요 · 구조(`/guide/intro/*`) | FC | FC | FC | FC | FC |
| 17 | 역할별 가이드 | FC | **C** | **C** | FC | **C** |

### 2-1. A형 5건 상세 (해소 대상)

| # | 서비스 | 기능 | 기능 route | 기능 화면 | 사용자 대면 | Guide route(신규) | Guide copy(신규) | 진입 링크 | 판정 |
|:--:|---|---|---|---|:--:|---|---|---|:--:|
| A1 | GlycoPharm | 강의(LMS) | `/lms`, `/lms/course/:id`, `/lms/course/:courseId/lesson/:lessonId`, `/mypage/enrollments`, `/mypage/certificates` | `EducationPage`(LmsHubTemplate) · `CourseDetailPage`(CourseDetailView) | YES | `/guide/features/lms` | `glycopharmGuideFeatureLmsProps` | `/guide/features` 10번 그룹 | A → 해소 |
| A2 | GlycoPharm | 매장(약국) 운영 | `/store` 이하 약국 상품·거래 / 활성화 / 자료함 / 경영 | `PharmacyDashboard` 외 store 라우트 | YES | `/guide/features/store` | `glycopharmGuideFeatureStoreProps` | `/guide/features` 04번 그룹 | A → 해소 |
| A3 | GlycoPharm | QR | `/store/marketing/qr` (+ `/store/analytics/marketing`, `/store/funnel`, `/store/requests`) | `StoreQrPage`(StoreQrConsoleView) | YES | `/guide/features/qr` | `glycopharmGuideFeatureQrProps` | `/guide/features` 06번 그룹 | A → 해소 |
| A4 | K-Cosmetics | 매장 운영 | `/store` 이하 매장 상품·거래 / 활성화 / 자료함 / 분석·설정 | store 라우트 블록 | YES | `/guide/features/store` | `kCosmeticsGuideFeatureStoreProps` | `/guide/features` 09번 그룹 | A → 해소 |
| A5 | K-Cosmetics | QR · 태블릿 | `/store/marketing/qr`, `/store/commerce/tablet-displays`, `/store/channels` | `StoreQrPage` · `StoreTabletDisplaysPage` | YES | `/guide/features/qr` | `kCosmeticsGuideFeatureQrProps` | `/guide/features` 10번 그룹 | A → 해소 |

### 2-2. B형 5건 (기능 없음 — 구현하지 않는다)

| 서비스 | 기능 | 근거 |
|---|---|---|
| K-Cosmetics | 설문 | 사용자 대면 설문 route 없음. `operator/surveys`, `operator/surveys/new` 운영자 콘솔만 존재 |
| GlycoPharm | 설문 | 동일 — 운영자 콘솔 route 만 존재 |
| Neture | 설문 | 설문 route 자체 없음 |
| PharmacyHub | 설문 | 설문 route 자체 없음 (PH adoption CHECK 에서도 NOT_AVAILABLE) |
| Neture | 강의(LMS) | Neture 에 `/lms` 계열 route 없음 (교육은 매장 서비스 축) |

### 2-3. C형 5건 (기능은 있으나 Guide 강제하지 않음)

| 서비스 | 기능 | 근거 |
|---|---|---|
| GlycoPharm | 태블릿 | `/store/commerce/tablet-displays` route·화면은 존재하나 `GLYCOPHARM_STORE_CONFIG` 에 메뉴 항목이 없고 인바운드 링크가 없다. **진입 동선이 없는 기능을 정상 동선처럼 안내하지 않는다** — GP QR Guide 는 메뉴에 노출된 QR 범위로 한정했다. 메뉴 노출 여부는 별도 IA 판단 사항(별도 WO) |
| Neture | 서비스 소개 landing | Neture 는 `/guide` 자체가 소개형 landing(`GuideHomePage`)이며 `/service-guide` 를 두지 않는 것이 선행 WO 판정(A) |
| K-Cosmetics | 역할별 가이드 | 역할별 Guide 는 기능이 아니라 Guide 내부 탐색 장치. KPA·Neture 만 역할 축이 분화돼 있다 |
| GlycoPharm | 역할별 가이드 | 동일 |
| PharmacyHub | 역할별 가이드 | 동일 |

---

## 3. 구현 내용 (WO §5 · §7 — copy/config only)

### 3-1. 신규 Guide copy (shared 패키지)

| 파일 | 신규 export |
|---|---|
| `packages/shared-space-ui/src/guide/copy/glycopharm.ts` | `glycopharmGuideFeatureLmsProps` · `glycopharmGuideFeatureStoreProps` · `glycopharmGuideFeatureQrProps` |
| `packages/shared-space-ui/src/guide/copy/k-cosmetics.ts` | `kCosmeticsGuideFeatureStoreProps` · `kCosmeticsGuideFeatureQrProps` |

모두 기존 shared View `GuideFeatureManualPage` 를 재사용하며, hero + 5 sections + bottomNav 구조로 기존 Guide 와 동형이다.

### 3-2. 진입 링크 (WO §14 — URL 만 아는 사람이 도달하는 Guide 금지)

| 서비스 | 진입 지점 |
|---|---|
| GlycoPharm | `glycopharmGuideFeaturesProps` — 04 매장 운영 / 06 QR · Tablet 그룹에 Guide 링크 추가, 10 강의 그룹 신설 |
| K-Cosmetics | `kCosmeticsGuideFeaturesProps` — 09 매장 운영 / 10 QR · 태블릿 그룹 신설 |
| PharmacyHub | `pharmacyHubGuideFeaturesProps` — 05 매장 실행 그룹 items 를 기능 route 나열에서 Guide 링크로 교정 (아래 §6 참조) |

### 3-3. route wrapper

| 서비스 | 추가 route |
|---|---|
| `services/web-glycopharm/src/App.tsx` | `guide/features/lms` · `guide/features/store` · `guide/features/qr` (각 1줄, `GuideFeatureManualPage` + props spread) |
| `services/web-k-cosmetics/src/App.tsx` | `guide/features/store` · `guide/features/qr` (각 1줄) |

### 3-4. 내용 기준 (WO §4 · §8)

- GP LMS Guide 는 GP 가 실제로 가진 동선만 기술한다: 강의 목록(`LmsHubTemplate`) → 강의 상세 → 수강 신청(비로그인 시 로그인 창) → 레슨 전용 화면 재생 → `/mypage/enrollments` · `/mypage/certificates`, 수료증은 별도 화면 없이 PDF 다운로드.
- 매장 Guide 는 각 서비스의 canonical 매장 메뉴(`storeMenuConfig.ts`) 축을 그대로 따른다. GP 는 "약국", K-Cos 는 "매장" 명사를 사용한다.
- 고객 요청 콘솔이 서비스별로 다르다: GP `/store/requests`(CustomerRequestsPage) · K-Cos `/store/interest-requests`(InterestRequestsPage) — copy 에 각각 반영.
- 매장 실행 자산(POP·QR·블로그) / 자료함(콘텐츠·파일) / 상품 설명서는 축을 합치지 않고 분리 기술했다 (WO §10).

---

## 4. Route/Copy 계약 검증 (WO §13)

`packages/shared-space-ui/src/guide/__tests__/` 확장:

- 기존 `guideRouteContract.test.ts` (9 tests) — Guide copy 의 모든 내부 route 참조가 실제 `<Route>` 와 매칭. 신규 copy 포함 **unresolved 0**. brace 확장·param route 오인 방지 로직은 기존 구현 유지.
- **신규** `guideCoverageContract.test.ts` (13 tests)
  - 5 서비스 × Guide 내부 dead route 0 (copy 가 참조하는 `/guide/*` 가 실제 mount 된 route)
  - 5 서비스 × orphan Guide route 0 (mount 된 `/guide/*` 가 copy 또는 서비스 Guide 화면에서 참조됨)
  - GP `/guide/features/{lms,store,qr}` 존재 + 기능 index 진입 가능
  - K-Cos `/guide/features/{store,qr}` 존재 + 기능 index 진입 가능
  - PharmacyHub 기존 Guide route 세트 유지(회귀 방지)

**결과**: 3 파일 / **53 tests 전부 PASS** (기존 40 + 신규 13).

---

## 5. 검증 결과 (WO §16 · §17)

| 항목 | 결과 |
|---|---|
| vitest (guide) | 3 files / 53 tests PASS |
| `@o4o/shared-space-ui` typecheck | PASS |
| 5 서비스 typecheck (`tsc --noEmit`) | 전부 PASS |
| 5 서비스 build (`vite build`) | 전부 PASS |
| migration | 0 |
| backend / API / schema 변경 | 0 |

---

## 6. PharmacyHub 회귀 검증 (WO §6)

`/service-guide`, `/guide`, `/guide/intro`, `/guide/usage`, `/guide/features/*` 17개 route 모두 유지 — **route 변경 0**.

단, §13 orphan 검사에서 **실재 결함 1건**이 드러났다.

- 증상: `/guide/features/{pop,signage,tablet,manuals}` 4개 Guide 가 mount 돼 있으나 `/guide/features` 기능 index 의 "매장 실행" 그룹이 기능 route(`/store-owner/pop` 등)만 나열해 **Guide 로 진입할 링크가 없었다** (URL 을 아는 사람만 도달 = §14 위반).
- 조치: `pharmacyHubGuideFeaturesProps` 05 매장 실행 그룹의 items 를 해당 Guide 링크로 교정 (copy 5줄). route·View·기능 변경 없음.
- 판단: WO §6 의 "변경 0 이 정상"에 대한 예외이나, §13(orphan 0) · §14(도달 가능성) 가 요구하는 최소 교정이므로 범위 내로 처리하고 여기 기록한다.

---

## 7. 산출 지표 (WO §19)

| 지표 | 값 |
|---|---|
| 신규 Guide route 수 | 5 (GP 3 · K-Cos 2) |
| 신규 copy/config export 수 | 5 |
| **신규 View 수** | **0** |
| 재사용 shared View 수 | 1 (`GuideFeatureManualPage`) |
| wrapper 코드 증감 | +5줄 (route 1줄/건) · import 5줄 |
| 중복 View 신규 생성 수 | **0** |
| 대형 JSX 복제 | **0** |
| shared View 내 `if (service === ...)` 분기 추가 | **0** |

---

## 8. 제외 범위 확인 (WO §20)

Guide landing 재공통화 / PharmacyHub Guide 재구축 / 스크린샷 / 기능 신규 구현 / B·C형 해소 / 디자인 개편 / backend·API·schema / DB migration / Guide dead-code 전체 cleanup — **전부 수행하지 않음**.

---

## 9. 후속 제안 (이번 WO 범위 외)

1. **GP 태블릿 IA 판단** — `/store/commerce/tablet-displays` 는 화면이 있으나 `GLYCOPHARM_STORE_CONFIG` 에 메뉴가 없다. 메뉴 노출(그러면 A형 전환) 또는 route 정리 중 택일이 필요하다. 별도 WO 대상.
2. **K-Cos/GP 설문 축** — 운영자 콘솔만 존재. 사용자 대면 설문 도입 여부는 제품 정책 결정 사항.
3. Guide 전체 최종 census / closure audit (WO 가 지정한 다음 트랙).

---

## 10. 문서 정합 (CLAUDE.md §16)

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(위 §9-1, §9-2).
