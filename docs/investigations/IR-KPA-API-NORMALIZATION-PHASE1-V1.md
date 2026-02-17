# IR: KPA API Contract Investigation — Phase 1

> **WO: WO-O4O-API-STRUCTURE-NORMALIZATION-V1**
> **Phase: 1 — 계약 조사 (Investigation)**
> **Date: 2026-02-18**

---

## 1. 조사 범위

KPA Society 3개 서비스 영역의 대시보드 API 호출 패턴 조사.

| 영역 | Operator Dashboard | Admin Dashboard |
|------|-------------------|-----------------|
| KPA-a | `KpaOperatorDashboard.tsx` | 없음 |
| KPA-b | `BranchOperatorDashboard.tsx` | `DashboardPage.tsx` |
| KPA-c | `KpaOperatorDashboardPage.tsx` | `AdminDashboardPage.tsx` |

---

## 2. Dashboard API 응답 비교표

### 2-1. Backend Endpoints

| Endpoint | Auth Scope | Tables | Scoping |
|----------|-----------|--------|---------|
| `GET /operator/summary` | `kpa:operator` | cms_contents, signage_media, signage_playlists, forum_post | serviceKey 기반 (global) |
| `GET /admin/dashboard/stats` | `kpa:admin` | kpa_organizations, kpa_members, kpa_applications | Global |
| `GET /branch-admin/dashboard/stats` | `kpa:branch_admin` | kpa_members | organization_id 기반 |
| `GET /organization-join-requests/pending` | `kpa:admin` | kpa_organization_join_request | optional organizationId filter |
| `GET /members` | varies | kpa_members | status filter |

### 2-2. 응답 Shape 비교

```
operatorApi.getSummary()
└─ { success, data: OperatorSummary }
   ├─ content: { totalPublished, recentItems[] }
   ├─ signage: { totalMedia, totalPlaylists, recentMedia[], recentPlaylists[] }
   └─ forum:   { totalPosts, recentPosts[] }

adminApi.getDashboardStats()
└─ { data: DashboardStats }
   ├─ totalBranches      (kpa_organizations: branch + group)
   ├─ totalMembers       (kpa_members: active)
   ├─ pendingApprovals   (kpa_applications: submitted)
   ├─ activeGroupbuys    ⚠ HARDCODED 0
   └─ recentPosts        ⚠ HARDCODED 0

branchAdminApi.getDashboardStats()
└─ { data: BranchDashboardStats }
   ├─ totalMembers           (kpa_members: org-scoped)
   ├─ activeMembers          (kpa_members: org-scoped + active)
   ├─ pendingAnnualReports   ⚠ HARDCODED 0
   ├─ pendingMembershipFees  ⚠ HARDCODED 0
   ├─ recentPosts            ⚠ HARDCODED 0
   └─ upcomingEvents         ⚠ HARDCODED 0

joinRequestApi.getPending()
└─ { success, data: { items[], pagination } }
   └─ items[]: OrganizationJoinRequest
      ├─ request_type, requested_role
      ├─ status = 'pending'
      └─ created_at
```

---

## 3. Operator vs Admin 책임 매핑표

### 3-1. 현재 상태 (AS-IS)

| 영역 | 대시보드 | 실제 사용 API | 책임 위반 |
|------|---------|-------------|---------|
| KPA-a Operator | 5-Block | `operatorApi.getSummary()` + `apiClient.get('/members')` | `/members` 는 범용 API (경미) |
| KPA-b Operator | 5-Block | `operatorApi.getSummary()` | **없음** (정상) |
| KPA-b Admin | 4-Block | `branchAdminApi.getDashboardStats()` | **없음** (정상) |
| KPA-c Operator | 5-Block | `adminApi.getDashboardStats()` + `joinRequestApi.getPending()` | **Admin API 직접 사용** |
| KPA-c Admin | 4-Block | `adminApi.getDashboardStats()` | **없음** (정상) |

### 3-2. 문제 분석

#### P1: KPA-c Operator가 Admin API 사용 (심각)

```
KPA-c Operator Dashboard
├── adminApi.getDashboardStats()    ← ❌ Admin 전용 API
└── joinRequestApi.getPending()     ← ❌ Admin scope 필요
```

