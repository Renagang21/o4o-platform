# cosmetics-mfds-usage-caution 산출물

`WO-O4O-COSMETICS-MFDS-USAGE-CAUTION-ENRICHMENT-V1` 산출물이다.
판정 요약은 [CHECK-O4O-COSMETICS-MFDS-USAGE-CAUTION-ENRICHMENT-V1](../../docs/checks/CHECK-O4O-COSMETICS-MFDS-USAGE-CAUTION-ENRICHMENT-V1.md) 참조.

**외부 수집을 하지 않는다.** 선행 WO(`cosmetics-guide-gap-enrichment`)가 이미 확보한 식약처 보고 상세와
확정 매칭만 입력으로 쓴다. 1MB 이상 파일은 gzip 으로 보관한다.

```bash
gunzip -k tmp/cosmetics-guide-gap-enrichment/mfds-detail.json.gz tmp/cosmetics-guide-gap-enrichment/mfds-match.json.gz
gunzip -k tmp/cosmetics-mfds-usage-caution/*.gz
```

생성 스크립트: `apps/api-server/src/scripts/cosmetics-mfds-usage-caution/`

```bash
# 0. 운영 DB read-only dump (Cloud SQL Auth Proxy 경유)
psql "<proxy>" -At -c "select row_to_json(t) from (...) t" > tmp/cosmetics-mfds-usage-caution/db-cosmetics-ko-canonical.jsonl

node apps/api-server/src/scripts/cosmetics-mfds-usage-caution/01-census.mjs
node apps/api-server/src/scripts/cosmetics-mfds-usage-caution/02-dry-run.mjs
node apps/api-server/src/scripts/cosmetics-mfds-usage-caution/03-validate.mjs
node tmp/cosmetics-mfds-usage-caution/negative-control.mjs      # 검증기 음성 대조
node apps/api-server/src/scripts/cosmetics-mfds-usage-caution/04-build-apply-sql.mjs
psql "<proxy>" -f tmp/cosmetics-mfds-usage-caution/apply.sql
node apps/api-server/src/scripts/cosmetics-mfds-usage-caution/05-post-verify.mjs
```

| 파일 | 내용 |
|------|------|
| `census-summary.json` | WO §2·§3 대상 재검증 (상세 1,289 / MATCH 1,317 / 현재 usage·caution 상태) |
| `population.json` | 대상 1,317건 본체 (현재 본문 포함) |
| `dry-run-plan.json` | WO §6 적용 계획 1,309건 (before / after / MFDS source key) |
| `dry-run-summary.json` | 판정 집계 |
| `check-queue.json` | 충돌 큐 (0건) |
| `validation.json` | WO §8 독립 검증 (위반 0) |
| `sample-review-60.md` | 계통표본 60건 육안 검수용 |
| `apply.sql` / `rollback.sql` | 적용 · 원복 SQL |
| `apply-log.txt` | 적용 로그 (UPDATE 2,618 / 건너뜀 0) |
| `baseline-before.txt` / `baseline-after.txt` | 적용 전후 구조 지표 |
| `post-verify.json` | WO §9 독립 postVerify (PASS) |
| `negative-control.mjs` | 검증기 음성 대조 — 결함 5종 주입 |
| `probe-*.mjs` | 원문 형태·판정 분포·게이트 오탐 확인 |

## 원복

```bash
psql "<proxy>" -f tmp/cosmetics-mfds-usage-caution/rollback.sql
```

본문이 적용 후 값과 정확히 같을 때만 되돌린다.
`tags->'mfdsUsageBatch' = 'cosmetics-mfds-usage-caution-v1'` 로 이번 배치 대상을 조회할 수 있다.
