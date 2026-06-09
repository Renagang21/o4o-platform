# IR-O4O-STORE-GUIDE-PRODUCTION-MATERIALS-FLOW-PLACEMENT-V1

> **Type:** Investigation (read-only). 코드/Guide/route 무변경.
> **Date:** 2026-06-09
> **Scope:** KPA Society · GlycoPharm · K-Cosmetics 매장 제작물 흐름(QR/POP/블로그/사이니지/타블렛/제작자료)의 Guide 반영 위치 조사
> **기준 IR:** `docs/investigations/IR-O4O-STORE-GUIDE-REAL-WORKFLOW-AUDIT-V1.md`

---

## 1. 조사 목적

실제 매장 제작 기능을 가진 3개 서비스(KPA / GlycoPharm / K-Cosmetics)에서, 매장 경영자가
QR · POP · 블로그 · 사이니지 · 타블렛 · 제작자료를 실제 업무 흐름으로 어떻게 쓰는지 확인하고,
그 흐름을 **Guide 어디에 어떻게 반영해야 하는지** 위치와 방식을 제안한다. 조사 전용 — 코드/문안
수정 없음. Neture 는 기준 서비스가 아니며, 실제 제작 기능을 가진 위 3개가 기준이다.

## 2. 조사 범위

- `services/web-kpa-society/src`, `services/web-glycopharm/src`, `services/web-k-cosmetics/src`
- 각 서비스의 Guide copy: `packages/shared-space-ui/src/guide/copy/{kpa,glycopharm,k-cosmetics}.ts`
- 제작 화면(QR/POP/블로그/사이니지/타블렛/제작자료) 존재·route·메뉴·API·FE 완성도
- Guide 구조(Home/Features/역할 Guide), Workspace→Guide 백링크, 문안 A~E 분류

## 3. 기준 IR 요약

`IR-O4O-STORE-GUIDE-REAL-WORKFLOW-AUDIT-V1`: Guide 는 기능 목록이 아니라 매장 경영자의 실제
업무 흐름(시작 → 항목 선택 → 원천 선택 → 템플릿 → 문구·디자인 → 결과물 → 고객 노출 → 저장/게시
→ 인쇄·부착·안내 → 제작자료 재사용)이어야 한다. 본 IR 은 그 흐름의 매체별 반영 위치를 결정한다.

**문안 분류 기준:** A 실제 흐름 잘 설명 / B 기능설명은 있으나 제작 흐름 부족 / C 문안이 현재 기능과
불일치 / D Guide 없음·찾기 어려움 / **E 실제 기능 없는데 완료 기능처럼 설명(정직성 위반)**.

---

## 4. KPA 기능 현황 (reference implementation)

| 항목 | 화면 | route | 메뉴 | API | FE |
|------|------|-------|:----:|:---:|:--:|
| QR | `pages/pharmacy/StoreQRPage.tsx` | `/store/marketing/qr` | ✅ | ✅ | 완성 |
| POP | `pages/pharmacy/StorePopPage.tsx` | `/store/marketing/pop` | ✅ | ✅ (AI 보조·QR 연결) | 완성 |
| 블로그 | `StoreBlogPage`(공개)·`/store/content/blog`(작성) | `/store/:slug/blog`, `/store/content/blog` | ✅ | ✅ | **작성 UI 위치 모호(미확정)** |
| 사이니지 | `pages/pharmacy/StoreSignagePage.tsx` | `/store/marketing/signage/{playlist,videos,schedules}` + `/public/signage` | ✅ | ✅ | 완성(편성+스케줄+공개재생) |
| 타블렛 | `tablet/TabletStorePage`(고객)·`StoreTabletDisplaysPage`(설정)·`TabletRequestsPage`(직원) | `/tablet/:slug`, `/store/commerce/tablet-displays`, `/store/requests` | ✅ | ✅ | 완성(실기능) |
| 제작자료 | `pages/pharmacy/StoreProductionMaterialsPage.tsx` | `/store/library/production-materials` | ✅ | ✅ (direct+generated+qr+blog 통합) | 완성(목록·원본추적·CROSS_CREATE) |

