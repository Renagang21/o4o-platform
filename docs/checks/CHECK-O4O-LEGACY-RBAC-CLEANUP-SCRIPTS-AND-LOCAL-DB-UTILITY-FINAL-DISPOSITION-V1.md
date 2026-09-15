# CHECK — WO-O4O-LEGACY-RBAC-CLEANUP-SCRIPTS-AND-LOCAL-DB-UTILITY-FINAL-DISPOSITION-V1

**작성일**: 2026-09-15
**구현 커밋**: (본 문서와 같은 커밋 · `main`) · CI 결과 기록 후속 커밋 1건
**판정**: **5 파일 전부 DELETE_DEAD_LEGACY_SCRIPT · DEFERRED 0** — 현재 저장소 정비 트랙 **CLOSED**

> DB host · database name · 계정 · 비밀번호는 기록하지 않는다. 운영 DB 는 read-only(테이블 존재 여부 · 컬럼 존재 여부)만 조회했고 행 내용 · 사용자 식별값은 조회하지 않았다.

---

## 1. 기준 SHA · 작업 공간

| 항목 | 값 |
|---|---|
| 작업 시작 기준 | `370255e9f` (`origin/main`, detached worktree `C:\tmp\o4o-db-maint-log-2` 재사용 · clean 상태에서 `checkout --detach origin/main`) |
| 메인 체크아웃 | 접촉 없음 (pull/rebase/reset 없음 · 다른 세션 미추적 파일 불가침) |
| 변경 | 삭제 5 · 본 CHECK 1 |

## 2. 범위 (WO 지정 5 파일 · 확장 없음)

| 파일 | 추가 커밋 | 목적 |
|---|---|---|
| `apps/api-server/scripts/cleanup-vendor-manager.sql` | `db91d035e` 2025-11-28 | `users.roles` 에서 `vendor_manager` 제거 (array_remove) |
| `apps/api-server/scripts/cleanup-vendor-manager-role.ts` | `f8ef464f9` 2025-11-28 | 동일 (AppDataSource · `'vendor_manager' = ANY(roles)`) |
| `apps/api-server/scripts/cleanup-affiliate-role.ts` | `8a72b27c1` 2025-11-28 | `users.roles` 의 `affiliate` → `partner` 치환 |
| `apps/api-server/scripts/cleanup-moderator-role.ts` | `c0f0153a6` 2025-11-28 | `users.roles` 에서 `moderator` 제거 |
| `scripts/fix-view-text.sh` | `142c69757` 2025-12-07 | `cms_views` 의 `e2e-test-view` 1행 텍스트 오타 수정 (`/home/ubuntu/o4o-platform` 경로 고정 · EC2 시절) |

## 3. 소비처 · 근거 조사

| 조사 | 결과 |
|---|---|
| 파일명 참조 (`git grep`, 전체 추적 파일) | 기록물만: `docs/investigations/IR-O4O-REPOSITORY-WIDE-DEAD-CODE-…-CENSUS-V1.md` L153 (`fix-view-text.sh` NO_REF 15 · DEAD_SCRIPT 후보) · 직전 CHECK(`…CONNECTION-LOG-MINIMIZATION-V1`) 별도 WO 제안 · `docs/archive/reports/TEST_VIEW_PREVIEW.md`(e2e-test-view 수동 테스트 기록). 현행 지시문 0 |
| `package.json`(root/apps/packages) · `.github/workflows` · `scripts/README.md` · `SETUP.md` · `docs/baseline` · `docs/rules` · `docs/runbooks` · `apps/api-server/README*` | **0** |
| Dockerfile · Cloud Run job · Scheduler | 직전 WO 와 동일: `apps/api-server/scripts/` 및 `scripts/*.sh` 는 이미지 미포함 · job 8개 무관 · Scheduler API 미활성 |
| RBAC 4종 대상 컬럼 | 전부 `users.role` / `users.roles` 만 조작 (`SELECT id, email, role, roles FROM users …` / `UPDATE users SET roles = $1, role = $2`) · `role_assignments` 참조 **0** |
| 운영 DB (read-only) | `information_schema.columns` — `users.role` · `users.roles` **0 컬럼** (`DropLegacyRbacColumns20260228000002` 적용, 직전 CHECK §11) → 4종 모두 첫 SELECT 에서 실패, 실행 불가 |
| `fix-view-text.sh` 대상 | 운영 `cms_views` 테이블 **0** · `views` 테이블 **0** (`information_schema.tables`) · 저장소 runtime 에서 `CMSView/cms_views` entity 제거 완료(`src/database/entities.ts` L623 주석 · dead-entity retirement spec 이 은퇴 목록으로 보유) |
| `fix-view-text.sh` E2E 소비처 | `e2e-test-view` 참조 — `scripts/e2e` · `apps/*/e2e` · `apps/*/tests` · `services` · `packages` **0**. 남은 참조는 `docs/archive` 기록 1 · `scripts/fix-e2e-test-view-text.ts`(범위 외 · §7 BACKLOG) |
| 동일 SQL 활성 사본 | `array_remove(roles, 'vendor_manager')` · `'affiliate' = ANY(roles)` · `'moderator' = ANY(roles)` **0** |
| 운영 복구 용도 | 없음 — 대상 컬럼·테이블 자체가 없어 복구 절차가 될 수 없음 |

## 4. 처분

