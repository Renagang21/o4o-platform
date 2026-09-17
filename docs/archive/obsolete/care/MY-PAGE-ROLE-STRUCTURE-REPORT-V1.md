# MY-PAGE-ROLE-STRUCTURE-REPORT-V1

> **WO-MY-PAGE-ROLE-STRUCTURE-INVESTIGATION-V1**
> 작성일: 2026-02-20
> 상태: 조사 완료 (수정 제안 없음)

---

## A. 역할 정의 (Role Definitions)

### A-1. 백엔드 레거시 역할 (UserRole enum)

| Enum 값 | 설명 | 상태 |
|---------|------|------|
| `SUPER_ADMIN` | 최고 관리자 | Deprecated (P0 RBAC 전환 중) |
| `ADMIN` | 플랫폼 관리자 | Deprecated |
| `VENDOR` | 벤더 | Deprecated |
| `SELLER` | 판매자 | Deprecated |
| `USER` | 일반 사용자 | Deprecated |
| `BUSINESS` | 사업자 | Deprecated |
| `PARTNER` | 제휴 파트너 | Deprecated |
| `SUPPLIER` | 공급자 | Deprecated |
| `MANAGER` | 매니저 | Deprecated |
| `CUSTOMER` | 고객 | Deprecated (→ USER) |

**파일**: `apps/api-server/src/types/auth.ts`

### A-2. 신규 서비스 프리픽스 역할 (P0 RBAC)

서비스별 `service:role` 포맷으로 마이그레이션 중.

**Platform 역할:**

| 역할 | 설명 |
|------|------|
| `platform:super_admin` | 최고 관리자 (크로스 서비스) |
| `platform:admin` | 플랫폼 관리자 |
| `platform:operator` | 플랫폼 운영자 |
| `platform:manager` | 플랫폼 매니저 |
| `platform:vendor` | 플랫폼 벤더 |
| `platform:member` | 플랫폼 회원 |
| `platform:contributor` | 플랫폼 기여자 |

**KPA 역할:**

| 역할 | 설명 |
|------|------|
| `kpa:admin` | KPA 관리자 |
| `kpa:operator` | KPA 운영자 |
| `kpa:district_admin` | 지부 관리자 |
| `kpa:branch_admin` | 분회 관리자 |
| `kpa:branch_operator` | 분회 운영자 |
| `kpa:pharmacist` | 약사/회원 |

**파일**: `apps/api-server/src/types/roles.ts`

### A-3. RoleAssignment 테이블 (P0 RBAC Source of Truth)

```
role_assignments
├── id (uuid PK)
├── user_id (uuid FK → users)
├── role (varchar) — 'admin', 'supplier', 'kpa:admin' 등
├── is_active (boolean)
├── valid_from (timestamp)
├── valid_until (timestamp, nullable)
├── assigned_at (timestamp)
└── assigned_by (uuid, nullable)
```

**파일**: `apps/api-server/src/modules/auth/entities/RoleAssignment.ts`

### A-4. JWT Payload 구조

```typescript
AccessTokenPayload {
  userId?: string;
  id?: string;
  email?: string;
  role?: UserRole | string;       // 레거시 단일 역할
  roles?: string[];               // P1: 복수 역할 배열
  scopes?: string[];              // 서비스 스코프
  name?: string;
  status?: UserStatus | string;
  tokenType?: 'user' | 'service' | 'guest';
  serviceId?: string;
  storeId?: string;
  iat?: number;
  exp?: number;
}
```

**파일**: `apps/api-server/src/types/auth.ts`

---

## B. 프론트엔드 활성 역할 목록 

### B-1. UserRole 타입

```typescript
type UserRole = 'admin' | 'pharmacy' | 'supplier' | 'partner' | 'operator' | 'consumer';
```

### B-2. API → Web 역할 매핑

