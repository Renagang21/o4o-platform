# IR-O4O-KPA-LMS-LESSON-PUBLISH-APPROVAL-DRIFT-AUDIT-V1

> KPA LMS — 레슨 단위 publish 토글 및 운영자 재승인 트리거에 대한 정책/구현 정합성 조사.
>
> 본 문서는 **조사 전용** 산출물이다. 코드 수정 제안은 포함하나 코드는 변경하지 않는다.

---

## 0. 조사 배경 및 정책 가설

### 보고된 증상
KPA Society 강사 화면에서:
- 운영자 승인이 완료된 강의(`PUBLISHED`) 안에서 강사가 레슨을 생성/수정하면 **레슨이 "비공개"로 보임**
- 동시에 **강의가 다시 `PENDING_REVIEW`로 되돌아가** 운영자 재승인 흐름이 발생함

### 정책 가설 (사용자 제시)
- **승인은 강의(course) 단위에서만 필요**
- 승인된 강의 안의 **레슨 생성/수정은 강사 자율 편집 영역**
- **레슨 단위 공개/비공개·승인 상태**는 운영 흐름을 과도하게 복잡하게 만든다 → 제거 후보
- 수강생 노출은 **강의 공개 상태 + 강의 승인 상태 + 레슨 존재 여부**로 충분

### 본 IR이 답하는 질문
1. 새 레슨은 왜 "비공개" 표시가 뜨는가? (실제 isPublished 값 vs UI 라벨)
2. 레슨 수정/생성이 정말 운영자 재승인 흐름을 유발하는가?
3. 강의 approval 상태가 자동으로 변경되는가? 어떤 트리거에서?
4. frontend 의 "미발행"/"비공개" 표시 조건은 무엇인가?
5. backend 의 lesson visibility/status 필드 현황은?
6. 어떤 항목을 제거해도 안전하고, 어떤 항목은 보류해야 하는가?

---

## 1. 결론 요약

| 질문 | 답 |
|---|---|
| 레슨이 비공개로 생성되는 원인 | **아니다.** 신규 레슨은 `isPublished: true` 기본값. "비공개" 라벨은 레슨 목록 토글 **버튼의 다음 액션 라벨**이며 현재 상태가 아니다. 그러나 강사가 이를 상태로 오인할 가능성이 높다. |
| 레슨 생성/수정이 운영자 승인 흐름을 트리거하는가 | **YES.** `LessonService.create/update/delete/reorder` 모든 mutation 에서 `CourseService.maybeRevertToPendingReview(courseId)` 호출. 강의가 `PUBLISHED` 상태이면 무조건 `PENDING_REVIEW` 로 자동 전환. 동일 패턴이 Quiz/Assignment 에도 적용. |
| Course approval 상태가 변경되는가 | **YES.** PUBLISHED → PENDING_REVIEW 로 자동 회귀. `rejectionReason` 도 null 로 초기화. |
| Frontend badge 표시 조건 | "미발행" 텍스트 badge: `!lesson.isPublished` (즉 토글 OFF 일 때만). "비공개" 텍스트: 토글 버튼의 **다음 액션 라벨** (`isPublished ? '비공개' : '발행'`) — 강사가 상태로 오인할 위험. |
| Backend lesson visibility/status | `Lesson.isPublished: boolean` 만 존재 (default `true`). approval/status enum 없음. 수강생 조회 시 자동 필터링 안 함. |
| 사용 중인 서비스 | KPA-Society **단독**. K-Cosmetics·GlycoPharm·Neture 에는 instructor lesson editor 자체가 없음. |
| 제거 가능 후보 | (a) `LessonService.maybeRevertToPendingReview` 호출 제거 (lesson mutation 시), (b) `CourseEditPage.tsx` 의 레슨별 토글 버튼/미발행 badge, (c) `Lesson.isPublished` 컬럼 자체. |
| 보류 필요 | (i) 강의 단위 unpublish/archive 운영자 권한, (ii) 강의 단위 visibility(`PUBLIC`/`MEMBERS`), (iii) Quiz/Assignment 변경 시 재승인 트리거 — 별도 결정 필요. |

