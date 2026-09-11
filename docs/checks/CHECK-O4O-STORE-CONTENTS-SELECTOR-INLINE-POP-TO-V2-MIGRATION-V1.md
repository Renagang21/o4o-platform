# CHECK-O4O-STORE-CONTENTS-SELECTOR-INLINE-POP-TO-V2-MIGRATION-V1

> **WO**: `WO-O4O-STORE-CONTENTS-SELECTOR-INLINE-POP-TO-V2-MIGRATION-V1`
> **상태**: CLOSED_WITH_REPORT · PRODUCTION E2E PASS
> **구현 commit**: `3558825f8` · 배포 run `34554966935` (Deploy Web Services · deploy-kpa-society) success · revision `kpa-society-web-01944-9f6`
> **기준 commit**: `origin/main` = `8b4a568b7` (worktree `work/store-contents-selector-pop-v2-v1`)
> **작성일**: 2026-09-11
> **선행**: `CHECK-O4O-KCOS-LIBRARY-CONTENT-BD-CANONICAL-REALIGNMENT-V1` (체인 ②) ·
> `CHECK-O4O-POP-HUB-LIBRARY-HANDOFF-TO-V2-CANONICAL-V1` (자료함 → POP V2 handoff 계약 · resolver origin 어휘) ·
> `CHECK-O4O-STORE-POP-LEGACY-RETIREMENT-AND-DEAD-CODE-CLOSURE-V1` (§ "KPA 인라인 POP 생성의 V2 이관 — `api/storePop.ts` 제거 선행조건")
> **후속(미착수)**: 체인 ④ legacy 즉시 PDF page/backend/service/common component 제거 · old route redirect/retire

---

## 0. 결론 (한 줄)

KPA `StoreContentsSelector` 의 인라인 "POP 만들기" 를 legacy 즉시 PDF 모달(`StorePopCreateModal` → `generateStorePop` → `POST /pharmacy/pop/generate`)에서
떼어내 **POP V2 canonical handoff**(`navigate(CANONICAL_STORE_POP_V2_ROUTE, {state: buildPopV2HandoffState(popV2HandoffFromProductionItem(...))})`)
로 바꿨다. router state 에는 **식별자(origin · sourceId)와 제목 힌트만** 싣고 본문은 V2 source resolver 가 다시 읽는다.
direct / execution-asset / snapshot 3 origin 이 V2 어휘 direct / library / snapshot 으로 1:1 매핑되며, 3종 모두 production resolver 200.
legacy page / API / service / 모달 파일은 **KEEP_TEMPORARY**(④ 제거 대상, `@deprecated` 표기만). schema · backend · KCos · PH · 공통 Core 무변경.

---

## 1. StoreContentsSelector consumer census (step 3)

| 위치 | 종류 | 판정 |
|---|---|---|
| `services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx` | 페이지 모드 렌더(유일한 mount) | **대상** |
| `services/web-kpa-society/src/components/store/ContentPdfExportModal.tsx` | 주석 참조만 | 무관 |
| `services/web-kpa-society/src/api/contentStoreImport.ts` | 주석 참조만 | 무관 |
| KCos (`web-k-cosmetics`) / PH (`web-pharmacy-hub`) / `packages/**` | import 0 | **소비처 없음** — KCos 자료함은 ② 의 B+D `StoreLibraryContentsView` 를 쓴다 |

→ 이관 영향 범위 = **KPA 1 페이지**. 공통 컴포넌트 변경 없음.

## 2. 인라인 POP caller 전수 · legacy generate payload 해부 (step 4 · 6)

인라인 모달이 실제로 보내던 것: `libraryItemIds | snapshotItemIds | directContentItemIds` 중 **하나만**(1건) + `layout` + `save:true` + `title`.

| `POST /pharmacy/pop/generate` 필드 | 분류 | 근거 |
|---|---|---|
| `directContentItemIds[0]` / `libraryItemIds[0]` / `snapshotItemIds[0]` | **REQUIRED_FOR_V2_HANDOFF** | → `sourceId` + `origin`(direct / library / snapshot) |
| `title` | **DERIVABLE_BY_V2_RESOLVER** | `suggestedTitle` 힌트로만 전달 · 실제 문서명·headline 은 resolver seed 후 편집기 소유 |
| `layout` · `templateId` · `aiContent` | **LEGACY_GENERATOR_ONLY** | V2 editor 가 레이아웃/템플릿/문구를 소유. handoff 에 싣지 않는다 |
| `save` | **LEGACY_GENERATOR_ONLY** | V2 는 문서(`store_pop_documents`) 저장이 1급 동작 — 즉시 PDF 파일 저장 개념 없음 |
| `qrId` · `supplierItemIds` · `localProductItemIds` | **UNUSED** (인라인 모달 미전송) | 상품 축은 별도 product handoff(기존 V2 fallback) 경로 — 이번 회차 접촉 없음 |

