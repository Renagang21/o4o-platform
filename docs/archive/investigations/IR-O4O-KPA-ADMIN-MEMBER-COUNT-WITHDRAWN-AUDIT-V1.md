# IR-O4O-KPA-ADMIN-MEMBER-COUNT-WITHDRAWN-AUDIT-V1

**작성일**: 2026-05-16
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**대상**:
- `https://kpa-society.co.kr/admin/kpa-dashboard` (관리자 대시보드)
- `https://kpa-society.co.kr/admin/members` (관리자 회원관리)
- 운영자 화면(`/operator/members`)의 탈퇴 처리 결과가 관리자 화면에 노출되지 않는 정합성 문제

---

## 0. 결론 요약

두 개의 독립된 원인이 동시에 발현되어 사용자가 인지한 정합성 문제를 만들고 있다.

| 증상 | 원인 | 심각도 |
|---|---|---|
| 관리자 대시보드 "전체 회원 1" vs 관리자 회원관리 "총 회원 6" | 라벨은 동일("전체"/"총")이나 카운트 기준이 다름. **대시보드는 `kpa_members.status='active'` 1건만 셈** / 관리자 회원관리 총회원은 **`service_memberships` 의 모든 status row** 를 셈 | High (UX 혼동·운영 판단 오류 유발) |
| 운영자에서 `withdrawn` 처리한 회원이 관리자 `탈퇴` 탭에 0건 표시 | **`MembershipApprovalService.withdrawMembership()` 가 `service_memberships.status` 를 `'inactive'` 로 저장**하는데, **`GET /kpa/members` 와 관리자 화면 카운트는 `'withdrawn'` 으로 필터**해서 0건 매칭 | Critical (운영자의 탈퇴 조치가 관리자에게 인계되지 않음 = 라이프사이클 단절) |

**핵심 contract drift**: `ServiceMembershipStatus` 타입에는 `'withdrawn'` 도 `'inactive'` 도 없다 (`pending | active | suspended | rejected` 만 정의). 그러나 PATCH endpoint validator 는 `'withdrawn'` 를 받고, 서비스 레이어는 `'inactive'` 로 저장하고, 조회 layer 는 `'withdrawn'` 을 기대한다. **3개 모듈이 서로 다른 값을 가정한다.**

---

## 1. 화면별 API · 데이터 소스 비교표

### 1.1 관리자 대시보드 — "전체 회원"

