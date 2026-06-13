# CHECK-O4O-LMS-REWARD-POLICY-CONTRACT-STABILIZE-V1

> **작업명:** WO-O4O-LMS-REWARD-POLICY-CONTRACT-STABILIZE-V1
> **유형:** KPA-Society 한정 — LMS rewardPolicy **계약 안정화** (강사/운영자 reward 설정 UI 선행 작업, backend·contract 중심)
> **결과: PASS** — (1) rewardPolicy 정식 계약 타입 고정(rich entry + legacy shorthand 호환). (2) 단일 normalizer(`normalizeRewardEntry`)로 unset/disabled/invalid/amount 의미 확정 + invalid → 미지급·warn. (3) metadata 부분 업데이트 시 rewardPolicy 유실 방지(Course/Lesson/Quiz update — shallow merge). (4) 강사 제안 / 운영자 승인 metadata 구조 타입·문서 기반 마련. api-server typecheck 0.
> **중요 원칙:** 리워드는 무조건 지급이 아니다. 강사/운영자가 설정한 경우에만 지급한다. 본 WO 는 **계약 안정화**이며 reward 지급 확대·금액 변경·UI 신규 구현이 아니다.
> 선행: `IR-O4O-KPA-LMS-COURSE-CURRENT-STATE-AUDIT-V1` · `WO-O4O-KPA-LMS-COURSE-BASELINE-CLEANUP-V1` · `WO-O4O-LMS-COMPLETION-REWARD-POLICY-SEPARATION-V1` · `IR-O4O-LMS-REWARD-POLICY-UI-AUDIT-V1`
> **작성일:** 2026-06-13 · 기준 HEAD `a1c5df4a8`

---

## 1. 작업 목적

KPA-Society 강의/LMS 의 rewardPolicy 계약을 안정화한다. 강사/운영자 reward 설정 UI 를 만들기 전 선행 작업으로, 다음을 고정한다.

- `metadata.rewardPolicy` shape 를 명확히 고정
- backend validation / service contract 정렬
- reward 설정 없음 / 비활성 / 기본값 / 지정 금액의 의미 확정
- 강사 제안값과 운영자 승인값을 분리 저장할 수 있는 기반 마련
- reward 지급 로직이 임의 json 구조에 의존하지 않도록 안정화
- 이후 강사 UI / 운영자 UI / 서비스 공통화가 동일 계약을 사용하도록 기준선 고정

KPA-Society 한정. GlycoPharm / K-Cosmetics / Neture 미적용. **Neture 는 LMS/강의 대상 아님** — 메뉴/라우트/API/공통 UI 소비처 연결 없음.

## 2. 선행 상태 요약

직전 `WO-O4O-LMS-COMPLETION-REWARD-POLICY-SEPARATION-V1` 에서 completion/progress layer 와 reward policy layer 가 분리됨:

- `RewardPolicyService.ts` 신규 도입, `metadata.rewardPolicy` 를 정책 소스로 사용
- 지급은 `resolveRewardAmount` / `grantRewardIfConfigured` 경유, LMS 모듈 내 직접 `grantPoint` 제거
- 미설정 시 0 지급, 기존 금액은 default 로만 사용
- completion canonical = `lms_progress`, `completedLessonIds` 는 backward-compat mirror

**남아 있던 문제(본 WO 해결 대상):** rewardPolicy shape 가 공식 계약으로 미고정(`boolean|number` 만), invalid 처리·warn 부재, DTO/metadata partial update 시 rewardPolicy 유실 위험, 강사 제안/운영자 승인 구조 미정의.

## 3. rewardPolicy 최종 shape (정식 계약)

정책 키는 **기존 코드 스타일(camelCase)** 유지 — 저장 데이터·소비처 호환(WO §5 note "필드명은 기존 코드 스타일에 맞추되 의미는 유지").

```ts
type RewardEvent = 'lesson_complete' | 'quiz_pass' | 'course_complete';          // 런타임/referenceKey 식별자
type RewardPolicyEventKey = 'lessonComplete' | 'quizPass' | 'courseComplete';    // 저장 키(camelCase)

interface RewardPolicyEntry {        // 정식(rich) entry — 후속 UI 권장 형태
  enabled: boolean;
  amount?: number;                   // 정수 > 0 일 때만 유효
  useDefaultAmount?: boolean;        // amount 미지정 시 기본 금액 사용
}

type RewardPolicyValue = RewardPolicyEntry | boolean | number;   // rich entry | legacy shorthand

interface LmsRewardPolicy {
  lessonComplete?: RewardPolicyValue;
  quizPass?: RewardPolicyValue;
  courseComplete?: RewardPolicyValue;
}

interface RewardPolicyMetadata {
  rewardPolicy?: LmsRewardPolicy | null;          // 운영자 승인/활성 — 지급의 단일 소스
  rewardPolicyProposal?: LmsRewardPolicy | null;  // 강사 제안 — 지급 비대상(후속 UI 용)
}
```

