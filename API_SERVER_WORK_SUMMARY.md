# API 서버 작업 지시서 - 종합 정리
## O4O Platform API Server - 로컬 개발팀 완료 작업 및 API 서버 필요 작업

---

## 📊 전체 작업 현황

### 로컬 개발팀 완료 작업
- ✅ **Tags API**: 4개 엔드포인트 완전 구현
- ✅ **WordPress 메뉴 시스템**: 27개 API 완전 구현 (Phase 1, 2, 3)
- ✅ **E-commerce Settings API**: 긴급 수정 완료
- ✅ **API 에러 분석 및 문서화**: 완료

### API 서버팀 필요 작업
- 🔧 **MediaController 버그 수정**: folderRepository 초기화
- 🔧 **누락된 E-commerce API**: 29개 엔드포인트
- 🔧 **콘텐츠 관리 API**: 15개 엔드포인트
- 🔧 **설정 관리 API**: 8개 엔드포인트

---

## 🚀 로컬 개발팀 완료 작업 상세

### 1. Tags API (완료)
```typescript
// 파일: apps/api-server/src/controllers/content/TagController.ts
// 파일: apps/api-server/src/services/tag.service.ts
// 파일: apps/api-server/src/routes/content/tagRoutes.ts

GET    /api/tags              - 태그 목록 조회
POST   /api/tags              - 태그 생성
PUT    /api/tags/:id          - 태그 수정
DELETE /api/tags/:id          - 태그 삭제

// 추가 기능
GET    /api/tags/popular      - 인기 태그
GET    /api/tags/:id/stats    - 태그 통계
POST   /api/tags/:fromId/merge/:toId - 태그 병합
```

### 2. WordPress 메뉴 시스템 (완료)

#### Phase 1 - 기본 메뉴 관리 (11개 API)
```typescript
// 메뉴 CRUD
GET    /api/v1/menus
POST   /api/v1/menus
GET    /api/v1/menus/:id
PUT    /api/v1/menus/:id
DELETE /api/v1/menus/:id

// 메뉴 아이템 CRUD
POST   /api/v1/menu-items
PUT    /api/v1/menu-items/:id
DELETE /api/v1/menu-items/:id

// 추가 기능
GET    /api/v1/menus/locations
GET    /api/v1/menus/location/:key
PUT    /api/v1/menus/:id/reorder
POST   /api/v1/menus/:id/duplicate
```

#### Phase 2 - 고급 메뉴 기능 (9개 API)
```typescript
// 파일: apps/api-server/src/controllers/menu/MenuAdvancedController.ts

// 조건부 표시
POST   /api/v1/menu-items/:id/conditions
GET    /api/v1/menu-items/:id/conditions
DELETE /api/v1/menu-items/:id/conditions

// 메뉴 스타일
POST   /api/v1/menus/:id/styles
GET    /api/v1/menus/:id/styles
PUT    /api/v1/menus/:id/styles

// 메가메뉴
POST   /api/v1/menus/:id/mega-menu
GET    /api/v1/menus/:id/mega-menu
PUT    /api/v1/menus/:id/mega-menu
```

#### Phase 3 - 캐싱, 분석, 위젯 (7개 API)
```typescript
// 파일: apps/api-server/src/controllers/menu/MenuCacheController.ts
// 파일: apps/api-server/src/controllers/menu/MenuAnalyticsController.ts
// 파일: apps/api-server/src/controllers/menu/MenuWidgetController.ts

// 캐싱
POST   /api/v1/menus/:id/cache
DELETE /api/v1/menus/:id/cache
GET    /api/v1/menus/cache-status

// 분석
GET    /api/v1/menus/:id/analytics
GET    /api/v1/menus/:id/performance

// 위젯
GET    /api/v1/menu-widgets
POST   /api/v1/menu-widgets
```

### 3. E-commerce Settings (완료)
```typescript
// 파일: apps/api-server/src/controllers/ecommerce/EcommerceSettingsController.ts

GET  /ecommerce/settings - 설정 조회
PUT  /ecommerce/settings - 설정 업데이트
```

---

## 🔧 API 서버팀 필요 작업 상세

### 1. 긴급 수정 (24시간 내)

#### MediaController 버그 수정
```typescript
// 파일: apps/api-server/src/controllers/MediaController.ts

// 문제: folderRepository가 초기화되지 않음
// 해결: constructor에 추가
constructor() {
  this.mediaRepository = AppDataSource.getRepository(MediaFile);
  this.folderRepository = AppDataSource.getRepository(MediaFolder); // 추가 필요
}
```

#### API 경로 매핑 수정
```typescript
// 문제: 프론트엔드 /api/v1/media/folders vs 백엔드 /admin/media/folders
// 해결: main.ts에 경로 매핑 추가
app.use('/api/v1/media', contentRoutes);
```

### 2. E-commerce API 구현 (3일 내)

#### 쿠폰 시스템
```typescript
GET    /ecommerce/coupons
POST   /ecommerce/coupons
GET    /ecommerce/coupons/:id
PUT    /ecommerce/coupons/:id
DELETE /ecommerce/coupons/:id
POST   /ecommerce/coupons/validate
POST   /ecommerce/coupons/:id/apply
```

