# CHECK-O4O-KPA-SEED-ACCOUNT-STATUS-SQL-V1

> **⚠️ POLICY ALIGNMENT NOTE (2026-05-24)**
>
> 본 CHECK 의 **§0 결론 (부재 확정)** 과 **§4 (선행 IR 의 suspended 가설이 틀렸음을 확정)**
> 은 사실로서 정확하다 — 유지된다.
>
> 그러나 본 CHECK 의 **§3 (b) Blocker 분류, §5 후속 트랙 (recreate WO 권고), §6 (b) 미해결**
> 은 **폐기됨**. 정책 `project_test_account_cleanup_policy` 채택 후 임시 계정은
> 재생성하지 않는 것이 SSOT 이다. 후속은 [IR-O4O-KPA-TEMP-SEED-ACCOUNT-RESIDUE-AUDIT-V1](IR-O4O-KPA-TEMP-SEED-ACCOUNT-RESIDUE-AUDIT-V1.md)
> 의 cleanup 트랙 (WO-W1/W2/W3, commit `bcaa4a5dd` → `f3874965a` → `86a08b420` → 본 commit)
> 으로 처리 완료.
>
> 본 문서는 **audit trail 보존 목적**으로 유지. recreate 권고는 따르지 말 것.

> **검증 보고서 (Read-Only Verification)**
>
> 코드 수정 없음 / 데이터 수정 없음
>
> [IR-O4O-OPERATOR-DATA-HYGIENE-AUDIT-V1](IR-O4O-OPERATOR-DATA-HYGIENE-AUDIT-V1.md) §1.4 의 H1 검증 SQL 을 production 에 실행한 결과 보고서.

- **작성일:** 2026-05-24
- **분류:** Verification Report (Production read-only — API + SQL 우회 채널)
- **선행 IR:** [IR-O4O-OPERATOR-DATA-HYGIENE-AUDIT-V1](IR-O4O-OPERATOR-DATA-HYGIENE-AUDIT-V1.md)
- **검증 환경:** `api.neture.co.kr` (production, Cloud Run `o4o-core-api`, project `netureyoutube`)
- **검증 채널:** Production API (`/api/v1/operator/members?search=...&all=true`, `/api/v1/operator/members/:userId?serviceKey=kpa-society`) — `platform:super_admin` 권한
- **버전:** V1

---

## 0. 결론

**H1 가설 (suspended 상태) 기각. 3 계정 모두 `users` 테이블에서 부재 확정.**

| Email | UUID | API 조회 결과 |
|-------|------|:------------:|
| `kpa-admin@o4o.com` | `b0000000-...000002` | **NOT FOUND** |
| `kpa-operator@o4o.com` | `b0000000-...000003` | **NOT FOUND** |
| `phamacy1@o4o.com` | `b0000000-...000004` | **NOT FOUND** |

→ IR §5.2 조건 **(b) 일부 users 부재** 보다 강한 결과: **전부 부재**.

→ IR §6.1 권고: `WO-O4O-KPA-SEED-ACCOUNT-RECREATE-V1` (큰 WO + Bootstrap 멱등성 보강 IR 선행)

---

## 1. 검증 절차

### 1.1 채널 선택 — SQL 직접 → API 우회

| 채널 | 시도 | 결과 |
|------|------|------|
| `gcloud sql connect` (postgres user) | YES | password 미보유로 hang |
| `gcloud sql connect` (kpa-society / 기타 service user) | NO | 권한 범위 불명, password 미보유 |
| **Production API (super-admin 로그인)** | **YES** | **성공** |

API 우회 채택 — `users` 테이블 부재 여부만 확정하면 되므로 직접 SQL 불필요.

### 1.2 절차

```bash
# 1. super-admin 로그인
curl -X POST https://api.neture.co.kr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<super-admin email>","password":"<...>"}' \
  -c cookies.txt

# 2. email 검색 (cross-service mode)
for email in "kpa-admin@o4o.com" "kpa-operator@o4o.com" "phamacy1@o4o.com"; do
  curl -b cookies.txt "https://api.neture.co.kr/api/v1/operator/members?search=${email}&all=true&limit=5"
done

# 3. UUID 직접 lookup (한 번 더 확정)
for uuid in "b0000000-b000-4000-b000-000000000002" \
            "b0000000-b000-4000-b000-000000000003" \
            "b0000000-b000-4000-b000-000000000004"; do
  curl -b cookies.txt "https://api.neture.co.kr/api/v1/operator/members/${uuid}?serviceKey=kpa-society"
done
```

### 1.3 Sanity Check — 채널 신뢰성 확인

| 사전 검증 계정 | API 응답 | 의미 |
|--------------|---------|------|
| `neture-operator@o4o.com` | total=1 (id=...000005, status=active) | API 검색 정상 동작 |
| `super-admin@o4o.com` | total=1 (id=...000001, status=active) | 동일 |

→ API 채널은 정상. 3 KPA 계정의 0 응답은 **데이터 부재 확정**, 채널 결함 아님.

---

## 2. 상세 결과

### 2.1 Email 검색 (cross-service `?all=true`)

```json
// kpa-admin@o4o.com
{"success":true,"users":[],"pagination":{"page":1,"limit":5,"total":0,"totalPages":0}}

// kpa-operator@o4o.com
{"success":true,"users":[],"pagination":{"page":1,"limit":5,"total":0,"totalPages":0}}

// phamacy1@o4o.com
{"success":true,"users":[],"pagination":{"page":1,"limit":5,"total":0,"totalPages":0}}
```

