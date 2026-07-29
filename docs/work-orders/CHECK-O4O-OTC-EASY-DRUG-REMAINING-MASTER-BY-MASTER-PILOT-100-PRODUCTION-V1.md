# CHECK — WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-PRODUCTION-V1

> 잔여 3,809 제품별 생산 pilot 100 — **가 에이전트 제품별 독립 생산 실제 시험**
>
> 선행 WO: `WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-QUEUE-V1` (commit `324823745`)
> 실행 에이전트: **agent-ga (유일 LIVE DB write 소유자)** · 실행일 2026-07-29 · batchId `otc-v4-pilot-100`

---

## 1. 결론

| 항목 | 결과 |
|------|------|
| 처리 | **100/100** (중단 0) |
| GREEN (LIVE 반영) | **80** |
| EXCEPTION (제품별 격리) | **20** |
| SKIP | 0 (1차) / **80** (재실행) |
| DB write | KO 320 + EN 160 = **480** = 계약 기대치 (GREEN 80 × 6T) |
| 실패 제품 write | **0** (잔여물 0) |
| 재실행 신규 write | **0** |
| 독립검증 | **PASS 24/24** |
| 시스템 중지 조건(SYS-01~SYS-12) | **발생 0** |
| **500 확대 판정** | **`APPROVED_FOR_PILOT_500`** (EXP-01~EXP-11 전부 PASS) |

WO 가 가장 중요하다고 명시한 세 수치는 모두 충족되었다 — **실패 제품 DB write 0 · 실패 후 생산 계속 · 재실행 중복 반영 0**.

---

## 2. 실행 계층

| 단계 | 산출물 |
|------|--------|
| 계약 | [otc-v4-master-leaflet-contract.ga.ts](../../apps/api-server/src/scripts/otc-v4-master-leaflet-contract.ga.ts) — sourceRef `otc-v4-master-leaflet:<masterId>`, 6섹션 파서, route 확정(gencode → 공식 용법 원문, 임의 선택 금지) |
| 원문 수집·게이트 | [otc-v4-pilot-100-prep.ga.ts](../../apps/api-server/src/scripts/otc-v4-pilot-100-prep.ga.ts) |
| KO 저작 / EN 저작 | [otc-v4-pilot-100-author.ga.ts](../../apps/api-server/src/scripts/otc-v4-pilot-100-author.ga.ts) · [otc-v4-pilot-100-tm-merge.ga.ts](../../apps/api-server/src/scripts/otc-v4-pilot-100-tm-merge.ga.ts) |
| 제품별 실행기 | [otc-v4-pilot-100-executor.ga.ts](../../apps/api-server/src/scripts/otc-v4-pilot-100-executor.ga.ts) — dry-run / rollback-test / APPLY |
| 독립검증 | [otc-v4-pilot-100-independent-verify.ga.ts](../../apps/api-server/src/scripts/otc-v4-pilot-100-independent-verify.ga.ts) — **생산 실행기와 분리된 코드 경로** |
| 확대 판정 | [otc-v4-pilot-100-expansion-verdict.ga.ts](../../apps/api-server/src/scripts/otc-v4-pilot-100-expansion-verdict.ga.ts) |

**EN 은 외부 LLM 저작이 아니다.** 문장 단위 결정적 번역메모리(TM 334문장, `pending 0`)로 조립하며, 미매칭 문장이 1개라도 있으면 해당 제품은 EN 미생성으로 격리된다(`⟪MISSING⟫` 가드).

### 실행 순서 (실증)

1. `--dry-run` → 100 처리 / 80 생산가능 / 20 사전예외 / write 0
2. `--rollback-test` → 80 ROLLBACK_TEST_PASS / TX 내 480 write 후 전량 rollback / 잔여물 0 / 순 write 0
3. `--apply --confirm` (+ `OTC_V4_APPLY_PILOT_100=CONFIRM` 이중 게이트) → GREEN 80 / write 480
4. 동일 명령 재실행 → GREEN 0 · SKIP 80 · write 0
5. 독립검증 24항목 PASS

---

## 3. 제품별 격리 결과

### 3-1. 층별

