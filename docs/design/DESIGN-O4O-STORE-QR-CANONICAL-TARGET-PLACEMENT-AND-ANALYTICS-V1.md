# DESIGN-O4O-STORE-QR-CANONICAL-TARGET-PLACEMENT-AND-ANALYTICS-V1

> **상태**: Active Design (설계 확정 · **구현 미착수**)
> **WO**: `WO-O4O-STORE-QR-CANONICAL-TARGET-AND-PLACEMENT-DESIGN-V1`
> **작성일**: 2026-09-09
> **기준 커밋**: `3dfd68357`
> **조사 근거**: [`IR-O4O-STORE-QR-CURRENT-CONTRACT-AND-LEGACY-CENSUS-V2`](../investigations/IR-O4O-STORE-QR-CURRENT-CONTRACT-AND-LEGACY-CENSUS-V2.md)
> **상위 기준**: [`O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1`](../baseline/O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1.md) · [`O4O-STORE-COMMERCE-BOUNDARY-V1`](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) · [`O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1`](../baseline/O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1.md) · [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md)

---

## §0. 확정 기준 문장 (본 설계의 전제)

```text
1. Tablet KPA/PH canonical axis는 이미 구현·배포·E2E까지 CLOSED다.
   과거 Tablet census의 미해소 판정을 현재 상태로 재사용하지 않는다.

2. QR Placement는 1:N을 허용한다.
   단, 위치별 analytics가 필요한 경우 Placement별 QR Instance를 발급한다.
   동일 QR 이미지를 여러 Placement에서 재사용하면 위치별 scan 귀속은 불가능함을
   시스템과 UI에서 명시한다.
```

### 0-1. 확정 전제 7개 (WO 원문)

1. **QR 은 상품 설명서 전용이 아니다.** QR = Content 또는 정보 대상을 소비자 스마트폰으로 전달하는 **매장 Execution Channel**.
2. **QR 전용 콘텐츠를 별도로 만들지 않는다.**
3. 상품 SSOT = **ProductMaster**.
4. 상품 설명·건강정보·캠페인·매장 안내 등은 **Content** 다.
5. **KPA 와 PharmacyHub 의 My Store QR 사용 방식은 동일해야 한다.**
6. **ProductMaster 대표 QR 과 Store QR 은 합치지 않는다.**
   `ProductMaster → product_landings → /p/{public_key}` vs `Store → store_qr_codes → /qr/{slug}`
7. Tablet / POP / ESL / 출력물 등은 QR 의 **사용처(Placement)** 가 될 수 있다.

### 0-2. 절대 제약 — QR 주소 불변

`O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1 §0`:

> **물리 QR 재인쇄가 가장 비싼 작업이다. QR 주소는 절대 바꾸지 않는다.**

본 설계의 모든 결정은 이 제약을 통과해야 한다. 특히:
- placement 를 추가·변경·종료해도 **`slug` 가 바뀌지 않는다.**
- `/qr/{slug}?p=SHELF` 같은 **쿼리 파라미터 방식은 채택하지 않는다** (이미 인쇄된 QR 에 파라미터를 붙이면 재인쇄가 발생하고, 새로 붙이면 그것은 이미 별개 이미지 = 별개 instance 다).

---

## §1. 현재 상태 요약 (census 결과)

전문은 IR-V2. 설계에 직접 영향을 주는 사실만 옮긴다.

```text
QR 원장 3개:
  ① store_qr_codes        88 row / 4 org   → /qr/{slug}      (매장 실행자산)
  ② product_landings 272,040 row           → /p/{public_key} (ProductMaster 대표)
  ③ foreign_visitor_partner_qr_codes 0 row → 별개 제품, 본 설계 범위 밖

store_qr_codes 컬럼 14개 중 placement 관련 = 0개
store_qr_scan_events 가 아는 식별자 = qr_code_id 하나
type <> landing_type 인 row = 0건 (88/88 동일)
landing_type='promotion' = 0건
총 스캔 65건 / 스캔된 QR 25개 → analytics 는 사실상 greenfield
placement 유사 컬럼 전수: store_execution_assets.usage_type · kpa_contents.usage_type · store_tablets.location
  → 셋 다 QR 의 배치 위치를 표현하지 못한다
백엔드 QR 계약은 이미 공통(store-qr.service / qr-print.service / store-screen-set-qr.service)
중복은 프론트 전용 (KPA 2,070L · PH 617L · KCos 598L 1세대 공통 View)
```

---

## §2. `type` vs `landing_type` — 이중 진실 정리

### 2-1. 판정

| 필드 | 판정 | 근거 |
|---|---|---|
| `landing_type` | **`TARGET_TYPE`** — canonical 축 | 검증·공개 렌더·게이트·목록 필터가 전부 이 값으로 분기 |
| `type` | **`LEGACY`** — write-only 중복 | 백엔드·프론트 통틀어 이 값으로 분기하는 코드 **0건**. `store-qr.service.ts:757` 이 `type: type \|\| landingType` 으로 복사. 프로덕션 불일치 0/88 |
| `DISPLAY_CLASSIFICATION` | **존재하지 않는다** | 화면 분류는 `landingType` + `aiDescriptionMode` + `screenSetStatus` 파생. `type` 은 UI 에 나타나지 않는다 |

### 2-2. Canonical target 계약

```text
targetKind ∈ { PRODUCT, CONTENT, SCREEN_SET, EXTERNAL_LINK }
```

### 2-3. 기존 값 → canonical 의미 매핑표

**이 표는 migration 이 아니라 의미 선언이다.** 기존 DB 값을 바로 옮기지 않는다.

