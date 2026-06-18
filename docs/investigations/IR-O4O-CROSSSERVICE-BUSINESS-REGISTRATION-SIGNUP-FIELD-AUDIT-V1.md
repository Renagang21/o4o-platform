# IR-O4O-CROSSSERVICE-BUSINESS-REGISTRATION-SIGNUP-FIELD-AUDIT-V1

## 1. 목적

공급자/사업자 가입·등록 화면이 실제 사업자등록증 및 세금계산서 수신에 필요한 정보 중심으로 구성되어 있는지 조사한다.

사용자 기준:

- 공급자 등록 화면에 `업종` 선택 필드는 필요 없다.
- 다른 서비스의 사업자 등록 화면도 동일 기준으로 본다.
- 현행 `종목` + `사업자 유형` 구성은 `업종/업태`가 아니라, 사업자등록증 기준 `업태` + `종목`으로 정리되어야 한다.
- 기본 수집 정보는 사업자등록증 상의 내용 + 세금계산서 + 회사전화/이메일 + 담당자/담당자 전화/담당자 이메일 수준이면 충분하다.
- 제품/품목군 증빙 파일 요구와 사업자 기본 등록 정보는 분리한다.

## 2. 조사 범위

가입/등록 단계에서 사업자 정보를 입력하는 대표 화면을 대상으로 한다.

- Neture 공급자/파트너/매장 경영자 가입 모달
  - `services/web-neture/src/components/RegisterModal.tsx`
- GlycoPharm 약국 경영자 가입 모달
  - `services/web-glycopharm/src/pages/auth/RegisterFlowModal.tsx`
- K-Cosmetics 판매자 가입 페이지
  - `services/web-k-cosmetics/src/pages/auth/RegisterPage.tsx`
- KPA Society 개설약사 가입 모달
  - `services/web-kpa-society/src/components/RegisterModal.tsx`
- 공통 사업자등록증 입력 컴포넌트
  - `packages/account-ui/src/components/BusinessRegistrationFields.tsx`
- 공통 가입 DTO
  - `apps/api-server/src/modules/auth/dto/register.dto.ts`

## 3. Canonical 기준

### 3.1 유지해야 할 정보

가입/등록 화면에서 사업자 식별과 이후 세금계산서/계약/정산 안내에 필요한 기본 항목은 다음 수준으로 본다.

- 상호/회사명/사업장명
- 대표자명
- 사업자등록번호
- 사업장 주소/상세주소
- 업태
- 종목
- 개업일
- 세금계산서 수신 이메일
- 회사전화 또는 사업장 전화
- 회사 이메일 또는 대표 업무 이메일
- 담당자명
- 담당자 전화
- 담당자 이메일

### 3.2 제거/정리 대상

- `업종`이라는 라벨의 서비스 분류형 select
  - 예: 화장품/건강식품/의료기기/식품/기타
  - 이는 사업자등록증의 업태/종목이 아니라 내부 서비스 카테고리 선택에 가깝다.
- `사업자 유형`을 사업자등록증 핵심 표기 항목처럼 노출하는 UI
  - 사업자등록증 기본 항목 정렬에서는 `업태`와 `종목`이 우선이다.
  - 필요하면 세무/정산 보조 필드로 후순위 optional 처리한다.

## 4. 서비스별 현재 상태

### 4.1 Neture 공급자 가입

현재 Neture 공급자 가입 화면은 `companyName`, `representativeName`, `businessAddress`, `businessAddressDetail`, `contactName`, `contactPhone`, `businessNumber`, `taxInvoiceEmail`을 입력받는다. 여기에 별도 `업종` select가 있고, 값은 `cosmetics`, `health`, `medical`, `food`, `other`이다.

또한 공통 `BusinessRegistrationFields`를 부분 사용하여 `businessItem`, `businessEntityType`, `businessStartDate`만 추가 렌더링하고 있다. 주석상 기존 `businessType` select는 canonical `업태`와 다르므로 그대로 유지한다고 되어 있으나, 사용자 기준에서는 바로 이 지점이 오해를 만든다.

판정: 불일치.

문제:

- 공급자 등록에 `업종` select가 노출된다.
- 실제 필요한 `업태` free text가 빠져 있다.
- `종목` + `사업자 유형` + `개업일`은 있으나, 라벨 흐름이 사업자등록증 원문 구조와 맞지 않는다.
- 회사전화/회사 이메일/담당자 이메일이 없다.

### 4.2 Neture 매장 경영자/파트너 가입

Neture 매장 경영자 가입에도 `업종` select가 노출된다. 파트너 가입에는 `활동 분야`라는 이름으로 같은 계열 select가 노출된다.

판정: 사업자 등록 정보로는 불일치. 단, 파트너의 `활동 분야`는 사업자등록증 항목이 아니라 서비스 활동 분류라면 별도 섹션으로 분리 가능하다.

### 4.3 GlycoPharm 약국 경영자 가입

GlycoPharm 약국 경영자 가입은 `약국명`, `대표자명`, `사업자등록번호`, `세금계산서 이메일`, `사업자등록증 표준 4 필드`, 주소를 입력받는다.

공통 `BusinessRegistrationFields`를 전체 사용하므로 `업태`, `종목`, `사업자 유형`, `개업일`이 모두 노출된다.

판정: 부분 불일치.

좋은 점:

- 사업자등록증 기준의 `업태`와 `종목`이 이미 존재한다.
- 세금계산서 이메일과 주소가 존재한다.

문제:

- `사업자 유형`이 가입 단계에서 과도하게 앞에 나온다.
- 약국/회사 전화, 담당자명, 담당자 전화, 담당자 이메일, 회사 이메일이 부족하다.
- `businessCategory` legacy 동기화가 남아 있어 종목 의미와 혼동될 수 있다.

### 4.4 K-Cosmetics 판매자 가입

K-Cosmetics 판매자 가입은 `상호명`, `사업자등록번호`, 공통 `BusinessRegistrationFields` 전체를 노출한다. 따라서 `업태`, `종목`, `사업자 유형`, `개업일`이 보인다.

판정: 부분 불일치.

좋은 점:

- `업종` select는 없다.
- `업태`와 `종목`은 존재한다.

문제:

- 사업자 기본 등록 화면으로 보기에는 대표자명, 사업장 주소, 세금계산서 이메일, 회사전화, 회사 이메일, 담당자명/전화/이메일이 부족하다.
- `사업자 유형`이 가입 단계에서 불필요하게 강조될 수 있다.

### 4.5 KPA Society 개설약사 가입

KPA 개설약사 가입은 `약국명`, `사업자등록번호`, `대표자명`, `담당자명`, `세금계산서 이메일`, 공통 `BusinessRegistrationFields`, 약국전화, 담당자전화, 사업장 주소를 입력받는다.

판정: 가장 근접하나 부분 불일치.

좋은 점:

- 약국명, 대표자명, 사업자등록번호, 주소, 세금계산서 이메일, 전화, 담당자명이 존재한다.
- `업태`와 `종목`도 존재한다.

문제:

- 담당자 이메일과 회사/약국 이메일이 없다.
- `사업자 유형`이 가입 단계에서 과도하게 노출될 수 있다.

## 5. 공통 컴포넌트 상태

`BusinessRegistrationFields`는 4개 필드를 canonical로 정의한다.

- `businessType`: 업태
- `businessItem`: 종목
- `businessEntityType`: 사업자 유형
- `businessStartDate`: 개업일

컴포넌트 자체의 `업태`/`종목` 정의는 맞다. 다만 현재 서비스별 사용 방식에서 `사업자 유형`이 기본 포함되기 때문에 가입 화면에서 사업자등록증 핵심 항목보다 세무 분류 항목처럼 보이는 문제가 생긴다.

판정: 컴포넌트 자체는 재사용 가능. 단, 가입 화면에서는 `includeFields={['businessType', 'businessItem', 'businessStartDate']}` 중심으로 사용하고 `businessEntityType`은 후순위 optional 또는 별도 관리 화면으로 낮추는 방향이 적합하다.

## 6. Backend DTO 상태

공통 `RegisterRequestDto`는 `businessType`, `businessItem`, `businessEntityType`, `businessStartDate`, `taxInvoiceEmail`, `contactName`, `managerPhone`, `businessAddress`, `businessAddressDetail` 등을 optional로 수용한다.

