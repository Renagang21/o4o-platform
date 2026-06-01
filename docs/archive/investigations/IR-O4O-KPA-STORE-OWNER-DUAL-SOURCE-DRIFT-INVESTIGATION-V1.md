---
id: IR-O4O-KPA-STORE-OWNER-DUAL-SOURCE-DRIFT-INVESTIGATION-V1
title: "KPA-Society 개설약사 store_owner 부재 — sohae21@naver.com 케이스 + dual-source drift 원인 확정"
status: investigation-complete
date: 2026-05-17
type: investigation
scope:
  - sohae21@naver.com 의 role_assignments / service_memberships / kpa_members / organizations 실측
  - 헤더 "내 약국 / 약국 운영 허브" 미노출의 진짜 원인
  - 운영자 화면 "추가 권한 = 매장 운영" vs 상세 모달 "store_owner 미보유" 의 dual-source 모순 원인
  - PATCH /:id/status pending→active 자동 부여 chain (5-step) 의 실제 실패 지점
  - canonical SSOT / dual-check / approval auto-grant / serializer 각 layer 의 drift 식별
  - 후속 수정의 canonical fix 방향 식별 (정책 결정 입력)
related:
  - IR-O4O-KPA-STOREOWNER-HEADER-MENU-VISIBILITY-AUDIT-V1 (header dual-check 정합 확인 — 이미 머지)
  - IR-O4O-KPA-STOREOWNER-MISSING-ROLE-DRIFT-CHECK-V1 (renagang21/sohae2100 backfill 분석 — 이미 처리)
  - IR-O4O-KPA-STORE-PERMISSION-ADDRESS-DRIFT-AUDIT-V1 (F1/F2 store_owner 회수 누락 — STEP2.5/STEP3.5 머지)
  - IR-O4O-KPA-MEMBER-ROLE-TYPE-CANONICAL-AUDIT-V1
canonical-references:
  - docs/architecture/USER-OPERATOR-FREEZE-V1.md (F11)
  - docs/baseline/USER-DOMAIN-SSOT-V1.md
  - docs/baseline/ROLE-POLICY-AND-GUARD-V1.md
  - docs/rbac/RBAC-CANONICAL-STATE-V1.md
  - docs/rbac/RBAC-ROLE-CATALOG-V1.md
  - docs/baseline/KPA-ROLE-MATRIX-V1.md
---

# IR-O4O-KPA-STORE-OWNER-DUAL-SOURCE-DRIFT-INVESTIGATION-V1

> **WO-O4O-KPA-STORE-OWNER-DUAL-SOURCE-DRIFT-INVESTIGATION-V1 의 조사 결과.**
> Read-only. 코드/DB/migration/role 수동부여 변경 없음. 사용 채널: 코드 정적 분석 + production read-only SQL + Cloud Run 로그 read.

---

## 0. Executive Summary

| 항목 | 값 |
|------|------|
| 대상 계정 | `sohae21@naver.com` (uuid `970b5b0e-8901-41b6-9f1c-93afd13ce58b`) |
| 가입 시각 | 2026-05-17 13:11:23 (조사 당일) |
| 승인 시각 | 2026-05-17 13:11:56 (33 초 후 operator 승인) |
| **진짜 원인** | **production `organizations` 테이블에 `parent_id` 컬럼 미존재 — 코드/스키마 drift. `ensureOrganization()` INSERT 실패 → store_owner 4-step chain 의 step1 (organization 생성) 에서 끊김.** |
| 결정적 증거 | Cloud Run 로그 (2026-05-17T13:11:56.798344Z): `QueryFailedError: column "parent_id" of relation "organizations" does not exist` |
| 실패 isolation | [member.controller.ts:650](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L650) try/catch — 자동활성화 실패는 console.error 만, 회원 승인 자체는 성공 처리 |
| dual-source 모순의 진실 | **모순 아님 — 운영자가 본 "추가 권한 = 매장 운영" 은 capability chip 이 아니라 [activity_type 옆 amber 배지 "개설약사"](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1377-L1381) 를 capability chip 으로 오인한 것**. capability chip 영역과 "매장 권한" row 는 동일 `selectedMember.capabilities` 를 source 로 하므로 코드 로직상 contradict 불가능 |
| Frontend 정합성 | header / HubGuard / PharmacyGuard / MobileBottomNav 모두 이미 canonical `isStoreOwnerDual` 사용 중 — drift 없음 |
| Backend 정합성 | `/auth/me` `/kpa/me-context` 모두 role_assignments 단일 source 로 isStoreOwner 도출 — drift 없음 |
| **수정 SSOT** | `role_assignments(kpa:store_owner, is_active=true)` — RBAC SSOT. activity_type 은 metadata, capability 아님 |
| 후속 fix 방향 | (P0) `organizations` 스키마 정합 (parent_id 컬럼 또는 코드 정리) — schema 결정 / (P1) `member.controller.ts:650` catch block 의 silent log → 운영자 응답 warning 반환 / (P2) sohae21 의 backfill (정책 결정 후) |
| 본 IR 범위 | 조사 완료. 코드/DB/migration/role 수동부여 변경 없음. commit/push 없음. |

**핵심 결론**:
1. 원인은 **단일 schema drift**. 부원인이나 다층 dual-source 문제 아님.
2. Header/Guard/Drawer 모든 frontend 가 동일 canonical source (`role_assignments` 기반 `isStoreOwnerDual`) 사용 중. 사용자 가설 "dual-source drift" 는 **반증**.
3. 운영자 화면의 "추가 권한 = 매장 운영" 관찰은 amber "개설약사" 배지 (activity_type 표지) 의 시각적 오인으로 추정.
4. 후속 WO 는 **frontend 가 아니라 backend 의 organizations 스키마 + member.controller catch block** 에 집중해야 함.

