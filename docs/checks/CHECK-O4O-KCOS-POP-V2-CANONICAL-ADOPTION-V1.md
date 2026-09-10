# CHECK — WO-O4O-KCOS-POP-V2-CANONICAL-ADOPTION-V1

> **작업**: K-Cosmetics POP V2 canonical 채택
> **선행**: `CHECK-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1` (CLOSED) ·
> `CHECK-O4O-STORE-POP-LEGACY-RETIREMENT-AND-DEAD-CODE-CLOSURE-V1` (STOPPED_AT_CENSUS)
> **정본 모델**: `docs/architecture/O4O-STORE-POP-V2-CANONICAL-MODEL-V1.md`
> **작성일**: 2026-09-10

---

## 1. 정본 (§1)

```text
Content → store_pop_documents → POP V2 renderer → PDF / PNG
```

`POST /{svc}/pharmacy/pop/generate` 및 legacy composer/page 는 **이번 회차에서 제거하지 않는다.**

---

## 2. KCos POP census (§2)

| # | 항목 | 실측 |
|---|------|------|
| 1 | 메뉴 | `packages/store-ui-core/src/config/storeMenuConfig.ts` `COSMETICS_STORE_CONFIG` → `{ key:'pop', subPath:'/marketing/pop' }` (단일 진입) |
| 2 | route | `App.tsx:882 marketing/pop` · `:883 marketing/pop/library` · `:910 /store/pop → Navigate(/store/marketing/pop)` · `:896 commerce/products/:productId/pop` (legacy 보호용 redirect) · `:656 hub/pop` · `:805~807 operator pop` |
| 3 | legacy POP page | `pages/store/StorePopPage.tsx` — 공통 `StorePopComposerView`(store-ui-core) thin adapter. 즉시 PDF 축 |
| 4 | StoreContentsSelector 인라인 생성 연결 | **없음.** KCos 소스 전체에 `StoreContentsSelector` 참조 0건 → §9 의 KCos 처리 범위 없음 |
| 5 | backend endpoint caller | `StorePopPage.tsx:59` → `POST /api/v1/cosmetics/pharmacy/pop/generate` (직접 `fetch`) 1건 |
| 6 | QR embed | `getStoreQrCodes()` → `GET /cosmetics/pharmacy/qr` (`storeProductionSources.ts:15`) |
| 7 | template | `pop-modern` / `pop-soft` / `pop-pharmacy-pro` — KPA 와 **동일 id**, 라벨만 KCos 문구 |
| 8 | product·content source | 상품 축 = `store_local_products` **단독**. KCos 에는 handled-products(취급제품 통합) 화면·클라이언트가 없고 `StoreLocalProductsPage` / `StoreProductDescriptionsPage` 모두 `fetchLocalProducts` 를 쓴다. `KpaStoreContentProductLink`(product_source_type) 를 만드는 KCos UI 도 0건 |
| 9 | permissions | `createRequireStoreOwner('cosmetics')` — KPA/PH 와 동일 guard factory |
| 10 | organization isolation | POP V2 의 모든 쿼리가 `organization_id` 기준. `pop-v2-source.service.ts` 는 serviceKey 를 아예 받지 않는다 |

### 판정 — KCos 고유 business difference 없음

POP 의 **업무 모델**(무엇을 만들고 어떻게 저장·재편집·출력하는가)은 KPA/PH 와 동일하다.
차이는 두 가지뿐이며 둘 다 **adapter 계층**에서 흡수된다 (§3 허용 범위):

1. **상품 후보 원장** — KCos 는 `local` 만 (KPA/PH 는 `listing + local`).
   서버 계약 `GET /sources/product/:id?sourceType=local` 은 이미 동일하다.
2. **QR 후보 endpoint** — `/cosmetics/pharmacy/qr`.

→ 공통 Core 에 KCos 조건문 **불필요**. §14 중지조건 4 미발동.

---

## 3. 변경 내용

### backend (신규 migration 0 / schema 변경 0 / production data 변경 0)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts` | `createStorePopV2Controller(dataSource, coreRequireAuth, 'cosmetics')` 를 `/pharmacy/pop-v2` 에 mount. legacy `createStorePopController` mount 유지 |

- 공통 Core `store-pop-v2.controller.ts` 는 **무변경**. `POP_SERVICE_TO_CATALOG_KEY` 에 `cosmetics: 'k-cosmetics'` 가 이미 선언돼 있어 공개 도메인(`k-cosmetics.site`)이 그대로 해석된다.
- 공통 `pop-v2-source.service.ts` 도 **무변경** (serviceKey 파라미터 자체가 없다).

### frontend

| 파일 | 변경 |
|------|------|
| `services/web-k-cosmetics/src/api/popV2.ts` | **신규** — 공통 `createPopV2Api` 에 base path `/cosmetics/pharmacy/pop-v2` · HTTP 어댑터 · `listProductOptions`(local products) · `listQrCodes` 주입 |
| `services/web-k-cosmetics/src/pages/store/StorePopV2Page.tsx` | **신규** — 공통 `StorePopV2ListView` / `StorePopV2EditorView` 주입 wrapper (accent `#db2777`, 기존 템플릿 id 재사용) |
| `services/web-k-cosmetics/src/App.tsx` | `marketing/pop-v2` route 추가. legacy `marketing/pop` **유지** |
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | `COSMETICS_STORE_CONFIG` 의 POP 진입만 `/marketing/pop-v2`. **KPA / PH 블록 무변경** |

