# cosmetics-guide-gap-enrichment 산출물

`WO-O4O-COSMETICS-GUIDE-GAP-ENRICHMENT-FULL-V1` 산출물이다.
판정 요약은 [CHECK-O4O-COSMETICS-GUIDE-GAP-ENRICHMENT-FULL-V1](../../docs/checks/CHECK-O4O-COSMETICS-GUIDE-GAP-ENRICHMENT-FULL-V1.md) 참조.

선행 산출물과 같은 규칙으로 **1MB 이상 파일은 gzip 으로 보관**한다. 스크립트는 평문 `.json` 을 읽으므로 재실행 전에 푼다:

```bash
gunzip -k tmp/cosmetics-retail-census/*.gz            # 선행 census (입력)
gunzip -k tmp/cosmetics-guide-production/*.gz         # 선행 생산 (입력)
gunzip -k tmp/cosmetics-guide-gap-enrichment/*.gz
```

생성 스크립트: `apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/`

```bash
# 0. 운영 DB read-only dump (Cloud SQL Auth Proxy 경유)
psql "<proxy>" -At -c "select row_to_json(t) from (...) t" > tmp/cosmetics-guide-gap-enrichment/db-cosmetics-ko-canonical.jsonl

node apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/01-census.mjs
node apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/02-render-integrity.mjs
node apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/03-mfds-match.mjs
node apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/04-fetch-mfds-detail.mjs   # 외부 수집 (식약처)
node apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/05-type-triage.mjs
node apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/06-dry-run.mjs
node apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/07-validate.mjs
node apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/08-build-apply-sql.mjs
psql "<proxy>" -f tmp/cosmetics-guide-gap-enrichment/apply.sql                              # 운영 반영
node apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/09-post-verify.mjs
node apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/10-source-availability.mjs
node apps/api-server/src/scripts/cosmetics-guide-gap-enrichment/11-efficiency.mjs
```

| 파일 | 내용 |
|------|------|
| `census-summary.json` | WO §2 결손 census — 문서 수 / issue 수 / 소스 구성 |
| `gap-population.json` | 결손 모집단 **17,157건** 본체 |
| `render-integrity.json` | 선행 설명서 객체 ↔ 운영 본문 일치 실측 (32,335 일치 / 337 불일치) |
| `source-availability.json` | WO §3 외부 원천 접근성 실측 (7개 시도 · 1개 사용 가능) |
| `mfds-match.json` | WO §4 식약처 기능성 보고 제품 매칭 (MATCH 1,317) |
| `mfds-detail.json` | 보고 상세 1,289건 (효능효과 · 용법용량 · 사용상의주의사항) |
| `type-triage.json` | WO §6 `TYPE_NAME_MISMATCH` 8,233건 재분류 |
| `dry-run-plan.json` | WO §8 적용 계획 3,297건 (before / after / 근거) |
| `dry-run-summary.json` | dry-run 집계 |
| `check-queue.json` | 사람 확인 큐 4,471건 |
| `validation.json` | WO §9 독립 검증 결과 (위반 0) |
| `sample-review-100.md` | 계통표본 100건 육안 검수용 |
| `apply.sql` / `rollback.sql` | 적용 · 원복 SQL |
| `apply-log.txt` | 적용 로그 (UPDATE 6,749 / 0건 건너뜀) |
| `baseline-before.txt` / `baseline-after.txt` | 적용 전후 구조 지표 |
| `post-verify.json` | WO §11 독립 postVerify (PASS) |
| `efficiency.json` | WO §12 효율 기록 |
| `negative-control.mjs` | 검증기 음성 대조 — 결함을 주입해 검증기가 잡는지 확인 |
| `probe-*.mjs` | 원천 접근성·수집 속도·보완 여유분 탐침 (재현용) |

## 원복

```bash
psql "<proxy>" -f tmp/cosmetics-guide-gap-enrichment/rollback.sql
```

본문은 적용 후 값과 정확히 같을 때만 되돌리므로, 이후 다른 작업이 손댄 건은 건드리지 않는다.
`tags->'enrichBatch' = 'cosmetics-gap-enrichment-v1'` 로 이번 배치 대상을 조회할 수 있다.
