# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1

> Neture 공급자 제품 등록 구조 1차 IA 정비 (frontend only).
>
> WO: `WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1`
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료 (운영 중 점진 개선 전제의 1차 실행 구조).

---

## 1. Summary

공급자 제품 등록을 **유형-우선 단계형**으로 정비하고, 메뉴 IA를 제품 관리 / 공급 오퍼 / 유통참여형 펀딩 / 이벤트 오퍼 / 주문·배송 / 설정으로 재구성했다. 유통참여형 펀딩·이벤트 오퍼는 제품 등록 흐름에서 분리(별도 메뉴)했다.

- **frontend only.** 백엔드/DB/migration/이벤트오퍼·펀딩 백엔드/배송 grouping/bulk 파서 변경 없음.
- 기존 페이지(create wizard, CSV import, 제품 목록, market-trial, event-offer) 최대한 재사용. 데드링크 0.
- 검증: web-neture `tsc --noEmit` (background 1회) — 결과 §8.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/lib/supplierProductTypes.ts` | 신규 — 제품 유형 공유 상수(비의약품/의약외품/비처방/처방/미분류 + regulatoryType·drugCategory 매핑) |
| `services/web-neture/src/pages/supplier/SupplierProductRegisterEntryPage.tsx` | 신규 — 제품 등록 진입(유형 선택 → 단일/대량 분기) |
| `services/web-neture/src/pages/supplier/SupplierBulkRegisterPage.tsx` | 신규 — 대량 등록 유형별 분기 landing(혼합 금지 안내 + 업로더 연결) |
| `services/web-neture/src/pages/supplier/SupplierSupplyOffersPage.tsx` | 신규 — 공급 오퍼 안내 허브(일반 공급/서비스별 상태/판매자 모집 준비중) |
| `services/web-neture/src/App.tsx` | lazy import 3 + route 3(`/supplier/products/register`·`/bulk`·`/supplier/supply-offers`) + create prefill 1줄 |
| `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` | `?regulatoryType=` 쿼리 prefill 1줄 (진입에서 선택한 유형 반영) |
| `services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx` | 사이드바 메뉴 IA 재구성 + 아이콘(Boxes/Tag/Settings) |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-IA-V1.md` | 본 문서 |

---

## 3. 메뉴 IA (재구성 후)

| 그룹 | 항목 → 라우트 |
|---|---|
| Overview | Dashboard → `/supplier/dashboard` |
| 제품 관리 | 제품 목록 `/supplier/products` · 제품 등록 `/supplier/products/register` · 대량 등록 `/supplier/products/bulk` · 상품 등록 도우미 `/supplier/products/import-assistant` · CSV Import `/supplier/csv-import` · B2B 콘텐츠 `/supplier/b2b-content` |
| 공급 오퍼 | 공급 오퍼 `/supplier/supply-offers` |
| 유통참여형 펀딩 | 펀딩 목록 `/supplier/market-trial` · 새 펀딩 개설 `/supplier/market-trial/new` |
| 이벤트 오퍼 | 이벤트 오퍼 `/supplier/event-offers` (기존 라우트 — 메뉴 노출 누락이었던 것 surface) |
| 주문·배송 | 주문 현황 `/supplier/orders` |
| Finance | Partner Commissions `/supplier/partner-commissions` (기존 유지) |
| 설정 | 공급자 정보 `/mypage/business-profile` |
| Community | Forum · 내 포럼 (기존 유지) |

> 모든 항목 실제 라우트 연결 — **데드링크 0**. Finance/Community 는 기존 실기능이라 유지(숨김 금지 정책 §13 정합).

---

## 4. 제품 등록 흐름 (1차)

```
제품 등록(/supplier/products/register)
  1) 제품 유형 선택: 비의약품 / 의약외품 / 비처방 의약품 / 처방의약품 / 미분류
  2) 등록 방식 선택: 하나씩 / 대량
     - 하나씩 → /supplier/products/new?regulatoryType=..&productType=..  (기존 create wizard, 유형 prefill)
     - 대량   → /supplier/products/bulk?productType=..                   (유형별 landing)
```

