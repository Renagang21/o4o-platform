# CHECK — WO-O4O-POP-HUB-LIBRARY-HANDOFF-TO-V2-CANONICAL-V1

> **상태**: DONE · **작업일**: 2026-09-10 · **브랜치**: `work/pop-hub-library-handoff-v2-v1`
> **기준점**: `origin/main` = `38377ed87`

기존 HUB / 자료함에서 legacy POP 화면으로 보내던 handoff 를 **POP V2 canonical document 생성 흐름**으로 이관했다.
legacy generate endpoint (`POST /{svc}/pharmacy/pop/generate`) 와 legacy POP page 는 이번 회차에서 제거하지 않았다.

---

## §1 기준점

| 항목 | 값 |
|---|---|
| 정본 흐름 | Content → POP V2 Document → Renderer → PDF / PNG |
| 전용 worktree | `C:\tmp\o4o-pop-handoff-v2` |
| schema / migration | **0건** |
| legacy backend · page 삭제 | **0건** (§15 준수) |

---

## §2 handoff caller 전수 census (작업 전)

| # | 서비스 | 위치 | 진입 | 전달 계약 |
|---|---|---|---|---|
| 1 | KPA | `pages/pharmacy/HubPopLibraryPage.tsx` "POP 만들기" | `/store/marketing/pop` | state 없음 |
| 2 | KPA | `pages/pharmacy/PharmacyPopPage.tsx` "POP 출력" | `/store/marketing/pop` | state 없음 |
| 3 | KPA | `pages/pharmacy/PharmacyPopPage.tsx` "이 POP으로 제작" | `/store/marketing/pop` | `prefillPop{title,content,excerpt}` |
| 4 | KPA | `pages/pharmacy/productionTargets.tsx` (자료함 → StartProductionModal) | `/store/marketing/pop` | `ProductionRouterState` |
| 5 | KPA | `pages/pharmacy/ProductPopBuilderPage.tsx` (legacy compat route) | `/store/marketing/pop` | `ProductionRouterState(origin='local')` |
| 6 | 공통 Core | `StoreProductionMaterialsView` CROSS_CREATE `pop` | `/store/marketing/pop` | state 없음 |
| 7 | 공통 Core | `StoreLocalProductsManager` 기본 `onCreatePop` | `/store/marketing/pop` | `ProductionRouterState(origin='local')` |
| 8 | 공통 Core | `ProductMarketingView.handleCreatePop` | `/store/marketing/pop` | `ProductionRouterState(origin='library'\|'local')` |
| 9 | 공통 Core | `StorePopStaffView` "POP 출력" / "이 POP으로 제작" | `/store/marketing/pop` | 없음 / `prefillPop` |
| 10 | KCos | `pages/hub/HubPopLibraryPage.tsx` footerNote | `/store/marketing/pop` | state 없음 |
| 11 | KCos | `pages/store/StoreLibraryContentsPage.tsx` (자료함 → StartProductionModal) | `/store/marketing/pop` | `ProductionRouterState` |
| 12 | KCos | `pages/store/ProductPopBuilderPage.tsx` (legacy compat route) | `/store/marketing/pop` | `ProductionRouterState(origin='local')` |

- KPA 5곳 = #1 · #2+#3 · #4 · #5 + 공통 Core 경유(#6~#9).
- KCos 2곳 = #10 · #11 (+ #12 동일 축).
- PH: `LibraryPage` 는 `CROSS_LINKS=[content, blog]`, `LocalProductsPage` 는 `onCreatePop: null` 이라 POP 진입 자체가 없다 → **PH 전용 handoff 본체 불필요**(§10).

---

## §3 `ProductionRouterState` 4분류

| 필드 | 판정 | 근거 |
|---|---|---|
| `production.source.items[].id` | **REQUIRED_BY_V2** | source identity. V2 source resolver 의 입력 |
| `production.source.items[].origin` | **REQUIRED_BY_V2** | 어느 원장을 읽을지 결정. `PopV2SourceOrigin` 과 어휘 일치 |
| `production.source.items[].title` | **DERIVABLE_IN_V2** | 서버가 다시 읽는다. 표시용 hint 로만 남긴다 (`suggestedTitle`) |
| `production.source.items[].description` | **DERIVABLE_IN_V2** | 동일. handoff 에 싣지 않는다 |
| `production.source.fromLibrary` | **UNUSED** | 진입 탭 표시값. `origin` 이 이미 원장을 식별한다 |
| `production.target` | **LEGACY_ONLY** | V2 route 자체가 target 이다 |
| `production.selectedTemplateId` | **LEGACY_ONLY** | V2 는 adapter 의 `defaultTemplateId` + 편집기 내 템플릿 선택을 쓴다 |
| `items[]` 배열 다중성 | **LEGACY_ONLY** | V2 문서는 source 1건으로 시작. legacy 수신부도 단건만 소비했다 |
| `prefillPop.{title,content,excerpt}` | **LEGACY_ONLY** | 본문을 router state 로 옮기던 경로. `origin:'store_pop'` + id 로 대체 |

