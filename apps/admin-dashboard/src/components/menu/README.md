# Role-Based Menu System

WordPress와 동일한 메뉴 항목별 사용자 Role 기반 표시 제한 기능이 구현되어 있습니다.

## 기능

### 1. Display Mode (표시 모드)
- **Show**: 메뉴 항목을 표시
- **Hide**: 메뉴 항목을 숨김

### 2. Target Audience (대상 사용자)
- **Everyone**: 모든 사용자에게 표시
- **Logged Out Users**: 로그아웃한 사용자에게만 표시
- **Dynamic Roles**: 시스템에 등록된 사용자 Role별 표시
  - super_admin, admin, moderator, vendor_manager, vendor, seller, customer, business, partner, supplier, affiliate

## 사용법

### 메뉴 편집기에서 설정
```tsx
// WordPressMenuEditor에서 메뉴 항목 편집 시
// Display Settings 섹션에서 설정 가능:
// 1. Display Mode: Show/Hide 선택
// 2. Target Audience: 체크박스로 역할별 다중 선택
```

### 프론트엔드에서 역할 기반 메뉴 렌더링
```tsx
import RoleBasedMenu from '@/components/menu/RoleBasedMenu';

// 기본 사용법
<RoleBasedMenu menuId="primary-menu" />

// 세부 옵션 설정
<RoleBasedMenu 
  menuId="primary-menu"
  className="my-custom-menu"
  orientation="horizontal"
  showSubmenus={true}
  onItemClick={(item) => console.log('Clicked:', item)}
/>
```

### API 엔드포인트

#### 일반 메뉴 조회
```
GET /api/menus/:id
```

#### 역할 기반 필터링된 메뉴 조회
```
GET /api/menus/:id/filtered
```

사용자의 로그인 상태와 Role에 따라 자동으로 필터링된 메뉴 항목만 반환합니다.

## 데이터베이스 스키마

### MenuItem 엔티티 추가 필드
```typescript
// 표시 모드
display_mode: 'show' | 'hide' (기본값: 'show')

// 대상 사용자 설정
target_audience: {
  roles: string[];      // ['everyone', 'logged_out', 'admin', etc.]
  user_ids?: string[];  // 특정 사용자 ID (선택사항)
}
```

## 역할 기반 필터링 로직

1. **display_mode가 'hide'**: 항상 숨김
2. **target_audience가 없음**: 모든 사용자에게 표시 (하위 호환성)
3. **'everyone' 포함**: 모든 사용자에게 표시
4. **'logged_out' 포함 + 비로그인**: 로그아웃 사용자에게 표시
5. **특정 role 포함 + 해당 role**: 해당 역할 사용자에게 표시
6. **조건 불일치**: 숨김

## 예시 시나리오

### 관리자 전용 메뉴
```javascript
{
  display_mode: 'show',
  target_audience: {
    roles: ['super_admin', 'admin']
  }
}
```

### 로그아웃 사용자 전용 (로그인/회원가입)
```javascript
{
  display_mode: 'show',
  target_audience: {
    roles: ['logged_out']
  }
}
```

### 판매자 관련 메뉴
```javascript
{
  display_mode: 'show',
  target_audience: {
    roles: ['vendor', 'vendor_manager', 'seller']
  }
}
```