---

## 1. 조사 방법

### 1-1. 작업 디렉토리 / 브랜치
- 작업 디렉토리: `c:\Users\sohae\o4o-platform`
- 기준 브랜치: `main` (작업 시작 시 `git pull origin main` — Already up to date)
- working tree 상태: pre-existing untracked IR 7 개 (본 WO 와 무관, 사용자 명시)

### 1-2. 사용 채널
| 채널 | 용도 | 정책 |
|------|------|------|
| Glob/Grep/Read (정적 분석) | 코드 흐름 추적 | read-only |
| `gcloud sql instances patch` (1회) | authorized_networks 임시 추가 | CLAUDE.md §0 — 본 조사용 임시 |
| `psql -h 34.64.96.252 -U o4o_api -d o4o_platform -f <sql>` | production read-only SELECT 14 회 | UPDATE/DELETE/INSERT 없음 |
| `gcloud sql instances patch` (복원) | authorized_networks 원본 복원 | 작업 종료 즉시 |
| `gcloud logging read` | Cloud Run 에러 로그 read | read-only |
| Agent (Explore) 2 개 병렬 | isStoreOwnerDual / MembershipApprovalService 흐름 verify | read-only |

### 1-3. 자매 IR 와의 차별점
- IR-O4O-KPA-STOREOWNER-HEADER-MENU-VISIBILITY-AUDIT-V1 (canonical SSOT 분석) — 본 IR 의 STEP 3 영역, **동일 결론 재확인**
- IR-O4O-KPA-STOREOWNER-MISSING-ROLE-DRIFT-CHECK-V1 (renagang21/sohae2100 backfill 분석) — 본 IR 의 STEP 1 영역, **신규 케이스 sohae21@naver.com 추가**
- IR-O4O-KPA-STORE-PERMISSION-ADDRESS-DRIFT-AUDIT-V1 (F1/F2 회수 누락) — 본 IR 의 STEP 5 영역, **STEP2.5/STEP3.5 머지 후 회수 흐름 재확인**

본 IR 의 신규 기여: **production schema drift (organizations.parent_id 미존재) 확정** + **dual-source 모순의 시각적 오인 가설 제시**.

### 1-4. authorized_networks 변경 이력 (롤백 완료)
- 작업 전: `["124.194.156.36/32"]`
- 작업 중: `["124.194.156.36/32", "112.153.205.95/32"]` (임시 추가)
- 작업 후: `["124.194.156.36/32"]` (원복 — §11 참조)

---

## 2. STEP 1 — sohae21@naver.com 실제 상태 (production SELECT)

### 2-1. users 테이블 (Q1)

| 필드 | 값 |
|------|------|
| id | `970b5b0e-8901-41b6-9f1c-93afd13ce58b` |
| email | sohae21@naver.com |
| name | 서철환 |
| status | active |
| isActive | true |
| **isEmailVerified** | **false** ← 잠재 후속 영향 (본 케이스 직접 원인은 아님) |
| created_at | 2026-05-17 13:11:23.149025 |
| updated_at | 2026-05-17 13:11:23.149025 |
| businessInfo | `licenseNumber=25646, businessName="Rena 약국", businessNumber=1088602873, ceoName=서철환, zipCode=08295, address="서울 구로구 공원로 47", address2="304호", storeAddress={zipCode,baseAddress,detailAddress}` |

### 2-2. service_memberships (Q2)

| 필드 | 값 |
|------|------|
| id | `43af0f87-ec7d-41c0-b64c-b171bba41e50` |
| service_key | kpa-society |
| **role** | **`user`** ← canonical `member` 아님 (RBAC 매핑 누락 잠재) |
| status | active |
| approved_at | 2026-05-17 13:11:56.764329 |
| approved_by | `cfd2a5e7-db28-4842-bd5c-4814cba49ca5` (operator user_id) |
| rejection_reason | (null) |

### 2-3. role_assignments (Q3, Q11)

```
(0 rows — active 와 inactive 합쳐 0 행)
capabilities_active = (empty array)
all_roles_any_status = (empty array)
```

→ **role_assignments 전혀 없음**. `kpa:store_owner` 부재 + 다른 어떤 role 도 부재.

### 2-4. kpa_members (Q4)

| 필드 | 값 |
|------|------|
| id | `276e1908-4b8e-419d-a876-655bce35408c` |
| activity_type | pharmacy_owner |
| membership_type | pharmacist_member (legacy alias — IR-O4O-KPA-MEMBER-ROLE-TYPE-CANONICAL-AUDIT-V1 §) |
| status | active |
| license_number | 25646 |
| pharmacy_name | Rena 약국 |
| pharmacy_address | `"08295 서울 구로구 공원로 47 304호"` ← 단일 문자열로 join (F6 from prior IR 재확인) |
| **organization_id** | **(null)** ← step 2 실패의 증거 |
| created_at | 2026-05-17 13:11:23.149025 |
| updated_at | 2026-05-17 13:11:56.748675 ← 승인 시점 동기화 OK |

### 2-5. kpa_pharmacist_profiles (Q5)

| 필드 | 값 |
|------|------|
| activity_type | pharmacy_owner ✅ (km 와 동일 — drift 없음) |
| created_at / updated_at | 2026-05-17 13:11:23 |

### 2-6. organization_members (Q6)

```
(0 rows)
```

### 2-7. organizations (Q7)

```sql
WHERE code = 'kpa-pharm-1088602873'
→ (0 rows)
```

