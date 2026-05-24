# IR-O4O-OPERATOR-ROLE-ASSIGNMENT-DATA-AUDIT-V1

> **⚠️ POLICY ALIGNMENT NOTE (2026-05-24)**
>
> 본 IR 의 **§1.1 ~ §1.3 (4 operator 계정 inactive RA 확정)** + **§4 (보정 방식)** 은
> WO-W1 (commit `bcaa4a5dd`) 으로 처리 완료 — 유지된다.
>
> 본 IR 의 **§2.1 "KPA seed 계정 부재 — 별도 사안"** 표현은 사실 확정 후 **정책 의미가 바뀌었음**:
> CHECK-O4O-KPA-SEED-ACCOUNT-STATUS-SQL-V1 로 3 계정 부재가 literal 사실로 확정되었으며,
> 정책 `project_test_account_cleanup_policy` 채택 후 이는 **정상 상태** 이다 (이슈 아님).
> 후속 cleanup 은 [IR-O4O-KPA-TEMP-SEED-ACCOUNT-RESIDUE-AUDIT-V1](IR-O4O-KPA-TEMP-SEED-ACCOUNT-RESIDUE-AUDIT-V1.md)
> 의 W1/W2/W3 으로 처리.
>
> 본 문서는 audit trail 보존 목적으로 유지.

> **데이터 감사 보고서 (Read-Only Data Audit)**
>
> 코드 수정 없음 / 데이터 수정 없음 / 정책 변경 없음
>
> `service_memberships` 에는 active operator/admin 멤버십이 존재하지만 `role_assignments` 에 대응 active row 가 없는 사용자를 production 운영 환경에서 전수 조사한 보고서.

- **작성일:** 2026-05-23
- **분류:** Data Audit Report (Read-Only — 운영 데이터 SELECT only)
- **선행 IR:** [IR-O4O-MEMBERSHIP-ONLY-OPERATOR-ROLE-GUARD-V1](IR-O4O-MEMBERSHIP-ONLY-OPERATOR-ROLE-GUARD-V1.md) — Option A 채택, W1 의 Phase 1 사전 조사
- **참조 SSOT:**
  - `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` (F9)
  - `docs/architecture/USER-OPERATOR-FREEZE-V1.md` (F11)
- **검증 환경:** `api.neture.co.kr` (production), Cloud Run 배포본
- **검증 방법:** Production API read-only 조회 (cookie-based auth, platform:super_admin caller)
- **버전:** V1

---

## 0. 조사 목적 / 한계

**목적**: 선행 IR (`MEMBERSHIP-ONLY-OPERATOR-ROLE-GUARD-V1`) 의 권장 Option A 의 Phase 1 — 영향 사용자 명단·수·구체 상태 확정.

**검증 방법 선택 사유**:

- 직접 SQL (`gcloud sql connect`) 검증은 본 환경의 한계로 차단:
  - psql client 미설치
  - production DB instance 가 `netureyoutube` 프로젝트 소속 — 본 gcloud session 에서 `o4o-platform` 프로젝트만 default 조회됨
- 대안으로 **production API 의 read-only 조회 사용**:
  - `GET /operator/members?all=true&limit=1000` — 전 사용자 cross-service 멤버십
  - `GET /operator/members/:userId` — 사용자 별 role_assignments 상세
  - `WO-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-FIX-V1` 의 Option B 가 적용된 후이므로 `all=true` 명시로 audit 가능

→ SQL 직접 검증이 더 정확하지만 본 audit 의 결론은 동일. SQL 검증은 후속 W1 의 *보정 후 검증 단계* 에서 진행 권장 (Cloud Console SQL Editor 사용).

---

## 1. 전수 조사 결과 — 보정 대상 4 건

### 1.1 운영자/관리자 멤버십 5 건 (`sm.status='active' AND sm.role IN ('operator','admin')`)

| # | Email | service_key | sm.role | 기대 RA 값 | active RA | inactive RA | 보정 필요 |
|---|-------|-------------|---------|-----------|-----------|-------------|:--------:|
| 1 | `glyco-operator@o4o.com` | glycopharm | operator | `glycopharm:operator` | `[]` | `['glycopharm:operator']` | **YES** |
| 2 | `kcos-operator@o4o.com` | k-cosmetics | operator | `cosmetics:operator` | `[]` | `['cosmetics:operator']` | **YES** |
| 3 | `kcos-admin@o4o.com` | k-cosmetics | admin | `cosmetics:admin` | `[]` | `['cosmetics:admin']` | **YES** |
| 4 | `neture-operator@o4o.com` | neture | operator | `neture:operator` | `[]` | `['neture:operator']` | **YES** |
| 5 | `sohae2100@gmail.com` | kpa-society | admin | `kpa:admin` | `['kpa:admin', 'kpa:operator', 'neture:admin', 'neture:operator', 'glycopharm:admin', 'glycopharm:operator', 'cosmetics:admin', 'cosmetics:operator', 'kpa:store_owner', 'platform:super_admin']` | `[]` | 정상 |

