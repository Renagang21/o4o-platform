---
id: IR-O4O-KPA-VS-GLYCOPHARM-REGISTRATION-APPROVAL-FLOW-AUDIT-V1
title: KPA-Society vs GlycoPharm 회원가입·승인 흐름 비교 — 양방향 정렬 필요성 확인
status: completed
date: 2026-05-28
domain: kpa-society / glycopharm / auth / registration / approval / cross-service-alignment
related:
  - WO-O4O-GLYCOPHARM-REGISTER-MODAL-ENTRY-FIX-V1
  - WO-O4O-GLYCOPHARM-PHARMACY-OWNER-REGISTRATION-BUTTON-E2E-FIX-V1
  - WO-O4O-GLYCOPHARM-REGISTRATION-ROLE-TYPE-ALIGNMENT-V1
  - WO-O4O-EXISTING-ACCOUNT-SERVICE-PASSWORD-SEPARATION-V1
  - WO-O4O-GLYCOPHARM-EXISTING-ACCOUNT-APPLICATION-FLOW-V1
  - CHECK-O4O-GLYCOPHARM-REGISTER-BROWSER-FAILURE-TRACE-V3
constitution:
  - CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)
  - CLAUDE.md §11 (Operator Dashboard 표준 — 서비스별 권한 매트릭스)
  - [project_canonical_twin_axis] — KPA + Neture 두 축 canonical
---

# IR-O4O-KPA-VS-GLYCOPHARM-REGISTRATION-APPROVAL-FLOW-AUDIT-V1

> KPA-Society 와 GlycoPharm 두 서비스의 회원가입 / 서비스 신청 / 승인 흐름이 **같은 구조와 UI-UX 인지** 코드 기반으로 비교한다. read-only 조사. 코드 변경 0.

---

## 1. 전체 판정

**기본 구조는 동일 (3-step 모달 + 공통 `/auth/register` endpoint + service 필드 분기 + role_assignments 기반 권한)** 이지만 **UX 디테일과 context 관리 패턴에서 양방향 차이가 존재**한다.

핵심 인사이트:

```
원래 가정:  "KPA 를 기준으로 GlycoPharm 통일"
실제:       양방향 정렬 — GlycoPharm 이 일부 UX 에서 더 발전된 상태
```

→ **KPA → GlycoPharm 일방 통일이 아니라 두 서비스의 강점을 교차 도입하는 양방향 정렬**이 정답.

---

## 2. KPA-Society 기준 흐름 요약

### 2.1 진입점 / Context

- 로그인 모달: [services/web-kpa-society/src/components/LoginModal.tsx](services/web-kpa-society/src/components/LoginModal.tsx)
- 회원가입 모달: [services/web-kpa-society/src/components/RegisterModal.tsx](services/web-kpa-society/src/components/RegisterModal.tsx)
- Context: **단일 `AuthModalContext`** (login / register / forgotPassword 통합 관리)
  - [services/web-kpa-society/src/contexts/AuthModalContext.tsx](services/web-kpa-society/src/contexts/AuthModalContext.tsx)
  - `activeModal` 상태로 'login' | 'register' | 'forgotPassword' | null 구분

### 2.2 Step 구성

- **Step 1 (select)**: 회원 유형 선택 — 2종
  - 약사 정회원 (`pharmacist_member`)
  - 약대생 준회원 (`pharmacy_student_member`)
- **Step 2 (form)**: 공통 정보 + 유형별 추가 정보 (조건부 렌더링)
- **Step 3 (success)**: 완료 화면

### 2.3 약사 정회원 직역 세분화 (KPA 고유)

`activityType` 6종 선택 (개설약사 / 근무약사 / 병원약사 / 산업약사 / 기타 / 면허 미사용)
→ 백엔드 enum 11종으로 매핑 (manufacturer / importer / wholesaler / government / school 등 포함)

### 2.4 약국 경영자 (`activityType=pharmacy_owner`) 필드

