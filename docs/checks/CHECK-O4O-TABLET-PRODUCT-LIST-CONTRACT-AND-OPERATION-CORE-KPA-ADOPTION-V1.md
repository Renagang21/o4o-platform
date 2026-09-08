# CHECK — Tablet product_list 계약 단일화 + 운영(B) 공통 Core 추출 · KPA 채택

**WO**: `WO-O4O-TABLET-PRODUCT-LIST-CONTRACT-AND-OPERATION-CORE-KPA-ADOPTION-V1`
**작업일**: 2026-09-08
**선행**: `e47a5e8ba`(경계 확정) · `7971407f0`(KPA canonical)
**commit**: `73c21813b` (구현) · `b97a4dcc6` (QR 가격 표기 정합)
**결과**: **PRODUCT_LIST CONTRACT_DRIFT = 0** (production 실측)

---

## 1. 드리프트의 정확한 원인

tier ①(명시 선택)은 **이미 세 경로가 같은 함수**(`resolveSelectedProductListSection`)를 쓰고 있었다.
문제는 **① 이 비었을 때의 처리가 세 곳에 따로 있던 것**이다.

| 경로 | ① 이 비면 | 결과(피부관리 세트) |
|---|---|---:|
| preview | `if (selectedData) push` — **섹션 자체를 생략** | 0 |
| tablet | `queryTabletVisibleProducts(configured)` — 코너 진열 | 3 |
| QR | `EMPTY_QR_PRODUCT_SECTION` — 0건 고정 | 0 |

추가로 tablet 경로는 **supplier 만** 섹션에 싣고 local 은 별도 endpoint 로 넘겨서,
같은 tier 안에서도 섹션과 실제 화면이 어긋나 있었다.

---

## 2. 확정한 canonical 계약 (4단)

```text
① selected           명시 선택(config.products)        → 저장된 목록·순서
② corner_display     코너 확정 + 진열 있음             → store_tablet_displays 순서
③ corner_legacy_all  코너 확정 + 진열 없음             → 그 코너의 legacy 집합  [COMPATIBILITY]
④ none               코너 미확정                       → 상품 없음
```

**코너 도출도 하나다.** tablet 은 자기 문맥, QR·preview 는 **세트를 적용 중인 태블릿 역참조**
(`resolveScreenSetAppliedTablet`, **정확히 1대**일 때만; 0대·2대+ 는 ④).

프로덕션 실측(2026-09-08): 적용 세트 5개가 **전부 정확히 1대**, 2대+ 케이스 **0**, 미적용 세트 12개.
→ 규칙이 모호하지 않고, 미적용 세트 QR 은 여전히 0건이라 기존 금지선이 유지된다.

### 2-1. ③ 을 남긴 이유 — 실측 기반 판단 (보고 대상)

세트가 적용된 코너 5개 중 **3개가 진열 0행**이고, 그 3개는 현재 **매장 전체 supplier 18건**을
그대로 보여주고 있다(`configured=false` legacy fallback).

③ 을 제거하면 그 3개 화면이 **18 → 0** 으로 즉시 바뀐다 → WO §14-2「기존 production Screen Set 의
의미를 깨야 함」중지 조건에 해당한다. 그래서 **제거하지 않고 세 경로에 똑같이 적용**해
드리프트만 없앴다.

- WO §2 가 금지한 「매장 전체 상품 **자동** fallback」을 canonical 로 만들지 않았다.
  ③ 은 **명시적 compatibility 라벨**이며, 코너를 특정했을 때만 성립한다.
- QR 이 매장 전체로 확장되는 것이 아니라 **자기 코너 태블릿과 똑같이** 보인다.
- 퇴장 조건: 해당 코너에 진열을 채우거나 세트에 상품을 명시 선택하면 자동으로 ①·② 로 올라간다.

> 이 3개 코너는 조사 중 **PharmacyHub 조직(`테스트-사업자`) 소속**으로 확인됐다.
> PH 에는 kiosk route 자체가 없어(다음 WO 대상) 실제로 렌더되는 화면은 아니다.
> 더 엄격한 쪽(진열 없는 코너 = 상품 0)을 택하려면 tier 표 한 줄 변경이면 된다 — **사용자 판단 사항**.

---

## 3. Resolver 단일화

신규 `store-public-product-list-resolve.ts`(198L)가 유일한 진입점이다.

- `resolveScreenSetAppliedTablet()` — 코너 도출(조직 경계 포함).
- `resolveCornerProducts(ds, ctx, tabletId, configured)` — ②③ 공통.
  `/tablet/products` 와 **같은 소스·필터·정렬**(supplier 4중 게이트 → local, 각각 `disp.sort_order`),
  병합 순서도 kiosk 와 동일(supplier → local).
- `EMPTY_PRODUCT_LIST_SECTION` — ④. `selectionMode:'none'` 으로 **"확정 실패"와 "0건 선택"을 구분**한다.

