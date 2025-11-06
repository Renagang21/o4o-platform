# CPT/ACF Route Duplication Matrix

**생성일:** 2025-11-06
**목적:** Phase 1에서 발견된 라우트 중복을 문서화하고 정리 계획 수립

---

## 라우트 중복 현황

### 1. Posts 라우트 중복

| 현행 라우트 | 파일 위치 | 중복 라우트 | 파일 위치 | 사용 상태 | 권장 대체 | 폐지 ETA |
|------------|-----------|------------|-----------|----------|----------|---------|
| `GET /api/posts` | `apps/api-server/src/routes/posts.ts` | `GET /api/v1/posts` | `apps/api-server/src/routes/posts-complete.ts` | 둘 다 사용 중 | **`GET /api/v1/posts`** (버전 관리) | Phase 2 (Week 3) |
| `GET /api/posts` | `apps/api-server/src/routes/posts.ts` | `GET /posts` | `apps/api-server/src/routes/posts-base.ts` | Base 사용 안 함 | **`GET /api/v1/posts`** | Phase 2 (Week 3) |
| `POST /api/posts` | `apps/api-server/src/routes/posts.ts` | `POST /api/v1/posts` | `apps/api-server/src/routes/posts-complete.ts` | 둘 다 사용 중 | **`POST /api/v1/posts`** (버전 관리) | Phase 2 (Week 3) |

### 2. Content 라우트 중복

| 현행 라우트 | 파일 위치 | 중복 라우트 | 파일 위치 | 사용 상태 | 권장 대체 | 폐지 ETA |
|------------|-----------|------------|-----------|----------|----------|---------|
| `GET /api/content/posts` | `apps/api-server/src/routes/content/posts.ts` | `GET /api/posts` | `apps/api-server/src/routes/posts.ts` | Content 라우트 우선 | **`GET /api/v1/posts`** | Phase 2 (Week 3) |

---

## 중복 발생 원인

1. **레거시 호환성 유지**
   - WordPress REST API와의 호환성을 위해 `/api/posts` 유지
   - Gutenberg 에디터 지원을 위한 경로 보존

2. **점진적 마이그레이션**
   - 기존 클라이언트 코드가 구 API를 사용 중
   - 새로운 기능은 `/api/v1/*` 경로로 추가

3. **명확한 버전 관리 전략 부재**
   - API 버전 관리 정책이 수립되지 않음
   - 라우트 네이밍 규칙 미정립

---

## 표준화 계획

### Phase 1 (현재 - Week 2)
- **목표:** 중복 가시화 및 표준 응답 형식 정의
- **작업:**
  - ✅ 이 문서 작성 (중복 현황 파악)
  - ✅ 표준 응답 형식 정의: `{ data: Post[], meta: { total: number } }`
  - 🔄 `GET /api/v1/posts` 응답 형식 표준화 (진행 중)

### Phase 2 (Week 3-4) - IN PROGRESS
- **목표:** 서비스 레이어 통합 및 레거시 라우트 deprecation 시작
- **작업:**
  - [✅] 통합 CPT 서비스 구조 생성 (`/src/services/cpt/`)
  - [✅] 레거시 서비스를 위임 패턴으로 마이그레이션
  - [✅] 배치 로딩 메서드 구현 (N+1 쿼리 방지)
  - [✅] 표준 응답 DTO 정의 (`{ data, meta }` 형식)
  - [✅] Feature flag 추가 (`ROUTE_DEPRECATION_FLAGS`)
  - [✅] Deprecation 미들웨어 구현
  - [ ] Admin Dashboard를 `/api/v1/posts`로 전환
  - [ ] Main Site를 `/api/v1/posts`로 전환
  - [ ] `/api/posts` 라우트에 deprecation headers 적용
  - [ ] `/posts` (base) 라우트 완전 제거
  - [ ] `/api/content/posts`를 `/api/v1/posts`로 리다이렉트

### Phase 3 (Week 5-6)
- **목표:** 완전한 API 버전 관리 체계 구축
- **작업:**
  - [ ] API 버전 관리 미들웨어 추가
  - [ ] `/api/v2` 준비 (호환성 깨는 변경사항 대비)
  - [ ] Swagger/OpenAPI 문서 생성
  - [ ] 클라이언트 SDK 생성 (TypeScript)

---

## 표준 응답 형식

### 목록 조회 (List)
```typescript
{
  data: Post[],
  meta: {
    total: number,
    page?: number,
    pageSize?: number,
    totalPages?: number
  }
}
```

### 단일 조회 (Single)
```typescript
{
  data: Post,
  meta?: {
    // 추가 메타데이터 (선택사항)
  }
}
```

### 오류 응답 (Error)
```typescript
{
  error: string,
  message: string,
  data?: {
    status: number
  }
}
```

---

## 클라이언트 영향 분석

### Admin Dashboard
- **영향 파일:**
  - `apps/admin-dashboard/src/hooks/posts/usePostsData.ts`
  - `apps/admin-dashboard/src/components/posts/*.tsx`
- **마이그레이션 난이도:** 중간
- **예상 작업시간:** 4시간