**별도 사업 의미 판정 (중지 조건 2)**: legacy 컨트롤러와 `store-pop-v2.controller.ts` 모두 `recordDerivations` 로 provenance 를 남긴다.
legacy 가 V2 가 못 하는 사업 의미(별도 승인·정산 등)를 수행하지 않음 → **중지 조건 미해당**.

## 3. source origin 3종 ↔ V2 resolver (step 5 · 9)

| Selector `RowOrigin` | 탭 | V2 `origin` | backend `resolveContentPopSource` | 격리 |
|---|---|---|---|---|
| `direct` | 내가 만든 콘텐츠 | `direct` | `KpaStoreContent {id, organization_id}` | organization |
| `execution-asset` | 운영자 제공 / 제작 자료 | **`library`** | `StoreExecutionAsset {id, organizationId}` | organization |
| `snapshot` | 커뮤니티 가져옴 | `snapshot` | `AssetSnapshot {id, organizationId}` | organization |

- `execution-asset → library` 매핑은 같은 파일의 기존 `handleStart`(제작 시작 handoff)와 **동일 규칙**을 재사용했다 (spec §1 · §3 고정).
- snapshot origin 은 **KPA 에서만** 만들어진다(KCos 는 ② 에서 B+D 로 재정렬, `'snapshot'` 리터럴 0 — spec §5 고정). PH 에는 selector 자체가 없다.
- 상품 source: 이번 회차 접촉 없음. 기존 V2 fallback(product-linked store content → STORE canonical description → 기본 정보) 그대로 · B2B/B2C 자동 fallback 추가 0.

