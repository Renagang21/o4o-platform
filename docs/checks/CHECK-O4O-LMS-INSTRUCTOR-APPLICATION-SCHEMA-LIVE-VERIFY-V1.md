# CHECK-O4O-LMS-INSTRUCTOR-APPLICATION-SCHEMA-LIVE-VERIFY-V1

> `WO-O4O-LMS-INSTRUCTOR-APPLICATION-DEAD-CODE-CLEANUP-V1` 중단 후, `InstructorApplication` live 의존성 검증(read-only).
> **결과: 판정 A — RELOCATE_REQUIRED.** prod 에 `lms_instructor_applications` **부재 확정**(live route 500). 삭제가 아니라 **migration relocate** 필요. `InstructorApplication` entity + `getPublicProfile` 보존.
> **상위 정정**: `IR-O4O-LMS-SEED-AND-INSTRUCTOR-ORPHANED-MIGRATION-AUDIT-V1` 의 instructor "제거" 판정을 **relocate 로 정정**.
> 2026-06-12

---

## 1. 배경 / 중단 사유
- cleanup WO 는 `lms_instructor_applications` 를 frontend-less dead 로 보고 제거하려 했으나, **`/lms/instructors/:userId/public-profile`(InstructorPublicController.getPublicProfile)** 가 `InstructorApplication` 을 **강사 자격 게이트**(`findOne where status='approved'`)로 사용하고, frontend `InstructorProfilePage` 가 이를 소비함을 발견 → WO §6 중단 조건 → 삭제 중단(코드 무변경) → 본 verify.

## 2. live 의존 경로 (정정 근거)
- route: `kpa.routes.ts:631` `lmsRouter.get('/instructors/:userId/public-profile', InstructorPublicController.getPublicProfile)` → mount `/api/v1/kpa/lms/...`(kpa.routes `/lms` + register-routes `/api/v1/kpa`).
- gate: `InstructorPublicController.ts:24` `getRepository(InstructorApplication).findOne({where:{userId, status:'approved'}})` — 없으면 INSTRUCTOR_NOT_FOUND.
- frontend: `web-kpa-society/.../instructors/InstructorProfilePage.tsx` → `api/lms.ts:151` `getInstructorPublicProfile('/lms/instructors/:userId/public-profile')`.
- → `InstructorApplication`/`lms_instructor_applications` 는 **dead 아님 — live 공개 강사 프로필의 데이터 소스**.

## 3. Live probe 결과 (결정적, read-only GET)
| probe | 결과 | 해석 |
|------|------|------|
| `GET /api/v1/kpa/lms/instructors/{uuid}/public-profile` | **HTTP 500** `{"error":"relation \"lms_instructor_applications\" does not exist","code":"42P01"}` | **prod 테이블 부재 확정** + **live route 깨짐** |
| `GET /api/v1/lms/instructors/{uuid}/public-profile`(대체) | HTTP 404 (Cannot GET) | 이 라우트는 kpa lmsRouter 에만 마운트 — 정상 |

- 더미 UUID 사용(존재 강사 불요): 테이블 존재 시 404 INSTRUCTOR_NOT_FOUND 이어야 하나 **42P01(relation 없음)** → 테이블 자체 부재. write/운영데이터 변경 없음.

## 4. migration 상태
- orphaned `1739500000000-AddInstructorRoleSupport`(class `AddInstructorRoleSupport1739500000000`) 만 `lms_instructor_applications` 생성. scanned `database/migrations` 커버 **0**(createTable 포함). → 미스캔·미적용 → prod 부재(§3 실증).

## 5. 정정 판정 — A. RELOCATE_REQUIRED
- **lms_instructor_applications 부재 + public-profile 500 확정** → `AddInstructorRoleSupport` 는 **삭제 대상이 아니라 relocate 대상**(o4o_payments/operator_action_dismissals 패턴). scanned dir 이전 → migration job 적용 → 테이블 생성 → **live 강사 공개 프로필 500 해소**.
- **`InstructorApplication` entity·`getPublicProfile`·public-profile route 는 보존**(삭제 금지). 원 cleanup WO 의 "entity 삭제 + connection.ts 등록 제거" 방향 **철회**.

