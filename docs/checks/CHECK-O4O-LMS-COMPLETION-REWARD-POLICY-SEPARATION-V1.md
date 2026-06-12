# CHECK-O4O-LMS-COMPLETION-REWARD-POLICY-SEPARATION-V1

> **작업명:** WO-O4O-LMS-COMPLETION-REWARD-POLICY-SEPARATION-V1
> **유형:** KPA-Society 한정 — completion/progress layer 와 reward policy layer 분리·정렬 (공통화 선행)
> **결과: PASS** — (1) reward 게이팅: lesson_complete/quiz_pass/course_complete 를 **rewardPolicy 설정 시에만** 지급(미설정 → 미지급, 오류 아님). (2) completion canonical: video/article 도 `lms_progress`(Progress)에 기록 → 3경로(quiz/assignment/video·article) 완료 카운트 단일화(D2 해소). (3) course_complete reward path-independent(D1 해소). api-server·web-kpa-society typecheck 0.
> **중요 원칙:** 리워드는 무조건 지급이 아니다. 강사/운영자가 설정한 경우에만 지급한다. 본 WO 는 reward 지급 **확대가 아니라** completion layer 와 reward policy layer 의 **분리·정렬**이다.
> 선행: `IR-O4O-KPA-LMS-COURSE-CURRENT-STATE-AUDIT-V1` · `CHECK-O4O-KPA-LMS-COURSE-BASELINE-CLEANUP-V1`(기준 commit `af1964ae4`)
> **작성일:** 2026-06-12 · 기준 HEAD `efb26a4c9`

---

## 1. 작업 목적

KPA-Society 강의 LMS 의 레슨 완료·퀴즈 완료·강의 수료 흐름을 공통화 전에 두 layer 로 분리한다.

- **학습 상태 layer**: reward 여부와 무관하게 항상 canonical 하게 기록(enrollment / lesson progress / quiz attempt / pass·fail / course progress / completion / certificate).
- **reward policy layer**: lesson_complete / quiz_pass / course_complete 는 **강사·운영자가 강의/레슨/퀴즈 단위로 설정한 경우에만** 지급. 설정 없으면 완료는 정상 기록되되 credit 미지급(오류 아님).

KPA-Society 한정. GP/KCos/Neture 미적용. Neture 는 LMS 대상 아님(메뉴/라우트/소비처 연결 금지).

## 2. 정책 정정 (반영)

이전 baseline cleanup CHECK 의 D1·D2 는 "quiz 경로만 reward 지급"을 **버그**로 봤으나, 본 WO 의 정책 정정에 따라 해석을 바꾼다:

> **reward 는 기본 지급이 아니다.** 모든 경로에서 reward 를 지급하도록 "확대"하는 것이 목적이 아니라, **모든 경로에서 동일하게 "정책 설정 시에만" 지급**하도록 게이팅하는 것이 목적이다. 따라서 하드코딩 무조건 지급(quiz 경로)을 **제거**하고, 모든 경로를 policy 게이트 뒤로 통일했다.

## 3. 선행 divergence (실증된 D1·D2)

| 완료 경로 | (기존)완료 저장소 | (기존)reward |
|------|------|------|
| quiz | `lms_progress`(Progress) | quiz_pass(20)+lesson_complete(10)+course_complete(50) **하드코딩 무조건 지급** |
| assignment | `lms_progress`(Progress) | 없음 |
| video/article | `enrollment.metadata.completedLessonIds` (Progress 미기록) | 없음 |

- **D1**: course_complete/lesson_complete credit 이 quiz 경로에서만 지급 → 경로 의존.
- **D2**: video/article 만 metadata 카운트, quiz/assignment 는 Progress 카운트 → 혼합형 강의에서 `enrollment.completedLessons` 가 서로 다른 기준으로 덮어써져 진도·수료·체크표시 불일치.

