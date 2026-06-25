# IR-O4O-KPA-ONLINE-SALES-FIRST-CLASS-MENU-DESIGN-V1

> 조사 대상: KPA 매장 `채널 관리 > 온라인 스토어(B2C)` 기능을 별도 1급 메뉴(`온라인 판매`)로 분리할 수 있는가 + IA 정비안
> 유형: **READ-ONLY 조사 (코드 변경 없음)** / 조사일: 2026-06-25 / 범위: KPA 우선 (GP/KCos parity 포함)
> 선행: IR-O4O-KPA-STORE-CHANNEL-MENU-PURPOSE-AUDIT-V1, WO-O4O-KPA-STORE-CHANNEL-MENU-COPY-AND-TABLET-DEDUP-V1(완료)

---

## 0. 요약 결론

**권장: B안(온라인 판매 1급 메뉴 신설 + 판매 설정/판매 상품 우선 이관) → C안(주문 관리·고객 문의 포함 완전 분리) 단계적 진행.**

핵심 발견 3가지가 설계를 가른다:
1. **"주문 관리" 명칭 충돌** — 기존 `약국 상품·거래 > 주문 관리`(`/store/commerce/orders`)는 매장이 **공급자에게 구매한 발주 내역(buyer)** 이다. 온라인 스토어로 **판매받은 주문(seller, checkout_orders.sellerOrganizationId)** 을 보는 화면은 **없다**(API `getStoreOrders/getStoreOrderKpi`만 정의, 미연결). → 온라인 판매의 "주문 관리"는 **신규 화면**이며 기존 메뉴명과 충돌한다.
2. **판매 매출/KPI 화면 부재** — `분석 > 마케팅 분석`은 **QR 스캔 전용**, 홈 대시보드도 QR 중심. checkout_orders 기반 매출/주문 KPI를 store-owner에게 보여주는 화면이 없다.
3. **온라인 주문 고객 문의(CS) 부재** — 고객 문의류는 `상담 요청`(tablet_interest_requests)뿐. 온라인 주문 관련 CS 화면/테이블 없음.

→ 즉시 C안(완전 분리)은 **신규 화면 2개(판매 주문, 주문 KPI/문의)** 를 동반하므로 큼. B안(설정/상품 이관)은 기존 기능 재배치만으로 가능 → 안전한 1차.

> `channel_type='B2C'`는 DB/API 내부 식별자로 **불변 유지**(분리는 UI/IA 계층). 주문/결제 연결 보존.

---

## 1. 현재 온라인 스토어 기능 맵 (B2C 탭이 담당)

| 기능 | 구현 | 데이터 | store-owner 화면 |
|---|---|---|:---:|
| 온라인 스토어 활성화 | `createChannel('B2C')` → `organization_channels`(unique org+type, APPROVED 즉시) | organization_channels | ✅ StoreChannelsPage |
| 판매 상품 진열(추가/순서/활성/삭제/벌크) | channelProducts API | organization_product_channels | ✅ |
| 상품별 판매한도(sales_limit) | organization_product_channels.sales_limit | 동일 | ✅ |
| 공개 주소(slug)/public URL | `updateStoreSlug`(1회 변경) | platform_store_slugs | ✅ (B2C/TABLET 공개 URL 카드) |
| 자산 채널맵/게시 | storeAssetControlApi(channelMap/publishStatus) | o4o_asset_snapshots | ✅ (채널맵 토글) |
| 주문/결제 연결 | kpa-checkout.controller → checkout_orders(seller) | checkout_orders | ❌ **조회 화면 없음** |
| 매출/주문 KPI | store-hub kpi-summary(존재) | checkout_orders | ❌ **표시 화면 없음**(분석=QR만) |
| 공개 storefront 렌더 | /store/:slug (store-public-*) | 위 진열 기준 | (고객용) |

→ **편집 가능 기능은 채널 페이지에 집약**(활성화/진열/slug/자산채널맵). **판매 결과(주문/매출)는 store-owner UI에 미노출.**