| 층 | 총 | GREEN | EXCEPTION |
|----|---:|------:|----------:|
| A_NORMAL | 70 | **70** | 0 |
| B_BOUNDARY | 20 | 10 | 10 |
| C_SOURCE_COMPOSER | 10 | 0 | 10 |

### 3-2. route 별 생산

oral 38 · topical 26 · ophthalmic 11 · oromucosal 3 · vaginal 2 = **80**

### 3-3. 예외 코드별 (전부 DB write 0)

| 코드 | 건수 | 층 | 사유 |
|------|-----:|----|------|
| `ROUTE_UNRESOLVED` | 6 | B_BOUNDARY | gencode 확정 불가 + 공식 용법 원문에 경로 동사 미검출 → **임의 route 선택 금지**로 격리 |
| `ROUTE_CONFLICT` | 4 | B_BOUNDARY | 공식 용법 원문에 다중 경로 동사 공존 |
| `SOURCE_EFFICACY_MISSING` | 10 | C_SOURCE_COMPOSER | 공식 원문 효능·효과 부재 → 생성 금지(불변 원칙) |

예외 원장 불변식: `allFailedWriteZero: true`, `residueDirty: 0`, 중복 master 0, 17 필드 완비(재현 명령 포함) → **나 에이전트 인수 가능**.

---

## 4. 원장 대비 편차 (보고 사항)

원장이 `IDENTITY_CONFLICT` 예외를 기대한 **10 master 가 정상 생산(GREEN)** 되었다.

- 원장의 해당 코드 근거는 `gencodeCount ≥ 2` 이나, 이 10건 모두 **`permitCodeCount = 1`** 이다.
- 본 생산의 grounding 은 **master 자신의 `master_id` 로 조인한 e약은요 원문 1건**이며 gencode 로 원문을 선택하지 않는다. 따라서 gencode 다중성은 원문 동일성 위험을 만들지 않는다.
- WO §7 은 B/C 층을 "예외 **예상**" 으로 규정하고 실제 생산 가능하면 정상 생산하도록 명시하므로, 이는 계약 위반이 아니라 원장 기대치와 실제 실행 결과의 편차다.
- route 는 10건 모두 gencode 가 아닌 **공식 용법 원문**에서 확정되었으며, 확정 불가 건은 위 `ROUTE_UNRESOLVED` 2건으로 별도 격리되었다.

> 후속 원장(500 확대)에서는 `IDENTITY_CONFLICT` 판정 기준을 `permitCodeCount ≥ 2` 또는 원문 해시 불일치로 좁히는 것이 정확하다. **본 WO 범위에서는 Queue 원장·schema 를 수정하지 않았다.**

---

## 5. 독립검증 (WO §13)

생산 실행기와 **분리된 코드 경로**: contract/composer/author 모듈을 import 하지 않고 sourceRef·해시·6섹션 파서를 자체 재구현하고, 대상은 pilot 원장 SSOT 에서 직접 읽으며, 공식 6섹션은 DB 원문에서 다시 파싱한다. READ ONLY.

| ID | 검증 | 결과 |
|----|------|------|
| C-01 | pilot 대상 100 | 100 |
| C-02 | GREEN+EXCEPTION+SKIP = 100 | 100 |
| C-03 / C-03b | 중복 master 0 / sourceRef 독립 재계산 불일치 0 | 0 / 0 |
| C-04 | V4 sourceRef 범위 밖 점유 | 0 |
| C-05 | GREEN KO/EN canonical·audit·sourceRef 정합 위반 | 0 |
| C-06 | 예외 제품 DB 잔여물·write | 0 |
| C-07 | sourceRef 다중 master 점유 | 0 |
| C-08 | canonical 중복(master×language) | 0 |
| C-09 | 공식 6섹션 보존 + 효능·용법 수치 보존 위반 | 0 |
| C-10 | 저장 content hash ≠ payload/원장 | 0 |
| C-11 | EN 한글 잔존 · route 동사 위반 · 수치 누락 | 0 |
| C-12 / C-12b | READY 1,134 교집합 0 / 실행 이후 변경 0 | 0 / 0 |
| C-13 | pilot 밖 authored STORE row 실행 이후 변경 | 0 |
| C-14 / C-14b | 범위 밖 audit 0 / batch audit = GREEN 수 | 0 / 80 |
| C-15 / C-15b | 원장 GREEN = DB 실측(KO 80 · EN 80) / write 480 | 일치 |
| C-16 ~ C-16e | 재실행 write 0 · SKIP 80 · 예외원장 동일 · 중복 0 · 상태 결정성 | 전부 PASS |