**보정 대상 = 4 건.** sohae2100 (platform admin) 1 건은 정상.

### 1.2 핵심 패턴 — Inactive RA 단일 row 존재 (Missing 아님)

본 audit 에서 **누락(missing) 이 아니라 비활성(inactive)** 임이 확정됨.

- 4 명 모두 **`role_assignments` 에 정확히 기대값의 row 가 1 개 존재** — 단 `is_active=false`
- 선행 IR §3.2 의 가능성 (c) "role_assignments row 가 한 번 생성되었다가 비활성화 / 삭제됨" 이 정확.

비교 — super-admin 의 두 row 패턴 (검증을 위한 참조):

```text
super-admin@o4o.com:
  platform:super_admin | is_active=true   ← 활성 row
  platform:super_admin | is_active=false  ← 과거 inactive row (잔존)
```

→ super-admin 에는 **새 active row 가 생성** 되었으나, 다른 4 명에는 **새 active row 생성이 누락** 됨. 일관적 패턴 — partial migration / partial repair 흔적.

### 1.3 추정 원인 (확정 — 보정 방식 변경)

선행 IR §3.2 의 4 가지 가능성 중 **(c) 가 확정**.

- ❌ (a) seed migration 미적용 — 그렇다면 row 자체가 없어야 함. 실제로는 row 가 있고 비활성.
- ❌ (b) 다른 seed 가 sm 만 생성 — 동일 사유로 기각.
- ✅ **(c) role_assignments row 가 한 번 생성되었다가 비활성화 / 삭제됨**.
- ❌ (d) `_upsertRoleAssignment` 부분 실패 — DO NOTHING 이라 부분 실패가 아니라 정상 동작했음.

추가 추정: 어느 시점에 RA cleanup / rotation 스크립트가 실행되어 4 계정의 RA 를 deactive 처리했는데, **새 active row 를 만들지 않은 채로 끝난 partial repair**. super-admin 만 새 active row 를 함께 생성받음.

---

## 2. 서비스별 분포

| service_key | 보정 대상 | 비고 |
|------------|:--------:|------|
| **neture** | 1 | `neture-operator@o4o.com` |
| **k-cosmetics** | 2 | `kcos-operator@o4o.com`, `kcos-admin@o4o.com` |
| **glycopharm** | 1 | `glyco-operator@o4o.com` |
| **kpa-society** | 0 | sohae2100 은 정상. KPA seed 계정 (kpa-admin, kpa-operator, phamacy1) **production 에 부재** |
| 합계 | **4** | |

### 2.1 KPA Seed 계정 부재 — 별도 사안

본 audit 중 발견된 별도 사실:

- seed 파일 `BootstrapCanonicalSeedAccounts` 가 정의한 KPA 계정 — `kpa-admin@o4o.com`, `kpa-operator@o4o.com`, `phamacy1@o4o.com` — **production users 테이블에 부재**
- production 의 20 명 user 목록 중 위 3 계정이 보이지 않음
- seed migration 의 파일명 timestamp `20260927100000` (2026-09-27) 가 현재(2026-05-23) 보다 미래 → **이 seed migration 자체가 production 에 아직 적용되지 않음**

**그러나** 다른 4 계정 (`neture-operator`, `kcos-operator`, `kcos-admin`, `glyco-operator`) 은 **이미 존재** — 다른 더 이른 시점의 seed 또는 수동 생성으로 보임.

→ **KPA seed 계정 부재는 본 IR 의 범위 밖.** 별도 추후 검토 (필요 시 seed migration 강제 실행 또는 수동 생성).

---

## 3. 일반 회원 / 기타 계정 — 영향 없음

본 audit 의 cross-service membership 결과(20 명) 중, 위 5 명(operator/admin) 외 나머지 15 명의 분포:

| 카테고리 | 수 | 비고 |
|---------|:--:|------|
| `customer` 멤버십만 보유 | 9 | 일반 회원 — F11 Operator 정의 무관 |
| `user` 멤버십 | 3 | KPA Society 일반 사용자 |
| `pending` 멤버십 | 2 | 가입 대기 |
| `store_owner` | 1 | k-cosmetics store_owner (별도 role) |
| 멤버십 0 (super-admin) | 1 | platform:super_admin (active RA 보유) |
| **합계** | **15** | 보정 무관 |

→ **본 IR 의 보정 대상은 §1.1 의 4 명으로 확정**.

---

## 4. 보정 방식 제안

### 4.1 권장 — Inactive RA Reactivation (단순 UPDATE)

기존 inactive row 가 이미 존재하므로, 새 row 를 INSERT 하기보다 **기존 row 의 `is_active`를 `true` 로 reactivate** 하는 것이 단순하고 안전.

**read-only 검증용 SQL**:

```sql
-- 보정 전 — 현재 상태 확인
SELECT u.email, ra.role, ra.is_active, ra.valid_from, ra.valid_until, ra.assigned_by, ra.created_at
FROM users u
JOIN role_assignments ra ON ra.user_id = u.id
WHERE u.email IN (
  'neture-operator@o4o.com',
  'kcos-operator@o4o.com',
  'kcos-admin@o4o.com',
  'glyco-operator@o4o.com'
)
  AND ra.role IN ('neture:operator', 'cosmetics:operator', 'cosmetics:admin', 'glycopharm:operator')
ORDER BY u.email, ra.role;
```

**보정 SQL (UPDATE — write — 사용자 승인 필요)**:

```sql
-- 옵션 A1: 기존 inactive row 를 active 로 reactivate
UPDATE role_assignments ra
SET is_active = true,
    valid_from = COALESCE(valid_from, NOW()),
    valid_until = NULL,
    updated_at = NOW()
FROM users u
WHERE ra.user_id = u.id
  AND ra.is_active = false
  AND (
    (u.email = 'neture-operator@o4o.com' AND ra.role = 'neture:operator')
    OR (u.email = 'kcos-operator@o4o.com' AND ra.role = 'cosmetics:operator')
    OR (u.email = 'kcos-admin@o4o.com' AND ra.role = 'cosmetics:admin')
    OR (u.email = 'glyco-operator@o4o.com' AND ra.role = 'glycopharm:operator')
  );
```

→ 영향 row = 4. 4 명 모두 inactive RA 가 정확히 1 개씩 있음을 §1.1 에서 확인.

### 4.2 대안 — `roleAssignmentService.assignRole()` 호출 (Application Layer)

직접 UPDATE 대신 application 의 `roleAssignmentService.assignRole(userId, role)` 호출.

**장점**:
- F9 SSOT 의 Write path 준수 — "Write | `roleAssignmentService.assignRole()` / `removeRole()`"
- 부작용 (action log 등) 자동 처리

**단점**:
- API endpoint 가 필요 (수동 호출 도구)
- assignRole 의 내부 동작이 inactive → active reactivation 인지 INSERT 인지 확인 필요

**권장**: §4.1 의 SQL UPDATE 가 더 단순하나, F9 SSOT 의 Write path 정합 차원에서 §4.2 가 더 canonical. W1 단계에서 어느 방식을 채택할지 사용자 / 개발자 결정.

### 4.3 Constraint 충돌 주의

`role_assignments` 에는 `unique_active_role_per_user` 같은 unique constraint 가 있을 수 있음 (seed migration 의 `ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING` 참조).

- §4.1 UPDATE 방식: 한 사용자에 동일 role + is_active=true 가 하나만 있으므로 충돌 없음 (현재 inactive 1 개를 active 로 전환)
- §4.2 assignRole 방식: assignRole 의 구현이 이 constraint 를 handle 하는지 사전 확인 필요

---

## 5. Current Structure vs O4O Philosophy Conflict Check (필수)

| 차원 | Current | F9 / F11 SSOT | 충돌 |
|------|---------|---------------|:----:|
| 4 계정의 권한 검사 (RA 비활성) | 검사 실패 → 403 | F9: RA active 가 권한 source | **데이터 드리프트** |
| 4 계정의 식별 (SM 활성) | 식별 통과 → Operator 로 식별됨 | F11 §1.2: SM 가 Operator 식별 | 정합 |
| `requireRole` 동작 | RA only | F9 정합 | 정합 |
| `requireOperatorAccess` (stores) 의 bypass | SM fallback 으로 4 계정 통과 시킴 | F11 §2 "membership bypass 로직 ❌" | 위반 (선행 IR §4 와 동일) |
| canonical 의도 (양 테이블 모두 채움) | 4 계정에서 깨짐 | seed 와 F9+F11 의 합의 | **드리프트** |

