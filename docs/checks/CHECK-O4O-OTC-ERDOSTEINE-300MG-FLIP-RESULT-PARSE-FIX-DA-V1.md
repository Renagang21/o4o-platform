# CHECK — 에르도스테인 300mg 승격 RETURNING 결과 파싱 최소 수정

**WO:** WO-O4O-OTC-ERDOSTEINE-300MG-FLIP-RESULT-PARSE-FIX-DA-V1 (에이전트 다)
**성격:** 결과 파싱·타입 안전성 최소 수정 · **DB write 0**(코드만) · 재실행은 에이전트 가
**스크립트:** `apps/api-server/src/scripts/drug-otc-erdosteine-300mg-canonical-upgrade-pilot.ts`

---

## 0. 원인

TypeORM `query()` 의 `UPDATE … RETURNING` 결과가 드라이버에 따라 **`[rows, affected]`** 또는 **`rows`** 로 온다(guide Gotcha #3). STEP B flip 이 `flip[0].id` 로 읽어 `[rows, affected]` 형태에서 `flip[0]=rows배열` → `.id=undefined` → `newId=null` → `flip 실패 ABORT` → STEP B ROLLBACK. (STEP A needs_review 26 은 별도 TX 로 이미 커밋되어 정상 준비 상태, live canonical 은 e약은요 그대로 안전.)

---

## 1. 수정 (파싱·타입 안전성만)

공통 헬퍼 추가:
```ts
const retRows = (res) => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res);
// [rows, affected] → rows. SELECT(res[0]=행 객체)는 그대로.
```

**수정한 반환값 처리 지점 4:**

| 지점 | 이전 | 수정 |
|---|---|---|
| STEP A INSERT `insA` | `Array.isArray(insA)?insA.length:0` → `[rows,affected]` 시 2 오집계 | `retRows(insA).length` (재실행 시 0=no-op) |
| easy demote UPDATE | RETURNING 없음, `demoted+=1` 무조건 | `RETURNING id` + `retRows(demote).length===1` 검증 |
| authored flip UPDATE | `flip[0]?.id`(오독→null→ABORT) | `retRows(flip)[0]?.id` + `length===1` 검증 |
| post-verify SELECT | `post[0]` | `retRows(post)[0]` (SELECT 안전, 방어적 정규화) |

- **fingerprint·대상 26·제외 4·정책·audit 규약 변경 없음.** 기존 needs_review 26 삭제 없음. canonical·draft 구조 변경 없음.
- typecheck: 내 파일 오류 **0**.

---

## 2. 재실행 시 동작 (설계)

- **STEP A**: needs_review 26 이미 존재 → `INSERT WHERE NOT EXISTS(authored canonical|needs_review)` = **0 (no-op)**.
- **STEP B (단일 TX)**: master별 cur=canonical(e약은요) 확인 → demote(easy→deprecated) **26** → flip(authored needs_review→canonical) **26** → audit(canonical_replaced) **26** → 사후검증(canonical1=26·authored=26·deprecated easy=26·dup=0) → COMMIT.
- 대상 외 write 0 · 제외 4 미접촉(masterIds 26 한정).
- **재실행 no-op**: 재재실행 시 cur.source_type ∈ authored → `continue`(demote/flip 0).

---

## 3. 완료 보고

- **수정 지점:** STEP A insert · easy demote · authored flip · post-verify (4곳, `retRows` 정규화 + affected 검증)
- **typecheck:** 내 파일 **0 errors**
- **고정 조건 준수:** fingerprint/26/4/정책/audit 무변경 · needs_review 26 미삭제 · 구조 무변경 · 파싱/타입 안전성 한정
- **commit·push:** ↓ SHA
- **에이전트 가 재실행 명령:**
  ```bash
  # 인증(.env DB_PASSWORD) 세션, Cloud SQL Proxy :5442, 승인 봉투 유효
  cd apps/api-server
  DRUG_OTC_ERDO_UPGRADE_CONFIRM=YES npx tsx src/scripts/drug-otc-erdosteine-300mg-canonical-upgrade-pilot.ts --apply
  # 기대: stepA_inserted 0(no-op) · demote 26 · flip 26 · audit 26 · post canonical1/authored/dep=26 dup=0
  # 이후 독립 검증(별도 재쿼리) + 재실행 no-op 확인
  ```

---

*RETURNING 결과 shape 파싱 최소 수정. STEP A no-op, STEP B 재실행 대상. 실제 write 는 가(승인 봉투 유효).*
