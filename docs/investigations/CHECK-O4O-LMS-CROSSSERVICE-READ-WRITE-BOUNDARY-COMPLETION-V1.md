# CHECK-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1

- **WO**: `WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1`
- **선행 WO**: `WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1` (공개 강의 목록 read boundary)
- **선행 CHECK**: [`CHECK-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1.md`](CHECK-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1.md)
- **작업일**: 2026-08-18
- **판정**: **PASS_WITH_RESIDUAL_RISK** (service boundary 완료 / enrollment 소유권 결함은 범위 밖 잔존)

> 본 CHECK 는 **LMS cross-service read/write boundary** 완료 기록이다.
> LMS UI 공통화·커뮤니티 전체 공통화 완료를 의미하지 않는다.

---

## 0. 요약

| 항목 | 값 |
|---|---|
| 조사 LMS endpoint | **93** (generic 68 + KPA remount 25) |
| USER_FACING_SCOPED | **46** |
| PLATFORM_GENERIC | **45** |
| MISSING_SCOPE_FIXED | **25** (generic handler 기준. KPA remount 는 동일 handler 라 동시 적용) |
| INTENTIONALLY_UNSCOPED | **2** |
| 미조사 | **0** |
| DB migration | **0** |

---

## 1. 선행 CHECK 잔존 위험 3건 재검증

| # | 선행 잔존 위험 | 이번 결과 |
|---|---|---|
| 1 | 단건 course 외 **enroll / progress / lesson / certificate** 는 scope 미적용 | **해소**. 아래 §4~§7 |
| 2 | generic route 를 쓰는 GP / KCos 는 호출부마다 serviceKey 를 붙여야 해 누락 위험 | **해소**. apiClient 계층에서 `/lms/*` 전체에 1회 부착(§8-3) |
| 3 | serviceKey 중복 전달 시 express 가 배열을 주어 scope 가 조용히 사라질 수 있음 | **해소**. `resolveLmsServiceScope` 가 배열 첫 값 사용(§3) |

---

## 2. 판정 기준 (WO §3)

```
service route/context → canonical serviceKey → 대상 course.serviceKey 확인 → 기존 enrollment/permission 정책
```

- **새 LMS 전용 key mapping 을 만들지 않았다.** 기존 canonical SSOT(`resolveCanonicalServiceKey` / `SERVICE_KEYS`)만 재사용한다.
- service boundary 와 enrollment 권한은 별개다. enrollment 가 있어도 타 서비스 course 는 접근 불가.
- scope 밖 resource 는 기존 non-disclosure 계약대로 **404** (403 아님).
- 판정은 전부 **SQL 단계**에서 한다. client-side filtering 없음.
- legacy `service_key IS NULL` course 는 **KPA scope 에만** 포함(기존 규칙 유지).

### 신설 모듈

`apps/api-server/src/modules/lms/utils/lms-scope-guard.ts`

| export | 역할 |
|---|---|
| `resolveScopeOrRespond` | 요청 scope 해석. 알 수 없는 serviceKey → 400 |
| `guardCourseScope` | courseId → `lms_courses.service_key` |
| `guardLessonScope` | lessonId → lesson JOIN course |
| `guardQuizScope` | quizId → `COALESCE(lesson."courseId", quiz."courseId")` JOIN course |
| `guardAssignmentScope` | assignmentId → lesson JOIN course |
| `guardLoadedCourseScope` | 이미 로드된 relation(enrollment.course / certificate.course) 판정 — 추가 쿼리 0 |
| `applyCourseScopeToQuery` | 목록 QueryBuilder 에 course scope 조건 부착 |

모든 raw SQL 은 parameter binding(`$1`)만 사용한다 (CLAUDE.md §7 Guard Rule 2).

---

## 3. Endpoint 전수 census — generic `/api/v1/lms/*` (68건)

컬럼: `method/path | 소비자 | generic/service-prefixed | service context | course service 확인 | membership/enrollment guard | read/write | 현재 판정`

### 3-1. 학습자 read/write (27건) — 전부 USER_FACING_SCOPED

