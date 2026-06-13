# CHECK-O4O-STORE-HUB-SUPPLY-CATALOG-KPA-FOLD-IN-V1

> **WO:** WO-O4O-STORE-HUB-SUPPLY-CATALOG-KPA-FOLD-IN-V1
> **선행:** `WO-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1` · `WO-O4O-STORE-HUB-SUPPLY-CATALOG-NAMING-ALIGNMENT-V1`(SupplyCatalogHub rename, `4f6dc1556` 흡수)
> **성격:** 평가 전용 — KPA fuller 의 `SupplyCatalogHub` fold-in 가능성 판정. **코드 변경 없음**(보류 판정).
> **결과:** PASS (평가 완료) — **판정 = D 보류**(KPA fuller tier 별도 유지) + C 레벨 V2 조건 명시. SupplyCatalogHub/KPA 코드 무변경.
> **작성일:** 2026-06-13 · 기준 HEAD `d1d1d8405`

---

## 1. 목적

이름 정리(SupplyCatalogHub) 완료 후, KPA `HubB2BCatalogPage`(fuller, 797줄)를 공통 `SupplyCatalogHub` 로 흡수할 수 있는지 판정한다. 무리한 통합 대신 — 깔끔히 흡수 가능하면 fold-in, 과도하게 복잡해지면 KPA fuller tier 로 유지하고 V2 조건을 남긴다.

## 2. 선행 기준

- canonical name = Supply Catalog / 공급 상품 카탈로그. legacy route `/store-hub/b2b` 유지. B2C 미혼입.
- 신청 = `applyBySupplyProductId` → ProductApproval(PENDING). 신청 ≠ 주문. 승인 후 OPL 생성.
- PRIVATE = 공급 승인 대상. 판매자 모집 표현 재혼입 금지.

대상 파일:
- 공통: `packages/store-ui-core/src/components/supply-catalog/SupplyCatalogHub.tsx`
- KPA fuller: `services/web-kpa-society/src/pages/pharmacy/HubB2BCatalogPage.tsx`

## 3. Phase 1 — KPA fuller 차이 재확인

| 항목 | SupplyCatalogHub (GP/KCos 공통) | KPA HubB2BCatalogPage (fuller) | fold-in 가능성 |
|---|---|---|:---:|
| 유통유형 탭 (all / SERVICE='B2B' / operator / PRIVATE='공급 승인 대상') | 동일 | 동일 | **A** |
| API 계약 (getCatalog / applyBySupplyProductId / cancelProductByOfferId, `pharmacyProducts` adapter) | 동일 | 동일 | **A** |
| 단건 추가/제외 + bulk(Promise.allSettled) | ✅ | ✅ (+ `DUPLICATE_APPLICATION` 카운트 세분) | **A/B** |
| "내 매장에 추가" = ProductApproval(PENDING) 의미 | 동일 | 동일 | **A** |
| selectable DataTable + ActionBar | ✅ (`@o4o/ui` ActionBar) | ✅ (인라인 ActionBar div) | **A/B** |
| accent / theme | `accent` prop `'teal'\|'pink'` (정적 Tailwind class map) | `theme.colors.primary`(KPA blue) + **인라인 styles 객체** | **C** |
| 컬럼: 권장 소비자가 (`consumerReferencePrice`) | ❌ 없음 | ✅ 별도 컬럼 | **C** |
| 컬럼: 공급가 sublabel (서비스가/일반가) | ❌ plain price | ✅ sublabel 표기 | **B/C** |
| 컬럼: 공급자 로고 (`supplierLogoUrl` / placeholder) | ❌ supplierName 텍스트만 | ✅ 로고 이미지/이니셜 placeholder | **C** |
| 제외 confirm | `window.confirm()` | ✅ 커스텀 모달 오버레이(`confirmOverlay`/`confirmBox`) | **B/C** |
| Pagination | 커스텀 이전/다음 버튼 | ✅ 공통 `Pagination`(@o4o/operator-ux-core) 컴포넌트 | **B** (Supply 전환 시 GP/KCos UI 변경=회귀 위험) |
| result count 라인 ("공급 가능 상품 N건") | ❌ (pagination 텍스트에 포함) | ✅ 별도 라인 | **B** |
| operator 탭 empty 메시지 커스텀 | generic | ✅ "운영자 승인 흐름…B2B 탭에서…" | **B** |
| supplierLabel / channelManageHref | ✅ prop 주입 | 하드코딩('/store/channels', '공급자') | **A/B** |
| `recommended` 분기 | ❌ | fetch 에만 존재, **탭 부재 → dead** | — (KPA도 미사용) |
| 스타일 방식 | Tailwind utility class | 인라인 `styles` 객체 + theme 토큰 | **C** |
| 신청 흐름 / PRIVATE 라벨 / 판매자 모집 0 / B2C 0 | 정합 | 정합 | **A** |

