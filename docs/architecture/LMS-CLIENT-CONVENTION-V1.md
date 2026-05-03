# LMS Client Convention V1

> **상위 문서**: `CLAUDE.md` · `docs/architecture/APP-LMS-BASELINE.md`
> **관련**: `docs/architecture/LMS-SCOPE-GUARD.md`, `packages/lms-client/`
> **버전**: V1
> **작성일**: 2026-05-02
> **상태**: Active Standard
> **상위 IR**: IR-O4O-LMS-CLIENT-CONVENTION-ALIGNMENT-V1
> **WO**: WO-O4O-LMS-CLIENT-CONVENTION-DOC-V1
>
> 본 문서는 3개 서비스(KPA-Society, GlycoPharm, K-Cosmetics)의 LMS API client를 공통화 가능한 형태로 정렬하기 위한 기준이다. APP-LMS Phase 2(client extraction)의 모든 작업은 본 문서를 기준으로 판정한다.

---

## 1. 개요

- LMS 백엔드는 단일 모듈(`apps/api-server/src/modules/lms`)이지만, **frontend client는 3개 서비스에 분산**되어 있다.
- 직전 IR에서 메서드 이름 / 반환 형태 / 타입 / baseURL / unwrap 정책이 호환 불가 수준으로 다름이 확인됐다.
- 즉시 공통화를 강행하면 페이지 호출부 30+ 곳 동시 변경이 필요하므로 회귀 위험이 크다.
- 본 문서는 **공통화 직전의 정렬(convention) 기준**을 확정한다. 이후 `@o4o/lms-client` V2 추출은 이 기준을 따른다.

---

## 2. 서비스별 현황 요약

| 항목 | KPA-Society | GlycoPharm | K-Cosmetics |
|---|---|---|---|
| HTTP 클라이언트 | fetch wrapper (`apiClient`) | axios (`api`) | axios (`api`) |
| baseURL | `/api/v1/kpa` | `/api/v1` | `/api/v1` |
| 응답 형태 | envelope 유지 | **lmsApi 내부 unwrap** | envelope 유지 |
| 페이지 unwrap 패턴 | defensive (`res.data?.X ?? res.data ?? null`) | **직접 필드 접근** | defensive (KPA와 동일) |
| 학습자 페이지 수 | 9 | 2 | 3 |

---

## 3. 핵심 불일치 (5)

1. **메서드 이름 불일치** — GlycoPharm만 4개 다름: `getCourseById`, `getMyEnrollment`, `getLessonsByCourse`, `getLessonQuiz`. `getLesson` 누락.
2. **Unwrap 정책 차이** — GlycoPharm은 `data.data.course` 두 단계 unwrap을 lmsApi 내부에서 처리. KPA/K-Cos는 페이지에서 처리.
3. **`updateProgress` 시그니처 차이** — GlycoPharm은 `(courseId, lessonId)` (completed=true 고정), KPA/K-Cos는 `(courseId, lessonId, completed)`.
4. **baseURL prefix 차이** — KPA만 `/api/v1/kpa` 네임스페이스. 다른 서비스와 호환 불가.
5. **타입 구조 차이** — `Enrollment` 등 핵심 타입에서 `progress`, `completedLessons`, `course` 객체 등 필수 필드의 존재 여부가 서비스별로 다름.

---

## 4. 메서드 이름 표준

### 결정 원칙
KPA + K-Cos가 일치(2:1)하는 이름을 표준으로 채택한다. GlycoPharm 측 이름은 deprecated alias로 후속 정렬한다.

| 기능 | **표준** | deprecated alias (현재 GlycoPharm) |
|---|---|---|
| 강의 단건 조회 | `getCourse(id)` | `getCourseById` |
| 강의 목록 조회 | `getCourses(params)` | (동일) |
| 레슨 목록 조회 | `getLessons(courseId)` | `getLessonsByCourse` |
| 레슨 단건 조회 | `getLesson(courseId, lessonId)` | (GlycoPharm 누락 → 추가 필요) |
| 수강 정보 조회 | `getEnrollmentByCourse(courseId)` | `getMyEnrollment` |
| 강의 신청 | `enrollCourse(courseId)` | (동일) |
| 진도 업데이트 | `updateProgress(courseId, lessonId, completed)` | (시그니처 통일) |
| 퀴즈 조회 | `getQuizForLesson(lessonId)` | `getLessonQuiz` |
| 퀴즈 제출 | `submitQuiz(quizId, answers)` | (동일) |

