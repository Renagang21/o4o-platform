# IR-O4O-STORE-POP-REAL-WORLD-USAGE-AND-PLACEMENT-AUDIT-V1

> **성격**: READ-ONLY 조사 기록 (코드 변경 0 / schema 변경 0 / migration 0 / production write 0)
> **WO**: `WO-O4O-STORE-POP-REAL-WORLD-USAGE-AND-PLACEMENT-AUDIT-V1`
> **작성일**: 2026-09-10
> **기준 커밋**: `2f8b71c57` (origin/main)
> **선행 기준**: [`O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1`](../baseline/O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1.md) · [`O4O-STORE-COMMERCE-BOUNDARY-V1`](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) · [`O4O-STORE-MENU-CANONICAL-TREE-V1`](../baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md)
> **직전 회차**: [`CHECK-O4O-STORE-EXECUTION-HOME-TABLET-QR-V1`](../checks/CHECK-O4O-STORE-EXECUTION-HOME-TABLET-QR-V1.md) (CLOSED)
> **설계 산출물**: **없음** — §12·§13 의 모델 선택을 이번 증거로 확정할 수 없다고 판정했다 (WO §20 조건부 산출물 미생성).

---

## §0. 한 줄 결론

> **POP 는 "배치 축이 없는 실사용 기능" 이 아니라, "출력 축만 있고 실사용 증거가 아직 없는 기능" 이다.**
> `store_execution_assets(usage_type='pop')` 17 행은 **매장에 놓인 POP 17 개가 아니라, 단일 테스트 조직 1 곳의 PDF 생성 이력 17 건**이다.

이번 조사의 출발 가설("POP 는 이미 실사용 중인데 placement 축만 없다")은 **실측으로 기각**되었다.
따라서 POP Placement 를 지금 구현하는 것은 **실사용 데이터 0 위에 정규화를 고착시키는 행위**가 되며,
직전 회차에서 Store Corner entity 를 보류한 것과 **같은 이유로** 보류가 맞다.

---

## §1. 시작 기준점

| 항목 | 값 |
|---|---|
| 기준 커밋 | `2f8b71c57` (= `origin/main`, HEAD 동일) |
| 작업 트리 | `C:/tmp/o4o-store-exec-home` (전용 worktree) · clean |
| 조사 브랜치 | `work/store-pop-real-world-usage-audit-v1` |
| 병렬 세션 | worktree 17 개 확인 · POP 관련 경로를 점유한 세션 없음 |
| production 접근 | cloud-sql-proxy 15432 · `o4o_platform` · **SELECT 전용** · 작업 후 프록시 종료 |
| 개인정보 | 조회하지 않음 (COUNT / 상태 / date / boolean / 조직 UUID·명 만) |

---

## §2. POP census — 5 축

### 2-1. DB (production 실측, 2026-09-10)

| 테이블 | 행 수 | 비고 |
|---|---:|---|
| `store_pops` | **0** | 플랫폼 전체 0 행 (operator 원본 · store 사본 모두 0) |
| `store_execution_assets` (전체) | **32** | |
| `store_execution_assets` (`usage_type='pop'`) | **17** | 이번 조사의 대상 |
| `store_execution_assets` (`usage_type='qr'`) | 1 | |
| `store_execution_assets` (`usage_type` NULL) | 14 | |
| `store_asset_derivations` (`derived_kind='pop_pdf'`) | **11** | 17 중 11 건만 출처 기록 존재 |
| `store_qr_placements` | **4** | 전부 `status='ended'` (2026-09-09 생성) |
| `store_qr_placements` (`placement='POP'`) | **0** | |

**`store_execution_assets` 에 `signage` / `banner` / `notice` 행은 1건도 없다.** entity 가 선언한 5 종 `usage_type` 중 실제로 쓰인 것은 `pop` 과 `qr` 뿐이며, 사실상 이 테이블은 **POP 출력물 보관소**로만 작동해 왔다.

### 2-2. Entity

- `store_pops` → `apps/api-server/src/routes/o4o-store/entities/store-pop.entity.ts`
  `author_role`(operator|store) + `store_id` + `service_key` + `status`(draft|published|archived) + `slug` + `content`.
  DB CHECK `CHK_store_pops_author_role_store_id` 로 operator=store_id NULL / store=store_id NOT NULL 을 schema 레벨에서 강제.