## 4. 변경 파일 (backend 5 + frontend 1 + CHECK 1)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/lms/services/RewardPolicyService.ts` | **신규** — reward policy resolver + gated grant 헬퍼 |
| `apps/api-server/src/modules/lms/services/QuizService.ts` | quiz_pass/lesson_complete/course_complete 하드코딩 grant → 게이팅. completedLessonIds 미러 동기화 |
| `apps/api-server/src/modules/lms/services/AssignmentService.ts` | lesson_complete/course_complete 게이팅 grant 추가(정책 없으면 no-op). 미러 동기화 |
| `apps/api-server/src/modules/lms/services/EnrollmentService.ts` | **canonical 완료 메서드 `recordLessonProgressCompletion` 추가** — video/article 도 Progress 기록 + 미러 + 진도 재계산 + 게이팅 reward + 자동 수료 체인 |
| `apps/api-server/src/modules/lms/controllers/EnrollmentController.ts` | video/article 완료 블록(metadata-only) → `recordLessonProgressCompletion` 호출로 일원화 |
| `services/web-kpa-society/src/pages/lms/LmsLessonPage.tsx` | 수료 모달 하드코딩 "+50 크레딧 적립" 문구 제거(reward 기본 지급 오해) |
| `docs/checks/CHECK-O4O-LMS-COMPLETION-REWARD-POLICY-SEPARATION-V1.md` | 본 문서(신규) |

**무변경:** DB/migration/schema, credit-constants 금액, referenceKey 규칙, OrderType.LMS/price/isPaid, payment/checkout, certificate 신규기능, GP/KCos/Neture, 공통 패키지.

## 5. reward policy 조회 경로 (RewardPolicyService)

- **정책 저장 위치(migration-free):** `Course.metadata.rewardPolicy` / `Lesson.metadata.rewardPolicy`(해당 이벤트 우선) / `Quiz.metadata.rewardPolicy`(quizPass 우선). 세 엔티티 모두 기존 `jsonb metadata` 컬럼 보유 → **새 컬럼·migration 불필요.**
- **형태:** `rewardPolicy = { lessonComplete?: boolean|number, quizPass?: boolean|number, courseComplete?: boolean|number }`. `true` → 기본 금액(CREDIT_REWARDS), `number(>0)` → 사용자 지정 금액, 그 외 → 0(미설정).
- **`resolveRewardAmount(event, {course,lesson,quiz})`**: 이벤트별 우선순위(lesson/quiz → course)로 금액 해석, 미설정이면 0.
- **`grantRewardIfConfigured(...)`**: `amount<=0` → 지급 안 함(false, 오류 아님). `amount>0` → `PointService.grantPoint`(기존 serviceKey 예산 + referenceKey dedup). 실패는 throw 없이 warn → completion rollback 방지.
- **금액 불변:** 기존 10/20/50 은 "policy=true 활성화 시 기본값"으로만 사용. 금액 변경 없음.

## 6. completion canonical 경로 (D2 해소)

- **canonical = `lms_progress`(Progress 엔티티).** quiz/assignment 가 이미 사용하던 공식 저장소를 기준으로 채택(WO §7.1 우선순위 1).
- **video/article**: `EnrollmentService.recordLessonProgressCompletion` 으로 **Progress upsert→complete** 기록(기존엔 미기록). 진도 = `Progress COMPLETED count` 기준 재계산 → quiz/assignment 와 동일 기준.
- **`enrollment.metadata.completedLessonIds`**: **즉시 제거하지 않음.** 3경로 모두에서 **미러로 동기화**(UI 체크표시 backward-compat). read fallback 유지. migration 없음.
- **중복 카운트 방지:** 모든 경로가 `Progress COMPLETED count` 단일 기준으로 `enrollment.updateProgress` 호출 → 혼합형 강의에서도 일관. completedLessonIds 는 표시용 미러일 뿐 카운트 기준 아님.

## 7. lesson_complete 처리 결과

- quiz/assignment/video·article 완료 시 모두 `resolveRewardAmount('lesson_complete', {lesson, course})` → `grantRewardIfConfigured`.
- **lesson 또는 course 의 rewardPolicy.lessonComplete 설정 시에만 지급.** 미설정 → 미지급, completion 정상.
- referenceKey `lesson_complete:{userId}:{lessonId}` UNIQUE → 재완료 재지급 차단.

## 8. quiz_pass 처리 결과

