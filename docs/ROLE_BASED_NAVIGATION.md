# 역할 기반 네비게이션 시스템 (M3)

## 개요

사용자의 `currentRole`에 따라 메뉴, 배너, 대시보드 UI가 자동으로 변경되는 역할 인지 네비게이션 시스템입니다.

## 주요 기능

### 1. 역할별 설정 레지스트리

모든 역할별 UI 설정은 클라이언트 측 레지스트리로 관리됩니다.

**파일 위치:**
- `apps/main-site/src/config/roles/menus.ts` - 역할별 메뉴 설정
- `apps/main-site/src/config/roles/banners.ts` - 역할별 배너 설정
- `apps/main-site/src/config/roles/dashboards.ts` - 역할별 대시보드 카드 설정
- `apps/main-site/src/config/roles/index.ts` - 통합 export

### 2. 지원되는 역할

- **customer** (사용자): 일반 고객, 제품 구매 및 사용
- **seller** (판매자): 제품 판매 및 주문 관리
- **supplier** (공급자): 재고 및 파트너 관리
- **affiliate** (제휴자): 마케팅 캠페인 및 수익 관리

### 3. HubLayout 컴포넌트

역할 인지 레이아웃 컴포넌트로, `currentRole` 변경 시 자동으로 UI를 업데이트합니다.

**파일:** `apps/main-site/src/components/layout/HubLayout.tsx`

**사용 예시:**
```tsx
import { HubLayout } from '../../components/layout/HubLayout';

export const SellerHub: React.FC = () => {
  return (
    <HubLayout requiredRole="seller">
      {/* 대시보드 콘텐츠 */}
    </HubLayout>
  );
};
```

**동작 방식:**
1. `useAuth()`로 현재 사용자의 `currentRole` 구독
2. 역할 변경 시 `useEffect` 트리거
3. 해당 역할의 메뉴, 배너, 대시보드 설정 자동 로드
4. 분석 이벤트 전송 (role_menu_loaded, role_banner_shown, role_dashboard_loaded)

### 4. RoleGuard 컴포넌트

특정 역할만 접근 가능한 페이지를 보호하는 가드 컴포넌트입니다.

**파일:** `apps/main-site/src/components/guards/RoleGuard.tsx`

**사용 예시:**
```tsx
import { RoleGuard } from '../../components/guards/RoleGuard';

<RoleGuard allowedRoles={['seller']}>
  <SellerHub />
</RoleGuard>
```

**기능:**
- 인증되지 않은 사용자: `/login`으로 리디렉션
- 권한 없는 사용자: 기본적으로 `/`로 리디렉션
- 접근 거부 시 `hub_access_denied` 분석 이벤트 전송
- 커스텀 fallback UI 지원

### 5. 허브 페이지

각 역할별 전용 허브 페이지가 구현되어 있습니다.

**파일 위치:**
- `apps/main-site/src/pages/hubs/SellerHub.tsx` - 판매자 허브
- `apps/main-site/src/pages/hubs/SupplierHub.tsx` - 공급자 허브
- `apps/main-site/src/pages/hubs/AffiliateHub.tsx` - 제휴자 허브

**라우팅:**
- `/seller` → SellerHub
- `/supplier` → SupplierHub
- `/affiliate` → AffiliateHub

## 역할 전환 플로우

1. **사용자 역할 전환 클릭** (RoleSwitcher 컴포넌트)
2. **API 호출**: `PATCH /user/preferences` (apps/api-server/src/routes/user.ts:90)
3. **AuthContext 업데이트**: `updateUser()` 호출로 `currentRole` 변경
4. **분석 이벤트**: `trackRoleSwitch(fromRole, toRole)` 전송
5. **SPA 라우팅**: `navigate(targetPath)` - 페이지 리로드 없이 이동
6. **HubLayout 리렌더**: `useEffect` 트리거로 역할별 설정 재로드
7. **UI 리컴포지션**: 메뉴, 배너, 대시보드 카드 자동 변경

## 분석 이벤트

모든 역할 관련 사용자 행동은 자동으로 추적됩니다.

**파일:** `apps/main-site/src/utils/analytics.ts`

**지원 이벤트:**
- `role_switched`: 역할 전환 시
- `role_menu_loaded`: 역할별 메뉴 로드 시
- `role_banner_shown`: 역할별 배너 표시 시
- `role_dashboard_loaded`: 역할별 대시보드 로드 시
- `dashboard_card_clicked`: 대시보드 카드 클릭 시
- `hub_access_denied`: 허브 접근 거부 시

**외부 서비스 연동:**
- Google Analytics 4 (gtag.js)
- Google Tag Manager (dataLayer)
- Mixpanel (선택적)

## 설정 변경 방법

### 새로운 역할 추가

1. **타입 정의 추가** (`apps/main-site/src/types/user.ts`):
```typescript
export type UserRole =
  | 'customer'
  | 'seller'
  | 'supplier'
  | 'affiliate'
  | 'new-role'; // ← 새 역할 추가
```

2. **메뉴 설정 추가** (`apps/main-site/src/config/roles/menus.ts`):
```typescript
export const ROLE_MENUS: Record<string, RoleMenuConfig> = {
  // ... 기존 역할들
  'new-role': {
    primary: [
      { id: 'dashboard', title: '대시보드', url: '/new-role', icon: 'Home' }
    ]
  }
};
```

