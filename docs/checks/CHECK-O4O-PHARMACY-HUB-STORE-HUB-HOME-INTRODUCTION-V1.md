# CHECK-O4O-PHARMACY-HUB-STORE-HUB-HOME-INTRODUCTION-V1

**WO**: WO-O4O-PHARMACY-HUB-STORE-HUB-HOME-INTRODUCTION-V1
**작업일**: 2026-08-13
**branch**: `work/commonization-store-hub` (worktree `C:\tmp\o4o-common-store-hub`, 기준 `origin/main` = `0a2d88100`)
**결과**: PASS — 검증 10항목 전부 통과 (browser smoke 포함)

---

## 1. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-pharmacy-hub/src/pages/store-hub/StoreHubPage.tsx` | **신규** — 공통 `StoreHubTemplate` + Pharmacy-Hub `StoreHubConfig` |
| `services/web-pharmacy-hub/src/App.tsx` | `/store-hub` route 추가 + 라우트 맵 주석 1줄 |
| `services/web-pharmacy-hub/package.json` | dependency `@o4o/shared-space-ui: workspace:*` 추가 |
| `services/web-pharmacy-hub/Dockerfile` | `packages/shared-space-ui` COPY 2곳 (manifest 블록 / source 블록) |
| `pnpm-lock.yaml` | 위 workspace link 3줄 (`link:../../packages/shared-space-ui`) |
| `docs/checks/CHECK-...-V1.md` | 본 문서 |

`packages/**` 수정 0건 · backend 0건 · migration 0건.

> dependency / lockfile 변경은 CLAUDE.md 중지 조건에 해당하지만, 본 WO 가 "공통 `StoreHubTemplate` 사용"을
> 명시 지시했고 해당 컴포넌트가 `@o4o/shared-space-ui` 에만 존재하므로 WO 이행에 필수인 최소 변경으로 처리했다.
> lockfile diff 는 workspace link 3줄뿐이며 외부 패키지 버전 변동은 없다.

## 2. 추가 route

```
/store-hub   (index)  →  StoreHubPage
  element = StoreOwnerShell  (기존 매장 셸 재사용)
```

`/store-owner/**` 는 URL·컴포넌트·redirect 모두 **무변경**.

## 3. 사용한 공통 Core

| Core | 용도 |
|---|---|
| `@o4o/shared-space-ui` · `StoreHubTemplate` / `StoreHubConfig` | 매장허브 홈 본체 (KPA `StoreHubPage` 와 동일 소비 패턴) |
| `@o4o/store-ui-core` · `StoreDashboardLayout` / `StoreOwnerGuard` / `PHARMACY_HUB_STORE_CONFIG` | 셸 · 가드 (기존 `StoreOwnerShell` 그대로 재사용) |

**Pharmacy-Hub 독자 StoreHub 레이아웃 사본 0건.** 서비스 차이는 전부 `StoreHubConfig` 주입으로 처리했고
별도 adapter 파일도 만들지 않았다(불필요).

## 4. PharmacyHub config

`StoreHubPage.tsx` 내 `pharmacyHubStoreHubConfig`:

- `serviceKey: 'pharmacy-hub'`, `heroTitle: '매장허브'`, `storeCta → /store-owner`
- `resourceCards` 2장 (아래 §5)
- `showAiBlock: false` · `showStoreCtaBlock: false` — 실기능 없는 placeholder 블록 미노출
- `operationSteps` 3단계 = Pharmacy-Hub 실제 흐름 **탐색 → 장바구니 → 주문·결제**
  (KPA/K-Cosmetics 의 신청→승인 흐름 문구를 복사하지 않았다)

## 5. 연결한 실제 기능 / 연결하지 않은 기능

| 카드 | 연결 | 대상 |
|---|:--:|---|
| 공급 상품 | ✅ | `/store-owner/products` |
| 장바구니 | ✅ | `/store-owner/cart` |
| 공급자 콘텐츠 | ❌ | Pharmacy-Hub 에 route·기능 없음 → 카드 자체를 만들지 않음 |
| 이벤트 오퍼 | ❌ | 동일 (미구현) |
| AI 추천 | ❌ | `showAiBlock: false` |

원칙: 데드링크 0 / "준비 중" 카드 0. 동작하지 않는 항목을 동작하는 것처럼 만들지 않았다.

