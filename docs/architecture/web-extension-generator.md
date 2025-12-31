# Web Extension Generator 정의서

> **Status**: Active (Phase 10 확정)
> **Created**: 2025-12-29
> **Location**: `scripts/generators/web-extension-generator.ts`

---

## 1. 개요

Web Extension Generator는 **Extension 정의만으로 Web 페이지 골격을 자동 생성**하는 도구이다.

### 1.1 목적

| Before (수동) | After (자동) |
|--------------|-------------|
| 템플릿 파일 복사 | Generator 실행 |
| 파일명 일일이 변경 | 자동 네이밍 |
| 타입 정의 수동 작성 | 타입 자동 생성 |
| API 경로 수동 수정 | 설정 기반 생성 |
| 패턴 위반 위험 | 패턴 강제 적용 |

### 1.2 설계 원칙

1. **정의 → 생성 → 미세조정**: 설계/구현 작업을 정의 작업으로 전환
2. **재생성 우선**: 생성된 코드 수정 대신 입력 정의 수정 후 재생성
3. **Template 규칙 강제**: Phase 8에서 확정된 Web Business Template 패턴 적용
4. **OpenAPI 계약 준수**: 타입은 OpenAPI 스펙 기반

---

## 2. 사용법

### 2.1 기본 사용

```bash
npx ts-node scripts/generators/web-extension-generator.ts \
  --business=cosmetics \
  --entity=products
```

### 2.2 전체 옵션

```bash
npx ts-node scripts/generators/web-extension-generator.ts \
  --business=cosmetics \
  --entity=products \
  --displayName="화장품 제품" \
  --apiPath=/api/v1/cosmetics/products \
  --color=green \
  --icon=Package
```

### 2.3 옵션 설명

| 옵션 | 필수 | 설명 | 예시 |
|------|------|------|------|
| `--business` | ✅ | 비즈니스 키 | cosmetics, yaksa, dropshipping |
| `--entity` | ✅ | 엔티티 복수형 | products, posts, members |
| `--displayName` | ❌ | 한글 표시명 | "화장품 제품" |
| `--apiPath` | ❌ | API 기본 경로 | /api/v1/cosmetics/products |
| `--color` | ❌ | 테마 색상 | blue, green, purple |
| `--icon` | ❌ | Lucide 아이콘 | Package, MessageSquare |

---

## 3. 생성 산출물

### 3.1 파일 구조

```
apps/admin-dashboard/src/pages/{business}-{entity}/
├── {Business}{Entity}Router.tsx    # 라우터 (Lazy loading)
├── {Entity}ListPage.tsx            # 목록 페이지
├── {Entity}DetailPage.tsx          # 상세 페이지
├── types.ts                        # 타입 정의
├── api.ts                          # API 래퍼
└── index.ts                        # 엔트리포인트
```

### 3.2 생성 코드 특징

| 특징 | 설명 |
|------|------|
| Lazy Loading | Router에서 페이지 컴포넌트 동적 로드 |
| authClient.api | 모든 API 호출은 authClient 경유 |
| 3-상태 패턴 | loading/error/data 상태 관리 |
| 페이지네이션 | AGTablePagination 컴포넌트 사용 |
| 에러 UI | 표준 에러 메시지 박스 |
| 로딩 스켈레톤 | animate-pulse 기반 |

---

## 4. 생성 코드의 지위

### 4.1 핵심 원칙

| 항목 | 규칙 |
|------|------|
| **수정 가능 여부** | ❌ 직접 수정 금지 |
| **변경 방법** | 입력 정의 수정 → 재생성 |
| **Git 관리** | 커밋 대상, 재생성 가능 |
| **책임 경계** | Web Business Template 규칙 종속 |

### 4.2 수정 금지 이유

1. **일관성 보장**: 모든 Web 페이지가 동일 패턴 유지
2. **유지보수 용이**: Template 변경 시 일괄 재생성 가능
3. **규칙 위반 방지**: 수동 수정 시 패턴 위반 위험

### 4.3 변경이 필요한 경우

```
1. OpenAPI 스펙 수정 (타입 변경)
2. Generator 입력 정의 수정 (설정 변경)
3. Generator 재실행
4. 변경사항 커밋
```

