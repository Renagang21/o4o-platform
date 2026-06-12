# CHECK-O4O-KPA-LMS-COURSE-BASELINE-CLEANUP-V1

> **작업명:** WO-O4O-KPA-LMS-COURSE-BASELINE-CLEANUP-V1
> **유형:** KPA-Society 한정 강의/LMS 기준선 정비 (공통화 선행)
> **결과: PASS (조건부)** — 안전 수정 2종 적용(payment 오해 문구 / LIVE dead 잔재 제거), KPA typecheck 0 errors. **핵심 발견:** 레슨 완료 reward·진도 추적이 **두 경로로 분기**(quiz 경로만 credit 지급, video/article·assignment 경로는 미지급)하는 divergence 실증 — **reward 동작 변경을 수반하므로 본 WO에서 패치하지 않고 정책 합의 후속 WO로 분리**.
> 선행: `IR-O4O-KPA-LMS-COURSE-CURRENT-STATE-AUDIT-V1`(commit `faad5fed9`) · CLAUDE.md §13 / §13-A
> **작성일:** 2026-06-12

---

## 1. 작업 범위

KPA-Society 강의/LMS 기준선을 공통화 전에 정비. **KPA-Society 한정** — GlycoPharm / K-Cosmetics / Neture 미적용. 특히 **Neture 강의 기능·메뉴·라우트·공통 소비처 연결 금지**.

선행 IR 위험(R1 dormant payment / R2 progress 갱신 / R3 course-complete 판정 / R6 Neture 오염) 중 **안전하게 코드로 정리 가능한 항목만** 본 WO에서 수정하고, **reward 동작 변경을 수반하는 항목은 문제 확정 + 후속 분리**.

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `87d651539` · origin 동기화 |
| 다른 세션 WIP(미접촉) | contact-inquiry(api-server) · operator-core-ui service-contact-settings · 마이그레이션 `20261107000000-AddContactAutoReply` · `CHECK-...-ORDER-VIEW-LOOP` M · 스크린샷 다수 — **전부 path-specific 격리, 본 WO는 LMS 파일만 stage** |

## 3. 변경 파일 (5건, 전부 KPA frontend)

| 파일 | 변경 | 항목 |
|------|------|------|
| `services/web-kpa-society/src/pages/lms/LmsCourseDetailPage.tsx` | 유료 강의 접근 안내 문구 정정 | 4.1 |
| `services/web-kpa-society/src/types/index.ts` | Lesson.type union `'live'` 제거 | 4.5 |
| `services/web-kpa-society/src/pages/courses/CourseIntroPage.tsx` | `LESSON_TYPE_ICONS.live` 아이콘 제거 | 4.5 |
| `services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx` | 주석 2건 `quiz/assignment/live`→`quiz/assignment` | 4.5 |
| `docs/checks/CHECK-O4O-KPA-LMS-COURSE-BASELINE-CLEANUP-V1.md` | 본 문서(신규) | — |

**backend·route·DB·migration·enum·결제 인프라 무변경. 공통 패키지·shared LMS package 미생성.**

## 4. dormant payment 정리 결과 (4.1) — DONE (문구), 인프라 유지

- **LMS 내 결제 오해 문구는 단 1건**: `LmsCourseDetailPage.tsx`의 유료 강의 접근 안내 `'결제 완료 후 이용 가능합니다.'`
  - → **정정**: `'수강료가 있을 수 있으며, 납부·확인은 강사 또는 운영자가 별도로 안내합니다. O4O에서는 강의 결제를 제공하지 않습니다.'`
  - "유료" 배지(`detailBadge('paid')`)는 정보 표기로 유지(결제 버튼 아님).
- **결제 버튼/PG/checkout 흐름은 LMS에 없음** — grep `결제하기/checkout/주문하기` 매칭은 전부 Store/Storefront/Pharmacy 커머스(범위 외, 정상 기능, 미접촉).
- **dormant 인프라 유지(정책대로 제거 금지)**: `course.isPaid`/`price`/`OrderType.LMS`/`LmsPaymentEventHandler`/`EnrollmentService.__fromPayment` 모두 보존. `enrollCourse`는 `isPaid && !__fromPayment && !requiresApproval` 시 `'유료 과정은 결제를 통해서만 등록할 수 있습니다'` throw(기존 가드 유지).
- DB/schema/필드 제거 없음, payment flow 신규 구현 없음.

## 5. 레슨 완료 후 progress 갱신 정밀화 (4.2) — 검증 결과: UI 신뢰 OK / 백엔드 경로 분기 확인

