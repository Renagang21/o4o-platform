# IR-O4O-LMS-INSTRUCTOR-DASHBOARD-STRUCTURE-AUDIT-V1

## Investigation Report — KPA 강사 대시보드 구조 감사

**일자:** 2026-05-12  
**대상 서비스:** `services/web-kpa-society`  
**조사 범위:** 강사(`/instructor/*`) 라우트 전체 — 화면 구조 / API / canonical 적합성 / dead route 여부

---

## 1. 라우트 전체 목록

| 경로 | 컴포넌트 파일 | 상태 |
|------|-------------|------|
| `/instructor` | `pages/instructor/InstructorDashboardPage.tsx` | 완전 구현 |
| `/instructor/dashboard` | `pages/instructor/InstructorCourseDashboardPage.tsx` | 완전 구현 |
| `/instructor/courses` | `pages/instructor/courses/CourseListPage.tsx` | 완전 구현 (canonical 전환 완료) |
| `/instructor/courses/new` | `pages/instructor/courses/CourseNewPage.tsx` | 완전 구현 |
| `/instructor/courses/:id` | `pages/instructor/courses/CourseEditPage.tsx` | 완전 구현 |
| `/instructor/contents/:courseId/participants` | `pages/instructor/ContentParticipantsPage.tsx` | 완전 구현 |
| `/instructor/courses/:courseId/lessons/:lessonId/submissions` | `pages/instructor/courses/LessonSubmissionsPage.tsx` | 완전 구현 |

**총 7개 라우트 — dead route 없음.**

---

## 2. 레이아웃: InstructorLayout

**파일:** `components/instructor/InstructorLayout.tsx`

- 구조: `KpaGlobalHeader` + 좌측 사이드바(데스크톱) / 상단 가로 스크롤 nav(모바일) + 본문 + `Footer`
- 사이드바 메뉴 5개:

| # | 라벨 | 경로 | 상태 |
|---|------|------|------|
| 1 | 강사 대시보드 | `/instructor` | 활성 |
| 2 | 강의 관리 | `/instructor/courses` | 활성 |
| 3 | 강의 등록 | `/instructor/courses/new` | 활성 |
| 4 | 신청 / 심사 정보 | (없음) | **disabled** — `hint: '강사 대시보드 카드에서 확인'` |
| 5 | 프로필 관리 | (없음) | **disabled** — `hint: '강사 대시보드의 "프로필 수정" 버튼'` |

> disabled 항목은 실제 내용이 `InstructorDashboardPage` 안에 통합돼 있어 별도 라우트가 없음.  
> 사이드바에 "준비중" 뱃지를 표시하며 클릭 불가로 처리됨 — UX 부채.

---

## 3. 화면별 상세

### 3-A. InstructorDashboardPage (`/instructor`)

강사 메인 대시보드. 6개 섹션 통합:

1. **KPI 카드** — 총 강의 수 / 총 수강생 수 / 평균 완료율 / 승인 대기
2. **운영 대시보드 CTA** — `/instructor/dashboard` 이동 버튼
3. **승인 대기 수강신청 카드** — `pendingEnrollments()` 목록 + 승인/거절 버튼
4. **내 강의 목록 카드** — `dashboardCourses` 기반 (shortlist)
5. **강사 프로필 카드** — 인라인 수정 모달 (`instructorApi.updateProfile`)
6. **신청/심사 정보 카드** — 강사 인증/심사 이력

사용 API:
- `instructorApi.getMe()` / `instructorApi.updateProfile()`
- `lmsInstructorApi.dashboardCourses()`
- `lmsInstructorApi.pendingEnrollments()`
- `lmsInstructorApi.approveEnrollment(id)` / `lmsInstructorApi.rejectEnrollment(id)`

**수강 승인 흐름**: 별도 라우트 없음 — 이 페이지 내 인라인 카드에서 처리.

---

### 3-B. InstructorCourseDashboardPage (`/instructor/dashboard`)

강의별 운영 통계 페이지:
- 강의 선택기 (드롭다운)
- 선택된 강의의 통계 카드 (수강생 수, 완료율, 레슨별 진행률 등)

---

### 3-C. CourseListPage (`/instructor/courses`)

강의 목록 관리.  
**WO-O4O-LMS-INSTRUCTOR-COURSES-DATATABLE-CANONICAL-V1** 완료: canonical `BaseTable + RowActionMenu + ActionBar` 패턴 적용됨.

---

### 3-D. CourseEditPage (`/instructor/courses/:id`)

