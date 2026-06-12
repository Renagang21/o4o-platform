# CHECK-O4O-LMS-SEED-CONTENT-TEMPLATES-ORPHANED-REMOVE-V1

> 미스캔 `src/migrations/` 의 `SeedContentTemplates1771200000022` orphaned seed migration 1파일 삭제.
> **결과: PASS** — api-server tsc 0, live `content_templates` 무변경, prod 무영향(미실행).
> 상위: `IR-O4O-LMS-SEED-AND-INSTRUCTOR-ORPHANED-MIGRATION-AUDIT-V1` — 2026-06-12

---

## 1. 변경 (삭제 1)
| 삭제 | 근거 |
|------|------|
| `apps/api-server/src/migrations/1771200000022-SeedContentTemplates.ts` (class `SeedContentTemplates1771200000022`) | orphaned(미스캔 dir)·미적용. `content_templates`(LIVE, scanned dir 생성·CRUD 자족)에 조건부 default neture 템플릿 seed 였으나 **미실행**. lms_template_* 와 무관 |

> orphaned migration 잔여 27 → **26**.

## 2. 안전성 (IR 기준 재확인)
- 대상 = `content_templates`(seed `INSERT ... WHERE service_key='neture' is_public` 조건부) — **NOT lms_templates**.
- **content_templates 는 LIVE·무변경**: scanned `20260330100000-CreateContentTemplatesTable`(+IsPublic/UsageAnalytics) + `entities/ContentTemplate.ts` + `routes/content/content-templates.routes.ts` + `web-neture/useContentTemplates` + `content-editor/TemplateModal`. 본 삭제와 무관.
- orphaned 미적용 → seed 가 prod 에 실행된 적 없음 → **파일 삭제 = prod 데이터/스키마 무영향**.
- 러너 미스캔 dir → typeorm_migrations / dist 무영향.

## 3. 검증
- **runtime 참조 0**: `SeedContentTemplates` grep (migration/dist 제외) → 0.
- **api-server tsc 0** (orphaned migration 은 import 없음 → compile 무영향).
- **staged**: 삭제 1 + 본 CHECK 만 path-specific. scanned dir / content_templates 라인 무변경.
- DB schema/migration 실행 없음.

## 4. 보호 (무변경)
```
content_templates / ContentTemplate / content-templates.routes / useContentTemplates / content-editor TemplateModal (LIVE)
lms_template_* (이미 별도 cleanup) / AddInstructorRoleSupport / lms_instructor_applications (별도 WO)
Neture B2B / PaymentCore / o4o_payments / operator_action_dismissals
```

## 5. 완료 기준 체크 (WO §8)
1(파일 확인) ✅. 2(orphaned src/migrations 확인) ✅. 3(content_templates live 별개 확인) ✅. 4(1파일 git rm) ✅. 5(staged=삭제1+CHECK) ✅. 6(tsc 0) ✅. 7(CHECK) ✅. 8(path-specific) ✅. 9(다른 세션 무접촉) ✅.

## 6. 후속
- `WO-O4O-LMS-INSTRUCTOR-APPLICATION-DEAD-CODE-CLEANUP-V1` — AddInstructorRoleSupport + lms_instructor_applications + InstructorApplication entity + InstructorController/InstructorPublicController application 메서드/라우트 수술적 제거(live course/enrollment 보존).
- 이후 orphaned `src/migrations/` 잔여는 B(설계)·E(seed/core) 만 → 별도 설계 IR.
- `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V3`(Toss).

## 7. 수정하지 않은 것
```
content_templates 테이블/entity/route/frontend · scanned migration
lms_template_* / AddInstructorRoleSupport / lms_instructor_applications
DB schema / migration 실행 · 다른 세션 WIP
```

---

*Date: 2026-06-12 · Status: PASS. orphaned SeedContentTemplates022 1파일 삭제(27→26), tsc 0. live content_templates 무관·무변경, prod 무영향(미실행).*
