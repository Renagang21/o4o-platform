# LMS-Core

Learning Management System 핵심 기능을 제공하는 Core 패키지입니다.

## 주요 기능

### 1. 교육 과정 관리 (Course)
- 강의 생성/수정/삭제
- 조직별 교육 과정 (organizationId)
- 필수 교육 설정 (isRequired)
- 수강 인원 제한 (maxEnrollments)
- 연수 평점 관리 (credits)

### 2. 레슨 관리 (Lesson)
- 비디오, 문서, 퀴즈, 과제 지원
- Block Editor JSON 컨텐츠
- 순서 관리 (order)
- 완료 요구사항 (requiresCompletion)

### 3. 수강 관리 (Enrollment)
- 수강 신청/취소
- 진도율 추적 (progressPercentage)
- 퀴즈 점수 관리 (finalScore)
- 수료 처리 (completedAt)

### 4. 진도 추적 (Progress)
- 레슨별 진도 관리
- 비디오 시청 시간 추적
- 퀴즈 답안 저장
- 완료 상태 관리

### 5. 수료증 발급 (Certificate)
- 자동 수료증 번호 생성
- PDF 수료증 URL
- 유효 기간 관리 (expiresAt)
- 검증 코드 (verificationCode)

### 6. 일정 관리 (LMSEvent)
- 강의/워크숍/시험 일정
- 온라인/오프라인 지원
- 출석 요구 (requiresAttendance)
- 출석 코드 생성

### 7. 출석 관리 (Attendance)
- 출석/지각/결석/조퇴 처리
- 출석 코드 체크인
- 위치 정보 저장 (geoLocation)

## 조직 통합

모든 주요 엔티티는 `organizationId`를 지원하여 조직 기반 교육 운영이 가능합니다.

```typescript
// 서울지부 전용 교육
const course = await courseService.createCourse({
  title: '서울지부 필수 교육',
  organizationId: 'org-seoul',
  isOrganizationExclusive: true,
});
```

## 권한 시스템

organization-core RBAC와 완전 통합:
- `canCreateCourse()` - organization.manage 권한
- `canEnrollInCourse()` - organization.read 권한
- `canManageCourse()` - 강사 또는 organization.manage
- `canIssueCertificate()` - 강사 또는 organization.manage

## 엔티티

- Course: 교육 과정
- Lesson: 레슨/모듈
- Enrollment: 수강 등록
- Progress: 진도 추적
- Certificate: 수료증
- LMSEvent: 일정
- Attendance: 출석

## 설치

```bash
pnpm install
pnpm build
```

## 라이선스

MIT

---

**버전**: 0.1.0
**상태**: Phase 1-3 완료 ✅