판정: DTO는 대체로 수용 가능. 다만 회사전화, 회사 이메일, 담당자 이메일을 canonical field로 추가할지 여부는 저장 엔티티/승인 화면까지 함께 확인해야 한다.

## 7. 1차 결론

현재 등록 화면은 서비스별로 편차가 크며, 사용자 기준의 “사업자등록증 상의 내용 + 세금계산서 + 회사/담당자 연락처” 구조와 완전히 맞지 않는다.

특히 Neture 공급자 가입의 `업종` select는 제거 또는 다른 의미의 내부 분류로 분리되어야 한다. 공급자 등록 화면에는 사업자등록증 기준 `업태`와 `종목` free text를 노출하는 것이 맞다.

## 8. 수정 방향 제안

### 후보 A — 가입 화면 최소 정렬

- Neture 공급자 `업종` select 제거.
- Neture 공급자에 공통 `BusinessRegistrationFields` 중 `businessType`, `businessItem`, `businessStartDate` 렌더.
- 가입 단계의 `사업자 유형`은 제거하거나 선택 후순위로 낮춤.
- 4서비스 사업자 가입 화면에 연락처 필드 보강:
  - companyPhone 또는 businessPhone
  - companyEmail 또는 businessEmail
  - contactEmail
- 기존 backend optional DTO와 저장 흐름이 수용 가능한지 확인 후 frontend-only 가능 범위를 판단.

### 후보 B — 사업자 등록 공통 섹션 신설

- `BusinessRegistrationFields`를 그대로 유지하지 않고, 가입용 `BusinessRegistrationSignupFields` 또는 `BusinessIdentityFields`를 별도 공통 컴포넌트로 만든다.
- 구성:
  - 상호/회사명
  - 대표자명
  - 사업자등록번호
  - 업태
  - 종목
  - 개업일
  - 사업장 주소
  - 세금계산서 이메일
  - 회사전화/이메일
  - 담당자명/전화/이메일
- 서비스별 명칭만 override:
  - KPA/GlycoPharm: 약국명
  - Neture: 회사명
  - K-Cosmetics: 상호명/매장명

권장: 후보 B. 이유는 4서비스가 모두 사업자 등록 화면의 항목과 순서가 달라졌고, 단순 라벨 수정만으로는 다시 drift가 생길 가능성이 높기 때문이다.

## 9. 후속 WO 후보

`WO-O4O-CROSSSERVICE-BUSINESS-REGISTRATION-SIGNUP-FIELD-ALIGNMENT-V1`

범위 제안:

1. read/write schema 저장 가능성 확인
2. 가입용 공통 사업자 섹션 설계
3. Neture 공급자 `업종` 제거
4. 4서비스 사업자 등록 화면을 사업자등록증/세금계산서/연락처 기준으로 재배열
5. operator 승인 상세 화면에서 새 연락처 필드 표시 여부 확인
6. smoke: 4서비스 가입 화면 렌더 + payload 확인

## 10. 비범위

- 제품 품목군 승인/증빙 파일 정책 변경
- 공급자 온보딩 KYC 문서 정책 변경
- 기존 승인 상태/역할/RBAC 변경
- 사업자등록증 파일 업로드 강제화

---

## 11. FORM-ALIGNMENT-V1 실제 구현 범위 확인 (read-only 보강, 2026-06-18)

> 본 섹션은 §8~§9 의 "후속 WO" 를 실제 코드/커밋 기준으로 재확인한 결과다. **기존 `WO-O4O-CROSSSERVICE-BUSINESS-REGISTRATION-FORM-ALIGNMENT-V1`(이미 main 반영) 이 어디까지 했고 무엇이 남았는지**를 고정한다. 코드 수정 0.

### 11.1 FORM-ALIGNMENT-V1 이 한 것 (커밋 2개, 별도 문서 없음)

| Step | 커밋 | 내용 |
|------|------|------|
| Step1 Backend | `1c64b2047` | `register.dto.ts` 에 `businessEntityType`/`businessStartDate` 추가 + `auth-register.controller`(신규·기존 양 flow) + `auth-account.controller` white-list 수용. **`businessType`(업태)/`businessItem`(종목) 은 이미 수용 중이라 추가 0.** DB/migration 0 (`users.businessInfo` JSONB). |
| Step2 Frontend | `8dc5a135d` | 4서비스 가입폼(neture/glycopharm/k-cosmetics/kpa)에 공통 `BusinessRegistrationFields` 로 사업자등록증 cert 필드 렌더 추가. |

