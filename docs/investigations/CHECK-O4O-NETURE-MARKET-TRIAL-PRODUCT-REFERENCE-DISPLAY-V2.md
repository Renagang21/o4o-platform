# CHECK-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2

> 저장된 `MarketTrial.productId` → ProductMaster 요약을 펀딩 목록/상세/운영자 화면에 **additive 표시**.
>
> WO: `WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2`
> 선행: `SUPPLIER-PRODUCT-REFERENCE-V1`(저장) · IR `IR-O4O-NETURE-SUPPLIER-WORKSPACE-FULL-AUDIT-V1` §16
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료.

---

## 1. Summary

REFERENCE-V1에서 `MarketTrial.productId` 저장까지 끝났으나 화면 표시가 없던 공백을 닫는다. **migration 없음 · 가격/원본 복제 없음 · 생성/수정/참여/정산/주문 로직 무변경.** 표시 전용 enrich만 추가.

- 백엔드 DTO(`toTrialDTO`, `toOperatorTrialDTO`)에 `productId` + `product`(ProductMaster 요약) 추가.
- `product` = `{ id, name, regulatoryType, drugCategory, manufacturerName }` — **가격·재고 등 운영/원본 데이터 미포함**.
- batch 조회 헬퍼(`buildProductRefMap` / `buildOperatorProductRefMap`): Raw SQL + parameter binding(`id = ANY($1)`), 실패/부재 시 빈 map 으로 graceful degrade → 펀딩 목록/상세 자체는 깨지지 않음.
- 프론트: 공급자 목록 카드 칩 + 공급자 상세 "연결 제품" 섹션 + 운영자 상세 InfoRow.
- `productId` 없는 기존 펀딩: `product=null` → 표시 블록 자체가 렌더되지 않음(crash 0).

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/controllers/market-trial/marketTrialController.ts` | `TrialProductRef` + `buildProductRefMap` 헬퍼, `toTrialDTO`에 `productId`/`product`, `getMyTrials`/`getTrials`/`getTrialById`/`getSupplierTrialResults` enrich |
| `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts` | `buildOperatorProductRefMap` 헬퍼(순환 import 회피용 로컬), `toOperatorTrialDTO`에 `productId`/`product`, `listAll`/`getDetail` enrich |
| `services/web-neture/src/api/trial.ts` | `TrialProductRef` 타입 + `Trial.productId`/`Trial.product` |
| `services/web-neture/src/pages/supplier/SupplierTrialListPage.tsx` | 카드 연결 제품 칩 + 스타일 |
| `services/web-neture/src/pages/supplier/SupplierTrialDetailPage.tsx` | "연결 제품" 섹션 + 스타일 |
| `services/web-neture/src/pages/operator/MarketTrialApprovalDetailPage.tsx` | "연결 제품" InfoRow |
| `docs/investigations/CHECK-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2.md` | 본 문서 |

---

## 3. 표시 위치

```
공급자 펀딩 목록 (/supplier/market-trial)
  └ 카드: "연결 제품  {name}" 칩 (product 있을 때만)
공급자 펀딩 상세 (/supplier/market-trial/:id)
  └ 헤더 아래 "연결 제품" 섹션: name + 제조사/유형 + 기준 안내
운영자 펀딩 상세 (/operator … MarketTrialApprovalDetailPage)
  └ Trial Info: "연결 제품" InfoRow (name + 제조사)
```

---

## 4. 안전성 (degrade 경로)

| 상황 | 동작 |
|---|---|
| `productId` 없는 기존 펀딩 | `product=null` → 표시 블록 미렌더, crash 없음 |
| productId 가 가리키는 ProductMaster 삭제/부재 | map 에 없음 → `product=null`, 표시만 누락 |
| `product_masters` 조회 자체 실패 | helper try/catch → 빈 map, **펀딩 목록/상세 200 유지** |
| dataSource null (초기화 전) | helper 즉시 빈 map |

---

## 5. Verification Results

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` | ✅ 0 errors (exit 0) |
| web-neture `tsc --noEmit` | ✅ 0 errors (exit 0) |
| productId 있는 펀딩 — 목록/상세/운영자 표시 | ✅ (정적: product enrich 경로) |
| productId 없는 기존 펀딩 crash | ✅ 없음 (null 가드) |
| 생성/목록/상세/참여/정산 기존 동작 영향 | ✅ 없음 (additive only) |

---

## 6. What Was Not Changed

- ✅ migration 없음 (`productId` 컬럼은 REFERENCE-V1에서 이미 존재)
- ✅ 펀딩 생성/수정/제출/참여/정산/주문/이행 로직 무변경
- ✅ 가격·재고·원본 상품 정보 복제 없음 (name/유형/제조사 표시 요약만)
- ✅ MarketTrial 엔티티/스키마 무변경
- ✅ ProductMaster(SSOT)·SPO·이벤트 오퍼 무변경
- ✅ Boundary: Raw SQL parameter binding 준수, cross-domain JOIN 없음 (단일 `product_masters` 표시 조회)

---

## 7. Follow-ups (IR §16)

| WO | 범위 |
|---|---|
| WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-PARSE-V2 | 유형 header 검증·혼합 방지·처방 가드·미리보기 |
| WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1 / SHIPPING-SETTING-FOUNDATION-V1 | 후속 |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 펀딩 제품 참조 "저장 + 표시" 완성. 다음: BULK-UPLOAD-PARSE-V2.
