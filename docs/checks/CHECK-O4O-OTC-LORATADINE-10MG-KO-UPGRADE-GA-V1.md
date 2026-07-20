# CHECK — WO-O4O-OTC-LORATADINE-10MG-KO-UPGRADE-GA-V1

**에이전트 가 (단일 write-owner) · APPLIED (production DB write) · 2026-07-20**

준비 감사([`270e3f8a6`](CHECK-O4O-OTC-LORATADINE-10MG-UPGRADE-PREP-AUDIT-GA-V1.md)) 기준으로 로라타딘 10mg 정 38건을
e약은요 canonical → **ko authored canonical 로 승격 완료**. 범용 runner([`drug-otc-grounded-upgrade-runner.ts`](../../apps/api-server/src/scripts/drug-otc-grounded-upgrade-runner.ts)) 최소 등재 후 이중게이트 apply.

---

## 1. 실행 절차 (기존 승인 봉투 = 에르도스테인/트리메부틴 파일럿)

1. **GROUP_REGISTRY 최소 등재**: `loratadine-10mg-jeong`(target fp `83bcf192525baa16` · exclude fp `168c9fc2508b87da` 단일 · expected 38 · excludedExpected 3).
2. **selftest**(비DB) PASS(14건).
3. **dry-run 2회 → byte-identical PASS**(target 38/38, 이상 0). 산출: `otc-grounded-upgrade-loratadine-10mg-jeong.dryrun-pass.json`.
4. **apply**(`--apply` + `DRUG_OTC_GROUNDED_UPGRADE_CONFIRM=YES`): STEP A needs_review INSERT → STEP B 단일 TX(easy demote → authored flip → audit) → 사후검증 → COMMIT.

---

## 2. write 결과 (writeActual)

| 단계 | 값 |
|---|:-:|
| STEP A authored needs_review INSERT | **38** |
| STEP B easy canonical demote | **38** |
| STEP B authored canonical flip | **38** |
| audit canonical_replaced INSERT | **38** |
| SPD write total | **114** |
| audit write total | **38** |

in-script 사후검증: `canonical1=38 · authored=38 · deprecatedEasy=38 · dup=0`.

---

## 3. 독립 검증 (runner 밖 별도 쿼리)

| 검증 | 결과 | 판정 |
|---|---|:-:|
| target 38 — canonical STORE ko = authored(mfds_drug_otc) 정확히 1/master | `canon1=38 · authored=38 · dep(easy deprecated)=38 · notone=0` | ✅ |
| target audit — `canonical_replaced` (source_ref `0a7dee0b…`) | **38** | ✅ |
| **제외 3건 불변** — STORE ko canonical | `mfds_easy_drug:canonical × 3` (변경 없음) | ✅ |
| 제외 3건 authored row | **0** | ✅ |
| 제외 3건 audit row | **0** | ✅ |

- target 38 / exclude 3 / other 0 고정 준수. **대상 외 write 0** (제외 3건·비대상 fp 무변경).
- 제외 3건(`7ad63fdf…` · `f1e1bcbd…` · `f22fe18d…`, 전부 `로타인정`, fp `168c9fc2…`) = apply 전후 동일(pre: easy canonical·authored 0 → post: 동일).

---

## 4. 멱등성 (ALREADY_UPGRADED)

동일 게이트로 **재실행 → `status=ALREADY_UPGRADED · dbWrite=0`** ("target 38 전부 authored canonical — 이미 승격됨. write 0, 정상 종료"). 재실행 write 0 확인. 산출: `otc-grounded-upgrade-loratadine-10mg-jeong.run.json`.

---

## 5. 금지/불변 준수

| 항목 | 준수 |
|---|---|
| target 38 / exclude 3 / other 0 고정 | ✅ |
| 제외 3건 및 대상 외 write 0 | ✅ (독립 검증) |
| 기존 canonical 무손실 | ✅ (easy → deprecated 보존, hard delete 없음) |
| fingerprint·정책 변경 없음 | ✅ (runner 산식 VERBATIM, GROUP_REGISTRY 등재만) |
| 단일 write-owner | ✅ (source_ref `0a7dee0b…` = 에이전트 가) |
| 이중게이트 | ✅ (`--apply` + `CONFIRM=YES`) |

**결론**: 로라타딘 10mg 정 **38건 ko authored canonical LIVE**. 제외 3건 불변, 멱등 확인. audit 38(엔티티 `canonical_replaced` 1행/교체 모델). EN 전개는 별도 BULK-TRANSLATION 경로 WO 대상.