- `store_execution_assets` → `apps/api-server/src/routes/platform/entities/store-execution-asset.entity.ts`
  **18 컬럼. 위치·배치·코너를 뜻하는 컬럼이 하나도 없다.** 경계는 `organization_id` 단독(CLAUDE.md §7 Store Ops 규칙과 일치).
  `store_id` 도 `service_key` 도 없다 — 즉 **서비스 구분조차 이 테이블에는 없다.**

### 2-3. Backend

| 축 | controller | 마운트 |
|---|---|---|
| POP 콘텐츠 사본 (store) | `o4o-store/controllers/pop.controller.ts` | KPA `/stores/:slug/pop/staff/*` · KCos 동일 |
| POP 콘텐츠 원본 (operator) | `o4o-store/controllers/operator-pop.controller.ts` | KPA `/operator/pop` · KCos `/operator/pop` |
| POP **PDF 생성** | `o4o-store/controllers/store-pop.controller.ts` | KPA `/pharmacy/pop/*` · KCos `/pharmacy/pop/*` |
| POP 콘텐츠 (PH 전용) | `controllers/pharmacy-hub/PharmacyHubStorePopController` | PH `/store-owner/pop/*` (직접 작성 포함) |
| 실행 자산 CRUD (범용) | `o4o-store/controllers/store-execution-assets.controller.ts` | `POST/PUT/DELETE /store/assets` |
| HUB 진열 | `modules/hub-content/hub-content.service.ts` `queryPop()` | operator + published + service_key 필터 |
| 공통 저장 로직 | `services/store/store-pop.service.ts` | unique = (store_id, slug) · soft delete 없음(물리 삭제) |

### 2-4. Frontend

| 서비스 | 화면 | route | 축 |
|---|---|---|---|
| KPA | `StorePopPage` (1,085L) | `/store/marketing/pop` | **출력** (PDF 생성 + 생성 목록) |
| KPA | `PharmacyPopPage` (522L) | `/store/content/pop` | 콘텐츠 사본 관리 |
| KPA | `HubPopLibraryPage` (100L) | `/store-hub/pop` | HUB 진열 + 가져오기 |
| KPA | `ProductPopBuilderPage` (36L) | `/store/commerce/products/:id/pop` | **은퇴 완료** — canonical 로 1홉 redirect |
| PH | `PopPage` (458L) | `/store-owner/pop` | 콘텐츠 (작성·발행·보관·가져오기) — **출력 축 없음** |
| KCos | `StorePopPage` · `StorePopStaffPage` · `OperatorPop*` · `HubPopLibraryPage` | | KPA 와 동형 |

### 2-5. 공통 package

- `packages/store-ui-core/src/config/storeMenuConfig.ts` — POP 메뉴 항목 3 곳
- `packages/store-ui-core/src/components/qr/storeQrOperationModel.ts` — `STORE_QR_PLACEMENT_PRESETS` 에 **`'POP'`(POP 물)** 포함
- `packages/types/src/hub-content.ts` — `sourceDomain: 'pop'`
- **POP 전용 공통 컴포넌트·모델은 없다.** Tablet(`TabletCornerBoard`) · QR(`StoreQrOperationBoard`) 과 달리 POP 은 아직 공통 Core 로 승격된 적이 없다.

---

## §3. `store_pops` 역할 확정

> **판정: `LIVE_BUT_UNUSED` (기능은 완성되어 살아 있으나 실사용 진입이 0)**
> **`DEAD` 아님.** production 0 행만 근거로 DEAD 로 판정하지 않는다는 WO §3 지침을 지켰다.

근거:

1. **read/write consumer 가 모두 실재한다** — operator 작성(`operator-pop.controller`), HUB 진열(`hub-content.service.queryPop`), 매장 가져오기(`pop.controller` import), 매장 사본 수정·삭제, PH 직접 작성까지 **전 lifecycle 이 코드로 완비**되어 있다.
2. **UI 진입점도 실재한다** — KPA `/store/content/pop`, `/store-hub/pop`, PH `/store-owner/pop`, KCos 4 화면.
3. **0 행의 실제 원인은 "상류 공백"이다.**
   `store_pops` 는 operator 원본이 있어야 매장 사본이 생긴다. 그런데 **operator POP 원본이 0 건**이므로 HUB 선반이 비어 있고 → 가져올 것이 없고 → 매장 사본도 0 이다. 기능 결함이 아니라 **콘텐츠 미공급**이다.