- `pharmacyName`, `businessNumber` (10자리 강제)
- **`ceoName`** (canonical) — 대표자명
- **`contactName`** (optional) — 담당자명 [KPA만]
- **`taxInvoiceEmail`** (canonical, optional)
- **`managerPhone`** (canonical, optional) [KPA만]
- 주소 3-part (`businessZipCode`, `businessAddress`, `businessAddressDetail`)

### 2.5 Validation

```typescript
// RegisterModal.tsx isFormValid()
- email, password, passwordConfirm (regex)
- phone: length 10~11 (정규식 X)
- businessNumber: length >= 10 (정확히 10자리)
- 다른 필드: truthy 체크
- email 중복 체크: 없음 (submit 시 409 만)
- missing fields 명시 안내: 없음
```

### 2.6 Submit / Success

- API: `POST /api/v1/auth/register` (공통)
- Payload service: `'kpa-society'`
- `role`: memberType ('pharmacist_member' | 'pharmacy_student_member')
- `membershipType`: memberType 중복 전송
- 성공: HTTP 201, step = 'success' 완료 화면 + "1-2 영업일 소요" 안내
- **로그인 유도 버튼 없음** (모달 닫기만)

### 2.7 운영자 승인

- URL: `/operator/members?tab=...`
- 컴포넌트: [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx)
- 데이터: `kpa_members` (primary) + `service_memberships` (fallback) join with `users` + `role_assignments`
- 승인 시 role 부여: `kpa:member` / `kpa:operator` / `kpa:admin`

---

## 3. GlycoPharm 현재 흐름 요약

### 3.1 진입점 / Context

- 로그인 모달: [services/web-glycopharm/src/components/common/LoginModal.tsx](services/web-glycopharm/src/components/common/LoginModal.tsx)
- 회원가입 모달: [services/web-glycopharm/src/pages/auth/RegisterFlowModal.tsx](services/web-glycopharm/src/pages/auth/RegisterFlowModal.tsx)
- Context: **분리된 2개 Context**
  - `LoginModalContext` (로그인 전용)
  - `RegisterModalContext` (회원가입 전용 — WO-O4O-GLYCOPHARM-REGISTER-MODAL-ENTRY-FIX-V1 신설)

### 3.2 Step 구성

- **Step 1**: 공통 정보 (모든 사용자 동일)
- **Step 2**: 참여 유형 선택 — 2종, 클릭 시 **자동으로 Step 3 진행**
  - 약사 / 근무약사 (`pharmacist`)
  - 약국 경영자 (`pharmacy_owner`)
- **Step 3**: 유형별 추가 정보 + 약관 동의 + 제출
- (별도 완료 화면 — modal 안에 표시, registrationComplete=true 시 step 무시)

### 3.3 약사 / 근무약사 (KPA 의 직역 세분화 없음)

- `licenseNumber` (선택)
- 단순 구분, backend 분기 1종 (`subRole='staff_pharmacist'`)

### 3.4 약국 경영자 필드

- `businessName`, **`representativeName`** (대표자명 — KPA의 ceoName 과 다른 명칭)
- `businessNumber` (10자리 강제)
- **`taxEmail`** (KPA의 taxInvoiceEmail 과 다른 명칭)
- `licenseNumber` (대표 약사, optional)
- `businessType`, `businessCategory` (optional)
- 주소 3-part (`zipCode`, `address1`, `address2`)
- **`contactName` / `managerPhone` 미지원** (KPA만 있음)

### 3.5 Validation (KPA 보다 강력)

```typescript
// RegisterFlowModal.tsx isStep3Valid() + getStep3MissingFields()
- phone: 정규식 `/^\d{10,11}$/` (명확)
- email blur 시 자동 중복 체크 (POST /auth/check-email)
- businessNumber: length === 10
- taxEmail: regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- missing fields amber 박스 안내 ("약국명, 사업자등록번호(10자리 숫자) 을(를) 확인해 주세요")
- 형식 오류 명시 ("사업자등록번호" vs "사업자등록번호(10자리 숫자)")
```

### 3.6 Submit / Success

