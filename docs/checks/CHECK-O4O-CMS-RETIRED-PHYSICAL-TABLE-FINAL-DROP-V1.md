# CHECK-O4O-CMS-RETIRED-PHYSICAL-TABLE-FINAL-DROP-V1

> **상태**: 구현·로컬 검증 완료 → migration job 실행 · 운영 검증 _(§6~§8 갱신)_
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

_(push 후 갱신)_

## 7. 운영 검증

_(job 후 갱신)_

## 8. 완료 판정

_(갱신)_

## 9. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```