> WO §5 예시는 snake_case 이벤트 키(`lesson_complete`)였으나, 기존 저장 키·CHECK·소비처가 camelCase(`lessonComplete`)를 사용하므로 **저장 키는 camelCase 유지**(의미 동일). snake_case 는 런타임 `RewardEvent`(referenceKey) 식별자로만 사용.

## 4. event type 목록

| RewardEvent (런타임) | 저장 키 | default 금액(CREDIT_REWARDS, 불변) | 설정 위치 |
|---|---|---|---|
| `lesson_complete` | `lessonComplete` | 10 | Lesson.metadata(우선) → Course.metadata |
| `quiz_pass` | `quizPass` | 20 | Quiz.metadata(우선) → Course.metadata |
| `course_complete` | `courseComplete` | 50 | Course.metadata |

## 5. Course / Lesson / Quiz metadata 기준 & 우선순위

- **Course.metadata.rewardPolicy** — `courseComplete` 단일 소스. `lessonComplete`/`quizPass` 의 course-level 기본 정책도 지정 가능.
- **Lesson.metadata.rewardPolicy** — `lessonComplete` 에 한해 course 보다 우선.
- **Quiz.metadata.rewardPolicy** — `quizPass` 에 한해 우선.
- **우선순위 결정(고정):** finer level(lesson/quiz)의 **지급 가능 금액(>0)** 이 있으면 사용, 없으면 course 로 fall-through. `course_complete` 는 course metadata 만 사용.
- **한계(문서화):** finer level 의 명시적 비활성으로 course-level default 를 **억제(suppress)하는 동작은 V1 미지원** — unset/disabled/invalid 는 모두 "지급 0 → course fall-through" 로 동일 취급. 레슨별 예외 억제는 후속 UI WO 설계 시 재검토(현재 rewardPolicy 설정 데이터 0건이므로 호환 부담 없음).
- **Quiz metadata 쓰기 경로 부재(문서화):** `QuizService.updateQuiz` 의 타입 시그니처에 `metadata` 없음 → quiz-level `quizPass` 정책의 정식 쓰기 경로는 아직 없음. 현재 `quizPass` 는 Course.metadata 경유로만 설정 가능. (방어적 merge 는 적용 — §7 참조.) 정식 quiz-level 쓰기는 후속 UI WO 에서 추가.

## 6. enabled / amount / useDefaultAmount 의미 + default 사용 조건 + invalid 처리

단일 기준 함수 `normalizeRewardEntry(value, defaultAmount): NormalizedReward` 가 모든 해석을 담당(지급 로직·UI·validation 공용).

`NormalizedReward = { state: 'unset' | 'disabled' | 'invalid'; reason } | { state: 'amount'; amount }`

| 입력 | 결과 | 지급 |
|---|---|---|
| 없음 (absent / null) | `unset` | 미지급 |
| `false` / `{ enabled: false }` | `disabled` | 미지급 |
| `{ enabled: true, amount: n }` (n 정수>0) | `amount: n` | 지정 금액 |
| `n` (legacy number, 정수>0) | `amount: n` | 지정 금액 |
| `{ enabled: true, useDefaultAmount: true }` (amount 없음) | `amount: default` | 기본 금액 |
| `true` (legacy shorthand) | `amount: default` | 기본 금액 (= useDefaultAmount 해석) |
| `{ enabled: true }` (amount·useDefaultAmount 둘 다 없음) | `disabled` | **보수적 미지급** |
| `0` / `{ enabled: true, amount: 0 }` | `unset` / `disabled` | 미지급 |
| `amount < 0` / 비정수 / 숫자 아님 / 알 수 없는 형태 | `invalid` | 미지급 + `logger.warn` |

**default 금액 사용 조건(고정):** 정책이 default 사용을 켠 경우(`useDefaultAmount=true` 또는 legacy `true`)에만 fallback. `enabled=true` 만으로는 default 자동 사용 안 함. `amount` 가 있으면 `amount` 우선. **기존 10/20/50 금액 자체는 변경 없음.**

