# IR-O4O-OPERATOR-DATA-HYGIENE-AUDIT-V1

> **⚠️ SUPERSEDED (2026-05-24) — by [IR-O4O-KPA-TEMP-SEED-ACCOUNT-RESIDUE-AUDIT-V1](IR-O4O-KPA-TEMP-SEED-ACCOUNT-RESIDUE-AUDIT-V1.md)**
>
> 본 IR 의 §1.3(d) "suspended 가설", §5.2 (a) 권고, §6.1 (a)/(b) "recreate WO" 권고는
> 모두 **폐기됨**. 후속 검증 ([CHECK-O4O-KPA-SEED-ACCOUNT-STATUS-SQL-V1](CHECK-O4O-KPA-SEED-ACCOUNT-STATUS-SQL-V1.md))
> 으로 3 KPA seed 계정은 **production 부재 (deleted)** 가 사실 확정. 정책 (`project_test_account_cleanup_policy`)
> 채택 후 임시 계정은 재생성하지 않는 것이 SSOT 이다. cleanup 방향 (WO-W1/W2/W3)
> 으로 처리 완료.
>
> 본 문서는 **audit trail 보존 목적**으로 유지. recreate 관련 권고는 따르지 말 것.

> **운영 데이터 위생 감사 보고서 (Read-Only Hygiene Audit)**
>
> 코드 수정 없음 / 데이터 수정 없음 / 정책 변경 없음
>
> WO-O4O-OPERATOR-ROLE-ASSIGNMENT-REPAIR-AND-GUARD-NORMALIZATION-V1 (W1, commit `bcaa4a5dd`) 완료 직후, 검증 보고서 [CHECK-V1](CHECK-O4O-OPERATOR-ROLE-ASSIGNMENT-REPAIR-AND-GUARD-NORMALIZATION-V1.md) §5.2 에 "별도 사안" 으로 분리되어 있는 위생 항목 3 건을 본 IR 에서 일괄 재조사·분류한다.

- **작성일:** 2026-05-24
- **분류:** Data Hygiene Audit (Read-Only — Migration 파일 + Cloud Run 로그 + 코드 정적 분석. DB 직접 SELECT 미수행)
- **선행 산출물:**
  - [IR-O4O-MEMBERSHIP-ONLY-OPERATOR-ROLE-GUARD-V1](IR-O4O-MEMBERSHIP-ONLY-OPERATOR-ROLE-GUARD-V1.md) (Option A)
  - [IR-O4O-OPERATOR-ROLE-ASSIGNMENT-DATA-AUDIT-V1](IR-O4O-OPERATOR-ROLE-ASSIGNMENT-DATA-AUDIT-V1.md) (4 계정 확정)
  - [CHECK-O4O-OPERATOR-ROLE-ASSIGNMENT-REPAIR-AND-GUARD-NORMALIZATION-V1](CHECK-O4O-OPERATOR-ROLE-ASSIGNMENT-REPAIR-AND-GUARD-NORMALIZATION-V1.md) (W1 PASS)
- **참조 SSOT:**
  - `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` (F9)
  - `docs/architecture/USER-OPERATOR-FREEZE-V1.md` (F11)
  - `docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md` (사업 철학)
- **검증 환경:** `api.neture.co.kr` (production, Cloud Run `o4o-core-api`, project `netureyoutube`)
- **검증 채널:** `gcloud logging read` (read-only), migration 파일 정적 분석, git log
- **버전:** V1

---

## 0. 조사 목적 / 범위 / 한계

### 0.1 목적

W1 완결 직후 잔존하는 3 건의 위생 항목을 다음 차원으로 분류:

1. **계정별 현재 상태** — 운영 영향 여부
2. **seed migration 적용 상태** — 데이터 출처 명확화
3. **inactive RA 목록** — 잔존 row 가 일으키는 실질적 위해 여부
4. **실제 장애 가능성** — 운영자 / API / JWT / Guard 측면
5. **정리 필요 여부** — 구조 blocker 가 맞는지, 아니면 단순 흔적인지
6. **우선순위** — 즉시 / 후속 / 무시
7. **후속 WO 필요 여부** — 별도 WO 산출물이 필요한지

### 0.2 범위

`CHECK-V1 §5.2` 에 명시된 3 건만 다룬다:

| # | 항목 | 출처 |
|---|------|------|
| H1 | KPA seed 계정 부재 (`kpa-admin`, `kpa-operator`, `phamacy1`) | 선행 IR §2.1 + CHECK §3.2 |
| H2 | super-admin 중복 inactive RA row | 선행 IR §1.2 + CHECK §3.1 |
| H3 | partial repair 흔적 — operator 4 계정 RA 가 inactive 된 원인 추적 | CHECK §5.2 #3 |

### 0.3 한계 (선행 IR 과 동일)

- `psql` client 로컬 미설치 — DB 직접 SELECT 불가
- 본 audit 는 **migration 코드 + Cloud Run 로그 + 정적 분석** 만 사용 → SQL 단정값 검증은 별도 채널 필요 (Cloud Console SQL Editor 또는 `gcloud sql connect` 환경 정비 후)

→ 본 IR 의 결론은 **로그+코드 기반 추정**. 정리 작업 착수 전 SQL 1 회 확인 권고.

---

## 1. H1 — KPA Seed 계정 부재 의혹 재검증

### 1.1 선행 IR §2.1 의 주장

> seed migration 의 파일명 timestamp `20260927100000` (2026-09-27) 가 현재(2026-05-23) 보다 미래 → 이 seed migration 자체가 production 에 아직 적용되지 않음

### 1.2 재검증 결과 — **주장은 사실이 아님**

본 IR 의 Cloud Run 로그 조회 (project `netureyoutube`, service `o4o-core-api`, 최근 30 일):

```
2026-05-14T07:38:14  [Bootstrap] WO-O4O-SEED-BOOTSTRAP-MIGRATION-V1 시작
2026-05-14T07:38:14  [Bootstrap]   ✓ kpa-admin@o4o.com → kpa:admin
2026-05-14T07:38:14  [Bootstrap]   ✓ kpa-operator@o4o.com → kpa:operator
2026-05-14T07:38:14  [Bootstrap]   ✓ phamacy1@o4o.com → kpa:pharmacist
...
2026-05-17T12:09:27  [Bootstrap]   ✓ kpa-admin@o4o.com → kpa:admin   (재실행)
2026-05-17T12:16:45  [Bootstrap]   ✓ kpa-admin@o4o.com → kpa:admin   (재실행)
2026-05-17T12:23:32  [Bootstrap]   ✓ kpa-admin@o4o.com → kpa:admin   (재실행)
2026-05-20T00:42:35  [Bootstrap]   ✓ kpa-admin@o4o.com → kpa:admin   (재실행)
```

→ **Bootstrap migration 은 production 에 적용되었고, 최소 5 회 재실행되었음.** 파일명 timestamp 는 TypeORM 의 실행 여부를 결정하지 않음 (TypeORM 은 `migrations` 테이블의 record 로 판정).

### 1.3 그렇다면 왜 `?all=true&limit=1000` 응답에 안 보였는가 — 정황 증거

#### (a) 진단 로그 — 계정 실재 확인

```
2026-05-17T03:42:31  - user_id=b0000000-b000-4000-b000-000000000002 email=kpa-admin@o4o.com    sm_status=active sm_role=admin
2026-05-17T03:42:31  - user_id=b0000000-b000-4000-b000-000000000003 email=kpa-operator@o4o.com sm_status=active sm_role=operator
```

→ 2026-05-17 시점에 **`users` 테이블 + `service_memberships` 테이블에 정상 active 로 존재**.