- `QuizService.submitQuiz`: pass 시에만 `resolveRewardAmount('quiz_pass', {quiz, course})` → gated grant. fail → 지급/완료 처리 없음(기존 가드 유지).
- **quiz 또는 course 의 rewardPolicy.quizPass 설정 시에만 지급.** 미설정 → 미지급.
- 재응시 중복: referenceKey `quiz_pass:{userId}:{quizId}` UNIQUE 차단.
- **quiz_pass + lesson_complete 동시 지급**은 "두 정책이 모두 설정된 경우"에만 발생(무조건 합산 아님). 각각 referenceKey 분리.

## 9. course_complete 처리 결과 (D1 해소)

- **모든 완료 경로**(quiz/assignment/video·article)에서 마지막 레슨 완료(`completedCount >= totalLessons`) 시 `enrollment.complete` + `CompletionService`(인증서) + `resolveRewardAmount('course_complete',{course})` → gated grant.
- **course 의 rewardPolicy.courseComplete 설정 시에만 1회 지급.** 미설정 → 미지급(인증서·수료는 정상).
- referenceKey `course_complete:{userId}:{courseId}` UNIQUE + `CourseCompletion` UNIQUE(userId,courseId) 이중 dedup → 재완료 재지급/재발급 차단.
- 이미 COMPLETED enrollment 는 재처리 안 함(`status !== COMPLETED` 가드).

## 10. reward 미설정/설정 시 동작 확인

- **미설정(현 상태 — 모든 강의):** 완료/진도/수료/인증서 정상, credit 0 지급. 오류·차단 없음. (정책 의도: reward off until 설정)
- **설정 시:** 해당 이벤트에 기존 금액(또는 지정 금액) 1회 지급, referenceKey dedup.
- **지급 실패(예산 부족 등):** warn 후 진행, completion rollback 없음.

## 11. assignment 처리 기준 (보수적)

- assignment 제출/완료 semantics(제출 시 자동 완료)·채점·승인 로직 **무변경**. 신규 assignment 정책 미구현.
- 추가한 것은 **다른 경로와 동일한 게이팅 reward 호출**(정책 없으면 no-op)뿐 → assignment 고유 동작 변화 없음. course_complete path-independence 만 확보.

## 12. enrollment.metadata.completedLessonIds 처리 기준

- **즉시 제거 금지** 준수 — 유지 + 3경로 미러 동기화.
- 진도 카운트 기준에서는 제외(canonical = Progress count). 이중 카운트 없음.
- 기존 데이터 호환: 과거 video/article 만 기록된 enrollment 는 다음 완료부터 Progress 와 미러 양쪽 갱신. 과거 metadata 값 손상 없음.
- DB migration 없음.

## 13. Neture 제외 확인

- **Neture 파일 미수정**(git status 확인 — untracked PNG 스크린샷만, 비-LMS·사전 존재).
- Neture LMS 메뉴/라우트/공통 소비처 없음. Neture 는 공급자/파트너/운영 기반 — 강의 수강 대상 아님.
- LMS 공통화 대상 = KPA-Society / GlycoPharm / K-Cosmetics. Neture 제외.

## 14. 검증 결과

- **TypeScript:** `apps/api-server` **0 errors** · `services/web-kpa-society` **0 errors**(재실행 clean; 첫 출력의 store-ui-core/b2b-catalog 에러는 타 세션 WIP·stale 증분 캐시, 본 변경 무관·미접촉).
- **정적:**
  - LMS 모듈 내 **직접 `PointService.grantPoint` 0건** — 헬퍼 내부 1곳만. 3경로 전부 `resolveRewardAmount`+`grantRewardIfConfigured` 경유(grep 확인).
  - video/article 완료 → `recordLessonProgressCompletion`(Progress 기록) 경로 연결 확인.
  - course_complete 가 quiz/assignment/video·article 모두에서 gated 호출.
  - referenceKey 규칙·dedup·금액 무변경. backend·route·DB·migration·enum 무변경.
  - Neture/GP/KCos 미수정. 다른 세션 WIP(contact-inquiry/operator-core-ui/store-ui-core 등) 미접촉.
