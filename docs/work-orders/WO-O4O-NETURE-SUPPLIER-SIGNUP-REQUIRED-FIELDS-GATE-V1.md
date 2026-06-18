# WO-O4O-NETURE-SUPPLIER-SIGNUP-REQUIRED-FIELDS-GATE-V1

> **유형:** 가입신청 필수항목 게이트(V1) — Neture 공급자 가입신청 최소 식별항목을 프론트·백엔드 양쪽에서 강제. DB·온보딩 정책·ACTIVE 전환 무변경.
> **선행 조사:** `IR-O4O-NETURE-SUPPLIER-SIGNUP-REQUIRED-FIELDS-AUDIT-V1`
> **정책:** 사업자등록번호·정산·증빙 서류는 가입신청 필수로 올리지 않고 온보딩/ACTIVE 전환 게이트 유지.

---

## 1. 작업 목적

Neture 공급자 가입신청 단계에서 필수 식별 정보가 누락된 상태로 가입신청이 접수되지 않도록 프론트엔드와 백엔드 검증을 정렬한다.

선행 조사 결과, 현재 Neture 공급자 가입신청은 프론트에서 일부 필수항목을 검증하고 있으나 백엔드 `/auth/register`에서는 `service=neture`, `role=supplier`에 대한 공급자 필수항목 방어 검증이 없다. 따라서 프론트 우회 또는 예외 payload 요청 시 필수 정보가 부족한 공급자 가입신청이 `201 Created`로 접수될 수 있다.

본 작업은 (1) supplier 가입신청 최소 필수항목을 백엔드에 추가, (2) 프론트 supplier 필수 검증을 백엔드와 일치, (3) 누락 항목 안내, (4) 운영자 일괄 결과 모달의 빈 results 성공 오표시 방어를 수행한다.

---

## 2. 선행 조사 결론

| 유형 | 판정 | 내용 |
|------|-----:|------|
| 프론트 필수 검증 누락 | 확인 | 화면에 존재하는 일부 항목이 선택으로 처리됨 |
| 백엔드 방어 검증 누락 | 핵심 확인 | Neture supplier role 필수 사업자 식별정보 검증 없음 |
| 저장 필드명 변환 | 확인 | `contactPhone→managerPhone`, `businessAddress→address1` 등 |
| 운영자 목록 구분 | 부분 문제 | 회원 승인과 공급자 활성화 흐름 혼재 가능 |
| 0건 성공 메시지 | 조건부 확인 | 빈 `results: []` 응답 시 성공 메시지 오표시 가능 |

---

## 3. 정책 결정

### 3.1 가입신청 단계 필수항목

| 구분 | 필수항목 |
|------|---------|
| 계정 정보 | 이메일, 비밀번호, 비밀번호 확인, 성, 이름, 휴대폰 번호 |
| 공급자 신청 정보 | 회사명, 대표자명, 담당자명, 담당자 연락처, 사업장 주소 |
| 동의 | 이용약관 동의, 개인정보처리방침 동의 |

### 3.2 가입신청 필수로 올리지 않는 항목 (온보딩/ACTIVE 게이트 유지)

사업자등록번호, 세금계산서 이메일, 종목, 사업자 유형, 개업일, 사업자등록증 PDF, 통장 사본 PDF, 정산 계좌, 통신판매업 신고 정보/신고증 PDF, 품목군별 증빙.

> 본 WO는 공급자 온보딩 정책이나 ACTIVE 전환 조건을 변경하지 않는다.

---

## 4. 수정 대상 파일

### 4.1 백엔드
- `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts`
- 참고(미수정 원칙): `apps/api-server/src/modules/auth/dto/register.dto.ts` — `RegisterRequestDto`는 4개 서비스 공용 DTO이므로 전 필드 required 전환 금지. 서비스별 required는 controller의 service/role 조건 분기로 수행.

### 4.2 프론트엔드
- `services/web-neture/src/components/RegisterModal.tsx`