3. **배너 설정 추가** (`apps/main-site/src/config/roles/banners.ts`):
```typescript
export const ROLE_BANNERS: Record<string, BannerConfig[]> = {
  // ... 기존 역할들
  'new-role': [
    {
      id: 'welcome-new-role',
      title: '환영합니다!',
      description: '새로운 역할에 대한 설명',
      backgroundColor: '#3b82f6',
      textColor: '#ffffff',
      priority: 10
    }
  ]
};
```

4. **대시보드 설정 추가** (`apps/main-site/src/config/roles/dashboards.ts`):
```typescript
export const ROLE_DASHBOARDS: Record<string, DashboardConfig> = {
  // ... 기존 역할들
  'new-role': {
    title: '새 역할 대시보드',
    subtitle: '설명',
    cards: [/* 카드 설정 */]
  }
};
```

5. **허브 페이지 생성** (`apps/main-site/src/pages/hubs/NewRoleHub.tsx`)

6. **라우팅 추가** (앱 라우터에서 `/new-role` 경로 등록)

7. **RoleSwitcher 옵션 추가** (`apps/main-site/src/components/blocks/RoleSwitcher.tsx`):
```typescript
const roleOptions: Record<string, RoleOption> = {
  // ... 기존 역할들
  'new-role': {
    id: 'new-role',
    name: '새 역할',
    description: '설명',
    path: '/new-role',
    icon: '🎯'
  }
};
```

## QA 체크리스트

### 기능 테스트

- [ ] 복수 역할 사용자 로그인 시 RoleSwitcher 표시
- [ ] 단일 역할 사용자 로그인 시 RoleSwitcher 숨김
- [ ] 역할 전환 시 API 호출 성공
- [ ] 역할 전환 시 해당 허브로 SPA 라우팅 (페이지 리로드 없음)
- [ ] 역할 전환 시 toast 메시지 표시
- [ ] 역할 전환 시 메뉴/배너/대시보드 자동 변경
- [ ] 권한 없는 허브 접근 시 리디렉션
- [ ] 미인증 사용자 허브 접근 시 로그인 페이지로 이동

### 역할별 허브 테스트

**Seller Hub (`/seller`):**
- [ ] RoleGuard로 seller 역할만 접근 가능
- [ ] 판매자 전용 배너 표시
- [ ] 판매자 전용 대시보드 카드 표시 (오늘의 매출, 처리 대기 주문, 상품 관리, 고객 관리)
- [ ] 카드 클릭 시 해당 페이지로 이동

**Supplier Hub (`/supplier`):**
- [ ] RoleGuard로 supplier 역할만 접근 가능
- [ ] 공급자 전용 배너 표시
- [ ] 공급자 전용 대시보드 카드 표시 (재고 현황, 처리 대기 주문, 재고 부족 알림, 파트너 관리)
- [ ] 경고 배지 표시 확인 (재고 부족 알림)

**Affiliate Hub (`/affiliate`):**
- [ ] RoleGuard로 affiliate 역할만 접근 가능
- [ ] 제휴자 전용 배너 표시
- [ ] 제휴자 전용 대시보드 카드 표시 (이번 달 수익, 활성 캠페인, 클릭 수, 전환율)
- [ ] 통계 트렌드 표시 확인 (up/down/neutral)

### 분석 이벤트 테스트

- [ ] 역할 전환 시 `role_switched` 이벤트 전송
- [ ] 허브 로드 시 `role_menu_loaded` 이벤트 전송
- [ ] 배너 표시 시 `role_banner_shown` 이벤트 전송
- [ ] 대시보드 로드 시 `role_dashboard_loaded` 이벤트 전송
- [ ] 접근 거부 시 `hub_access_denied` 이벤트 전송
- [ ] 개발 환경에서 이벤트 콘솔 로그 확인

### 모바일 테스트

- [ ] 햄버거 메뉴에 RoleSwitcher 표시
- [ ] 모바일에서 역할 전환 정상 동작
- [ ] 대시보드 카드 그리드 레이아웃 반응형 확인

### 성능 테스트

- [ ] 역할 전환 시 페이지 리로드 없이 UI 변경
- [ ] 대시보드 카드 렌더링 성능 확인
- [ ] 메모리 누수 없음

## 기술 스택

- **React 18**: 컴포넌트 기반 UI
- **TypeScript**: 강타입 역할 시스템
- **React Router**: SPA 라우팅
- **AuthContext**: 사용자 상태 관리
- **Axios**: API 통신
- **React Hot Toast**: 알림 메시지
- **Lucide Icons**: 아이콘 시스템
- **Tailwind CSS**: 스타일링

## 참고 문서

- M1: Header Menu Upgrade (Dropdown, Navigation icons, AccountModule, RoleSwitcher)
- M2: RoleSwitcher API Integration (/user/preferences)
- M3: Role-aware Navigation (현재 문서)

## 작성자

- **작성일**: 2025-10-30
- **버전**: 1.0.0
- **커밋**: M3 - Role-aware Navigation System
