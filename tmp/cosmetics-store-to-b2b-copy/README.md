# cosmetics-store-to-b2b-copy 산출물

`WO-O4O-COSMETICS-STORE-TO-B2B-DESCRIPTION-FULL-COPY-V1` 산출물이다.
판정 요약은 [CHECK-O4O-COSMETICS-STORE-TO-B2B-DESCRIPTION-FULL-COPY-V1](../../docs/checks/CHECK-O4O-COSMETICS-STORE-TO-B2B-DESCRIPTION-FULL-COPY-V1.md) 참조.

**내용을 생성하지 않는다.** 확정된 KO STORE canonical 을 KO B2B canonical 로 1회 복사만 한다.
1MB 이상 파일은 gzip 으로 보관한다.

```bash
gunzip -k tmp/cosmetics-store-to-b2b-copy/*.gz
```

생성 스크립트: `apps/api-server/src/scripts/cosmetics-store-to-b2b-copy/`

```bash
node apps/api-server/src/scripts/cosmetics-store-to-b2b-copy/01-census.mjs        # §3 모집단 재산출 (read-only)
node apps/api-server/src/scripts/cosmetics-store-to-b2b-copy/02-dry-run.mjs       # §8 전량 판정 (read-only)
node apps/api-server/src/scripts/cosmetics-store-to-b2b-copy/03-validate.mjs      # §9 사전 검증 (read-only)
node apps/api-server/src/scripts/cosmetics-store-to-b2b-copy/04-build-apply-sql.mjs  # apply SQL + STORE 기준선 (read-only)
node apps/api-server/src/scripts/cosmetics-store-to-b2b-copy/05-apply.mjs         # §10 apply (INSERT 전용, 단일 트랜잭션)
node apps/api-server/src/scripts/cosmetics-store-to-b2b-copy/06-post-verify.mjs   # §11·§12 독립 검증 (read-only)
node tmp/cosmetics-store-to-b2b-copy/smoke.mjs                                    # §13 소비 API smoke (GET only)
```

| 파일 | 내용 |
|------|------|
| `census.json` | §3 모집단 실측 (COSMETIC 32,674 / KO STORE canonical 32,674 / 기존 KO B2B 0) |
| `dry-run-plan.json.gz` | §8 COPY 계획 32,674건 (masterId / storeDescriptionId / existingB2bDescriptionId / copyAction / contentHash) |
| `dry-run-summary.json` | §8 판정 집계 |
| `check-queue.json` | CHECK·BLOCKER 큐 (0건) |
| `validation.json` | §9 사전 검증 (위반 0) |
| `apply.sql` | §10 적용 SQL — `INSERT ... SELECT` 1문(본문을 클라이언트로 실어 나르지 않는다) |
| `baseline-store.jsonl.gz` | 적용 전 STORE 32,674행 기준선 (md5·status·updated_at) |
| `apply-result.json.gz` | 적용 결과 + 신규 B2B id 매니페스트 32,674개 |
| `rollback.sql.gz` | §14 원복 — 이번 배치 신규 B2B 만 삭제 |
| `post-verify.json` | §11·§12 독립 postVerify (PASS) |
| `smoke.json` / `smoke.mjs` | §13 같은 제품의 STORE·B2B 동시 조회 확인 (GET only) |

## 원복

```bash
gunzip -k tmp/cosmetics-store-to-b2b-copy/rollback.sql.gz
psql "<proxy>" -f tmp/cosmetics-store-to-b2b-copy/rollback.sql
```

이번 배치로 만든 행만 삭제한다. 안전판 3중:

1. 신규 id 매니페스트(32,674개)에 있는 id 만
2. `description_type='B2B' AND source_type='o4o_cosmetics_retail'` — 적용 전 이 조합의 기존 행은 0건이었다(`validation.json.rollbackKeyCollision`)
3. `updated_at = created_at` — 복사 후 누군가 수정한 B2B 는 삭제하지 않는다

STORE / ProductMaster 에는 rollback write 가 발생하지 않는다.