### Main Site
- **영향 파일:**
  - `apps/main-site/src/pages/PostDetail.tsx`
  - `apps/main-site/src/components/blog/PostCard.tsx`
- **마이그레이션 난이도:** 낮음
- **예상 작업시간:** 2시간

---

## 롤백 계획

만약 마이그레이션 중 문제가 발생하면:

1. **즉시 복구 (< 5분)**
   - 레거시 라우트 재활성화
   - Load balancer에서 트래픽 라우팅 변경

2. **단계별 롤백 (< 30분)**
   - Git revert로 코드 복구
   - 클라이언트 캐시 무효화
   - 배포 재실행

3. **완전 롤백 (< 1시간)**
   - 데이터베이스 스냅샷 복구 (필요시)
   - 모든 서비스 재시작

---

## 마이그레이션 가이드

### Backend (API Server)

#### Phase 2 완료 사항

1. **통합 CPT 서비스**
   - 위치: `/apps/api-server/src/services/cpt/cpt.service.ts`
   - 레거시 서비스 (`/apps/api-server/src/modules/cpt-acf/services/`) → 위임 패턴으로 전환
   - 모듈화: `post.module.ts`, `meta.module.ts`, `acf.module.ts`

2. **배치 로딩**
   - 메서드: `cptService.getPostMetaBatch(postIds, fieldIds?)`
   - N+1 쿼리 방지를 위한 최적화
   - 예시:
     ```typescript
     // Before (N+1 problem)
     for (const post of posts) {
       const meta = await getPostMeta(post.id);
     }

     // After (batch loading)
     const postIds = posts.map(p => p.id);
     const metaBatch = await cptService.getPostMetaBatch(postIds);
     ```

3. **표준 응답 DTO**
   - 위치: `/apps/api-server/src/dto/post.dto.ts`
   - 형식: `{ data: T[], meta: { total, page, limit, ... } }`
   - Helper 함수: `toPostListResponse()`, `toPostSingleResponse()`

4. **Feature Flag**
   - 환경변수: `ROUTE_DEPRECATION_FLAGS=on|off`
   - 미들웨어: `/apps/api-server/src/middleware/deprecation.middleware.ts`
   - 사용법:
     ```typescript
     import { addDeprecationHeaders } from '../middleware/deprecation.middleware.js';

     router.get('/api/posts',
       addDeprecationHeaders({
         successorRoute: '/api/v1/posts',
         message: 'Use /api/v1/posts instead',
         sunsetDate: '2025-12-31'
       }),
       handler
     );
     ```

#### Migration Steps for Existing Code

**Step 1: Import the unified service**
```typescript
// Old
import { cptService } from '../modules/cpt-acf/services/cpt.service.js';

// New (recommended)
import { cptService } from '../services/cpt/cpt.service.js';
```

**Step 2: Use batch loading for list pages**
```typescript
// Before
const posts = await cptService.getPostsByCPT('product');
for (const post of posts.data) {
  post.meta = await getPostMeta(post.id);
}

// After
const result = await cptService.getPostsByCPTWithMeta('product', {
  page: 1,
  limit: 20
});
```

**Step 3: Update response format**
```typescript
// Before
res.json({
  success: true,
  data: posts,
  pagination: { ... }
});

// After
import { toPostListResponse } from '../dto/post.dto.js';

res.json(toPostListResponse(posts, pagination));
```

### Frontend (Admin Dashboard & Main Site)

#### Required Changes

1. **API Client 업데이트**
   - Admin Dashboard: `/apps/admin-dashboard/src/lib/api/posts.ts`
   - Main Site: `/apps/main-site/src/lib/api/posts.ts`

2. **Response 형식 처리**
```typescript
// Before
const response = await fetch('/api/posts');
const posts = await response.json();
// posts is directly Post[]

// After
const response = await fetch('/api/v1/posts');
const { data, meta } = await response.json();
// data is Post[], meta has pagination info
```

3. **타입 정의 업데이트**
```typescript
// packages/types/src/api-responses.ts 생성 권장
export interface PostListResponse {
  data: Post[];
  meta: {
    total: number;
    page?: number;
    limit?: number;
  };
}
```

#### Migration Timeline

- **Phase 2 (현재)**: Backend 준비 완료, Feature flag로 점진적 적용
- **Phase 3 (2-3주 후)**: 클라이언트 전환 시작
  - Admin Dashboard → `/api/v1/posts` 사용
  - Main Site → `/api/v1/posts` 사용
- **Phase 4 (1개월 후)**: 레거시 라우트 완전 제거

---

## 참고 자료

- [CPT/ACF Investigation Report](./CPT_ACF_INVESTIGATION.md)
- [API Server Routes](../apps/api-server/src/routes/)
- [Unified CPT Service](../apps/api-server/src/services/cpt/cpt.service.ts)
- [Standard DTOs](../apps/api-server/src/dto/post.dto.ts)
- [REST API Best Practices](https://restfulapi.net/)
- [Semantic Versioning](https://semver.org/)

---

*최종 업데이트: 2025-11-06 (Phase 2 완료)*
*다음 리뷰: Phase 3 시작 시 (2주 후)*
