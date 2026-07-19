# CHECK-O4O-OTC-ERDOSTEINE-300MG-UPGRADE-DRYRUN-EXECUTE-V1 — 에르도스테인 300mg 승격 dry-run 실행 (에이전트 가)

WO: `WO-O4O-OTC-ERDOSTEINE-300MG-UPGRADE-DRYRUN-EXECUTE-GA-V1` · 일자: 2026-07-18 · 상태: **FAIL (dry-run ABORT — fingerprint 재현 불일치)**
기준 커밋: 파일럿 스크립트 `b22c051b1` + 정정 `f67e520f4`. 채널: Cloud SQL Auth Proxy(:5442) → production, SELECT only. **DB write 0** (ABORT는 pre-check 게이트, 트랜잭션 이전).

---

## 0. 결론

> **dry-run = FAIL(ABORT, 이상 3건). 실제 apply·write 없음. 근본 원인: 파일럿 스크립트(`drug-otc-erdosteine-300mg-canonical-upgrade-pilot.ts`)의 per-master fingerprint 재계산이 bridge SSOT(f2c819451) 알고리즘을 재현하지 못해, coarse 30 master 가 전부 SSOT 미분류로 떨어지고 TARGET_FP(4b4e162690065e8e, 26)·EXCLUDE_FP(d68b3eec1cb56646, 4) 어느 쪽에도 매칭되지 않는다(target 0). WO 상 fingerprint 변경 금지 → 미수정 보고. JSON 미생성(ABORT 가 writeFileSync 이전).**

---

## 1. dry-run 실행 결과

| 항목 | 값 |
|---|---|
| 모드 | dry-run (read-only, `--apply` 없음) |
| 결과 | **FAIL — ABORT** |
| DB write | **0** (pre-check 게이트에서 throw, STEP B 트랜잭션 미진입) |
| JSON 산출 | **미생성** (`otc-erdosteine-300mg-upgrade-dryrun-v1.json` — ABORT 가 writeFileSync 이전 line 151 throw) |
| byte-identical | **N/A** (JSON 없음). 단 ABORT·이상 3건은 2회 실행 **동일**(결정론적 실패) |

### anomalies (3)
```
1. target 0 !== EXPECTED 26 (bridge SSOT 그대로확장 재고정 불일치)
2. SSOT 미분류 fingerprint 30 (coarse 30 = 26+4 외)
3. e약은요 STORE ko canonical 정확히1 아닌 master (0/26)   ← target 0 이라 0 master 검사
```

---

## 2. 게이트 확인 (WO §5)

| 게이트 | 기대 | 실측 | 판정 |
|---|---|---|:---:|
| bridge SSOT 대상 26 | 26 | **0** (재계산 fp 미매칭) | ❌ |
| 제외 4건 안전불일치 유지 | 4 | 0 (미분류로 분류 안 됨) | ❌ |
| easy canonical 26 | 26 | 검사 불가(target 0) | ❌ |
| authored canonical 충돌 0 | 0 | 검사 불가 | — |
| authored needs_review 기존 수 | — | 검사 불가 | — |
| anomalies 0 | 0 | **3** | ❌ |
| audit `canonical_replaced` metadata previous/new 보존 | 보존 | 코드상 STEP B 에 구현(previous_description_id+new_description_id 동시, metadata previousSource/newSource) — **실행 미도달** | (설계 OK, 미검증) |

---

## 3. 근본 원인 (진단, read-only)

- bridge groups JSON 실측: 에르도스테인 300mg 정 = **fp `4b4e162690065e8e`(authored그대로확장, size 26)** + **fp `d68b3eec1cb56646`(안전지문불일치, size 4)**. → 스크립트 TARGET/EXCLUDE 상수는 **정확**.
- 그러나 스크립트가 master 원문에서 **fingerprint 를 재계산**(자체 `normalize`/`sections`/`groupKeyOf`)한 값이 bridge f2c819451 의 `normFull` 산식과 **다르다** → 30 master 전부 4b4e1626·d68b3eec 어디에도 안 맞음("SSOT 미분류 30").
- 즉 SSOT 26 을 스크립트가 **재현으로 확정하지 못한다**. (fingerprint 재계산 재현 버그 — 파일럿 스크립트 소유 세션 소관.)

---

## 4. 실제 예상 write (스크립트 설계값 — 미검증)

스크립트 `expectedWrite` 설계(정합 시): STEP A authored ko needs_review 준비(신규 needs_review 수는 기존 authored needs_review 에 따라 가변) · STEP B easy demote **26** · authored flip **26** · audit `canonical_replaced` **26**(엔티티 모델 1행/교체=previous+new 동시) · audit_write_total **26**.
> ⚠️ 스크립트 자체 플래그: 정책 §2-A "audit 2/master=52(demote 1 + flip 1)" 와 엔티티 모델 26 이 **불일치** — apply 전 정합 필요(스크립트 기록). 단 이번 dry-run 은 target 0 으로 write 게이트에 도달하지 못해 26 도 미검증.

---

## 5. 완료 보고 대조 / 다음

| WO 완료 항목 | 결과 |
|---|---|
| dry-run PASS/FAIL | **FAIL** |
| byte-identical | N/A(JSON 미생성) · ABORT 결정론적 동일 |
| 실제 예상 SPD/audit write | **미확정**(target 0, 게이트 미도달) — 설계값 easy26/flip26/audit26 |
| anomalies | **3** |
| rollback 26 master | **미확정**(SSOT 26 재현 실패) |
| DB write | **0** |

> **차단**: 26건 승격 승인 봉투 발급 불가(dry-run FAIL). **선행 필요(파일럿 스크립트 소유 세션)**: ① fingerprint 재계산을 bridge f2c819451 `normFull` 산식과 **동치**로 맞추거나, ② bridge 가 SSOT 26 master ID 를 직접 산출·영속화(재계산 대신 ID 주입). 정합 후 dry-run 재실행 → PASS 시 승인 봉투. WO 금지(정책·fingerprint 변경·제외 4 편입) 준수로 본 세션은 미수정.
