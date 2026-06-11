# CHECK-O4O-STORE-PRODUCTS-MANAGER-HEADING-PROP-ALIGNMENT-V1

> 선행: `WO-O4O-STORE-PRODUCTS-MANAGER-HEADING-PROP-ALIGNMENT-V1`
> 연계: `WO-O4O-MY-STORE-COMMONIZATION-PHASE5-KPA-BASELINE-V1` (PASS)
> 판정: **PASS**

---

## 1. 목적

3서비스가 공유하는 `StoreProductsManagerPage`의 하드코딩 heading `"내 매장 상품"`을
서비스별로 안전하게 주입할 수 있도록 `title`/`description` prop 기반으로 정리한다.

- DB / API / 주문·결제 로직 변경 **없음**
- 공유 컴포넌트의 제목/설명 주입 구조만 정리

---

## 2. 배경

KPA `/store/my-products` 는 `OrganizationProductListing` 기반 **기본 O4O 주문 가능 상품** 화면이나,
공유 컴포넌트의 내부 heading 이 `"내 매장 상품"` 으로 하드코딩되어 의미가 흐려져 있었다.

`"내 매장 상품"` 은 KPA baseline(Phase 5)에서 분리된 여러 상품군(매장 취급 상품 / 기본 O4O 주문 가능 상품 /
이벤트형 O4O 주문 가능 상품)을 포괄해 버리는 라벨이라, 이 화면이 실제로 무엇을 다루는지 모호했다.

KPA-only 임시 수정은 GP/KCos 영향 또는 JSX 복제 위험이 있어, 공유 컴포넌트에 prop 을 추가하고
KPA wrapper 에서 의미를 주입하는 방식으로 정렬했다.

---

## 3. StoreProductsManagerPage 사용처 조사 (Phase 1)

| 서비스 | route | 사용 방식 | 변경 전 heading | 영향 | 조치 |
|---|---|---|---|---|---|
| KPA | `/store/my-products` | `<PharmacyOwnerOnlyGuard><StoreProductsManagerPage /></...>` | 기본 "내 매장 상품" | 의미 모호 | **title/description 주입** |
| Neture | `/store/my-products` | `<StoreProductsManagerPage guideSlot={...} />` | 기본 "내 매장 상품" | 없음 | 기본값 유지 (선택 A) |
| K-Cosmetics | `/store/my-products` | `<StoreProductsManagerPage />` | 기본 "내 매장 상품" | 없음 | 기본값 유지 (선택 A) |
| GlycoPharm | `/store/my-products` | `<RoleGuard><StoreProductsManagerPage /></RoleGuard>` | 기본 "내 매장 상품" | 없음 | 기본값 유지 (선택 A) |

- `headerSlot` 을 사용하는 소비처는 **없음** (모두 default header 경로).
- Neture 는 `guideSlot` 만 주입 — `headerSlot` 미사용이므로 default header title/description prop 적용 대상.

---

## 4. prop 설계 (Phase 2)

`StoreProductsManagerPageProps` 에 optional prop 2개 추가:

```ts
title?: string;        // 기본값 '내 매장 상품'
description?: string;   // 기본값 '진열 상품을 관리하고 채널별 노출을 제어하세요.'
```

설계 원칙:

- **기본값으로 기존 heading/subtitle 보존** → prop 미전달 소비처는 현재와 100% 동일 동작 (회귀 0).
- `headerSlot` 지정 시 prop 무시 — 슬롯이 헤더 전체를 대체하는 기존 계약 유지.
- 기존 `headerSlot` / `containerClassName` / `guideSlot` prop 과 충돌 없음 (순수 additive).

---

## 5. 변경 내용

### 5.1 `packages/store-products-ui/src/StoreProductsManagerPage.tsx`

- `StoreProductsManagerPageProps` 에 `title?` / `description?` 추가 (JSDoc 포함).
- 함수 시그니처에 `title = '내 매장 상품'`, `description = '진열 상품을 관리하고 채널별 노출을 제어하세요.'` 기본값 분해.
- `DefaultHeader` 호출의 하드코딩 `title="내 매장 상품"` / `subtitle="..."` → `title={title}` / `subtitle={description}` 로 교체.
- 액션 버튼 라벨(`내 매장 상품 등록`), info 배너, empty state 문구는 **이번 범위 외**로 그대로 유지.

### 5.2 `services/web-kpa-society/src/App.tsx`

- `/store/my-products` 라우트에 명시 주입:
  - `title="O4O 주문 가능 상품"`
  - `description="공급자 또는 운영자 승인 후 약국에서 반복 주문할 수 있는 O4O 공급 상품을 관리합니다."`
