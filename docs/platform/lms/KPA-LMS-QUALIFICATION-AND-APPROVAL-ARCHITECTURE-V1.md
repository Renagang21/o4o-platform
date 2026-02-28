# WO-KPA-B-LMS-QUALIFICATION-AND-APPROVAL-ARCHITECTURE-DESIGN-V1

> **작성일**: 2026-02-28
> **유형**: 설계 문서 (코드 수정 없음)
> **상태**: Draft — 구현 전 리뷰 필요

---

## 0. 설계 배경 및 제약 조건

### 0.1 WO 목적

KPA 분회 서비스에서 LMS 강사 자격 부여 및 강좌 생성 승인을 **2단계 모델**로 설계한다.

| 단계 | 설명 |
|------|------|
| **Stage 1** | 강사 자격 부여 (member → apply → branch admin approve → instructor) |
| **Stage 2** | 강좌 생성 승인 (instructor → request → branch admin approve → course published) |

### 0.2 핵심 제약 (FROZEN Baseline 충돌 분석)

#### LMS Instructor Role v1 Freeze (2026-02-11)

> 참조: `docs/platform/lms/LMS-INSTRUCTOR-ROLE-V1-FREEZE.md`

**v1에서 금지된 항목 중 본 설계와 충돌하는 것:**

| # | 금지 항목 | 본 설계 영향 | 해결 전략 |
|---|----------|-------------|----------|
| 2 | 강좌 단위 승인 워크플로우 | Stage 2 직접 충돌 | **KPA Extension 테이블로 우회** |

#### Core-Extension Boundary 원칙

> 참조: `docs/platform/lms/LMS-CORE-EXTENSION-PRINCIPLES.md`

```
Extension → Core (허용)
Core → Extension (금지)
Extension → Extension (금지)
```

**해결 전략:**
- Stage 2의 "강좌 생성 승인"은 LMS Core의 Course 엔티티에 승인 필드를 추가하는 것이 **아니라**,
  KPA Extension 레이어에 `kpa_course_requests` 테이블을 생성하여 **사전 승인 게이트**를 구현한다.
- 승인 완료 후 Extension이 Core의 `CourseService.createCourse()`를 호출하는 방식.
- **LMS Core 테이블/엔티티/API 수정 없음** → v1 Freeze 준수.

### 0.3 기존 LMS 구조 요약 (현황)

| 항목 | 현재 상태 |
|------|----------|
| 강사 지원 | `InstructorApplication` (lms_instructor_applications) — 플랫폼 전역, kpa:admin 승인 |
| 강사 역할 | `lms:instructor` via RoleAssignment |
| 강좌 생성 | instructor → draft → publish (승인 없음) |
| 강좌 승인 | 없음 (v1에서 금지) |
| 수강 승인 | instructor가 자기 강좌의 PENDING enrollment 승인 |
| Guard | `requireInstructor` — lms:instructor OR kpa:admin |

---

## 1. ERD 설계 초안

### 1.1 신규 테이블

#### `kpa_instructor_qualifications` (KPA Extension 테이블)

KPA 조직 내 강사 자격 신청 및 승인 추적.
기존 `lms_instructor_applications`와 **별도** — KPA 조직 컨텍스트 + 분회 admin 승인 경로.

```
┌─────────────────────────────────────────────────────────────┐
│ kpa_instructor_qualifications                                │
├─────────────────────────────────────────────────────────────┤
│ id                UUID        PK  DEFAULT uuid_generate_v4()│
│ user_id           UUID        FK → users.id    NOT NULL     │
│ organization_id   UUID        FK → organizations.id NOT NULL│
│ member_id         UUID        FK → kpa_members.id  NOT NULL │
│                                                              │
│ ── 신청 정보 ──                                              │
│ qualification_type VARCHAR(30) NOT NULL                      │
│   → 'pharmacist_instructor' | 'student_instructor'          │
│ license_number    VARCHAR(50)  NULL                          │
│ specialty_area    VARCHAR(100) NULL                          │
│ teaching_experience_years  INTEGER  DEFAULT 0               │
│ supporting_documents JSONB  DEFAULT '[]'                    │
│   → [{name, url, type, uploadedAt}]                         │
│ applicant_note    TEXT         NULL                          │
│                                                              │
│ ── 상태 머신 ──                                              │
│ status            VARCHAR(20) NOT NULL DEFAULT 'pending'    │
│   → 'pending' | 'approved' | 'rejected' | 'revoked'        │
│                                                              │
│ ── 심사 정보 ──                                              │
│ reviewed_by       UUID        NULL  FK → users.id           │
│ reviewed_at       TIMESTAMP   NULL                          │
│ review_comment    TEXT        NULL                           │
│ rejection_reason  TEXT        NULL                           │
│                                                              │
│ ── 해지 정보 ──                                              │
│ revoked_by        UUID        NULL  FK → users.id           │
│ revoked_at        TIMESTAMP   NULL                          │
│ revoke_reason     TEXT        NULL                           │
│                                                              │
│ ── Audit ──                                                  │
│ created_at        TIMESTAMP   DEFAULT NOW()                 │
│ updated_at        TIMESTAMP   DEFAULT NOW()                 │
├─────────────────────────────────────────────────────────────┤
│ INDEXES:                                                     │
│   idx_kiq_user_org    (user_id, organization_id) UNIQUE     │
│   idx_kiq_org_status  (organization_id, status)             │
│   idx_kiq_member      (member_id)                           │
└─────────────────────────────────────────────────────────────┘
```