4. **KPA 는 여기에 더해 IA 공백이 겹친다** — `/store/content/pop`(`PharmacyPopPage`, 사본 관리)은 **사이드바 메뉴에 없다.** KPA 사이드바의 `POP` 항목은 `/marketing/pop`(출력 화면)을 가리킨다. 즉 KPA 사용자는 사본 관리 화면에 **직접 URL 로만** 도달할 수 있다.
5. KPA 는 애초에 **매장 직접 POP 작성 endpoint 를 제공하지 않는다**(`PharmacyPopPage` 주석 명시). 반면 PH 는 제공한다 — §7 참조.

---

## §4. `store_execution_assets(usage_type='pop')` 역할 확정

> **판정: `OUTPUT_ARTIFACT_LOG` (출력 산출물 이력) — 배치·사용 현황이 아니다.**

production 17 행 분해 (실측):

| source_type | asset_type | mime | is_active | 건수 | 기간 |
|---|---|---|---|---:|---|
| `generated` | file | application/pdf | **false** | **12** | 2026-06-04 ~ 06-26 |
| `generated` | file | application/pdf | **true** | **4** | 2026-07-29 |
| `uploaded` | file | image/png | false | 1 | 2026-06-04 |

추가 실측:

- **17 행 전부가 단일 조직 소유** — `9c87f46b-…` = 조직명 **`테스트 약국`** (type=`pharmacy`).
- **16 행의 description 이 `'POP 제작 결과'`** — `POST /pharmacy/pop/generate` 가 하드코딩하는 문자열이다.
- **13 행이 이미 `is_active=false`** (사용자가 목록에서 삭제한 것).
- 살아 있는 4 행의 제목: `후시딘연고(퓨시드산나트륨)` ×2, `후시딘연고(퓨시드산나트륨) POP` ×2 — **같은 제품을 같은 날(2026-07-29) 네 번 생성한 중복 이력**이다.

> **그러므로 "매장 사용 중 POP 17 개" 는 세 겹으로 틀린 해석이다.**
> ① 17 건은 1 개 테스트 조직의 이력이고, ② 그중 13 건은 이미 비활성이며, ③ 남은 4 건은 서로 다른 POP 4 개가 아니라 **동일 POP 의 재생성 4 회**다.
> 실질적으로 이 데이터가 증언하는 것은 **"어떤 매장도 POP 을 실제로 운영에 투입한 적이 없다"** 이다.

---

## §5. 실제 생성 Flow 추적 (이번 조사의 핵심)

```text
[입력]  자료함 콘텐츠(content_direct 7) / 매장 자체 상품(store_local_product 3) / 스냅샷(content_snapshot 1)
          │  ※ 공급자 공개 자료(supplierItemIds)는 org 소유가 아니라 provenance 기록에서 제외된다
          ▼
[화면]  KPA `/store/marketing/pop` StorePopPage
          - 템플릿 선택 · AI 문구 생성(선택) · QR 연결(선택) · layout 선택
          ▼
[API]   POST /api/v1/kpa/pharmacy/pop/generate      (store-pop.controller.ts)
          - generatePopPdf(popItems) → PDF Buffer
          - save 미지정 → **blob 응답만. DB 행 없음** (back-compat)
          - save=true   → 아래로
          ▼
[저장]  MediaLibraryService.upload(pdf, userId, serviceKey, 'pop')   → GCS durable URL
          ▼
[원장]  store_execution_assets INSERT
          organizationId / title / description='POP 제작 결과'
          category='pop' / assetType='file' / usageType='pop'
          sourceType='generated' / mimeType='application/pdf' / isActive=true
          ▼
[출처]  store_asset_derivations INSERT (best-effort · 실패해도 저장은 성공)
          derived_kind='pop_pdf', sources=[content_direct | content_snapshot | store_execution_asset | store_local_product]
          ▼
[목록]  StorePopPage 하단 "생성된 POP" — getStoreExecutionAssets({usageType:'pop', limit:50})
          가능한 행동: **PDF 열기 / 삭제 뿐**
```

