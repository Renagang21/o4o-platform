# CHECK-O4O-LMS-INSTRUCTOR-APPLICATION-MIGRATION-RELOCATE-V1

> KPA 강사 공개 프로필(`/api/v1/kpa/lms/instructors/:userId/public-profile`)이 `lms_instructor_applications` 부재로 500(42P01)을 반환하는 live bug 수정 — orphaned `AddInstructorRoleSupport` migration 을 스캔 dir 로 이전(enum ALTER step 제거).
> **결과: PASS — api-server tsc 0, git mv relocate, enum ALTER 제거. 배포 migration job 적용 확인(`[X] 538 AddInstructorRoleSupport1739500000000`) + public-profile probe 42P01 해소(404 INSTRUCTOR_NOT_FOUND).**
> 상위: `CHECK-O4O-LMS-INSTRUCTOR-APPLICATION-SCHEMA-LIVE-VERIFY-V1`(판정 A) — 2026-06-12

---

## 1. 변경 (1 rename + 1 edit)
| 변경 | 경로 |
|------|------|
| **이전** | `src/migrations/1739500000000-AddInstructorRoleSupport.ts` → `src/database/migrations/1739500000000-AddInstructorRoleSupport.ts` (git rename) |
| **편집** | up() 의 step 1 `ALTER TYPE lms_enrollments_status_enum ADD VALUE 'approved'/'rejected'` **제거**. `CREATE TABLE IF NOT EXISTS lms_instructor_applications` + 인덱스 2개(`userId`, `status`)는 **원본 그대로 보존**. class·timestamp `AddInstructorRoleSupport1739500000000` 유지 |

> orphaned `src/migrations/` 잔여 26 → **25**.

## 2. 근본 원인 / 수정
- live route `/api/v1/kpa/lms/instructors/:userId/public-profile`(getPublicProfile) → `InstructorApplication`(`lms_instructor_applications`) gate. 테이블이 미스캔 orphaned migration 에만 있어 prod 미생성 → **42P01 500**(SCHEMA-LIVE-VERIFY 실증).
- 스캔 dir 이전 → migration job 적용 → 테이블 생성 → 500 해소.

## 3. enum ALTER step 제거 근거 (§relocate 필수 주의)
- 원본 step 1 `ALTER TYPE lms_enrollments_status_enum ADD VALUE ...`: live `lms_enrollments.status` 는 **VARCHAR**(scanned `CreateLmsCoreTables`)이라 `lms_enrollments_status_enum` **타입 미존재** → `ALTER TYPE`(IF NOT EXISTS 는 VALUE 만 가드)은 **hard error** → 그대로면 CREATE TABLE 도달 불가.
- enum 값은 VARCHAR 컬럼에 이미 저장 가능(approved/rejected runtime 정상) → step **moot** → 제거. 남은 up() = `CREATE TABLE IF NOT EXISTS` + 인덱스(멱등).

## 4. 컬럼 정합 (무변경 보존)
- migration 컬럼 = **quoted camelCase**(`"userId"`,`"reviewedBy"`,`"reviewedAt"`,`"rejectionReason"`,`"createdAt"`,`"updatedAt"`, status VARCHAR(20)).
- live sibling `lms_enrollments` 도 camelCase(`("userId","courseId")`) → entity `InstructorApplication`(userId/status/reviewedBy/...) findOne·getPublicProfile(`where userId,status='approved'`) 와 정합. 컬럼 정의 **원본 유지**(snake 변환 금지 — 기존 lms 테이블 관례).
- 인덱스 `IDX_lms_instructor_applications_userId`/`_status` = entity `@Index(['userId'])`/`@Index(['status'])` 와 일치.

## 5. collision / 무회귀
- 스캔 dir 에 `lms_instructor_applications`/`AddInstructorRoleSupport` 생성 migration **없음**(grep 0) → 중복 없음.
- `InstructorApplication` entity·`getPublicProfile`·route·`InstructorProfilePage` **무변경**(relocate 로 복구만). lms_enrollments(VARCHAR)·EnrollmentStatus·requireEnrollment 무변경(enum ALTER 제거 = live 무영향). kpa qualification·Neture B2B·PaymentCore·operator_action_dismissals 무변경.

## 6. Live 검증 (배포 migration job — 적용 완료 ✅)
- 배포 `778294ef5` Cloud Run Job `o4o-api-migrations` 적용 — typeorm_migrations 등록 확인(gcloud logging):
  - **`[X] 538 AddInstructorRoleSupport1739500000000`** ✅ → `lms_instructor_applications` 생성.
- public-profile probe 재실행: `GET /api/v1/kpa/lms/instructors/{dummyUuid}/public-profile`
  - 이전(SCHEMA-LIVE-VERIFY): HTTP **500 / 42P01** `relation "lms_instructor_applications" does not exist`.
  - 적용 후: HTTP **404** `{"error":"강사를 찾을 수 없습니다","code":"INSTRUCTOR_NOT_FOUND"}` → **42P01/500 해소 확정**(테이블 존재 → 쿼리 정상, 더미 UUID 라 approved 강사 없음 = 정상 404).
- → **live 강사 공개 프로필 route 의 relation-missing 장애 해소.** (o4o_payments #534/535, operator_action_dismissals #536 다음 #538 — orphaned relocate 4번째 사례.)

## 7. 완료 기준 체크 (WO §10)
1(원본 확인) ✅. 2(enum ALTER live 불일치 확인) ✅. 3(스캔 dir 에 enum ALTER 제거 버전 배치) ✅. 4(orphaned 원본 제거 — git mv) ✅. 5(CREATE TABLE IF NOT EXISTS 안전) ✅. 6(entity↔컬럼 정합) ✅. 7(api-server tsc 0) ✅. 8(migration job 성공 — `[X] 538`) ✅. 9(prod 테이블 생성 — probe 404 로 실증) ✅. 10(probe 42P01 해소 — 500→404) ✅. 11(entity/getPublicProfile/route 보존) ✅. 12(CHECK) ✅. 13(path-specific) ✅. 14(다른 세션 무접촉) ✅.

## 8. 후속
- (relocate 후 선택) `WO-O4O-LMS-INSTRUCTOR-APPLICATION-ADMIN-ROUTE-CLEANUP-V1` — apply/listApplications/approve/reject + `/instructor/apply`·`/applications*` 미사용 시 정리(entity·public-profile 보존). 단 강사 등록 경로 가능성 별도 판단.
- 본선 복귀 `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V3`(Toss).

## 9. 수정하지 않은 것
```
InstructorApplication entity / getPublicProfile / public-profile route / InstructorProfilePage (보존)
lms_enrollments(VARCHAR) / EnrollmentStatus / requireEnrollment (enum ALTER 제거 = 무영향)
kpa qualification / Neture B2B / PaymentCore / operator_action_dismissals
table 컬럼 정의 / 인덱스 (원본 보존, 파일 이전 + enum step 제거만)
다른 세션 WIP
```

---

*Date: 2026-06-12 · Status: PASS. AddInstructorRoleSupport 스캔 dir 이전(enum ALTER step 제거, table/index 보존), tsc 0. migration job 적용(`[X] 538`) + public-profile probe 500/42P01 → 404 해소 확인 — live 강사 공개 프로필 장애 복구 완료.*