**설계 근거:**
- `user_id + organization_id` UNIQUE: 한 사용자는 한 조직에서 하나의 자격만 보유
- `member_id` FK: KpaMember와 연결하여 `status='active'` 회원만 신청 가능 검증
- `organization_id`: 분회(branch) 소속 기반 — Boundary Policy 준수
- `qualification_type`: 약사/학생 구분 → 향후 자격 유형 확장 가능
- `supporting_documents`: JSONB 배열로 증빙 서류 첨부 (파일 URL 목록)

#### `kpa_course_requests` (KPA Extension 테이블)

강사가 강좌를 생성하기 전 분회 admin의 사전 승인을 받는 요청 테이블.
**LMS Core의 Course 엔티티와 독립** — 승인 후 Core API를 통해 Course 생성.

```
┌─────────────────────────────────────────────────────────────┐
│ kpa_course_requests                                          │
├─────────────────────────────────────────────────────────────┤
│ id                UUID        PK  DEFAULT uuid_generate_v4()│
│ instructor_id     UUID        FK → users.id       NOT NULL  │
│ organization_id   UUID        FK → organizations.id NOT NULL│
│ qualification_id  UUID        FK → kpa_instructor_ NOT NULL │
│                                    qualifications.id        │
│                                                              │
│ ── 강좌 기획안 ──                                            │
│ proposed_title     VARCHAR(255) NOT NULL                    │
│ proposed_description TEXT       NOT NULL                    │
│ proposed_level     VARCHAR(20)  NOT NULL DEFAULT 'beginner' │
│   → 'beginner' | 'intermediate' | 'advanced'               │
│ proposed_duration  INTEGER      NOT NULL  (minutes)         │
│ proposed_credits   DECIMAL(5,2) DEFAULT 0                   │
│ proposed_tags      TEXT[]       DEFAULT '{}'                 │
│ proposed_metadata  JSONB        DEFAULT '{}'                │
│   → {targetAudience, prerequisites, objectives[], outline[]}│
│                                                              │
│ ── 상태 머신 ──                                              │
│ status            VARCHAR(20) NOT NULL DEFAULT 'draft'      │
│   → 'draft' | 'submitted' | 'approved' | 'rejected'        │
│   → | 'revision_requested' | 'cancelled'                    │
│                                                              │
│ ── 심사 정보 ──                                              │
│ reviewed_by       UUID        NULL  FK → users.id           │
│ reviewed_at       TIMESTAMP   NULL                          │
│ review_comment    TEXT        NULL                           │
│ rejection_reason  TEXT        NULL                           │
│ revision_note     TEXT        NULL                           │
│                                                              │
│ ── 연결 ──                                                   │
│ created_course_id  UUID       NULL  FK → lms_courses.id     │
│   → 승인 후 생성된 Course의 ID (Extension→Core FK 허용)     │
│                                                              │
│ ── Audit ──                                                  │
│ submitted_at      TIMESTAMP   NULL                          │
│ created_at        TIMESTAMP   DEFAULT NOW()                 │
│ updated_at        TIMESTAMP   DEFAULT NOW()                 │
├─────────────────────────────────────────────────────────────┤
│ INDEXES:                                                     │
│   idx_kcr_instructor_org  (instructor_id, organization_id)  │
│   idx_kcr_org_status      (organization_id, status)         │
│   idx_kcr_qualification   (qualification_id)                │
│   idx_kcr_created_course  (created_course_id)               │
└─────────────────────────────────────────────────────────────┘
```