- **문제**: Operator는 `kpa:operator` scope만 가져야 하는데, `kpa:admin` scope API를 직접 호출
- **현재 동작**: 실제로는 같은 사용자가 admin + operator 역할을 겸하므로 런타임 에러 없음
- **구조적 위험**: 역할 분리 시 Operator가 Admin 데이터에 접근 불가

#### P2: KPA-a Operator의 범용 API 사용 (경미)

```
KPA-a Operator Dashboard
├── operatorApi.getSummary()    ← ✅ 정상
└── apiClient.get('/members')   ← ⚠ 범용 (별도 scope 없음)
```

- **문제**: `/members` endpoint가 operator scope 없이 접근 가능
- **현재 동작**: pending member count만 필요한데 전체 members API 호출
- **경미**: 데이터 유출은 아니지만, 전용 endpoint가 바람직

---

## 4. 중복 필드 목록

### 4-1. 동일 개념, 다른 소스

| 필드 개념 | API A | API B | 동일 데이터? |
|----------|-------|-------|------------|
| 승인 대기 수 | `adminApi → pendingApprovals` (kpa_applications) | `joinRequestApi → pagination.total` (kpa_organization_join_request) | **다름** (다른 테이블) |
| 회원 수 | `adminApi → totalMembers` (global) | `branchAdminApi → totalMembers` (org-scoped) | **다름** (scope 차이) |

### 4-2. Placeholder 필드 (실데이터 없음)

| 필드 | Endpoint | 현재 값 | 테이블/엔티티 |
|------|----------|---------|-------------|
| `activeGroupbuys` | adminApi | `0` (hardcoded) | 없음 |
| `recentPosts` | adminApi | `0` (hardcoded) | 없음 (forum_post 활용 가능) |
| `pendingAnnualReports` | branchAdminApi | `0` (hardcoded) | 없음 |
| `pendingMembershipFees` | branchAdminApi | `0` (hardcoded) | 없음 |
| `recentPosts` | branchAdminApi | `0` (hardcoded) | 없음 |
| `upcomingEvents` | branchAdminApi | `0` (hardcoded) | 없음 |

**총 6개 필드가 placeholder** — UI에서는 "0"으로 표시되어 사용자 혼동 가능.

### 4-3. KPA-c 내부 중복 호출

```
KPA-c Operator (KpaOperatorDashboardPage.tsx):
├── adminApi.getDashboardStats()
│   └── pendingApprovals (kpa_applications)
└── joinRequestApi.getPending()
    └── pagination.total (kpa_organization_join_request)

→ Action Queue에서 둘 다 사용:
  - pendingTotal > 0 → '조직 가입/역할 요청'
  - pendingApprovals > 0 && !== pendingTotal → '승인 대기 건'
```

이는 **의도적 분기**: 두 테이블이 다른 승인 프로세스를 추적함.
하지만 사용자 관점에서는 혼란 가능 (두 종류의 "승인 대기"가 구분 없이 표시).

---

## 5. Action Queue / Activity Log 데이터 흐름도

### KPA-a Operator

```
Data Sources:
  operatorApi.getSummary() ─────┐
  apiClient.get('/members') ────┤
                                │
Action Queue:                   │
  pendingMembers > 0  ──────────┤→ '가입 요청 검토'
  contentCount === 0  ──────────┤→ '콘텐츠 등록 필요'
                                │
Activity Log:                   │
  content.recentItems[] ────────┤→ '콘텐츠: {title}'
  forum.recentPosts[]   ────────┤→ '포럼: {title}'
  signage.recentMedia[] ────────┘→ '사이니지: {name}'
  → sort by timestamp desc, limit 15
```

### KPA-b Operator

```
Data Sources:
  operatorApi.getSummary() ─────┐
                                │
Action Queue:                   │
  content.totalPublished === 0 ─┤→ '콘텐츠 등록 필요'
  signage.totalMedia === 0 ─────┤→ '미디어 업로드 필요'
  forum.totalPosts === 0 ───────┤→ '포럼 활성화 필요'
                                │
Activity Log:                   │
  content.recentItems[] ────────┤→ '콘텐츠 발행: {title}'
  forum.recentPosts[]   ────────┘→ '포럼 게시: {title}'
  → sort by timestamp desc
```

### KPA-b Admin

