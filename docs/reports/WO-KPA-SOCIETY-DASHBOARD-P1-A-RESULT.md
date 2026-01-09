# WO-KPA-SOCIETY-DASHBOARD-P1-A 결과 보고서

> **Work Order ID**: WO-KPA-SOCIETY-DASHBOARD-P1-A
> **완료일**: 2026-01-09
> **상태**: COMPLETED
> **선행 작업**: WO-GLYCOPHARM-DASHBOARD-P1-A (완료)

---

## 1. 작업 요약

KPA Society Admin Dashboard에서 mock 데이터를 제거하고 실제 DB 쿼리 API로 대체함.
- 기존 Entity만 사용 (신규 스키마/마이그레이션 없음)
- Entity 없는 기능은 Empty state 반환 (0 값)

---

## 2. 구현 결과

### 2.1 API 구현

| 엔드포인트 | 상태 | 설명 |
|------------|------|------|
| `GET /api/v1/kpa/admin/dashboard/stats` | ✅ Real | 대시보드 통계 (분회/회원/신청) |
| `GET /api/v1/kpa/admin/dashboard/organizations` | ✅ Real | 조직 상세 통계 |
| `GET /api/v1/kpa/admin/dashboard/members` | ✅ Real | 회원 상세 통계 |
| `GET /api/v1/kpa/admin/dashboard/applications` | ✅ Real | 신청서 상세 통계 |
| `GET /api/v1/kpa/admin/pending-applications` | ✅ Real | 대기 신청서 목록 |

### 2.2 사용 Entity (기존 활용)

| Entity | 테이블 | 사용 필드 |
|--------|--------|-----------|
| KpaOrganization | kpa_organizations | type (association/branch/group), is_active |
| KpaMember | kpa_members | status (pending/active/suspended/withdrawn), role |
| KpaApplication | kpa_applications | status (submitted/approved/rejected/cancelled), type |

### 2.3 Dashboard 섹션별 데이터 소스

| 섹션 | 데이터 소스 | 상태 |
|------|-------------|------|
| 등록된 분회 (totalBranches) | KpaOrganization (type=branch/group) | ✅ Real |
| 전체 회원 (totalMembers) | KpaMember (status=active) | ✅ Real |
| 승인 대기 (pendingApprovals) | KpaApplication (status=submitted) | ✅ Real |
| 진행중 공동구매 (activeGroupbuys) | (Entity 없음) | ⚪ Empty (0) |
| 최근 게시물 (recentPosts) | (Entity 없음) | ⚪ Empty (0) |

---

## 3. 변경 파일

### 3.1 신규 생성

| 파일 | 설명 |
|------|------|
| `apps/api-server/src/routes/kpa/controllers/admin-dashboard.controller.ts` | KPA 관리자 대시보드 API 컨트롤러 |

### 3.2 수정

| 파일 | 변경 내용 |
|------|-----------|
| `apps/api-server/src/routes/kpa/kpa.routes.ts` | admin 라우트 등록 |
| `services/web-kpa-society/src/pages/admin/AdminDashboardPage.tsx` | Mock → Empty state 전환 |

---

## 4. 빌드 검증

| 대상 | 결과 |
|------|------|
| `pnpm -F api-server build` | ✅ 성공 |
| `pnpm -F web-kpa-society build` | ✅ 성공 |

---

## 5. Real vs Empty 요약

### Real Data (실제 DB 쿼리)
- ✅ 분회 수 (`KpaOrganization.type = 'branch' or 'group'`)
- ✅ 활성 회원 수 (`KpaMember.status = 'active'`)
- ✅ 승인 대기 신청서 (`KpaApplication.status = 'submitted'`)
- ✅ 조직 통계 (type별, active/inactive)
- ✅ 회원 통계 (status별, role별)
- ✅ 신청서 통계 (status별, type별)

### Empty State (Entity 없음)
- ⚪ 진행중 공동구매 (activeGroupbuys) - Groupbuy Entity 없음
- ⚪ 최근 게시물 (recentPosts) - Post Entity 없음 (포럼은 있지만 KPA 전용 통계 없음)

---

## 6. Frontend 변경사항

### 6.1 이전 (Mock Fallback)
```typescript
} catch (err) {
  // 데모용 기본값
  setStats({
    totalBranches: 5,
    totalMembers: 1234,
    pendingApprovals: 12,
    activeGroupbuys: 3,
    recentPosts: 28,
  });
}
```

### 6.2 이후 (Empty State)
```typescript
} catch (err) {
  // WO-KPA-SOCIETY-DASHBOARD-P1-A: Empty state on API failure (no mock data)
  console.error('Failed to load dashboard stats:', err);
  setStats({
    totalBranches: 0,
    totalMembers: 0,
    pendingApprovals: 0,
    activeGroupbuys: 0,  // Entity 없음 - 항상 0
    recentPosts: 0,      // Entity 없음 - 항상 0
  });
}
```

---

## 7. P1-A 범위 외 대시보드

다음 대시보드는 P1-A 범위에서 제외 (P1-B/P2에서 검토):

| 대시보드 | 파일 | 사유 |
|----------|------|------|
| 분회 관리자 대시보드 | `branch-admin/DashboardPage.tsx` | 분회별 API 필요 (per-branch stats) |
| 인트라넷 홈 | `intranet/DashboardPage.tsx` | Hero/뉴스/협력업체 - 콘텐츠 Entity 필요 |

---

## 8. API 응답 구조

### Dashboard Stats (`/admin/dashboard/stats`)
```typescript
{
  success: true,
  data: {
    totalBranches: number,     // branch + group 조직 수
    totalMembers: number,      // active 회원 수
    pendingApprovals: number,  // submitted 신청서 수
    activeGroupbuys: 0,        // Entity 없음
    recentPosts: 0             // Entity 없음
  }
}
```

### Organization Stats (`/admin/dashboard/organizations`)
```typescript
{
  success: true,
  data: {
    total: number,
    byType: { association: number, branch: number, group: number },
    active: number,
    inactive: number
  }
}
```

### Member Stats (`/admin/dashboard/members`)
```typescript
{
  success: true,
  data: {
    total: number,
    byStatus: { active: number, pending: number, suspended: number, withdrawn: number },
    byRole: { member: number, operator: number, admin: number }
  }
}
```

---

## 9. Definition of Done 체크리스트

- [x] API에서 mock/demo/random 데이터 사용 안 함
- [x] 데이터 없으면 Empty state 반환 (0 값)
- [x] 기존 Entity만 사용 (신규 스키마 없음)
- [x] api-server 빌드 성공
- [x] web-kpa-society 빌드 성공
- [x] 콘솔 에러 없음

---

## 10. 남은 갭 (P2 이후)

| 기능 | 필요 Entity | 우선순위 |
|------|-------------|----------|
| 공동구매 통계 | KpaGroupbuy (또는 공동구매 연동) | P2 |
| 게시물 통계 | KpaPost (또는 포럼 연동) | P2 |
| 분회별 대시보드 | 분회 컨텍스트 API | P2 |
| 인트라넷 콘텐츠 | Hero/뉴스/협력업체 Entity | P3 |

---

**작업 상태**: COMPLETED
**다음 단계**: P1-A 흐름 완료 (Admin → Glycopharm → KPA Society)