**설계 근거:**
- `qualification_id` FK: 승인된 강사 자격이 있는 사용자만 강좌 요청 가능
- `created_course_id`: 승인 후 LMS Core에 생성된 Course와 매핑 (Extension→Core FK, 허용됨)
- `proposed_*` 접두사: Core의 Course 필드와 1:1 매핑되지만 별도 컬럼으로 보관 (독립성 유지)
- `revision_requested` 상태: 보완 요청 후 재제출 허용
- `instructor_id + organization_id` 복합: Boundary Policy 준수

### 1.2 ERD 관계도

```
┌──────────────┐     ┌─────────────────────────┐     ┌──────────────────┐
│   users      │     │    kpa_members           │     │  organizations   │
│              │◄────┤  user_id                 ├────►│                  │
│              │     │  organization_id         │     │                  │
│              │     │  role (admin/operator/   │     │                  │
│              │     │        member)           │     │                  │
│              │     │  status (active/pending) │     │                  │
└──────┬───────┘     └────────────┬─────────────┘     └────────┬─────────┘
       │                          │                             │
       │  1:1 per org             │  1:1                        │
       │                          ▼                             │
       │              ┌─────────────────────────┐              │
       ├─────────────►│ kpa_instructor_          │◄─────────────┤
       │              │ qualifications           │              │
       │              │                          │              │
       │              │ user_id ─────────────────┤              │
       │              │ organization_id ─────────┤              │
       │              │ member_id                │              │
       │              │ status: pending/approved/│              │
       │              │         rejected/revoked │              │
       │              └────────────┬─────────────┘              │
       │                           │                            │
       │                           │ 1:N                        │
       │                           ▼                            │
       │              ┌─────────────────────────┐              │
       ├─────────────►│ kpa_course_requests      │◄─────────────┤
       │              │                          │              │
       │              │ instructor_id ───────────┤              │
       │              │ organization_id ─────────┘              │
       │              │ qualification_id                        │
       │              │ status: draft/submitted/                │
       │              │   approved/rejected/                    │
       │              │   revision_requested/cancelled          │
       │              │                          │              │
       │              │ created_course_id ───────┼──► lms_courses
       │              └──────────────────────────┘     (Core)
       │
       │              ┌─────────────────────────┐
       └─────────────►│ role_assignments         │  (RBAC SSOT)
                      │                          │
                      │ role: 'lms:instructor'   │
                      │ isActive: true           │
                      └──────────────────────────┘
```

### 1.3 기존 테이블 수정: 없음

| 테이블 | 수정 | 이유 |
|--------|------|------|
| `lms_courses` | 없음 | Core Freeze |
| `lms_instructor_applications` | 없음 | v1 Freeze, KPA 테이블 별도 |
| `kpa_members` | 없음 | 기존 role 필드로 충분 |
| `role_assignments` | 없음 | 기존 assignRole API 사용 |
| `lms_enrollments` | 없음 | 기존 워크플로우 유지 |

---

## 2. 상태 머신 다이어그램

### 2.1 Stage 1: 강사 자격 (kpa_instructor_qualifications.status)

```
                  ┌────────────────────────────────┐
                  │                                │
                  ▼                                │
            ┌──────────┐                          │
            │ pending  │──── branch:admin ────────┤
            │          │     rejects              │
            └────┬─────┘                          │
                 │                                │
                 │ branch:admin approves           │
                 ▼                                │
            ┌──────────┐                          │
            │ approved │                          │
            │          │                          │
            └────┬─────┘         ┌──────────┐    │
                 │               │ rejected │    │
                 │ admin revokes └──────────┘    │
                 ▼                     ▲          │
            ┌──────────┐               │          │
            │ revoked  │               │          │
            └──────────┘               │          │
                                       │          │
                                       └──────────┘
```

**전이 규칙:**

| From | To | 트리거 | 권한 | Side Effect |
|------|----|--------|------|-------------|
| (new) | pending | 회원 자격 신청 | kpa_members.status='active' | — |
| pending | approved | 분회 admin 승인 | branch:admin OR kpa:admin | `roleAssignment.assignRole('lms:instructor')` |
| pending | rejected | 분회 admin 거절 | branch:admin OR kpa:admin | rejection_reason 필수 |
| approved | revoked | 분회 admin 해지 | branch:admin OR kpa:admin | `roleAssignment.removeRole('lms:instructor')` + 활성 강좌 ARCHIVED 처리 |

**진입 조건 (pending 생성 시):**
1. `kpa_members.status = 'active'` (활성 회원)
2. `kpa_members.organization_id` = 요청 `organization_id` (소속 분회)
3. 기존 동일 `user_id + organization_id` 자격이 없거나, `status = 'rejected'`인 경우 재신청 허용