- API: `POST /api/v1/auth/register` (공통)
- Payload service: `'glycopharm'`
- `role`: `'user'` (pharmacist) | `'pharmacy'` (pharmacy_owner)
- `subRole`: `'staff_pharmacist'` (pharmacist) — 이원화 패턴
- 성공: HTTP 201, `setRegistrationComplete(true)` 완료 화면
- **"로그인하기" 버튼** — 모달 닫고 LoginModal 즉시 열기 (WO-O4O-GLYCOPHARM-LOGIN-PAGE-TO-MODAL-ALIGNMENT-V1)

### 3.7 운영자 승인 (2개 화면 분리)

| 대상 | URL | 컴포넌트 | 데이터 |
|---|---|---|---|
| 약사 | `/operator/members` | GlycopharmMembersPage | `glycopharm_members` |
| 약국 경영자 | `/operator/applications` | ApplicationsPage | `glycopharm_applications` |

- 승인 시 role 부여:
  - 약사 → `glycopharm:pharmacist`
  - 약국 경영자 → `glycopharm:pharmacist` + `glycopharm:store_owner` (dual)

---

## 4. 차이점 매트릭스

| # | 항목 | KPA | GlycoPharm | 판정 |
|:-:|------|------|------------|:----:|
| 1 | **로그인 모달 위치** | AuthModalContext (중앙) | LoginModalContext (독립) | 차이 |
| 2 | **회원가입 모달 위치** | AuthModalContext (통합) | RegisterModalContext (분리) | 차이 |
| 3 | **Step 1 의미** | 회원유형 선택 | 공통 정보 | 차이 (순서 다름) |
| 4 | **Step 2 의미** | 공통 + 유형별 폼 (조건부) | 회원유형 선택 (자동 진행) | 차이 (순서 다름) |
| 5 | **Step 3 의미** | success | 유형별 폼 | 차이 |
| 6 | **회원 유형 종류** | 약사 / 약대생 (2종) | 약사 / 약국경영자 (2종) | **서비스 특화** |
| 7 | **약사 직역 세분화** | 6종 + backend 11종 enum | 단일 (`staff_pharmacist`) | **서비스 특화** |
| 8 | **Email 중복 onBlur 체크** | 없음 (submit 시만 409) | 있음 (자동 check-email) | 차이 |
| 9 | **Phone validation** | length 10~11 | regex `/^\d{10,11}$/` | 동일 결과 |
| 10 | **Password regex** | 영문 소문자 + 숫자 + 특수문자 (`/[a-z]/`) | 영문 대소문자 + 숫자 + 특수문자 (`/[a-zA-Z]/`) | 차이 |
| 11 | **businessNumber 검증** | length >= 10 | length === 10 | 동일 |
| 12 | **taxEmail 형식 검증** | 없음 (HTML5 type=email) | regex 명시 검증 | 차이 |
| 13 | **Missing fields 안내** | 없음 (버튼 disabled만) | amber 박스 명시 안내 | 차이 |
| 14 | **약국경영자 필드명** | `ceoName` / `taxInvoiceEmail` (canonical) | `representativeName` / `taxEmail` (legacy?) | 차이 |
| 15 | **담당자 정보 필드** | `contactName` + `managerPhone` 지원 | 미지원 | 차이 |
| 16 | **약대생 유형** | 지원 | 미지원 | **서비스 특화** |
| 17 | **API endpoint** | `/api/v1/auth/register` | `/api/v1/auth/register` | 동일 |
| 18 | **service 필드** | `'kpa-society'` | `'glycopharm'` | 동일 (분기용) |
| 19 | **role payload** | `role + membershipType` 중복 | `role + subRole` 이원화 | 차이 |
| 20 | **성공 화면 "로그인하기"** | 없음 | 있음 (LoginModal 즉시 호출) | 차이 |
| 21 | **운영자 승인 URL** | 단일 (`/operator/members?tab=`) | 분리 (`/operator/members` + `/operator/applications`) | 차이 |
| 22 | **운영자 데이터 출처** | `kpa_members` + service_memberships join | `glycopharm_members` + `glycopharm_applications` (분리) | 차이 |
| 23 | **role prefix** | `kpa:...` | `glycopharm:...` | 동일 (서비스별) |