| method/path | 소비자 | 유형 | service context | course service 확인 | enrollment guard | R/W | 판정 |
|---|---|---|---|---|---|---|---|
| GET /courses | KPA·KCos·GP | generic | query serviceKey | SQL 목록 필터 | optionalAuth | R | SCOPED (선행 WO) |
| GET /courses/:id | KPA·KCos·GP | generic | query serviceKey | 단건 SQL | optionalAuth | R | SCOPED (선행 WO) |
| GET /courses/:courseId/lessons | KPA·KCos·GP | generic | query serviceKey | requireEnrollment 내 판정 | requireEnrollment | R | **FIXED** |
| GET /lessons/:id | KPA·KCos·GP | generic | query serviceKey | requireEnrollment + guardLessonScope | requireEnrollment(checkLesson) | R | **FIXED** |
| GET /lessons/:lessonId/quiz | KPA·GP | generic | query serviceKey | guardLessonScope | requireAuth | R | **FIXED** |
| POST /quizzes/:quizId/submit | KPA·GP | generic | query serviceKey | guardQuizScope | requireAuth | W | **FIXED** |
| GET /quizzes/:quizId/attempts | KPA·GP | generic | query serviceKey | guardQuizScope | requireAuth | R | **FIXED** |
| GET /lessons/:lessonId/assignment | KPA·GP | generic | query serviceKey | guardLessonScope | requireAuth | R | **FIXED** |
| POST /assignments/:assignmentId/submit | KPA·GP | generic | query serviceKey | guardAssignmentScope | requireAuth | W | **FIXED** |
| GET /assignments/:assignmentId/my | KPA·GP | generic | query serviceKey | guardAssignmentScope | requireAuth | R | **FIXED** |
| GET /completions/me | KPA·KCos·GP | generic | query serviceKey | course JOIN SQL 필터 | requireAuth(본인) | R | **FIXED** |
| POST /courses/:courseId/enroll | KPA·KCos·GP | generic | query serviceKey | guardCourseScope | requireAuth | W | **FIXED** |
| GET /enrollments | KPA·KCos·GP | generic | query serviceKey | course JOIN SQL 필터 | requireAuth | R | **FIXED** |
| GET /enrollments/me | KPA·KCos·GP | generic | query serviceKey | course JOIN SQL 필터 | requireAuth(본인) | R | **FIXED** |
| GET /enrollments/:id | KPA·KCos·GP | generic | query serviceKey | guardLoadedCourseScope | requireAuth | R | **FIXED** |
| PATCH /enrollments/:id | KPA·KCos·GP | generic | query serviceKey | ensureEnrollmentInScope | requireAuth | W | **FIXED** |
| POST /enrollments/:id/start | KPA·KCos·GP | generic | query serviceKey | ensureEnrollmentInScope | requireAuth | W | **FIXED** |
| POST /enrollments/:id/complete | KPA·KCos·GP | generic | query serviceKey | ensureEnrollmentInScope | requireAuth | W | **FIXED** |
| POST /enrollments/:id/cancel | KPA·KCos·GP | generic | query serviceKey | ensureEnrollmentInScope | requireAuth | W | **FIXED** |
| GET /enrollments/me/course/:courseId | KPA·KCos·GP | generic | query serviceKey | guardCourseScope | requireAuth(본인) | R | **FIXED** |
| POST /enrollments/:courseId/progress | KPA·KCos·GP | generic | query serviceKey | guardCourseScope + lesson↔course 일치 | enrollment 소유 확인 | W | **FIXED** |
| GET /certificates | KPA·KCos·GP | generic | query serviceKey | course JOIN SQL 필터 | requireAuth | R | **FIXED** |
| GET /certificates/me | KPA·KCos·GP | generic | query serviceKey | course JOIN SQL 필터 | requireAuth(본인) | R | **FIXED** |
| GET /certificates/verify/:verificationCode | KPA·GP | generic | query serviceKey | guardLoadedCourseScope | requireAuth | R | **FIXED** |
| GET /certificates/number/:certificateNumber | KPA·GP | generic | query serviceKey | guardLoadedCourseScope | requireAuth | R | **FIXED** |
| GET /certificates/:id | KPA·KCos·GP | generic | query serviceKey | guardLoadedCourseScope | requireAuth | R | **FIXED** |
| GET /certificates/:id/pdf | KPA·GP | generic | query serviceKey | guardLoadedCourseScope(소유자 확인보다 먼저) | 본인만 | R | **FIXED** |

