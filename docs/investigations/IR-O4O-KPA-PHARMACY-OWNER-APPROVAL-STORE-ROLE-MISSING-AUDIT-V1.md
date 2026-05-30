# IR-O4O-KPA-PHARMACY-OWNER-APPROVAL-STORE-ROLE-MISSING-AUDIT-V1

> **조사 보고서 (read-only) — 코드·UI·DB·migration 변경 없음.**
>
> renagang21@gmail.com (약국 경영자, activity_type=pharmacy_owner) 가 운영자 승인 후에도 `kpa:store_owner` 권한 ("매장 운영") 이 표시되지 않는 원인 — 승인 흐름 단계별 데이터 정합성 audit.

- **작성일:** 2026-05-30
- **사전 동기화:** origin/main 와 0 commits 차이
- **수정 행위:** **없음** | **DB 변경:** **없음** (read-only API 호출만)

---

## 1. 전체 판정 (10초 결론)

> **원인 = A (승인 시 kpa:store_owner role 부여 누락)** + **F (kpa_members.status='active' vs service_memberships.status='pending' 정합성 위반)**.
>
> renagang21 의 현 데이터 상태:
> - `kpa_members.status='active'` ✓ + `activity_type='pharmacy_owner'` ✓ + `organization_id` 보유 ✓
> - **`service_memberships[kpa-society].status='pending'`** ✗ (어긋남)
> - **`isStoreOwner=False`** + roles 에 `kpa:store_owner` 없음 ✗
>
> 정상 승인 흐름 ([member.controller.ts:495-749](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L495-L749)) 은 PATCH /:id/status with status='active' 한 번 호출로 STEP1~4 모두 실행. 그러나 renagang21 은 STEP1 (kpa_members) 만 실행되고 **STEP3 (sm 동기화) + STEP4 (organization + role_assignments INSERT) 모두 미실행** 상태.
>
> 가장 가능성 큰 시나리오: **withdraw → 재가입 흐름의 정합성 버그**. withdraw 시점 sm.status='withdrawn' 으로 변경 → 운영자가 status='active' PATCH 시 STEP3 의 `WHERE status='pending'` 조건 미매치 → sm 무변동 → 사용자가 별도로 다시 가입 시도하여 sm.status='pending' 새 row 생성. 결과: kpa_members.status='active' (이전 PATCH 잔재) + sm.status='pending' (새 신청) + role 미부여.
>
> **즉시 해결 후보** = renagang21 의 sm 을 'active' 로 운영자가 다시 승인 (PATCH /kpa/members/:id/status status='active' 재호출) → STEP3/STEP4 정상 실행 → kpa:store_owner 부여.
>
> **구조적 해결** = withdraw → 재가입 흐름의 데이터 정합성 보장 (별도 WO).

---

## 2. 조사한 파일