**Side Effect 상세 (approved 전이 시):**
```
1. kpa_instructor_qualifications.status = 'approved'
2. kpa_instructor_qualifications.reviewed_by = adminId
3. kpa_instructor_qualifications.reviewed_at = NOW()
4. roleAssignmentService.assignRole({
     userId: qualification.user_id,
     role: 'lms:instructor',
     assignedBy: adminId,
     scope_type: 'organization',
     scope_id: qualification.organization_id
   })
5. 알림 발송 (신청자에게 승인 알림)
```

### 2.2 Stage 2: 강좌 생성 요청 (kpa_course_requests.status)

```
            ┌─────────┐
            │  draft   │◄──── 강사가 기획안 작성 중
            └────┬────┘
                 │ 강사가 제출
                 ▼
            ┌───────────┐       branch:admin
            │ submitted │──────── rejects ────►┌──────────┐
            └─────┬─────┘                      │ rejected │
                  │                            └──────────┘
                  │ branch:admin approves
                  ▼
            ┌──────────┐
            │ approved │──── LMS Core에 Course 생성
            └──────────┘     (created_course_id 기록)

                  │ branch:admin이 보완 요청
                  ▼
         ┌────────────────────┐
         │ revision_requested │──── 강사가 수정 후 재제출 ──► submitted
         └────────────────────┘

            ┌───────────┐
            │ cancelled │◄──── 강사가 취소 (draft/submitted에서만)
            └───────────┘
```

**전이 규칙:**

| From | To | 트리거 | 권한 | Side Effect |
|------|----|--------|------|-------------|
| (new) | draft | 강사가 기획안 생성 | qualified instructor | — |
| draft | submitted | 강사가 제출 | owner instructor | submitted_at = NOW() |
| draft | cancelled | 강사가 취소 | owner instructor | — |
| submitted | approved | 분회 admin 승인 | branch:admin OR kpa:admin | **Core CourseService.create() 호출** |
| submitted | rejected | 분회 admin 거절 | branch:admin OR kpa:admin | rejection_reason 필수 |
| submitted | revision_requested | 분회 admin 보완요청 | branch:admin OR kpa:admin | revision_note 필수 |
| submitted | cancelled | 강사가 취소 | owner instructor | — |
| revision_requested | submitted | 강사가 재제출 | owner instructor | submitted_at 갱신 |
| revision_requested | cancelled | 강사가 취소 | owner instructor | — |

**Side Effect 상세 (approved 전이 시):**
```
BEGIN TRANSACTION:

1. kpa_course_requests.status = 'approved'
2. kpa_course_requests.reviewed_by = adminId
3. kpa_course_requests.reviewed_at = NOW()

4. LMS Core Course 생성:
   course = CourseService.createCourse({
     title: request.proposed_title,
     description: request.proposed_description,
     level: request.proposed_level,
     duration: request.proposed_duration,
     credits: request.proposed_credits,
     tags: request.proposed_tags,
     instructorId: request.instructor_id,
     organizationId: request.organization_id,
     isOrganizationExclusive: true,
     status: 'DRAFT',  // 강사가 레슨 추가 후 직접 publish
   })

5. kpa_course_requests.created_course_id = course.id

COMMIT;

6. 알림 발송 (강사에게 승인 알림 + 강좌 편집 안내)
```

**중요:** 승인 시 Course는 `DRAFT` 상태로 생성. 강사가 레슨을 추가한 후 직접 `publish` 한다.
이는 기존 LMS v1의 강좌 라이프사이클(draft → publish)을 그대로 유지하는 것이다.

---

## 3. API 엔드포인트 설계 목록

### 3.1 Stage 1: 강사 자격 API

**Base Path**: `/api/v1/kpa/instructor-qualifications`

| # | Method | Path | 권한 | 설명 |
|---|--------|------|------|------|
| Q1 | POST | `/instructor-qualifications` | requireAuth + activeMember | 강사 자격 신청 |
| Q2 | GET | `/instructor-qualifications/me` | requireAuth | 내 자격 현황 조회 |
| Q3 | GET | `/branches/:branchId/instructor-qualifications` | branch:admin | 분회 내 자격 신청 목록 |
| Q4 | GET | `/branches/:branchId/instructor-qualifications/pending` | branch:admin | 대기 중 신청만 |
| Q5 | PATCH | `/branches/:branchId/instructor-qualifications/:id/approve` | branch:admin | 승인 |
| Q6 | PATCH | `/branches/:branchId/instructor-qualifications/:id/reject` | branch:admin | 거절 (reason 필수) |
| Q7 | PATCH | `/branches/:branchId/instructor-qualifications/:id/revoke` | branch:admin | 해지 (reason 필수) |