**video/article 레슨 완료 경로** = `LmsLessonPage.handleComplete` → `lmsApi.updateProgress(courseId, lessonId, true, metrics)` → `EnrollmentController.updateLessonProgress`(`lms.routes.ts:190`).

- **UI 신뢰성 OK**: `handleComplete`는 응답의 enrollment를 그대로 `setEnrollment`로 반영(별도 refresh 불요). 마지막 레슨 시 `progressPercentage>=100`이면 수료 모달. type별 완료 메트릭(video 시청률 / article 스크롤·체류) 수집 후 백엔드 임계(video 70% / article scroll 80%·dwell 30s) 검증 — 거부 시 BE 메시지 노출. **이 경로는 안정적.**
- **백엔드 처리**: `completedLessonIds`(enrollment.metadata 배열)에 추가 → `completedLessons/progressPercentage` 갱신 → `completedLessons >= totalLessons` 시 `completeEnrollment` + `CompletionService.createCompletion`(인증서). 체인 실패는 진도 롤백 없이 warn(격리 OK).
- **⚠ 핵심 분기 확인**: 이 경로는 **`lesson_complete` credit을 지급하지 않으며**, 완료 추적을 **enrollment.metadata.completedLessonIds**에 한다 — 아래 §7·§12 divergence 참조.

## 6. 퀴즈 완료 후 progress 갱신 정밀화 (4.3) — 검증 결과

**quiz 레슨 완료 경로** = `LmsLessonPage.handleQuizSubmit` → `lmsApi.submitQuiz` → `QuizService.submitQuiz` → (pass 시) `completeLessonProgress`.

- **채점/통과/재응시**: `score >= passingScore` 판정, `maxAttempts` 검사, `QuizAttempt`(lms_quiz_attempts) 이력 기록. UI는 pass/fail 명확 분기(불합격 시 "다시 시도"). **OK.**
- **UI refresh**: 통과 후 `getEnrollmentByCourse` 재조회로 진도 반영. **OK.** (단 마지막 레슨이 quiz일 때 수료 모달은 미표시 — minor, §15 R-b)
- **reward 구조 (의도된 것으로 문서화)**: 퀴즈 통과 시 `quiz_pass`(20) + `lesson_complete`(10) **둘 다 지급**. 각각 `referenceKey=quiz_pass:{userId}:{quizId}` / `lesson_complete:{userId}:{lessonId}`로 **분리**, sourceType·금액 상이. → **이중 지급이 아니라 "퀴즈 통과 보너스 + 레슨 완료 기본"의 의도된 합산.** referenceKey UNIQUE로 재응시 재지급 차단. **정책상 허용 — 명시.**
- **완료 추적**: 이 경로는 **lms_progress 테이블**(Progress 엔티티)에 COMPLETED 기록 → enrollment.completedLessons는 `progressRepository.count(COMPLETED)`로 재계산.

## 7. course_complete 자동 판정 정밀화 (4.4) — 판정: 분기 실증 (패치 보류)

`course_complete`(50) credit + 인증서 트리거 위치를 전수 확인한 결과:

| 완료 트리거 경로 | 완료 추적 저장소 | lesson_complete credit | course_complete credit | 인증서/Completion |
|------|------|:---:|:---:|:---:|
| **quiz**(`QuizService.completeLessonProgress`) | `lms_progress`(Progress) | ✅ 지급 | ✅ 지급(`completedCount>=totalLessons`) | ✅ |
| **video/article**(`EnrollmentController.updateLessonProgress`) | `enrollment.metadata.completedLessonIds` | ❌ 미지급 | ❌ 미지급 | ✅(`completeEnrollment`+Completion) |
| **assignment**(`AssignmentService`/submit) | (제출→완료 처리) | ❌ 미지급 | ❌ 미지급 | ✅(체인) |

- **`CompletionService.createCompletion`은 credit을 지급하지 않음**(완료 레코드 + 인증서만). → **course_complete(50) credit은 오직 quiz 경로의 `completedCount>=totalLessons`에서만 지급.**
- **결론(R3 실증):** video/article·assignment만으로 구성된 강의를 수료하면 **인증서는 발급되나 course_complete/lesson_complete credit은 미지급**. quiz 레슨 포함 강의만 credit이 흐른다.
- **추가 위험(R2 실증):** 두 경로가 **서로 다른 완료 저장소**(`lms_progress` vs `enrollment.metadata.completedLessonIds`) 사용 → **type 혼합 강의에서 enrollment.completedLessons를 서로 다른 기준으로 덮어써 카운터 불일치 가능**. UI 상세(`LmsCourseDetailPage`)·레슨 사이드바는 metadata.completedLessonIds로 체크표시 → quiz 경로 완료가 체크에 안 보일 수 있음.

