# CHECK-O4O-HFF-COMBO-C-BATCH4-PREP-PARSER-SHARDPLAN-V1 — Batch 4 전 기능성 수확 기반 정비 (Agent C)

- 성격: **read-only 기반 정비**. DB write / generate / apply **없음**. 파서·shard-plan 보강 + 잔여 fresh 실측.
- 시작 `2026-07-22 15:03:46 +0900`
- 계기: batch-3(shard 2) 풀 고갈 + 잔여 비타민E 파서 gap 발견 → 다음 배치 전 수확 기반 복구.

## 0. 결론

> **파서 비타민E 변형 2종 보강**(Latin ɑ U+0251 · α-TE trailing dash) → 복구 2건. 기존 변형·전체 eligible **불변(2971→2971)**.
> **shard-plan `--include-functional` 모드 추가**(기본 off·기존 EXC 불변) → 기능성앵커 포함 재산출. **shard 교집합 0**.
> **shard 2 realistic 잔여 fresh = 7**(target families) → 사실상 소진. 재배정 권고: shard 0(134) 최다 · shard 1(45).

## 1. 비타민E 단위 변형 파서 보강 (`hff-source-parse.ts`)

batch-3 은닉 H1 2건이 cf95b9d5c(mga-TE 숫자인접 보강) 이후에도 남은 변형이었다:

| 변이 | 실제 코드포인트 | 보강 |
|---|---|---|
| `9mgɑ-TE` | ɑ = **U+0251** Latin small alpha (α U+03B1·a 아님) | `[aα]` → `[aαɑ]` (mg 규칙 + 단독 a-TE 규칙) |
| `11mg α-TE-/` | α-TE 뒤 **trailing dash** U+002D | `α-TE\s*-\s*(?=\/)` → `α-TE ` (기준량 `/` 앞 잉여 하이픈만 제거) |

> WO 는 U+0271 로 기재했으나 실데이터 실측 = **U+0251**. 실측 코드포인트로 보강.

**회귀검증 (기존 결과 불변)**:

| 케이스 | 결과 |
|---|---|
| `7mga-TE` · `5.0mga-TE`(괄호) · `3.3 mg α-TE`(공백) · `10mgα-TE`(Greek) · `700 ugRAE` | 전부 정상 파싱 · unknown 0 (불변) |
| 신규 `9mgɑ-TE` · `11mg α-TE-/` | 비타민E 정상 포착 (복구) |
| **전체 코퍼스 eligible** | **2971 → 2971 (delta 0)** — 손실 0 |
| signature 변화 | 감소 2 (2제품이 불완전 signature → 완전 비타민E signature 로 정정 이동) · 증가/신규 대응. **기존 생산 결과 감소 아님**(read-only·재분류·LIVE 무관) |

복구 예: `20040015104218 우리아이튼튼`(비타민A+C+D+아연 → **+비타민E 9mg**) · `200700170352120 유판씨멀티`(**+비타민E 11mg**).

## 2. REVIEW_LATER 2건 재검수

| stmt | 판정 | 근거 |
|---|---|---|
| 20040015104218 | **복구 가능** | 완전 signature(비타민A+C+D+비타민E+아연) · unknown 0 |
| 200700170352120 | **복구 가능** | 완전 signature(나이아신+B1+B2+B6+C+D+비타민E) · unknown 0 |

- 계속 REVIEW = 0. **임의 승격 안 함**(read-only). 두 제품의 정정 signature 는 FNV 상 shard 0/1 로 재배정 → 향후 해당 shard 담당이 생산.

## 3. shard-plan 기능성 포함 모드 (`hff-combo-shard-plan.ts`)

- **`--include-functional`**(기본 off): 기능성앵커(MSM·글루코사민·옥타코사놀·코엔자임Q10·밀크씨슬·프로폴리스)를 EXC 에서 제외 → 산출 포함.
- **항상 제외**(귀속 불명확·비대상): 식이섬유·오메가3·루테인·가르시니아·은행·녹차·테아닌·GABA.
- 기존 기본 동작 불변(functional 은 여전히 기본 제외). FNV-1a·shard-count 계약 불변.

## 4. shard 재산출 · fresh 분포 (FNV-1a, shard-count 3)

**shard-plan (미승격 spec-clean 상한 · 귀속/섭취 미검증) · 교집합 0**:

| 모드 | shard 0 | shard 1 | shard 2 |
|---|---:|---:|---:|
| 기본(functional 제외) | 841 | 787 | 630 |
| **기능성 포함** | 1,101 | 991 | 986 |

**realistic (full-pipeline: 귀속·섭취·guard 통과 + 현재승격 차감 · target families)**:

| | shard 0 | shard 1 | shard 2 |
|---|---:|---:|---:|
| **realistic 잔여 fresh** | **134** | **45** | **7** |

> shard-plan 상한과 realistic 의 큰 격차(예 shard2 986 vs 7) = **기능성 귀속·섭취 파싱 실패분**. shard-plan 은 spec 만 보고 select/harvester 는 full-pipeline 을 본다. 다음 배치 실제 생산량은 **realistic 기준**으로 판단해야 한다.

## 5. Agent C 다음 배치 실제 후보 수

- **shard 2 (내 담당) target families realistic = 7** → **사실상 소진**. batch-3(178) 이 shard 2 가용분을 소진.
- 재배정 권고: **shard 0 = 134**(최다 잔여) · shard 1 = 45. 세 shard 실제 잔여가 불균형(134/45/7) → 다음 대량 생산은 Agent A/B batch-3 반영 후 **realistic 잔여 기준 재배정**이 맞다.

## 6. 중지 조건 점검 (해당 없음)

- 기존 생산 결과 감소: **없음**(eligible 2971 불변, LIVE read-only).
- 기존 LIVE drift: 없음(DB write 0).
- 기능성 오귀속: 없음(회귀 통과, unknown 0).
- shard 교집합: **0**(양 모드).

## 7. 보고 요약

```text
DB write 0 · generate 0 · apply 0 (read-only 정비)
파서 복구: 2건 (Latin ɑ U+0251 + α-TE trailing dash) · 회귀 불변(eligible 2971→2971)
REVIEW_LATER 재검수: 복구 가능 2 / 계속 REVIEW 0 (임의 승격 없음)
shard-plan --include-functional 추가 (기본 off·교집합 0)
fresh 분포(기능성 포함, shard-plan 상한): shard0 1101 · shard1 991 · shard2 986
fresh 분포(realistic full-pipeline, target): shard0 134 · shard1 45 · shard2 7
Agent C 다음 배치 실제 후보(shard2): 7 (소진) → 재배정 권고 shard0 134
```

## 8. 산출물

- 분포 JSON: `docs/checks/data/product-description-guard/hff-combo-c-batch4-prep-shard-distribution.json`
- 코드: `hff-source-parse.ts`(비타민E 변형 2종) · `hff-combo-shard-plan.ts`(--include-functional)
- 본 문서
