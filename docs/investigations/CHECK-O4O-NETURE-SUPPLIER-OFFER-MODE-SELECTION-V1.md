# CHECK-O4O-NETURE-SUPPLIER-OFFER-MODE-SELECTION-V1

> 제품 목록에서 등록된 제품을 후속 공급활동(공급오퍼/모집/이벤트/펀딩)으로 연결하는 액션을 유형별로 분기 (frontend only).
>
> WO: `WO-O4O-NETURE-SUPPLIER-OFFER-MODE-SELECTION-V1`
> 선행: REGISTRATION-IA-V1(진입 IA), WIZARD-V2(등록 wizard 유형 분기)
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료.

---

## 1. Summary

제품 목록(`SupplierProductsPage`)에 **후속 작업 컬럼**을 추가해, 등록된 제품을 일반 공급 오퍼·판매자 모집·이벤트 오퍼·유통참여형 펀딩으로 연결하는 진입을 제공한다. 제품 유형(regulatoryType)에 따라 가능한 액션만 노출한다.

- 제품 등록과 공급활동 생성을 분리(등록 화면엔 추가 안 함, 목록에서 연결).
- **DRUG(의약품: 비처방·처방) → "운영자 검토 대상"** 표시(후속 공급활동 미제공).
- 그 외(비의약품/의약외품/기타) → 활용 선택 드롭다운(공급오퍼/이벤트/펀딩 active, 판매자 모집 준비 중 비활성).
- frontend only. 이벤트/펀딩 백엔드·bulk·배송·ProductMaster 무변경. 데드링크 0.
- 검증: web-neture `tsc` (background) — §6.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/lib/supplierProductTypes.ts` | `SupplierOfferAction` + `SUPPLIER_OFFER_ACTION_META` + `getAllowedOfferActions(regulatoryType)` helper 추가 |
| `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` | `offerActionsCol`(후속 작업 컬럼) 추가 + 컬럼 조립 삽입 + navigate 연결 |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-OFFER-MODE-SELECTION-V1.md` | 본 문서 |

---

## 3. 유형별 액션 게이트

`getAllowedOfferActions(regulatoryType)`:

| regulatoryType | restricted | 노출 |
|---|---|---|
| `DRUG` (비처방·처방) | ✅ | "운영자 검토 대상" 라벨 (후속 공급활동 없음) |
| `QUASI_DRUG`/`GENERAL`/`COSMETIC`/`HEALTH_FUNCTIONAL`/`MEDICAL_DEVICE`/빈값 | — | 활용 드롭다운: 일반 공급 오퍼 · 판매자 모집(준비중·비활성) · 이벤트 오퍼 · 유통참여형 펀딩 후보 |

액션 경로(`SUPPLIER_OFFER_ACTION_META`):
- 일반 공급 오퍼 → `/supplier/supply-offers` (ready)
- 판매자 모집 → 준비 중 (ready=false, `<option disabled>`)
- 이벤트 오퍼 → `/supplier/event-offers` (ready)
- 유통참여형 펀딩 후보 → `/supplier/market-trial/new` (ready)

> 처방의약품은 일반 판매·노출·이벤트·펀딩으로 **자동 연결하지 않음** — DRUG 일괄 검토 중심 처리로 충족.

---

## 4. 데이터 한계 (정직 기록)

목록 응답(`SupplierProduct`)에 `regulatoryType` 은 있으나 **`drugCategory` 가 없음**. 따라서 목록 단에서는:
- otc(비처방) vs rx(처방) 세분 게이트 불가 → **DRUG 전체를 검토 중심으로 안전 처리**(둘 다 제한이라 WO 의도와 일치).
- 미분류(unclassified) 는 GENERAL 과 구별 불가 → 빈/GENERAL 은 비의약품으로 간주(전체 액션).

세분 게이트(otc 약국 공급 허용 / 미분류 별도 제한)는 목록 응답에 drugCategory 노출 후 후속 WO.

---

## 5. UX

- 후속 작업 컬럼: 행 클릭(상세 drawer)과 분리되도록 select `onClick stopPropagation`.
- 비활성(준비 중) 항목은 `<option disabled>` + ready 가드(no-op) — 죽은 링크/동작 없음.
- 등록 wizard·진입 IA(Phase1/V2)와 동일한 활용 경로 재사용 → 흐름 일관.

---

## 6. Verification Results

| 항목 | 결과 |
|---|---|
| web-neture `tsc --noEmit` (background) | ✅ 0 errors |
| 유형별 action 분기 (DRUG restricted / 그외 full) | ✅ |
| 죽은 링크 | ✅ 0 (준비 중=disabled, 나머지 실제 라우트) |
| 기존 목록 기능(인라인 편집/필터/배치) 영향 | ✅ 없음 (컬럼 additive) |
| Phase1/WIZARD-V2 흐름 충돌 | ✅ 없음 |

---

## 7. What Was Not Changed

- ✅ 이벤트 오퍼 생성 wizard / 유통참여형 펀딩 생성 wizard 개편 없음 (기존 진입으로 navigate 만)
- ✅ bulk 업로드 파서 없음
- ✅ 배송비/무료배송 grouping 없음
- ✅ Drug Extension 상세 입력 저장 없음
- ✅ ProductMaster/SupplierProductOffer/OPL 구조 변경 없음
- ✅ 이벤트오퍼/펀딩 백엔드 변경 없음
- ✅ 제품 등록 화면에 공급활동 생성 추가 없음

---

## 8. Follow-ups

| WO | 범위 |
|---|---|
| (응답 보강) SupplierProduct 목록에 drugCategory 노출 | otc 약국 공급 허용 / 미분류 별도 제한 세분 게이트 |
| WO-O4O-NETURE-SUPPLIER-EVENT-OFFER-WORKSPACE / DISTRIBUTION-FUNDING-WORKSPACE | 제품 선택→이벤트/펀딩 생성에 원본 제품 prefill 연결 |
| WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1 | 유형별 CSV 템플릿/검증/저장 |
| WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1 | 배송 grouping |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 제품 목록 후속 활용 액션 분기 완료. 공급자 1차 업무 루프(등록 → 활용 방식 선택) 형성.
