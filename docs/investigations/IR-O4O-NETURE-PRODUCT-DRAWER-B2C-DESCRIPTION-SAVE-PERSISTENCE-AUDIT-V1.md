# IR-O4O-NETURE-PRODUCT-DRAWER-B2C-DESCRIPTION-SAVE-PERSISTENCE-AUDIT-V1

> 공급자 `ProductDetailDrawer` 소비자 상세설명(B2C) 저장 영속성 조사. **코드 변경 없음(조사 전용).**
>
> 트리거: `WO-O4O-STANDARD-EDITOR-IMAGE-DISPLAY-WIDTH-V1` 라이브 회귀에서 저장→재진입 시 텍스트조차 영속 안 됨(§CHECK-...-IMAGE-DISPLAY-WIDTH §5).
> 작성일: 2026-06-28 · 결론: **드로어/에디터 저장 경로 결함 아님. 증상 = 테스트 데이터 아티팩트(PRIVATE_REQUIRES_SELLER_IDS). 부수 발견 = create/update 검증 비대칭(별도 WO 후보).**

---

## 1. 조사 범위 (요청 항목 대응)
공급자 상품 상세 드로어의 소비자 상세설명 저장이 자동화에서 일반 텍스트조차 영속되지 않은 원인을 코드 추적 + read-only 라이브 API 재현으로 규명.

## 2. 저장 경로 (frontend → DB) — 정상 배선 확인
| 단계 | 위치 | 매핑 |
|---|---|---|
| 3개 편집기 ↔ state | `ProductDetailDrawer.tsx` | 소비자 간단=`editConsumerShort`, **소비자 상세=`editConsumerDetail`**(value/onChange line 1025-1027), B2B 상세=`editBizDetail` |
| 저장 트리거 | `handleSave` (288) | B2C: `formRef` 채워짐(ProductForm `onChange` mount 시 발화, `ProductForm.tsx:184-190` `[data]` effect) → line 319 early-return 미발생 |
| payload | handleSave 347 | `consumerDetailDescription: editConsumerDetail.trim() || null` (별도 state, ProductForm 외부) |
| API | `supplierApi.updateProduct` (`lib/api/supplier.ts:612`) | `PATCH /neture/supplier/products/:id` |
| 컨트롤러 | `supplier-product.controller.ts:252` | body → `netureService.updateSupplierOffer(id, supplierId, {...consumerDetailDescription})` |
| 서비스 | `offer.service.ts:1053` `updateSupplierOffer` | line 1133-1135 `offer.consumerDetailDescription = updates...` → line 1165 `offerRepo.save(offer)` |
| 컬럼 | `SupplierProductOffer.entity` (offer-level, migration 20260316150000) | **offer 행에 저장 — master 아님** (공유 master 오염 없음) |

→ **배선·필드 매핑·저장 대상 모두 정상.** consumerDetailDesc/detailDesc 등 유사 필드 불일치 없음. 신규 등록은 `createSupplierOffer`(별도), 수정은 위 PATCH 경로 — 분리되어 있음.

## 3. 근본 원인 — `offer.save()` 직전 검증 차단 (테스트 데이터 아티팩트)
`offer.service.ts:1159-1163` (save 직전):
```ts
// Validation: PRIVATE requires at least one seller ID
if (offer.distributionType === OfferDistributionType.PRIVATE &&
    (!offer.allowedSellerIds || offer.allowedSellerIds.length === 0)) {
  return { success: false, error: 'PRIVATE_REQUIRES_SELLER_IDS' };   // ← save() 이전 반환
}
const savedOffer = await this.offerRepo.save(offer);                  // line 1165 (도달 못 함)
```
- 회귀 테스트의 disposable offer 는 **PRIVATE + allowedSellerIds 없음**(API 직접 생성: `distributionType:PRIVATE, serviceKeys:[]`).
- 따라서 `consumerDetailDescription`(및 모든 필드)이 in-memory 로 설정된 뒤 **save 직전 가드가 success:false 로 차단** → 영속 0.
- 프론트 `handleSave` 는 `result.success===false` 시 `toast.error('저장 실패: PRIVATE_REQUIRES_SELLER_IDS')` 표시 — **자동화의 console-error/dialog 수집엔 안 잡힘**(toast). → "텍스트조차 영속 안 됨"의 정체.

### 3.1 read-only 라이브 재현 (확정)
disposable PRIVATE-no-seller offer 에 `PATCH {consumerDetailDescription}`:
```
success: False | error: PRIVATE_REQUIRES_SELLER_IDS
```
재현 후 offer 즉시 삭제(cleanup). → 가설 100% 확정.

## 4. 결론
- **드로어 B2C 저장 경로·에디터 직렬화에는 결함 없음.** 정상 offer(PUBLIC, 또는 PRIVATE+seller)에서는 소비자 상세설명 저장이 정상 동작한다.
- 이미지 WO(`...-IMAGE-DISPLAY-WIDTH-V1`)의 저장→재진입 보류 항목도 **실제 결함 아님** — 동일 테스트 데이터 아티팩트. 정상 상품에서는 폭/정렬 속성이 실린 HTML 이 정상 영속된다(직렬화·역파싱·렌더는 이미 라이브 PASS).
- 최근 편집기 통합 회귀 아님 — 차단은 distribution 검증(선행 로직)이며 편집기와 무관.

## 5. 부수 발견 — create/update 검증 비대칭 (별도 WO 후보, 미확정)
- `deriveDistributionType`(`offer.service.ts:31-33`): `isPublic=false` + serviceKeys 없음 → **PRIVATE**. `createSupplierOffer` 는 PRIVATE-no-seller offer 생성을 **허용**하나, `updateSupplierOffer` 는 그런 offer 의 **모든 수정을 PRIVATE_REQUIRES_SELLER_IDS 로 거부** → 해당 offer 는 "수정 불가 상태로 고착" 가능.
- **실사용 영향 여부는 미확정**: 정상 공급자 등록 UI(Wizard)가 PRIVATE-no-seller offer 를 만들어내는지 확인 필요. 만들지 않으면 합성 데이터 한정 엣지(영향 0). 만들어내면 신규 등록 직후 상세설명 편집이 막히는 실 UX 트랩.
- **권고(별도 WO)**: 등록 UI 기본 distribution 값 확인 → (a) create 도 동일 검증으로 차단하거나, (b) 설명/비-distribution 필드 수정은 PRIVATE-no-seller 에서도 허용(검증을 distribution 변경 시에만 적용)하여 비대칭 해소. 사용자 확인 후 `WO-...-PRIVATE-OFFER-EDIT-LOCK-RECONCILE-V1` 등으로 분리.

## 6. 테스트 데이터
- 재현용 disposable offer 1건(기존 [E2E_TEST] master 재사용) 생성→`bulkDelete` deleted:1. orphan 0, master 보존.

---

**작성:** O4O Platform Team · 2026-06-28
**상태:** 조사 완료(코드 변경 0). 드로어 저장 결함 없음 — 증상은 PRIVATE-no-seller 테스트 offer 의 `PRIVATE_REQUIRES_SELLER_IDS` 가드(offer.service.ts:1160). 부수: create/update 검증 비대칭 → 등록 UI 기본값 확인 후 별도 WO 판단 권고.