→ **FORM-ALIGNMENT-V1 = "사업자등록증 4필드(업태/종목/사업자유형/개업일) 를 4서비스 폼 + 백엔드 DTO 에 도입"까지.** 다음 3가지는 **처리하지 않음**: ① 업종 select 제거 ② 연락처 필드 보강 ③ 사업자유형 가입단계 후순위화.

### 11.2 AUDIT(§4) 대비 정정 — 실측 결과

- **업종 select 는 전 서비스 공통 문제가 아니라 Neture 에만 존재한다.**
  - Neture: supplier(700–714), store_owner(609–622) = `업종` select / partner(837–852) = `활동 분야` select. 값 `cosmetics/health/medical/food/other`.
  - GlycoPharm / K-Cosmetics / KPA: 업종 select **없음** — 이미 `BusinessRegistrationFields` 로 `업태(businessType free-text)`/`종목`/`사업자유형`/`개업일` 4필드 노출 중.
- **Neture supplier 만 `업태(businessType)` 가 빠져 있다.** `includeFields={['businessItem','businessEntityType','businessStartDate']}` 로 3필드만 렌더(업태 제외). 기존 카테고리형 `업종` select 가 업태 자리를 대체하고 있어 사업자등록증 원문과 불일치.
- **연락처 3필드(`companyPhone`/`companyEmail`/`contactEmail`)는 4서비스 전부 부재** = 공통 delta.
- 세금계산서 이메일: K-Cosmetics 만 부재(neture/glycopharm/kpa 보유).

### 11.3 남은 Delta 매트릭스 (현재 코드 실측)

| Delta | Neture | GlycoPharm | K-Cosmetics | KPA | FORM-ALIGN |
|------|:--:|:--:|:--:|:--:|:--:|
| 업종 select 제거 | ❗3곳 존재 | 없음 | 없음 | 없음 | ❌ |
| 업태(businessType) 노출 | ❌Neture만 빠짐 | ✅ | ✅ | ✅ | ⚠️ |
| 사업자유형 후순위화 | 노출 | 노출 | 노출 | 노출 | ❌(오히려 추가) |
| 회사전화 | ❌ | ❌ | ❌ | ❌ | ❌ |
| 회사이메일 | ❌ | ❌ | ❌ | ❌ | ❌ |
| 담당자 이메일 | ❌ | ❌ | ❌ | ❌ | ❌ |
| 세금계산서 이메일 | ✅ | ✅ | ❌ | ✅ | — |

### 11.4 WO 시퀀싱 (확정)

1. **(소·안전, 다음 작업) `WO-O4O-NETURE-SUPPLIER-BUSINESS-TYPE-SELECT-REMOVE-V1`** — Neture **공급자** 가입 화면 한정. 업종 select 제거 + `BusinessRegistrationFields` 에 `businessType`(업태) 포함 → 업태/종목/개업일 정렬. `businessEntityType` 유지(후순위화 보류). **store_owner 업종 / partner 활동분야는 건드리지 않음**(범위 흐림 방지, 후속 판단).
2. **(중·횡단, 별도 WO) 4서비스 연락처 필드 보강** — 회사전화/회사이메일/담당자이메일. 공유 컴포넌트(`BusinessRegistrationFields`) 또는 §8 후보B(`BusinessIdentityFields` 신설) 결정 + DTO/저장/operator 승인상세 확인. **Shared Module 변경 → 4서비스 소비처 전수 확인 필수**(CLAUDE.md Shared Module Change Rule).
3. (소·선택) 사업자유형 가입단계 격하 — 2번과 묶음 권장.

---

*보강: 2026-06-18 · read-only · FORM-ALIGNMENT-V1=4필드 도입까지 · 업종 select=Neture only(정정) · 연락처 3필드=전 서비스 공통 부재 · 다음 WO=WO-O4O-NETURE-SUPPLIER-BUSINESS-TYPE-SELECT-REMOVE-V1(공급자 한정).*
