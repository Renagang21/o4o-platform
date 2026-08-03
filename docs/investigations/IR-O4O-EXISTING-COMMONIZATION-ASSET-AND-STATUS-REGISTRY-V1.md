# IR-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1

> **WO**: `WO-O4O-EXISTING-COMMONIZATION-ASSET-AND-STATUS-REGISTRY-V1`
> **유형**: Phase 0 read-only 조사 — 코드/DB/package/lock/route **무변경**. 문서 1개만 생성.
> **목적**: 공통화·`core + extension` 정비를 시작하기 **전에**, 저장소에 이미 존재하는 공통화 자산(문서·패키지·적용 결과)의 현재 상태를 확정한다.
> **결론(요약)**: **공통화는 신규 과제가 아니라 이미 1차 종료(Cycle 1 CLOSED, 2026-06-15)된 영역이다.** 공식 대상 4개 서비스 중 **KPA / K-Cosmetics / Neture 3개는 성숙한 공통 core 소비자**이며, **PharmacyHub 1개만 공통 auth 외 미채택(bespoke 100%)** 이다. 따라서 이번 정비의 실제 과제는 "공통화 설계"가 아니라 **① PharmacyHub adoption ② GlycoPharm 제외에 따른 기준 문서·페어링 재정렬 ③ 잔존 legacy 패키지 정리** 3가지다.
> **작성일**: 2026-08-03 · HEAD `3a9dde01653d1a0da2fc0c4ced77b1f0224d6110` (main, working tree clean)

---

## 1. 조사 기준 commit과 작업 상태

| 항목 | 값 |
|------|-----|
| repo | `https://github.com/Renagang21/o4o-platform` |
| branch | `main` |
| HEAD | `3a9dde01653d1a0da2fc0c4ced77b1f0224d6110` |
| working tree | clean (조사 시작·종료 시점 동일) |
| `git pull --ff-only origin main` | Already up to date |
| 조사 중 기준 commit 변경 | 없음 |

---

## 2. 조사 범위와 제외 범위

**포함**: 문서 인벤토리(`docs/**`), 공통 패키지 인벤토리(`packages/**`), 서비스별 실제 `import` 확인, 대표 core+extension 사례, Operator 공통화 현황, 인증·service catalog 위치.

**제외(WO §18 준수)**: 새 공통 패키지 설계·생성, 서비스 앱 통합 결정, route/import/package.json/lockfile 변경, dead code 삭제, DB 조회·write, 배포, GlycoPharm 수정.

**변경 0 확인**: §19.

---

## 3. 공식 대상 서비스

| 서비스 | 경로 | package name |
|--------|------|--------------|
| KPA Society | `services/web-kpa-society` | `@o4o/web-kpa-society` |
| K-Cosmetics | `services/web-k-cosmetics` | `@o4o/web-k-cosmetics` |
| Neture | `services/web-neture` | `@o4o/web-neture` |
| PharmacyHub | `services/web-pharmacy-hub` | `pharmacy-hub-web` |

> **관찰**: PharmacyHub 만 package name 이 `@o4o/` scope 밖(`pharmacy-hub-web`)이다. 워크스페이스 네이밍 규약에서 이탈 — 사실로만 기록(수정하지 않음).

`services/` 전체: `mobile-app`, `signage-player-web`, `web-account`, `web-glycopharm`, `web-k-cosmetics`, `web-kpa-society`, `web-neture`, `web-pharmacy-hub` (8). 이 중 `web-account`·`signage-player-web`·`mobile-app` 는 본 WO 대상 밖.

---

## 4. GlycoPharm 제외 원칙

- GlycoPharm 코드·문서·패키지에 **무접촉**(읽기조차 판정 근거로 사용하지 않음).
- 기존 공통화 문서 다수가 GlycoPharm 을 포함하나, 본 IR 에서는 전부 **`OUT_OF_SCOPE_REFERENCE`** 로만 취급했다.
- **단, 구조적 사실 1건은 후속 판단에 필요하므로 기록한다**: 다수의 공통 컴포넌트 추출이 **GP ↔ KCos 2-서비스 페어링**으로 정당화되었다(`CHECK-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1`, `...-EVENT-OFFER-GP-KCOS-...`, `IR-O4O-MY-STORE-COMMONIZATION-PHASE6-GP-KCOS-APPLICATION-SCOPE-V1` 등). GlycoPharm 이 제거되면 **이 추출들의 소비처가 KCos 단독으로 줄어드는 축이 생긴다.** → 이번 WO 에서 판정하지 않고 §18 후속 조사로 넘긴다.

---

## 5. 기존 architecture / baseline 문서 목록

`docs/**` 전체 md **2,884건** 중 공통화 키워드(COMMON/SHARED/CORE/EXTENSION/EXTRACT/ADOPT/UNIF/CROSS) 매칭 **283건**(그중 `docs/archive/**` **64건**). 아래는 판정에 실제로 사용한 핵심만 추린다.

### 5.1 기준(Active) 문서

