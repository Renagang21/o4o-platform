# Web Business Template 정의서

> **Status**: Active (Phase 8 확정)
> **Created**: 2024-12-29
> **Reference Implementation**: `apps/admin-dashboard/src/pages/cosmetics-products/*`

---

## 1. 개요

이 문서는 O4O 플랫폼에서 **비즈니스 도메인별 Web 모듈**을 구현할 때 따라야 하는 표준 구조와 규칙을 정의한다.

### 1.1 적용 대상

| 비즈니스 | 상태 | 비고 |
|----------|------|------|
| cosmetics-web | **Reference** | 표준 템플릿 |
| yaksa-web | Planned | 템플릿 복제 대상 |
| dropshipping-web | Planned | 템플릿 복제 대상 |
| signage-web | Planned | 템플릿 복제 대상 |

### 1.2 문서 구속력

- 이 문서는 **CLAUDE.md §15**에 의해 구속력을 가진다.
- 모든 비즈니스 Web은 이 템플릿을 기준으로 생성한다.
- 템플릿 위반은 코드 리뷰에서 거부 사유가 된다.

---

## 2. Web Layer 책임 정의

### 2.1 허용되는 책임 (MUST)

| 책임 | 설명 |
|------|------|
| **UI 렌더링** | React 컴포넌트로 데이터를 화면에 표시 |
| **API 호출** | `authClient.api`를 통한 Backend API 호출 |
| **상태 관리** | 로딩/에러/데이터 상태의 로컬 관리 |
| **사용자 입력 수집** | Form 데이터 수집 및 API 전달 |
| **라우팅** | React Router 기반 페이지 네비게이션 |
| **에러 표시** | API 에러를 사용자 친화적 메시지로 변환 |

### 2.2 금지되는 책임 (MUST NOT)

| 금지 항목 | 이유 |
|-----------|------|
| **비즈니스 로직** | Backend API에 위임 |
| **데이터 가공** | API 응답을 그대로 사용 |
| **권한 검증** | Backend에서 처리 (403 응답 수신) |
| **상태 전이 판단** | API가 판단, Web은 결과만 표시 |
| **DB 직접 접근** | 절대 금지 |
| **JWT 생성/해석** | authClient 내부에서만 처리 |

### 2.3 조건부 허용

| 항목 | 조건 |
|------|------|
| 클라이언트 필터링 | 이미 받은 데이터 내에서만 |
| 정렬 | 이미 받은 데이터 내에서만 |
| 페이지네이션 UI | API pagination 응답 기반 |

---

## 3. 필수 구성 요소

### 3.1 파일 구조

```
apps/admin-dashboard/src/pages/{business}-products/
├── {Entity}ListPage.tsx      # 목록 페이지
├── {Entity}DetailPage.tsx    # 상세 페이지
├── {Business}ProductsRouter.tsx  # 라우터
└── index.ts                  # 엔트리포인트
```

### 3.2 필수 페이지 패턴

#### List Page 필수 요소

```typescript
// 1. API Response 타입 (OpenAPI 기반)
interface {Entity}ListResponse {
  data: {Entity}Summary[];
  meta: PaginationMeta;
}

// 2. 필수 상태
const [items, setItems] = useState<{Entity}Summary[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [currentPage, setCurrentPage] = useState(1);

// 3. API 호출 (authClient 필수)
const fetchItems = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await api.get<{Entity}ListResponse>('/api/v1/{business}/{entities}');
    if (response.data) {
      setItems(response.data.data);
    }
  } catch (err: any) {
    setError(err.message || '데이터를 불러오는데 실패했습니다.');
  } finally {
    setLoading(false);
  }
}, [api]);

// 4. 필수 UI 상태
// - 로딩 스켈레톤
// - 에러 메시지
// - 빈 데이터 안내
// - 페이지네이션
```

#### Detail Page 필수 요소

```typescript
// 1. URL 파라미터
const { entityId } = useParams<{ entityId: string }>();

// 2. 404 처리
if (err.response?.status === 404) {
  setError('데이터를 찾을 수 없습니다.');
}

// 3. 뒤로가기 네비게이션
const navigate = useNavigate();
// ...
<AGButton onClick={() => navigate('/{business}-products')}>
  목록으로 돌아가기
</AGButton>
```

---

## 4. API 연계 규칙

### 4.1 API 호출 방식

```typescript
// ✅ 허용
import { authClient } from '@o4o/auth-client';
const api = authClient.api;
const response = await api.get<ResponseType>('/api/v1/...');

// ❌ 금지
import axios from 'axios';
fetch('/api/...');
```

### 4.2 API 경로 규칙

| 유형 | 경로 패턴 | 예시 |
|------|-----------|------|
| Public 목록 | `/api/v1/{business}/{entities}` | `/api/v1/cosmetics/products` |
| Public 상세 | `/api/v1/{business}/{entities}/{id}` | `/api/v1/cosmetics/products/{id}` |
| Public 검색 | `/api/v1/{business}/{entities}/search` | `/api/v1/cosmetics/products/search` |
| Admin 생성 | `/api/v1/{business}/admin/{entities}` | `/api/v1/cosmetics/admin/products` |
| Admin 수정 | `/api/v1/{business}/admin/{entities}/{id}` | `/api/v1/cosmetics/admin/products/{id}` |

### 4.3 OpenAPI 계약 준수