### 3-2. INTENTIONALLY_UNSCOPED (1건)

| method/path | 판정 근거 |
|---|---|
| GET /certificates/:id/verify | **공개 수료증 진위 확인**. 인증 없이 QR/링크로 접근하는 대외 검증 경로이고, 응답은 `{valid, 이름, 과정명, 발급일}` 로 제한된다. 서비스 도메인을 몰라도 검증 가능해야 하므로 scope 를 걸지 않는다. 발급 도메인 링크는 `course.serviceKey` 기준으로 결정된다(`resolveVerificationBase`). |

### 3-3. PLATFORM_GENERIC (40건) — generic 유지, 판정 근거 명시

강사(`requireInstructor`) · 운영자(`requireKpaScope('kpa:operator')`) · 관리자 전용 경로다.
**서비스 사용자 화면(learner UI)에서 호출되지 않는다.** 권한 guard 로 접근 주체가 이미 제한되고,
운영/관리 콘솔은 여러 서비스 강의를 한 화면에서 다루는 것이 현행 계약이라 generic 을 유지한다.
(운영 콘솔 단위의 service scope 정렬은 별도 트랙 — §11 잔존 위험 3)

| 분류 | endpoint |
|---|---|
| Course 관리 (7) | POST /courses · PATCH /courses/:id · DELETE /courses/:id · POST /courses/:id/publish · /submit-review · /unpublish · /archive |
| Lesson 관리 (4) | POST /courses/:courseId/lessons · PATCH /lessons/:id · DELETE /lessons/:id · POST /courses/:courseId/lessons/reorder |
| Quiz 관리 (2) | POST /quizzes · PATCH /quizzes/:quizId |
| Assignment 관리 (1) | POST /assignments |
| Certificate 관리 (4) | POST /certificates/issue · PATCH /certificates/:id · POST /certificates/:id/revoke · POST /certificates/:id/renew |
| Instructor 콘솔 (17) | POST /instructor/apply · GET /instructor/applications · POST /instructor/applications/:id/approve · /reject · GET /instructor/courses · /instructor/courses/:courseId/lessons · /points · GET /instructor/enrollments · /instructor/dashboard/courses · /instructor/participants/:courseId · /summary · /export · /instructor/dashboard/stats/:courseId · POST /instructor/enrollments/:id/approve · /reject · GET /instructor/lessons/:lessonId/submissions · POST /instructor/submissions/:submissionId/grade |
| Operator 승인 (5) | POST /operator/courses/:id/approve · /reject · /unpublish · /archive · DELETE /operator/courses/:id/hard |

---

## 4. Enrollment write boundary (WO §4)

- `POST /lms/courses/:courseId/enroll` 은 **등록 레코드를 만들기 전에** `guardCourseScope` 로
  `lms_courses.service_key` 를 확인한다. 타 서비스 courseId → 404, 등록 생성 0.
- 목록(`/enrollments`, `/enrollments/me`)은 `EnrollmentService` 의 QueryBuilder 에
  `applyCourseScopeToQuery` 로 SQL 조건을 건다. client 가 보낸 `serviceKey` 원문은
  controller 에서 **canonical 해석값으로 덮어쓴다**(스푸핑 차단).
- 단건/상태 변경(`PATCH`, `start`, `complete`, `cancel`)은 `ensureEnrollmentInScope` 로
  enrollment → course.serviceKey 를 확인한 뒤에만 진행한다.

## 5. Lesson boundary (WO §5)

