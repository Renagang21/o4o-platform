# CHECK-O4O-OTC-ERDOSTEINE-300MG-UPGRADE-DRYRUN-REEXECUTE-V1 — 에르도스테인 300mg 승격 dry-run 재실행 (에이전트 가)

WO: `WO-O4O-OTC-ERDOSTEINE-300MG-UPGRADE-DRYRUN-REEXECUTE-GA-V1` · 일자: 2026-07-18 · 상태: **PASS (dry-run · 전 게이트 통과)**
기준 커밋: fingerprint 정합 `2a3e52ba3`(bridge 정본 함수 verbatim). 채널: Cloud SQL Auth Proxy(:5442) → production, SELECT only. **DB write 0.**

---

## 0. 결론

> **dry-run PASS. 2회 실행 byte-identical(md5 `c4e3878e3e0bfc83791a2917a6392195`). coarse 30 = target(4b4e162690065e8e) 26 + exclude(d68b3eec1cb56646) 4, other 0, 교집합 0. e약은요 STORE ko canonical 26, authored canonical 충돌 0, 기존 authored needs_review 0, anomalies 0. 예상 write 최대 총 104(SPD 78 + audit 26). rollback master 26 고정. → 26건 승격 승인 봉투 발급 가능.**

---

## 1. 필수 게이트 (WO §필수 게이트) — 전부 PASS

| 게이트 | 기대 | 실측 | 판정 |
|---|---|---|:---:|
| coarse 대상 | 30 | **30** | ✅ |
| target fingerprint `4b4e162690065e8e` | 26 | **26** | ✅ |
| exclude fingerprint `d68b3eec1cb56646` | 4 | **4** | ✅ |
| other | 0 | **0** | ✅ |
| target·exclude 교집합 | 0 | **0** | ✅ |
| e약은요 STORE ko canonical | 26 | **26** (정확히 1건/master, total 26) | ✅ |
| authored canonical 충돌 | 0 | **0** | ✅ |
| anomalies | 0 | **0** | ✅ |
| 2회 실행 JSON byte-identical | yes | **yes** (`c4e3878e…`) | ✅ |

- fpDistribution: `4b4e162690065e8e`×26(그대로확장) + `d68b3eec1cb56646`×4(안전지문불일치) — bridge SSOT 정확 재현.
- 제외 4건 안전불일치 유지(편입 0). 비경구 혼입 0.

---

## 2. 예상 write 확정 (기존 needs_review 0 → 차감 없음)

| 단계 | 연산 | 수 |
|---|---|---:|
| STEP A | authored needs_review INSERT (신규) | **26** |
| STEP B | easy canonical demote (→deprecated) | **26** |
| STEP B | authored canonical flip (needs_review→canonical) | **26** |
| — | **SPD write 합** | **78** |
| STEP B | audit `canonical_replaced` INSERT | **26** |
| — | **audit write 합** | **26** |
| — | **최대 총 write** | **104** |

- 기존 authored needs_review = **0** → STEP A INSERT 26 전량 신규(차감 0).
- ⚠️ **audit 수 정책 플래그(스크립트 자체 기록)**: 엔티티 `SharedProductDescriptionAuditLog` = `canonical_replaced` **1행/교체**(previous_description_id+new_description_id 동시) → 26. 정책 §2-A "audit 2/master=52(demote 1+flip 1)" 와 불일치 → **실제 apply 전 정합 필요**(dry-run 은 엔티티 기준 26 산정). audit metadata 는 previous/new 및 previousSource/newSource 보존(STEP B 구현 확인).

---

## 3. 완료 보고 대조

| WO 완료 항목 | 결과 |
|---|---|
| dry-run PASS/FAIL | **PASS** |
| target 26 / exclude 4 / other 0 | ✅ 26 / 4 / 0 |
| anomalies | **0** |
| 실제 예상 SPD·audit write | SPD **78** · audit **26** · 총 **104** |
| byte-identical | ✅ `c4e3878e…` |
| rollback master 26 | ✅ JSON `rollback_master_ids`(26) |
| DB write | **0** |

---

## 4. 산출물 / 다음

- `apps/api-server/src/scripts/data/otc-erdosteine-300mg-upgrade-dryrun-v1.json` (dry-run 산출, 결정론)
- 본 CHECK 문서. (파일럿 스크립트·정책·fingerprint·bridge 원본 미수정 — WO 금지 준수.)

> **다음**: 전 게이트 PASS → **에르도스테인 300mg 정 26건 e약은요→authored canonical 승격 승인 봉투 발급 가능**. apply 계약 = 정책 Option A(STEP A needs_review 준비 → STEP B 단일 TX: easy demote→deprecated + authored flip→canonical + audit canonical_replaced → 사후검증(canonical 1·authored·deprecated easy 1·dup 0) → COMMIT). apply 전 audit 수(26 vs 52) 정책 정합 1건 확인 권장. rollback = master 26.