→ **`ProductionRouterState` 를 그대로 복제하지 않았다.** 신설 계약은 4필드(`sourceKind`·`origin`·`sourceId`·`suggestedTitle?`)다.

---

## §4 V2 handoff 계약 (신설)

`packages/store-ui-core/src/components/pop-v2/handoff.ts`

```ts
type PopV2HandoffInput =
  | { sourceKind: 'content'; origin: 'direct'|'snapshot'|'library'|'store_pop'; sourceId: string; suggestedTitle?: string }
  | { sourceKind: 'product'; origin: 'listing'|'local';                        sourceId: string; suggestedTitle?: string };

POP_V2_HANDOFF_STATE_KEY = 'popV2Handoff'
CANONICAL_STORE_POP_V2_ROUTE = '/store/marketing/pop-v2'
buildPopV2HandoffState() / parsePopV2HandoffState() / usePopV2Handoff() / popV2HandoffFromProductionItem()
```

원칙 준수

- 원본 Content SSOT write **0** — source resolver 는 읽기 전용 (I2).
- 본문·이미지·QR 을 router state 에 싣지 않는다. 식별자만 넘기고 서버가 다시 해석 (§6).
- `snapshotSeed` · `qrId` · `origin metadata` 는 **채택하지 않았다**. 공급하는 caller 가 0이며 §4 는 최소 계약을 요구한다.
- 저장 전에는 canonical POP Document 가 아니다 — `usePopV2Editor` 는 새 문서(`documentId` 없음)에서만 seed 하고, `usePopV2Handoff` 가 history state 를 1회 소비 후 비운다(목록 복귀 후 재주입 방지).

---

## §5 HUB POP semantics — frozen copy (중지조건 2 미발동)

`importOperatorPop` 은 운영자 원본을 매장 소유 **초안 사본**(`store_pops`)으로 복사한다.
KPA·KCos 문구 모두 "초안 사본"이며 HUB 목록은 운영자 원본의 **읽기 전용 진열**이다.
→ live-link semantics 요구 없음. **`store_pops` HUB 축은 변경하지 않았다** (테이블·API·복사 흐름 무변경).
POP V2 는 `store_pops` 를 **source 로만** 읽고 문서 원장으로 재사용하지 않는다.

---

## §6~§7 콘텐츠 / 상품 handoff

- 콘텐츠: `origin` + `id` 만 전달 → `GET /sources/content/:origin/:id` 가 재해석.
- **backend 보강 1건**: `apps/api-server/src/services/store/pop-v2-source.service.ts` 에
  자료함 콘텐츠 원장 `AssetSnapshot`(`origin='snapshot'`) 의 목록·해석 분기를 추가했다.
  `'snapshot'` 은 이미 `PopV2SourceOrigin` union 멤버였고 resolver 분기만 없었다 →
  **schema/migration 0 · 읽기 전용 · 신규 endpoint 0** (중지조건 3 미발동).
- 상품: `sourceKind='product'` + `origin='local'|'listing'` → 기존 product source resolver.
  fallback chain(product-linked store content → STORE canonical → product basic info) 무변경,
  **B2B/B2C 자동 fallback 추가 0**.

---

## §8~§9 KPA 5곳 / KCos 2곳 전환 결과

| caller | 전환 후 |
|---|---|
| KPA HubPopLibraryPage "POP 만들기" | `/store/marketing/pop-v2` (소스 없이 진입) |
| KPA PharmacyPopPage "POP 출력" | `CANONICAL_STORE_POP_V2_ROUTE` |
| KPA PharmacyPopPage "이 POP으로 제작" | V2 + `{content, store_pop, item.id}` |
| KPA productionTargets `pop` | route → `pop-v2`, `handoffToPopV2: true`, `supportsTemplates: false` |
| KPA/KCos ProductPopBuilderPage | V2 + `{product, local, productId}` |
| Core StoreProductionMaterialsView | CROSS_CREATE `pop` → `CANONICAL_STORE_POP_V2_ROUTE` |
| Core StoreLocalProductsManager | V2 + `{product, local, product.id}` |
| Core ProductMarketingView | 활성 자료함 자료 → `{content, library}` / 없으면 `{product, local}` |
| Core StorePopStaffView | "POP 출력" → V2, "이 POP으로 제작" → `{content, store_pop}` (prefillPop 제거) |
| KCos HubPopLibraryPage footerNote | 사본 수정·발행 화면(`/store/marketing/pop/library`) 로 교정 |
| KCos StoreLibraryContentsPage `pop` target | route → `pop-v2`, `handoffToPopV2: true` |

