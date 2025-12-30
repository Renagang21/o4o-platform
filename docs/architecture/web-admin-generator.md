# Web Admin Generator 정의서

> **Status**: Active (Phase 11 확정)
> **Created**: 2025-12-29
> **Location**: `scripts/generators/web-admin-generator.ts`

---

## 1. 개요

Web Admin Generator는 **Admin CRUD 페이지를 OpenAPI 스펙 기반으로 자동 생성**하는 도구이다.

### 1.1 목적

| Before (수동) | After (자동) |
|--------------|-------------|
| Create/Edit 폼 직접 작성 | Generator 실행 |
| 필드별 validation 수동 | OpenAPI → Form 매핑 |
| 상태 변경 UI 수동 | Status Page 자동 |
| 에러 처리 일관성 부재 | 표준 패턴 강제 |

### 1.2 설계 원칙

1. **OpenAPI 계약 준수**: 타입은 OpenAPI write endpoint 스펙 기반
2. **Admin Scope 분리**: `/admin/` 경로로 권한 분리
3. **재생성 우선**: 생성된 코드 수정 대신 OpenAPI 스펙 수정 후 재생성
4. **Web Extension Generator 확장**: Phase 10 List/Detail 생성기와 병행 사용

---

## 2. 사용법

### 2.1 기본 사용

```bash
npx tsx scripts/generators/web-admin-generator.ts \
  --business=cosmetics \
  --entity=products
```

### 2.2 전체 옵션

```bash
npx tsx scripts/generators/web-admin-generator.ts \
  --business=cosmetics \
  --entity=products \
  --displayName="화장품 제품" \
  --apiPath=/api/v1/cosmetics/products \
  --adminPath=/api/v1/cosmetics/admin/products \
  --color=green \
  --icon=Package
```

### 2.3 옵션 설명

| 옵션 | 필수 | 설명 | 예시 |
|------|------|------|------|
| `--business` | ✅ | 비즈니스 키 | cosmetics, yaksa, dropshipping |
| `--entity` | ✅ | 엔티티 복수형 | products, posts, members |
| `--displayName` | ❌ | 한글 표시명 | "화장품 제품" |
| `--apiPath` | ❌ | GET API 기본 경로 | /api/v1/cosmetics/products |
| `--adminPath` | ❌ | Admin API 경로 | /api/v1/cosmetics/admin/products |
| `--color` | ❌ | 테마 색상 | blue, green, purple |
| `--icon` | ❌ | Lucide 아이콘 | Package, MessageSquare |

---

## 3. 생성 산출물

### 3.1 파일 구조

```
apps/admin-dashboard/src/pages/{business}-{entity}-admin/
├── {Business}{Entity}AdminRouter.tsx   # Admin 라우터 (Lazy loading)
├── {Entity}CreatePage.tsx              # 등록 페이지 (POST)
├── {Entity}EditPage.tsx                # 수정 페이지 (PUT)
├── {Entity}StatusPage.tsx              # 상태 변경 페이지 (PATCH)
├── formSchema.ts                       # OpenAPI → Form 매핑 스키마
├── types.ts                            # Admin 전용 타입
├── api.ts                              # Admin API 래퍼
└── index.ts                            # 엔트리포인트
```

### 3.2 생성 코드 특징

| 특징 | 설명 |
|------|------|
| Lazy Loading | Router에서 페이지 컴포넌트 동적 로드 |
| authClient.api | 모든 API 호출은 authClient 경유 |
| Form Validation | 필수 필드 + OpenAPI 제약 조건 검증 |
| 에러 처리 | 403/400/기타 에러 표준 UI |
| 로딩 스켈레톤 | animate-pulse 기반 |

---

## 4. OpenAPI → Form 매핑 규칙

### 4.1 타입 매핑

| OpenAPI Type | Form Field Type | 비고 |
|--------------|-----------------|------|
| `string` | `text` | 기본 문자열 |
| `string (format: uuid)` | `uuid` | ID 참조 필드 |
| `string (maxLength > 200)` | `textarea` | 긴 텍스트 |
| `integer`, `number` | `number` | 숫자 입력 |
| `boolean` | `switch` | 토글 스위치 |
| `string (enum)` | `select` | 단일 선택 |
| `array` | `multiselect` | 복수 선택 |

### 4.2 Validation 매핑

| OpenAPI | Form Validation |
|---------|-----------------|
| `required` | `required: true` |
| `minLength` | `validation.minLength` |
| `maxLength` | `validation.maxLength` |
| `minimum` | `validation.min` |
| `maximum` | `validation.max` |

### 4.3 cosmetics products 예시

OpenAPI `CreateProductRequest`:
```yaml
name:
  type: string
  required: true
  maxLength: 200
brand_id:
  type: string
  format: uuid
  required: true
base_price:
  type: number
  required: true
  minimum: 0
```

생성된 FormField:
```typescript
{ name: 'name', type: 'text', label: '상품명', required: true, validation: { maxLength: 200 } }
{ name: 'brand_id', type: 'uuid', label: '브랜드', required: true }
{ name: 'base_price', type: 'number', label: '기본가', required: true, validation: { min: 0 } }
```