## 7. legacy shape 처리 기준

기존 도입 WO 의 `boolean | number` shorthand 를 backward-compatible 하게 parser 에서 흡수(migration 없음):

- `true` → `useDefaultAmount=true` 로 해석 → 기본 금액 (직전 WO 의 shipped 동작과 동일 → 무행동 변화)
- `number(정수>0)` → 지정 금액, `0` → 미지급, 음수/비정수 → invalid(미지급+warn)
- `false` → disabled

현재 운영 DB 에 rewardPolicy 설정 데이터 0건(직전 CHECK L1)이므로 legacy 데이터 호환 부담 없음. 선택 결과: **legacy `true` = 기본 금액**(invalid 처리 아님).

## 8. 강사 제안 / 운영자 승인 구조 — 후속 설계 메모

- `metadata.rewardPolicy` = 운영자 승인/활성 정책 → **지급의 단일 소스**(`resolveRewardAmount` 가 사용).
- `metadata.rewardPolicyProposal` = 강사 제안 → 운영자 승인 UI 입력. **지급 로직 미사용**(예산 통제).
- 흐름: 강사는 `rewardPolicyProposal` 제안 → 운영자가 검토·수정 후 `rewardPolicy` 로 승인/활성화 → 사용자는 활성 정책만 영향. 지급은 활성 `rewardPolicy` 만 반영.
- 본 WO 에서 두 UI 모두 미구현 — 타입(`RewardPolicyMetadata`)·문서·normalizer 기준만 남겨 후속 UI 가 동일 계약을 사용하도록 함.

## 9. DTO / validation 보강 결과

- **조사:** `UpdateCourseDto` / `UpdateLessonDto` 는 `metadata?: Record<string, any>` 노출. `updateQuiz` 는 metadata 미노출이나 controller 가 `req.body` raw 전달.
- **유실 위험 실증:** `CourseService.updateCourse` / `LessonService.updateLesson` / `QuizService.updateQuiz` 모두 `Object.assign(entity, data)` → 클라이언트가 부분 `metadata` 를 보내면 기존 `rewardPolicy` 가 **통째로 덮어써짐**.
- **보강(최소):** 세 update 메서드에 metadata **shallow merge** 적용 — `data.metadata !== undefined` 일 때 `{ ...(existing ?? {}), ...incoming }` 로 병합 후 재할당. 기존 키(rewardPolicy/rewardPolicyProposal 포함 모든 unknown 키) 보존, 명시적으로 보낸 키만 갱신.
- **strict nested DTO validation 은 deferred:** rewardPolicy 를 쓰는 UI 가 아직 없고, `normalizeRewardEntry` 가 런타임에 어떤 shape 든 방어적으로 해석(invalid → 미지급+warn)하므로 안전. class-validator nested 스키마는 후속 강사/운영자 UI WO 에서 입력 검증과 함께 도입 권장.

## 10. metadata 유실 방지 확인

| 경로 | 변경 | 효과 |
|---|---|---|
| `CourseService.updateCourse` | `Object.assign` 전 metadata shallow merge | course.metadata.rewardPolicy 보존 |
| `LessonService.updateLesson` | 동일 | lesson.metadata.rewardPolicy 보존 |
| `QuizService.updateQuiz` | 동일(방어적, `(data as {metadata?}).metadata` 캐스트) | quiz.metadata.rewardPolicy 보존 |

부분 metadata 업데이트(예: 상태만 변경 + metadata 일부 동봉)에서 rewardPolicy/rewardPolicyProposal 유실 위험 제거.

## 11. RewardPolicyService 정비 결과

- 정식 타입 export: `RewardEvent`, `RewardPolicyEventKey`, `RewardPolicyEntry`, `RewardPolicyValue`, `LmsRewardPolicy`, `LmsRewardPolicyProposal`, `RewardPolicyMetadata`, `NormalizedReward`, `RewardGrantOutcome`.
- `normalizeRewardEntry(value, defaultAmount)` 신규 export — 단일 해석 기준.
- `resolveRewardAmount(event, ctx)` — 시그니처 불변(number 반환). 내부적으로 `normalizeRewardEntry` 사용 + invalid warn. 이벤트별 우선순위 유지.
- `grantRewardIfConfigured(params)` — 시그니처 불변(boolean 반환, 호출처 무변경). 내부적으로 `grantRewardWithOutcome` 위임.
- `grantRewardWithOutcome(params)` 신규 export — `'granted' | 'not-configured' | 'duplicate' | 'failed'` 결과를 호출자에게 명확히 전달(분기 필요 시 사용). 미설정/실패는 throw 없이 false/outcome 으로 — completion rollback 방지 유지.
- 호출처(`QuizService` / `AssignmentService` / `EnrollmentService`) 코드 변경 없음(기존 `resolveRewardAmount`+`grantRewardIfConfigured` 시그니처 호환).

