# CHECK-O4O-SUPPLY-CATALOG-APPROVAL-FLOW-DOCUMENTATION-V1

> **WO:** WO-O4O-SUPPLY-CATALOG-APPROVAL-FLOW-DOCUMENTATION-V1
> **작성일:** 2026-06-14
> **상태:** ✅ **완료** — 운영자 가이드 문서 + 콘솔 내 "승인 흐름 안내" 버튼(공통 1곳, 3서비스 자동 노출). tsc PASS.

## 1. 목적

Supply Catalog 공급 상품 신청 승인 흐름을 운영자용 end-to-end 가이드로 문서화하고,
운영자가 승인 화면에서 바로 읽을 수 있는 안내 버튼을 제공. "승인 즉시 소비자 노출" 오해 방지.

## 2. 선행 기준

- `WO-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1`
- `WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1`
- `WO-O4O-KPA-PRODUCT-APPLICATIONS-MENU-EXPOSURE-V1`
- `IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1` (정책 SSOT)

## 3. 가이드 문서 작성

- 생성: [docs/guides/O4O-SUPPLY-CATALOG-APPROVAL-FLOW-GUIDE-V1.md](../guides/O4O-SUPPLY-CATALOG-APPROVAL-FLOW-GUIDE-V1.md).
- 구성: 목적 / 용어 / 전체 흐름 / 신청 / 승인 / 편입 / storefront 노출 차이 / 서비스별 상태 / 주의점 / FAQ / 후속.
- 신청→승인→OPL active(편입)→진열 gate 흐름 + 승인 ≠ 소비자 노출 + per-store 단건 + offer-wide 금지 반영.

## 4. 운영자 안내 버튼 (사용자 추가 지시 반영)

> 사용자 지시: "운영자 대시보드 어디엔가 적절한 곳에 운영자가 읽을 수 있도록 간단한 버튼."

- 배치: **공유 콘솔 `ProductApplicationManagementConsole`** (operator-core-ui) 제목 우측에 "승인 흐름 안내" 버튼.
  - 근거: 승인 작업 화면이 안내가 가장 필요한 "적절한 곳". 공통 콘솔 1곳 편집으로 **KPA/GP/KCos 3서비스에 자동 노출** (DRY).
- 동작: 버튼 클릭 → 이미 import된 `BaseDetailDrawer` 재사용(새 의존성 0) → 흐름/주의점/상세 가이드 경로 표시.
- 내용: 승인=편입 자격(소비자 노출 아님), per-store 단건, 거절 사유, 삭제 의미 — 가이드 문서 요약.

## 5. 용어 기준 확인

- 사용: 공급 상품 / 공급 상품 신청 / 공급 상품 신청 승인 / O4O 주문 가능 상품 / 진열 / 채널 진열 / 소비자 노출.
- 금지어 미사용: `grep` 결과 `docs/guides` + 콘솔 안내에 `승인 즉시 판매/노출` · `판매자 모집` · `B2B 승인` · `B2C 승인` · `상품 판매 승인` **0건**.

## 6. 정책 반영 확인

| 정책 | 반영 위치 |
|------|----------|
| 승인 = OPL active = 편입 자격(노출 아님) | 가이드 §6-7, 버튼 안내 |
| 소비자 노출 = 별도 4-gate | 가이드 §7, §8 |
| per-store 단건 활성 | 가이드 §5, FAQ, 버튼 안내 |
| offer-wide 일괄 금지 | 가이드 FAQ |
| KPA/GP/KCos 성숙도 차이 | 가이드 §8 |

## 7. 제외/무변경 항목

backend / DB / migration / route / 승인 로직 / ProductApprovalV2Service / GP/KCos backend / Neture / EventOffer / storefront·channel·OPC / checkout·order — 전부 무변경.
콘솔 변경은 **안내 버튼+Drawer(읽기 전용 UI) 추가만**(승인/목록/액션 로직 무변경).

## 8. 검증 결과

- ✅ `@o4o/operator-core-ui` tsc → 콘솔 파일 **0 errors** (패키지 1건은 pre-existing `error-handling/import.meta.env`).
- ✅ `glycopharm-web` / `@o4o/web-k-cosmetics` / `@o4o/web-kpa-society` tsc → **0 errors** (변경 콘솔 소비 확인).
- ✅ 금지어 0건.
- 변경 파일: 가이드 doc(1) + CHECK doc(1) + 콘솔(1) = 3건.
- 주의: 동시 세션 WIP(`operator-core-ui/modules/instructor-courses`, `index.ts`, instructor 페이지, 미푸시 footer 커밋) 존재 — 본 작업 파일과 **무중복**. path-specific staging 으로 격리(내 3파일만 commit).

## 9. 완료 판정

✅ **완료.** 운영자 가이드 문서 + 승인 화면 내 안내 버튼(3서비스 공통 노출). 승인≠노출/per-store/offer-wide 금지/서비스별 성숙도 반영. 코드 로직·backend·DB 무변경, tsc PASS.

## 10. 후속 작업

1. `IR-O4O-KCOS-STOREFRONT-ORDERABLE-PRODUCT-GATE-V1`
2. `IR-O4O-KPA-STOREFRONT-ORDERABLE-PRODUCT-GATE-V1`
3. `WO-O4O-SUPPLY-CATALOG-OPERATOR-GUIDE-PAGE-V1` (필요 시 실제 가이드 페이지로 반영)

---
*End of CHECK-O4O-SUPPLY-CATALOG-APPROVAL-FLOW-DOCUMENTATION-V1*