- **사이니지**: 편성(플레이리스트 CRUD) + 스케줄 + 공개 재생 모두 실기능.
- **타블렛**: 활용 개념이 아니라 **실기능**(고객 상품탐색 → 관심요청 → 직원 처리).
- **cross-link**: `StoreProductionMaterialsPage` 의 `CROSS_CREATE`(POP/QR/블로그/사이니지 이동) +
  `getStoreAssetDerivations`(원본↔파생 추적) 존재 → **부분 구현**(제작자료 페이지 중심, 개별 페이지 간 백링크는 미흡).

## 5. KPA Guide 현황

- Guide 구조: `/guide/intro` · `/guide/usage` · `/guide/features`(8 카테고리) + **역할 Guide** `/guide/for/store-owner`,`/for/operator`,`/for/member` + feature Guide `/guide/features/{qr,signage,store,...}`.
- 매장 경영자 Guide **존재**: `kpaGuideForStoreOwnerProps`(6 step). step 02 "매장 자산 직접 만들기"가
  POP/QR/사이니지/제작자료 경로를 묶음.

| 매체 | Guide 위치 | 분류 |
|------|-----------|:----:|
| QR | `/guide/features/qr` (QR·Tablet 통합, 6단계) | **A** |
| 사이니지 | `/guide/features/signage` (6단계) | **A** |
| 타블렛 | `/guide/features/qr` (QR 진입→Tablet→직원처리) | **A** |
| POP | `/guide/for/store-owner` step 02 (1줄) | **B** |
| 블로그 | `/guide/for/store-owner` step 03 (작성 경로 모호) | **B** |
| 제작자료 | `/guide/for/store-owner` step 02 (경로만) | **B** |
| 블로그→QR→POP→사이니지 통합 흐름 | 없음 | **D** |

- **Workspace → Guide 백링크: 부재**(GuideBackLink 컴포넌트 미발견).

## 6. GlycoPharm 기능 현황

| 항목 | 화면 | route | API | FE |
|------|------|-------|:---:|:--:|
| QR | `pages/store/StoreQrPage.tsx` (625L) | `/store/marketing/qr` | ✅ (`/glycopharm/pharmacy/qr` CRUD+image) | **완성(미완 아님, 확정)** |
| POP | `pages/store-management/StorePopPage.tsx` (588L) | `/store/marketing/pop` | ✅ (supplier-items·AI·generate) | 완성(3-step, A4/A5·템플릿4) |
| 블로그 | `StoreBlogPage`(공개)·`PharmacyBlogPage`(`/store/content/blog`) | `/store/:slug/blog`, `/store/content/blog` | ✅ | 완성 |
| 사이니지 | `store-management/signage/StoreSignageMainPage.tsx` | `/store/marketing/signage/{playlist,videos,schedules,play,player}` | ✅ (Playlist CRUD·snapshot) | 완성(편성/재생 분리) |
| 타블렛 | `store-management/StoreTabletDisplaysPage.tsx` | `/store/commerce/tablet-displays` | ✅ (displays·idle playlist) | 완성 |
| 제작자료 | `store-management/StoreProductionMaterialsPage.tsx` | `/store/library/production-materials` | ✅ (`getStoreExecutionAssets`·DerivationViewer) | 완성 |

- **QR FE 미완 여부 최종 판정: 완성됨(미완 아님).** CRUD+이미지 다운로드+상태관리+route+메뉴 모두 구현,
  TODO/WIP 주석 없음. → Guide 에서 완료 기능으로 기술 **안전**.
- cross-link: QR/POP/사이니지 각 연결은 있으나 **단계형 통합 흐름은 미설명**.

## 7. GlycoPharm Guide 현황

- Guide 구조: `/guide/intro` · `/guide/usage`(7 step) · `/guide/features`(6 카테고리) + `/guide/features/signage`.
  **역할 Guide(store-owner) 없음** — KPA 와 달리 usage 기반.