```
Data Sources:
  branchAdminApi.getDashboardStats() ──┐
                                       │
Governance Alerts:                     │
  pendingAnnualReports > 0 ────────────┤→ '신상신고 대기'
  pendingMembershipFees > 0 ───────────┤→ '연회비 미납'
  totalMembers === 0 ──────────────────┘→ '회원 없음'

  ⚠ pendingAnnualReports/Fees 항상 0 (placeholder)
  → 실질적으로 totalMembers === 0 경고만 동작
```

### KPA-c Operator

```
Data Sources:
  adminApi.getDashboardStats() ────┐ ← ❌ Admin API
  joinRequestApi.getPending() ─────┤ ← ❌ Admin scope
                                   │
Action Queue:                      │
  pendingTotal > 0 ────────────────┤→ '조직 가입/역할 요청'
  pendingApprovals > 0             │
    && !== pendingTotal ───────────┤→ '승인 대기 건'
                                   │
Activity Log:                      │
  pendingRequests[0..9] ───────────┘→ '{type_label} 요청 ({role})'
  → No external activity data, only pending requests as "log"
```

### KPA-c Admin

```
Data Sources:
  adminApi.getDashboardStats() ──┐
                                 │
Governance Alerts:               │
  pendingApprovals > 0 ──────────┤→ '승인 대기'
  totalBranches === 0 ───────────┤→ '분회 없음'
  totalMembers === 0 ────────────┘→ '회원 없음'
```

---

## 6. 핵심 발견 요약

### 구조적 문제 (수정 필요)

| # | 문제 | 심각도 | 영역 |
|---|------|--------|------|
| P1 | KPA-c Operator가 adminApi 직접 사용 | **높음** | KPA-c |
| P2 | KPA-c Operator가 joinRequestApi (admin scope) 사용 | **높음** | KPA-c |
| P3 | KPA-a Operator가 범용 `/members` API 사용 | **낮음** | KPA-a |

### 데이터 품질 문제

| # | 문제 | 심각도 |
|---|------|--------|
| D1 | 6개 placeholder 필드가 항상 0 반환 | **중간** |
| D2 | KPA-c의 두 가지 "승인 대기" 혼동 가능 | **낮음** |

### 정상 영역

| 영역 | 상태 |
|------|------|
| KPA-b Operator | ✅ operatorApi만 사용 (정상) |
| KPA-b Admin | ✅ branchAdminApi만 사용 (정상) |
| KPA-c Admin | ✅ adminApi만 사용 (정상) |

---

## 7. Phase 2 설계를 위한 권장 사항

### R1: KPA-c Operator 전용 endpoint 신설

```
GET /api/v1/kpa/operator/district-summary
Auth: kpa:operator (NOT kpa:admin)
Response: {
  stats: { branches, members, pendingApprovals, groupbuys, posts },
  pendingRequests: { total, items[] }
}
```

→ adminApi + joinRequestApi 2건 호출을 1건으로 통합
→ Operator scope에서 접근 가능하도록 분리

### R2: Placeholder 필드 정리

옵션 A: placeholder 필드를 API에서 제거하고 UI에서도 미표시
옵션 B: 실데이터 연결 (forum_post 등 기존 테이블 활용)

### R3: Adapter Layer 위치

```
services/web-kpa-society/src/adapters/
├── kpa-a-operator.adapter.ts    ← operatorApi → OperatorDashboardConfig
├── kpa-b-operator.adapter.ts    ← operatorApi → OperatorDashboardConfig
├── kpa-b-admin.adapter.ts       ← branchAdminApi → AdminDashboardConfig
├── kpa-c-operator.adapter.ts    ← NEW operator endpoint → OperatorDashboardConfig
└── kpa-c-admin.adapter.ts       ← adminApi → AdminDashboardConfig
```

현재 각 페이지의 `buildDashboardConfig()` 함수가 이미 adapter 역할을 하고 있으므로,
별도 파일 분리보다는 **backend endpoint 정리가 우선**.

---

## 8. 다음 단계 (Phase 2)

1. KPA-c Operator 전용 endpoint 계약 설계
2. Placeholder 필드 처리 방침 결정
3. Adapter 통합 vs 분리 결정
4. 변경 영향도 분석 (5-Block/4-Block config 호환성)

---

*Created: 2026-02-18*
*Status: Investigation Complete*