| 기존 `landing_type` | prod | canonical `targetKind` | canonical `contentSource` | 처리 |
|---|---:|---|---|---|
| `product` | 18 | `PRODUCT` | `STORE_PRODUCT_LISTING` | 값 유지 → 의미만 고정 |
| `page` | 16 | `CONTENT` | 원천별 3분기 (§3-2) | **source 를 별도 컬럼으로 승격**해야 의미가 확정됨 |
| `screen_set` | 40 | `SCREEN_SET` | `TABLET_SCREEN_SET` | 값 유지 |
| `link` | 13 | `EXTERNAL_LINK` **또는** `CONTENT` | 원천별 3분기 (§3-2) | **blog·mlc 는 내부 콘텐츠인데 link 로 기록됨 → 재분류 대상** |
| `video` | 1 | `CONTENT` | `STORE_VIDEO` | 전용 kind 를 만들지 않는다 |
| `promotion` | **0** | — | — | **DEAD.** 신규 생성 차단 후 `VALID_QR_LANDING_TYPES` 에서 제거 |

### 2-4. `type` 폐기 순서 (구현 시)

```text
1. write 중단  — store-qr.service.ts 의 `type: type || landingType` 제거,
                 update 경로의 type 수용 제거
2. read 중단   — SELECT 목록에서 qr.type 제거, API 응답 인터페이스에서 제거,
                 프론트 3벌(StoreQrCode 인터페이스)에서 제거
3. 컬럼 폐기   — 별도 migration WO. NOT NULL DEFAULT 'product' 이므로 DROP 전
                 DEFAULT 제거 + NULL 허용 단계를 거친다
```

1·2 는 회귀 위험 0 (분기 소비처 0건). 3 은 별도 승인 필요 (CLAUDE.md §0).

---

## §3. QR Target 과 Content Source 분리

### 3-1. 두 질문은 다르다

```text
A. 무엇을 여는가?      → targetKind      (렌더러가 어떤 화면을 그릴지)
B. 원천은 무엇인가?    → contentSource   (어느 원장에서 왔는지 · analytics 의 콘텐츠 축)
```

현재는 `landing_type` 하나가 둘을 겸하고 있고, 그 결과:
- `page` 하나에 원천 3개가 섞여 공개 렌더러가 **추측**한다 (`kpa_contents` 만 inline, 나머지 redirect fallback).
- `link` 하나에 "외부 URL / 매장 블로그 / 다국어 제품 콘텐츠" 3개 의미가 섞여, **내부 콘텐츠가 외부 링크로 기록**된다 → 콘텐츠 축 analytics 가 원리적으로 불가능하다.

### 3-2. Canonical 2축 매핑 (현재 코드 기준)

| `targetKind` | `contentSource` | 실제 원천 테이블 | 현재 `landing_type` | 현재 UI source |
|---|---|---|---|---|
| `PRODUCT` | `STORE_PRODUCT_LISTING` | `organization_product_listings` / `local_products` | `product` | 상품 선택 |
| `PRODUCT` | `PRODUCT_MASTER_LANDING` | `product_landings` | (없음) | **신규 — §4-C** |
| `CONTENT` | `EXECUTION_ASSET` | `store_execution_assets` | `page` | `asset` |
| `CONTENT` | `STORE_DIRECT` | `kpa_store_contents` (`source_type='direct'`) | `page` | `direct-content` |
| `CONTENT` | `SHARED_CONTENT` | `kpa_contents` (운영자 HUB) → **매장 사본 치환** | `page` | `content-hub` |
| `CONTENT` | `STORE_BLOG` | `store_blog_posts` | **`link`** ← 재분류 | `blog` |
| `CONTENT` | `MULTILINGUAL_PRODUCT` | `store_multilingual_product_content_*` | **`link`** ← 재분류 | `mlc` |
| `CONTENT` | `STORE_VIDEO` | `store_videos` | `video` ← 재분류 | (없음) |
| `SCREEN_SET` | `TABLET_SCREEN_SET` | `store_tablet_screen_sets` | `screen_set` | 자동 |
| `EXTERNAL_LINK` | `EXTERNAL_URL` | — | `link` | 외부 URL 직접 입력 |

**source 는 8종이다** (WO 가 예상한 "5종 이상"과 일치).

### 3-3. 계약

1. `targetKind` 는 **렌더러 선택**에만 쓴다.
2. `contentSource` 는 **analytics 콘텐츠 축**과 **사본 정책**(HUB 원본 → 매장 사본 치환)에 쓴다.
3. `landingTargetId` 의 의미는 `(targetKind, contentSource)` 조합이 결정한다. UUID / 절대 URL 혼재는 source 가 있으면 모호하지 않다.
4. **`library_item_id` 이중 경로는 종료한다.** prod 7건은 `contentSource=EXECUTION_ASSET` + `landingTargetId=asset UUID` 로 흡수한다 (backfill 대상, 별도 승인).

---

## §4. 상품 QR 계약 — 두 종류를 합치지 않는다

### 4-A. ProductMaster Representative QR

| 항목 | 값 |
|---|---|
| 원장 | `product_landings` (master 당 UNIQUE, 272,040 row) |
| 공개 URL | `/p/{public_key}` |
| 소유 | **제품 자체** — organization 축이 존재하지 않는다 |
| 내용 | 제품 식별 · 공통 정보 · STORE canonical 설명 · 다국어 |
| 이미지 | 비저장 (동적 인코딩 — F12 불변식 ④) |
| placement | **없다.** 매장별 실행자산이 아니다 |
| analytics | 매장 귀속 scan 없음 |
| 과금 | **1-A 공공재** — 무료 · 영구 · 주소 불변 |