- WO 주석 추가 (OrganizationProductListing 기반 기본 O4O 주문 가능 상품 화면 명시).

### 5.3 미변경

- GP / KCos / Neture wrapper — 기본값 유지 (선택 A). 문구 자체 변경은 canonical 라벨 정렬 WO 로 분리.
- `storeMenuConfig.ts` — 변경 없음.
- DB / migration / API response / ProductApproval / OrganizationProductListing / StoreLocalProduct / 주문·결제·장바구니 로직 — 변경 없음.

---

## 6. 서비스별 영향

| 서비스 | 변경 후 heading | 회귀 위험 |
|---|---|---|
| KPA | **O4O 주문 가능 상품** + 설명 주입 | 없음 (typecheck PASS) |
| Neture | 내 매장 상품 (기본값 유지) | 없음 |
| K-Cosmetics | 내 매장 상품 (기본값 유지) | 없음 |
| GlycoPharm | 내 매장 상품 (기본값 유지) | 없음 |

---

## 7. 이벤트 오퍼 기준과의 관계

- 이 화면의 title 이 "O4O 주문 가능 상품" 이 되더라도, **이벤트 오퍼를 제외/부정하는 의미가 아니다.**
- 이벤트 오퍼 = 이벤트형 O4O 주문 가능 상품 (기간·상태 조건부) — O4O 주문 가능 상품군에 포함된다.
- KPA description 의 "반복 주문" 표현으로 이 화면이 `OrganizationProductListing` 기반
  **기본(반복) 주문 상품** 임을 명시 → 기간·상태 조건이 있는 이벤트형 주문 상품과 자연스럽게 구분된다.
- `ProductApproval(PENDING)` 을 주문 가능 상품처럼 표현하지 않음 — description 은 "승인 후 반복 주문" 으로 기술.

---

## 8. 검증 결과

### 정적 검증

- [x] `title`/`description` prop 추가됨
- [x] prop 미전달 시 기존 heading "내 매장 상품" 유지 (기본값)
- [x] KPA 사용처에서 O4O 주문 가능 상품 의미 명시 주입
- [x] `ProductApproval(PENDING)` 을 주문 가능 상품처럼 설명하지 않음
- [x] 이벤트 오퍼를 주문 가능 상품군에서 제외하는 것처럼 설명하지 않음
- [x] `storeMenuConfig.ts` 변경 없음
- [x] DB / API / 주문 로직 변경 없음

### TypeScript 검증

| 대상 | 명령 | 결과 |
|---|---|---|
| store-products-ui | `tsc --noEmit` | PASS |
| web-kpa-society | `tsc --noEmit` | PASS |
| web-k-cosmetics | `tsc --noEmit` | PASS |
| web-neture | `tsc --noEmit` | PASS |
| web-glycopharm | `tsc --noEmit -p tsconfig.app.json` | PASS |

### Smoke 검증

- 배포 전 단계 — typecheck + 정적 검증으로 대체. prop 추가는 순수 additive 이며 기본값이 기존 동작을
  보존하므로 미전달 소비처(GP/KCos/Neture)의 런타임 회귀 위험 없음. KPA 는 default header 경로에서
  title/subtitle 만 치환되어 레이아웃 변동 없음.

---

## 9. 제외 / 후속 작업

- **제외**: 액션 버튼 라벨("내 매장 상품 등록"), info 배너, empty state 문구 — 이번 WO 범위는 heading prop.
- **제외**: GP/KCos/Neture 문구 체계 변경 — canonical 라벨 정렬 WO 로 분리.
- **후속**: `WO-O4O-MY-STORE-CANONICAL-MENU-LABEL-ALIGNMENT-3SERVICES-V1`
  - 메뉴 라벨은 사용자가 직접 보는 IA — "제품=제작 기준 데이터 앵커" 유지 vs "O4O 주문 가능 상품" 재정의를
    3서비스 기준으로 판단 후 진행.

---

## 10. 완료 판정

| 완료 조건 | 충족 |
|---|---|
| 제목/설명 주입 prop 추가 | ✅ |
| prop 미전달 시 기존 화면 보존 | ✅ |
| KPA 에서 OrganizationProductListing 기반 반복 주문 상품 의미 명확화 | ✅ |
| KPA 화면 "내 매장 상품" 포괄 heading 의존 제거 | ✅ |
| GP/KCos 회귀 없이 기존 동작 유지 | ✅ |
| 이벤트 오퍼 기준과 충돌 없음 | ✅ |
| `storeMenuConfig.ts` 미변경 | ✅ |
| DB/API/주문/결제 로직 미변경 | ✅ |
| typecheck 통과 (5개 프로젝트) | ✅ |
| CHECK 문서 작성 | ✅ |

**판정: PASS**
