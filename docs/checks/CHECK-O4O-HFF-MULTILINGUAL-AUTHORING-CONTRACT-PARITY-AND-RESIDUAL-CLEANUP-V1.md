# CHECK — WO-O4O-HFF-MULTILINGUAL-AUTHORING-CONTRACT-PARITY-AND-RESIDUAL-CLEANUP-V1

- 실행 일자: 2026-07-31
- 대상: 건강기능식품(HFF) 매장용 설명서 canonical — KO 40,913 / EN 15,498
- 환경: 프로덕션 Cloud SQL `netureyoutube:asia-northeast3:o4o-platform-db` / DB `o4o_platform`
- 판정: **PASS** (독립 검증 `hff-wo-independent-verification-v1.json` verdict = PASS)

---

## 1. 범위와 결과 요약

| Phase | 내용 | 대상 | 적용 | 잔여(HOLD) |
|---|---|---:|---:|---:|
| 1 | ko COMPOSITE 변종 — `이런 분께` 제거 + 전문가 안내 보완 | 127 | **127** | 0 |
| 2 | ko 기능성 섹션 부재 — 사람 경계 판정 후 복구 | 13 | **11** | 2 |
| 3 | 사람 검토 큐 v2 재구성 | — | — | 4,544 |
| 4 | EN canonical 정합 (sd-who 제거 / 전문가 안내 / 기능성) | 15,498 | **15,498** | 824 |
| 5 | EN 짝 없는 KO — 정책 판정 모집단 확정 | 25,415 | 0 (생성 금지) | 25,415 |

DB row 수 변동 없음: `shared_product_descriptions` 120,118 → 120,118.

---

## 2. Phase 1 — ko COMPOSITE 변종 127

- **원인**: 직전 WO 의 family 판정이 `content LIKE '%왜 이 제품인가%'` 문자열 조건이어서, 해당 h2 만 없는
  COMPOSITE 문서 127건이 모집단에서 빠졌다. 공유 class(`sd-item`/`sd-why`/`sd-func`)만으로는 family 를 가릴 수 없다.
- **재판정**: h2 시그널 집합으로 전건 재판정 → 127/127 COMPOSITE. `이런 분께 127` 과 `전문가 안내 부재 127` 은
  두 결함이 아니라 **동일한 127행**이었다.
- **적용**: 기존 왜-family 정책 patch 계약 그대로 재사용(AUD 제거 + FOOT 표준 절 추가). 기능성 섹션은 미변경
  (`fnSectionTextUnchanged` 전건 참).
- 결과: `audience 127 → 0`, `no_expert 127 → 0`, `no_fn` 변동 없음.

## 3. Phase 2 — ko 기능성 섹션 부재 13

- 전건 사람 판정. 확정 11건만 적용, 불확정 2건은 최종 큐 유지.
  - HOLD `유렉스` — `UNLABELED_TEXT_OUTSIDE_GROUPS`
  - HOLD `쾌변엔 천둥이 더블케어` — `CLAUSE_NOT_VERBATIM` (`(국문)` 마커 제거 시 공식 원문과 연속 일치하지 않음)
- 그룹 내부는 쪼개지 않았다. 말미의 "…에 도움을 줄 수 있음" 이 `•` 분절에 **분배 적용**되므로,
  분할하면 공식 원문에 없는 문장을 만들게 된다.
- **렌더 게이트가 실제 결함을 잡았다**: 단일 그룹을 라벨 없는 `sd-why` 평면 목록으로 렌더하면
  개별인정 원료명·인정번호가 통째로 사라진다(초기 렌더 `labelMissing: 9`). 라벨이 있으면 그룹 수와 무관하게
  `sd-func` 라벨 보존 형태로 고정하여 재검증 PASS.
- 결과: `no_fn 13 → 2`, 기능성 절 20개 복구.

## 4. Phase 4 — EN canonical 15,498 정합

공식 근거 기준을 먼저 확정한 뒤 **근거가 있는 대상만** 수정했다.

| 작업 | 대상 | 근거 |
|---|---:|---|
| `sd-who` 섹션 제거 (AUD) | 15,498 | 삭제 전용 — 문구 생성 없음. KO 에서 확정된 저작 정책의 EN 대응 |
| 전문가 안내 절 추가 (FOOT) | 13,955 | **기존 EN canonical 1,543건에 이미 존재하던 문구를 verbatim 재사용** |
| 기능성 섹션 삽입 (FN) | **2** | 공식 원문 `(영문)` 구간이 **모든 원료 그룹을 빠짐없이 커버**하는 건만 |

- 재사용한 EN 문구(신규 번역 아님):
  `· This health functional food is not a drug for preventing or treating disease; consult a pharmacist or professional in store`
- 기능성 h2 부재 826건의 근거 판정:
  - `SAFE_EN_FUNCTION_APPLY` 2
  - `HOLD:EN_GROUNDING_PARTIAL_1_OF_2_GROUPS` 5 — 일부 원료만 영문 표기. 부분 게시는 기능성을 축소 표기하므로 HOLD
  - `HOLD:NO_OFFICIAL_EN_GROUNDING` 819 — 공식 원문이 국문 전용
- KO 문구 기계 번역 0건. EN 라벨은 공식 원문상 한국어이므로 EN 문서에 넣지 않고 무라벨 목록으로 렌더했다
  (삽입 섹션 한글 유입 0 — 독립 검증 실측).
- 결과: `en_who 15,498 → 0`, `en_no_expert 13,955 → 0`, `en_no_fn 826 → 824`.

