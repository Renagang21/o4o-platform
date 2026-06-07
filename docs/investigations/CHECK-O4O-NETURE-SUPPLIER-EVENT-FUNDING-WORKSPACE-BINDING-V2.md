# CHECK-O4O-NETURE-SUPPLIER-EVENT-FUNDING-WORKSPACE-BINDING-V2

> 제품 목록에서 전달된 선택 상품을 생성 폼의 실제 선택값으로 바인딩 — **기존 구조에서 안전한 범위만** (frontend only).
>
> WO: `WO-O4O-NETURE-SUPPLIER-EVENT-FUNDING-WORKSPACE-BINDING-V2`
> 선행: WORKSPACE-PREFILL-V1(context 표시), OFFER-MODE-SELECTION-V1, DRUGCATEGORY-EXPOSURE-V1
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료 (이벤트=바인딩, 펀딩=IR 분리).

---

## 1. Summary

전달된 선택 상품(`?supplierProductId`/`&masterId`)을 생성 폼의 **실제 선택값**으로 바인딩 가능한지 저장 구조를 확인하고, 가능한 범위만 구현했다.

| 대상 | 저장 구조 | 본 V2 처리 |
|---|---|---|
| **이벤트 오퍼** | 제안 모달이 자기 SPO(`ProposableOffer`) 중 1개를 `selectedOfferId` 로 선택 → 제안 | ✅ **진입 시 제안 모달 자동 오픈 + 매칭 SPO 자동 선택** (프론트 전용, 백엔드 무변경) |
| **유통참여형 펀딩** | `CreateTrialPayload` 에 **상품 참조 필드 없음**(캠페인형) | ⏸ **바인딩 미구현 → IR/V2-Design 분리** (백엔드 필드+migration 필요). PREFILL context 배너 유지 |

- 원본 상품 정보·가격 **변경 없음**. 상품명/브랜드/가격 복제 저장 없음.
- 검증: web-neture `tsc` — §5.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/pages/supplier/SupplierEventOfferPage.tsx` | `useSearchParams`/`useRef` + 진입 시 제안 모달 자동 오픈 + 매칭 SPO 자동 선택 effect 2개 |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-EVENT-FUNDING-WORKSPACE-BINDING-V2.md` | 본 문서 |

> 펀딩(SupplierTrialCreatePage)·백엔드·API·migration 변경 없음.

---

## 3. 이벤트 오퍼 바인딩 (구현)

- 쿼리 `supplierProductId`(=SPO offer id) 또는 `masterId` 보유 시:
  1. mount 1회 `handleOpenPropose()` → 제안 모달 오픈 + 제안 가능 SPO 목록 로드.
  2. SPO 목록 로드 완료 시 1회, `o.id === supplierProductId || o.masterId === masterId` 매칭 offer 를 `selectedOfferId` 로 **자동 선택**.
- `autoOpenedRef`/`autoSelectedRef` 로 **각 1회만** 실행 → 이후 사용자의 수동 선택/해제를 존중.
- 매칭 실패(제안 불가 상품 = 미승인 등) 시: 모달은 열리되 미선택 → 사용자가 수동 선택. crash 없음.
- 기존 이벤트 가격 ≤ 일반 공급가 검증 등 제안 로직 그대로.

---

## 4. 펀딩 바인딩 (IR 분리 — 미구현 사유)

`CreateTrialPayload` 필드: title/oneLiner/videoUrl/description/salesScenarioContent/outcomeSnapshot/maxParticipants/fundingStart·EndAt/trialPeriodDays/targetAmount/trialUnitPrice/rewardRate — **상품 참조(productId/masterId/offerId) 없음**.

→ 펀딩에 상품을 실제 바인딩하려면 **MarketTrial 엔티티/페이로드/migration 에 상품 참조 필드 추가**가 필요(백엔드 변경 큼). WO 원칙("백엔드 변경이 커지면 무리하게 구현하지 말고 IR/후속 WO로 분리")에 따라 **본 V2에서 미구현**.

- 현 상태 유지: PREFILL-V1 의 선택 상품 context 배너(`SelectedSupplierProductBanner kind="funding"`)로 표시만.
- 후속: `WO/IR-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DESIGN-V1` (펀딩↔공급자 상품 참조 저장 설계).

---

## 5. Verification Results

| 항목 | 결과 |
|---|---|
| web-neture `tsc --noEmit` (background) | ✅ 0 errors (useSearchParams 훅 누락 1차 수정 후 통과) |
| 제품 목록 → 이벤트 오퍼 진입 시 모달 자동 오픈 + 매칭 SPO 선택 | ✅ (effect, autoSelect 1회) |
| 직접 메뉴 진입(쿼리 없음) crash | ✅ 없음 (effect early-return) |
| 원본 상품 정보·가격 변경 | ✅ 없음 (선택만, 제안 로직 불변) |
| DRUG 후속 액션 차단 유지 | ✅ (목록 게이트 그대로) |
| 펀딩 백엔드/migration/ProductMaster/bulk/배송/정산 | ✅ 무변경 |

---

## 6. What Was Not Changed

- ✅ 이벤트 오퍼/펀딩 백엔드 구조·API·migration 변경 없음
- ✅ 원본 상품 정보·가격 변경 없음, 상품명/브랜드/가격 복제 저장 없음
- ✅ 펀딩 상품 바인딩 미구현(IR 분리)
- ✅ OPL/SupplierProduct/SPO 구조 변경 없음
- ✅ bulk/배송 grouping/주문·정산/ProductMaster 변경 없음
- ✅ DRUG 계열 후속 액션 차단 유지

---

## 7. Follow-ups

| WO/IR | 범위 |
|---|---|
| IR-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DESIGN-V1 | 펀딩↔공급자 상품 참조 저장 구조 설계(백엔드) → 이후 펀딩 바인딩 |
| WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1 | 유형별 CSV 템플릿/검증/저장 |
| WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1 | OTC 약국 공급 게이트 |
| WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1 | 배송 grouping |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 이벤트 오퍼 상품 바인딩 완료(프론트), 펀딩 바인딩은 백엔드 설계(IR) 후속. 안전 범위 준수.