소비처: 공개 tablet runtime · QR resolver · preview(`POST /screen-sets/preview`, `screenSetId` 수용).

### 3-1. 소비 계약

kiosk 는 `'selected'` 외 `'corner_display'`·`'corner_legacy_all'` 도 **서버 확정 목록**으로 신뢰한다
(`isServerResolvedProductList`). `'none'`·표식 없음은 기존대로 자체 조회 → legacy 태블릿 회귀 0.

부수 수정: `mapSectionProduct` 가 local 의 **설명·요약·매장 선택 콘텐츠를 조용히 떨어뜨리고 있었다**
(camelCase 만 읽음). 두 shape 를 모두 수용하도록 보강했고, resolver 가 표시용 alias(`priceDisplay`·`imageUrl`)를
한 곳에서 부여한다(원본 snake_case 유지 → `/tablet/products` 소비처 회귀 0).

---

## 4. preview / tablet / QR 동일성 — production 실측

| 케이스 | preview | tablet | QR | 판정 |
|---|---|---|---|:---:|
| 피부관리 (진열 3) | `corner_display` **3** | `corner_display` **3** | `corner_display` **3** | **SAME** |
| 구강관리 (진열 3) | `corner_display` **3** | `corner_display` **3** | `corner_display` **3** | **SAME** |
| A-2 의약품 (명시 선택 6) | SKIPPED(타 조직) | `selected` **6** | `selected` **6** | **SAME** |

- 상품 **id 목록과 순서**까지 일치 확인(단순 개수 비교 아님).
- `content_list` 도 QR==tablet **SAME** (n=4 / n=5 / n=0).
- **BEFORE 0 / 3 / 0 → AFTER 3 / 3 / 3.**

```text
=== PRODUCT_LIST CONTRACT_DRIFT = 0 ===
```

`first_active`: `tabletSource=first_active` · 세트 `6f10d68e` · `corner_display`/3 — **회귀 없음**.

### 4-1. 측정 하니스 오탐 정정 (기록)

1차 실행에서 `DRIFT=1` 이 나왔으나 **내 하니스 오류**였다 — 3번 케이스에 다른 조직의 `tabletId` 를
잘못된 매장 slug 로 넘겨, 서버가 정상적으로 거부하고 `first_active` 로 폴백한 결과를 비교하고 있었다.
조직↔slug 매핑을 바로잡아 재측정한 위 표가 유효 결과다. **코드 문제가 아니었다.**

---

## 5. 운영(B) 공통 Core 추출

정본 §4 의 A(저작)·C(런타임)는 이미 공통 패키지가 있고 **B 만 비어 있었다.**

- **위치**: `@o4o/tablet-screen-set-editor` 확장 (`TabletCornerBoard`, 269L).
  신규 패키지를 만들지 않았다 — 이미 KPA·PH·Neture 3서비스가 소비하는 패키지이고,
  `store-ui-core` 에 두면 1세대 tablet view 와 같은 곳에 놓여 세대 혼동이 굳는다.
- **Core / Adapter 경계(§6)**: Core 에 서비스 조건문 **0**. serviceKey·API prefix·라우터·fetch 를 모른다.
  `'kpa-society'` 리터럴 분기 0.
- **Core 가 갖는 것**: 코너 카드 배치 · "지금 나오는 화면" 표시 · 액션 배치 · empty/loading/error 표면 ·
  코너 정렬/라벨 규칙(`sortTabletCorners` · `cornerPrimaryLabel`).
- **서비스가 주는 것**: 데이터 · 콜백(상세/교체/미리보기/추가) · 아이콘 · 문구 · accent.

### 5-1. KPA 전환 결과

`StoreTabletDisplaysPage.tsx`: **-85 / +22 (순 -63 LOC)** — 코너 현황판 인라인 마크업이 Core 소비로 대체됐다.
마크업·문구·동선은 Core 기본값으로 그대로 이관해 **표시 회귀 0**.
기존 route(`/store/commerce/tablet-displays`)와 deep-link state(`tab` · `editScreenSetId`)는 불변.

코너 **상세**(진열 구성 · idle · 화면 설정 · 운영자 공통 영상)는 1세대 compatibility 로 KPA 에 남겼다.
LIVE writer 를 UI 에서 없애면 실제 운영 경로가 사라지므로 이동하지 않는다(§8).

---

## 6. Legacy 1세대 UI 판정 (§8)

| 대상 | 판정 | 조치 |
|---|:---:|---|
| 코너 현황판(목록·현재 화면·교체·미리보기) | `CANONICAL_OPERATION` | **공통 Core 로 이동** |
| 코너 상세 — 진열 상품 구성 UI | `LEGACY_BUT_LIVE` | 유지(②의 데이터 writer) |
| 코너 상세 — idle playlist 편집 | `COMPATIBILITY_SETTING` | 유지(우선순위 안내는 직전 회차에서 추가) |
| 코너 상세 — 화면 설정 | `COMPATIBILITY_SETTING` | 유지 |
| 운영자 공통 대기영상 선택 | `COMPATIBILITY_SETTING` | 유지 |
| `content_id` selection 흔적 | `DEAD` | 확장 금지(직전 회차에서 1순위 근거에서 분리) |
| `first_active` 관련 | `COMPATIBILITY` | 유지 · 회귀 확인 완료 |