- 목록 `GET /courses/:courseId/lessons` 와 단건 `GET /lessons/:id` 는 공통 middleware
  `requireEnrollment` 를 지난다. 여기에 course `serviceKey` 판정을 **1곳**만 추가해
  두 경로를 동시에 덮었다(중복 판정 없음).
- `LessonController.getLesson` 에도 `guardLessonScope` 를 독립 배치해, middleware 조합이
  바뀌어도 단건 read 가 무방비가 되지 않게 했다.
- quiz/assignment 단건은 lesson→course 역추적으로 판정한다. **신규 기능 구현은 하지 않았다.**

## 6. Progress boundary (WO §6)

- `POST /enrollments/:courseId/progress` 판정 순서:
  `guardCourseScope(courseId)` → enrollment 소유 확인 → **`lesson.courseId === courseId` 일치 확인** → progress mutation.
- 기존에는 lesson 이 다른 course(=다른 서비스)에 속해도 진도 기록이 가능했다. 이제 불가능하다.
- 진도 계산식·집계 로직은 **변경하지 않았다**.
- `GET /completions/me` 는 `course_completions` × `lms_courses` JOIN 으로 scope 를 건다.
- **cross-service progress write: 0**

## 7. Certificate boundary (WO §7)

- 목록(`/certificates`, `/certificates/me`)은 SQL JOIN 필터, 단건(`:id` · `number/:num` ·
  `verify/:code` · `:id/pdf`)은 `guardLoadedCourseScope`.
- PDF 다운로드는 **service scope 를 소유자 확인보다 먼저** 판정한다 (WO §3 판정 순서).
- **KPA / GP / KCos 의 수료증 발급 정책·UX 는 통일하지 않았다.** 발급 조건, 검증 도메인
  (`resolveVerificationBase`), 응답 DTO 모두 기존 그대로다.
- 프런트 결함 1건 수정: GlycoPharm `downloadCertificate` 가 존재하지 않는
  `/lms/certificates/:id/download` 를 호출해 404 였다 → canonical `/pdf` 로 교정.

## 8. Generic route 처리 (WO §8)

### 8-1. 분류 결과

| 분류 | 건수 | 처리 |
|---|---:|---|
| A) 서비스 사용자 전용 → scope 필수 | 27 | 전부 scope 적용 (§3-1) |
| B) 플랫폼/관리 공통 → generic 유지 | 40 | 권한 guard 로 주체 제한 + 근거 명시 (§3-3) |
| C) 혼재 | 1 | `GET /certificates/:id/verify` — 공개 검증 경로로 확정, 명시적 unscoped (§3-2) |

**서비스 사용자 화면에서 unscoped LMS read/write: 0**

### 8-2. 서비스별 진입 방식

| 서비스 | LMS 진입 | scope 근원 |
|---|---|---|
| KPA-Society | `/api/v1/kpa/lms/*` | **route context** (client 값 무시 — 스푸핑 차단) |
| K-Cosmetics | generic `/api/v1/lms/*` | apiClient 가 `serviceKey=k-cosmetics` 부착 |
| GlycoPharm | generic `/api/v1/lms/*` | apiClient 가 `serviceKey=glycopharm` 부착 |
| Neture / PharmacyHub / KPA-Branch | **LMS 소비처 0** | 해당 없음 (코드 기준 확인) |

### 8-3. 프런트 serviceKey 주입

`services/web-k-cosmetics/src/lib/apiClient.ts` · `services/web-glycopharm/src/lib/apiClient.ts`
에 `/lms/*` 한정 axios request interceptor 를 1개씩 추가했다.

- 호출부마다 붙이지 않으므로 **누락이 구조적으로 불가능**하다.
- 이미 `serviceKey` 가 지정된 요청(`@o4o/lms-client` 의 `withScope`)은 덮어쓰지 않는다 →
  **중복 파라미터(배열) 발생 0**.
- 이는 client-side filtering 이 **아니다**. 서버 SQL 필터의 입력값일 뿐이며, 값이 없거나
  틀리면 서버가 400/404 로 판정한다.

### 8-4. 중복 파라미터 안전장치