→ 기대된 organization `kpa-pharm-1088602873` **미생성**.

### 2-8. kpa_pharmacy_requests (Q8)

```
(0 rows — 별도 신청 워크플로우 미사용)
```

### 2-9. kpa_operator_audit_logs (Q9)

```
(0 rows for target_id = sohae21.user_id)
```

→ operator 화면의 audit 기록도 없음 (단, [member.controller.ts:691-701](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L691-L701) 의 audit 저장은 try/catch 로 best-effort. 실패 가능).

### 2-10. 5-step chain 상태 정리 (Q10)

| step | 항목 | 상태 | 참고 |
|---|---|:---:|---|
| step1 | `users.businessInfo.businessNumber=1088602873` | ✅ | digits 10자리 — 자동활성화 trigger 충족 |
| step2a | `kpa_members.activity_type=pharmacy_owner` | ✅ | trigger 조건 충족 |
| step2b | `kpa_pharmacist_profiles.activity_type=pharmacy_owner` | ✅ | km 와 일관 |
| step3 | `organizations(code=kpa-pharm-1088602873)` | ❌ | **chain 단절 지점** |
| step4 | `organization_members(role='owner', left_at IS NULL)` | ❌ | step3 실패의 cascade |
| step5 | `role_assignments(role='kpa:store_owner', is_active=true)` | ❌ | step3-4 실패의 cascade |

### 2-11. 모집단 비교 (Q12, Q13, Q14)

| 사용자 | activity_type | has_store_owner | inactive store_owner | total_role_rows |
|---|---|:---:|:---:|:---:|
| renagang21@gmail.com | pharmacy_owner | **✅** | f | 1 |
| sohae2100@gmail.com | pharmacy_owner | **✅** | f | 4 |
| **sohae21@naver.com** | **pharmacy_owner** | **❌** | **f** | **0** |

→ 자매 IR (IR-O4O-KPA-STOREOWNER-MISSING-ROLE-DRIFT-CHECK-V1, 2026-05-17 작성) 시점에 누락이었던 renagang21/sohae2100 은 **본 IR 작성 시점에 이미 backfill 완료**. **sohae21 은 backfill 이후 신규 가입자 — F2 재발생**.

| 항목 | 값 |
|---|:---:|
| total_users | 12 |
| users_with_zero_roles | 4 |
| users_with_at_least_one_role | 8 |
| service_memberships 가입자 중 role 0 인 user (kpa-society) | **1 (= sohae21)** |

→ **kpa-society 전체에서 role_assignments 가 0 인 사용자는 sohae21 단 1 명**. 매우 이례적 (다른 모든 kpa-society 회원은 최소 1 role 보유).

---

## 3. STEP 2 — auth/status 응답 source 코드 흐름

### 3-1. canonical 채널: `/auth/me` + `/kpa/me-context` (`/auth/status` 라는 별도 endpoint 없음 — verify 결과)

frontend 가 store_owner 판정에 사용하는 server-side 값 두 가지:

| 입력 | endpoint | 정의 | source |
|---|---|---|---|
| `user.roles` | `/auth/me` | `roleAssignmentService.getRoleNames(userId)` (60s 캐시 + invalidate 즉시 무효화) | **`role_assignments WHERE is_active=true`** |
| `user.isStoreOwner` | `/kpa/me-context` | `EXISTS(SELECT 1 FROM role_assignments WHERE role IN ('kpa:store_owner','glycopharm:store_owner','cosmetics:store_owner') AND is_active=true)` | **role_assignments 단일** |

