# CHECK-O4O-CMS-RETIRED-PHYSICAL-TABLE-FINAL-DROP-V1

> **상태**: **CLOSED** — 구현 SHA = push SHA `5e2bfbc81` · CI 3/3 · migration job 성공(4 테이블 드롭) · 운영 read-only 부재 실측 · API PASS
> **작성일**: 2026-09-13
> **WO**: WO-O4O-CMS-RETIRED-PHYSICAL-TABLE-FINAL-DROP-V1 (IR §12 초안 승인)
> **근거 조사**: [`IR-O4O-CMS-RETIRED-PHYSICAL-TABLE-RESIDUE-CENSUS-V1`](../investigations/IR-O4O-CMS-RETIRED-PHYSICAL-TABLE-RESIDUE-CENSUS-V1.md)
> **기준 SHA**: `3bdd24d67` (origin/main · 이번 범위 clean · 다른 세션 dirty 1건 `IR-O4O-CROSSSERVICE-…` 불가침)

---

## 1. 대상 · 순서 (exact · wildcard 0 · CASCADE 0)

| 순서 | 테이블 | IR 실측 | 허용 inbound FK |
|:-:|---|---|---|
| 1 | `public.custom_fields` | 0행 · 의존 0 · FK → custom_post_types | (없음) |
| 2 | `public.custom_post_types` | 0행 | `custom_fields` |
| 3 | `public.pages` | 0행 · FK → views | (없음) |
| 4 | `public.views` | 0행 | `pages` |

## 2. Migration — `apps/api-server/src/database/migrations/20270412000000-DropRetiredCmsCptResidueTables.ts`

| 항목 | 구현 |
|---|---|
| 실행 경로 | deploy workflow 의 Cloud Run Job `o4o-api-migrations`(`dist/migrate.js`, `transaction: 'each'`) — API startup 미실행 계약 유지 |
| `up()` 가드 (테이블마다) | ① `hasTable` 부재 → skip(idempotent) ② `count(*) ≠ 0` → **throw** `STOP_DATA_PRESENT` ③ 허용 목록 밖 inbound FK → **throw** `STOP_DEPENDENCY_PRESENT` |
| DROP 문 | `DROP TABLE "<name>" RESTRICT` — 예상 밖 의존이 남아 있으면 PostgreSQL 이 거부 |
| 원자성 | DROP 은 PG 트랜잭션 안 → 가드 throw 시 앞선 DROP 까지 롤백 → 부분 삭제 0 · job 실패 · deploy 미실행 · 기존 revision 유지 |
| `down()` | no-op + 사유(행 0 · entity 계약 부재 · 정본 `cms_contents` 별도) — 복원은 별도 WO |
| 실행 완료 migration 수정 | 0 (신규 파일 1개, timestamp 가 최신) |
| 정본 언급 | `cms_contents` · `cms_content_slots` · `media_assets` · `media_entity_links` 이름이 migration 에 등장하지 않음(spec 고정) |

## 3. 회귀 가드 — `cms-retired-physical-table-final-drop.spec.ts` (10 tests)

mock QueryRunner 로 동작 검증: IR 상태에서 4개 순서대로 RESTRICT 드롭 · 부재 시 skip · 행 1건이면 throw(드롭 0) · 후보 밖 FK 면 throw · 내부 FK 허용 · `down()` SQL 0. 소스 계약: exact 4개 · 정본명 0 · wildcard 0 · CASCADE 0 · 최신 timestamp · TypeORM 명명.

## 4. 변경 파일 (3)

```text
A  apps/api-server/src/database/migrations/20270412000000-DropRetiredCmsCptResidueTables.ts
A  apps/api-server/src/__tests__/cms-retired-physical-table-final-drop.spec.ts
A  docs/checks/CHECK-O4O-CMS-RETIRED-PHYSICAL-TABLE-FINAL-DROP-V1.md
```

## 5. 로컬 검증

| 단계 | 결과 |
|---|---|
| api-server type-check | ✅ 0 |
| `pnpm run build`(tsc) → `dist/database/migrations/20270412000000-*.js` 산출 | ✅ |
| eslint (신규 2 파일) | ✅ 0 |
| 신규 spec + 관련 spec 3(lifecycle 은퇴 · migration 소유권 · unprovisioned-form) | ✅ 117/117 |
| api-server 전체 Jest (`--runInBand`) | **276/277 suites · 4,524 pass**. 실패 1 = `main-site-full-source-deletion`(로컬 미추적 잔여물, 무관) |

