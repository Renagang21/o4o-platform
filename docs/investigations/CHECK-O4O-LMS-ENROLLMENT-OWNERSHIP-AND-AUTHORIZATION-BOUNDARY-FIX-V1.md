# CHECK-O4O-LMS-ENROLLMENT-OWNERSHIP-AND-AUTHORIZATION-BOUNDARY-FIX-V1

- **WO**: `WO-O4O-LMS-ENROLLMENT-OWNERSHIP-AND-AUTHORIZATION-BOUNDARY-FIX-V1`
- **선행 WO**: `WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1`, `WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1`
- **작성일**: 2026-08-18
- **시작 commit**: `23fe9973d` (작업 중 origin/main 은 타 세션 커밋으로 `5ac121923` 까지 진행)
- **판정**: **PASS_WITH_RESIDUAL_RISK**

---

## 1. 목표

LMS 의 **같은 서비스 안 수평 권한(horizontal authorization)** 결함을 닫는다.
cross-service boundary 는 선행 WO 로 닫혔으나, 동일 서비스 안에서는 enrollment ID 만 알면
타 사용자의 enrollment 를 조회·변경할 수 있었다.

판정 순서: **service scope → enrollment ownership → mutation**

---

## 2. Enrollment endpoint 전수조사 (미조사 0)

### 2-1. generic 라우터 `/api/v1/lms/*` (`modules/lms/routes/lms.routes.ts`)

| method/path | consumer | 성격 | service scope | owner check (수정 전) | elevated check | mut/read | 현재 판정 |
|---|---|---|---|---|---|---|---|
| `POST /courses/:courseId/enroll` | KPA·KCos·GP 학습자 | user-facing | `guardCourseScope` | 본인 userId 로 생성 | 없음 | mutation | 기존 정상 |
| `GET /enrollments` | 프론트 소비처 0 | user-facing(광의) | `scope.scope` | **없음(전체 노출)** | 없음 | read | **READ_LEAK_FIXED** |
| `GET /enrollments/me` | KPA 마이페이지 | user-facing | `scope.scope` | `userId` 강제 | 없음 | read | 기존 정상 |
| `GET /enrollments/:id` | 프론트 소비처 0 | user-facing | scope 있음 | **없음** | 없음 | read | **READ_LEAK_FIXED** |
| `PATCH /enrollments/:id` | 프론트 소비처 0 | user-facing | scope 있음 | **없음** | 없음 | mutation | **MISSING_OWNER_CHECK_FIXED** |
| `POST /enrollments/:id/start` | 프론트 소비처 0 | user-facing | scope 있음 | **없음** | 없음 | mutation | **MISSING_OWNER_CHECK_FIXED** |
| `POST /enrollments/:id/complete` | 프론트 소비처 0 | user-facing | scope 있음 | **없음** | 없음 | mutation | **MISSING_OWNER_CHECK_FIXED** |
| `POST /enrollments/:id/cancel` | GlycoPharm(본인 수강취소) | user-facing | scope 있음 | **없음** | 없음 | mutation | **MISSING_OWNER_CHECK_FIXED** |
| `GET /enrollments/me/course/:courseId` | KPA·GP 강의 상세 | user-facing | `guardCourseScope` | `userId`+`courseId` 복합조회 | 없음 | read | 기존 정상 |
| `POST /enrollments/:courseId/progress` | KPA·KCos·GP 학습 | user-facing | `guardCourseScope` | `userId`+`courseId` 복합조회 | 없음 | mutation | 기존 정상 |

### 2-2. 관리 라우터 `/api/v1/lms/instructor/*` (`requireInstructor`)

| method/path | 성격 | 권한 근거 | mut/read | 판정 |
|---|---|---|---|---|
| `GET /instructor/enrollments` | MANAGEMENT | `requireInstructor` + `course.instructorId` / `kpa:admin` | read | 기존 정상 |
| `POST /instructor/enrollments/:id/approve` | MANAGEMENT | 동일 | mutation | 기존 정상 |
| `POST /instructor/enrollments/:id/reject` | MANAGEMENT | 동일 | mutation | 기존 정상 |
| `GET /instructor/participants/:courseId` (+`/summary`, `/export`) | MANAGEMENT | 동일 | read | 기존 정상 |

### 2-3. KPA remount `/api/v1/kpa/lms/*` (`routes/kpa/kpa.routes.ts`)