| 문서 | 종류 | 주제 | 대상 서비스 | 상태 | 코드 일치 | 재조사 |
|------|------|------|------------|------|----------|:-----:|
| [docs/architecture/O4O-COMMONIZATION-STANDARD.md](docs/architecture/O4O-COMMONIZATION-STANDARD.md) | architecture | **공통화 판정 SSOT**(4-요소 구조·6항목 체크리스트·Hub 채택 매트릭스) | KPA/GP/KCos/Neture | Active (2026-05-02) | Hub Template 채택은 **일치**. 단 **PharmacyHub 미등재**, GlycoPharm 포함 → §17 DOC_CODE_MISMATCH | **Yes** |
| [docs/o4o-common-structure.md](docs/o4o-common-structure.md) | baseline | forum/lms/signage = 플랫폼 공통 구조 | 전체 | Active | 일치 | No |
| [docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md](docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) | baseline | 공유 모듈 변경 시 전 소비처 식별 절차 | 전체 | Active | 일치 | No |
| [docs/architecture/OPERATOR-CORE-DESIGN-V1.md](docs/architecture/OPERATOR-CORE-DESIGN-V1.md) | architecture | Operator core 설계 | 전체 | Active | §9 참조 | No |
| [docs/architecture/OPERATOR-INTEGRATION-STATE-V1.md](docs/architecture/OPERATOR-INTEGRATION-STATE-V1.md) | architecture | Operator 통합 상태 | 전체 | Active | §9 참조 | No |
| [docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md](docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md) | architecture | DataTable 정책 | 전체 | Active | 일치 | No |
| [docs/baseline/UX-CORE-FREEZE-V1.md](docs/baseline/UX-CORE-FREEZE-V1.md) | baseline(Freeze) | operator-ux-core / admin-ux-core 동결 | 전체 | Frozen | 일치 | No |
| [docs/baseline/STORE-UI-CORE-FREEZE-V1.md](docs/baseline/STORE-UI-CORE-FREEZE-V1.md) | baseline(Freeze) | store-ui-core 동결 | KPA/GP/KCos | Frozen | 일치 | No |
| [docs/architecture/O4O-CORE-FREEZE-V1.md](docs/architecture/O4O-CORE-FREEZE-V1.md) | baseline(F10) | Auth/Membership/Approval/RBAC Core 고정 | 전체 | Frozen | 일치 | No |
| [docs/platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md](docs/platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md) | baseline | Hub Template 명세 | 전체 | Active | 일치 | No |
| [docs/architecture/STORE-LAYER-ARCHITECTURE.md](docs/architecture/STORE-LAYER-ARCHITECTURE.md) | architecture(F3) | store-ui-core 의존 방향 | KPA/GP/KCos | Frozen | 일치 | No |
| [docs/platform/lms/LMS-CORE-EXTENSION-PRINCIPLES.md](docs/platform/lms/LMS-CORE-EXTENSION-PRINCIPLES.md) | baseline | LMS core+extension 원칙 | KPA/GP/KCos | Active | 일치 | No |
| [docs/platform/extensions/EXTENSION-GENERAL-GUIDE.md](docs/platform/extensions/EXTENSION-GENERAL-GUIDE.md) | baseline | Extension 일반 가이드 | 전체 | Active | 미검증(범위 밖) | No |
| [docs/rules/DESIGN-CORE-GOVERNANCE.md](docs/rules/DESIGN-CORE-GOVERNANCE.md) | rules | 신규 화면 = Design Core v1.0(`@o4o/ui`) 필수 | 전체 | Active | **PharmacyHub 불일치**(§12) | **Yes** |
| [docs/architecture/ADR-O4O-SCREEN-CONTENT-CORE-AND-ROLE-EXTENSION-ARCHITECTURE-V1.md](docs/architecture/ADR-O4O-SCREEN-CONTENT-CORE-AND-ROLE-EXTENSION-ARCHITECTURE-V1.md) | ADR | screen-content-core + role extension | KPA/Neture/공급자 | Active | 일치 | No |

### 5.2 종료 기록(가장 중요)

| 문서 | 일자 | 판정 |
|------|------|------|
| [docs/investigations/IR-O4O-CROSS-SERVICE-COMMONIZATION-OVERALL-AUDIT-V1.md](docs/investigations/IR-O4O-CROSS-SERVICE-COMMONIZATION-OVERALL-AUDIT-V1.md) | 2026-06-15 (`582e8ec66`) | **CLOSED with MINOR FOLLOW-UP** — 14개 축 A.CLOSED, 4서비스 `tsc -b` 0, 즉시 NEEDS-WO 0 |
| [docs/checks/CHECK-O4O-CROSS-SERVICE-COMMONIZATION-CYCLE1-CLOSURE-V1.md](docs/checks/CHECK-O4O-CROSS-SERVICE-COMMONIZATION-CYCLE1-CLOSURE-V1.md) | 2026-06-15 | **CLOSED** — Cycle 1 종료 고정 |

> **이 2건이 본 WO 의 직접 선행 문서다.** 두 문서의 대상은 KPA / GlycoPharm / K-Cosmetics / Neture 이며 **PharmacyHub 는 조사 대상에 포함된 적이 없다.** 즉 이번 WO 의 공식 대상 4개와 선행 종료 문서의 4개는 **1개 서비스가 다르다**(GP → PharmacyHub). 이것이 이번 정비의 실질적 delta 다.

---

## 6. 공통 패키지 inventory

`packages/` 총 **96** 디렉터리(+ `packages/@o4o-apps/{content-app, learning-app, signage}`). 아래는 4개 공식 서비스가 소비하거나 소비 후보인 패키지.

| package | 경로 | 책임 | core 방식 | extension 방식 | 현재 상태 |
|---------|------|------|-----------|----------------|-----------|
| `@o4o/types` | `packages/types` | 플랫폼 canonical 타입 SSOT | type-only | — | active (Tier 1) |
| `@o4o/ui` | `packages/ui` | Design Core v1.0 primitive | component | props | active (Tier 1) |
| `@o4o/content-editor` | `packages/content-editor` | RichTextEditor·ContentRenderer·AI assist | component | preset/provider | active (Tier 1) |
| `@o4o/error-handling` | `packages/error-handling` | 조회 실패 계약·에러 표면 | util/hook | — | active (Tier 1) |
| `@o4o/auth-client` | `packages/auth-client` | `AuthClient` + 401 auto-refresh axios | class + config | strategy 옵션 | active (Tier 1) |
| `@o4o/auth-utils` | `packages/auth-utils` | 토큰/역할 유틸 | util | — | active (Tier 1) |
| `@o4o/operator-ux-core` | `packages/operator-ux-core` | Operator 5-Block Layout/Sidebar/List/Form/blocks/nav/config | component + config | config 주입 | active (Tier 2, **Frozen**) |
| `@o4o/admin-ux-core` | `packages/admin-ux-core` | Admin UX primitive | component | config | active (Tier 2, **Frozen**) |
| `@o4o/shared-space-ui` | `packages/shared-space-ui` | Hub/Home Template·legal·guide·SEO·forum 표면 | **Template + adapter** | config + section override | active (Tier 2) — 최다 소비 |
| `@o4o/operator-core-ui` | `packages/operator-core-ui` | Operator 콘솔 **19개 page 모듈** | **page module + client adapter** | client 주입 + serviceKey | active (Tier 3) |
| `@o4o/store-ui-core` | `packages/store-ui-core` | 매장주 대시보드(layout/config/engine/auth/components) | layout + menu config engine | `storeMenuConfig` + capability | active (Tier 3, **Frozen**) |
| `@o4o/store-products-ui` | `packages/store-products-ui` | 매장 상품 UI + `configureStoreProductsApi()` | component + **DI 주입** | api 주입 | active (Tier 3) |
| `@o4o/lms-ui` | `packages/lms-ui` | LMS presentational primitive | component | props | partial (일부 export dormant) |
| `@o4o/lms-client` | `packages/lms-client` | LMS API factory | factory | base/adapter | partial (KCos scoped) |
| `@o4o/forum-core` | `packages/forum-core` | forum backend/lifecycle/manifest + public/admin UI | manifest + backend | serviceKey | active (프론트 소비는 얇음) |
| `@o4o/account-ui` | `packages/account-ui` | 계정/알림 공통 UI | component | config | active |
| `@o4o/store-asset-policy-core` | `packages/store-asset-policy-core` | 매장 자산 snapshot 정책·파생 뷰어 | policy + component | — | active (specialty) |
| `@o4o/tablet-kiosk-core` | `packages/tablet-kiosk-core` | 태블릿 kiosk 화면 | component | section/adapter | active |
| `@o4o/tablet-screen-set-editor` | `packages/tablet-screen-set-editor` | Screen Set 편집기 | component | **역할 API 주입** | active |
| `@o4o/screen-content-core` | `packages/screen-content-core` | Screen/Content **순수 계약**(타입) | contract only | — | active (**간접 소비**) |
| `@o4o/hub-core` | `packages/hub-core` | HUB layout/signal | component + hook | section 정의 | partial |
| `@o4o/block-renderer` | `packages/block-renderer` | 블록 렌더링 | renderer | adapter | active (KPA만) |
| `@o4o/ai-components` | `packages/o4o-ai-components` | AI 편집 모달 | component | preset | active |
| `@o4o/operator-core` | `packages/operator-core` | (legacy) operator layout/components | — | — | **DEAD — 저장소 전체 소비 0** |
| `@o4o/auth-context` | `packages/auth-context` | React auth context | provider | — | **서비스 소비 0** (`apps/admin-dashboard` 만 소비) |

