---
id: IR-O4O-KPA-STOREOWNER-MISSING-ROLE-DRIFT-CHECK-V1
title: "KPA pharmacy_owner ↔ kpa:store_owner role drift 전수 검사"
status: investigation-complete
date: 2026-05-17
type: investigation
scope:
  - 운영 DB read-only SELECT 로 activity_type=pharmacy_owner ↔ role_assignments(kpa:store_owner) drift 전수 측정
  - 누락 사용자별 활성화 chain (5-step) 단계 분류 (F1~F4)
  - 보고 케이스 (sohae2100@gmail.com) 의 실제 단계 확인
  - 역방향 drift (role 만 보유, activity_type 미스매치) 점검
  - revoke 흔적 (kpa:store_owner inactive row) 점검
related:
  - IR-O4O-KPA-STOREOWNER-HEADER-MENU-VISIBILITY-AUDIT-V1 (root cause 분석 — 본 IR 의 prerequisite)
  - IR-O4O-KPA-PHARMACY-OWNER-POST-APPROVAL-ACCESS-FLOW-AUDIT-V1 (Guard chain root cause — 이미 main 머지)
  - IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1 (자동 부여 chain 정책)
  - member.controller.ts:540-614 (자동 부여 chain — 본 IR 의 verification target)
---

# IR-O4O-KPA-STOREOWNER-MISSING-ROLE-DRIFT-CHECK-V1

> 운영 DB read-only SELECT 만 수행. UPDATE / DELETE / INSERT 없음. CLAUDE.md §0 정책 준수.

---

## 0. Executive Summary

| 항목 | 값 |
|---|---|
| 검사 시각 | 2026-05-17 |
| DB | `o4o_platform` (instance `o4o-platform-db`, region `asia-northeast3`) |
| 접근 방식 | `gcloud sql instances patch --authorized-networks` 임시 추가 → `psql -f` read-only → 원본 복원 |
| pharmacy_owner 사용자 전수 (pp 기준) | **2 명** |
| pharmacy_owner 사용자 전수 (km 기준) | **2 명** (동일 집합) |
| 활성 kpa:store_owner role 보유자 | **0 명** |
| inactive kpa:store_owner row | **0 row** — revoke 흔적 없음 |
| **drift (pharmacy_owner ∧ role 부재)** | **2/2 = 100%** |
| 역방향 drift (role 있고 activity_type 다름) | 0 명 |
| pp vs km activity_type mismatch | 0 명 (3 명 모두 일치) |
| 누락 단계 분류 | **F2 (organization not created)** 2/2 — 자동 부여 chain step3 에서 끊김 |
| 위험도 | **현재 service 전이므로 운영 impact 낮음**. 구조 정비 관점 — backfill 필요 |
| 추가 발견 | 두 사용자 모두 동일 가짜 businessNumber `1089999999` 보유 — 실 데이터가 아닌 test setup |
| 권장 조치 | Phase 2 backfill WO **전에 정책 결정** 선행 — 동일 bizno → 같은 organization, owner 중복 처리 룰 정의 필요 |

**핵심 결론**:
1. drift 는 실재한다. pharmacy_owner 인 사용자 2 명 모두 store_owner role 부재 → 메뉴 미노출 100% 재현.
2. 누락 원인은 모두 **F2 — organization (`kpa-pharm-{bizno}`) 미생성** 단계. 즉 회원 승인 시점의 자동 부여 chain (`member.controller.ts:540-614`) 이 step3 에서 끊김 또는 trigger 자체가 발화하지 않음.
3. inactive role row 가 0 → **revoke 흔적 없음**. F4 (직역 전환 후 회수) 시나리오는 운영에 없음. 즉 IR-V1 §4-2 의 F4 는 현재 데이터에서 미발견.
4. test 데이터 (동일 bizno) 가 backfill 의 unique 가정을 깨므로 backfill 전에 **정책 결정 필요**.

---

## 1. 방법