---

## 5. 자동 생성 범위

### 5.1 자동 생성되는 영역

| 영역 | 생성 여부 | 비고 |
|------|----------|------|
| Router | ✅ 자동 | Lazy loading 포함 |
| List Page | ✅ 자동 | 필터/검색/정렬/페이지네이션 |
| Detail Page | ✅ 자동 | 404 처리 포함 |
| Types | ✅ 자동 | Summary/Detail/Response |
| API Wrapper | ✅ 자동 | authClient 래퍼 |
| Index | ✅ 자동 | 엔트리포인트 |

### 5.2 생성되지 않는 영역 (의도적 공백)

| 영역 | 이유 | 처리 방법 |
|------|------|----------|
| Admin 페이지 (Create/Edit) | Phase 11에서 확장 | 별도 Generator |
| 도메인 특화 UI | 비즈니스 로직 의존 | 수동 추가 또는 Extension |
| 복잡한 필터 | 도메인별 상이 | 수동 커스터마이즈 |
| 관계 데이터 조회 | API 의존 | types.ts 수동 확장 |

### 5.3 재생성 가능 코드 vs 수동 코드

| 코드 유형 | 파일 위치 | 재생성 시 |
|----------|----------|----------|
| **재생성 가능** | 생성된 모든 파일 | 덮어쓰기 |
| **수동 확장** | `/custom/` 하위 | 보존 |

> ⚠️ 생성된 파일에 수동 코드 추가 시 **재생성 시 소실**

---

## 6. 커스터마이즈 가이드

### 6.1 타입 확장

OpenAPI 스펙에 맞게 `types.ts`의 인터페이스 확장:

```typescript
// types.ts (재생성 대상)
export interface ProductSummary {
  id: string;
  name: string;
  // ... 기본 필드
}

// custom/types.ts (수동 관리)
import { ProductSummary } from '../types';

export interface ExtendedProductSummary extends ProductSummary {
  brand: BrandSummary;
  price: Price;
  images: ProductImage[];
}
```

### 6.2 페이지 커스터마이즈

```typescript
// custom/ProductListPageExtension.tsx (수동 관리)
import { ProductListPage } from '../ProductListPage';

// 확장 로직은 별도 파일에서 관리
```

### 6.3 권장 구조

```
pages/{business}-{entity}/
├── [자동 생성]
│   ├── Router.tsx
│   ├── ListPage.tsx
│   ├── DetailPage.tsx
│   ├── types.ts
│   ├── api.ts
│   └── index.ts
│
└── custom/                 # 수동 관리 (선택)
    ├── types.ts            # 타입 확장
    ├── hooks.ts            # 커스텀 훅
    └── components/         # 도메인 특화 컴포넌트
```

---

## 7. 검증 체크리스트

### 7.1 생성 후 확인 사항

- [ ] 파일 6개 생성 확인
- [ ] Router lazy loading 동작
- [ ] API 경로 정확성
- [ ] 타입 정의 OpenAPI 일치
- [ ] authClient.api 사용 확인
- [ ] AGPageHeader/AGSection/AGCard 사용 확인
- [ ] 에러 UI 표준 패턴 적용

### 7.2 App.tsx 등록

```typescript
// apps/admin-dashboard/src/App.tsx

// 1. Import Router
const CosmeticsProductsRouter = React.lazy(
  () => import('./pages/cosmetics-products/CosmeticsProductsRouter')
);

// 2. Add Route
<Route path="/cosmetics-products/*" element={<CosmeticsProductsRouter />} />
```

---

## 8. 향후 확장 계획

| Phase | 내용 | 상태 |
|-------|------|------|
| 10 | 기본 List/Detail 생성 | ✅ 완료 |
| 11 | Admin (Create/Edit) 생성 | Planned |
| 12 | OpenAPI → Types 자동 변환 | Planned |
| 13 | CLI 인터랙티브 모드 | Planned |

---

## 9. 관련 문서

- [Web Business Template](./web-business-template.md)
- [Template Validation - Yaksa](./web-template-validation-yaksa.md)
- [CLAUDE.md §18](../../CLAUDE.md) - Generator Rules

---

*Created: 2025-12-29*
*Phase: 10*
*Status: Active*