### 6.1 확정된 dead / 미소비 사실 (실측)

| 사실 | 근거 |
|------|------|
| `@o4o/operator-core` **소비처 0** | `@o4o/operator-core['"/]` 패턴 저장소 전체 grep → **No matches**. 그럼에도 KPA·KCos·Neture 3개 서비스 `package.json` 에 dependency 로 선언되어 있음 |
| `@o4o/auth-context` **4개 서비스 소비 0** | 4개 서비스 모두 `src/contexts/AuthContext.tsx` 를 자체 보유. 패키지 소비는 `apps/admin-dashboard` 뿐 |
| `@o4o/screen-content-core` **서비스 src 소비 0 (정상)** | 소비처 = `packages/tablet-screen-set-editor`, `apps/api-server` 2곳. 서비스 dependency 선언은 **빌드용**(web-kpa Dockerfile 선별 COPY 필요) — 제거 금지 |

---

## 7. 서비스별 adoption matrix

**판정 방식**: `package.json` dependency 만으로 판정하지 않고, `services/{svc}/src/**/*.{ts,tsx}` 의 실제 `from '@o4o/…'` import 건수를 실측했다.

| 공통 패키지 | KPA | KCos | Neture | PharmacyHub |
|-------------|:---:|:----:|:------:|:-----------:|
| `auth-client` | ACTIVELY_USED (2) | ACTIVELY_USED (11) | ACTIVELY_USED (2) | **ACTIVELY_USED (2)** |
| `auth-utils` | ACTIVELY_USED (12) | ACTIVELY_USED (9) | ACTIVELY_USED (8) | **ACTIVELY_USED (5)** |
| `auth-context` | NOT_ADOPTED | NOT_ADOPTED | NOT_ADOPTED | NOT_ADOPTED |
| `types` | ACTIVELY_USED (24) | ACTIVELY_USED (19) | ACTIVELY_USED (9) | **NOT_ADOPTED** |
| `ui` | ACTIVELY_USED (87) | ACTIVELY_USED (31) | ACTIVELY_USED (31) | **NOT_ADOPTED** |
| `error-handling` | ACTIVELY_USED (86) | ACTIVELY_USED (35) | ACTIVELY_USED (30) | **NOT_ADOPTED** |
| `shared-space-ui` | ACTIVELY_USED (85) | ACTIVELY_USED (41) | ACTIVELY_USED (90) | **NOT_ADOPTED** |
| `operator-ux-core` | ACTIVELY_USED (84) | ACTIVELY_USED (34) | ACTIVELY_USED (53) | **NOT_ADOPTED** |
| `operator-core-ui` | ACTIVELY_USED (30) | ACTIVELY_USED (30) | ACTIVELY_USED (15) | **NOT_ADOPTED** |
| `operator-core` (legacy) | DEPENDENCY_ONLY | DEPENDENCY_ONLY | DEPENDENCY_ONLY | NOT_APPLICABLE |
| `admin-ux-core` | PARTIALLY_USED (1) | PARTIALLY_USED (1) | PARTIALLY_USED (1) | NOT_ADOPTED |
| `account-ui` | ACTIVELY_USED (19) | ACTIVELY_USED (15) | ACTIVELY_USED (13) | **NOT_ADOPTED** |
| `content-editor` | ACTIVELY_USED (31) | ACTIVELY_USED (9) | ACTIVELY_USED (18) | **NOT_ADOPTED** |
| `forum-core` | PARTIALLY_USED (1) | DEPENDENCY_ONLY (0) | PARTIALLY_USED (3) | NOT_APPLICABLE |
| `store-ui-core` | ACTIVELY_USED (19) | ACTIVELY_USED (21) | PARTIALLY_USED (1, MediaPicker만) | **NOT_ADOPTED** |
| `store-products-ui` | PARTIALLY_USED (2) | PARTIALLY_USED (2) | PARTIALLY_USED (2) | NOT_ADOPTED |
| `store-asset-policy-core` | PARTIALLY_USED (2) | PARTIALLY_USED (3) | NOT_APPLICABLE | NOT_APPLICABLE |
| `lms-client` | PARTIALLY_USED (1) | PARTIALLY_USED (2) | NOT_APPLICABLE(제외) | NOT_APPLICABLE |
| `lms-ui` | PARTIALLY_USED (2) | PARTIALLY_USED (2) | NOT_APPLICABLE(제외) | NOT_APPLICABLE |
| `tablet-kiosk-core` | ACTIVELY_USED (11) | PARTIALLY_USED (4) | DEPENDENCY_ONLY (0) | NOT_APPLICABLE |
| `tablet-screen-set-editor` | ACTIVELY_USED (7) | NOT_ADOPTED | PARTIALLY_USED (2) | NOT_APPLICABLE |
| `screen-content-core` | DEPENDENCY_ONLY(빌드 필수) | NOT_APPLICABLE | DEPENDENCY_ONLY(빌드 필수) | NOT_APPLICABLE |
| `hub-core` | NOT_ADOPTED | NOT_ADOPTED | PARTIALLY_USED (2) | NOT_APPLICABLE |
| `block-renderer` | PARTIALLY_USED (4) | NOT_APPLICABLE | NOT_APPLICABLE | NOT_APPLICABLE |
| `ai-components` | PARTIALLY_USED (1) | PARTIALLY_USED (1) | PARTIALLY_USED (1) | NOT_ADOPTED |

