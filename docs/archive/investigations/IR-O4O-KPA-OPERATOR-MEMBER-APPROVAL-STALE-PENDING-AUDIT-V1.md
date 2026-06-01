# IR-O4O-KPA-OPERATOR-MEMBER-APPROVAL-STALE-PENDING-AUDIT-V1

**작성일**: 2026-05-16
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**대상**:
- `https://kpa-society.co.kr/operator/members`
- 승인대기 탭에서 회원 승인 후에도 목록·카운트가 계속 승인대기로 남는 증상

**연관 IR**:
- `docs/investigations/IR-O4O-KPA-ADMIN-MEMBER-COUNT-WITHDRAWN-AUDIT-V1.md` (withdrawn 미스매치 — 동일 root cause 가족)
- 선행 정렬: `WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1` (commit `65cec0455`)

---

## 0. 결론 요약

3개 가설(승인 API 실패 / refetch 실패 / SM 동기화 누락) 중 **#1 (`service_memberships.status` 동기화 누락)** 이 확정 원인. 다른 2개는 정상 동작.

| 가설 | 결과 |
|---|---|
| ❌ 승인 API 실패 | API 200 성공 — `users.status='active'` + `kpa_members.status='active'` + `kpa_member_services.status='approved'` + 알림 발송 모두 동작 |
| ❌ refetch 실패 | `handleStatusChange()` 가 `await apiClient.patch(...)` 직후 `await fetchMembers(memberPage)` 호출 — refetch 정상 |
| ✅ **SM 동기화 누락** | PATCH 의 `pending→active` 분기가 `service_memberships.status` 를 업데이트하지 않음 → sm.status='pending' 그대로 → GET /members?status=pending 에 계속 매칭 |

이는 IR-O4O-KPA-ADMIN-MEMBER-COUNT-WITHDRAWN-AUDIT-V1 가 발견한 contract drift 의 **mirror image**:
- withdrawn 케이스: backend가 sm 을 `'inactive'`(legacy)/`'withdrawn'` 으로 업데이트하지만 frontend는 sm filter — 정렬 후 정상
- **active 승인 케이스**: backend가 sm을 **전혀 업데이트하지 않음** — 동일 root cause 가족, 누락 사례

**핵심 contract drift**: `PATCH /:id/status` 의 4개 분기 중 **승인(`pending→active`) 만 `MembershipApprovalService`를 호출하지 않고 inline raw SQL로 처리**. 그 결과 `service_memberships` 만 동기화 누락.

---

## 1. 화면 동작 사실관계

### 1.1 운영자 승인 동작 (관찰된 흐름)

1. 운영자가 승인대기 탭에서 회원의 "승인" 버튼 클릭 (row action 또는 Drawer footer)
2. Frontend `handleStatusChange(memberId, 'active')` 호출 → `apiClient.patch('/members/${id}/status', { status: 'active' })`
3. API 응답 200 성공 (backend `kpa_members.status='active'` 변경 완료)
4. Frontend `await fetchMembers(memberPage)` → GET /kpa/members?status=pending&...
5. **응답 결과**: 방금 승인한 회원이 여전히 목록에 포함됨 (sm.status='pending' 그대로이므로 필터에 매칭)
6. **승인대기 카운트 badge**: lifecycle count 계산도 `sm.status='pending'` 기준 → 동일 회원 1건 카운트 유지

→ 외관상 "승인이 안 됐다" 로 보이지만 실제로는 부분 동기화: `kpa_members` / `users` / `role_assignments` / `kpa_member_services` 는 변경, **`service_memberships` 만 미변경**.

---

## 2. 관련 API 흐름

### 2.1 Frontend → Backend

**파일**: [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx:378-387](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L378-L387)

```typescript
async function handleStatusChange(memberId: string, newStatus: MemberStatus) {
  setActionLoading(memberId);
  try {
    await apiClient.patch(`/members/${memberId}/status`, { status: newStatus });
    await fetchMembers(memberPage);
  } catch (e: any) {
    toast.error(e.message || '상태 변경에 실패했습니다.');
  } finally {
    setActionLoading(null);
  }
}
```