**부차 write 경로 1 건 확인**: 범용 `POST /store/assets` 로 클라이언트가 `usageType:'pop'` 을 직접 지정할 수 있다(`sourceType` 기본 `'uploaded'`). 17 행 중 PNG 1 건이 이 경로로 들어온 것이다.

**derivation 결손**: `pop_pdf` derivation 11 건 < POP 자산 16 건(generated). 6 건은 출처 미기록 — derivation 기록이 best-effort 이고, 초기 생성분은 derivation 테이블 도입 이전이기 때문이다. **즉 산출물에서 원본을 역추적하는 것도 완전하지 않다.**

---

## §6. KPA POP UX 판정

> **판정: C — "출력 축은 완성, 콘텐츠 축은 IA 미연결"**

- 제작 시작 진입점은 **`내 자료함`(`/store/library/contents`) 단독**으로 canonical 정렬되어 있다(`WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1` 이 "신규 제작 시작" 버튼을 제거).
- 사이드바 `POP` = `/store/marketing/pop` = **출력 화면**. 여기서 "콘텐츠에서 새 POP 만들기" 로 자료함에 되돌아간다.
- **`/store/content/pop`(사본 관리)은 사이드바에 없다** → §3-4 의 IA 공백. 다만 HUB 원본이 0 이라 현재로선 빈 화면이므로 **데드링크는 아니고 "미연결"이다.**
- `ProductPopBuilderPage` 는 이미 은퇴 처리되어 canonical 화면으로 redirect 한다 — 잔재 정리 완료.

---

## §7. PH parity 판정

> **판정: `MISSING_ADOPTION` (새로운 business difference 로 인정하지 않는다)**

| POP 축 | KPA | PH | 판정 |
|---|:---:|:---:|---|
| operator HUB 원본 게시 | ✅ `/operator/pop` | ❌ 없음 | PH 에 operator 축 자체가 없음 (서비스 모델상 정상 — `O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1`) |
| HUB 진열 · 가져오기 | ✅ | ✅ `/store-owner/pop/hub` | parity |
| 매장 사본 수정·삭제 | ✅ | ✅ | parity |
| **매장 직접 POP 작성** | ❌ (endpoint 미제공) | ✅ `POST /store-owner/pop` | **역전** — PH 가 앞선다 |
| **POP PDF 생성·출력** | ✅ `/pharmacy/pop/generate` | ❌ **미마운트** | **PH 결손** |
| IA 위치 | `약국 경영지원` (marketing) | **`매장 실행`** (execution) | **축 불일치** |

두 가지를 분리해 기록한다.

1. **PH 에는 POP 출력 축이 아예 없다.** `store-pop.controller.ts` 는 주석에 *"본 controller 는 서비스별 명시 serviceKey 로만 mount 되며 pharmacy-hub mount 는 아직 없다"* 라고 명시한다. PH 사용자는 POP 을 쓸 수는 있으나 **인쇄물로 뽑을 수 없다.**
2. **같은 POP 이 KPA 에서는 `경영지원`, PH 에서는 `매장 실행` 아래 있다.** 이는 이번 트랙의 핵심 개념 충돌을 그대로 드러낸다 — PH 는 POP 을 이미 "실행 매체"로 분류해 두었지만, **실행 매체를 주장하려면 배치 축이 있어야 하는데 없다.**

---

## §8. K-Cosmetics 상태

> **판정: KPA 와 동형 (별도 축 아님)**

`cosmetics.routes.ts` 가 KPA 와 같은 3 controller (`createStorePopController` / `createStorePopStaffController` / `createOperatorPopController`) 를 `serviceKey='cosmetics'` 로 마운트한다. 화면도 `StorePopPage` · `StorePopStaffPage` · `OperatorPopListPage` · `OperatorPopWritePage` · `HubPopLibraryPage` 로 동형이다.
production POP 자산·`store_pops` 모두 KCos 몫 0 건. **KCos 는 이번 판단의 변수가 아니다.**

---

## §9. Operator · HUB 관계