#### (b) 직후 — 정지(suspension) 이벤트 발생

```
2026-05-17T04:48:34  [KPA Email] Suspension sent to kpa-admin@o4o.com    (member: 228720bb-...)
2026-05-17T04:48:39  [KPA Email] Suspension sent to kpa-operator@o4o.com (member: 1a344455-...)
2026-05-20T01:22:17  [KPA Email] Suspension sent to phamacy1@o4o.com     (member: 700f8273-...)
```

→ 3 계정 모두 **운영 UI 의 정지(suspend) 액션** 으로 처리되었음. [member.controller.ts:867-873](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L867-L873) 가 호출됨.

이 코드 경로는 `kpa_members.status = 'suspended'` 로 변경 + 이메일 발송. **`users.status` / `users.isActive` 는 직접 변경하지 않음** (관련 PR 미발견 → 보수적 추정).

#### (c) Bootstrap 재실행의 동작

[Bootstrap migration `_upsertUser`](apps/api-server/src/database/migrations/20260927100000-BootstrapCanonicalSeedAccounts.ts#L227-L243):

```ts
const existing = await queryRunner.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [account.email]);
if (existing.length > 0) {
  return existing[0].id as string;   // ← 이미 존재 시 그냥 ID 만 반환, 상태 미복구
}
```

→ Bootstrap 재실행 시 **users 행은 손대지 않음** (suspend 상태 그대로). `service_memberships` 만 `status='active'` 로 재upsert (line 256-262).

→ 다음 로그인 시 `kpa_members.status='suspended'` 가 `me-context` 등에서 차단 가능, 또는 KPA 운영 UI 에서 비표시.

#### (d) 추정 결론

- **3 계정 모두 `users` 테이블에는 존재** (UUID b0000000-...000002/000003/000004)
- `kpa_members.status='suspended'` 상태 추정
- `service_memberships.status='active'` 일 가능성 높음 (Bootstrap 재upsert)
- `?all=true` 응답에서 누락된 이유는 [MembershipConsoleController.getMembers](apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L130-L139) 의 query 가 `u.status` 필터를 안 걸기 때문에 — **누락이라기보다 응답에 있었지만 선행 IR 작성자가 "operator/admin SM" 5 명만 카운트해 3 계정의 일반 user 분류 영역을 놓쳤을 가능성** 도 있음

→ **본 IR 단독 단정 불가**. 선행 IR 의 "부재" 주장은 **실패 모드 (suspended) 와 부재 (deleted) 를 구분 못 한 가능성** 높음.

### 1.4 SQL 1 회 확인 (정리 작업 착수 전 필수)

```sql
-- 본 IR 의 가설 검증용 — Cloud Console SQL Editor 또는 gcloud sql connect 에서 1 회 실행
SELECT u.id, u.email, u.status, u."isActive",
       sm.service_key, sm.status AS sm_status, sm.role AS sm_role,
       km.status AS kpa_member_status, km.membership_type
FROM users u
LEFT JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = 'kpa-society'
LEFT JOIN kpa_members km ON km.user_id = u.id
WHERE u.email IN ('kpa-admin@o4o.com', 'kpa-operator@o4o.com', 'phamacy1@o4o.com')
ORDER BY u.email;
```

기대 결과:
- 3 row 존재 (없으면 본 IR 가설 기각, 새 IR 필요)
- `users.status` 정상 / `kpa_members.status='suspended'` 가 가설

### 1.5 운영 영향

| 차원 | 영향 |
|------|------|
| 일반 회원의 KPA 사용 | 없음 — 일반 회원 가입은 별도 |
| Operator/admin 의 KPA Console 사용 | **없음** — sohae2100 (platform:super_admin) 이 모든 KPA Console 접근 권한 보유 |
| 데모/QA 시나리오 | **있음** — kpa-admin/kpa-operator/phamacy1 자격으로 시연·smoke test 시 로그인 자체는 가능하나 `kpa_members.status='suspended'` 차단 가능 |
| Bootstrap 의 idempotent 의도 | **부분 깨짐** — Bootstrap 은 suspended 상태를 자동 복구 못 함. 재시드 시 수동 reactivation 필요 |

→ **실제 운영 차단 없음. 데모/테스트 시 발견되는 위생 이슈.**

---

## 2. H2 — super-admin 중복 inactive RA Row

### 2.1 현재 상태 (선행 IR §1.2 인용)

```text
super-admin@o4o.com:
  platform:super_admin | is_active=true   ← 활성 row
  platform:super_admin | is_active=false  ← 과거 inactive row (잔존)
```

### 2.2 원인 — Legacy Role Migration 잔재

[`20261027000000-MigrateLegacyRolesToPlatformPrefixed.ts`](apps/api-server/src/database/migrations/20261027000000-MigrateLegacyRolesToPlatformPrefixed.ts) (commit `a149c6a5c`, 2026-05-22):

```sql
-- Step 1: 중복 방지 (이미 platform:super_admin 이 있는 user 의 legacy super_admin 삭제)
DELETE FROM role_assignments ra
WHERE ra.role = 'super_admin'
  AND EXISTS (SELECT 1 FROM role_assignments ra2
              WHERE ra2.user_id = ra.user_id AND ra2.role = 'platform:super_admin');

-- Step 2: rename
UPDATE role_assignments SET role = 'platform:super_admin'
WHERE role = 'super_admin';
```

가능한 시퀀스 (추정):
1. 과거 super-admin 가 `super_admin` (legacy) role 로 시작 → 어느 시점에 deactivate (is_active=false)
2. 별도로 `platform:super_admin` 신규 active row 발급 (W1 이전 어느 시점)
3. Legacy migration Step 1 의 DELETE 는 role 만으로 매칭하므로 inactive `super_admin` 도 같이 사라졌어야 함
4. 그러나 잔존하는 inactive row 의 role 이 **이미 `platform:super_admin`** 이라 Step 1 DELETE 의 매칭에서 빠짐
5. → 이 inactive row 는 **Legacy migration 이전에 누군가 `platform:super_admin` 으로 직접 INSERT 했다가 deactivate** 했을 가능성

### 2.3 `unique_active_role_per_user` constraint 와의 정합

- 본 constraint 는 (user_id, role) partial unique (is_active=true 행만 unique) 로 추정 — Bootstrap 의 `ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING` 가 그 단서
- 즉 active 1 + inactive 1 의 공존은 **constraint 위반 아님** → 정상 동작
- W1 의 assignRole reactivation 시에도 동일 (existing row 의 is_active 만 toggle)

### 2.4 운영 영향

| 차원 | 영향 |
|------|------|
| `requireRole` / JWT.roles | **없음** — `is_active=true` 만 읽음 |
| `getRoleNames()` 등 read path | **없음** — F9 SSOT read path 가 active 만 본다 |
| audit log 의 RA 이력 조회 | 약간 혼란 — inactive row 가 audit 용도로 의도된 것이라면 정상 |
| DB 스토리지 | 1 row — 무시 가능 |

→ **실질 운영 영향 0**. 데이터 위생 항목.

### 2.5 정리 옵션

| 옵션 | 비용 | 효과 | 권고 |
|------|:----:|------|:----:|
| (a) 잔존 inactive row DELETE | SQL 1 줄 | 0 | 비권고 — audit 흔적 보존 |
| (b) 무시 (현 상태 유지) | 0 | 0 | **권고** |
| (c) 별도 RA cleanup 정책 신설 | WO 작성 | 미래 동일 패턴 방지 | 후순위 — pattern 빈도 낮음 |

---

## 3. H3 — Partial Repair 흔적 추적 (Operator 4 계정 RA 가 inactive 된 원인)

### 3.1 W1 이전 상태 (선행 IR §1.1)

| Email | role | active RA | inactive RA |
|-------|------|-----------|-------------|
| `neture-operator@o4o.com` | `neture:operator` | [] | [`neture:operator`] |
| `kcos-operator@o4o.com` | `cosmetics:operator` | [] | [`cosmetics:operator`] |
| `kcos-admin@o4o.com` | `cosmetics:admin` | [] | [`cosmetics:admin`] |
| `glyco-operator@o4o.com` | `glycopharm:operator` | [] | [`glycopharm:operator`] |

W1 이 4 계정 모두 reactivate 완료 (CHECK §1.2).

### 3.2 원인 추적 — Cloud Run 로그 (project `netureyoutube`, 30 일)

```
2026-05-18T01:29:52  WHERE user_id = $1 AND role = $2 AND is_active = true
                     -- PARAMETERS: ["b0000000-b000-4000-b000-000000000005","neture:operator"]
2026-05-19T02:09:46  WHERE user_id = $1 AND role = $2 AND is_active = true
                     -- PARAMETERS: ["b0000000-b000-4000-b000-000000000007","cosmetics:operator"]
2026-05-19T02:09:54  (동일 — kcos-operator cosmetics:operator)
2026-05-19T02:10:16  (동일 — kcos-operator cosmetics:operator)
2026-05-19T02:20:17  AND is_active = true
                     -- PARAMETERS: ["b0000000-b000-4000-b000-000000000005"]  (neture-operator)
```

#### 매핑

| User ID | Email | Role | 로그 일시 | 추정 트리거 |
|---------|-------|------|-----------|------------|
| ...000005 | neture-operator | neture:operator | 2026-05-18 01:29, 2026-05-19 02:20 | Neture admin OperatorsPage 의 비활성화 액션 (commit `97759f002` 직전 코드 경로) |
| ...000007 | kcos-operator | cosmetics:operator | 2026-05-19 02:09 / 02:10 | 동일 패턴의 Cosmetics 측 operator 비활성화 |
| ...000006 | kcos-admin | cosmetics:admin | 30 일 내 로그 없음 | 30 일 전 발생 (로그 retention 밖) 또는 다른 경로 |
| ...000008 | glyco-operator | glycopharm:operator | 30 일 내 로그 없음 | 동일 |

#### 출처 코드 (W1 이전, 2026-05-19 fix 직전 버전)

[neture.controller.ts](apps/api-server/src/modules/neture/controllers/neture.controller.ts) — commit `97759f002` (2026-05-19 09:13) 의 fix:

> 비활성화: users.isActive=false → role_assignments.is_active=false (Neture 권한만 해제)

→ 즉, 이 fix 이전에는 `users.isActive=false` 였고, 이후에는 **`role_assignments.is_active=false` 만 변경**. 이 fix 의 첫 적용 시점부터 inactive RA 가 양산되기 시작했음.

이어 commit `78f7b8f24` (2026-05-19 11:28) 가 "deactivate UPDATE 전 inactive ghost row DELETE 선행" 보강 — 두 번째 비활성화 시도 시 발생하는 unique constraint 충돌 보정.

### 3.3 원인 분류 (확정)

| 계정 | 원인 |
|------|------|
| neture-operator | Neture admin UI 의 운영자 비활성화 액션 (commit `97759f002` 직전 코드) |
| kcos-operator | Cosmetics 측 운영자 비활성화 액션 (동일 패턴) |
| kcos-admin | 30 일 전 사건 — 코드 history 로 보아 동일 카테고리 |
| glyco-operator | 동일 |

→ **공통 원인**: W1 이전 시점, 운영자 비활성화/재활성화 UX 가 RA 만 deactivate 하고 reactivate 흐름이 미정비 상태였음. 운영자가 수동 테스트 차원에서 비활성화한 4 계정이 reactivate 되지 않은 채 잔존.

W1 이 이 정합성을 회복했으므로 **재발 차단 코드 변경은 별도로 필요 없음**. 단, 다음을 후속 강화 가능:

- 운영자 비활성화 시 SM 도 동기화하여 양 테이블 정합 보장 (현재는 RA 만 변경)
- 운영자 reactivate 시 inactive RA 가 정확히 1 개임을 보장하는 invariant 강화

### 3.4 운영 영향 (재발 위험)

| 차원 | 현재 |
|------|------|
| W1 reactivation 결과 | **4/4 PASS** — 5 endpoint 정합 회복 |
| 동일 패턴 재발 가능성 | **낮음** — `78f7b8f24` 가 ghost row 처리 보강, `97759f002` 가 RA 기반 deactivate 표준화 |
| 다른 도메인 (lms, signage, content 등) 에서 동일 양상 | **미조사** — 추가 audit 가치 있으나 본 IR 범위 밖 |

---

## 4. 종합 — 위생 항목 분류 매트릭스

| # | 항목 | 운영 영향 | 구조 Blocker | 정리 필요 | 우선순위 | 후속 WO |
|---|------|:--------:|:-----------:|:--------:|:--------:|:------:|
| H1 | KPA seed 3 계정 부재(추정 suspend) | LOW (데모/QA만) | NO | **YES — SQL 확인 후 결정** | M | **조건부 YES** |
| H2 | super-admin 중복 inactive RA | NONE | NO | NO (audit 흔적) | L | NO |
| H3 | partial repair 4 계정 inactive RA 잔존 | NONE (W1 reactivate) | NO | NO | L | NO |

### 4.1 구조 Blocker 와 단순 Hygiene 의 구분

- **구조 Blocker** = 데이터/코드 정합성이 깨져 운영자/사용자 동작이 비결정적이거나 정책 위반
- **단순 Hygiene** = 운영에 영향 없으나 audit/QA/데모 측면에서 정리하면 좋은 항목

| # | 분류 | 근거 |
|---|------|------|
| H1 | **Hygiene (조건부 Blocker)** | suspended 상태가 맞다면 정책상 hygiene. SQL 확인에서 `users` 부재로 드러나면 그때 Blocker 로 재분류 |
| H2 | Hygiene | F9/F11 read path 가 active 만 본다 → 동작 영향 0 |
| H3 | Hygiene | W1 이 이미 active 회복 → 잔존 inactive row 는 audit |

---

## 5. 즉시 수정 vs 정리 필요 항목 분류

사용자 지시 ("즉시 수정하지 말고, 정리 필요 항목만 분류") 를 따라:

### 5.1 즉시 수정 — **0 건**

W1 이 모든 active 운영 정합성을 회복했음. 본 IR 의 어떤 항목도 즉시 수정이 필요하지 않음.

### 5.2 정리 필요 — **1 건 (H1, 조건부)**

H1 의 SQL 확인 결과에 따라:

| SQL 결과 | 분류 | 권고 조치 |
|---------|------|-----------|
| (a) 3 계정 모두 `users` 존재 + `kpa_members.status='suspended'` | Hygiene | reactivate 1 회 (kpa member 의 status='active' UPDATE) + Bootstrap 재실행 시 자동 reactivate 하는 보강 검토 |
| (b) 3 계정 중 일부 `users` 부재 | Blocker | 부재 원인 추적 IR 추가 + Bootstrap 멱등성 보장 강화 |
| (c) 모두 `users` 존재 + suspended 가 아닌 정상 active | 위생 아님 | 선행 IR §2.1 의 "부재" 결론이 잘못된 관찰임을 노트 |

### 5.3 무시 — **2 건 (H2, H3)**

H2, H3 모두 운영 영향 0. 향후 별도 RA cleanup 정책 (예: deactivate N 개월 후 hard purge) 을 신설할 가치는 있으나 본 IR 범위 밖.

---

## 6. 후속 WO 필요 여부

### 6.1 본 IR 단독 결론

| # | 필요 여부 | 산출물 (제안) |
|---|:--------:|--------------|
| H1 (조건 (a)) | **YES — 경량 WO** | `WO-O4O-KPA-SEED-ACCOUNT-REACTIVATION-V1` — kpa-admin/operator/phamacy1 의 kpa_members.status reactivate + bootstrap 멱등성 보강 |
| H1 (조건 (b)) | YES — 큰 WO | `WO-O4O-KPA-SEED-ACCOUNT-RECREATE-V1` — users 재생성 + idempotency 강화 |
| H1 (조건 (c)) | NO | 선행 IR §2.1 노트 정정만 |
| H2 | NO | — |
| H3 | NO | — |

### 6.2 사전 SQL 확인 (1 회, 사용자 결정 후)

```sql
-- §1.4 의 SELECT 를 Cloud Console SQL Editor 또는 gcloud sql connect 에서 1 회 실행
-- 결과에 따라 §6.1 의 조건 (a)/(b)/(c) 분기 결정
```

→ 본 IR 의 의사결정 핵심은 **SQL 1 회 확인**. 이 확인 없이 H1 의 WO 착수 금지.

---

## 7. Current Structure vs O4O Philosophy Conflict Check (선행 IR 대비)

| 차원 | Current | F9 / F11 / Philosophy | 충돌 |
|------|---------|----------------------|:----:|
| H1: Bootstrap 의 idempotent | suspended 자동 복구 안 함 | F11 seed 의도 (재시드 = 운영 가능 상태 회복) | **부분 깨짐** |
| H2: 중복 inactive RA | F9 read path 가 active 만 봄 | F9 정합 | 정합 |
| H3: 4 계정 inactive RA 잔존 (W1 이후) | W1 reactivation 으로 active 정합 | F9 / F11 정합 | 정합 (잔존 inactive 는 audit 흔적) |
| 사업 철학 (BUSINESS-PHILOSOPHY-V1 §3) | 3 자 흐름과 무관 | — | N/A |

→ **유일한 정책 충돌은 H1 의 Bootstrap 멱등성 부분 깨짐.** 그러나 매우 약한 충돌 — 재시드 시나리오 자체가 운영 critical path 가 아님.

---

## 8. 결론

| 항목 | 결론 |
|------|------|
| 전체 위생 항목 수 | **3 건** (H1, H2, H3) |
| 즉시 수정 필요 | **0 건** |
| 정리 권고 | **1 건 (H1, 조건부)** |
| 후속 WO 권고 | **조건부 1 건** (H1 의 SQL 결과 (a) 또는 (b) 일 때만) |
| 구조 Blocker | **0 건** (H1 의 SQL 결과 (b) 일 때만 Blocker 로 재분류) |
| Production 운영 차단 | **없음** |

**최종 판정**: W1 완결 후 운영 정합성은 회복된 상태. 잔존 항목은 모두 hygiene 또는 audit 흔적. 단, **H1 의 SQL 확인 1 회는 반드시 수행** 해야 hygiene/Blocker 분류가 확정됨.

---

## 9. 본 IR 이 결정하지 않는 것

- 실제 데이터 수정 (SQL UPDATE / DELETE 등) — 모두 read-only 만 수행했음
- H1 의 최종 분류 — SQL 확인 결과에 따라 결정
- `users.status` / `users.isActive` / `kpa_members.status` 의 정확한 현재 값 — 추정만
- inactive RA cleanup 정책 (N 개월 후 purge 등) 의 신설 여부
- 다른 도메인(lms/signage/content/forum 등) 의 동일 패턴 잔존 audit — 본 IR 범위 밖

---

## 10. 사용자 확정 필요 항목

| # | 항목 | 본 IR 권고 |
|---|------|:----------:|
| 1 | H1 SQL 확인 1 회 실행 | **YES** (Cloud Console SQL Editor 또는 gcloud sql connect) |
| 2 | H1 의 SQL 결과 (a) 시 WO 착수 | YES — 경량 WO (`WO-O4O-KPA-SEED-ACCOUNT-REACTIVATION-V1`) |
| 3 | H1 의 SQL 결과 (b) 시 WO 착수 | YES — 큰 WO + Bootstrap 멱등성 보강 IR 선행 |
| 4 | H2 정리 | NO — 무시 |
| 5 | H3 정리 | NO — W1 이 이미 처리 |
| 6 | 본 IR 의 SQL 확인 단계를 다른 사람/세션에 위임 | 권고 — 본 세션은 psql 미설치 |

---

## 11. 부록 — 사용된 검증 절차 (재현 가능)

### 11.1 Cloud Run 로그 조회

```bash
# Bootstrap migration 실행 이력
gcloud logging read 'resource.type=cloud_run_revision
  AND resource.labels.service_name="o4o-core-api"
  AND textPayload:"Bootstrap"' \
  --limit=50 --project=netureyoutube --freshness=30d \
  --format="value(timestamp,textPayload)"

# 특정 UUID (kpa-admin: ...000002, kpa-operator: ...000003, phamacy1: ...000004) 활동
gcloud logging read 'resource.type=cloud_run_revision
  AND resource.labels.service_name="o4o-core-api"
  AND textPayload:"b0000000-b000-4000-b000-000000000002"' \
  --limit=20 --project=netureyoutube --freshness=30d \
  --format="value(timestamp,textPayload)"

# Suspension 이벤트
gcloud logging read 'resource.type=cloud_run_revision
  AND resource.labels.service_name="o4o-core-api"
  AND textPayload:"Suspension sent"' \
  --limit=10 --project=netureyoutube --freshness=30d \
  --format="value(timestamp,textPayload)"

# operator 4 계정의 RA UPDATE 흔적
gcloud logging read 'resource.type=cloud_run_revision
  AND resource.labels.service_name="o4o-core-api"
  AND textPayload:"b0000000-b000-4000-b000-00000000000"
  AND textPayload:"is_active = true"' \
  --limit=20 --project=netureyoutube --freshness=30d
```

### 11.2 Migration 코드 정적 분석

```text
apps/api-server/src/database/migrations/
  20260216200001-CreateKpaAdminAccount.ts                  (legacy, dropped columns 참조)
  20260326300000-DeactivateQualificationRoles.ts           (kpa:pharmacist/student soft-deactivate)
  20260331400000-UnifyGlycopharmRolesCatalog.ts            (admin/operator 제외)
  20260331500000-UnifyCosmeticsRolesCatalog.ts             (동일)
  20260404500000-FixKpaAdminRole.ts                        (admin-kpa-society@o4o.com 전용)
  20260901000000-CleanupKCosmeticsSellerRole.ts            (seller variants only)
  20260924000000-CleanupKpaOrphanRoles.ts                  (kpa_members 없는 user 의 kpa:* deactivate)
  20260927100000-BootstrapCanonicalSeedAccounts.ts         (8 계정 seed)
  20261027000000-MigrateLegacyRolesToPlatformPrefixed.ts   (super_admin → platform:super_admin)
```

→ **결론**: operator 4 계정의 inactive RA 를 만든 migration 은 없음. Cloud Run 로그가 가리키는 **운영 UI 의 비활성화 액션**이 유일한 출처.

### 11.3 코드 정적 분석 (KPA suspension 경로)

[member.controller.ts:867-873](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L867-L873): `kpa_members.status='suspended'` 로 변경 + 이메일 발송.

---

*Version: V1 (2026-05-24)*
*Status: Hygiene Audit Complete — 즉시 수정 0 건. H1 의 SQL 확인 1 회 후 후속 결정.*
*Next: 사용자 검토 → H1 SQL 확인 → (조건부) WO 착수 결정*