호출처 (모두 동일 함수):
- Row action `approve` 클릭 ([:769](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L769))
- Drawer footer "승인" 버튼 ([:1050](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1050))
- Bulk action `approve` → `batchUpdateMemberStatus` → 동일 PATCH N회

### 2.2 Backend PATCH /kpa/members/:id/status — 분기 매트릭스

**파일**: [apps/api-server/src/routes/kpa/controllers/member.controller.ts:409-631](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L409-L631)

라인별 동작 (common: `member.status = newStatus` + `memberRepo.save(member)` — line 429, 445):

| 분기 | line | 호출 service | service_memberships 동기화 | 기타 |
|---|---|---|---|---|
| `pending → active` (**승인**) | 453-478 | **❌ 없음** (inline raw SQL) | **❌ 누락** | users + profile insert + (조건부) store_owner auto-activation |
| `suspended/rejected` | 479-487 | `suspendMembership()` | ✅ `'suspended'` | role deactivate |
| `withdrawn` | 488-497 | `withdrawMembership()` | ✅ `'withdrawn'` (선행 WO 65cec0455 로 정렬) | role deactivate + kpa_members.status='withdrawn' |
| `suspended → active` (**복원**) | 498-506 | `reactivateMembership()` | ✅ `'active'` | role reactivate |

**유일하게 service 호출 없음 = 유일하게 sm 동기화 누락**.

### 2.3 GET /kpa/members 조회 기준

**파일**: [apps/api-server/src/routes/kpa/controllers/member.controller.ts:235-403](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L235-L403)

```sql
FROM service_memberships sm
JOIN users u ON u.id = sm.user_id
LEFT JOIN kpa_members km ON km.user_id = sm.user_id
WHERE sm.service_key IN ('kpa-society', 'kpa') [AND sm.status = $N]
```

응답의 `status` 필드 = `r.status` = `sm.status` (line 339).
별도로 `kpa_status` = `km.status` 도 함께 노출되나 frontend는 미사용.

→ 승인대기 탭(`STATUS_TAB_FILTER['status-pending']='pending'`)은 `WHERE sm.status='pending'` 으로 조회 → sm 동기화 누락된 회원이 계속 매칭.

### 2.4 MembershipApprovalService.approveMembership() — 호출되어야 했지만 미사용