| 파일 | 라인 | 역할 |
|---|---:|---|
| [apps/api-server/src/routes/kpa/controllers/member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L495-L749) | 495-749 | PATCH /:id/status 의 STEP1~4 흐름 (kpa_members → users → sm → organization + role) |
| [apps/api-server/src/routes/kpa/controllers/member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L579-L584) | 579-584 | **STEP3** — sm UPDATE `WHERE service_key='kpa-society' AND status='pending'` |
| [apps/api-server/src/routes/kpa/controllers/member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L641-L749) | 641-749 | **STEP4** — pharmacy_owner 자동 organization + role assignment |
| [apps/api-server/src/routes/kpa/controllers/member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L745-L749) | 745-749 | `roleAssignmentService.assignRole({ role: 'kpa:store_owner' })` 호출 |
| [apps/api-server/src/routes/kpa/controllers/member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L122-L134) | 122-134 | POST /apply ALREADY_MEMBER check (status 필터 0 — withdrawn 도 차단) |
| [apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L233-L304) | 233-304 | 별도 PharmacyRequest 승인 흐름 (operator 별도 endpoint, 자동 활성화 무관) |
| [apps/api-server/src/services/approval/MembershipApprovalService.ts](apps/api-server/src/services/approval/MembershipApprovalService.ts#L706-L724) | 706-724 | withdrawMembership STEP2 — `is_active=false WHERE role LIKE 'kpa:%'` |
| [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L373-L378) | 373-378 | statusTabs — `sm.status` 기준 ('active' / 'rejected' / 'suspended' / 'withdrawn') |

---

## 3. renagang21@gmail.com 현재 데이터 (production read-only API)

| 항목 | 값 | 평가 |
|---|---|:---:|
| users.email | renagang21@gmail.com | — |
| users.id | 6967ebe0-2f87-4cab-809b-8c7190493cef | — |
| kpa_members.id | 3965dff9-880d-4171-aa9d-81b88e59ad64 | — |
| kpa_members.status | **active** | ✓ |
| kpa_members.identity_status | active | ✓ |
| kpa_members.membership_type | pharmacist_member | ✓ |
| kpa_members.activity_type | **pharmacy_owner** | ✓ (약국 경영자 확정) |
| kpa_members.license_number | NULL | (P3 cleanup 결과) |
| kpa_members.organization_id | c92b857f-7bac-423b-8a12-c29a0ab955fd | ✓ (테스트 약국, business_number=1009999999) |
| kpa_members.updated_at | 2026-05-30T04:00:28 | (최근 변경) |
| service_memberships[kpa-society].status | **pending** | ✗ **어긋남** |
| service_memberships[kpa-society].role | user | ✗ (기본값 — 승인 후 변경되지 않음) |
| roles | [lms:instructor, pharmacy, supplier] | ✗ `kpa:store_owner` **없음** |
| isStoreOwner | **False** | ✗ |

→ **kpa_members 와 service_memberships 의 status 가 어긋남** + **kpa:store_owner role 미부여**.

---

## 4. 정상 흐름 vs renagang21 실제 흐름

### 4.1 정상: PATCH /kpa/members/:id/status with status='active'

| STEP | 동작 | 결과 |
|:---:|---|---|
| 1 | `UPDATE kpa_members SET status='active'` | kpa_members.status='active' |
| 2 | `UPDATE users SET status='active', isActive=true` | user 활성화 |
| 3 | `UPDATE service_memberships SET status='active' WHERE service_key='kpa-society' AND status='pending'` | sm.status='active' |
| 4 | (pharmacy_owner only) `ensureOrganization()` + `addMember(role='owner')` + `assignRole('kpa:store_owner')` | organization + kpa:store_owner |

→ 한 번 호출로 4 STEP 모두 동시 실행 (정상).

### 4.2 renagang21 실제

| STEP | 예상 결과 | 실제 |
|:---:|---|---|
| 1 | kpa_members.status='active' | ✓ |
| 2 | users.isActive=true | (확인 필요, 추정 ✓ — login 성공) |
| 3 | sm.status='active' | ✗ **status='pending' 그대로** |
| 4 | organization + kpa:store_owner | ✗ **role 미부여** (organization 은 별도 보유 — 가입 시점) |

→ **STEP3 + STEP4 실행 안 됨**. STEP3 의 WHERE 조건 (`status='pending'`) 매치 안 된 시점이 있었음을 시사.

---

## 5. 가장 가능성 큰 시나리오 (재구성)

```
T0  renagang21 가입 → kpa_members(status='pending') + sm(status='pending')
T1  운영자 승인 → STEP1-4 모두 실행 → sm.status='active' + kpa:store_owner 부여
T2  사용자 탈퇴 → withdrawMembership() 실행
    - kpa_members.status='withdrawn' + license_number=NULL (P3 cleanup)
    - sm.status='withdrawn'
    - role_assignments.kpa:store_owner.is_active=FALSE (STEP2 of withdraw)
T3  사용자 재가입 시도 → POST /apply 호출 → ALREADY_MEMBER 차단 (kpa_members 잔재)
T4  (어떤 흐름) → 운영자가 PATCH /:id/status 로 active 변경 시도
    - STEP1 ✓ kpa_members.status='active'
    - STEP3 ✗ WHERE status='pending' 미매치 (당시 sm.status='withdrawn')
    - STEP4 (pharmacy_owner) 실행 여부 확인 필요 — line 641-749 조건이 'pending→active' 인지 확인
T5  사용자가 다른 흐름 (예: register 재시도) → sm 새 row 'pending' INSERT
T6  현 상태: kpa_members.status='active' + sm.status='pending' + role 미부여
```

→ **withdraw → 재가입 흐름의 데이터 정합성 버그** = STEP3 의 WHERE 조건이 'pending' 만 매치하여 'withdrawn' 상태에서 active 로의 직접 전환 지원 안 함.

---

## 6. 원인 분류 (사용자 directive A~G)

| 분류 | 판정 | 근거 |
|---|:---:|---|
| **A. 승인 시 kpa:store_owner role 부여 누락** | ✅ **확정** | roles 에 없음 + isStoreOwner=False |
| B. activity_type 값 불일치로 약국 경영자 branch 미실행 | ❌ | activity_type='pharmacy_owner' 정상 |
| C. organization/pharmacy 생성 누락 | ❌ | organization_id 보유 (가입 시점 또는 이전 승인 시 생성) |
| D. role 은 있으나 KPA filter/label 문제 | ❌ | role 자체 부재 (P1 WO `6d8fd92c0` filter 는 정상 — kpa:* 통과) |
| E. role 은 있으나 inactive 상태 | ⚠️ 부분 | withdraw 시 is_active=false 처리. 재가입 후 reactivate 안 됨 |
| **F. service_memberships / kpa_members 상태 동기화 누락** | ✅ **확정** | sm.status='pending' vs km.status='active' |

→ **본질 = A + F + (E 가능)**. 모두 withdraw → 재가입 흐름의 정합성 결함.

---

## 7. 즉시 해결 vs 구조적 해결

### 7.1 즉시 해결 (단발 — 사용자 승인 후)

**운영자가 /operator/members 에서 renagang21 의 sm.status='pending' 을 다시 승인** (PATCH /kpa/members/:id/status status='active'):
- STEP3 의 WHERE 조건 `status='pending'` 매치 ✓
- STEP4 (pharmacy_owner) 실행 → organization 보유 + kpa:store_owner 부여 ✓
- sm.status='active' + role 활성화

단 STEP4 가 ON CONFLICT 처리되는지 (organization 이 이미 있는 경우) 검증 필요 — line 670-675 의 `ensureOrganization` 동작 확인 필요.

### 7.2 구조적 해결 (별도 WO — withdraw → 재가입 흐름 정합성)

| 옵션 | 내용 |
|---|---|
| **withdraw 시 sm row 자체 삭제 (cascade)** | 재가입 시 새 row 생성, 기존 데이터 정합성 보장 |
| **STEP3 WHERE 확장** | `WHERE status IN ('pending', 'withdrawn')` 로 변경 — withdrawn → active 직접 전환 지원 |
| **재가입 endpoint 별도 신설** | `POST /kpa/members/rejoin` — withdrawn 회원 재가입 + 모든 status reset 통합 |
| **POST /apply 의 ALREADY_MEMBER check 완화** | status='withdrawn' 인 경우 UPDATE 허용 (재가입 자연스러움) |

---

## 8. 후속 WO 후보 (Priority 순)

### Priority 1 — renagang21 단발 정리 (사용자 승인 후)

```
운영자가 KPA 회원관리 화면 (또는 admin endpoint 직접 호출):
PATCH /api/v1/kpa/members/3965dff9-880d-4171-aa9d-81b88e59ad64/status
Body: { "status": "active" }

기대: STEP3 (sm pending → active) + STEP4 (organization + kpa:store_owner) 정상 실행
검증: roles 에 kpa:store_owner 추가 + isStoreOwner=True
```

**주의**: 본 IR 은 즉시 실행하지 않음 (사용자 승인 + 운영자 자격증명 확인 후).

### Priority 2 — withdraw → 재가입 흐름 정합성 구조 WO

```
WO-O4O-KPA-WITHDRAW-REJOIN-LIFECYCLE-CONSISTENCY-V1
  - withdraw 시 sm row 처리 정책 명문화 (status='withdrawn' 유지 vs 삭제)
  - 재가입 흐름 정의 (POST /apply 의 ALREADY_MEMBER check 완화 vs 별도 rejoin endpoint)
  - PATCH /:id/status STEP3 WHERE 조건 확장 검토 (withdrawn → active 직접 전환 지원)
  - withdraw 시 비활성화된 role_assignments 의 재활성화 정책 (현재 reactivate 만 explicit UPDATE, approve 는 UPSERT 만)
```

### Priority 3 — Pre-deploy 일괄 데이터 audit (별건)

```
WO-O4O-KPA-PHARMACY-OWNER-ROLE-CONSISTENCY-AUDIT-V1
  - kpa_members.activity_type='pharmacy_owner' AND status='active' 회원 중
    role_assignments.kpa:store_owner.is_active=true 가 없는 row 일괄 조회 (read-only)
  - 결과에 따라 backfill 필요성 결정 (별도 WO)
```

### Priority 4 — 운영자 알림

```
운영자 회원관리 화면에 "데이터 정합성 경고" 표시:
- kpa_members.status='active' AND sm.status≠'active' 인 row 에 ⚠️ badge
- 운영자가 재승인 가능하도록 quick action 제공
```

---

## 9. Current Structure vs O4O Philosophy Conflict Check

### 판정: **명확한 충돌 3건**

1. **약국 경영자 승인 → 매장 운영 권한 부여** 라는 O4O 핵심 원칙이 데이터 정합성 결함으로 깨짐
2. **운영자 mental model 충돌**: 화면에 "승인 완료" 로 보이는 상태가 실제 권한 부여를 보장하지 않음 (kpa_members.status='active' vs sm.status='pending' 어긋남)
3. **withdraw → 재가입 흐름**: 같은 사용자가 정상 절차로 재가입해도 권한 복구 보장 안 됨 (구조적 결함)

### 권장 방향

1. **즉시**: renagang21 단발 정리 (운영자 재승인 1회) — UX 회복
2. **단기**: Priority 2 WO 진행 — withdraw → 재가입 흐름 명문화 및 정합성 보장
3. **중기**: Priority 3 audit — 같은 패턴 회원 일괄 발견 + 보정

---

## 10. 본 IR 이 결정하지 않는 것

- renagang21 단발 cleanup 의 실제 실행 (사용자 승인 + 운영자 자격증명 필요)
- Priority 2 의 구조적 해결 방식 (4 가지 옵션 중 선택)
- Priority 3 의 일괄 audit 결과 (read-only SELECT 사용자 승인 후)
- PharmacyRequestController.approve 별도 흐름 활용 가능성 (대안 경로)
- STEP4 의 `ensureOrganization` 의 idempotency 검증 (재호출 시 안전성)

---

## 11. 본 IR 이 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 큰 결정 | **A (role 미부여) + F (status 동기화 누락) 확정**. 본질 = withdraw → 재가입 흐름의 정합성 결함 |
| 핵심 발견 | PATCH /:id/status STEP3 의 `WHERE status='pending'` 조건이 withdrawn → active 직접 전환 미지원 |
| 후속 WO 제안 | 4건 (P1 단발 cleanup, P2 구조 WO, P3 일괄 audit, P4 UX 경고) |
| 사이클 정리 | "표시 문제" 종결 후 "권한 부여 자체 문제" 로 정합 — 다음 P1 또는 P2 진입 결정 필요 |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. renagang21 현 상태 (read-only API)
TOKEN=$(curl -sv -X POST "https://api.neture.co.kr/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"renagang21@gmail.com","password":"seochuran1!"}' 2>&1 \
  | grep "set-cookie: accessToken=" | sed 's/.*accessToken=//; s/;.*//')
curl -s -H "Authorization: Bearer $TOKEN" https://api.neture.co.kr/api/v1/kpa/members/me

# 2. 정상 승인 흐름 코드
grep -nE "service_memberships|kpa:store_owner|ensureOrganization|assignRole" \
  apps/api-server/src/routes/kpa/controllers/member.controller.ts | head -20

# 3. withdraw 의 role 비활성화
grep -nE "role_assignments|is_active|kpa:" \
  apps/api-server/src/services/approval/MembershipApprovalService.ts | head -20

# 4. (사용자 승인 후 read-only SELECT)
SELECT id, user_id, service_key, status, role, approved_at, updated_at
FROM service_memberships WHERE user_id = '6967ebe0-2f87-4cab-809b-8c7190493cef';

SELECT id, role, is_active, created_at, updated_at
FROM role_assignments WHERE user_id = '6967ebe0-2f87-4cab-809b-8c7190493cef';

# 5. 같은 패턴 회원 일괄 발견 (Priority 3 audit)
SELECT km.user_id, km.status AS km_status, sm.status AS sm_status,
       EXISTS(SELECT 1 FROM role_assignments ra
              WHERE ra.user_id = km.user_id
                AND ra.role = 'kpa:store_owner'
                AND ra.is_active = true) AS has_store_owner_active
FROM kpa_members km
LEFT JOIN service_memberships sm
  ON sm.user_id = km.user_id AND sm.service_key IN ('kpa-society', 'kpa')
WHERE km.activity_type = 'pharmacy_owner'
  AND km.status = 'active'
  AND (sm.status != 'active' OR sm.status IS NULL);
```

---

*Created: 2026-05-30*
*Type: Investigation Report (read-only)*
*Status: ✅ 원인 확정 — A (role 미부여) + F (status 동기화 누락). 본질 = withdraw → 재가입 흐름의 데이터 정합성 결함.*
*Decision Required: (1) renagang21 단발 cleanup (운영자 재승인) — 즉시. (2) Priority 2 구조 WO — 단기. (3) Priority 3 일괄 audit — 중기.*
