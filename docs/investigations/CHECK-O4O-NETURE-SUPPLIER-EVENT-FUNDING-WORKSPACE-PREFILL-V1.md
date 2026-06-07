# CHECK-O4O-NETURE-SUPPLIER-EVENT-FUNDING-WORKSPACE-PREFILL-V1

> 제품 목록 후속 작업 → 이벤트 오퍼/유통참여형 펀딩 생성 화면을 **선택 상품 context 와 함께** 진입 연결 (frontend only).
>
> WO: `WO-O4O-NETURE-SUPPLIER-EVENT-FUNDING-WORKSPACE-PREFILL-V1`
> 선행: REGISTRATION-IA-V1 / WIZARD-V2 / OFFER-MODE-SELECTION-V1
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료.

---

## 1. Summary

제품 목록의 "후속 작업"에서 **이벤트 오퍼 / 유통참여형 펀딩** 선택 시, 선택한 공급자 상품 식별자(+이름/브랜드/가격/규제유형)를 query 로 전달해 기존 생성 화면에 **선택 상품 context 배너**와 함께 진입하도록 연결했다.

- 기존 화면·라우트·API 재사용. 새 생성 wizard/백엔드 없음.
- 원본 상품 정보/가격 **복제·변경 없음** (context 표시 전용).
- query 없이(메뉴 직접) 진입해도 배너 null 렌더 → crash/데드링크 없음.
- DRUG(의약품)은 이전 단계대로 후속 액션 미제공 유지.
- 검증: web-neture `tsc` (background) — §6.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/lib/supplierProductTypes.ts` | `OfferActionProductContext` + `buildOfferActionUrl(action, product)` — 선택 상품 query 빌더 |
| `services/web-neture/src/components/supplier/SelectedSupplierProductBanner.tsx` | 신규 — 선택 상품 context 배너(kind: event/funding), query 없으면 null |
| `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` | 후속 작업 select → `buildOfferActionUrl` 로 supplierProductId 등 query 전달 |
| `services/web-neture/src/pages/supplier/SupplierTrialCreatePage.tsx` | 배너 렌더(kind=funding) |
| `services/web-neture/src/pages/supplier/SupplierEventOfferPage.tsx` | 배너 렌더(kind=event) |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-EVENT-FUNDING-WORKSPACE-PREFILL-V1.md` | 본 문서 |

---

## 3. 라우트/진입 (현행 재사용)

| 액션 | 이동 경로 (기존 화면) |
|---|---|
| 이벤트 오퍼 | `/supplier/event-offers` (SupplierEventOfferPage — 제안 허브) + `?supplierProductId=…` |
| 유통참여형 펀딩 후보 | `/supplier/market-trial/new` (SupplierTrialCreatePage) + `?supplierProductId=…` |

> 새 `/new` 라우트를 만들지 않고 **기존 생성 진입을 재사용**(라우트 존중). query 파라미터: supplierProductId·masterId·name·brand·price·regulatoryType.

---

## 4. 선택 상품 context 배너

`SelectedSupplierProductBanner`(공유):
- query `supplierProductId` 없으면 **null**(메뉴 직접 진입 fallback — 기존 화면 그대로, crash 없음).
- 있으면 상품명/브랜드/기본 공급가/규제유형/상품ID(축약) + **kind별 안내**:
  - event: "기간·가격·수량 조건만 설정, 원본 정보·기본 공급가 변경 없음".
  - funding: "참여·목표 조건만 설정, 원본 정보·기본 공급가 변경 없음" + 펀딩 개념 한 줄 설명.

---

## 5. 원본 불변 보장

- 생성 화면에서 상품명/브랜드/제조사/기본가를 **복제 입력시키지 않음** (배너는 표시 전용).
- 원본 상품 가격 수정 UI 없음. 이벤트가/펀딩 조건은 각 화면의 기존 조건 입력으로만.
- 이벤트/펀딩 백엔드·SupplierOffer·ProductMaster 구조 무변경.

---

## 6. Verification Results

| 항목 | 결과 |
|---|---|
| web-neture `tsc --noEmit` (background) | ✅ 0 errors |
| 목록 → 이벤트/펀딩 액션 클릭 시 context query 동반 이동 | ✅ (buildOfferActionUrl) |
| 생성 화면 context 배너 표시 + 원본 불변 안내 | ✅ |
| query 없이 직접 진입 crash/데드링크 | ✅ 없음 (배너 null) |
| DRUG 후속 액션 미제공 유지 | ✅ (OFFER-MODE 게이트 그대로) |
| 대상 서비스에 Neture 미포함 (이벤트) | ✅ 기존 PROPOSE_TARGETS(kpa-society/glycopharm/k-cosmetics) 유지 — 변경 없음 |

---

## 7. What Was Not Changed

- ✅ 이벤트 오퍼 / 유통참여형 펀딩 백엔드 구조 재설계 없음
- ✅ ProductMaster / SupplierOffer 구조 변경 없음
- ✅ bulk 파서 / 배송 grouping / 주문·정산 구조 변경 없음
- ✅ 처방의약품 lot/expiry/serial 없음
- ✅ drugCategory 목록 응답 보강 없음 (DRUG 일괄 검토중심 유지)
- ✅ 판매자 모집 구현 없음 (준비 중 유지)
- ✅ 새 생성 wizard/라우트 없음 (기존 재사용 + query)

---

## 8. Follow-ups

| WO | 범위 |
|---|---|
| WO-O4O-NETURE-SUPPLIER-PRODUCT-LIST-DRUGCATEGORY-EXPOSURE-V1 | 목록에 drugCategory 노출 → otc/rx/미분류 세분 게이트 |
| WO-O4O-NETURE-SUPPLIER-EVENT-OFFER-WORKSPACE-V2 | 이벤트 생성 화면에서 전달 상품을 실제 SPO 자동 선택/바인딩 |
| WO-O4O-NETURE-SUPPLIER-DISTRIBUTION-FUNDING-WORKSPACE-V2 | 펀딩 생성에 상품 참조 필드 바인딩(백엔드 연계) |
| WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1 / SHIPPING-SETTING-FOUNDATION-V1 | 후속 |

> V1 은 context **표시/진입 연결**까지. 전달된 상품을 생성 폼에 실제 바인딩(SPO 자동 선택, 펀딩 상품 참조 저장)은 V2(백엔드 연계 동반).

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 제품 목록 → 이벤트/펀딩 생성 진입 prefill 연결 완료. 공급자 1차 업무 흐름(등록 → 활용 선택 → 생성 진입) 연결.