**파일**: [apps/api-server/src/services/approval/MembershipApprovalService.ts:98-234](apps/api-server/src/services/approval/MembershipApprovalService.ts#L98-L234)

존재하는 메소드의 STEP1-4:
- STEP1: `UPDATE service_memberships SET status='active', approved_by=$1, approved_at=NOW()`
- STEP2: `UPDATE users SET status='active', isActive=true, approvedAt=NOW(), approvedBy=$1`
- STEP3: `INSERT INTO role_assignments ... ON CONFLICT ... DO UPDATE`
- STEP4: `kpa_members` upsert (pending→active activate + skeleton 생성)

**즉 PATCH /:id/status 의 pending→active 분기가 해야 할 일을 이미 모두 캡슐화한 메소드가 존재**하나 호출되지 않음. inline SQL 만 사용.

PATCH 의 input 은 `kpa_members.id` 이지만 approveMembership 은 `membership.id` (service_memberships.id) 를 받음 — 호출하려면 `SELECT id FROM service_memberships WHERE user_id=$1 AND service_key='kpa-society'` 한 단계 필요.

---

## 3. DB 상태 기준 비교

승인 직후 4개 테이블의 실제 변화:

| 테이블/컬럼 | 변경 전 (pending 회원) | 변경 후 (현재 동작) | 정상이라면 |
|---|---|---|---|
| `kpa_members.status` | `pending` | `'active'` ✅ | `'active'` |
| `kpa_members.identity_status` | `active` (or pending) | `'active'` ✅ | `'active'` |
| `kpa_members.joined_at` | NULL | NOW() ✅ | NOW() |
| `users.status` | `pending` | `'active'` ✅ | `'active'` |
| `users.isActive` | false | true ✅ | true |
| `users.approvedAt` | NULL | NOW() ✅ | NOW() |
| `kpa_pharmacist_profiles` / `kpa_student_profiles` | 없음 | INSERT ✅ | INSERT |
| `kpa_member_services.status` (kpa-a 별도 테이블) | `pending` | `'approved'` ✅ | `'approved'` |
| **`service_memberships.status`** (canonical SM) | `'pending'` | **`'pending'` ❌ 미변경** | `'active'` |
| `role_assignments` | (기존) | 변경 없음 | INSERT/UPDATE (`kpa:pharmacist` 등) — 현재 정책상 profile 기반이라 RBAC role 부여는 의도적으로 제외됨 |
| in-app 알림 | — | `member.registration_approved` ✅ | 발송 |

`kpa_member_services` 와 `service_memberships` 는 **다른 테이블**:
- `kpa_member_services` (KPA 도메인 — `member_id`, `service_key='kpa-a'`, status enum: `pending/approved/...`)
- `service_memberships` (Core SM — `user_id`, `service_key='kpa-society'`, status enum: `pending/active/suspended/rejected/withdrawn`)

승인 코드가 전자만 처리하고 후자(canonical SM) 를 건드리지 않음.

---

## 4. 부수 발견 (본 IR 1차 원인 외)

### 4.1 approveMembership() 의 user.status WHERE 절 미세 결함

**파일**: [MembershipApprovalService.ts:165-170](apps/api-server/src/services/approval/MembershipApprovalService.ts#L165-L170)
```sql
UPDATE users SET status='active', "isActive"=true, ...
WHERE id = $2 AND status IN ('PENDING', 'pending', 'ACTIVE', 'rejected')
```
- 대소문자 혼용 (`PENDING` / `pending` / `ACTIVE`) — case sensitivity drift 가능성. 본 IR 범위 외.
- 'active' 가 IN 절에 있는데 'ACTIVE' (대문자) 만 있음 — 'active' (소문자) 케이스 누락. 본 IR 범위 외.

### 4.2 PATCH 분기의 raw SQL과 approveMembership 의 중복

만약 PATCH 의 승인 분기를 `approveMembership()` 호출로 교체하면:
- STEP2: users update — 현재 inline SQL 과 동일 의미
- STEP4: kpa_members upsert — 현재 line 429+445 의 memberRepo.save 와 중복 (idempotent라 무해)
- STEP3: role_assignments INSERT — 현재 PATCH 흐름에는 없음 (kpa:pharmacist/student role 의도적 미할당 정책 — `WO-KPA-A-ROLE-CLEANUP-V1`). STEP3 가 `membership.role` 기반으로 role 을 만들기 때문에 현재 정책과 충돌 가능.

→ 단순한 "approveMembership 호출로 대체" 가 아니라 **부분 발췌 호출** 또는 **inline + sm update 한 줄 추가** 가 더 안전할 수 있음. 후속 WO 에서 결정.

### 4.3 store_owner auto-activation 의 부분 무영향

`pending→active` 분기 내 `pharmacy_owner` 자동 활성화 ([:535-599](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L535-L599)) 는 organizations / organization_members / role_assignments(`kpa:store_owner`) 만 다루고 service_memberships 는 무관. 본 이슈와 독립.

### 4.4 bulk approval 도 동일 영향

[batchUpdateMemberStatus](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L494) 가 PATCH /:id/status 를 N회 병렬 호출하는 wrapper. backend 분기 흐름이 동일하므로 sm 동기화 누락도 N건. 일괄 승인 후에도 동일 회원들이 승인대기 탭에 남음.

---

## 5. 수정 필요 파일 목록

| 파일 | 수정 종류 |
|---|---|
| [apps/api-server/src/routes/kpa/controllers/member.controller.ts:447-478](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L447-L478) | pending→active 분기 내 service_memberships 동기화 한 단계 추가 |
| (선택) [apps/api-server/src/services/approval/MembershipApprovalService.ts:98-234](apps/api-server/src/services/approval/MembershipApprovalService.ts#L98-L234) | 호출 패턴/시그니처 조정 — 부분 발췌 또는 별도 helper 추출 |
| (선택) [apps/api-server/src/services/approval/MembershipApprovalService.ts:165-170](apps/api-server/src/services/approval/MembershipApprovalService.ts#L165-L170) | users.status IN 절 case 정렬 (부수 발견 #4.1) — 별도 정리 WO |
| **데이터 마이그레이션** | 잔재 데이터: `kpa_members.status='active'` 인데 `service_memberships.status='pending'` 인 회원 backfill |

frontend 무변경 (refetch 정상 작동).

---

## 6. 권장 수정 방향

### 6.1 옵션 A — 최소 수정 (inline UPDATE 한 단계 추가) ⭐ 권장

PATCH 의 `pending → active` 분기 (line 453-478) 안에 SQL 한 줄 추가:

```sql
UPDATE service_memberships
SET status = 'active', approved_by = $2, approved_at = NOW(), updated_at = NOW()
WHERE user_id = $1 AND service_key = 'kpa-society' AND status = 'pending'
```

장점:
- 최소 변경 (한 줄), 기존 분기 흐름 무관 보존
- approveMembership() 호출 시 STEP3 role_assignments 부여로 인한 정책 충돌 회피 (kpa:pharmacist role 의도적 미할당)
- 다른 분기 (suspended/withdrawn/reactivate) 와 패턴 형평성 유지

주의:
- WHERE status='pending' 가드로 멱등성 보장 (중복 호출 무해)
- `approved_by` 컬럼 활용 — 이미 ServiceMembership entity 에 정의됨

### 6.2 옵션 B — service 호출로 전환 (refactor)

PATCH 분기를 `approveMembership()` 호출로 교체 + STEP3 우회 또는 정책 정렬.

장점: 단일 진입점 — 다른 흐름과 패턴 일관
단점: 변경 범위 큼 + STEP3 의 role 부여가 KPA 정책과 충돌 가능성 — 신중한 검토 필요

### 6.3 옵션 C — 컨트롤러를 그대로 두고 frontend가 km.status 사용

GET /members 응답의 `kpa_status` (= km.status) 를 frontend 가 status filter 기준으로 사용. **비추천** — IR-O4O-KPA-ADMIN-MEMBER-COUNT-WITHDRAWN-AUDIT-V1 가 정립한 "sm.status canonical" 원칙을 깨뜨리고, 두 테이블 동기화 깨짐을 영구화.

### 6.4 데이터 마이그레이션

옵션 A 또는 B 배포 후 일회성 backfill 필요:
```sql
UPDATE service_memberships sm
SET status = 'active', updated_at = NOW()
FROM kpa_members km
WHERE sm.user_id = km.user_id
  AND sm.service_key = 'kpa-society'
  AND sm.status = 'pending'
  AND km.status = 'active'
```

UPDATE 전 진단:
```sql
SELECT COUNT(*) FROM service_memberships sm
JOIN kpa_members km ON km.user_id = sm.user_id
WHERE sm.service_key = 'kpa-society'
  AND sm.status = 'pending'
  AND km.status = 'active'
```

IR-O4O-KPA-ADMIN-MEMBER-COUNT-WITHDRAWN-AUDIT-V1 §2.3 의 보너스 발견 (`sm.status='active'=4` vs `kpa_members.status='active'=1`) 도 이 backfill 로 일부 또는 전부 정렬 가능 — 의미가 mirror 관계.

---

## 7. 바로 수정 가능한가?

| 옵션 | 즉시 가능 | 사유 |
|---|---|---|
| 옵션 A (inline UPDATE 한 줄) | ✅ — 작고 안전 | backend 1파일, 한 SQL 추가. 멱등. 회귀 위험 낮음 |
| 옵션 B (service refactor) | ⚠️ — 정책 정렬 필요 | STEP3 role 부여가 현재 KPA "profile 기반 — RBAC role 미할당" 정책과 충돌 가능 |
| 데이터 마이그레이션 | ⚠️ — 사용자 승인 필요 (UPDATE) | 운영 DB UPDATE 이므로 명시적 승인 필수. 옵션 A/B 배포와 함께 또는 직후 |

옵션 A + 데이터 마이그레이션 묶음이 가장 안전한 1차 정비 경로.

---

## 8. 후속 WO 초안

### WO-O4O-KPA-MEMBER-APPROVAL-SM-SYNC-FIX-V1

```text
WO-O4O-KPA-MEMBER-APPROVAL-SM-SYNC-FIX-V1

목적:
운영자 회원 승인 후 service_memberships.status='pending' 잔존으로 승인대기 탭에 계속
표시되는 정합성 문제 해소. PATCH /:id/status 의 pending→active 분기에 SM
동기화 단계 추가.

근거: docs/investigations/IR-O4O-KPA-OPERATOR-MEMBER-APPROVAL-STALE-PENDING-AUDIT-V1.md

작업 범위:
- apps/api-server/src/routes/kpa/controllers/member.controller.ts (pending→active 분기)
  · UPDATE service_memberships SET status='active', approved_by=$user, approved_at=NOW()
    WHERE user_id=$1 AND service_key='kpa-society' AND status='pending' 한 단계 추가
  · 멱등성 가드: WHERE status='pending' 으로 중복 호출 안전
  · 다른 분기 (suspend/withdraw/reactivate) 무변경

- (별도 WO 또는 본 WO 묶음) Data migration
  · 잔재 데이터 backfill: kpa_members.status='active' AND sm.status='pending' 인 회원
  · 사전 진단 + UPDATE + 사후 검증
  · 사용자 명시 승인 후 진행

검증:
- TypeScript clean
- 새 회원을 PATCH로 승인 → service_memberships.status='active' 변경 확인
- GET /kpa/members?status=pending 에서 승인된 회원 제외 확인
- 운영자 승인대기 탭 카운트 / 목록 즉시 갱신 확인
- 관리자 /admin/members 화면과 정합성 유지 확인
- bulk approval 도 동일 동작 확인

주의:
- approveMembership() service method 의 STEP3 role 부여는 KPA 정책 (profile 기반) 과
  충돌 가능 — 본 WO 는 inline SQL 만 추가하고 service refactor 는 별도 결정
- frontend 무변경 (refetch 이미 정상)
- store_owner auto-activation 흐름 무영향
```

### (선택) WO-O4O-KPA-APPROVAL-SERVICE-CASE-DRIFT-FIX-V1

부수 발견 #4.1 (users.status IN 절 대소문자 혼용) 정리. 본 IR 1차 원인과 독립.

---

## 9. 본 IR 범위 외 (후속 확인)

- 운영 DB 실제 row 분포 (사용자 승인 후 read-only SELECT):
  - `SELECT km.status AS km_status, sm.status AS sm_status, COUNT(*) FROM kpa_members km JOIN service_memberships sm ON sm.user_id=km.user_id WHERE sm.service_key='kpa-society' GROUP BY km.status, sm.status`
  - 미스매치 row 식별 → backfill 영향 범위 산정
- `MembershipApprovalService.approveMembership()` 의 STEP3 role 부여 정책 vs 현 KPA "profile 기반" 정책 정렬 (별도 IR 가능)
- `kpa_member_services` (kpa-a) 와 `service_memberships` 두 테이블의 역할 분리 — 향후 통합 vs 유지 결정

---

## 10. 참조

- `docs/investigations/IR-O4O-KPA-ADMIN-MEMBER-COUNT-WITHDRAWN-AUDIT-V1.md` (mirror 케이스 — withdrawn 누락)
- `docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md`
- `docs/architecture/USER-OPERATOR-FREEZE-V1.md` (F11)
- WO 추적:
  - `WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1` (commit `65cec0455` — withdrawn 정렬)
  - `WO-O4O-CORE-FREEZE-V1` (ServiceMembership entity)
  - `WO-KPA-A-APPROVAL-RBAC-ALIGNMENT-V1` (현재 PATCH 흐름 도입)
  - `WO-KPA-A-ROLE-CLEANUP-V1` (kpa:pharmacist role 미할당 정책)
  - `WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION-V1` (store_owner 자동 활성화)

---

*조사 전용 — 코드/DB 수정 없음. 코드 변경은 후속 WO 로 분리 진행.*