> **패치 보류 사유:** video/article·assignment 경로에 reward 지급을 추가하는 것은 **"누가 credit을 받는가"를 바꾸는 reward 동작 변경**이다. WO 금지 항목("리워드 지급 정책 자체를 바꾸지 말 것 / credit 금액 변경 금지")과 `IR-O4O-MARKETING-CONTENT-REWARD-POLICY-V1`(reward 정책 SSOT)의 IR→합의→WO 절차에 해당한다. 따라서 **본 WO에서는 문제 확정·문서화에 그치고, 단일 완료 경로로 reward 발급을 통합하는 정책 합의 후속 WO**(§16-1)로 분리한다. 본 WO의 안전 수정은 reward 동작을 바꾸지 않는다.

## 8. reward 중복 방지 확인 — PASS

- `course_complete`/`lesson_complete`/`quiz_pass` 모두 `referenceKey` UNIQUE(`credit_transactions`) + `PointService.grantPoint`→`CreditService.earnCredit` 내부 dedup(존재 시 null 반환).
- `CourseCompletion`은 UNIQUE(userId, courseId) + `CompletionService` dedup → 재완료 시 인증서·완료 미재생성.
- enrollment 재참여는 COMPLETED 제외(CANCELLED/REJECTED/EXPIRED만 허용).
- **본 WO는 referenceKey·dedup·금액·정책 일절 미변경.**

## 9. LIVE/YouTube 잔여 흔적 제거 결과 (4.5) — DONE

- **KPA frontend LIVE dead 잔재 제거**(생성 불가·`=== 'live'` 비교 없음 확인 후):
  - `types/index.ts` Lesson.type union `| 'live'` 제거
  - `CourseIntroPage.tsx` `LESSON_TYPE_ICONS.live('🔴')` 제거
  - `CourseEditPage.tsx` 주석 2건 `quiz/assignment/live`→`quiz/assignment`
- **이미 LIVE-free**: `lms-instructor.ts` `LessonType`(4종), `lms-core` `LessonType`(VIDEO/ARTICLE/QUIZ/ASSIGNMENT), 백엔드 enum/DB. lesson type select(`SUPPORTED_LESSON_TYPES`)는 4종만.
- **YouTube는 미접촉**: KPA의 youtube 매칭은 전부 **Signage 미디어**(정상 기능) + 강의 본문 embed(`toYouTubeEmbedUrl`, 동영상 자료용) — 실시간 강의 아님, 제거 대상 아님.
- **보존(후속)**: `packages/lms-client/src/index.ts:134` 주석 "과제/라이브(assignment, live) — Phase 5+ 검토"는 **shared 패키지의 의도적 roadmap 주석**이며 KPA 한정 범위·shared 패키지 비접촉 원칙상 보존. (제거 시 별도 판단)
- live 기능/YouTube 실시간 강의 재도입 없음, lesson type LIVE 추가 없음.

## 10. Neture 제외 확인 (4.6) — 명문화

- **Neture에는 LMS/강의 수강 기능이 없으며, 본 WO는 Neture 파일을 일절 수정하지 않았다.**
- Neture에 강의 메뉴/라우트/공통 소비처 추가 금지. Neture는 공급자/파트너/운영 기반 서비스.
- Neture 공급자는 강의 **콘텐츠 원천 제공자**가 될 수 있으나 **수강 서비스 주체가 아니다.**
- LMS 공통화 대상 = **KPA-Society / GlycoPharm / K-Cosmetics**. Neture는 공통 UI/Core 소비처에서 제외.
- 공통화 단계에서 Neture 비오염을 별도 CHECK(§16-4)로 최종 검증.

## 11. 검증 결과

- **TypeScript:** `services/web-kpa-society` `tsc --noEmit` → **0 errors** ✅.
- **정적:**
  - LMS 결제 오해 문구 1건 정정, 결제 버튼 0(LMS), dormant 인프라 보존 확인.
  - KPA `'live'` lesson-type 잔재 0(union·아이콘 제거, `=== 'live'` 비교 부재 확인). 주석 정리.
  - reward referenceKey/금액/정책 무변경. backend·route·DB·migration·enum 무변경.
  - Neture·GP·KCos 파일 미수정(git status). 다른 세션 WIP(contact-inquiry/operator-core-ui 등) 미접촉.
- **browser smoke:** 미수행 — 인증 guard·실데이터 write 회피(WO 원칙). UI 텍스트/dead-type 제거는 tsc + 정적으로 검증. 유료 강의 안내 문구·LIVE 미노출은 배포 후 렌더 확인 권장.
- **backend typecheck:** 백엔드 무변경이므로 미실행(divergence는 문서화만).

