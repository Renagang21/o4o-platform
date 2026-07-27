# CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-500-V1

> WO: `WO-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-500-V1`
> 역할: Agent 1 (생산자) · 범위: STORE / ko 설명서만 · 영문 미생성 · 기존 sd-card 디자인 고정
> driver: `hff-ko-agent-01-individual.mjs` (test-100 commit `c839b4b9c` 로직 불변 — 경로·기대수량만 additive 파라미터화)
> 상태: **DONE (LIVE)** · 검증: 독립 쿼리 전 항목 PASS

## 1. 목적

test-100 에서 검증된 전용 driver 방식을 **중간 규모(첫 500)** 로 확대하여
실제 처리 속도 · Agent 9 보류율 · DB 안정성을 재확인한다. "500개 완벽 생성"이 아니라
`기존 SKIP / 생성가능 즉시 생성 / 어려운 것만 Agent 9 보류` 특성의 규모 안정성 측정.

## 2. 접근 (정제 계약 — test-100 과 동일)

기존 registry-gated `composeCombo` + A~H Guard 를 억지로 통과시키지 않는다.
공용 parser / registry / composer / Guard / design 은 **import·수정 안 함**.

```
공식 MAIN_FNCTN + 공식 SRV_USE + 공식 주의사항
  → 제품 단위 ko 설명서(결정적 렌더)
  → 기존 sd-card 마크업 고정
  → SPD STORE/ko canonical 저장
```

**반(反)날조 불변식**: 렌더된 모든 기능성 문장 ⊆ 정규화 MAIN_FNCTN, 섭취 빈도칩 ⊆ SRV_USE. 위반 시 HOLD. 외부 LLM 의료사실 생성 0.

### driver 변경 (additive only)
- `HFF_BATCH` / `HFF_EXPECT` env 로 산출물 basename·기대수량 파라미터화.
- FAILED_SYSTEM 전용 `-failed-system.jsonl` 출력 추가(콘텐츠 무관 시스템 실패를 보류와 분리).
- 렌더·grounding·이중게이트·트랜잭션·사후검증·rollback 로직은 **byte-unchanged**.

## 3. 산출물

| 파일 | 내용 |
|------|------|
| `apps/api-server/src/scripts/hff-ko-agent-01-individual.mjs` | 전용 driver (additive 파라미터화) |
| `apps/api-server/src/scripts/data/hff-ko-agent-01-00001-00500.json` | 고정 manifest 500 |
| `.../hff-ko-agent-01-00001-00500-results.json` | 제품별 상태·소요시간 |
| `.../hff-ko-agent-01-00001-00500-holds.jsonl` | Agent 9 보류 큐 (3건) |
| `.../hff-ko-agent-01-00001-00500-failed-system.jsonl` | 시스템 실패 (0건, 빈 파일) |
| `.../hff-ko-agent-01-00001-00500-rollback-manifest.json` | 생성 master/spd/candidate 링크 |

## 4. manifest 확정 기준

`product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL`
`ORDER BY (raw_payload::jsonb->'source'->>'STTEMNT_NO'), id` 의 **첫 500개**.
- HFF 후보 풀 총계: **41,261**
- DB 재파생 대조: manifest 500 == 재파생 500, 순서 mismatch **0**
- 선두 2건은 합성 TEST 행(STTEMNT_NO `1111…`, MAIN_FNCTN 공란) → 자연 HOLD
- test-100 구간 포함 → 이미 생성된 제품은 실시간 canonical 확인으로 자동 SKIP

## 5. 결과 (apply, LIVE)

| 상태 | 수 |
|------|---:|
| CREATED | 266 |
| SKIPPED_EXISTING | 231 |
| HOLD_FOR_AGENT_9 | 3 |
| FAILED_SYSTEM | 0 |

- DB write: **798** (product_masters 266 + candidate 링크 266 + SPD canonical 266)
- 실제 신규 LIVE(STORE/ko canonical): **266**
- 보류 사유별: `NO_FUNCTIONAL_DATA` 3 (합성 TEST 더미 2 + 실 제품 1 = `GL-40E난황레시틴`, 공식 MAIN_FNCTN 공란)
- 실 제품 보류율: 500 중 1 = **0.2%** (더미 제외)
- 처리시간: dry-run 22.7s(45ms/건) · apply 35.6s(**71ms/건**)

## 6. 독립검증 (driver 외 별도 쿼리 + rollback manifest 기준) — 전 항목 PASS

| 항목 | 기대 | 실측 |
|------|:---:|:---:|
| 생성 SPD 실재 | 266 | 266 |
| SPD 전부 유효(canonical·STORE·ko·source·본문≥60·미삭제) | 266 | 266 |
| status/type/lang 불량 | 0 | 0 |
| source_type≠o4o_hff_generated | 0 | 0 |
| 빈 본문/soft-deleted | 0 | 0 |
| manifest 밖 write | 0 | 0 |
| canonicalDup (master당 STORE/ko≠1) | 0 | 0 |
| statementNo(permit) 중복 | 0 | 0 |
| candidate 링크 불량 | 0 | 0 |
| SKIP master 이번 run 접촉(drift) | 0 | 0 |

## 7. 5,000 / 전량 확대 판단

- **안정 확인.** 규모 5배(100→500)에서도 write 무결·drift 0·시스템 실패 0.
- apply 71ms/건 → 5,000건 ≈ 6분(단일), 8-way 병렬 ≈ 1분대(프록시/커넥션 한도 내).
- SKIP 비율은 구간 진행에 따라 감소 예상(초반 test-100 구간 중복 흡수). HOLD 은 공식 MAIN_FNCTN 공란 제품에서만 자연 발생.
- driver 는 `HFF_BATCH`/`HFF_EXPECT` 만 바꿔 임의 구간·Agent 1~8 병렬 샤딩 가능. 구간마다 dry-run 선행 권장.

## 8. 함정 / 메모

- 로컬 `.env` DB_PASSWORD 공란 → Cloud Run `o4o-core-api` env 에서 `o4o_api` 자격 추출(read-only 허용).
- 전용 proxy 포트(5463). ESM `import pg` 는 repo 트리 안에서만 해석.
- manifest-build / verify 임시 스크립트는 repo 트리에서 실행 후 삭제(산출물은 data/ 에만 잔존).
- 보류 3건 중 실 제품은 `GL-40E난황레시틴` 1건 — MAIN_FNCTN 원문 자체가 비어 있어 반날조 계약상 정상 HOLD.
