# IR-O4O-KPA-STORE-CHANNEL-MENU-PURPOSE-AUDIT-V1

> 조사 대상: KPA 내 매장 `채널 > 채널 관리`(`/store/channels`)의 실제 용도·연결 범위
> 조사일: 2026-06-25 / 범위: KPA 우선 (GP/KCos 영향 표시) / **read-only — 코드·DB·메뉴 변경 없음**

---

## 0. 결론 요약 (전제 검증)

| WO 전제 | 검증 결과 |
|---|---|
| ① KPA 매장 내부에서 "B2C" 표현 부적합 | **타당** — 단, UI 탭 라벨은 이미 **"온라인 스토어"**. 내부 `channel_type='B2C'`(DB/코드)만 잔존 |
| ② 온라인 판매는 매장당 하나 | **사실** — `organization_channels` 의 `UNIQUE(organization_id, channel_type)` 로 B2C 채널은 매장당 **정확히 1개** |
| ③ "여러 B2C 채널 생성·관리" 구조가 아니다 | **사실** — "B2C 채널 만들기"는 매장당 1개 채널을 **활성화(생성)** 하는 1회성 액션. 다중 생성 불가(409) |
| ④ 태블릿/QR/상담은 전자상거래 채널이 아니라 매장 내 접점 | **부분 정정** — 태블릿/상담은 접점이 맞으나, **B2C(온라인 스토어)는 실제 주문/결제까지 연결된 진짜 상거래 채널**(아래 §4) |
| ⑤ 태블릿 표시상품/위치/idle은 `채널 > 태블릿`에서 관리 | **사실 + 중복 발견** — `채널 관리`의 TABLET 탭이 동일 기능을 **중복** 제공(아래 §5) |
| ⑥ 매장 기본 설정은 `/store/settings`에 존재 | **사실** — 단 `/store/settings`는 블록/템플릿/테마 중심. slug·온라인판매 설정과는 **중복 없음**(아래 §6) |

**핵심 판정:** `채널 관리`는 **dead/placeholder 아님 — 실동작 기능**(주문/결제 연결 포함). 따라서 "숨김/삭제"보다 **명명·정보구조(IA) 정비 + TABLET 탭 중복 제거**가 본질이다.

---

## 1. 현재 메뉴 / 라우트 구조

### 1-1. KPA 매장 사이드바 (`packages/store-ui-core/src/config/storeMenuConfig.ts`, KPA 블록 라인 ~252-309)

```
채널
├─ 채널 관리   → /store/channels                 (StoreChannelsPage)
├─ 태블릿      → /store/commerce/tablet-displays  (StoreTabletDisplaysPage)
└─ 상담 요청   → /store/requests                  (TabletRequestsPage)

판매 채널 확장
└─ 외국인 여행객 판매지원 → /store/sales-channels/foreign-visitor  (유료 게이트)
```

- 라우트(`web-kpa-society/src/App.tsx`): `channels`(1022), `channels/tablet`→`/store/requests` redirect(1023), `sales-channels/foreign-visitor*`(1013~).
- **`storeMenuConfig.ts`는 공통 모듈** — KPA/GP/KCos 3블록이 한 파일에 존재. 메뉴 변경은 **공통 모듈 변경**(Shared Module Protocol 대상, §8).

### 1-2. 라우트 ↔ 페이지 ↔ 데이터

| 메뉴 | 라우트 | 페이지 | 주 데이터 |
|---|---|---|---|
| 채널 관리 | `/store/channels` | `StoreChannelsPage` (서비스별 개별 구현) | `organization_channels`, `organization_product_channels`, `store_tablets/store_tablet_displays`, `o4o_asset_snapshots`(채널맵) |
| 태블릿 | `/store/commerce/tablet-displays` | `StoreTabletDisplaysPage` | `store_tablets`, `store_tablet_displays`, idle playlist |
| 상담 요청 | `/store/requests` | `TabletRequestsPage` | `tablet_interest_requests` (`/api/v1/store/interest/*`) |
| 설정 | `/store/settings` | `PharmacyStorePage` | 블록 레이아웃/템플릿/테마 (`/stores/:slug/settings`) |

