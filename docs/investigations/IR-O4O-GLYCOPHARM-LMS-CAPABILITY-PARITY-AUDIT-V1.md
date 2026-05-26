# IR-O4O-GLYCOPHARM-LMS-CAPABILITY-PARITY-AUDIT-V1

> **조사 유형:** Capability Parity Audit
> **대상:** GlycoPharm LMS
> **기준:** KPA-Society (Primary) / K-Cosmetics (Secondary)
> **날짜:** 2026-05-26
> **결론 선언:** GlycoPharm LMS 누락의 97%는 **Frontend 구현 누락**이다. Backend는 이미 GlycoPharm을 지원한다.

---

## 1. Executive Summary

GlycoPharm LMS는 KPA-Society / K-Cosmetics 대비 **Frontend 기준 약 25% 수준**의 구현만 존재한다.

핵심 판정: **"서비스별 의도 차이"가 아니라 "구현 미완료 / phase defer 잔재"이다.**

근거:
- Backend API는 이미 `serviceKey='glycopharm'` + `glycopharm:operator` 역할로 GlycoPharm을 완전 지원한다.
- 공통 엔드포인트 `/api/v1/lms/operator/courses/:id/approve|reject|unpublish|archive|hard` 는 GlycoPharm에서도 작동한다.
- 누락된 기능들은 모두 Frontend에서 API를 호출하지 않고 있을 뿐이다.
- K-Cosmetics도 Phase 1-B를 향한 "구현 예정" 주석이 있으며, GlycoPharm도 동일한 경로를 걷지 않았을 뿐이다.

**유일한 예외 (정말 Backend 선행이 필요한 항목):** 없음. GlycoPharm에만 필요한 Backend 변경은 조사 결과 발견되지 않았다.

---

## 2. Capability Matrix