- **browser smoke:** 미수행 — 인증 guard·실데이터 write 회피(WO 원칙). completion/reward 엔진 변경은 tsc + 정적(기존 quiz/assignment Progress 패턴과 동형)으로 검증. **배포 후 dev/staging 에서 video/article 완료→진도 반영, quiz 통과→진도, 수료→인증서, rewardPolicy 미설정 강의에서 credit 미지급·완료 정상을 확인 권장.**

## 15. 남은 한계·이슈

| ID | 내용 | 처리 |
|----|------|------|
| L1 | **reward policy 설정 UI 부재** — `metadata.rewardPolicy` 를 설정하는 강사/운영자 UI 없음 → 현재 모든 강의 미설정 → 사실상 reward 전면 off(정책 의도) | 후속 §16-1 IR 에서 UI↔backend 계약 설계 |
| L2 | 과거 video/article-only enrollment 의 누적 진도는 다음 완료 시점부터 Progress 동기화(소급 backfill 없음 — migration 회피) | 필요 시 별도 backfill WO(현 불요) |
| L3 | `lms-client` `live` roadmap 주석(shared 패키지) — 이전 CHECK 에서 보존 | 선택적 후속 |

## 16. 후속 작업

1. **`IR-O4O-LMS-REWARD-POLICY-UI-AUDIT-V1`** — 강사/운영자 reward 설정 UI ↔ `metadata.rewardPolicy` backend 계약 일치 조사·설계(L1).
2. **`IR-O4O-LMS-SERVICE-COMMONIZATION-BOUNDARY-V1`** — KPA completion/reward 정렬 이후 공통화 경계 확정.
3. **`WO-O4O-LMS-COMMON-UI-EXTRACTION-V1`** — CourseCard/CourseList/CourseDetail/LessonPlayer/QuizPanel 공통 UI 추출.
4. **`WO-O4O-LMS-GLYCOPHARM-KCOSMETICS-ADOPTION-V1`** — GP/KCos 적용.
5. **`CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`** — Neture 제외 최종 확인.

## 17. 완료 판정

**PASS.** completion/progress layer(canonical = lms_progress, 3경로 단일화) 와 reward policy layer(설정 시에만 지급) 를 분리·정렬 완료. D1(course_complete 경로 독립)·D2(완료 저장소 단일화) 해소. 하드코딩 무조건 지급 제거 → reward 는 강사/운영자 설정 기반. 금액·referenceKey·dedup·DB 무변경, Neture/GP/KCos 무변경, typecheck(2) 통과. reward 설정 UI 부재(L1)는 후속 IR 로 분리.

---

## 최종 보고 요약

- **WO:** WO-O4O-LMS-COMPLETION-REWARD-POLICY-SEPARATION-V1 (KPA-Society 한정)
- **원칙:** 리워드는 무조건 지급 아님 — 강사/운영자 설정 시에만. completion layer ↔ reward policy layer 분리.
- **변경:** backend 5(신규 RewardPolicyService 포함) + frontend 1 + CHECK 1
- **reward 게이팅:** lesson_complete/quiz_pass/course_complete 전부 `metadata.rewardPolicy` 게이트 뒤로 통일. 미설정 → 미지급(오류 아님). 금액 불변.
- **completion canonical:** video/article 도 `lms_progress` 기록 → 3경로 완료 카운트 단일화(D2). completedLessonIds 미러 유지(즉시 제거 안 함).
- **course_complete:** 모든 경로에서 gated 지급(D1 path-independent).
- **중복방지:** referenceKey UNIQUE + dedup 무변경.
- **assignment:** 보수적 — 게이팅 호출만 추가, 고유 로직 무변경.
- **Neture:** 미수정·제외 명문화.
- **검증:** api-server 0 · web-kpa-society 0 errors. LMS 직접 grantPoint 0(헬퍼 경유). 정적 PASS.
- **한계:** reward 설정 UI 부재(L1) → 후속 IR-O4O-LMS-REWARD-POLICY-UI-AUDIT-V1.
- **커밋:** `feat(lms): separate completion progress from reward policy`
