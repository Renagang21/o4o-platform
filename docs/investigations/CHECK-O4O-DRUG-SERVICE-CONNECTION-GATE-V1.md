# CHECK-O4O-DRUG-SERVICE-CONNECTION-GATE-V1

> **작업명:** WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1
> **유형:** gate 적용 — 규제 상품(의약품 등)의 서비스 연결을 DB 정책(`service_audience_policies`)으로 검증. 기존 하드코딩 → DB helper 교체. DB/migration/admin UI **무변경**.
> **결과: PASS — `offer.service.ts` 의 하드코딩 `PHARMACY_ALLOWED_SERVICE_KEYS` 제거, `ServiceAudienceService.getPharmacyAudienceResolver()`(DB SSOT) 참조로 교체. createSupplierOffer(등록 차단) + submitForApproval(방어적 재확인) 양쪽 적용. 규제 상품→비약국 서비스 차단. 비규제 상품 무영향. seed 값=기존 상수 → 동작 동일·admin 가변. 기존 품목군 gate 유지. api-server typecheck 0 · web-neture build ✓.**
> 선행: `fc6529a1f`(약국 대상 서비스 정책 DB+admin) · `15318e471`(품목군 gate) — 2026-06-15

---

## 1. 기존 하드코딩 상수 조사 결과

- 위치: `offer.service.ts:67` `const PHARMACY_ALLOWED_SERVICE_KEYS = ['glycopharm','kpa-society']`.
- **주석(61-65)이 명시**: "admin 운영자가 약국 전용 서비스를 지정하는 설정 소스가 아직 없음 … 추후 admin 설정 소스가 도입되면 이 상수 대신 그것을 우선 사용." → 본 WO 가 정확히 그 후속.
- 사용처: `assertPharmacyOnlyServiceKeys(isRegulated, serviceKeys)`(105-116) **단 1 함수**, 호출은 `createSupplierOffer:816` **단 1곳**.
- → DB helper 로 **순수 교체 가능**. seed 값(kpa-society/glycopharm=true)이 상수와 동일하므로 day-1 동작 동일, 회귀 0.

## 2. 적용 endpoint/service 조사 결과

| 흐름 | serviceKey 결정 | gate 적용 |
|------|----------------|:---------:|
| `createSupplierOffer` | `data.serviceKeys` (등록 시 확정) | ✅ 기존 차단점 — 데이터 소스 교체 |
| `submitForApproval` | offer 저장된 `service_keys`(immutable) | ✅ 방어적 재확인 추가 |
| `updateSupplierOffer` | serviceKeys 미수정(immutable) | ❌ 제외(변경 불가) |
| B2B 등록 / 판매자 모집 | serviceKey 연결 없음(텍스트/파트너 매칭) | ❌ 해당 없음 |

- serviceKeys 는 생성 시 확정·이후 불변 → **createSupplierOffer 가 1차 차단점**. submitForApproval 은 수동 DB 변경 대비 방어적.

## 3. 의약품(규제 상품) 여부 판단 기준

- 기존 트리거 `isRegulated`(`ProductCategory.is_regulated`) **그대로 사용** — 의약품은 규제 상품의 부분집합이라 커버됨. 신규 필드/판단 함수 없음.
- 트리거를 'DRUG 한정'으로 좁히지 않음(기존 "규제 상품→약국 전용" 동작 보존, 회귀 0). createSupplierOffer 는 `metadata.data.isRegulated`, submitForApproval 은 `product_categories.is_regulated` JOIN 으로 도달.

## 4. service audience helper 사용 방식

- 신규 `ServiceAudienceService.getPharmacyAudienceResolver()` — 전 정책 1회 조회 → 동기 resolver `(serviceKey) => boolean`. row 부재 serviceKey 는 레거시 기본값(`['glycopharm','kpa-society']`) fallback.
- `assertPharmacyOnlyServiceKeys(isPharmacyAudience, isRegulated, serviceKeys)` 로 시그니처 변경(상수 → resolver 주입). 로직(규제 && 위반 serviceKey 존재 → 거부) 동일.

## 5. 차단 reason code / 문구

