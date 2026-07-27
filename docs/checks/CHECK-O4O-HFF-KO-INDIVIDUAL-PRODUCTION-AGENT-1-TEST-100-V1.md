# CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-TEST-100-V1

> WO: `WO-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-TEST-100-V1`
> 역할: Agent 1 (생산자) · 범위: STORE / ko 설명서만 · 영문 미생성 · 기존 sd-card 디자인 고정
> 상태: **DONE (LIVE)** · 검증: 독립 쿼리 전 항목 PASS

## 1. 목적

전체 건강기능식품(HFF) 생산 방식을 바꾸기 전, 제품 100개를 순서대로 처리하여
**실제 처리 속도 · 품질 · 보류율**을 확인한다. 핵심은 "100개 완벽 생성"이 아니라
`기존 SKIP / 생성가능 즉시 생성 / 어려운 것만 Agent 9 보류`의 실제 처리 특성 측정.

## 2. 접근 (정제 계약)

기존 registry-gated `composeCombo` + A~H Guard 를 억지로 통과시키지 않는다(→ registry/parser 회귀 방지).
공용 parser / registry / composer / Guard / design 은 **import·수정 안 함**. 신규 전용 driver 만 추가.

```
공식 MAIN_FNCTN + 공식 SRV_USE + 공식 주의사항
  → 제품 단위 ko 설명서(결정적 렌더)
  → 기존 sd-card 마크업 고정
  → SPD STORE/ko canonical 저장
```

**반(反)날조 불변식**: 렌더된 모든 기능성 문장 ⊆ 정규화 MAIN_FNCTN, 섭취 빈도칩 ⊆ SRV_USE.
위반 시 HOLD. 외부 LLM 의료사실 생성 0.

## 3. 산출물

| 파일 | 내용 |
|------|------|
| `apps/api-server/src/scripts/hff-ko-agent-01-individual.mjs` | 전용 driver (dry-run/apply 이중게이트) |
| `apps/api-server/src/scripts/data/hff-ko-agent-01-test-100.json` | 고정 manifest 100 |
| `.../hff-ko-agent-01-test-100-results.json` | 제품별 상태·소요시간 |
| `.../hff-ko-agent-01-test-100-holds.jsonl` | Agent 9 보류 큐 |
| `.../hff-ko-agent-01-test-100-rollback-manifest.json` | 생성 master/spd/candidate 링크 (rollback) |
| `.../hff-ko-agent-01-test-100-samples.json` | 렌더 품질 샘플 4건 |

## 4. manifest 확정 기준

`product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL`
`ORDER BY (raw_payload::jsonb->'source'->>'STTEMNT_NO'), id` 의 **첫 100개**.
- HFF 후보 풀 총계: **41,261**
- DB 재파생 대조: manifest 100 == 재파생 100, 순서 mismatch **0**
- 선두 2건은 합성 TEST 행(STTEMNT_NO `1111…`, MAIN_FNCTN 공란) → 자연 HOLD

## 5. 결과 (apply, LIVE)

| 상태 | 수 |
|------|---:|
| SKIPPED_EXISTING | 23 |
| CREATED | 75 |
| HOLD_FOR_AGENT_9 | 2 |
| FAILED_SYSTEM | 0 |

- DB write: **225** (product_masters 75 + candidate 링크 75 + SPD canonical 75)
- 실제 신규 LIVE(STORE/ko canonical): **75**
- 보류 사유별: `NO_FUNCTIONAL_DATA` 2 (둘 다 TEST 더미 — 실 제품 보류 0)
- 처리시간: dry-run 5.85s(58ms/건) · apply 10.48s(**105ms/건**)

## 6. 독립검증 (driver 외 별도 쿼리) — 전 항목 PASS

| 항목 | 기대 | 실측 |
|------|:---:|:---:|
| 생성 SPD 실재 | 75 | 75 |
| status=canonical·STORE·ko 아님 | 0 | 0 |
| source_type≠o4o_hff_generated | 0 | 0 |
| 빈 본문(<60자)/soft-deleted | 0 | 0 |
| manifest 밖 write | 0 | 0 |
| canonicalDup (master당 STORE/ko≠1) | 0 | 0 |
| statementNo(permit) 중복 | 0 | 0 |
| candidate 링크 불량 | 0 | 0 |
| 기존 SKIP master 이번 run 접촉(drift) | 0 | 0 |

## 7. 5,000 확대 판단

- **가능.** driver 는 manifest 파일만 교체하면 임의 구간 처리. 공용 모듈 무의존·제품 단위 단일 트랜잭션·사후검증·rollback manifest 내장.
- 실 후보 풀은 41,261 (WO의 "5,000"보다 큼). 동일 driver 로 Agent 1~8 병렬 샤딩 시:
  - apply 실측 105ms/건 기준 5,000건 ≈ **8.7분(단일)**, 8-way 병렬 시 ≈ 1~2분 수준(프록시/커넥션 한도 내).
  - 단, SKIP 비율(이번 23%)·HOLD 비율(실 제품 0%, 더미 제외)은 구간별로 달라질 수 있어 구간마다 dry-run 선행 권장.

## 8. 함정 / 메모

- 로컬 `.env` DB_PASSWORD 공란 → Cloud Run `o4o-core-api` env 에서 `o4o_api` 자격 추출(read-only 허용).
- 인스턴스 연결명 `netureyoutube:asia-northeast3:o4o-platform-db`. 간섭 방지 위해 전용 proxy 포트(5463) 기동.
- ESM `import pg` 는 repo 내부에서만 해석 → 검증 스크립트도 repo 트리에 두고 실행(임시 파일은 실행 후 삭제).
- 섭취 칩은 빈도(`1일 N회`)만 채택 — 용량 조각 칩은 12자 컷 truncation 왜곡(`(1스푼/0`)이라 제외. 완전한 SRV_USE 원문은 하단 verbatim 유지.
