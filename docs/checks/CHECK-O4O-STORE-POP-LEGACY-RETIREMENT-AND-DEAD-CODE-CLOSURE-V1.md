# CHECK-O4O-STORE-POP-LEGACY-RETIREMENT-AND-DEAD-CODE-CLOSURE-V1

**WO**: `WO-O4O-STORE-POP-LEGACY-RETIREMENT-AND-DEAD-CODE-CLOSURE-V1`
**작성일**: 2026-09-10
**기준 커밋**: `3c0545015` (origin/main)
**작업 worktree/branch**: `C:/tmp/o4o-store-pop-v2` · `work/store-pop-legacy-retirement-v1`

**판정: `STOPPED_AT_CENSUS` — 중지 조건 2 · 3 발동. 코드 제거 0건.**

---

## 1. 기준점

| 항목 | 결과 |
|---|---|
| HEAD == origin/main | PASS (`3c0545015`) |
| working tree | clean |
| 전용 worktree/branch | PASS |
| 병렬 POP 세션 점유 | 없음 (`C:/tmp/o4o-store-exec-home` = `work/store-pop-real-world-usage-audit-v1` clean) |

---

## 2. 정본 고정 (§2)

```text
Content → store_pop_documents → POP V2 renderer → PDF/PNG
```

POP V2 는 KPA `/kpa/pharmacy/pop-v2` · PH `/pharmacy-hub/store-owner/pop-v2` 양측
production E2E CLOSED 상태다 (`CHECK-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1` §8).

---

## 3. 레거시 census (최신 main 전수)

WO 는 "기존 POP = 즉시 PDF 생성 축 1개"를 전제했으나, 실측 결과 **POP 이라는 이름 아래 서로 다른
4개 축**이 공존하며 그중 3개가 살아 있다. 축별 판정은 아래와 같다.

### 축 1 — 즉시 PDF 생성 (`POST /{svc}/pharmacy/pop/generate`)

| 대상 | 판정 | 근거 |
|---|---|---|
| `routes/o4o-store/controllers/store-pop.controller.ts` | **KEEP** | 활성 consumer 3개 (아래) |
| `services/pop-generator.service.ts` | **KEEP** | 위 controller 전용 |
| `packages/store-ui-core/src/components/pop/*` (`StorePopComposerView` 외 11 파일) | **KEEP** | KCos `StorePopPage` 가 소비 |
| KPA `pages/pharmacy/StorePopPage.tsx` (`/store/marketing/pop`) | **DEFER** | V2 대체 대상이나 handoff 목적지 5곳 (§7) |
| KPA `api/storePop.ts` + `components/store/StorePopCreateModal.tsx` | **KEEP_UNRELATED** | `StoreContentsSelector` 인라인 POP 생성 = 별도 활성 기능 |
| KCos `pages/store/StorePopPage.tsx` (`/store/marketing/pop`) | **KEEP_TEMPORARY** | KCos 는 V2 미채택 (§6) |

`POST /pharmacy/pop/generate` 의 실 consumer 3개 (전수):

```text
services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx:359     (KPA 매장 POP 화면)
services/web-kpa-society/src/api/storePop.ts:36                      (KPA 콘텐츠 목록 인라인 POP 생성)
services/web-k-cosmetics/src/pages/store/StorePopPage.tsx:59         (KCos 매장 POP 화면)
```

controller 는 `kpa.routes.ts:480` · `cosmetics.routes.ts:202` 두 곳에 mount 되어 있다.
**KPA mount 만 제거해도 KCos mount 가 같은 controller/service/컴포넌트를 계속 필요로 한다.**

### 축 2 — `store_pops` (operator/HUB 게시 + 매장 사본) — WO §6 보호

| 대상 | 판정 |
|---|---|
| `operator-pop.controller.ts` (`/operator/pop/posts/*`) | KEEP_UNRELATED |
| `pop.controller.ts` (`/stores/:slug/pop/staff/*`) | KEEP_UNRELATED |
| `services/store/store-pop.service.ts` · `entities/store-pop.entity.ts` | KEEP_UNRELATED |
| `20261029000000-CreateStorePops.ts` | KEEP_UNRELATED |
| `PharmacyHubStorePopController` (`/pharmacy-hub/store-owner/pop/*`) | KEEP_UNRELATED |
| KPA `PharmacyPopPage` · `HubPopLibraryPage` | KEEP_UNRELATED |
| PH `pages/store-owner/PopPage.tsx` | KEEP_UNRELATED |
| KCos `StorePopStaffPage` · `HubPopLibraryPage` · `OperatorPop*Page` | KEEP_UNRELATED |

