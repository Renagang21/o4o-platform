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

### Phase 2 (Week 3-4)
- **목표:** 레거시 라우트 폐지 및 클라이언트 마이그레이션
- **작업:**
  - [ ] Admin Dashboard를 `/api/v1/posts`로 전환
  - [ ] Main Site를 `/api/v1/posts`로 전환
  - [ ] `/api/posts` 라우트에 deprecation warning 추가
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

## 참고 자료

- [CPT/ACF Investigation Report](./CPT_ACF_INVESTIGATION.md)
- [API Server Routes](../apps/api-server/src/routes/)
- [REST API Best Practices](https://restfulapi.net/)
- [Semantic Versioning](https://semver.org/)

---

*최종 업데이트: 2025-11-06*
*다음 리뷰: Phase 2 시작 시 (Week 3)*
