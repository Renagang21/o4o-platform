# IR-O4O-KPA-TABLET-CONFIGURATION-CURRENT-STATE-AUDIT-V1

> 조사 대상: KPA 매장 `타블렛 구성`(`/store/commerce/tablet-displays`)의 기능 실체 + 재설계 방향
> 유형: **READ-ONLY 조사 (코드·DB·API·UI·메뉴 변경 없음)** / 조사일: 2026-06-26 / 범위: KPA, 온라인 판매 제외

---

## 1. 결론 요약

- `/store/commerce/tablet-displays`(`StoreTabletDisplaysPage`)는 **이미 동작하는 실기능**이다: ① 매장 내 **타블렛 기기 등록**(이름+위치), ② 선택 타블렛별 **진열 상품 배치**(공급 상품 + 자체 상품, 순서/표시), ③ **Idle 재생목록**(이미지/동영상). placeholder 아님.
- **위치별 타블렛 관리**는 부분 존재(기기 row에 `location`, 다중 기기 등록 가능). 단 **공개 고객 화면의 기기별 분리는 미완**(device pairing 부재 → 공개 idle/products는 매장 단위).
- **전시 설정(자동넘김/가격표시/QR/상담버튼 등)은 현재 미구현**(전용 테이블·컬럼 없음). → "전시 설정"은 별도 메뉴 분리 대상이 아니라 **신규로 만들 영역**(타블렛 구성 내부 탭 후보).
- **내 매장 제품(`/store/my-products`)과의 연결**: 화면 직접 링크는 없으나 **데이터는 공유**(둘 다 `organization_product_listings`). my-products에 등록한 상품이 타블렛 "공급 상품" 풀에 나타난다. 타블렛은 추가로 `store_local_products`(자체 상품)도 별도 지원.
- **상담/관심 요청**은 타블렛 구성 화면이 아니라 **공개 뷰어**에서 생성되고(`tablet_interest_requests`), in-app 알림(targetUrl=`/store/commerce/tablet-displays`)으로 통지된다. 타블렛 구성 화면에는 상담 관련 UI(대기 건수/바로가기)가 **없다**.
- **판정**: 현재 구조는 견고 → **재구축 불필요, 증분 확장**(전시 설정 / my-products picker 통합 / 미리보기 / 위치별 공개 화면). 상담요청 메뉴는 복구하지 않고 알림 진입 유지.

---

## 2. 현재 메뉴 / route 구조

```
타블렛 (메뉴 그룹, KPA 블록)
├─ 내 매장 제품   /store/my-products              (StoreProductsManagerPage)
└─ 타블렛 구성   /store/commerce/tablet-displays  (StoreTabletDisplaysPage)
```
- route: `App.tsx:1006` `<Route path="commerce/tablet-displays" element={<StoreTabletDisplaysPage />} />` (라우트/가드 기존 그대로).
- 상담 요청(`/store/requests`)은 **메뉴 미노출 + hidden route 유지**(알림 진입 전용, 선행 WO).

---

## 3. 프론트 화면 조사 (`StoreTabletDisplaysPage`)

| 영역 | 존재 | 내용 |
|---|:---:|---|
| 타블렛 기기 목록 | ✅ | DataTable + 등록 폼(이름/위치) + 삭제/일괄삭제 (`fetchTablets/createTablet/deleteTablet`) |
| 위치(location) | ✅ | 등록 시 위치명 입력(`registerLocation`), 기기별 `location` |
| 타블렛별 진열 상품 | ✅ | 선택 타블렛의 진열 grid + 상품 풀(공급/자체 탭) 선택 + 순서(▲▼)/표시 토글 + 일괄 저장 (`fetchTabletDisplays/fetchProductPool/saveTabletDisplays`) |
| Idle 재생목록(콘텐츠) | ✅ | `IdlePlaylistEditor`(@o4o/tablet-kiosk-core), 이미지/동영상 — **매장 단위**(기기 페어링 없어 매장 첫 active tablet 값 공통) |
| 전시 설정 UI | ❌ | 자동넘김/가격/QR/상담버튼 토글 **없음** |
| 미리보기 | ❌ | 고객 화면 미리보기 **없음** |
| 상담/관심 설정 UI | ❌ | 상담 버튼/대기 건수/처리 진입 **없음** |
| 내 매장 제품 연결 UI | ❌ | `/store/my-products` 로의 링크/내비 **없음**(상품 풀은 자체 picker) |

> 페이지 헤더 주석: "1. 진열 상품(Pool/Display grid + 저장) / 2. Idle 재생목록 / idle 은 매장 단위(device pairing 부재)".

---

## 4. API 조사

백엔드: `apps/api-server/src/routes/platform/store-tablet.routes.ts` — 전 엔드포인트 `requireAuth + requirePharmacyOwner` + `organizationId` 스코프.