공통 seam: `StartProductionTargetConfig.handoffToPopV2` — **대상 config 값**이며 serviceKey 분기가 아니다.
KPA·KCos·PH adapter 3곳의 `StorePopV2Page` 는 `usePopV2Handoff()` 로 handoff 를 받아 편집기로 직행한다.

**중지조건 5 미발동**: KPA·KCos 의 HUB/자료함 handoff 의미는 동일하다
(같은 `HubImportLibraryView` / `useHubImportLibrary` / `StoreLibraryContentsView` / `StartProductionModal`,
차이는 라벨·accent·serviceKey·template id 뿐).

---

## §11 legacy caller 재계수

| 축 | 작업 전 | 작업 후 |
|---|---:|---:|
| KPA HUB·자료함 handoff legacy caller | 5 | **0** |
| KCos HUB·자료함 handoff legacy caller | 2 | **0** |
| 공통 Core handoff legacy caller | 4 | **0** |
| `prefillPop` 을 **생성**하는 caller | 2 | **0** |
| legacy generate API caller | 3 | **3** (의도적 유지 — 다음 회차 ③) |

작업 후에도 남아 있으나 **이번 회차 범위 밖**인 legacy 참조

| 위치 | 성격 |
|---|---|
| `services/web-kpa-society/src/components/store/StorePopCreateModal.tsx` | 자료함 인라인 즉시 PDF 생성 축 — 다음 회차 ③ |
| KPA · KCos `StorePopPage.tsx` | legacy POP page 본체 (`prefillPop` 수신부 포함) |
| `packages/store-ui-core/src/components/pop/popHelpers.ts` | legacy page 전용 `prefillPop` 파서 |
| `packages/shared-space-ui/src/guide/copy/{kpa,k-cosmetics,pharmacy-hub}.ts` | 가이드 문구의 route 안내 |
| `packages/store-ui-core/src/utils/productionUtils.ts` `CANONICAL_STORE_POP_ROUTE` | legacy page 상수 (소비처 0) |

---

## §12 old route 판정 (삭제 없음 · 410 없음)

| route | 판정 |
|---|---|
| KPA `/store/marketing/pop` · KCos `/store/marketing/pop` | **KEEP_TEMPORARY** — legacy 즉시 PDF 축이 아직 살아 있다 |
| KPA `/store/pop` · KCos `/store/pop` (Navigate redirect) | **KEEP_TEMPORARY** — 북마크 호환 |
| KPA/KCos `/store/commerce/products/:id/pop` (ProductPopBuilderPage) | **REDIRECT_TO_V2** — 이번 회차에 V2 로 수렴 완료 |
| `POST /{svc}/pharmacy/pop/generate` | **KEEP_TEMPORARY** — 다음 회차 ③ 이후 `RETIRE_READY` 재판정 |
| `CANONICAL_STORE_POP_ROUTE` 상수 | **RETIRE_READY** — 소비처 0, 삭제는 다음 회차 |

---

## §13 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` — web-kpa-society | **PASS** (0 error) |
| `tsc --noEmit` — web-k-cosmetics | **PASS** (0 error) |
| `tsc --noEmit` — web-pharmacy-hub | **PASS** (0 error) |
| `tsc --noEmit` — apps/api-server | **PASS** (0 error) |
| `vitest run --config packages/store-ui-core/vitest.config.mjs` | **PASS** 5 files / 65 tests |
| 신규 계약 spec `popV2Handoff.contract.test.ts` | **PASS** 15 tests |
| eslint (변경 Core 7파일) | error 0 (기존 warning 2건 — 본 변경과 무관) |
| organization isolation | 무변경 — 모든 V2 source 조회가 `organizationId` scope |
| source original immutability | 무변경 — resolver read-only |
| B2B·B2C 자동 fallback | **0** |
| 공통 Core 내 serviceKey 조건 | **0** (spec 으로 고정) |
| `store_pops` HUB 축 | **PRESERVED** |
| direct V2 creation 회귀 | 없음 — handoff 없으면 기존 목록→새 POP 동선 그대로 |
| schema / migration | **0** |

---

## §17 완료 조건

```text
KPA HUB/LIBRARY HANDOFF TO V2   = PASS
KCOS HUB/LIBRARY HANDOFF TO V2  = PASS
V2 HANDOFF CONTRACT             = PASS
STORE_POPS HUB AXIS             = PRESERVED
CONTENT ORIGINAL IMMUTABILITY   = PASS
LEGACY HUB/LIBRARY CALLERS      = 0
SCHEMA CHANGE                   = 0
PRODUCTION E2E                  = PASS (§14 — 아래)
```

## §14 Production E2E (2026-09-10 실행)

