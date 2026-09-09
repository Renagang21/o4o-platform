# CHECK — WO-O4O-GLYCOPHARM-MANUAL-SQL-AND-MIGRATION-RESIDUAL-FINAL-CLOSURE-V1

> **상태**: 완료
> **작성일**: 2026-09-09
> **기준선**: `origin/main` = `481ecb0c3`
> **작업 격리**: worktree `C:/tmp/o4o-gp-sql-residual` · branch `work/glycopharm-manual-sql-residual-v1`
> **선행**: [WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1](WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1-CHECK.md) ·
> WO-O4O-GLYCOPHARM-RUNTIME-MAP-RESIDUAL-FINAL-CLOSURE-V1 · WO-O4O-GLYCOPHARM-PHYSICAL-RESIDUE-AND-WORKTREE-FINAL-ERASURE-V1

---

## 1. 목적

GlycoPharm 서비스 삭제 이후, **자동 실행 경로에는 없지만 수동 실행이 가능한 tracked 자산**에
삭제된 `glycopharm_products` 참조가 남아 있었다. 이를 0으로 만든다.

`glycopharm_products` 는 이미 DROP 되었으므로 이 SQL 들은 **실행하면 실패한다** — 기술부채다.

---

## 2. 대상 재계수 — 6 → 7 (직전 보고 정정)

직전 보고는 "7파일"이라 적고 표에는 6개만 나열했다. 빠진 1건은 `run-production-migration.ts` 였다.
`git grep` 으로 재산출한 최종 대상은 **7 + 연쇄 2 = 9파일**이다.

| # | 파일 | 발견 경로 |
|---|---|---|
| 1 | `apps/api-server/migrations-sql/production-migration-2026-01-29-no-org-fk.sql` | glycopharm 문자열 |
| 2 | `apps/api-server/migrations-sql/production-migration-2026-01-29.sql` | glycopharm 문자열 |
| 3 | `apps/api-server/migrations-sql/product-images-migration.sql` | glycopharm 문자열 |
| 4 | `apps/api-server/migrations-sql/README-EXECUTE-MIGRATION.md` | glycopharm 문자열 |
| 5 | `apps/api-server/migrations-sql/EXECUTE-PRODUCTION-MIGRATION.md` | glycopharm 문자열 |
| 6 | `apps/api-server/scripts/delete-seed-data.sql` | glycopharm 문자열 |
| 7 | `apps/api-server/src/scripts/run-production-migration.ts` | **1~5 를 실행하는 runner** |
| +8 | `apps/api-server/migrations-sql/forum-migration.sql` | glycopharm 없음 — 디렉터리 은퇴 연쇄 |
| +9 | `packages/lms-ui/package.json` | description 의 GlycoPharm 표기 |

---

## 3. 참조 관계 실측

```text
run-production-migration.ts   ← package.json 0 · CI 0 · 코드 0   (호출자 없음)
production-migration-*.sql    ← run-production-migration.ts 뿐
product-images-migration.sql  ← 참조 0
forum-migration.sql           ← 참조 0
README/EXECUTE-*.md           ← 참조 0 (문서만)
delete-seed-data.sql          ← 참조 0 (수동 psql 실행 전용)
```

즉 **runner 하나가 유일한 코드 경로이고, 그 runner 자체는 어디서도 호출되지 않는다.**

---

## 4. 프로덕션 스키마 실측 — 은퇴 근거

이 SQL 들이 대상으로 삼는 테이블이 **대부분 이미 존재하지 않는다.**

| 테이블 | 존재 | 비고 |
|---|:---:|---|
| `glycopharm_products` | ❌ | GlycoPharm 삭제로 DROP |
| `forum_category` | ❌ | SQL 이 `CREATE TABLE` 하려던 대상 |
| `forum_post` | ✅ | 별도 canonical 경로로 존재 |
| `cosmetics_stores` (public) | ❌ | `cosmetics` 스키마에만 존재 |
| `migrations` (레거시 이력 테이블) | ❌ | 현행은 `typeorm_migrations` |
| `yaksa_posts` · `yaksa_categories` | ✅ | delete-seed-data 의 나머지 대상 |

`product-images-migration.sql` 은 `INSERT INTO migrations (...)` 를 하는데 그 테이블 자체가 없다.
**세 SQL 모두 현재 스키마에서 재실행 불가**이며, 이미 2026-01-29 에 적용 완료된 1회성 자산이다.

---

## 5. 파일별 처리

