# IR-O4O-GLYCOPHARM-LMS-CERTIFICATE-GUARD-CHECK-V1

> **조사 유형:** Backend Guard / API 지원 확인
> **목적:** GlycoPharm LMS Phase 2 (Learner/MyPage) 진입 전 Backend 지원 여부 검증
> **날짜:** 2026-05-26
> **결론 선언:** Phase 2 진입 가능. Certificate guard 이슈는 Phase 2 범위(MyPage 읽기)에 영향 없음.

---

## 1. Certificate Guard 조사 결과

### CertificateController 엔드포인트별 Guard 전체 표

| 엔드포인트 | Guard | GlycoPharm 접근 | Phase 2 관련 여부 |
|----------|-------|:--------------:|:-----------------:|
| `POST /lms/certificates/issue` | requireAuth + **requireKpaAdmin** | ❌ 불가 | ⚠️ 수동 발급 (Phase 2 불필요) |
| `GET /lms/certificates/me` | requireAuth | ✅ 가능 | ✅ MyPage 핵심 |
| `GET /lms/certificates/:id` | requireAuth | ✅ 가능 | ✅ 수료증 상세 |
| `GET /lms/certificates/:id/pdf` | requireAuth (+ userId 검증) | ✅ 가능 (본인만) | ✅ PDF 다운로드 |
| `GET /lms/certificates/verify/:code` | 없음 (공개) | ✅ 가능 | 후순위 |
| `GET /lms/certificates/:id/verify` | 없음 (공개) | ✅ 가능 | 후순위 |
| `PATCH /lms/certificates/:id` | requireAuth + **requireKpaAdmin** | ❌ 불가 | Phase 2 불필요 |
| `POST /lms/certificates/:id/revoke` | requireAuth + **requireKpaAdmin** | ❌ 불가 | Phase 2 불필요 |

### requireKpaAdmin 이슈 상세 분석

**`requireKpaAdmin`이 막는 것:** 수료증 수동 발급(`POST /issue`), 수정, 취소, 갱신

**Phase 2에서 필요한 것:** 수료증 목록 읽기(`GET /me`), PDF 다운로드(`GET /:id/pdf`)

**판정: 충돌 없음.**

> `requireKpaAdmin`은 관리자가 수동으로 수료증을 발급/수정/취소하는 행위에만 적용된다.
> GlycoPharm Phase 2(MyPage에서 본인 수료증 조회)는 `GET /certificates/me` (requireAuth만)로 충분하다.

### 자동 수료증 발급 흐름

수료증은 HTTP 라우트의 guard와 무관하게 **서버 내부에서 자동 발급**된다:

```
레슨 완료 → POST /lms/enrollments/:courseId/progress
→ EnrollmentController.updateLessonProgress()
→ CompletionService.createCompletion()  ← 내부 호출 (HTTP guard 미적용)
→ CertificateService.issueCertificate() ← 내부 호출 (HTTP guard 미적용)
→ PointService → COURSE_COMPLETE (50 포인트 자동 지급)
```

`CertificateService.issueCertificate()` 서비스 메서드 자체에는 KPA 전용 조건 없음. `requireKpaAdmin`은 HTTP 라우트 레벨 guard에만 존재하며, 내부 서비스 호출 경로는 무관하다.

**결론: GlycoPharm 강의를 완료하면 수료증이 자동 발급된다. Frontend에서 수동 발급 API를 호출할 필요가 없다.**

---

## 2. Enrollment API 지원 여부

모든 Enrollment 엔드포인트는 `requireAuth`만 요구하며 서비스 제한 없음.