### 4-B. Store Product QR

| 항목 | 값 |
|---|---|
| 원장 | `store_qr_codes` (`targetKind=PRODUCT`) |
| 공개 URL | `/qr/{slug}` |
| 소유 | 매장 organization |
| 용도 | 상담 대용 · 특정 매대용 · 행사/캠페인용 · POP 용 |
| placement | **있다** (§7) |
| analytics | `store_qr_scan_events` |
| 과금 | **1-B 사업용 entitlement** |

### 4-C. 두 축의 접점 — 한 방향만 허용

매장이 "이 제품의 대표 정보를 그대로 쓰겠다"고 할 때:

```text
허용:   Store QR (targetKind=PRODUCT, contentSource=PRODUCT_MASTER_LANDING)
        → landingTargetId = product_landings.public_key
        → 매장 QR 주소는 /qr/{slug}, 열리는 내용은 대표 랜딩
        → 매장은 자기 slug·자기 placement·자기 scan analytics 를 갖는다

금지:   product_landings 에 organization_id 를 추가하는 것
금지:   store_qr_codes 의 slug 를 /p/{public_key} 로 대체하는 것
금지:   두 원장을 하나로 합치는 것
```

### 4-D. UI 용어 고정 (혼동 방지)

| 개념 | UI 표기 | 금지 표기 |
|---|---|---|
| 4-A | **"제품 대표 QR"** | "상품 QR", "내 QR" |
| 4-B | **"매장 QR — 제품 연결"** | "제품 QR" (단독) |

analytics 화면에서도 두 축을 같은 표에 합산하지 않는다.

---

## §5. 상품 Content 선택 계약

Tablet 축에서 확정된 계약:

```text
① 매장이 명시적으로 선택한 product-linked store content
② 없으면 STORE canonical (shared_product_descriptions, description_type='STORE')
③ 없으면 empty
언어 fallback (viewer 언어 → ko) 은 ①②③ 순위 fallback 보다 먼저 적용한다.
B2B / B2C 자동 fallback 은 금지한다.
```

### 5-1. QR 적용

| QR 종류 | 적용 |
|---|---|
| **4-A 제품 대표 QR** | ②③ 만 적용. **①은 적용하지 않는다** — 매장 선택은 매장 실행자산의 개념이고, 대표 랜딩은 매장을 모른다 |
| **4-B 매장 제품 QR** | ①②③ 전부 적용. Tablet 과 **동일한 resolver 를 공유한다** |

### 5-2. 계약

1. QR 은 상품 콘텐츠를 **새로 고르지 않는다.** Tablet 과 동일한 resolve 함수를 호출한다.
2. resolve 결과가 ③ empty 이면 QR 을 **생성하지 못하게 막는다** (PH 컨트롤러 헤더 원칙: "스캔했을 때 빈 화면이 되는 QR 0").
3. `B2B` / `B2C` description_type 으로의 자동 fallback 은 QR 에서도 금지한다.

---

## §6. 일반 Content QR

### 6-1. 대상

상품 관련 콘텐츠 · 건강정보 · 캠페인 · 교육형 · 매장 안내 · 이벤트/프로모션 · Screen Set · 기타 · 외부 URL.

이들은 전부 `targetKind ∈ {CONTENT, SCREEN_SET, EXTERNAL_LINK}` 로 표현되며 **새 kind 를 만들지 않는다.**
"프로모션"은 별도 target 이 아니라 `CONTENT` + 매장 콘텐츠다 — 그래서 `landing_type='promotion'` 은 DEAD 다.

### 6-2. Content picker 재사용

```text
canonical picker = services/web-kpa-society/src/components/store/StoreAssetSelectorModal.tsx
                   (asset / content-hub / blog / mlc / direct-content — 5 source)
```

- **신규 QR 전용 Content repository 를 만들지 않는다.** 5개 source 전부 기존 매장 콘텐츠 원장을 가리킨다.
- 이 picker 를 `@o4o/store-ui-core` 로 추출해 **KPA · PH 가 공유**한다 (§17).
- PH 의 `/store-owner/qr/sources` 는 3 source → 5 source 로 확장한다 (`MISSING_ADOPTION` 해소).

---

## §7. QR Placement 설계

### 7-1. Target 과 Placement 는 다른 질문이다

```text
Target    = 찍으면 무엇이 나오는가        (§2·§3)
Placement = 실제로 어디에서 사용하는가    (본 절)
```

### 7-2. Placement 후보값 — **enum 을 확정하지 않는다**

WO 초기 후보 + 매장 업무 기준 추가 검토를 합친 **작업 목록**이다. 구현 시 매장 인터뷰로 확정한다.

| 후보 | 매장 업무 표현 | 비고 |
|---|---|---|
| `TABLET` | 태블릿 화면 | Screen Set QR 이 이미 여기 해당 |
| `SHELF` | 매대 · 진열대 | |
| `PRODUCT_STICKER` | 제품 옆 스티커 | SHELF 와 분리해야 하는지 검증 필요 |
| `PRICE_TAG` | 가격표 옆 | ESL 과 겹칠 수 있음 |
| `ESL` | 전자 가격표 | 미구현이나 막지 않는다 |
| `POP` | POP 물 | |
| `POSTER` | 포스터 · 쇼윈도 | 쇼윈도를 분리할지 검증 필요 |
| `COUNSELING_TABLE` | 상담대 · 상담 카드 | |
| `ENTRANCE` | 출입구 | |
| `LEAFLET` | 리플릿 · 행사물 | |
| `SHOPPING_BAG` | 쇼핑백 · 동봉물 | |
| `PRINT` | 기타 출력물 | |
| `OTHER` | 기타 (자유 라벨) | **필수** — 확정하지 못한 것을 강제 분류시키지 않는다 |

