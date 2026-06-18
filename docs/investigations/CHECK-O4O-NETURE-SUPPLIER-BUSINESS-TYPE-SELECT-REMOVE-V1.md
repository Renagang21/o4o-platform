# CHECK-O4O-NETURE-SUPPLIER-BUSINESS-TYPE-SELECT-REMOVE-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-BUSINESS-TYPE-SELECT-REMOVE-V1
> **유형:** frontend-only — Neture **공급자** 가입 화면의 카테고리형 '업종' select 제거 + 업태(businessType) 사업자등록증 정렬.
> **결과: PASS — supplier 분기 업종 select 제거, BusinessRegistrationFields 에 businessType(업태) 포함하여 업태/종목/사업자유형/개업일 정렬. tsc 통과. store_owner/partner 미변경.**
> 선행: IR-O4O-CROSSSERVICE-BUSINESS-REGISTRATION-SIGNUP-FIELD-AUDIT-V1 §11 (delta 확정)

## 1. 범위

- **대상:** `services/web-neture/src/components/RegisterModal.tsx` 의 **supplier 분기만.**
- **비대상(미변경):** store_owner 업종 select, partner 활동 분야 select, 백엔드 DTO/저장, 다른 서비스.

## 2. 변경

| 항목 | 처리 |
|------|------|
| supplier '업종' select (cosmetics/health/medical/food/other) | **제거** |
| 대표자명 | 기존 grid(대표자명+업종) 해체 → full-width 단독 |
| `BusinessRegistrationFields` includeFields | `['businessItem','businessEntityType','businessStartDate']` → `['businessType','businessItem','businessEntityType','businessStartDate']` |
| businessType 의미 | 카테고리 코드 → **사업자등록증 기준 '업태' free text** (BusinessRegistrationFields 라벨 "업태") |
| businessItem(종목) / businessEntityType(사업자유형) / businessStartDate(개업일) | 유지 (사업자유형 후순위화는 본 WO 보류) |

- `formData.businessType` 초기값 `''` + useEffect reset 유지 → 카테고리 코드 잔존 없음. payload 의 `businessType: formData.businessType` 그대로(이제 업태 텍스트 전송), 백엔드 `businessInfo.businessType` 수용 기존과 동일.

## 3. 검증

- `npx tsc --noEmit -p tsconfig.json` (web-neture) → **exit 0**.
- 정적: store_owner/partner 분기의 businessType/활동분야 select 무변경 확인(공통 payload businessType 키 동작 유지).

## 4. 비범위 / 후속

- 사업자유형(businessEntityType) 가입단계 후순위화 — 보류(후속).
- store_owner 업종 / partner 활동분야 정리 — 별도 판단(후속).
- 4서비스 연락처 필드 보강(회사전화/회사이메일/담당자이메일) — 별도 중규모 WO(shared 컴포넌트 + DTO + 승인상세). IR §11.4-2.

## 5. 배포 후 권장 (선택)

- 브라우저: Neture 공급자 가입 모달에서 업종 select 부재 + 업태 free-text 입력란 노출 확인. (frontend-only, type-check 로 정합 확인됨)

---

*Date: 2026-06-18 · CHECK · PASS · Neture supplier 업종 select 제거 + 업태 정렬 · frontend-only · tsc 통과 · store_owner/partner/백엔드 무변경.*