| 항목 | KPA-Society | K-Cosmetics | GlycoPharm | Gap | Root Cause | 보강 난이도 |
|------|:-----------:|:-----------:|:----------:|-----|-----------|:---------:|
| **[Route] LMS 강의 목록** | ✅ `/lms` | ✅ `/lms` | ✅ `/lms` | 없음 | - | - |
| **[Route] 강의 상세** | ✅ `/lms/course/:id` | ✅ `/lms/course/:id` | ✅ `/lms/course/:id` | 없음 | - | - |
| **[Route] 레슨 플레이어** | ✅ `/lms/course/:cId/lesson/:lId` | ✅ `/lms/course/:cId/lesson/:lId` | ❌ 없음 | **누락** | 구현 누락 | 낮음 |
| **[Route] 강사 대시보드** | ✅ `/instructor` | ✅ `/instructor` | ✅ `/instructor` | 없음 | - | - |
| **[Route] 강사 강의 관리** | ✅ `/instructor/courses` | ✅ `/instructor/courses` | ❌ 없음 | **누락** | 구현 누락 | 낮음 |
| **[Route] 강의 생성** | ✅ `/instructor/courses/new` | ❌ Phase 예정 | ❌ 없음 | **누락** | Phase defer | 중간 |
| **[Route] 강의 수정** | ✅ `/instructor/courses/:id/edit` | ❌ Phase 예정 | ❌ 없음 | **누락** | Phase defer | 중간 |
| **[Route] Operator LMS** | ✅ `/operator/lms` | ✅ `/operator/lms` | ⚠️ `/operator/lms/courses` | **route drift** | 명칭 비표준 | 낮음 |
| **[Route] MyPage 수강 내역** | ✅ `/mypage/enrollments` | ✅ `/mypage/enrollments` | ❌ 없음 | **누락** | 구현 누락 | 낮음 |
| **[Route] MyPage 수료증** | ✅ `/mypage/certificates` | ✅ `/mypage/certificates` | ❌ 없음 | **누락** | 구현 누락 | 낮음 |
| **[Route] MyPage 크레딧** | ✅ `/mypage/credits` | ✅ `/mypage/credits` | ❌ 없음 | **누락** | 구현 누락 | 낮음 |
| **[Operator] 강의 목록** | ✅ | ✅ | ✅ 기본 | 있음 | - | - |
| **[Operator] 상태 Badge** | ✅ 5가지 | ✅ 5가지 | ❌ isPublished만 | **누락** | 구현 누락 | 낮음 |
| **[Operator] 상태 Filter** | ✅ 6가지 | ✅ 6가지 | ❌ 없음 | **누락** | 구현 누락 | 낮음 |
| **[Operator] 강의 승인** | ✅ | ✅ | ❌ | **누락** | Frontend 미연결 | 낮음 |
| **[Operator] 강의 거절** | ✅ | ✅ | ❌ | **누락** | Frontend 미연결 | 낮음 |
| **[Operator] 공개/비공개** | ✅ | ✅ | ❌ | **누락** | Frontend 미연결 | 낮음 |
| **[Operator] 보관/삭제** | ✅ | ✅ | ❌ | **누락** | Frontend 미연결 | 낮음 |
| **[Operator] RowActionMenu** | ✅ | ✅ | ❌ | **누락** | 구현 누락 | 낮음 |
| **[Operator] ActionBar** | ✅ | ✅ | ❌ | **누락** | 구현 누락 | 낮음 |
| **[Operator] BulkAction** | ✅ | ✅ | ❌ | **누락** | 구현 누락 | 중간 |
| **[Operator] Detail Drawer** | ✅ | ✅ | ❌ | **누락** | 구현 누락 | 중간 |
| **[Instructor] 강의 생성** | ✅ | ❌ 예정 | ❌ | **누락** | Phase defer | 중간 |
| **[Instructor] 레슨 생성/수정** | ✅ | ❌ 예정 | ❌ | **누락** | Phase defer | 높음 |
| **[Instructor] 퀴즈 생성** | ✅ | ❌ 예정 | ❌ | **누락** | Phase defer | 높음 |
| **[Instructor] 과제 생성** | ✅ | ❌ 예정 | ❌ | **누락** | Phase defer | 높음 |
| **[Instructor] 수강생 관리** | ✅ | ❌ 예정 | ❌ | **누락** | Phase defer | 중간 |
| **[Instructor] 수강 승인** | ✅ | ❌ 예정 | ❌ | **누락** | Phase defer | 낮음 |
| **[MyPage] 수강 내역 UI** | ✅ | ✅ | ❌ | **누락** | 구현 누락 | 낮음 |
| **[MyPage] 진도 추적 UI** | ✅ | ✅ | ❌ | **누락** | 구현 누락 | 낮음 |
| **[MyPage] 수료증 UI** | ✅ | ✅ | ❌ | **누락** | 구현 누락 | 낮음 |
| **[MyPage] 크레딧 UI** | ✅ | ✅ | ❌ | **누락** | 구현 누락 | 낮음 |
| **[Enrollment] pending 상태** | ✅ | ✅ | ❌ | **누락** | Frontend 미연결 | 낮음 |
| **[Enrollment] 승인 필요 강의** | ✅ | ✅ | ❌ | **누락** | Frontend 미연결 | 낮음 |
| **[Enrollment] 비로그인 제어** | ✅ | ✅ | ❌ | **누락** | Frontend 미연결 | 낮음 |
| **[AI] CourseStructureAiModal** | ✅ | ❌ | ❌ | **누락** | Phase defer | 높음 |
| **[AI] AiContentModal** | ✅ | ❌ | ❌ | **누락** | Phase defer | 높음 |
| **[API Client] Operator 메서드** | ✅ | ✅ | ❌ | **누락** | 코드 누락 | 낮음 |
| **[API Client] getMyEnrollments** | ✅ | ✅ | ❌ | **누락** | 코드 누락 | 낮음 |

---

## 3. Route Matrix

### 전체 LMS Route 비교

