# CHECK — 단일 기능성 독립 TODO 완결 생산 (Agent C) V1

- 상위 WO: `WO-O4O-HFF-SF-INDEPENDENT-TODO-C-V1`. 자동승인 계약 `WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1`.
- 성격: **독립 소유 완결 생산 (조사→생성→apply→검증→commit→push, 사전승인)**. 운영원칙: 각자 자기 TODO, 공용코드 필요 후보는 PENDING_SHARED.
- 시작~종료 `2026-07-22 ~23:01 +0900` · 단일 세션. 채널: 자체 Cloud SQL Auth Proxy 5438(fresh 토큰), 정본 도구만 사용.
- 정본: `hff-sf-registry/select/compose/generate/apply/verify` — **공용 코드 수정 0 · 자체 composer/apply 0.**

## 0. 결론

> **21건 단일 기능성 STORE canonical LIVE (알로에전잎 5 · 홍국 8 · 로즈힙 8).** DB write **84** · canonicalDup 0 · statementNo 중복 master 0 · 기존 LIVE drift 0 · 독립검증 3/3 PASS.
> 바나바잎추출물·헤마토코쿠스추출물 = **0 LIVE**(guard REVIEW/BLOCKED → REVIEW_LATER/HOLD). 담당계열 고가치 확장후보(차전자피식이섬유 137 등)는 registry 미등재 → **PENDING_SHARED**(공용코드=Agent B, 억지처리 안 함).
> 단일 기능성 LIVE census **195**.

## 1. TODO 결과

| TODO | 성분 | select READY | generate PASS | 결과 | tag |
|---|---|---:|---:|---|---|
| C-01 | 알로에전잎 | 10 | 5 | **DONE 5 LIVE** (REVIEW_LATER 5) | `batch:single-functional-aloe-whole-leaf-c` |
| C-02 | 홍국 | 9 | 8 | **DONE 8 LIVE** (REVIEW_LATER 1) | `batch:single-functional-red-yeast-rice-c` |
| C-03 | 로즈힙 | 8 | 8 | **DONE 8 LIVE** | `batch:single-functional-rosehip-c` |
| C-04 | 바나바잎추출물 | 5 | 0 | **REVIEW_LATER 5** (D-CLAIM-GROUNDED 4·PRE-SRC 2·BLOCKED 1) | — |
| C-05 | 헤마토코쿠스추출물 | 3 | 0 | **HOLD 3** (generate BLOCKED; 나머지 EN 미확정) | — |
| C-06 | 눈/혈행/피부 추가 | — | — | 히알루론산 잔여 2→PASS 0(exhausted). 인삼/키토산/뮤코다당/키토올리고당=타계열·A/B 미접근 | — |
| C-07 | 추가 READY 연속 | — | — | **PENDING_SHARED** (registry-gap, 아래 §4) | — |

- C-04/C-05: 정본 `hff-sf-generate`가 D-CLAIM-GROUNDED-002·PRE-SRC-BASIS-UNVERIFIABLE·BLOCKED 를 REVIEW/BLOCKED 로 자동 분리 → target 0. **개별 guard 실패는 REVIEW_LATER/HOLD, 배치 계속**(계약 §6). 정본 REVIEW 판정 변경은 공용코드라 미수정.

## 2. 매장용 설명서 표현 원칙 (준수)

- 정본 `hff-sf-compose` 는 **공식 MFDS 기능성 원문 grounding** — 질병/전문 표현 회피·순화 0. 예: 홍국 제품 "콜레스테롤엔 모나콜린K 솔루션" — `콜레스테롤`·`모나콜린K` 전문 표현 보존, 근거 밖 사실 추가 0.
- 하단 전문가 문의 안내 유지: foot = "… 질환이 있거나 의약품 복용 시 전문가와 상담 …".
- EN = 한글 제품/제조사명 보존(음역 0), 기능성 EN = `mapFunctionEn` 고정(임의생성 0).