| 파일 | 처리 | 근거 |
|---|---|---|
| `production-migration-2026-01-29-no-org-fk.sql` | **DELETE_FILE** | 적용 완료 1회성 · 재실행 불가(`forum_category`/`migrations` 부재) |
| `production-migration-2026-01-29.sql` | **DELETE_FILE** | 동일 |
| `product-images-migration.sql` | **DELETE_FILE** | 전체가 `glycopharm_products` ALTER/INDEX · 대상 테이블 부재 |
| `forum-migration.sql` | **DELETE_FILE** | 위 통합본에 흡수된 원본 · 참조 0 · `forum_category` 부재 |
| `README-EXECUTE-MIGRATION.md` | **DELETE_FILE** | 은퇴 SQL 실행 절차서 · 이미 삭제된 파일을 가리키는 깨진 링크 포함 |
| `EXECUTE-PRODUCTION-MIGRATION.md` | **DELETE_FILE** | 동일 |
| `run-production-migration.ts` | **DELETE_FILE** | 위 SQL 1개만 실행하는 전용 runner · 호출자 0 |
| `scripts/delete-seed-data.sql` | **REMOVE_GLYCOPHARM_BLOCK** | K-Cosmetics · Yaksa seed 정리가 함께 있어 파일은 유지 |
| `packages/lms-ui/package.json` | **REMOVE_GLYCOPHARM_BLOCK** | description 의 서비스 열거만 정정 (JSON 유효성 확인) |

`apps/api-server/migrations-sql/` 디렉터리는 파일이 모두 은퇴해 소멸했다.

### delete-seed-data.sql 부분 제거 내역

```diff
- -- 2. Glycopharm education products
- DELETE FROM "glycopharm_products" WHERE id::text LIKE 'seed0000-%';
- SELECT 'glycopharm_products', COUNT(*) FROM "glycopharm_products" ... UNION ALL
```

남은 항목 번호를 1·2·3 으로 재정렬했다 (K-Cosmetics / Yaksa posts / Yaksa categories).

---

## 6. 기준 문서 링크 교정 (CLAUDE.md §16-3 인라인 허용 범위)

`docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md` 의 Related Documents 에서
은퇴한 `EXECUTE-PRODUCTION-MIGRATION.md` 링크 1줄을 제거했다.
**기계적 깨진 링크 교정이며 본문 판정은 건드리지 않았다.**

---

## 7. GlycoPharm 재검색 (분류)

| 분류 | 결과 |
|---|---|
| A. runtime/code | **0** — 잔여는 전부 "부재를 고정하는 가드"(`expect(existsSync(routes/glycopharm)).toBe(false)`, `expect(sql).not.toMatch(/glycopharm_products/)`)와 삭제 사유 주석 |
| B. executable/manual SQL | **0** — `scripts/reset/O4O-RESET-DRYRUN-V1.sql` 의 2줄은 `— REMOVED (WO-...)` 주석 |
| C. config/deploy | **0** — `.github/**` · `pnpm-workspace.yaml` · 모든 `package.json` |
| D. historical docs/comments | 잔존 — `docs/archive/**` · `docs/checks/**` · 적용 완료 migration 이력 · 공통화 출처 주석 (§16-1 기록물, 보존) |

---

## 8. 검증

| 게이트 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ |
| `pnpm run build:packages` | ✅ |
| `pnpm --filter '@o4o/api-server^...' run build` | ✅ |
| `pnpm --filter @o4o/api-server run type-check` | ✅ 0 errors |
| `pnpm run type-check:frontend` | ✅ OK |
| `node scripts/lint-ratchet.mjs` | ✅ 51 errors (baseline 51 유지) |
| `packages/lms-ui/package.json` JSON 유효성 | ✅ |
| admin-dashboard Vitest | ✅ 230 |
| api-server multi-tenant Vitest | ✅ 75 |
| packages/ui · auth-utils · auth-react · store-ui-core · operator-core-ui · shared-space-ui | ✅ 19 / 17 / 44 / 26 / 47 / 94 |
| services/web-kpa-society Vitest | ✅ 14 |
| packages/account-ui · asset-copy-core · appearance-system Jest | ✅ 20 / 64 / 12 |
| api-server Jest — 표적 6 스펙 | ✅ 137 |
| api-server Jest — 전체 | ✅ 239 suites / 3,860 tests |

### 8-1. 전체 Jest 실행 메모

로컬 전체 실행이 두 차례 중단됐다 — 1회차 `Fatal process out of memory: Zone`(로컬 OOM),
2회차 세션 종료. `--workerIdleMemoryLimit=1024` 로 재시도해 **239 suites / 3,860 tests 전량 PASS** 했다.

삭제·수정 대상을 참조하는 테스트 스펙은 `git grep` 상 **0건**이다
(`migrations-sql` · `run-production-migration` · `delete-seed-data` · `product-images-migration` · `forum-migration`).
`packages/lms-ui` 를 언급하는 스펙 2개는 별도 표적 실행으로도 PASS 를 확인했다.

---

## 9. 무결성

```text
삭제 954줄 / 7파일 · 수정 3파일
다른 세션 파일 접촉 0 (격리 worktree)
```

---

## 10. 최종 판정

```text
GLYCOPHARM MANUAL SQL RESIDUAL   = ZERO
GLYCOPHARM EXECUTABLE RESIDUAL   = ZERO
GLYCOPHARM COMPLETE ERASURE      = CLOSED
```

역사 기록(`docs/archive/**` · `docs/checks/**` · 적용 완료 migration 파일 · 공통화 출처 주석)은
의도적으로 보존한다 — 왜 삭제했는지를 남기는 것이 이 판정의 전제다.