**Q1 Request Body:**
```typescript
{
  organizationId: string;       // 소속 분회 ID
  qualificationType: 'pharmacist_instructor' | 'student_instructor';
  licenseNumber?: string;       // 약사면허번호
  specialtyArea?: string;       // 전문분야
  teachingExperienceYears?: number;
  supportingDocuments?: Array<{name: string; url: string; type: string}>;
  applicantNote?: string;
}
```

**Q5 Response (승인 시):**
```typescript
{
  success: true,
  data: {
    qualificationId: string;
    status: 'approved';
    roleAssigned: 'lms:instructor';
  }
}
```

### 3.2 Stage 2: 강좌 생성 요청 API

**Base Path**: `/api/v1/kpa/course-requests`

| # | Method | Path | 권한 | 설명 |
|---|--------|------|------|------|
| C1 | POST | `/course-requests` | requireAuth + qualifiedInstructor | 강좌 기획안 생성 (draft) |
| C2 | GET | `/course-requests/me` | requireAuth + qualifiedInstructor | 내 기획안 목록 |
| C3 | GET | `/course-requests/:id` | owner OR branch:admin | 기획안 상세 |
| C4 | PATCH | `/course-requests/:id` | owner + status=draft/revision | 기획안 수정 |
| C5 | POST | `/course-requests/:id/submit` | owner + status=draft/revision | 제출 |
| C6 | POST | `/course-requests/:id/cancel` | owner + status!=approved | 취소 |
| C7 | GET | `/branches/:branchId/course-requests` | branch:admin | 분회 내 기획안 목록 |
| C8 | GET | `/branches/:branchId/course-requests/pending` | branch:admin | 제출된 기획안만 |
| C9 | PATCH | `/branches/:branchId/course-requests/:id/approve` | branch:admin | 승인 → Course 생성 |
| C10 | PATCH | `/branches/:branchId/course-requests/:id/reject` | branch:admin | 거절 |
| C11 | PATCH | `/branches/:branchId/course-requests/:id/request-revision` | branch:admin | 보완 요청 |

**C1 Request Body:**
```typescript
{
  organizationId: string;
  proposedTitle: string;
  proposedDescription: string;
  proposedLevel: 'beginner' | 'intermediate' | 'advanced';
  proposedDuration: number;     // minutes
  proposedCredits?: number;
  proposedTags?: string[];
  proposedMetadata?: {
    targetAudience?: string;
    prerequisites?: string;
    objectives?: string[];
    outline?: Array<{title: string; description: string}>;
  };
}
```

**C9 Response (승인 시):**
```typescript
{
  success: true,
  data: {
    requestId: string;
    status: 'approved';
    createdCourseId: string;   // LMS Core에 생성된 Course ID
    courseEditUrl: string;      // 강사가 레슨을 추가할 편집 URL
  }
}
```

### 3.3 API 위치 결정

모든 엔드포인트는 기존 KPA 라우트 파일에 추가:

```
apps/api-server/src/routes/kpa/kpa.routes.ts
```

LMS Core의 `lms.routes.ts`는 수정하지 않는다.

---

## 4. Guard 변경 설계

### 4.1 신규 Guard: `verifyQualifiedInstructor`

```typescript
/**
 * KPA 강사 자격 보유 확인 Guard
 *
 * 확인 사항:
 * 1. lms:instructor 역할 보유 (RoleAssignment)
 * 2. kpa_instructor_qualifications.status = 'approved' (해당 조직)
 * 3. kpa:admin은 bypass
 */
async function verifyQualifiedInstructor(
  dataSource: DataSource,
  userId: string,
  organizationId: string,
  userRoles: string[]
): Promise<boolean> {
  // kpa:admin bypass
  if (userRoles.some(r => r === 'kpa:admin')) return true;

  // lms:instructor 역할 확인
  const hasInstructorRole = userRoles.includes('lms:instructor');
  if (!hasInstructorRole) return false;

  // KPA 자격 승인 확인 (조직별)
  const [qualification] = await dataSource.query(
    `SELECT id FROM kpa_instructor_qualifications
     WHERE user_id = $1 AND organization_id = $2 AND status = 'approved'
     LIMIT 1`,
    [userId, organizationId]
  );
  return !!qualification;
}
```

### 4.2 기존 Guard 수정: 없음