> 괄호 안 숫자 = `src/**` import 문 실측 건수(HEAD `3a9dde01`).
> **PharmacyHub 는 `auth-client`/`auth-utils` 2개 외 전부 미채택** — dependency 선언 자체가 2개뿐이다.

### 7.1 dependency ≠ adoption 인 항목 (WO §9 주의사항 실측 결과)

| 서비스 | 패키지 | dependency | 실제 import | 판정 |
|--------|--------|:---------:|:-----------:|------|
| KPA·KCos·Neture | `@o4o/operator-core` | 있음 | 0 (저장소 전체 0) | **DEPENDENCY_ONLY / dead** |
| KCos | `@o4o/forum-core` | 있음 | 0 | DEPENDENCY_ONLY (forum UI 는 `shared-space-ui` Template 경유) |
| Neture | `@o4o/tablet-kiosk-core` | 있음 | 0 | DEPENDENCY_ONLY |
| KPA·Neture | `@o4o/screen-content-core` | 있음 | 0 | DEPENDENCY_ONLY (**정상** — 간접/빌드 의존, 제거 금지) |

---

## 8. 대표 core + extension 사례 (7건)

### 8-1. `@o4o/operator-core-ui` — page module + client adapter (**최우수 사례**)

```
Core:            packages/operator-core-ui/src/modules/{19개}
                 cms-content, contact-inquiry, forum-analytics, forum-categories,
                 forum-delete-requests, forum-hub, forum-requests, guide-contents,
                 instructor-course-form, instructor-courses, instructor-lesson-list,
                 lms-courses, members, product-applications, product-order-view,
                 resources, service-contact-settings, service-legal, stores
Extension/Adapter: 서비스가 `{Domain}Client` 인터페이스 구현체를 주입
Config:          serviceKey + config 객체
소비 서비스:      KPA, KCos, Neture
공통 계약:        `OperatorMembersConsolePage(client, config)` 형태의 page-level 계약
서비스별 차이:    API adapter 주입만. 서비스 페이지는 대부분 thin wrapper
현재 안정성:      높음 — 다수 CHECK 문서 + 4서비스 typecheck green(2026-06-15)
재사용 가능 패턴:  ★ "page module + client 주입" — PharmacyHub 운영자 화면에 그대로 적용 가능
```

### 8-2. `@o4o/shared-space-ui` — Template + config override

```
Core:            ForumHubTemplate / ContentHubTemplate / ResourcesHubTemplate /
                 LmsHubTemplate / StoreHubTemplate / SignageHubTemplate /
                 SignageManagerTemplate / StandardHomeTemplate
Extension:       config > section override > 별도 페이지 (우선순위 고정)
Config:          서비스별 hub config + serviceKey 데이터 격리
소비 서비스:      KPA, KCos, Neture (Neture 는 forum/content/resources 만 — 의도적 부분 채택)
공통 계약:        O4O-HUB-TEMPLATE-STANDARD-V1
서비스별 차이:    Hero/Search/Pagination config. `renderXxxSection` override 는 WO 승인 필요
현재 안정성:      높음 — O4O-COMMONIZATION-STANDARD §9 매트릭스와 코드 일치 확인
재사용 가능 패턴:  ★ "Template + config, override 는 승인제"
```

### 8-3. `@o4o/store-ui-core` — layout + menu config engine + capability filter

```
Core:            StoreDashboardLayout / StoreSidebar / engine / auth guard
Extension:       storeMenuConfig(서비스별) + resolveStoreMenu(capability 필터)
Config:          매장 자격·권한 기반 메뉴 노출 분기
소비 서비스:      KPA(19), KCos(21) — Neture 는 MediaPickerModal 1건만(정확한 제외)
공통 계약:        STORE-LAYER-ARCHITECTURE (F3 Frozen)
현재 안정성:      높음(Frozen)
재사용 가능 패턴:  ★ "capability 기반 메뉴 resolve" — 코드 분기 없이 서비스 차이 흡수
```

### 8-4. `@o4o/operator-ux-core` — UX primitive + config (Frozen)

```
Core:            OperatorDashboardLayout, sidebar/, nav/, list/, form/, blocks/, config/
Extension:       서비스 `src/config/{dashboard,navigation,operatorCapabilities,operatorMenuGroups}.ts`
소비 서비스:      KPA(84), KCos(34), Neture(53)
서비스별 차이:    **KPA/KCos/Neture 세 서비스가 동일한 4개 config 파일 세트를 보유** — 구조적 대칭 확인
현재 안정성:      높음(UX-CORE-FREEZE-V1)
재사용 가능 패턴:  ★ "core는 패키지, 차이는 서비스 src/config/*.ts 4파일" — 가장 명확한 extension seam
```

### 8-5. `@o4o/store-products-ui` — 런타임 DI 주입

```
Core:            매장 상품 UI 컴포넌트
Extension:       `configureStoreProductsApi(api)` — 서비스의 authClient 인스턴스를 부팅 시 주입
소비 서비스:      KPA, KCos, Neture (각 lib/apiClient.ts 또는 AuthContext 에서 1회 호출)
재사용 가능 패턴:  ★ "패키지가 인증 인스턴스를 소유하지 않고 주입받는다" — 토큰 전략 차이 흡수
```