강의 상세 편집 허브:
- 승인 흐름 (초안 → 검토요청 → 승인/반려)
- 레슨 CRUD + 드래그 재정렬
- AI 구조 생성 모달 (`CourseStructureAiModal.tsx`)
- 레슨별 하위 편집 (`AssignmentEditor`, `LiveEditor`, `QuizBuilder`)

---

### 3-E. ContentParticipantsPage (`/instructor/contents/:courseId/participants`)

수강생 전체 목록 + CSV 내보내기 기능.

---

### 3-F. LessonSubmissionsPage (`/instructor/courses/:courseId/lessons/:lessonId/submissions`)

레슨별 제출물 목록 + 채점 모달.

---

## 4. Canonical 적합성 판정

| 화면 | 판정 | 사유 |
|------|------|------|
| InstructorDashboardPage | **유지** | 6섹션 통합 구조 — 분리보다 통합이 UX 효율적 |
| InstructorCourseDashboardPage | **유지** | 운영 통계 전용, 역할 명확 |
| CourseListPage | **유지** ✅ | canonical BaseTable 전환 완료 |
| CourseNewPage | **유지** | 등록 단계 명확 |
| CourseEditPage | **유지** | 복합 편집 허브 — 분리 불필요 |
| ContentParticipantsPage | **유지** | CSV 포함 참여자 관리, 완결된 기능 |
| LessonSubmissionsPage | **유지** | 채점 전용 페이지, 위치 적절 |
| 사이드바 disabled 항목 2개 | **통합 확정** | 콘텐츠가 대시보드에 이미 통합됨 — 향후 UX 개선 시 제거 권장 |

---

## 5. 문제 / UX 부채

| # | 항목 | 심각도 | 설명 |
|---|------|--------|------|
| 1 | 사이드바 "신청/심사 정보" disabled | 낮음 | 대시보드 내 카드로 기능 제공 중. disabled 라벨이 사용자 혼란 유발 가능 |
| 2 | 사이드바 "프로필 관리" disabled | 낮음 | 대시보드 내 프로필 카드 + 모달로 제공 중. 동일 혼란 |
| 3 | `/instructor/profile` 라우트 없음 | 낮음 | 사이드바 disabled 처리로 숨겨져 있으나, 딥링크 접근 시 404 |
| 4 | InstructorDashboardPage 6섹션 길이 | 낮음 | 모바일 스크롤 과다. 섹션 접기/탭 분리 검토 가능 |

---

## 6. 최종 권장 구조

### 현행 (유지 권장)

```
/instructor                  ← 통합 대시보드 (KPI + 승인 + 프로필 + 심사)
/instructor/dashboard        ← 강의별 운영 통계
/instructor/courses          ← 강의 목록 (canonical 완료)
/instructor/courses/new      ← 강의 등록
/instructor/courses/:id      ← 강의 편집 허브
/instructor/contents/:id/participants        ← 수강생 관리
/instructor/courses/:id/lessons/:lid/submissions  ← 채점
```

### 사이드바 정리 (후속 WO 권장)

```
현행 5개 → 정리 후 3개 활성:
  ✅ 강사 대시보드  →  /instructor
  ✅ 강의 관리      →  /instructor/courses
  ✅ 강의 등록      →  /instructor/courses/new
  🗑 신청/심사 정보  →  제거 (대시보드 카드로 충분)
  🗑 프로필 관리    →  제거 (대시보드 모달로 충분)
```

### 확장 가능 구조 (필요 시)

- 수강생 수 증가 시: `/instructor/courses/:id/enrollments` 별도 라우트 분리
- 프로필 요구 복잡화 시: `/instructor/profile` 라우트 신설 + 사이드바 활성화
- 심사 이력 복잡화 시: `/instructor/applications` 라우트 신설

---

## 7. 즉시 조치 불필요 항목

- **수강 승인 라우트 분리**: 현재 대시보드 통합이 적절. 분리 필요 없음.
- **CourseListPage canonical 전환**: WO-O4O-LMS-INSTRUCTOR-COURSES-DATATABLE-CANONICAL-V1으로 완료됨.
- **dead route 제거**: dead route 없음. 조치 불필요.

---

## 8. 후속 WO 후보

| WO ID (안) | 내용 | 우선순위 |
|-----------|------|---------|
| WO-O4O-LMS-INSTRUCTOR-SIDEBAR-CLEANUP-V1 | disabled 2개 항목 사이드바에서 제거 | 낮음 |
| WO-O4O-LMS-INSTRUCTOR-DASHBOARD-MOBILE-V1 | 대시보드 6섹션 모바일 접기/탭 분리 | 낮음 |

---

*Status: COMPLETE*  
*Investigator: Claude Code (IR 자동 생성)*
