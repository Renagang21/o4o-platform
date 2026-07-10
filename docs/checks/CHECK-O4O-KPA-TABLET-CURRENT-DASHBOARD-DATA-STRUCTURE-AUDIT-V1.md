# CHECK-O4O-KPA-TABLET-CURRENT-DASHBOARD-DATA-STRUCTURE-AUDIT-V1

> WO: `WO-O4O-KPA-TABLET-CURRENT-DASHBOARD-DATA-STRUCTURE-AUDIT-V1`
> 유형: **READ-ONLY 조사** — 코드 변경 0 / DB write 0 / migration 0 / 배포 0.
> 조사 대상 commit: `30a359615265dd25391841f0258fb8285b458732` (main)
> 조사일: 2026-07-10
> 조사 화면: `https://kpa-society.co.kr/store/commerce/tablet-displays` (관리) + `https://kpa-society.co.kr/tablet/:slug` (공개 뷰어)
> 선행 조사: [IR-O4O-KPA-TABLET-CONFIGURATION-CURRENT-STATE-AUDIT-V1](../investigations/IR-O4O-KPA-TABLET-CONFIGURATION-CURRENT-STATE-AUDIT-V1.md) (2026-06-26) — 본 문서는 그 이후 추가된 **전시 설정 / 진열별 콘텐츠(content_id) / 운영자 공통 대기영상** 을 포함해 최신 상태로 갱신.

---

## 0. 결론 요약 (TL;DR)

- 현재 대시보드의 **1차 관리 축은 "태블릿 기기(store_tablets row)"** 이다. `selectedTabletId` 하나가 진열/idle/설정/운영자공통영상/공개URL/미리보기를 모두 구동한다. **"코너/위치"는 관리 축이 아니라 `store_tablets.location` 자유 텍스트 라벨 + 카피 수준**이다.
- **"화면 세트(Screen Set)" / "화면 블록(Screen Block)" 개념은 데이터·API·UI 어디에도 존재하지 않는다.** 진열은 `store_tablet_displays` 평면 row 리스트(sort_order), 대기화면은 `store_tablets.idle_playlist_items` JSONB, 전시 설정은 별도 org-단위 테이블 — **서로 다른 3개 저장소에 파편화**되어 있고 각각 독립 저장 버튼을 가진다.
- **대기화면은 진열 세트 안의 블록이 아니라 완전히 별도 영역**이다(별도 테이블/컬럼 + 별도 저장). WO가 지향하는 "대기화면 = 화면 세트의 한 블록" 모델과 현재 구조는 어긋난다.
- **공개 런타임의 상품 source of truth = 동적 쿼리**(supplier: OPL 4-gate / local: store_local_products). `store_tablet_displays` 는 그 위에 얹히는 **큐레이션·정렬 오버레이**(visible display row 있으면 restrict+order = `configured`, 없으면 `legacy_fallback` = 전체 노출)일 뿐이다.
- **판정: 기존 구조 견고 → 전면 재구축 불필요.** 단 (A) "위치/코너 중심 UX 재배치"는 **schema 없이** 가능(기존 tablet+location 재활용), (B) "화면 세트/블록" 정식 모델과 "대기화면=블록" 통합은 **schema migration 필요**(신규 테이블 + displays/idle/settings 를 block 으로 재해석). → 후속 WO는 저비용 UX refit 을 선행하고, screen-set/block 은 설계 WO 로 분리 권장.
- 실증: 프로덕션에서 운영자가 이미 코너 개념을 **자유 텍스트에 우겨넣고 있음** — 태블릿 name `화장품 코너`, `IDLE 검증 코너 B`, location `A - 1 섹터`. 구조화된 코너 엔티티 부재의 방증.

---

## 1. 프론트 라우트 / 컴포넌트 전수표

관리 진입: `services/web-kpa-society/src/App.tsx` — `<Route path="commerce/tablet-displays" element={<StoreTabletDisplaysPage/>}>`. 공개 뷰어: `App.tsx:916` `/tablet/:slug` (무인증, 전체화면) → `TabletStorePage`.

