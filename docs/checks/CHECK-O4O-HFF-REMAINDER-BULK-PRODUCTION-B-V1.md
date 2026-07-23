# CHECK — 잔여 대량 생산 stmt-shard 1 (Agent B) V1

- 상위 WO: `WO-O4O-HFF-REMAINDER-BULK-PRODUCTION-B-V1` (shard = `hash(statementNo) % 3 = 1`). 자동승인 계약 적용.
- 성격: **완결형 자동 생산** — 기존 정본(harvest+composeCombo+Guard+sf-apply) 재사용, 예외 수리 없음.
- 시작 `2026-07-23 22:32 +0900` · 종료 단일 세션 · 채널 Proxy 5437.

## 0. 결론

> **28건 잔여 복합형 STORE canonical LIVE (자동 apply · 독립검증 PASS).** DB write **112**(28×4).
> shard1 fresh 46 → PASS 28 · HOLD 18. combo shard1 사실상 **소진**(병렬 A/C 생산으로 produced/promoted 11,362).
> canonicalDup 0 · statementNo 중복 0 · A/C 교집합 0(shard 분리) · 기존 LIVE drift 0.

## 1. 기준선·census

- produced/promoted stmt(taken+승격) = **11,362** — sf/probiotics/fiber/combo 병렬 생산으로 대폭 소진.
- 전코퍼스 harvest(`hff-combo-c-harvest`, produced 제외): signatures 1,028 · totalEligible 4,523 · **totalFresh 129**(전 shard). shard1 = **46**.
- sf/fiber 잔여 shard1: 한 자리수(예: 뮤코다당 total 3·shard1 1) + 대부분 REVIEW → 생산 생량 없음.

## 2. 생산 퍼널 (shard1)

| 단계 | 수 |
|---|---:|
| harvest seed(전 shard) | 4,523 |
| **stmt-shard1 fresh** | **46** |
| **compose+Guard PASS** | **28** (REVIEW-grounded 2 포함) |
| HOLD | 18 |

- HOLD 상위: **G-MULTI-AMOUNT-SOURCE 9**(원료간 표시량 이동 의심) · PRE-SRC-BASIS-UNVERIFIABLE 5 · H-COUNT-MISMATCH 2 · BASIS-MISMATCH 1 · D-CLAIM-UNGROUNDED 1 — 전부 개별 HOLD, 배치 계속(예외 수리 안 함).
- 주요 조합: 루테인+밀크씨슬 6 · 마그네슘+테아닌 5 · 6원료 B군+테아닌계 · 비타민C+D+셀레늄+아연 등. 정책: D-CLAIM-GROUNDED·E-NAME-GROUNDED 는 grounded 판정 포함, PRE-SRC/TRUNCATED 는 HOLD.

## 3. 자동 apply 게이트 (전통과)

| 게이트 | 결과 |
|---|---|
| dry-run | PASS · candMatch 28(missing/ambiguous 0) · masterDup 0 · 112=28×4 |
| apply | **COMMIT** · in-tx postVerify 28/28/28 · canonicalDup 0 |
| 독립검증(tag `batch:remainder-combo-b1-r1`) | masters 28 · spdRefLinked 56 · **stmtDup 0 · canonicalDup 0 · PASS** |

- 기존 정본 `hff-sf-apply`(비-CFU 계약) 재사용. 롤백 매니페스트 저장. 공용 parser/registry 수정 0.

## 4. 남은 후보

- shard1 combo fresh HOLD 18(G-MULTI/PRE-SRC — 원문 데이터 한계, 개별 교정 대상). 신규 fresh 는 병렬 소진으로 희소.
- sf/fiber shard1 잔여 단자리(REVIEW 중심). 추가 대량 생산은 신규 코퍼스 유입 또는 EN 확장(사람검수) 후.

## 5. 산출물

- `hff-remainder-b/`: remainder-b1-target(28)·holds(18)·rollback manifest.
- 도구(B 전용): `hff-remainder-b-batch.ts`(harvest→shard1 filter→combo generate).

---

*완결형 자동 생산 · DB write 112 · 공용 parser 무수정 · shard1 분리(A/C 교집합 0) · 독립검증 PASS.*