| 메서드 | 경로 | 역할 |
|---|---|---|
| GET/POST/PUT/DELETE | `/store/tablets[/:id]` | 타블렛 기기 CRUD(name/location/isActive, soft-delete) |
| GET/PUT | `/store/tablets/:id/displays` | 진열 구성 조회/저장(displays[]) |
| GET | `/store/tablets/:id/product-pool` | 상품 풀(supplier+local) |
| GET/PUT | `/store/tablets/:id/idle-playlist` | idle 재생목록 |
| GET/PATCH | `/store/interest/*` | 상담 요청 목록/통계/확인·완료·취소 (= `/store/requests` 처리 화면이 사용) |

공개 뷰어: `store-public/store-public-tablet.handler.ts` — `GET /:slug/tablet/products`(공급+자체 동적 조회), `GET /:slug/tablet/idle`(매장 단위), `POST /:slug/tablet/interest`(상담 요청 생성, rate-limit, in-app 알림 생성 targetUrl=`/store/commerce/tablet-displays`).

> 공개 화면은 `store_tablet_displays`(기기별 배치)를 직접 쓰지 않고 `organization_product_listings + store_local_products` 를 동적 조회 → **기기별 공개 분리 미완**(관리 저장은 기기별, 공개 노출은 매장 단위).

---

## 5. DB / Entity 조사

| 테이블 | 핵심 컬럼 | migration |
|---|---|---|
| `store_tablets` | id, organization_id, name, location?, is_active, **idle_playlist_items(JSONB)** | 20260224200000-CreateStoreLocalProductTables / 20260509000000-AddIdlePlaylistItems |
| `store_tablet_displays` | id, tablet_id(FK CASCADE), **product_type('supplier'|'local')**, product_id(soft ref), sort_order, is_visible | 20260224200000 |
| `store_local_products` | id, organization_id, name, description/summary/detail_html, thumbnail/gallery, price_display, badge_type, highlight_flag, is_active, sort_order | 20260224200000 / 20260224400000 |
| `organization_product_listings` | id, organization_id, service_key, offer_id, product_name, retail_price, is_active, display_order | 20260215000021 |
| `tablet_interest_requests` | id, organization_id, master_id?, product_name, customer_name/note, status(REQUESTED/ACK/COMPLETED/CANCELLED), 타임스탬프 | 20260301400000 |

- **위치별 타블렛**: `store_tablets.location` + org당 다중 row → **개념 존재**.
- **제품 배치**: `store_tablet_displays`(supplier|local, sort, visible) → **존재**.
- **콘텐츠 배치**: `store_tablets.idle_playlist_items`(image/video) → idle 한정. 일반 콘텐츠/POP/사이니지 배치는 **없음**.
- **전시 설정 컬럼**: **없음**.

---

## 6. 전시 설정 개념 조사

- 자동 넘김 시간 / 가격 표시 / QR 표시 / 상담 버튼 표시 등 **설정 컬럼·테이블·UI 모두 없음**.
- 현재 진열 = 상품 선택 + 순서 + 표시 여부, idle = 재생목록. 화면 스타일/노출 규칙 저장 없음.
- → "전시 설정"은 **dead code가 아니라 미존재**. 별도 메뉴 분리 대상이 아니며, 만든다면 **타블렛 구성 내부 신규 영역**(매장 공통 또는 기기별)으로 두는 것이 적절.

---

## 7. 상담/관심 요청 알림 연결 조사

- 생성: 공개 뷰어 `POST /:slug/tablet/interest` → `tablet_interest_requests` + in-app 알림(`store.consultation_requested`, targetUrl=`/store/commerce/tablet-displays`, KPA 한정).
- 처리: 알림 클릭 → `/store/requests`(`TabletRequestsPage`, hidden route) — `/store/interest/*` API로 확인/완료/취소.
- **타블렛 구성 화면 ↔ 상담**: 같은 organization 데이터로만 연결되고 **UI 연결(대기 건수 배지/바로가기)은 없음**. (메뉴 복구 없이 알림 중심 유지 — 정책 부합.)

---

## 8. §7 필수 질문 답변