**PH `/store-owner/pop` 은 즉시 PDF 축이 아니다.** `store_pops` 원장을 쓰는 HUB 사본 관리이며,
KPA 의 대응물은 `/store/marketing/pop` 이 아니라 `/pharmacy/content/pop`(`PharmacyPopPage`) 이다.
PH 에는 즉시 PDF 생성 consumer 가 **0건**이다 — 즉 PH 쪽 legacy 제거 대상은 애초에 없다.

### 축 3 — Product POP PDF (`GET /api/v1/products/:productId/pop/:layout`)

| 대상 | 판정 |
|---|---|
| `modules/store-ai/controllers/product-pop-pdf.controller.ts` · `services/product-pop-pdf.service.ts` | **KEEP_UNRELATED** |
| `apps/admin-dashboard` `api/pop.api.ts` · `PopCreatePage` · `PopListPage` | KEEP_UNRELATED |
| KPA · KCos `ProductPopBuilderPage` | KEEP_UNRELATED |

ProductMaster 기준 상품 POP 빌더로, 원장·입력·소비자가 매장 실행 자산 축과 모두 다르다.
WO 범위(매장 즉시 PDF 생성) 밖이며 admin 포함 3개 consumer 가 살아 있다.

### 축 4 — POP V2 (정본)

`store-pop-v2.controller.ts` · `pop-v2-{document,renderer,source}.service.ts` ·
`store-pop-document.entity.ts` · `packages/store-ui-core/src/components/pop-v2/*` ·
KPA/PH `StorePopV2Page` · `popV2.ts` — 전부 CANONICAL.

---

## 4. `resolvePop` (WO §5) — **NOT_PRESENT**

WO 는 "`asset-snapshot.controller.ts` 의 `resolvePop` 가 항상 null 을 반환하는 dead placeholder"
라고 전제했으나, **`resolvePop` 라는 함수는 저장소에 존재하지 않는다.**

```text
grep -rn "resolvePop\s*(" apps/api-server/src --include=*.ts   → 정의 0건
```

`resolvePop` 문자열은 **주석 4곳**에만 남아 있다
(`asset-snapshot.controller.ts:79`, `kpa-asset.resolver.ts:76,155,204`).
`KpaAssetResolver.resolve()` 의 실제 분기는 `cms` · `signage` · `content` 3종뿐이고,
`'pop'` 은 `allowedAssetTypes` 배열의 원소로만 존재해 분기 없이 `SOURCE_NOT_FOUND` 로 떨어진다.

**`allowedAssetTypes` 에서 `'pop'` 제거는 안전하지 않다.** 이 배열은 copy 뿐 아니라
목록 조회(`GET /assets?type=`)의 allowlist 로도 쓰여, 제거 시 해당 타입 조회가 400 이 된다
(`lesson` · `resource` 선례가 코드 주석에 명시돼 있다). 따라서:

| 대상 | 판정 |
|---|---|
| `resolvePop` 함수 | **NOT_PRESENT** — 제거할 코드 없음 |
| `allowedAssetTypes` 의 `'pop'` | **KEEP** — 제거 시 조회 400 회귀 |
| 주석 4곳의 `resolvePop` 언급 | DEAD_REMOVE 가능하나 이번 중지로 미실행 |

---

## 5. `store_pops` (WO §6) · historical output (WO §7)

- `store_pops` — 삭제·수정 0건. 관련 route/service/entity/migration 미접촉. **PRESERVED**
- `store_execution_assets(usage_type='pop')` — 삭제·backfill 0건. **PRESERVED**
  - writer 2: `store-pop-v2.controller.ts:336` (V2 정본) · `store-pop.controller.ts:439` (legacy, KCos·KPA 인라인이 사용 중)
  - reader 1: KPA `StorePopPage.tsx:136` (`getStoreExecutionAssets({usageType:'pop'})`)
  - legacy writer 는 활성 consumer 가 있어 제거 불가 — WO §7 단서의 "더 이상 사용하지 않는다면" 조건 불성립

---

