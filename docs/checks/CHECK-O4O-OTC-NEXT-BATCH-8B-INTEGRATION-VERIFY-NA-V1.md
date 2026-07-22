# CHECK-O4O-OTC-NEXT-BATCH-8B-INTEGRATION-VERIFY-NA-V1

WO: **WO-O4O-OTC-GROUNDED-UPGRADE-NEXT-BATCH-8B — Stage 2/3 최종 통합검증** (에이전트 나)
기준 SSOT: 감사 커밋 `b82d7e7ed` (`otc-next-batch-8b-audit-v1.json` — 8그룹 · T 59 · KO 4T=236 · EN 2T=118 · 총 6T=354)
성격: **read-only · DB write 0 · apply 0 · 생산 재배정 없음.** runner 미실행(persistRun run.json clobber 회피 — 타 세션 아티팩트 보존). 독립검증은 별도 read-only 쿼리로 수행.
최종 판정: **VERIFIED** (8/8 그룹 전 축 PASS)

---

## 0. 결론 요약

- 8B 8그룹의 target master 59건은 **이미 production DB에 LIVE** (ko authored canonical + en canonical, easy demoted).
- 독립검증 8/8 PASS: ko=en=easyDep=T · canonicalDup 0(ko·en) · target 밖 drift 0 · source_ref 링크 정상 · 재실행 no-op(ko `ALREADY_UPGRADED` / en `ALREADY_COMPLETE`) · EN 재사용 byte-identical.
- 가∪(30) ∩ 다∪(29) target 교집합 **0** 재확인.
- 생산은 **git 반영됨**(선행 Track-A 생산 WO 커밋 + GROUP_REGISTRY 등재). apply-but-uncommitted 아님.

---

## 1. Stage 2 — 귀속·정합 조사

### 1.1 생산 주체 특정 (2파)

audit_log `performed_by` 는 runner 설계상 batch/system = **NULL** (`writeOwner.performedBy=null`). 따라서 귀속은
`source_ref_id == 8B draft candidate` 일치(matchAuditRef=T 전 그룹) + 생산 시각 + 커밋 상관으로 특정.

| 파 | 생산 시각(DB) | 그룹 | 귀속 커밋 / WO |
|---|---|---|---|
| Wave 1 | 2026-07-21 00:17–00:45 | 덱시부프로펜300·디오스민600·수산화마그네슘500·니푸록사지드200·사카로마이세스282.5·아르기닌티디아시케이트200 (6) | 3H 생산 배치 `8ce1849d8`(배치1, 가)·`a8de18a50`(배치2, 가) + `810127ef8`/`3bdd73f9f`(다) — 외부 config bundle runner |
| Wave 2 | 2026-07-22 01:21–01:25 | 아세트아미노펜650·이부프로펜200 (2) | `1d5ba9fef` "1H 생산 — 아세트아미노펜650정·이부프로펜200연질… ko/en 20건 완결 LIVE (에이전트 가) WO-…-TRACK-A-1H-PRODUCTION-GA-V1" |

"8B" 는 본인(나) 감사(`b82d7e7ed`)의 그룹핑 라벨일 뿐, 실제 생산은 **선행 Track-A 생산 WO**(1H/3H, 주로 에이전트 가)에서 수행됨. 뒤 4그룹(다용)은 에이전트 다가 `54c280519` CHECK로 이미 독립검증 완료.

### 1.2 git 반영 여부 — DB에만 있고 git 미반영인가?

**아니오. 완전 git 반영.**
- runner `drug-otc-grounded-upgrade-runner.ts` == HEAD (로컬 수정 0), `GROUP_REGISTRY` 에 8B 8그룹 전부 등재(HEAD 기준 key 8/8 확인).
- 생산 run.json / config / CHECK 문서 모두 선행 커밋에 존재. locally-modified run.json 0.
- 삭제·충돌 없음 → 기록 정합성 문제 아님(생산 실패로 판정하지 않음).

### 1.3 GROUP_REGISTRY / EN 경로 등재

- GROUP_REGISTRY: 8B 8그룹 전부 등재(outBase 포함, 예 `otc-grounded-upgrade-diosmin-600mg-jeong`). 일부는 외부 `--config` bundle 경로(레지스트리 미수정 실행)로도 apply됐으나, 그룹 파라미터(candidate/fp)는 fingerprint 산식 불변 조건에서만 주입 — 별도 경로여도 정책 동일.

---

## 2. Stage 3 — 최종 독립검증 (별도 read-only 연결, 5433 proxy)

fingerprint 정본 함수 VERBATIM 재현. locked target set = 감사 `target_master_ids`(생산 전 잠금). drift = coarse 전체를 **easy 원문(canonical|deprecated)** 으로 재지문화하여 target-fp/exclude-fp 분류 후 검사.

