# FE 현황 조사 (Frontend Inventory - Current State)

> **조사 일시**: 2025-01-08
> **목적**: 프론트엔드의 현재 사용자 관리 구조 파악 (라우팅, 메뉴, Auth 상태관리, 화면 구성)

---

## 1. 라우팅 구조 (React Router)

### 1.1 메인 라우팅 파일
**위치**: `apps/admin-dashboard/src/App.tsx`

**증거**:
```typescript
// L40-42: User 관련 페이지 Lazy Load
const UsersPage = lazy(() => import('@/pages/users'));
const UserForm = lazy(() => import('@/pages/users/UserForm'));
const UserDetail = lazy(() => import('@/pages/users/UserDetail'));
const RoleManagement = lazy(() => import('@/pages/users/RoleManagement'));
const UserStatistics = lazy(() => import('@/pages/users/UserStatistics'));
```

### 1.2 사용자 관리 라우트 (단일 메뉴 구조)

| 라우트 | 컴포넌트 | 설명 | 역할 분리 |
|--------|----------|------|----------|
| `/users` | `UsersPage` | 모든 사용자 목록 | ❌ 단일 화면 |
| `/users/new` | `UserForm` | 새 사용자 추가 | ❌ 공통 폼 |
| `/users/:id` | `UserDetail` | 사용자 상세 | ❌ 공통 상세 |
| `/users/roles` | `RoleManagement` | 역할 관리 | ❌ 단일 관리 |
| `/users/profile` | 프로필 | 현재 사용자 프로필 | ❌ 공통 프로필 |
| `/users/statistics` | `UserStatistics` | 사용자 통계 | ❌ 통합 통계 |

**현황**:
- ✅ 모든 역할이 **단일 `/users` 경로** 아래 통합
- ❌ 공급자/판매자/파트너 **전용 라우트 없음**
- ❌ 역할별 **분리된 메뉴 없음**

---

## 2. 메뉴 구조 (AdminSidebar)

### 2.1 메뉴 정의 파일
**위치**: `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx`

**증거** (L100-111):
```typescript
{
  id: 'users',
  label: '사용자',
  icon: <Users className="w-5 h-5" />,
  children: [
    { id: 'users-all', label: '모든 사용자', path: '/users' },
    { id: 'users-new', label: '새로 추가', path: '/users/new' },
    { id: 'users-profile', label: '프로필', path: '/users/profile' },
    { id: 'users-roles', label: '역할 관리', path: '/users/roles' },
    { id: 'users-statistics', label: '사용자 통계', path: '/users/statistics' }
  ]
}
```

**드롭쉬핑 메뉴** (L120-132):
```typescript
{
  id: 'dropshipping',
  label: '드롭쉬핑',
  children: [
    { id: 'ds-products', label: '상품 관리', path: '/dropshipping/products' },
    { id: 'ds-suppliers', label: '공급자', path: '/dropshipping/suppliers' },
    { id: 'ds-sellers', label: '판매자', path: '/dropshipping/sellers' },
    { id: 'ds-partners', label: '파트너', path: '/dropshipping/partners' },
    { id: 'ds-approvals', label: '승인 관리', path: '/dropshipping/approvals' },
    ...
  ]
}
```

### 2.2 메뉴 렌더링
**위치**: `apps/admin-dashboard/src/components/layout/AdminSidebar.tsx`

**증거** (L23-24):
```typescript
// Get menu items with role-based filtering automatically handled
const { menuItems, isLoading: menuLoading } = useAdminMenu()
```

**현황**:
- ✅ **"사용자"** 메뉴: 단일 메뉴로 모든 역할 통합 관리
- ✅ **"드롭쉬핑"** 메뉴: 공급자/판매자/파트너가 **별도 서브메뉴로 분리**되어 있음
- ⚠️ **모순**: 드롭쉬핑 메뉴는 역할별로 분리되어 있으나, **사용자 메뉴는 통합**

---

## 3. 사용자 목록 화면 (UsersListClean)

### 3.1 사용자 목록 컴포넌트
**위치**: `apps/admin-dashboard/src/pages/users/UsersListClean.tsx`

**증거** (L21-32):
```typescript
interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;  // ← 단일 role 필드
  posts: number;
  registeredDate: string;
  lastLogin?: string;
  status: 'active' | 'inactive' | 'pending';
  avatar?: string;
}
```

### 3.2 역할 필터링 (탭 방식)
**증거** (L44-47):
```typescript
const [activeTab, setActiveTab] = useState<'all' | 'administrator' | 'editor' | 'subscriber'>(() => {
  const saved = sessionStorage.getItem('users-active-tab');
  return (saved as any) || 'all';
});
```

**역할 카운트** (L195-202):
```typescript
const getCounts = () => {
  return {
    all: users.length,
    administrator: users.filter(u => u.role === 'administrator').length,
    editor: users.filter(u => u.role === 'editor').length,
    subscriber: users.filter(u => u.role === 'subscriber').length
  };
};
```

**현황**:
- ✅ 역할 필터링: **탭으로 구현** (all, administrator, editor, subscriber)
- ❌ **supplier, seller, partner** 탭 없음
- ❌ 역할별 **전용 컬럼/필드 없음** (모두 공통 테이블)
- ❌ 역할별 **대시보드 링크 없음**

### 3.3 Bulk Actions (일괄 작업)
**증거** (L254-273):
```typescript
else if (selectedBulkAction === 'change-role') {
  const newRole = prompt('Enter new role (administrator, editor, subscriber):');
  await Promise.all(
    Array.from(selectedUsers).map(id =>
      authClient.api.patch(`/users/${id}`, { role: newRole })
    )
  );
}
```