---

## 2. `채널 관리`(StoreChannelsPage)의 실제 구현 상태

**실동작 콘솔** — placeholder 아님. 탭 = `온라인 스토어(B2C)` / `키오스크(KIOSK)` / `태블릿(TABLET)` (`CHANNEL_TABS`, 라인 96-100).

| 영역 | 상태 |
|---|---|
| B2C(온라인 스토어) | ✅ 실동작 — 채널 활성화 + 노출 제품 관리(추가/순서/활성/삭제/벌크) + 공개 URL(`/store/:slug`) + slug 변경 |
| KIOSK | ⚠️ **보류(placeholder)** — "업체 협의 후 제공 예정" 안내만, URL 없음(라인 346-352) |
| TABLET | ✅ 실동작 — 디바이스별 진열 패널(`TabletDisplaysPanel`) — **단, /store/commerce/tablet-displays와 동일 API(중복, §5)** |
| 자산 채널맵/게시 | ✅ `o4o_asset_snapshots` publishStatus/channelMap 토글 |

UI 라벨은 사용자에게 "온라인 스토어/키오스크/태블릿"으로 노출. **"B2C" 문자열은 코드/DB(`channel_type`)·일부 내부 주석에만** 존재.

---

## 3. "B2C 채널 만들기" 버튼의 실제 동작

- 프론트: `createChannel()` → `POST /api/v1/.../store-hub/channels` (`StoreChannelsPage`의 `creating` 상태 + storeHub API).
- 백엔드(`store-hub.controller.ts:316-397`):
  1. capability gate — `B2C→B2C_COMMERCE` 활성 필요(미활성 403),
  2. `organization_channels` INSERT, **status=APPROVED 즉시**(base-right), `approved_at=now`,
  3. `UNIQUE(organization_id, channel_type)` 위반 시 **409**(이미 존재).
- → **"여러 채널 생성"이 아니라 매장당 1개 온라인 스토어 채널을 켜는 1회성 활성화**. 개념상 "온라인 스토어 시작/활성화"가 정확하며, "채널 만들기"는 기술 용어 노출.

---

## 4. backend / API / DB 연결 여부 (B2C가 진짜 상거래인가?)

**✅ 실제 주문/결제까지 연결됨** (진열 전용 아님):

- 공개 storefront(`/store/:slug`)는 `organization_product_channels ⋈ organization_channels(B2C, APPROVED)` 기준 실제 상품 노출(`store-public-utils.ts:154-227`).
- 주문 생성(`kpa-checkout.controller.ts:189-552`): B2C 채널 APPROVED 검증 → 채널-상품 매핑 검증 → `sales_limit` 검증 → **`checkout_orders` 생성**(`sellerOrganizationId`, metadata `channelType='B2C'`/`channelId`).
- KPI(`store-hub.controller.ts` kpi-summary)도 `checkout_orders` 실데이터 집계.
- DB: `organization_channels`(20260215200001), `organization_product_channels`(…0002, +sales_limit …0004, +config …20260225000001).

**결론:** B2C 채널 = 실제 온라인 판매(주문·결제·매출) 채널. 제거 대상 아님. 명명/IA만 정비.

---

## 5. 태블릿 메뉴와의 중복 (확인됨)

`채널 관리`의 **TABLET 탭**(`TabletDisplaysPanel`)과 `채널 > 태블릿`(`StoreTabletDisplaysPage`)이 **동일 API/테이블**(`store_tablets`, `store_tablet_displays`, `fetchTablets/fetchTabletDisplays/fetchProductPool/saveTabletDisplays`) 사용 → **기능 중복**.

- 채널 탭 TABLET: 디바이스별 기본 진열(추가/순서/표시) — 단독 페이지로 "진열 페이지 열기" 유도(라인 731).
- 단독 메뉴: 동일 진열 + **idle 재생목록**(채널 탭엔 없음) 등 상세 편집.
- → 태블릿은 단독 메뉴(`/store/commerce/tablet-displays`)가 상위 집합. 채널 탭 TABLET은 **중복/축소 후보**.

