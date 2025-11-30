# ACL 매트릭스 (Access Control List - Current State)

> **조사 일시**: 2025-01-08
> **목적**: 현재 구현된 권한 체계를 역할×리소스×행위 매트릭스로 정리

---

## 1. 역할 정의 (Current Roles)

| 역할 | enum 값 | 설명 | 증거 |
|------|---------|------|------|
| **SUPER_ADMIN** | `super_admin` | 최고 관리자 | User.ts:L213 |
| **ADMIN** | `admin` | 관리자 | User.ts:L213 |
| **MODERATOR** | `moderator` | 중재자 | (추정) |
| **SUPPLIER** | `supplier` | 공급자 (드롭쉬핑) | User.ts:L282 |
| **SELLER** | `seller` | 판매자 (드롭쉬핑) | User.ts:L286 |
| **PARTNER** | `partner` | 파트너 (제휴 마케터) | User.ts:L290 |
| **CUSTOMER** | `customer` | 일반 고객 | auth.ts:L149 |
| **EDITOR** | `editor` | 에디터 | (추정) |
| **SUBSCRIBER** | `subscriber` | 구독자 | UsersListClean.tsx:L200 |

---

## 2. 권한 매트릭스 (Resource × Action × Role)

### 2.1 사용자 관리 (`/users`)

| 리소스 / 행위 | anonymous | customer | subscriber | editor | moderator | seller | supplier | partner | admin | super_admin |
|---------------|:---------:|:--------:|:----------:|:------:|:---------:|:------:|:--------:|:-------:|:-----:|:-----------:|
| **GET /users** (목록) | ❌ | ❌ | ❌ | ❌ | ⏳ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **GET /users/:id** (상세) | ❌ | 본인만 | 본인만 | 본인만 | ⏳ | 본인만 | 본인만 | 본인만 | ✅ | ✅ |
| **GET /users/me** (내 정보) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **POST /users** (생성) | ❌ | ❌ | ❌ | ❌ | ⏳ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **PATCH /users/:id** (수정) | ❌ | 본인만 | 본인만 | 본인만 | ⏳ | 본인만 | 본인만 | 본인만 | ✅ | ✅ |
| **DELETE /users/:id** (삭제) | ❌ | ❌ | ❌ | ❌ | ⏳ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **PATCH /users/:id (역할 변경)** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

**증거**:
- `apps/api-server/src/routes/auth.ts:L215, L234` (authenticate 미들웨어)
- `apps/admin-dashboard/src/pages/users/UsersListClean.tsx:L92, L292, L333`

**현황**:
- ✅ **인증 체크**: `authenticate` 미들웨어 사용
- ⏳ **역할 체크**: 세분화된 역할 권한 **미확인**
- ❌ **컨트롤러 내부 체크**: 미들웨어가 아닌 컨트롤러에서 처리 추정

---

### 2.2 인증 (`/auth`)

| 리소스 / 행위 | anonymous | authenticated |
|---------------|:---------:|:-------------:|
| **POST /auth/login** | ✅ | ✅ |
| **POST /auth/signup** | ✅ | ✅ |
| **POST /auth/register** | ✅ | ✅ |
| **GET /auth/verify** | ❌ | ✅ |
| **POST /auth/logout** | ❌ | ✅ |
| **GET /auth/status** | ❌ | ✅ |

**증거**: `apps/api-server/src/routes/auth.ts`

---

### 2.3 드롭쉬핑 - 공급자 관리 (`/admin/suppliers`)

| 리소스 / 행위 | anonymous | customer | supplier | seller | partner | admin |
|---------------|:---------:|:--------:|:--------:|:------:|:-------:|:-----:|
| **GET /admin/suppliers** (목록) | ❌ | ❌ | 본인만 | ❌ | ❌ | ✅ |
| **GET /admin/suppliers/:id** (상세) | ❌ | ❌ | 본인만 | ❌ | ❌ | ✅ |
| **POST /suppliers/apply** (신청) | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| **POST /admin/suppliers/:id/approve** (승인) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **POST /admin/suppliers/:id/reject** (거부) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**증거**:
- `apps/api-server/src/routes/admin/suppliers.routes.ts` (추정)
- `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx:L126`

**확인 필요**:
- [ ] 신청 API 경로 및 권한
- [ ] 공급자가 자신의 정보 조회 가능 여부
- [ ] 승인/거부 권한 (admin vs moderator)

---

### 2.4 드롭쉬핑 - 판매자 관리 (`/admin/sellers`)

| 리소스 / 행위 | anonymous | customer | supplier | seller | partner | admin |
|---------------|:---------:|:--------:|:--------:|:------:|:-------:|:-----:|
| **GET /admin/sellers** (목록) | ❌ | ❌ | ❌ | 본인만 | ❌ | ✅ |
| **GET /admin/sellers/:id** (상세) | ❌ | ❌ | ❌ | 본인만 | ❌ | ✅ |
| **POST /sellers/apply** (신청) | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| **POST /admin/sellers/:id/approve** (승인) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**증거**: `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx:L127`

---

### 2.5 드롭쉬핑 - 파트너 관리 (`/admin/partners`)