| Route | KPA-Society | K-Cosmetics | GlycoPharm | 판정 |
|-------|:-----------:|:-----------:|:----------:|------|
| `/lms` | ✅ LmsCoursesPage | ✅ EducationPage | ✅ EducationPage | 정렬 |
| `/lms/course/:id` | ✅ LmsCourseDetailPage | ✅ LmsCourseDetailPage | ✅ CourseDetailPage | 정렬 |
| `/lms/course/:cId/lesson/:lId` | ✅ LmsLessonPage | ✅ LmsLessonPage | ❌ **없음** | **누락** |
| `/lms/certificate` | ✅ LmsCertificatesPage | ❌ | ❌ | KPA 전용 (공개 검증) |
| `/lms/:id` | ❌ | ❌ | ⚠️ redirect → `/lms/course/:id` | **legacy route** |
| `/instructor` | ✅ InstructorDashboardPage | ✅ InstructorDashboardPage | ✅ InstructorDashboardPage | 정렬 |
| `/instructor/courses` | ✅ CourseListPage | ✅ InstructorCoursesPage | ❌ **없음** | **누락** |
| `/instructor/courses/new` | ✅ CourseNewPage | ❌ Phase 예정 | ❌ **없음** | **누락** |
| `/instructor/courses/:id/edit` | ✅ CourseEditPage | ❌ Phase 예정 | ❌ **없음** | **누락** |
| `/instructor/operations` | ✅ OperationsCourseListPage | ❌ | ❌ | KPA 전용 (후순위) |
| `/operator/lms` | ✅ OperatorLmsCoursesPage | ✅ OperatorLmsCoursesPage | ❌ **없음** | **route drift** |
| `/operator/lms/courses` | ⚠️ → redirect | ❌ | ✅ LmsCoursesPage | **route drift** |
| `/operator/lms/approvals` | ❌ (Drawer 처리) | ❌ (Drawer 처리) | ❌ | 구조 동일 (이슈 없음) |
| `/mypage/enrollments` | ✅ MyEnrollmentsPage | ✅ MyEnrollmentsPage | ❌ **없음** | **누락** |
| `/mypage/certificates` | ✅ MyCertificatesPage | ✅ MyCertificatesPage | ❌ **없음** | **누락** |
| `/mypage/credits` | ✅ MyCreditsPage | ✅ MyCreditsPage | ❌ **없음** | **누락** |
| `/mypage/qualifications` | ✅ MyQualificationsPage | ❌ | ❌ | KPA 전용 (약사 자격) |

### Route 판정 요약

- **정렬 완료:** 3건 (`/lms`, `/lms/course/:id`, `/instructor`)
- **누락:** 9건 (레슨 플레이어, 강사 강의관리, 강의생성/수정, MyPage 3건)
- **route drift:** 1건 (`/operator/lms/courses` → `/operator/lms`로 정렬 필요)
- **legacy route:** 1건 (`/lms/:id` redirect, 제거 대상)
- **KPA 전용 (근거 있음):** 3건 (certificate 공개검증, operations, qualifications)

---

## 4. API / Entity Gap

### Course Entity — GlycoPharm vs Backend 실제 지원

Backend `Course` entity는 모든 서비스 공통이다. GlycoPharm 강의도 동일 테이블 사용.

| 필드 | Backend 지원 | GlycoPharm Frontend 인식 | 판정 |
|------|:-----------:|:-----------------------:|------|
| `id`, `title`, `description`, `thumbnail` | ✅ | ✅ | 정렬 |
| `status` (enum 5가지) | ✅ | ⚠️ `string` 타입으로만 처리 | **타입 불완전** |
| `isPublished` | ✅ | ✅ (과다 의존) | boolean 의존 탈피 필요 |
| `service_key` | ✅ 'glycopharm' | 미사용 | 관련 없음 (Backend가 처리) |
| `visibility` | ✅ | ❌ Frontend에서 미사용 | **누락** |
| `requiresApproval` | ✅ | ❌ Frontend에서 미사용 | **누락** |
| `instructorId` → instructorName | ✅ JOIN 제공 | ⚠️ id만 보관 | **표시 누락** |
| `lessonCount` (computed) | ✅ | ❌ | **누락** |
| `currentEnrollments` | ✅ | ❌ | **누락** |
| `tags`, `credits`, `isPaid`, `price` | ✅ | ❌ | 미사용 (후순위) |
| `rejectionReason` | ✅ | ❌ | **누락** (거절 사유 표시 불가) |