**설계 규칙**: placement 값 집합은 **개방형**으로 시작한다 (DB CHECK 제약을 즉시 걸지 않는다). 실제 사용 분포를 6개월 관측한 뒤 정규화한다.

### 7-3. 기존 구조 재사용 가능성 — 조사 결과

| 후보 | 판정 |
|---|---|
| `store_execution_assets.usage_type` (`pop\|qr\|signage\|banner\|notice`) | **재사용 불가.** 축이 다르다 — "자산을 어떤 매체로 쓰는가"이고 **자산 쪽에 붙어 있다**. QR 은 이 중 한 값(`qr`)일 뿐, 자기 배치 위치를 표현할 자리가 없다 |
| `kpa_contents.usage_type` | 재사용 불가. 콘텐츠 분류축 |
| `store_tablets.location` (자유 문자열) | **부분 참고.** Tablet 1대의 물리 위치 — placement 를 자유 문자열로 시작하는 선례. 단 QR 과 연결점 없음 |
| signage placement 유사 개념 | 존재하지 않음 (전수 스캔 결과 컬럼 0) |
| `store/corner/location` 구조 | `store_tablet_screen_sets` 의 코너 개념은 **Tablet 내부 구조**이지 매장 물리 위치가 아니다 |

**결론: 확장할 기존 구조가 없다. 신설이 불가피하다.**
단, 신설 대상은 "QR placement" 하나이며 콘텐츠·자산 축을 건드리지 않는다.

---

## §8. Placement 데이터 모델 후보 비교

### 비교축

| 축 | 설명 |
|---|---|
| C1 | QR 하나를 여러 위치에서 쓸 수 있는가 |
| C2 | 같은 Content 를 서로 다른 QR 로 **위치별 분석** 가능한가 |
| C3 | QR 이동·교체 **이력**이 남는가 |
| C4 | **비활성화**(QR 폐기)와 **placement 종료**를 분리할 수 있는가 |
| C5 | analytics 연결 용이성 |
| C6 | **slug 불변** (§0-2) 을 지키는가 |

### 안 A — `store_qr_codes` 에 컬럼 추가

```sql
ALTER TABLE store_qr_codes ADD COLUMN placement VARCHAR(40) NULL;
```

| C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|
| ❌ 1개만 | ✅ | ❌ 없음 | ❌ 같은 필드 | ✅ 최상 | ✅ |

가장 단순하고 analytics 가 즉시 성립하나, 1 QR = 1 Placement 로 고정되고 이력이 없다.

### 안 B — 별도 `store_qr_placements` 테이블

```sql
CREATE TABLE store_qr_placements (
  id UUID PK, qr_code_id UUID, organization_id UUID,
  placement VARCHAR(40), label VARCHAR(200) NULL,
  started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ NULL,
  ...
);
```

| C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|
| ✅ N개 | ⚠️ **불가** | ✅ 완전 | ✅ 완전 | ⚠️ **모호** | ✅ |

C2·C5 가 치명적이다. 스캔 이벤트가 아는 것은 `qr_code_id` 하나이므로, 한 QR 에 활성 placement 가 2개 이상이면 **스캔을 어느 placement 에 귀속할지 결정할 수 없다.**

### 안 C — 기존 execution asset / usage 재사용

| C1 | C2 | C3 | C4 | C5 | C6 |
|---|---|---|---|---|---|
| ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

§7-3 대로 축이 다르다. **기각.**

### 안 D — 다른 기존 모델 (`store_tablets.location` 확장 등)

Tablet 전용 구조이며 QR 일반에 적용 불가. **기각.**

### 채택 — **B 를 기반으로, 발급 정책으로 C2 를 해결한다**

안 B 의 유일한 결함은 "한 QR 에 활성 placement 다중일 때 귀속 불가"다. 이것은 **모델 결함이 아니라 물리 현실**이다 — 같은 QR 이미지를 매대와 상담대에 붙이면, 스캔이 어디서 왔는지는 **어떤 소프트웨어로도 알 수 없다.**

따라서:

```text
모델    : 1 QR : N Placement 를 허용한다 (안 B)
분석단위: QR Instance 다
정책    : 위치별 analytics 가 필요하면 Placement 별 QR Instance 를 발급한다
고지    : 동일 QR 이미지를 여러 Placement 에서 재사용하면
          위치별 scan 귀속은 불가능함을 시스템과 UI 에서 명시한다
```

---

## §9. 권장 관계 모델

```text
Content / Product / ScreenSet
        │
        ▼  (targetKind + contentSource)
   QR  Target
        │  1 : N          ← 같은 Target 을 여러 QR Instance 로 발급 가능
        ▼
  store_qr_codes  (QR Instance = slug = 물리 이미지 = 분석 단위)
        │  1 : N          ← 이력 포함. 동시 활성은 정책상 1개 권장
        ▼
  store_qr_placements  (사용처 이력)
        │
        ▼
  store_qr_scan_events  (qr_code_id 기준 → 활성 placement 로 귀속)
```

### 9-1. 세 개를 분리한다

```text
CONTENT   ≠  QR  ≠  PLACEMENT
콘텐츠      실행 인스턴스   배치 위치
```

- 콘텐츠를 고쳐도 QR 은 그대로다 (slug 불변).
- QR 을 옮겨도 콘텐츠는 그대로다.
- placement 를 끝내도 QR 주소는 살아 있다 (재인쇄 0).

### 9-2. 필수 UX 동선