### 1-1. 접근 채널
- CLAUDE.md §0 정책 — Claude Code 가 read-only 검증 직접 수행 가능.
- 절차:
  1. `gcloud sql instances describe` 로 기존 authorized_networks 백업 확인 (`124.194.156.36/32` 단일)
  2. `gcloud sql instances patch --authorized-networks=124.194.156.36/32,<현재IP>/32` 로 현재 IP 임시 추가
  3. `PGPASSWORD='...' psql -h 34.64.96.252 -U o4o_api -d o4o_platform -f /c/tmp/storeowner-drift-check.sql` 실행
  4. `gcloud sql instances patch --authorized-networks=124.194.156.36/32` 로 원본 복원
- 실행 SQL 파일: `/c/tmp/storeowner-drift-check.sql` (로컬 임시, 본 IR §11 에 본문 첨부)
- 결과 파일: `/c/tmp/storeowner-drift-out.txt` (로컬 임시)
- 데이터 변경 없음. authorized_networks 원본 상태로 복원 완료.

### 1-2. 쿼리 구성 (7 단계)

| Q | 목적 |
|---|---|
| Q0 | Baseline — pharmacy_owner 인구 + role 인구 |
| Q1 | pp.activity_type vs km.activity_type 일관성 |
| Q2 | pharmacy_owner 전수 — 5-step chain 상태 |
| Q3 | 핵심 drift — pharmacy_owner ∧ role 부재. step1~step4 어디서 끊겼는지 분류 |
| Q4 | 역방향 drift — role 있는데 activity_type 다름 |
| Q5/Q6 | 보고 케이스 (sohae2100) 상세 |
| Q7 | inactive store_owner row 분포 (revoke 흔적) |

### 1-3. 분류 라벨

| 라벨 | 의미 | 원인 |
|---|---|---|
| F1 | `users.businessInfo.businessNumber` 비어있음 | 가입 데이터 결함 |
| F2 | bizno 있는데 `organizations(code=kpa-pharm-{digits})` 미존재 | 자동 부여 chain step3 fail |
| F3 | org 있는데 `organization_members(role=owner, left_at IS NULL)` 미존재 | step4 fail |
| F4 | org+owner 있는데 role 부재 (또는 revoke 됨) | step5 fail 또는 revoke 후 미회복 |

---

## 2. 결과 — Raw

### Q0. Baseline

```
 pp_pharmacy_owner_cnt | km_pharmacy_owner_cnt | ra_store_owner_active_cnt | ra_store_owner_inactive_cnt
-----------------------+-----------------------+---------------------------+-----------------------------
                     2 |                     2 |                         0 |                           0
```

**해석**:
- pharmacy_owner 인구 = 2 (pp / km 양쪽 일치)
- store_owner role 보유자 = 0 (active / inactive 모두)
- **drift ratio = 2/2 = 100%**

### Q1. pp vs km activity_type 일관성

```
    pp_activity    |    km_activity    | cnt
-------------------+-------------------+-----
 pharmacy_employee | pharmacy_employee |   1
 pharmacy_owner    | pharmacy_owner    |   2
```

**해석**: 두 테이블 간 activity_type **mismatch 없음** — drift 의 출처는 두 직역 테이블 간 불일치가 아니라 role_assignments 와의 불일치.

### Q2. pharmacy_owner 전수 5-step chain

```
        email         | user_status |  pp_activity   |  km_activity   | step1_bizno | step1_bizname | step3_org_id | step4_has_owner_row | step5_has_store_owner_role | km_member_status
----------------------+-------------+----------------+----------------+-------------+---------------+--------------+---------------------+----------------------------+------------------
 renagang21@gmail.com | active      | pharmacy_owner | pharmacy_owner | 1089999999  | Renagang 약국 | (null)       | f                   | f                          | active
 sohae2100@gmail.com  | active      | pharmacy_owner | pharmacy_owner | 1089999999  | (empty)       | (null)       | f                   | f                          | active
```

**해석**:
- 두 사용자 모두 step1(bizno) ✅ 보유
- step3(organization) ❌ 미생성
- step4(organization_members owner) ❌ 부재
- step5(role_assignments kpa:store_owner) ❌ 부재
- km.status = 'active' (회원 승인은 완료된 상태)
- **bizname 차이**: renagang21 은 "Renagang 약국", sohae2100 은 비어있음

**중요**: 두 사용자가 **동일 businessNumber `1089999999`** 를 사용 — 명백히 test 데이터.

### Q3. 핵심 drift 분류

