# KPA-Society Phase 2: Membership Data Model

> **Phase 2 설계 문서 — 구현 코드/SQL 없음**
>
> 작성일: 2026-02-06
> 상위 Work Order: WO-KPA-SOCIETY-PHASE2-MEMBERSHIP-DATAFLOW-V1

---

## 1. Account ↔ Service Membership 분리 원칙

### 1.1 핵심 개념

```
Account (계정)
  = "이 사람이 누구인가" (식별)

Service Membership (서비스 멤버십)
  = "이 사람이 어떤 서비스에 어떤 자격으로 참여하는가" (자격)
```

- **Account 1개** → **Membership 0..N개** (서비스마다 독립)
- Account 생성 = 로그인 가능
- Membership 생성 = 서비스 이용 가능

### 1.2 현행과의 대응

| 개념 | 현행 엔티티 | 비고 |
|------|-----------|------|
| Account | `User` (auth-core) | 이미 존재 |
| SVC-A Membership | `KpaMember` | 이미 존재하나, Account와 역할이 혼재 |
| SVC-B Membership | 없음 | 데모이므로 불필요 |
| SVC-C Membership | 없음 | 분회별 회원 분리 미구현 |

---

## 2. Account 모델 (공통 계정)

### 2.1 Account 개념 정의

Account는 **모든 서비스에서 공유되는 사용자 식별 정보**를 담는다.

| 필드 | 책임 | 변경 주체 | 서비스 종속 여부 |
|------|------|----------|----------------|
| id | 고유 식별 | 시스템 | X |
| email | 로그인 키 | 사용자 | X |
| password | 인증 | 사용자 | X |
| name | 표시 이름 | 사용자 | X |
| firstName, lastName | 실명 | 사용자 | X |
| phone | 연락처 | 사용자 | X |
| avatar | 프로필 사진 | 사용자 | X |
| status | 계정 상태 | 운영자/시스템 | X |
| isActive | 활성 여부 | 시스템 | X |
| isEmailVerified | 이메일 인증 | 시스템 | X |
| provider, provider_id | 소셜 로그인 | 시스템 | X |
| createdAt, updatedAt | 타임스탬프 | 시스템 | X |

### 2.2 Account에 두지 않는 것 (Membership으로 이동 대상)

| 현재 User 필드 | 이동 대상 | 이유 |
|---------------|----------|------|
| `pharmacistFunction` | SVC-A Membership | 약사회 서비스 특화 |
| `pharmacistRole` | SVC-A Membership | 약사회 서비스 특화 |
| `serviceKey` | 제거 대상 | Membership 존재 여부로 대체 |
| `role` (UserRole) | Membership별 role | 서비스마다 역할이 다름 |
| `roles[]` | Membership별 role | 서비스마다 역할이 다름 |
| `businessInfo` | SVC-C 또는 약국 Membership | 사업자 정보는 서비스 특화 |

### 2.3 약사/약대생 구분: Account에 둘 것인가, Membership에 둘 것인가?

**판단: Membership에 둔다**

| 근거 | 설명 |
|------|------|
| 약대생은 졸업 후 약사가 됨 | 시간에 따라 변하는 자격이므로 Account에 고정하면 안 됨 |
| 서비스마다 구분 방식이 다를 수 있음 | 커뮤니티는 약사/약대생, 분회는 정회원/준회원 등 |
| Account는 "누구인가"만 담아야 함 | 자격은 Membership의 책임 |

---

## 3. Service Membership 모델

### 3.1 공통 필드 (모든 서비스 Membership에 적용)

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | UUID | O | 고유 식별자 |
| account_id | UUID FK | O | Account(User) 연결 |
| service_key | string | O | 서비스 식별 (svc-a, svc-b, svc-c) |
| membership_type | string | O | 서비스 내 회원 유형 |
| status | enum | O | pending / active / suspended / withdrawn |
| joined_at | date | X | 가입 승인일 (pending → active 전환 시) |
| created_at | timestamp | O | 신청일 |
| updated_at | timestamp | O | 수정일 |