### test

`apps/api-server/src/__tests__/kcos-pop-v2-canonical-adoption.spec.ts` (raw-source, 7건) — **7/7 PASS**

1. cosmetics.routes 가 공통 Core 를 `'cosmetics'` 로 mount
2. legacy 즉시 PDF controller mount 보존
3. 공통 Core 에 KCos 전용 분기 없음 (도메인 매핑 table 선언 제외)
4. `pop-v2-source.service.ts` service-neutral 유지
5. KCos 프론트가 공통 factory/View 를 주입만 함 (editor 복제·전용 schema 없음)
6. KCos route 가 V2 추가 + legacy 유지
7. 메뉴는 KCos 블록만 전환, KPA `/marketing/pop` · PH `/pop` 무변경

---

## 4. 하지 않은 것 (§13 준수)

- legacy backend(`store-pop.controller.ts` · `POST /pharmacy/pop/generate`) 삭제 — 하지 않음
- KPA handoff 5곳 변경 — 하지 않음
- KPA / KCos 인라인 생성 V2 이관 — 하지 않음 (KCos 에는 인라인 caller 자체가 없음)
- `store_pops` 변경 — 하지 않음
- historical output(`store_execution_assets` usage_type='pop') 삭제·backfill — 하지 않음
- POP Placement / Store Corner entity — 손대지 않음

### KCos legacy handoff 2곳을 그대로 둔 이유

| 위치 | 대상 | 판단 |
|------|------|------|
| `pages/hub/HubPopLibraryPage.tsx:73,83` | `/store/marketing/pop/library` · `/store/marketing/pop` | **`store_pops` HUB 축**(운영자 게시 → 매장 사본). §7·§13 보호 대상 |
| `pages/store/StoreLibraryContentsPage.tsx:31` | `route:'/store/marketing/pop'` + `defaultTemplateId` | 자료함 → POP 제작 router-state 계약. KPA `ProductionRouterState` 와 같은 종류이며 V2 는 아직 이 계약을 받지 않는다 |

두 건 모두 후속 WO ②(HUB handoff 이관)의 입력이다.

---

## 5. legacy caller 재계수 (§8 · §12)

`POST /{svc}/pharmacy/pop/generate` 실제 호출 코드 (주석 제외):

| 시점 | KPA | KCos | 합계 |
|------|:---:|:----:|:----:|
| 작업 전 | 2 (`api/storePop.ts:36`, `pages/pharmacy/StorePopPage.tsx:359`) | 1 (`pages/store/StorePopPage.tsx:59`) | 3 |
| 작업 후 | 2 (무변경) | **1 (보존)** | 3 |

- **KCos 코드 caller = 1** — §4 "legacy route 즉시 삭제 금지" 를 지켰으므로 파일이 남아 있다.
- **KCos 메뉴 도달 caller = 0** — 매장 메뉴 POP 진입이 V2 로 전환되어, 남은 legacy page 는
  북마크 / `/store/pop` redirect / HUB·자료함 handoff 로만 도달한다.
- 후속 WO ④(legacy endpoint 실제 제거)의 선행 조건은 위 **handoff 2곳 + KPA 5곳**의 이관이다.

---

## 6. 검증 결과

```text
TYPECHECK (api-server)        = PASS
TYPECHECK (store-ui-core)     = PASS
TYPECHECK (web-k-cosmetics)   = PASS
RAW-SOURCE SPEC (7건)         = PASS
KCOS POP V2 ADOPTION          = PASS
KPA / PH / KCOS CORE PARITY   = PASS
PRODUCT POP                   = PASS
GENERAL CONTENT POP           = PASS
POP RE-EDIT                   = PASS
PDF / PNG                     = PASS
LEGACY KCOS CALLER            = 코드 1 (보존) / 메뉴 도달 0
HISTORICAL OUTPUT             = PRESERVED
SCHEMA CHANGE                 = 0
PRODUCTION E2E                = PASS
```

---

## 7. Production E2E (§11)

- **환경**: `https://k-cosmetics.site` · 실브라우저(Playwright MCP) · 계정 `renagang21@gmail.com` (serviceKey `cosmetics`) · 조직 **테스트 뷰티샵**
- **선행**: `066e9545b` 의 `Deploy API Server (Cloud Run)` / `Deploy Web Services` / `Deploy Admin Dashboard` 전부 green 확인 후 착수.
- **mount 증명**: `/api/v1/cosmetics/pharmacy/pop-v2/documents` → **401**(guard 인터셉트) vs 미마운트 sibling `/api/v1/cosmetics/zzz-not-mounted/foo` → **404**. 401 ≠ 404 이므로 라우터가 실제로 살아 있다.

### 7-1. 항목별 결과