### Alias 정책
- 기존 deprecated 메서드는 **즉시 제거하지 않는다.**
- alias는 표준 메서드를 내부에서 호출하는 redirect 형태로 유지한다.
- `@o4o/lms-client` V2 추출 시점에 deprecation marker(`@deprecated` JSDoc) 부여.
- 페이지 마이그레이션 완료 후 별도 WO에서 alias 제거.

---

## 5. 반환 형태 표준

### 결정: **(A) `ApiResponse<T>` envelope 유지**

```ts
interface LmsApiResponse<T> {
  success: boolean;
  data: T;
}
```

### 이유
- KPA(9파일) + K-Cos(3파일) = **12파일이 이미 envelope 패턴**, GlycoPharm은 2파일만 unwrap 패턴
- 백엔드 `apps/api-server/src/modules/lms` 응답이 `{ success, data }` 형태로 표준화되어 있으므로 envelope 유지가 백엔드 계약과 일치
- `success` 필드가 페이지에서 에러/상태 분기에 사용 가능

### 페이지 unwrap 패턴
표준 페이지 사용 예:
```ts
const res = await lmsApi.getCourse(id);
const course = res.data;  // envelope 한 번만 unwrap
```

**`(res as any).data?.course ?? (res as any).data ?? null` 같은 defensive 패턴은 점진적으로 제거** — V2 추출 시 타입을 명확히 하여 캐스팅 불필요하게 만든다.

---

## 6. Unwrap 정책

| 단계 | 정책 |
|---|---|
| 기본 표준 | lmsApi 메서드는 **unwrap 하지 않는다** — envelope 그대로 반환 |
| GlycoPharm 현 상태 | 2개 메서드(`getCourseById`, `getMyCertificate`)가 `data.data.X` 두 단계 unwrap. 단계적 정렬 대상 |
| 마이그레이션 | Phase 5(선택)에서 GlycoPharm 반환형을 envelope로 전환 + 페이지 2개 동시 수정 |

### 즉시 강제하지 않는 이유
- GlycoPharm 페이지가 이미 unwrap된 형태 의존
- 한 번에 바꾸면 페이지 회귀 위험
- 메서드명 정렬(Phase 2) 먼저 안정화 후 진행

---

## 7. 타입 구조 표준

### Base 타입 — `@o4o/lms-client`

현재 `packages/lms-client/src/index.ts`에 정의된 base는 안전한 최소 공집합이다. V2 추출 시 다음 필드 추가 권장:

```ts
LmsCourseBase: + duration?, + instructorId?
LmsLessonBase: + type?, + isFree?
LmsEnrollmentBase: + progress?, + startedAt?, + completedAt?
```

### 서비스별 확장 원칙

```ts
// KPA
export interface Course extends LmsCourseBase {
  instructorName: string;
  lessonCount: number;
  enrollmentCount: number;
  category: string;
  instructor?: { id: string; name: string; avatar?: string };
  // KPA 전용 필드
}

// GlycoPharm
export interface LmsCourse extends LmsCourseBase {
  isPublished: boolean;
  // GlycoPharm 전용 필드
}

// K-Cosmetics
export interface LmsCourse extends LmsCourseBase {
  lessonCount?: number;
  category?: string;
  // K-Cos 전용 필드
}
```

### 필수 vs Optional 원칙
- **Base는 전부 optional** (단 `id`, `title`은 필수) — 서비스별로 채워질 가능성이 다름
- 서비스 확장 타입은 자체 정책으로 필수/optional 결정

---

## 8. HTTP Adapter 표준

### 인터페이스 (V2 확장)

현재 `LmsHttpClient`는 `get`만 있음. V2에서 다음을 추가한다:

```ts
export interface LmsHttpClient {
  get<T>(path: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(path: string, data?: unknown, options?: { params?: Record<string, unknown> }): Promise<T>;
  patch<T>(path: string, data?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}
```

### 서비스별 adapter 구현 책임
- **KPA**: `apiClient`를 직접 주입(시그니처 호환). adapter 불필요.
- **GlycoPharm/K-Cos**: axios 인스턴스를 thin wrapper로 변환 (`{ data }` 한 단계 unwrap)
- 본 패키지는 axios/fetch를 직접 import하지 않는다.

---

## 9. baseURL 정책

### 결정: **서비스별 prefix 유지, client는 path 기준**

