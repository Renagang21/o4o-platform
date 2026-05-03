# O4O LMS Client V2 Complete

> **상위 문서**: `CLAUDE.md` · `docs/architecture/APP-LMS-BASELINE.md` · `docs/architecture/LMS-CLIENT-CONVENTION-V1.md`
> **선행 IR/문서**: `docs/architecture/LMS-CLIENT-EXTRACTION-V2-IMPACT.md`
> **버전**: V1 — Final
> **작성일**: 2026-05-03
> **상태**: **V2 COMPLETE**
> **WO**: WO-O4O-LMS-CLIENT-V2-COMPLETE-DOC-V1
>
> 본 문서는 `WO-O4O-LMS-CLIENT-EXTRACTION-V2` 가 구조적으로 완료되었음을 확정한다. 이후 LMS frontend client 관련 작업은 본 문서에 정의된 적용 상태와 예외 사항을 기준으로 판정한다.

---

## 1. 개요

`WO-O4O-LMS-CLIENT-EXTRACTION-V2` 는 O4O LMS 의 frontend API 호출 구조를 `@o4o/lms-client` 기반으로 통일하는 작업이다.

V2 작업은 IMPACT 분석에서 도출된 **2단계 안전 분할 전략(Option B)** 을 채택했다:
- **Step 1**: 학습자 read-only 메서드 5개 추출 (회귀 위험 낮음)
- **Step 2**: 학습자 write 메서드 3개 추출 (데이터 변경 — Step 1 안정화 후 진행)

본 문서는 두 Step 모두 완료되어 V2 가 구조적으로 종료되었음을 선언한다.

---

## 2. 완료 범위

### 2.1 Read API (Step 1 — 커밋 `72ba3ff05`)

| 메서드 | Endpoint | factory 반환 |
|---|---|---|
| `getCourse(id)` | `GET /lms/courses/:id` | `LmsApiResponse<{ course: T }>` |
| `getCourses(params)` | `GET /lms/courses` | `LmsPaginatedResponse<T>` |
| `getLessons(courseId)` | `GET /lms/courses/:id/lessons` | `LmsApiResponse<T[]>` |
| `getEnrollmentByCourse(courseId)` | `GET /lms/enrollments/me/course/:id` | `LmsApiResponse<{ enrollment: T }>` |
| `getQuizForLesson(lessonId)` | `GET /lms/lessons/:id/quiz` | `LmsApiResponse<{ quiz: T }>` |

### 2.2 Write API (Step 2 — 커밋 `b7057c3bd`)

| 메서드 | Endpoint | factory 반환 |
|---|---|---|
| `enrollCourse(courseId)` | `POST /lms/courses/:id/enroll` | `LmsApiResponse<{ enrollment: T }>` |
| `updateProgress(courseId, lessonId, completed)` | `POST /lms/enrollments/:id/progress` | `LmsApiResponse<{ enrollment: T }>` |
| `submitQuiz(quizId, answers)` | `POST /lms/quizzes/:id/submit` | `LmsApiResponse<TResult>` |

### 2.3 추가로 V2 구간에 들어온 항목
- `getInstructorCourses` — V1 SCOPED(`0318a02e1`)에서 선행 추출.

---

## 3. 적용 상태

### 3.1 KPA-Society

| 항목 | 상태 |
|---|---|
| Read API factory 적용 | ✅ **Cleanup-V1 시점에 채택** (V2 Step 1/2 본문에서는 KPA read 미적용 — V2 발표 직후 구조 검증 IR(`IR-O4O-LMS-COMMONIZATION-VERIFY-V1`)에서 PARTIAL 판정 후 Cleanup WO 로 정렬) |
| Write API factory 적용 | ✅ Step 2 |
| baseURL | `/api/v1/kpa` 유지 |
| 페이지 코드 수정 | Cleanup-V1 에서 1건(`MyEnrollmentsPage` direct call 제거). Step 1/2 본문에서는 0 |
| operator 메서드 (`operator*` 6개) | local 유지 (KPA 전용) |
| `lms-instructor.ts` (27개 강사용 메서드) | local 유지 (KPA 전용) |
| `getLesson` | local 유지 — GlycoPharm backend 미구현(Phase 5) |
| `getMyEnrollments` | Cleanup-V1 에서 endpoint 정정 + factory 채택 (`/lms/enrollments` → `/lms/enrollments/me`) |

### 3.2 GlycoPharm

| 항목 | 상태 |
|---|---|
| Read API factory 적용 | ✅ Step 1 (4/5 — `getEnrollmentByCourse` 제외) |
| Write API factory 적용 | ✅ Step 2 |
| unwrap 패턴 (`data.data.X`, try/catch null) | 보존 |
| Enrollment endpoint | `/lms/enrollments/:courseId` 유지 (factory 와 다름) |
| Phase 2 deprecated alias (`getCourseById` 등) | 보존 |
| `InstructorDashboardPage` 페이지 직접 호출 | Cleanup-V1 에서 `lmsApi.getInstructorCourses()` 로 정렬 |