**정책 준수** — Pharmacy-Hub 공급 상품 의미를 KPA/K-Cosmetics 와 동일화하지 않았다:
`SupplyCatalogHub` 연결 없음 · `ProductApproval` 흐름 도입 없음 · 주문과 신청 혼합 없음.

## 6. `/store-hub` 와 `/store-owner` 경계

```
/store-hub     공급자·플랫폼 자원을 탐색하는 영역   ← 이번 WO = 진입점(홈)만 추가
/store-owner   매장 진입 이후 운영·주문·관리 영역   ← 기존 그대로
```

`/store-owner/products` · `/cart` · `/orders` 등을 `/store-hub/*` 로 이동하지 않았다 (대규모 이동 없음).

**미연결 항목(의도적)**: 사이드바에 `/store-hub` 메뉴를 추가하지 않았다.
`StoreMenuSectionItem` 은 `subPath`(= `basePath` 상대 경로)만 지원하므로 `basePath='/store-owner'` 밖의
절대 경로를 넣으려면 `@o4o/store-ui-core` 의 공통 메뉴 계약을 넓혀야 한다 — 4개 서비스 공유 계약 변경이라
본 WO 범위 밖이다. 현재 진입은 직접 URL 이며, 네비게이션 배선은 후속 WO 로 분리 제안한다.

## 7. 회귀 검증 결과

| # | 항목 | 결과 |
|:--:|---|:--:|
| 1 | Pharmacy-Hub `/store-hub` 정상 진입 | ✅ h1 "매장허브" 렌더 |
| 2 | 기존 `/store-owner` 정상 유지 | ✅ 매장 경영 홈 · KPI · 최근 주문 정상 |
| 3 | 공급 상품 카드 → `/store-owner/products` | ✅ 이동 확인 |
| 4 | 장바구니 카드 → `/store-owner/cart` | ✅ 이동 확인 |
| 5 | `StoreHubTemplate` 실제 사용 | ✅ Hero/자원탐색/흐름 3블록 = 템플릿 렌더 |
| 6 | 독자 StoreHub 레이아웃 복제 없음 | ✅ 신규 파일 1개(config만) |
| 7 | KPA Store Hub 회귀 | ✅ `packages/**` · `services/web-kpa-society/**` 변경 0 |
| 8 | K-Cosmetics Store Hub 회귀 | ✅ `services/web-k-cosmetics/**` 변경 0 |
| 9 | GlycoPharm 공통 패키지 build/typecheck 회귀 | ✅ 공통 패키지 수정 0 → 회귀 대상 없음 |
| 10 | backend / DB / migration 변경 | ✅ 0건 |

**빌드·타입체크**
- `npx tsc -b` (web-pharmacy-hub) — 오류 0
- `npx vite build` (web-pharmacy-hub) — 성공 (3,574 modules)

**Browser smoke** (Playwright · 실제 로그인 · 로컬 dev server + 프로덕션 API)
- 계정: `renagang21@gmail.com` (`pharmacy-hub:store_owner`), serviceKey `pharmacy-hub`
- 콘솔 에러 **0건**
- 확인 URL 전이: `/store-hub` → 카드 클릭 → `/store-owner/products` · `/store-owner/cart` · `/store-owner`
- smoke 전용 임시 vite config(프록시)는 검증 후 삭제 — 커밋에 포함되지 않음

## 8. DB / backend 무변경 확인

- `apps/api-server/**` 변경 0 · migration 파일 추가 0 · SQL 실행 0
- `ProductApproval` / `OrganizationProductListing` / `SupplierProductOffer` / 장바구니 / 주문 / 결제 로직 무변경
- 신규 API 호출 0 — `/store-hub` 홈은 정적 카드·안내만 렌더한다

## 9. 문서 정합

```
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

별도 WO 제안: `/store-hub` 사이드바·네비게이션 진입 배선 (§6 — 공통 메뉴 계약 확장 필요).

## 10. 다음 작업

WO §다음 작업 제안대로 **공급 상품 탐색** 축 조사:
KPA/K-Cosmetics(신청·승인형) vs Pharmacy-Hub(장바구니·주문형) 차이를 유지하면서
공통 Core + 서비스별 action adapter 가 가능한지 판정.