## 4. 변경 (step 7 · 8)

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/StoreContentsSelector.tsx` | `StorePopCreateModal` import·state·render 제거 → `useNavigate` + `@o4o/store-ui-core` handoff 3 export 사용. `handleCreatePop` = 단일 선택 row → `navigate(CANONICAL_STORE_POP_V2_ROUTE, {state})`. ActionBar 액션·주석 갱신 |
| `services/web-kpa-society/src/components/store/StorePopCreateModal.tsx` | 헤더 `@deprecated` 표기만 (import 소비처 0 · KEEP_TEMPORARY · ④ 제거) |
| `services/web-kpa-society/src/api/storePop.ts` | 헤더 `@deprecated` 표기만 (동일) |
| `apps/api-server/src/__tests__/store-contents-selector-inline-pop-to-v2.spec.ts` | 신규 19 tests (§1 selector · §2 resolver 3 origin · §3 순수 변환 계약 · §4 legacy caller 0 / KEEP_TEMPORARY · §5 KCos/PH/Core 경계) |

**무변경**: `packages/store-ui-core/.../pop-v2/handoff.ts` · `usePopV2Editor.ts` · `pop-v2-source.service.ts` · `store-pop.controller.ts`(legacy) ·
KPA `StorePopPage.tsx`(legacy page) · KPA `StorePopV2Page.tsx` · KCos `StorePopPage.tsx`/`popV2.ts` · `StartProductionModal.tsx` · `productionTargets.tsx` · DB schema.

### 4-1. router state 계약 (본문 복제 없음)

```text
state.popV2Handoff = { sourceKind:'content', origin:'direct'|'library'|'snapshot', sourceId:<uuid>, suggestedTitle?:string }
```
키 4개 고정(spec §3 `Object.keys` 단언). V2 page 는 `usePopV2Handoff()` 로 1회 소비 → `GET /pharmacy/pop-v2/sources/content/:origin/:id` 로 본문을 새로 읽는다.

## 5. legacy generate caller 재계수 (step 10)

| 축 | before | after | 비고 |
|---|:---:|:---:|---|
| KPA page (`pages/pharmacy/StorePopPage.tsx:359`) | 1 | 1 | KEEP_TEMPORARY (④) |
| **KPA StoreContentsSelector** (`StoreContentsSelector` → `StorePopCreateModal` → `api/storePop.ts`) | 1 | **0** | 이번 회차 제거. 두 dead 파일은 `check-literal-consumers.mjs` 살아있는 소비처 0 (HISTORICAL_DOC 만) |
| KCos page (`pages/store/StorePopPage.tsx:59`) | 1 | 1 | KEEP_TEMPORARY (④) |
| KCos handoff | 0 | 0 | ② 에서 이미 V2 |
| PH | 0 | 0 | — |
| other (backend `store-pop.controller.ts` route 등록) | 1 | 1 | KEEP_TEMPORARY (④) |

## 6. 회귀 (step 12)

| 검증 | 결과 |
|---|---|
| jest `store-contents-selector-inline-pop-to-v2.spec.ts` + `kcos-library-content-bd-*.spec.ts` | **32/32 PASS** (19 + 13) |
| vitest `popV2Handoff.contract.test.ts` (공통 handoff 계약) | 15/15 PASS |
| `tsc --noEmit` web-kpa-society | 0 errors |
| eslint 변경 3 파일 | 0 |
| `check-literal-consumers.mjs` (`StorePopCreateModal.tsx` · `api/storePop.ts`) | 살아있는 소비처 0 |
| CI — Deploy Web Services `34554966935` / Deploy API `34554966950` / CodeQL `34554966979` | success (API 는 backend 무변경 · 정보용) |
| CI Pipeline `34554966952` | **cancelled** — main 연속 push 의 concurrency 취소(직전 `8b4a568b7`·직후 `e21046870` 도 동일 패턴). 로컬 tsc/eslint/jest 로 대체 확인 |

## 7. Production E2E — API (read-only, 2026-09-11)

계정 `ren***`(KPA · serviceKey `kpa-society`), 자격증명은 `docs/local/TEST-ACCOUNTS.local.md` 런타임 파싱.

```text
GET /kpa/pharmacy/pop-v2/sources/contents            → 200  n=37  {library:15, direct:15, snapshot:7}
GET .../sources/content/direct/<id>                  → 200  resolvedFrom=store-content  sources=[direct]
GET .../sources/content/library/<id>                 → 200  resolvedFrom=store-content  sources=[library]   ← execution-asset 축
GET .../sources/content/snapshot/<id>                → 200  resolvedFrom=store-content  sources=[snapshot]
```
→ **3 origin 모두 production 에 존재·해석 가능** (억지 fixture 0).

## 8. Production E2E — 브라우저 (step 11, Playwright chrome · `kpa-society.co.kr`)

| 단계 | 결과 |
|---|---|
| 로그인 → `/store/library/contents` | 18 rows |
| ActionBar `POP 만들기` | 선택 전 없음 · 1건 선택 = 활성 · 2건 선택 = 비활성 |
| `내가 만든 콘텐츠` 1행(direct `41140e79…`) → POP 만들기 | `/store/marketing/pop-v2` 진입 · `200 GET …/sources/content/direct/41140e79…` · "기본 문구 출처: 내 매장 콘텐츠" · legacy 모달 미노출 |
| `운영자 제공` 탭 | 이 계정 rows 0 → 브라우저 미실행. execution-asset(`library`) 축은 §7 resolver 200 + spec §3 매핑으로 보완 |
| `커뮤니티 가져옴` 1행(snapshot `5b5c228f…`) → POP 만들기 | `200 GET …/sources/content/snapshot/5b5c228f…` · 편집기 진입 · seed headline 확인 |
| 저장 → 목록 → 열기(재편집) | 문서 `E2E-SEL-V2 <ts>` 목록 표시 · 이름/headline 수정 후 재진입 시 유지 |
| PDF / PNG | `POST …/:id/render` 200 ×2 · 새 창 `storage.googleapis.com` URL |
| 복제 → 보관 | duplicate → 2 docs · `PATCH …/archive` 200 ×2 · 보관함 2건 |
| 원본 불변 | source row 제목/href 동일 · `GET /:id` sources=`[direct 41140e79…]` 유지 |
| 카운터 | legacy `pop/generate` 호출 **0** · console error 0 · pageerror 0 · 4xx/5xx 0 · dead link 0 |

**production 흔적(공개)**: 테스트 계정 소유 `store_pop_documents` 2건(`edbb508f…`, `5e81037c…`, 현재 `archived`) + 렌더 산출물 2개. 앱 정규 API 로만 생성 · DB 직접 write 0.
스모크 스크립트의 save/get/clone 카운터 regex 가 `/pop-v2/documents` 를 기대해 `no POST documents` 로 찍혔으나 실제 경로는 `/kpa/pharmacy/pop-v2[/…]` 이며 §7 read-only 조회로 문서 존재·status·sources 를 확인했다(실패 아님).

## 9. 완료 블록

```text
STORECONTENTSSELECTOR → POP V2     = PASS
DIRECT SOURCE                     = PASS
EXECUTION-ASSET SOURCE            = PASS   (production resolver 200 + 로컬 계약 · 브라우저는 계정 rows 0)
SNAPSHOT SOURCE                   = PASS
CONTENT ORIGINAL IMMUTABILITY     = PASS
KPA LEGACY INLINE POP CALLER      = 0
KPA / PH / KCOS REGRESSION        = PASS
SCHEMA CHANGE                     = 0
PRODUCTION E2E                    = PASS
```

## 10. 범위 밖 · ④ 인수 메모

- ④ 에서 `StorePopCreateModal.tsx` · `api/storePop.ts` 를 삭제하면 본 spec §4 "dead 파일 2개는 @deprecated 로 표기되어 남아 있다" 와 "legacy generate route 는 아직 등록" 테스트를 **함께 갱신**해야 한다.
- 남은 legacy caller = KPA `StorePopPage.tsx` · KCos `StorePopPage.tsx` · backend `store-pop.controller.ts` (§5 표). ④ 는 이 3곳 + old route redirect 가 대상.
- `store_pops` · historical output · KCos `/store-assets` · `/store/channels` · Neture `/assets` · POP Placement · Store Corner 접촉 0.
- 문서 정합: 발견 0건.