- **createSupplierOffer**: 기존 `OfferErrorCode.REGULATED_PRODUCT_NON_PHARMACY_SERVICE` 반환 + message "규제 상품은 약국 전용 서비스에만 연결할 수 있습니다." (보존).
- **submitForApproval**: `result.skipped` 에 `DRUG_SERVICE_NOT_PHARMACY_AUDIENCE` push(품목군 gate 통과 후, eligibleKeys 확정 후 검사).
- **frontend(SupplierProductsPage 승인요청 toast)**: `DRUG_SERVICE_NOT_PHARMACY_AUDIENCE` 집계 → "N건은 의약품이 약국 대상 서비스가 아닌 서비스에 연결되어 있습니다. 의약품은 약국 대상 서비스에만 등록할 수 있습니다." 부분 성공 시 "N건 약국 대상 서비스 아님" 표기.

## 6. frontend 영향

- createSupplierOffer 실패는 기존 `SupplierProductCreatePage` submitError 경로로 message 표시(추가 변경 불요).
- submitForApproval 은 `SupplierProductsPage` toast 에 reason 1줄 추가(품목군 gate 안내와 동일 패턴). **화면 구조 변경 없음.**

## 7. 기존 품목군 gate와의 관계 / 순서

- 두 gate 역할 상이: 품목군 gate(공급자가 이 품목군 등록 가능?) vs 서비스 gate(이 의약품이 연결될 서비스가 약국 대상?). **둘 다 통과 필요.**
- submitForApproval 순서: ① 품목군 approved gate → ② eligibleKeys 확정 → ③ **의약품 service audience gate** → ④ createPendingApprovals. (품목군 차단이 우선 — 더 근본적 차단.)

## 8. 제외 범위 (WO 준수)

`service_audience_policies` 테이블/admin UI 변경 / B2B·판매자모집·서비스등록 신규 기능 / 가격 / OrganizationProductListing 정책 / Product·Offer·Approval 구조 / 이벤트 오퍼·펀딩 / migration / updateSupplierOffer(serviceKeys 불변). **모두 미수행.** migration 0(선행 DB 사용).

## 9. 검증 결과

- **api-server:** `tsc --noEmit` **0 errors** ✅
- **web-neture:** `build ✓ (~12s)` ✅
- **정적:** `PHARMACY_ALLOWED_SERVICE_KEYS` 상수 본체 제거(grep 잔존=주석만). resolver fallback=기존 상수 → seed 일치 시 동작 동일. 품목군 gate·serviceKey 필터·createPendingApprovals 불변.
- **gate 매트릭스(설계상):** 의약품+kpa-society/glycopharm=통과 · 의약품+k-cosmetics/neture=차단 · 비의약품(비규제)=무영향 · admin 에서 정책 변경 시 resolver 결과 즉시 반영(매 호출 DB 조회).
- **browser/DB smoke:** 미수행 — dev·인증 guard. **배포 후 권장:** 의약품 offer 를 비약국 서비스로 생성/승인요청 시 차단 + toast, 약국 서비스는 통과, admin 토글 변경 반영, 기존 품목군 gate 유지.

## 10. 변경 파일 (4)

| 파일 | 변경 |
|------|------|
| `.../neture/services/service-audience.service.ts` | `getPharmacyAudienceResolver()` 추가 |
| `.../neture/services/offer.service.ts` | 상수 제거 · `assertPharmacyOnlyServiceKeys` resolver 주입 · createSupplierOffer DB 참조 · submitForApproval 방어 gate(+`is_regulated` JOIN) |
| `web-neture/src/pages/supplier/SupplierProductsPage.tsx` | 승인요청 toast 에 `DRUG_SERVICE_NOT_PHARMACY_AUDIENCE` 안내 |
| `docs/investigations/CHECK-...-V1.md` | 본 문서 |

## 11. 완료 판정 / 후속

**PASS.** 하드코딩 → DB 정책(`service_audience_policies`) 참조 교체. 규제 상품(의약품)의 비약국 서비스 연결을 등록·승인요청 양쪽에서 차단. 비규제 무영향, 품목군 gate 유지, DB/admin/migration 무변경.

**커밋:** path-specific 4파일 · `<commit>`.
**차기 WO:** 서비스 등록 유형(운영자승인/B2B/판매자모집) → 이벤트 오퍼 lifecycle → 유통참여형 펀딩 lifecycle.

---

*Date: 2026-06-15 · gate 적용 PASS · 규제 상품 서비스 연결을 DB 정책(service_audience_policies)으로 검증. 하드코딩 PHARMACY_ALLOWED_SERVICE_KEYS 제거→getPharmacyAudienceResolver 교체. createSupplierOffer+submitForApproval 적용, reason DRUG_SERVICE_NOT_PHARMACY_AUDIENCE. 비규제 무영향·품목군 gate 유지·DB/migration 무변경. typecheck 0·build ✓. 배포 후 smoke 권장.*