| 파일/컴포넌트 | 역할 | 현재 기준축 | 유지/전환/폐기 | 비고 |
|---|---|---|---|---|
| `web-kpa-society/.../pharmacy/StoreTabletDisplaysPage.tsx` (1446줄) | 관리 페이지 실체. 세로 누적 6 섹션 | **태블릿 기기(store_tablets row)** — `selectedTabletId`가 전부 구동 | **유지** (다축 재정렬 검토) | 페이지 상단 탭 없음. 진입 시 first active tablet 자동 선택 |
| `web-kpa-society/.../api/tabletDisplays.ts` | 저장측 관리 API 클라이언트(진열/idle/설정/운영자공통영상) | 태블릿 ID 단위 (`/store/tablets/{id}/...`) | 유지 | `tablet-display-settings`만 매장(org) 공통 |
| `web-kpa-society/.../api/tablet.ts` | 공개 뷰어용 API(`fetchTabletProducts/Idle/Settings/Interest`) | 매장 slug 중심 | 유지 | 미리보기·공개 뷰어 공용 |
| `web-kpa-society/.../pages/tablet/TabletStorePage.tsx` | 공개 뷰어 KPA 래퍼. `idleTimeoutMs=60000` 고정, settings/idle 주입 | slug(+optional tabletId) | 유지 | settings는 tabletId 미전달(org 단위) |
| `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | 공개 키오스크 뷰어(브라우즈 그리드/상세/idle overlay) | 상품 리스트 + idle 항목 | 유지 (공통 패키지) | 자체 미니 플레이어(사이니지 런타임 아님) |
| `packages/tablet-kiosk-core/src/IdlePlaylistEditor.tsx` | idle 재생목록 편집기(image/video URL 리스트) | 항목 리스트 | 유지 | displays와 무관한 독립 편집 |
| `apps/admin-dashboard/.../store/tablet/TabletChannelSettingsPage.tsx` + `api/tablet-operator.api.ts` | **별개 트랙** — TABLET 채널 상품 노출 ON/OFF (`/store/tablet/operator/*`) | listing(상품) visibility | 별개 트랙(본 WO 무관) | **"운영자 공통 idle 영상"이 아님**. 혼동 주의 |

### 관리 화면 6 섹션 (세로 누적, 상단 탭 없음)

```
1. 태블릿 목록 DataTable (등록 폼: 이름·위치 자유텍스트 / 행 클릭으로 선택)   [축: 태블릿]
2. 이 태블릿의 공개 화면 URL  ({origin}/tablet/{slug}?tabletId={id} 복사)      [축: 태블릿]
3. 서비스 공통 대기 영상 (운영자 제공 후보 중 1개 선택 — 모달)  [저장경로 ③]  [축: 태블릿]
4. 대기 화면(Idle) 편집 (IdlePlaylistEditor + "대기 화면 저장")   [저장경로 ②]  [축: 태블릿]
5. 태블릿 화면 설정 (가격/QR/상담버튼 토글 + 자동넘김/idle전환 select) [저장경로 ④] [축: 매장(org) 공통]
6. 진열 편집기 2단 (상품 풀[supplier/local 서브탭] → 현재 화면 구성[순서·표시·진열별 콘텐츠]) [저장경로 ①] [축: 태블릿]
```

> **파편화 관찰**: 단일 "저장"이 아니라 **4개 독립 저장 경로**(① displays PUT / ② idle-playlist PUT / ③ operator-common selection POST / ④ display-settings PUT). "화면 세트를 편집하고 저장" 하는 단일 편집 단위가 없다.

---

## 2. 백엔드 API 전수표

마운트: `/api/v1/store/*` = `createStoreTabletRoutes` (`register-routes.ts:316`), 전 라우트 `requireAuth + requirePharmacyOwner`(org 스코프). 공개 `/api/v1/stores/:slug/tablet/*` = 무인증(slug 스코프). 운영자 강제콘텐츠 `/api/signage/:serviceKey/hq/forced-content*` = `requireSignageOperator`.

| API | method/path | R/W | 사용 테이블 | public 영향 | 유지/전환/폐기 |
|---|---|:--:|---|:--:|---|
| 태블릿 목록/등록/수정/비활성 | GET/POST/PUT/DELETE `/store/tablets[/:id]` | R/W | store_tablets | △ (공개=first active tablet) | 유지 |
| 진열 구성 조회 | GET `/store/tablets/:id/displays` | R | store_tablet_displays, kpa_store_contents(LJ) | — | 유지 |
| **진열 구성 저장** | PUT `/store/tablets/:id/displays` | W | store_tablet_displays (검증: OPL / store_local_products / kpa_store_content_product_links) | ✅ | 유지 |
| 상품 풀 조회 | GET `/store/tablets/:id/product-pool` | R | OPL, supplier_product_offers, product_masters, store_local_products | — | 유지 |
| idle playlist 조회/저장 | GET/PUT `/store/tablets/:id/idle-playlist` | R/W | store_tablets.idle_playlist_items(jsonb) | ✅ | 유지 |
| 전시 설정 조회/저장 | GET/PUT `/store/tablet-display-settings` | R/W(upsert) | store_tablet_display_settings | ✅ | 유지 |
| 운영자 공통영상 후보 | GET `/store/tablet-operator-common-idle-candidates` | R | signage_forced_content | — | 유지 |
| 운영자 공통영상 선택/해제/조회 | POST/DELETE/GET `/store/tablets/:id/operator-common-idle-selection` | R/W | store_tablet_operator_idle_selections (검증: store_tablets, signage_forced_content) | ✅ | 유지 |
| 관심요청 건수/목록/통계/확인/완료/취소 | GET·PATCH `/store/interest/*` | R/W | tablet_interest_requests | — | 유지 |
| 바코드 상품 등록 | POST `/store/products/register-by-barcode` | W | store_product_profiles (upsert) | — | **폐기/전환 후보** (product-pool이 미소비) |
| **[공개]** 태블릿 상품 | GET `/stores/:slug/tablet/products` | R | (동적) OPL 4-gate + store_local_products + store_tablet_displays 오버레이 | ✅ | 유지 |
| **[공개]** idle 재생목록 | GET `/stores/:slug/tablet/idle` | R | store_tablets, store_tablet_operator_idle_selections, signage_forced_content | ✅ | 유지 |
| **[공개]** 전시 설정 | GET `/stores/:slug/tablet/settings` | R | store_tablet_display_settings | ✅ | 유지 |
| **[공개]** 관심요청 생성/상태 | POST/GET `/stores/:slug/tablet/interest[/:id]` | R/W | tablet_interest_requests (+ settings 가드 403) | ✅ | 유지 |
| **[운영자]** 강제콘텐츠 CRUD | GET/POST/PATCH/DELETE `/signage/:serviceKey/hq/forced-content[/:id]` | R/W | signage_forced_content | ✅ (target_surface tablet_idle/both 시 태블릿 후보) | 유지 |

**핵심 write path**
- 상품 배정: PUT `/store/tablets/:id/displays` → **단일 테이블 `store_tablet_displays` 전체 삭제+재삽입**(교체). `content_id`(진열별 콘텐츠)도 같은 PUT에 포함, 별도 엔드포인트 없음.
- 운영자 공통영상 선택: POST → **`store_tablet_operator_idle_selections`** (기존 active `cleared_at=NOW()` 후 insert, 태블릿당 partial unique 1개). 영상 후보 자체는 운영자 소유 `signage_forced_content`.

---

## 3. DB 테이블 / 컬럼 요약

> 3개 테이블(`signage_forced_content`, `store_tablet_display_settings`, `store_tablet_operator_idle_selections`)은 **TypeORM 엔티티 클래스 없이 raw SQL** 로만 접근.

| 테이블 | 핵심 컬럼(타입) | 생성/변경 migration | 역할 |
|---|---|---|---|
| **store_tablets** | id · organization_id(FK→organizations CASCADE) · name(100) · **location(100) NULL** · is_active · **idle_playlist_items(jsonb)** · created_at | `20260224200000-CreateStoreLocalProductTables` / idle `20260509000000` | 태블릿 기기 등록(매장 단위). idle 재생목록 inline |
| **store_tablet_displays** | id · tablet_id(FK→store_tablets CASCADE) · product_type CHECK('supplier'\|'local') · product_id(soft) · sort_order · is_visible · **content_id(FK→kpa_store_contents SET NULL)** · created_at | 생성 `20260224200000` / content_id `20261129000000` | 태블릿 진열 상품 평면 리스트 + 진열별 콘텐츠 연결 |
| **store_tablet_display_settings** | id · **organization_id UNIQUE(FK 없음)** · show_price=t · show_qr=t · show_consultation_button=t · auto_slide_seconds=10 · idle_slide_seconds=10 · created/updated | `20261127000000-CreateStoreTabletDisplaySettings` | **매장(org) 단위** 공개 노출 규칙(org당 1행) |
| **store_tablet_operator_idle_selections** | id · organization_id · **tablet_id** · forced_content_id · selected_by_user_id · selected_at · cleared_at · created/updated · **partial UNIQUE(tablet_id) WHERE cleared_at IS NULL** · FK 전무(soft) | `20261203000000-AddTabletIdleToForcedContentAndSelections` | 태블릿 1대가 운영자 공통 강제영상 1개를 대기화면으로 선택한 기록 |
| **signage_forced_content** | id · service_key · title · video_url · source_type(youtube\|vimeo…) · embed_id · start_at/end_at · is_active · deleted_at · media_id · campaign_request_id · **target_surface(20)='signage'** · **tablet_duration_seconds** | 생성 `20260418100000` / 캠페인 `20260430000001` / 태블릿 idle `20261203000000` | 운영자 강제콘텐츠. target_surface 로 태블릿 대기화면 후보 게이팅 |
| **tablet_interest_requests** | id · organization_id(FK CASCADE) · master_id(FK, entity에서 nullable 완화) · product_name · customer_name/note · status(REQUESTED/ACK/COMPLETED/CANCELLED) · 타임스탬프 | `20260301400000-TabletInterestRequests` | 고객 관심요청 큐(주문 아님, E-commerce Core 분리) |

**idle_playlist_items JSONB shape** (`store-tablet.entity.ts`): `{ type:'image'|'video', url:string, durationMs?:number }[]` (durationMs는 image 전용, video는 onEnded 자동전환 기본 5000ms).

**관계 그래프** (FK=하드 / soft=제약없는 컬럼)
```
organizations
  ├─(FK)→ store_tablets ─(FK)→ store_tablet_displays ─(FK SET NULL)→ kpa_store_contents
  │                                     └─(soft)→ product_id (supplier=OPL / local=store_local_products)
  ├─(soft, UNIQUE)→ store_tablet_display_settings          ← 매장(org) 단위, 태블릿 무관
  ├─(FK)→ tablet_interest_requests ─(FK)→ product_masters
  └─(soft)→ store_tablet_operator_idle_selections ─(soft)→ store_tablets / signage_forced_content
signage_forced_content  (target_surface / tablet_duration_seconds 로 태블릿 idle 노출 게이팅)
```

### 프로덕션 실측 (read-only SELECT, 2026-07-10, Cloud SQL proxy)

| 대상 | count |
|---|---:|
| store_tablets | 4 |
| store_tablet_displays | 2 |
| store_tablet_display_settings | 2 |
| store_tablet_operator_idle_selections (active) | 0 |
| store_local_products | 35 |
| tablet_interest_requests | 3 |
| signage_forced_content (target_surface tablet_idle/both, 미삭제) | 0 |
| store_tablets (idle_playlist_items 有) | 1 |

샘플 (store_tablets name / location):
```
화장품 코너        | A - 1 섹터
SMOKE_타블렛        | 미리보기검증
[SMOKE-TABLET] 임시 | (null)
IDLE 검증 코너 B    | 검증
```
→ **운영자가 코너 의미를 name·location 자유텍스트에 인코딩 중**(구조화 코너 엔티티 부재의 실증). 현재 배포·경량 사용 단계(진열 2건, active 운영자영상 0, 태블릿 idle forced content 0).

---

## 4. Public runtime 데이터 흐름

```
Customer → GET /tablet/:slug  (무인증, 전체화면)  [?tabletId= 선택 / ?from=qr 배지]
      │  TabletStorePage 가 3개 fetch:
      ├─► GET /stores/:slug/tablet/products?tabletId=      (상품)
      ├─► GET /stores/:slug/tablet/idle?tabletId=          (대기화면)
      └─► GET /stores/:slug/tablet/settings                (설정 — tabletId 미전달, org 단위)
                │
   resolvePublicStore(slug) → platform_store_slugs → storeId + serviceKey
                │
  ┌── PRODUCTS ─────────────────────────────────────────────────────────────┐
  │ resolveTabletDisplaySource(storeId, tabletId):                           │
  │   ?tabletId 유효&active → 그 태블릿(source='query')                        │
  │   else → first active store_tablets(created_at ASC, 'first_active')       │
  │   configured = COUNT(visible store_tablet_displays) > 0                    │
  │ supplier = 동적 4-gate: spo→pm→neture_suppliers(ACTIVE)→OPL(org+svc+active)│
  │            →opc(active)→oc(type=TABLET,status=APPROVED)                    │
  │ local    = store_local_products(org+is_active)                            │
  │ [configured] 위 집합을 store_tablet_displays(tablet_id, is_visible)로       │
  │              INNER 제한 + sort_order 정렬 ; [else] legacy_fallback 전체     │
  │ [hasTablet] disp.content_id → kpa_store_content_product_links →           │
  │              kpa_store_contents (진열별 선택 콘텐츠 HTML/번역 attach)        │
  └──────────────────────────────────────────────────────────────────────────┘
  ┌── IDLE ────────────────────────────────────────────────────────────────┐
  │ base = 해당 태블릿 store_tablets.idle_playlist_items (jsonb)              │
  │ operator common: store_tablet_operator_idle_selections(selected, 기간내)  │
  │   → 없으면 deterministic fallback(seed=tabletId+오늘, hash mod) 후보 1개   │
  │   → source_type youtube/vimeo 면 items 맨 앞에 PREPEND (override 아님)     │
  └──────────────────────────────────────────────────────────────────────────┘
  ┌── SETTINGS ── store_tablet_display_settings WHERE organization_id ────────┐
  │ → showPrice/showQr/showConsultationButton/autoSlideSeconds/idleSlideSeconds│
  └──────────────────────────────────────────────────────────────────────────┘
                │
   TabletKioskPage: products=[...supplier, ...local]; browse/detail/idle overlay
   displaySettings 로 가격/QR배지/상담버튼/자동넘김/idle전환 게이팅
```

**device-scoped vs store-scoped 정리**
- device(tablet)-scoped: 진열 큐레이션 필터(`disp.tablet_id`), idle 재생목록(`idle_playlist_items` of that tablet), 운영자 공통영상 선택(`selections.tablet_id`).
- store(org)-scoped: 상품 풀 자체(OPL/local), **전시 설정**(tabletId 미사용 → 코너별 다른 태블릿이 설정 1행 공유).
- **first active tablet fallback**: `?tabletId=` 없으면 항상 가장 오래된 태블릿으로 해석 → **코너별 공개 URL 분기는 tabletId 파라미터에만 의존**(device pairing 부재).

---

## 5. 필수 결론 질문 12문 답변

| # | 질문 | 답 |
|---|---|---|
| 1 | 위치 중심 vs 상품 편성 중심? | **둘 다 아님 — "태블릿 기기" 중심.** 그 위에 태블릿별 상품 편성(displays). 위치는 자유텍스트 라벨 |
| 2 | "코너/위치" 개념 명시적 존재? | **아니오.** `store_tablets.location` varchar(100) 자유텍스트 1개뿐. corner/zone 엔티티·테이블 없음 |
| 3 | "화면 세트" 개념 존재? | **아니오.** 재사용 가능한 명명된 화면 묶음 테이블/타입 전무 |
| 4 | "화면 블록" 개념 존재? | **아니오.** 진열 = `store_tablet_displays` 평면 row(sort_order). 블록 타입 개념 없음 |
| 5 | 대기화면: 별도 설정 vs display 포함? | **완전 별도.** `store_tablets.idle_playlist_items`(jsonb) + 별도 저장 버튼. displays와 무관 |
| 6 | operator common idle video 어느 축? | **태블릿 축**(`selections.tablet_id`, 태블릿당 1개). 후보는 운영자 축(`signage_forced_content` + serviceKey). 매장은 선택만 |
| 7 | public runtime source of truth? | 상품 = **동적 쿼리(OPL 4-gate + local)**, `store_tablet_displays`는 큐레이션·정렬 오버레이. idle = idle_playlist_items + 운영자영상 prepend. 설정 = org 단위 |
| 8 | 기존 구조 유지하며 UX만 변경 가능? | **부분 가능.** 위치/코너 중심 재배치(기존 태블릿을 location 으로 그룹핑)는 **schema 없이 가능**. 단 "화면 세트 편집·배정" UX는 데이터 부재로 UI만으로 불가 |
| 9 | screen set/block 만들려면 migration 필요? | **필요.** 신규 테이블(screen_set / screen_set_block / assignment) + displays·idle·settings 를 block 으로 흡수하는 설계 필요 |
| 10 | store_tablet_displays 를 screen set item 으로 재해석 가능? | **부분.** displays row ≈ "상품 리스트 블록"의 항목으로 볼 수 있으나, idle(jsonb)·설정(별도 테이블)은 displays row 가 아니므로 **통합 block 레이어가 셋 다 흡수**해야 함. 단순 재라벨링 불가 |
| 11 | 재사용해야 할 부분? | 태블릿 CRUD, product-pool 쿼리, **supplier 4-gate visibility**, displays 큐레이션·정렬, `content_id` 진열별 콘텐츠, idle 플레이어(tablet-kiosk-core), 운영자 공통영상 merge, 전시 설정, `resolveTabletDisplaySource`, 미리보기+URL 복사 — **전부 견고, 재사용** |
| 12 | 폐기/후순위? | ① `register-by-barcode`→`store_product_profiles`(pool 미소비) 폐기/전환 후보 · ② `show_qr` 설정(뷰어에 QR 표면 없음, 현재 사실상 무효) · ③ 4개 파편 저장 경로(screen-set UX 로 통합 후보) · ④ first-active-tablet 비결정 fallback(device pairing 후속) · ⑤ 코너/위치 자유텍스트(구조화 후보) |

---

## 6. 현재 구조 기준축 판정 & 화면 세트/블록 전환 가능성

### 6.1 기준축 판정

```
일반 사이니지 CMS:   Content → Playlist → Screen → Schedule
O4O 코너 태블릿(목표): Corner/Location → Screen Set → Screen Block → Content/Product

현재 O4O 태블릿(실제): Tablet(기기) → [displays 평면리스트 | idle jsonb | settings(org) | 운영자영상(선택)]
                        └ 4개 파편 저장소, "화면 세트/블록/코너" 계층 없음
```

- **현재 = Device-first**(기기 1대 중심), product-arrangement 는 기기별 오버레이. **Corner-first 도, Screen-set 도 아니다.**

### 6.2 전환 가능성 판정

| 목표 모델 | schema migration | 재해석 가능성 | 비용 |
|---|:--:|---|:--:|
| **B. 위치/코너 중심 UX 재배치** (기존 태블릿을 location 으로 그룹핑, 좌측 트리/탭) | **불필요** | 기존 store_tablets.location + 다중 태블릿 재활용. 공개 URL 코너별은 이미 `?tabletId=` 로 가능 | 低 |
| **A/C. Screen Set / Block 정식 모델** | **필요** | displays=product 블록, idle=idle 블록, settings 일부=블록 속성 으로 흡수하는 신규 테이블 설계 | 中~高 |
| **D. 대기화면 = Screen Set 블록 통합** | **필요** | idle 를 jsonb-on-tablet 에서 screen-set 블록으로 이전(공개 idle 조립 로직 재작성) | 中 |

- **핵심 판단**: 현재 데이터로 "여러 화면 세트를 만들어 코너에 배정" 은 표현 불가(assignment·set·block 부재). 그러나 **위치별 태블릿 관리 UX 재배치는 schema 없이 즉시 가능**. → 저비용 UX 개선을 먼저, screen-set/block 은 **설계 WO 로 분리**하는 단계적 접근이 안전.

---

## 7. 유지 / 전환 / 폐기 분류

**유지 (재사용, 견고)**
- store_tablets CRUD, product-pool + supplier 4-gate visibility, store_tablet_displays 큐레이션·정렬, content_id 진열별 콘텐츠, idle 플레이어(tablet-kiosk-core), 운영자 공통영상 후보/선택/merge, 전시 설정(org), public `resolveTabletDisplaySource`, 미리보기 + 공개 URL 복사, 관심요청 큐.

**전환 (재해석/재배치 후보)**
- store_tablet_displays 평면 리스트 → (선택 시) screen-set 의 "상품 리스트 블록" 으로 재해석.
- idle_playlist_items(jsonb) + 운영자영상 → (선택 시) screen-set 의 "대기화면 블록" 으로 통합.
- store_tablet_display_settings(org) → 코너/기기별 세분화 시 스코프 확장(현재 org 1행 공유).
- 4개 파편 저장 경로 → screen-set 단위 편집·저장 UX 로 통합.

**폐기 / 후순위**
- `register-by-barcode` → `store_product_profiles` (태블릿 pool 미소비 — dead-ish, 정리 후보).
- `show_qr` 설정 (뷰어에 QR 표면 없음, 사실상 무효 — 표면 생기기 전 후순위).
- first-active-tablet 비결정 fallback (device pairing WO 에서 해소).

---

## 8. 다음 WO 제안 (단계적 권장 순서)

1. **[선행·저비용] WO-O4O-KPA-TABLET-DASHBOARD-LOCATION-FIRST-UX-REFIT-V1** (WO 후보 B) — 기존 schema 유지, 관리 UI 를 좌측 "위치/코너(=location) → 태블릿 목록 → 현재 구성" 트리로 재배치. 진입 시 코너별 현황 파악. *데이터 이미 존재 → 최저 비용·즉효.*
2. **[설계] WO-O4O-KPA-TABLET-CORNER-SCREEN-SET-BLOCK-DESIGN-V1** (WO 후보 A) — Corner/Location·Screen Set·Screen Block·Assignment 개념/테이블/API 계약 설계(구현 아님). displays/idle/settings 흡수 매핑 정의. F3 Store Layer / Signage 경계 정합 검토 포함.
3. **[설계] WO-O4O-KPA-TABLET-IDLE-BLOCK-INTEGRATION-DESIGN-V1** (WO 후보 D) — 대기화면을 별도 저장이 아니라 screen-set 블록으로 통합하는 마이그레이션·공개 조립 로직 재설계.
4. **[후순위] WO-O4O-KPA-TABLET-DEVICE-SCOPED-PUBLIC-VIEW-V1** — device pairing 으로 first-active fallback 제거 + 전시 설정 코너/기기별 스코프 확장.

> 후보 C(screen-set schema 설계)는 후보 A 설계에 포함해 통합 진행 권장. 전면 재구축은 **비권장**(기능·데이터 견고, 증분 확장이 안전).

---

## 9. 완료 기준 대비

| 완료 기준 | 상태 |
|---|:--:|
| 현재 `/store/commerce/tablet-displays` UI 구조 설명 | ✅ §1 |
| 현재 데이터 모델 + public runtime 연결 설명 | ✅ §3·§4 |
| 코너별 다수 태블릿 운영 적합성 판정 | ✅ §5(Q1·Q2)·§6 (device-first, 코너 구조 부재) |
| screen set/block 도입 필요성 판단 | ✅ §5(Q9·Q10)·§6.2 (migration 필요) |
| 다음 구현/설계 WO 범위 제안 | ✅ §8 |
| 코드 변경 0 / DB write 0 / migration 0 | ✅ (read-only SELECT + 조사만; 코드·스키마 무변경) |
| CHECK 문서 커밋·push | ⏳ 본 커밋에서 완료 |

---

## 부록 — 핵심 코드 참조

| 항목 | 위치 |
|---|---|
| 관리 페이지 | `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` |
| 관리 API 클라이언트 | `services/web-kpa-society/src/api/tabletDisplays.ts` |
| 공개 뷰어 래퍼 / API | `services/web-kpa-society/src/pages/tablet/TabletStorePage.tsx` · `src/api/tablet.ts` |
| 공개 뷰어 컴포넌트 | `packages/tablet-kiosk-core/src/{TabletKioskPage,IdlePlaylistEditor,idleMedia,types}.ts(x)` |
| 백엔드 저장 라우트 | `apps/api-server/src/routes/platform/store-tablet.routes.ts` |
| 공개 핸들러 / 유틸 | `apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts` · `store-public-utils.ts` |
| 운영자 강제콘텐츠 | `apps/api-server/src/routes/platform/signage/controllers/forced-content.controller.ts` |
| 엔티티 | `apps/api-server/src/routes/platform/entities/store-tablet{,-display}.entity.ts` · `tablet-interest-request.entity.ts` |
| 마이그레이션 | `20260224200000` / `20260509000000` / `20261127000000` / `20261129000000` / `20261203000000` / `20260301400000` / `20260418100000` / `20260430000001` |
| 별개 트랙(혼동 주의) | `apps/admin-dashboard/src/pages/store/tablet/TabletChannelSettingsPage.tsx` (상품 노출 토글, idle 영상 아님) |