- **API 스펙에 없는 엔드포인트 호출 금지**
- **응답 구조 임의 변경 금지**
- **필드 추측/가공 금지**
- 계약 불일치 발견 시 → "API 계약 문제"로 보고

---

## 5. 인증/권한 흐름

### 5.1 인증 처리

```
1. authClient가 JWT 토큰 관리
2. API 호출 시 자동으로 Authorization 헤더 추가
3. Web은 토큰을 직접 처리하지 않음
```

### 5.2 권한 처리

```typescript
// Web에서 권한 검증 ❌
if (user.role === 'admin') { ... }

// API 응답으로 권한 처리 ✅
try {
  await api.post('/api/v1/.../admin/...');
} catch (err: any) {
  if (err.response?.status === 403) {
    setError('권한이 없습니다.');
  }
}
```

### 5.3 Scope 기반 접근 제어

| Scope | 접근 가능 API |
|-------|--------------|
| `{business}:read` | Public 조회 API |
| `{business}:admin` | Admin 생성/수정/삭제 API |

---

## 6. Admin / Public 분리 기준

### 6.1 Public 페이지

- 인증 없이 접근 가능
- 조회 전용 (GET)
- `/api/v1/{business}/{entities}` 경로 사용

### 6.2 Admin 페이지

- 인증 필수
- 생성/수정/삭제 가능 (POST/PUT/PATCH/DELETE)
- `/api/v1/{business}/admin/{entities}` 경로 사용
- 403 에러 처리 필수

### 6.3 페이지 분리 구조

```
pages/{business}-products/
├── ProductListPage.tsx       # Public 목록
├── ProductDetailPage.tsx     # Public 상세
├── BrandListPage.tsx         # Public 브랜드 목록
├── BrandDetailPage.tsx       # Public 브랜드 상세
└── admin/
    ├── ProductCreatePage.tsx   # Admin 생성
    ├── ProductEditPage.tsx     # Admin 수정
    └── ProductManagePage.tsx   # Admin 관리
```

---

## 7. 멀티 비즈니스 공존 규칙

### 7.1 같은 앱 내 공존 기준

| 조건 | 공존 가능 | 분리 앱 |
|------|-----------|---------|
| 동일 인증 체계 | ✅ | - |
| 메뉴 5개 이하 | ✅ | - |
| 독립 도메인 필요 | - | ✅ |
| 완전 다른 UX | - | ✅ |

### 7.2 라우팅 분리

```typescript
// apps/admin-dashboard/src/App.tsx
<Routes>
  {/* Cosmetics */}
  <Route path="/cosmetics-products/*" element={<CosmeticsProductsRouter />} />

  {/* Yaksa */}
  <Route path="/yaksa-products/*" element={<YaksaProductsRouter />} />

  {/* Dropshipping */}
  <Route path="/dropshipping/*" element={<DropshippingRouter />} />
</Routes>
```

### 7.3 메뉴 구성 분리

```typescript
// 비즈니스별 메뉴 그룹
const menuGroups = {
  cosmetics: [
    { path: '/cosmetics-products', label: 'Products' },
    { path: '/cosmetics-products/brands', label: 'Brands' },
  ],
  yaksa: [
    { path: '/yaksa-products', label: 'Products' },
    { path: '/yaksa-members', label: 'Members' },
  ],
};
```

---

## 8. 에러 처리 패턴

### 8.1 필수 에러 UI

```typescript
// 에러 상태
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
    <AlertCircle className="w-5 h-5 text-red-500" />
    <p className="text-red-700">{error}</p>
  </div>
)}
```

### 8.2 HTTP 상태별 처리

| 상태 코드 | 처리 |
|-----------|------|
| 400 | 유효성 검사 오류 표시 |
| 401 | 로그인 페이지로 리다이렉트 |
| 403 | "권한이 없습니다" 표시 |
| 404 | "데이터를 찾을 수 없습니다" 표시 |
| 500 | "서버 오류가 발생했습니다" 표시 |

---

## 9. Reference Implementation

### 9.1 cosmetics-web 파일 목록

| 파일 | 역할 |
|------|------|
| `ProductListPage.tsx` | 상품 목록 + 검색 + 필터 |
| `ProductDetailPage.tsx` | 상품 상세 |
| `BrandListPage.tsx` | 브랜드 목록 |
| `BrandDetailPage.tsx` | 브랜드 상세 + 라인 목록 |
| `CosmeticsProductsRouter.tsx` | 라우팅 |

### 9.2 복제 절차

새로운 비즈니스 Web 생성 시:

1. `cosmetics-products` 폴더 복사
2. 파일명/컴포넌트명 변경
3. API 경로 변경 (`/api/v1/{new-business}/...`)
4. 타입 정의 변경 (OpenAPI 기반)
5. 라우터에 등록

---

## 10. 금지 사항 (STRICT)

다음 행위는 **코드 리뷰 거부** 사유:

- ❌ Web에서 비즈니스 로직 구현
- ❌ API 응답 데이터 임의 가공
- ❌ `axios` 또는 `fetch` 직접 사용
- ❌ 하드코딩된 데모 데이터
- ❌ JWT 토큰 직접 조작
- ❌ 권한 검증 로직 구현
- ❌ OpenAPI 스펙에 없는 API 호출

---

*Updated: 2024-12-29*
*Phase: 8*
*Status: Active*
