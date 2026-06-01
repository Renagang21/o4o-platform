---
id: IR-O4O-KPA-STORE-PERMISSION-ADDRESS-DRIFT-AUDIT-V1
title: "KPA 회원 상세 — 매장 권한 잘못 표시 / 약국 주소 단일 문자열 합쳐짐 / 과거 매장 권한 워크플로우 잔재 감사"
status: investigation-complete
date: 2026-05-17
type: investigation
scope:
  - 운영자 회원 상세 Drawer 의 "매장 권한 없음" 표시 출처
  - activity_type='pharmacy_owner' ↔ role_assignments.kpa:store_owner 판정 흐름 전수 추적 (부여/회수)
  - 과거 매장 권한 신청/승인 워크플로우 (pharmacy-requests) 잔재 여부 및 활성 사용 여부
  - 목록 / 상세 Drawer / 수정 폼 / API 응답 4개 layer 간 데이터 불일치 (drift) 식별
  - 약국 주소가 우편번호·도로명·상세 분리가 아닌 단일 문자열로 저장/표시되는 원인
  - 후속 WO 후보 정리 (수정 필요 파일 + 위험도)
related:
  - IR-O4O-KPA-MEMBER-ROLE-TYPE-CANONICAL-AUDIT-V1
  - IR-O4O-KPA-MYPROFILE-NICKNAME-SAVE-READ-AUDIT-V1
  - IR-O4O-KPA-MYPROFILE-ROLE-INFO-VIEW-EDIT-SOURCE-AUDIT-V1
  - IR-O4O-KPA-STOREOWNER-HEADER-MENU-VISIBILITY-AUDIT-V1
  - IR-O4O-KPA-STOREOWNER-MISSING-ROLE-DRIFT-CHECK-V1
  - IR-O4O-SERVICE-MEMBERSHIP-CANONICAL-KEY-DRIFT-CHECK-V1
canonical-references:
  - docs/architecture/USER-OPERATOR-FREEZE-V1.md (F11)
  - docs/baseline/USER-DOMAIN-SSOT-V1.md
  - docs/baseline/ROLE-POLICY-AND-GUARD-V1.md
  - docs/rbac/RBAC-CANONICAL-STATE-V1.md
  - docs/rbac/RBAC-ROLE-CATALOG-V1.md
  - docs/baseline/KPA-ROLE-MATRIX-V1.md
---

# IR-O4O-KPA-STORE-PERMISSION-ADDRESS-DRIFT-AUDIT-V1

> Read-only 조사. 코드/DB/설정 변경 없음. CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료) 준수. 본 IR 은 "문제확정" 단계까지이며, 코드 수정은 후속 WO 에서 분리 진행.

---

## 0. Executive Summary

본 IR 은 사용자가 명시한 6개 조사 영역을 코드 기준으로 전수 추적한 결과를 정리한다. 가장 심각한 결함은 **F1 (회원 정지 시 store_owner 회수 누락)** 이며, 그 외에 **F4 (3개 진입점에서 동일 store_owner 부여 — 중복/충돌 위험)**, **F5 (편집 폼이 주소/전화 현재 값을 읽지 않음)**, **F6 (주소 분리 입력 인프라 부재)** 도 운영자 인지에 직접 영향을 준다.