---

## 2. 조사 범위 및 대상

- Backend: [apps/api-server/src/modules/lms/](apps/api-server/src/modules/lms/)
- Shared types: [packages/interactive-content-core/src/entities/](packages/interactive-content-core/src/entities/)
- KPA frontend (instructor): [services/web-kpa-society/src/pages/instructor/courses/](services/web-kpa-society/src/pages/instructor/courses/)
- KPA frontend (student): [services/web-kpa-society/src/pages/lms/](services/web-kpa-society/src/pages/lms/)
- Operator routes: [apps/api-server/src/routes/kpa/kpa.routes.ts](apps/api-server/src/routes/kpa/kpa.routes.ts)
- 비교 서비스: web-k-cosmetics / web-glycopharm / web-neture
- Canonical 문서: [docs/architecture/APP-LMS-BASELINE.md](docs/architecture/APP-LMS-BASELINE.md), [docs/architecture/LMS-SCOPE-GUARD.md](docs/architecture/LMS-SCOPE-GUARD.md)

조사 기준 commit: `main` 동기화 직후 (조사 시점 HEAD).

---

## 3. Course 승인/공개 흐름

### 3.1 Course Entity 필드

[packages/interactive-content-core/src/entities/Course.ts:28-34](packages/interactive-content-core/src/entities/Course.ts#L28-L34)
```typescript
export enum CourseStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}
```

| 필드 | 기본값 | 의미 |
|---|---|---|
| `status: CourseStatus` ([Course.ts:93-94](packages/interactive-content-core/src/entities/Course.ts#L93-L94)) | `DRAFT` | **승인 상태 (canonical)** |
| `isPublished: boolean` ([Course.ts:139-140](packages/interactive-content-core/src/entities/Course.ts#L139-L140)) | `true` | 별도 publish 플래그 — 실제 백엔드 흐름에서 `status` 와 중복/혼선 우려 |
| `visibility: CourseVisibility` ([Course.ts:105-106](packages/interactive-content-core/src/entities/Course.ts#L105-L106)) | `MEMBERS` | 공개 범위 (PUBLIC/MEMBERS). approval 과 무관 |
| `rejectionReason: string \| null` ([Course.ts:97-98](packages/interactive-content-core/src/entities/Course.ts#L97-L98)) | null | 운영자 반려 사유 |
| `publishedAt: Date \| null` ([Course.ts:183-184](packages/interactive-content-core/src/entities/Course.ts#L183-L184)) | null | 운영자 승인 시각 |

### 3.2 상태 전이 메서드 — Course

[packages/interactive-content-core/src/entities/Course.ts](packages/interactive-content-core/src/entities/Course.ts) 클래스 메서드 (entity-level helpers):
- `publish()`        → `status=PUBLISHED`, `isPublished=true`, `publishedAt=NOW`
- `archive()`        → `status=ARCHIVED`, `isPublished=false`
- `submitForReview()` → `status=PENDING_REVIEW`
- `reject(reason)`   → `status=REJECTED`, `rejectionReason=reason`

### 3.3 강사 측 흐름

| 동작 | API | 권한 | 결과 |
|---|---|---|---|
| 강의 생성 | `POST /api/v1/lms/courses` | `requireInstructor` | `status: DRAFT` |
| 강의 수정 | `PATCH /api/v1/lms/courses/:id` | `requireInstructor` + owner | 변경. **PUBLISHED 상태이고 status 미지정 시 자동으로 PENDING_REVIEW 회귀** (CourseService.updateCourse 내부) |
| 승인 요청 | `POST /api/v1/lms/courses/:id/submit-review` | `requireInstructor` | `DRAFT \| REJECTED → PENDING_REVIEW` |
| 강사 publish | `POST /api/v1/lms/courses/:id/publish` | `requireInstructor` (그러나 controller 가 403) | **차단** — 강사 직접 publish 금지 (WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1) |
| 종료 (보관) | `POST /api/v1/lms/courses/:id/archive` | `requireInstructor` | `ARCHIVED` |

라우트 정의: [apps/api-server/src/modules/lms/routes/lms.routes.ts:31-59](apps/api-server/src/modules/lms/routes/lms.routes.ts#L31-L59)

CourseEditPage 안내 문구 (강사에게 직접 노출):

[services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx:747-756](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L747-L756)
> "공개 중인 강의입니다. 강의 정보, 레슨, 퀴즈/과제 등을 수정하면 자동으로 재검토 대기 상태로 전환되어 사용자 노출이 일시 중단됩니다. 운영자 재승인 후 다시 공개됩니다."

→ **현재 정책상 이 동작은 의도된 것으로 문서화돼 있음.**

### 3.4 운영자 측 흐름

[apps/api-server/src/routes/kpa/kpa.routes.ts:576-640](apps/api-server/src/routes/kpa/kpa.routes.ts#L576-L640)

| 동작 | 경로 | Guard | 효과 |
|---|---|---|---|
| 승인 | `POST /api/v1/kpa/lms/operator/courses/:id/approve` | `requireKpaScope('kpa:operator')` | `PENDING_REVIEW → PUBLISHED` |
| 반려 | `POST /api/v1/kpa/lms/operator/courses/:id/reject` | 동일 | `PENDING_REVIEW → REJECTED + rejectionReason` |
| 비공개 전환 | `POST /api/v1/kpa/lms/operator/courses/:id/unpublish` | 동일 | `PUBLISHED → DRAFT` |
| 종료 | `POST /api/v1/kpa/lms/operator/courses/:id/archive` | 동일 | → `ARCHIVED` |
| 완전 삭제 | `DELETE /api/v1/kpa/lms/operator/courses/:id/hard` | 동일 + `ARCHIVED` 한정 | FK cascade delete |

→ **운영자 권한 엔드포인트는 모두 course 단위.** lesson 단위 operator endpoint **없음**.

---

## 4. Lesson 생성/수정 흐름

### 4.1 Lesson Entity 필드

[packages/interactive-content-core/src/entities/Lesson.ts:24-105](packages/interactive-content-core/src/entities/Lesson.ts#L24-L105)

| 필드 | 기본값 | 의미 |
|---|---|---|
| `isPublished: boolean` ([Lesson.ts:94-95](packages/interactive-content-core/src/entities/Lesson.ts#L94-L95)) | **`true`** | 레슨 공개 여부 (binary). approval state enum 없음 |
| `isFree: boolean` ([Lesson.ts:97-98](packages/interactive-content-core/src/entities/Lesson.ts#L97-L98)) | `false` | Free preview 표시 |
| `requiresCompletion: boolean` ([Lesson.ts:100-101](packages/interactive-content-core/src/entities/Lesson.ts#L100-L101)) | `false` | 전제 완료 필요 |
| `type: LessonType` ([Lesson.ts:45-46](packages/interactive-content-core/src/entities/Lesson.ts#L45-L46)) | `ARTICLE` | video/article/quiz/assignment |

**결정적 차이**: Lesson 은 `status` enum 도, `approver` 도, `rejectionReason` 도 없다. `isPublished` 만 있다.

### 4.2 신규 레슨의 isPublished 기본값

[apps/api-server/src/modules/lms/services/LessonService.ts:77-82](apps/api-server/src/modules/lms/services/LessonService.ts#L77-L82)
```typescript
const lesson = this.lessonRepository.create({
  ...data,
  isPublished: data.isPublished ?? true,   // ← 기본 true
  isFree: data.isFree ?? false,
  requiresCompletion: data.requiresCompletion ?? false
});
```

LessonModal 생성 폼([CourseEditPage.tsx:178-186](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L178-L186))에는 **`isPublished` 필드 자체가 없다**. 즉:
- 강사가 "+ 새 레슨 추가" 후 저장하면 → 프론트가 `isPublished` 미전송 → 서버가 `true` 로 저장
- **신규 레슨은 무조건 `isPublished: true`**

### 4.3 Lesson mutation → Course 재승인 트리거

[apps/api-server/src/modules/lms/services/LessonService.ts](apps/api-server/src/modules/lms/services/LessonService.ts):

| 메서드 | 트리거 위치 |
|---|---|
| `createLesson` | line 88-89 |
| `updateLesson` | line 156-157 |
| `deleteLesson` | line 173-174 |
| `reorderLessons` | line 187-188 |

각각 다음을 호출:
```typescript
// WO-O4O-LMS-COURSE-REAPPROVAL-FLOW-V1
await CourseService.getInstance().maybeRevertToPendingReview(courseId);
```

### 4.4 maybeRevertToPendingReview 구현

[apps/api-server/src/modules/lms/services/CourseService.ts:278-297](apps/api-server/src/modules/lms/services/CourseService.ts#L278-L297)
```typescript
/**
 * WO-O4O-LMS-COURSE-REAPPROVAL-FLOW-V1
 * 콘텐츠(레슨/퀴즈/과제/라이브) 변경 시 호출되는 상태 전환 헬퍼.
 *   PUBLISHED  → PENDING_REVIEW (재검토 트리거, rejectionReason 클리어)
 *   기타 상태  → no-op
 * 호출 측: LessonService / QuizService / AssignmentService / LiveService 의 mutation 메서드.
 * 콘텐츠 변경이 발생하면 운영자 재승인 없이는 사용자 노출 안 되도록 보장.
 */
async maybeRevertToPendingReview(courseId: string): Promise<void> {
  if (!courseId) return;
  const course = await this.courseRepository.findOne({ where: { id: courseId } });
  if (course && course.status === CourseStatus.PUBLISHED) {
    course.status = CourseStatus.PENDING_REVIEW;
    course.rejectionReason = null;
    await this.courseRepository.save(course);
    logger.info('[LMS] Course auto-reverted to PENDING_REVIEW (related content changed)', { ... });
  }
}
```

동일 패턴이 다른 mutation 서비스에도 적용됨:
- [AssignmentService.ts:96-99](apps/api-server/src/modules/lms/services/AssignmentService.ts#L96-L99) — 과제 생성 시
- [QuizService.ts:425-428, 458-461](apps/api-server/src/modules/lms/services/QuizService.ts#L425-L461) — 퀴즈 생성/수정 시

→ **레슨/퀴즈/과제 그 어떤 변경이든 강의가 PUBLISHED 였으면 PENDING_REVIEW 로 회귀.**

---

## 5. 운영자 승인 큐와 레슨 변경의 연결

### 5.1 결과: 직접적 큐 항목 신규 추가는 없음. 단, course 가 `PENDING_REVIEW` 로 재진입함

운영자 큐는 별도 테이블이 아니라 `lms_courses.status = 'pending_review'` 인 코스 목록으로 구성된다.

- 강사가 레슨 1개를 추가/수정/삭제/순서변경하면
- → `LessonService` → `maybeRevertToPendingReview()`
- → 해당 course 가 `PUBLISHED` → `PENDING_REVIEW` 로 자동 전환
- → 운영자의 "검토 대기 강의 목록"에 다시 나타남
- → 운영자가 다시 `/approve` 누르기 전까지 사용자 노출 차단

### 5.2 lesson 자체의 audit/notification

- LessonService 의 mutation 메서드는 `logger.info(...)` 만 호출. **별도 audit_log / notification 테이블에 insert 하지 않음**.
- 운영자 화면에 "어떤 레슨이 추가/수정되어서 재승인 필요하다"는 안내가 따로 나타나지 않음. 운영자는 course 가 다시 pending 으로 보일 뿐.

---

## 6. Frontend 표시 로직

### 6.1 강사 레슨 목록의 표시

[services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx:944-955](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L944-L955)

```tsx
<div style={s.lessonMeta}>
  {LESSON_TYPE_LABEL[lesson.type] || lesson.type} · {lesson.duration > 0 ? `${lesson.duration}분` : '시간 미설정'}
  {!lesson.isPublished && <span style={{ marginLeft: 6, color: '#f59e0b' }}>미발행</span>}
</div>
<div style={s.lessonActions}>
  <button
    style={{ ...s.publishSmBtn, background: lesson.isPublished ? '#fef3c7' : '#d1fae5', ... }}
    onClick={() => handleTogglePublish(lesson)}
  >
    {lesson.isPublished ? '비공개' : '발행'}
  </button>
  ...
</div>
```

| 표시 | 조건 | 의미 |
|---|---|---|
| 노란색 텍스트 **"미발행"** badge (line 946) | `!lesson.isPublished` (즉 토글 OFF 상태) | **현재 상태 표시** |
| 노란/녹색 토글 버튼 **"비공개"/"발행"** (line 954) | `lesson.isPublished ? '비공개' : '발행'` | **버튼의 다음 액션 라벨** (현재 상태가 아니라 클릭 시 일어날 일) |

→ **신규 레슨의 경우 `isPublished: true` 이므로**:
- "미발행" badge 는 **표시되지 않음** (line 946 의 `!lesson.isPublished` false)
- 토글 버튼은 **"비공개"** 라고 표시됨 (line 954 의 true 분기)

**사용자가 보고한 "비공개로 표시됨" 증상의 진짜 원인은 line 954 의 버튼 라벨**이다. 이는 버튼의 액션을 보여주는 일반적 UX 패턴이지만, 강사가 "지금 비공개 상태인가?" 라고 오인할 수 있다. 진짜 상태 표시는 line 946 의 **"미발행"** 텍스트이며, 신규 레슨에서는 나타나지 않는다.

### 6.2 토글 핸들러

[services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx:648-656](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L648-L656)
```typescript
const handleTogglePublish = async (lesson: Lesson) => {
  try {
    await lmsInstructorApi.updateLesson(lesson.id, { isPublished: !lesson.isPublished });
    await loadData();
  } catch {
    alert('발행 상태 변경에 실패했습니다.');
  }
};
```

이 토글이 `updateLesson` 을 호출하면 → 백엔드 `LessonService.updateLesson` → `maybeRevertToPendingReview` → 강의가 `PENDING_REVIEW` 로 회귀.

→ **즉 "이 레슨 발행 토글"만 눌러도 강의 전체가 재승인 대기 상태가 됨.**

### 6.3 수강생 화면의 lesson 필터링

[services/web-kpa-society/src/pages/lms/LmsCourseDetailPage.tsx:49-51](services/web-kpa-society/src/pages/lms/LmsCourseDetailPage.tsx#L49-L51)

```typescript
const lessonsRes = await lmsApi.getLessons(id!);
setLessons(Array.isArray((lessonsRes as any).data) ? (lessonsRes as any).data : []);
```

→ `isPublished` 필터 **미전달**.

[apps/api-server/src/modules/lms/services/LessonService.ts:119-121](apps/api-server/src/modules/lms/services/LessonService.ts#L119-L121)
```typescript
if (isPublished !== undefined) {
  query.andWhere('lesson.isPublished = :isPublished', { isPublished });
}
```

→ 백엔드도 `isPublished` 필터를 클라이언트가 명시한 경우에만 적용. **자동 필터링 안 함**.

수강생 enrollment 게이트는 [lms.routes.ts:69](apps/api-server/src/modules/lms/routes/lms.routes.ts#L69) 의 `requireEnrollment()` 미들웨어 — course-level 게이트만 동작.

→ **수강생 시야 노출 결정은 사실상 `course.status = PUBLISHED + requireEnrollment` 만으로 작동.** `lesson.isPublished` 는 수강생 노출에 거의 영향 없음 (강사가 명시적으로 false 로 토글한 경우만 빠짐).

---

## 7. Backend Lesson visibility/status 필드 현황

| 필드 | 존재 | 실제 효과 |
|---|---|---|
| `Lesson.isPublished: boolean` | ✅ default `true` | 강사 UI 의 토글/뱃지로만 사용. 수강생 쿼리 자동 필터 없음 |
| `Lesson.status` (enum) | ❌ 없음 | — |
| `Lesson.approvalStatus` | ❌ 없음 | — |
| `Lesson.approver / approvedAt` | ❌ 없음 | — |
| `Lesson.rejectionReason` | ❌ 없음 | — |

→ **레슨에는 정식 approval 모델이 없다.** `isPublished` 단일 boolean 만 있고, 실제로는 강사 측 UI 토글의 backing field 외에는 거의 사용되지 않는다.

---

## 8. 다른 서비스 비교

| 서비스 | Instructor course editor | Lesson publish 토글 | Lesson API 호출 |
|---|---|---|---|
| KPA-Society | ✅ `/instructor/courses/:id` | ✅ 존재 (현 IR 대상) | ✅ |
| K-Cosmetics | ❌ 없음 | ❌ | ❌ |
| GlycoPharm | ❌ 없음 (`/education` 별도 흐름) | ❌ | ❌ |
| Neture | ❌ 없음 | ❌ | ❌ |

Lesson 토글/뱃지 코드는 **KPA-Society 단독**. 다만 백엔드 `LessonService.maybeRevertToPendingReview` 호출은 LMS 백엔드 공통이므로, 다른 서비스가 추후 lesson editor 를 도입하면 동일한 재승인 트리거가 작동한다.

shared LMS package ([packages/lms-core](packages/lms-core/), [packages/interactive-content-core](packages/interactive-content-core/)):
- Lesson/Course entity 재export, 추가 visibility/status 정의 없음
- KPA 외 서비스에서는 학습자 listing 만 사용

→ **레슨-단위 publish 정책 제거는 KPA 외 서비스 회귀 영향이 사실상 없다.**

---

## 9. Canonical 문서와의 정합성

### 9.1 WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1
[Course.ts:20-27](packages/interactive-content-core/src/entities/Course.ts#L20-L27)
> DRAFT → PENDING_REVIEW → PUBLISHED (운영자 승인 완료, 사용자 노출 O)

→ **course 단위 승인만 정의**. lesson 단위 승인은 canonical 에 없음.

### 9.2 WO-O4O-LMS-COURSE-REAPPROVAL-FLOW-V1
[CourseService.ts:278-285](apps/api-server/src/modules/lms/services/CourseService.ts#L278-L285)
> 콘텐츠(레슨/퀴즈/과제/라이브) 변경 시 호출되는 상태 전환 헬퍼.
> PUBLISHED → PENDING_REVIEW (재검토 트리거)
> 콘텐츠 변경이 발생하면 운영자 재승인 없이는 사용자 노출 안 되도록 보장.

→ **현재 정책상 의도된 동작**. 그러나 사용자의 정책 가설(승인된 강의 안 레슨은 강사 자율 편집) 과 **정면 충돌**한다.

### 9.3 LMS-SCOPE-GUARD
[docs/architecture/LMS-SCOPE-GUARD.md](docs/architecture/LMS-SCOPE-GUARD.md):
- KPA 자격 검증 가드는 `/courses` write 에만 적용 (`/lessons` 미적용)
- → lesson 라우트는 instructor 권한만 검증, KPA 자격 검증 우회

→ 본 IR 의 범위 밖이지만, lesson-level operation 의 guard 누락은 별도 검토 필요.

### 9.4 APP-LMS-BASELINE
[docs/architecture/APP-LMS-BASELINE.md](docs/architecture/APP-LMS-BASELINE.md):
- 백엔드 공통 + frontend Phase 1 baseline
- lesson 단위 approval/publish 정책 정의 없음

---

## 10. 제거 가능 / 보류 항목

### 10.1 제거 후보 (사용자 정책 가설 기준 안전)

| 항목 | 위치 | 영향 |
|---|---|---|
| 1. `LessonService.create/update/delete/reorder` 의 `maybeRevertToPendingReview` 호출 | [LessonService.ts:89, 157, 174, 188](apps/api-server/src/modules/lms/services/LessonService.ts#L89) | 레슨 변경이 더 이상 course 를 PENDING_REVIEW 로 회귀시키지 않음 — **핵심 정책 변경** |
| 2. CourseEditPage 레슨 토글 버튼 | [CourseEditPage.tsx:949-955](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L949-L955) | 강사의 레슨별 publish 토글 UI 제거 |
| 3. CourseEditPage "미발행" badge | [CourseEditPage.tsx:946](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L946) | 상태 뱃지 제거 (모든 레슨이 동일하게 노출) |
| 4. `handleTogglePublish` 핸들러 | [CourseEditPage.tsx:649-656](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L649-L656) | dead code 제거 |
| 5. `Lesson.isPublished` 컬럼 | [Lesson.ts:94-95](packages/interactive-content-core/src/entities/Lesson.ts#L94-L95) | DB 컬럼 deprecation — migration 필요 (보수적으로 phase 2로 미루는 것도 가능) |
| 6. `Lesson.isPublished` API 필드 (createLesson/updateLesson DTO) | [LessonService.ts:26, 32](apps/api-server/src/modules/lms/services/LessonService.ts#L26) | DTO 정리 (entity 컬럼 제거와 함께) |
| 7. `LessonService.listLessonsByCourse` 의 `isPublished` 필터 | [LessonService.ts:119-121](apps/api-server/src/modules/lms/services/LessonService.ts#L119-L121) | 필터 조건 제거 (호출 측이 더 이상 전달하지 않음) |

### 10.2 보류 / 별도 결정 필요

| 항목 | 위치 | 이유 |
|---|---|---|
| A. 강의 단위 `archive`/`unpublish` 운영자 권한 | [kpa.routes.ts:576-640](apps/api-server/src/routes/kpa/kpa.routes.ts#L576-L640) | 강의 전체 비공개 전환은 정책상 유지 — 사용자 정책 가설과 충돌 없음 |
| B. CourseService.updateCourse 의 자동 PENDING_REVIEW 회귀 (course 자체 수정 시) | CourseService 내부 — 본 IR 범위 밖 검토 권장 | "강의 정보(제목/설명/태그) 수정도 재승인 필요한가?" — 별도 정책 결정. 정책 가설은 "레슨 자율" 까지만 명시. |
| C. Quiz/Assignment 변경 → 재승인 트리거 | [QuizService.ts:425-428, 458-461](apps/api-server/src/modules/lms/services/QuizService.ts#L425), [AssignmentService.ts:96-99](apps/api-server/src/modules/lms/services/AssignmentService.ts#L96) | 사용자 정책 가설("레슨"만 명시) — 퀴즈/과제는 별도 결정 필요. 다만 "레슨 = 강의 콘텐츠 단위"의 일관성을 보면 동일 정책 적용이 자연스러움. |
| D. `Course.isPublished: boolean` 이중 필드 | [Course.ts:139-140](packages/interactive-content-core/src/entities/Course.ts#L139-L140) | `Course.status` 와 의미 중복. 사용처 별도 grep 후 제거 결정 권장 — 본 IR 범위 밖 |
| E. lesson route 의 KPA scope guard 누락 | [LMS-SCOPE-GUARD.md](docs/architecture/LMS-SCOPE-GUARD.md) | 본 IR 범위 밖 별도 audit 권장 |

### 10.3 제거 시 주의 사항

1. **DB migration 동반 필요** — `Lesson.isPublished` 컬럼 제거는 schema migration + entity update + DTO 정리가 한 번에 가야 함. 운영 DB 에 rows 가 있으면 default true 로 backfill 후 컬럼 drop.
2. **운영자 대시보드 영향** — 현재 운영자가 보는 "검토 대기 강의 수" KPI 가 줄어들 수 있음 — 의도된 변경이므로 별도 알림은 불필요.
3. **수강생 영향** — 이미 강사가 명시적으로 `isPublished: false` 로 토글한 레슨이 운영 DB 에 존재하면, 정책 변경 후 즉시 노출됨. 정책 cutover 전에 production DB 점검 권장 (`SELECT COUNT(*) FROM lms_lessons WHERE "isPublished" = false`).
4. **운영 데이터 점검 채널** — CLAUDE.md §0 의 `gcloud sql connect` 으로 read-only 확인 가능. UPDATE 는 사용자 승인 필요.

---

## 11. 후속 수정 작업 제안 (작업 분해)

본 IR 은 조사 전용이므로 코드 변경은 없다. 후속 WO 가 작성된다면 다음 단위로 분해할 것을 권장한다:

### WO 후보 1 — `WO-O4O-KPA-LMS-LESSON-AUTONOMY-V1` (핵심 정책)
- LessonService mutation 의 `maybeRevertToPendingReview` 호출 제거
- CourseEditPage 의 레슨 토글 UI / 미발행 badge / handleTogglePublish 제거
- 수정 영향: 백엔드 4곳, 프론트 3곳
- 검증: 약사 강사 계정으로 PUBLISHED 강의의 레슨 생성/수정 → course 가 PUBLISHED 유지되는지 확인

### WO 후보 2 — `WO-O4O-LMS-LESSON-ISPUBLISHED-DEPRECATION-V1` (스키마 정리, 별도 phase 권장)
- `Lesson.isPublished` 컬럼 제거 migration
- DTO/타입 정리
- `LessonService.listLessonsByCourse` 의 isPublished 필터 제거
- 검증: production DB 의 unpublished 레슨 사전 점검 → migration

### WO 후보 3 — `WO-O4O-LMS-QUIZ-ASSIGNMENT-REAPPROVAL-POLICY-DECISION-V1` (정책 결정)
- 퀴즈/과제 변경 시 재승인 트리거 유지 여부 정책 결정
- 결정에 따라 QuizService/AssignmentService 정리

### WO 후보 4 (별건) — `WO-O4O-LMS-COURSE-UPDATE-REAPPROVAL-POLICY-V1`
- course 정보(제목/설명/태그/visibility) 수정도 재승인 회귀해야 하는가? 별도 정책 결정
- 현재 [CourseService.updateCourse](apps/api-server/src/modules/lms/services/CourseService.ts#L243) 의 PUBLISHED → PENDING_REVIEW 자동 회귀 로직 검토

---

## 12. 첨부 — 핵심 코드 인용 (인덱스)

| 파일 | 라인 | 역할 |
|---|---|---|
| [packages/interactive-content-core/src/entities/Course.ts](packages/interactive-content-core/src/entities/Course.ts) | 28-34 / 93-140 / 183-184 | Course Status / isPublished / publishedAt |
| [packages/interactive-content-core/src/entities/Lesson.ts](packages/interactive-content-core/src/entities/Lesson.ts) | 24-105 / 94-95 | Lesson entity / isPublished default true |
| [apps/api-server/src/modules/lms/services/CourseService.ts](apps/api-server/src/modules/lms/services/CourseService.ts) | 278-297 | maybeRevertToPendingReview |
| [apps/api-server/src/modules/lms/services/LessonService.ts](apps/api-server/src/modules/lms/services/LessonService.ts) | 77-92 / 138-160 / 162-175 / 177-189 | Lesson CRUD + 재승인 트리거 |
| [apps/api-server/src/modules/lms/routes/lms.routes.ts](apps/api-server/src/modules/lms/routes/lms.routes.ts) | 31-81 | LMS routes |
| [apps/api-server/src/routes/kpa/kpa.routes.ts](apps/api-server/src/routes/kpa/kpa.routes.ts) | 576-640 | Operator approval/reject/unpublish/archive routes |
| [services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx) | 178-186 / 649-656 / 944-958 | LessonModal form / 토글 핸들러 / badge·버튼 |
| [services/web-kpa-society/src/pages/lms/LmsCourseDetailPage.tsx](services/web-kpa-society/src/pages/lms/LmsCourseDetailPage.tsx) | 49-51 | 수강생 lesson fetch — 필터 없음 |

---

*Created: 2026-05-19*
*Status: Investigation only — no code changes*
*Investigation scope: KPA LMS lesson publish/approval drift*