---

## 7. 검증

### 7-1. 정적·테스트

| 항목 | 결과 |
|---|---|
| `@o4o/api-server` type-check | PASS |
| `type-check:frontend` (6서비스) | **OK** |
| build — KPA · K-Cosmetics · GlycoPharm · PharmacyHub | **4/4 OK** |
| 신규 `tablet-product-list-contract.spec` | **15/15 PASS** |
| 갱신된 `kpa-tablet-generation-consolidation-contract.spec` | **19/19 PASS** |
| tablet 회귀 5스위트 | **55/55 PASS** |
| ESLint(변경 파일) | 0 error |
| `lint-ratchet` | PASS — `51 / baseline 51` 변동 0 |

이전 회차 spec 3건이 실패했으나 **의도한 계약 변경**(코너 도출·빈 섹션 상수)이라
검사 의도는 유지한 채 현행 표현으로 갱신했다. 회귀가 아니다.

### 7-2. Production Browser E2E

| # | 시나리오 | 결과 |
|:---:|---|:---:|
| A~C | 태블릿 관리 → 코너 현황판(공통 Core) · 코너명 · "지금 나오는 화면" | **PASS** |
| D | 화면 바꾸기(교체) 진입 | **PASS** |
| E | 실제 태블릿 열기(`?tabletId=`) — 상품 3건 표시 | **PASS** |
| F | 미리보기 | **PASS** |
| G·H | product_list / QR 상품 수·순서 동일 | **PASS** (§4) |
| I | STORE canonical fallback | **PASS** (구강관리 SPD 카드 렌더) |
| L | `first_active` URL | **PASS** |
| N | archive/restore | 직전 회차에서 PASS(계약 무변경) |

console error 0 · white screen 0 · dead link 0 · not-found shell 0.
**운영 데이터 변경 0** (읽기 전용 측정만).

### 7-3. 배포 후 발견·수정 1건

QR 뷰어가 local 상품 가격을 `price_display` 원시 문자열(`"6500.00"`)로 노출했다.
태블릿은 이미 같은 문제를 정규화해 `"6,500원"` 으로 보여주고 있었다 —
**같은 상품이 두 화면에서 다르게 보이지 않도록** 같은 규칙을 적용했다(`b97a4dcc6`).
계약·데이터 변경 없이 뷰어 표기만.

---

## 8. 중지 조건

| # | 조건 | 상태 |
|:---:|---|:---:|
| 1 | product_list 단일화에 schema/migration 필요 | 미해당 — **migration 0** |
| 2 | 기존 production Screen Set 의미 파괴 | **회피** — ③ compatibility 단 유지(§2-1) |
| 3 | `store_tablet_displays` A/C 제거 필요 | 미해당 — 유지 |
| 4 | public URL breaking | 미해당 — URL·shape 불변 |
| 5 | 운영 데이터 write 없이 판단 불가 | 미해당 — 읽기 실측으로 전건 판정 |
| 6 | 공통 package 변경이 KCos/GP breaking | 미해당 — 두 서비스 build OK · `store-ui-core` 무변경 |
| 7 | 다른 세션 파일 충돌 | 미해당 |

---

## 9. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건

`IR-O4O-TABLET-CANONICAL-COMMON-CORE-BOUNDARY-AND-PH-ADOPTION-GAP-V1` §6 이 이월한
`product_list` CONTRACT_DRIFT 는 본 회차로 **CLOSED**. IR 본문은 조사 시점 기록이므로 수정하지 않는다.

---

## 10. 종결 판정

| 완료 조건 | 결과 |
|---|:---:|
| PRODUCT_LIST CONTRACT_DRIFT | **CLOSED** (production 0) |
| TABLET OPERATION COMMON CORE | **IMPLEMENTED** (`TabletCornerBoard`) |
| KPA CANONICAL ADOPTION | **PASS** (-63 LOC · 표시 회귀 0) |
| KPA PRODUCTION E2E | **PASS** |
| KCOS/GP LEGACY CORE REGRESSION | **PASS** (build OK · `store-ui-core` 무변경) |

→ `WO-O4O-TABLET-PRODUCT-LIST-CONTRACT-AND-OPERATION-CORE-KPA-ADOPTION-V1` = **CLOSED**

다음 회차(PharmacyHub adoption)는 `TabletCornerBoard` 를 그대로 채택하고
PH kiosk public route 를 신설하면 된다 — 백엔드 계약은 이미 공통이다.