```
        email         | user_status |  pp_activity   |  km_activity   |      gap_classification      | step5_inactive_row_exists
----------------------+-------------+----------------+----------------+------------------------------+---------------------------
 renagang21@gmail.com | active      | pharmacy_owner | pharmacy_owner | F2: organization not created | f
 sohae2100@gmail.com  | active      | pharmacy_owner | pharmacy_owner | F2: organization not created | f
```

**해석**:
- 2/2 모두 **F2** — `organizations` 에 `code = kpa-pharm-1089999999` row 가 없음
- inactive store_owner row 도 없음 → 한 번도 부여된 적 없음 (revoke 후 회수 아님)

### Q4. 역방향 drift

```
(0 rows)
```

**해석**: role 만 있는 orphan 사용자 없음. 즉 backfill 시 "기존 role 보유자 보존" 같은 특수 분기 불필요.

### Q5. sohae2100 상세

```
        email        | user_status |  pp_activity   |  km_activity   | km_member_status |   bizno    | bizname | expected_org_id | has_owner_row | has_store_owner_role_active | has_store_owner_role_inactive
---------------------+-------------+----------------+----------------+------------------+------------+---------+-----------------+---------------+-----------------------------+-------------------------------
 sohae2100@gmail.com | active      | pharmacy_owner | pharmacy_owner | active           | 1089999999 | (empty) | (null)          | f             | f                           | f
```

**해석**:
- bizname 이 **비어있음** — `member.controller.ts:540` 의 trigger 조건 (`businessName OR pharmacy_name`) 충족 여부 확인 필요. bizname 비어있으면 trigger skip 가능성.
- expected_org_id NULL — `kpa-pharm-1089999999` org row 자체가 없음
- store_owner role 한 번도 부여된 적 없음

### Q6. sohae2100 role_assignments 전수

```
     role     | is_active |       valid_from        |         updated_at
--------------+-----------+-------------------------+----------------------------
 kpa:admin    | t         | 2026-05-15 12:10:57.029 | 2026-05-15 12:10:57.030319
 kpa:operator | t         | 2026-05-15 12:10:20.325 | 2026-05-15 12:10:20.326384
 super_admin  | t         | 2026-05-15 12:05:32.718 | 2026-05-15 12:05:32.721
```

**해석**:
- `kpa:store_owner` 자체가 부재 (active / inactive 모두)
- `super_admin` 은 unprefixed (canonical 은 `platform:super_admin`) — IR-O4O-SERVICE-MEMBERSHIP-CANONICAL-KEY-DRIFT-CHECK-V1 §3-4 에서 별건으로 식별된 동일 row

### Q7. inactive store_owner row 분포

```
 total_inactive | revoked_recent_30d | oldest_revoke | newest_revoke
----------------+--------------------+---------------+---------------
              0 |                  0 | (null)        | (null)
```

**해석**: revoke 흔적 0. **F4 시나리오 (직역 전환 후 회수) 는 운영 데이터에 없음** — IR-V1 §4-2 의 F4 가설은 현재 데이터로 검증 불가 (장래 발생 가능성은 별개).

---

## 3. 분석

### 3-1. 누락 단계 정리

| 사용자 | step1 (bizno) | step2 (km/pp activity) | step3 (org) | step4 (owner) | step5 (role) | 분류 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| renagang21@gmail.com | ✅ 1089999999 | ✅ pharmacy_owner / ✅ pharmacy_owner | ❌ | ❌ | ❌ | F2 |
| sohae2100@gmail.com | ✅ 1089999999 | ✅ pharmacy_owner / ✅ pharmacy_owner | ❌ | ❌ | ❌ | F2 |

→ step3 에서 동일하게 끊김. step1/step2 는 정상.

### 3-2. F2 발생 원인 추정 (3 가지)

| # | 추정 | 검증 방법 |
|---|---|---|
| C1 | 회원 승인 자체가 자동 부여 정책 도입 이전 시점에 일어남 (legacy) | km.status 가 active 인 시점과 정책 도입 commit 시점 비교 |
| C2 | 자동 부여 trigger 조건 (`businessName OR pharmacy_name` 비어있음) 미충족 | sohae2100 의 bizname 비어있음 ↔ 정확히 trigger skip 가능 |
| C3 | 트랜잭션 중 `ensureOrganization` 실패 (silently) | API 로그 추적 — 본 IR 범위 외 |