#### 재고 관리
```typescript
GET    /ecommerce/inventory
GET    /ecommerce/inventory/:productId
PUT    /ecommerce/inventory/:productId
POST   /ecommerce/inventory/adjust
GET    /ecommerce/inventory/movements
GET    /ecommerce/inventory/low-stock
```

#### 환불 처리
```typescript
POST   /ecommerce/orders/:id/refund
GET    /ecommerce/refunds
GET    /ecommerce/refunds/:id
PUT    /ecommerce/refunds/:id/approve
PUT    /ecommerce/refunds/:id/reject
```

#### 대량 작업
```typescript
POST   /ecommerce/products/bulk
DELETE /ecommerce/products/bulk
POST   /ecommerce/products/bulk/update-prices
POST   /ecommerce/products/bulk/update-stock
PUT    /ecommerce/orders/bulk/status
POST   /ecommerce/orders/bulk/export
```

### 3. 콘텐츠 관리 API (1주일 내)

#### 페이지 관리
```typescript
GET    /v1/content/pages
POST   /v1/content/pages
GET    /v1/content/pages/:id
PUT    /v1/content/pages/:id
DELETE /v1/content/pages/:id
POST   /v1/content/pages/:id/clone
GET    /v1/content/pages/tree
```

#### 템플릿 시스템
```typescript
GET    /admin/templates
POST   /admin/templates
GET    /admin/templates/:id
PUT    /admin/templates/:id
DELETE /admin/templates/:id
POST   /admin/templates/import
GET    /admin/templates/:id/export
```

#### 커스텀 필드 그룹
```typescript
GET    /admin/custom-field-groups
POST   /admin/custom-field-groups
PUT    /admin/custom-field-groups/:id
DELETE /admin/custom-field-groups/:id
```

### 4. 설정 관리 API (1주일 내)

```typescript
GET    /admin/settings/general
POST   /admin/settings/general
GET    /admin/settings/appearance
POST   /admin/settings/appearance
GET    /admin/settings/email
POST   /admin/settings/email
POST   /admin/settings/export
POST   /admin/settings/import
```

---

## 📋 구현 우선순위

### Priority 1 - 즉시 수정 (24시간)
1. MediaController folderRepository 초기화
2. API 경로 매핑 수정 (/api/v1/media)
3. 에러 응답 표준화

### Priority 2 - 핵심 기능 (3일)
1. 쿠폰 시스템 (7개 API)
2. 재고 관리 (6개 API)
3. 환불 처리 (5개 API)
4. 대량 작업 (6개 API)

### Priority 3 - 확장 기능 (1주일)
1. 페이지 관리 (7개 API)
2. 템플릿 시스템 (7개 API)
3. 커스텀 필드 그룹 (4개 API)
4. 설정 관리 (8개 API)

---

## ✅ 체크리스트

### 로컬 개발팀 완료
- [x] Tags API 구현 및 테스트
- [x] WordPress 메뉴 Phase 1 구현
- [x] WordPress 메뉴 Phase 2 구현
- [x] WordPress 메뉴 Phase 3 구현
- [x] E-commerce Settings API 구현
- [x] Admin Dashboard API 연동
- [x] API 에러 분석 문서 작성

### API 서버팀 작업 필요
- [ ] MediaController 버그 수정
- [ ] API 경로 매핑 통일
- [ ] 쿠폰 시스템 구현
- [ ] 재고 관리 구현
- [ ] 환불 처리 구현
- [ ] 대량 작업 API 구현
- [ ] 페이지 관리 시스템 구현
- [ ] 템플릿 시스템 구현
- [ ] 커스텀 필드 그룹 구현
- [ ] 설정 관리 API 구현

---

## 🔒 보안 고려사항

1. **인증 및 권한**
   - 모든 관리자 API에 JWT 인증 적용
   - 역할 기반 접근 제어 (RBAC) 구현
   - API Rate Limiting 적용

2. **데이터 검증**
   - 입력 데이터 검증 (Joi, class-validator)
   - SQL Injection 방지
   - XSS 방지

3. **에러 처리**
   - 표준화된 에러 응답
   - 상세 에러는 개발 환경에서만 노출
   - 에러 로깅 및 모니터링

---

## 🧪 테스트 요구사항

### 단위 테스트
- Controller 메서드별 테스트
- Service 로직 테스트
- 유틸리티 함수 테스트

### 통합 테스트
- API 엔드포인트 테스트
- 데이터베이스 연동 테스트
- 인증/권한 테스트

### 성능 테스트
- 응답 시간 측정
- 부하 테스트
- 메모리 사용량 모니터링

---

## 📚 참고 문서

- `API_ERROR_ANALYSIS_REPORT.md` - API 에러 분석 보고서
- `API_SERVER_FIX_INSTRUCTIONS.md` - API 서버 수정 지시서
- `CLAUDE.md` - 프로젝트 개발 가이드

---

## 📞 연락처

문제 발생 시:
1. GitHub Issues에 보고
2. 로컬 개발팀과 협의
3. API 서버팀과 동기화

---

*작성일: 2025년 9월 1일*  
*작성자: 로컬 개발팀*  
*대상: O4O Platform API Server Team*