**24/24 PASS.**

> 검증기 보정 1건: EN 용법의 소수 횟수는 `once/twice` 등 영어 수사로 옮기는 것이 정상 표현이므로, 숫자 문자열 또는 대응 수사 중 하나면 수치 보존으로 인정하도록 C-11 을 정밀화했다(topical 3건). 저장 콘텐츠는 변경하지 않았다.

---

## 6. 재실행 멱등 (WO §14)

동일 명령 재실행 결과 — GREEN **0** · SKIP_ALREADY_COMPLETE **80** · EXCEPTION 20 · write **0**.
예외 원장은 1차와 동일(코드·master 집합·필드), 중복 예외 row 0, 신규 canonical/audit/sourceRef 점유 0.
→ **재실행 신규 write 는 발생하지 않았다**(시스템 중지 조건 미발생).

---

## 7. 500 확대 판정 (WO §15)

`EXP-01 ~ EXP-11` **전부 PASS** → **`APPROVED_FOR_PILOT_500`**
(성공률 0.80 은 WO 명시대로 확대 차단 요소가 아니다.)

확대 시 전제:
- 동일 실행기·동일 계약(제품별 savepoint · 6T · V4 sourceRef namespace) 사용
- TM 신규 문장 확장 필요(500 규모에서 미매칭 문장은 해당 제품만 격리)
- route composer 미지원 섹션·원문 결손은 제품별 예외로 계속 격리
- LIVE write 소유자는 **agent-ga 단일 유지**

---

## 8. 산출물

| 파일 | 내용 |
|------|------|
| [otc-v4-pilot-100-result-ledger.ga.json](../../apps/api-server/src/scripts/data/otc-v4-pilot-100-result-ledger.ga.json) | 제품별 실행 결과 원장 (100행) |
| [otc-v4-pilot-100-green-ledger.ga.json](../../apps/api-server/src/scripts/data/otc-v4-pilot-100-green-ledger.ga.json) | GREEN 80 (§6 기록 필드) |
| [otc-v4-pilot-100-exception-handoff-na.ga.json](../../apps/api-server/src/scripts/data/otc-v4-pilot-100-exception-handoff-na.ga.json) | 나 에이전트 인수 예외 원장 20 |
| [otc-v4-pilot-100-checkpoint-ledger.ga.json](../../apps/api-server/src/scripts/data/otc-v4-pilot-100-checkpoint-ledger.ga.json) | 10 master 단위 체크포인트 10 |
| [otc-v4-pilot-100-rerun-verification.ga.json](../../apps/api-server/src/scripts/data/otc-v4-pilot-100-rerun-verification.ga.json) | 재실행 결과 |
| [otc-v4-pilot-100-independent-verification.ga.json](../../apps/api-server/src/scripts/data/otc-v4-pilot-100-independent-verification.ga.json) | 독립검증 24항목 |
| [otc-v4-pilot-100-expansion-verdict.ga.json](../../apps/api-server/src/scripts/data/otc-v4-pilot-100-expansion-verdict.ga.json) | 500 확대 판정 |
| `otc-v4-pilot-100-{ko,en}-payload.ga.json` · `-source.ga.json` · `-tm.ga.json` · `-prep.ga.json` · `-author-report.ga.json` | 저작 payload·원문·TM·게이트 산출물 |
| `*.apply-run1.ga.json` | 1차 APPLY 시점 원장 스냅샷(재실행 대조용) |

Queue 원장(`otc-easy-drug-remaining-pilot-100-ledger-v1.json`)과 handoff schema 는 **수정하지 않았다**.

---

*작성: agent-ga · 2026-07-29 · 상태: 종료(APPROVED_FOR_PILOT_500)*