## 6. Migration job 실행 (배포)

| 워크플로 | 결과 | run |
|---|---|---:|
| CI Pipeline | ✅ success | (SHA `5e2bfbc81`) |
| CodeQL Security Analysis | ✅ success | |
| Deploy API Server (Cloud Run) | ✅ success — **Run database migrations → Deploy → Verify(`/health/ready`)** 전부 success | 34755715056 |

**Job `o4o-api-migrations-m9tkf`** (`dist/migrate.js`, `transaction: 'each'`):

```text
[DropRetiredCmsCptResidueTables] custom_fields: dropped (rows=0, unexpected inbound FK=0)
[DropRetiredCmsCptResidueTables] custom_post_types: dropped (rows=0, unexpected inbound FK=0)
[DropRetiredCmsCptResidueTables] pages: dropped (rows=0, unexpected inbound FK=0)
[DropRetiredCmsCptResidueTables] views: dropped (rows=0, unexpected inbound FK=0)
Migration DropRetiredCmsCptResidueTables20270412000000 has been executed successfully.
  - Migrations executed: 1  → Migration Job - SUCCESS → exit(0)
```

4개 모두 가드(존재 · `count(*)=0` · 후보 밖 inbound FK 0) 통과 후 **FK 자식 → 부모 순**으로 드롭. throw 0 · CASCADE 0.

## 7. 운영 검증

### 7-1. 물리 부재 (Cloud SQL Auth Proxy · `BEGIN READ ONLY … ROLLBACK` · 자격정보는 환경변수로만)

| 항목 | 실측 |
|---|---|
| `custom_fields` · `custom_post_types` · `pages` · `views` | **전부 부재** (`pg_class` 0) |
| 드롭된 테이블을 가리키는 잔류 FK | **0** |
| `typeorm_migrations` | 676행(전 675 + 1) · 최신 `DropRetiredCmsCptResidueTables20270412000000` |
| 정본 행 수 | `cms_contents` **63**(불변) · `cms_content_slots` 29 · `media_assets` 50 · `media_entity_links` 3 — 존재 · 접근 정상 |

### 7-2. API (revision `o4o-core-api-03646-sw9`, 트래픽 100%)

| 경로 | 결과 |
|---|---|
| `/health/ready` | **200** `ready` |
| `/api/v1/cms/contents?serviceKey=neture` (인증) | **200** · 실데이터 |
| `/api/v1/platform/media-library` (인증) | **200** · 실데이터 |
| `/api/v1/hub/contents?serviceKey=kpa` | 200 |
| 미인증 `media-library` · serviceKey 없는 `cms/contents` | 401 · 400 (기존 계약) |

### 7-3. 신규 revision 로그

severity ≥ ERROR **0** · 5xx **0** · `does not exist` **0**. 콜드스타트 순서 `process_start → db_connecting → ready(+4.24s) → http_listen = TCP probe 성공(같은 ms)` — 선행 readiness 게이트 계약 유지.

## 8. 완료 판정

```text
DROP_TARGET_EXACT_MATCH            = PASS   (4 · wildcard 0)
DROP_ORDER_FK_CHILD_FIRST          = PASS
UP_GUARD_ROWS_ZERO                 = PASS   (job 로그 rows=0 ×4)
UP_GUARD_UNEXPECTED_INBOUND_FK     = PASS   (0 ×4)
CASCADE_USED                       = ZERO
EXECUTED_MIGRATION_MODIFIED        = ZERO
PRODUCTION_PHYSICAL_ABSENCE        = PASS   (read-only 실측)
DANGLING_FK_TO_DROPPED             = ZERO
CANONICAL_CONTENT_PRESERVED        = PASS   (cms_contents 63 · API 200)
MEDIA_V2_PRESERVED                 = PASS
PRODUCTION_MIGRATION_OWNER         = DEPLOY_MIGRATION_JOB_ONLY (job 이 실행 · startup 미실행)
PRODUCTION_DATA_CHANGE             = ZERO   (삭제된 행 0)
CREDENTIAL_EXPOSURE                = ZERO
CI_PIPELINE · CODEQL · DEPLOY_API  = SUCCESS
OTHER_SERVICE_REGRESSION           = PASS   (jest 4,524 · revision ERROR 0)

CMS_RETIRED_PHYSICAL_TABLE_FINAL_DROP = CLOSED
```

이로써 CMS legacy · lifecycle · CPT/ACF 축은 **코드(entity · DDL · 런타임)와 운영 물리 객체 모두** 종결됐다.

## 9. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```