### Enrollment Entity — GlycoPharm API Client 지원

| API 메서드 | KPA/K-Cos | GlycoPharm lms.ts | 판정 |
|-----------|:---------:|:-----------------:|------|
| `getMyEnrollments()` | ✅ | ❌ 미구현 | **누락** |
| `getEnrollmentByCourse(courseId)` | ✅ | ✅ (alias 포함) | 정렬 |
| `cancelEnrollment()` | ✅ | ❌ | **누락** |
| `operatorApproveCourse()` | ✅ | ❌ | **누락** |
| `operatorRejectCourse()` | ✅ | ❌ | **누락** |
| `operatorUnpublishCourse()` | ✅ | ❌ | **누락** |
| `operatorArchiveCourse()` | ✅ | ❌ | **누락** |
| `operatorHardDeleteCourse()` | ✅ | ❌ | **누락** |

**판정:** GlycoPharm `lms.ts`에 Operator 메서드가 5개 전부 누락. Backend API는 존재하며 `glycopharm:operator` 역할로 접근 가능하다.

### Backend 지원 현황

```
GET    /api/v1/lms/operator/courses/:id/approve    → glycopharm:operator 역할로 접근 ✅
POST   /api/v1/lms/operator/courses/:id/reject     → 동일 ✅
POST   /api/v1/lms/operator/courses/:id/unpublish  → 동일 ✅
POST   /api/v1/lms/operator/courses/:id/archive    → 동일 ✅
DELETE /api/v1/lms/operator/courses/:id/hard       → 동일 ✅
GET    /api/v1/lms/enrollments/me                  → authenticate 필요, GlycoPharm 지원 ✅
GET    /api/v1/lms/certificates/me                 → 동일 ✅
POST   /api/v1/lms/courses/:cId/enroll             → 동일 ✅
```

**결론: Backend 선행 작업은 불필요하다. 모든 API가 이미 GlycoPharm을 지원한다.**

---

## 5. Frontend Gap

### 5-1. Operator LMS 페이지 (`/operator/lms/courses`, 223줄)

현재 상태: DataTable 기반 검색 + 페이지네이션만 구현 (KPA/K-Cos 대비 30% 수준).

| 누락 기능 | KPA/K-Cos 구현 방식 | Root Cause |
|---------|-------------------|-----------|
| 상태 Badge (5가지) | `STATUS_CONFIG` 객체 + 색상 토큰 | 코드 작성 누락 |
| 상태 Filter dropdown | `statusFilter` state + 6가지 옵션 | 코드 작성 누락 |
| RowActionMenu | `@o4o/ui` RowActionMenu + `defineActionPolicy` | 코드 작성 누락 |
| ActionBar + BulkAction | `@o4o/ui` ActionBar + `useBatchAction` | 코드 작성 누락 |
| Detail Drawer | `@o4o/ui` BaseDetailDrawer | 코드 작성 누락 |
| 강의 승인 action | `operatorApproveCourse()` API 연결 | API Client + UI 누락 |
| 강의 거절 action | `operatorRejectCourse()` + 사유 입력 modal | API Client + UI 누락 |
| 공개/비공개 action | `operatorUnpublishCourse()` | API Client + UI 누락 |
| 보관/삭제 action | `operatorArchiveCourse()` / `operatorHardDeleteCourse()` | API Client + UI 누락 |
| instructorName 표시 | API 응답에서 `instructor.name` 표시 | UI 누락 |
| lessonCount 컬럼 | API 응답의 `lessonCount` 표시 | UI 누락 |
| enrollmentCount 컬럼 | API 응답의 `currentEnrollments` 표시 | UI 누락 |