재실행 no-op 판정 근거(런너 미실행, precondition 직접 확인):
- ko `ALREADY_UPGRADED` (runner:829) = `authoredCanon==T && easyCanonRemaining==0` → 전 그룹 충족.
- en `ALREADY_COMPLETE` (en-runner:493-501) = target 이미 en canonical + build byte-identical → en canonical==T & md5 distinct=1 로 충족.

| 그룹 | 묶음 | T | ko canon(ref1) | ko dup | en canon | en dup | easy dep | easy 잔존 | EN md5(≠sib) | exclude(=감사) | drift | ko no-op | en no-op | PASS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 아르기닌티디아시케이트\|200밀리그램\|연질캡슐 | 가 | 7 | 7 | 0 | 7 | 0 | 7 | 0 | 063d7188=sib | 0 (0) | 0 | ✅ | ✅ | ✅ |
| 수산화마그네슘\|500밀리그램\|정 | 가 | 8 | 8 | 0 | 8 | 0 | 8 | 0 | b68a955b=sib | 7 (7) | 0 | ✅ | ✅ | ✅ |
| 이부프로펜\|200밀리그램\|연질캡슐 | 가 | 7 | 7 | 0 | 7 | 0 | 7 | 0 | b35a8780=sib | 39 (39) | 0 | ✅ | ✅ | ✅ |
| 덱시부프로펜\|300밀리그램\|정 | 가 | 8 | 8 | 0 | 8 | 0 | 8 | 0 | 3419f518=sib | 89 (89) | 0 | ✅ | ✅ | ✅ |
| 사카로마이세스보울라르디균\|282.5밀리그램\|캡슐 | 다 | 7 | 7 | 0 | 7 | 0 | 7 | 0 | 7574cc9a=sib | 4 (4) | 0 | ✅ | ✅ | ✅ |
| 니푸록사지드\|200밀리그램\|캡슐 | 다 | 7 | 7 | 0 | 7 | 0 | 7 | 0 | 07211b8e=sib | 12 (12) | 0 | ✅ | ✅ | ✅ |
| 디오스민\|600밀리그램\|정 | 다 | 8 | 8 | 0 | 8 | 0 | 8 | 0 | 23caa83e=sib | 56 (56) | 0 | ✅ | ✅ | ✅ |
| 아세트아미노펜\|650밀리그램\|정 | 다 | 7 | 7 | 0 | 7 | 0 | 7 | 0 | abe0e62f=sib | 71 (71) | 0 | ✅ | ✅ | ✅ |
| **합계** | | **59** | **59** | **0** | **59** | **0** | **59** | **0** | 전 그룹 byte-identical | — | **0** | 8/8 | 8/8 | **8/8** |

- **canonicalDup 0** (ko·en 양쪽, 마스터당 정확히 1 canonical).
- **target 밖 drift 0**: 각 그룹 coarse 전체에서 target-fp 마스터는 전부 authored canonical(tgtFpAuthored==tgtFpTotal), exclude-fp 마스터는 전부 easy canonical 유지(exclEasy==exclTotal), exclude 중 authored 오염 0. exclude 수량은 감사값과 정확 일치.
- **링크 정상**: authored ko canonical `source_ref_id` == 8B draft candidate(전 그룹 ref1==T), draft(product_candidate_description_drafts) 존재·matched.
- **EN 재사용 동일성**: target EN canonical md5 distinct=1, 동일 source_ref sibling(out-of-target) EN md5 distinct=1, target md5 == sibling md5 (byte-identical) — 전 8그룹. sibling out 수 5/7/10/11/13/15/26/56… (선행 완료 형제 재사용 입증).
- **가∪ ∩ 다∪ target 교집합 0** 재확인 (30 vs 29, distinct 59).

### 2.1 write 회계 (참고)

| 축 | 값 |
|---|---|
| T (target master) | 59 |
| KO write (4T: NR insert + easy demote + authored flip + audit) | 236 |
| EN write (2T: en NR insert + en canonical flip) | 118 |
| 총 (6T) | 354 |
| ko canonical **행** 수(현재 LIVE, 마스터당 1) | 59 |
| en canonical **행** 수(현재 LIVE, 마스터당 1) | 59 |

> KO 236 / EN 118 은 생산 시 발생한 **write 이벤트 총량**(4T/2T)이고, ko/en canonical **행** 수는 각 59(=T). 혼동 주의.

---

## 3. 판정

**NEXT-BATCH-8B = VERIFIED.** 8/8 그룹 전 축 PASS. 수량 불일치·링크 오류·drift·canonicalDup>0 **없음.** 생산 재개 불필요(재실행 시 전 그룹 no-op).

## 4. 산출물·커밋·push

- 본 CHECK 문서 1개만 신규 산출물(path-specific commit). runner 미실행 → run.json clobber 0.
- Stage-1 게이트 아티팩트는 선행 커밋 `d5fef892c`(gate script/forensic/JSON). 감사 SSOT `b82d7e7ed`.
- **push 보류** — 운영자 확인 후.
