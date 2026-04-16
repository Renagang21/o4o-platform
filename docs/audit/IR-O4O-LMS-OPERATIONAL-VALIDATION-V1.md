# IR-O4O-LMS-OPERATIONAL-VALIDATION-V1

---

## 1. 전체 판정

```
IR-O4O-LMS-OPERATIONAL-VALIDATION-V1 — PARTIAL PASS
Critical(P0) 결함 없음. P1 결함 2건 발견.
즉시 운영 중단 수준은 아니나, 데이터 무결성 보완 후 완전한 Production Ready 확정 권장.
```

- 분석 방법: 코드 정적 분석 (API 호출 없음)
- 분석 일자: 2026-04-16
- 분석 대상: `apps/api-server/src/modules/lms/` 전체 + `packages/education-extension/src/entities/`

---

## 2. 시나리오별 결과 (S1~S8)

| 시나리오 | 내용 | 결과 |
|----------|------|------|
| S1 | 강의 생성 → 레슨 등록 → 저장 | PASS |
| S2 | 수강 신청 → Enrollment 생성 | PASS |
| S3 | 레슨 학습 → 진도 반영 | PASS (단, totalLessons 동기화 이슈 있음 → 4번 참조) |
| S4 | 퀴즈 제출 → 합격 판정 | PASS |
| S5 | 모든 레슨 완료 → Enrollment COMPLETED 전환 | PASS |
| S6 | Credit 적립 | PASS |
| S7 | Completion 생성 | PASS |
| S8 | Certificate 발급 | PASS |

---

## 3. Critical 검증 결과

| 항목 | 결과 | 근거 |
|------|------|------|
| Credit 중복 방지 | PASS | `CreditService.earnCredit()` — referenceKey UNIQUE 체크 + DB 제약. 퀴즈/레슨/코스 완료 각각 고유 key 사용 |
| Completion 중복 방지 | PASS | `CompletionService.createCompletion()` — (userId, courseId) 조합 조회 후 기존 존재 시 null 반환. DB `@Unique(['userId', 'courseId'])` 이중 방어 |
| Certificate 중복 방지 | PASS | `CertificateService.issueCertificate()` — (userId, courseId) 기존 조회 + 예외 발생. DB `@Unique(['userId', 'courseId'])` + `@Unique(['certificateNumber'])` |
| 퀴즈 재응시 Credit 중복 | PASS | referenceKey `quiz_pass:{userId}:{quizId}` 고정 → 재응시 통과 시에도 CreditService가 차단 |
| 권한 제어 (미인증) | PASS | `requireAuth` → 미인증 401. `requireInstructor` → lms:instructor 없으면 403 |
| 권한 제어 (타인 접근) | PASS | `getMyEnrollmentForCourse`, `updateLessonProgress` 모두 userId 일치 확인 후 처리 |

---

## 4. 발견된 문제

### 문제 1 — 진도 업데이트 totalLessons 동기화 부재

- **현상**: `EnrollmentController.updateLessonProgress` (라인 221)에서 `totalLessons = enrollment.totalLessons || 1` 로 기존 저장값을 그대로 사용
- **원인**: 강의 공개/비공개 레슨 변경 또는 레슨 추가 시 Enrollment의 totalLessons가 갱신되지 않음. 최초 `enrollCourse()` 시점의 값이 고정됨
- **영향**: progressPercentage 계산 왜곡 → 완료 판정 오류 가능. 예: 레슨 5개 코스에서 4개 완료 시 progressPercentage가 80이 아닌 다른 값으로 계산될 수 있음
- **파일**: `apps/api-server/src/modules/lms/controllers/EnrollmentController.ts`
- **우선순위**: **P1**

---

### 문제 2 — 재등록 시 metadata.completedLessonIds 미초기화

- **현상**: `EnrollmentService.enrollCourse()` 의 재활성화 로직(라인 74~80)이 `completedLessons`, `progressPercentage`, `completedAt` 를 초기화하지만, `metadata.completedLessonIds` 배열은 초기화하지 않음
- **원인**: WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1 에서 completedLessonIds를 metadata에 추가했으나, 재등록 시 초기화 코드가 해당 필드를 포함하지 않음
- **영향**: CANCELLED → 재등록 후 이전에 완료했던 레슨들이 "이미 완료됨"으로 표시됨. `isCompleted` 체크가 오작동하여 완료 버튼이 보이지 않을 수 있음
- **파일**: `apps/api-server/src/modules/lms/services/EnrollmentService.ts` (라인 74~80)
- **우선순위**: **P1**

---

## 5. 결론

| 항목 | 판정 |
|------|------|
| Production Ready 유지 | ✅ 유지 (Critical 결함 없음) |
| 즉시 수정 필요 | ✅ P1 2건 — 운영 전 수정 권장 |
| 추가 WO 필요 | ✅ WO-O4O-LMS-INTEGRITY-PATCH-V1 작성 권장 |

### 수정 방향 (WO 범위 예고)

**문제 1 수정**: `updateLessonProgress`에서 DB에서 최신 레슨 수를 동적 조회하여 totalLessons 갱신
```
// 현재
const totalLessons = enrollment.totalLessons || 1;

// 수정 방향
const totalLessons = await lessonRepository.count({ where: { courseId, isPublished: true } });
```

**문제 2 수정**: `EnrollmentService.enrollCourse()` 재활성화 블록에 metadata 초기화 추가
```
// 추가 필요
existing.metadata = { ...(existing.metadata || {}), completedLessonIds: [] };
```

---

## 6. Final Freeze Statement

이 IR은 LMS 운영 검증 1차 기준 보고서이며,  
P1 이슈 2건 해결 후 완전한 Production Ready 상태로 확정한다.  
이후 기능 확장은 본 IR 결과를 기준으로 진행하며,  
Core 구조 변경은 별도 IR + WO 승인 후 진행한다.

---

*Status: PARTIAL PASS → P1 수정 후 FULL PASS 예정*  
*Date: 2026-04-16*  
*Next: WO-O4O-LMS-INTEGRITY-PATCH-V1*