## 6. KCos (WO §8) — **KEEP_TEMPORARY**

KCos `/store/marketing/pop` 은 production route 로 살아 있고 `POST /cosmetics/pharmacy/pop/generate`
를 직접 호출한다. KCos 는 POP V2 를 채택하지 않았다 (KCos 에 `pop-v2` route·adapter 0건).
따라서 축 1 의 backend·공통 컴포넌트를 제거하면 KCos 기능이 깨진다.

---

## 7. 중지 판정 (WO §16)

| # | 조건 | 발동 | 근거 |
|---|---|:---:|---|
| 1 | legacy API 외부 consumer 가능성 | 부분 | 외부 계약은 아니나 내부 활성 consumer 3개 |
| 2 | **KCos 가 old POP 에 실제 의존** | **YES** | §6 |
| 3 | **operator/HUB ↔ 매장 POP 경계가 코드상 미분리** | **YES** | 아래 |
| 4 | historical asset 삭제 필요 | NO | |
| 5 | schema DROP 필요 | NO | |
| 6 | 병렬 세션 파일 충돌 | NO | |

**조건 3 의 실측 근거** — WO §6 이 보호하라고 지정한 `store_pops` HUB 축이,
은퇴 대상인 KPA 즉시 PDF 화면(`/store/marketing/pop`)을 **목적지로 직접 navigate** 한다:

```text
pages/pharmacy/HubPopLibraryPage.tsx:74        navigate('/store/marketing/pop')
pages/pharmacy/PharmacyPopPage.tsx:315         navigate('/store/marketing/pop')
pages/pharmacy/PharmacyPopPage.tsx:447         navigate('/store/marketing/pop', { state })
pages/pharmacy/productionTargets.tsx:105       route: '/store/marketing/pop'
components/store/StorePopCreateModal.tsx:115   navigate('/store/marketing/pop')
```

`PharmacyPopPage.tsx:447` 은 `ProductionRouterState` 를 실어 보내는 제작 handoff 다.
POP V2 화면은 이 router state 계약을 받지 않고, historical `store_execution_assets` 목록도
보여주지 않는다 — **드롭인 대체가 아니다.** 지금 KPA 화면을 은퇴시키면 보호 대상인 HUB 축의
진입 5곳이 dead link 가 된다.

---

## 8. 이번 WO 산출물

| 항목 | 결과 |
|---|---|
| 코드 변경 | **0건** |
| schema 변경 / migration | **0건** |
| production data 변경 | **0건** |
| 문서 | 본 CHECK 신규 1건 |

---

## 9. 완료 조건 대비 현재값 (WO §17)

```text
POP V2 CANONICAL ONLY (KPA/PH) = NOT_MET     (KPA 는 legacy 화면 병존, PH 는 이미 충족)
LEGACY STORE POP PATH          = NOT_RETIRED (활성 consumer 3)
DEAD resolvePop                = NOT_PRESENT (제거할 함수 없음)
STORE_POPS HUB AXIS            = PRESERVED
HISTORICAL POP OUTPUT          = PRESERVED
KCOS REGRESSION                = N/A (미변경)
SCHEMA CHANGE                  = 0
PRODUCTION REGRESSION          = N/A (미배포)
```

---

## 10. 후속 제안 (사용자 판단 필요)

레거시 은퇴를 실제로 닫으려면 **선행 분해**가 필요하다. 순서 제안:

1. **KCos POP V2 채택** — 축 1 backend·공통 컴포넌트 제거의 선행조건.
2. **KPA handoff 5곳의 목적지 재지정** — POP V2 가 `ProductionRouterState` 를 수용하도록
   확장하거나, HUB 축 handoff 를 `/pharmacy/content/pop` 로 돌린다.
3. **KPA 인라인 POP 생성(`StoreContentsSelector`) 의 V2 이관** — `api/storePop.ts` 제거 선행조건.
4. 위 3개가 끝난 뒤에야 `store-pop.controller.ts` · `pop-generator.service.ts` ·
   `packages/store-ui-core/src/components/pop/*` 제거가 회귀 없이 가능하다.

`resolvePop` 은 별도 작업이 필요 없다 (존재하지 않음). 주석 4곳 정리는 임의 시점에 가능하다.

POP Placement 는 본 WO 및 후속 제안 어디에도 포함하지 않는다 (사용자 지시대로 보류).
