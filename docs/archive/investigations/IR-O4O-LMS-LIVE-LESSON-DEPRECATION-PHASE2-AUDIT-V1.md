# IR-O4O-LMS-LIVE-LESSON-DEPRECATION-PHASE2-AUDIT-V1

**조사 목적**: Phase 1(WO-O4O-LMS-LIVE-LESSON-DEPRECATION-PHASE1-V1)에서 UI/신규 생성을 차단한  
live lesson 기능의 backend/API/enum/DB 잔여 의존성을 전수 조사하고,  
Phase 2 완전 제거의 범위·순서·안전성을 판단한다.

- **조사 기준**: `main` 브랜치 (`9a315ba11` 이후)
- **작성일**: 2026-05-19
- **상태**: 조사 완료 — Phase 2 구현 진행 가능

---

## 1. Phase 1 완료 상태 요약

| 항목 | Phase 1 결과 |
|------|-------------|
| KPA 강사 live 생성 UI | ✅ 제거 (`SUPPORTED_LESSON_TYPES`에서 `'live'` 제거) |
| KPA `LiveEditor.tsx` | ✅ 삭제 |
| KPA 수강생 live 렌더링 | ✅ 제거 (참여 버튼, status badge, AI 요약) |
| K-Cosmetics 수강생 live 렌더링 | ✅ 제거 |
| `@deprecated` 마커 | ✅ 추가 (enum, DB 필드, API, DTO 전체) |
| backend live API | ❌ **아직 활성** (Phase 2 대상) |
| DB 컬럼 | ❌ **아직 존재** (Phase 2 대상) |
| `LessonType.LIVE` enum | ❌ **아직 존재** (Phase 2 대상) |

---

## 2. Backend 잔여 코드

### 2.1 LiveService.ts

**파일**: `apps/api-server/src/modules/lms/services/LiveService.ts`  
**크기**: 204줄 — live 전용 단일 책임 서비스

| 메서드 | 역할 |
|--------|------|
| `upsertLive(lessonId, data)` | liveStartAt/liveEndAt/liveUrl 저장 |
| `getLiveByLesson(lessonId)` | 라이브 정보 조회 |
| `joinLive(lessonId, userId)` | 참여자 진도 완료 처리 |

**의존성**: Lesson entity(live 필드), CompletionService, CourseService  
**외부 참조**: 없음 (LiveController에서만 호출)  
**Phase 2 판정**: **파일 전체 삭제 가능** ✅

---

### 2.2 LiveController.ts

**파일**: `apps/api-server/src/modules/lms/controllers/LiveController.ts`  
**크기**: 118줄

| 엔드포인트 | 메서드 | 역할 |
|-----------|--------|------|
| `GET /api/v1/lms/lessons/:lessonId/live` | `getLiveForLesson` | 라이브 정보 조회 |
| `POST /api/v1/lms/lessons/:lessonId/live` | `upsertLive` (강사) | 라이브 설정 저장 |
| `POST /api/v1/lms/lessons/:lessonId/live/join` | `joinLive` (수강생) | 참여 처리 |

**Phase 2 판정**: **파일 전체 삭제 가능** ✅

---

### 2.3 lms.routes.ts (live 라우트 3개)

**파일**: `apps/api-server/src/modules/lms/routes/lms.routes.ts`  
**위치**: 약 121–132줄

```typescript
router.get('/lessons/:lessonId/live', requireAuth, asyncHandler(LiveController.getLiveForLesson));
router.post('/lessons/:lessonId/live', requireAuth, requireInstructor, asyncHandler(LiveController.upsertLive));
router.post('/lessons/:lessonId/live/join', requireAuth, asyncHandler(LiveController.joinLive));
```

**Phase 2 판정**: **3개 라우트 및 `import { LiveController }` 제거** ✅

---

### 2.4 EnrollmentController.ts (1줄 수정)

**파일**: `apps/api-server/src/modules/lms/controllers/EnrollmentController.ts`  
**위치**: 약 242줄

```typescript
if (lesson.type === 'quiz' || lesson.type === 'assignment' || lesson.type === 'live') {
  return BaseController.error(res, `${lesson.type} 레슨은 전용 제출/참여 API를 통해서만 완료 처리됩니다.`, 400);
}
```

