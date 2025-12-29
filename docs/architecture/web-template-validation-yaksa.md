# Web Business Template Validation Report: Yaksa Forum

> **Phase**: 9-B
> **Date**: 2025-12-29
> **Validator**: Claude Code
> **Template Version**: Phase 8 확정
> **Reference Implementation**: `apps/admin-dashboard/src/pages/cosmetics-products/`
> **Target Implementation**: `apps/admin-dashboard/src/pages/yaksa-forum/`

---

## 1. Executive Summary

### Validation Result: **PASS**

Web Business Template이 yaksa 도메인(forum)에서 **수정 없이 적용 가능**함을 검증함.

| 검증 항목 | 결과 | 비고 |
|----------|------|------|
| 파일 구조 패턴 | ✅ PASS | 동일 구조 |
| API 호출 패턴 | ✅ PASS | authClient.api 사용 |
| 상태 관리 패턴 | ✅ PASS | useState + useCallback |
| 에러 처리 패턴 | ✅ PASS | 동일 패턴 적용 |
| 로딩 스켈레톤 | ✅ PASS | 동일 패턴 적용 |
| 페이지네이션 | ✅ PASS | AGTablePagination 사용 |
| Design Core 사용 | ✅ PASS | @o4o/ui 컴포넌트 사용 |

---

## 2. Structure Comparison

### 2.1 File Structure

| cosmetics-products | yaksa-forum | 매핑 |
|-------------------|-------------|------|
| `CosmeticsProductsRouter.tsx` | `YaksaForumRouter.tsx` | Router ✅ |
| `ProductListPage.tsx` | `PostListPage.tsx` | List Page ✅ |
| `ProductDetailPage.tsx` | `PostDetailPage.tsx` | Detail Page ✅ |
| `BrandListPage.tsx` | `CategoryListPage.tsx` | Sub-Entity List ✅ |
| `BrandDetailPage.tsx` | - | 해당 없음 (forum은 category detail 불필요) |
| `index.ts` | `index.ts` | Entry Point ✅ |

### 2.2 Pattern Mapping

```
cosmetics                    yaksa-forum
─────────────────────────    ─────────────────────────
Product                  →   Post
Brand                    →   Category
Line                     →   (해당 없음)
Price                    →   (해당 없음)
ProductStatus            →   PostStatus
```

---

## 3. Template Pattern Compliance

### 3.1 API 호출 규칙 ✅

**Template 규칙**:
```typescript
import { authClient } from '@o4o/auth-client';
const api = authClient.api;
const response = await api.get<ResponseType>('/api/v1/...');
```

**yaksa-forum 구현**:
```typescript
import { authClient } from '@o4o/auth-client';
const api = authClient.api;
const response = await api.get<PostListResponse>('/api/v1/forum/posts?...');
```

✅ **완전 일치**

### 3.2 필수 상태 패턴 ✅

**Template 규칙**:
```typescript
const [items, setItems] = useState<Entity[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [currentPage, setCurrentPage] = useState(1);
```

**yaksa-forum 구현**:
```typescript
const [posts, setPosts] = useState<PostSummary[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [currentPage, setCurrentPage] = useState(1);
```

✅ **완전 일치**

### 3.3 에러 처리 패턴 ✅

**Template 규칙**:
```typescript
{error && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
    <AlertCircle className="w-5 h-5 text-red-500" />
    <p className="text-red-700">{error}</p>
  </div>
)}
```

**yaksa-forum 구현**: 동일 패턴 적용

✅ **완전 일치**

### 3.4 로딩 스켈레톤 패턴 ✅

**Template 규칙**: `animate-pulse` 기반 스켈레톤 UI

**yaksa-forum 구현**: 동일 패턴 적용

✅ **완전 일치**

### 3.5 404 처리 패턴 ✅

**Template 규칙**:
```typescript
if (err.response?.status === 404) {
  setError('데이터를 찾을 수 없습니다.');
}
```

**yaksa-forum 구현**:
```typescript
if (err.response?.status === 404) {
  setError('게시글을 찾을 수 없습니다.');
}
```

✅ **완전 일치** (메시지만 도메인에 맞게 변경)

---

## 4. Template 재사용 분석

### 4.1 그대로 재사용된 항목 (100% 동일)

| 항목 | 재사용률 |
|------|---------|
| Router 구조 (Lazy loading + Suspense) | 100% |
| API 호출 패턴 (authClient.api) | 100% |
| 상태 관리 패턴 (useState/useCallback) | 100% |
| 에러 처리 UI | 100% |
| 로딩 스켈레톤 UI | 100% |
| 페이지네이션 (AGTablePagination) | 100% |
| 필터/검색 UI (AGSelect, AGInput) | 100% |
| Grid/List 뷰 전환 | 100% |
| 뒤로가기 네비게이션 | 100% |
| 빈 데이터 안내 UI | 100% |