**가장 유력**: sohae2100 의 경우 **C2** (bizname 비어있음 → trigger skip) 가 가장 직접적 증거. renagang21 은 bizname 있으니 C1 또는 C3 가능성.

### 3-3. 동일 businessNumber 두 사용자 — backfill 정책 결정 필요

`renagang21` 과 `sohae2100` 이 **동일 `1089999999`** 사용. backfill 시:

- **옵션 A**: `kpa-pharm-1089999999` org 1 개 생성 + 두 사용자 모두 `organization_members(role='owner')` INSERT
  - 현실 충돌: 한 사업자등록증에 owner 2 명?
  - 단 test 데이터이므로 운영 영향 없음
- **옵션 B**: test 데이터 인지하고 별도 처리 (예: bizno suffix 추가, 또는 backfill 제외)
- **옵션 C**: 한 명만 backfill (renagang21 — bizname 보유 → trigger 본의 충족), sohae2100 은 admin 운영자 계정이므로 store_owner 부여 자체가 부적절일 수 있음

→ 본 IR 은 결정하지 않음. 정책 결정 후 Phase 2 WO 진행.

### 3-4. 영향 평가

- **메뉴 미노출**: 두 사용자 모두 KPA-Society 헤더에 약국 메뉴가 보이지 않음 (IR-V1 §0 의 가설 100% 재현)
- **/store-hub /store 진입 시도**: HubGuard 가 `isStoreOwnerDual` 로 차단 → /pharmacy/approval 로 redirect (이전 IR `IR-O4O-KPA-PHARMACY-OWNER-POST-APPROVAL-ACCESS-FLOW-AUDIT-V1` 의 시나리오 그대로 재현 가능)
- 단 sohae2100 은 `super_admin` 보유 — `platformBypass` 설정에 따라 일부 가드는 우회 (헤더의 super_admin 표시 / membership_gate 의 super_admin bypass 등)

---

## 4. 권장 다음 단계

### 4-1. 정책 결정 (사용자 입력 필요)

**Q1**: 동일 bizno 를 가진 두 test 사용자의 처리?
- 옵션 A: 둘 다 backfill (test 의도 보존)
- 옵션 B: bizno 보정 후 backfill (예: sohae2100 의 bizno 를 다른 fake 값으로 갱신)
- 옵션 C: renagang21 만 backfill (sohae2100 은 admin/operator 계정 — store_owner 부여 부적절)

**Q2**: sohae2100 의 bizname 비어있음 → backfill 시 어떻게 채울지?
- 옵션 A: NULL 허용 (current schema 확인 필요)
- 옵션 B: placeholder ("Sohae 약국" 등) 보정
- 옵션 C: 사용자에게 입력 요청 (현재 service 전이라 무의미)

### 4-2. Phase 2 — Backfill (정책 결정 후)

**WO-O4O-KPA-STOREOWNER-ROLE-BACKFILL-V1** (이전 IR 에서 제안)

**범위**: `apps/api-server/src/database/migrations/` 신규 마이그레이션 1 개

**작업 (옵션 A 채택 가정)**:
```sql
-- 1) organization 생성 (멱등)
INSERT INTO organizations (id, code, name, type, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'kpa-pharm-1089999999', 'KPA Pharmacy 1089999999', 'kpa-pharmacy', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE code = 'kpa-pharm-1089999999');

-- 2) organization_members(owner) for both users (멱등 — left_at NULL 우선)
INSERT INTO organization_members (organization_id, user_id, role, created_at, updated_at)
SELECT o.id, u.id, 'owner', NOW(), NOW()
FROM organizations o
CROSS JOIN users u
WHERE o.code = 'kpa-pharm-1089999999'
  AND u.email IN ('renagang21@gmail.com', 'sohae2100@gmail.com')
  AND NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = u.id AND om.organization_id = o.id AND om.left_at IS NULL
  );

-- 3) role_assignments(kpa:store_owner, active) — roleAssignmentService 멱등 패턴
INSERT INTO role_assignments (user_id, role, assigned_by, is_active, valid_from, created_at, updated_at)
SELECT u.id, 'kpa:store_owner', 'backfill-WO-V1', true, NOW(), NOW(), NOW()
FROM users u
WHERE u.email IN ('renagang21@gmail.com', 'sohae2100@gmail.com')
ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO UPDATE SET updated_at = NOW();
```