| 매체 | Guide 위치 | 분류 |
|------|-----------|:----:|
| QR | `/guide/usage` step 03 + `/guide/features` step 06(QR·Tablet) | **A** |
| 사이니지 | `/guide/features/signage` + usage step 07 | **A** |
| 타블렛 | usage step 04(고객 요청) + features step 06 | **A** |
| POP | 없음(완성 기능인데 Guide 전무) | **D** |
| 블로그 | 없음(콘텐츠에만 섞임) | **D** |
| 제작자료 | 없음 | **D** |
| 단계형 제작 흐름 | 없음 | **D** |

- Workspace → Guide 백링크: **부재**.
- 정직성 위반(E): **없음**(미구현을 완료로 기술하는 사례 없음).

## 8. K-Cosmetics 기능 현황

| 항목 | 화면 | route | API | FE |
|------|------|-------|:---:|:--:|
| QR | `pages/store/StoreQrPage.tsx` | `/store/marketing/qr` | ✅ (`/cosmetics/pharmacy/qr` CRUD+image) | 완성 |
| POP | `pages/store/StorePopPage.tsx` | `/store/marketing/pop` | ✅ (supplier-items) | 완성(A4/A5·템플릿) |
| 블로그 | `StoreBlogManagePage`(작성)·`StoreBlogPage`(공개) | `/store/content/blog`, `/store/:slug/blog` | ✅ (blogStaff CRUD+publish) | 완성 |
| 사이니지 | `pages/store/StoreSignagePage.tsx` | `/store/marketing/signage/playlist` + player/playback | ✅ (storePlaylist) | 완성(편성+재생) |
| 타블렛 | `StoreTabletDisplaysPage`(설정)·`TabletStorePage`(고객) | `/store/commerce/tablet-displays`, `/tablet/:slug` | ✅ (displays·idle·interest) | 완성 |
| 제작자료 | `pages/store/StoreProductionMaterialsPage.tsx` | `/store/library/production-materials` | ✅ (`/cosmetics/store/assets`·derivations) | 완성 |
| **Commerce(cart/checkout/order)** | StoreOrdersPage(view-only) | — | ❌ cart/checkout API·페이지 없음 | **미완(고객 구매 흐름 없음)** |

- cross-link: Hub 라이브러리(HubBlog/Pop/Qr Library) 경유 자료 복사 + location.state prefill로 **부분 구현**.
- **Commerce 미완 확정**: 장바구니/결제/고객 주문 생성 없음, 매장은 주문 **조회만**.

## 9. K-Cosmetics Guide 현황

- Guide 구조: `/guide/intro` · `/guide/usage`(6 step) · `/guide/features`(Forum/LMS/Content/Resources/Signage) + `/guide/features/signage`.
  **역할 Guide(store-owner) 없음**.

| 매체 | Guide 위치 | 분류 |
|------|-----------|:----:|
| 사이니지 | `/guide/features/signage` (단계 상세) | **A** |
| 콘텐츠 | `/guide/features/content` | **A** |
| QR | usage step 03 (간단) | **B** |
| POP | usage step 03.1 (간단) | **B** |
| 블로그 | 없음 | **D** |
| 제작자료 | 없음 | **D** |
| 타블렛 | 없음(기능은 있음) | **D** |
| **Commerce** | usage step 01 "판매 준비 완료"로 기술 | **🚨 E** |

- Workspace → Guide 백링크: **부재**.
- **정직성 위반(E): Commerce** — cart/checkout 미구현인데 "상품 확보…판매 준비가 완료됩니다"로 기술.
  매장 경영자 오인 위험 → **최우선 정정 대상**.

---

## 10. QR 제작 흐름 반영 위치

- KPA: `/guide/features/qr`(A) — **기준 템플릿**. GlycoPharm: usage/features(A) 양호.
- K-Cosmetics: usage step 03(B) — 유형(Link/Product/Promotion/Page) 미명시. **상세화 필요**.
- **반영안**: 3사 공통 "QR 생성 → 대상 선택 → 출력·부착 → 스캔 분석" 흐름. KCos 만 문안 상세화(코드 아님, copy).

## 11. POP 제작 흐름 반영 위치