### 4.2 도메인별 커스터마이즈 항목

| 항목 | 변경 내용 | 필수 여부 |
|------|----------|----------|
| 타입 정의 | Product → Post, Brand → Category | 필수 |
| API 경로 | `/cosmetics/products` → `/forum/posts` | 필수 |
| 상태 레이블 | draft/visible/hidden/sold_out → draft/published/archived/hidden | 필수 |
| 아이콘 | Package → MessageSquare | 선택 |
| 색상 테마 | green-600 → blue-600 | 선택 |
| 필터 항목 | brand/status/sort → category/status/sort | 필수 |

### 4.3 도메인별 추가 기능

| yaksa-forum 추가 기능 | cosmetics에 없음 | 이유 |
|---------------------|-----------------|------|
| 댓글 목록 (Detail) | X | 포럼 도메인 특성 |
| 조회수/좋아요 표시 | X | 포럼 도메인 특성 |
| 고정글 표시 (isPinned) | X | 포럼 도메인 특성 |
| 태그 표시 | X | 포럼 도메인 특성 |

---

## 5. Template 수정 제안

> ⚠️ 실제 규칙 변경은 Phase 10 이전까지 금지
> 아래는 "느껴진" 개선점에 대한 제안만 기록

### 5.1 보편 요소 (Universal Elements)

Template에서 **유지해야 할** 핵심 패턴:

1. **Router 구조**: Lazy loading + Suspense fallback
2. **API 호출**: authClient.api 강제
3. **상태 관리**: loading/error/data 3-상태 패턴
4. **에러 UI**: 빨간색 박스 + AlertCircle 아이콘
5. **페이지네이션**: AGTablePagination 컴포넌트
6. **필터 섹션**: AGSection > flex layout > AGSelect/AGInput

### 5.2 비보편 요소 (Domain-Specific Elements)

Template에서 **도메인별 변경이 필요한** 항목:

1. **상태 enum**: 도메인마다 상태 값이 다름
   - cosmetics: `draft | visible | hidden | sold_out`
   - forum: `draft | published | archived | hidden`
   - 제안: Template에 상태 enum 규칙만 정의, 값은 도메인별 정의

2. **정렬 옵션**: 도메인마다 정렬 기준이 다름
   - cosmetics: `created_at | price | name`
   - forum: `createdAt | viewCount | likeCount`
   - 제안: 정렬 옵션은 도메인별 자유 정의 허용

3. **카드 레이아웃**: 표시할 정보가 다름
   - cosmetics: 이미지, 가격, 브랜드
   - forum: 제목, 작성자, 조회수, 댓글수
   - 제안: 카드 내부 레이아웃은 도메인별 자유

### 5.3 Template 개선 제안

| 제안 ID | 내용 | 우선순위 |
|---------|------|---------|
| T-01 | API Response 타입 생성 자동화 (OpenAPI → TypeScript) | HIGH |
| T-02 | 상태 enum + 레이블 + 색상 패턴 표준화 | MEDIUM |
| T-03 | 필터 섹션 컴포넌트화 (FilterBar) | LOW |
| T-04 | 로딩 스켈레톤 컴포넌트화 (ListSkeleton, CardSkeleton) | LOW |

---

## 6. 결론

### 6.1 Template 범용성 검증 결과

**✅ 검증 통과**

Web Business Template은 cosmetics 도메인에서 yaksa(forum) 도메인으로 **구조 변경 없이** 적용 가능함을 확인함.

### 6.2 Template 적용 시 필요한 작업

새로운 비즈니스 Web 생성 시:

1. 폴더 복사: `cosmetics-products` → `{business}-{entity}`
2. 파일명 변경: Router, ListPage, DetailPage 등
3. 타입 정의 변경: OpenAPI 기반
4. API 경로 변경: `/api/v1/{business}/{entity}`
5. 상태 enum 정의: 도메인별 상태 값
6. 필터 옵션 조정: 도메인별 필터 항목
7. 라우터 등록: App.tsx에 추가

### 6.3 예상 소요 시간

| 작업 | 소요 시간 |
|------|----------|
| 기본 구조 복제 | 10분 |
| 타입 정의 변경 | 30분 |
| API 연동 | 30분 |
| UI 커스터마이즈 | 1시간 |
| **총계** | **2시간** |

---

## 7. 다음 단계 권장

1. ✅ Phase 9-B 완료 (본 검증)
2. ⏳ Phase 9-C: Dropshipping Web 착수 (추가 검증)
3. ⏳ Phase 10: Extension 기반 Web 자동 생성 (Template → Generator)

---

*Report Generated: 2025-12-29*
*Phase: 9-B*
*Status: COMPLETED*