| 엔드포인트 | Guard | GlycoPharm 접근 | Phase 2 용도 |
|----------|-------|:--------------:|-------------|
| `GET /lms/enrollments/me` | requireAuth | ✅ | MyEnrollmentsPage 핵심 |
| `GET /lms/enrollments/me/course/:courseId` | requireAuth | ✅ | 수강 상태 확인 |
| `POST /lms/courses/:courseId/enroll` | requireAuth | ✅ | 수강 신청 |
| `PATCH /lms/enrollments/:id` | requireAuth | ✅ | 수강 상태 업데이트 |
| `POST /lms/enrollments/:id/start` | requireAuth | ✅ | 수강 시작 |
| `POST /lms/enrollments/:id/complete` | requireAuth | ✅ | 수강 완료 |
| `POST /lms/enrollments/:id/cancel` | requireAuth | ✅ | 수강 취소 |
| `POST /lms/enrollments/:courseId/progress` | requireAuth | ✅ | 레슨 진도 업데이트 |

**requiresApproval 강의 처리:**
- `requiresApproval=true` 강의 등록 → `PENDING` 상태로 생성 → 강사 승인 대기
- `requiresApproval=false` 강의 등록 → `IN_PROGRESS` 직접 진행
- GlycoPharm 강의 모두 동일하게 처리됨 (serviceKey 기반 분기 없음)

**결론: Class A. Frontend만 구현하면 된다.**

---

## 3. Credits / Points API 지원 여부

| 엔드포인트 | Guard | GlycoPharm 접근 | Phase 2 용도 |
|----------|-------|:--------------:|-------------|
| `GET /api/v1/credits/me` | requireAuth | ✅ | MyCreditsPage 핵심 |
| `GET /api/v1/credits/me/transactions` | requireAuth | ✅ | 크레딧 거래 내역 |

**자동 크레딧 지급:**

```
LESSON_COMPLETE  → 레슨 1개 완료 시   10 포인트 자동 지급
QUIZ_PASS        → 퀴즈 통과 시       20 포인트 자동 지급
COURSE_COMPLETE  → 강의 전체 완료 시  50 포인트 자동 지급
```

DB UNIQUE 제약으로 재완료 시 중복 지급 없음. serviceKey 기반 서비스별 예산 관리 지원 (WO-O4O-LMS-SERVICEKEY-CONTEXT-V1 완료).

**KPA 전용 `/api/v1/kpa/credits/*` 는 사용 불가이나, GlycoPharm은 공통 `/api/v1/credits/me`로 동일 데이터 조회 가능.**

**결론: Class A. Frontend만 구현하면 된다.**

---

## 4. GlycoPharm Phase 2 가능 여부 — 전체 API 경로 검증

| Phase 2 기능 | 필요 API 경로 | 존재 | Guard | GlycoPharm | 판정 |
|-------------|-------------|:----:|-------|:----------:|------|
| 레슨 플레이어 | `GET /lms/lessons/:lessonId` | ✅ | requireAuth (requireEnrollment) | ✅ | **A** |
| 수강 내역 목록 | `GET /lms/enrollments/me` | ✅ | requireAuth | ✅ | **A** |
| 수강 상태 확인 | `GET /lms/enrollments/me/course/:courseId` | ✅ | requireAuth | ✅ | **A** |
| 수강 신청 | `POST /lms/courses/:courseId/enroll` | ✅ | requireAuth | ✅ | **A** |
| 수강 취소 | `POST /lms/enrollments/:id/cancel` | ✅ | requireAuth | ✅ | **A** |
| 레슨 진도 업데이트 | `POST /lms/enrollments/:courseId/progress` | ✅ | requireAuth | ✅ | **A** |
| 수료증 목록 | `GET /lms/certificates/me` | ✅ | requireAuth | ✅ | **A** |
| 수료증 PDF | `GET /lms/certificates/:id/pdf` | ✅ | requireAuth | ✅ | **A** |
| 수료증 자동발급 | 내부 CompletionService | ✅ | 내부 호출 | ✅ | **A** |
| 크레딧 잔액 | `GET /api/v1/credits/me` | ✅ | requireAuth | ✅ | **A** |
| 크레딧 거래내역 | `GET /api/v1/credits/me/transactions` | ✅ | requireAuth | ✅ | **A** |
| 강의 상세 | `GET /lms/courses/:id` | ✅ | optionalAuth | ✅ | **A** |
| 비로그인 제어 | Course.visibility=members 처리 | ✅ | MEMBERS_ONLY 에러 코드 | ✅ | **A** |

