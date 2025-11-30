# Organization-Dropshipping Integration Extension

조직(Organization) 구조와 드랍쉬핑(Dropshipping) 시스템을 통합하는 Extension입니다.

## 개요

organization-core와 dropshipping-core를 연동하여 **조직 기반 공동구매** 기능을 제공합니다.

## 주요 기능

### 1. 조직 범위 상품 관리

조직별로 독립된 상품 카탈로그를 관리할 수 있습니다.

**Product.scope**:
- `global`: 전국 공통 상품
- `organization`: 조직 전용 상품

**조직별 특가 (organizationPricing)**:
```typescript
{
  "org-seoul": {
    price: 45000,
    minQuantity: 10,
    deadline: "2025-12-31"
  },
  "org-busan": {
    price: 48000,
    minQuantity: 5
  }
}
```

### 2. 조직 기반 공동구매 (Groupbuy)

각 지부·분회별로 독립된 공동구매 캠페인을 운영할 수 있습니다.

**Groupbuy 엔티티**:
- organizationId: 조직 ID (필수)
- productId: 공동구매 상품
- groupPrice: 공동구매 가격
- minQuantity: 최소 달성 수량
- maxQuantity: 최대 수량
- startDate/endDate: 캠페인 기간

**GroupbuyParticipant 엔티티**:
- 공동구매 참여자 추적
- 수량, 가격, 결제 상태 관리

### 3. 조직 범위 권한 관리

organization-core의 RBAC 시스템과 통합하여 조직 기반 드랍쉬핑 권한을 관리합니다.

**권한 매핑**:
- `organization.manage`: 조직 상품/공동구매 생성·관리
- `organization.read`: 조직 상품 열람, 공동구매 참여

### 4. 계층적 권한 상속

상위 조직 권한이 하위 조직에 자동 적용됩니다.

**예시:**
```
서울지부 admin → 강남분회/강서분회 공동구매 관리 권한 자동 상속
```

## 설치

Extension은 organization-core와 dropshipping-core 설치 후 자동으로 활성화됩니다.

## 사용 예제

### 조직 공동구매 생성

```typescript
import { OrganizationDropshippingService } from '@o4o-extensions/organization-dropshipping';

const service = new OrganizationDropshippingService(dataSource);

// 서울지부 공동구매 생성
const groupbuy = await service.createGroupbuy({
  organizationId: 'org-seoul',
  productId: 'product-vitamin-d',
  name: '서울지부 비타민D 공동구매',
  description: '약사회 회원 대상 특가',
  groupPrice: 45000,
  regularPrice: 65000,
  minQuantity: 20,
  maxQuantity: 100,
  startDate: new Date('2025-12-01'),
  endDate: new Date('2025-12-31'),
  createdBy: 'user-admin',
});

// 공동구매 활성화
await service.activateGroupbuy(groupbuy.id);
```

### 공동구매 참여

```typescript
// 사용자가 공동구매 참여
const participant = await service.joinGroupbuy({
  groupbuyId: groupbuy.id,
  userId: 'user-member',
  quantity: 2,
});

// 참여 현황 조회
const participants = await service.getGroupbuyParticipants(groupbuy.id);
console.log(`현재 참여 인원: ${participants.length}명`);
```

### 조직 공동구매 목록 조회

```typescript
// 서울지부 활성 공동구매 목록
const activeGroupbuys = await service.getActiveGroupbuys('org-seoul');

// 모든 공동구매 (상태별 필터링 가능)
const allGroupbuys = await service.getOrganizationGroupbuys(
  'org-seoul',
  GroupbuyStatus.ACTIVE
);
```

### 조직별 특가 상품

```typescript
// Product에 조직별 특가 설정
const product = await productService.createProduct({
  name: '비타민D 3000IU',
  supplierId: 'supplier-pharma',
  organizationId: null, // 전국 공통 상품
  scope: 'global',
  supplierPrice: 50000,
  recommendedPrice: 65000,
  organizationPricing: {
    'org-seoul': {
      price: 45000, // 서울지부 특가
      minQuantity: 10,
    },
    'org-busan': {
      price: 48000, // 부산지부 특가
      minQuantity: 5,
    },
  },
});
```

## 권한 체크 예제

```typescript
import { canCreateGroupbuy, canParticipateInGroupbuy } from '@o4o/dropshipping-core';

// 공동구매 생성 권한 확인
const canCreate = await canCreateGroupbuy(
  dataSource,
  'user-admin',
  'org-seoul'
);

if (canCreate) {
  // 공동구매 생성
}

// 공동구매 참여 권한 확인
const canJoin = await canParticipateInGroupbuy(
  dataSource,
  'user-member',
  'org-seoul'
);

if (canJoin) {
  // 공동구매 참여
}
```

## Groupbuy 상태 관리

```typescript
// Groupbuy 상태 전환
enum GroupbuyStatus {
  DRAFT = 'draft',         // 초안
  ACTIVE = 'active',       // 진행중
  CLOSED = 'closed',       // 마감 (목표 달성)
  COMPLETED = 'completed', // 완료 (정산 완료)
  CANCELLED = 'cancelled', // 취소
}

// 공동구매 완료 처리
const groupbuy = await service.completeGroupbuy(groupbuyId);

// 공동구매 취소
const cancelled = await service.cancelGroupbuy(groupbuyId);
```

## 설정

`manifest.ts`에서 다음 설정을 변경할 수 있습니다:

### enableGroupbuys

공동구매 기능 활성화 여부

- **타입**: boolean
- **기본값**: true

### defaultMinQuantity

공동구매 기본 최소 수량

- **타입**: number
- **기본값**: 10

### allowPublicGroupbuys

비회원의 조직 공동구매 열람 허용 여부

- **타입**: boolean
- **기본값**: false

## 의존성

- **@o4o/organization-core**: 조직 관리 및 RBAC
- **@o4o/dropshipping-core**: 드랍쉬핑 기본 기능

## 데이터베이스 마이그레이션

### Product 테이블 변경사항
- `organizationId`: uuid (nullable)
- `scope`: varchar(20) (default: 'global')
- `organizationPricing`: jsonb (nullable)

### Settlement 테이블 변경사항
- `organizationId`: uuid (nullable)

### 새 테이블
- `groupbuys`: 공동구매 캠페인
- `groupbuy_participants`: 공동구매 참여자

## 버전

- **현재 버전**: 0.1.0
- **최소 요구사항**:
  - organization-core: Phase 2 (RBAC 확장)
  - dropshipping-core: 1.0.0

## 라이선스

MIT

---

**작성일**: 2025-11-30
**상태**: Dropshipping Phase 3 구현 완료 ✅