| API 역할 | Web 역할 | 비고 |
|----------|----------|------|
| `seller` | `pharmacy` | Seller → Pharmacy 통합 |
| `customer` | `pharmacy` | Customer → Pharmacy 통합 |
| `user` | `pharmacy` | 일반 User → Pharmacy |
| `admin` | `operator` | Admin → Operator 매핑 |
| `super_admin` | `operator` | Super Admin → Operator 매핑 |
| `supplier` | `supplier` | 공급자 유지 |
| `partner` | `partner` | 파트너 유지 |
| (기타) | `consumer` | 기본값 |

### B-3. 역할별 기본 라우트

| 역할 | 기본 경로 | 컴포넌트 |
|------|----------|---------|
| `pharmacy` | `/` | CareDashboardPage |
| `admin` | `/admin` | — |
| `operator` | `/operator` | — |
| `partner` | `/partner` | PartnerIndex |
| `supplier` | `/supplier` | RoleNotAvailablePage |
| `consumer` | `/` | HomePage |

### B-4. 역할 라벨/아이콘

| 역할 | 라벨 | 아이콘 |
|------|------|-------|
| `admin` | 관리자 | 👑 |
| `pharmacy` | 약국 (💊) / 약사 (MyPage) | 💊 |
| `supplier` | 공급자 | 📦 |
| `partner` | 파트너 | 🤝 |
| `operator` | 운영자 | 🛡️ |
| `consumer` | 소비자 | 👤 |

---

## C. My Page 구현 현황

### C-1. 라우트

```
/mypage → ProtectedRoute (allowedRoles 미지정 = 인증만 필요) → MyPage
```

- **Layout**: MainLayout (Header + Footer, 사이드바 없음)
- **보호**: 인증 필수, 역할 제한 없음 (모든 인증 사용자 접근 가능)

### C-2. 화면 구성

```
┌─────────────────────────────────────┐
│ 마이페이지 (제목)                      │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │ Gradient Header (primary→accent) │ │
│ │   ┌──────┐                      │ │
│ │   │Avatar│ + 📷 버튼             │ │
│ │   └──────┘                      │ │
│ ├─────────────────────────────────┤ │
│ │ 이름                             │ │
│ │ 역할 라벨 + 상태 뱃지             │ │
│ │                    [편집 버튼]    │ │
│ ├─────────────────────────────────┤ │
│ │ 📧 이메일: user.email (읽기전용)  │ │
│ │ 👤 이름: user.name (편집 가능)    │ │
│ │ 📞 연락처: user.phone (편집 가능) │ │
│ │ 🏢 역할: roleLabels[roles[0]]   │ │
│ │ 🛡️ 상태: statusLabels[status]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 보안 설정                        │ │
│ │  비밀번호 변경 (미구현)           │ │
│ │  2단계 인증 (미구현)             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 계정 관리                        │ │
│ │  알림 설정 (미구현)              │ │
│ │  계정 탈퇴 (미구현)              │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### C-3. 구현 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 프로필 표시 | ✅ 구현됨 | 이름, 이메일, 연락처, 역할, 상태 |
| 편집 모드 전환 | ✅ UI만 | 이름/연락처 input 전환 |
| 저장 API 호출 | ❌ TODO | `handleSave()` 빈 구현 |
| 프로필 사진 업로드 | ❌ 미구현 | 카메라 버튼 UI만 |
| 비밀번호 변경 | ❌ 미구현 | 버튼 UI만 |
| 2FA 설정 | ❌ 미구현 | 버튼 UI만 |
| 알림 설정 | ❌ 미구현 | 버튼 UI만 |
| 계정 탈퇴 | ❌ 미구현 | 버튼 UI만 |

---

## D. 역할별 My Page 차이

**결론: 차이 없음.**

My Page는 `useAuth().user` 데이터만 표시하며, 역할별 분기가 없다.

| 항목 | pharmacy | admin | operator | partner | supplier | consumer |
|------|----------|-------|----------|---------|----------|----------|
| 화면 레이아웃 | 동일 | 동일 | 동일 | 동일 | 동일 | 동일 |
| 표시 필드 | 동일 | 동일 | 동일 | 동일 | 동일 | 동일 |
| 편집 가능 필드 | 이름,연락처 | 이름,연락처 | 이름,연락처 | 이름,연락처 | 이름,연락처 | 이름,연락처 |
| 역할 라벨 | 약사 | (없음)* | 운영자 | 파트너 | 공급자 | 소비자 |

*`admin`은 `roleLabels`에 정의되지 않음 → `undefined` 표시

### D-1. roleLabels 매핑 누락

```typescript
const roleLabels: Record<string, string> = {
  pharmacy: '약사',
  supplier: '공급자',
  partner: '파트너',
  operator: '운영자',
  consumer: '소비자',
  // ❌ 'admin' 누락 → admin 역할 사용자는 역할 라벨이 표시되지 않음
};
```

실제로는 API→Web 매핑에서 `admin` → `operator`로 변환되므로, Web에서 `admin` 역할은 나타나지 않는다.
그러나 `UserRole` 타입에는 `admin`이 정의되어 있어 이론적 불일치가 존재한다.

---

## E. 약국(Pharmacy) 조직 구조와 사용자 관계

### E-1. 엔티티 관계 다이어그램

```
USERS (auth-core)
  │
  ├── 1:N → ROLE_ASSIGNMENTS (P0 RBAC)
  │          └── userId, role, isActive
  │
  ├── 1:N → KPA_MEMBERS (조직 소속)
  │          └── userId, organizationId, role, status
  │
  ├── 1:N → KPA_PHARMACY_REQUESTS (약국 신청)
  │          └── userId, pharmacy_name, status
                               ├── 1:1 (PK 공유) → KPA_ORGANIZATIONS
                               │                    └── name, type, parent_id (계층)
                               ├── 1:N → CARE_KPI_SNAPSHOTS (pharmacy_id)
                               │
                               ├── 1:N → CARE_COACHING_SESSIONS (pharmacy_id)
                               │
                               └── 1:N → TABLET_SERVICE_REQUESTS (pharmacy_id)