---

## 2. 현재 메뉴 / 라우트 / API / DB 연결도

KPA 매장 사이드바(`storeMenuConfig.ts:252-311`):
```
약국 상품·거래
├─ 상품            /commerce/products            (B2B 공급 상품 탐색)
├─ 주문 관리        /commerce/orders   → StoreOrdersPage = '구매/발주 내역'(buyer, getBuyerOrders)  ← 판매 아님
└─ 신청·승인 현황    /commerce/recruitment-applications
약국 활성화          내 약국 제품 / 상품 설명 / 블로그 / POP / QR-code
약국 자료함          콘텐츠 / 자료 / 매장 제작 자료
디지털 사이니지       플레이리스트 / 동영상 / 스케줄 / TV 재생
채널
├─ 채널 관리        /channels   → StoreChannelsPage (온라인 스토어 B2C / 키오스크 KIOSK)  ← TABLET 탭은 WO에서 제거됨
├─ 태블릿          /commerce/tablet-displays
└─ 상담 요청        /requests   → tablet_interest_requests
판매 채널 확장        외국인 여행객 판매지원 (유료 게이트)
분석
└─ 마케팅 분석       /analytics/marketing  → QR 스캔 분석 전용
설정
├─ 약국 정보        /info      (조직 기본정보)
└─ 매장 홈 디자인    /settings  (storefront 블록/템플릿/테마 — PharmacyStorePage)
```

주요 API/DB:
- 온라인 스토어: `POST/GET /store-hub/channels`, `/store/channel-products/*` → `organization_channels`, `organization_product_channels`.
- 주문(판매): `kpa-checkout.controller`(주문 생성) + `checkout_orders`(sellerOrganizationId). 조회용 `getStoreOrders/getStoreOrderKpi` 정의됐으나 **프론트 미연결**.
- 주문(구매): `/checkout/orders`(getBuyerOrders) → StoreOrdersPage.
- slug: `platform_store_slugs` (StoreSlugService, 1회 변경).

---

## 3. 분리 시 재배치가 필요한 기능

| 기능 | 현 위치 | 분리 후 후보 위치 | 비고 |
|---|---|---|---|
| 온라인 스토어 활성화 | 채널 관리(B2C 탭) | 온라인 판매 > 판매 설정 | 매장당 1개 |
| 판매 상품 진열 | 채널 관리(B2C 탭) | 온라인 판매 > 판매 상품 | organization_product_channels |
| slug/public URL | 채널 관리(공개 URL 카드) | 판매 설정 **또는** 매장 설정(공통 주소) | **경계 판단 필요**(§4) — 태블릿 URL과 공유 자원 |
| 자산 채널맵/게시 | 채널 관리(자산 리스트) | 판매 설정 하위 **또는** 자료함 게시 | 온라인 전용인지 전 채널 공통인지 애매(§3-비고) |
| 판매 주문 조회 | **없음** | 온라인 판매 > 주문 관리(신규) | checkout_orders seller — 신규 화면 |
| 매출/주문 KPI | **없음**(분석=QR) | 온라인 판매 대시보드 또는 분석 확장 | 신규 |
| 온라인 주문 CS/문의 | **없음** | 온라인 판매 > 고객 문의(신규) | 상담요청과 경계(§5) |
| KIOSK | 채널 관리(보류) | 채널 관리 유지 또는 숨김(§6) | placeholder |

> 자산 채널맵 비고: 현재 channelMap 키는 `home`(B2C) 중심이나 구조상 다채널 게시 맵 → "온라인 스토어 전용"으로 단정하기 어려움. 분리 시 **자료함/게시 영역으로 이동**도 후보(별도 판단).

---

## 4. `/store/settings`(매장 홈 디자인)와 온라인 판매 메뉴 경계안

