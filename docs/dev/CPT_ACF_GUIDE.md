# CPT & ACF Guide

> Phase P1-C: CPT(Custom Post Type) 및 ACF(Advanced Custom Fields) 개발 가이드
> 작성일: 2025-01-25

## 1. Overview

### CPT (Custom Post Type)

WordPress 스타일의 확장 가능한 콘텐츠 타입 시스템입니다.

- **용도**: 제품(products), 드랍쉬핑 제품(ds_product), 이벤트 등 도메인별 콘텐츠
- **위치**: `apps/api-server/src/schemas/*.schema.ts`
- **관리**: Unified CPT Service (`services/cpt/cpt.service.ts`)

### ACF (Advanced Custom Fields)

콘텐츠에 동적 필드를 추가하는 시스템입니다.

- **용도**: 상품 가격, SKU, 재고 등 메타 정보 저장
- **저장**: EAV(Entity-Attribute-Value) 모델 기반
- **관리**: MetaDataService (`services/MetaDataService.ts`)

---

## 2. 새 CPT 추가 절차

### Step 1: CPT Schema 파일 생성

**위치**: `apps/api-server/src/schemas/{cpt_name}.schema.ts`

```typescript
import { CPTSchema, FieldDefinition } from '../types/cpt.types.js';

export const productSchema: CPTSchema = {
  name: 'product',
  label: '제품',
  singular_name: '제품',
  description: '일반 제품 정보',
  public: true,
  supports: ['title', 'editor', 'thumbnail', 'excerpt'],
  fields: [
    {
      key: 'price',
      name: 'price',
      label: '가격',
      type: 'number',
      required: true,
    },
    {
      key: 'sku',
      name: 'sku',
      label: '제품 코드',
      type: 'text',
      required: false,
    },
  ],
};
```

### Step 2: cpt.init.ts에 등록

**위치**: `apps/api-server/src/init/cpt.init.ts`

```typescript
import { productSchema } from '../schemas/product.schema.js';

const schemas = [
  // ... existing schemas
  productSchema,
];

for (const schema of schemas) {
  await registry.register(schema);
}
```

### Step 3: 검증

```bash
pnpm verify:cpts
```

### Step 4: ACF Field Group 설계 (선택사항)

필요시 Field Group을 통해 복잡한 필드 구조를 정의할 수 있습니다.

---

## 3. ACF Field Types 개요

### Basic Types (기본 타입)

| Type | 용도 | 예시 |
|------|-----|------|
| `text` | 짧은 텍스트 | SKU, 제품 코드 |
| `textarea` | 긴 텍스트 | 상세 설명 |
| `number` | 숫자 | 가격, 재고 |
| `email` | 이메일 | 담당자 이메일 |
| `url` | URL | 외부 링크 |
| `password` | 비밀번호 | API 키 |

### Content Types (콘텐츠 타입)

| Type | 용도 | 예시 |
|------|-----|------|
| `image` | 이미지 | 제품 이미지 |
| `file` | 파일 | PDF, 문서 |
| `gallery` | 갤러리 | 제품 갤러리 |
| `wysiwyg` | 리치 에디터 | 상세 설명 |
| `oembed` | 임베드 | YouTube, Vimeo |

### Choice Types (선택 타입)

| Type | 용도 | 예시 |
|------|-----|------|
| `select` | 드롭다운 | 카테고리 선택 |
| `checkbox` | 체크박스 | 옵션 선택 |
| `radio` | 라디오 버튼 | 단일 선택 |
| `true_false` | 토글 | 활성화/비활성화 |
| `button_group` | 버튼 그룹 | 상태 선택 |

### Relational Types (관계 타입)

| Type | 용도 | 예시 |
|------|-----|------|
| `post_object` | 게시물 참조 | 연관 제품 |
| `taxonomy` | 분류 참조 | 카테고리 |
| `user` | 사용자 참조 | 작성자 |
| `relationship` | 다중 관계 | 추천 제품 |
| `page_link` | 페이지 링크 | 내부 링크 |

### Layout Types (레이아웃 타입)