| method/path | 대응 handler | 판정 |
|---|---|---|
| `GET /enrollments` | `getMyEnrollments` (목록 아님) | 본인 한정 — 기존 정상 |
| `GET /enrollments/me` | `getMyEnrollments` | 기존 정상 |
| `GET /enrollments/me/course/:courseId` | `getMyEnrollmentForCourse` | 기존 정상 |
| `GET /enrollments/:courseId` | `getMyEnrollmentForCourse` | 기존 정상 |
| `POST /courses/:courseId/enroll` | `enrollCourse` | 기존 정상 |
| `POST /enrollments/:courseId/progress` | `updateLessonProgress` | 기존 정상 |

→ KPA remount 에는 `PATCH /:id`, `/start`, `/complete`, `/cancel` 자체가 **없다**. 결함 노출면은 generic 라우터였다.

**집계** — 조사 endpoint 20 / USER_OWNED_MUTATION 6 / MANAGEMENT_MUTATION 2 / MISSING_OWNER_CHECK_FIXED 4 / READ_LEAK_FIXED 2 / **미조사 0**

---

## 3. 수정 전 ownership 상태

- `Enrollment` 엔티티(`packages/education-extension/src/entities/Enrollment.ts`)는
  `lms_enrollments.userId uuid NOT NULL` + `@Unique(['userId','courseId'])` 를 이미 갖고 있다.
  → **ownership 근거는 이미 스키마에 존재**. migration 불필요.
- 그러나 controller 의 `ensureEnrollmentInScope` 는 **course.serviceKey 만** 확인했다.
  같은 서비스면 타인 enrollment 여도 통과 → mutation 실행.

---

## 4. canonical authorization 순서 (구현)

`apps/api-server/src/modules/lms/utils/lms-enrollment-owner-guard.ts` (신규)

```text
resolveOwnedEnrollmentOrRespond(req, res, id)
  1) 인증 확인                     → 401
  2) resolveScopeOrRespond         → 알 수 없는 serviceKey 400 (조회 이전)
  3) enrollment 로드               → 없으면 404
  4) guardLoadedCourseScope        → 타 서비스면 404   ← service boundary 우선
  5) enrollment.userId === 요청자  → 아니면 404        ← ownership
  6) 통과한 enrollment 반환 → mutation
```

- service scope 와 ownership 은 **별개 단계**로 유지했다.
- ownership 판정 전에 mutation 이 실행되는 경로는 없다.
- 타인 / 없는 enrollment / 타 서비스 응답은 **완전히 동일한 404 body**(`Enrollment not found`, `NOT_FOUND`) — 기존 non-disclosure 계약 그대로.

---

## 5. mutation 수정 결과 (§4)

`EnrollmentController` 의 4개 mutation 이 공통 helper 하나(`ensureOwnEnrollment`)만 호출한다.
경로별 owner check 중복 구현 없음(정적 회귀 테스트로 4회 호출 고정).

| 시나리오 | update | start | complete | cancel |
|---|---|---|---|---|
| 본인 | 200 | 200 | 200 | 200 |
| 같은 서비스 타인 | 404 | 404 | 404 | 404 |
| 타 서비스 | 404 | 404 | 404 | 404 |
| 없는 enrollment | 404 | 404 | 404 | 404 |

---

## 6. elevated role 처리 (§5)

- 조사 결과 enrollment 관리 동작에는 **이미 별도 endpoint 계약**(`/lms/instructor/enrollments/:id/{approve,reject}`, `requireInstructor` + `course.instructorId` / `kpa:admin`)이 존재한다.
- 따라서 WO 기본값대로 **user-facing endpoint 에 elevated bypass 를 추가하지 않았다.** 새 권한 정책도 만들지 않았다.
- `isLmsElevatedManager()` 는 **오직 `GET /enrollments` 목록을 본인 범위로 좁힐지 판정**할 때만 쓰며, 역할 집합은 기존 `requireInstructor` 와 동일(`lms:instructor`, 토큰 `kpa:admin`, `roleAssignmentService.hasAnyRole`)하다.

---

## 7. read leak 점검 (§6)