| Guard | 수정 여부 | 이유 |
|-------|----------|------|
| `requireInstructor` (LMS) | 없음 | Core Freeze — 기존 플랫폼 전역 instructor 체크 유지 |
| `requireKpaScope` | 없음 | 기존 scope guard 그대로 사용 |
| `verifyBranchAdmin` | 없음 | 기존 branch admin 검증 그대로 사용 |
| `requireEnrollment` | 없음 | 수강 접근 제어 변경 없음 |

### 4.3 Guard 적용 매트릭스

| API | 인증 | Scope Guard | Custom Guard |
|-----|------|-------------|--------------|
| Q1 (자격 신청) | requireAuth | — | activeMember 확인 (kpa_members.status='active') |
| Q3-Q7 (자격 관리) | requireAuth | requireKpaScope | verifyBranchAdmin |
| C1 (기획안 생성) | requireAuth | — | verifyQualifiedInstructor |
| C2-C6 (기획안 관리) | requireAuth | — | owner 확인 |
| C7-C11 (기획안 심사) | requireAuth | requireKpaScope | verifyBranchAdmin |

### 4.4 Boundary Policy 준수

모든 API는 다음 규칙을 준수:

1. **UUID 단독 조회 금지**: `WHERE id = $1` 단독 금지 → `WHERE id = $1 AND organization_id = $2` 필수
2. **Raw SQL Parameter Binding**: `$1`, `$2` 바인딩 필수 — 문자열 보간 금지
3. **Domain Primary Boundary**: `organization_id` 필터 필수
4. **Cross-domain JOIN 금지**: KPA ↔ LMS 간 직접 JOIN 없음 — Extension→Core API 호출만 허용

---

## 5. 기존 LMS 영향 분석

### 5.1 영향 없는 항목 (변경 없음)

| LMS 구성 요소 | 영향 | 근거 |
|---------------|------|------|
| `lms_courses` 테이블 | 없음 | 신규 컬럼/인덱스 추가 없음 |
| `lms_instructor_applications` | 없음 | KPA 별도 테이블 사용 |
| `lms_enrollments` | 없음 | 수강 워크플로우 변경 없음 |
| `Course` 엔티티 | 없음 | 필드 추가 없음 |
| `InstructorApplication` 엔티티 | 없음 | 그대로 보존 |
| `requireInstructor` 미들웨어 | 없음 | 기존 lms:instructor 체크 유지 |
| `requireEnrollment` 미들웨어 | 없음 | 접근 제어 변경 없음 |
| `CourseController` | 없음 | 기존 CRUD 그대로 |
| `InstructorController` | 없음 | 기존 v1 frozen API 그대로 |
| `lms.routes.ts` | 없음 | 라우트 추가/수정 없음 |
| Dormant Payment | 없음 | 결제 코드 활성화 없음 |

### 5.2 간접 영향 (주의 필요)

| 항목 | 영향 유형 | 설명 | 대응 |
|------|----------|------|------|
| `RoleAssignment` | 데이터 추가 | `lms:instructor` 역할 행 추가 (기존 패턴과 동일) | 기존 `assignRole` API 사용 — 구조 변경 없음 |
| `CourseService.createCourse()` | API 호출 | 승인 시 Course 생성 호출 | 기존 Service 인터페이스 사용 — Extension→Core 호출 허용 |
| `lms_courses.instructorId` | 데이터 참조 | 생성된 Course가 KPA 강사를 instructorId로 참조 | 기존 FK 구조와 동일 |
| `lms_courses.organizationId` | 데이터 참조 | KPA 분회 ID가 organizationId로 들어감 | 기존 필드 활용 — 수정 없음 |

### 5.3 공존 전략: 기존 InstructorApplication vs KPA Qualification

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│  기존 경로 (Platform-wide)       │     │  KPA 경로 (Organization-scoped) │
│                                  │     │                                  │
│  POST /lms/instructor/apply      │     │  POST /kpa/instructor-          │
│    → InstructorApplication       │     │        qualifications           │
│    → kpa:admin 승인              │     │    → kpa_instructor_            │
│    → lms:instructor 부여         │     │      qualifications             │
│                                  │     │    → branch:admin 승인          │
│  (v1 Frozen — 유지)              │     │    → lms:instructor 부여        │
│                                  │     │                                  │
│  대상: 전체 플랫폼 사용자        │     │  대상: KPA 분회 소속 회원만      │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

**공존 원칙:**
- 두 경로는 독립적으로 존재
- KPA 회원은 KPA 경로 사용 권장 (분회 admin 승인)
- 비-KPA 사용자는 기존 경로 사용 (kpa:admin 승인)
- 둘 다 동일한 `lms:instructor` 역할을 부여 → `requireInstructor` Guard 변경 불필요
- KPA 경로에서는 `organization_id` scope 정보가 추가로 기록됨