| Type | 용도 | 예시 |
|------|-----|------|
| `group` | 필드 그룹 | 배송 정보 그룹 |
| `repeater` | 반복 필드 | 옵션 목록 |
| `flexible_content` | 유연한 레이아웃 | 동적 섹션 |
| `tab` | 탭 | UI 구분 |
| `accordion` | 아코디언 | 섹션 접기 |
| `clone` | 복제 | 재사용 필드 |
| `message` | 메시지 | 안내 문구 |

---

## 4. MetaDataService 사용법

### Phase P1-B: 타입 안전화

```typescript
import { metaDataService } from '../services/MetaDataService.js';

// ✅ 제네릭 사용 (타입 안전)
const price = await metaDataService.getMeta<number>('post', postId, 'price');
const sku = await metaDataService.getMeta<string>('post', postId, 'sku');

// ✅ 헬퍼 메서드 사용 (더 명확)
const price = await metaDataService.getNumberMeta('post', postId, 'price');
const sku = await metaDataService.getStringMeta('post', postId, 'sku');
const isFeatured = await metaDataService.getBooleanMeta('post', postId, 'featured');

// ✅ 배치 조회 (N+1 방지)
const metaBatch = await metaDataService.getManyMeta<number>(
  'post',
  [postId1, postId2, postId3],
  ['price', 'stock']
);
const post1Price = metaBatch[postId1]['price'];

// ✅ 배치 저장 (트랜잭션)
await metaDataService.setManyMeta('post', postId, {
  price: 29900,
  sku: 'PROD-001',
  stock_quantity: 100,
  featured: true
});
```

### 헬퍼 메서드 목록

- `getNumberMeta()`: 숫자 타입
- `getStringMeta()`: 문자열 타입
- `getBooleanMeta()`: 불리언 타입
- `getObjectMeta<T>()`: 객체 타입
- `getArrayMeta<T>()`: 배열 타입

---

## 5. Best Practices

### 1. EAV vs 컬럼 선택 기준

**EAV (메타 필드)로 저장해야 하는 경우:**
- 자주 변경되는 속성
- 모든 항목에 필수가 아닌 속성
- 동적으로 추가/제거될 수 있는 속성

**예**: SKU, 옵션, 추가 설명

**엔티티 컬럼으로 승격해야 하는 경우:**
- 자주 검색/필터링되는 속성
- 인덱스가 필요한 속성
- 모든 항목에 필수인 속성

**예**: 제품 이름, 가격, 상태

### 2. meta.allowed / meta.forbidden 설정

Schema에서 허용/차단할 메타 키를 명시할 수 있습니다:

```typescript
export const productSchema: CPTSchema = {
  name: 'product',
  // ...
  meta: {
    allowed: ['price', 'sku', 'stock_quantity'], // 허용 목록
    forbidden: ['_internal_cache'],  // 차단 목록
  },
};
```

### 3. Legacy Service 사용 금지

**❌ 사용하지 마세요:**

```typescript
import { cptService } from './modules/cpt-acf/services/cpt.service.js';
import { acfService } from './modules/cpt-acf/services/acf.service.js';
```

**✅ 대신 사용하세요:**

```typescript
import { cptService } from './services/cpt/cpt.service.js';
import { metaDataService } from './services/MetaDataService.js';
```

### 4. 트랜잭션 사용

여러 메타 값을 동시에 업데이트할 때는 `setManyMeta`를 사용하세요:

```typescript
// ❌ N개의 쿼리 (느림, 트랜잭션 없음)
await metaDataService.setMeta('post', postId, 'price', 29900);
await metaDataService.setMeta('post', postId, 'sku', 'PROD-001');
await metaDataService.setMeta('post', postId, 'stock', 100);

// ✅ 1개의 트랜잭션 (빠름, 원자성 보장)
await metaDataService.setManyMeta('post', postId, {
  price: 29900,
  sku: 'PROD-001',
  stock: 100
});
```

---

## 6. Legacy → Unified 전환 가이드

### Phase P1-A/P1-B에서 완료된 마이그레이션