```text
기존 QR (혈당관리 콘텐츠, 사용처: 매대)
   └─ [같은 콘텐츠로 QR 추가]
        └─ 사용처 선택 (ESL / 상담대 / POP / 기타)
             └─ 새 QR Instance 생성 (새 slug · 같은 Target)
```

이 동선은 **공통 QR Operation 에 포함되어야 한다** (§17). 이것이 없으면 매장은 "QR 을 하나 더 만든다"는 개념에 도달하지 못하고 같은 이미지를 복사해 붙인다 → 위치별 analytics 가 영구히 성립하지 않는다.

### 9-3. UI 고지 문구 (필수)

QR 이 2개 이상 활성 placement 를 가질 때:

> 이 QR 은 여러 사용처에 배치되어 있습니다. **스캔이 어느 위치에서 발생했는지는 구분할 수 없습니다.**
> 위치별 통계가 필요하면 [같은 콘텐츠로 QR 추가] 로 사용처별 QR 을 발급하세요.

### 9-4. 스키마 초안 (구현 시 확정)

```sql
-- 신규 1개 테이블. 기존 테이블은 additive 변경만.
CREATE TABLE store_qr_placements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL,           -- 테넌트 격리 (Guard Rule 3)
  qr_code_id       UUID NOT NULL,           -- 논리 참조 (기존 QR 테이블 FK 관행 준수)
  placement        VARCHAR(40) NOT NULL,    -- 개방형. CHECK 제약 즉시 부여하지 않음
  label            VARCHAR(200) NULL,       -- 매장 자유 표기 ("혈당관리 매대")
  corner_ref       VARCHAR(200) NULL,       -- 코너/구역 참조 (선택)
  status           VARCHAR(16) NOT NULL DEFAULT 'active',  -- active | ended
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at         TIMESTAMPTZ NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sqp_org_qr    ON store_qr_placements (organization_id, qr_code_id);
CREATE INDEX idx_sqp_org_active ON store_qr_placements (organization_id, placement)
  WHERE status = 'active';

-- store_qr_codes 에는 조회 편의용 denormalize 만 (SSOT 는 placements)
ALTER TABLE store_qr_codes ADD COLUMN primary_placement VARCHAR(40) NULL;
```

`primary_placement` 는 `store_tablet_screen_sets.public_qr_slug` 와 같은 패턴 — **SSOT 는 별도 테이블이고 이것은 목록 조회용 캐시**다.

---

## §10. Tablet QR

```text
Screen Set → Tablet → QR → Consumer Phone
```

Tablet 에서의 QR 사용도 **Placement 로 본다**: `placement = TABLET`.

### 10-1. Target 은 명시적이어야 한다

태블릿 화면의 QR 이 무엇을 여는지 세 가지가 가능하다:

| Target | targetKind | 용도 |
|---|---|---|
| Screen Set 전체 | `SCREEN_SET` | 코너 전체를 폰으로 이어보기 (**현재 구현된 것**) |
| 특정 Content | `CONTENT` | 화면 안의 한 콘텐츠만 |
| 특정 Product | `PRODUCT` | 화면 안의 한 제품만 |

현재는 첫 번째만 존재한다. 나머지 둘은 **설계상 가능해야 하되 이번에 구현하지 않는다.**

### 10-2. 기존 계약 최대한 재사용

```text
재사용 (변경 금지):
  store-screen-set-qr.service.ts  — 멱등 생성 · slug 발급 · public_qr_slug 동기화
  QR_LANDABLE_CONDITION           — 활성 판정식 SSOT (공개 /qr/:slug 이중 게이트와 동일)
  SCREEN_SET_QR_JOIN
  20270207000000 의 partial UNIQUE (organization_id, landing_target_id) WHERE screen_set

추가:
  screen_set QR 생성 시 store_qr_placements 에 placement='TABLET' 을 자동 1건 기록
  (기존 40건은 backfill 대상 — 별도 승인)
```

Screen Set 당 QR 1개라는 partial UNIQUE 는 유지한다. Screen Set 은 태블릿 1대에 대응하므로 placement 다중 발급 요구가 없다.

---

## §11. ESL

**구현하지 않는다.** 설계가 ESL 을 막지 않는 것만 확인한다.

두 조합이 모두 성립해야 한다:

```text
placement=ESL + targetKind=PRODUCT (contentSource=PRODUCT_MASTER_LANDING)   → 제품 대표 정보
placement=ESL + targetKind=CONTENT (contentSource=STORE_DIRECT 등)          → 매장 콘텐츠
```

§9 모델에서 placement 와 target 이 완전히 독립이므로 두 조합 모두 자연히 성립한다.

**금지**: 특정 ESL 제조사·API 에 종속되는 필드를 `store_qr_placements` 에 넣지 않는다. `placement='ESL'` + `label` 자유 문자열까지가 이번 설계의 범위다.

---

## §12. 출력물 / POP — Output 과 Placement 를 분리한다

```text
Output    = 어떤 규격으로 출력하는가   → QrExportPreset (small|medium|large|a4|a4_4up)
Placement = 어디에 배치하는가          → store_qr_placements.placement
```

예:

| 행위 | 축 |
|---|---|
| A6 PDF 생성 | **Output** (`preset`) |
| 혈당관리 매대에 부착 | **Placement** (`SHELF` + label="혈당관리 매대") |

### 12-1. 계약