### 8-6. `@o4o/tablet-screen-set-editor` + `@o4o/screen-content-core` — 계약 분리 + 역할 API 주입

```
Core:            screen-content-core = 순수 계약(타입)만. UI/HTTP 없음
                 tablet-screen-set-editor = 편집기 UI
Extension:       역할별 API(store/operator/supplier)를 주입 — 6개 소비처
소비:            KPA, Neture, api-server(resolver 공유)
현재 안정성:      중~높음. 함정: web-kpa Dockerfile 선별 COPY 에 신규 패키지 2줄 필요
재사용 가능 패턴:  ★ "순수 계약 패키지를 frontend·backend 가 공유" — 판정 로직 복제 0
```

### 8-7. `@o4o/auth-client` — class + strategy 옵션 (**PharmacyHub 가 유일하게 채택한 축**)

```
Core:            AuthClient(baseUrl, {strategy}) + 401 auto-refresh axios
Extension:       서비스별 `src/lib/apiClient.ts` (20~27L) 에서 인스턴스 1개 생성
소비 서비스:      KPA(AuthContext 내부), KCos, Neture, **PharmacyHub**
서비스별 차이:    base URL env + 추가 DI 호출 유무
현재 안정성:      높음 — 4개 서비스 전부 동일 패턴
관찰:            KPA 만 `lib/apiClient.ts` 없이 `contexts/AuthContext.tsx` 안에서 생성 → 위치 비대칭
재사용 가능 패턴:  ★ 신규 서비스가 가장 먼저 채택하는 진입 축(PharmacyHub 가 실증)
```

---

## 9. Operator 공통화 현황

| 항목 | 상태 |
|------|------|
| UI primitive ↔ page module 책임 분리 | **확립** — `operator-ux-core`(Tier 2 primitive) / `operator-core-ui`(Tier 3 page module) 2계층 |
| adapter/config/slot 구조 | **확립** — page module 은 `{Domain}Client` 주입, layout 은 config 주입 |
| 서비스별 operatorConfig | **확립** — KPA/KCos/Neture 모두 `src/config/{dashboard,navigation,operatorCapabilities,operatorMenuGroups}.ts` 동일 세트 |
| 서비스별 local fork | 잔존 없음(선행 audit A.CLOSED). 서비스 페이지는 thin wrapper |
| adoption 완료 서비스 | KPA / KCos / Neture 3개 |
| adoption 미착수 | **PharmacyHub** — `src/pages/operator/` 2개 파일(`MembershipsPage.tsx` 268L, `MembershipDetailPage.tsx` 196L) 전부 bespoke |
| 문서↔코드 일치 | 일치. 단 `@o4o/operator-core`(legacy) deprecation 경로가 2026-06-15 audit 에서 B 항목으로 지적되었으나 **2026-08-03 현재 미해결**(dependency 3건 잔존, 소비 0) |
| 진행 중 리팩터링과 충돌 | 없음(working tree clean) |

> 본 WO 범위상 관리자 공통화의 상세 gap 은 조사하지 않았다. 현재 상태만 등록.

---

## 10. 인증·계정·service catalog 현황

### 10.1 Service catalog

- 위치: [apps/api-server/src/config/service-catalog.ts](apps/api-server/src/config/service-catalog.ts) — `export const O4O_SERVICES: O4OService[]`
- 등록 키(실측): `neture` · `glycopharm` · `kpa-society` · `k-cosmetics` · **`pharmacy-hub`** (+ 이하 항목) — **PharmacyHub 는 이미 catalog 에 등재되어 있다.**
- 판정: **backend catalog 는 SSOT 로 기능한다.** frontend 측 중복 정의는 발견되지 않았고, 대신 PharmacyHub 만 `src/config/service.ts`(39L) 를 별도 보유.
- 함정(기존 기록 확인): 서비스 키 `kpa-society` ≠ 일부 데이터의 `kpa` — catalog 키와 데이터 `service_key` 가 항상 같지 않다.

### 10.2 인증 / apiClient

| 서비스 | authClient 생성 위치 | 공통 패키지 |
|--------|---------------------|------------|
| KPA | `src/contexts/AuthContext.tsx` (+ `src/lib/auth-utils.ts`) | `@o4o/auth-client`, `@o4o/auth-utils` |
| KCos | `src/lib/apiClient.ts` (26L) | 동일 |
| Neture | `src/lib/apiClient.ts` (27L) | 동일 |
| PharmacyHub | `src/lib/apiClient.ts` (20L) | 동일 |

- **공통 auth 는 4개 서비스 전부에서 실제로 사용된다.** `AuthClient(localStorage 전략) + 401 auto-refresh` 동일.
- **서비스별 apiClient 는 "별도 구현"이 아니라 "부팅 config"** — 20~27L, 로직 없음. 책임 중복 아님.
- `@o4o/auth-context` 는 4개 서비스 어디에도 쓰이지 않는다(`apps/admin-dashboard` 전용).
- `AuthContext.tsx` 는 4개 서비스가 각자 보유(KPA 미측정 라인수, PharmacyHub 113L) — **공통화 여지 있으나 본 WO 범위 밖**(권한/멤버십 의미 비교 필요).
- PharmacyHub adoption 수준: **공통 auth 만 채택**(`auth-client` 2 + `auth-utils` 5 import).

---

## 11. 기존 cross-service IR/CHECK 상태