**요약:** 계약·탭·신청 흐름·라벨은 이미 정합(A). 차이는 **표현 레이어**에 집중 — KPA fuller 가 ① 추가 컬럼 2종(권장소비자가·공급자로고) + 공급가 sublabel, ② 커스텀 제외 confirm 모달, ③ 공통 Pagination, ④ result-count 라인, ⑤ KPA blue theme(인라인 styles) 로 더 풍부하다.

## 4. Phase 2 — fold-in 가능성 판정

| 영역 | 판정 | 근거 | 후속 |
|---|:---:|---|---|
| 탭 / API / 신청 흐름 / 라벨 | **A** | 이미 동일 | 추가 작업 없음 |
| bulk 결과 메시지 세분, result-count 라인, operator empty 메시지, supplierLabel/channelHref | **B** | optional prop 으로 흡수 가능(소규모) | V2 시 함께 |
| 공급가 sublabel | **B/C** | 표시 플래그 + 타입 필드 | V2 |
| 권장 소비자가 컬럼 · 공급자 로고 컬럼 | **C** | `SupplyCatalogProduct` 타입 필드 추가 + **optional 컬럼 렌더(column-config/slot)** 필요 | V2 |
| 제외 confirm 모달 모드 | **C** | window.confirm → 모달 마크업 + confirm-mode 옵션 | V2 |
| accent 확장(KPA blue) + 인라인 styles → Tailwind 정합 | **C** | accent 3종+ 확장 또는 스타일 토큰 정합 | V2 |
| Pagination 컴포넌트 통일 | **B(주의)** | Supply 를 공통 Pagination 로 바꾸면 **GP/KCos UI 동반 변경=회귀** | opt-in 으로만 |

**종합 판정 = D (KPA fuller tier 별도 유지 권장) + C(V2 경로 명시).**

근거: KPA wrapper 전환은 위 **C 항목(추가 컬럼 2종 + 공급자 로고 + 제외 confirm 모달 + accent/스타일 확장)이 모두 충족돼야** 가능하다. 이는 단일 optional prop tweak 범위를 넘어 **column-config/slot + confirm-mode + accent/스타일 확장**이라는 구조적 확장이며, 공통 컴포넌트를 과도하게 복잡하게 만들고(“clean & simple” 위배) Pagination·accent 변경 시 **GP/KCos 회귀 위험**을 동반한다. WO 지침("무리하면 KPA 별도 fuller tier 유지")에 따라 **이번 WO 에서는 fold-in 보류**한다.

## 5. Phase 3 — SupplyCatalogHub 확장 또는 보류

**보류 — SupplyCatalogHub 무변경.** 부분 확장(예: 권장소비자가 컬럼만 추가)은 KPA wrapper 전환을 가능하게 하지 못한 채(나머지 C 항목 미충족) 공통 컴포넌트에 **미사용 surface 만 추가**하므로 가치가 없다. fold-in 은 all-or-nothing(wrapper 가 KPA 의 모든 fuller 요소를 요구) 이므로, C 항목 일괄 설계가 준비될 때(V2) 한 번에 진행한다.

## 6. Phase 4 — KPA 적용 또는 별도 유지

