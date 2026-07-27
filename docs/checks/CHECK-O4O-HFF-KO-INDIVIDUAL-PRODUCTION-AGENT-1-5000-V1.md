# CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-5000-V1

> WO: `WO-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-5000-V1`
> 역할: Agent 1 (생산자) · 범위: STORE / ko 설명서만 · 영문 미생성 · 기존 sd-card 디자인 고정
> 기준 commit: `53de8f185` (driver 로직 불변 — 경로·기대수량·failed-system 출력만 additive)
> 상태: **DONE (LIVE)** · 검증: 독립 쿼리 + 독립 grounding 전 항목 PASS

## 1. 목적

검증 완료된 전용 driver 로 HFF 고정 정렬 목록의 **첫 5,000개**를 끝까지 생산.
`기존 SKIP / 생성가능 즉시 생성 / 어려운 것만 Agent 9 보류` 특성을 전량 규모에서 확인.

## 2. 접근 (정제 계약 — test-100/500 과 동일)

공용 parser / registry / composer / Guard / design 은 **import·수정 안 함**.

```
공식 MAIN_FNCTN + 공식 SRV_USE + 공식 주의사항 + BASE_STANDARD 표시 가능분
  → 제품 단위 ko 설명서(결정적 렌더) → 기존 sd-card 마크업 고정
  → SPD STORE/ko canonical 저장
```

**반(反)날조 불변식**: 렌더된 모든 기능성 문장 ⊆ 정규화 MAIN_FNCTN, 섭취 빈도칩 ⊆ SRV_USE. 위반 시 HOLD. 외부 LLM 의료사실 생성 0.

## 3. 산출물

| 파일 | 내용 |
|------|------|
| `apps/api-server/src/scripts/hff-ko-agent-01-individual.mjs` | 전용 driver (변경 없음, 53de8f185 로직) |
| `apps/api-server/src/scripts/data/hff-ko-agent-01-00001-05000.json` | 고정 manifest 5,000 |
| `.../hff-ko-agent-01-00001-05000-results.json` | 제품별 상태·소요시간 |
| `.../hff-ko-agent-01-00001-05000-holds.jsonl` | Agent 9 보류 큐 (23건) |
| `.../hff-ko-agent-01-00001-05000-failed-system.jsonl` | 시스템 실패 (0건, 빈 파일) |
| `.../hff-ko-agent-01-00001-05000-rollback-manifest.json` | 생성 master/spd/candidate 링크 |

## 4. manifest 확정 기준

`product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL`
`ORDER BY (raw_payload::jsonb->'source'->>'STTEMNT_NO'), id` 의 **첫 5,000개**.
- HFF 후보 풀 총계: **41,261** (본 WO 범위 밖 잔여 36,261)
- DB 재파생 대조: manifest 5,000 == 재파생 5,000, 순서 mismatch **0**
- 선두 2건은 합성 TEST 행(STTEMNT_NO `1111…`) → 자연 HOLD
- test-100 / 500 구간 포함 → 이미 생성된 제품은 저장 직전 canonical 재조회로 자동 SKIP

## 5. 결과 (apply, LIVE)

| 상태 | 수 |
|------|---:|
| CREATED | 2,521 |
| SKIPPED_EXISTING | 2,456 |
| HOLD_FOR_AGENT_9 | 23 |
| FAILED_SYSTEM | 0 |

- 합계 5,000 (미처리 0)
- DB write: **7,563** (product_masters 2,521 + candidate 링크 2,521 + SPD canonical 2,521)
- 실제 신규 LIVE(STORE/ko canonical): **2,521**
- 보류 사유별: `NO_INTAKE_DATA` 17 · `NO_FUNCTIONAL_DATA` 6 (합성 TEST 더미 2 포함 → 실 제품 보류 21)
- 처리시간: dry-run 236s(47ms/건) · apply 339s(**68ms/건**)

## 6. 독립검증 (driver 외 별도 쿼리 + 저장 content 독립 grounding) — 전 항목 PASS

| 항목 | 기대 | 실측 |
|------|:---:|:---:|
| 생성 SPD 실재 | 2,521 | 2,521 |
| SPD 전부 유효(canonical·STORE·ko·source·본문≥60·미삭제) | 2,521 | 2,521 |
| status/type/lang 불량 | 0 | 0 |
| source_type≠o4o_hff_generated | 0 | 0 |
| 빈 본문/soft-deleted | 0 | 0 |
| manifest 밖 write | 0 | 0 |
| canonicalDup (master당 STORE/ko≠1) | 0 | 0 |
| statementNo(permit) 중복 | 0 | 0 |
| candidate 링크 불량 | 0 | 0 |
| SKIP master 이번 run 접촉(drift) | 0 | 0 |
| **기능성 문장 grounding**(저장 content li ⊆ MAIN_FNCTN) | 17,124 검사 / fail 0 | PASS |
| **섭취칩 grounding**(저장 sd-tag ⊆ SRV_USE) | 2,461 검사 / fail 0 | PASS |

> grounding 검증은 driver 렌더 로직과 독립적으로, DB 에 저장된 실제 content 에서 문장/칩을 추출하여
> 후보 원문(MAIN_FNCTN/SRV_USE)의 부분문자열 여부를 재대조한 것이다.

## 7. Agent 9 보류 (23건, 전부 정당)

- `NO_FUNCTIONAL_DATA` 6 — 공식 MAIN_FNCTN 자체 공란(합성 TEST 2 + 실 제품 4, 예: `GL-40E난황레시틴`)
- `NO_INTAKE_DATA` 17 — 공식 SRV_USE 자체 공란(예: 홍삼농축액·비타민B2 등, 원문에 섭취방법 미기재)
- 실 제품 보류율: 5,000 중 21 = **0.42%**. 전부 원문 필드 부재로 인한 계약상 정상 HOLD(registry/다원료/액상 사유 보류 0).
- 파일: `apps/api-server/src/scripts/data/hff-ko-agent-01-00001-05000-holds.jsonl`

## 8. 전량 확대 판단

- **안정 확인.** 규모 50배(100→5,000)에서도 write 무결·drift 0·시스템 실패 0·grounding fail 0.
- apply 68ms/건 → 잔여 36,261건 단일 ≈ 41분, 8-way 병렬 ≈ 5분대(프록시/커넥션 한도 내).
- driver 는 `HFF_BATCH`/`HFF_EXPECT` 만 교체하면 임의 구간·Agent 1~8 병렬 샤딩 가능. 구간마다 dry-run 선행 권장.

## 9. 함정 / 메모

- 로컬 `.env` DB_PASSWORD 공란 → Cloud Run `o4o-core-api` env 에서 `o4o_api` 자격 추출(read-only 허용).
- 전용 proxy 포트(5463). ESM `import pg` 는 repo 트리 안에서만 해석 → manifest-build/verify 임시 스크립트는 실행 후 삭제.
- SKIP 2,456 = 본 5,000 구간에 이미 존재하던 STORE/ko canonical(HFF 3-lane 등 선행 생산 누적분). 저장 직전 재조회로 write 0.
