# CHECK-O4O-NETURE-SUPPLIER-PROFILE-CATEGORY-SELECTION-ONLY-AND-PRODUCT-LIGHTWEIGHT-GATE-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-PROFILE-CATEGORY-SELECTION-ONLY-AND-PRODUCT-LIGHTWEIGHT-GATE-V1 (D3)
> **유형:** backend 2 + frontend 1파일 — 게이트 경량화 + 프로필 선택-only. DB/migration/enum 0, 기존 데이터 보존.
> **결과: PASS(코드/타입) — `evaluateGate`를 "선진입 후보완"(suspended만 차단)으로 경량화, 사업자등록증 submit 하드블록 제거(완화), 프로필 품목군 선택-only(번호/PDF/검토요청 제거, 데이터 보존). api-server tsc 0 / web-neture tsc 0. 라이브 smoke는 배포 후.**
> 선행: IR-O4O-NETURE-SUPPLIER-PROFILE-CATEGORY-SELECTION-ONLY-AUDIT-V1 (옵션1) — 2026-06-18

---

## 1. 정책 / D3 IR 반영

"규제 제거"가 아니라 **선진입 후보완** — 공급자·상품이 먼저 들어오고 운영자가 후속 확인·보완. IR에서 확인된 단일 결합(`submitForApproval`→`evaluateGate` status='approved' 요구)을 "선택됨/미선택 통과, suspended만 차단"으로 재정렬.

## 2. 변경 (backend 2 + frontend 1)

### `supplier-regulated-category.service.ts` — `evaluateGate` 경량화
- 변경 전: `status==='approved'`만 allowed.
- 변경 후: **suspended(운영자 명시 잠금)만 차단**, 그 외(미상/미선택/선택/심사중/보완/반려) 전부 통과. 기존 status/번호/증빙 데이터 **재해석만**(migration·enum 0).

### `offer.service.ts` — 판매전(사업자등록증) submit 하드블록 제거
- D2에서 추가한 `SUPPLIER_BUSINESS_REGISTRATION_REQUIRED` skip 제거 → 사업자등록증 미제출이어도 **상품 승인요청 허용**. 미제출은 운영자 공급자 승인 화면 '판매 전 필요' badge(D2)로 surface, 판매가능/최종 승인 전 보완.

### `SupplierProfilePage.tsx` — 공급 예정 품목군 선택-only
- **제거**: 품목군별 허가/신고 번호 입력, 증빙 PDF 업로드, 검토 요청 버튼, 승인/반려 상태 badge(비 general).
- **유지**: 선택 체크박스, 일반 '서류 불필요' 안내, **suspended → '운영자 보류' 표시**, 규제 품목 안내문("판매 노출/주문 전 운영자 확인 필요할 수 있음").
- **데이터 보존**: 기존 제출 번호/증빙은 삭제 안 함 — "제출 보관됨: 번호 … · 증빙 열람"으로 read-only 표시(다운로드 유지). 미사용 핸들러(번호저장/검토요청/업로드) 제거(엔드포인트·데이터는 보존).
- 안내문구: "공급 예정 품목군은 향후 상품 등록·운영자 확인 기준 … 우선 선택만 해 주세요."

## 3. 게이트 변경 전/후

| 상황 | 변경 전 | 변경 후 |
|------|------|------|
| 일반 상품 | 'general' approved 필요(사실상) | 통과 |
| 규제 품목 — 품목군 approved | 통과 | 통과 |
| 규제 품목 — 선택/심사중/보완/반려 | **차단** | **통과**(운영자 상품 승인서 확인) |
| 규제 품목 — 미선택 | 차단(NOT_SELECTED) | **통과** |
| 규제 품목 — suspended | 차단 | **차단**(유일 hard guard) |
| 사업자등록증 미제출 | (D2) submit 차단 | **통과**(badge로 surface) |

## 4. 규제 검증 위치 (V1)

- 상품 단계 **번호 게이트 유지**(`mfdsPermitNumber`/`assertRegulatedPermit`, 운영자 상품 승인) — 규제 적합성은 여기서 판정.
- **상품 레벨 PDF 증빙 신규 필드 추가 안 함**(WO 금지 준수). 운영자 상품 승인 화면은 기존대로 regulatoryType/번호 표시.
- 품목군별 복잡 workflow 신설·법정 심사 재설계 없음.

## 5. 준수 / 비범위

- ✅ DB migration 0, supplier category **enum 변경 0**, 기존 제출 자료 삭제 0, 상품 레벨 PDF 증빙 신규 0, payout 신규 0, 통신판매업 게이트 강화 0.
- ✅ 사업자등록증/정산정보를 "완전 불필요"로 삭제하지 않음 — 후단계(판매전/정산전, D2) 유지, 이번엔 submit 하드블록만 완화.
- ✅ path-specific. 다른 세션 WIP 무접촉.

## 6. 검증

- **api-server `tsc --noEmit`: EXIT 0** (supplier-regulated-category/offer.service).
- **web-neture `tsc --noEmit`: EXIT 0** (SupplierProfilePage + 미사용 정리).
- 정적: `resolveRegulatedCategoryFromProduct`가 general→'general'(non-null) 반환 → 변경은 더 관대(일반 회귀 없음). suspended만 차단 유지.

### 배포 후 smoke (권장)
1. 프로필에서 일반/규제 품목군 선택 — 번호/PDF/검토요청 없이 선택만으로 저장.
2. 규제 품목 draft 등록 가능.
3. 품목군 approved 아니어도(선택만/미선택) 승인요청 통과.
4. suspended 품목군은 차단 유지.
5. 사업자등록증 미제출 상태에서 승인요청 통과(운영자 화면 '판매 전 필요' badge).
6. 정산정보 미제출이 상품 등록/승인요청 막지 않음.
7. 기존 제출 번호/증빙 보존·열람 가능.
8. 운영자 상품 승인 화면 규제 품목 확인 가능.
9. 일반 상품 회귀 없음.

## 7. 회귀 위험 / 보류

- 공급자-레벨 품목군 사전 스크리닝 사실상 해제 → 규제 판정이 **상품 단계(번호/운영자 승인)로 전적 이전**. 규제 컴플라이언스 책임 위치 변화 — 법무/규제 확인 권장(IR §8).
- suspended 외 차단 없음 → 운영자가 부적격 공급자를 막으려면 품목군 suspended 또는 상품 승인 단계에서 reject 활용.
- 사업자등록증: 이제 submit 비차단 → 판매가능/최종 승인 전 보완 흐름(별도 게이트)이 없으면 미제출 상태로 노출 가능 → 운영자 badge 확인 운영 필요.
- 품목군 review(운영자) 화면은 과거 데이터 유지 — 신규 흐름에서 승인 필수처럼 보이지 않도록 후속 정리 권장(선택).

---

*Date: 2026-06-18 · evaluateGate=선진입(suspended만 차단) · 사업자등록증 submit 하드블록 제거(badge로 완화) · 프로필 품목군 선택-only(번호/PDF/검토요청 제거, 데이터 보존) · migration/enum 0 · 상품 PDF 증빙 신규 0 · api-server/web-neture tsc 0 · 컴플라이언스(공급자 스크리닝 상품단계 이전) 확인 권장.*
