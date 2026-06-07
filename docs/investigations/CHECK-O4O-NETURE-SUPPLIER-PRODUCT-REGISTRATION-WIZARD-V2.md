# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-WIZARD-V2

> create wizard 내부를 제품 유형별 UX(안내/경고 + 완료 후 다음작업)로 분기 (frontend only).
>
> WO: `WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-WIZARD-V2`
> 선행: `WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1` (Phase 1 진입 IA)
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료.

---

## 1. Summary

Phase 1 에서 잡은 유형-우선 진입(`/supplier/products/register`)에 이어, 실제 create wizard 내부를 제품 유형에 따라:
- **상단 유형별 안내/경고 카드** 표시
- **등록 완료 후 유형별 "다음 작업" 패널** 표시 (auto-navigate → 성공 패널 전환)
로 분기했다. 저장 로직은 변경하지 않았다.

- **단일 파일 변경**(SupplierProductCreatePage) + CHECK. 백엔드/저장/필드구조/펀딩·이벤트 백엔드 무변경.
- 처방의약품: lot/expiry/serial 입력 없음(애초 미존재) + 자동 연결 제외 경고.
- 검증: web-neture `tsc` (background) — §6.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` | 유형 컨텍스트 도출(`getSupplierProductType`) + 상단 유형 안내/경고 카드 + 등록 완료(`registered`) 시 유형별 다음작업 패널(기존 auto-navigate 대체) |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-WIZARD-V2.md` | 본 문서 |

> 공유 상수 `lib/supplierProductTypes.ts`(Phase 1) 재사용. 신규 entity/route/menu 없음.

---

## 3. 유형 컨텍스트 도출

- `productType = getSupplierProductType(searchParams.get('productType'))` — 진입 페이지가 넘긴 `?productType=` 기반.
- `isReviewOriented = productType.pharmacyTarget || key==='unclassified'` — 의약품류(약국 대상)·미분류는 검토 중심(자동 공급오퍼/이벤트/펀딩 연결 제외).

---

## 4. 유형별 안내/경고 카드 (wizard 상단)

| 유형 | 문구 요지 | 스타일 |
|---|---|---|
| 비의약품 | 일반 매장·약국 매장에 공급 가능한 일반 제품 | 중립 |
| 의약외품 | 품목/신고 정보 입력 권장 | 중립 |
| 비처방 의약품(OTC) | 약국 중심 검토, 일반 노출·온라인 판매 제한될 수 있음 | blue(검토) |
| 처방의약품(Rx) | 일반판매·고객노출·이벤트·펀딩 **자동 연결 안 됨**, 운영자 검토 후 약국 대상 유통 정보 단위만 | amber(경고) |
| 미분류 | 등록 후 운영자 검토로 유형 확정 | blue(검토) |

- 약국 대상(otc/rx)에는 "O4O는 유통 정보화 — 재고·유효기간·일련번호·이력추적 입력받지 않음" 명시.

---

## 5. 완료 후 다음 작업 (유형별)

등록 성공 시 `/supplier/products` 로 즉시 이동하던 것을 **성공 패널**로 전환:

| 구분 | 다음 작업 버튼 |
|---|---|
| 비의약품/의약외품(검토 비대상) | 제품 목록 · 다른 제품 등록 · **일반 공급 오퍼**(/supplier/supply-offers) · **이벤트 오퍼**(/supplier/event-offers) · **유통참여형 펀딩**(/supplier/market-trial/new) |
| 비처방/처방/미분류(검토 중심) | 제품 목록 · 다른 제품 등록 · **운영자 검토 상태 확인**(/supplier/products) |

- 처방의약품 성공 패널에 "자동 연결 안 됨 + 약국 대상 유통 정보 단위" 재안내.
- 모든 버튼 실제 라우트 — 데드링크 0.

---

## 6. Verification Results

| 항목 | 결과 |
|---|---|
| web-neture `tsc --noEmit` (background) | ✅ 0 errors |
| 저장 로직(handleSubmit createProduct) 변경 | ✅ 없음 (성공 후 navigate→setRegistered 만 교체) |
| 필드 구조 변경 / lot·expiry·serial 추가 | ✅ 없음 |
| 기존 IA(Phase 1) 메뉴/라우트 충돌 | ✅ 없음 (재사용) |
| 데드링크 | ✅ 0 |

---

## 7. What Was Not Changed

- ✅ bulk 업로드 파서 / CSV 저장 로직 변경 없음
- ✅ 배송비/무료배송 grouping 없음
- ✅ 이벤트 오퍼 / 유통참여형 펀딩 백엔드 변경 없음
- ✅ ProductMaster 대규모 구조 변경 없음
- ✅ 처방의약품 lot/expiry/serial 관리 없음
- ✅ create 저장 로직(createProduct 호출) 무변경
- ✅ 입력 필드 set 재구성 없음 (안내/경고/완료-액션 분기만)

---

## 8. Follow-ups

| WO | 범위 |
|---|---|
| WO-O4O-NETURE-SUPPLIER-OFFER-MODE-SELECTION-V1 | 제품 목록 row action → 일반 공급/이벤트/펀딩/판매자 모집 연결 |
| WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1 | 유형별 CSV 템플릿·검증·저장 |
| WO-O4O-NETURE-SUPPLIER-EVENT-OFFER-WORKSPACE / DISTRIBUTION-FUNDING-WORKSPACE | 제품 선택 기반 생성 흐름 |
| WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1 | 배송 grouping |

> 후속 심화: 유형별 **입력 필드 분기**(성분/함량/제형 등 OTC 전용 입력)는 Drug Extension(이미 영속 계층 존재) 저장과 함께 별도 WO 로. 본 V2 는 안내/경고/완료-액션 분기까지.

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** create wizard 유형별 UX 분기 완료. 다음: 제품 목록 row action(OFFER-MODE-SELECTION).