- 처방의약품 선택 시: "O4O 유통 정보화 범위만(재고·유효기간·일련번호 관리 아님) · 일반 공급오퍼/이벤트/펀딩 자동 연결 안 됨 · 운영자 검토" 경고 표시.
- 유형 → regulatoryType 매핑: 비의약품 GENERAL / 의약외품 QUASI_DRUG / 비처방·처방 DRUG / 미분류 '' (create 기본값). drugCategory(otc/rx) 는 운영자 검토(F4)에서 확정.

---

## 5. 대량 등록 (1차)

- 5개 유형 카드 분기 + **"한 파일에 여러 유형 섞지 말 것"** 경고 + 유형별 안내.
- 1차에서는 유형 전용 파서/저장 미구현 → 공통 CSV Import(`/supplier/csv-import`) + 상품 등록 도우미로 연결.
- 유형 전용 템플릿·검증은 후속(WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1).

---

## 6. 펀딩·이벤트 오퍼 분리

- 제품 등록 화면/흐름에 펀딩·이벤트 가격·배송 grouping을 넣지 않음.
- 펀딩·이벤트 오퍼는 별도 메뉴 + 별도 프로세스. "이미 등록된 제품 활용" 임을 진입/허브 페이지에 명시.
- 기존 이벤트 오퍼 직접 주문 구조·OPL 기반 구조 **무변경**.

---

## 7. What Was Not Changed

- ✅ 백엔드/DB/migration 변경 없음 (frontend only)
- ✅ 이벤트 오퍼·유통참여형 펀딩 백엔드 구조 변경 없음
- ✅ ProductMaster/SupplierProductOffer/OPL 구조 변경 없음
- ✅ 공급자별 배송비/무료배송 grouping 미구현 (후속)
- ✅ bulk 업로드 파서/저장 미구현 (후속)
- ✅ 처방의약품 lot/expiry/serial 필드 미요구
- ✅ 주문/정산 구조 변경 없음
- ✅ 기존 create wizard 내부 로직 변경 없음 (prefill 1줄만 additive)
- ✅ 데드링크/죽은 버튼 없음

---

## 8. Verification Results

| 항목 | 결과 |
|---|---|
| web-neture `tsc --noEmit` (background 1회) | ✅ 0 errors |
| 신규 페이지/상수 컴파일 | ✅ 0 errors |
| 라우트 등록 / 메뉴 항목 ↔ 실제 라우트 정합 | ✅ (수기 대조: 모든 메뉴 path 가 App.tsx route 또는 기존 라우트에 존재) |
| 변경 범위 = Neture supplier IA 한정 | ✅ |

> idle timeout 회피를 위해 전체 tsc 는 background 단일 실행. 실제 화면 동작은 배포 후 브라우저 smoke 권장(메뉴 그룹/유형 선택/대량 분기/공급오퍼 허브 렌더, 데드링크 0).

---

## 9. Follow-ups

| WO | 범위 |
|---|---|
| WO-O4O-NETURE-SUPPLIER-PRODUCT-REGISTRATION-WIZARD-V2 | create wizard 를 유형별 입력 분기로 심화 + 완료 후 "다음 작업" 안내 |
| WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-TEMPLATE-V1 | 유형별 전용 템플릿·파서·저장 |
| WO-O4O-NETURE-SUPPLIER-OFFER-MODE-SELECTION-V1 | 공급 오퍼/판매자 모집 전용 흐름 |
| WO-O4O-NETURE-SUPPLIER-EVENT-OFFER-WORKSPACE-V1 / DISTRIBUTION-FUNDING-WORKSPACE-V1 | 제품 목록 → 펀딩/이벤트 연결 row action |
| WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1 | 배송비/무료배송 grouping |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 공급자 제품 등록 IA 1차 정비 완료 (frontend). 운영하며 점진 개선.