- **copy-on-import 불변식이 지켜지고 있다** — 운영자 원본(`author_role='operator'`, `store_id` NULL) → 매장 사본(`author_role='store'`, `store_id` 설정). 원본 수정이 사본에 영향을 주지 않는다 (`IR-O4O-COPY-ON-IMPORT-INVARIANT-AUDIT-V1` B1 항목과 일치).
- HUB 진열 필터는 `author_role='operator'` + `status='published'` + `service_key` 일치 3중 — 매장 직접 작성 POP 이 HUB 에 새는 경로는 없다.
- **그러나 원본이 0 건**이라 이 경로 전체가 아직 한 번도 실행된 적이 없다.
- `store_asset_derivations` 에 `content_hub → store_execution_asset` 1 건이 있다 — HUB 콘텐츠가 실행 자산으로 들어온 흔적은 POP 이 아닌 다른 축에서 1 건 존재한다.

---

## §10. POP + QR 관계

> **판정: 관계가 어디에도 저장되지 않는다 (`NOT_PERSISTED`)**

- `POST /pharmacy/pop/generate` 는 `qrId` 를 받아 `qrUrl = {서비스 canonical origin}/qr/{slug}` 를 만들고 **PDF 안에 그려 넣는다.**
- 그러나 생성된 `store_execution_assets` 행에도, `store_asset_derivations` 에도 **`qr_code` 를 source 로 기록하지 않는다.** derivation 의 source_kind 실측 목록에 `qr_code` 는 없다.
  → **어떤 POP 에 어떤 QR 이 박혔는지는 PDF 바이트 안에만 존재하고, DB 로는 알 수 없다.**
- 반대 방향은 기록된다 — `store_execution_asset → qr_code` derivation 7 건 (실행 자산을 대상으로 삼는 QR).
- 현행 QR placement 어휘에는 **이미 `'POP'` 값이 있다**(`QR_PLACEMENT_PRESETS`, UI 라벨 "POP 물"). 즉 **현재 canonical 모델은 POP 을 "QR 이 놓이는 표면" 으로 취급한다.**
- 다만 **`placement='POP'` 로 기록된 QR 배치는 production 0 건**이다.

> **WO §10 지침 준수**: POP 에 QR 이 들어갔다는 사실로 `QR placement = POP placement` 를 자동 생성하지 않는다. 위 두 사실(어휘에 POP 이 있음 / 실사용 0)은 **설계 입력**으로만 기록한다.

---

## §11. Output vs Placement 경계

세 개념을 분리해 확정한다.

| 개념 | 현재 구현 | 원장 | 위치 정보 |
|---|---|---|:---:|
| **제작 (Content)** | 자료함 콘텐츠 · `store_pops` · 매장 자체 상품 | `kpa_store_contents` · `store_pops` · `store_local_products` | 없음 |
| **출력 (Output)** | POP PDF 생성 | `store_execution_assets(pop)` | **없음** |
| **배치 (Placement)** | **존재하지 않음** | — | — |

- **출력 형식(A4/A5/layout)은 placement 값이 아니다.** layout 은 요청 파라미터일 뿐 자산 행에 저장되지도 않는다.
- **재편집 경로가 없다.** "생성된 POP" 목록의 행동은 `PDF 열기` / `삭제` 뿐이다. 내용을 바꾸려면 원본 콘텐츠에서 **다시 생성**해야 하고, 그러면 **새 행이 하나 더 생긴다.**
  → 이것이 후시딘연고 4 행의 구조적 원인이며, **`store_execution_assets(pop)` 의 행 수가 "매장에 있는 POP 수" 와 절대 같아질 수 없는 이유**다.

> 생성 → 편집 → 저장 → 출력 → 재편집 흐름 중 **`편집` 과 `재편집` 이 출력 축에는 존재하지 않는다.** 흐름은 `생성 → 출력 → (버리고) 재생성` 이다.

---

## §12. POP Placement 필요성 판정

> **판정: `NOT_YET_JUSTIFIED` — 필요성이 부정된 것이 아니라, 지금 결정할 근거가 없다.**

필요성을 지지하는 근거:

- PH 는 이미 POP 을 `매장 실행` 메뉴에 두었다 — 개념적으로는 실행 매체로 인식되고 있다.
- 실무적으로 POP 은 매대·계산대·상담대 같은 **물리적 위치에 붙이는 물건**이 맞다.