| 항목 | 값 |
|---|---|
| 프론트 파일 | [services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx:102](services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx#L102) |
| 호출 API | `GET /api/v1/kpa/operator/district-summary?limit=10` |
| 응답 필드 | `data.kpis.totalMembers` |
| Frontend 클라이언트 | [services/web-kpa-society/src/api/operator.ts:155-158](services/web-kpa-society/src/api/operator.ts#L155-L158) |
| 백엔드 controller | [apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts:271-310](apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts#L271-L310) |
| 카운트 SQL | `memberRepo.count({ where: { status: 'active' } })` — **`kpa_members` 테이블의 `status='active'` row 만 카운트** |
| 라벨 | "전체 회원" |
| 실제 의미 | **활성(active) 회원만** |
| Scope guard | `requireKpaScope('kpa:operator')` |

### 1.2 관리자 회원관리 — "총 회원" / 각 상태별 카운트

| 항목 | 값 |
|---|---|
| 프론트 파일 | [services/web-kpa-society/src/pages/admin/AdminMemberManagementPage.tsx:112-145](services/web-kpa-society/src/pages/admin/AdminMemberManagementPage.tsx#L112-L145) |
| 호출 API | `GET /api/v1/kpa/members?page=N&limit=20[&status=...]` + 별도 `GET /api/v1/kpa/members?limit=1000` (lifecycle counts) |
| 응답 필드 | `data[]`, `total`, `totalPages` |
| 백엔드 controller | [apps/api-server/src/routes/kpa/controllers/member.controller.ts:235-378](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L235-L378) |
| 카운트 SQL | `SELECT COUNT(*) FROM service_memberships sm JOIN users u ON u.id=sm.user_id LEFT JOIN kpa_members km ON km.user_id=sm.user_id WHERE sm.service_key IN ('kpa-society','kpa') [AND sm.status=$1]` |
| 라벨 | "총 회원" + 탭별 ("탈퇴", "정지", "반려", "승인 대기", "활성", "전체") |
| 실제 의미 | `service_memberships` 의 **모든 status row** (status 필터 미적용 시) — `inactive` 포함 |
| Scope guard | `requireScope('kpa:operator')` |

### 1.3 운영자 회원관리 — 비교용

| 항목 | 값 |
|---|---|
| 프론트 파일 | [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx:313-403](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L313-L403) |
| 호출 API | 동일 `GET /api/v1/kpa/members` |
| 탭 목록 | `all` / `pharmacist` / `student` / `status-pending` / `status-active` / `status-rejected` / `status-suspended` / `applications` |
| **탈퇴 탭 부재** | `status-withdrawn` 탭 정의 없음 — 운영자는 탈퇴된 회원을 분리 조회할 수단이 없음 |

---

## 2. count 기준 비교

### 2.1 의미 차이 매트릭스

| 화면·필드 | 데이터 소스 | 어떤 status | 누가 포함되나 |
|---|---|---|---|
| 관리자 대시보드 "전체 회원" | `kpa_members.status` | `'active'` 단일 | 활성 약사·약대생만 |
| 관리자 회원관리 "총 회원" | `service_memberships.status` | (필터 없음) all | `pending`+`active`+`suspended`+`rejected`+`inactive` (=`withdrawn`된 회원) 합계 |
| 관리자 회원관리 탭 "탈퇴" | `service_memberships.status` | `'withdrawn'` | **항상 0건** (실데이터는 `'inactive'` 로 저장됨) |
| 관리자 회원관리 탭 "정지" | `service_memberships.status` | `'suspended'` | 정상 동작 |
| 관리자 회원관리 탭 "활성" | `service_memberships.status` | `'active'` | 정상 동작 |
| 관리자 회원관리 탭 "전체" | `service_memberships` row 수 | all | `inactive` 포함되나 정렬·표시 가능 (status badge 라벨링은 별도 이슈) |
| 운영자 회원관리 카운트 | `service_memberships.status` (allRes 응답) | client-side 필터 | `pending`/`active`/`rejected`/`suspended` 4종 — `withdrawn`/`inactive` 카운트 자체가 없음 |

### 2.2 사용자가 본 숫자의 재구성

| 사용자 보고 값 | 해석 |
|---|---|
| 대시보드 "전체 회원 1" | `kpa_members.status='active'` row = 1 |
| 회원관리 "총 회원 6" | `service_memberships` (kpa-society/kpa) row = 6 |
| 회원관리 "활성 4" | `sm.status='active'` 4 (kpa_members 와 미스매치 가능 — 자세히는 §3) |
| 회원관리 "승인대기 1" | `sm.status='pending'` 1 |
| 회원관리 "탈퇴 0" | `sm.status='withdrawn'` 0 (저장값이 `'inactive'` 라서 미스매치) |

→ "총 6 = 활성 4 + 승인대기 1 + ??? 1" 로 1건이 남는데, 이 1건은 `sm.status='inactive'` 일 가능성이 매우 높다 (= 사용자가 운영자 화면에서 탈퇴 처리한 회원).

> 운영 DB 직접 확인이 필요한 항목 — 본 IR 은 read-only 라 운영 SELECT 미실행. 후속 verification 항목.

### 2.3 활성 회원 수 4 vs 1 의 차이 (보너스 발견)

- 대시보드: `kpa_members.status='active'` = 1
- 회원관리: `sm.status='active'` = 4

→ kpa_members 와 service_memberships 의 `active` 동기화가 미스. 가능 시나리오:
- `sm.status='active'` 인데 `kpa_members` row 자체가 없음 (`has_kpa_member=false`) → 대시보드 카운트에서 제외
- 또는 `kpa_members.status` 가 `pending` 인데 `sm.status` 는 `active` (승인 흐름의 부분 적용)

본 IR 의 1차 관심은 withdrawn 누락이나, **active 카운트도 정합성 깨짐**을 함께 발견함.

---

## 3. withdrawn 회원 누락 — 근본 원인

### 3.1 코드 경로 (운영자가 회원을 탈퇴시킬 때)

```
[Operator UI: ActionBar "탈퇴 처리" 또는 Drawer status select]
   ↓ apiClient.patch('/members/:id/status', { status: 'withdrawn' })
[Backend: PATCH /kpa/members/:id/status]
   ↓ apps/api-server/src/routes/kpa/controllers/member.controller.ts:384-583
   1) body('status').isIn([..., 'withdrawn']) — 통과
   2) member.status = 'withdrawn'; memberRepo.save(member); // kpa_members.status='withdrawn'
   3) newStatus==='withdrawn' 분기:
        approvalService.withdrawMembership({ userId, serviceKeys: ['kpa-society'] })
   ↓
[MembershipApprovalService.withdrawMembership]
   apps/api-server/src/services/approval/MembershipApprovalService.ts:588-728
   STEP1: UPDATE service_memberships SET status = 'inactive' WHERE id = ANY(...)
   STEP2: role_assignments LIKE 'kpa:%' → is_active=false
   STEP3: UPDATE kpa_members SET status='withdrawn', identity_status='withdrawn'
   STEP4: organization_members (role='member') DELETE
   NOTE: users.status 미변경
```

→ **최종 상태**:
- `kpa_members.status = 'withdrawn'` ✅ (member.controller.ts 의 `member.status = newStatus` + service의 STEP3 둘 다 적용)
- `service_memberships.status = 'inactive'` ⚠️ (NOT `'withdrawn'`)
- `role_assignments`: kpa:* roles `is_active=false`
- `users.status`: 미변경

### 3.2 조회 경로 (관리자가 탈퇴 회원을 보려고 할 때)

`AdminMemberManagementPage` 의 `status-withdrawn` 탭이 활성화되면:
```
STATUS_TAB_FILTER['status-withdrawn'] = 'withdrawn'
→ apiClient.get('/members', { status: 'withdrawn', ... })
→ backend SQL: WHERE sm.service_key IN ('kpa-society','kpa') AND sm.status = 'withdrawn'
→ 매칭 row = 0건 (실 데이터는 sm.status = 'inactive')
```

같은 페이지의 lifecycle 카운트 (`counts.withdrawn`):
```typescript
all.filter((m) => m.status === 'withdrawn').length
// m.status = sm.status (응답 매핑 [member.controller.ts:323])
// → inactive 인 row 는 'withdrawn' 매칭에서 제외 → 0
```

### 3.3 contract drift 의 책임 분배

| 모듈 | 어떤 값을 가정 | 위치 |
|---|---|---|
| TypeScript entity (`ServiceMembershipStatus`) | `'pending' \| 'active' \| 'suspended' \| 'rejected'` (총 4개) | [apps/api-server/src/modules/auth/entities/ServiceMembership.ts:28](apps/api-server/src/modules/auth/entities/ServiceMembership.ts#L28) |
| PATCH validator | `'pending' \| 'active' \| 'suspended' \| 'rejected' \| 'withdrawn'` (5개) | [member.controller.ts:391](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L391) |
| `withdrawMembership` 저장값 | `'inactive'` (entity enum 에 미정의) | [MembershipApprovalService.ts:637](apps/api-server/src/services/approval/MembershipApprovalService.ts#L637) |
| `withdrawMembership` 사전조건 | `status IN ('pending','active','suspended')` (= `inactive`/`withdrawn`/`rejected` 는 재처리 차단) | [MembershipApprovalService.ts:604,611](apps/api-server/src/services/approval/MembershipApprovalService.ts#L604) |
| GET /members frontend filter | `'withdrawn'` 기대 | AdminMemberManagementPage `STATUS_TAB_FILTER` |
| 운영자 UI client-side count | `'withdrawn'`/`'rejected'`/... 단순 비교 | operator MemberManagementPage |
| `kpa_members.status` enum | `'withdrawn'` 사용 OK (다른 enum, 도메인 분리) | KpaMember entity |

withdrawMembership 의 코드 주석:
> `// 'inactive'는 Core freeze 내 기존 값 재사용 — 새 enum 추가 금지`

→ 의도: Core freeze 우회 위해 기존 enum 값에서 가장 가까운 것을 재사용. 그러나 **실제 ServiceMembershipStatus 타입에는 `'inactive'` 도 없다**. 주석과 코드가 다른 가정에 서 있다.

---

## 4. status 동기화 매트릭스 (현재 동작)

PATCH /kpa/members/:id/status 호출 시 각 테이블/필드가 어떻게 변하는지.

| newStatus | kpa_members.status | kpa_members.identity_status | service_memberships.status | role_assignments (kpa:*) | users.status / isActive |
|---|---|---|---|---|---|
| `pending` | `pending` | `active` | (미변경) | (미변경) | (미변경) |
| `active` (pending→active 승인) | `active` | `active` | (미변경; 별도 service record 동기화는 kpa_member_services 만) | (미변경) | `users.status='active'`, `isActive=true`, `approvedAt`, `approvedBy` 설정 |
| `suspended` | `suspended` | `suspended` | suspendMembership: `suspended` | suspendMembership: deactivate | (미변경) |
| `rejected` | `rejected` | `suspended` | suspendMembership: `suspended` (rejected 동일 처리) | suspendMembership: deactivate | (미변경) |
| `withdrawn` | `withdrawn` | `withdrawn` | **`inactive`** | deactivate kpa:* | (미변경) |
| `active` (suspended→active 복원) | `active` | `active` | reactivateMembership: `active` | reactivateMembership: reactivate | (미변경) |

> `kpa_member_services` 도 별도로 status sync ([member.controller.ts:488-512](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L488-L512)) — 본 IR 범위 외.

**핵심 관측**: `withdrawn` 케이스에서 `service_memberships.status` 만 `'inactive'` 로 다른 enum 값을 사용. 나머지 status 는 1:1 매칭. → withdrawn 한 케이스만 정합성 깨짐.

---

## 5. 수정 필요 파일 목록

### 5.1 옵션 A — 백엔드 contract 통일 (`service_memberships.status = 'withdrawn'`)

가장 직관적이고 frontend·다른 화면의 변경 없이 정합성 회복 가능.

| 파일 | 변경 |
|---|---|
| [apps/api-server/src/modules/auth/entities/ServiceMembership.ts:28](apps/api-server/src/modules/auth/entities/ServiceMembership.ts#L28) | `ServiceMembershipStatus` 타입에 `'withdrawn'` (또는 `'inactive'` + `'withdrawn'`) 추가. **Core freeze 정책 결정 필요**. |
| [apps/api-server/src/services/approval/MembershipApprovalService.ts:637](apps/api-server/src/services/approval/MembershipApprovalService.ts#L637) | `UPDATE service_memberships SET status = 'inactive'` → `'withdrawn'` 변경 |
| [apps/api-server/src/services/approval/MembershipApprovalService.ts:604,611](apps/api-server/src/services/approval/MembershipApprovalService.ts#L604) | `SELECT ... WHERE status IN ('pending','active','suspended')` 의 사전조건 검토 — 재탈퇴 시도 차단 정책 유지 또는 완화 |
| **데이터 마이그레이션** | `UPDATE service_memberships SET status='withdrawn' WHERE status='inactive'` — Core freeze 우회 정책으로 들어간 row 전수 이전 |

검증 필요:
- 다른 서비스(neture, glycopharm, k-cosmetics) 가 `service_memberships.status='inactive'` 값을 가정하는 코드가 있는지 grep
- `MembershipGate` (frontend) 의 access 차단 로직이 어떤 status 를 차단하는지 — `withdrawn` 도 차단해야 함

### 5.2 옵션 B — 프론트 contract 통일 (`'inactive'` 사용)

| 파일 | 변경 |
|---|---|
| [services/web-kpa-society/src/pages/admin/AdminMemberManagementPage.tsx:30,53,61-68](services/web-kpa-society/src/pages/admin/AdminMemberManagementPage.tsx#L30) | `MemberStatus`, `STATUS_LABEL`, `STATUS_TAB_FILTER` 의 `'withdrawn'` → `'inactive'` |
| [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx:49](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L49) | `MemberStatus` union, EditDrawer status select 옵션 등 |
| PATCH validator | `'withdrawn'` 입력은 deprecated 처리 또는 alias 매핑 |

옵션 B 는 frontend 다수 파일 변경 + UX 용어("탈퇴" → "비활성")까지 영향. 비추천.

### 5.3 옵션 C — alias 변환 layer (양쪽 호환)

| 파일 | 변경 |
|---|---|
| GET /members backend | `WHERE sm.status = $1` 직전에 `if (status==='withdrawn') status='inactive'` 변환 |
| 응답 직전 | `data[].status` 값을 `'inactive'` → `'withdrawn'` 로 역변환 |

빠른 호환 패치. 그러나 **contract drift 의 근본 원인을 가리는 패치** — 추후 다른 코드 경로에서 동일 함정 재발 가능성 높음. 추천하지 않음.

### 5.4 대시보드 "전체 회원" 라벨 보정 (별건)

| 파일 | 변경 |
|---|---|
| [services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx:100-103](services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx#L100-L103) | 라벨 "전체 회원" → "활성 회원" 으로 변경, 또는 |
| [apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts:283](apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts#L283) | 카운트 기준을 "lifecycle 전체(active+pending+suspended)" 또는 "kpa_members 모든 row" 로 변경 (의미를 라벨과 맞춤) |

→ 정책 결정 필요: 대시보드 KPI 가 "활성"만 보여야 하는지 "라이프사이클 전체"여야 하는지.

---

## 6. 권장 수정 방향

### 6.1 1순위 (정합성 회복 핵심) — **옵션 A**

- `ServiceMembershipStatus` 에 `'withdrawn'` 정식 추가
- `MembershipApprovalService.withdrawMembership` 의 UPDATE 값을 `'withdrawn'` 으로 정렬
- 운영 DB 의 기존 `'inactive'` row 를 `'withdrawn'` 으로 마이그레이션
- Core freeze 위반 가능성 → **명시적 WO 승인 필수** (Core entity 변경 + 데이터 마이그레이션)

### 6.2 2순위 (UX 누수) — 운영자 탭 보강

- operator MemberManagementPage 의 탭에 `status-withdrawn` 추가 + `STATUS_TAB_FILTER` 보강
- count 변수에 `withdrawnMemberCount` 추가
- 운영자가 자신이 탈퇴 처리한 회원의 행방을 즉시 확인 가능

### 6.3 3순위 (라벨 모호성) — 대시보드 카운트 의미 명확화

- 라벨 변경 "전체 회원" → "활성 회원" (간단·즉시 적용 가능), 또는
- 카운트 기준을 lifecycle 전체로 변경 (의미 통일이 더 깔끔하나 정책 결정 필요)
- 동시에 totalMembers vs 회원관리 총회원의 의미 차이를 문서/툴팁으로 안내

### 6.4 4순위 (보너스 발견) — kpa_members.status vs sm.status 정합성

- `kpa_members.status='active'` 1건과 `sm.status='active'` 4건의 차이를 별도 audit 필요
- 후속 IR 또는 SELECT 진단으로 처리
- 본 IR 의 1차 범위 외

---

## 7. 바로 수정 가능한가?

| 옵션 | 즉시 가능 여부 | 사유 |
|---|---|---|
| 옵션 A (백엔드 contract 통일) | ❌ — 명시적 WO 승인 필요 | Core entity 변경 + 운영 DB UPDATE migration. Core freeze 정책(`WO-O4O-CORE-FREEZE-V1`) 검토 필요. 사용자 승인 필수. |
| 옵션 B (프론트 contract 통일) | ⚠️ — 가능하나 비추천 | UX 용어 충돌, frontend 파일 다수 변경, contract drift 의 책임을 프론트로 이동 |
| 옵션 C (alias 변환 layer) | ✅ — 빠르나 비추천 | 근본 원인 은폐, 재발 가능성 높음 |
| 운영자 `status-withdrawn` 탭 추가 | ✅ — 즉시 가능 (frontend 단독, 옵션 A 적용 후) | 옵션 A 와 묶어서 진행 권장 — 옵션 A 없으면 탭 추가해도 데이터 0건 |
| 대시보드 라벨 "전체 회원"→"활성 회원" | ✅ — 즉시 가능 (frontend 1줄) | 라벨 변경만이라 안전. 단 정책 결정자 동의 필요 |

---

## 8. 후속 WO 초안

### WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1

```text
WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1

목적:
service_memberships.status 에 'withdrawn' 정식 도입.
현재 withdrawMembership() 가 'inactive' 로 저장하여 GET /kpa/members?status=withdrawn 과 미스매치 발생.

작업 범위:
1. apps/api-server/src/modules/auth/entities/ServiceMembership.ts
   - ServiceMembershipStatus 타입에 'withdrawn' 추가 (Core entity 변경 — 명시적 승인)

2. apps/api-server/src/services/approval/MembershipApprovalService.ts
   - withdrawMembership() STEP1: 'inactive' → 'withdrawn'
   - SELECT 사전조건 (status IN [...]) 의 재탈퇴 차단 정책 보존
   - 단, 'withdrawn' 자체도 차단 대상에 포함 (이중 탈퇴 방지)

3. 데이터 마이그레이션 (TypeORM migration)
   - SELECT 사전 진단: COUNT(*) FROM service_memberships WHERE status='inactive'
   - 가드: 'inactive' row 가 KPA 외 서비스(neture/k-cosmetics/glycopharm) 의 다른 의미로 쓰이는지 확인 후 마이그레이션
   - UPDATE service_memberships SET status='withdrawn' WHERE status='inactive'
   - 사후 검증 + 결과 로그

4. (선택) 다른 사용처 점검 — grep 'inactive' 으로 service_memberships 가정 코드 전수

검증:
- TypeScript clean
- PATCH /kpa/members/:id/status withdrawn → DB 확인 → service_memberships.status='withdrawn'
- GET /kpa/members?status=withdrawn → 탈퇴된 row 반환
- 관리자 회원관리 "탈퇴" 탭 노출 확인
- 대시보드 totalMembers 변화 없음 (별 카운트)

주의:
- Core freeze (WO-O4O-CORE-FREEZE-V1) 의 변경 — 승인 필수
- 데이터 마이그레이션 — 사용자 승인 필수
- 다른 서비스(neture/glycopharm/k-cosmetics)의 service_memberships 사용 영향도 사전 점검 필수
```

### WO-O4O-OPERATOR-MEMBER-WITHDRAWN-TAB-ADD-V1 (의존: 위 WO 완료 후)

```text
WO-O4O-OPERATOR-MEMBER-WITHDRAWN-TAB-ADD-V1

목적:
운영자 회원관리 화면에 '탈퇴' 탭 추가 — 운영자가 자신이 탈퇴 처리한 회원의 행방 즉시 확인 가능하게.

작업 범위:
services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx
- STATUS_TAB_FILTER 에 'status-withdrawn': 'withdrawn' 추가
- withdrawnMemberCount state 추가 + 카운트 계산
- tabs 배열에 '탈퇴' 탭 추가

검증:
- 탈퇴 처리 → 새로고침 → 탈퇴 탭에 회원 노출 확인
- 카운트 갱신 확인

사전 조건:
- WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1 가 main 에 배포되어 있어야 함
```

### WO-O4O-KPA-ADMIN-DASHBOARD-TOTALMEMBERS-LABEL-FIX-V1 (단독)

```text
WO-O4O-KPA-ADMIN-DASHBOARD-TOTALMEMBERS-LABEL-FIX-V1

목적:
KpaAdminDashboardPage 의 '전체 회원' 라벨이 실제 '활성 회원' 만 카운트하는 점 해소.

옵션 (택1, 정책 결정 후 진행):
(a) 라벨 변경 "전체 회원" → "활성 회원" (frontend 1줄, 안전)
(b) 카운트 기준 변경 — operator-summary.controller.ts:283 의 where 조건을 라이프사이클 전체로 확장

검증:
- 의미와 라벨 일치 확인
- 회원관리 화면의 "총 회원" 값과의 관계 명시 (필요 시 툴팁)
```

---

## 9. 본 IR 범위 외 (후속 확인 항목)

- 운영 DB 실제 row 분포 확인 (사용자 승인 후 read-only SELECT 으로 진단):
  - `SELECT status, COUNT(*) FROM service_memberships WHERE service_key IN ('kpa-society','kpa') GROUP BY status`
  - `SELECT status, COUNT(*) FROM kpa_members GROUP BY status`
  - 두 결과 join 으로 mismatch row id 식별
- `kpa_members.status='active' = 1` vs `sm.status='active' = 4` 의 정합성 (보너스 발견)
- 다른 서비스(neture/glycopharm/k-cosmetics) 의 `service_memberships.status='inactive'` 사용 사례 grep — 옵션 A 의 영향도 평가

---

## 10. 참조

- `docs/architecture/USER-OPERATOR-FREEZE-V1.md` (F11)
- `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` (F9)
- `docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md`
- WO 추적 keyword (git log):
  - `WO-O4O-CORE-FREEZE-V1` (Core entity 동결)
  - `WO-O4O-USER-WITHDRAW-LIFECYCLE-V1` (withdrawMembership 도입 시점)
  - `WO-KPA-A-MEMBER-STATUS-SEMANTICS-SEPARATION-V1` (rejected 추가)
  - `WO-O4O-KPA-OPERATOR-MEMBER-LIST-SOURCE-FIX-V1` (sm 기준으로 GET /members 전환)
  - `WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1` (admin/operator 화면 분리)

---

*조사 전용 — 코드/DB 수정 없음. 코드 변경은 후속 WO 로 분리 진행.*