### 4.3 운영자 UX 방어
- `packages/ui/src/components/table/BulkResultModal.tsx`
- 필요 시 `packages/operator-ux-core/src/list/useBatchAction.ts`

---

## 5. 백엔드 수정 요구사항

### 5.1 검증 조건
register 처리 중 serviceKey와 role 확정 이후 `serviceKey === 'neture' && effectiveRole === 'supplier'` 분기 추가. 실제 supplier 신청 role 판정에 안전한 값(`membershipRole`/`effectiveRole`) 사용.

### 5.2 필수 검증 항목 (canonical + legacy fallback 모두 허용)

| 논리 항목 | 요청 필드 |
|----------|----------|
| 회사명 | `companyName` 또는 `businessName` |
| 대표자명 | `representativeName` 또는 `ceoName` |
| 담당자명 | `contactName` |
| 담당자 연락처 | `managerPhone` 또는 `contactPhone` |
| 사업장 주소 | `businessAddress` 또는 `address1` |

> 프론트는 `contactPhone→managerPhone`, `businessAddress→address1` 변환 전송. 백엔드는 양쪽 모두 허용.

### 5.3 연락처 검증
```ts
const normalizedPhone = String(value || '').replace(/\D/g, '');
normalizedPhone.length >= 10
```

### 5.4 에러 응답
- code: `NETURE_SUPPLIER_REQUIRED_FIELDS_MISSING`
- message: `공급자 가입신청에 필요한 필수 정보가 누락되었습니다. 모든 필수 항목을 입력해주세요.`
- 가능하면 body에 `missingFields` 배열 포함:

```json
{
  "success": false,
  "error": "공급자 가입신청에 필요한 필수 정보가 누락되었습니다. 모든 필수 항목을 입력해주세요.",
  "code": "NETURE_SUPPLIER_REQUIRED_FIELDS_MISSING",
  "missingFields": ["companyName", "representativeName", "contactName", "managerPhone", "businessAddress"]
}
```

`BaseController.error()`가 확장 payload를 지원하지 않으면 기존 응답 구조를 깨지 않는 범위에서 `code`+메시지만 반환해도 된다. 단 가능하면 `missingFields` 포함 우선 검토.

---

## 6. 프론트엔드 수정 요구사항

### 6.1 `isStep2Valid()` 정합

| 필드 | 조건 |
|------|------|
| `companyName` | trim 후 비어 있지 않음 |
| `representativeName` | trim 후 비어 있지 않음 |
| `contactName` | trim 후 비어 있지 않음 |
| `contactPhone` | 숫자 10자리 이상 |
| `businessAddress` | trim 후 비어 있지 않음 |
| `agreeTerms` | true |
| `agreePrivacy` | true |

### 6.2 누락 항목 안내
버튼 비활성화만으로 끝내지 말고 누락 항목 목록 표시:
```text
공급자 가입신청을 위해 아래 필수 정보를 모두 입력해주세요.
미입력 항목: 회사명, 대표자명, 담당자명, 담당자 연락처, 사업장 주소
```

### 6.3 label 필수 표시 정합
필수 `*` 표시: 회사명·대표자명·사업장주소·담당자명·담당자연락처.
선택/온보딩 안내: 사업자등록번호·세금계산서이메일·종목·사업자유형·개업일·상세주소.

### 6.4 백엔드 에러 메시지 처리
`NETURE_SUPPLIER_REQUIRED_FIELDS_MISSING` 반환 시 전용 안내 표시, `missingFields`가 오면 프론트 라벨로 매핑.

---

## 7. 운영자 UX 방어

### 7.1 빈 results 성공 오표시 방지
`BulkResultModal.tsx`:
```ts
const hasResults = results.length > 0;
const allSuccess = hasResults && failedCount === 0 && skippedCount === 0;
```
빈 결과 문구:
```text
처리 대상이 없습니다.
선택한 항목 중 현재 처리 가능한 대상이 없습니다.
```

