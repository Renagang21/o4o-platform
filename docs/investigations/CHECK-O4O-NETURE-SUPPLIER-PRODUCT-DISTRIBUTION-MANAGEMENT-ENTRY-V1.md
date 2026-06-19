# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-ENTRY-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-ENTRY-V1 (후보 C)
> **유형:** frontend-only 표시/안내 — drawer "공급 방식" 섹션에 [공급 방식 관리·정책 안내] 진입(토글) + 읽기 전용 정책 패널. **실제 변경 플로우 없음(후보 D).** backend/API/DB/route 변경 0.
> **결과: PASS(코드/타입) — 공급 방식 관리 진입(토글 버튼) + 3개 공급 방식 정책 안내(B2B 전체 공급/서비스 공급/내부 상품) + 변경 경로 안내. web-neture tsc 0. 라이브 smoke는 배포 후.**
> 선행: IR-O4O-NETURE-SUPPLIER-PRODUCT-INFO-AND-DISTRIBUTION-UX-AUDIT-V1 (후보 C) · CHECK-...-INFO-DISTRIBUTION-SUMMARY-V1 (A, PASS) — 2026-06-19

---

## 1. 범위 / 정책

후보 A(공급 방식 표시 분리, PASS)에 이어, **C는 진입 + 현재 공급 방식 + 정책 안내까지만**. 실제 공급 방식 변경(serviceKeys PATCH 정식화, SERVICE 제거 정책 등)은 **후보 D로 분리**.

## 2. 변경 (1 파일)

`services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx`:
- `showSupplyGuide` 토글 state 추가.
- A의 "공급 방식" 섹션 하단에 **[▸ 공급 방식 관리 · 정책 안내] 토글 버튼** + 펼침 시 **읽기 전용 정책 패널**:
  - **B2B 전체 공급**: 서비스 운영자 승인 없이 HUB 노출.
  - **서비스 공급**: 선택 서비스 운영자 승인 후 해당 서비스 HUB 노출.
  - **내부 상품**: 공급 방식 미설정 — HUB 미노출.
  - 변경 경로 안내: "공급 방식은 상품 편집에서 전체 공개 여부·서비스 공급 대상을 조정할 수 있으며, 전용 공급 방식 관리 화면은 준비 중."

## 3. 설계 선택 (빈 버튼 회피)

- 버튼은 dead("준비 중"만) 아님 — 클릭 시 **실질 정책 안내 패널**을 펼침(교육적 가치). 실제 변경은 기존 상품 편집(B2C 편집, 사전 존재)에서 가능함을 안내하되, **전용 관리 플로우(D)는 준비 중**으로 명시.
- A에서 도입한 평이 라벨/내부 용어 미노출 원칙 유지(distributionType 미노출).

## 4. 공유 drawer 영향 (operator)

- ProductDetailDrawer는 supplier + operator 공유 → A와 동일하게 **순수 추가(state 1개 + 토글/패널)** 만. 기존 섹션 이동/삭제 0. operator 뷰에도 무해(정책 안내 노출).

## 5. 준수 / 비범위

- ✅ 실제 공급 방식 변경 기능/serviceKeys PATCH/route/submitForApproval 변경 **안 함**(D). backend/API/DB/migration 0.
- ✅ path-specific(drawer + CHECK). 검증 스크린샷(png)·다른 세션 WIP 미staging.

## 6. 검증

- **web-neture `tsc --noEmit`: EXIT 0**.
- 정적: 토글 패널은 `!isEditing` view 전용(A 섹션 내부), 추가 import/필드 없음. operator/편집 경로 무변경.

### 배포 후 smoke (실제 브라우저 — A 교훈 적용)
1. `/supplier/products`(ACTIVE 공급자, 예: renagang21 미네락 600) → drawer.
2. "공급 방식" 섹션에 **[공급 방식 관리 · 정책 안내]** 토글 노출.
3. 펼치면 3개 방식 정책 + 변경 경로 안내 표시.
4. 기존 A 요약/편집/operator 화면 회귀 없음.

## 7. 후속 (D)

`WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1` — PUBLIC/SERVICE 변경 플로우 + serviceKeys PATCH API 정식화(현 drawer auto-submit 우회 제거) + SERVICE 대상 제거 시 offer_service_approvals row 정책. (별도, backend 포함)

---

*Date: 2026-06-19 · 후보 C · drawer 공급 방식 섹션에 관리 진입(토글)+정책 안내(3방식) 추가, 실제 변경은 D · 공유 drawer 순수 추가(operator 무해) · backend/API/DB 0 · web-neture tsc 0 · 라이브 smoke 배포 후(실브라우저).*