**Phase 2 판정**: **`|| lesson.type === 'live'` 제거** ✅

---

### 2.5 LmsAIService.ts (live AI 지원 제거)

**파일**: `apps/api-server/src/modules/ai/services/LmsAIService.ts`

| 위치 | 내용 |
|------|------|
| 25줄 | `LmsAiKind = 'quiz' \| 'live' \| 'assignment'` |
| 45–51줄 | `LiveSummaryPayload` 인터페이스 |
| 92–106줄 | `LIVE_PROMPT` 시스템 프롬프트 상수 |
| 136–139줄 | `summarizeLive()` 메서드 |
| 229–235줄 | `buildLivePrompt()` 헬퍼 |
| 269–290줄 | `liveFallback()` 폴백 로직 |

**Phase 2 판정**: **live 관련 메서드·타입·상수 전체 제거** ✅

---

### 2.6 AIController.ts (case 'live' 분기)

**파일**: `apps/api-server/src/modules/ai/controllers/AIController.ts`  
**위치**: 약 42–47줄

```typescript
case 'live':
  if (typeof payload.title !== 'string' || payload.title.trim().length === 0) {
    return BaseController.error(res, 'live payload requires non-empty title', 400);
  }
  result = await service.summarizeLive(payload);
  break;
```

**Phase 2 판정**: **`case 'live'` 블록 제거** ✅

---

## 3. Frontend 잔여 참조

### 3.1 KPA Society (`services/web-kpa-society/src/`)

| 파일 | 내용 | Phase 2 판정 |
|------|------|-------------|
| `api/lms.ts` (145–154줄) | `getLiveForLesson`, `joinLive` 메서드 (@deprecated) | 제거 ✅ |
| `api/lms.ts` (225–232줄) | `LiveLesson` 인터페이스 (@deprecated) | 제거 ✅ |
| `api/lms-instructor.ts` (361–375줄) | `getLiveForLesson`, `upsertLive` 메서드 (@deprecated) | 제거 ✅ |
| `api/lms-instructor.ts` (480–494줄) | `LiveDto`, `UpsertLiveDto` 인터페이스 (@deprecated) | 제거 ✅ |
| `api/lms-instructor.ts` (16줄) | `LessonType` 타입 리터럴에 `'live'` 포함 | 제거 ✅ |
| `api/ai.ts` (10줄) | `AiAnalyzeKind`에 `'live'` 포함 | 제거 ✅ |
| `api/ai.ts` (36–57줄) | `LiveAnalyzePayload`, `summarizeLive` (@deprecated) | 제거 ✅ |
| `pages/lms/LmsLessonPage.tsx` (24, 31줄) | `LESSON_TYPE_LABEL/ICON`에 `live` 키 | 제거 ✅ |
| `pages/instructor/courses/CourseEditPage.tsx` (82줄) | deprecated 주석 포함 `live` 키 in LESSON_TYPE_GUIDE | 제거 ✅ |

---

### 3.2 K-Cosmetics (`services/web-k-cosmetics/src/`)

| 파일 | 내용 | Phase 2 판정 |
|------|------|-------------|
| `api/lms.ts` (61줄) | `LmsLesson` 타입에 `'live'` 포함 | 제거 ✅ |
| `api/lms.ts` (139–146줄) | `LmsLive` 인터페이스 (@deprecated) | 제거 ✅ |
| `api/lms.ts` (249–262줄) | `getLiveForLesson`, `joinLive` 메서드 (@deprecated) | 제거 ✅ |
| `api/ai.ts` (live 관련) | `LiveAnalyzePayload`, `summarizeLive` | 제거 ✅ |
| `pages/lms/LmsLessonPage.tsx` (36, 43줄) | `LESSON_TYPE_LABEL/ICON`에 `live` 키 | 제거 ✅ |

---

### 3.3 GlycoPharm / Neture

**live 참조 없음** — 조사 완료, 영향 없음 ✅

---

## 4. Shared Packages 잔여 참조

### 4.1 interactive-content-core (`packages/interactive-content-core/src/entities/Lesson.ts`)