### 7.2 범위 제한
승인 대상 필터 정책 변경, 회원/공급자 승인 흐름 통합, `/operator/suppliers` 흐름 변경, 공급자 활성화 정책 변경은 본 WO에서 하지 않는다(별도 WO).

---

## 8. 비수정 대상

DB 마이그레이션, `neture_suppliers` schema, ACTIVE 전환 조건, 사업자등록증/통장사본 PDF 업로드 구조, 정산 계좌 구조, 통신판매업 신고 정책, 품목군별 증빙 정책, 서비스 멤버십 구조, role assignment 구조, `/operator/suppliers` 정책, KPA/GlycoPharm/K-Cosmetics 가입 흐름.

---

## 9. 테스트 시나리오

### 9.1 프론트 가입신청 검증
| 케이스 | 기대 |
|--------|------|
| 회사명/대표자명/담당자명/사업장주소 누락 | 가입 신청 불가, 누락 안내 |
| 담당자 연락처 9자리 이하 | 가입 신청 불가, 형식 안내 |
| 사업자등록번호/세금계산서/종목/사업자유형/개업일 누락 | 가입 신청 가능 |
| 필수항목 모두 입력 | 가입신청 가능 |

### 9.2 백엔드 직접 호출 (`POST /api/v1/auth/register`, service=neture/role=supplier)
| 케이스 | 기대 |
|--------|------|
| 회사명/대표자명/담당자명/담당자연락처/사업장주소 누락 | 400 |
| 담당자 연락처 9자리 이하 | 400 |
| 필수항목 모두 존재 | 201 Created |
| role=partner / store_owner | 기존 동작 유지 |
| service≠neture | 기존 동작 유지 |

### 9.3 회귀 확인
| 서비스/역할 | 기대 |
|------------|------|
| Neture supplier | 신규 필수 검증 적용 |
| Neture partner / store_owner | 기존 기준 유지 |
| KPA / GlycoPharm / K-Cosmetics 가입 | 영향 없음 |

### 9.4 운영자 결과 모달
| 케이스 | 기대 |
|--------|------|
| results 성공 항목 존재 | 성공 메시지 |
| results 실패 항목 존재 | 실패 메시지 |
| results 빈 배열 | "처리 대상 없음" |
| results undefined/비정상 | 성공 오표시 안 함 |

---

## 10. 완료 기준

1. Neture supplier 가입신청 최소 필수항목이 백엔드에서 검증된다.
2. 필수항목 누락 시 `/auth/register`가 400으로 거절한다.
3. 프론트 가입모달에서 동일 기준으로 버튼 활성/비활성이 동작한다.
4. 누락 항목 안내가 사용자에게 표시된다.
5. 사업자등록번호·세금계산서·정산·증빙 항목은 가입신청 필수로 올라가지 않는다.
6. KPA/GlycoPharm/K-Cosmetics 가입 흐름에 영향이 없다.
7. `BulkResultModal`이 빈 results를 성공으로 표시하지 않는다.
8. 타입체크/빌드 검증 통과.
9. 변경 범위가 본 WO 대상 파일로 제한된다.

---

## 11. 권장 커밋 메시지
```text
fix(neture): enforce supplier signup required fields
```

---

## 12. 후속 분리 후보

1. `WO-O4O-NETURE-OPERATOR-MEMBER-BULK-ACTION-TARGET-GUARD-V1` — 운영자 일괄 승인 대상 필터 정밀화, 회원/공급자 승인 UX 분리.
2. `WO-O4O-NETURE-SUPPLIER-ONBOARDING-STATUS-VISIBILITY-V1` — 승인 후 온보딩 미완료 항목 가시화.
3. `WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1` — 품목군별 증빙 제출/검토 구조 확장.

---

*Date: 2026-06-18 · WO · 작성 완료(미착수) · Neture supplier 가입 게이트 프론트+백엔드 · 사업자등록번호 온보딩 유지 · 선행 IR-...-AUDIT-V1 · DB/온보딩/타서비스 무변경.*