### 2.2 UUID 직접 lookup

```json
// b0000000-...000002 (kpa-admin)
{"success":false,"error":"User not found"}

// b0000000-...000003 (kpa-operator)
{"success":false,"error":"User not found"}

// b0000000-...000004 (phamacy1)
{"success":false,"error":"User not found"}
```

---

## 3. IR §6.1 / §5.2 분류 적용

| IR 조건 | 본 결과 | 적용 |
|--------|--------|------|
| (a) 모두 존재 + suspended | ✗ | — |
| (b) 일부 부재 | △ (전부 부재로 더 강함) | **본 결과** |
| (c) 모두 정상 active | ✗ | — |

→ **분류: Blocker (조건 (b) 의 strong form)**

본 IR §6.1 조건 (b) 권고:

> `WO-O4O-KPA-SEED-ACCOUNT-RECREATE-V1` — users 재생성 + idempotency 강화
> + 부재 원인 추적 IR 추가
> + Bootstrap 멱등성 보장 강화

---

## 4. 본 IR 결론 vs 실제 결과 대비

| IR 단계의 추정 | 실제 결과 |
|--------------|----------|
| IR §1.3(d) "3 계정 모두 `users` 테이블에 존재" | **틀림** — 모두 부재 |
| IR §1.3(d) "kpa_members.status='suspended' 추정" | **확인 불가** (users 부재로 kpa_members FK 도 cascade delete 추정) |
| IR §1.3(d) "선행 IR 의 '부재' 주장은 suspended 와 혼동" | **반대로 선행 IR 이 정확** — 본 IR 의 추정 (suspended) 가 잘못 |

→ 선행 IR (IR-O4O-OPERATOR-ROLE-ASSIGNMENT-DATA-AUDIT-V1 §2.1) 의 "부재" 진술이 **literal 로 사실** 이었음. 본 IR (HYGIENE-AUDIT-V1) 가 Cloud Run 로그의 Bootstrap `✓` 로그를 과해석해 "suspended" 가설을 세운 것이 오류.

### 4.1 본 IR 의 추정 오류 원인

Bootstrap migration 의 `✓ kpa-admin@o4o.com → kpa:admin` 로그는 [_upsertUser](apps/api-server/src/database/migrations/20260927100000-BootstrapCanonicalSeedAccounts.ts#L227-L243) 가 **이미 존재했거나 새로 INSERT 했거나** 둘 다에서 출력. 본 IR 은 "existing 분기였을 것" 으로 추정했으나, **실제로는 INSERT 분기였고 그 이후 별도 delete 가 발생**한 것이 정확한 해석.

마지막 Bootstrap 실행 (2026-05-20T00:42) 이후 ~ 본 검증 (2026-05-24) 사이에 **3 계정이 hard delete** 됨. 정확한 deletion 시점·경로는 후속 IR 의 조사 대상.

---

## 5. 후속 (본 IR 가 명시한 트랙)

본 IR §6.1 의 (b) 트랙 활성화:

| # | 항목 | 비고 |
|---|------|------|
| 1 | 부재 원인 추적 IR | Cloud Run 로그 + git log (2026-05-20 ~ 2026-05-24) 범위에서 delete 흔적 추적. `hard-delete` 차단 commit `7cae98ef8` (2026-05-22) 이전 발생 추정 |
| 2 | Bootstrap 멱등성 보강 IR | 현재 Bootstrap 은 TypeORM 의 "한 번만 실행" 원칙상 hard-delete 후 자동 복구 안 함. 매 배포마다 강제 재실행 / `_upsertUser` 의 `ON CONFLICT (email) DO UPDATE` 강화 등 옵션 검토 |
| 3 | `WO-O4O-KPA-SEED-ACCOUNT-RECREATE-V1` | 위 2 건 완료 후 착수. seed 계정 재생성 + 부재 재발 차단 |

→ **본 사이클 (2026-05-24) 에서는 §5 의 후속 작업 진행 안 함.** 사용자 지시: "지금은 H1만 확인하면 됩니다. 나머지는 이번 사이클에서 더 건드리지 않는 것이 좋습니다."

---

## 6. 본 CHECK 가 결정하지 않는 것

- 3 계정의 hard-delete 정확한 시점 / 경로 / 호출자 — 후속 IR 의 대상
- `kpa_members` / `service_memberships` 등 관련 FK row 의 cascade delete 여부
- Bootstrap migration 의 재실행 정책 (TypeORM 표준 vs 강제 reseed)
- 실제 데이터 복구 (recreate WO)

---

## 7. 보안 노트

본 검증은 super-admin 자격증명을 1 회 사용. 검증 종료 후 즉시 cookie/login response 파일 삭제 (`/tmp/h1_cookies.txt`, `/tmp/h1_login.json`, `/tmp/h1_check.sql`).

**자격증명 평문은 본 문서·git 어디에도 기록되지 않음.**

---

*Version: V1 (2026-05-24)*
*Status: H1 Verification Complete — 3 KPA seed accounts confirmed absent from `users` table*
*Next: 본 사이클 종료. 후속은 사용자 결정 시 §5 의 트랙 활성화*