`resolveLmsServiceScope` 가 `req.query.serviceKey` 배열을 받으면 첫 값을 사용한다.
(이전 구현은 배열이면 무시 → **무경계 요청으로 조용히 강등**되는 잠재 결함이었다.)

---

## 9. KPA remount 매트릭스 (WO §9)

`/api/v1/kpa/lms/*` 25건. 공통 router 와 대조한 결과.

| 상태 | 건수 | endpoint |
|---|---:|---|
| MOUNTED | 19 | GET /courses · /courses/:id · /courses/:courseId/lessons · /lessons/:id · /enrollments · /enrollments/me · /enrollments/me/course/:courseId · /enrollments/:courseId · POST /courses/:courseId/enroll · POST /enrollments/:courseId/progress · GET /certificates · /certificates/:id · /completions/me · **+ 아래 MISSING 6건 (이번에 mount)** |
| MOUNTED (KPA 고유) | 1 | GET /instructors/:userId/public-profile — 공통 router 에 없는 KPA 전용 공개 프로필 |
| MOUNTED (operator) | 5 | POST /operator/courses/:id/unpublish · /approve · /reject · /archive · DELETE /operator/courses/:id/hard |
| **MISSING_BUT_REQUIRED → 이번에 mount** | 6 | GET /lessons/:lessonId/quiz · POST /quizzes/:quizId/submit · GET /quizzes/:quizId/attempts · GET /lessons/:lessonId/assignment · POST /assignments/:assignmentId/submit · GET /assignments/:assignmentId/my |
| INTENTIONALLY_NOT_MOUNTED | — | generic 의 강사/관리 write 경로(§3-3 40건). KPA 강사·운영 콘솔은 generic 경로를 권한 guard 와 함께 그대로 쓴다. 별도 remount 는 계약 중복만 만든다. |

**MISSING_BUT_REQUIRED 판정 근거**: KPA 프런트 `lmsViewAdapter` 가 이 6개를 실제로 호출하는데
`/api/v1/kpa/lms/*` 에 없어 **404** 였다. quiz/assignment **신규 기능 구현이 아니라 routing 결함**
이므로, 공통 router 와 동일한 controller·guard 로 remount 만 했다.

## 10. API contract 보존 (WO §10)

| 항목 | 변경 |
|---|---|
| route 형태 | 변경 없음 (KPA remount 6건 **추가**만) |
| response DTO | 변경 없음 |
| error code | 변경 없음 (`NOT_FOUND` / `INVALID_SERVICE_KEY` 기존 코드 재사용) |
| enrollment/progress/certificate 의미 | 변경 없음 |
| serviceKey 파라미터 | **선택적**. 없으면 기존과 동일한 무경계 동작(legacy/admin 호환) |

---

## 11. Cross-service 차단 테스트 (WO §11)

신규 스펙: `apps/api-server/src/__tests__/lms-crossservice-read-write-boundary.spec.ts` — **32 tests PASS**

| 축 | 동일 서비스 | 타 서비스 |
|---|---|---|
| Enrollment (enroll write) | PASS(통과) | **404 차단** |
| Enrollment 단건/상태변경 | PASS | **404 차단** |
| Lesson (목록·단건) | PASS | **404 차단** |
| Quiz / Assignment | PASS | **404 차단** |
| Progress write | PASS | **404 차단** (course scope + lesson↔course 불일치) |
| Certificate (단건·PDF·목록) | PASS | **404 차단** |
| Generic (user-facing 경로) | serviceKey 미부착 경로 0 (정적 가드) | — |

추가 고정 항목: legacy `service_key IS NULL` 은 KPA scope 에만 포함 · 알 수 없는 serviceKey → 400 ·
중복 serviceKey 배열에도 scope 유지 · raw SQL parameter binding · KPA remount 6건 · 프런트 주입.

응답은 기존 **non-disclosure 계약**을 따른다(403 아님, 404).

기존 스펙 `lms-public-course-service-scope.spec.ts` 20 tests 도 회귀 없이 PASS.

---

## 12. 프로덕션 데이터 read-only 검증 (WO §12)