| 파일 | 판정 | 근거 |
|---|---|---|
| `cleanup-vendor-manager.sql` | **DELETE_DEAD_LEGACY_SCRIPT** | drop 된 컬럼 대상 · 소비처 0 · SSOT `role_assignments` 무관 · 직전 WO 에서 삭제한 `run-cleanup.js` 의 SQL 쌍둥이 |
| `cleanup-vendor-manager-role.ts` | **DELETE_DEAD_LEGACY_SCRIPT** | 동일 + email · 전체 error 객체 출력 |
| `cleanup-affiliate-role.ts` | **DELETE_DEAD_LEGACY_SCRIPT** | 동일 (`affiliate` 열거값은 2025-11 `8a72b27c1` 에서 PARTNER 로 병합 완료) |
| `cleanup-moderator-role.ts` | **DELETE_DEAD_LEGACY_SCRIPT** | 동일 |
| `fix-view-text.sh` | **DELETE** (`cms_views` 부재 + E2E 소비처 0) | 1회성 오타 수정 · 대상 테이블 운영·저장소 모두 은퇴 · EC2 경로 고정(§6 금지 참조) · `DB_NAME`/`DB_USERNAME` literal 기본값 |

DEFERRED: **0** · 단순 rename 없음 · 다른 실행 경로로 이전 없음.

## 5. 삭제 회귀 계약

| 항목 | 결과 |
|---|---|
| 5 파일 부재 | ✅ (`apps/api-server/scripts/` 잔여 = `delete-seed-data.sql` · `reset-product-test-data.sql` 2건 — 범위 외 · §7) |
| 현행 문서·package·workflow·src 참조 (checks/investigations/archive 제외) | **0** |
| 동일 SQL 사본 | 0 |
| API endpoint / migration job 포함 | 0 |
| `git diff --cached --check` | PASS |

## 6. 검증

| 검증 | 결과 |
|---|---|
| `node scripts/db/check-migration-contract.mjs` | 21 pass / 0 fail |
| `node --test scripts/db/__tests__/migration-identity.test.mjs scripts/db/__tests__/setup-local-db-credential-log.test.mjs` | 35/35 PASS |
| api-server `tsc --noEmit` | PASS (삭제 파일은 tsconfig include 밖) |
| api-server Jest — `cms-lifecycle-schema-cpt-acf-dead-entity-retirement.spec.ts` · `auth-core-dead-lifecycle-retired-user-roles-resurrection-closure.spec.ts` | 2 suites · 70/70 PASS |
| 운영 DB write / schema / data / migration history 변경 | **0** (SELECT 만 · 스크립트 실행 0회) |
| CI_PIPELINE / CODEQL / DEPLOY_API | §8 (push 후 기록) |

## 7. 이번 조사에서 발견된 잔재 — 분류만 (새 WO 생성 금지)

| 항목 | 분류 | 처리 |
|---|---|---|
| `scripts/fix-e2e-test-view-text.ts` (`views` 테이블 대상 · 동일 목적 TS 판) | DEAD_CODE_OR_LOW_RISK_DEBT | **BACKLOG** (census IR NO_REF 15 에 이미 등재) |
| `apps/api-server/scripts/delete-seed-data.sql` · `reset-product-test-data.sql` | DEAD_CODE_OR_LOW_RISK_DEBT / UNCERTAIN(현행 테이블 대상 가능) | **BACKLOG · DEFERRED** (범위 외 · 실행·조사 안 함) |
| `scripts/dev-start.sh` · `scripts/sync-local.sh` 의 로컬 psql 호출 (직전 CHECK §10) | DEAD_CODE_OR_LOW_RISK_DEBT | **BACKLOG** |
| `docs/archive/reports/TEST_VIEW_PREVIEW.md` 의 `e2e-test-view` 언급 | HISTORICAL_DOCUMENT_OR_COMMENT | 보존 |
| CRITICAL_SECURITY_OR_DATA_RISK / ACTIVE_PRODUCTION_DEFECT | **0건** |

## 8. CI · CodeQL · Deploy

| 항목 | 값 |
|---|---|
| CI_PIPELINE | (push 후 기록) |
| CODEQL | (push 후 기록) |
| DEPLOY_API | (push 후 기록 — `apps/api-server/**` 경로 트리거 · 런타임 내용 변화 없음) |

## 9. 최종 종결 선언

```
LEGACY_RBAC_CLEANUP_SCRIPTS        = DISPOSED (4/4 DELETE_DEAD_LEGACY_SCRIPT)
LOCAL_DB_VIEW_FIX_UTILITY          = DISPOSED (DELETE — cms_views 부재 · E2E 소비처 0)
PRODUCTION_SCHEMA_CHANGE           = ZERO
PRODUCTION_DATA_CHANGE             = ZERO
OTHER_SERVICE_REGRESSION           = PASS
CI_PIPELINE                        = (§8)

CURRENT_REPOSITORY_CLEANUP_TRACK   = CLOSED
FURTHER_LEGACY_CLEANUP             = DEFERRED_UNTIL_FUTURE_CENSUS
NEW_CLEANUP_WO_AFTER_THIS          = PROHIBITED
```

정비 재개 조건(사용자 방침 2026-09-15): ① 실제 서비스 장애 ② 새 기능 개발을 막는 오래된 코드 확인 ③ 보안·개인정보 위험 발견 ④ DB migration·배포 차단 ⑤ 별도 정비 기간 재지정. 그 외 저우선 잔재는 §7 BACKLOG 로만 남긴다.

## 10. 문서 정합

- 문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 (방침에 따라 새 WO 를 제안하지 않음 · §7 BACKLOG 기록으로 대체)