**판정**: 데이터 드리프트는 정책 자체의 모순이 아니라 **partial repair 흔적**. 정책은 모순 없음 — Option A 보정 후 모든 차원 정합 회복.

---

## 6. W1 진행 가능 여부 — 판정

| 차원 | 판정 |
|------|:----:|
| 보정 대상 식별 완료 | **YES** — 4 계정 명단 확정 |
| 보정 대상 수 운영 영향 | **LOW** — 4 계정만, 모두 seed 운영자 (테스트 / 데모 환경 운영자 추정) |
| 보정 방식 명확 | **YES** — §4.1 (SQL UPDATE) 또는 §4.2 (assignRole) |
| 보정 후 검증 SQL 준비 | **YES** — §4.1 의 SELECT 사용 |
| 코드 변경 사전 작업 | 데이터 보정 *후에* stores.routes 정상화 (선행 IR §7.2 Phase 2 → Phase 3) |
| Constraint 안전성 | **확인 필요** — `unique_active_role_per_user` constraint 의 동작 |

→ **PASS — W1 진행 가능.** 단, W1 의 Phase 2 (데이터 보정) 와 Phase 3 (코드 변경) 의 순서 보장 + constraint 사전 확인 필수.

---

## 7. 후속 작업

| # | 산출물 | 비고 |
|---|--------|------|
| **W1** | `WO-O4O-OPERATOR-ROLE-ASSIGNMENT-REPAIR-AND-GUARD-NORMALIZATION-V1` | 본 IR 의 4 계정 데이터 보정 + stores.routes 정상화 (선행 IR Option A 전체) |
| 선행 점검 (W1 의 §1) | `role_assignments` 테이블의 unique constraint 정확한 정의 확인 (`unique_active_role_per_user` 의 컬럼 / 동작) | constraint 충돌 가능성 사전 확인 |
| 별도 (범위 밖) | KPA seed 계정 부재 — seed migration 적용 또는 수동 생성 여부 검토 | 본 IR §2.1 |

---

## 8. 본 IR 이 결정하지 않는 것

- 실제 데이터 보정 (별도 WO 의 Phase 2)
- 보정 방식 — §4.1 SQL 또는 §4.2 assignRole — 의 최종 채택 (W1 시작 시 결정)
- KPA seed 계정 부재 대응 — 별도 사안
- super-admin@o4o.com 의 중복 inactive row 정리 — 데이터 위생 차원, 본 IR 범위 밖

---

## 9. 사용자 확정 필요 항목

| # | 항목 | 본 IR 권고 |
|---|------|:----------:|
| 1 | W1 진행 가능 여부 | **PASS** (§6) |
| 2 | 보정 방식 — §4.1 SQL UPDATE 또는 §4.2 assignRole 호출 | §4.1 (UPDATE) 가 단순. §4.2 (assignRole) 가 canonical. W1 시작 시 선택 |
| 3 | KPA seed 계정 부재 대응 | **별도 사안** — 본 WO 의 정합성과 무관, 후속 |
| 4 | super-admin 의 중복 inactive row 정리 | **선택** — 위생 차원, 필요 시 별도 cleanup |

---

## 10. 부록 — 사용된 검증 절차 (재현 가능)

```bash
# 1. platform:super_admin 로그인 (cookie jar)
curl -X POST https://api.neture.co.kr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<admin email>","password":"<admin password>"}' \
  -c cookies.txt -o /dev/null

# 2. cross-service member listing — Option B 의 ?all=true 사용
curl -b cookies.txt "https://api.neture.co.kr/api/v1/operator/members?all=true&limit=1000"
#   → 20 명의 사용자 + 멤버십 정보

# 3. 각 operator/admin 사용자의 role_assignments 상세 조회
curl -b cookies.txt "https://api.neture.co.kr/api/v1/operator/members/<userId>"
#   → roles[] (RA 전체 — active/inactive 모두), memberships[]

# 4. 결과 정리 (이 IR §1.1 표)
```

---

*Version: V1 (2026-05-23)*
*Status: Data Audit Complete — W1 진행 가능 (PASS)*
*Next: 사용자 검토 → W1 착수 (보정 방식 §4.1 또는 §4.2 결정)*