```

### E-2. User → Pharmacy 관계

| 필드 | 테이블 | 연결 방식 |
|------|--------|----------|
| `created_by_user_id` | — | UUID soft FK (정식 FK 아님) |
| `user_id` | glucoseview_pharmacies | UUID soft FK |
| `user_id` | kpa_members | UUID FK → users |

**약국 조회 방식 (Care 모듈)**:
```sql
WHERE created_by_user_id = $userId AND status = 'active'
LIMIT 1
```

**파일**: `apps/api-server/src/modules/care/care-pharmacy-context.middleware.ts`

### E-3. Pharmacy 엔티티 주요 필드

```
├── id (uuid PK, KPA_ORGANIZATIONS.id와 공유)
├── name (varchar)
├── code (varchar, unique)
├── business_number (varchar, unique)
├── slug (varchar, nullable, unique)
├── status ('active' | 'inactive' | 'suspended')
├── created_by_user_id (uuid)
├── created_by_user_name (varchar)
├── enabled_services (jsonb [])
├── template_profile ('BASIC' | 'COMMERCE_FOCUS' | 'CONTENT_FOCUS' | 'MINIMAL')
├── storefront_config (jsonb)
├── storefront_blocks (jsonb, Block Engine V1)
├── created_at, updated_at
└── organization (1:1 KpaOrganization, PK 공유)
```

### E-4. KPA 조직 계층

```
KPA_ORGANIZATIONS
├── type: 'association' (본회)
│   └── type: 'branch' (지부/분회)
│       └── type: 'group' (그룹)
```

- `parent_id`로 자기 참조 트리 구성

### E-5. User 엔티티의 약사 관련 필드

| 필드 | 설명 | 예시 |
|------|------|------|
| `pharmacistFunction` | 업무 분류 | pharmacy, hospital, industry, other |
| `pharmacistRole` | 직무 분류 | general, pharmacy_owner, hospital, other |
| `serviceKey` | 서비스 격리 키 | kpa 등 |

---

## F. Admin vs Operator 차이

### F-1. 라우트 접근 범위

| 영역 | Admin (`/admin`) | Operator (`/operator`) |
|------|-----------------|----------------------|
| 대시보드 | — | — |
| 약국 네트워크 | ✅ `/admin/pharmacies` | ❌ |
| 회원 관리 | ✅ `/admin/users` | ❌ |
| 설정 | ✅ `/admin/settings` | ❌ |
| 신청 관리 | ❌ | ✅ `/operator/applications` |
| 상품 관리 | ❌ | ✅ `/operator/products` |
| 주문 관리 | ❌ | ✅ `/operator/orders` |
| 재고/공급 | ❌ | ✅ `/operator/supply` |
| 정산 관리 | ❌ | ✅ `/operator/settlements` |
| 분석/리포트 | ❌ | ✅ `/operator/analytics` |
| 빌링 | ❌ | ✅ `/operator/billing-*` |
| 마케팅 | ❌ | ✅ `/operator/marketing` |
| 포럼 관리 | ❌ | ✅ `/operator/forums-*` |
| 콘텐츠 허브 | ❌ | ✅ `/operator/content-hub` |
| 고객 지원 | ❌ | ✅ `/operator/support` |
| AI 리포트 | ❌ | ✅ `/operator/ai-report` |

### F-2. 성격 차이

| 구분 | Admin | Operator |
|------|-------|----------|
| 성격 | 시스템 관리 (약국 네트워크, 회원) | 일상 운영 (주문, 상품, 정산) |
| 메뉴 수 | 4개 | 17개 이상 |
| Care 접근 | ❌ 없음 | ❌ 없음 |
| 사이드바 제목 | Admin | Operator |

### F-3. API → Web 매핑 주의

백엔드 `admin`, `super_admin` 모두 웹에서 `operator`로 매핑된다.
따라서 **실제로 `/admin` 라우트에 접근하는 사용자는 없을 가능성이 높다.**

```typescript
// AuthContext.tsx mapApiRoleToWebRole
'admin' → 'operator'
'super_admin' → 'operator'
```

`/admin` 라우트는 `allowedRoles={['admin']}`으로 보호되므로,
API에서 `admin`/`super_admin` 역할을 가진 사용자가 `operator`로 매핑되면 `/admin`에 접근 불가.

→ **`/admin` 라우트는 사실상 접근 불가능 상태** (역할 매핑 불일치)

---

## G. 역할별 메뉴 접근 차이

### G-1. DashboardLayout 사이드바 메뉴

#### pharmacy (약국)

| 메뉴 | 경로 |
|------|------|
| 대시보드 | `/` |
| 매장 메인 | `/store` |
| B2B 주문 | `/b2b-orders` |
| 상품 관리 | `/products` |
| 주문 내역 | `/orders` |
| 고객 관리 | `/customers` |
| 스마트 디스플레이 | `/signage` |
| 콘텐츠 가져오기 | `/content-import` |
| 콘텐츠 라이브러리 | `/content-library` |
| My Signage | `/my-signage` |
| 체험 마켓 | `/market-trial` |
| 전환 퍼널 | `/conversion-funnel` |
| 매장 관리 | `/store-management` |
| 설정 | `/settings` |

**주의**: pharmacy 역할 사용자의 Home (`/`)은 `RoleBasedHome` → `CareDashboardPage`.
DashboardLayout은 `/store` 이하 Store Owner 대시보드에서 사용.

#### operator (운영자)

| 메뉴 | 경로 |
|------|------|
| 대시보드 | `/operator` |
| 신청 관리 | `/operator/applications` |
| 상품 관리 | `/operator/products` |
| 주문 관리 | `/operator/orders` |
| 재고/공급 | `/operator/supply` |
| 정산 관리 | `/operator/settlements` |
| 분석/리포트 | `/operator/analytics` |
| 빌링 리포트 | `/operator/billing-report` |
| 빌링 미리보기 | `/operator/billing-preview` |
| 인보이스 | `/operator/invoices` |
| 마케팅 | `/operator/marketing` |
| 포럼 요청 | `/operator/forums-request` |
| 포럼 관리 | `/operator/forums-manage` |
| 체험 마켓 관리 | `/operator/trial-management` |
| 콘텐츠 허브 | `/operator/content-hub` |
| 콘텐츠 라이브러리 | `/operator/content-library` |
| My Signage | `/operator/my-signage` |
| 고객 지원 | `/operator/support` |
| AI 리포트 | `/operator/ai-report` |

#### admin (관리자)

| 메뉴 | 경로 |
|------|------|
| 대시보드 | `/admin` |
| 약국 네트워크 | `/admin/pharmacies` |
| 회원 관리 | `/admin/users` |
| 설정 | `/admin/settings` |

#### partner (파트너)

| 메뉴 | 경로 |
|------|------|
| 대시보드 | `/partner` |
| 콘텐츠 관리 | `/partner/contents` |
| 분석 | `/partner/analytics` |
| 콘텐츠 가져오기 | `/partner/content-import` |
| 콘텐츠 라이브러리 | `/partner/content-library` |
| My Signage | `/partner/my-signage` |
| 설정 | `/partner/settings` |

### G-2. MyPage 접근 경로

| 진입점 | 위치 | 역할 제한 |
|--------|------|----------|
| DashboardLayout 사용자 드롭다운 | 상단 우측 | Dashboard 사용 역할 전체 |
| StoreLayout 사용자 아이콘 | 상단 우측 | 인증된 소비자 |
| MainLayout Header | (미확인) | 인증 사용자 |
| 직접 URL 접근 `/mypage` | - | 인증 사용자 전체 |

### G-3. RoleBasedHome 분기

```typescript
// App.tsx RoleBasedHome
if (roles.includes('pharmacy')) → CareDashboardPage
if (roles.includes('operator')) → navigate('/operator')
if (roles.includes('admin'))    → navigate('/admin')
if (roles.includes('partner'))  → navigate('/partner')
if (roles.includes('supplier')) → navigate('/supplier')
default                         → HomePage (비인증/consumer)
```

---

## H. 미사용/고아 역할

### H-1. 프론트엔드 정의됨 + 미구현

| 역할 | 상태 | 근거 |
|------|------|------|
| `supplier` | **라우트 미구현** | `/supplier` → `RoleNotAvailablePage` |
| `consumer` | **대시보드 없음** | `/` → HomePage (비인증과 동일) |
| `admin` | **접근 불가능** | API→Web 매핑에서 `admin`→`operator`, `/admin`은 `allowedRoles=['admin']`이나 매핑된 사용자 없음 |

### H-3. 역할 매핑 불일치 정리

| 이슈 | 설명 | 영향 |
|------|------|------|
| `admin` 접근 불가 | API `admin`/`super_admin` → Web `operator` 매핑으로 `/admin` 라우트 접근 불가 | Admin 대시보드 사용 불가 |
| `supplier` 미구현 | 라우트 존재하나 `RoleNotAvailablePage` 표시 | Supplier 기능 없음 |
| `admin` roleLabel 누락 | `MyPage.roleLabels`에 `admin` 미정의 | 이론적 undefined (실제로는 operator로 매핑되어 발생하지 않음) |
| 프리픽스 미적용 | 프론트엔드는 레거시 역할(`pharmacy`, `operator`) 사용, 프리픽스 미사용 | P0 RBAC 전환 미완료 |

---

## 부록: 핵심 파일 목록

### 백엔드

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/types/auth.ts` | UserRole enum, JWT payload 타입 |
| `apps/api-server/src/types/roles.ts` | 서비스 프리픽스 역할 정의, ROLE_REGISTRY |
| `apps/api-server/src/modules/auth/entities/User.ts` | 사용자 엔티티 |
| `apps/api-server/src/modules/auth/entities/RoleAssignment.ts` | P0 RBAC 엔티티 |
| `apps/api-server/src/modules/auth/services/role-assignment.service.ts` | 역할 관리 서비스 |
| `apps/api-server/src/middleware/auth.middleware.ts` | 인증/인가 미들웨어 |
| `apps/api-server/src/utils/role.utils.ts` | 서비스 역할 유틸리티 |
| `apps/api-server/src/routes/kpa/entities/kpa-organization.entity.ts` | 조직 엔티티 |
| `apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts` | 멤버십 엔티티 |
| `apps/api-server/src/modules/care/care-pharmacy-context.middleware.ts` | Care 약국 컨텍스트 |