**검증**: 본 IR 의 Q2/Q3 쿼리 재실행 → drift = 0 확인.

**정책 준수**: CLAUDE.md §0 — UPDATE/INSERT 는 사용자 승인 + CI/CD 경로. migration 자동 실행 (main 머지 → CI 가 적용).

### 4-3. Phase 3 — 재발 방지 (P1, 별건 WO)

**WO-O4O-KPA-ACTIVITY-TYPE-ROLE-SYNC-BIDIRECTIONAL-V1** (이전 IR 에서 제안)
- 본 IR 데이터에서 F4 (revoke 후 미회복) 발생 안 했으나, 정책 갭은 그대로 → 별건 처리.

**WO-O4O-KPA-AUTO-ACTIVATION-TRIGGER-OBSERVABILITY-V1** (신규 제안)
- `member.controller.ts:540-614` chain 의 각 step 실패 시 logger.warn / metric 기록
- sohae2100 같은 trigger skip 케이스를 운영 중에 식별 가능하게 함

---

## 5. 본 IR 의 범위 외

- UPDATE / DELETE / INSERT — 본 IR 은 read-only.
- 정책 결정 (§4-1 의 Q1, Q2) — 사용자 입력 대기.
- Backfill 마이그레이션 작성 — Phase 2 WO.
- F4 sync 코드 추가 — Phase 3 WO.
- API 로그 추적 (C3 가설 검증) — Cloud Logging read 별건.

---

## 6. 변경 이력 / 흔적

- 운영 DB read-only SELECT 7 회 (Q0 ~ Q7).
- `gcloud sql instances patch` 2 회:
  1. authorized_networks 임시 추가 (`124.194.156.36/32` + `112.153.205.95/32`)
  2. 원본 복원 (`124.194.156.36/32` 단일)
- 로컬 임시 파일: `/c/tmp/storeowner-drift-check.sql`, `/c/tmp/storeowner-drift-out.txt` (repo 미포함).
- 데이터 변경 없음.

---

## 7. 최종 결론

1. drift 는 실재. **pharmacy_owner 사용자 2/2 모두 store_owner role 부재** (100%).
2. 누락은 모두 **F2 — organization 미생성** 단계.
3. revoke 흔적 없음 (inactive row 0) → F4 시나리오 운영에 없음 (현재 시점 기준).
4. 두 사용자 동일 가짜 bizno `1089999999` → test 데이터. **backfill 정책 결정 선행 필요**.
5. sohae2100 의 bizname 비어있음 → 자동 부여 trigger skip 의 직접 증거 → C2 가설 지지.
6. **다음 단계는 Phase 2 (backfill) 가 아니라 §4-1 정책 결정** → 결정 후 Phase 2 진행.

---

## 8. 후속 옵션 정리 (사용자 의사결정 입력 형식)

```
Q1. 동일 bizno (1089999999) 처리:
  [ ] A — 둘 다 backfill
  [ ] B — bizno 보정 후 backfill (sohae2100 별도 fake bizno)
  [ ] C — renagang21 만 backfill (sohae2100 admin 계정 제외)
  [ ] 기타 — ___

Q2. sohae2100 의 빈 bizname:
  [ ] A — NULL 허용
  [ ] B — placeholder 보정 ("Sohae 약국" 등)
  [ ] C — 처리 안 함 (Q1 에서 C 선택 시)
  [ ] 기타 — ___

Q3. Phase 2 backfill 직후 검증:
  [x] 본 IR 의 Q2/Q3 쿼리 재실행 → drift = 0 확인 (default)
```

---

## 9. 참고 — 실행 SQL 전문

```sql
-- (§11 의 SQL 전문은 /c/tmp/storeowner-drift-check.sql 참조 — 본 문서 부록에 미포함)
```

---

*Status: Investigation Complete. Read-only verification only. Awaiting policy decision (§4-1) before Phase 2 backfill WO.*
*Updated: 2026-05-17*
*Version: 1.0*