### 3.3 K-Cosmetics

| 항목 | 상태 |
|---|---|
| Read API factory 적용 | ✅ Step 1 |
| Write API factory 적용 | ✅ Step 2 |
| 구조 | thin wrapper, public API 동일 |
| `getLesson` | local 유지 (Glyco 미구현으로 factory 미포함) |

---

## 4. 공통화 결과

| 결과 | 설명 |
|---|---|
| 3개 서비스 LMS client 통일 | 9개 학습자 메서드(5 read + 3 write + 1 instructor)가 `@o4o/lms-client` 단일 factory 기반 |
| 페이지 코드 수정 | 0 — public API surface 보존 (시그니처/반환형 동일) |
| Endpoint 변경 | 0 — 모든 기존 endpoint 그대로 유지 |
| 신규 패키지 | `@o4o/lms-client` (base types + `createLmsLearnerClient` + `createLmsInstructorClient` + `LmsHttpClient` adapter 인터페이스) |
| HTTP adapter | 서비스별 자체 http 클라이언트(KPA fetch wrapper, Glyco/K-Cos axios) 주입 |

---

## 5. 검증 결과

### 5.1 Static 검증

| 항목 | 결과 |
|---|---|
| `@o4o/lms-client` `tsc -b` build | ✅ PASS |
| web-kpa-society `tsc --noEmit` | ✅ PASS |
| web-glycopharm `tsc --noEmit -p tsconfig.app.json` | ✅ PASS |
| web-k-cosmetics `tsc --noEmit` | ✅ PASS |
| 배포된 bundle 에 factory paths 포함 | ✅ 3개 서비스 모두 확인 |
| Backend API envelope 계약 (`{success, data, ...}`) | ✅ factory `LmsApiResponse<T>` 와 일치 |

### 5.2 운영 로그 검증

| 항목 | 결과 |
|---|---|
| K-Cos / Glyco / KPA web 컨테이너 ERROR (Step 2 배포 후 1h) | ✅ 0건 |
| API LMS 4xx/5xx | ✅ 0건 (테스트 호출 외) |

### 5.3 실제 write 검증

| 항목 | 결과 |
|---|---|
| Endpoint 계약 (`POST` no-auth → 401 + 표준 envelope) | ✅ PASS |
| 실제 enroll → DB INSERT 흐름 | 미수행 (CLAUDE.md §0 정책: 데이터 변경은 사용자 승인 필요. published 강의 0개로 자연 트래픽도 부재) |
| Idempotency, progress 누적, quiz 채점 | 미수행 (위와 동일) |

→ 정적 + 로그 + 계약 검증으로 회귀 위험 차단. 실제 write 흐름 검증은 향후 자연 트래픽 또는 사용자 직접 1회 시도로 보완.

---

## 6. 예외 및 의도적 유지 사항

### 6.1 GlycoPharm enrollment endpoint divergence

- factory: `GET /lms/enrollments/me/course/:courseId`
- Glyco: `GET /lms/enrollments/:courseId` (local 유지)
- 사유: 두 endpoint 가 백엔드에서 각각 별도 라우트로 등록되어 있고 (`apps/api-server/src/modules/lms/routes/lms.routes.ts` line 154 vs 169), 변경 시 Glyco 페이지의 동작이 달라질 위험.
- WO §8 "endpoint 변경 금지" 정책에 따라 보존.

### 6.2 GlycoPharm unwrap 패턴 유지

- factory 는 envelope(`LmsApiResponse<T>`) 반환.
- Glyco thin wrapper 는 내부에서 `res.data.course` 등 unwrap 후 페이지에 plain 객체 전달.
- 사유: GlycoPharm 페이지(`CourseDetailPage.tsx`) 가 직접 객체 필드 접근에 의존. envelope 노출 시 페이지 다수 수정 필요.

### 6.3 KPA baseURL prefix

- KPA `apiClient` 가 `/api/v1/kpa` 네임스페이스 사용.
- factory 는 path-only(`/lms/courses` 등) 호출. KPA adapter 가 자동 결합 — 결과: `/api/v1/kpa/lms/courses`.
- 다른 서비스(Glyco/K-Cos)는 `/api/v1/lms/*`. 백엔드는 양쪽 다 처리.
- 본 작업 범위 외 — 별도 인프라 audit 필요 시 `WO-O4O-INFRA-KPA-API-PREFIX-AUDIT-V*`.

### 6.4 KPA 강사·운영자 메서드 미공통화

- `lms-instructor.ts` 의 27개 강사 메서드, `lms.ts` 의 6개 operator 메서드는 KPA 전용으로 다른 서비스 미사용.
- factory 추가 시 다른 서비스에 dead code 가 됨.
- V2 범위 외. 향후 강사 측 공통화 진행 시 별도 WO.

### 6.5 GlycoPharm `getLesson` 미구현

