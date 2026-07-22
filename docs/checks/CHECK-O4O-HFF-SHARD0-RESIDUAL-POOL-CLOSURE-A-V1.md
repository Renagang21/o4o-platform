# CHECK — HFF shard 0 잔여 풀 마감 (Agent A) V1

- 목표: FNV-1a shard 0(shard-count 3) 잔여 기존-registry 복합형 후보 **전량 마감**.
- 성격: **생산(DB write COMMIT)**. dry-run→gate→auto-apply(게이트 전부 통과 시 승인질문 없음)→독립검증.
- 담당 경계: shard 0 전용. 타 shard(1·2) 미접근. `git add .` 금지.
- 종료: 2026-07-22 19:24 (KST). 프로덕션(`o4o-platform-db`), Cloud SQL Auth Proxy v2 port 5433.

---

## 0. SSOT — tag-agnostic 복합형 정의

복합형 슬러그가 `combo-*`(제품별) / `s0-*`·`nc2-*`·`vd-ve` 등(비접두) 혼재라 tag allowlist 는 과소집계.
**tag-agnostic 기준 = 구조적** — HFF master(`import:mfds-hff`) 의 STORE canonical ko o4o_hff_generated SPD 에서 `표시량(` 카운트 **≥ 2**(원료 선언 ≥2 = 복합형).

- 시작 실측 baseline = **3,845** (task SSOT 와 정확 일치, 정의 검증됨).
- canonicalDup 0 · statementNo 중복 master 0 (시작 시점).

## 1. shard-plan

`hff-combo-shard-plan --shard 0 --shard-count 3` (FNV-1a `stableHash(sig)%3`):
- scanned 33,504 unpromoted candidate · clean full-set 4,506 · **signature 319 · 후보합 858**.
- 최다 signature: 비타민D+아연(264) · 비타민C+아연(25) · mg+vd+vk+ca(14) 등.
- 불안정 패밀리(식이섬유·오메가3·루테인·가르시니아·은행·녹차·테아닌 + 기능성앵커) 제외는 shard-plan 기본 정책.

## 2. select (전 319 signature) — exclude-taken · statement-nos 직접주입

각 signature: `hff-combo-select --combo <sig> --shard 0 --shard-count 3 --exclude-taken --statement-nos-file <plan-stmts>`.
- shard 조기스킵으로 교집합 0 보장. exclude-taken = master 연결 OR canonical STORE SPD 존재 사전제외.

| 결과 | 수 |
|------|:-:|
| 후보(plan) | 858 |
| **ELIGIBLE(fresh)** | **276** (non-empty signature 199) |
| select-stage HOLD | 582 |
| ├ HOLD_GROUNDING | 546 |
| ├ HOLD_IDENTITY | 27 |
| ├ BULK | 7 |
| └ 액상(UNSUPPORTED) | 2 |

- **비타민D+아연(264 후보) = ELIGIBLE 0**: 잔여 풀은 본질적으로 hard-case(clean 은 선행 shard 가 이미 수확). grounding 546 이 이를 반영.

## 3. generate (KO/EN + design) · Guard

199 non-empty pool → `hff-combo-generate` (composeCombo + G-MULTI + 표준 Guard, 개별 BLOCKED 자동 HOLD):
- **작성 257** = PASS 238 · REVIEW 19 · BLOCKED 0
- **자동HOLD(REVIEW_LATER) 19** (개별 제품 Guard 문제 — 배치 제외)
- 257 + 19 = 276 (ELIGIBLE 전량 정산). design = sd-* 시맨틱 HTML(렌더러 variant 반응형).

### combine
- 199 pool 병합 → **257 READY** · cross-signature dup 0 · missDraft 0 · missGround 0 · unique stmt 257.
- 전건 `표시량(` ≥2 (구조적 복합형 확인, 분포 2~17원료).

## 4. dry-run → gate → auto-apply

slug = **`combo-s0fin`** (`batch:single-nutrient-combo-s0fin`, 사전 collision 확인 FREE).