### 5.4 v1 Freeze 준수 확인

| Freeze 금지 항목 | 본 설계 | 위반 여부 |
|-----------------|---------|----------|
| 1. 플랫폼 자동 결제 활성화 | 미사용 | ✅ 준수 |
| 2. 강좌 단위 승인 워크플로우 | **KPA Extension 테이블로 구현, Core 수정 없음** | ✅ 준수 (Extension 레이어) |
| 3. 구독 모델 | 미사용 | ✅ 준수 |
| 4. 기간제 접근 | 미사용 | ✅ 준수 |
| 5. 할인/쿠폰 | 미사용 | ✅ 준수 |
| 6. 자동 정산 | 미사용 | ✅ 준수 |
| 7. 강사 수익 분배 엔진 | 미사용 | ✅ 준수 |
| 8. 조직별 가격 정책 | 미사용 | ✅ 준수 |
| 9. 재승인 자동 트리거 | 미사용 | ✅ 준수 |
| 10. Enrollment 자동 만료 | 미사용 | ✅ 준수 |

**핵심 근거:**
> 금지 항목 #2 "강좌 단위 승인 워크플로우"는 LMS Core 내부에 승인 필드/상태를 추가하는 것을 의미한다.
> 본 설계는 Core 외부의 KPA Extension 테이블(`kpa_course_requests`)에서 사전 승인을 처리하고,
> 승인 완료 후 Core API를 호출하여 Course를 생성하므로, Core-Extension 원칙에 따른 정당한 Extension 패턴이다.

---

## 6. Migration 전략 초안

### 6.1 DDL Migration

```sql
-- Migration: WO-KPA-B-LMS-QUALIFICATION-AND-APPROVAL-V1
-- 실행 환경: main 배포 → CI/CD 자동 실행

-- ────────────────────────────────────────────
-- Stage 1: kpa_instructor_qualifications
-- ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kpa_instructor_qualifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  member_id UUID NOT NULL REFERENCES kpa_members(id),

  qualification_type VARCHAR(30) NOT NULL,
  license_number VARCHAR(50),
  specialty_area VARCHAR(100),
  teaching_experience_years INTEGER DEFAULT 0,
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  applicant_note TEXT,

  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comment TEXT,
  rejection_reason TEXT,

  revoked_by UUID REFERENCES users(id),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoke_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_kiq_user_org
  ON kpa_instructor_qualifications(user_id, organization_id)
  WHERE status NOT IN ('rejected');

CREATE INDEX idx_kiq_org_status
  ON kpa_instructor_qualifications(organization_id, status);

CREATE INDEX idx_kiq_member
  ON kpa_instructor_qualifications(member_id);

-- ────────────────────────────────────────────
-- Stage 2: kpa_course_requests
-- ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kpa_course_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  instructor_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  qualification_id UUID NOT NULL REFERENCES kpa_instructor_qualifications(id),

  proposed_title VARCHAR(255) NOT NULL,
  proposed_description TEXT NOT NULL,
  proposed_level VARCHAR(20) NOT NULL DEFAULT 'beginner',
  proposed_duration INTEGER NOT NULL,
  proposed_credits DECIMAL(5,2) DEFAULT 0,
  proposed_tags TEXT[] DEFAULT '{}',
  proposed_metadata JSONB DEFAULT '{}'::jsonb,

  status VARCHAR(20) NOT NULL DEFAULT 'draft',

  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comment TEXT,
  rejection_reason TEXT,
  revision_note TEXT,

  created_course_id UUID,  -- FK to lms_courses 생략 (배포 순서 의존 방지)

  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kcr_instructor_org
  ON kpa_course_requests(instructor_id, organization_id);

CREATE INDEX idx_kcr_org_status
  ON kpa_course_requests(organization_id, status);

CREATE INDEX idx_kcr_qualification
  ON kpa_course_requests(qualification_id);

CREATE INDEX idx_kcr_created_course
  ON kpa_course_requests(created_course_id)
  WHERE created_course_id IS NOT NULL;
```

### 6.2 TypeORM Entity 설계 가이드

**ESM 규칙 준수 (FROZEN):**

```typescript
// ❌ FORBIDDEN
import { User } from '../../auth/entities/User.js';
@ManyToOne(() => User, (u) => u.qualifications)

// ✅ REQUIRED
import type { User } from '../../auth/entities/User.js';
@ManyToOne('User', 'id')
```