- **3사 모두 POP 기능 완성**이나 Guide 공백: KPA(B, 1줄) · GlycoPharm(D, 전무) · KCos(B, 간단).
- **반영안**: 신규 feature Guide `/guide/features/pop`(자료 선택 → AI 문구 → 템플릿/레이아웃 → QR 연결 → PDF 출력)을
  3사에 동일 구조로 추가. **GlycoPharm 이 가장 시급**(완성 기능인데 Guide 0).

## 12. 블로그 제작 흐름 반영 위치

- 공백: KPA(B, 작성 경로 모호) · GlycoPharm(D) · KCos(D, 작성 UI는 가장 명확 `StoreBlogManagePage`).
- **반영안**: `/guide/features/blog`(작성 → 발행/보관 → 공개 URL → QR/사이니지 연결)을 KCos 작성 UI 기준으로 표준화.
  KPA 는 매장 블로그 **작성 화면 위치 확정(코드 확인)** 선행 필요.

## 13. 사이니지 활용 흐름 반영 위치

- **3사 모두 A** (편성+재생 실기능, Guide 상세). 추가 작업 우선순위 낮음.
- **반영안**: 현행 유지. "매장 TV 공개 재생(URL/fullscreen)" 1단계만 보강 검토(copy).

## 14. 타블렛/태블릿 활용 흐름 반영 위치

- **중요 구분**: Neture 는 타블렛이 "활용 개념 안내"였으나, **KPA/GlycoPharm/KCos 는 실기능**(고객 화면 + 진열 설정 + 관심/상담 요청).
- KPA(A)·GlycoPharm(A) 양호. **KCos(D)** 공백 — 기능 있는데 Guide 0.
- **반영안**: KCos 에 타블렛 Guide(진열 구성 → 고객 관심 신청 → 직원 처리) 추가. 문구는 "실기능"으로 기술(개념 안내 아님).

## 15. 제작자료 재사용 흐름 반영 위치

- **3사 모두 제작자료 화면 완성**이나 Guide 공백: KPA(B) · GlycoPharm(D) · KCos(D).
- **반영안**: `/guide/features/production-materials`(결과 조회 → 원본↔파생 추적 → 재사용/재제작 → 삭제).
  KPA `StoreProductionMaterialsPage`(direct+generated+qr+blog 통합 + CROSS_CREATE)가 기준 모델.

## 16. 블로그 → QR → POP → 사이니지 cross-link 현황

| 서비스 | cross-link 실재 | Guide 설명 |
|--------|----------------|-----------|
| KPA | 부분(제작자료 CROSS_CREATE + derivation 추적) | 없음(D) |
| GlycoPharm | 부분(개별 연결만, 통합 흐름 없음) | 없음(D) |
| K-Cosmetics | 부분(Hub Library 경유 + state prefill) | 없음(D) |

- **반영안**: 역할 Guide(store-owner)에 "제작 흐름 한눈보기"(원천 → 제작자료 → POP/QR/블로그/사이니지 → 고객 노출)
  단일 흐름 섹션 추가. KPA `CROSS_CREATE` 가 실제 구현 근거.

## 17. Workspace → Guide 백링크 후보

- **3개 서비스 모두 GuideBackLink 부재** — 공통 최대 공백.
- 후보 진입점: 각 제작 화면 헤더(QR/POP/블로그/사이니지/제작자료) + Store 대시보드(StoreMainPage/StoreOverview).
- **반영안**: 공통 `GuideBackLink`(또는 "도움말 보기") 컴포넌트를 `@o4o/store-ui-core` 에 1개 만들고 3사 제작 화면에
  주입 → 해당 `/guide/features/{매체}` 로 연결. **공통 모듈 변경이므로 Shared Module Change Protocol 적용**(소비처 3사 동시 검증).

## 18. 문안 수정만으로 가능한 항목 (copy-only, code 무변경)