---

## 5. Admin API 경로 패턴

### 5.1 표준 패턴

| Operation | Method | Path | 설명 |
|-----------|--------|------|------|
| Create | POST | `/api/v1/{business}/admin/{entity}` | 신규 생성 |
| Update | PUT | `/api/v1/{business}/admin/{entity}/{id}` | 전체 수정 |
| Status | PATCH | `/api/v1/{business}/admin/{entity}/{id}/status` | 상태만 변경 |
| Delete | DELETE | `/api/v1/{business}/admin/{entity}/{id}` | 삭제 (선택) |

### 5.2 권한 분리

- **Read API** (`/api/v1/{business}/{entity}`): 일반 사용자 접근 가능
- **Admin API** (`/api/v1/{business}/admin/{entity}`): Admin 권한 필요

---

## 6. 생성 코드의 지위

### 6.1 핵심 원칙

| 항목 | 규칙 |
|------|------|
| **수정 가능 여부** | ❌ 직접 수정 금지 |
| **변경 방법** | OpenAPI 스펙 수정 → 재생성 |
| **Git 관리** | 커밋 대상, 재생성 가능 |
| **책임 경계** | OpenAPI 계약 종속 |

### 6.2 수정 금지 이유

1. **OpenAPI 동기화**: 타입이 API 스펙과 일치 보장
2. **일관성 보장**: 모든 Admin 페이지가 동일 패턴 유지
3. **유지보수 용이**: OpenAPI 변경 시 일괄 재생성 가능

---

## 7. Web Extension Generator와의 관계

### 7.1 조합 사용

```bash
# Step 1: List/Detail 페이지 생성 (Phase 10)
npx tsx scripts/generators/web-extension-generator.ts \
  --business=cosmetics --entity=products

# Step 2: Admin 페이지 생성 (Phase 11)
npx tsx scripts/generators/web-admin-generator.ts \
  --business=cosmetics --entity=products
```

### 7.2 생성 결과

```
pages/
├── cosmetics-products/         # List/Detail (Phase 10)
│   ├── CosmeticsProductsRouter.tsx
│   ├── ProductListPage.tsx
│   ├── ProductDetailPage.tsx
│   └── ...
│
└── cosmetics-products-admin/   # Admin CRUD (Phase 11)
    ├── CosmeticsProductsAdminRouter.tsx
    ├── ProductCreatePage.tsx
    ├── ProductEditPage.tsx
    ├── ProductStatusPage.tsx
    └── ...
```

---

## 8. App.tsx 등록 가이드

### 8.1 Router 등록

```typescript
// apps/admin-dashboard/src/App.tsx

// 1. Import Router
const CosmeticsProductsAdminRouter = React.lazy(
  () => import('./pages/cosmetics-products-admin/CosmeticsProductsAdminRouter')
);

// 2. Add Route (Admin 경로)
<Route path="/cosmetics-products-admin/*" element={<CosmeticsProductsAdminRouter />} />
```

### 8.2 ListPage에서 Admin 링크 추가

```typescript
// ProductListPage.tsx 상단에 Admin 버튼 추가
<Link to="/cosmetics-products-admin/create">
  <AGButton iconLeft={<Plus />}>등록</AGButton>
</Link>

// 테이블 Row에서 Edit/Status 버튼
<Link to={`/cosmetics-products-admin/${product.id}/edit`}>수정</Link>
<Link to={`/cosmetics-products-admin/${product.id}/status`}>상태변경</Link>
```

---

## 9. 검증 체크리스트

### 9.1 생성 후 확인 사항

- [ ] 파일 8개 생성 확인
- [ ] Router lazy loading 동작
- [ ] Admin API 경로 정확성 (`/admin/` 포함)
- [ ] formSchema.ts 필드 정의 확인
- [ ] types.ts Create/Update Request 타입 확인
- [ ] AGPageHeader/AGSection/AGCard 사용 확인
- [ ] Form validation 로직 확인

### 9.2 OpenAPI Endpoint 확인

생성 전 반드시 확인:
- `POST /api/v1/{business}/admin/{entity}` 존재
- `PUT /api/v1/{business}/admin/{entity}/{id}` 존재
- `PATCH /api/v1/{business}/admin/{entity}/{id}/status` 존재

---

## 10. 향후 확장 계획

| Phase | 내용 | 상태 |
|-------|------|------|
| 11 | Admin Create/Edit/Status 생성 | ✅ 완료 |
| 12 | OpenAPI → FormField 완전 자동 변환 | Planned |
| 13 | Delete 페이지 + Bulk Actions | Planned |
| 14 | 관계 필드 자동 Select/Lookup | Planned |

---

## 11. 관련 문서

- [Web Extension Generator](./web-extension-generator.md) - Phase 10 List/Detail 생성
- [Web Business Template](./web-business-template.md) - 템플릿 패턴 정의
- [CLAUDE.md §19](../../CLAUDE.md) - Admin Generator Rules

---

*Created: 2025-12-29*
*Phase: 11*
*Status: Active*