필요성을 지금 확정할 수 없게 만드는 근거 (전부 실측):

1. `store_pops` 0 행 — 콘텐츠 축 실사용 0.
2. POP 출력 17 행이 **전부 `테스트 약국` 1 곳**, 그중 13 행 비활성, 활성 4 행은 동일 POP 재생성.
3. `placement='POP'` 인 QR 배치 0 건 — 기존에 열려 있던 유일한 POP-배치 표현조차 아무도 쓰지 않았다.
4. 실 매장 조직(테스트 조직 제외)의 POP 자산 **0 건**.
5. 출력물에 재편집 축이 없어, placement 를 붙일 **안정적인 대상 식별자 자체가 불안정**하다 (재생성마다 새 id).

**모델 후보 A~E 비교 (확정하지 않고 기록만 한다)**

| 후보 | 모델 | 장점 | 위험 |
|---|---|---|---|
| **A** | `store_execution_assets` 에 위치 컬럼 추가 | 최소 변경 | 출력물 1행 = 배치 1곳 고정 → **1:N 불가**. 재생성 시 배치 유실. §11 과 정면 충돌 |
| **B** | `store_pop_placements` 신설 (QR 과 대칭) | QR 과 같은 모양 · 1:N 가능 | 배치 대상이 "출력물"인지 "콘텐츠"인지 먼저 정해야 함. 실사용 0 위의 신규 테이블 |
| **C** | `store_qr_placements` 를 재사용 (POP 을 QR 배치로 표현) | 테이블 0 신설 · 어휘 이미 존재 | **QR 없는 POP 을 표현할 수 없다.** QR 은 POP 의 선택 요소일 뿐 |
| **D** | 공통 `execution_placements` 로 일반화 | Tablet·QR·POP·Signage 통합 | **이미 동작 중인 `store_qr_placements` 를 억지로 일반화**하게 됨 (WO §13 금지선) |
| **E** | **보류 — placement 를 만들지 않는다** | 실사용 데이터가 쌓인 뒤 실제 형태로 결정 | 그동안 실행 홈에 POP 이 안 나온다 (현행과 동일) |

**본 IR 의 권고: E (보류).** 단, 이는 "POP Placement 는 불필요하다" 가 아니라 **"먼저 실사용을 만들고, 그 데이터 형태를 보고 결정한다"** 이다. A~D 중 무엇이 맞는지는 §22 의 판단 근거가 생긴 뒤에 정한다.

---

## §13. 공통 Placement 모델 가능성

- `store_qr_placements` 스키마 실측: `id / organization_id / qr_code_id / placement / label / corner_ref / status / started_at / ended_at / created_at / updated_at`.
  `qr_code_id` 를 빼면 나머지는 **매체 중립적**이다 — 일반화의 여지는 구조적으로 존재한다.
- `placement` 는 **개방형 문자열**이다 (`normalizePlacement` 가 대문자·언더스코어로 정규화만 하고 preset 밖 값도 저장). DB CHECK 제약 없음.
- 그러나 `store_qr_placements` 는 production 4 행 전부 `ended` 이고 실운영 이력이 사실상 없다. **일반화의 기반으로 삼기엔 QR 쪽 실사용도 아직 얇다.**

> **판정: 공통 `execution_placements` 는 지금 만들지 않는다.**
> 이미 동작 중인 `store_qr_placements` 를 일반화 목적으로 건드리지 않는다 (WO §13 금지선 준수).
> 일반화는 **최소 2 개 매체가 각각 실사용 배치 데이터를 가진 뒤**에 검토할 사안이다. 현재는 0 개다.

---

## §14. Store Execution Home v2 포함 조건

> **판정: 현재 조건 미충족 — v2 에 POP 을 넣지 않는다.**

실행 홈 v1 의 범위 계약은 "**어디에서 무엇이 지금 사용 중인가**" 였다. POP 을 넣으려면 다음이 **모두** 충족되어야 한다.

1. POP 이 특정 위치에 배치되었음을 나타내는 **저장된 사실**이 있을 것 (현재 없음)
2. 그 위치가 태블릿 코너 라벨과 **같은 축으로 정렬 가능**할 것 (현재 정렬 대상 자체가 없음)
3. 표시할 수치가 **실측 가능**할 것 (§15 — 현재 0 개)

