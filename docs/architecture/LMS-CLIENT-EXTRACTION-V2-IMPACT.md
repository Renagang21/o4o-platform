# LMS Client Extraction V2 — Impact Analysis

> **상위 문서**: `CLAUDE.md` · `docs/architecture/LMS-CLIENT-CONVENTION-V1.md` · `docs/architecture/APP-LMS-BASELINE.md`
> **버전**: V1
> **작성일**: 2026-05-02
> **상태**: Active — V2 실행 설계 문서
> **상위 IR**: IR-O4O-LMS-CLIENT-EXTRACTION-V2-IMPACT-V1
> **WO**: WO-O4O-LMS-CLIENT-EXTRACTION-V2-IMPACT-DOC-V1
>
> **This document defines the execution strategy for LMS Client Extraction V2. All related WO must follow this document.**
>
> 본 문서는 V2 추출 작업의 영향 범위·리스크·실행 전략을 고정한다. Step 1/Step 2 의 모든 PR 은 본 문서를 기준으로 검토한다.

---

## 1. 영향 파일 목록

| 서비스 | 파일 수 | 호출 횟수 | 주요 파일 |
|---|---|---|---|
| **KPA-Society** | **12** | 65 | `LmsLessonPage.tsx` (39회), `OperatorLmsCoursesPage.tsx` (9회), `LmsCourseDetailPage.tsx` (4회) |
| **GlycoPharm** | **2** | 12 | `CourseDetailPage.tsx` (11회), `EducationPage.tsx` (1회) |
| **K-Cosmetics** | **5** | 31 | `LmsLessonPage.tsx` (24회), `LmsCourseDetailPage.tsx` (4회) |
| **합계** | **19** | **108** | — |

### 서비스별 호출 메서드 개요

| 서비스 | 사용 표준 메서드 | 사용 KPA-only 메서드 |
|---|---|---|
| KPA | 9개 (getCourse, getCourses, getLessons, getLesson, getEnrollmentByCourse, enrollCourse, updateProgress, getQuizForLesson, submitQuiz) | 7개 (`getMyCertificates`, `getCertificate`, `downloadCertificate`, `getInstructorProfile`, `getMyCompletions`, `operator*` 6개, `getMyAssignmentSubmission`, `joinLive`) |
| GlycoPharm | 8개 + Phase 2 deprecated alias (getCourseById/getMyEnrollment/getLessonsByCourse/getLessonQuiz) | 0 |
| K-Cosmetics | 9개 + getInstructorCourses(V1 추출 완료) | 0 |

---

## 2. 반환 구조 의존도 분류

각 파일을 4개 패턴으로 분류:

| 패턴 | 정의 | KPA | Glyco | K-Cos |
|---|---|---|---|---|
| **A** | `(res as any).data?.X ?? res.data ?? null` (envelope + defensive fallback + `as any` 캐스팅) | **10** | 0 | **5** |
| **B** | `res.data` (단일 unwrap) | 0 | 2 | 0 |
| **C** | 직접 객체 사용 / 이중 unwrap (`.data.data.X`) | 0 | **2** | 0 |
| **D** | try/catch 후 null fallback | 2 | 1 | 0 |

### 핵심 발견
- **KPA는 거의 전부 패턴 A** — `(res as any).data` 식의 defensive cast가 30+회 반복 사용
- **Glyco는 lmsApi 내부에서 `data.data.course` 두 단계 unwrap** (페이지가 직접 객체 받음)
- **K-Cos는 KPA와 동일한 패턴 A** — 일관성 있음

---

## 3. 메서드별 영향 분석 (9개 표준 메서드)

| 메서드 | KPA 사용 파일 | Glyco | K-Cos | 시그니처 변경 영향 |
|---|---|---|---|---|
| `getCourse(id)` | 2 | 1 (deprecated alias) | 2 | 반환형 envelope 통일. Glyco는 페이지에서 직접 객체 접근 → envelope 추가 |
| `getCourses(params)` | 5 | 1 | 1 | `PaginatedResponse<T>` 타입 수렴 |
| `getLessons(courseId)` | 2 | 1 (deprecated alias) | 2 | Glyco의 `?? []` 폴백 제거 가능 |
| `getLesson(courseId, lessonId)` | 1 | **누락** | 1 | Glyco backend 미구현 → **Phase 5로 분리** |
| `getEnrollmentByCourse(courseId)` | 4 | 1 (deprecated alias) | 4 | Glyco의 try/catch null 폴백 정렬 필요 |
| `enrollCourse(courseId)` | 2 | 1 | 1 | 일관됨 |
| `updateProgress(courseId, lessonId, completed)` | 1 | 1 (Phase 2 통일됨) | 1 | ✅ 시그니처 통일 완료 |
| `getQuizForLesson(lessonId)` | 1 | 1 (deprecated alias) | 1 | Glyco try/catch null 폴백 |
| `submitQuiz(quizId, answers)` | 1 | 1 | 1 | 일관됨 |