```typescript
// 17–24줄 — enum
export enum LessonType {
  VIDEO = 'video',
  ARTICLE = 'article',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  /** @deprecated Phase 2 will remove this value. */
  LIVE = 'live',     // ← 제거 대상
}

// 95–107줄 — DB 컬럼 정의
/** @deprecated */
@Column({ type: 'timestamp', nullable: true })
liveStartAt?: Date;   // ← 제거 대상

/** @deprecated */
@Column({ type: 'timestamp', nullable: true })
liveEndAt?: Date;     // ← 제거 대상

/** @deprecated */
@Column({ type: 'text', nullable: true })
liveUrl?: string;     // ← 제거 대상
```

**Phase 2 판정**: **핵심 제거 대상** — 이 파일 수정이 모든 다운스트림 타입 에러를 유발하므로 가장 마지막에 처리 ✅

---

### 4.2 lms-client (`packages/lms-client/src/index.ts`)

약 134줄 주석:  
> `// 과제/라이브 (assignment, live) — Phase 5+ 에서 검토`

**상태**: live 기능이 공통 factory에 포함된 적 없음  
**Phase 2 판정**: **주석 정리만 필요** (코드 변경 없음) ✅

---

## 5. DB Migration 분석

### 파일

`apps/api-server/src/database/migrations/20260502140000-AddLiveFieldsToLmsLessons.ts`

### UP (현재 적용됨)
- `lms_lessons` 테이블에 `liveStartAt`, `liveEndAt`, `liveUrl` 컬럼 추가
- 인덱스 `IDX_lms_lessons_liveStartAt` 생성

### DOWN (Phase 2에서 실행)
```typescript
await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lms_lessons_liveStartAt"`);
await queryRunner.query(`ALTER TABLE "lms_lessons" DROP COLUMN IF EXISTS "liveStartAt"`);
await queryRunner.query(`ALTER TABLE "lms_lessons" DROP COLUMN IF EXISTS "liveEndAt"`);
await queryRunner.query(`ALTER TABLE "lms_lessons" DROP COLUMN IF EXISTS "liveUrl"`);
```
- `IF EXISTS` 포함 → **안전한 실행 보장** ✅
- 모든 컬럼 `nullable: true` → 데이터 손실 없음 (실제 live 데이터는 NULL 또는 미사용)

### Phase 2 처리 방식
- `TypeORM` 마이그레이션 파일은 **삭제하지 않는다** (히스토리 유지)
- 대신 DB 컬럼 제거는 **CI/CD 배포 시 자동 실행** (main 병합 후)

---

## 6. 제거 가능/보류/유지 분류

### A. 즉시 제거 가능 (Phase 2)

| 항목 | 파일 |
|------|------|
| `LiveService.ts` 전체 | `apps/api-server/src/modules/lms/services/LiveService.ts` |
| `LiveController.ts` 전체 | `apps/api-server/src/modules/lms/controllers/LiveController.ts` |
| live 라우트 3개 + import | `apps/api-server/src/modules/lms/routes/lms.routes.ts` |
| `EnrollmentController.ts` 조건 수정 | `|| lesson.type === 'live'` 제거 |
| `LmsAIService.ts` live 관련 코드 | ~80줄 (메서드/타입/상수) |
| `AIController.ts` `case 'live'` | 6줄 |
| KPA `api/lms.ts` live 메서드/타입 | `getLiveForLesson`, `joinLive`, `LiveLesson` |
| KPA `api/lms-instructor.ts` live 관련 | 메서드 2개 + DTO 2개 |
| KPA `api/ai.ts` live 관련 | `summarizeLive`, `LiveAnalyzePayload` |
| KPA `LmsLessonPage.tsx` live 라벨/아이콘 | `LESSON_TYPE_LABEL/ICON` |
| KPA `CourseEditPage.tsx` deprecated live 키 | `LESSON_TYPE_GUIDE.live` |
| K-Cosmetics `api/lms.ts` live 관련 | 메서드 2개 + `LmsLive` 인터페이스 |
| K-Cosmetics `api/ai.ts` live 관련 | `summarizeLive`, `LiveAnalyzePayload` |
| K-Cosmetics `LmsLessonPage.tsx` live 라벨/아이콘 | `LESSON_TYPE_LABEL/ICON` |
| `packages/.../Lesson.ts` live 필드 3개 | `liveStartAt`, `liveEndAt`, `liveUrl` |
| `packages/.../Lesson.ts` `LessonType.LIVE` | enum 값 |

### B. 보류 필요

| 항목 | 이유 |
|------|------|
| Migration 파일 자체 (`20260502140000-AddLiveFieldsToLmsLessons.ts`) | DB 히스토리 유지 필요. 삭제 금지 |
| `lms-client` 주석 | 코드 변경 없음, 주석 정리 옵션 수준 |

### C. 영향 없음 (변경 불필요)

| 항목 | 이유 |
|------|------|
| GlycoPharm, Neture 서비스 | live 참조 0 |
| `lms-client` factory | live가 애초에 포함되지 않음 |
| E2E / 테스트 코드 | live 관련 테스트 없음 |

---

## 7. Phase 2 실행 순서 권장

순서가 중요합니다. **enum/DB 컬럼 제거를 마지막에** 해야 타입 에러를 순차 해소할 수 있습니다.

```
STEP 1  Backend service/controller/route 제거
        → LiveService.ts, LiveController.ts 삭제
        → lms.routes.ts live 라우트 3개 제거
        → EnrollmentController.ts 조건 수정