---

## 6. 설정 메뉴와의 중복 여부

- `/store/settings`(`PharmacyStorePage`) = **블록 레이아웃·템플릿(BASIC/COMMERCE_FOCUS/…)·테마·디바이스 프리뷰**. slug 변경/온라인판매 정책 설정 **없음**.
- slug 변경은 **`채널 관리`(B2C/TABLET 공개 URL 카드)에만** 존재(`updateStoreSlug`, 라인 305-334, 472-481) → **현재 중복 없음**.
- → "온라인 판매 기본 설정(대표 노출명/사용 여부 등)"을 settings로 옮기는 정비를 한다면 **신규 영역**이며 현재 중복과 무관(추가 설계 필요).

---

## 7. 온라인 판매 분리 필요성

- 현재 "온라인 판매" 독립 메뉴 **없음** — B2C 탭이 그 역할(`판매 채널 확장`은 외국인 여행객 별개 유료 기능).
- 분리의 실익: **(1) "B2C/채널 만들기" 기술 용어 제거**, (2) 온라인 판매 = 매장당 1개라는 점을 "탭 중 하나"가 아니라 **독립 1급 메뉴**로 표현, (3) 주문/문의/판매상품을 한 곳에 모음.
- 분리의 비용: `StoreChannelsPage`가 B2C 제품관리·slug·자산채널맵을 한 화면에 묶고 있어, 온라인 판매를 떼면 **slug·자산 채널맵의 거취** 재설계 필요. KIOSK/TABLET만 남는 "채널" 화면의 정체성도 재정의 필요.
- → **분리는 타당하나 단순 메뉴 이동이 아님**. B2C 탭 해체 시 slug/자산채널맵/제품관리 재배치 WO가 수반된다.

---

## 8. 크로스서비스 영향 (필수 표시)

- **`StoreChannelsPage`는 공통 컴포넌트 아님** — KPA/GP/KCos **서비스별 개별 파일**(동일 API 재사용). 탭 구성 차이: KPA=B2C/KIOSK/TABLET, **GP/KCos=B2C/KIOSK/TABLET/SIGNAGE**.
- **`storeMenuConfig.ts`는 공통 모듈** — 메뉴 그룹/항목이 KPA/GP/KCos 한 파일에 존재. 메뉴명·구조 변경은 **공통 모듈 변경**으로, GP(그룹명 "마케팅·채널", funnel/content 포함)·KCos(채널 관리·태블릿)에 전파 가능 → Shared Module Change Protocol 적용 필요.
- → KPA만 먼저 정비하려면 메뉴 config의 **KPA 블록만 수정**하고 GP/KCos 블록 불변을 보장해야 함(공통 정책 vs KPA-only 판단 선행).

---

## 9. 정비안 A / B / C (+ 온라인 판매 분리안)

> 모두 **후속 WO 후보** — 본 IR은 조사 전용. dead code 아님이 확인되어 "숨김/삭제"는 비권장.

### A안 — 최소(명명·중복만 정리) · **권장(1차)**
1. `채널 관리` 화면의 사용자 노출 문구에서 잔존 "B2C/채널 만들기" → "온라인 스토어 시작/활성화"로 정정(UI 카피만, DB `channel_type` 불변).
2. `채널 관리`의 **TABLET 탭 제거** → 태블릿은 `채널 > 태블릿` 단독 메뉴로 일원화(상위 집합).
3. 채널 그룹 유지: `채널 관리`(온라인 스토어+키오스크) / `태블릿` / `상담 요청`.
- 장점: 혼란·중복 즉시 해소, slug/자산 채널맵 재설계 불필요(현 위치 유지). 위험 최소.

### B안 — `채널 관리` → `채널 현황`(대시보드화)
- 신규 생성/편집 제거, 채널 수·태블릿 수·상담 요청 수·온라인 스토어 상태만 보여주는 현황판.
- 단점: 현재 B2C 제품관리·slug·자산채널맵의 **실편집 기능 이전처(WHERE)** 가 필요 → 실질적으로 C안+온라인판매 분리를 동반해야 성립. 단독 적용 시 기능 회귀.

