# CHECK-O4O-NETURE-MARKET-TRIAL-SUPPLIER-PRODUCT-REFERENCE-V1

> 유통참여형 펀딩 생성 시 선택 공급자 상품(ProductMaster)을 기존 `MarketTrial.productId` 에 저장 — payload 통로 연결 (migration 0).
>
> WO: `WO-O4O-NETURE-MARKET-TRIAL-SUPPLIER-PRODUCT-REFERENCE-V1`
> 선행 IR: `IR-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DESIGN-V1` (후보 A 권장)
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료.

---

## 1. Summary

IR 권장(후보 A)대로, **이미 존재하는 nullable `MarketTrial.productId`(→ ProductMaster)** 를 재사용해, 제품 목록에서 펀딩 생성 진입 시 query `masterId` 를 생성 payload `productId` 로 저장되게 4계층 통로를 연결했다.

- **신규 컬럼/DB migration/enum 없음.** payload→controller→dto→`repo.create` additive wiring + entity 주석 정정만.
- 원본 상품 정보·가격 **미복제·미변경**(펀딩은 자기 trialUnitPrice/targetAmount 사용).
- 직접 메뉴 진입/수정 모드는 `productId` 미전달(기존 동작 유지).
- 검증: api-server `tsc` 0 errors / web-neture `tsc` — §5.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `packages/market-trial/src/entities/MarketTrial.entity.ts` | `productId` 주석 `@deprecated` → "soft reference(optional)" 정정 (구조 불변) |
| `packages/market-trial/src/services/MarketTrialService.ts` | `CreateTrialDto.productId?` + `createTrial` `repo.create({ productId })` |
| `apps/api-server/src/controllers/market-trial/marketTrialController.ts` | `createTrial` 에서 `req.body.productId` 수용 → service 전달 |
| `services/web-neture/src/api/trial.ts` | `CreateTrialPayload.productId?` 추가 |
| `services/web-neture/src/pages/supplier/SupplierTrialCreatePage.tsx` | `useSearchParams` + 생성 모드에서 query `masterId` → payload.productId |
| `docs/investigations/CHECK-O4O-NETURE-MARKET-TRIAL-SUPPLIER-PRODUCT-REFERENCE-V1.md` | 본 문서 |

> **migration 없음** — 컬럼(`market_trials.product_id`) 기존 존재.

---

## 3. 바인딩 통로

```
제품 목록(OFFER-MODE) → /supplier/market-trial/new?...&masterId=<ProductMaster id>
  → SupplierTrialCreatePage: payload.productId = searchParams.masterId (생성 모드만)
  → createTrial(payload) → POST /api/market-trial { ..., productId }
  → marketTrialController.createTrial: req.body.productId → service
  → MarketTrialService.createTrial(dto.productId) → repo.create({ productId })
  → MarketTrial.productId (= ProductMaster id) 저장
```

- `masterId` = 공급자 제품 목록 행의 ProductMaster id (DRUGCATEGORY-EXPOSURE/OFFER-MODE 와 동일 출처).
- 수정 모드(`mode==='edit'`) 또는 직접 메뉴 진입(masterId 없음) → `productId` undefined (기존과 동일).

---

## 4. 원본 불변 / 정책

- 원본 상품명·브랜드·설명·가격 **복제 저장 없음** — `productId` 참조만.
- 원본 공급가 **변경 없음** — 펀딩 가격/목표는 MarketTrial 자체 필드(trialUnitPrice/targetAmount).
- `outcomeSnapshot`(결과 약속)은 그대로 — productId 는 FK 강결합/필수 아님(nullable soft 참조).
- DRUG 게이트: 펀딩 진입 자체가 목록 OFFER-MODE 에서 DRUG 차단 → 의약품은 masterId 전달 경로에 오지 않음(정책 유지).

---

## 5. Verification Results

| 항목 | 결과 |
|---|---|
| `@o4o/market-trial` dist 재빌드 (CreateTrialDto.productId 반영) | ✅ (stale dist → 재빌드, 알려진 패턴) |
| api-server `tsc --noEmit` (dist 재빌드 후) | ✅ 0 errors |
| web-neture `tsc --noEmit` (background) | ✅ 0 errors |
| migration / 신규 컬럼 / enum | ✅ 없음 |
| 직접 진입(masterId 없음) crash | ✅ 없음 (productId undefined) |
| 수정 모드 productId 미전달 | ✅ (mode==='edit' guard) |
| 원본 상품 정보·가격 변경/복제 | ✅ 없음 |
| 이벤트/SPO/OPL/주문/정산/배송 영향 | ✅ 없음 |

> 실제 저장(`market_trials.product_id`) 확인은 배포 후 생성 1건 → row 조회로 검증(현 prod 데이터 disposable).

---

## 6. What Was Not Changed

- ✅ DB migration / MarketTrial 신규 컬럼 없음
- ✅ ProductMaster / SupplierProduct / SPO / OPL / StoreProductProfile 구조 변경 없음
- ✅ 이벤트 오퍼 / 주문 / 배송 / 정산 변경 없음
- ✅ bulk / OTC gate 없음, DRUG 후속 액션 활성화 없음
- ✅ 원본 상품 정보 snapshot 저장 / 원본 가격 변경 없음
- ✅ updateTrial 경로는 본 WO 범위 외(생성만) — 미변경

---

## 7. Follow-ups

| WO | 범위 |
|---|---|
| WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2 | 저장된 productId 를 목록/상세/운영자 화면에 표시(상품명 조인 등) |
| WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1 | 유형별 CSV 템플릿/검증/저장 |
| WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1 / SHIPPING-SETTING-FOUNDATION-V1 | 후속 |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 펀딩 ProductMaster 참조 저장 연결 완료(migration 0). 공급자 라인: 등록 → 활용 선택 → 이벤트 바인딩 + 펀딩 ProductMaster 참조 저장.