| 분류 | 대표 문서 | 비고 |
|------|-----------|------|
| **CURRENT_BASELINE** | `docs/architecture/O4O-COMMONIZATION-STANDARD.md` · `docs/checks/CHECK-O4O-CROSS-SERVICE-COMMONIZATION-CYCLE1-CLOSURE-V1.md` · `docs/baseline/UX-CORE-FREEZE-V1.md` · `docs/baseline/STORE-UI-CORE-FREEZE-V1.md` | 판정 기준 |
| **CURRENT_REFERENCE** | `IR-O4O-CROSS-SERVICE-COMMONIZATION-OVERALL-AUDIT-V1` · `IR-O4O-OPERATOR-UX-CROSSSERVICE-RECHECK-V1` · `IR-O4O-STORE-HUB-CROSSSERVICE-COMMONIZATION-RECHECK-V1` · `IR-O4O-MYPAGE-CROSSSERVICE-COMMONIZATION-RECHECK-V1` · `IR-O4O-COMMUNITY-FORUM-CROSSSERVICE-COMMONIZATION-RECHECK-V1` | 축별 최신 상태 |
| **PARTIALLY_VALID** | LMS 계열(`CHECK-O4O-LMS-*-ADOPTION-V1`, `IR-O4O-LMS-COMMONIZATION-*`) | 결론 유효하나 대상 서비스 집합에 GP 포함 |
| **SUPERSEDED** | `CHECK-O4O-LMS-COMMONIZATION-CYCLE1-CLOSURE-V1` → V2, `CHECK-O4O-MY-STORE-EXECUTION-CROSSSERVICE-COMMONIZATION-V1` → V2/V3, `CHECK-O4O-STORE-HUB-CANONICAL-CROSSSERVICE-COMPLETION-V1` → V2 | 상위 버전 존재 |
| **ARCHIVED_HISTORY** | `docs/archive/investigations/**`(64건 중 다수) — `IR-O4O-CROSS-SERVICE-DUPLICATION-AUDIT-V1`, `IR-O4O-MEMBER-MANAGEMENT-COMMONIZATION-AUDIT-V1` 등 | 이력 참고 |
| **OUT_OF_SCOPE_REFERENCE** | GP 페어링 추출 문서 전체 — `CHECK-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1`, `CHECK-O4O-STORE-HUB-EVENT-OFFER-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1`, `IR-O4O-MY-STORE-COMMONIZATION-PHASE6-GP-KCOS-APPLICATION-SCOPE-V1`, `CHECK-O4O-LMS-GLYCOPHARM-*` | 패턴 참고만. 현재 판정 근거로 미사용 |
| **REQUIRES_RECHECK** | `O4O-COMMONIZATION-STANDARD` §3/§9(대상 서비스 집합) · `DESIGN-CORE-GOVERNANCE`(PharmacyHub 적용) | §17 참조 |

---

## 12. 서비스별 성숙도 판정

| 서비스 | 판정 | 근거(실측) |
|--------|------|-----------|
| **KPA Society** | `MATURE_REFERENCE` | 21개 공통 패키지 소비, 최다 import(ui 87 / error-handling 86 / shared-space-ui 85 / operator-ux-core 84). Hub Template 6종 전부 채택. store-ui-core·tablet 계열 canonical 구현 보유 |
| **K-Cosmetics** | `MATURE_SHARED_CORE_CONSUMER` (겸 `APP_FRAME_CANDIDATE`) | 18개 소비. operator-core-ui 모듈 30건을 **거의 전부 thin wrapper 로 소비**(주석에 원본 라인수 대비 축소 명기: members 768L→wrapper 등). KPA 와 동일한 config 4파일 세트 보유 |
| **Neture** | `INDEPENDENT_APP_WITH_SHARED_CORES` | 17개 소비. shared-space-ui 90 / operator-ux-core 53 로 공통 core 를 넓게 소비하되 **LMS·store 실행 축은 정확히 제외**(store-ui-core 1건=MediaPicker). 공급자/B2B extension 이 서비스 고유 |
| **PharmacyHub** | `NEW_SERVICE_EARLY_ADOPTION` | src 전체 **25파일 / 약 3,700L**, 공통 패키지 **2개(auth 전용)** 만 채택. `@o4o/ui`·`shared-space-ui`·`operator-ux-core`·`operator-core-ui`·`store-ui-core`·`account-ui`·`types`·`error-handling` **전부 미채택**. operator/store-owner/supplier 3역할 화면이 전부 bespoke |

> 초기 가설과의 차이: 가설은 "KCos = KPA 유사 프레임 후보"였는데, 실측상 **KCos 는 이미 operator 축에서 가장 순수한 thin-wrapper 소비자**다(KPA 보다 fork 가 적음 — KPA 는 reference 로서 advanced 기능을 자체 보유). 즉 **KPA=reference(두꺼움), KCos=frame 검증체(얇음)** 로 역할이 갈린다.

---

## 13. 이미 완료된 공통화 (재조사 불필요)

`ALREADY_STANDARDIZED` — 2026-06-15 Cycle 1 closure 14개 축이 HEAD `3a9dde01` 에서도 유지된다(패키지 구조·import 실측 일치).

1. LMS 공통화 Cycle 1 (KPA/KCos)
2. AI 편집 공통화 Cycle 1
3. 내 매장/내 약국 실행 (store-ui-core)
4. 콘텐츠/자료실/제작자료 (content-editor·store-asset-policy-core)
5. POP/QR/블로그/제품설명 (EditingPreset surface)
6. 운영자 공통 콘솔 (operator-core-ui 19 모듈)
7. 법정정보/약관 설정
8. 서비스 가이드/public guide
9. 아이콘/사이드바/UI 정렬 (Design Core)
10. Contact/문의 관리
11. Store order/checkout status label
12. Forum/community (shared-space-ui Template + forum-core)
13. Mypage
14. 회원관리 (CommonEditUserModal·OperatorMembersConsole)

> **이 14개 축에 대해 "새로 공통화 설계"를 시작하면 중복 작업이다.** 남은 것은 대상 서비스 집합 변경(§14)뿐이다.

---

## 14. adoption gap 만 남은 영역

`ADOPTION_GAP_ONLY` — core 는 존재하고 검증되었으나 특정 서비스가 채택하지 않은 축.

| 영역 | core | gap 서비스 | 규모 |
|------|------|-----------|------|
| Design Core primitive | `@o4o/ui` | PharmacyHub | 전 화면 |
| 공통 조회 실패 계약 | `@o4o/error-handling` | PharmacyHub | 전 API 호출 |
| canonical 타입 | `@o4o/types` | PharmacyHub | 전역 |
| Hub/Home Template | `@o4o/shared-space-ui` | PharmacyHub | HomePage 77L 등 |
| Operator 대시보드 | `@o4o/operator-ux-core` + `@o4o/operator-core-ui` | PharmacyHub | operator 2페이지 464L |
| 매장주 대시보드 | `@o4o/store-ui-core` | PharmacyHub(store-owner 6페이지 ~1,000L) / Neture(의도적 제외) | 중 |
| 계정/알림 UI | `@o4o/account-ui` | PharmacyHub | JoinPage/JoinStatusPage/RoleEntryPage |
| 콘텐츠 편집 | `@o4o/content-editor` | PharmacyHub | (해당 기능 도입 시) |