**금지선 재확인**: placement 가 없는 상태에서 `store_execution_assets(pop)` 의 행 수를 "사용 중 POP 17개" 로 표시하는 것은 **§4 의 실측에 정면으로 반하는 허위 표시**다. v2 에서도 이 표시는 금지한다.

---

## §15. Analytics 가능성

| 지표 | 가능 여부 | 근거 |
|---|:---:|---|
| POP 노출수 / 조회수 | **불가** | 인쇄물이며 관측 장치가 없다. 추정도 금지(WO §15). |
| POP 출력(인쇄) 횟수 | **불가** | 인쇄 이벤트 테이블 없음. PDF 열기 행동도 기록되지 않음 |
| POP **생성** 횟수 | 가능 | `store_execution_assets(pop)` 행 수 — 단 §4 대로 **"사용 중" 이 아니라 "만든 횟수"** 로만 표기해야 함 |
| POP 경유 QR 스캔 | **불가** | §10 — POP↔QR 연결이 저장되지 않아 `store_qr_scan_events`(113 건)를 POP 에 귀속시킬 수 없다 |

production 전체에 POP 관련 이벤트 테이블은 **존재하지 않는다** (`%pop%`·`%placement%`·`%execution%`·`%scan%` 전수 조회로 확인).

> POP 에 대해 실행 홈에 표시할 수 있는 **실측 수치는 현재 0 개**다. 이것만으로도 §14 의 포함 조건은 충족되지 않는다.

---

## §16. Signage 비교

| 매체 | 배치 축 | 현재 상태 |
|---|---|---|
| Tablet | `store_tablets.location` (자유 문자열) | 9 대 · 8 대가 location 보유 → **실행 홈 v1 의 위치 축이 여기서 나온다** |
| QR | `store_qr_placements` (전용 테이블) | 4 행 전부 ended · active 0 |
| Signage | `store_playlists` + 재생 장치 | 11 행 — 장치가 곧 위치라 **Tablet 과 같은 해법**을 쓸 수 있다 |
| **POP** | **없음** | — |
| ESL | 없음 | 미구현 (QR placement 어휘에 `ESL` 값만 존재) |

**시사점**: 배치 축이 성립한 매체(Tablet·Signage)의 공통점은 **물리 장치가 DB 행으로 존재**한다는 것이다. 장치가 자기 위치를 들고 있으므로 별도 placement 테이블이 필요 없었다.
POP·ESL 은 장치 행이 없는 매체라 **배치를 표현하려면 별도 축이 불가피**하다 — QR 이 전용 placement 테이블을 갖게 된 이유와 같다. 이 구조적 차이는 §12 의 후보 B 를 지지하지만, **실사용 0 이라는 사실을 뒤집지는 못한다.**

---

## §17. Store Corner entity 승격 관계

> **판정: `STILL_DEFER` — 직전 회차의 보류 판단을 유지한다. POP 조사는 승격 근거를 추가하지 못했다.**

- `store_qr_placements.corner_ref` 는 production 4 행 **전부 빈 값**이다. 코너 참조가 실제로 쓰인 적이 없다.
- 코너 라벨의 실제 형태는 여전히 서비스별로 갈린다 — KPA `구강관리 코너`(한글 명칭), PH `A-2`/`C-2`/`F-2`(코드).
- POP 이 코너 축에 기여할 수 있으려면 POP placement 가 먼저 있어야 하는데 없다.

> **Corner entity 승격은 POP 이 아니라 "복수 매체가 같은 코너를 실제로 참조하기 시작한 시점" 에 재판정한다.**

---

## §18. Production read-only 실측 요약

- 접속: cloud-sql-proxy(127.0.0.1:15432) → `o4o_platform`, 계정 `o4o_api_v2`, **SELECT 전용**. 조사 종료 후 프록시 종료.
- **운영 write 0** — INSERT/UPDATE/DELETE/DDL 을 한 건도 실행하지 않았다.
- 조회 범위: COUNT / GROUP BY / 상태 컬럼 / date / boolean / 조직 UUID·조직명 / 자산 제목.
  자산 제목 4 건(`후시딘연고…`)은 의약품명이며 개인정보가 아니다. 개인정보 컬럼은 조회하지 않았다.