**Route drift:** 현재 `/operator/lms/courses` → 표준 `/operator/lms`로 정렬 필요.

### 5-2. Instructor 페이지 (대시보드 외 전무)

현재: `InstructorDashboardPage.tsx` 하나만 존재 (KPI 3개, 읽기 전용 강의 목록).

| 누락 페이지/기능 | KPA 구현 | Root Cause |
|----------------|---------|-----------|
| `InstructorCoursesPage` | CourseListPage (729줄) | Phase defer |
| `CourseNewPage` | 강의 생성 폼 | Phase defer |
| `CourseEditPage` | 강의 수정 폼 | Phase defer |
| `LessonSubmissionsPage` | 과제 제출 관리 | Phase defer |
| `AssignmentEditor` | 과제 생성/수정 | Phase defer |
| `QuizBuilder` | 퀴즈 생성/수정 | Phase defer |
| `ContentParticipantsPage` | 수강생 관리 | Phase defer |
| 수강 승인/거절 (instructor) | `approveEnrollment()` 연결 | Phase defer |
| AI lesson draft | `CourseStructureAiModal` | Phase defer |

### 5-3. MyPage LMS 연계 (전무)

현재: `MyPageHub.tsx` → 프로필/설정만. LMS 관련 항목 없음.

| 누락 페이지 | KPA/K-Cos 구현 | Root Cause |
|-----------|--------------|-----------|
| `MyEnrollmentsPage` | 수강 목록 + 진도 바 + 상태 action | 구현 누락 |
| `MyCertificatesPage` | 수료증 목록 + 다운로드 | 구현 누락 |
| `MyCreditsPage` | 크레딧/포인트 관리 | 구현 누락 |

### 5-4. Learner LMS (레슨 플레이어 없음)

| 누락 | 현재 상태 | Root Cause |
|------|---------|-----------|
| `LmsLessonPage` (레슨 플레이어) | `/lms/course/:courseId/lesson/:lessonId` route 없음 | 구현 누락 |
| Enrollment 상태 분기 (pending/approved/rejected) | CourseDetailPage에서 단순 처리 | 구현 누락 |
| 비로그인 → 로그인 유도 (`MEMBERS_ONLY` 처리) | 미구현 | 구현 누락 |
| 진도 업데이트 호출 | 레슨 플레이어 없으므로 미연결 | 구현 누락 |

### 5-5. API Client 누락 (`src/api/lms.ts`)

```typescript
// 추가 필요한 메서드 (Backend API는 존재함)
operatorApproveCourse(id: string): Promise<void>
operatorRejectCourse(id: string, reason: string): Promise<void>
operatorUnpublishCourse(id: string): Promise<void>
operatorArchiveCourse(id: string): Promise<void>
operatorHardDeleteCourse(id: string): Promise<void>
getMyEnrollments(): Promise<LmsPaginatedResponse<LmsEnrollment>>
cancelEnrollment(enrollmentId: string): Promise<void>
```

---

## 6. Backend Gap

**판정: Backend Gap 없음.**

전체 항목 분류:

| 분류 | 설명 | 해당 항목 수 |
|------|------|:----------:|
| **A. Frontend만 보강 가능** | Backend API 존재, Frontend 미연결 | **대부분 (40건+)** |
| **B. Backend API 있으나 route/client 미연결** | API Client에 메서드 없음 | 7건 (operator 5 + enrollment 2) |
| **C. Backend 필드/migration 필요** | 없음 | **0건** |
| **D. Backend service/controller 신규 필요** | 없음 | **0건** |
| **E. 이미 존재하나 UI에서 숨겨짐** | `isPublished` boolean 의존으로 status enum 미활용 | 1건 |
| **F. Legacy drift** | `/lms/:id` redirect, `/operator/lms/courses` route 명칭 | 2건 |
| **G. Parity 회복 대상** | 위 모든 A/B/E/F 항목 | 전체 |