1. **출력 preset 과 placement 를 같은 필드로 합치지 않는다.**
2. 출력은 **몇 번이든 반복 가능**하다 (같은 slug 재출력 = 같은 QR). placement 는 상태를 가진다.
3. POP 은 placement 의 한 값(`POP`)이다. `store-pop.controller.ts` 가 POP PDF 에 QR 을 embed 할 때, 그 QR 에 `placement='POP'` 기록을 남기는 것은 **후속 구현 대상**이다 (현재는 QR 쪽에 아무 흔적이 없다).
4. `qr-print.service.ts` 는 변경하지 않는다 — 이미 canonical 이다.

---

## §13. Analytics 재설계

### 13-1. 목표 차원

```text
QR × Content × Placement × Store × Corner/location × Period
```

### 13-2. 목표 출력 예시

```text
"혈당관리" 콘텐츠  총 1,200 scans
  ├ TABLET      530
  ├ SHELF       360
  ├ ESL         190
  ├ POP          85
  └ COUNSELING   35
```

이 표가 성립하려면 **콘텐츠별로 placement 마다 별도 QR Instance 가 발급되어 있어야 한다** (§8 채택안). 그래서 §9-2 의 UX 동선이 analytics 의 전제다.

### 13-3. 구현 방식 — 스캔 이벤트 스키마를 바꾸지 않는다

`store_qr_scan_events` 는 append-only 이고 65 row 뿐이지만, **스캔 시점 denormalize 를 추가하지 않는다**:

```text
집계 = store_qr_scan_events
       JOIN store_qr_codes            (targetKind · contentSource · title)
       JOIN store_qr_placements       (placement · label, status='active')
```

이유: placement 는 시간에 따라 변하고, 과거 스캔을 과거 placement 에 귀속하려면 `started_at`/`ended_at` 구간 조인이 필요하다. 이벤트에 값을 박으면 그 구간 정보가 사라진다.

**구간 귀속 조인**:

```sql
LEFT JOIN store_qr_placements p
  ON p.qr_code_id = e.qr_code_id
 AND e.created_at >= p.started_at
 AND (p.ended_at IS NULL OR e.created_at < p.ended_at)
```

한 QR 에 동시 활성 placement 가 2개 이상이면 이 조인이 **행을 복제한다** → 그 경우 집계는 `placement='(구분불가)'` 로 접어서 표시한다. 이것이 §9-3 고지의 데이터 근거다.

### 13-4. 개인정보

```text
개인 소비자 식별은 필요 없다.
기존 device_type / user_agent / referer / ip_hash 최소화 계약을 그대로 유지한다.
placement 축 추가는 QR 쪽 메타데이터일 뿐 개인 식별성을 높이지 않는다.
```

---

## §14. QR Lifecycle — 3개 상태를 분리한다

| 축 | 상태 | 저장 위치 | 의미 |
|---|---|---|---|
| **QR 자체** | `ACTIVE` / `INACTIVE` | `store_qr_codes.is_active` | 이 주소가 열리는가 |
| **Target** | `AVAILABLE` / `ARCHIVED` / `DELETED` | 대상 원장 (예: `store_tablet_screen_sets.status`) | 열 내용이 아직 있는가 |
| **Placement** | `ACTIVE` / `ENDED` | `store_qr_placements.status` | 지금 그 자리에 붙어 있는가 |

### 14-1. 계약

1. **`is_active` 와 placement 상태를 같은 의미로 사용하지 않는다.**
   매대에서 뗐다고 QR 을 비활성화하면 그 QR 이 인쇄된 리플릿이 전부 죽는다.
2. Target 이 `ARCHIVED` 여도 QR 은 목록에 남고 **주소는 유지**한다 (재인쇄 방지). 공개 게이트에서만 차단한다 — 현재 screen_set QR 이 이미 이 동작이다 (prod: 40건 중 22건이 archived 세트 대상).
3. **`QR_LANDABLE_CONDITION` 을 모든 targetKind 로 일반화한다.** 현재는 `screen_set` 만 target 상태를 본다. `CONTENT`·`PRODUCT` 는 대상이 삭제돼도 `is_active=true` 로 남아 빈 화면 QR 이 된다.
4. Target `DELETED` 는 QR 을 자동 비활성화하지 않는다. 매장에 **"대상이 삭제됨 — 다른 대상 연결"** 을 제시한다 (slug 유지 = 재인쇄 0).

### 14-2. 상태 조합 표

| QR | Target | Placement | 화면 표기 | `/qr/{slug}` |
|---|---|---|---|---|
| ACTIVE | AVAILABLE | ACTIVE | 정상 | 열림 |
| ACTIVE | AVAILABLE | ENDED | 보관 중 (주소 유지) | 열림 |
| ACTIVE | ARCHIVED | ACTIVE | **대상 보관됨** | 차단 |
| ACTIVE | DELETED | ACTIVE | **대상 없음 — 재연결 필요** | 차단 |
| INACTIVE | * | * | 비활성 | 차단 |

---

## §15. KPA / PharmacyHub parity 계획

> 차이는 기본적으로 `MISSING_ADOPTION` 으로 본다. **새로운 business difference 로 만들지 않는다.**

