# IR-O4O-COURSE-SYSTEM-CODE-AUDIT-V1

> **조사 유형**: Read-Only Code Audit (코드 변경 없음)
> **작성일**: 2026-03-11
> **대상**: O4O Platform 강좌/교육(Course/Education) 시스템 전체
> **범위**: DB → Entity → API → UI → 권한 → 강사 구조

---

## 목차

1. [DB 구조](#1-db-구조)
2. [Entity/Model 구조](#2-entitymodel-구조)
3. [API 구조](#3-api-구조)
4. [권한 구조](#4-권한-구조)
5. [강좌 상태 Lifecycle](#5-강좌-상태-lifecycle)
6. [UI 구조](#6-ui-구조)
7. [서비스 분리 (service_key) 분석](#7-서비스-분리-service_key-분석)
8. [접근 제한 구조](#8-접근-제한-구조)
9. [강사 구조](#9-강사-구조)
10. [현재 구현 상태 평가](#10-현재-구현-상태-평가)

---

## 1. DB 구조

### 1.1 LMS Core 테이블 (packages/lms-core)

| 테이블 | 역할 | 마이그레이션 |
|--------|------|-------------|
| `lms_courses` | 강좌 마스터 | 001 |
| `lms_lessons` | 레슨(강좌 하위) | 001 |
| `lms_enrollments` | 수강 신청/진행 | 001 |
| `lms_progress` | 레슨별 진행도 | 002 |
| `lms_certificates` | 수료증 | 002 |
| `lms_events` | 오프라인/온라인 이벤트(강의, 워크숍, 시험) | 002 |
| `lms_attendance` | 이벤트 출석 | 002 |
| `lms_content_bundles` | 콘텐츠 번들(manifest 선언) | - |

### 1.2 KPA Extension 테이블 (apps/api-server/src/routes/kpa)

| 테이블 | 역할 | 비고 |
|--------|------|------|
| `kpa_approval_requests` | **통합 승인** (course, instructor_qualification, forum_category, membership) | 현재 주력 |
| `kpa_course_requests` | 강좌 기획안 (Legacy) | 전환 중, dual-query 대상 |
| `kpa_instructor_qualifications` | 강사 자격 (Legacy) | 전환 중, dual-query 대상 |

### 1.3 주요 인덱스

```
lms_courses:
  IDX_lms_courses_organization (organizationId, status)
  IDX_lms_courses_instructor (instructorId)

lms_enrollments:
  IDX_lms_enrollments_user_course (userId, courseId) UNIQUE
  IDX_lms_enrollments_organization (organizationId)

lms_progress:
  IDX_lms_progress_enrollment_lesson (enrollmentId, lessonId) UNIQUE

lms_certificates:
  IDX_lms_certificates_user_course (userId, courseId) UNIQUE
  IDX_lms_certificates_certificateNumber (certificateNumber) UNIQUE

lms_events:
  IDX_lms_events_course_start (courseId, startAt)
  IDX_lms_events_organization (organizationId)

lms_attendance:
  IDX_lms_attendance_event_user (eventId, userId) UNIQUE

kpa_approval_requests:
  IDX_kpa_approval_requests_entity_type_org_status (entity_type, organization_id, status)
  IDX_kpa_approval_requests_requester_entity (requester_id, entity_type)
```

### 1.4 Cascade 동작

- `lms_lessons` → courseId ON DELETE CASCADE
- `lms_enrollments` → courseId ON DELETE CASCADE
- `lms_progress` → enrollmentId ON DELETE CASCADE, lessonId ON DELETE CASCADE
- `lms_certificates` → courseId ON DELETE CASCADE
- `lms_events` → courseId ON DELETE CASCADE
- `lms_attendance` → eventId ON DELETE CASCADE

### 1.5 주요 컬럼 (service_key 부재)

**LMS Core 테이블에 `service_key` 컬럼이 없다.** 모든 LMS 테이블은 `organizationId`를 Primary Boundary로 사용한다. 이는 Boundary Policy V1에서 Community/Store Ops 도메인이 `organizationId`를 사용하는 것과 일치한다.

---

## 2. Entity/Model 구조

### 2.1 LMS Core Entities (packages/lms-core/src/entities/)

#### Course.ts — 강좌

```typescript
// Enums
enum CourseStatus { DRAFT, PUBLISHED, ARCHIVED }
enum CourseLevel { BEGINNER, INTERMEDIATE, ADVANCED }

// Key Fields
id: UUID (PK)
title, description, thumbnail: string
level: CourseLevel
status: CourseStatus
duration: integer (minutes)
instructorId: UUID (FK → User)
organizationId: UUID | null (FK → Organization)
isOrganizationExclusive: boolean
isRequired, isPublished, requiresApproval: boolean
maxEnrollments, currentEnrollments: integer
startAt, endAt: timestamp | null
credits: decimal  // 연수 평점
isPaid: boolean
price: decimal | null
metadata: jsonb
tags: simple-array

// Helper Methods
isActive(), isFull(), canEnroll()
publish(), archive()
incrementEnrollments(), decrementEnrollments()
```

#### Enrollment.ts — 수강

```typescript
enum EnrollmentStatus {
  PENDING, APPROVED, REJECTED,
  IN_PROGRESS, COMPLETED, CANCELLED, EXPIRED
}

// Key Fields
id: UUID (PK)
userId, courseId: UUID (FK)
organizationId: UUID | null
status: EnrollmentStatus
progressPercentage: decimal (0-100)
completedLessons, totalLessons: integer
timeSpent: integer (minutes)
finalScore, averageQuizScore: decimal | null
enrolledAt, startedAt, completedAt, expiresAt: timestamp | null
certificateId: UUID | null

// Unique Constraint: (userId, courseId)
```

#### Lesson.ts — 레슨

```typescript
enum LessonType { VIDEO, ARTICLE, QUIZ, ASSIGNMENT, LIVE }

// Key Fields
id: UUID (PK)
courseId: UUID (FK → Course, CASCADE)
title, description: string
type: LessonType
content: jsonb  // Block Editor JSON or Markdown
videoUrl, videoThumbnail, videoDuration: nullable
attachments: jsonb  // [{name, url, type, size}]
order: integer
duration: integer (minutes)
quizData: jsonb  // {questions, passingScore, timeLimit}
isPublished, isFree, requiresCompletion: boolean
```

#### Progress.ts — 레슨별 진행도

```typescript
enum ProgressStatus { NOT_STARTED, IN_PROGRESS, COMPLETED }

// Key Fields
id: UUID (PK)
enrollmentId, lessonId: UUID (FK, CASCADE)
status: ProgressStatus
timeSpent: integer (seconds)
completionPercentage: decimal (0-100)
score: decimal | null
attempts: integer | null
quizAnswers: jsonb | null
// Unique: (enrollmentId, lessonId)
```

#### Certificate.ts — 수료증

```typescript
// Key Fields
id: UUID (PK)
userId, courseId: UUID (FK)
certificateNumber: varchar(100) UNIQUE  // CERT-{timestamp}-{random}
certificateUrl, badgeUrl: varchar(500) | null
finalScore, credits: decimal
isValid: boolean
issuedBy, issuerName, issuerTitle: string
verificationCode, verificationUrl: string
// Unique: (userId, courseId)
```

#### LMSEvent.ts — 이벤트

```typescript
enum EventType { LECTURE, WORKSHOP, EXAM, WEBINAR, LIVE_SESSION }
enum EventStatus { SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED }

// Key Fields
id: UUID (PK)
courseId, organizationId: UUID | null
title, description: string
type: EventType
status: EventStatus
startAt, endAt: timestamp
isOnline: boolean
location, onlineUrl, timezone: string
instructorId: UUID | null
attendanceCode: string  // 6-char code
maxAttendees, currentAttendees: integer
```

#### Attendance.ts — 출석

```typescript
enum AttendanceStatus { PRESENT, LATE, ABSENT, EXCUSED }

// Key Fields
id: UUID (PK)
eventId, userId: UUID (FK)
status: AttendanceStatus
checkedInAt: timestamp | null
usedCode, checkInMethod: string
geoLocation: jsonb
// Unique: (eventId, userId)
```

### 2.2 KPA Extension Entity

#### kpa-approval-request.entity.ts — 통합 승인

```typescript
enum ApprovalRequestStatus {
  draft, pending, submitted,
  approved, rejected, revision_requested,
  cancelled, revoked
}

// Key Fields
id: UUID (PK)
entity_type: varchar(50)  // 'course' | 'instructor_qualification' | 'forum_category' | 'membership'
organization_id: UUID
payload: jsonb  // 엔티티별 polymorphic data
status: ApprovalRequestStatus
requester_id, requester_name, requester_email: string
reviewed_by: UUID | null
reviewed_at: timestamp | null
review_comment, revision_note: text | null
result_entity_id: UUID | null  // 승인 후 생성된 엔티티 ID
result_metadata: jsonb | null
submitted_at, created_at, updated_at: timestamp
```

### 2.3 Entity 관계도

```
Organization ──┬──< lms_courses >──< lms_lessons
               │        │
               │        ├──< lms_enrollments >──< lms_progress
               │        │        │
               │        │        └── lms_certificates
               │        │
               │        └──< lms_events >──< lms_attendance
               │
               └──< kpa_approval_requests (entity_type discriminator)
                        │
                        ├── course → result_entity_id → lms_courses
                        ├── instructor_qualification → role_assignments (lms:instructor)
                        ├── forum_category → forum_category
                        └── membership → kpa_members

User ──┬── instructor for lms_courses (instructorId)
       ├── enrolled via lms_enrollments (userId)
       ├── certified via lms_certificates (userId)
       ├── attends via lms_attendance (userId)
       └── requests via kpa_approval_requests (requester_id)
```

### 2.4 Manifest 선언 (packages/lms-core/src/manifest.ts)

```
appId: "lms-core"
type: "core"
category: "education"
version: "1.0.0"
dependencies: [organization-core]
ownsTables: [lms_courses, lms_lessons, lms_enrollments, lms_progress,
             lms_certificates, lms_events, lms_attendance, lms_content_bundles]
permissions: [lms.read, lms.write, lms.manage, lms.instructor, lms.admin]
```

---

## 3. API 구조

### 3.1 LMS Core Routes (apps/api-server/src/modules/lms/routes/lms.routes.ts)

총 **107+ 엔드포인트**

#### Course (15)

| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| POST | /courses | requireInstructor | 강좌 생성 |
| GET | /courses | requireAuth | 목록 |
| GET | /courses/:id | requireAuth | 상세 |
| PATCH | /courses/:id | requireInstructor | 수정 |
| DELETE | /courses/:id | requireInstructor | 삭제 |
| POST | /courses/:id/publish | requireInstructor | 발행 |
| POST | /courses/:id/unpublish | requireInstructor | 비발행 |
| POST | /courses/:id/archive | requireInstructor | 보관 |

#### Lesson (8)

| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| POST | /courses/:courseId/lessons | requireInstructor | 생성 |
| GET | /courses/:courseId/lessons | requireEnrollment | 목록 |
| GET | /lessons/:id | requireEnrollment(checkLesson) | 상세 |
| PATCH | /lessons/:id | requireInstructor | 수정 |
| DELETE | /lessons/:id | requireInstructor | 삭제 |
| POST | /courses/:courseId/lessons/reorder | requireInstructor | 순서변경 |

#### Enrollment (10)

| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| POST | /courses/:courseId/enroll | requireAuth | 수강신청 |
| GET | /enrollments | requireAuth | 전체목록 |
| GET | /enrollments/me | requireAuth | 내 수강 |
| GET | /enrollments/:id | requireAuth | 상세 |
| PATCH | /enrollments/:id | requireAuth | 수정 |
| POST | /enrollments/:id/start | requireAuth | 시작 |
| POST | /enrollments/:id/complete | requireAuth | 완료 |
| POST | /enrollments/:id/cancel | requireAuth | 취소 |

#### Progress (9)

| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| POST | /progress | requireAuth | 진행도 기록 |
| GET | /progress | requireAuth | 전체목록 |
| GET | /enrollments/:enrollmentId/progress | requireAuth | 수강별 진행 |
| GET | /progress/:id | requireAuth | 상세 |
| PATCH | /progress/:id | requireAuth | 수정 |
| POST | /progress/:id/complete | requireAuth | 완료 |
| POST | /progress/:id/submit-quiz | requireAuth | 퀴즈 제출 |

#### Certificate (11)

| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| POST | /certificates/issue | requireKpaAdmin | 발급 |
| GET | /certificates | requireAuth | 전체목록 |
| GET | /certificates/me | requireAuth | 내 수료증 |
| GET | /certificates/verify/:code | (public) | 검증 |
| GET | /certificates/:id | requireAuth | 상세 |
| GET | /certificates/number/:num | requireAuth | 번호조회 |
| PATCH | /certificates/:id | requireKpaAdmin | 수정 |
| POST | /certificates/:id/revoke | requireKpaAdmin | 취소 |
| POST | /certificates/:id/renew | requireKpaAdmin | 갱신 |

#### Event (10)

| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| POST | /events | requireInstructor | 생성 |
| GET | /events | requireAuth | 목록 |
| GET | /events/:id | requireAuth | 상세 |
| PATCH | /events/:id | requireInstructor | 수정 |
| DELETE | /events/:id | requireInstructor | 삭제 |
| POST | /events/:id/start | requireInstructor | 시작 |
| POST | /events/:id/complete | requireInstructor | 완료 |
| POST | /events/:id/cancel | requireInstructor | 취소 |

#### Attendance (7)

| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| POST | /attendance/checkin | requireAuth | 체크인 |
| POST | /events/:eventId/attendance | requireAuth | 수동출석 |
| GET | /attendance | requireAuth | 목록 |
| GET | /events/:eventId/attendance | requireAuth | 이벤트별 |
| GET | /attendance/:id | requireAuth | 상세 |
| PATCH | /attendance/:id | requireAuth | 수정 |

#### Quiz (18), Survey (19), Marketing (20+)

Phase 1/2 Refoundation — 별도 서브 라우트

#### Instructor (9, WO-LMS-INSTRUCTOR-ROLE-V1)

| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| POST | /instructor/apply | requireAuth | 강사지원 |
| GET | /instructor/applications | requireKpaAdmin | 지원목록 |
| POST | /instructor/applications/:id/approve | requireKpaAdmin | 승인 |
| POST | /instructor/applications/:id/reject | requireKpaAdmin | 거절 |
| GET | /instructor/courses | requireInstructor | 내 강좌 |
| GET | /instructor/enrollments | requireInstructor | 수강자 관리 |
| POST | /instructor/enrollments/:id/approve | requireInstructor | 수강 승인 |
| POST | /instructor/enrollments/:id/reject | requireInstructor | 수강 거절 |

### 3.2 KPA Extension Controllers

#### course-request.controller.ts (C1-C11)

| ID | Method | Path | 설명 |
|----|--------|------|------|
| C1 | POST | /course-requests | 기획안 생성 (draft) |
| C2 | GET | /course-requests/me | 내 기획안 목록 |
| C3 | GET | /course-requests/:id | 기획안 상세 |
| C4 | PATCH | /course-requests/:id | 기획안 수정 |
| C5 | POST | /course-requests/:id/submit | 제출 |
| C6 | POST | /course-requests/:id/cancel | 취소 |
| C7 | GET | /branches/:branchId/course-requests | 분회 내 목록 |
| C8 | GET | /branches/:branchId/course-requests/pending | 제출된 목록 |
| C9 | PATCH | /branches/:branchId/course-requests/:id/approve | 승인 → Course 생성 |
| C10 | PATCH | /branches/:branchId/course-requests/:id/reject | 거절 |
| C11 | PATCH | /branches/:branchId/course-requests/:id/request-revision | 보완요청 |

#### instructor.controller.ts (Q1-Q7)

| ID | Method | Path | 설명 |
|----|--------|------|------|
| Q1 | POST | /instructor-qualifications | 강사자격 신청 |
| Q2 | GET | /instructor-qualifications/me | 내 자격 현황 |
| Q3 | GET | /branches/:branchId/instructor-qualifications | 분회 자격 목록 |
| Q4 | GET | /branches/:branchId/instructor-qualifications/pending | 대기 목록 |
| Q5 | PATCH | /branches/:branchId/instructor-qualifications/:id/approve | 승인 |
| Q6 | PATCH | /branches/:branchId/instructor-qualifications/:id/reject | 거절 |
| Q7 | PATCH | /branches/:branchId/instructor-qualifications/:id/revoke | 철회 |

### 3.3 Service 계층

| Service | 위치 | 역할 |
|---------|------|------|
| CourseService | modules/lms/services/ | Core 강좌 CRUD + publication |
| LessonService | modules/lms/services/ | 레슨 CRUD + 순서변경 |
| EnrollmentService | modules/lms/services/ | 수강관리 + 상태전이 |
| ProgressService | modules/lms/services/ | 레슨 진행도 + 퀴즈 |
| CertificateService | modules/lms/services/ | 수료증 발급/검증/갱신 |
| EventService | modules/lms/services/ | 이벤트 관리 |
| AttendanceService | modules/lms/services/ | 출석 관리 |
| CourseRequestService | routes/kpa/services/ | KPA 기획안 승인 워크플로 |
| InstructorService | routes/kpa/services/ | KPA 강사자격 승인 워크플로 |
| CourseController | modules/lms/controllers/ | LMS Core 강좌 컨트롤러 |

### 3.4 Dual-Query Pattern (전환기 패턴)

CourseRequestService와 InstructorService는 **Dual-Query Pattern**을 사용한다:

```
1. kpa_approval_requests (통합 테이블) 먼저 조회
2. 결과 없으면 → kpa_course_requests / kpa_instructor_qualifications (Legacy) fallback
3. 목록 조회는 양쪽 merge
```

이 패턴은 Legacy → 통합 테이블 전환 기간에 필요하며, 전환 완료 후 Legacy 쿼리를 제거해야 한다.

---

## 4. 권한 구조

### 4.1 미들웨어 Guards

| Guard | 체크 내용 | 적용 범위 |
|-------|----------|----------|
| `requireAuth` | JWT 토큰 유효성 | 모든 인증 필요 엔드포인트 |
| `requireInstructor` | `lms:instructor` role 보유 | 강좌/레슨/이벤트 관리 |
| `requireKpaAdmin` | `kpa:admin` role 보유 | 수료증 발급, 지원 관리 |
| `requireEnrollment` | 해당 강좌 수강 중 | 레슨 접근 |

### 4.2 RBAC Roles (LMS 관련)

| Role | 부여 시점 | 권한 |
|------|----------|------|
| `lms:instructor` | 강사자격 승인 시 atomically 부여 | 강좌 생성/관리, 레슨 관리, 이벤트 관리 |
| `kpa:admin` | 분회 운영자 | 수료증 발급/취소, 강사지원 관리 |
| (super admin) | 시스템 | 모든 권한 bypass |

### 4.3 lmsPermissions.ts (Stub)

`packages/lms-core/src/utils/lmsPermissions.ts`에 세분화된 권한 함수가 선언되어 있으나, **현재는 Stub 구현**:

```typescript
canCreateCourse()       // super admin or org manager
canManageCourse()       // admin, instructor, or org manager
canEnrollInCourse()     // public = anyone, org = members
canViewCourse()         // admin, public, or members
canManageEnrollments()  // admin or org manager
canIssueCertificate()   // admin, instructor, or org admin
canManageEvents()       // admin or org manager
canMarkAttendance()     // admin, instructor, or org admin
canViewLMSStatistics()  // admin or org member
```

organization-core RBAC 통합이 완료되면 이 함수들이 실제 role_assignments 테이블을 조회하게 될 예정이다.

### 4.4 서비스 레벨 권한 체크

- `CourseRequestService.createDraft()`: 강사 자격 검증 (dual-query)
- `CourseRequestService.approve()`: 분회 관리자 역할 검증
- `InstructorService.approveQualification()`: 분회 관리자 검증 + role 부여 트랜잭션
- `CourseController.isOwnerOrAdmin()`: 강좌 소유자 또는 관리자 확인

---

## 5. 강좌 상태 Lifecycle

### 5.1 LMS Core — Course Publication Lifecycle

```
DRAFT ──publish()──→ PUBLISHED ──archive()──→ ARCHIVED
  ↑                      │
  └──unpublish()─────────┘
```

- `DRAFT`: 생성 직후, 비공개
- `PUBLISHED`: 공개, 수강 가능
- `ARCHIVED`: 보관, 신규 수강 불가

### 5.2 KPA Extension — Course Request Approval Lifecycle

```
draft ──submit──→ submitted ──approve──→ approved (→ lms_courses 생성)
                      │
                      ├──reject──→ rejected
                      │
                      └──request-revision──→ revision_requested
                                                  │
                                                  └──(수정 후 재제출)──→ submitted

(어느 상태에서든) ──cancel──→ cancelled
```

### 5.3 Enrollment Lifecycle

```
                 ┌──(자동)──→ IN_PROGRESS ──complete──→ COMPLETED
enroll ──→ PENDING ──approve──→ APPROVED ──start──→ IN_PROGRESS
                 │
                 ├──reject──→ REJECTED
                 └──cancel──→ CANCELLED

(만료) ──→ EXPIRED
```

수강 완료(COMPLETED) 시 수료증(Certificate) 자동/수동 발급 가능

### 5.4 Event Lifecycle

```
SCHEDULED ──start──→ IN_PROGRESS ──complete──→ COMPLETED
    │
    └──cancel──→ CANCELLED
```

### 5.5 Instructor Qualification Lifecycle

```
(신청) ──→ pending/submitted ──approve──→ approved (+ lms:instructor role 부여)
                                    │
                                    ├──reject──→ rejected
                                    └──(이후) revoke──→ revoked (+ lms:instructor role 제거)
```

---

## 6. UI 구조

### 6.1 프론트엔드 서비스별 사용 현황

| 서비스 | LMS 사용 | 비고 |
|--------|---------|------|
| web-kpa-society | **YES** (유일) | 9개 교육 페이지 + 5 컴포넌트 |
| web-glycopharm | NO | 강좌 관련 코드 없음 |
| web-glucoseview | NO | 강좌 관련 코드 없음 |
| web-k-cosmetics | NO | 강좌 관련 코드 없음 |

### 6.2 KPA Society 교육 페이지

| 페이지 | 경로 | 데이터 소스 |
|--------|------|------------|
| `EducationPage.tsx` | /education | Real API |
| `LmsCoursesPage.tsx` | /lms/courses | Real API |
| `LmsCourseDetailPage.tsx` | /lms/courses/:id | Real API |
| `LmsLessonPage.tsx` | /lms/courses/:courseId/lessons/:lessonId | Real API |
| `LmsCertificatesPage.tsx` | /lms/certificates | Real API |
| `CourseHubPage.tsx` | /courses/hub | Real API |
| `CourseIntroPage.tsx` | /courses/:id/intro | Real API (반응형 디자인) |
| `InstructorProfilePage.tsx` | /instructors/:userId | Real API |
| `WorkLearningPage.tsx` | /work-learning | **MOCK DATA** (미구현) |

### 6.3 프론트엔드 API 클라이언트 (services/web-kpa-society/src/api/lms.ts)

```typescript
getCourses(params?)           // 강좌 목록
getCourse(id)                 // 강좌 상세
getLessons(courseId)           // 레슨 목록
getLesson(courseId, lessonId) // 레슨 상세
getMyEnrollments(params?)     // 내 수강 목록
getEnrollment(courseId)       // 수강 상태
enrollCourse(courseId)        // 수강 신청
updateProgress(courseId, lessonId, completed) // 진행도 업데이트
getMyCertificates(params?)    // 내 수료증 목록
getCertificate(id)            // 수료증 상세
downloadCertificate(id)       // 수료증 PDF
getInstructorProfile(userId)  // 강사 프로필
```

API 주석: *"Learning App은 교육/평가 도구가 아닌 순차 전달 도구"* — UI는 중립적 용어 사용

### 6.4 누락 UI

- `WorkLearningPage.tsx`: **MOCK DATA만 사용**, 실제 API 연동 없음
- 강좌 기획안(Course Request) 관리 UI: 프론트엔드에 없음 (API만 존재)
- 강사 자격 신청/관리 UI: 프론트엔드에 없음 (API만 존재)
- 이벤트/출석 관리 UI: 없음
- 퀴즈/설문 관리 UI: 없음

---

## 7. 서비스 분리 (service_key) 분석

### 7.1 Boundary Policy 대조

O4O Boundary Policy V1에 따르면:

| Domain | Primary Boundary | service_key 사용 |
|--------|:----------------:|:----------------:|
| Broadcast (CMS, Signage) | `serviceKey` | YES |
| Community (Forum) | `organizationId` | NO |
| Store Ops | `organizationId` | NO |
| Commerce | `storeId` | NO |
| **Education/LMS** | **`organizationId`** | **NO** |

### 7.2 LMS의 Boundary 전략

- **LMS Core는 `organizationId`를 Primary Boundary로 사용**
- `service_key` 컬럼이 LMS 어떤 테이블에도 존재하지 않음
- LMS Core manifest의 dependencies에 `service_key` 관련 항목 없음
- 이는 **정확한 설계**: 교육 도메인은 Community 계열로 `organizationId` 기반이 맞음

### 7.3 서비스간 격리

- LMS Core는 **서비스 무관(service-agnostic)** Core 패키지
- KPA Extension이 KPA 특화 워크플로(승인, 강사자격)를 추가
- 다른 서비스(Glycopharm, GlucoseView, K-Cosmetics)는 LMS를 사용하지 않음
- 향후 다른 서비스에서 LMS를 사용하면 `organizationId`로 자연 격리됨

---

## 8. 접근 제한 구조

### 8.1 다층 접근 제한 모델

```
Layer 1: JWT Authentication (requireAuth)
    ↓
Layer 2: Role Guard (requireInstructor / requireKpaAdmin)
    ↓
Layer 3: Organization Membership (isOrganizationExclusive → org 멤버십 체크)
    ↓
Layer 4: Enrollment Guard (requireEnrollment → 수강 여부)
    ↓
Layer 5: Data Ownership (isOwnerOrAdmin → 강좌 소유자 또는 관리자)
```

### 8.2 공개 vs 조직 전용

| 강좌 유형 | isOrganizationExclusive | 접근 조건 |
|-----------|:-----------------------:|----------|
| 공개 강좌 | false | 인증된 사용자 누구나 조회/수강 |
| 조직 전용 | true | 해당 조직 멤버만 조회/수강 |

KPA Extension에서 생성되는 모든 강좌는 **`isOrganizationExclusive=true`**

### 8.3 레슨 접근 제한

레슨 조회는 `requireEnrollment` 미들웨어로 수강 중인 사용자만 접근 가능:
1. 강좌 ID 추출
2. 사용자의 해당 강좌 Enrollment 확인 (status: APPROVED, IN_PROGRESS, COMPLETED)
3. `checkLesson` 옵션 시 레슨이 해당 강좌에 속하는지 추가 확인

### 8.4 유료 강좌 제한

- `isPaid=true` + `price` 설정 시 유료 강좌
- 유료 강좌 생성은 `lms:instructor` 또는 `kpa:admin` 역할 필요
- 결제 연동은 현재 구현되지 않음 (E-commerce Core와 연동 예정)

---

## 9. 강사 구조

### 9.1 강사 자격 획득 흐름

```
1. 약사(Pharmacist) → POST /instructor-qualifications 지원
   - 조건: 해당 분회 active 멤버
   - 중복 지원 불가 (pending/approved 상태 확인)

2. 분회 관리자 → PATCH /branches/:branchId/instructor-qualifications/:id/approve
   - TRANSACTION:
     a. kpa_approval_requests.status → approved
     b. role_assignments에 'lms:instructor' 역할 부여
     c. result_metadata에 역할 정보 기록

3. 승인된 강사 → lms:instructor 역할로:
   - 강좌 생성 (POST /courses)
   - 레슨 관리 (CRUD /lessons)
   - 이벤트 관리 (CRUD /events)
   - 수강자 관리 (/instructor/enrollments)

4. 철회 시 → PATCH /.../revoke
   - TRANSACTION:
     a. kpa_approval_requests.status → revoked
     b. role_assignments에서 'lms:instructor' 역할 제거
```

### 9.2 강사 자격 검증 (Dual-Query)

`InstructorService.verifyQualifiedInstructor(userId, organizationId, userRoles)`:

```
1. kpa_approval_requests에서 entity_type='instructor_qualification' + status='approved' 조회
2. 없으면 → kpa_instructor_qualifications에서 status='approved' fallback
3. kpa:admin 역할이면 bypass
4. 모두 실패 → 403 Forbidden
```

### 9.3 강사 프로필

- `GET /instructor/profile/:userId` (프론트엔드: `InstructorProfilePage.tsx`)
- 강사의 공개 프로필, 담당 강좌 목록, 자격 정보 표시
- 프론트엔드 API: `getInstructorProfile(userId)`

---

## 10. 현재 구현 상태 평가

### 10.1 완료된 부분 ✅

| 항목 | 상태 | 비고 |
|------|------|------|
| DB 스키마 (Core 8 테이블) | ✅ 완료 | 마이그레이션 001, 002 |
| TypeORM Entity (8개) | ✅ 완료 | Helper methods 포함 |
| LMS Core API (107+ endpoints) | ✅ 완료 | CRUD + 상태전이 |
| KPA Course Request (11 endpoints) | ✅ 완료 | Controller/Service 분리 완료 |
| KPA Instructor Qualification (7 endpoints) | ✅ 완료 | Controller/Service 분리 완료 |
| KPA 통합 승인 시스템 | ✅ 완료 | kpa_approval_requests |
| Dual-Query Pattern | ✅ 동작 중 | Legacy 전환기 |
| Transactional Approval | ✅ 완료 | Course 생성 + Role 부여 atomic |
| Frontend 강좌 페이지 (8개) | ✅ 완료 | Real API 연동 |
| Organization-based Scoping | ✅ 완료 | service_key 미사용 (정확) |

### 10.2 미완료 / 부분 구현 ⚠️

| 항목 | 상태 | 비고 |
|------|------|------|
| `lmsPermissions.ts` | ⚠️ Stub | organization-core RBAC 통합 대기 |
| WorkLearningPage | ⚠️ Mock | MOCK DATA만, API 연동 없음 |
| 결제 연동 (isPaid) | ⚠️ 스키마만 | E-commerce Core 연동 미구현 |
| Quiz/Survey 독립 라우트 | ⚠️ Phase 1/2 | Refoundation 진행 중 |
| Marketing 라우트 | ⚠️ Phase 2 | Refoundation 진행 중 |

### 10.3 누락 기능 ❌

| 항목 | 설명 |
|------|------|
| Course Request 관리 UI | API 존재, 프론트엔드 페이지 없음 |
| Instructor Qualification 관리 UI | API 존재, 프론트엔드 페이지 없음 |
| Event/Attendance 관리 UI | API 존재, 프론트엔드 페이지 없음 |
| 수료증 PDF 생성 로직 | downloadCertificate API 존재, PDF 생성 미구현 |
| Legacy 테이블 정리 | dual-query 제거 + kpa_course_requests / kpa_instructor_qualifications 마이그레이션 필요 |
| Content Bundle 테이블 마이그레이션 | manifest에 선언, 마이그레이션 없음 |

### 10.4 아키텍처 평가

**강점:**
- Core-Extension 분리가 잘 되어 있음 (lms-core는 서비스 무관, KPA Extension이 워크플로 추가)
- Organization-based Scoping이 Boundary Policy V1과 일치
- 통합 승인 시스템(kpa_approval_requests)으로 일관된 워크플로
- Transactional consistency (승인 + 엔티티 생성 + 역할 부여 atomic)

**주의점:**
- Dual-Query Pattern은 전환기 기술 부채 — 완료 후 반드시 정리 필요
- lmsPermissions.ts Stub은 보안 갭 가능성 — organization-core 통합 우선순위 높음
- 프론트엔드 관리 UI 부재로 운영자가 API 직접 호출 필요
- Quiz/Survey/Marketing이 Phase 1/2로 분리되어 있어 통합 시 충돌 가능성

### 10.5 다른 서비스 영향도

| 서비스 | LMS 의존 | 향후 도입 가능성 |
|--------|---------|----------------|
| web-kpa-society | ✅ 직접 사용 | 현재 유일 소비자 |
| web-glycopharm | ❌ 없음 | 낮음 (제약 도메인) |
| web-glucoseview | ❌ 없음 | 낮음 (혈당 모니터링) |
| web-k-cosmetics | ❌ 없음 | 중간 (교육 콘텐츠 가능) |
| neture (B2B) | ❌ 없음 | 중간 (공급자 교육) |

---

## 부록 A: 파일 맵

### LMS Core (packages/lms-core/)

```
src/
├── entities/
│   ├── Course.ts
│   ├── Lesson.ts
│   ├── Enrollment.ts
│   ├── Progress.ts
│   ├── Certificate.ts
│   ├── LMSEvent.ts
│   ├── Attendance.ts
│   └── ContentBundle.ts
├── migrations/
│   ├── 001-create-lms-tables.ts
│   └── 002-create-lms-additional-tables.ts
├── utils/
│   └── lmsPermissions.ts
└── manifest.ts
```

### LMS Module (apps/api-server/src/modules/lms/)

```
├── routes/
│   └── lms.routes.ts (107+ endpoints)
├── controllers/
│   └── CourseController.ts
└── services/
    ├── CourseService.ts
    ├── LessonService.ts
    ├── EnrollmentService.ts
    ├── ProgressService.ts
    ├── CertificateService.ts
    ├── EventService.ts
    └── AttendanceService.ts
```

### KPA Extension (apps/api-server/src/routes/kpa/)

```
├── controllers/
│   ├── course-request.controller.ts (C1-C11)
│   └── instructor.controller.ts (Q1-Q7)
├── services/
│   ├── course-request.service.ts
│   └── instructor.service.ts
└── entities/
    └── kpa-approval-request.entity.ts
```

### Frontend (services/web-kpa-society/src/)

```
├── api/
│   └── lms.ts (12 methods)
├── pages/
│   ├── lms/
│   │   ├── EducationPage.tsx
│   │   ├── LmsCoursesPage.tsx
│   │   ├── LmsCourseDetailPage.tsx
│   │   ├── LmsLessonPage.tsx
│   │   └── LmsCertificatesPage.tsx
│   ├── courses/
│   │   ├── CourseHubPage.tsx
│   │   └── CourseIntroPage.tsx
│   └── instructors/
│       └── InstructorProfilePage.tsx
└── (WorkLearningPage.tsx - MOCK)
```

---

## 부록 B: Enum 레지스트리

| Enum | 값 | 사용 위치 |
|------|------|----------|
| CourseStatus | DRAFT, PUBLISHED, ARCHIVED | lms_courses.status |
| CourseLevel | BEGINNER, INTERMEDIATE, ADVANCED | lms_courses.level |
| EnrollmentStatus | PENDING, APPROVED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED, EXPIRED | lms_enrollments.status |
| LessonType | VIDEO, ARTICLE, QUIZ, ASSIGNMENT, LIVE | lms_lessons.type |
| ProgressStatus | NOT_STARTED, IN_PROGRESS, COMPLETED | lms_progress.status |
| EventType | LECTURE, WORKSHOP, EXAM, WEBINAR, LIVE_SESSION | lms_events.type |
| EventStatus | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED | lms_events.status |
| AttendanceStatus | PRESENT, LATE, ABSENT, EXCUSED | lms_attendance.status |
| ApprovalRequestStatus | draft, pending, submitted, approved, rejected, revision_requested, cancelled, revoked | kpa_approval_requests.status |

---

*End of IR-O4O-COURSE-SYSTEM-CODE-AUDIT-V1*