1. **K-Cosmetics Commerce 정직화(최우선)** — usage step 01 "판매 준비 완료" → 미구현 사실 반영(노출/안내 중심 문구, 구매=후속).
2. KPA/KCos **QR·POP 문안 상세화** — 기존 Guide 항목 확장(유형·AI·템플릿·출력 단계).
3. 사이니지 "공개 재생 방법" 1단계 보강.
4. 기존 역할/usage Guide 의 제작자료·블로그 항목 문구 보강(경로가 이미 있는 KPA).

## 19. 코드 보강이 필요한 항목 (신규 Guide 페이지/컴포넌트)

1. `/guide/features/pop` 신규(3사) — 라우트 + copy props + GuideFeaturesPage 카드.
2. `/guide/features/blog` 신규(3사).
3. `/guide/features/production-materials` 신규(3사).
4. K-Cosmetics `/guide/features/tablet` 신규(타블렛 D 해소).
5. GlycoPharm/K-Cosmetics 역할 Guide `/guide/for/store-owner` 신설(KPA 패턴 이식) — 제작 흐름 통합 진입.
6. 공통 `GuideBackLink` 컴포넌트(@o4o/store-ui-core) + 3사 제작 화면 주입.
7. (선행 조사) KPA **매장 블로그 작성 화면 위치/완성도 확정** — 작성 UI 경로 모호.

## 20. 후속 WO 우선순위

| 우선 | WO 후보 | 내용 | 유형 |
|:---:|---------|------|------|
| P0 | `WO-O4O-KCOS-GUIDE-COMMERCE-HONESTY-FIX-V1` | KCos commerce 미완 문안 정정 | copy-only |
| P1 | `WO-O4O-STORE-GUIDE-POP-FLOW-V1` (KPA 우선 → GP/KCos) | POP feature Guide 신설 | code(copy+route) |
| P1 | `WO-O4O-STORE-GUIDE-PRODUCTION-MATERIALS-FLOW-V1` (KPA 우선) | 제작자료 Guide + cross-link 흐름 | code |
| P2 | `WO-O4O-STORE-GUIDE-BLOG-FLOW-V1` | 블로그 작성 Guide(KCos UI 기준), KPA 작성 화면 확정 선행 | code |
| P2 | `WO-O4O-STORE-GUIDE-BACKLINK-V1` | 공통 GuideBackLink(3사) — Shared Module Protocol | code(공통모듈) |
| P3 | `WO-O4O-GLYCO-KCOS-STORE-OWNER-ROLE-GUIDE-V1` | store-owner 역할 Guide 이식(KPA 패턴) | code |
| P3 | `WO-O4O-KCOS-GUIDE-TABLET-FLOW-V1` | KCos 타블렛 Guide 신설 | code |

> **KPA 우선 원칙**(CLAUDE.md §13 reference implementation): 모든 제작 흐름 Guide 는 KPA 에서 먼저
> 표준을 확정한 뒤 GlycoPharm/K-Cosmetics 로 이식한다.

## 21. 최종 판정

1. **제작 기능 자체는 3사 모두 충실**(QR/POP/블로그/사이니지/타블렛/제작자료 FE 완성). GlycoPharm **QR FE 완성 확정**.
2. **공통 Guide 공백**: POP · 블로그 · 제작자료 전용 Guide 부재, 제작물 **cross-link 통합 흐름** 미설명,
   **Workspace→Guide 백링크 3사 전무**.
3. **정직성 리스크**: K-Cosmetics commerce 미구현인데 Guide 가 완료처럼 기술(**E**) → **P0 즉시 정정**.
4. **반영 방식**: 매체별 feature Guide(`/guide/features/{pop,blog,production-materials,tablet}`)를 신설하되
   **KPA 에서 표준 확정 후 3사 이식**. 역할 Guide(store-owner)는 KPA 만 보유 → GP/KCos 이식은 P3.
5. **타블렛은 3사에서 실기능**이므로 Neture 식 "활용 개념 안내"가 아닌 실기능 기술로 작성.
6. 실제 Guide 보강 착수는 **KPA 기준 우선**이 가장 안전.

---

*조사: Claude Code · 2026-06-09 · 읽기 전용(코드 근거 fan-out 조사 3-service) · 코드 무변경*