- 표준 메서드이나 GlycoPharm `lms.ts` 에 미정의.
- backend 동일 endpoint(`GET /lms/lessons/:id`) 존재 여부 검증 후 추가 가능.
- Phase 5 후보.

---

## 7. 현재 LMS 공통화 수준

| 영역 | 상태 |
|---|---|
| Backend (`/api/v1/lms/*` 모듈) | ✅ 공통 (이전부터) |
| Frontend Client | ✅ **V2 완료 (본 문서)** |
| Frontend UI Template (`LmsHubTemplate` 등) | ❌ 미공통 — APP-LMS Phase 3 |
| Frontend 페이지 구조 (`/lms`, `/instructor`) | △ 부분 공통 — 라우트는 표준화, 페이지 컴포넌트는 서비스별 |
| Data 격리 정책 | △ KPA 중심 (`organizationId` + `kpa_members`) — Phase 5 검토 |

---

## 8. Phase 5 (후속 작업 후보)

다음 작업은 V2 COMPLETE 이후 선택 가능 — 모두 **필수 아님**:

| WO 후보 | 내용 | 영향 |
|---|---|---|
| `WO-O4O-LMS-GLYCOPHARM-ENROLLMENT-ENDPOINT-ALIGN-V1` | Glyco enrollment endpoint 를 factory의 `/me/course/...` 로 정렬 | GlycoPharm 2 페이지 |
| `WO-O4O-LMS-GLYCOPHARM-RESPONSE-ALIGNMENT-V1` | Glyco unwrap 제거 → envelope 노출 통일 | GlycoPharm 2 페이지 |
| `WO-O4O-LMS-GETLESSON-BACKFILL-V1` | factory 에 `getLesson` 추가 + Glyco 페이지 적용 | factory + Glyco |
| `WO-O4O-LMS-KPA-INSTRUCTOR-EXTRACTION-V1` | KPA `lms-instructor.ts` 27개 메서드 공통화 검토 (3개 서비스 강사 측 활용 시) | 큰 작업 |
| `WO-O4O-LMS-PAGE-DEFENSIVE-CAST-CLEANUP-V1` | KPA 9파일의 `(res as any).data?.X ?? null` 패턴 → 타입 명시 | KPA 9파일 |
| `WO-O4O-INFRA-KPA-API-PREFIX-AUDIT-V1` | `/api/v1/kpa` namespace 의 LMS 라우팅 검증 | infra |

---

## 9. 결론

> **`WO-O4O-LMS-CLIENT-EXTRACTION-V2` — V2 COMPLETE**

- 구조 공통화: ✅ 완료
- 서비스 간 API 호출 통일: ✅ 완료 (3개 서비스 × 9개 메서드)
- 회귀: ✅ 정적·로그·계약 검증에서 0
- 페이지 변경: 0 — public API 보존
- Endpoint 변경: 0 — 기존 동작 보존

```
상태:  V2 COMPLETE
일자:  2026-05-03
커밋:  72ba3ff05 (Step 1) → b7057c3bd (Step 2)
```

본 문서가 LMS frontend client 공통화의 종료 마커이다. 이후 LMS UI Template 공통화(APP-LMS Phase 3) 또는 §8 Phase 5 작업으로 자연스럽게 이어질 수 있다.

---

## 10. 관련 커밋·문서 인덱스

### 커밋
- `e03c1b38c` — WO-O4O-LMS-CLIENT-EXTRACTION-V2-IMPACT-DOC-V1
- `72ba3ff05` — WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP1
- `b7057c3bd` — WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP2
- `fc220cd48` — WO-O4O-LMS-CLIENT-V2-COMPLETE-DOC-V1 (V2 closure declaration — KPA Read API 표기 오류는 Cleanup-V1 에서 정정됨)
- (Cleanup) WO-O4O-LMS-V2-COMMONIZATION-CLEANUP-V1 — page direct call 2건 제거 + KPA read 6 메서드 factory 채택 + 본 문서 정정
- (선행) `0318a02e1` — WO-O4O-LMS-CLIENT-EXTRACTION-V1-SCOPED
- (선행) `000f975e3` — WO-O4O-LMS-GLYCOPHARM-METHOD-ALIGNMENT-V1
- (선행) `30dbac357` — WO-O4O-LMS-SCOPE-GUARD-DOC-V1
- (선행) `e87c33f9a` — WO-O4O-APP-LMS-BASELINE-V1

### 문서
- [APP-LMS-BASELINE.md](APP-LMS-BASELINE.md) — APP-LMS 표준
- [LMS-CLIENT-CONVENTION-V1.md](LMS-CLIENT-CONVENTION-V1.md) — 정렬 기준
- [LMS-CLIENT-EXTRACTION-V2-IMPACT.md](LMS-CLIENT-EXTRACTION-V2-IMPACT.md) — V2 영향 분석
- [LMS-SCOPE-GUARD.md](LMS-SCOPE-GUARD.md) — 백엔드 가드 설계

### 패키지
- [packages/lms-client/](../../packages/lms-client/)