세부 코드: [auth-account.controller.ts:28-44](../../apps/api-server/src/modules/auth/controllers/auth-account.controller.ts#L28-L44), [me-context.controller.ts:43-65](../../apps/api-server/src/routes/kpa/controllers/me-context.controller.ts#L43-L65).

### 3-2. sohae21 의 실제 응답 (예상)

| 응답 키 | 값 |
|---|---|
| `/auth/me` `roles` | `[]` (role_assignments 0 rows 의 caching 결과) |
| `/kpa/me-context` `isStoreOwner` | `false` (EXISTS subquery 0 rows) |
| `/kpa/me-context` `activityType` | `'pharmacy_owner'` (kpa_pharmacist_profiles 에서 채움) |

### 3-3. frontend 변환 결과

| 변수 | 계산 | 결과 |
|---|---|---|
| `user.roles` | `apiUser.roles \|\| [role]` ([AuthContext.tsx:223](../../services/web-kpa-society/src/contexts/AuthContext.tsx#L223)) | `[]` |
| `user.isStoreOwner` | Stage1: `!!apiUser.isStoreOwner` (= `false`, 미반환). Stage2: `!!ctx.isStoreOwner` ([AuthContext.tsx:266](../../services/web-kpa-society/src/contexts/AuthContext.tsx#L266)) | `false` |
| `user.activityType` | `ctx.activityType` ([AuthContext.tsx:265](../../services/web-kpa-society/src/contexts/AuthContext.tsx#L265)) | `'pharmacy_owner'` |

---

## 4. STEP 3 — isStoreOwnerDual 흐름 + 모든 사용처 (drift 없음 재확인)

### 4-1. helper 정의

[packages/auth-utils/src/isStoreOwnerDual.ts:28-34](../../packages/auth-utils/src/isStoreOwnerDual.ts#L28-L34):

```ts
export function isStoreOwnerDual(roles, storeOwnerRole, contextFlag) {
  return roles.includes(storeOwnerRole) || contextFlag === true;
}
```

### 4-2. 사용처 전수

| Layer | 파일 | line | predicate | drift |
|---|---|:---:|---|:---:|
| Header nav + dropdown | `KpaGlobalHeader.tsx` | 97 | `isStoreOwnerDual(user?.roles ?? [], 'kpa:store_owner', user?.isStoreOwner)` | ✅ |
| /store 가드 | `PharmacyGuard.tsx` | 38 | `isStoreOwnerDual(user.roles, 'kpa:store_owner', user.isStoreOwner)` | ✅ |
| /store-hub 가드 | `HubGuard.tsx` | 43 | `isStoreOwnerDual(user.roles, ROLES.KPA_STORE_OWNER, user.isStoreOwner)` | ✅ |
| PharmacyPage gate | `PharmacyPage.tsx` | 31 | 동일 | ✅ |
| PharmacyApprovalGatePage | `PharmacyApprovalGatePage.tsx` | 114 (+ 119 activity_type metadata 분기) | 동일 + activity_type 분기 | ✅ (activity_type 은 display only) |
| Post-login redirect | `config/dashboard.ts` | 59 | `user.isStoreOwner` 직접 | ✅ (단일 source 단순 우선) |
| 모바일 하단 nav | `MobileBottomNav.tsx` | 89-96 | (gating 없음 — 항상 표시. /mobile/pharmacy 경로에서 PharmacyGuard 차단) | ✅ |
| Cross-service (Glyco) | `GlycoGlobalHeader.tsx` | 68 | `isStoreOwnerDual(user?.roles ?? [], 'glycopharm:store_owner')` | ✅ |
| Cross-service (Cosmetics) | `KCosGlobalHeader.tsx` | 63 | `isStoreOwnerDual(user?.roles ?? [], 'cosmetics:store_owner')` | ✅ |

### 4-3. 사용자 가설 "Header 가 단일 user.roles check" — **반증**

자매 IR (IR-O4O-KPA-STOREOWNER-HEADER-MENU-VISIBILITY-AUDIT-V1, 2026-05-17) 의 동일 결론 재확인. **모든 visibility gate 가 canonical dual-check 사용 중이며, 두 입력 모두 동일 `role_assignments` source 로 환원**.

### 4-4. activity_type 직접 사용처

- `PharmacyApprovalGatePage.tsx:119` — display/metadata 분기 (가드 이후)
- `MemberManagementPage.tsx:1377-1381` — operator 화면 **"개설약사" amber 배지** (display only)
- `mypage.service.ts` — pharmacy 정보 표시 분기
- (어떤 곳도 권한 gate 로 사용하지 않음)

---

## 5. STEP 4 — 운영자 상세 모달 dual-source 모순의 진실

### 5-1. 코드상 두 표시는 동일 source

[MemberManagementPage.tsx:1180](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1180) — "매장 권한" row:
```typescript
const hasStoreOwnerCap = (selectedMember.capabilities ?? []).includes('kpa:store_owner');
```

[MemberManagementPage.tsx:1533](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1533) — "추가 권한" chip:
```typescript
const caps = sortCapabilities(selectedMember.capabilities ?? []);
```

[MemberManagementPage.tsx:819](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L819) — 목록 "추가 권한" 컬럼:
```typescript
const caps = sortCapabilities(m.capabilities ?? []);
```

→ **동일 `capabilities` 배열**. `selectedMember` 는 `setSelectedMember(m)` ([:448](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L448), [:1065](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1065)) 로 list row 와 동일 객체 + `useEffect` ([:598-604](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L598-L604)) 로 members 갱신 시 sync. **JavaScript memory 상 동일 배열이므로 `.includes('kpa:store_owner')` 가 서로 다른 답을 줄 수 없음**.

### 5-2. capabilities API source 확인

[member.controller.ts:419-431](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L419-L431):
```typescript
const raRows = await dataSource.query(
  `SELECT user_id, role FROM role_assignments
   WHERE user_id = ANY($1::uuid[]) AND is_active = true`,
  [userIds],
);
// ...
for (const m of members) {
  (m as any).capabilities = capabilityMap.get(m.user_id) ?? [];
}
```

→ **`role_assignments WHERE is_active=true` 단일 source**. activity_type / membership.role / organization_members.role 등 다른 source 와 union 없음.

### 5-3. 운영자가 본 표시의 진짜 정체

sohae21 의 capabilities 는 **빈 배열** (`[]`) — Q11 로 확정.
→ list 의 "추가 권한" 컬럼 = "—" (line 821)
→ Drawer 의 "추가 권한" = "—" (line 1534)
→ Drawer 의 "매장 권한" = "store_owner 미보유" (line 1397)

운영자가 "추가 권한 = 매장 운영 표시" 라고 본 것은 시각적 오인 — **유력 후보**:

[MemberManagementPage.tsx:1377-1381](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1377-L1381):
```tsx
{selectedMember.activity_type === 'pharmacy_owner' && (
  <span style={{
    marginLeft: 6, fontSize: 11, padding: '1px 6px', borderRadius: 9999,
    background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a'
  }}>
    개설약사
  </span>
)}
```

→ "직역" row 의 "약국 개설자" 텍스트 옆에 amber color **chip 형태의 "개설약사" 배지**. 시각적으로 capability chip 영역의 chip 과 매우 유사. operator UX 측면에서 혼동 가능.

### 5-4. 결론

**dual-source 모순은 존재하지 않는다 — 동일 source 의 동일 데이터를 다른 위치에서 표시할 뿐**. 사용자가 관찰한 contradict 는 UX 적 시각 오인. 단, 운영자 혼동 방지 측면에서 "개설약사" amber 배지의 라벨/색상/위치 재검토는 후속 UX WO 후보.

---

## 6. STEP 5 — auto-grant 흐름 + 실제 실패 지점

### 6-1. operator PATCH `/:id/status` 의 실제 코드 path

[member.controller.ts:452-657](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L452-L657).

**중요 발견**: 운영자 PATCH `/:id/status` (pending→active) 는 **`MembershipApprovalService.approveMembership()` 를 호출하지 않는다**. 주석 ([line 522-529](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L522-L529)):

> STEP3 role_assignments 부여가 KPA 'profile 기반 RBAC role 최소화' 정책 (WO-KPA-A-ROLE-CLEANUP-V1) 과 충돌하지 않게 분리. **approveMembership() 전체 호출 대신 inline UPDATE 만 추가**

→ 의도된 분기. `kpa:member` / `kpa:user` 같은 base role 은 role_assignments 에 의도적으로 넣지 않음. 따라서 일반 회원의 role_assignments 가 빈 배열인 것은 **정상**.

승인 처리 chain:
1. UPDATE users status='active' ([:498-503](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L498-L503))
2. INSERT kpa_pharmacist_profiles (pharmacist 의 경우) ([:515-520](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L515-L520))
3. UPDATE service_memberships status='active' inline ([:531-536](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L531-L536))
4. (별도 try block, [:593-657](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L593-L657)) — `activity_type='pharmacy_owner'` 인 경우 store_owner 자동 부여 4-step chain

### 6-2. store_owner 자동 부여 4-step chain ([:618-649](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L618-L649))

```typescript
// 1) organizations ensure
const orgResult = await organizationOpsService.ensureOrganization({
  name: pharmacyName,
  code: orgCode,           // 'kpa-pharm-1088602873'
  type: 'pharmacy',
  createdByUserId: member.user_id,
});

// 2) kpa_members.organization_id
await dataSource.query(`UPDATE kpa_members SET organization_id = $1 WHERE ...`);

// 3) organization_members(owner)
await organizationOpsService.addMember({ ... role: 'owner' });

// 4) role_assignments(kpa:store_owner)
await roleAssignmentService.assignRole({ ... role: 'kpa:store_owner' });
```

### 6-3. 실패 isolation ([:650-656](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L650-L656))

```typescript
} catch (autoActivationError) {
  // 회원 승인 자체는 성공시킴 — 운영자가 legacy pharmacy_request 흐름으로 복구 가능
  console.error(
    `[KPA Approval] pharmacy_owner auto-activation failed for member ${member.id}:`,
    autoActivationError
  );
}
```

→ **silent catch**. 운영자 응답에 warning 포함 없음. Operator UI 는 "승인 성공" 으로만 표시.

### 6-4. **sohae21 케이스의 실제 예외 (production Cloud Run log)**

```
2026-05-17T13:11:56.798344Z
[KPA Approval] pharmacy_owner auto-activation failed for member
276e1908-4b8e-419d-a876-655bce35408c:
QueryFailedError: column "parent_id" of relation "organizations" does not exist

2026-05-17T13:11:56.773065Z (parameters)
RETURNING id, (xmax = 0) AS created
PARAMETERS: ["Rena 약국","kpa-pharm-1088602873","pharmacy","{}",null,
            "970b5b0e-8901-41b6-9f1c-93afd13ce58b",true]
```

→ `ensureOrganization()` 가 INSERT 시 `parent_id` 컬럼을 사용하나 **production `organizations` 테이블에 해당 컬럼 미존재**. step1 실패 → catch → silent. step2-4 (kpa_members UPDATE, organization_members, role_assignments) 모두 미수행.

### 6-5. entity / migration 정합 (작업 디렉토리 확인)

| 항목 | 결과 |
|---|---|
| 코드상 entity (`organization-store.entity.ts:43-97`) | `@Column parentId: string \| null` + `@JoinColumn({ name: 'parentId' })` — camelCase quoted |
| Cloud Run 실제 에러 컬럼명 | `parent_id` (snake_case) — TypeORM SnakeNamingStrategy 또는 service 의 raw SQL 가 snake_case 사용 추정 |
| migration grep (`organization*.ts`) | `BackfillKpaOrgsToOrganizations`, `SeedKpaOrganizationsFullHierarchy` 만 발견 — **parent_id 컬럼 추가 마이그레이션은 미발견** (혹은 다른 entity 의 마이그레이션) |

→ **production schema 와 코드의 컬럼 정합 drift**. 본 IR 은 schema 변경 결정하지 않음. 후속 WO 에서 ① column 추가 (parent_id 또는 parentId) ② 코드의 parent_id 사용 제거 중 결정 필요.

### 6-6. 자매 IR 의 F1/F2 (회수 누락) 현재 상태 verify

| 결함 | 자매 IR 보고 | 현재 main HEAD verify | 결과 |
|---|---|---|---|
| F1: suspend 시 store_owner 미회수 | IR-O4O-KPA-STORE-PERMISSION-ADDRESS-DRIFT-AUDIT-V1 §3-2 | `MembershipApprovalService.suspendMembership()` STEP2.5 (line 407-426) 추가 확인 | ✅ FIXED |
| F2: reactivate 시 store_owner 미복원 | 동일 IR §3-2 | `reactivateMembership()` STEP3.5 (line 553-579) 추가 확인 — 단, activity_type='pharmacy_owner' 조건부 | ✅ FIXED (조건부) |
| **F1_REGRESSION: reject 시 store_owner 미회수** | (본 IR 신규 식별) | `rejectMembership()` (line 268-331) — 단일 statement UPDATE, role cleanup 없음 | ❌ OPEN |
| **F2_REGRESSION: withdraw 시 store_owner 미회수** | (본 IR 신규 식별) | `withdrawMembership()` STEP2 (line 691-709) — `LIKE '${prefix}%'` 패턴 사용 (prefix='kpa:'). 이론상 `kpa:store_owner` 매칭되어야 하나, agent 가 매칭 안 된다고 보고. **직접 verify 필요** (본 IR 범위 외) | ⚠️ 추가 verify |

---

## 7. STEP 6 — legacy drift (membership_type, role='user')

### 7-1. sohae21 의 legacy alias

| 필드 | 값 | canonical |
|---|---|---|
| `service_memberships.role` | `user` | canonical 매트릭스 없음 — `member` / `operator` / `admin` 표준값 외 |
| `kpa_members.membership_type` | `pharmacist_member` | canonical: `pharmacist` (legacy alias) |
| `kpa_members.activity_type` | `pharmacy_owner` | ✅ canonical |

→ `service_memberships.role='user'` 는 가입 모달의 어떤 분기가 작성한 값인지 verify 필요. canonical 정책 ([apps/api-server/src/services/approval/MembershipApprovalService.ts:213-216](../../apps/api-server/src/services/approval/MembershipApprovalService.ts#L213-L216)) 에는 `smRole === 'user'` 의 분기가 있어 `derivedMembershipType = 'pharmacy_student_member'` 로 변환. 즉 코드상 `'user'` 는 student 의도로 해석되나, sohae21 은 pharmacy_owner 이므로 의도 mismatch.

### 7-2. 본 케이스 직접 영향 여부

- store_owner 부여는 `activity_type='pharmacy_owner'` 단일 조건 ([member.controller.ts:596](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L596)) — `membership.role` 무관
- 따라서 `role='user'` 가 store_owner 미부여의 직접 원인은 아님
- 다만 long-term canonical 정합 측면에서 `role='user'` 는 정리 대상 (별건 WO)

### 7-3. pp vs km activity_type drift 없음

Q1 에서 양쪽 모두 `'pharmacy_owner'` 로 일치. 자매 IR 의 분류 (pp ≠ km mismatch 0 명) 와 일관.

---

## 8. STEP 7 — 최종 정리

### 8-1. 실제 SSOT

| 항목 | SSOT |
|---|---|
| RBAC capability | **`role_assignments WHERE is_active = true`** |
| 사용자 인적사항 | `users` 테이블 + `users.businessInfo` JSONB |
| KPA membership 상태 | `service_memberships(service_key='kpa-society')` |
| KPA domain profile | `kpa_members` + `kpa_pharmacist_profiles` (activity_type SSOT 는 `kpa_pharmacist_profiles` 우선, kpa_members 가 mirror) |
| Pharmacy organization 연결 | `organizations(code='kpa-pharm-{bizno}')` + `organization_members(role='owner')` |

### 8-2. 현재 판정 source 수

- **frontend visibility (header/guard)**: 1개 — `isStoreOwnerDual(user.roles, 'kpa:store_owner', user.isStoreOwner)`. 두 입력 모두 server-side 에서 **동일 `role_assignments` 단일 source 로 환원**.
- **operator drawer (capability chip)**: 1개 — `selectedMember.capabilities` ← `role_assignments WHERE is_active=true`.
- **operator drawer (직역 amber 배지)**: 별개 — `selectedMember.activity_type` ← `kpa_members.activity_type` (display only, 권한 gate 아님).

→ **canonical 1개 + display 1개**. 의미상 dual-source 아님.

### 8-3. canonical 흐름과 어긋난 부분

| # | 어긋남 | 위치 | 본 IR 의 판정 |
|---|---|---|---|
| D1 | **production `organizations.parent_id` 컬럼 미존재 (schema↔코드 drift)** | `apps/api-server/src/modules/store-core/entities/organization-store.entity.ts:43-97` ↔ production DB | **P0 — 본 케이스의 root cause** |
| D2 | `member.controller.ts:650` silent catch — 운영자 응답에 warning 미반환 | [member.controller.ts:650-656](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L650-L656) | **P1 — 운영자 인지 불가의 원인** |
| D3 | reject 시 store_owner 미회수 (F1_REGRESSION) | [MembershipApprovalService.ts:268-331](../../apps/api-server/src/services/approval/MembershipApprovalService.ts#L268-L331) | P1 — 본 케이스와 무관, 별건 |
| D4 | withdraw 시 store_owner 회수 verify 필요 (F2_REGRESSION) | [MembershipApprovalService.ts:691-709](../../apps/api-server/src/services/approval/MembershipApprovalService.ts#L691-L709) | P2 — 별건 verify |
| D5 | `service_memberships.role='user'` (canonical 외) | DB row (sohae21) | P2 — 가입 폼 origin verify 필요 |
| D6 | operator drawer "개설약사" amber 배지의 시각적 chip 화 (capability chip 으로 오인 가능) | [MemberManagementPage.tsx:1377-1381](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1377-L1381) | P3 — UX 개선 |

### 8-4. 진단 카테고리 분류 (WO 의 STEP 7 요청 형식)

| # | 카테고리 | 본 케이스 적용 |
|---|---|---|
| 1 | **데이터 drift** | ❌ — kpa_members/pp/sm 모두 정합 (activity_type 일관, biz info 완전) |
| 2 | **serializer 문제** | ❌ — capabilities = role_assignments 단일 source, 가공 없음 |
| 3 | **frontend helper 문제** | ❌ — isStoreOwnerDual / capability chip 모두 canonical 정합 |
| 4 | **approval auto-grant 문제** | ✅ **PRIMARY** — `ensureOrganization()` 가 production 스키마와 불일치 (parent_id 컬럼). silent catch 로 인해 운영자 인지 불가 |
| 5 | (Schema drift 별도 분리) | ✅ — D1 (organizations.parent_id) |
| 6 | (Observability 별도 분리) | ✅ — D2 (silent catch) |

### 8-5. 수정 시 가장 안전한 canonical fix 방향

**Phase 1 — Schema 정합 (P0, 본 케이스 직접 해결)**
- 옵션 A: production `organizations` 테이블에 `parent_id` (또는 `parentId`) 컬럼 추가 — 마이그레이션 작성
- 옵션 B: `ensureOrganization()` / OrganizationOpsService 의 INSERT 에서 `parent_id` 컬럼 사용 제거 — 코드 단순화 + entity 의 `parentId` 필드 제거 검토
- **결정 입력 필요**: organizations 의 hierarchical 모델 사용 여부

**Phase 2 — Observability (P1, 운영자 인지 회복)**
- [member.controller.ts:650-656](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L650-L656) silent catch → `warnings[]` 응답 + audit log 기록
- pattern: PATCH `/:id/info` 의 grant 흐름과 동일하게 정렬 (이미 warnings 반환)

**Phase 3 — sohae21 backfill (Phase 1 후)**
- Phase 1 fix 후, 운영자가 PATCH `/:id/info` (activity_type 동일 값 재저장) 로 재트리거 — 또는 별도 backfill 마이그레이션
- 본 IR 은 manual SQL UPDATE 또는 role 수동 부여 권장하지 않음

**Phase 4 — 별건 (본 케이스 무관)**
- D3/D4 reject/withdraw store_owner 회수 — 별건 WO
- D5 `role='user'` canonical 정리 — 별건 WO
- D6 "개설약사" amber 배지 UX — 별건 UX WO

---

## 9. 후속 WO 후보 (수정 파일 + 위험도)

### 9-1. WO 후보 1 — Schema 정합 (P0)

**WO-O4O-KPA-ORGANIZATIONS-PARENTID-SCHEMA-ALIGNMENT-V1**

- **수정 파일 후보 (옵션 A)**:
  - 신규 마이그레이션 `apps/api-server/src/database/migrations/{timestamp}-AddParentIdToOrganizations.ts`
  - `ALTER TABLE organizations ADD COLUMN parent_id UUID NULL REFERENCES organizations(id);`
- **수정 파일 후보 (옵션 B)**:
  - `apps/api-server/src/modules/store-core/entities/organization-store.entity.ts:43-97` parentId 필드/관계 제거
  - `apps/api-server/src/services/organizationOpsService.ts` (ensureOrganization 의 INSERT 에서 parent_id 컬럼 제거)
- **위험도**: 옵션 A 안전 (additive). 옵션 B 는 hierarchy 모델 의존 코드 영향 평가 필요
- **사전 verify**: `grep -r parent_id` 전수, `grep -r parentId` 전수, organizations 사용 코드 inventory

### 9-2. WO 후보 2 — silent catch 응답 warning (P1)

**WO-O4O-KPA-AUTO-ACTIVATION-WARNING-RESPONSE-V1**

- **수정 파일**: [apps/api-server/src/routes/kpa/controllers/member.controller.ts:650-656](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L650-L656)
- **수정 내용**: 
  - try block 외부에 `warnings: string[] = []` 선언
  - catch 에서 `warnings.push('매장 운영 권한 자동 부여 실패: ' + error.message.slice(0, 200))`
  - response 에 warnings 포함 (PATCH `/:id/info` 의 패턴과 정렬)
- **위험도**: 작음 (응답 구조에 optional 필드 추가). frontend 의 toast 처리만 동일 패턴으로 정렬 필요

### 9-3. WO 후보 3 — sohae21 backfill (Phase 1 완료 후)

**WO-O4O-KPA-SOHAE21-STORE-OWNER-BACKFILL-V1**

- **사전 조건**: WO 후보 1 완료 + production 배포
- **방법**: Phase 1 후, 운영자가 sohae21 의 정보 수정 (PATCH `/info` 의 activity_type='pharmacy_owner' 재저장으로 trigger) — 또는 별도 backfill 마이그레이션
- **위험도**: 작음 (sohae21 1 명) — 단, 동일 시점 가입한 다른 pharmacy_owner 가 있을 가능성 verify 필요 (Q14 결과로 kpa-society 내 다른 누락자 없음 확인됨)

### 9-4. WO 후보 4-6 (별건)

- **WO-O4O-MEMBERSHIP-REJECT-WITHDRAW-STORE-OWNER-CLEANUP-V1** — D3/D4 (P1)
- **WO-O4O-KPA-SERVICE-MEMBERSHIP-ROLE-USER-CANONICAL-ALIGNMENT-V1** — D5 (P2)
- **WO-O4O-KPA-OPERATOR-ACTIVITY-TYPE-BADGE-UX-V1** — D6 (P3)

---

## 10. 본 IR 의 범위 외

- DB UPDATE / DELETE / INSERT — 본 IR 은 read-only.
- migration 작성 — Phase 1 WO.
- 코드 수정 — 모든 fix 는 후속 WO.
- sohae21 의 role 수동 부여 — 본 IR 은 권장하지 않음 (Phase 1 schema fix 가 root 해결).
- `withdrawMembership()` 의 `LIKE 'kpa:%'` 패턴이 `kpa:store_owner` 를 실제로 매칭하는지 verify — 별건 (agent 보고 의심 — 직접 verify 필요).
- `service_memberships.role='user'` 가 가입 폼의 어느 분기에서 작성되는지 origin verify — 별건.
- `users.isEmailVerified=false` 가 다른 기능 (이메일 인증 게이트) 에 영향을 미치는지 verify — 별건.
- BackfillStoreOwnerRoles 마이그레이션의 production 실행 시점 + 영향 회원 verify — 별건.

---

## 11. 변경 사항 / 흔적 / 복원

### 11-1. GCP 변경 (모두 복원됨)
- `gcloud sql instances patch o4o-platform-db --authorized-networks=124.194.156.36/32,112.153.205.95/32` (작업 시작)
- `gcloud sql instances patch o4o-platform-db --authorized-networks=124.194.156.36/32` (작업 종료 — **원본 복원 완료**, 본 IR §0 표 확인)

### 11-2. 로컬 임시 파일 (repo 미포함)
- `/c/tmp/sohae21-storeowner-investigation.sql` (Q1-Q11 SQL)
- `/c/tmp/sohae21-storeowner-investigation-fix.sql` (Q2-fix, Q4-fix, Q7-fix, Q8-fix, Q12-Q14)
- `/c/tmp/sohae21-storeowner-out.txt` (전체 출력)

### 11-3. Git 변경
- 코드 / 마이그레이션 / 설정 변경 없음
- 본 IR 1 개 추가 (`docs/investigations/IR-O4O-KPA-STORE-OWNER-DUAL-SOURCE-DRIFT-INVESTIGATION-V1.md`)
- commit / push 없음 (조사 WO 정책)

### 11-4. SQL read-only verify 수행 (14 회)
- Q1: users
- Q2 + Q2-fix: service_memberships (columns + actual rows)
- Q3: role_assignments (all)
- Q4 + Q4-fix: kpa_members
- Q5: kpa_pharmacist_profiles
- Q6: organization_members
- Q7 + Q7-fix: organizations
- Q8 + Q8-fix: kpa_pharmacy_requests (columns + actual rows)
- Q9: kpa_operator_audit_logs
- Q10: 5-step chain combined
- Q11: capabilities derivation (member.controller.ts:382-398 와 동일 query)
- Q12: 다른 pharmacy_owner 들의 store_owner 보유율 (모집단 비교)
- Q13: 전체 user 의 role 인구 분포
- Q14: service_memberships 가입자 중 role 0 인 사용자 (service 별)

### 11-5. Cloud Run 로그 read (1 회)
- filter: textPayload contains "KPA Approval" OR "pharmacy_owner auto-activation" OR sohae21.user_id
- 결과: **`column "parent_id" of relation "organizations" does not exist`** 캡처 — root cause 확정

---

## 12. 핵심 질문 답변 (WO 의 STEP 7 요청 형식)

| # | 질문 | 답 |
|---|---|---|
| 1 | 실제 SSOT 는 무엇인가? | `role_assignments WHERE is_active = true` (RBAC capability) + `kpa_pharmacist_profiles.activity_type` (직역 metadata) |
| 2 | 현재 판정 source 가 몇 개 존재하는가? | canonical 1개 (role_assignments) — frontend dual-check 의 두 입력 모두 결국 동일 source 로 환원 |
| 3 | canonical 흐름과 어긋난 부분? | **production `organizations.parent_id` 컬럼 미존재** (코드↔스키마 drift) + auto-activation catch block 의 silent log |
| 4 | 데이터 drift 문제인가? | ❌ — kpa_members/pp/sm 모두 일관, biz info 완전 |
| 5 | serializer 문제인가? | ❌ — capabilities = role_assignments 단일 source |
| 6 | frontend helper 문제인가? | ❌ — 모든 visibility gate 가 canonical isStoreOwnerDual 사용 (자매 IR 결론 재확인) |
| 7 | approval auto-grant 문제인가? | ✅ **PRIMARY** — schema drift 가 `ensureOrganization()` step1 에서 chain 단절. silent catch 로 운영자 인지 불가 |
| 8 | 수정 시 가장 안전한 canonical fix 방향? | (1) organizations 스키마/코드 정합 → (2) silent catch 의 응답 warning 추가 → (3) sohae21 의 정보 재저장으로 trigger 재실행 |

---

## 13. 최종 결론

1. **헤더 미노출은 100% 정상 동작**. role_assignments 가 비어있는 사용자에게 store_owner 메뉴를 보여줄 canonical 경로는 없다.
2. **dual-source drift 는 존재하지 않는다**. 운영자가 본 "추가 권한 = 매장 운영" 은 capability chip 이 아니라 amber "개설약사" 배지의 시각적 오인 가설이 가장 유력.
3. **진짜 원인은 단일 schema drift** — `organizations.parent_id` 컬럼 미존재. Cloud Run 로그 1 줄로 확정.
4. silent catch block ([member.controller.ts:650](../../apps/api-server/src/routes/kpa/controllers/member.controller.ts#L650)) 이 root cause 의 인지를 차단했다. 운영자에게 warning 반환되었다면 즉시 문제 식별 가능했을 것.
5. 자매 IR (renagang21/sohae2100) 의 backfill 은 완료되어 있으며, **sohae21 은 backfill 이후 신규 가입한 유일한 누락 케이스**.
6. **후속 작업은 frontend 가 아니라 backend** — Phase 1 (schema 정합) → Phase 2 (silent catch → warnings) → Phase 3 (sohae21 backfill or 재트리거).

---

*Status: Investigation Complete. Read-only verification + Cloud Run log read only.*
*No code / DB / migration / role changes. No commit / push.*
*Updated: 2026-05-17*
*Version: 1.0*