## 12. 직접 grantPoint 경로 없음 확인

- LMS 모듈 내 `PointService.grantPoint` 직접 호출 **0건** — `RewardPolicyService.ts` 헬퍼 내부 1곳만(grep). QuizService 의 다른 매치는 주석.
- 3경로(quiz/assignment/video·article) 전부 `resolveRewardAmount` + `grantRewardIfConfigured` 게이트 경유 유지.

## 13. Neture 제외 확인

- **Neture 파일 미수정** (본 WO 변경: api-server LMS 4파일 + CHECK 1).
  - git tree 의 `services/web-neture/.../ForumWritePage.tsx` 변경은 **타 세션 forum 공통화 작업**(최근 커밋 `8ac1cd8a`/`a1c5df4a` 계열) — 본 LMS WO 와 무관, 미접촉·미스테이징.
- Neture LMS 메뉴 없음 / 라우트 없음 / rewardPolicy UI 없음 / 공통 소비처 없음.
- Neture 는 공급자/파트너/운영 기반 서비스 — 강의 수강·rewardPolicy 적용 대상 아님.
- LMS 공통화 대상 = KPA-Society / GlycoPharm / K-Cosmetics. Neture 제외.

## 14. 검증 결과

- **TypeScript:** `apps/api-server` **0 errors** (`tsc --noEmit` 종료 코드 0).
- **frontend:** web-kpa-society 변경 없음 → typecheck 불요. (reward 문구: `LmsLessonPage` 의 `(+${credits} 크레딧)` 는 backend 가 실제 지급한 동적값만 표시 — 고정 지급 약속 아님. 직전 WO 가 "+50 크레딧" 고정 문구 이미 제거. 충돌 없음.)
- **정적 계약 검증(`normalizeRewardEntry` 기준):**
  - rewardPolicy 없음 → 미지급 ✅
  - `enabled=false` / `false` → 미지급 ✅
  - `amount=0` / `0` → 미지급 ✅
  - invalid amount(음수/비정수) → 미지급 + warn ✅
  - `enabled=true` + amount 지정 → 지정 금액 ✅
  - `enabled=true` + `useDefaultAmount=true` → default 금액 ✅
  - legacy `true` → default 금액 ✅, legacy `number>0` → 지정 금액 ✅
  - unknown event key → `LmsRewardPolicy` 타입 외 키는 resolve 대상 아님 ✅
  - `enabled=true` + amount/default 둘 다 없음 → 보수적 미지급 ✅
  - reward 실패(throw) → warn 후 false, completion rollback 없음 ✅
  - referenceKey dedup(`{event}:{userId}:{id}`) 무변경 ✅
  - metadata partial update 에서 rewardPolicy 유실 위험 제거(3 경로 merge) ✅
- **grep:** `RewardPolicyService` / `rewardPolicy` / `lesson_complete` / `quiz_pass` / `course_complete` / `useDefaultAmount` / `referenceKey` / `grantPoint` / `metadata` 확인 완료. LMS 직접 grantPoint 0(헬퍼 경유).
- **browser smoke:** 미수행 — contract/backend 중심, 실데이터 write 회피(WO §9 원칙). 배포 후 dev/staging 에서 rewardPolicy 설정·미설정 강의의 지급·미지급, partial metadata update 후 rewardPolicy 보존 확인 권장.

## 15. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/lms/services/RewardPolicyService.ts` | 정식 계약 타입 + `normalizeRewardEntry` + `grantRewardWithOutcome` 추가, resolve/grant 내부 정비(시그니처 불변) |
| `apps/api-server/src/modules/lms/services/CourseService.ts` | `updateCourse` metadata shallow merge(rewardPolicy 보존) |
| `apps/api-server/src/modules/lms/services/LessonService.ts` | `updateLesson` metadata shallow merge |
| `apps/api-server/src/modules/lms/services/QuizService.ts` | `updateQuiz` metadata shallow merge(방어적) |
| `docs/checks/CHECK-O4O-LMS-REWARD-POLICY-CONTRACT-STABILIZE-V1.md` | 본 문서(신규) |