STEP 2  Backend AI 지원 제거
        → LmsAIService.ts live 코드 제거
        → AIController.ts case 'live' 제거

STEP 3  Frontend API 클라이언트 제거
        → KPA: lms.ts, lms-instructor.ts, ai.ts live 코드 제거
        → K-Cosmetics: lms.ts, ai.ts live 코드 제거

STEP 4  Frontend UI 상수 정리
        → KPA + K-Cosmetics LmsLessonPage.tsx LESSON_TYPE_LABEL/ICON
        → KPA CourseEditPage.tsx LESSON_TYPE_GUIDE.live (deprecated 키 삭제)

STEP 5  packages 핵심 제거 (마지막)
        → interactive-content-core/Lesson.ts
          - LessonType.LIVE enum 값 제거
          - liveStartAt/liveEndAt/liveUrl @Column 제거

STEP 6  TypeScript 빌드 확인
        → 신규 에러 없음 확인

STEP 7  커밋 & 배포
        → CI/CD에서 migration DOWN 자동 실행
          (liveStartAt/liveEndAt/liveUrl 컬럼 DROP)
```

---

## 8. 교차 서비스 영향 매트릭스

| 서비스 | live UI 제거 | API 제거 | enum 제거 | 영향도 |
|--------|:-----------:|:--------:|:---------:|:------:|
| KPA Society | ✅ Phase 1 완료 | Phase 2 | Phase 2 | 🟡 경미 |
| K-Cosmetics | ✅ Phase 1 완료 | Phase 2 | Phase 2 | 🟡 경미 |
| GlycoPharm | N/A | N/A | 자동 해소 | 🟢 없음 |
| Neture | N/A | N/A | 자동 해소 | 🟢 없음 |
| API Server | — | Phase 2 | Phase 2 | 🟡 경미 |

---

## 9. 결론

| 항목 | 판정 |
|------|------|
| Phase 2 진행 가능 여부 | **가능** — 모든 의존성 명확하고 격리됨 |
| 회귀 위험 | **낮음** — Phase 1에서 UI 완전 차단, frontend에서 API 미호출 상태 |
| DB 안전성 | **높음** — DOWN migration `IF EXISTS` 포함, 모든 컬럼 nullable |
| cross-service 영향 | **없음** — GlycoPharm, Neture live 미사용 |
| 예상 변경 파일 수 | **14개 파일 수정 + 2개 파일 삭제** |
| 예상 제거 줄 수 | **~580줄** |

Phase 1에서 신규 생성/진입이 완전히 차단되었으므로, **backend API는 현재 호출되지 않는 dead endpoint 상태**입니다.  
Phase 2는 **회귀 위험 없는 순수 dead code 정리** 작업입니다.
