# CHECK-O4O-OTC-ERDOSTEINE-300MG-UPGRADE-APPLY-INCIDENT-V1 — 승격 apply 중단 인시던트 (에이전트 가)

WO: 승인 봉투 `OTC-GROUNDED-UPGRADE · ERDOSTEINE-300MG · 26` apply · 일자: 2026-07-18 · 상태: **APPLY 중단(STEP B 스크립트 버그) — 승격 미완료, live 안전**
스크립트: `drug-otc-erdosteine-300mg-canonical-upgrade-pilot.ts`(정본 `2a3e52ba3`). 채널: Cloud SQL Auth Proxy(:5442) → production.

---

## 0. 결론

> **에르도스테인 300mg 정 26건 승격 apply 를 승인 봉투대로 실행했으나, STEP B 에서 `master 075974a7 authored needs_review flip 실패 → ABORT` 로 2회(재시도 포함) **동일 중단**. 근본 원인 = 스크립트의 flip `UPDATE…RETURNING` 결과 파싱 버그(`flip[0].id`)로, 실제 flip 은 정상(standalone SELECT 1행 매칭)인데 typeorm `[rows, affected]` 형태를 오독해 `newId=null` → 거짓 실패 → STEP B ROLLBACK. WO/봉투상 스크립트 수정 금지 → 미수정 중단·보고. live STORE ko canonical 은 e약은요 그대로(불변·안전). STEP A 는 authored needs_review 26 커밋(멱등·중복 0). audit 0. 승격 미완료.**

---

## 1. 실행·중단

| 시도 | 결과 |
|---|---|
| apply #1 (`--apply` + CONFIRM=YES) | STEP A commit(needs_review 26) → **STEP B ABORT** (075974a7 flip 실패) → STEP B rollback |
| apply #2 (재시도) | STEP A no-op(멱등) → **STEP B ABORT** (동일) → rollback |

- 봉투 중단 조건 "TX 내부 검증 불일치" 성립 → 중단. **추가 재시도 안 함**(deterministic).

## 2. 근본 원인 (read-only 진단, 확정)

- flip UPDATE WHERE 를 **standalone SELECT** 로 재현 → master 075974a7 에 대해 **1행 매칭**(`4adef014`, mfds_drug_otc/needs_review/ko, deleted_at NULL). 즉 **flip 대상은 정상 존재**.
- 스크립트: `const flip = await qr.query(…RETURNING id); const newId = Array.isArray(flip) && flip[0] ? flip[0].id : null;` — typeorm queryRunner 의 UPDATE…RETURNING 결과가 `[rows, affectedCount]` 형태면 `flip[0]` = rows **배열** → `flip[0].id` = `undefined` → `newId=null` → `throw 'flip 실패'`.
- 저장소 내 다른 스크립트(alfacalcidol en-promotion 등)는 `const rows = Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res;` 가드 보유. **본 스크립트 flip 에는 그 가드가 없음** → deterministic 오판.
- 결과: flip UPDATE 는 TX 내에서 실제 실행됐을 수 있으나(status→canonical) 스크립트가 실패로 오판 → `throw` → STEP B 전체 ROLLBACK → easy canonical 원복.

## 3. 현재 DB 상태 (확정)

| 항목 | 값 | 판정 |
|---|---|:---:|
| live STORE ko canonical (26) | **mfds_easy_drug canonical 26** | ✅ 불변(승격 미발생, 화면 안전) |
| authored needs_review (26) | **mfds_drug_otc needs_review 26** (STEP A) | 멱등 prepared 상태(중복 0, 52 아님) |
| audit `canonical_replaced` | **0** | STEP B 미커밋 |
| canonical 중복 / 손상 | **0** | ✅ |
| 제외 4건 | 미접촉 | ✅ |

> live canonical 은 e약은요 그대로 → **소비자 화면 영향 0**. STEP A 의 needs_review 26 은 표시되지 않는 준비 상태이며, STEP A 는 멱등(재실행 시 재삽입 0)이라 정정본 STEP B 재실행이 그대로 이어받는다.

## 4. WO/봉투 준수

- 스크립트·정책·fingerprint·bridge 원본 **미수정**(WO 금지). 제외 4건·타 groupKey 혼입 0. 예상 write 초과 0. dry-run JSON 은 커밋본(PASS)으로 복원(작업트리 clobber 방지).

---

## 5. 다음 (owning 세션 = 에이전트 다)

1. **flip 결과 파싱 최소 수정**(정책·fingerprint 불변): `const rows = Array.isArray(flip) && Array.isArray(flip[0]) ? flip[0] : flip; const newId = rows[0]?.id ?? null;` (STEP A insA·post-verify 도 동일 가드 점검).
2. 수정 후 이 세션에서 apply 재실행 → STEP A 멱등 no-op + STEP B flip 성공 → 사후검증 → COMMIT.
3. 기 커밋된 authored needs_review 26 은 정정본 STEP B 가 flip 하므로 **삭제 불요**(cleanup 원하면 별도 승인 DELETE).

> live 안전(canonical 불변). 승격은 flip 파싱 수정 후 재개. 프록시·.env 는 후속 재실행 위해 **유지**(봉투 teardown 은 성공 완료 조건이었으므로 미적용).