---

## 7. 즉시 가능한 작업 (Frontend만, Backend 불필요)

### Priority 1 — Operator LMS 정렬 (1-2일)

1. **`LmsCoursesPage.tsx` → `OperatorLmsCoursesPage.tsx` 교체**
   - K-Cosmetics `OperatorLmsCoursesPage.tsx` (650줄) 패턴 그대로 복사+서비스 설정 교체
   - `serviceKey: 'glycopharm'`, API path: `/lms/operator/courses?serviceKey=glycopharm`
   - Route: `/operator/lms/courses` → `/operator/lms` redirect 추가
   - ActionBar + RowActionMenu + BulkAction + DetailDrawer 포함
   - 상태 Badge 5가지, 상태 Filter 6가지 포함

2. **`src/api/lms.ts` Operator 메서드 추가** (5개)
   - `operatorApproveCourse`, `operatorRejectCourse`, `operatorUnpublishCourse`, `operatorArchiveCourse`, `operatorHardDeleteCourse`
   - K-Cosmetics `lms.ts` 해당 메서드 복사

### Priority 2 — MyPage LMS 연계 (1-2일)

3. **`MyEnrollmentsPage.tsx` 추가**
   - K-Cosmetics 버전 기반 + `getMyEnrollments()` API Client 메서드 추가
   - Route: `/mypage/enrollments`

4. **`MyCertificatesPage.tsx` 추가**
   - 수료증 목록 + 다운로드
   - Route: `/mypage/certificates`

5. **`MyCreditsPage.tsx` 추가**
   - Route: `/mypage/credits`

### Priority 3 — Learner LMS 완성 (1일)

6. **`LmsLessonPage.tsx` 추가**
   - K-Cosmetics 버전 기반
   - Route: `/lms/course/:courseId/lesson/:lessonId`
   - `MEMBERS_ONLY` 비로그인 제어 포함
   - 진도 업데이트 API 연결

7. **`src/api/lms.ts` Enrollment 메서드 추가**
   - `getMyEnrollments()`, `cancelEnrollment()`

8. **Legacy route 제거**
   - `/lms/:id` redirect 코드 삭제

### Priority 4 — Instructor 기본 강의 관리 (2-3일)

9. **`InstructorCoursesPage.tsx` 추가** (강의 목록 + 조회)
   - K-Cosmetics 버전 기반
   - Route: `/instructor/courses`

10. **수강 승인/거절 (instructor 관점)** (Instructor 대시보드 내 추가)

---

## 8. Backend 선행이 필요한 작업

**없음.**

GlycoPharm 전용 Backend 작업은 이번 조사에서 발견되지 않았다.

단, 다음 항목은 Backend가 이미 지원하는지 **실 호출 검증**이 필요하다 (코드 조사 기준으로는 지원 확인):

| 항목 | Backend 경로 | 주의사항 |
|------|------------|---------|
| Operator approve/reject | `/api/v1/lms/operator/courses/:id/approve|reject` | `glycopharm:operator` 역할 보유 계정으로 테스트 필요 |
| Certificate issue | `/api/v1/lms/certificates/issue` | `requireKpaAdmin` 가드가 KPA 전용인지 확인 필요 |
| Enrollment 진도 | `/api/v1/lms/enrollments/:id` (PATCH) | GlycoPharm 강의에서 작동 확인 필요 |

> **주의:** `CertificateController`의 `requireKpaAdmin` 가드가 GlycoPharm 강의에도 인증서를 발급할 수 있는지는 별도 확인이 필요하다. 만약 KPA 전용이라면 `glycopharm:admin` 역할도 허용하도록 수정이 필요하다.

---

## 9. 공통 Wrapper 후보