**무변경:** DB/migration/schema, jsonb 컬럼 구조, credit-constants 금액, referenceKey 규칙, OrderType.LMS/price/isPaid, payment/checkout/order, reward 설정 UI(강사/운영자), 공통 UI 패키지, GP/KCos/Neture.

## 16. 남은 후속 작업

| ID | 내용 |
|----|------|
| L1 | **quiz-level `quizPass` 정식 쓰기 경로 부재** — `updateQuiz` 가 metadata 미노출. 현재 quiz_pass 는 course metadata 경유. → 후속 UI WO 에서 quiz metadata 쓰기 + DTO 추가 |
| L2 | **finer-level suppress 미지원** — 레슨별 course default 억제 불가(§5 한계). UI 설계 시 재검토 |
| L3 | **strict nested DTO validation deferred** — 입력 UI 도입 시 class-validator nested 스키마 추가(§9) |
| L4 | **frontend 공유 타입** — 현재 backend 내부 타입. 강사/운영자 UI 도입 시 `@o4o/lms-core` 또는 shared 패키지로 추출 검토(현 단계 추출 보류 — UI 부재) |

### 제안 후속 WO

1. **`WO-O4O-KPA-LMS-INSTRUCTOR-REWARD-POLICY-PROPOSAL-UI-V1`** — 강사가 강의/퀴즈/수료 reward 를 제안(`rewardPolicyProposal`)하는 UI.
2. **`WO-O4O-KPA-LMS-OPERATOR-REWARD-POLICY-APPROVAL-UI-V1`** — 운영자가 제안을 승인/수정/비활성화(`rewardPolicy`)하는 UI.
3. **`IR-O4O-LMS-SERVICE-COMMONIZATION-BOUNDARY-V1`** — rewardPolicy 계약 안정화 후 LMS 공통화 경계 조사.
4. **`WO-O4O-LMS-COMMON-UI-EXTRACTION-V1`** — CourseCard/CourseList/CourseDetail/LessonPlayer/QuizPanel 공통 UI 추출.
5. **`WO-O4O-LMS-GLYCOPHARM-KCOSMETICS-ADOPTION-V1`** — GP/KCos 적용.
6. **`CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`** — Neture 제외 최종 확인.

## 17. 완료 판정

**PASS.** rewardPolicy 정식 계약(rich entry + legacy 호환) 고정, 단일 `normalizeRewardEntry` 로 의미 확정(invalid→미지급+warn), metadata partial update 유실 방지(Course/Lesson/Quiz merge), 강사 제안/운영자 승인 metadata 구조 타입·문서 기반 마련. 지급 로직·금액·referenceKey·DB 무변경, 호출처 시그니처 호환, Neture/GP/KCos 무변경, api-server typecheck 0. reward 설정 UI 는 후속 WO 로 분리.

---

## 최종 보고 요약

- **WO:** WO-O4O-LMS-REWARD-POLICY-CONTRACT-STABILIZE-V1 (KPA-Society 한정, backend·contract)
- **원칙:** 리워드 무조건 지급 아님 — 설정 시에만. completion ↔ reward 분리 유지. 계약 안정화(확대·금액변경·UI 아님).
- **변경:** api-server LMS 4파일(RewardPolicyService/CourseService/LessonService/QuizService) + CHECK 1.
- **계약:** camelCase 저장 키 유지 + `RewardPolicyValue = RewardPolicyEntry{enabled,amount?,useDefaultAmount?} | boolean | number`. `rewardPolicy`(운영자 활성·지급 소스) vs `rewardPolicyProposal`(강사 제안·비지급) 분리 타입.
- **normalizer:** `normalizeRewardEntry` 단일 기준 — unset/disabled/invalid/amount. invalid → 미지급+warn. default 는 useDefaultAmount/legacy true 일 때만.
- **유실 방지:** Course/Lesson/Quiz update metadata shallow merge.
- **검증:** api-server typecheck 0, LMS 직접 grantPoint 0(헬퍼 경유), 정적 계약 PASS. browser smoke 미수행(WO 원칙).
- **Neture:** 미수정·제외 명문화(tree 의 web-neture forum 변경은 타 세션, 미접촉).
- **커밋:** `feat(lms): stabilize reward policy contract`