## 12. 남은 핵심 이슈 (확정·미패치)

| ID | 이슈 | 실증 | 처리 |
|----|------|------|------|
| **D1** | course_complete/lesson_complete credit이 **quiz 경로에서만** 지급(video/article·assignment 미지급) | §7 표 | 후속 정책 WO(§16-1) |
| **D2** | 완료 추적 저장소 이원화(`lms_progress` vs `enrollment.metadata.completedLessonIds`) → 혼합형 강의 카운터·체크표시 불일치 가능 | §7 | 후속 정책 WO(§16-1) |
| **D3** | (보존) lms-client `live` roadmap 주석 — shared 패키지 | §9 | 선택적 후속 |

> D1·D2는 reward 동작/완료 판정 통합 = 정책 합의 필요. 본 WO 범위(안전 정비) 밖.

## 13. 후속 작업 제안

1. **`WO-O4O-LMS-COMPLETION-REWARD-UNIFY-V1`** (선결, 정책 합의 필요) — D1·D2 해소. 단일 완료 경로(또는 공통 `LessonCompletionService`)로 progress 저장소·lesson_complete/course_complete reward 발급을 통합. `IR-O4O-MARKETING-CONTENT-REWARD-POLICY-V1` 기준 video/article·assignment 완료의 credit 지급 여부를 **명시 합의 후** 구현. referenceKey dedup·금액 불변.
2. **`IR-O4O-LMS-SERVICE-COMMONIZATION-BOUNDARY-V1`** — KPA 정비 결과 기준 LMS 공통화 경계 확정.
3. **`WO-O4O-LMS-COMMON-UI-EXTRACTION-V1`** — CourseCard/CourseList/CourseDetail/LessonPlayer/QuizPanel 등 공통 UI 후보 추출.
4. **`WO-O4O-LMS-GLYCOPHARM-KCOSMETICS-ADOPTION-V1`** — GP/KCos 적용(공통 기준).
5. **`CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`** — Neture LMS 메뉴/라우트/소비처 부재 최종 확인.

> 권장 순서: **1(완료/리워드 통합) → 2(경계 IR) → 3(공통 UI) → 4(적용) → 5(Neture 가드)**. D1·D2를 공통화 전에 정리해야 잘못된 reward 구조가 GP/KCos로 전파되지 않는다.

## 14. 완료 판정

**PASS (조건부).** KPA 강의 기준선의 안전 정비(payment 오해 문구·LIVE dead 잔재) 완료, typecheck 0 errors, Neture/GP/KCos·backend 무변경. **핵심 reward·완료 divergence(D1·D2)를 실증·확정하여 공통화 선행 정책 WO로 분리** — 이로써 "강의 결제 오해 제거 / Neture 제외 고정 / 위험 명문화"는 달성, "reward·completion 흐름 통합"은 정책 합의 후속으로 안전하게 이관.

---

## 최종 보고 요약

- **WO:** WO-O4O-KPA-LMS-COURSE-BASELINE-CLEANUP-V1 (KPA-Society 한정 강의 기준선 정비)
- **변경 파일:** KPA frontend 4 + CHECK 문서 1 (backend/DB/route/enum/Neture/GP/KCos 무변경)
- **payment(4.1):** LMS 결제 오해 문구 1건 정정(외부 수납 안내), dormant 인프라 보존
- **LIVE(4.5):** KPA `'live'` lesson-type dead 잔재 제거(union·아이콘·주석), YouTube(Signage) 미접촉
- **progress/quiz(4.2/4.3):** UI는 백엔드 응답 신뢰 OK, quiz_pass+lesson_complete 합산은 의도된 구조(referenceKey 분리)로 명시
- **course_complete(4.4):** **divergence 실증** — credit은 quiz 경로에서만 지급, 완료 추적 저장소 이원화(D1·D2) → reward 동작 변경 수반으로 **패치 보류·후속 정책 WO 분리**
- **reward 중복방지:** referenceKey UNIQUE + dedup 확인(무변경)
- **Neture 제외:** 명문화, 파일 미수정
- **검증:** KPA tsc 0 errors, 정적 PASS, 다른 세션 WIP 미접촉
- **후속:** WO-LMS-COMPLETION-REWARD-UNIFY-V1(선결) → 경계 IR → 공통 UI → GP/KCos 적용 → Neture 가드 CHECK
- **커밋:** `feat(kpa-lms): stabilize course baseline before commonization`