---

## 5. GlycoPharm 에서 KPA 와 다르게 구현된 부분

### 5.1 KPA → GlycoPharm 일방향 (KPA 가 우월)

1. **단일 AuthModalContext** — login / register / forgotPassword 통합 관리
   - GlycoPharm: 2개 Context 분리 (LoginModalContext + RegisterModalContext)
   - 향후 ForgotPasswordContext 추가 시 GlycoPharm 의 fragmentation 심화

2. **약국경영자 담당자 정보 필드** (`contactName` + `managerPhone`)
   - GlycoPharm: 미지원 (운영자가 metadata 수동 입력 필요할 수 있음)

3. **약대생 회원 유형** — 학회/커뮤니티 다양성 수용

4. **약사 직역 세분화** — 학회 콘텐츠 매칭 정밀도

5. **필드명 canonical** (`ceoName`, `taxInvoiceEmail`)
   - GlycoPharm: `representativeName`, `taxEmail` 사용
   - 표준 정렬 필요 시 GlycoPharm 측 rename 가능

### 5.2 GlycoPharm → KPA 일방향 (GlycoPharm 이 우월)

1. **Email onBlur 자동 중복 체크** ([RegisterFlowModal.tsx:133-153](services/web-glycopharm/src/pages/auth/RegisterFlowModal.tsx#L133-L153))
   - KPA: submit 시 409 만 받음 → 사용자가 모든 필드 채운 후 다시 작성하는 UX 손실

2. **Missing fields 명시 안내** ([RegisterFlowModal.tsx:187-200](services/web-glycopharm/src/pages/auth/RegisterFlowModal.tsx#L187-L200))
   - KPA: 버튼 disabled 만 → 사용자가 어떤 필드를 채워야 할지 모름

3. **형식 오류 명시 검증** (businessNumber 10자리 / taxEmail regex)
   - KPA: businessNumber 만 검증, taxInvoiceEmail 은 HTML5 type=email 만

4. **role + subRole 이원화 payload**
   - KPA: `role + membershipType` 중복 (redundant)
   - GlycoPharm: 체계적 (`role: user/pharmacy`, `subRole: staff_pharmacist`)

5. **성공 후 "로그인하기" 버튼** — 사용자 동선 단축 (모달 닫고 LoginModal 호출)

6. **Phone 정규식 명시** — `/^\d{10,11}$/` (KPA 는 length 만)

7. **Step 분리 명확성** — Step 2 유형선택, Step 3 폼 (KPA 는 Step 2 에 유형선택 + 조건부 폼 혼재)

---

## 6. 문제를 만들 가능성이 높은 부분

### 6.1 즉시 발생 가능 위험

| 위험 | 영향 서비스 | 발생 시나리오 |
|------|:-----------:|---------------|
| 이메일 중복 후속 작성 손실 | **KPA** | 사용자가 모든 필드 채운 후 submit 시 409 → 처음부터 다시 |
| 형식 오류 silent block | **KPA** | businessNumber 짧음 / taxInvoiceEmail 무효 → HTML5 native validation 차단, 안내 없음 |
| 유형/단계 변경 시 데이터 손실 | **양쪽** | Step 2 → Step 1 / 유형 변경 시 입력 데이터 보존 여부 미확인 |
| 약사 직역 운영자 판단 부정확 | **KPA** | "산업약사" 범주 모호 (제약/제조/유통/공공/학교 포함) |

### 6.2 구조적 fragmentation 위험

| 위험 | 발생 영역 | 영향 |
|------|----------|------|
| Auth context 패턴 분기 심화 | **GlycoPharm** | ForgotPasswordContext 추가 시 3개 context 관리 |
| 필드명 canonical 분기 | **양쪽** | KPA: `ceoName` / GlycoPharm: `representativeName` — backend metadata 처리 시 두 키 모두 핸들링 필요 |
| 운영자 화면 URL 분리 | **GlycoPharm** | `/operator/members` + `/operator/applications` 2개 — 운영자가 둘 다 인지해야 함 |
| role payload 중복 vs 이원화 | **양쪽** | backend register controller 가 두 패턴 모두 처리 (분기 복잡) |

### 6.3 운영 측 위험

| 위험 | 발생 영역 |
|------|----------|
| 운영자가 KPA 와 GlycoPharm UI 차이를 모르고 KPA 패턴 학습 후 GlycoPharm 에서 헷갈림 | **양쪽** |
| KPA 의 missing fields 부재로 사용자 가입 포기율 ↑ | **KPA** |
| KPA 의 email 중복 늦은 인지로 유저 이탈 | **KPA** |

---

## 7. KPA 구조로 통일 가능한 범위

### 7.1 Low Risk (즉시 도입 가능)

**KPA 측 변경** (GlycoPharm 우월 부분 도입)

- **Email onBlur 자동 중복 체크** — KPA RegisterModal 에 `handleEmailBlur` 추가
- **Missing fields amber 안내** — `getStep2MissingFields()` 헬퍼 + Step 2 form 하단에 amber 박스
- **Phone 정규식 통일** — `/^\d{10,11}$/`
- **taxInvoiceEmail 형식 검증 추가**

**GlycoPharm 측 변경** (KPA 우월 부분 도입)

- **`ceoName` / `taxInvoiceEmail` canonical 필드명 도입** (or backend 양쪽 키 alias)
- **`contactName` + `managerPhone` optional 필드 추가**

### 7.2 Medium Risk (논의 필요)

| 항목 | 통일 방향 | 영향 |
|------|----------|------|
| Auth Context 패턴 | GlycoPharm 을 KPA 의 AuthModalContext 통합 패턴으로 | LoginModalContext + RegisterModalContext → AuthModalContext 통합 (3-5일) |
| role payload | KPA 의 `role+membershipType` 중복 제거 → `role+subRole` 이원화 (GlycoPharm 패턴) | backend register controller 분기 수정 필요 |
| Step 순서 정합 | KPA 의 "유형 선택 → 폼 (조건부)" 와 GlycoPharm 의 "공통 → 유형 → 폼" 통일 | 어느 쪽으로 통일할지 사업 결정 필요 (사용자 학습 곡선) |

### 7.3 High Risk — 통일 불가 (서비스 특화 유지)

| 항목 | 사유 |
|------|------|
| **약대생 회원 유형** | KPA 학회 특성 — GlycoPharm 에는 도입 불필요 |
| **약사 직역 6종 세분화** | KPA 학회 콘텐츠 매칭 정밀도 — GlycoPharm 에는 과도 |
| **운영자 화면 구조** (단일 vs 2개) | GlycoPharm 의 약사·약국 분리는 entity 분리 (glycopharm_members vs glycopharm_applications) 자체가 다른 흐름 — 통일 시 backend 재설계 필요 |

### 7.4 양방향 정렬 권장 사항

```
KPA 도입 (GlycoPharm → KPA):
  ✓ email onBlur 중복 체크
  ✓ missing fields amber 안내
  ✓ phone 정규식 통일
  ✓ taxInvoiceEmail 형식 검증

GlycoPharm 도입 (KPA → GlycoPharm):
  ✓ AuthModalContext 통합 (LoginModalContext + RegisterModalContext → AuthModalContext)
  ✓ contactName + managerPhone optional 필드
  ✓ 필드명 canonical (ceoName / taxInvoiceEmail) — 옵션

유지 (서비스 특화):
  ✗ KPA 약대생 / 약사 직역 6종
  ✗ GlycoPharm 약사·약국 entity 분리
```

---

## 8. 후속 WO 제안

### 8.1 우선순위 High (Low Risk, 즉시 도입)

**WO-O4O-KPA-REGISTRATION-UX-ALIGN-WITH-GLYCOPHARM-V1**
- 범위: KPA RegisterModal 에 GlycoPharm 의 강점 도입
  1. Email onBlur 자동 중복 체크 (`/auth/check-email`)
  2. Missing fields amber 박스 안내
  3. Phone 정규식 통일
  4. taxInvoiceEmail 형식 검증
- 예상 노력: 2-3일
- 영향도: Low (UX 개선, 기능 변경 없음)

**WO-O4O-GLYCOPHARM-ADD-CONTACT-FIELDS-V1**
- 범위: GlycoPharm 약국경영자 신청에 `contactName` + `managerPhone` optional 필드 추가
- 예상 노력: 1-2일
- 영향도: Low (선택 필드)

### 8.2 우선순위 Medium (구조 통일)

**WO-O4O-GLYCOPHARM-AUTH-MODAL-CONTEXT-CONSOLIDATION-V1**
- 범위: GlycoPharm 의 LoginModalContext + RegisterModalContext → AuthModalContext 통합 (KPA 패턴)
- 예상 노력: 3-5일
- 영향도: Medium (전체 auth flow 리팩토링)

**WO-O4O-KPA-REGISTRATION-PAYLOAD-ROLE-CLEANUP-V1**
- 범위: KPA payload 의 `role + membershipType` 중복 제거 → `role + subRole` 이원화 (GlycoPharm 패턴)
- 예상 노력: 2-3일
- 영향도: Medium (backend 분기 수정 필요)

### 8.3 우선순위 Low (장기 정규화)

**WO-O4O-CROSS-SERVICE-CANONICAL-FIELD-NAMING-V1**
- 범위: `ceoName` vs `representativeName`, `taxInvoiceEmail` vs `taxEmail` 등 5개 서비스 (KPA, GlycoPharm, Neture, K-Cosmetics, GlucoseView) 필드명 통일
- 예상 노력: 5-7일
- 영향도: Very High (다중 서비스 영향)

### 8.4 보류 (서비스 특화 유지)

- KPA 의 약대생 / 약사 직역 6종 → **GlycoPharm 도입 불필요**
- GlycoPharm 의 약사·약국 운영자 화면 분리 → **KPA 변경 불필요**

---

## 9. 산출물 요약

| 항목 | 결과 |
|------|------|
| 비교 영역 | 7개 핵심 질문 + 8개 코드 영역 |
| 차이점 매트릭스 | 23개 항목 — §4 |
| KPA → GlycoPharm 일방향 우월 | 5종 (auth context 통합 / 담당자필드 / 약대생 / 약사직역 / canonical 필드명) |
| GlycoPharm → KPA 일방향 우월 | 7종 (email onBlur / missing 안내 / 형식검증 / role+subRole / 로그인하기버튼 / phone regex / step 분리 명확성) |
| 통일 권장 Low Risk | 6항목 (양방향) |
| 통일 보류 (서비스 특화) | 3항목 (약대생 / 약사직역 / 운영자 화면 분리) |
| 후속 WO | High 2건 / Medium 2건 / Low 1건 |
| 코드 변경 | **없음** (조사 전용 IR) |

---

## 10. 결론

```
"GlycoPharm 을 KPA 패턴으로 통일" 이라는 단순 가정은 정확하지 않다.

실제 두 서비스는:
  - 기본 구조 (3-step / /auth/register / role_assignments) 는 같다
  - 서로 다른 영역에서 더 발전된 상태 (KPA: context통합·필드세분화, GlycoPharm: validation UX·payload체계)

따라서 정답은:
  → 양방향 정렬 (KPA 의 단점은 GlycoPharm 패턴으로 보완, GlycoPharm 의 단점은 KPA 패턴으로 보완)
  → 서비스 특화 (약대생, 약사 직역, entity 분리) 는 유지
```

다음 단계는 §8 의 후속 WO 분기 중 우선순위 High 두 건부터 단계적 진행 권장.

---

*Author: Claude (Investigation only — no code change executed)*
*Investigation date: 2026-05-28*
*Status: completed — ready for cross-service alignment WOs*