> **gap 은 사실상 PharmacyHub 단일 서비스에 집중되어 있다.** Neture 의 미채택 축(LMS·store 실행)은 gap 이 아니라 §17 의도적 제외다.

---

## 15. 재조사 필요 영역

`RECHECK_REQUIRED`

| # | 영역 | 사유 |
|---|------|------|
| R1 | `O4O-COMMONIZATION-STANDARD` §3·§9 대상 서비스 집합 | GlycoPharm 포함 / PharmacyHub 미등재 → 기준 문서가 현재 공식 4개 서비스와 불일치 |
| R2 | GP 페어링으로 추출된 공통 컴포넌트의 잔존 소비처 | B2B 카탈로그·Event Offer·My Store Phase6 등이 GP 제거 시 KCos 단독 소비로 축소되는지 |
| R3 | `@o4o/operator-core` legacy 정리 | 소비 0인데 3개 서비스 dependency 잔존. 2026-06-15 B 항목 미해결 |
| R4 | `@o4o/auth-context` 포지션 | 서비스 0 소비 / admin-dashboard 전용 — 공통 auth 축의 canonical 인지 legacy 인지 미확정 |
| R5 | 서비스별 `AuthContext.tsx` 4중 병존 | 공통화 여지 있으나 membership/role 의미 비교 선행 필요 |
| R6 | PharmacyHub `package.json` name 이 `@o4o/` scope 밖 | 워크스페이스 규약 이탈 |
| R7 | forum 축의 실제 seam | `forum-core` 프론트 소비가 얇고(KPA 1·KCos 0·Neture 3) UI 는 `shared-space-ui` Template 경유 → 두 패키지의 책임 경계 재확인 |
| R8 | `lms-ui` dormant export | `CourseCard`/`CourseList`/`EnrollmentButton`/`LessonPlayerShell` 미소비(2026-06-15 지적, 미해결) |

---

## 16. 선행 정비 후보

`PRE_REFACTOR_REQUIRED` — 새 공통화를 시작하기 전에 먼저 정리해야 판단이 흐려지지 않는 항목.

1. **R1 기준 문서 대상 서비스 집합 갱신** — 이걸 먼저 하지 않으면 이후 모든 adoption 판정이 잘못된 매트릭스 위에서 이뤄진다. (최우선)
2. **R3 `@o4o/operator-core` 정리** — dead 패키지가 dependency 로 남아 있으면 "operator core 가 2개"로 보인다.
3. **R4 `@o4o/auth-context` 포지션 확정** — PharmacyHub auth adoption 설계 전에 필요.

---

## 17. 서비스 고유 · 통합 금지 영역

| 영역 | 분류 | 근거 |
|------|------|------|
| KPA advanced LMS(QuizBuilder·AssignmentEditor·grading·CourseStructureAiModal) | `SERVICE_ONLY` | Cycle 1 closure C.INTENTIONAL DIFFERENCE — 조기 추상화 금지 |
| Neture LMS · store owner 실행 | `DO_NOT_UNIFY` | Neture 는 매장 운영 주체 아님(COMMONIZATION-STANDARD §3.1) |
| Neture 공급자/거래/B2B extension | `SERVICE_ONLY` | 도메인 고유 |
| KPA 약국/태블릿/QR 실행 자산 | `SERVICE_ONLY`(구조는 공통, 데이터·정책은 고유) | Boundary Policy F6 |
| PharmacyHub B2B 주문/결제 도메인 로직 | `SERVICE_ONLY` | 신규 서비스 고유 업무 — **단 UI/레이아웃 축은 §14 adoption 대상** |
| GlycoPharm 전체 | `OUT_OF_SCOPE` | 무접촉 |

### 17.1 DOC_CODE_MISMATCH 확정 목록

| 문서 | 불일치 |
|------|--------|
| `O4O-COMMONIZATION-STANDARD` §3 서비스별 채택 범위 / §9 채택 매트릭스 | GlycoPharm 포함, **PharmacyHub 행 없음** |
| `DESIGN-CORE-GOVERNANCE` ("모든 신규 화면은 Design Core v1.0") | PharmacyHub 25파일 중 `@o4o/ui` import **0** |
| 2026-06-15 Cycle 1 closure §7 B 항목(operator-core deprecation, lms-ui dormant, shared-space-ui 네이밍) | 2026-08-03 현재 **미해결 상태 그대로** |

---

## 18. 종합 Registry 표