### C안 — 상위 메뉴 `채널` → `고객 응대`로 재정의 + 온라인 판매 완전 분리
```
고객 응대
├─ 태블릿
└─ 상담 요청

온라인 판매            (신규 1급 메뉴 — B2C 탭 승격)
├─ 판매 설정          (대표 노출명/사용여부 — settings와 경계 정의 필요)
├─ 판매 상품          (organization_product_channels = 기존 B2C 제품관리)
├─ 주문 관리          (checkout_orders)
└─ 고객 문의
설정
└─ … (+ 온라인 판매 기본 설정 일부 수용 여부 검토)
```
- 가장 명확하나 가장 큼: `StoreChannelsPage` 해체(B2C→온라인판매, KIOSK 거취, slug/자산채널맵 재배치), 주문 관리 화면 신설/연결, 메뉴 공통 config 대수술.

### 온라인 판매 ↔ `/store/settings` 경계 기준(분리 시)
- settings = **표현/레이아웃**(블록·템플릿·테마) + **정책성 기본값**(온라인 판매 사용 여부, 대표 노출명).
- 온라인 판매 메뉴 = **운영 실행**(판매 상품 진열, 주문, 문의, slug).
- slug는 "주소"라 온라인 판매·태블릿 공통 자원 → settings로 올릴지, 온라인 판매에 둘지 별도 판단(현재는 채널 페이지 단독).

---

## 10. 권장 진행 순서

1. 본 IR 확인 → `채널 관리` = **실기능(주문/결제 연결)** 확정. "숨김/삭제" 폐기.
2. **A안 우선 WO**: (a) 잔존 "B2C/채널 만들기" 카피 정정, (b) TABLET 탭 중복 제거(태블릿 단독 메뉴 일원화). — KPA `storeMenuConfig` 블록 + KPA `StoreChannelsPage`만, GP/KCos 불변.
3. 온라인 판매 1급 분리(C안)는 별도 IR/WO로 — `StoreChannelsPage` 해체 + 주문 관리 화면 + slug/자산채널맵 재배치 설계 필요(규모 큼).
4. 메뉴 변경은 공통 `storeMenuConfig.ts` 영향 → GP/KCos 회귀 검증 동반.

---

## 부록 — 핵심 코드 참조

| 항목 | 위치 |
|---|---|
| KPA 채널 메뉴 | `packages/store-ui-core/src/config/storeMenuConfig.ts:292-295` |
| 채널 페이지(서비스별) | `services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx` / GP·KCos `.../store/StoreChannelsPage.tsx` |
| 채널 탭 정의(라벨) | `StoreChannelsPage.tsx:96-100` (B2C='온라인 스토어') |
| 채널 생성 API | `apps/api-server/src/routes/o4o-store/controllers/store-hub.controller.ts:316-397` |
| 채널 엔티티/제약 | `modules/store-core/entities/organization-channel.entity.ts` (UNIQUE org+type) |
| 채널-상품 | `modules/store-core/entities/organization-product-channel.entity.ts`, `store-channel-products.controller.ts` |
| B2C 주문 연결 | `routes/kpa/controllers/kpa-checkout.controller.ts:189-552`, `store-public/store-public-utils.ts:154-227` |
| 태블릿 중복 | `StoreChannelsPage.tsx:504-926`(TabletDisplaysPanel) ↔ `StoreTabletDisplaysPage.tsx` (동일 `store_tablets/store_tablet_displays`) |
| 상담 요청 | `services/web-kpa-society/src/pages/pharmacy/TabletRequestsPage.tsx` (`/api/v1/store/interest/*`, `tablet_interest_requests`) |
| 설정 | `services/web-kpa-society/src/pages/pharmacy/PharmacyStorePage.tsx` (블록/템플릿/테마) |
| 채널 migration | `20260215200001/…0002/…0004-*`, `20260225000001-AddConfigToOrganizationChannels` |