`cloud-sql-proxy` 경유 SELECT 만 수행. **write 0.**

| 항목 | 결과 |
|---|---|
| `lms_courses` service_key 분포 | `kpa-society` 7건 / **NULL 0건** |
| `lms_lessons` | 5건, `courseId` NULL 0 / orphan(course 없음) 0 |
| `lms_enrollments` → course | 9건 전부 `kpa-society` / course 없는 고아 0 |
| `lms_certificates` | **0건** |
| `course_completions` → course | 2건 전부 `kpa-society` |
| `lms_progress` → lesson → course | 2건 전부 `kpa-society` |
| `lms_quizzes` | 5건, `lessonId` NULL 0 / `courseId` NULL 0 |
| `lms_quiz_attempts` → course | 5건 전부 `kpa-society` |
| `lms_assignments` / `lms_submissions` | 각 0건 |

→ 현재 운영 데이터에 **service_key NULL 도 cross-service 관계도 없다.**
결함은 데이터가 아니라 **구조**였다(KCos/GP 화면이 KPA 강의를 그대로 보고 있었고,
courseId 만 알면 write 도 가능했다).

---

## 13. 브라우저 smoke (WO §13)

프로덕션 배포 후 Playwright 실측 (2026-08-18, revision `o4o-core-api-03345-zt6`).

### 13-1. 비로그인

| 서비스 | 경로 | LMS 호출 | 결과 |
|---|---|---|---|
| KPA-Society | `/lms` → 상세 | `200 /kpa/lms/courses?status=published` n=3 keys=`["kpa-society"]` · `200 /kpa/lms/courses/:id` · `200 .../lessons` | PASS — 혼입 0 |
| K-Cosmetics | `/lms` | `200 /lms/courses?serviceKey=k-cosmetics&status=published` n=0 keys=`[]` | PASS — "총 0개의 강의" (이전에는 KPA 강의 노출) |
| GlycoPharm | `/lms` | `200 /lms/courses?serviceKey=glycopharm&status=published` n=0 keys=`[]` | PASS — "총 0개의 강의" |

### 13-2. 로그인 (KPA, `docs/local/TEST-ACCOUNTS.local.md` KPA operator)

| 단계 | 호출 | 결과 |
|---|---|---|
| `/lms` 목록 | `200 /kpa/lms/courses?status=published&page=1&limit=20` n=5 keys=`["kpa-society"]` | PASS — "총 5개의 강의" |
| 강의 상세 | `200 /kpa/lms/courses/:courseId` | PASS |
| 커리큘럼 | `200 /kpa/lms/courses/:courseId/lessons` n=1 | PASS |
| 수강 상태 | `200 /kpa/lms/enrollments/me/course/:courseId` | PASS |
| 레슨 진입 | `200 /kpa/lms/lessons/:lessonId` (`/lms/course/:courseId/lesson/:lessonId`) | PASS — 진도율 UI 정상 |

### 13-3. 기준 대비 판정

| 기준 | 결과 |
|---|---|
| cross-service 혼입 0 | **PASS** — 3 서비스 모두 자기 serviceKey 만 |
| white screen 0 | **PASS** |
| LMS 경로 404·500 0 | **PASS** — LMS 호출 전부 200 |
| JS exception 0 | **PASS** — 스크립트 예외 0 |
| 콘솔 오류 0 | **부분** — KPA 강의 상세에서 404 리소스 오류 6~10건. **LMS 아님** (아래 §15-4) |

---

## 14. 변경 파일

### Backend (12)