- `/store/settings`(PharmacyStorePage) = **공개 storefront 디자인**(블록 레이아웃/템플릿 BASIC·COMMERCE_FOCUS·…/테마/디바이스 프리뷰). slug·판매정책 **없음**. → **표현/레이아웃 영역으로 유지.**
- `/store/info` = 조직 기본정보(이름/주소/연락처).
- slug 변경 = 현재 채널 페이지 공개 URL 카드에만 존재.

**경계 기준(권장):**
| 항목 | 위치 |
|---|---|
| storefront 레이아웃/테마/블록 | `매장 홈 디자인`(/settings) 유지 |
| 조직 기본정보 | `약국 정보`(/info) 유지 |
| 온라인 판매 사용 여부·대표 노출명·판매 정책 | **온라인 판매 > 판매 설정**(신규 운영성 설정) |
| 공개 주소(slug) | 판매 설정 또는 매장 설정 — **공통 주소(태블릿 URL과 공유)라 단일 소유 위치 1곳 지정 필요**. 권장: "공개 주소"는 매장 공통이므로 settings 계열에 두되, 온라인 판매에서 링크로 노출 |

→ 원칙: settings=정책/표현, 온라인 판매=운영 실행. slug는 공통 자원이라 **중복 편집 금지(단일 소유)**.

---

## 5. 주문 관리 화면 필요성

- **판매(seller) 주문 조회 화면 = 없음.** 기존 `/store/commerce/orders`는 **구매(buyer) 발주 내역**으로 의미가 다름 → 재사용 불가, **신규 필요**.
- 백엔드는 `getStoreOrders/getStoreOrderKpi` + `store-hub/kpi-summary`(checkout_orders 집계)가 이미 있어 **백엔드 신규는 최소**, 프론트 화면 신설이 핵심.
- 명칭 충돌 해소 필요: 기존 "주문 관리"(구매) ↔ 온라인 판매 "주문 관리"(판매). 라벨 재정의(예: 구매=`발주 내역`, 판매=`주문 관리`) 권장.

---

## 6. 고객 문의 / 상담 요청 경계안

- 현재 고객 접점 요청은 `상담 요청`(tablet_interest_requests, 태블릿/매장 내) 1종. 온라인 주문 CS는 없음.
- 선행 IR(IR-O4O-KPA-STORE-CONSULTATION-REQUESTS-NOTIFICATION-REPLACEMENT-AUDIT-V1): 상담 요청은 알림 미연결 + 처리 화면이 거기뿐 → **즉시 삭제 불가, 알림 보완 후 정리**가 목표.
- **경계 권장:** 온라인 판매 "고객 문의"(주문 관련 CS)와 매장 내 "상담 요청"(태블릿/QR 관심)은 **성격이 달라 당장 합치지 말 것**. 상담 요청은 `고객 응대`(태블릿/상담) 축에 유지. 온라인 판매 고객 문의는 신규(있다면)로 분리하되, 두 경로의 source 통합 모델(GP `customer_requests`의 source_type+purpose)을 별도 IR에서 판단.

---

## 7. KIOSK 처리안

- KIOSK = 보류(placeholder, "업체 협의 후 제공 예정", 공개 URL 없음).
- B2C(온라인 스토어)가 분리되면 채널 관리에 **KIOSK만 남아 사실상 빈 화면**.
- 권장: KIOSK는 **출시 전까지 숨김**(메뉴/탭 비노출, route는 hidden 유지)하거나, 채널 관리 자체를 폐지하고 KIOSK는 출시 시점에 재도입. → §8 채널 상위 메뉴 재편과 함께 결정.

---

## 8. `채널` 상위 메뉴의 향후 역할 + KPA-only / GP·KCos 영향

**채널 상위 메뉴 재편(권장 C안 도달 시):**
```
온라인 판매   (신규 1급)
├─ 판매 설정 / 판매 상품 [/ 주문 관리 / 고객 문의 — 후속]
고객 응대     (채널 → 개편)
├─ 태블릿 / 상담 요청
(KIOSK: 숨김 또는 출시 시 재도입)
```