| 영역 | 기준 문서 | 구현 패키지/경로 | KPA | KCos | Neture | PharmacyHub | 상태 | 후속 조사 |
|------|-----------|-----------------|:---:|:----:|:------:|:-----------:|------|-----------|
| 공통화 판정 기준 | `O4O-COMMONIZATION-STANDARD` | — | ✅ | ✅ | ✅ | ❌ 미등재 | `DOC_CODE_MISMATCH` | R1 (최우선) |
| Hub/Home Template | `O4O-HUB-TEMPLATE-STANDARD-V1` | `packages/shared-space-ui` | ✅ 85 | ✅ 41 | ✅ 90(부분채택) | ❌ 0 | `CORE_EXTENSION_READY` / `ADOPTION_GAP`(PH) | PH adoption |
| Operator UX primitive | `UX-CORE-FREEZE-V1` | `packages/operator-ux-core` | ✅ 84 | ✅ 34 | ✅ 53 | ❌ 0 | `CORE_EXTENSION_READY` / `ADOPTION_GAP`(PH) | PH adoption |
| Operator page module | `OPERATOR-CORE-DESIGN-V1` | `packages/operator-core-ui` (19 모듈) | ✅ 30 | ✅ 30 | ✅ 15 | ❌ 0 | `CORE_EXTENSION_READY` / `ADOPTION_GAP`(PH) | PH adoption |
| Operator legacy | — | `packages/operator-core` | dep only | dep only | dep only | — | `LOCAL_FORK_REMAINS`(dead dep) | R3 |
| 매장주 대시보드 | `STORE-LAYER-ARCHITECTURE`(F3) | `packages/store-ui-core` | ✅ 19 | ✅ 21 | 부분 1 | ❌ 0 | `CORE_READY` / `ADOPTION_GAP`(PH) | PH·R2 |
| Design Core primitive | `DESIGN-CORE-GOVERNANCE` | `packages/ui` | ✅ 87 | ✅ 31 | ✅ 31 | ❌ 0 | `ADOPTION_GAP` | PH adoption |
| 조회 실패 계약 | (Load-Error 계약 시리즈) | `packages/error-handling` | ✅ 86 | ✅ 35 | ✅ 30 | ❌ 0 | `ADOPTION_GAP` | PH adoption |
| canonical 타입 | CLAUDE.md §13-A | `packages/types` | ✅ 24 | ✅ 19 | ✅ 9 | ❌ 0 | `ADOPTION_GAP` | PH adoption |
| 공통 인증 | `O4O-CORE-FREEZE-V1`(F10) | `packages/auth-client`·`auth-utils` | ✅ | ✅ | ✅ | **✅ 채택** | `CORE_READY` | R4·R5 |
| Auth context | — | `packages/auth-context` | ❌ | ❌ | ❌ | ❌ | `UNKNOWN`(admin-dashboard 전용) | R4 |
| 계정/알림 UI | — | `packages/account-ui` | ✅ 19 | ✅ 15 | ✅ 13 | ❌ 0 | `ADOPTION_GAP` | PH adoption |
| 콘텐츠 편집 | `CONTENT-CORE-OVERVIEW` | `packages/content-editor` | ✅ 31 | ✅ 9 | ✅ 18 | ❌ 0 | `CORE_READY` | — |
| Forum | `o4o-common-structure` | `packages/forum-core` + `shared-space-ui` | 부분 1 | dep only | 부분 3 | — | `RECHECK_REQUIRED` | R7 |
| LMS | `LMS-CORE-EXTENSION-PRINCIPLES`·`APP-LMS-BASELINE` | `packages/lms-client`·`lms-ui` | 부분 | 부분 | 제외 | — | `PARTIAL_ADOPTION` | R8 |
| 태블릿/Screen Set | `ADR-...-SCREEN-CONTENT-CORE-...` | `tablet-kiosk-core`·`tablet-screen-set-editor`·`screen-content-core` | ✅ | 부분 | 부분 | — | `CORE_EXTENSION_READY` | — |
| 매장 자산 정책 | `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1` | `packages/store-asset-policy-core` | ✅ | ✅ | — | — | `CORE_READY` | R2 |
| HUB layout/signal | `O4O-HUB-TEMPLATE-STANDARD-V1` | `packages/hub-core` | ❌ | ❌ | 부분 2 | — | `PARTIAL_ADOPTION` | R2 |
| Service catalog | — | `apps/api-server/src/config/service-catalog.ts` | ✅ | ✅ | ✅ | **✅ 등재됨** | `CORE_READY` | — |
| GlycoPharm 전 영역 | — | — | — | — | — | — | `OUT_OF_SCOPE` | 무접촉 |

---

## 19. 후속 조사 권고 (순서)

| 순위 | 제안 문서 | 성격 | 목적 |
|:---:|-----------|------|------|
| 1 | `WO-O4O-COMMONIZATION-STANDARD-SCOPE-REALIGNMENT-V1` | docs-only | R1 — 기준 문서의 대상 서비스 집합을 KPA/KCos/Neture/PharmacyHub 로 갱신, GP 를 이력 처리. **이후 모든 판정의 전제** |
| 2 | `IR-O4O-PHARMACY-HUB-COMMON-CORE-ADOPTION-SCOPE-V1` | read-only | §14 gap 을 화면 단위로 분해 — auth 다음 채택 순서(types → ui/error-handling → shared-space-ui → operator 축 → store 축) 결정 |
| 3 | `WO-O4O-OPERATOR-CORE-LEGACY-RETIREMENT-V1` | 소규모 코드 | R3 — dead 패키지 + 3개 dependency 정리(소비 0 확인 완료) |
| 4 | `IR-O4O-GP-PAIRED-EXTRACTION-RESIDUAL-CONSUMER-AUDIT-V1` | read-only | R2 — GP 제거 시 단독 소비로 축소되는 공통 컴포넌트 식별 |
| 5 | `IR-O4O-AUTH-CONTEXT-CANONICAL-POSITION-V1` | read-only | R4·R5 — auth-context 포지션 + 서비스별 AuthContext 4중 병존 공통화 여지 |
| 6 | `IR-O4O-FORUM-CORE-VS-SHARED-SPACE-UI-SEAM-V1` | read-only | R7 — forum 축 두 패키지 책임 경계 |

> **권고**: 1번을 하지 않은 채 2번 이후를 진행하면, 갱신되지 않은 채택 매트릭스 위에서 판정하게 된다.

---

## 20. 코드 · DB 변경 0 확인

| 항목 | 결과 |
|------|------|
| 코드 변경 | **0** — 조사 중 파일 수정/생성 없음(본 IR 문서 1건 제외) |
| DB 조회 / write | **0** — 프로덕션·로컬 DB 접속 없음 |
| migration | **0** |
| package / lockfile / dependency | **0** |
| route / import | **0** |
| 배포 | **0** |
| GlycoPharm 접촉 | **0** — 수정·삭제 없음. 판정 근거로도 미사용(§4) |
| `pnpm install` / 전체 build | **미실행**(WO §5) |
| 사용 명령 | `git status/branch/rev-parse/remote/pull --ff-only/log`, 파일 열거·읽기, ripgrep 검색만 |

**중지 조건(WO §19) 해당 없음** — 작업 트리 clean 유지, 기준 commit 불변, 문서↔코드 관계 확인 가능, 공통 패키지 소비처를 실제 import 로 확인 완료, 진행 중 리팩터링과 충돌 없음, GlycoPharm 제외 원칙 준수 가능.

### 미확정 사항

1. GP 제거가 각 공통 컴포넌트 소비처에 미치는 정량 영향 — GlycoPharm 무접촉 원칙상 이번 조사에서 산정하지 않음(R2).
2. `AuthContext.tsx` 4중 병존의 공통화 타당성 — membership/role 의미 비교 필요(R5).
3. PharmacyHub 각 화면의 공통 모듈 대응 가능 여부(화면 단위) — 후속 IR 2번 범위.

---

*Date: 2026-08-03 · Phase 0 read-only asset & status registry · HEAD `3a9dde01` · docs md 2,884 중 공통화 매칭 283 · packages 96 · 공식 대상 4 서비스 import 실측 · 코드/DB/package 변경 0 · GlycoPharm 무접촉.*