| 항목 | 현재 | 목표 |
|---|---|---|
| 저장 계약 / 이미지 / PDF | **PARITY** ✅ | 유지 |
| 생성 가능 landing type | **PARITY** ✅ (양쪽 product/page/link) | 유지 + `promotion` 제거 |
| 조직 결정 | KPA `createRequireStoreOwner` / PH enrollment 재해석 | **SERVICE_ADAPTER_REAL** — 유일한 정당한 차이. 유지 |
| Content source | KPA 5 / PH 3 | **PH 를 5 로** (blog · mlc adoption) |
| screen_set QR | KPA 만 | **PH 에 개방.** Tablet 축이 CLOSED 되었으므로 이제 가능 |
| video QR | KPA 만 (prod 1건 비활성) | adoption 하지 않는다 — `CONTENT`+`STORE_VIDEO` 로 흡수 |
| export | KPA 일괄 A4 8분할 / PH preset export | **양쪽 다 갖게 한다** |
| analytics | 라우트만 다름 | placement 축 추가 시 **동일 응답 계약** |
| empty / error | 미비교 | 공통 View 로 흡수하면 자동 parity |
| store connection | PH 만 0개/2개 이상 안내 | KPA 에도 동일 계약 적용 검토 |
| lifecycle | 둘 다 §14 결함 공유 | 공통 service 에서 동시 해소 |
| **프론트** | KPA 2,070L / PH 617L 자체 구현 | **공통 View 로 흡수** (§17) |

---

## §16. K-Cosmetics / GlycoPharm

### GlycoPharm
**존재하지 않는다.** `WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1`(`86bf574ae`) 로 서비스 전체 삭제. 판정 대상 아님.

### K-Cosmetics — **이번 회차 adoption 하지 않는다**

| 기능 | 판정 |
|---|---|
| 백엔드 (`store-qr.service.ts` 공유) | **`CANONICAL_READY`** |
| 매장 QR 콘솔 (`StoreQrConsoleView` 1세대) | **`LEGACY_KEEP`** — Phase 1 에서 세대 교체 대상이 되나, KCos 자체는 Phase 1 이후 adoption |
| 운영자 QR 템플릿 | **`CAN_ADOPT_LATER`** (`operator_qr_templates` prod 0 row) |
| HUB QR 라이브러리 | **`CAN_ADOPT_LATER`** |
| `/qr/:slug` 공개 라우트 부재 | **`SERVICE_SPECIFIC_REAL` 아님 — 결함 후보.** KCos 매장이 QR 을 만들어도 자기 도메인에서 열리지 않는다. 별도 확인 필요 |

---

## §17. 공통 Core 경계

> **신규 package 를 자동 생성하지 않는다.** `@o4o/store-ui-core` 안에서 세대 교체한다 — Tablet 축이 `TabletCornerBoard` 로 성공한 방식과 동일하다.

### 17-1. 4개 경계

| 경계 | 범위 | 현재 자산 | 조치 |
|---|---|---|---|
| **COMMON QR OPERATION** | 목록 · 생성 · 수정 · lifecycle · target selection · placement · analytics | `StoreQrConsoleView` 598L (**1세대**, 소비처 = KCos 1곳) | **세대 교체**. KPA `StoreQRPage` 2,070L 을 기준으로 새 공통 View 를 만들고 KPA·PH·KCos 3곳이 채택 |
| **COMMON CONTENT SELECTOR** | 5 source picker | `StoreAssetSelectorModal` (KPA 전용, 최신 세대) | **그대로 추출**. 재작성하지 않는다 |
| **SERVICE ADAPTER** | serviceKey · endpoint · accent · store connection · capability | `service-catalog.ts` · `SVC_TO_CATALOG` · PH 조직 재해석 | 계약 이미 존재. 주입형으로 정리만 |
| **PUBLIC RENDERER** | Product · Content · ScreenSet · link 렌더 | 백엔드 `resolvePublicQrLanding` **이미 공통** / 프론트 `QrLandingPage` 3벌 (KPA 622L · Neture 133L · PH 120L) | 프론트만 공통화 |

### 17-2. 핵심 인식

```text
QR 축의 백엔드는 이미 공통이다.
중복은 프론트 전용이다.
따라서 공통화 작업 = 프론트 View 추출 + 1세대 View 교체
```

이것이 Tablet 축과 다른 점이다 (Tablet 은 프론트·백엔드 양쪽 정리가 필요했다).

### 17-3. 순서 규칙

**1세대 `StoreQrConsoleView` 를 그대로 확장하지 않는다.** 최신 세대(KPA)를 기준으로 새 컴포넌트를 만들고, 소비처를 옮긴 뒤 1세대를 제거한다. 반대로 하면 구세대가 굳는다.

---

## §18. legacy / dead 정리 후보 (구현 없음)

| # | 대상 | prod | 판정 | 처리 시점 |
|:-:|---|---:|---|---|
| 1 | `store_qr_codes.type` | 88 (100% 중복) | **`DEAD`** | Phase 1 (write/read 중단) + 별도 migration WO (컬럼 DROP) |
| 2 | `landing_type='promotion'` | **0** | **`DEAD`** | Phase 1 — `VALID_QR_LANDING_TYPES` · `StoreQrConsoleView` 라벨에서 제거 |
| 3 | `landing_type='video'` | 1 (비활성) | `LEGACY_INTERMEDIATE` | Phase 1 — `CONTENT`+`STORE_VIDEO` 흡수 |
| 4 | `library_item_id` transitional | 7 | `LEGACY_INTERMEDIATE` | Phase 1 — backfill 별도 승인 |
| 5 | `operator_qr_templates` 축 | **0** | `UNKNOWN` | 보류 — 폐기/활성화 판단은 별도 WO |
| 6 | `foreign_visitor_partner_qr_*` | **0** | `UNKNOWN` | **본 설계 범위 밖** — 별개 제품 축으로 명시 분리 |
| 7 | QR 전용 AI 잔재 (`StoreQrAiDescriptionPage` 657L) | — | `CANONICAL_NEEDS_ALIGNMENT` | 콘텐츠 저작 축 문제. **별도 WO 제안** |
| 8 | 서비스별 duplicate QR console (2,070 + 617 + 598L) | — | `DUPLICATED_TO_COMMONIZE` | Phase 1 |
| 9 | 서비스별 duplicate `QrLandingPage` (622 + 133 + 120L) | — | `DUPLICATED_TO_COMMONIZE` | Phase 1 |
| 10 | KCos `/qr/:slug` 라우트 부재 | — | 결함 후보 | **별도 WO 제안** |
| 11 | storefront product redirect | — | 범위 밖 | `project-kpa-internal-storefront-retirement-track` |
| 12 | admin dead QR route | — | **해당 없음** (전수 grep 결과 존재하지 않음) | — |