**크로스서비스:**
- `StoreChannelsPage`는 **서비스별 개별 파일**(KPA/GP/KCos), GP/KCos는 **SIGNAGE 탭 포함(4탭)** 으로 KPA(현 2탭)와 다름.
- `storeMenuConfig.ts`는 **공통 모듈**이나 서비스별 블록(KPA_SOCIETY_STORE_CONFIG 등)이 분리돼 있어 **KPA 블록만 수정 가능**(GP/KCos 블록 불변 → 무영향). Shared Module Protocol상 "config 파일 공통이나 블록 단위 KPA 한정 수정"임을 명시.
- → **KPA-only 분리 가능.** GP/KCos는 B2C 분리/네이밍 정비를 각 서비스 별도 WO로(구조·탭 차이 때문에 일괄 적용 부적합).

---

## 9. 정비안 A / B / C

### A안 — 최소 명칭 정리
- `채널 관리` → `온라인 스토어`로 라벨 변경, StoreChannelsPage 구조 유지, KIOSK 보류 섹션/숨김.
- 장점: 최소. 단점: "채널" 구조·주문/문의 부재 미해결, 메뉴 IA 근본 정리 안 됨.

### B안 — 온라인 판매 1급 신설 + 설정/상품 이관 (**권장 1차**)
- 상위 `온라인 판매` 신설, 하위 `판매 설정`(활성화/정책/slug 링크) + `판매 상품`(기존 B2C 진열 이관).
- 주문 관리/고객 문의는 후속(신규 화면 필요분 분리).
- `채널 관리`는 KIOSK만 남으므로 숨김 또는 `고객 응대`로 선개편(태블릿/상담).
- 장점: 기존 기능 재배치 중심(신규 화면 0~최소), 위험 중간. 단점: 주문/매출 가시성은 아직 미해결.

### C안 — 온라인 판매 완전 분리
- 상위 `온라인 판매` 하위 `판매 설정`/`판매 상품`/`주문 관리`(신규)/`고객 문의`(신규). `채널`→`고객 응대`(태블릿/상담).
- 장점: 가장 명확. 단점: **판매 주문 조회 + 매출 KPI + (선택)CS 신규 화면** 필요 → 규모 큼, checkout 조회/권한/경계 설계 동반.

---

## 10. 권장 진행 순서

1. **(B안)** `온라인 판매` 상위 메뉴 신설 + 기존 B2C 활성화/진열을 `판매 설정`/`판매 상품`으로 이관. slug는 공통 주소로 단일 소유 위치 확정(중복 편집 제거). `channel_type='B2C'` 불변.
2. **(채널 정리)** B2C 이관 후 `채널 관리`는 KIOSK만 → 숨김 또는 `고객 응대`(태블릿/상담)로 상위 개편.
3. **(주문 관리 신규 — C 1단계)** seller `checkout_orders` 조회 화면 신설(`getStoreOrders/kpi-summary` 연결). 기존 buyer "주문 관리"는 `발주 내역`으로 라벨 분리(명칭 충돌 해소).
4. **(매출 KPI)** 홈/분석에 판매 KPI 노출(현 QR 전용 분석 확장 또는 온라인 판매 대시보드).
5. **(고객 문의/상담 통합 판단)** 온라인 주문 CS 신설 여부 + 상담요청 알림 보완(선행 IR Phase1)과 함께 source 통합 모델 별도 IR.
6. 각 단계 KPA-only, 공통 config는 KPA 블록만 수정. GP/KCos는 구조 차이로 별도 WO.

---

## 주의
- 코드 변경 없음(본 IR). dead code 오판 금지 — 온라인 스토어/주문 연결은 실기능.
- 주문/결제 연결 보존 관점 설계. `channel_type='B2C'` 내부 식별자 변경 금지(필요 시 별도 대형 마이그레이션).
- "주문 관리" 명칭 충돌(구매 vs 판매)을 IA에서 반드시 해소.
- slug는 공통 주소 자원 — 단일 소유 위치 지정(중복 편집 금지).