```
@o4o/lms-client 메서드는 path만 정의 (예: '/lms/courses')
서비스 adapter가 해당 path를 자체 baseURL과 결합:
  KPA:        /api/v1/kpa + /lms/courses  (현재)
  GlycoPharm: /api/v1     + /lms/courses
  K-Cos:      /api/v1     + /lms/courses
```

### KPA `/api/v1/kpa` prefix는 별도 인프라 이슈로 분리
- 현재 KPA의 `/api/v1/kpa/lms/*` 호출은 백엔드에서 어떻게 라우팅되는지 추가 조사 필요(scope-guard 문서 §2 참조)
- 본 LMS client 정렬 범위 외. `WO-O4O-INFRA-KPA-API-PREFIX-AUDIT-V*` 별도 진행.

---

## 10. Migration 단계

| Phase | WO | 영향 |
|---|---|---|
| **Phase 1** | 본 문서 (WO-O4O-LMS-CLIENT-CONVENTION-DOC-V1) | 0 |
| **Phase 2** | WO-O4O-LMS-GLYCOPHARM-METHOD-ALIGNMENT-V1 — GlycoPharm 메서드명 4개 정렬 + `updateProgress` 시그니처 통일. 내부 unwrap 유지 | GlycoPharm `lms.ts` (메서드 추가, 기존 메서드는 alias로 유지) |
| **Phase 3** | WO-O4O-LMS-CLIENT-ALIAS-DEPRECATION-V1 — `@o4o/lms-client`에 deprecated alias export | 0 (backward compat) |
| **Phase 4** | WO-O4O-LMS-CLIENT-EXTRACTION-V2 — base 타입 확장 + 학습자 메서드 추출, KPA 포함 3개 서비스 thin wrapper화 | KPA 9파일, K-Cos 3파일 영향 — 사전 IR 권장 |
| **Phase 5** (선택) | WO-O4O-LMS-GLYCOPHARM-RESPONSE-ALIGNMENT-V1 — GlycoPharm 반환형을 envelope로 전환 | GlycoPharm 2파일 |

각 Phase는 독립 WO로 분리되며, 이전 Phase 완료 후 발행한다.

---

## 11. 금지사항

향후 LMS client 작업 시 다음을 금지한다:

- ❌ **즉시 공통화 강행** — 본 문서의 phase를 건너뛰고 V2 extraction 시도
- ❌ **GlycoPharm unwrap 강제 제거 (Phase 5 외)** — 페이지 회귀 위험
- ❌ **KPA `apiClient` 구조 임의 변경** — 가장 큰 영향 범위, 별도 인프라 WO 필요
- ❌ **alias 즉시 삭제** — Phase 4 완료 + 페이지 마이그레이션 완료 후에만 가능
- ❌ **새 메서드를 deprecated 이름으로 추가** — 새 메서드는 반드시 §4 표준 이름 사용

---

## 12. 결론

> **LMS client 공통화는 정렬 후 단계적으로 진행한다.**

- 표준 메서드 이름은 §4 (KPA/K-Cos 우선)
- 표준 반환 형태는 envelope (§5)
- Base 타입은 `@o4o/lms-client` 기반 확장 (§7)
- HTTP adapter는 서비스별 주입 (§8)
- GlycoPharm은 점진적 정렬 (Phase 2 → Phase 5)

향후 모든 LMS client 작업은 본 문서의 표준을 따른다.

---

## 13. 참고 자료

- 상위 IR: IR-O4O-LMS-CLIENT-CONVENTION-ALIGNMENT-V1 (이번 conversation)
- 직전 추출 WO: `WO-O4O-LMS-CLIENT-EXTRACTION-V1-SCOPED` (커밋 `0318a02e1`)
- APP-LMS 표준: [APP-LMS-BASELINE.md](APP-LMS-BASELINE.md)
- Scope guard 설계: [LMS-SCOPE-GUARD.md](LMS-SCOPE-GUARD.md)
- 현 패키지: [packages/lms-client/](../../packages/lms-client/)
- 서비스별 lms.ts:
  - [services/web-kpa-society/src/api/lms.ts](../../services/web-kpa-society/src/api/lms.ts)
  - [services/web-glycopharm/src/api/lms.ts](../../services/web-glycopharm/src/api/lms.ts)
  - [services/web-k-cosmetics/src/api/lms.ts](../../services/web-k-cosmetics/src/api/lms.ts)