### 3.2 Membership Status 정의

| 상태 | 의미 | 전이 가능 대상 |
|------|------|--------------|
| `pending` | 신청 완료, 승인 대기 | active, withdrawn |
| `active` | 이용 가능 | suspended, withdrawn |
| `suspended` | 일시 정지 | active, withdrawn |
| `withdrawn` | 탈퇴 | (최종 상태) |

### 3.3 Account.status와 Membership.status 관계

| Account.status | Membership.status | 서비스 이용 가능? |
|---------------|-------------------|-----------------|
| ACTIVE | active | **O** |
| ACTIVE | pending | X (승인 대기) |
| PENDING | pending | X (계정도 미승인) |
| SUSPENDED | active | X (계정 정지) |
| ACTIVE | suspended | X (서비스 정지) |

**규칙**: 서비스 이용 = Account.status가 ACTIVE **AND** Membership.status가 active

---

## 4. SVC-A (커뮤니티) 특화 확장

### 4.1 SVC-A Membership Type

| membership_type | 설명 | 가입 시 필수 정보 |
|----------------|------|----------------|
| `pharmacist` | 약사 | 약사면허번호 |
| `student` | 약대생 | 재학 대학명, 학년 |

### 4.2 SVC-A 확장 필드

| 필드 | 타입 | 적용 대상 | 설명 |
|------|------|----------|------|
| license_number | varchar | pharmacist만 | 약사면허번호 |
| university_name | varchar | student만 | 재학 대학명 |
| student_year | integer | student만 | 학년 (1-6) |
| pharmacist_function | varchar | pharmacist만 | 직능 (pharmacy/hospital/industry/other) |
| pharmacist_role | varchar | pharmacist만 | 직역 (general/pharmacy_owner/hospital/other) |
| organization_id | UUID FK | 모두 | 소속 조직 (분회 등) |

### 4.3 현행 엔티티와의 대응

| 설계 개념 | 현행 엔티티 | 매핑 |
|----------|-----------|------|
| SVC-A Membership (pharmacist) | KpaMember | 거의 1:1 대응 |
| SVC-A Membership (student) | **없음** | 신규 추가 필요 |
| SVC-A Membership status | KpaMember.status | 동일 |
| pharmacist_function | User.pharmacistFunction | **위치 이동 필요** |
| pharmacist_role | User.pharmacistRole | **위치 이동 필요** |

### 4.4 약국 개설자(pharmacy_owner) 위치

**판단: SVC-A Membership의 pharmacist_role 필드에 유지**

| 근거 | 설명 |
|------|------|
| pharmacy_owner는 약사의 직역(role) | Account 정보가 아닌 약사 자격 정보 |
| 약국 경영 서비스 접근 조건으로 사용됨 | Membership에 있어야 서비스별 판단 가능 |
| 현행 User.pharmacistRole과 동일 위치 | 이동 비용 최소화 |

---

## 5. SVC-B (지부/분회 데모) 구조

### 5.1 현행

- 독립 Membership 없음
- 커뮤니티 인증을 그대로 공유
- **제거 예정** 서비스

### 5.2 설계 판단

| 항목 | 결정 |
|------|------|
| Membership 필요 여부 | **불필요** |
| 접근 정책 | Account 로그인만으로 접근 가능 (Membership 불요) |
| 근거 | 데모이므로 승인/권한 제어 불필요. 제거 예정 |

---

## 6. SVC-C (분회 서비스) 구조

### 6.1 현행

- 독립 Membership 없음
- 커뮤니티 인증을 그대로 공유
- BranchAdminAuthGuard는 글로벌 role만 체크

### 6.2 설계 (구현 없음, 구조만 정의)

| 항목 | 설계 |
|------|------|
| Membership 필요 여부 | **필요** (향후) |
| membership_type | `branch_member` / `branch_officer` |
| 분회별 분리 | organization_id로 분회 식별 |
| 접근 정책 | SVC-A Membership(active) + SVC-C Membership(active) 필요 |

### 6.3 SVC-A → SVC-C 관계