**현황**:
- ✅ 역할 변경: **프롬프트로 직접 입력** (UI 부재)
- ❌ 역할 검증 로직 **없음**
- ❌ 역할별 **제약 조건 없음** (누구나 아무 역할로 변경 가능)

---

## 4. Auth 상태관리

### 4.1 AuthProvider
**위치**: `packages/auth-context/src/AuthProvider.tsx`

**증거** (L19-35):
```typescript
const getInitialState = () => {
  const stored = localStorage.getItem('admin-auth-storage');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.state && parsed.state.user) {
      return parsed.state.user;  // ← 단일 user 객체
    }
  }
  return null;
};
```

**Login 처리** (L94-132):
```typescript
const login = async (credentials: { email: string; password: string }) => {
  const response = await authClient.login(credentials);
  setUser(response.user);  // ← 단일 user

  localStorage.setItem('accessToken', response.token);
  localStorage.setItem('admin-auth-storage', JSON.stringify({
    state: { user: response.user, token: response.token }
  }));
}
```

**isAdmin 체크** (L171):
```typescript
isAdmin: user?.role === 'admin',  // ← 단일 role 체크
```

**현황**:
- ✅ User 객체: **단일 구조**
- ✅ 역할 확인: `user.role` (단일 필드)
- ❌ **다중 역할 지원 없음** (activeRole, roles 배열 미사용)
- ❌ **역할 전환 UI 없음**

### 4.2 Admin Protected Route
**위치**: `packages/auth-context/src/AdminProtectedRoute.tsx`

**권한 체크 예시**:
```typescript
// Simplified check (actual implementation may vary)
if (!user || user.role !== 'admin') {
  return <Navigate to="/login" />;
}
```

**현황**:
- ✅ 권한 체크: **단순 role 비교**
- ❌ **세분화된 권한 체크 없음**
- ❌ **역할별 리다이렉트 없음**

---

## 5. 사용자 폼 (등록/수정)

### 5.1 예상 구조 (미확인)
> **파일**: `apps/admin-dashboard/src/pages/users/UserForm.tsx` (미조사)

**추정**:
- 공통 폼으로 모든 역할 처리
- 역할 선택: 드롭다운
- 역할별 특화 필드: JSON 또는 조건부 표시

**확인 필요**:
- [ ] 역할 선택 UI
- [ ] 역할별 필드 표시 로직
- [ ] businessInfo 입력 UI
- [ ] 승인/거부 UI

---

## 6. 역할별 대시보드 연결 (드롭쉬핑)

### 6.1 별도 라우트 존재
**위치**: `apps/admin-dashboard/src/pages/dropshipping/`

**증거**:
- `/dropshipping/suppliers` - 공급자 목록
- `/dropshipping/sellers` - 판매자 목록
- `/dropshipping/partners` - 파트너 목록

**현황**:
- ✅ **드롭쉬핑 역할**: 별도 관리 화면 **존재**
- ❌ **사용자 메뉴와 통합되지 않음**
- ❌ **사용자 목록에서 직접 이동 불가**

---

## 7. 격차 요약 (FE)

| 항목 | 현재 상태 | 목표 (역할 분리형) | 격차 |
|------|----------|-------------------|------|
| **라우팅** | 단일 `/users` | 역할별 `/suppliers`, `/sellers` 등 | ⚠️ High |
| **메뉴** | 단일 "사용자" 메뉴 | 역할별 메뉴 (공급자, 판매자, 파트너) | ⚠️ High |
| **목록 화면** | 통합 테이블 + 탭 | 역할별 전용 목록 (컬럼/필터/액션 다름) | ⚠️ High |
| **폼 화면** | 공통 폼 (추정) | 역할별 전용 폼 (필드 세트 다름) | ⚠️ Medium |
| **Auth 상태** | 단일 role | activeRole + roles[] | ⚠️ Medium |
| **권한 체크** | 단순 role 비교 | 세분화된 permission 체크 | ⚠️ Medium |
| **대시보드 연결** | 없음 | 역할별 대시보드 링크 | ⚠️ High |

---

## 8. 주요 발견사항

### 8.1 일관성 부재
1. **드롭쉬핑 메뉴**: 역할별로 **분리**되어 있음 (`공급자`, `판매자`, `파트너` 서브메뉴)
2. **사용자 메뉴**: 모든 역할이 **통합**되어 있음 (단일 `사용자` 메뉴)
3. **모순**: 같은 시스템 내에서 **두 가지 접근 방식** 혼재

### 8.2 단일 사용자 관리의 고착 위치
- ✅ **라우팅**: `apps/admin-dashboard/src/App.tsx:L40-44`
- ✅ **메뉴**: `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx:L100-111`
- ✅ **목록 화면**: `apps/admin-dashboard/src/pages/users/UsersListClean.tsx`
- ✅ **Auth 상태**: `packages/auth-context/src/AuthProvider.tsx:L171`

### 8.3 역할 전환 미지원
- FE에서 `activeRole` 개념 **미사용**
- 역할 전환 UI **없음**
- 다중 역할 사용자 **처리 불가**

---

## 9. 다음 단계

1. ✅ API 엔드포인트 조사 (`02_inventory_api_current.md`)
2. ✅ DB 스키마 조사 (`03_schema_current.md`)
3. ⏳ 흐름 다이어그램 작성 (`04_flows_current.md`)
4. ⏳ ACL 매트릭스 작성 (`05_acl_matrix_current.md`)

---

**작성**: Claude Code
**검증**: ⏳ Pending