**별도 유지.** KPA `HubB2BCatalogPage`(fuller) 는 현행대로 둔다. GP/KCos 는 `SupplyCatalogHub` thin wrapper 유지(무변경). KPA 코드 변경 없음.

### V2 fold-in 조건 (다음 WO `WO-O4O-STORE-HUB-SUPPLY-CATALOG-KPA-FOLD-IN-V2` 후보)
SupplyCatalogHub 에 다음을 **opt-in props/slots** 로 추가하고 GP/KCos 무회귀가 보장될 때 KPA wrapper 를 전환한다:
1. `SupplyCatalogProduct` 옵션 필드: `consumerReferencePrice?`, `supplierLogoUrl?`, `priceSublabel`(서비스가/일반가 유도)
2. 컬럼 확장: `extraColumns` 또는 `columnConfig`(권장소비자가/공급자로고/공급가sublabel opt-in)
3. `removeConfirm?: 'native' | 'modal'` (기본 native=window.confirm, modal=KPA식 오버레이)
4. accent 확장: `'teal'|'pink'|'blue'`(KPA) 또는 theme-token 주입 — GP/KCos 기존 accent 불변
5. `pagination?: 'simple' | 'full'`(full=공통 `Pagination`) — GP/KCos 기본 simple 유지(회귀 0)
6. `resultCount?`, `emptyMessages?`(operator 등 탭별 커스텀), `supplierLabel`/`channelManageHref`(KPA 하드코딩 → prop)
- 조건 충족 시 KPA `HubB2BCatalogPage` → `<SupplyCatalogHub ... />` thin wrapper 전환.

## 7. 제외 / 무변경 항목

- backend / DB / migration / ProductApproval backend / OrganizationProductListing 생성 로직 — 무변경
- checkout / order / cart / event-offer / 유통참여형 펀딩(Market Trial) — 무관·무변경
- Neture — LMS·supply catalog 미소비, 무변경
- route `/store-hub/b2b` · distributionType(SERVICE/PRIVATE) — 무변경
- GP/KCos `SupplyCatalogHub` thin wrapper — 무변경(회귀 0)
- KPA `HubB2BCatalogPage` fuller — 무변경(별도 tier 유지)

## 8. 검증 결과

- **코드 변경 0** — SupplyCatalogHub / KPA HubB2BCatalogPage / GP·KCos wrapper / index.ts 모두 미수정. 따라서 typecheck delta 없음(직전 naming-alignment 시점 대비 동일). store-ui-core 의 사전 존재 `@o4o/*` 로컬 dist 미빌드 오류 외 신규 오류 없음(rename WO 와 동일 상태).
- **정적 확인:** KPA 신청 흐름 유지 · PRIVATE='공급 승인 대상' 유지 · 판매자 모집/ B2C 문구 재혼입 없음 · 신청=ProductApproval(PENDING) 유지 · 주문/cart/checkout 미혼입 · GP/KCos 회귀 없음 · backend/DB/migration 무변경.
- **산출물:** 본 CHECK 문서 1건만 신규 생성.

## 9. 완료 판정

**PASS** — fold-in 가능성 평가 완료. **판정 D(보류)**: KPA fuller tier 별도 유지, SupplyCatalogHub/KPA 코드 무변경. V2 fold-in 조건(§6) 명시. GP/KCos 무회귀, backend/DB 무변경.

## 10. 후속 작업

1. *(조건부)* `WO-O4O-STORE-HUB-SUPPLY-CATALOG-KPA-FOLD-IN-V2` — §6 opt-in props/slots(컬럼 확장·confirm 모드·accent·pagination) 설계 후 GP/KCos 무회귀 검증과 함께 KPA wrapper 전환.
2. `IR-O4O-PRODUCT-APPROVAL-TO-OPL-CROSSSERVICE-AUDIT-V1` — 승인 후 OPL 생성 경로 cross-service audit.
3. *(선택)* SupplyCatalogHub pagination 을 공통 `Pagination` 으로 통일할지 별도 평가(GP/KCos 회귀 검토 포함).