**이전 구조:**
```
modules/cpt-acf/
  ├── services/
  │   ├── cpt.service.ts (legacy)
  │   └── acf.service.ts (legacy)
  └── controllers/
      ├── cpt.controller.ts (uses legacy)
      └── acf.controller.ts (uses legacy)
```

**현재 구조:**
```
services/
  ├── cpt/
  │   ├── cpt.service.ts (unified)
  │   └── modules/
  │       ├── post.module.ts
  │       ├── meta.module.ts
  │       └── acf.module.ts
  └── MetaDataService.ts (meta operations)

modules/cpt-acf/ (backward compatibility only)
  ├── services/
  │   ├── cpt.service.ts (@deprecated wrapper)
  │   └── acf.service.ts (@deprecated wrapper)
  └── controllers/
      ├── cpt.controller.ts (uses unified ✅)
      └── acf.controller.ts (uses metaDataService ✅)
```

### 마이그레이션 체크리스트

기존 코드를 수정할 때:

1. [ ] Legacy service import 제거
2. [ ] Unified service 또는 metaDataService import 추가
3. [ ] 메서드 호출 변경 (대부분 동일한 시그니처)
4. [ ] 가능하면 타입 안전한 헬퍼 메서드 사용
5. [ ] 배치 작업은 `getManyMeta` / `setManyMeta` 사용

---

## 7. Unified CPT Service API

### CPT 관리

```typescript
// CPT 목록 조회
const cpts = await cptService.getAllCPTs();

// CPT 조회
const cpt = await cptService.getCPTBySlug('product');

// CPT 생성
await cptService.createCPT({ name: 'product', label: '제품', ... });

// CPT 업데이트
await cptService.updateCPT('product', { label: '상품' });

// CPT 삭제
await cptService.deleteCPT('product');
```

### Post 관리

```typescript
// Post 목록 조회
const posts = await cptService.getPostsByCPT('product', {
  page: 1,
  limit: 20,
  status: 'published',
  search: 'iPhone',
});

// Post 생성
await cptService.createPost('product', {
  title: 'iPhone 15',
  content: '최신 아이폰',
}, userId);

// Post 업데이트
await cptService.updatePost(postId, {
  title: 'iPhone 15 Pro'
});

// Post 삭제
await cptService.deletePost(postId);
```

### ACF Field Group 관리

```typescript
// Field Group 목록
const groups = await cptService.getFieldGroups();

// Field Group 조회
const group = await cptService.getFieldGroup(groupId);

// Field Group 생성
await cptService.createFieldGroup({
  title: 'Product Details',
  fields: [...],
});

// Field Group 업데이트
await cptService.updateFieldGroup(groupId, { title: 'Product Info' });

// Field Group 삭제
await cptService.deleteFieldGroup(groupId);
```

---

## 8. 참고 문서

- [Registry Architecture](./REGISTRY_ARCHITECTURE.md)
- [블록 개발 가이드](../../BLOCKS_DEVELOPMENT.md)
- MetaDataService API: `apps/api-server/src/services/MetaDataService.ts`
- Unified CPT Service: `apps/api-server/src/services/cpt/cpt.service.ts`

---

## 9. 문제 해결

### Q: 메타 값이 저장되지 않아요

**A**: `meta.allowed` 설정을 확인하세요. Schema에 허용되지 않은 키는 저장되지 않습니다.

### Q: N+1 쿼리 문제가 발생해요

**A**: `getManyMeta()`를 사용하여 배치 조회하세요:

```typescript
// ❌ N+1 문제
for (const postId of postIds) {
  const price = await metaDataService.getMeta('post', postId, 'price');
}

// ✅ 배치 조회
const metaBatch = await metaDataService.getManyMeta('post', postIds, ['price']);
```

### Q: Legacy service를 아직 사용하고 있는데요?

**A**: Phase P1-A/P1-B 마이그레이션을 참고하여 unified service로 전환하세요.
Legacy service는 Phase P2에서 제거될 예정입니다.

---

**최종 업데이트**: 2025-01-25 (Phase P1-C)