## 3. 자동 apply 게이트 (전통과 · 정본 `hff-sf-apply`/`verify`)

| 성분 | dry-run | 예상=실측 write | apply | 독립검증(새 연결) |
|---|---|---:|---|---|
| 알로에전잎 | PASS(dup 0) | 20=5×4 | COMMIT | masters/spdKo/spdEn/candLinked 5 · dup 0 · stmtDup 0 · **PASS** |
| 홍국 | PASS(dup 0) | 32=8×4 | COMMIT | 8 · dup 0 · stmtDup 0 · **PASS** |
| 로즈힙 | PASS(dup 0) | 32=8×4 | COMMIT | 8 · dup 0 · stmtDup 0 · **PASS** |

- 계약: status=canonical · description_type=STORE · source_type=o4o_hff_generated · barcode NULL · candidate=approved_new_master · regulatory_type=건강기능식품.
- 기존 LIVE drift 0(신규 master INSERT + 대상 candidate UPDATE 만). 롤백 매니페스트 3종(성분별, master+spd).

## 4. PENDING_SHARED (공용 registry 등재 필요 — Agent B 도메인)

담당 계열 고가치 후보가 `hff-sf-registry` `SF_INGREDIENTS` 미등재 → 등재=공용코드 변경(A/C 금지). **억지 처리 안 하고 PENDING_SHARED 이관**(운영원칙):

| 성분 | 계열 | producible(조사) | 사유 |
|---|---|---:|---|
| 차전자피식이섬유 | gut | 137 | registry labelRe/config 미등재 |
| 은행잎추출물 | cognitive | 32 | 미등재 |
| 난소화성말토덱스트린 | gut | 14 | 미등재 |
| 마리골드꽃추출물 | eye | 10 | 미등재(루테인 인접) |
| 감마리놀렌산함유유지 | skin | 7 | 미등재 |
| 이눌린/치커리추출물 | gut | 6 | 미등재 |
| 포스파티딜세린 | skin/cog | 0 | EN 미확정(인지력·자외선피부건강) GROUNDING_PENDING |

- 전체 후보 풀(45종·producibleStmts)은 기제출 `hff-sf-maxpool-C.json`/`manifest-C.json`(commit 409733b6d) 참조. **EPA·DHA/루테인 = combo/nutrient 트랙, 중복생산 안 함.**

## 5. 보고 요약

```text
시작~종료 2026-07-22 ~23:01 +0900 · 정본 도구만(공용코드 수정 0)
처리 성분 5(C-01~05) + 확장조사(C-06/07)
성분별: 알로에전잎 5 LIVE·REVIEW 5 / 홍국 8 LIVE·REVIEW 1 / 로즈힙 8 LIVE / 바나바 REVIEW 5 / 헤마토 HOLD 3
총 신규 LIVE 21 · DB write 84 · canonicalDup 0 · statementNo 중복 0 · 기존 LIVE drift 0
독립검증 3/3 PASS · 단일 기능성 LIVE census 195
추가 발견·생산: 없음(registry-gap) → 고가치 후보 7종 PENDING_SHARED(Agent B registry 등재)
미완료 TODO: C-07(등재 후 재개)
전체중지 사유: 없음(오귀속 0·A/B 성분 미접근·소유교집합 0·독립검증 PASS)
```

## 6. 산출물

- 성분별 target·rollback: `docs/checks/data/product-description-guard/hff-sf-c-todo/{aloe-whole-leaf,red-yeast-rice,rosehip}-c-{target,rollback-manifest}.json`
- REVIEW_LATER 집계: `hff-sf-c-todo/c-review-later.json`
- TODO 상태·PENDING_SHARED: `hff-sf-c-todo/c-todo-manifest.json`
- 본 문서. (도구는 정본 재사용, 조사 임시 스크립트 커밋 제외.)

---

*독립 완결 생산 · 사전승인 계약. DB write 84 · 독립검증 3/3 PASS · 공용 코드 수정 0 · 자체 composer/apply 0 · A/B 성분 미접근.*
