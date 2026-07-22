# CHECK — 신규 단일 기능성 5종 완결 생산 stmt-shard 2 (Agent C) V1

- 상위 WO: `WO-O4O-HFF-SINGLE-FUNCTIONAL-5-PRODUCTION-SHARD2-C-V1`. 자동승인 계약 `WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1`.
- 성격: **완결형 생산 (자동 apply · 사전승인)** — 배정표 직접주입 generate → dry-run → apply → 독립검증.
- 종료 `2026-07-22 22:02 +0900` · 단일 세션.
- 샤딩: **stmt-축 FNV-1a · shard-count 3 · Agent C = shard 2**.
- **정본 도구만 사용**: 파이프라인 `1156fa293`(hff-sf-registry/select/compose/generate) + apply 정본 `3129140a9`(hff-sf-apply/verify, `hff-sf-generate --shard`). **자체 composer·apply 작성 0 · 공용 코드 수정 0.**

## 0. 결론

> **23건 단일 기능성 STORE canonical LIVE 반영 완료 (자동 apply · 독립검증 PASS).**
> DB write **92** (master 23 + candidate 23 + SPD ko 23·en 23) · canonicalDup 0 · statementNo 중복 master 0 · 기존 LIVE drift 0.
> shard 2 배정 25 → generate PASS **23** · REVIEW_LATER 2. 단일 기능성(비-CFU) LIVE 총계 **79**(A/B/C 3-shard 합산).

## 1. 기준선 · shard 계약

- origin/main 동기: apply 정본 `3129140a9` + 후속 `f51cfc3b4` HEAD 포함 확인(merge-base ancestor).
- shard 축: `FNV-1a(String(STTEMNT_NO).trim()) % 3 == 2`. 배정표 `shard` 필드 ↔ `<slug>-shard-2.json` stmt 리스트 **완전 일치**(banaba/hyaluronic/saw-palmetto/haematococcus 전건).
- 포스파티딜세린 제외(EN PENDING). 헤마토코쿠스는 EN 완전 배정분만(EN 미매핑 = compose/Guard 자동 제외).

## 2. 선정·generate 퍼널 (정본 `hff-sf-generate --shard 2`)

| 원료 | shard 2 배정 | generate PASS | REVIEW_LATER |
|---|---:|---:|---|
| 바나바잎추출물 | 13 | **12** | 1 (D-CLAIM-GROUNDED-002 · 보수적 REVIEW) |
| 히알루론산 | 5 | **5** | 0 |
| 쏘팔메토열매추출물 | 4 | **4** | 0 |
| 헤마토코쿠스추출물 | 3 | **2** | 1 (BLOCKED · EN/근거 부족) |
| **합계** | **25** | **23** | **2** |

- 원료명·기능성 귀속: pure-single 브래킷 1종 → 원료 disjoint(교차귀속 0). 기능성 KO=원문 grounded · EN=`mapFunctionEn` 고정(임의생성 0).
- EN = **한글 제품/제조사명 보존**(productNameEn==productName, 음역 0) — combo/probiotics 정본 표준 동일.
- 개별 제외(REVIEW_LATER 2)만 분리, 배치 계속(계약 §6).

## 3. 자동 apply 게이트 (전통과 · 정본 `hff-sf-apply`)

| 게이트 | 결과 |
|---|---|
| dry-run | PASS · candMatch 23(missing/ambiguous 0) · masterDup 0 → 롤백(write 0) |
| 예상=실측 write | **92 = 23×4** ✓ (master 23·candidate 23·SPD 46) |
| apply (이중게이트 `HFF_SF_APPLY_CONFIRM=YES --apply`) | **COMMIT** · in-tx postVerify masters/spdKo/spdEn/candidatesLinked 23 · canonicalDup 0 |
| **독립검증(정본 `hff-sf-verify`, 새 연결)** | masters 23 · spdKo 23 · spdEn 23 · **canonicalDup 0** · candidatesLinked 23 · spdRefLinked 46 · **stmtDupMasters 0** · **independentVerifyPass** |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · barcode NULL · candidate=approved_new_master · regulatory_type=건강기능식품 · tag `batch:single-functional-shard2-c1`.
- 기존 LIVE drift 0(신규 master INSERT + 대상 candidate 23 UPDATE 만). 롤백 매니페스트 `hff-sf-shard2-c1-rollback-manifest.json`(master 23·spd 46).

## 4. blocker 해소 경위 (조율)

- 초기: 파이프라인 `1156fa293`이 apply 도구 미포함 → nutrient/probiotics apply 는 CFU/declaredAmount 요구(실측 `GUARD_FAIL ground=23`), b3-lean 은 하드코드. **자체 apply·게이트 패치 = 공용 소유권/안전 위반**이라 계약 §8 조율 이슈로 중지 보고.
- 해소: Agent B `3129140a9`에서 **정본 `hff-sf-apply.ts`(비-CFU, drafts 필수, 이중게이트)** + `hff-sf-verify.ts` 반영. 동기 후 정본만으로 재개 → 완결.

## 5. 보고 요약

```text
종료 2026-07-22 22:02 +0900 · 단일 세션 · 정본 3129140a9 도구만 사용(자체 composer/apply 0)
배정 25 (바나바13·히알루론5·쏘팔4·헤마3) → generate PASS 23 → REVIEW_LATER 2
KO 설명서 23 · EN 설명서 23(한글명 보존)
DB write 92 · canonicalDup 0 · statementNo 중복 master 0 · 기존 LIVE drift 0
독립검증 PASS(spdRefLinked 46·stmtDup 0)
단일 기능성 LIVE census 79 (A shard0 + B shard1 + C shard2)
shard 2 잔여 producible 0 (잔여 2 = REVIEW_LATER: 바나바 D-CLAIM 1·헤마토 BLOCKED 1)
중지 사유: 없음 (shard 교집합 0·오귀속 0·canonical/rollback 정상·write 일치)
```

## 6. 산출물

- target: `docs/checks/data/product-description-guard/hff-sf-shard2-c1.json` (23)
- 롤백 매니페스트: `...hff-sf-shard2-c1-rollback-manifest.json` (master 23·spd 46)
- REVIEW_LATER: `...hff-sf-shard2-c1-review-later.json` (2)
- 도구: 전부 정본 재사용(`hff-sf-generate/apply/verify`) — 신규/수정 공용 파일 0.

---

*완결형 자동 생산 · 사전승인 계약. DB write 92 · 독립검증 PASS · 공용 코드 수정 0 · 자체 composer/apply 0.*
