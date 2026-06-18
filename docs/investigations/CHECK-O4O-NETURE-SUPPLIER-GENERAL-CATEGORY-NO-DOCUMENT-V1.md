# CHECK-O4O-NETURE-SUPPLIER-GENERAL-CATEGORY-NO-DOCUMENT-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-GENERAL-CATEGORY-NO-DOCUMENT-V1
> **유형:** frontend-only 정비 — 공급자 프로필 품목군 영역에서 **일반 상품** 증빙 입력 UI 제거(backend 이미 면제). backend/API/DB/규제 품목군 무변경.
> **결과: PASS(코드·typecheck·배포 후 라이브 브라우저 smoke 전 항목).**
> 선행: IR-O4O-NETURE-SUPPLIER-REGISTRATION-REQUIREMENTS-AUDIT-V1, IR-O4O-NETURE-SUPPLIER-PRODUCT-FILE-REQUIREMENTS-AUDIT-V1 — 2026-06-17

## 1. 배경

두 선행 IR 종합: 일반 상품은 backend 기준 번호/파일/심사 gate **이미 면제**(ACTIVE·submit-approval 무영향). 그러나 `/mypage/business-profile` 품목군 영역이 일반 상품에도 허가/신고 번호 입력란 + 파일 업로드 + 심사 배지를 표시해 "일반 상품도 서류 필요?" 오해 유발. → backend 면제 정책에 맞게 **frontend 표시만 정렬**.

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/supplier/SupplierProfilePage.tsx` | regulated-category 렌더에 `isGeneral`(`category === 'general'`) 분기 추가 |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-GENERAL-CATEGORY-NO-DOCUMENT-V1.md` | 본 CHECK |

> backend/API/DB/migration/entity/제품 flow/운영자 화면/규제 품목군 변경 0.

## 3. 일반 상품 분기 방식

- `const isGeneral = category === 'general';`(`REGULATED_CATEGORY_ORDER[0]`).
- **심사 status 배지**: `row && !isGeneral` 일 때만 기존 상태 배지. 일반 상품은 대신 **"서류 불필요"**(emerald) 배지.
- **번호/파일 상세 블록**(허가/신고 번호 입력 + PDF 업로드 + 증빙 열람 + 운영자 메모): `row && !isGeneral` 로 가드 → 일반 상품 미표시.
- 일반 상품 선택 시: 안내 문구만 표시(아래 §4).
- 체크박스 선택/해제(`handleToggleCategory`), 저장 동작은 **공통 로직 그대로**(일반 상품도 category select/remove 동일). 변경된 것은 **표시(증빙 UI 가시성)뿐**.

## 4. 일반 상품 표시 문구

- 배지: `서류 불필요`
- 안내: "일반 상품은 별도 허가/신고 서류가 필요하지 않습니다. 바로 제품 등록을 진행할 수 있으며, 법정 인증 대상 상품은 제품 등록 단계에서 별도로 확인됩니다."

## 5. backend/API/DB 무변경 확인

- 수정 파일은 frontend 1개(+CHECK). API client 호출/엔드포인트/DTO/entity/migration 무변경.
- 일반 상품의 number/file API(`updateRegistrationNumber`/`uploadEvidence`)는 호출 경로(UI)만 제거 — 서버 로직 불변. 기존 데이터/상태 영향 없음.

## 6. 규제 품목군 미변경 확인

- 의약품/의약외품/의료기기/건강기능식품/식품/화장품/기타: `!isGeneral` 경로로 **기존 번호 입력 + 파일 업로드 + 상태 배지 + 운영자 메모 그대로 유지**. (번호-우선/파일 선택화는 별 WO `...-REGULATED-CATEGORY-NUMBER-FIRST-V1` 소관, 본 WO 범위 외.)

## 7. 검증 결과

- **typecheck**: `pnpm exec tsc --noEmit` (web-neture) → **EXIT 0**.
- 정적: 분기 2개(badge `!isGeneral`/`isGeneral`, 상세블록 `!isGeneral` + 안내 `isGeneral`). 닫힘 태그/조건 정합.
- **브라우저 smoke = PASS** (배포 success `gh run 27732888675` 후, 라이브 `/mypage/business-profile`, 공급자 계정 sohae21@naver.com, 2026-06-18):
  1. **일반 상품 선택** → 번호 입력란·"Choose File" PDF 버튼 **미표시**, **"서류 불필요"** 배지 + 안내 문구("일반 상품은 별도 허가/신고 서류가 필요하지 않습니다…") 노출. ✅
  2. **의약품(규제) 선택** → "미신청" 상태 배지 + "허가/신고 번호 (선택)" 입력란 + "Choose File" PDF 업로드 **기존 유지**. ✅
  3. **select/해제 토글** 정상 동작(일반 상품·의약품 체크/언체크). 검증 후 두 품목군 **미선택 상태로 원상복구**(테스트 잔존 row 제거). ✅

## 8. 회귀 검증(정적)

- 일반 상품 select/remove: `handleToggleCategory` 공통 — 영향 없음(표시만 변경).
- 규제 품목군 표시·업로드: `!isGeneral` 경로 동일.
- 제품 등록 화면: 미수정 → 영향 없음.

---

*frontend-only · 일반 상품 품목군 증빙 입력 UI(번호/파일/심사 배지) 제거 → "서류 불필요" 배지+안내 · backend 이미 면제, 무변경 · 규제 품목군 기존 유지 · typecheck EXIT 0 · 라이브 브라우저 smoke PASS(일반=서류불필요/의약품=번호·파일 유지/토글 정상, 원상복구).*
