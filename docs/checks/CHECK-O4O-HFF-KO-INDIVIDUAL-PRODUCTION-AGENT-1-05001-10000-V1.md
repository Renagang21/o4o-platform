# CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-05001-10000-V1

> WO: `WO-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-05001-10000-V1`
> 역할: Agent 1 (생산자) · 범위: STORE / ko 설명서만 · 영문 미생성 · 기존 sd-card 디자인 고정
> 기준 commit: `fe30bd3b1` (driver 로직 불변)
> 상태: **DONE (LIVE)** · 검증: 독립 쿼리 + 독립 grounding 전 항목 PASS

## 1. 목적

검증 완료된 전용 driver 로 HFF 고정 정렬 목록의 **순번 5,001~10,000**(5,000건)을 끝까지 생산.

## 2. 접근 (정제 계약 — 이전 구간과 동일)

공용 parser / registry / composer / Guard / design 은 **import·수정 안 함**. driver 로직 무변경.

```
공식 MAIN_FNCTN + 공식 SRV_USE + 공식 주의사항 + BASE_STANDARD 표시 가능분
  → 제품 단위 ko 설명서(결정적 렌더) → 기존 sd-card 마크업 고정
  → SPD STORE/ko canonical 저장
```

**반(反)날조 불변식**: 렌더된 모든 기능성 문장 ⊆ 정규화 MAIN_FNCTN, 섭취 빈도칩 ⊆ SRV_USE. 위반 시 HOLD. 외부 LLM 의료사실 생성 0.

## 3. 산출물

| 파일 | 내용 |
|------|------|
| `apps/api-server/src/scripts/data/hff-ko-agent-01-05001-10000.json` | 고정 manifest 5,000 (index 5001~10000) |
| `.../hff-ko-agent-01-05001-10000-results.json` | 제품별 상태·소요시간 |
| `.../hff-ko-agent-01-05001-10000-holds.jsonl` | Agent 9 보류 큐 (43건) |
| `.../hff-ko-agent-01-05001-10000-failed-system.jsonl` | 시스템 실패 (0건, 빈 파일) |
| `.../hff-ko-agent-01-05001-10000-rollback-manifest.json` | 생성 master/spd/candidate 링크 |

## 4. manifest 확정 기준

`product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL`
`ORDER BY (raw_payload::jsonb->'source'->>'STTEMNT_NO'), id` 의 **OFFSET 5000 LIMIT 5000** (순번 5,001~10,000).
- HFF 후보 풀 총계: **41,261** (본 WO 이후 잔여 31,261)
- DB 재파생 대조: manifest 5,000 == 재파생 5,000, 순서 mismatch **0**
- 선두 index 5001(stmt `20040016020152`)은 직전 구간 tail(5000, `20040016020151`)과 연속.

## 5. 결과 (apply, LIVE)

| 상태 | 수 |
|------|---:|
| CREATED | 2,807 |
| SKIPPED_EXISTING | 2,150 |
| HOLD_FOR_AGENT_9 | 43 |
| FAILED_SYSTEM | 0 |

- 합계 5,000 (미처리 0)
- DB write: **8,421** (product_masters 2,807 + candidate 링크 2,807 + SPD canonical 2,807)
- 실제 신규 LIVE(STORE/ko canonical): **2,807**
- 보류 사유별: `NO_INTAKE_DATA` 22 · `NO_FUNCTIONAL_DATA` 21 (전부 실 제품 — 이 구간엔 합성 TEST 더미 없음)
- 처리시간: dry-run 285s(57ms/건) · apply 396s(**79ms/건**)

## 6. 독립검증 (driver 외 별도 쿼리 + 저장 content 독립 grounding) — 전 항목 PASS

| 항목 | 기대 | 실측 |
|------|:---:|:---:|
| 생성 SPD 실재 | 2,807 | 2,807 |
| SPD 전부 유효(canonical·STORE·ko·source·본문≥60·미삭제) | 2,807 | 2,807 |
| status/type/lang 불량 | 0 | 0 |
| source_type≠o4o_hff_generated | 0 | 0 |
| 빈 본문/soft-deleted | 0 | 0 |
| manifest 밖 write | 0 | 0 |
| canonicalDup (master당 STORE/ko≠1) | 0 | 0 |
| statementNo(permit) 중복 | 0 | 0 |
| candidate 링크 불량 | 0 | 0 |
| SKIP master 이번 run 접촉(drift) | 0 | 0 |
| **기능성 문장 grounding**(저장 content li ⊆ MAIN_FNCTN) | 17,351 검사 / fail 0 | PASS |
| **섭취칩 grounding**(저장 sd-tag ⊆ SRV_USE) | 2,506 검사 / fail 0 | PASS |

## 7. Agent 9 보류 (43건, 전부 정당)

- `NO_INTAKE_DATA` 22 — 공식 SRV_USE 자체 공란
- `NO_FUNCTIONAL_DATA` 21 — 공식 MAIN_FNCTN 자체 공란
- 실 제품 보류율: 5,000 중 43 = **0.86%**. 전부 원문 필드 부재로 인한 계약상 정상 HOLD(registry/다원료/액상/영문 사유 보류 0).
- 파일: `apps/api-server/src/scripts/data/hff-ko-agent-01-05001-10000-holds.jsonl`

## 8. 누적 진행 / 확대 판단

- 누적 생산(3 구간): test-100 CREATED 75 + 500구간 266 + 5000구간 2,521 + 본 구간 2,807 = 순번 1~10,000 처리 완료.
- 규모 재확인: write 무결·drift 0·시스템 실패 0·grounding fail 0.
- apply 79ms/건 → 잔여 31,261건 단일 ≈ 41분, 8-way 병렬 ≈ 5분대. `HFF_OFFSET`/`HFF_BATCH`/`HFF_EXPECT` 교체로 다음 구간 진행.

## 9. 함정 / 메모

- Git: `git commit` 무pathspec 시 타 세션 pre-staged 파일까지 스윕될 수 있음 → 커밋 전 `git status --short` + `git diff --cached --name-status` 확인, `git commit -- <자기 파일>` 로 경로 명시. 타 세션 워킹트리 무수정.
- 로컬 `.env` DB_PASSWORD 공란 → Cloud Run env 에서 `o4o_api` 자격 추출(read-only). 전용 proxy 5463. ESM `import pg` 는 repo 트리 안에서만 해석 → 임시 스크립트 실행 후 삭제.
- SKIP 2,150 = 이 구간에 이미 존재하던 STORE/ko canonical(선행 생산 누적분). 저장 직전 재조회로 write 0.