### 4-1. 발견한 함정 2건

1. **역연산 앵커 결함** — `sd-who` 를 `sd-foot` 직전 앵커로 되돌리면 271건이 원문 복원에 실패한다
   (해당 문서는 `sd-who` 위치가 다르다). 역연산을 **제거 오프셋 기반**으로 바꿔 15,498건 전건 `reversible` 확보.
2. **`For guardians` 오탐** — 이 문구는 제품 메타(`sd-meta`)에도 쓰인다. 대상 섹션 판정을 h2 로 좁혀야 한다.

---

## 5. Phase 3 — 최종 사람 검토 큐 v2

- 원본 큐 3,858 → delta 상태상 **해결 139건 영구 제외**.
- 후속 WO delta 미해결·Agent 9 HOLD·이번 WO HOLD 를 canonicalId 기준으로 dedup.
- **`scheduledOnce: true`** — 4,544 rows / unique canonicalId 4,544 (중복 예약 0).

| track | rows |
|---|---:|
| `THIS_WO_HOLD` | 826 (ko 2 + en 824) |
| `DELTA_STILL_PENDING` | 50 |
| `ORIGINAL_QUEUE` | 3,668 |
| 합계 | **4,544** (ko 3,720 / en 824) |

이번 WO 가 손댄 행이라는 이유로 큐에서 빼지 않았다. 127건은 `이런 분께`·전문가 안내만 수정했고 기능성 문구는
변경하지 않았으므로, 기능성 사유의 검토 필요는 그대로 남는다. 해당 행은 `alsoModifiedInThisWo` 플래그(850건)로
표시해 동일 canonical 재수정 여부를 사람이 판단하게 했다.

## 6. Phase 5 — EN 짝 없는 KO 25,415

정책 판정 모집단으로만 확정했다. 이번 WO 에서 EN 생성 **0건**.
산출물: `hff-en-pairless-ko-population-v1.jsonl` (status `POLICY_DECISION_REQUIRED`).

---

## 7. 안전 계약 이행

- 단일 트랜잭션 + 행별 낙관적 잠금(`encode(sha256(convert_to(content,'UTF8')),'hex')` 일치) + `rowCount === 1` 강제
- 트랜잭션 내 전건 sha256 재검증, 스냅샷 불변식(전체 row 수·타 언어 카운터 불변) 위반 시 즉시 ROLLBACK
- 이중 게이트: `--apply` 플래그 + 전용 env (`HFF_COMPOSITE127_APPLY_CONFIRM` / `HFF_RESIDUAL13_APPLY_CONFIRM` / `HFF_EN_PARITY_APPLY_CONFIRM`)
- 렌더 게이트 통과 전 apply 차단. EN 은 15,498 전량 브라우저 렌더가 비현실적이므로 **구조 시그니처 전수 커버**로 정의:
  시그니처 47종 / 47종 커버, FN 삽입 문서는 전건 렌더, 3 viewport(430·820·1280) 420 checks, 실패 0
- 조사 세션은 전부 `SET default_transaction_read_only = on` + `SHOW transaction_read_only` 확인 후 질의
- 자격증명은 코드·JSON·JSONL·로그·CHECK·Git diff·명령 인자 어디에도 남기지 않았다

## 8. 독립 검증 (`hff-wo-independent-verification-v1.json`)

적용 스크립트 내부 상태를 신뢰하지 않고 DB 를 재측정했다. **verdict = PASS**.

| 항목 | 기대 | 실측 |
|---|---:|---:|
| `spd_all` | 120,118 | 120,118 |
| `ko_total` / `ko_audience` / `ko_no_expert` / `ko_no_fn` | 40,913 / 0 / 0 / 2 | 동일 |
| `en_total` / `en_who` / `en_expert_exact` / `en_no_fn` | 15,498 / 0 / 15,498 / 824 | 동일 |
| rollback manifest 해시 일치 | 127 / 11 / 15,498 | 전건 `matchesNewHash`, mismatch 0 |
| EN 기능성 삽입 문서 한글 유입 | 0 | 0 |
| 최종 큐 행 존재 | 4,544 | 4,544 (DB 미존재 0) |

## 9. 산출물

```
apps/api-server/src/scripts/
  hff-ko-composite-variant-127-{inspect,build,render,apply}.mjs
  hff-ko-residual-13-{decide-build,render,apply}.mjs
  hff-en-parity-{audit,probe,build,render,apply}.mjs
  hff-final-review-queue-v2-build.mjs
  hff-wo-independent-verification.mjs
apps/api-server/src/scripts/data/
  hff-ko-composite-variant-127-*-v1.json
  hff-ko-residual-13-*-v1.json(l)
  hff-en-parity-{audit,probe,targets,rollback,render-audit,apply-results}-v1.json
  hff-en-parity-final-queue-v1.jsonl
  hff-en-function-missing-inventory-v1.jsonl
  hff-final-review-queue-v2.jsonl / -summary.json
  hff-en-pairless-ko-population-v1.jsonl
  hff-wo-independent-verification-v1.json
```

## 10. 남은 일 (다음 판정 대상)

1. EN 기능성 HOLD 824 — 공식 EN 원문 확보 여부가 선행 조건. 확보 전 생성 금지
2. KO 기능성 HOLD 2 — 원문 경계가 모호한 건, 사람 최종 판정 필요
3. 사람 검토 큐 4,544 — 트랙별 처리 순서 결정
4. EN 짝 없는 KO 25,415 — 생성 여부 자체가 정책 판정 사안