- 조직 식별자는 조사 결론(단일 테스트 조직)에 필수여서 UUID·명칭을 그대로 기록했다. 해당 조직명은 `테스트 약국` 으로, 실 매장이 아니다.

---

## §19. 최종 분류

| 항목 | 판정 |
|---|---|
| `store_pops` | **`LIVE_BUT_UNUSED`** — 기능 완비 · 상류(operator 원본) 공백으로 실사용 0 |
| `store_execution_assets(usage_type='pop')` | **`OUTPUT_ARTIFACT_LOG`** — 출력 이력. 배치·사용 현황이 아님 |
| POP 실사용 여부 | **`NO_REAL_WORLD_USAGE_EVIDENCE`** — 실 매장 0 곳 |
| POP Placement 필요성 | **`NOT_YET_JUSTIFIED`** — 부정이 아니라 근거 부족 |
| 공통 Placement 모델 | **`DEFER`** — 실사용 배치 매체 0 개 상태에서 일반화하지 않음 |
| Execution Home v2 POP 포함 | **`EXCLUDE`** — §14 3 조건 전부 미충족 |
| Store Corner entity | **`STILL_DEFER`** — 직전 판단 유지 |
| KPA/PH parity | **`MISSING_ADOPTION`** — PH 출력 축 결손 · IA 축 불일치 |
| IMPLEMENTATION | **`NOT_STARTED`** |

---

## §20. 산출물

- 본 IR 1 건.
- **DESIGN 문서는 만들지 않았다.** §12·§13 의 모델을 이번 증거로 확정할 수 없다고 판정했고, WO §20 은 "확정할 수 없으면 IR 에 선택지까지만 남긴다" 를 허용한다. 선택지는 §12 표(A~E)에 기록했다.

---

## §21. 이번 회차에서 하지 않은 것 (WO §21 준수)

코드 수정 0 · migration 0 · schema 변경 0 · POP placement 구현 0 · Execution Home v2 구현 0 · QR placement 변경 0 · Store Corner entity 생성 0 · Signage/ESL 구현 0 · **production write 0**.

---

## §22. 다음 회차 제안 (구현 WO 아님 — 판단 요청)

이번 조사가 드러낸 것은 **"POP Placement 를 어떻게 만들 것인가" 가 아니라 "POP 이 왜 한 번도 안 쓰였는가"** 다. 순서를 뒤집는 것을 제안한다.

1. **POP 이 안 쓰이는 이유를 먼저 제거한다** (택 1 또는 병행)
   - a. operator HUB POP 원본을 실제로 게시한다 → `store_pops` 축이 처음으로 돌기 시작한다
   - b. KPA `/store/content/pop` 을 사이드바에 연결한다 (IA 공백 해소 · route 이미 존재)
   - c. PH 에 POP 출력 축(`/pharmacy/pop/generate`)을 마운트한다 (`MISSING_ADOPTION` 해소)
2. 실사용이 생긴 뒤 **배치 데이터의 실제 형태를 관측**한다 (POP 이 코너 단위인지, 매대 단위인지, QR 동반이 기본인지).
3. 그 관측 위에서 §12 의 A~E 중 하나를 확정하고, **POP Placement + Execution Home v2 를 한 번에 묶는다.**

> 1-a / 1-b / 1-c 중 무엇을 먼저 할지는 **사업 판단**이므로 이 IR 에서 결정하지 않는다.

---

**최종 판정**

```text
STORE_POPS                    = LIVE_BUT_UNUSED
STORE_EXECUTION_ASSETS_POP    = OUTPUT_ARTIFACT_LOG (17행 = 테스트 조직 1곳의 생성 이력)
POP_REAL_WORLD_USAGE          = NO_EVIDENCE
POP_PLACEMENT_NEED            = NOT_YET_JUSTIFIED
COMMON_PLACEMENT_MODEL        = DEFER
EXECUTION_HOME_V2_POP         = EXCLUDE
STORE_CORNER_ENTITY           = STILL_DEFER
KPA_PH_POP_PARITY             = MISSING_ADOPTION
IMPLEMENTATION                = NOT_STARTED
```