### V2 범위 제외 메서드
- KPA 전용: `getMyCertificates`, `getCertificate`, `downloadCertificate`, `getInstructorProfile`, `getMyCompletions`, operator 메서드 6개
- Glyco 누락: `getLesson` (backend 확인 후 Phase 5)
- 별도 추출 완료: `getInstructorCourses` (V1, 커밋 `0318a02e1`)

---

## 4. 수정 규모

| 서비스 | 영향 파일 | 추정 변경 라인 | 주요 작업 |
|---|---|---|---|
| KPA | 12 | 72-120 | defensive cast 제거 → 라인 감소 효과 |
| GlycoPharm | 2 | 8-12 | Phase 5에서 envelope 전환 시 추가 |
| K-Cosmetics | 5 | 15-25 | KPA와 동일 패턴 정리 |
| 패키지 | 1 | +60 (학습자 factory) | createLmsLearnerClient 신설 |
| Adapter | 3 | +30 (서비스별) | http 인터페이스 주입 |
| **전체** | **22 파일** | **140-180 라인** | — |

---

## 5. 리스크 분석

| # | 리스크 | 가능성 | 영향 | 대응 |
|---|---|---|---|---|
| 1 | 백엔드 응답 envelope 보장 | 낮음 | 중 | Step 1 진행 전 backend 응답 형식 spot check |
| 2 | Glyco 이중 unwrap 레거시 | 중간 | 중 | Phase 5 별도 분리. V2 Step 1 에서는 lms.ts 가 envelope→객체 unwrap 책임 유지 |
| 3 | KPA `/api/v1/kpa` baseURL prefix | 낮음 | 중 | adapter 가 자동 결합 (LMS-SCOPE-GUARD §2 검증됨) |
| 4 | KPA 강사 메서드 추가 누락 | 낮음 | 낮음 | `getInstructorCourses`만 V1 추출. 학습자 측 V2 와 무관 |
| 5 | 최근 LMS backend 변경과 충돌 | 낮음 | 낮음 | 8a250df2c, 1c2ed3734 무관 확인 |
| 6 | Glyco `getLesson` 누락 | 높음 | 낮음 | Step 1 제외 → Phase 5 |
| 7 | 타입 호환성 (서비스별 Course 형태 상이) | 중간 | 중 | factory 에 generic 활용 (`createLmsLearnerClient<MyCourse>()`) |
| 8 | 동시 19파일 변경 회귀 | 중간 | 높음 | smoke test 필수, Step 1/2 분리로 분산 |
| 9 | pnpm-lock.yaml 재생성 | 높음 | 낮음 | WO 내 명시 (`--no-frozen-lockfile`) |
| 10 | KPA Dockerfile lms-client 미포함 | 중간 | 중 | Step 1 진행 전 KPA Dockerfile 검증 + 추가 |

---

## 6. 실행 전략 비교

| 옵션 | 작업 시간 | PR 수 | 회귀 가능성 | 리뷰 부담 |
|---|---|---|---|---|
| **A** 한 번에 V2 | 22-25h | 1 | **25%** | 큼 (22파일) |
| **B** 2단계 (read → write) | 22-26h | 2 | **15%** | 중간 |
| **C** 서비스별 순차 (K-Cos→Glyco→KPA) | 19-23h | 3 | **10%** | 작음 |

각 옵션의 핵심 비교:
- **A**: 일관성 최고, 회귀 영향 집중
- **B**: 읽기/쓰기 분리로 검증 단계화 — read-only 가 안전성 검증 베이스
- **C**: 서비스별 격리는 좋지만, 패키지 인터페이스가 차수마다 진화하면 재설계 발생

---

## 7. 추천 전략 — **옵션 B (2단계 V2)**

### 근거
1. **읽기/쓰기 분리는 안정성 검증의 표준 패턴** — read-only 안정화 → write 단계에서 의심 영역 좁아짐
2. **회귀율 25% → 15%** — 옵션 A 대비 40% 감소
3. **PR 리뷰 부담 분산** — 2개 작은 PR이 1개 큰 PR보다 30% 단축
4. **KPA defensive cast 30+회 일괄 정리** — 단일 PR로 무리. read-only 먼저 정리하면 페이지 코드 절반 정리 후 write 단계 진입

