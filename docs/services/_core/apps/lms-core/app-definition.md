# lms-core

> **Status**: FROZEN (Foundation Core) | **Version**: 1.0.0 | **Package**: @o4o/lms-core

## 역할

LMS 핵심 기능. yaksa, education에서 사용.

| 책임 | 경계 |
|------|------|
| Course / Lesson 관리 | 업종별 확장 → Extension (lms-yaksa 등) |
| Enrollment / Progress 추적 | 권한 → organization-core |

## 외부 노출

**Services**: LMSService, CourseService, EnrollmentService
**Types**: Course, Lesson, Enrollment, Progress
**Events**: `course.created`, `enrollment.created`, `progress.updated`, `course.completed`

## API Routes

- `/api/v1/lms/courses`, `/api/v1/lms/courses/:id/lessons`
- `/api/v1/lms/enrollments`
- `/api/v1/lms/progress`

## Dependencies

없음 (Foundation Core)
