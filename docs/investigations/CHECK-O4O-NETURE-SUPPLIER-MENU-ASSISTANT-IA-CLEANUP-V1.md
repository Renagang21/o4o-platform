# CHECK-O4O-NETURE-SUPPLIER-MENU-ASSISTANT-IA-CLEANUP-V1

> 공급자 제품 관리 메뉴/등록 보조기능을 새 IA(유형-우선)에 맞게 정비 (frontend only, route 보존).
>
> WO: `WO-O4O-NETURE-SUPPLIER-MENU-ASSISTANT-IA-CLEANUP-V1`
> 기준 IR: `IR-O4O-NETURE-SUPPLIER-WORKSPACE-FULL-AUDIT-V1` (권장안 D)
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료.

---

## 1. Summary

IR 권장안 D대로 제품 관리 메뉴와 등록 도우미·CSV Import·B2B 콘텐츠를 정비했다. **bulk 저장 파서 확장 없음** — 안전 정비.

- 메뉴: 상품 등록 도우미 → **등록 도우미**, B2B 콘텐츠 → **제품 콘텐츠 관리**, **CSV Import 독립 항목 제거**(라우트 보존).
- 등록 도우미: 상단 "**자동 등록 아님(보조 기능)**" 안내 + **제품 유형 선택(분석 전)** + 유형별 경고(특히 Rx) + draft→wizard 시 `?productType=` 유지.
- CSV Import 화면: 상단 **안전 안내 + 유형별 대량 등록 CTA**(의약품·처방 사용 금지 명시). 직접 접근 404 없음.
- 검증: web-neture `tsc` — §5.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx` | 제품 관리 메뉴: 등록 도우미/제품 콘텐츠 관리 명칭 + CSV Import 독립 항목 제거(라우트 보존) |
| `services/web-neture/src/pages/supplier/SupplierProductImportPage.tsx` | h1 "등록 도우미" + 보조기능 안내 + 제품 유형 선택/유형별 경고 + draft.regulatoryType(유형 우선) + navigate `?productType=` |
| `services/web-neture/src/pages/supplier/SupplierCsvImportPage.tsx` | 상단 legacy 안전 안내 + 대량 등록 CTA |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-MENU-ASSISTANT-IA-CLEANUP-V1.md` | 본 문서 |

> route(`/supplier/csv-import`, `/import-assistant`, `/b2b-content`) 삭제 없음 — 404 방지. 백엔드/저장/파서/구조 변경 없음.

---

## 3. 메뉴 정리 (IR 권장안 D)

```
제품 관리
  - 제품 목록            /supplier/products
  - 제품 등록            /supplier/products/register
  - 대량 등록            /supplier/products/bulk
  - 등록 도우미          /supplier/products/import-assistant   (← "상품 등록 도우미")
  - 제품 콘텐츠 관리      /supplier/b2b-content                  (← "B2B 콘텐츠")
```
- **CSV Import 독립 항목 제거** → 대량 등록(`/products/bulk`)의 "업로드로 이동" + CSV 화면 자체 CTA 로만 접근(흡수). 라우트는 보존.

---

## 4. 등록 도우미 재정의

- **보조 기능 안내**: "자동 등록 아님 — 외부 HTML/페이지에서 후보 추출 → 정식 Wizard 입력 보조. 제출 전 확인."
- **제품 유형 선택(분석 전)**: 5유형 카드 + 선택 시 유형별 경고:
  - 비의약품/의약외품/OTC/**Rx(처방: 자동 연결 안 됨 + 유효기간·일련번호·lot 미수집)**/미분류.
- **handoff**: `saveDraft` 의 `regulatoryType` 을 **선택 유형 우선**(productType.regulatoryType)으로 채우고, `navigate('/supplier/products/new?productType=<key>')` 로 유형 전달 → WIZARD-V2 유형 안내/경고/완료액션 적용. **자동 확정 생성 없음**(기존 draft→wizard 구조 유지).

---

## 5. Verification Results

| 항목 | 결과 |
|---|---|
| web-neture `tsc --noEmit` (background) | ✅ 0 errors |
| 메뉴 렌더(등록 도우미/제품 콘텐츠 관리, CSV 독립 제거) | ✅ |
| CSV Import 직접 접근 crash/404 | ✅ 없음 (라우트 보존 + 안전 안내) |
| 등록 도우미 유형 선택 + Rx/OTC 경고 | ✅ |
| 도우미 → 정식 등록 productType 유지 | ✅ (`?productType=` + draft.regulatoryType) |
| 대량 등록 템플릿/제품 목록/이벤트/펀딩 영향 | ✅ 없음 |
| 데드링크 | ✅ 0 |

---

## 6. What Was Not Changed

- ✅ bulk parser / bulk save / CSV Import 백엔드·저장 API 변경 없음
- ✅ ProductMaster / ProductCandidate / Drug Extension / SPO 구조 변경 없음
- ✅ 이벤트 오퍼 / 유통참여형 펀딩 / MarketTrial.productId 표시 변경 없음
- ✅ OTC 공급 gate / 배송 / 주문 / 정산 변경 없음
- ✅ 도우미 HTML 분석 로직 대규모 개편 없음 (유형 선택 + 안내 + handoff 만)
- ✅ route 삭제 없음(메뉴 진입점만 정리)

---

## 7. Follow-ups (IR §16 순서)

| WO | 범위 |
|---|---|
| WO-O4O-NETURE-MARKET-TRIAL-PRODUCT-REFERENCE-DISPLAY-V2 | 저장된 productId 목록/상세/운영자 표시 |
| WO-O4O-NETURE-SUPPLIER-BULK-UPLOAD-PARSE-V2 | 유형 header 검증·혼합 방지·처방 가드·미리보기 (이제 안전 정비 후 진행 가능) |
| WO-O4O-NETURE-SUPPLIER-OTC-PHARMACY-SUPPLY-GATE-V1 / SHIPPING-SETTING-FOUNDATION-V1 | 후속 |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 메뉴/도우미/CSV IA 정비 완료 — PARSE-V2 전제 충족. 다음: DISPLAY-V2 또는 PARSE-V2.
