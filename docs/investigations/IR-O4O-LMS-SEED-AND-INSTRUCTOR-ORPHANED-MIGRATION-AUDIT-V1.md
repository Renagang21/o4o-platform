# IR-O4O-LMS-SEED-AND-INSTRUCTOR-ORPHANED-MIGRATION-AUDIT-V1

> **유형**: Investigation / Orphaned Migration State Audit (read-only)
> **목적**: orphaned migration 정리의 마지막 묶음 — `SeedContentTemplates1771200000022`(seed) 와 `AddInstructorRoleSupport1739500000000`(`lms_instructor_applications` + enum ALTER)의 runtime/live 상태를 조사해 **제거 / relocate / 보류** 판정.
> **성격**: 코드/DB/schema/migration/API/UI **무변경**. read-only.
> **상위**: `IR-O4O-API-SERVER-ORPHANED-SRC-MIGRATIONS-AUDIT-V1` · `CHECK-O4O-LMS-TEMPLATE-AND-CONTENT-CORE-DEAD-CODE-CLEANUP-V1`
> **작성일**: 2026-06-12

---

## 1. 요약 판정
| 대상 | 핵심 사실 | 판정 |
|------|----------|:---:|
| **SeedContentTemplates1771200000022** | `content_templates`(LIVE, scanned dir 3 migration + entity + routes + web-neture + content-editor) 에 조건부 seed. orphaned 미적용(미실행). 방금 제거한 lms_template_* 와 **무관·별개** | **제거 (orphaned 단순 삭제)** — live content_templates 무관, 미실행이라 prod 무영향 |
| **AddInstructorRoleSupport1739500000000** | (a) `ALTER TYPE lms_enrollments_status_enum ADD VALUE 'approved'/'rejected'` = **moot**(live lms_enrollments.status 는 `VARCHAR`, 해당 enum 타입 미사용) (b) `lms_instructor_applications` 생성 — orphaned 미적용, frontend 0(frontend 는 `/kpa/qualifications` 사용). InstructorController apply/applications 마운트되나 호출자 0 | **제거 (cleanup)** — relocate 불요(enum moot). 단 InstructorController 부분 수술 필요 → 별도 WO |

→ **둘 다 제거 가능**(relocate 불필요). SeedContentTemplates 는 단순 orphaned 삭제, AddInstructorRoleSupport 는 dead 라인(migration + 엔티티 + 컨트롤러 application 메서드) 수술적 제거.

## 2. SeedContentTemplates — content_templates 는 LIVE (별개)
- seed 대상 = **`content_templates`**(NOT lms_templates). `INSERT INTO content_templates ... service_key='neture' ... is_public` (없을 때만 조건부).
- **content_templates 는 live**: scanned dir `20260330100000-CreateContentTemplatesTable` + `...AddIsPublicToContentTemplates` + `...AddUsageAnalyticsToContentTemplates`(적용됨). runtime: `entities/ContentTemplate.ts` · `routes/content/content-templates.routes.ts` · frontend `web-neture/hooks/useContentTemplates.ts` · `content-editor/TemplateModal.tsx`.
- orphaned SeedContentTemplates 는 **미적용(미실행)** → 그 default neture 템플릿 seed 는 prod 에 들어간 적 없음. live 테이블/기능은 scanned migration + CRUD 로 자족.
- → orphaned 파일 삭제 시 **prod 무영향**(애초 미실행). default 템플릿이 필요하면 별도 정식 seed/admin 으로(현재 미사용). **lms_template_* 와 무관하므로 본 라인 정리와 별개로 안전 제거.**

## 3. AddInstructorRoleSupport — enum ALTER 는 moot, table 은 frontend-less dead
### 3.1 enum ALTER (a) — moot (live gap 아님)
- 이 migration 은 `ALTER TYPE lms_enrollments_status_enum ADD VALUE IF NOT EXISTS 'approved'/'rejected'`.
- 그러나 **live lms_enrollments 는 enum 이 아니라 VARCHAR**: scanned `20260410000001-CreateLmsCoreTables` → `status VARCHAR(20) DEFAULT 'pending'`. 즉 `lms_enrollments_status_enum` 타입은 live 스키마에 **존재하지 않음**.
- runtime `EnrollmentStatus.APPROVED/REJECTED`('approved'/'rejected') 사용처(`InstructorController:821/873`, `requireEnrollment.ts:82`)는 **VARCHAR 컬럼에 임의 문자열로 정상 동작** → enum 제약 없음 → **latent enum bug 없음 / relocate 불요**.
- 참고: `approved/rejected` 를 가진 `enrollment_status_enum` 은 **다른 테이블**(`user_service_enrollments`, scanned `2026020500003-CreateUserServiceEnrollments`) — lms_enrollments 와 무관.
- (entity `@Column type:'enum'` ↔ live VARCHAR 불일치는 synchronize=false 로 용인되는 기존 drift. 본 IR 범위 밖.)