| 리소스 / 행위 | anonymous | customer | supplier | seller | partner | admin |
|---------------|:---------:|:--------:|:--------:|:------:|:-------:|:-----:|
| **GET /admin/partners** (목록) | ❌ | ❌ | ❌ | ❌ | 본인만 | ✅ |
| **GET /admin/partners/:id** (상세) | ❌ | ❌ | ❌ | ❌ | 본인만 | ✅ |
| **POST /partners/apply** (신청) | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| **POST /admin/partners/:id/approve** (승인) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**증거**: `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx:L128`

---

### 2.6 승인 관리 (`/dropshipping/approvals`)

| 리소스 / 행위 | anonymous | customer | supplier | seller | partner | admin |
|---------------|:---------:|:--------:|:--------:|:------:|:-------:|:-----:|
| **GET /dropshipping/approvals** (승인 대기 목록) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **POST /approvals/:id/approve** (승인) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **POST /approvals/:id/reject** (거부) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**증거**: `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx:L129`

---

## 3. 관리자 권한 (Admin Permissions)

### 3.1 하드코딩된 전체 권한 목록
**증거** (User.ts:L221-237):
```typescript
// Legacy admin users get ALL permissions
const allPermissions = [
  // Users
  'users.view', 'users.create', 'users.edit', 'users.delete', 'users.suspend', 'users.approve',
  // Content
  'content.view', 'content.create', 'content.edit', 'content.delete', 'content.publish', 'content.moderate',
  // Categories & Tags
  'categories:write', 'categories:read', 'tags:write', 'tags:read',
  // Admin
  'admin.settings', 'admin.analytics', 'admin.logs', 'admin.backup',
  // ACF
  'acf.manage',
  // CPT
  'cpt.manage',
  // Shortcodes
  'shortcodes.manage',
  // API
  'api.access', 'api.admin'
];
```

**현황**:
- ❌ **하드코딩**: 권한 목록이 User 엔티티에 직접 작성됨
- ❌ **유지보수 어려움**: 권한 추가 시 코드 수정 필요
- ❌ **역할별 세분화 부재**: admin과 super_admin이 동일 권한

---

## 4. 메뉴 접근 제어 (Frontend)

### 4.1 메뉴 가시성
**증거** (`apps/admin-dashboard/src/components/layout/AdminSidebar.tsx:L23-24`):
```typescript
const { menuItems, isLoading: menuLoading } = useAdminMenu()
```

**`useAdminMenu` Hook** (추정):
```typescript
// apps/admin-dashboard/src/hooks/useAdminMenu.ts
export function useAdminMenu() {
  const { user } = useAuth();

  // 역할 기반 메뉴 필터링
  const menuItems = useMemo(() => {
    return wordpressMenuItems.filter(item => {
      if (item.requiredRole) {
        return user?.role === item.requiredRole || user?.isAdmin;
      }
      return true;
    });
  }, [user]);

  return { menuItems };
}
```

**현황**:
- ⏳ **역할 기반 필터링**: 존재 여부 **미확인**
- ⏳ **권한 기반 필터링**: 세분화된 권한 체크 **미확인**
- ❌ **보안 취약**: FE 필터링만으로는 불충분 (API 권한 체크 필수)

---

## 5. 격차 요약 (ACL)

| 항목 | 현재 상태 | 목표 | 격차 |
|------|----------|------|------|
| **역할 체크** | 단순 role 비교 | 세분화된 permission 체크 | ⚠️ High |
| **권한 정의** | User 엔티티에 하드코딩 | Permission 테이블 + 관리 UI | ⚠️ High |
| **미들웨어** | authenticate만 존재 | authorize(permission) 미들웨어 | ⚠️ Medium |
| **FE 메뉴 필터** | 역할 기반 (추정) | 권한 기반 + 서버 검증 | ⏳ 미확인 |
| **드롭쉬핑 ACL** | 별도 구현 (추정) | 통일된 ACL 체계 | ⚠️ High |

---

## 6. 주요 발견사항

### 6.1 관리자 권한 하드코딩
- ❌ **User.ts에 직접 작성**: getAllPermissions() 메소드 내부
- ❌ **DB 미사용**: Permission 테이블 없음 (추정)
- ❌ **UI 없음**: 권한 관리 화면 부재

### 6.2 역할 vs 권한
- ✅ **역할 기반**: hasRole() 메소드 존재
- ✅ **권한 기반**: hasPermission() 메소드 존재
- ❌ **실제 사용**: API에서 권한 체크 미사용 (추정)

### 6.3 드롭쉬핑 ACL 불명확
- ⏳ **신청 API**: 경로 및 권한 미확인
- ⏳ **본인 정보 조회**: 가능 여부 미확인
- ⏳ **승인 권한**: admin만 가능한지 moderator도 가능한지 미확인

---

## 7. 다음 단계

1. ✅ 격차 분석 (`06_gap_analysis.md`)
2. ⏳ 추천사항 정리 (`07_recommendations_preV2.md`)

---

**작성**: Claude Code
**검증**: ⏳ Pending
