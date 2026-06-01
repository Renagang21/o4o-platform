# 강의 / 마케팅 콘텐츠 보상 정책 v1

> **IR-O4O-MARKETING-CONTENT-REWARD-POLICY-V1**
> 제정: 2026-04-16
> 상태: Active

이 문서는 O4O Platform KPA Society LMS의 마케팅 콘텐츠 보상 운영 정책을 정의한다.  
코드 레벨 정책 주석과 이 문서는 동일한 내용을 공유한다.

---

## 1. 재참여 정책

### 허용

다음 상태의 참여자는 동일 콘텐츠에 재참여할 수 있다.

- `CANCELLED`
- `REJECTED`
- `EXPIRED`

재참여 시 진도율, 완료 레슨, completedLessonIds는 초기화된다.

### 차단

`COMPLETED` 상태의 참여자는 동일 콘텐츠에 재참여할 수 없다.

**근거:** 재완료 시 보상 재지급 또는 수료증 재발급 등의 정책적 혼선을 방지한다.

**코드 위치:**  
`apps/api-server/src/modules/lms/services/EnrollmentService.ts` — `enrollCourse()` 내 `terminalStatuses` 배열

---

## 2. 보상 지급 정책

### 지급 조건

- 콘텐츠 내 모든 레슨을 완료하면 자동으로 보상(Credit)이 지급된다.
- 지급 단위: 동일 사용자(`userId`) + 동일 콘텐츠(`courseId`) 기준 **1회**

### 중복 방지

- `referenceKey = course_complete:{userId}:{courseId}` UNIQUE 제약으로 DB 레벨에서 중복 지급을 방지한다.
- 재참여 후 재완료가 발생하더라도 동일 `referenceKey`가 이미 존재하면 보상을 지급하지 않는다.
- `CreditService.earnCredit()` 내부에서 dedup 체크 후 `null` 반환 (지급 없음).

**코드 위치:**

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/lms/services/QuizService.ts` | course_complete 이벤트 감지 + earnCredit() 호출 |
| `apps/api-server/src/modules/credit/services/CreditService.ts` | referenceKey dedup 체크 |
| `packages/lms-core/src/entities/CreditTransaction.ts` | `referenceKey UNIQUE` DB 제약 |

### 보상 금액

`apps/api-server/src/modules/lms/constants/credit-constants.ts` 정의:

| 이벤트 | 금액 |
|--------|------|
| LESSON_COMPLETE | 10 Credit |
| QUIZ_PASS | 20 Credit |
| COURSE_COMPLETE | 50 Credit |

---

## 3. 수료증 발급 정책

- 수료증은 동일 `userId + courseId` 기준 1회만 발급한다.
- 콘텐츠 완료(COMPLETED) 시 `CompletionService.createCompletion()`에서 자동 발급된다.
- 재참여 후 재완료가 발생하더라도 이미 발급된 수료증은 재발급하지 않는다.
  - `CertificateService.issueCertificate()` 내부 dedup 체크에서 throw → CompletionService에서 catch/warn 처리.

**코드 위치:**

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/lms/services/CompletionService.ts` | dedup 체크 + 자동 발급 호출 |
| `apps/api-server/src/modules/lms/services/CertificateService.ts` | 발급 전 중복 확인 |

---

## 4. 수동 보상 정책

**현재 단계에서 운영자 수동 보상 기능을 지원하지 않는다.**

- 수동 보상 관련 엔드포인트 / 로직 추가 금지
- 향후 도입 시 다음을 포함한 별도 WO가 필요하다:
  - 운영자 승인 절차
  - 사유 기록 필드
  - 감사 로그(Audit Log) 연동

---

## 5. 영향 범위

이 정책이 적용되는 엔티티 및 서비스:

| 레이어 | 파일 |
|--------|------|
| Enrollment | `EnrollmentService.ts` |
| Completion | `CompletionService.ts` |
| Certificate | `CertificateService.ts` |
| Credit | `CreditService.ts`, `CreditTransaction` entity |

---

## 6. 정책 변경 규칙

1. 본 정책 변경 시 반드시 **IR → 합의 → WO** 순서로 진행한다.
2. 코드 직접 수정으로 정책을 우회하지 않는다.
3. 변경 시 이 문서와 코드 내 정책 주석을 동시에 업데이트한다.
4. 변경 이력은 git commit message에 IR/WO 번호로 기록한다.

---

*정책 제정: 2026-04-16*  
*기준 IR: IR-O4O-MARKETING-CONTENT-REWARD-POLICY-V1*
