# LMS-Yaksa App Specification

> 약사회 LMS 확장 앱 스펙 문서

## Overview

| 항목 | 값 |
|------|-----|
| App ID | `lms-yaksa` |
| App Type | Extension |
| Version | 1.0.0 |
| Dependencies | lms-core, organization-core |

## 목적

약사회 보수교육 및 연수 시스템을 위한 lms-core 확장 앱.

### 핵심 기능

1. **면허/자격 정보 관리** - 약사 면허 정보 및 갱신 추적
2. **필수 교육 정책** - 조직별 필수 교육 강좌 정책 관리
3. **연수 평점 기록** - 교육 이수에 따른 평점 기록 및 집계
4. **강좌 배정** - 회원별 필수 강좌 배정 및 완료 추적

---

## Entity Design

### 1. YaksaLicenseProfile

약사 면허/자격 정보 관리

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| userId | uuid | 사용자 ID (auth) |
| organizationId | uuid | 조직 ID (지부/분회) |
| licenseNumber | varchar(50) | 면허 번호 |
| licenseIssuedAt | date | 면허 발급일 |
| licenseExpiresAt | date | 면허 만료일 |
| totalCredits | decimal(8,2) | 총 누적 평점 |
| currentYearCredits | decimal(8,2) | 당해년도 평점 |
| isRenewalRequired | boolean | 갱신 필요 여부 |

### 2. RequiredCoursePolicy

조직별 필수 교육 정책

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| organizationId | uuid | 정책 소유 조직 |
| name | varchar(255) | 정책 이름 |
| isActive | boolean | 활성 여부 |
| requiredCourseIds | jsonb | 필수 강좌 ID 목록 |
| requiredCredits | decimal(8,2) | 필요 평점 |
| targetMemberTypes | simple-array | 적용 대상 회원 유형 |
| validFrom | date | 유효 시작일 |
| validUntil | date | 유효 종료일 |

### 3. CreditRecord

연수 평점 기록

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| userId | uuid | 사용자 ID |
| courseId | uuid | 강좌 ID (lms-core) |
| creditType | enum | course_completion, attendance, external, manual_adjustment |
| creditsEarned | decimal(8,2) | 획득 평점 |
| earnedAt | date | 획득일 |
| creditYear | integer | 평점 귀속 연도 |
| certificateId | uuid | 이수증 ID (lms-core) |

### 4. YaksaCourseAssignment

강좌 배정

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| userId | uuid | 배정 대상 사용자 |
| organizationId | uuid | 배정 조직 |
| courseId | uuid | 배정 강좌 (lms-core) |
| policyId | uuid | 연결된 정책 |
| status | enum | pending, in_progress, completed, expired, cancelled |
| isCompleted | boolean | 완료 여부 |
| completedAt | timestamp | 완료일시 |
| dueDate | date | 마감일 |

---

## Dependencies

```
lms-yaksa (extension)
    ├── lms-core (core) - Course, Enrollment, Certificate
    ├── organization-core (core) - Organization
    └── membership-yaksa (optional) - Member profiles
```

---

## API Endpoints (Phase 3)

```
GET    /api/lms-yaksa/license-profiles
POST   /api/lms-yaksa/license-profiles
GET    /api/lms-yaksa/license-profiles/:id
PUT    /api/lms-yaksa/license-profiles/:id

GET    /api/lms-yaksa/required-policies
POST   /api/lms-yaksa/required-policies
PUT    /api/lms-yaksa/required-policies/:id

GET    /api/lms-yaksa/credit-records
POST   /api/lms-yaksa/credit-records
GET    /api/lms-yaksa/credit-records/summary/:userId

GET    /api/lms-yaksa/course-assignments
POST   /api/lms-yaksa/course-assignments
PUT    /api/lms-yaksa/course-assignments/:id/complete
```

---

## Permissions

| Permission ID | Description |
|---------------|-------------|
| lms-yaksa.license.read | 면허 정보 조회 |
| lms-yaksa.license.manage | 면허 정보 관리 |
| lms-yaksa.policy.read | 정책 조회 |
| lms-yaksa.policy.manage | 정책 관리 |
| lms-yaksa.credit.read | 평점 조회 |
| lms-yaksa.credit.manage | 평점 관리 |
| lms-yaksa.assignment.read | 배정 조회 |
| lms-yaksa.assignment.manage | 배정 관리 |

---

## Development Phases

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | Entity Design | ✅ Complete |
| Phase 2 | Services Implementation | ✅ Complete |
| Phase 3 | Controllers & Routes | ✅ Complete |
| Phase 4 | LMS Core Hooks Integration | ✅ Complete |
| Phase 5 | Admin UI | Pending |
| Phase 6 | Member UI | Pending |
| Phase 7 | Integration Testing | Pending |

---

## Related Documents

- [Extension App Guideline](../../app-guidelines/extension-app-guideline.md)
- [Manifest Specification](../../app-guidelines/manifest-specification.md)
- [TODO.md](../../../packages/lms-yaksa/TODO.md)

---

*최종 업데이트: 2025-12-10*