**전체 판정: 모두 Class A. Backend 수정 불필요.**

---

## 5. Backend 수정 필요 여부

**Phase 2 진입 기준: 불필요.**

| 항목 | 상태 | 판단 |
|------|------|------|
| 수료증 읽기 guard | requireAuth | 수정 불필요 |
| 수료증 자동발급 | 내부 CompletionService | 수정 불필요 |
| Enrollment 전체 | requireAuth | 수정 불필요 |
| Credits | requireAuth (공통 경로) | 수정 불필요 |
| 레슨 플레이어 | requireAuth + requireEnrollment | 수정 불필요 |
| `POST /certificates/issue` requireKpaAdmin | Phase 2 불필요 | **Phase 2 비관련** |

### 참고: requireKpaAdmin 이슈가 미래에 미치는 영향

`POST /lms/certificates/issue` (수동 발급) 엔드포인트는 현재 `requireKpaAdmin` 전용이다.

**Phase 2에서 필요 없는 이유:**
- Phase 2는 수료증을 MyPage에서 읽기만 한다.
- 수료증 발급은 서버 내부에서 자동 처리된다.

**향후 GlycoPharm admin이 수동으로 수료증을 발급해야 할 경우 (Phase 4+):**
- `requireLmsOperator` 또는 `glycopharm:admin` 조건 추가가 필요하다.
- 분류: **Class B** (Backend API는 있으나 guard 경미 수정 필요).
- Phase 2 진입에는 영향 없음.

---

## 6. 후속 WO 제안

### Phase 2 즉시 진행 가능

**WO-O4O-GLYCOPHARM-LMS-PHASE2-LEARNER-FRONTEND-V1**

범위:
- `LmsLessonPage.tsx` 추가 (레슨 플레이어) — Route `/lms/course/:cId/lesson/:lId`
- `MyEnrollmentsPage.tsx` 추가 — Route `/mypage/enrollments`
- `MyCertificatesPage.tsx` 추가 — Route `/mypage/certificates`
- `MyCreditsPage.tsx` 추가 — Route `/mypage/credits`
- `src/api/lms.ts` 보강:
  - `getMyEnrollments()` 추가 (K-Cosmetics 패턴)
  - `cancelEnrollment()` 추가
  - `getMyCertificates()` 보강
  - `getLesson()` 추가 (레슨 플레이어용)
- Legacy route `/lms/:id` redirect 제거
- App.tsx MyPage route 4개 추가

Backend 선행 조건: **없음**

예상 공수: 3-4일

---

### 별도 추적 항목 (Phase 2 비차단)

**WO-O4O-LMS-CERTIFICATE-MANUAL-ISSUE-SERVICEKEY-FIX-V1** (Phase 4+ 이후 검토)

- 대상: `POST /lms/certificates/issue` guard에 `glycopharm:admin` 조건 추가
- 현재 `requireKpaAdmin` → `requireKpaAdmin || requireGlycopharmAdmin` 형태
- Phase 2 완료 후 Instructor Phase에서 수동 발급 기능이 필요할 때 작업

---

## 결론

```
GlycoPharm LMS Phase 2 진입 조건:
✅ 모든 필요 API 공통 경로 존재
✅ 모두 requireAuth만 필요 (서비스 제한 없음)
✅ 수료증 자동발급 내부 서비스 경로 정상 작동
✅ Credits API 공통 경로 사용 가능
❌ POST /certificates/issue requireKpaAdmin → Phase 2 비관련 (MyPage 읽기에 불필요)

판정: Class A 전량. Backend 수정 없이 Phase 2 진입 가능.
```

*조사 완료: 2026-05-26*