---

## §19. 산출물

| 문서 | 성격 |
|---|---|
| 본 문서 `docs/design/DESIGN-O4O-STORE-QR-CANONICAL-TARGET-PLACEMENT-AND-ANALYTICS-V1.md` | 설계 확정 |
| [`docs/investigations/IR-O4O-STORE-QR-CURRENT-CONTRACT-AND-LEGACY-CENSUS-V2.md`](../investigations/IR-O4O-STORE-QR-CURRENT-CONTRACT-AND-LEGACY-CENSUS-V2.md) | READ-ONLY census |

`docs/design/` 위치 선정 근거: 기존 `DESIGN-O4O-*-V1.md` 3건(`KPA-STORE-PRODUCT-DETAIL-INFORMATION-CANONICAL-ROLE` · `KPA-TABLET-OPERATOR-UX-DIRECTION` · `PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT`)와 동일한 명명·성격이다. `docs/architecture/` 는 ADR·정본 아키텍처, `docs/baseline/` 는 정책 SSOT 이므로 "구현 전 설계"는 `docs/design/` 이 맞다.

`O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1` §7-2 의 QR Placement 요구 계약 4개는 본 설계가 전부 충족한다 — baseline 보완이 불필요하여 수정하지 않았다.

| baseline §7-2 요구 | 본 설계 |
|---|---|
| ① placement 는 target 과 독립한 축. target 타입별 하드코딩 금지 | §9 — 완전 독립 테이블 |
| ② 같은 target 을 서로 다른 placement 로 여러 번 배치 가능 | §9 — Target 1:N QR Instance |
| ③ placement 추가·변경이 slug·재발급을 유발하지 않아야 함 | §0-2 · §14-1 |
| ④ 기존 유사 개념을 먼저 조사, 중복 신설이 아닌 확장 우선 | §7-3 — 전수 조사 후 "확장할 구조 없음" 확정 |

---

## §20. 이번 회차에 하지 않은 것

```text
코드 구현 · migration · schema 적용 · production DB write
PharmacyHub / KPA UI 변경
store_qr_placements 테이블 생성
QR target migration
K-Cosmetics adoption
ESL integration
```

프로덕션 DB 는 **read-only SELECT 만** 수행했다 (CLAUDE.md §0). COUNT · 형태 분류 · 상태값만 조회했고 개인 식별 데이터는 조회하지 않았다.

---

## §21. 다음 구현 계획 — 2개 작업

### Phase 1 — QR Canonical Target + Common Operation + KPA/PH Parity

```text
1. type write/read 중단 · promotion 신규 생성 차단 · video → CONTENT+STORE_VIDEO
2. contentSource 컬럼 승격 (additive, nullable) + 기존 88건 backfill 매핑 (§2-3)
3. QR_LANDABLE_CONDITION 을 모든 targetKind 로 일반화 (§14-1-3)
4. StoreAssetSelectorModal → @o4o/store-ui-core 추출
5. 새 공통 QR Operation View (KPA 2,070L 기준) → KPA · PH 채택
6. PH: content source 3 → 5 · screen_set QR 개방 · 일괄 print
   KPA: preset export 라우트 정렬
7. 공통 QrLandingPage 프론트 추출

schema 변경: additive 1개 컬럼 (contentSource) + backfill
회귀 위험: 낮음 (type 분기 소비처 0건 · promotion prod 0건)
```

### Phase 2 — Placement + Analytics

```text
1. store_qr_placements 테이블 생성
2. store_qr_codes.primary_placement denormalize 컬럼
3. screen_set QR 40건 → placement='TABLET' backfill
4. [같은 콘텐츠로 QR 추가] UX 동선 (§9-2)
5. 다중 활성 placement 고지 UI (§9-3)
6. analytics 구간 귀속 조인 (§13-3) + Content × Placement 집계
7. POP PDF embed 시 placement='POP' 기록 (§12-3)
8. lifecycle 3축 분리 UI (§14-2)
```

### 21-1. 하나로 합칠 수 있는가

**합치지 않는 것을 권장한다.** Phase 1 은 additive 컬럼 1개로 회귀 위험이 낮지만, Phase 2 는 신규 테이블 + backfill + UX 동선 신설이라 성격이 다르다. Phase 1 결과(공통 View 채택)를 매장이 실제로 쓰는 것을 확인한 뒤 placement 를 얹는 것이 안전하다.

단, Phase 1 의 3·6번(landable 일반화 · PH parity)은 **Phase 1 안에서 반드시 끝내야 한다** — 여기서 미루면 Phase 2 의 placement UI 가 서비스별로 두 벌 생긴다.

---

## §22. 완료 조건

```text
QR TARGET MODEL       = CLOSED   (§2 · §3)
QR CONTENT CONTRACT   = CLOSED   (§5 · §6)
QR PLACEMENT DESIGN   = CLOSED   (§7 · §8 · §9)
QR ANALYTICS DESIGN   = CLOSED   (§13)
KPA / PH PARITY PLAN  = CLOSED   (§15)
IMPLEMENTATION        = NOT_STARTED
```

---

*Status: Active Design · 2026-09-09 · 구현 미착수*