| 파일 | 변경 |
|---|---|
| `modules/lms/utils/lms-scope-guard.ts` | **신규** — 판정 모듈 |
| `modules/lms/utils/lms-service-scope.ts` | serviceKey 중복 전달(배열) 안전 처리 |
| `modules/lms/controllers/EnrollmentController.ts` | enroll·progress·단건·목록·상태변경 scope |
| `modules/lms/services/EnrollmentService.ts` | 목록 SQL scope 필터 |
| `modules/lms/controllers/CertificateController.ts` | 단건·PDF·목록 scope |
| `modules/lms/services/CertificateService.ts` | 목록 SQL scope 필터 |
| `modules/lms/controllers/CompletionController.ts` | `/completions/me` scope |
| `modules/lms/services/CompletionService.ts` | course JOIN scope 필터 |
| `modules/lms/middleware/requireEnrollment.ts` | lesson 목록·단건 공통 scope 판정 |
| `modules/lms/controllers/LessonController.ts` | 단건 scope |
| `modules/lms/controllers/QuizController.ts` · `AssignmentController.ts` | course 역추적 scope |
| `routes/kpa/kpa.routes.ts` | quiz/assignment 6건 remount |
| `__tests__/lms-crossservice-read-write-boundary.spec.ts` | **신규** 스펙 |

### Frontend (3)

| 파일 | 변경 |
|---|---|
| `services/web-glycopharm/src/lib/apiClient.ts` | `/lms/*` serviceKey interceptor |
| `services/web-k-cosmetics/src/lib/apiClient.ts` | `/lms/*` serviceKey interceptor |
| `services/web-glycopharm/src/api/lms.ts` | 수료증 다운로드 canonical `/pdf` 경로 교정 |

**DB migration 0 · entity 변경 0 · 신규 테이블 0.**

---

## 15. 잔존 위험

1. **enrollment 소유권 미확인 (범위 밖 / 우선순위 높음)**
   `PATCH /enrollments/:id`, `/start`, `/complete`, `/cancel` 은 **소유자 확인이 전혀 없다.**
   인증된 사용자면 남의 enrollment id 로 상태를 바꿀 수 있다.
   이번 WO 로 *서비스 경계*는 닫혔지만(타 서비스 enrollment 는 404), **같은 서비스 안의
   타인 enrollment 는 여전히 변경 가능**하다.
   → WO §14 가 "enrollment 정책 재설계"를 제외 범위로 명시하므로 손대지 않았다. **별도 WO 필요.**

2. **KPA `/courses/:courseId/lessons` 는 `optionalAuth`, generic 은 `requireAuth + requireEnrollment`**
   비로그인 KPA 사용자의 강의 소개(커리큘럼) 열람을 위한 기존 UX 차이다.
   route context 로 service scope 는 강제되므로 cross-service 구멍은 아니다.
   가시성 정책 통일은 별도 판단 사항.

3. **강사/운영 콘솔은 generic 유지** (§3-3 40건)
   여러 서비스 강의를 한 화면에서 다루는 현행 계약을 보존했다. 운영 콘솔 단위의
   service scope 정렬이 필요하면 별도 트랙.

4. **KPA 강의 상세의 `appreciation` 404 (LMS 무관 · 범위 밖)**
   `/api/v1/kpa/appreciation/lms_course/:id/{summary,recent}` 가 404 다.
   원인은 `services/web-kpa-society/src/api/appreciation.ts` 가 base `/api/v1/kpa` 인 `apiClient` 를
   쓰는데, 백엔드는 `app.use('/api/v1/appreciation', ...)` 로만 마운트돼 있다 (`coreApiClient` 를 써야 함).
   Forum·Contents·MyDashboard 도 같은 클라이언트를 쓰므로 **LMS 한정 문제가 아니고 이번 WO 이전부터 존재**한다.
   WO §14 "무관한 404 수정 금지" 에 해당하여 손대지 않았다. **별도 WO 필요.**

5. **GlycoPharm `getMyCertificate` 는 dead code**
   존재하지 않는 `/lms/certificates/course/:courseId` 를 호출하지만 **호출부가 없다**.
   실패를 삼켜 `null` 을 반환하는 형태라 load-error 계약에도 어긋난다.
   범위 밖이라 제거하지 않고 기록만 한다.

---

## 16. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(잔존 위험 1 — enrollment 소유권 / 잔존 위험 4 — appreciation client base 불일치).

---

*본 WO 완료는 LMS cross-service read/write boundary 완료일 뿐, 커뮤니티 전체 공통화 완료를 의미하지 않는다.*
