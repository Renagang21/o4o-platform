# CHECK — HFF 잔여 대량 생산 shard-2 (Agent C) V1

- WO: `WO-O4O-HFF-REMAINDER-BULK-PRODUCTION-C-V1` · 자동승인 계약 [`...AUTO-AUTHORIZATION-CONTRACT-V1`](../work-orders/WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1.md).
- 담당 shard: **`FNV-1a stableHash(statementNo) % 3 == 2`** (3에이전트 공통 stmt-shard, A=0·B=1·C=2). 정본 해시 = `hff-combo-shard-plan.ts:24`.
- 성격: 기존 파이프라인(Combo/Nutrient/SF/own-track) 재사용 대량 생산 · **공용 parser/registry/classify/composer/apply/Guard 무수정**.
- 시작 `2026-07-23 22:30 +0900` · 종료 단일 세션. 채널 Cloud SQL Proxy 5448(자체 OAuth 토큰).
- 선행 동기화: HEAD=origin/main `10714a7f4`(behind 0). 전역 LIVE 는 병렬 생산 공유라 drift 지표 미사용(자기 manifest ID 기준).

## 0. 결론

> **shard-2 신규 LIVE = 275** (combo 25 + 단일영양소 247 + 단일기능성 3). **DB write 1,100 rows**(각 4: master+candidate+SPD ko/en).
> 3배치 전부 dry-run→apply COMMIT→**독립검증 PASS**. canonicalDup 0 · statementNo 중복 0 · BLOCKED target 0 · expected=actual · A/B 교집합 0(stmt-shard) · 기존 LIVE drift 0.
> shard-2 producible **상한 도달** — 잔여 ≈9,682 는 액상·미등록 다원료·parse-hard·CFU min-max HOLD·SF 레지스트리 외·EN 미매핑(기존 파이프라인 대상 아님). 공용 무수정 원칙으로 개별 HOLD.

## 1. Shard 산정 (stmt-shard 규율)

- distinct HFF 후보 41,261 · FNV shard 분포 `[13743, 13751, 13767]`(균등) · taken 11,362 · **shard-2 not-taken not-promoted 9,957**.
- 모든 트랙 pool 은 생산 전 `stableHash(stmt)%3==2` 로 필터 — A(0)/B(1) stmt 미접촉(교집합 0 보장).

## 2. 트랙별 생산

| 트랙 | 소스 | 후보(shard-2) | target | auto-HOLD | **LIVE** | 도구 |
|---|---|--:|--:|--:|--:|---|
| **Combo** | reg harvest 36 + unreg 3 | 39 | 25 | 14 | **25** | hff-combo-c-(unreg-)harvest · unreg-generate · nutrient-canonical-apply |
| **단일 영양소** | nutrient-select×23 → shard-2 필터 | 248(비타민C 226·D 22) | 247 | 1 | **247** | hff-nutrient-select/generate/store-canonical-apply |
| **단일 기능성** | sf-select×6 → --shard 2 | 12 | 3 | 9 | **3** | hff-sf-select/generate/apply (포스파티딜세린) |
| probiotics(own) | shard-select --shard 2 | 18 READY | 0 | 18 | 0 | B-SPEC-MINMAX-003 전량 HOLD |
| **합계** | | | | | **275** | |

- auto-HOLD 상위 원인: **G-MULTI-AMOUNT-SOURCE**(combo 표시량 근거)·**B-SPEC-MINMAX-003**(probiotics CFU min-max)·D-CLAIM-UNGROUNDED·H-COUNT-MISMATCH. 전부 정상 안전 가드 — 개별 HOLD, 계속.
- 나머지 21개 영양소는 shard-2 전량 taken(병렬 선행 캠페인). SF 프로바이오틱스 269 는 SF_INGREDIENTS 레지스트리 외(별도 probiotics 트랙)라 SF 대상 아님. 홍경천 EN PENDING 유지.

## 3. Apply 게이트 (3배치 전통과)

| 배치 | dry-run | apply | 독립검증 |
|---|---|---|---|
| combo-s2c(25) | postVerifyPass ✓·expected 100 | COMMIT·canonicalDup 0 | masters25·spdKo25·spdEn25·candLinked25·sourceHff50·**PASS** |
| nut-s2(247) | postVerifyPass ✓·expected 988·skipped 0 | COMMIT·canonicalDup 0 | masters247·spdKo247·spdEn247·candLinked247·sourceHff494·**PASS** |
| sf ps-s2c(3) | postVerifyPass ✓·expected 12 | COMMIT·canonicalDup 0 | spdKo3·spdEn3·candLinked3·stmtDupMasters0·**PASS** |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · barcode NULL · candidate=approved_new_master · regulatory_type=건강기능식품. rollback manifest 3종(createdMasters/spd/cand). 자기 manifest ID drift 0.
- 설명서: 원료별 공식 기능성 verbatim 보존(동반 A/B 기능성 삭제 0), 질환·증상·전문표현 순화 0, 원문밖 치료·예방 클레임 0, 전문가 상담 footer 유지, EN 충실 번역.

## 4. 전체 중지 조건 점검

ProductMaster 오연결 0 · 기능성 체계적 오귀속/누락 0 · canonical/rollback 실패 0 · write 불일치 0 · 기존 LIVE 대량 drift 0 · 독립검증 실패 0 → **전체 중지 사유 없음**. 개별 HOLD 는 계속 처리 원칙대로 분리.

## 5. 남은 후보

- ≈9,682 shard-2 not-taken = 기존 파이프라인 대상 외(액상·다원료 미등록 기능성·parse-hard·CFU min-max HOLD·SF 레지스트리 외 원료·EN 미매핑). 신규 track/registry 필요분은 <100 예외 구조변경 금지 원칙으로 미착수.
- 재개 조건: 액상 grounding 트랙 · SF 레지스트리 확장(공식 EN 확정 후) · probiotics CFU min-max 근거 정밀화 · 공용 parser 포맷갭 보강(별도 WO).

## 6. 산출물 (C 전용, 공용 무수정)

- data: `docs/checks/data/product-description-guard/hff-remainder-bulk-c/` — target 3(combo/nutrient/sf) · blocked-hold · rollback-manifest 3 · census-summary.
- 재사용 도구(무편집): combo(harvest/unreg-generate)·nutrient(select/generate/store-canonical-apply)·sf(select/generate/apply/verify)·probiotics(shard-select/generate)·hff-combo-c-independent-verify.
- 본 문서.

---

*stmt-shard 2 · 공용 무수정 · 기존 파이프라인 재사용 · 신규 LIVE 275 · DB write 1,100 · 독립검증 PASS · A/B 교집합 0 · 상한 도달.*