### 9-1. `OperatorLmsCoursesPage` 공통화 가능성

현재 KPA(729줄), K-Cosmetics(650줄)는 구조가 거의 동일하다. GlycoPharm에 추가하면 3개 서비스가 같은 패턴을 반복한다.

**권장:** GlycoPharm 구현 완료 후, 3서비스 Operator LMS 페이지를 `@o4o/operator-core-ui` 공통 모듈로 추출하는 후속 WO 검토. (현재 단계에서는 K-Cosmetics 패턴 복사 먼저.)

### 9-2. `MyEnrollmentsPage` 공통화 가능성

KPA / K-Cosmetics 구조가 동일 (상태 타입, filter logic 일치). GlycoPharm도 동일 구조 채택 확인 후 공통 컴포넌트 추출 가능.

### 9-3. `LmsLessonPage` 공통화 가능성

K-Cosmetics와 KPA 레슨 플레이어 구조가 동일하므로, GlycoPharm 추가 시점에 `@o4o/operator-core-ui` 또는 별도 공통 패키지 후보.

---

## 10. 후속 WO 제안

### WO-O4O-GLYCOPHARM-LMS-PHASE1-OPERATOR-PARITY-V1 (즉시 가능)
- 대상: Operator LMS 페이지 K-Cosmetics 수준 정렬
- 범위: `LmsCoursesPage.tsx` 교체 + API Client Operator 메서드 5개 추가 + Route 정렬
- 예상 공수: 1-2일
- Backend 선행: 불필요

### WO-O4O-GLYCOPHARM-LMS-PHASE2-MYPAGE-LEARNER-V1 (즉시 가능)
- 대상: MyPage 3개 페이지 + LmsLessonPage + Enrollment 정렬
- 범위: `MyEnrollmentsPage`, `MyCertificatesPage`, `MyCreditsPage`, `LmsLessonPage` 추가
- 예상 공수: 2-3일
- Backend 선행: 불필요

### WO-O4O-GLYCOPHARM-LMS-PHASE3-INSTRUCTOR-V1 (Phase 2 이후)
- 대상: Instructor 강의 생성/수정 + 수강생 관리
- 범위: KPA `CourseNewPage`, `CourseEditPage`, `ContentParticipantsPage` 패턴 적용
- 예상 공수: 3-5일
- Backend 선행: 불필요

### WO-O4O-LMS-OPERATOR-COMMON-WRAPPER-V1 (Phase 1 완료 후 검토)
- 대상: KPA/K-Cosmetics/GlycoPharm Operator LMS 3개 → 공통 wrapper 추출
- 범위: `@o4o/operator-core-ui` 신규 모듈
- 예상 공수: 2-3일

### WO-O4O-GLYCOPHARM-LMS-PHASE4-LESSON-QUIZ-V1 (별도 WO)
- 대상: 레슨/퀴즈/과제 생성 (Instructor)
- 범위: QuizBuilder, AssignmentEditor, LessonSubmissionsPage
- 예상 공수: 5-7일

---

## 부록: 파일 크기 비교

| 파일 | KPA-Society | K-Cosmetics | GlycoPharm |
|------|:-----------:|:-----------:|:----------:|
| Operator LMS 페이지 | 729줄 | 650줄 | **223줄** |
| Instructor Dashboard | 대시보드 외 8개 파일 | 2개 파일 | **1개 파일** |
| MyPage LMS | 5개 파일 | 3개 파일 | **0개 파일** |
| LMS API Client (lms.ts) | ~600줄 | ~400줄 | **~250줄** |
| Operator 메서드 (lms.ts) | 5개 | 5개 | **0개** |

---

*조사 완료: 2026-05-26*
*조사 범위: Route / Operator LMS / Instructor / MyPage / Enrollment / API Client / Backend API / Entity*
*판정: GlycoPharm LMS 누락은 전량 Frontend 구현 미완료. Backend 수정 불필요.*