### 변형
- **`getInstructorCourses` 제외** (V1 완료)
- **`getLesson` Step 1 제외** (Glyco 미구현 → Phase 5)
- **KPA 전용 메서드 (certificate/operator/completion) 제외** (별도 instructor scope WO 또는 V3)

---

## 8. Step 1 / Step 2 작업 구조

### Step 1 — read-only 추출 (`WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP1`)

**대상 메서드**: `getCourse`, `getCourses`, `getLessons`, `getEnrollmentByCourse`, `getQuizForLesson` (5개, getLesson 제외)

**작업 단위**:
1. `@o4o/lms-client` 확장
   - `LmsHttpClient` 에 `post/patch/delete` 추가
   - `createLmsLearnerClient(http)` factory 신설 — 5개 메서드 envelope 반환
2. 서비스별 `lms.ts` thin wrapper 화
   - 내부 구현을 factory 호출로 교체
   - **public API surface 보존** (메서드명/시그니처/반환형 동일)
   - 페이지는 변경 없음 (1차 안전망)
3. 페이지 cleanup (선택적)
   - defensive cast 제거 — 안전 확인 후 진행
4. KPA Dockerfile 업데이트 (lms-client COPY + build)
5. pnpm-lock.yaml 재생성

**예상**: 16-22 파일, 140-180 라인, 12-14 시간

### Step 2 — write 추출 (`WO-O4O-LMS-CLIENT-EXTRACTION-V2-STEP2`, Step 1 1주 후)

**대상 메서드**: `enrollCourse`, `updateProgress`, `submitQuiz` (3개)

**작업 단위**:
1. factory 에 write 메서드 추가
2. 서비스 thin wrapper 갱신
3. E2E (enroll → updateProgress → submitQuiz 시나리오)

**예상**: 8 파일, 8-10 시간

### Phase 5 (선택) — Glyco unwrap 정렬 + getLesson 추가

**대상**: GlycoPharm `lms.ts` 의 `data.data.X` 두 단계 unwrap 제거 + 페이지 envelope unwrap 추가
**예상**: 2-3 파일, 4-6 시간

---

## 9. 제외 범위 (명시적)

V2 Step 1/2 에서 다음은 **하지 않는다**:

| 항목 | 사유 |
|---|---|
| KPA 전용 메서드 (`getMyCertificates`, `operator*`, `getInstructorProfile` 등) | 다른 서비스 미사용. 별도 KPA-only WO 또는 V3 |
| GlycoPharm `getLesson` 추가 | backend 확인 후 Phase 5 |
| GlycoPharm `data.data.X` unwrap 제거 | Phase 5 (페이지 동시 수정 필요) |
| KPA `/api/v1/kpa` baseURL 변경 | 별도 인프라 audit (`WO-O4O-INFRA-KPA-API-PREFIX-AUDIT-V*`) |
| 백엔드 수정 | 본 작업 범위 외 |
| 신규 메서드 추가 | 정렬·추출만, 기능 추가 없음 |
| ServiceKey 격리 정비 | APP-LMS Phase 5 |

---

## 10. 결론 및 다음 액션

> **V2 를 한 번에 끝낼 수 없다 — 2단계 권장.**

- Step 1 (read-only): 안전 베이스 확보, 회귀 위험 낮음
- Step 1 → 1주 안정화 → Step 2 (write)
- Phase 5: Glyco unwrap 정렬 + getLesson 추가 (선택)

본 문서는 Step 1/Step 2 PR 모두의 검토 기준 문서이다. 모든 V2 관련 PR 은 본 문서의 §3 (메서드 범위), §5 (리스크 대응), §9 (제외 범위) 와 일치해야 한다.

---

## 11. 참고 자료

- 상위 IR: IR-O4O-LMS-CLIENT-EXTRACTION-V2-IMPACT-V1 (이번 conversation)
- 상위 표준: [LMS-CLIENT-CONVENTION-V1.md](LMS-CLIENT-CONVENTION-V1.md)
- 직전 단계: `WO-O4O-LMS-CLIENT-EXTRACTION-V1-SCOPED` (커밋 `0318a02e1`)
- Glyco 정렬: `WO-O4O-LMS-GLYCOPHARM-METHOD-ALIGNMENT-V1` (커밋 `000f975e3`)
- 패키지 본체: [packages/lms-client/](../../packages/lms-client/)