| # | 질문 | 답 |
|---|---|---|
| 1 | 실제 어떤 화면인가 | 타블렛 기기 등록(이름/위치) + 기기별 진열 상품(공급/자체) + Idle 재생목록 관리 |
| 2 | 위치별 타블렛 관리 있는가 | **부분** — 기기 등록/위치명·기기별 displays 저장은 있음. 단 공개 화면 기기별 분리는 미완(매장 단위) |
| 3 | 제품 배치 있는가 | **있음** (`store_tablet_displays`) |
| 4 | 콘텐츠 배치 있는가 | **Idle 재생목록(이미지/동영상)만**. 일반 콘텐츠 배치는 없음 |
| 5 | 내 매장 제품과 연결되는가 | **데이터 공유(간접)** — my-products = `organization_product_listings`, 타블렛 '공급 상품' 풀도 동일 테이블. 단 화면 직접 링크 없음 + 타블렛은 `store_local_products`도 별도 지원 |
| 6 | 전시 설정은? | **미구현(없음)** — dead code 아님, 신규 영역 |
| 7 | 상담 알림 연결 구조 | 공개 뷰어 생성→알림→`/store/requests` 처리. 타블렛 구성 화면과는 UI 미연결 |
| 8 | 유지 확장 가능한가 | **확장 가능**(재구축 불필요). 위치별 공개분리/전시설정/my-products 통합/미리보기 증분 추가 |
| 9 | 후속 WO 단위 | §10 |

---

## 9. 현재 구조의 문제점 / 권장 IA

**문제점**
- 타블렛 구성 ↔ 내 매장 제품이 **데이터는 공유하나 UI가 단절**(공급 상품을 두 화면에서 따로 관리하는 혼동 가능).
- 공개 화면이 **기기별 분리 미완**(관리 저장은 기기별인데 고객 노출은 매장 단위 → 위치별 차별 진열 의도가 공개에 반영 안 됨).
- **전시 설정 부재**로 가격/QR/상담 버튼/자동넘김 등 노출 규칙을 매장이 제어 불가.
- 상담 처리 진입이 알림에만 의존(타블렛 구성 화면에서 대기 건수/바로가기 없음).

**권장 IA (확장형)**
```
타블렛 구성 (/store/commerce/tablet-displays)
├─ 타블렛 목록/등록 (이름·위치)            [있음]
├─ 타블렛별 진열 상품 (공급/자체, 순서·표시)  [있음] — 내 매장 제품 picker 통합 후보
├─ Idle 재생목록 (이미지/동영상)            [있음]
├─ 전시 설정 (가격/QR/상담버튼/자동넘김)      [신규]
└─ 미리보기 (기기별 고객 화면)              [신규]
```

---

## 10. 후속 WO 제안 (권장 순서)

1. **WO-O4O-KPA-TABLET-STORE-PRODUCT-LINKING-V1 (후보 C)** — 타블렛 진열 상품 picker를 `/store/my-products`(organization_product_listings)와 명시 통합(공급 상품 출처 일원화·내비 연결). *데이터 이미 공유 → 가장 저비용·고효용.*
2. **WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1 (후보 B 변형)** — 전시 설정(가격/QR/상담버튼/자동넘김)을 **타블렛 구성 내부 탭**으로 신규(매장 공통 우선, 기기별은 후속). *별도 메뉴 분리 아님.*
3. **WO-O4O-KPA-TABLET-PREVIEW-V1 (후보 D)** — 기기별 고객 화면 미리보기.
4. **WO-O4O-KPA-TABLET-DEVICE-SCOPED-PUBLIC-VIEW-V1 (신규)** — 공개 뷰어 device pairing → 위치별 진열/idle 분리(현재 매장 단위 한계 해소). *규모 큼, 후순위.*

> 후보 A(전면 재구축)는 **비권장** — 기능이 이미 동작·데이터 견고. 증분 확장이 안전.

---

## 11. 완료 기준 대비

- 코드/DB/UI/메뉴 변경 없음 ✅ (read-only)
- 온라인 판매 조사 제외 ✅
- `/store/commerce/tablet-displays` 실기능 확인 ✅ (§3·§4·§5)
- 타블렛 구성 ↔ 전시 설정 관계 확인 ✅ (전시 설정 미구현 → 신규 영역, §6)
- 내 매장 제품 연결 여부 확인 ✅ (데이터 공유/UI 단절, §8-5)
- 상담/관심 알림 연결 확인 ✅ (§7)
- 후속 WO 후보 제시 ✅ (§10)

## 부록 — 핵심 코드 참조

| 항목 | 위치 |
|---|---|
| 타블렛 페이지 | `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` |
| 타블렛 API 클라이언트 | `services/web-kpa-society/src/api/tabletDisplays.ts` |
| 백엔드 라우트 | `apps/api-server/src/routes/platform/store-tablet.routes.ts` |
| 공개 뷰어/상담 생성 | `apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts` |
| 내 매장 제품(공유) | `packages/store-products-ui/src/StoreProductsManagerPage.tsx` + `api.ts`(BASE `/store/products`) → `organization_product_listings` |
| Entity/Migration | `entities/store-tablet*.entity.ts` / `20260224200000-CreateStoreLocalProductTables`, `20260509000000-AddIdlePlaylistItems`, `20260301400000-TabletInterestRequests` |
| 라우트 등록 | `services/web-kpa-society/src/App.tsx:1006` |