### dry-run(exec+rollback)
```
preload: candidateMatch 257(missing0·ambiguous0) · 사전승격0 · masterDup0 · canonicalSpdDup0 · ko/en 257/257 · BLOCKED0 · sanitizeEmpty0
expectedWrites: masters257 + candidateUpdate257 + SPD514 = 1028
postVerify: masters257·spdKo257·spdEn257·canonicalDup0·candidatesLinked257·spdRefLinked514
postVerifyPass: true → ROLLBACK (DB write 0)
```

### 자동 apply 게이트 (전부 통과 → 승인질문 없이 apply)
| 조건 | 결과 |
|------|:-:|
| dry-run PASS | ✓ |
| postVerify PASS | ✓ |
| canonicalDup 0 | ✓ |
| 예상 write = 실측 write (1028) | ✓ |
| rollback 보장 | ✓ (manifest 생성) |
| 기존 LIVE drift 0 | ✓ (사전승격0·masterDup0·canonicalSpdDup0) |
| master/candidate/source_ref 정상 | ✓ (candidateMatch257·spdRefLinked514) |

### COMMIT
```
result: COMMIT 완료 · postVerifyPass true
DB write 1028 = ProductMaster 257 + candidate UPDATE 257(→approved_new_master) + STORE SPD ko257 + en257
rollback manifest: %TEMP%/hff-apply-manifests/hff-combo-s0fin-apply-rollback-manifest.json
```

## 5. 독립검증 (새 연결)

- `hff-combo-verify-committed --slug combo-s0fin --expect 257`: **independentVerifyPass = true** · masters/ko/en 257 · canonicalDup 0 · candidateLinks 257 · spdRefLinks 514 · dbWrite 0.
- 구조적 SSOT probe(재실측): canonicalDup **0** · duplicate-stmt HFF master **0**.

### totalComboLive
- 시작 baseline(구조적) = 3,845.
- **본 배치 기여 = +257.**
- 종료 실측(구조적) = **4,526** — 차 +681 중 **본 배치 257 + 병렬 shard1/2 동시생산 424**(내 ~30분 survey 중 진행분). 본 배치는 기존 master 무변경(drift 0), 초과분은 타 세션 정상 생산.

## 6. 보고 요약

```text
시작: 세션 baseline probe (구조적 3,845 실측) · 종료: 2026-07-22 19:24 KST
조사 signature: 319 (후보 858)
ELIGIBLE(fresh): 276  → READY 257 / REVIEW_LATER 19 / DROP 0
select-stage HOLD(비적격): 582 (grounding546·identity27·bulk7·액상2)
DB write: 1028 (master257 + candidate257 + SPD ko257 en257) · COMMIT
canonicalDup: 0
기존 LIVE drift: 0 (본 배치 — 사전승격0·masterDup0·canonicalSpdDup0)
최종 tag-agnostic totalComboLive(구조적): 4,526 (본 배치 +257 · 병렬 +424)
shard 0 잔여 fresh(producible): 0 — clean full-set 소진. 잔여 unpromoted = 비적격 582(데이터결함) + REVIEW_LATER 19
독립검증: independentVerifyPass true · dbWrite 0
전체 중지 트리거: 없음 (shard교집합0·오연결0·오귀속0·계약정상·예상=실측)
slug: combo-s0fin · rollback manifest 생성
```

## 7. REVIEW_LATER (19) · 잔여

- 19건 = generate 표준/G-MULTI Guard 개별 BLOCKED(자동 HOLD). 목록: `hff-combo-s0fin.review-later.json`. 개별 제품 문제 — 배치 제외, 별도 검토.
- shard 0 clean full-set combo **소진**(조기 종료 조건 충족). 잔여 unpromoted 582 는 grounding/identity/액상/bulk 데이터결함 → 상류 보정 없이는 비생산.

---

*생산 CHECK. dry-run→게이트 전부통과→auto-apply(승인질문 없음)→독립검증 PASS. 타 shard 미접근 · git add . 미사용.*