### 5.1 ⚠️ relocate 시 필수 주의 — enum ALTER step 제거/가드
- `AddInstructorRoleSupport.up()` step 1 = `ALTER TYPE lms_enrollments_status_enum ADD VALUE IF NOT EXISTS 'approved'/'rejected'`.
- live `lms_enrollments.status` 는 **VARCHAR**(scanned `CreateLmsCoreTables`) → **`lms_enrollments_status_enum` 타입 미존재**. `IF NOT EXISTS` 는 VALUE 만 가드하며 **TYPE 부재 시 `ALTER TYPE` 는 hard error** → relocate 그대로면 **step 1 에서 실패하여 테이블 생성 도달 못 함**.
- → relocate WO 는 **step 1(enum ALTER) 제거**(moot — VARCHAR 라 approved/rejected 이미 저장 가능) 후 step 2/3(`CREATE TABLE IF NOT EXISTS lms_instructor_applications` + 인덱스)만 남겨야 안전. (또는 `to_regtype` 가드.)

## 6. 보호 / 무변경
```
InstructorApplication entity / getPublicProfile / /instructors/:id/public-profile / InstructorProfilePage  (보존 — relocate 로 복구)
lms_enrollments(VARCHAR) / Enrollment / requireEnrollment  (무변경 — enum ALTER 제거)
kpa_instructor_qualification / /kpa/qualifications  (별개 live)
Neture B2B / PaymentCore / operator_action_dismissals / content_templates / kpa_store_contents
```

## 7. 완료 기준 체크 (WO §6)
1(table 존재 확인 — 부재) ✅. 2(migration 적용 확인 — 미적용/orphaned) ✅. 3(scanned 커버 — 0) ✅. 4(public-profile probe — 500/42P01) ✅. 5(InstructorProfilePage frontend 소비 문서화) ✅. 6(판정 — A RELOCATE) ✅. 7(코드/DB/migration 무변경) ✅. 8(CHECK) ✅. 9(path-specific) ✅. 10(다른 세션 무접촉) ✅.

## 8. 후속 WO
1. **`WO-O4O-LMS-INSTRUCTOR-APPLICATION-MIGRATION-RELOCATE-V1`**(권장 즉시) — `AddInstructorRoleSupport` 를 `src/database/migrations/` 로 이전하되 **enum ALTER step 제거**(§5.1), `CREATE TABLE IF NOT EXISTS lms_instructor_applications` + 인덱스만 유지. 배포 → migration job 적용 → public-profile 500 해소 확인(probe 재실행 시 404/200). InstructorApplication/getPublicProfile 보존.
2. (relocate 후 선택) `WO-O4O-LMS-INSTRUCTOR-APPLICATION-ADMIN-ROUTE-CLEANUP-V1` — apply/listApplications/approveApplication/rejectApplication + `/instructor/apply`·`/applications*` 만 미사용 시 정리(entity·public-profile 보존). 단 application 제출 흐름이 향후 강사 등록 경로로 쓰일 수 있어 별도 판단.
3. 원 `WO-O4O-LMS-INSTRUCTOR-APPLICATION-DEAD-CODE-CLEANUP-V1` 의 entity 삭제 방향 **철회**(본 CHECK 로 supersede).

## 9. 이번 CHECK 에서 수정하지 않은 것
```
코드 / DB / migration / API / UI 무변경. 삭제·이동·실행 없음. probe 는 read-only GET(운영 데이터 변경 없음). 다른 세션 WIP 무접촉.
```

---

*Date: 2026-06-12 · read-only · 판정 A RELOCATE_REQUIRED. prod lms_instructor_applications 부재(live public-profile 500/42P01 실증). AddInstructorRoleSupport=relocate(enum ALTER step 제거 필수), InstructorApplication/getPublicProfile 보존. IR 의 instructor "제거" 판정 정정.*