| # | §6 항목 | 결과 | 근거 |
|---|--------|:----:|------|
| 1 | 메뉴 전환 | PASS | 매장 nav anchor 목록에 `/store/marketing/pop-v2 \| POP`. legacy `/store/marketing/pop` 은 메뉴에서 도달 불가 |
| 2 | 새 POP | PASS | 목록 → `새 POP 만들기` → 4-step wizard(소스/유형 · 후보 · 템플릿·용지 · 내용) 렌더. accent `#db2777`, 템플릿 3종, A4/A5 |
| 3 | 일반 콘텐츠 POP | PASS | `내 매장 콘텐츠` 후보 선택 → `기본 문구 출처: 내 매장 콘텐츠` |
| 4 | 상품 POP | PASS | `상품` 탭 후보 `[E2E-POPV2] 수분 진정 크림 / 스킨케어` 노출 = KCos adapter 의 `sourceType:'local'` 주입이 공통 Core 에서 그대로 동작. 해석 결과 `기본 문구 출처: 상품 기본정보` = **I4 fallback 3단계**. B2B/B2C 자동 fallback 없음 |
| 5 | QR 삽입 | PASS | `QR 삽입` 셀렉트에 `[E2E-POPV2] 매장 안내 QR` 노출 · 지면에 QR + `QR 스캔` 캡션 인쇄 확인 |
| 6 | 저장 | PASS | `POP 을 저장했습니다.` |
| 7 | reload | PASS | 새로고침 후 목록에 `출력 완료` 뱃지 + `콘텐츠 POP · 일반 내 매장 콘텐츠 · A4 · 2026. 9. 10. 수정` |
| 8 | 재편집 | PASS | `열기` → 이름·지면 제목·핵심 문구·본문·QR 선택이 전부 rehydrate. 지면 제목 수정 후 저장 성공 |
| 9 | clone | PASS | `복제` → `POP 을 복제했습니다.` · `[E2E-POPV2] 수분 진정 크림 (사본)` 이 `작성 중` 으로 생성 |
| 10 | archive | PASS | `보관` → `POP 을 보관했습니다.` · 사용 중 목록에서 제거 · **보관함** 탭에 `보관됨` + `복원` 버튼 노출 |
| 11 | PDF | PASS | 콘텐츠 POP `…/0022a387-4b3e-43e7-9398-72a3c34de4a9.pdf` · 상품 POP `…/9502549c-852a-42d8-a9ef-03e87bcde009.pdf` (GCS `o4o-media-library`) |
| 12 | PNG | PASS | `…/0c46e041-b62e-4d27-871a-f660373653ed.webp` (848×1200) |

### 7-2. 콘솔 / 링크

| 항목 | 결과 |
|------|:----:|
| POP V2 동선 console error | **0** |
| pageerror | **0** |
| dead link | **0** |

### 7-3. fixture 정리

테스트 조직에 POP 후보가 0건이라 §6 을 실행할 수 없어, **canonical 화면으로만** fixture 를 만들고 같은 경로로 정리했다.

| fixture | 생성 경로 | 정리 |
|---------|-----------|------|
| POP 문서 3건 (콘텐츠 POP · 상품 POP · 사본) | POP V2 화면 | **보관 처리 완료** — 해당 화면의 canonical 정리 액션은 archive 이며 delete 는 제공되지 않는다 |
| `[E2E-POPV2] 매장 안내 QR` | `/store/marketing/qr` | **삭제 완료** (총 0개) |
| `[E2E-POPV2] 수분 진정 크림` | `/store/commerce/local-products` | **비활성화 완료** — 이 화면의 canonical 정리 액션은 비활성화이며 delete 는 제공되지 않는다 |
| `[E2E-POPV2] 환절기 피부 관리 안내` (제작 자료 콘텐츠) | `/store/library/production-materials/new` | **잔존** — 목록에 삭제 액션이 없다. DB 직접 삭제는 승인 범위 밖이라 하지 않았다 |
| POP 산출물(`store_execution_assets` usage_type='pop') | — | **삭제하지 않음** (§7 historical output 보존) |

### 7-4. 범위 밖 관찰 (고치지 않음 · 후속 판단용)

1. `/store/library/contents` 가 `kpa` 태그 콘텐츠(약국 조직)를 표시한다. 같은 계정의 POP V2 `/sources/contents` 는 뷰티샵 조직으로 정확히 스코프된다 → **다른 화면의 조직 스코프 표시 불일치**이며 POP 축 결함이 아니다.
2. `PNG 출력` 버튼의 실제 산출물은 `.webp` 다. **KPA/PH 와 동일한 공통 Core 동작**이므로 이번 회차에서 바꾸지 않았다.
3. `/store/library/production-materials` 에서 console error 1건 — `…/blog/staff?limit=50` 404. POP V2 진입 전부터 존재하는 다른 화면의 결함이다.
4. 로그인 화면의 `/auth/me` · `/auth/refresh` 401 — 비로그인 상태의 정상 동작.

---

## 8. Git

| 항목 | 값 |
|------|-----|
| 브랜치 | `work/kcos-pop-v2-adoption-v1` |
| 커밋 | `066e9545b` |
| main | `066e9545b` (구현) · 본 CHECK 는 후속 커밋 |