### 3.2 lms_instructor_applications (b) — orphaned·frontend-less
- scanned dir 커버 **0** → orphaned 미적용 → prod 미생성 추정(o4o_payments 패턴).
- `InstructorApplication` entity(lms-core) 소비: `InstructorController`(apply/listApplications/approveApplication/rejectApplication, 라인 35/79/118/130/164/175) + `InstructorPublicController:26`. route `/lms/instructor/apply`·`/applications`(±approve/reject) 마운트.
- **frontend 소비 0**: services 에서 `/lms/instructor/apply|applications` 호출 없음. 강사/자격 흐름은 **`/kpa/qualifications`**(kpa_instructor_qualification, LIVE·별개) 사용 → lms_instructor_applications 는 store_contents↔kpa 와 동일하게 **미완성 평행 시스템**.
- → 테이블 부재 + 호출자 0 → 실 500 미발생(잠재 dead). **제거 대상**, 단 InstructorController 는 live course/enrollment 메서드도 보유 → application 메서드만 수술적으로 떼야 함.

## 4. live 보호 범위 (무관·별개)
```
content_templates / ContentTemplate / content-templates.routes / useContentTemplates / content-editor TemplateModal  (LIVE — SeedContentTemplates 와 별개)
lms_enrollments(VARCHAR status) / Enrollment / requireEnrollment / InstructorController 의 course·enrollment·participants·grade 메서드  (LIVE)
kpa_instructor_qualification / /kpa/qualifications  (LIVE 강사·자격 흐름)
user_service_enrollments / enrollment_status_enum  (별개)
kpa_store_contents / Neture B2B / PaymentCore / operator_action_dismissals
```

## 5. 판정 / 후속 WO
1. **SeedContentTemplates1771200000022 → 제거(B)**. orphaned 미적용·미실행, live content_templates 와 무관·무영향. **`WO-O4O-LMS-SEED-CONTENT-TEMPLATES-ORPHANED-REMOVE-V1`**(단순 path-specific git rm 1파일). seed 데이터는 prod 에 없으므로 데이터 영향 없음.
2. **AddInstructorRoleSupport1739500000000 + lms_instructor_applications → 제거(B, 수술)**. relocate 불요(enum moot). **`WO-O4O-LMS-INSTRUCTOR-APPLICATION-DEAD-CODE-CLEANUP-V1`**:
   - orphaned migration 삭제.
   - `InstructorApplication` entity(lms-core) + 배럴 제거.
   - `InstructorController` 의 apply/listApplications/approveApplication/rejectApplication + `InstructorPublicController` 의 application 조회 제거(라우트 `/instructor/apply`·`/applications*` 제거). **course/enrollment/participants/grade 등 live 메서드 보존**.
   - api-server + lms-core build/tsc(메모리 rebuild order). frontend 무영향(kpa qualification 사용).
   - 중단 조건: application 메서드가 live course 흐름과 공유 상태/헬퍼면 분리 중단 후 보고.
3. (정리 후) orphaned `src/migrations/` 잔여는 B(설계 필요)·E(BootstrapCoreSchema/SeedNetureData 등 seed/core) 만 남음 → 별도 설계 IR.
4. (본선 복귀) `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V3`(Toss sandbox).

## 6. 핵심 질문 답변
1. SeedContentTemplates 대상? **content_templates(LIVE, 별개)** — lms_template_* 아님. 2. seed prod 적용됨? **아니오(orphaned 미실행)**. 3. 삭제 안전? **예(미실행·live 자족)**. 4. AddInstructorRoleSupport enum ALTER live gap? **아니오(lms_enrollments=VARCHAR, enum 타입 미사용 → moot)**. 5. approved/rejected runtime 동작? **정상(VARCHAR)**. 6. lms_instructor_applications frontend? **0(/kpa/qualifications 사용)**. 7. relocate 필요? **아니오(둘 다)**. 8. 제거 가능? **예 — Seed=단순, Instructor=수술적**. 9. live 충돌? **없음**(content_templates·lms_enrollments·kpa qualification 모두 별개·보존).

## 7. 검증 방식 / 한계
- src-only grep(seed 대상 테이블·scanned 커버·runtime 소비·frontend), scanned migration 의 컬럼 타입(VARCHAR vs enum) 대조.
- prod schema 직접 SQL 미수행(방화벽). lms_instructor_applications 부재·SeedContentTemplates 미실행은 orphaned 미적용 + synchronize=false 로 고확신. 100% 는 cleanup WO 적용 후 또는 gcloud 로 갈음(영향 없음 — 삭제는 미실행 파일).

## 8. 이번 IR 에서 수정하지 않은 것
```
코드 / DB / migration / API / UI 무변경. 파일 삭제·이동·실행 없음. prod SQL 미수행. 다른 세션 WIP 무접촉.
```

---

*Date: 2026-06-12 · read-only · SeedContentTemplates=제거(live content_templates 와 별개·미실행), AddInstructorRoleSupport=제거(enum ALTER moot·lms_instructor_applications frontend-less, InstructorController 수술 WO). relocate 불요. live content_templates·lms_enrollments(VARCHAR)·kpa qualification 보존.*