배포 확인: web deploy success · API deploy success(run `34449986961`, 커밋 `48631bab2` 포함).

### KPA (`https://kpa-society.co.kr`, 매장 "테스트 약국 매장")

| # | caller | 경로 | 결과 |
|---|---|---|---|
| 1 | HUB POP 자료함 | `/store-hub/pop` → "POP 만들기" | **PASS** — `/store/marketing/pop-v2` 목록 모드 (handoff state 없음 = 목록) |
| 2 | 자료함 콘텐츠 | `/store/library/contents` → 커뮤니티(스냅샷) 항목 → "제작 시작" → POP → 다음 | **PASS** — V2 편집 모드 진입, `origin:'snapshot'` resolver 가 제목·핵심 문구·본문 seed |
| 3 | 매장 자체 상품 | `/store/commerce/local-products` → "POP 만들기" | **PASS** — 상품 탭 + 해당 상품 선택 + "기본 문구 출처: 상품 기본정보"(§7 fallback ③). B2B/B2C 자동 fallback 0 |
| 4 | legacy POP page | `/store/marketing/pop` | **handoff caller 0** — 남은 진입은 `/store/library/contents` 링크뿐 (§12 KEEP_TEMPORARY 유지) |

저장 → 목록 재로딩 → 재편집 → 출력:

| 단계 | 결과 |
|---|---|
| 저장 | **PASS** — "POP 을 저장했습니다." · 헤딩 `새 POP 만들기` → `POP 수정` |
| 목록 재로딩 | **PASS** — POP 관리 목록에 "출력 완료" 배지로 노출 |
| 재편집 | **PASS** — 저장 내용(이름·제목·핵심 문구·본문) 그대로 복원 |
| PDF 출력 | **PASS** — 실제 `.pdf` 산출 |
| PNG 출력 | 산출은 성공하나 파일이 실제 `.webp` — **범위 밖 기지 결함**(재현 확인) |

console error 0 / pageerror 0 / dead link 0 / 4xx·5xx **0**.

### K-Cosmetics (`https://k-cosmetics.site`, `renagang21@gmail.com` = `cosmetics:store_owner`)

| # | caller | 경로 | 결과 |
|---|---|---|---|
| 1 | HUB POP 자료함 | `/store-hub/pop` → "내 매장 POP 사본 관리" → "POP 출력" | **PASS** — `/store/marketing/pop-v2` 진입 |
| 2 | 자료함 콘텐츠 | `/store/library/contents` → "제작 시작" → POP → 다음 | **라우팅·state 전달 PASS**, source 해석은 404 (원인 아래) |

저장 → 목록 재로딩 → 재편집 → 출력 (KCos org 소유 콘텐츠 기준):

| 단계 | 결과 |
|---|---|
| 저장 | **PASS** — `POST /cosmetics/pharmacy/pop-v2` 201 · `PUT` 200 |
| 목록 재로딩 | **PASS** — "출력 완료" 배지 |
| 재편집 | **PASS** — 저장 내용 그대로 복원 |
| PDF 출력 | **PASS** — `POST .../render` 200, 실제 `.pdf` |

console error 0 / pageerror 0 / dead link 0.
4xx·5xx = **1건** — `GET /cosmetics/pharmacy/pop-v2/sources/content/snapshot/{id}` 404.

### 그 404 의 원인 — 범위 밖 기지 결함(본 회차 변경과 무관)

`apps/api-server/src/routes/cosmetics/cosmetics.routes.ts` 가 `/assets` 에
**KPA 전용** `createAssetSnapshotController`(`sourceService:'kpa'`, `resolveKpaOrgId`)를 그대로 마운트한다.
그 결과 KCos 자료함 목록(`GET /cosmetics/assets?type=content`)은 **사용자의 KPA 약국 org 스냅샷**을 돌려주고,
POP V2 resolver 는 계약대로 **KCos organizationId** 로 조회하므로 그 id 를 찾지 못한다(404).

- V2 handoff 계약 쪽 결함이 아니다. resolver 의 org scope 는 의도대로 동작한다(오히려 cross-org 유출을 막았다).
- 이 라우트는 본 회차에서 변경하지 않았다(직전 커밋 `066e9545b`).
- 사용자가 이미 **"KCos library scope/404 문제"** 로 범위 밖 지정한 항목과 같은 축이므로 수정하지 않고 기록만 한다.

---

## 범위 밖 (변경하지 않음)

legacy backend 삭제 · legacy page 삭제 · `StoreContentsSelector` 인라인 생성 이관 ·
`store_pops` 변경 · historical output 삭제 · POP Placement · Store Corner entity · schema/migration.

별도 품질 정리 대상(이 체인에 섞지 않음): PNG 출력이 실제 `.webp` 인 문제 · KCos library scope/404 문제.

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
