# Organization-LMS Integration Extension

조직(Organization) 구조와 LMS 시스템을 통합하는 Extension입니다.

## 주요 기능

- 조직 범위 교육 과정 관리
- 조직별 필수 교육 자동 배정
- 계층적 권한 상속 (지부 관리자 → 분회 교육 관리)
- 조직별 수강 통계 및 리포트

## 권한 매핑

- `organization.manage`: 조직 교육 과정 생성/관리
- `organization.read`: 조직 교육 열람, 수강 신청

## 사용 예시

```typescript
// 서울지부 전용 교육 과정 생성
const course = await courseService.createCourse({
  title: '서울지부 필수 교육',
  organizationId: 'org-seoul',
  isOrganizationExclusive: true,
  isRequired: true,
  instructorId: 'instructor-id',
});
```

---

**버전**: 0.1.0
**상태**: LMS Phase 1-3 구현 완료 ✅