**Entity 위치:**
```
apps/api-server/src/routes/kpa/entities/
  ├── kpa-instructor-qualification.entity.ts  (신규)
  └── kpa-course-request.entity.ts            (신규)
```

**packages/lms-core/src/entities/ 수정: 없음** (Core Freeze)

### 6.3 배포 순서

```
1. [Migration] DDL 실행 (CI/CD 자동)
   → kpa_instructor_qualifications 테이블 생성
   → kpa_course_requests 테이블 생성

2. [Backend] Entity + Service + Controller 배포
   → kpa.routes.ts에 새 엔드포인트 추가

3. [Frontend] KPA Branch Dashboard에 UI 카드 추가
   → 강사 자격 관리 카드 (branch:admin)
   → 강좌 기획안 관리 카드 (branch:admin)
   → 강사 자격 신청 UI (member)
   → 강좌 기획안 작성 UI (qualified instructor)
```

### 6.4 Rollback 전략

```sql
-- Rollback (필요 시)
DROP TABLE IF EXISTS kpa_course_requests;
DROP TABLE IF EXISTS kpa_instructor_qualifications;
```

- RoleAssignment에 추가된 `lms:instructor` 행은 기존 패턴과 동일하므로 별도 정리 불필요
- Core 테이블 수정 없으므로 Core 롤백 없음

### 6.5 데이터 마이그레이션: 없음

- 기존 `lms_instructor_applications` 데이터를 `kpa_instructor_qualifications`로 옮기지 않음
- 이유: 기존 InstructorApplication은 플랫폼 전역 경로 — KPA 경로와 독립 공존
- 기존 `lms:instructor` 보유자는 그대로 유지 (KPA qualification 없이도 LMS 강사 활동 가능)

---

## 부록 A: 대시보드 카드 통합 설계

### A.1 Organization Dashboard Map 확장

```typescript
// organization-dashboard-map.ts 에 추가할 카드 키
type OrgDashboardCardKey =
  | ... (기존)
  | 'branch-instructor-qualifications'   // branch:admin 전용
  | 'branch-course-requests';            // branch:admin 전용
```

```typescript
// Layout 확장
'branch:admin': [
  'branch-status',
  'branch-member-approval',
  'branch-instructor-qualifications',  // 신규
  'branch-course-requests',            // 신규
  'operator-management',
  'branch-stats',
  'branch-events-mgmt',
  'post-management',
],
```

### A.2 Card Registry 등록

```typescript
// organization-dashboard-cards.tsx
import { InstructorQualificationPanel } from './InstructorQualificationPanel';
import { CourseRequestPanel } from './CourseRequestPanel';

const ORG_CARD_REGISTRY = {
  ...existing,
  'branch-instructor-qualifications': InstructorQualificationPanel,
  'branch-course-requests': CourseRequestPanel,
};
```

---

## 부록 B: 기존 패턴 참조

| 기존 패턴 | 본 설계 적용 |
|----------|-------------|
| `KpaOrganizationJoinRequest` (approval → org-core sync) | `kpa_instructor_qualifications` (approval → RBAC sync) |
| `ForumCategoryRequest` (approval → resource creation) | `kpa_course_requests` (approval → Course creation) |
| `InstructorApplication` (approval → role assignment) | `kpa_instructor_qualifications` (동일 패턴, org-scoped) |
| `verifyBranchAdmin()` (branch admin verification) | 동일 헬퍼 재사용 |
| `BranchMemberApprovalPanel` (inline approval UI) | 동일 UI 패턴 적용 |

---

## 부록 C: 문서 참조

| 문서 | 역할 |
|------|------|
| `docs/platform/lms/LMS-INSTRUCTOR-ROLE-V1-FREEZE.md` | v1 Freeze 경계 정의 |
| `docs/platform/lms/LMS-CORE-EXTENSION-PRINCIPLES.md` | Core-Extension 분리 원칙 |
| `docs/platform/lms/LMS-CORE-CONTRACT.md` | Core 인터페이스 계약 |
| `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` | Boundary Policy 5대 규칙 |
| `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` | RBAC SSOT 동결 선언 |
| `docs/baseline/KPA-ROLE-MATRIX-V1.md` | KPA 역할 매트릭스 |
| `docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md` | KPA 3-서비스 구조 |

---

*Draft: 2026-02-28*
*Author: Claude Code (WO-KPA-B-LMS-QUALIFICATION-AND-APPROVAL-ARCHITECTURE-DESIGN-V1)*
*Status: Design Document — No Code Changes*
