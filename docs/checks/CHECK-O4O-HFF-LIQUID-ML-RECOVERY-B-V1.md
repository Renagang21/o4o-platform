# CHECK — 액상 mL 기준량 재생산 stmt-shard 1 (Agent B) V1

- 상위 WO: `WO-O4O-HFF-LIQUID-ML-RECOVERY-B-V1` (shard = `stableHash(statementNo) % 3 = 1`).
- 기준 commit: `72d78afc9`(액상 mL 기준량 Guard+SPEC 보강) · `3ed118f8c`(C shard2 액상 90). 자동승인 계약 적용.
- 성격: **완결형 자동 생산** — C 액상 파이프라인(select/passfilter) + 기존 nutrient compose/Guard/apply 재사용. **공용 parser/Guard 추가 수정 0.**
- 시작 `2026-07-25 08:10 +0900` · 종료 단일 세션 · 채널 Proxy 5438.

## 0. 결론

> **167건 액상 STORE canonical LIVE (자동 apply · 독립검증 PASS).** DB write **668**(167×4).
> shard1 not-taken 8,509 → 액상 pool 186 → Guard PASS 167. canonicalDup 0 · statementNo 중복 0 · 기존 LIVE drift 0.

## 1. 기준·도구

- `72d78afc9`·`3ed118f8c` origin 포함 확인. 공용 parser/Guard **무수정**(mL 기준량 검증은 이미 반영된 것 그대로 사용).
- 재사용: `hff-liquid-c-select`(액상 selector, mL basisUnit 허용·총내용량↔원료량 분리) → `hff-liquid-c-passfilter`(overallStatus=PASS만) → `hff-nutrient-generate`(composeNutrient) → `hff-nutrient-store-canonical-apply`.

## 2. 생산 퍼널 (shard1)

| 단계 | 수 |
|---|---:|
| shard1 not-taken(produced/promoted 15,002 제외) | 8,509 |
| 액상 selector pool(제형·섭취·composable 1원료 명확) | **186** |
| passfilter Guard PASS | **167** (REVIEW/BLOCKED 19 제외) |
| generate compose+Guard | PASS **167** · BLOCKED 0 |
| **LIVE** | **167** |

- selector holds 1,621: **기능성 원료 표시량 미검출(총량만/미등록) 1,489** · 기능성 미매핑 107 · 섭취 불명확 25 — 개별 HOLD, 배치 계속.
- passfilter 제외 19: PRE-A-BASIS·PRE-F-AGE·H-MAKER-NO-OFFICIAL-EN·PRE-SRC-BASIS-UNVERIFIABLE(사람 확정 계약 → 자동 apply 제외).

## 3. 원칙 준수 (액상 특수)

- **총 내용량 ≠ 원료량**: badge/spec 은 원료 표시량(예: `식이섬유 표시량(5g/100mL)의 80% 이상`) — 총 내용량(mL)을 원료량으로 쓰지 않음(selector 계약).
- **질량↔부피 미교차**: 원료 표시량 단위(mg/g)와 기준량 부피(mL)를 그대로 유지, 교차 매칭 0. mL 기준량은 원료와 직접 연결된 원문 라인만 인정.
- 기능성 KO=MAIN_FNCTN 원문(축약·순화 0) · EN=mapFunctionEn(임의생성 0) · 전문가 footer 유지.

## 4. 자동 apply 게이트 (전통과)

| 게이트 | 결과 |
|---|---|
| dry-run | PASS · candidateMatch 167(missing/ambiguous 0) · masterDup 0 · canonicalSpdDup 0 · 668=167×4 |
| apply(이중게이트) | **COMMIT** · postVerify masters/spdKo/spdEn/candidatesLinked 167 · spdRefLinked 334 · canonicalDup 0 |
| 독립검증(tag `batch:single-nutrient-liquid-b1`) | masters 167 · spdRefLinked 334 · **stmtDup 0 · canonicalDup 0 · PASS** |

- 기존 LIVE drift 0(신규 master INSERT + 대상 candidate 167 UPDATE). 롤백 매니페스트 저장. A/C 교집합 0(shard1 분리).

## 5. 남은 후보

- selector HOLD 1,489(총량만 표기·원료 표시량 미검출) — 원문 구조상 원료 표시량 부재 → 생산 근거 부족(추정 금지). 107 EN 미매핑(registry 확장 사람검수 후). 19 passfilter REVIEW(사람 확정).

## 6. 산출물

- `hff-liquid-b/`: liquid-b1-target(167)·holds·rollback manifest.
- 도구: C 액상 파이프라인 재사용(신규 도구 0, B 산출물=target/manifest/CHECK).

---

*완결형 자동 생산 · DB write 668 · 공용 parser/Guard 무수정 · 총량↔원료량 분리 · 독립검증 PASS.*
