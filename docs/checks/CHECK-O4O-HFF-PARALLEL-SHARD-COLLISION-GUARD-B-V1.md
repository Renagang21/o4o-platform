# CHECK — HFF 완결형 병렬 세션 충돌 방지 정비 (Agent B)

- 배경: 2차 배치에서 다중 완결형 세션이 동일 후보 풀을 무조율 소비 → ALREADY_PROMOTED 다발·프록시 포화·300 미달.
- 정비: signature 기반 shard 분리 + 사전승격/canonical 제외를 select 에 내장. read-only smoke · DB write 0.

## 1. 변경

### `hff-combo-select.ts`
- `--shard N --shard-count M`: 정렬 signature 를 `stableHash % M` 로 분리. 내 shard 아닌 조합은 **스캔 없이 빈 결과**(다른 세션 담당) → 교집합 0.
- `--exclude-taken`: 적격 후보 중 (a) `matched_product_master_id` 연결(사전승격) 또는 (b) 그 신고번호 master 에 canonical STORE SPD 존재 → 사전 제외. **ALREADY_PROMOTED·중복 생산 원천 차단**(중복 candidate 행이 matched-NULL 이어도 canonical-SPD 브랜치로 포착).
- `stableHash` = FNV-1a(결정적, Math.random 미사용).

### `hff-combo-shard-plan.ts` (신설)
- 미승격 clean full-set(N>=2) 후보를 1-pass 스캔 → signature 버킷 → `stableHash % count` shard 배정.
- 기생산/불안정(식이섬유·오메가3·루테인 등) signature 제외. 내 shard signature 목록·후보수 산출.
- `--all-shards`: 전 shard 분포 + **signature 다중 배정(교집합) 검증**.

## 2. Smoke (read-only, DB write 0)

| 항목 | 결과 |
|------|------|
| 전수 스캔 | scanned 36,059 · clean 6,512 · **signature 1,160종** |
| shard 분포(count 3) | shard0 348sig/663 · shard1 390sig/777 · shard2 422sig/860 |
| **signature 교집합** | **0** (각 signature 정확히 한 shard — 세션 간 대상 disjoint) |
| select `--shard 1`(내shard 조합) | 정상 실행 · `--exclude-taken` 동작(vc-vd-zn 34 전량 taken 제외) |
| select `--shard 0`(타shard 조합) | **SKIP(빈 결과)** — 교집합 0 보장 |

## 3. 운영 계약

- 완결형 세션은 자기 shard 만 생산: `--shard {id} --shard-count 3 --exclude-taken`.
- shard 배정은 signature 결정적 해시 → 사전 조율/통신 불필요. 두 도구(select·shard-plan) 동일 stableHash.
- taken-exclusion 으로 세션 진행 중 상대가 먼저 생산해도 자동 회피(재선점 0).

*정비 read-only · DB write 0 · path-specific commit(pnpm-lock 미접촉).*