```
SVC-A Membership (pharmacist, active)
  └── SVC-C Membership (branch_member, active)
       └── organization_id = 특정 분회
```

- SVC-C Membership은 SVC-A Membership이 active인 경우에만 생성 가능
- SVC-A가 suspended/withdrawn되면 SVC-C도 자동 정지

---

## 7. 데이터 관계 다이어그램

```
┌──────────────────────────────────────────────────┐
│                  Account (User)                   │
│  id, email, password, name, phone, status         │
│  (서비스 무관 공통 정보)                            │
└──────────────┬───────────────────────────────────┘
               │ 1:N
               ▼
┌──────────────────────────────────────────────────┐
│             Service Membership                    │
│  account_id, service_key, membership_type,        │
│  status, joined_at                                │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────────────┐  ┌───────────────────┐  │
│  │  SVC-A (커뮤니티)    │  │  SVC-C (분회)      │  │
│  │  type: pharmacist   │  │  type: branch_    │  │
│  │  type: student      │  │        member     │  │
│  │                     │  │  type: branch_    │  │
│  │  + license_number   │  │        officer    │  │
│  │  + university_name  │  │                   │  │
│  │  + pharmacist_      │  │  + organization_  │  │
│  │    function/role    │  │    id (분회)       │  │
│  │  + organization_id  │  │                   │  │
│  └─────────────────────┘  └───────────────────┘  │
│                                                   │
│  ┌─────────────────────┐                          │
│  │  SVC-B (데모)        │                          │
│  │  Membership 없음     │                          │
│  │  (로그인만으로 접근)  │                          │
│  └─────────────────────┘                          │
└──────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│          KpaOrganization (조직 계층)               │
│  association → branch → group                     │
│  (분회, 지부, 위원회 등)                            │
└──────────────────────────────────────────────────┘
```

---

## 8. Super Operator 개념 (구현 없음)

### 8.1 정의

Super Operator는 **프론트엔드 운영자**로서,
**여러 서비스에 걸쳐 운영 권한**을 가진다.

### 8.2 platform:admin과의 차이

| 항목 | platform:admin | Super Operator |
|------|---------------|----------------|
| 범위 | 모든 서비스 무제한 | 지정된 서비스만 |
| 권한 수준 | 시스템 관리 (DB, 인프라) | 서비스 운영 (콘텐츠, 회원, 신청) |
| 부여 방식 | 직접 DB/코드 | 관리 UI에서 지정 |
| 위치 | roles[] 배열 | Membership과 별도 또는 scope 기반 |

### 8.3 최소 책임 (프론트엔드 운영자)

- 여러 서비스의 회원 신청 승인/거부
- 서비스별 콘텐츠 관리
- 분회별 운영 현황 조회

### 8.4 현재 단계 선언

> **Super Operator는 Phase 2에서 개념만 정의한다.**
> 구현은 향후 별도 Work Order로 진행한다.
> 현재 `kpa:operator` 역할이 이 역할을 부분적으로 수행하고 있다.

---

## 9. 핵심 판단 요약

| # | 판단 항목 | 결정 | 근거 |
|---|---------|------|------|
| 1 | 약사/약대생 구분 위치 | **Membership** | 시간에 따라 변하는 자격이므로 |
| 2 | pharmacistFunction/Role 위치 | **Membership (SVC-A)** | 약사회 서비스 특화 정보 |
| 3 | pharmacy_owner 판별 위치 | **Membership의 pharmacist_role** | 약국 서비스 접근 조건 |
| 4 | SVC-B Membership | **불필요** | 데모, 제거 예정 |
| 5 | SVC-C Membership | **필요 (향후)** | 분회별 회원 분리 필요 |
| 6 | Account.status ↔ Membership.status | **독립적, AND 조건** | 둘 다 active여야 이용 가능 |
| 7 | serviceKey 필드 | **제거 대상** | Membership으로 대체 |
| 8 | Super Operator | **개념만, 구현 안 함** | 별도 Phase에서 처리 |

---

*Phase 2 설계 문서 1/3*
*상태: Complete*