| # | 결함 | 위치 / 검증 | 영향 |
|---|------|------------|------|
| **F1** | **회원 정지/탈퇴/거부 시 `kpa:store_owner` role 이 회수되지 않는다 (CRITICAL).** `suspendMembership()` 의 STEP2 는 `service_memberships.role` (`member/operator/admin`) 만 deactivate. `kpa:store_owner` 는 service_memberships 와 별개의 role_assignments 단독 row 이므로 회수 대상에서 제외됨. | [MembershipApprovalService.ts:392-405](../../apps/api-server/src/services/approval/MembershipApprovalService.ts#L392-L405) — `for membership of selectResult` 가 `WHERE role=$2` 에 `membership.role` 만 바인딩 | 정지된 회원이 운영자 화면에 "store_owner 보유" 로 표시. `me-context.isStoreOwner=true` 가 유지되어 PharmacyGuard 통과 — `/store` 접근 가능 (membership.status='suspended' 와 모순) |
| **F2** | **재활성화(`suspended→active`) 시에도 store_owner 가 복원되지 않는다.** `reactivateMembership()` STEP3 가 동일하게 membership.role 만 재활성화. 정지 전 store_owner 였던 회원이 복원 후에도 권한 미보유. | [MembershipApprovalService.ts:517-531](../../apps/api-server/src/services/approval/MembershipApprovalService.ts#L517-L531) | 정지→복원 사이클을 거친 개설약사가 별도 PATCH 없이는 매장 운영 권한 영구 손실. F1 과 결합되면 위/아래 비대칭(부여=수동, 회수=없음)이 발생하여 운영자가 데이터 청소 불가 |
| **F3** | **"매장 권한 없음" 표시는 정상이지만 의미가 모호하다.** Drawer 의 "매장 권한" row 는 `capabilities.includes('kpa:store_owner')` 단일 boolean 만 표시. activity_type='pharmacy_owner' 인데 store_owner 가 없는 경우(부여 보류 / F1 잔존 / 미승인)를 구분하지 못함. | [MemberManagementPage.tsx:1316-1328](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1316-L1328) | 운영자가 "없음" 의 원인을 화면에서 알 수 없음 → 사업자번호/약국명 누락인지, 정지된 잔재인지, 미승인인지 불명 |
| **F4** | **store_owner 자동 부여 진입점이 3개 — byte-equivalent 4단계 코드가 분산.** (a) PATCH `/members/:id/info` activity_type 변경, (b) PATCH `/members/:id/status` pending→active + pharmacy_owner, (c) PATCH `/pharmacy-requests/:id/approve` 별도 워크플로우. 모두 organizations ensure → kpa_members.organization_id → organization_members owner → role_assignments(kpa:store_owner) 4단계. | [member.controller.ts:1088-1140](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1088-L1140) / [member.controller.ts:563-627](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L563-L627) / [pharmacy-request.controller.ts:200-241](../../apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L200-L241) | (1) audit trail 분산 — 같은 회원이 (b) 자동승인 + (c) 별도 신청 모두 거치면 어느 row 가 권한 source 인지 불명확. (2) `roleAssignmentService.assignRole` 이 멱등이므로 중복 부여는 안전하지만 organization_members owner row 가 동일 user_id 에 대해 별도 organization 으로 생성될 가능성 (사업자번호 변경 시) |
| **F5** | **운영자 편집 폼이 pharmacy_address / pharmacy_phone 의 현재 값을 읽지 않는다.** `editForm.pharmacy_address` / `pharmacy_phone` 초기값이 `''` (빈 문자열). selectedMember 의 현재 값을 무시. 저장 시 `trim().length > 0` 검사로 빈 값 = "변경 없음" 처리 → 운영자가 의도적으로 주소를 비울 수 없다. | [MemberManagementPage.tsx:445-447, 469-471](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L445-L447) / 변경 검출 [:503-507](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L503-L507) | 편집 모드 진입 시 주소 입력 박스가 비어있어 운영자가 "주소가 없다" 고 오인. 입력하지 않으면 placeholder 만 표시(`selectedMember.pharmacy_address || '주소 (선택 — 비워두면 현재 값 유지)'`). 의도된 UX 인지 누락인지 명문화된 결정 없음 |
| **F6** | **약국 주소가 우편번호/도로명/상세로 분리 저장될 인프라가 존재하지 않는다.** `kpa_members.pharmacy_address` 는 `VARCHAR(300)` 단일 컬럼. 등록 모달의 개설약사 분기는 `AddressSearch` (Daum API) 로 zipCode+address+addressDetail 3-part 입력을 받지만, 저장 시 `.join(' ')` 으로 합쳐 단일 문자열로 전송. 근무약사 분기는 처음부터 자유 텍스트 입력. | 스키마 [kpa-member.entity.ts:96-97](../../apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts#L96-L97) / [20260206190000-CreateKpaFoundationTables.ts:61](../../apps/api-server/src/database/migrations/20260206190000-CreateKpaFoundationTables.ts#L61) / 합치기 [RegisterModal.tsx:229-233](../../services/web-kpa-society/src/components/RegisterModal.tsx#L229-L233) | (1) 분리된 zipCode 가 사라져 우편물 발송/세금 행정 처리 시 재추출 필요. (2) 운영자 편집 폼은 자유 텍스트 input — 분리 입력 UX 제공 안 됨. (3) 분리 컬럼을 추가하면 backfill 필요. 본 IR 은 schema 결정 변경을 권고하지 않음 (canonical 문서 결정 필요) |

> **본 IR 의 결론은 "결함 확정 + drift 지점 + 후속 WO 분리 권장" 까지다. 코드 수정 / 마이그레이션 / 라우트 제거는 다음 WO 에서 분리 진행한다.**

---

## 1. 조사 방법

- 작업 디렉토리: `c:\Users\sohae\o4o-platform`
- 기준 브랜치: `main` (현재 working tree)
- Read-only 대상
  - Frontend
    - [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) (1703 lines)
    - [services/web-kpa-society/src/components/RegisterModal.tsx](../../services/web-kpa-society/src/components/RegisterModal.tsx)
    - [services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx](../../services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx)
    - [services/web-kpa-society/src/pages/operator/PharmacyRequestManagementPage.tsx](../../services/web-kpa-society/src/pages/operator/PharmacyRequestManagementPage.tsx)
    - [services/web-kpa-society/src/api/pharmacyRequestApi.ts](../../services/web-kpa-society/src/api/pharmacyRequestApi.ts)
    - [services/web-kpa-society/src/routes/OperatorRoutes.tsx](../../services/web-kpa-society/src/routes/OperatorRoutes.tsx)
    - [services/web-kpa-society/src/components/auth/PharmacyGuard.tsx](../../services/web-kpa-society/src/components/auth/PharmacyGuard.tsx)
  - Backend
    - [apps/api-server/src/routes/kpa/controllers/member.controller.ts](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts) (1393 lines)
    - [apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts](../../apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts) (285 lines)
    - [apps/api-server/src/services/approval/MembershipApprovalService.ts](../../apps/api-server/src/services/approval/MembershipApprovalService.ts)
    - [apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts](../../apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts)
    - [apps/api-server/src/routes/kpa/entities/kpa-pharmacy-request.entity.ts](../../apps/api-server/src/routes/kpa/entities/kpa-pharmacy-request.entity.ts)
    - [apps/api-server/src/database/migrations/20260206190000-CreateKpaFoundationTables.ts](../../apps/api-server/src/database/migrations/20260206190000-CreateKpaFoundationTables.ts)
    - [apps/api-server/src/database/migrations/20260219000005-CreateKpaPharmacyRequests.ts](../../apps/api-server/src/database/migrations/20260219000005-CreateKpaPharmacyRequests.ts)
    - [apps/api-server/src/database/migrations/20260219000006-MigratePharmacyJoinToIndependentTable.ts](../../apps/api-server/src/database/migrations/20260219000006-MigratePharmacyJoinToIndependentTable.ts)
  - Canonical 문서: USER-OPERATOR-FREEZE-V1, USER-DOMAIN-SSOT-V1, ROLE-POLICY-AND-GUARD-V1, RBAC-CANONICAL-STATE-V1
- DB 직접 SELECT 미수행. 본 IR 의 모든 결론은 코드 정적 분석 기반이며, F1/F2 의 production drift 잔존 여부는 §9 의 SQL 로 운영자가 직접 verify 권장.
- `git status`: 작업 전후 동일 (본 IR untracked 파일 1 개 추가만).

---

## 2. "매장 권한 없음" 표시 출처 (조사 영역 1)

### 2-1. Frontend 표시

[MemberManagementPage.tsx:1316-1328](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1316-L1328) — Drawer 의 "매장 권한" row:

```tsx
const hasStoreOwnerCap = (selectedMember.capabilities ?? []).includes('kpa:store_owner');
// ...
<div style={fieldRowStyle}>
  <span style={labelStyle}>매장 권한</span>
  <span style={valueStyle}>
    {hasStoreOwnerCap ? (
      <span ...>store_owner 보유</span>
    ) : (
      <span ...>없음</span>
    )}
  </span>
</div>
```

→ 판정 = `capabilities.includes('kpa:store_owner')` 단일 boolean. activity_type, kpa_members.role, organization_members.role 모두 무관.

### 2-2. Backend SQL — capabilities 의 source

[member.controller.ts:382-398](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L382-L398):

```sql
SELECT user_id, role FROM role_assignments
WHERE user_id = ANY($1::uuid[]) AND is_active = true
```

→ `role_assignments` 단독 source. `is_active=true` 필터 — F1/F2 의 drift 가 발생해도 (예: row 가 잘못 active 로 남아있어도) `capabilities` 에는 그대로 노출됨.

### 2-3. "없음" 으로 표시되는 케이스 분류

| 케이스 | activity_type | role_assignments.is_active | 화면 표시 | 정합성 |
|---|---|---|---|---|
| 정상 비-개설약사 | `pharmacy_employee` 등 | row 없음 | "없음" | ✅ 정상 |
| 부여 보류 | `pharmacy_owner` | row 없음 | "없음" | ⚠️ 사업자번호/약국명 누락 — 운영자 편집 후 저장 시 자동 부여 |
| 회수됨 (직역 변경) | `pharmacy_employee` (과거 pharmacy_owner) | `is_active=false` | "없음" | ✅ 정상 (직역 변경 회수 path) |
| **회수 누락** | (자유) | **`is_active=true` 인데 membership.status='suspended/rejected'** | "store_owner 보유" | ❌ **F1 — 회수 누락된 잔재** |
| 미승인 (pending) | `pharmacy_owner` | row 없음 | "없음" | ✅ 정상 — 승인 시 자동 부여 |

→ Drawer 의 "없음" 표시 자체는 코드 흐름상 정확하다. 문제는 **"없음" 이라는 표시가 5가지 다른 원인에서 발생하는데 운영자가 그 원인을 식별할 수 없다** 는 점이다 (F3). 그리고 별개로 **"store_owner 보유" 가 잘못 표시되는 경로** 가 F1 으로 존재한다.

---

## 3. pharmacy_owner ↔ kpa:store_owner 판정 흐름 전수 추적 (조사 영역 2)

### 3-1. 부여 경로 (3개 진입점)

#### (1) POST `/kpa/members/apply` — 신청 단계
[member.controller.ts:98-229](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L98-L229).

- `kpa_members.activity_type` 저장 + `kpa_pharmacist_profiles.activity_type` SSOT 동기화 ([:187-197](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L187-L197)).
- **store_owner 부여 안 함** — 승인 단계로 위임.

#### (2) PATCH `/kpa/members/:id/status` (pending → active) — 회원 승인
[member.controller.ts:540-627](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L540-L627):

```typescript
if (
  oldStatus === 'pending' &&
  newStatus === 'active' &&
  member.activity_type === 'pharmacy_owner'
) {
  // businessNumber + pharmacy_name 확인
  if (businessNumberDigits.length === 0 || !pharmacyName) {
    console.warn(...);  // ← warning 만, response 에 warnings[] 없음
  } else {
    // 4단계:
    // 1) organizationOpsService.ensureOrganization({ code: 'kpa-pharm-{businessNumber}' })
    // 2) UPDATE kpa_members.organization_id WHERE organization_id IS NULL
    // 3) organizationOpsService.addMember({ role: 'owner' })
    // 4) roleAssignmentService.assignRole({ role: 'kpa:store_owner' })
  }
}
```

특징:
- **누락 시 silent skip** — `console.warn` 만 찍고 응답에 warnings 없음. PATCH `/info` 와 다름.
- 회원 승인 자체는 항상 성공 — store_owner 부여 실패는 별도 try/catch 로 격리.

#### (3) PATCH `/kpa/members/:id/info` — 운영자 편집 시 activity_type 변경
[member.controller.ts:1088-1140](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1088-L1140).

(2) 와 byte-equivalent 4단계. 차이점:
- 누락 시 `warnings[]` 응답에 명시 (silent skip 아님).
- 사전 조건: `prevActivityType !== 'pharmacy_owner'` AND `activity_type === 'pharmacy_owner'` — 직역 전환 한정.

#### (4) PATCH `/kpa/pharmacy-requests/:id/approve` — 별도 신청 워크플로우
[pharmacy-request.controller.ts:200-241](../../apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L200-L241).

(2)/(3) 과 동일한 4단계. 추가로:
- `kpa_pharmacist_profiles.activity_type='pharmacy_owner'` upsert ([:227-233](../../apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L227-L233))
- `kpa_pharmacy_requests.status = 'approved'`, `approved_by`, `approved_at` 기록
- `actionLogService.logSuccess('kpa.operator.pharmacy_approve')` — 별도 audit trail

→ §5 에서 상세 분석.

### 3-2. 회수 경로 (1개 진입점만 동작 — **여기에 결함 F1**)

#### (a) PATCH `/kpa/members/:id/info` — 직역 변경 (pharmacy_owner → 다른 직역)
[member.controller.ts:1068-1086](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1068-L1086):

```sql
UPDATE role_assignments
SET is_active = false, updated_at = NOW()
WHERE user_id = $1 AND role = 'kpa:store_owner' AND is_active = true
```

→ **정상 동작**. 직역 전환 시 store_owner 명시적 회수.

#### (b) PATCH `/kpa/members/:id/status` (active → suspended/rejected) — 회원 정지
[member.controller.ts:507-515](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L507-L515):

```typescript
} else if (newStatus === 'suspended' || newStatus === 'rejected') {
  const approvalService = new MembershipApprovalService();
  await approvalService.suspendMembership({
    userId: member.user_id,
    suspendedBy: req.user!.id,
    isPlatformAdmin: false,
    serviceKeys: ['kpa-society'],
  });
}
```

→ `suspendMembership()` STEP2 ([MembershipApprovalService.ts:392-405](../../apps/api-server/src/services/approval/MembershipApprovalService.ts#L392-L405)):

```typescript
const selectResult = await queryRunner.query(
  `SELECT id, user_id, service_key, role, status
   FROM service_memberships
   WHERE user_id = $1 AND status = 'active' AND service_key = ANY($2)
   FOR UPDATE`,
  [userId, serviceKeys]
);
// ...
for (const membership of selectResult) {
  if (membership.role) {
    await queryRunner.query(
      `UPDATE role_assignments SET is_active = false ...
       WHERE user_id = $1 AND role = $2 AND is_active = true`,
      [userId, membership.role]  // ← service_memberships.role 만 deactivate
    );
  }
}
```

**검증 결과 (코드 직접 확인)**:
- `membership.role` = `service_memberships.role` 의 값. 가능한 값: `'member' / 'operator' / 'admin'` (kpa-society 케이스).
- **`'kpa:store_owner'` 은 `service_memberships.role` 에 들어가지 않는 별도 role_assignments 단독 row**.
- 따라서 `WHERE role = $2` 에 `'kpa:store_owner'` 가 바인딩되는 경로 자체가 없음.

→ **확정: pharmacy_owner 회원 정지 시 `kpa:store_owner` 가 회수되지 않는다 (F1).**

#### (c) PATCH `/kpa/members/:id/status` (suspended → active) — 재활성화
[member.controller.ts:526-534](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L526-L534) → `reactivateMembership()` STEP3 ([MembershipApprovalService.ts:517-531](../../apps/api-server/src/services/approval/MembershipApprovalService.ts#L517-L531)):

```typescript
for (const membership of selectResult) {
  const memberRole = membership.role || 'member';
  await queryRunner.query(
    `INSERT INTO role_assignments (user_id, role, ...) VALUES ($1, $2, $3, true, ...)
     ON CONFLICT ON CONSTRAINT "unique_active_role_per_user"
     DO UPDATE SET updated_at = NOW(), is_active = true`,
    [userId, memberRole, reactivatedBy]
  );
}
```

→ 동일하게 `membership.role` 만 재활성화. **`'kpa:store_owner'` 은 복원 대상 아님 (F2).**

#### (d) PATCH `/kpa/members/:id/status` (→ withdrawn) — 탈퇴
[member.controller.ts:516-525](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L516-L525) → `withdrawMembership()` 호출. (본 IR 에서 withdraw 메서드의 STEP 구조까지는 verify 하지 않았으나, suspend 와 동일한 패턴이라면 F1 과 동일한 결함이 잠재한다 — 후속 verify 필요.)

### 3-3. 회수 결함의 영향 (Visibility 모순)

| 시나리오 | role_assignments.store_owner | service_memberships.status | 화면 표시 | 실제 접근 |
|---|---|---|---|---|
| 정상 개설약사 | `is_active=true` | `active` | "store_owner 보유" / "/store" 통과 | ✅ |
| 정지된 개설약사 (F1 잔존) | **`is_active=true`** (회수 누락) | `suspended` | "store_owner 보유" — 운영자 오해 | PharmacyGuard 의 `isStoreOwnerDual(roles, ..., user.isStoreOwner)` 가 통과 → `/store` 접근 가능하나, MembershipGate 또는 별도 status 가드에서 차단되어야 함 |
| 거부된 개설약사 (F1 잔존) | **`is_active=true`** (회수 누락) | `rejected` | "store_owner 보유" | 동일 |
| 정지→복원된 개설약사 (F2) | (정지 전 = true) **여전히 true** (회수도 안 됐고 복원도 안 했으므로 동일 상태 유지) | `active` (재활성화됨) | "store_owner 보유" | 통과 (실질 영향 없음 — F1 이 실패한 덕에 F2 도 false positive 로 보인다) |

→ **F1 과 F2 가 결합되어 우연히 정지→복원 케이스는 동작한다**. 하지만 정지/거부 후 청소되지 않은 store_owner 잔재는 보안/거버넌스 측면에서 명백한 결함.

### 3-4. 정리: 부여=3개 / 회수=1개의 비대칭

| 경로 | store_owner 부여 | store_owner 회수 |
|---|---|---|
| POST `/apply` | ❌ | ❌ |
| PATCH `/:id/status` pending→active + pharmacy_owner | ✅ ([line 563-627](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L563-L627)) | n/a |
| PATCH `/:id/status` active→suspended/rejected | n/a | ❌ **F1** (`membership.role` 만 회수) |
| PATCH `/:id/status` suspended→active | n/a | ❌ **F2** (`membership.role` 만 복원) |
| PATCH `/:id/status` → withdrawn | n/a | ❌ **F2-extension** (suspend 와 동일 패턴 — verify 필요) |
| PATCH `/:id/info` activity_type 변경 (전환) | ✅ ([line 1088-1140](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1088-L1140)) | ✅ ([line 1068-1086](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1068-L1086)) |
| PATCH `/pharmacy-requests/:id/approve` | ✅ ([line 200-241](../../apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L200-L241)) | n/a |
| (없음 — pharmacy-requests 에 회수 엔드포인트 없음) | n/a | ❌ |

→ **부여는 3개 진입점에서 byte-equivalent 로 중복 / 회수는 직역 변경에만 동작 / 정지·거부·탈퇴 시 누락**.

---

## 4. 과거 매장 권한 신청/승인 프로세스 잔재 (조사 영역 3)

### 4-1. 결론: **잔재 아님 — 현재도 활성 사용 중인 dual-path**

`pharmacy-requests` 워크플로우는 dead code 가 아니다. 백엔드 라우트, 컨트롤러, 엔티티, 프론트엔드 페이지, API 클라이언트, 사용자/운영자 화면 모두 활성. 단, **현재 단순화 흐름 (PATCH `/:id/info` activity_type 변경) 과 byte-equivalent 한 4단계 권한 부여를 별도로 수행** 하므로 의도된 dual-path 인지 미정리 잔재인지 명문화된 결정이 없다.

### 4-2. 활성 코드 인벤토리

| Layer | 파일 / 라우트 | 상태 |
|---|---|---|
| **백엔드 라우트** | [apps/api-server/src/routes/kpa/kpa.routes.ts:335](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L335) `router.use('/pharmacy-requests', ...)` | ✅ 등록 |
| 백엔드 컨트롤러 | [apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts](../../apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts) (285 lines) | ✅ 활성 |
| 엔드포인트 | `POST /pharmacy-requests` (신청 생성) | ✅ |
| | `GET /pharmacy-requests/my` | ✅ |
| | `GET /pharmacy-requests/pending` (kpa:operator) | ✅ |
| | `PATCH /pharmacy-requests/:id/approve` (kpa:operator) | ✅ 4단계 store_owner 부여 |
| | `PATCH /pharmacy-requests/:id/reject` (kpa:operator) | ✅ |
| 엔티티 / 테이블 | [kpa-pharmacy-request.entity.ts](../../apps/api-server/src/routes/kpa/entities/kpa-pharmacy-request.entity.ts) → `kpa_pharmacy_requests` | ✅ |
| 마이그레이션 | [20260219000005-CreateKpaPharmacyRequests.ts](../../apps/api-server/src/database/migrations/20260219000005-CreateKpaPharmacyRequests.ts) | ✅ 테이블 생성 |
| | [20260219000006-MigratePharmacyJoinToIndependentTable.ts](../../apps/api-server/src/database/migrations/20260219000006-MigratePharmacyJoinToIndependentTable.ts) | ✅ legacy `kpa_organization_join_requests WHERE request_type='pharmacy_join'` 에서 데이터 이관 + 원본 삭제 |
| **프론트엔드 페이지** | [services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx](../../services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx) (408 lines) — 사용자 신청 게이트 | ✅ 활성, `pharmacyRequestApi.create()` 호출 |
| | [services/web-kpa-society/src/pages/operator/PharmacyRequestManagementPage.tsx](../../services/web-kpa-society/src/pages/operator/PharmacyRequestManagementPage.tsx) (430 lines) — 운영자 승인 화면 | ✅ 활성 |
| | [services/web-kpa-society/src/pages/pharmacy/sections/MyRequestsSection.tsx](../../services/web-kpa-society/src/pages/pharmacy/sections/MyRequestsSection.tsx) — 사용자 신청 내역 | ✅ |
| 라우트 등록 | [OperatorRoutes.tsx:128](../../services/web-kpa-society/src/routes/OperatorRoutes.tsx#L128) `<Route path="pharmacy-requests" ...>` | ✅ |
| API 클라이언트 | [services/web-kpa-society/src/api/pharmacyRequestApi.ts](../../services/web-kpa-society/src/api/pharmacyRequestApi.ts) (142 lines) | ✅ 5분 캐시 + dedup |

### 4-3. Dual-path 의 충돌 가능성

| 시나리오 | PATCH `/:id/info` activity_type→pharmacy_owner | PATCH `/pharmacy-requests/:id/approve` |
|---|---|---|
| organizations ensure | `code = 'kpa-pharm-{businessNumber}'` (businessNumber = users.businessInfo) | `code = 'kpa-pharm-{businessNumber}'` (businessNumber = kpa_pharmacy_requests.business_number) |
| kpa_members.organization_id | `UPDATE WHERE organization_id IS NULL` | `UPDATE WHERE organization_id IS NULL` |
| organization_members | `addMember role='owner'` | `addMember role='owner'` |
| role_assignments | `assignRole 'kpa:store_owner'` (멱등) | `assignRole 'kpa:store_owner'` (멱등) |
| kpa_pharmacist_profiles.activity_type | upsert `activity_type=$2` (현재값) | upsert `activity_type='pharmacy_owner'` |
| 별도 기록 | `kpa_operator_audit_logs` `MEMBER_INFO_UPDATED` | `kpa_pharmacy_requests.status='approved'` + `actionLogService.logSuccess('kpa.operator.pharmacy_approve')` |

→ **`businessNumber` source 가 다르다**:
- (info path) `users.businessInfo.businessNumber` — 사용자가 가입 시 입력한 사업자 정보
- (request path) `kpa_pharmacy_requests.business_number` — 신청서 별도 입력값

→ 같은 user_id 가 두 경로 모두 거치면 organization code 가 다를 가능성. 그 결과 organization 1 row 가 추가로 생성되어 organization_members.owner 가 **두 organization 에 분산** 될 수 있다. role_assignments 는 멱등이지만 organization_members 는 (organization_id, user_id) UNIQUE 이므로 organization 가 다르면 별도 row.

### 4-4. UX 진입점 정리

- `/pharmacy/approval` — `PharmacyApprovalGatePage` — 사용자가 가입 후 별도로 사업자번호/약국명을 입력하여 신청 (가입 시 누락한 케이스 복구 경로)
- `/operator/pharmacy-requests` — `PharmacyRequestManagementPage` — 운영자가 위 신청을 승인/반려
- `/operator/members` → Drawer 편집 → activity_type='pharmacy_owner' 설정 + 사업자번호/약국명 입력 → 저장 → PATCH `/info` 자동 활성화 — 위와 별도 경로

→ 정책 결정 필요: **(a) pharmacy-requests 를 deprecate 하고 PATCH `/info` 단일 경로로 통합** vs **(b) 사용자 자가 신청 경로로서 pharmacy-requests 유지, 운영자 직접 부여는 PATCH `/info` 만**.

### 4-5. 위험도 분류

| 항목 | 현재 상태 | 동작 시 위험 |
|---|---|---|
| pharmacy-requests 백엔드 라우트 | 활성 사용 | (1) Dual-path 부여 audit trail 분산 (2) businessNumber source 다름 → organization 중복 row 가능 |
| 마이그레이션 `20260219000006` | 이미 실행됨 (legacy 데이터 이관 완료) | 추가 위험 없음 — historical artifact |
| `kpa_pharmacy_requests` 테이블 | 활성 사용 | 통합 시 down migration 필요 — 진행 중 pending row 강제 이관 필요 |
| `/operator/pharmacy-requests` 화면 | 활성 사용 | 운영자 UX 분기. 통합 시 navigation/사이드바 정리 필요 |

---

## 5. 회원 상세 Drawer / 수정 폼 / API 응답 데이터 불일치 (조사 영역 4)

### 5-1. 동일 source 항목 (불일치 없음)

[MemberManagementPage.tsx:563-569](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L563-L569) 에서 selectedMember 는 fetchMembers 결과 members[] 내의 동일 row 객체로 refresh.

| 컬럼 | 목록 source | Drawer source | 일치 |
|---|---|---|---|
| 이름 / 이메일 | `m.user.name/email` | 동일 | ✅ |
| 유형 (membership_type) | `m.membership_type` | 동일 | ✅ |
| 활동 유형 (activity_type) | `m.activity_type` | 동일 | ✅ |
| 권한 (capabilities) | `m.capabilities` | 동일 | ✅ |
| 매장 권한 | (목록 미표시) | `capabilities.includes('kpa:store_owner')` | n/a |
| 상태 | `m.status` | 동일 | ✅ |

### 5-2. 발견된 결함 (D1–D5)

#### D1. editForm.pharmacy_address 초기값이 selectedMember 값을 읽지 않는다
[MemberManagementPage.tsx:445-447, 469-471](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L445-L447):

```typescript
setEditForm({
  // ...
  pharmacy_address: '',     // ← selectedMember.pharmacy_address 무시
  business_number: m.business_info?.businessNumber || '',
  pharmacy_phone: '',        // ← 동일
  // ...
});
```

- 결과: 편집 모드 진입 시 주소 입력 박스가 **빈 상태**.
- 입력 UI는 `placeholder={selectedMember.pharmacy_address || '주소 (선택...)' }` ([:1370](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1370)) — placeholder 로만 현재 값 노출.
- 저장 시 변경 검출 [:503](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L503): `pharmacyAddressChanged = editForm.pharmacy_address.trim().length > 0` — 빈 값 = "변경 없음" 처리.
- **결과적으로**: (1) 운영자는 주소가 비어있다고 오인. (2) 의도적으로 주소를 비울 수 없다. (3) placeholder 와 input 의 시각적 구분이 약해 운영자가 placeholder 를 실제 값으로 오인할 가능성.

#### D2. pharmacy_phone 은 표시도 안 되고 저장만 가능 (write-only)
- `editForm.pharmacy_phone` 입력 UI 는 존재 ([:1376-1385](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1376-L1385)).
- 그러나 `KpaMember` interface ([:53-92](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L53-L92)) 와 GET `/kpa/members` 응답에 `pharmacy_phone` 필드 없음.
- 저장 path: PATCH `/info` 에서 `users.businessInfo.metadata.pharmacy_phone` JSONB merge ([member.controller.ts:1042-1045](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1042-L1045)).
- **결과**: 저장은 되지만 다시 화면에 표시되지 않음. 운영자가 자신이 저장한 값을 확인할 수 없다.

#### D3. activity_type 빈 문자열 (`""`) 저장 경로
- select 의 첫 옵션이 `<option value="">-</option>` ([:1274](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1274)).
- 변경 검출 [:500](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L500): `activityChanged = editForm.activity_type !== (selectedMember.activity_type || '')`.
- 운영자가 "-" 를 선택하면 `activity_type: ""` 가 PATCH 페이로드로 전달.
- 백엔드 validation [member.controller.ts:918-921](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L918-L921): `isIn([...])` 에 `""` 포함 안 됨 → 빈 문자열은 validation 실패 (400). 단, `optional()` 이라 페이로드에 키 자체가 없으면 통과. 빈 문자열 명시 전달 시 거부됨 — 검증됨.
- **결과**: 운영자가 직역을 "null 로 변경" 하려 해도 불가능 (정책상 의도일 수 있음).

#### D4. membership_type legacy alias 처리 비대칭
- 표시 [:1204-1208](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1204-L1208): `pharmacist_member` / `pharmacy_student_member` 도 정규 라벨 ('약사' / '약대생') 으로 표시.
- 편집 select [:1192-1200](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1192-L1200): 표준값 (`pharmacist`, `student`) 외에 legacy alias 가 들어있는 경우에만 조건부 option 추가.
- **결과**: legacy alias 회원은 편집 후 저장하면 alias 가 그대로 유지되거나 정규값으로 변환됨 (운영자가 의도적으로 변경하지 않으면).

#### D5. 응답 zombie 필드 (drift)
- Backend GET `/kpa/members` 가 응답에 포함: `fee_category`, `sub_role`, `university_name`, `student_year`, `kpa_status`, `nickname` ([member.controller.ts:367-379](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L367-L379)).
- Frontend `KpaMember` interface ([:53-92](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L53-L92)) 에는 `nickname` 없음, `university_name/student_year/fee_category/sub_role` 도 없음.
- 화면 표시도 없음.
- **결과**: 정보 leak (운영자에게 익명 정보가 응답으로 전송되나 화면 미사용). 보안 측면에서 minor, 유지보수 측면에서 dead field.

### 5-3. 의도적으로 빈 값 저장 불가능한 필드

| 필드 | 빈 값 처리 | 영향 |
|---|---|---|
| pharmacy_address | `trim().length > 0` 검사 — 빈 = skip | 운영자가 주소를 지울 수 없음 |
| pharmacy_phone | 동일 | 동일 |
| business_number | `!==` 비교 — 빈 = 변경 ([:505](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L505)) | 빈 값 변경 가능 — businessInfo.businessNumber 가 `""` 로 갱신될 수 있음 (운영자 의도 시) |
| activity_type | select 의 `""` option 으로 변경 가능하나 백엔드 validation 거부 | 운영자 UX 불일치 — option 은 보이는데 저장 안 됨 |

---

## 6. 약국 주소 분리/합쳐짐 (조사 영역 5)

### 6-1. 결론: **분리 저장 인프라가 존재하지 않는다 — schema 결정**

`kpa_members.pharmacy_address` 는 `VARCHAR(300)` 단일 컬럼으로 의도적 설계. zipCode / address1 / address2 분리 컬럼 없음.

### 6-2. Schema 증거

[kpa-member.entity.ts:96-97](../../apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts#L96-L97):

```typescript
@Column({ type: 'varchar', length: 300, nullable: true })
pharmacy_address: string | null;
```

[20260206190000-CreateKpaFoundationTables.ts:61](../../apps/api-server/src/database/migrations/20260206190000-CreateKpaFoundationTables.ts#L61) — 최초 마이그레이션에서 단일 컬럼으로 정의.

→ `kpa_members` 의 분리 컬럼 (zonecode, road_address, jibun_address, detail_address 등) **없음**. 후속 마이그레이션에서도 추가되지 않았다.

### 6-3. UI 입력 방식의 이원화

#### 근무약사 (pharmacy_employee / hospital 등)
[RegisterModal.tsx:499-502](../../services/web-kpa-society/src/components/RegisterModal.tsx#L499-L502):

```tsx
<input type="text" name="pharmacyAddress" 
       placeholder="예: 서울특별시 강남구 ○○로 ○○" ... />
```

→ **자유 텍스트 input**. DaumPostcode 미사용.

#### 개설약사 (pharmacy_owner)
[RegisterModal.tsx:559-572](../../services/web-kpa-society/src/components/RegisterModal.tsx#L559-L572):

```tsx
<AddressSearch
  zipCode={...}
  address={...}
  addressDetail={...}
/>
```

→ Daum Postcode API 분리 입력 (3-part). 그러나 저장 시 [RegisterModal.tsx:229-233](../../services/web-kpa-society/src/components/RegisterModal.tsx#L229-L233):

```typescript
const composedAddr = [
  formData.businessZipCode,
  formData.businessAddress,
  formData.businessAddressDetail,
].filter(Boolean).join(' ');
if (composedAddr) payload.pharmacyAddress = composedAddr;
```

→ **합쳐서 단일 문자열로 전송**. zipCode 가 별도 컬럼에 저장되지 않고 주소 문자열의 앞부분에 prefix 로 박힘.

#### 별개의 `users.businessInfo` JSONB
- 분리된 zipCode/address/addressDetail 이 `users.businessInfo` JSONB 에 별도 저장되는지 검증 필요 (본 IR 범위 외 — 추정).
- 만약 그렇다면 `kpa_members.pharmacy_address` (합쳐진) 와 `users.businessInfo.zipCode/address/addressDetail` (분리된) 이 동일 회원에 대해 2-source 로 공존.

### 6-4. 표시 layer

#### 운영자 회원관리 Drawer
[MemberManagementPage.tsx:1408-1414](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1408-L1414):

```tsx
{selectedMember.pharmacy_address && (
  <div style={fieldRowStyle}>
    <span style={labelStyle}>
      {selectedMember.activity_type === 'pharmacy_owner' ? '사업장 주소' : '근무처 주소'}
    </span>
    <span style={valueStyle}>{selectedMember.pharmacy_address}</span>
  </div>
)}
```

→ 합쳐진 문자열 그대로 표시.

#### MyPage profile 표시
[mypage.service.ts:100](../../apps/api-server/src/routes/kpa/services/mypage.service.ts#L100):

```typescript
pharmacy: isPharmacyOwner ? {
  name: kpaMember?.pharmacy_name || null,
  address: kpaMember?.pharmacy_address || null,
} : null,
```

→ 단일 address 필드만 노출.

### 6-5. 정리

| Layer | 분리 입력 | 분리 저장 | 분리 표시 |
|---|---|---|---|
| 가입 모달 (근무약사) | ❌ 자유 텍스트 | ❌ | ❌ |
| 가입 모달 (개설약사) | ✅ AddressSearch 3-part | ❌ (`join(' ')` 합침) | ❌ |
| `kpa_members` 컬럼 | n/a | ❌ VARCHAR(300) 단일 | n/a |
| `users.businessInfo` JSONB | ✅ (가입 시 보존됐다면) | ✅ (JSONB 안에 분리 보존 가능) | ❌ (운영자 화면 미노출) |
| 운영자 편집 폼 | ❌ 자유 텍스트 input | ❌ | ❌ |
| MyPage 표시 | n/a | ❌ | ❌ |

→ **분리 인프라는 가입 모달의 개설약사 분기에만 부분적으로 존재** 하며, 저장/표시 layer 에서 모두 단일 문자열로 압축된다. 분리 저장으로 전환하려면 (a) `kpa_members` 에 컬럼 추가 (b) backfill (c) UI 4곳 (가입 모달 근무약사 분기, 운영자 편집 폼, MyPage 표시, 운영자 Drawer 표시) 모두 갱신 필요.

---

## 7. 발견된 drift / 결함 정리

| ID | 영역 | 결함 | 위치 | 영향도 |
|---|---|---|---|---|
| **F1** | 회수 | 정지/거부 시 `kpa:store_owner` 회수 누락 | [MembershipApprovalService.ts:392-405](../../apps/api-server/src/services/approval/MembershipApprovalService.ts#L392-L405) | **HIGH** — 보안/거버넌스 |
| **F2** | 복원 | 재활성화 시 store_owner 복원 누락 | [MembershipApprovalService.ts:517-531](../../apps/api-server/src/services/approval/MembershipApprovalService.ts#L517-L531) | **MED** — F1 과 부분 상쇄 |
| **F2'** | 탈퇴 | `withdrawMembership()` 도 동일 패턴 가능성 (verify 필요) | apps/api-server/src/services/approval/MembershipApprovalService.ts (withdrawMembership) | **HIGH (예상)** |
| F3 | 표시 | "매장 권한 없음" 의 5가지 원인을 구분 못 함 | [MemberManagementPage.tsx:1324-1326](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1324-L1326) | LOW — UX |
| **F4** | 부여 | 부여 진입점 3개 byte-equivalent — businessNumber source 다름 (organization 중복 가능) | [member.controller.ts:563-627](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L563-L627) / [member.controller.ts:1088-1140](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1088-L1140) / [pharmacy-request.controller.ts:200-241](../../apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L200-L241) | **MED** — audit trail 분산 + organization 중복 |
| F5a | 편집 폼 | `pharmacy_address` 초기값이 빈 문자열 (selectedMember 값 무시) | [MemberManagementPage.tsx:445](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L445) | MED — 운영자 인지 |
| F5b | 편집 폼 | `pharmacy_phone` 동일 + 응답에 필드 부재 (write-only) | [MemberManagementPage.tsx:447](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L447) / [member.controller.ts:333-382](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L333-L382) | MED |
| F5c | 편집 폼 | `pharmacy_address` 빈 값 저장 불가 (의도적 비우기 차단) | [MemberManagementPage.tsx:503](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L503) | LOW |
| F5d | 편집 폼 | activity_type 빈 문자열 변경 시 백엔드 400 | [MemberManagementPage.tsx:1274](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1274) / [member.controller.ts:918-921](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L918-L921) | LOW |
| **F6** | 주소 schema | zipCode/도로명/상세 분리 인프라 부재 — schema 결정 | [kpa-member.entity.ts:96-97](../../apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts#L96-L97) / [RegisterModal.tsx:229-233](../../services/web-kpa-society/src/components/RegisterModal.tsx#L229-L233) | MED — 행정 처리 / 운영자 UX |
| F7 | 응답 | zombie 필드 (`fee_category`, `sub_role`, `university_name`, `student_year`, `nickname`) frontend 미사용 | [member.controller.ts:367-379](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L367-L379) | LOW — dead field |
| F8 | 라우트 | pharmacy-requests 활성 — PATCH `/:id/info` 와 byte-equivalent (dual-path 정책 결정 필요) | [kpa.routes.ts:335](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L335) / 화면 2개 + API 1개 + 컨트롤러 1개 + entity 1개 | MED — 정책 결정 |
| F9 | 회수 비대칭 | pharmacy-requests 에는 revoke 엔드포인트 없음 — 부여만 가능 | pharmacy-request.controller.ts 라우트 inventory | LOW |
| F10 | 검색 | 운영자 검색 절에 `pharmacy_name` / `business_number` / `nickname` 없음 — 약국명/사업자번호로 회원 찾기 불가 (`u.name OR u.email OR u.nickname` 만) | [member.controller.ts:270-275](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L270-L275) | LOW — 검색 UX |

---

## 8. 후속 WO 후보 — 수정 필요 파일 + 위험도 분류 (조사 영역 6)

### 8-1. 우선순위 1 — 보안/거버넌스 결함 (HIGH)

#### WO 후보 1: 회원 정지/거부 시 `kpa:store_owner` 회수 (F1)
- **수정 파일**: [apps/api-server/src/services/approval/MembershipApprovalService.ts](../../apps/api-server/src/services/approval/MembershipApprovalService.ts) `suspendMembership()` STEP2
- **수정 내용**: kpa-society membership 이 포함된 경우, `kpa:store_owner` 와 같은 service-scoped capability role 도 명시적으로 deactivate. 후보 구현:
  ```typescript
  if (hasKpaSocietyMembership) {
    await queryRunner.query(
      `UPDATE role_assignments SET is_active = false ...
       WHERE user_id = $1 AND role = ANY($2::text[]) AND is_active = true`,
      [userId, ['kpa:store_owner']]  // 추가
    );
  }
  ```
- **사전 verify**: production 의 정지/거부 회원 중 `kpa:store_owner is_active=true` 잔존 row 개수 (§9 SQL).
- **위험도**: 수정 자체는 작음 (1-2개 row 추가). drift 잔존 row 청소 마이그레이션 별도 필요.

#### WO 후보 2: 재활성화 시 store_owner 복원 (F2)
- **수정 파일**: 동일 파일 `reactivateMembership()` STEP3
- **수정 내용**: 정지 시 deactivate 된 store_owner row 가 있으면 복원. 단, 정지 전 상태를 기억하지 않으면 "원래 store_owner 였는지" 모름 — `is_active=false` + `role='kpa:store_owner'` 의 가장 최근 row 를 복원 후보로 보거나, 별도 audit 테이블 필요.
- **결정 필요**: 단순 복원 vs activity_type 기반 재판정 (`kpa_pharmacist_profiles.activity_type='pharmacy_owner'` 일 때만 복원).

#### WO 후보 3: `withdrawMembership()` verify + 동일 결함 수정 (F2')
- **사전 verify**: withdrawMembership 의 STEP 구조 검증.
- **수정 내용**: F1 과 동일 패턴이라면 동일 fix 적용.

### 8-2. 우선순위 2 — 운영자 UX 결함 (MED)

#### WO 후보 4: 편집 폼 초기값 — pharmacy_address / pharmacy_phone (F5a, F5b)
- **수정 파일**: [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) `openMemberEdit` / `enterEditMode`
- **수정 내용**:
  - `pharmacy_address: selectedMember.pharmacy_address || ''` (현재 값 읽기)
  - `pharmacy_phone`: GET `/kpa/members` 응답에 `business_info.metadata.pharmacy_phone` 또는 `pharmacy_phone` 추가 → frontend interface 추가 → editForm 초기값 반영
- **위험도**: backend 응답 shape 추가 + frontend interface 추가 — 양쪽 동시 수정 필요. CI에서 lint 통과 확인.

#### WO 후보 5: 매장 권한 표시 분기화 (F3)
- **수정 파일**: [MemberManagementPage.tsx:1316-1328](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1316-L1328)
- **수정 내용**: 5가지 케이스를 chip + 설명 라벨로 분기:
  - "보유" (정상)
  - "보유 — 정지된 회원" (F1 잔존)
  - "없음 — 부여 보류 (사업자번호/약국명 누락)" (pharmacy_owner 인데 미부여)
  - "없음 — 비-개설약사" (정상)
  - "없음 — 회수됨" (직역 변경 이력)

### 8-3. 우선순위 3 — Dual-path 정책 결정 (정책 선행)

#### WO 후보 6: pharmacy-requests 워크플로우 정리 (F4, F8, F9)
- **정책 결정 선행**:
  - (A) Deprecate pharmacy-requests, PATCH `/info` 단일 경로로 통합 → migration 으로 pending 신청 강제 이관 → 라우트/엔티티/페이지 삭제
  - (B) pharmacy-requests 를 사용자 자가 신청 경로로만 유지, 운영자 직접 부여는 PATCH `/info` — 두 경로의 businessNumber source 통일 + audit trail 일원화
- **(A) 선택 시 수정 파일** (제거 대상):
  - [apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts](../../apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts)
  - [apps/api-server/src/routes/kpa/entities/kpa-pharmacy-request.entity.ts](../../apps/api-server/src/routes/kpa/entities/kpa-pharmacy-request.entity.ts)
  - [services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx](../../services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx)
  - [services/web-kpa-society/src/pages/operator/PharmacyRequestManagementPage.tsx](../../services/web-kpa-society/src/pages/operator/PharmacyRequestManagementPage.tsx)
  - [services/web-kpa-society/src/api/pharmacyRequestApi.ts](../../services/web-kpa-society/src/api/pharmacyRequestApi.ts)
  - [services/web-kpa-society/src/pages/pharmacy/sections/MyRequestsSection.tsx](../../services/web-kpa-society/src/pages/pharmacy/sections/MyRequestsSection.tsx)
  - Route 등록 line: [kpa.routes.ts:335](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L335), [OperatorRoutes.tsx:128](../../services/web-kpa-society/src/routes/OperatorRoutes.tsx#L128)
  - DB drop migration: `kpa_pharmacy_requests` 테이블 (down migration 필요)
- **(B) 선택 시 수정**: businessNumber source 일원화 + audit trail merge — 보다 복잡한 리팩토링

### 8-4. 우선순위 4 — Minor cleanup (LOW)

#### WO 후보 7: 응답 zombie 필드 제거 (F7)
- **수정 파일**: [member.controller.ts:367-379](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L367-L379)
- **수정 내용**: `fee_category`, `sub_role`, `university_name`, `student_year`, `kpa_status` 응답 제거 — frontend 사용처 grep 후 안전 확인.

#### WO 후보 8: 운영자 검색 항목 확장 (F10)
- **수정 파일**: [member.controller.ts:270-275](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L270-L275)
- **수정 내용**: `(u.name OR u.email OR u.nickname OR km.pharmacy_name OR u."businessInfo"->>'businessNumber')` ILIKE 확장.

### 8-5. 우선순위 별도 — 주소 분리 schema 결정 (F6)

- **정책 결정 선행**: KPA 회원 약국 주소를 zipCode/도로명/상세 분리로 저장할 필요가 있는가?
  - 행정 처리 (우편물 발송, 세금계산서) 측면: 분리 필요
  - 단순 표시 측면: 합쳐도 무방
- **결정 후 수정 범위**: schema 마이그레이션 + backfill + 가입 모달 근무약사 분기 + 운영자 편집 폼 + 표시 layer 4곳

---

## 9. Production verify SQL (운영자가 직접 실행)

> CLAUDE.md §0 의 read-only verification 가이드라인 준수. 본 IR 의 F1/F2 결함이 실제 production 에 drift 잔존 row 를 만들었는지 확인용.

```bash
gcloud sql connect o4o-platform-db --user=postgres --database=o4o_platform
```

```sql
-- (1) 정지/거부된 회원 중 kpa:store_owner active 잔존 — F1 drift
SELECT u.email, sm.status AS membership_status, ra.role, ra.is_active, ra.assigned_at
FROM service_memberships sm
JOIN users u ON u.id = sm.user_id
JOIN role_assignments ra ON ra.user_id = sm.user_id
WHERE sm.service_key = 'kpa-society'
  AND sm.status IN ('suspended', 'rejected', 'withdrawn')
  AND ra.role = 'kpa:store_owner'
  AND ra.is_active = true
ORDER BY u.email;
-- 결과 row 가 1개 이상이면 F1 drift 잔존 확정.

-- (2) pharmacy_owner 인데 store_owner 미보유 — 부여 보류 케이스 (F3 분기 분포)
SELECT u.email, km.pharmacy_name, 
       u."businessInfo"->>'businessNumber' AS biz_number,
       pp.activity_type AS pp_activity_type,
       km.activity_type AS km_activity_type,
       sm.status,
       EXISTS(
         SELECT 1 FROM role_assignments ra
         WHERE ra.user_id = u.id AND ra.role = 'kpa:store_owner' AND ra.is_active = true
       ) AS has_store_owner
FROM service_memberships sm
JOIN users u ON u.id = sm.user_id
LEFT JOIN kpa_members km ON km.user_id = sm.user_id
LEFT JOIN kpa_pharmacist_profiles pp ON pp.user_id = sm.user_id
WHERE sm.service_key = 'kpa-society'
  AND COALESCE(pp.activity_type, km.activity_type) = 'pharmacy_owner'
ORDER BY has_store_owner, u.email;
-- has_store_owner=false 인 row 가 부여 보류 또는 누락 케이스.

-- (3) kpa_pharmacy_requests 활성 사용 여부 — F8 정책 결정 시 기초 데이터
SELECT status, COUNT(*)::int AS cnt, 
       MIN(created_at) AS oldest, MAX(created_at) AS newest
FROM kpa_pharmacy_requests
GROUP BY status
ORDER BY status;

-- (4) Dual-path 충돌 — 같은 user 가 (a) PATCH /info 로 store_owner 부여받고 (b) pharmacy_request 도 approved 된 케이스 (organization 중복 risk)
SELECT u.email, COUNT(DISTINCT om.organization_id) AS owned_orgs,
       array_agg(DISTINCT o.code) AS org_codes
FROM users u
JOIN organization_members om ON om.user_id = u.id AND om.role = 'owner'
JOIN organizations o ON o.id = om.organization_id AND o.type = 'pharmacy'
GROUP BY u.email
HAVING COUNT(DISTINCT om.organization_id) > 1
ORDER BY u.email;
-- row 가 있으면 F4 drift 잔존 확정.

-- (5) pharmacy_address 컬럼의 zipCode 패턴 존재 — F6 의 합쳐진 상태 확인
SELECT 
  COUNT(*) FILTER (WHERE pharmacy_address ~ '^[0-9]{5}\s') AS starts_with_zipcode,
  COUNT(*) FILTER (WHERE pharmacy_address IS NOT NULL)    AS total_with_address,
  COUNT(*)                                                 AS total
FROM kpa_members;
-- starts_with_zipcode > 0 이면 RegisterModal 의 개설약사 분기 (zipCode prefix) 가 실제 데이터에 반영됨.
```

---

## 10. 본 IR 범위 외 (명시)

- DB 직접 SQL UPDATE / DELETE / 마이그레이션 / row backfill — §9 의 SELECT 만 권장.
- `withdrawMembership()` 의 store_owner 회수 verify — F2' 로 추정만 표기, 직접 코드 verify 필요.
- 주소 분리 schema 의 칼럼 추가 결정 — 본 IR 은 결함 식별만, schema 변경 결정은 별도 architecture 논의.
- pharmacy-requests dual-path 의 (A) 통합 vs (B) 분리 정책 결정 — 본 IR 은 옵션 정리만.
- `kpa_pharmacy_requests` 테이블의 production row 검증 — §9 SQL 로 운영자가 직접 실행.
- `users.businessInfo` JSONB 의 zipCode/address/addressDetail 분리 보존 여부 — `RegisterModal.tsx` 의 개설약사 분기에서 `users.businessInfo` 에 어떤 키로 저장하는지 verify 필요 (본 IR 미수행).
- `RoleAssignmentService` 의 `assignRole` 멱등성 detail (동일 user_id, 동일 role 의 동일 row 갱신 vs 신규 row insert) — pharmacy-requests dual-path 충돌 risk 의 정량 판단에 영향.
- 정지 후 복원 시 organization_members.owner row 의 회수/복원 여부 — 본 IR 은 role_assignments 만 추적.

---

## 11. 변경 사항 / 산출물

- 본 IR 작성 외 코드 / DB / 설정 변경 없음.
- `git status`: 작업 전 (untracked 6개) → 작업 후 (untracked 7개, 본 IR 1개 추가).
- 후속 WO 후보 8 개 식별 (§8) — 본 IR 은 어느 것도 실행하지 않는다.
- 자매 IR 과 결합: F1/F2 는 [IR-O4O-KPA-STOREOWNER-MISSING-ROLE-DRIFT-CHECK-V1](IR-O4O-KPA-STOREOWNER-MISSING-ROLE-DRIFT-CHECK-V1.md) 및 [IR-O4O-SERVICE-OPERATOR-ROLE-MEMBERSHIP-CONSISTENCY-AUDIT-V1](IR-O4O-SERVICE-OPERATOR-ROLE-MEMBERSHIP-CONSISTENCY-AUDIT-V1.md) 와 교차 참조 권장.