| 경로 | 수정 전 | 수정 후 |
|---|---|---|
| `GET /enrollments/:id` | 같은 서비스면 타인 상세 노출 | 본인만, 타인 = 404 |
| `GET /enrollments` | 서비스 전체 enrollment 노출 (client `userId` 임의 지정 가능) | 일반 사용자는 `filters.userId` 를 요청자 id 로 **강제 덮어쓰기**. instructor / `kpa:admin` 은 기존 계약 유지 |
| `GET /enrollments/me`, `/me/course/:courseId` | 이미 본인 한정 | 변경 없음 |
| certificate 계열 | 아래 §11 잔존 위험 참조 | 이번 WO 범위 밖 |

---

## 8. progress / certificate 연계 회귀 (§7)

- `updateLessonProgress` 는 `userId + courseId` 복합 조회 기반이라 helper 변경 영향 없음. `recordLessonProgressCompletion` 경로 미변경.
- 강의 완료(`completeEnrollment`) → 자동 수료 체인은 helper 통과 후 기존 서비스 로직 그대로 호출된다(호출 순서만 owner check 뒤로).
- certificate 발급·자격·PDF 로직 미변경. `downloadPdf` 는 이미 scope → owner(`certificate.userId`) 순으로 판정 중.
- 신규 기능 추가 0.

---

## 9. 테스트 (§8)

신규 스펙: `apps/api-server/src/__tests__/lms-enrollment-ownership-boundary.spec.ts` — **28 tests PASS**

- same-service ownership: 본인 update/start/complete/cancel PASS (4)
- same-service 차단: A→B 4경로 404 + mutation 미실행 (4), elevated role 도 bypass 불가 (1)
- cross-service 회귀: 타 서비스 4경로 404 (4), scope 판정이 ownership 보다 먼저 (1)
- non-disclosure: 없는/타인 응답 code·body 동일, 알 수 없는 serviceKey 400(조회 이전), 미인증 401 (4)
- read leak: `GET /:id` 본인/타인 (2), 목록 userId 강제·타인 지정 덮어쓰기·instructor/`kpa:admin` 유지·canonical serviceKey (5)
- 정적 회귀 가드: helper 4회 호출·중복 구현 0, guard 내 scope→ownership 순서, user-facing 라우트에 elevated 미들웨어 미추가 (3)

기존 스펙 `lms-crossservice-read-write-boundary.spec.ts` — **32 tests PASS**
(helper 개명 `ensureEnrollmentInScope` → `ensureOwnEnrollment` 에 맞춰 정적 회귀 단언 1건을 동일 의도로 갱신하고, owner guard 의 scope 배선 단언을 추가)

api-server 전체 — **139 suites / 2,206 tests PASS**, `tsc --noEmit` PASS, migration 0.

---

## 10. production DB read-only (§9) — write 0

| 항목 | 값 |
|---|---|
| `lms_enrollments` 총수 | 9 |
| `userId` NULL | 0 |
| `courseId` NULL | 0 |
| course serviceKey 분포 | `kpa-society` 9 (그 외 0, NULL 0) |
| orphan course 참조 | 0 |
| (userId, courseId) 중복 | 0 |
| distinct 사용자 / 강의 | 3 / 6 |
| 복수 서비스에 걸친 사용자 | 0 |
| `lms_certificates` | 0건 |

→ 실데이터에 cross-service 혼입·소유자 미상 row 없음. ownership 판정에 필요한 컬럼이 전량 채워져 있어 migration 불필요.

---

## 11. 잔존 위험

1. **certificate id 기반 read** — `GET /lms/certificates/:id`, `/certificates/number/:certificateNumber`, `/certificates` 목록은 service scope 는 있으나 owner check 가 없다. 현재 `lms_certificates` 0건이라 실피해 0이며, 수료증 정책 변경은 본 WO §11 제외 범위 → **별도 WO 권고**.
2. `GET /enrollments` 목록의 elevated 판정은 course 단위 소유(instructor 본인 강의)까지 좁히지 않는다. instructor 는 서비스 범위 전체 목록을 본다(기존 계약 유지). 정책 재설계는 제외 범위.
3. 실 production 에서 **타인 enrollment mutation 실험은 수행하지 않았다**(WO §10). cross-user 차단은 automated test 로 증명했다.
4. (선행 WO 이월) KPA `appreciation` 클라이언트 base 불일치로 인한 404 6건 — LMS 무관, 별도 WO 대기.

---

## 12. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (certificate owner check)

---

> 이 CHECK 의 완료는 **LMS enrollment ownership/authorization boundary 완료**일 뿐,
> 커뮤니티 전체 공통화 완료를 의미하지 않는다.
