# 🧠 **O4O Platform — 유니버셜 블록 Phase 2 설계 요청서**

**주제:** 데이터 프리셋 확장 및 고급 쿼리 설계
**근거 문서:** `docs/dev/audit/universal-block_audit.md`
*작성일: 2025-10-31*

---

## 🎯 목표

유니버셜 블록 (Preset 시스템)에 **교차 CPT ACF 조회**, **고급 필터/정렬**, **템플릿 헬퍼** 기능을 추가하기 위한 **설계 초안 및 스펙 정의서**를 작성한다.

---

## 📍 작업 범위

### 1. 서버 측 확장 안 설계

* `PresetService`에 고급 쿼리 파라미터 추가 설계
  - `expand`: 관계형 필드 확장 (예: `expand=author,category.parent`)
  - `where`: 복합 조건 필터 (예: `where=status:published AND views>100`)
  - `sort`: 다중 필드 정렬 (예: `sort=priority:desc,createdAt:asc`)
  - `page`: 커서 기반 페이지네이션
* 관계형 CPT 조인 로직(ACF relationship 기반) 프로토타입 스펙 작성
* SQL/ORM 구현 시 보안 가이드(allow-list, 권한 필터) 명세
* N+1 쿼리 문제 해결 전략

### 2. 프런트엔드 DSL 스펙 정의

* 유니버셜 블록 속성 확장:
  ```typescript
  interface UniversalBlockProps {
    source: string;           // CPT slug
    filters: FilterClause[];  // 고급 필터 조건
    expand: string[];        // 확장할 관계 필드
    sort: SortClause[];      // 다중 정렬 조건
    limit: number;           // 결과 제한
    cache?: CacheStrategy;   // 캐시 전략
  }
  ```
* 기존 `usePreset` Hook과의 호환성 설계
* TanStack Query 캐시 키 규칙 수정 안
* TypeScript 타입 자동 생성 전략

### 3. 템플릿 헬퍼 시스템 설계

#### 표준 헬퍼 목록 (확장판)

| 카테고리 | 헬퍼 함수 | 설명 | 사용 예시 |
|---------|-----------|------|-----------|
| **ACF 필드** | `acf(field, fallback?)` | ACF 필드 값 조회 | `{{acf 'price' 0}}` |
| | `acfImage(field, size?)` | ACF 이미지 필드 | `{{acfImage 'featured' 'thumb'}}` |
| | `acfRelation(field, prop?)` | 관계형 필드 조회 | `{{acfRelation 'author' 'name'}}` |
| **관계 조회** | `rel(type, id, field?)` | 다른 CPT 조회 | `{{rel 'user' author_id 'name'}}` |
| | `parent(field?)` | 부모 엔티티 조회 | `{{parent 'title'}}` |
| | `children(type, field?)` | 자식 엔티티 목록 | `{{#children 'comment'}}...{{/children}}` |
| **미디어** | `media(id, size?)` | 미디어 URL 생성 | `{{media featured_image 'full'}}` |
| | `thumbnail(size?)` | 썸네일 URL | `{{thumbnail 'medium'}}` |
| | `srcset(id)` | 반응형 이미지 세트 | `{{srcset hero_image}}` |
| **포맷팅** | `priceFormat(value, currency?)` | 가격 포맷 | `{{priceFormat price 'KRW'}}` |
| | `dateFormat(date, format?)` | 날짜 포맷 | `{{dateFormat created_at 'YYYY.MM.DD'}}` |
| | `numberFormat(value, decimals?)` | 숫자 포맷 | `{{numberFormat views}}` |
| | `excerpt(text, length?)` | 텍스트 요약 | `{{excerpt content 200}}` |
| **조건부** | `if(condition, true, false?)` | 조건부 렌더링 | `{{if published '공개' '비공개'}}` |
| | `switch(value, cases)` | 다중 조건 | `{{switch status {...}}}` |
| | `default(value, fallback)` | 기본값 처리 | `{{default title '제목 없음'}}` |
| **컬렉션** | `join(array, separator?)` | 배열 결합 | `{{join tags ', '}}` |
| | `count(array)` | 배열 개수 | `{{count comments}}` |
| | `first(array)` | 첫 번째 요소 | `{{first images}}` |
| | `last(array)` | 마지막 요소 | `{{last updates}}` |
| **계산** | `sum(field, items?)` | 합계 계산 | `{{sum 'price' items}}` |
| | `avg(field, items?)` | 평균 계산 | `{{avg 'rating' reviews}}` |
| | `math(expression)` | 수식 계산 | `{{math 'price * quantity * 1.1'}}` |

* 서버 등록 방식 및 템플릿 렌더러 통합 방식 정리
* 커스텀 헬퍼 등록 API 설계
* 헬퍼 함수 보안 샌드박싱 전략

### 4. 퍼시스티드 쿼리 및 관리 UI 초안

* Query Preset Manager 화면 구성
  - 쿼리 빌더 UI (드래그 앤 드롭)
  - 실시간 프리뷰
  - 쿼리 성능 분석 도구
  - 버전 히스토리 관리
* 필드 모델 정의
  ```typescript
  interface QueryPreset {
    id: string;
    name: string;
    description?: string;
    query: QueryDefinition;
    cache: CacheConfig;
    permissions: PermissionConfig;
    version: number;
    createdBy: string;
    updatedAt: Date;
  }
  ```
* 버전 관리, 권한, 캐시 무효화 정책 초안
* A/B 테스트 지원 설계

### 5. API 명세 초안

#### 새로운 통합 쿼리 엔드포인트
```
GET /api/v2/data/query
POST /api/v2/data/execute
```

#### Request/Response 예시
```typescript
// Request
{
  "preset": "view_products_with_reviews",
  "params": {
    "expand": ["category", "reviews.author"],
    "where": {
      "AND": [
        { "status": "published" },
        { "price": { "between": [10000, 50000] } }
      ]
    },
    "sort": [
      { "field": "rating", "order": "DESC" },
      { "field": "createdAt", "order": "DESC" }
    ],
    "page": {
      "cursor": "eyJpZCI6MTIzfQ==",
      "limit": 20
    }
  }
}

// Response
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 150,
    "cursor": {
      "next": "eyJpZCI6MTQzfQ==",
      "prev": "eyJpZCI6MTAzfQ=="
    },
    "query": {
      "executionTime": 45,
      "cached": false
    }
  }
}
```

* 권한 및 캐시 플로우 다이어그램
* GraphQL 스키마 병행 지원 검토
* WebSocket 실시간 구독 설계

### 6. 보안 및 성능 고려사항

* SQL Injection 방지 전략
* Rate Limiting 정책
* Query Complexity 분석 및 제한
* 캐시 계층화 전략 (Memory → Redis → CDN)
* 민감 데이터 필터링 규칙

---

## 📄 결과물

### 주요 문서
* `docs/dev/specs/universal-block_phase2_design.md`

### 포함 내용
1. 데이터 프리셋 확장 아키텍처 개요
2. 서버/프런트 DSL 스펙 정의
3. 템플릿 헬퍼 시스템 상세 설계
4. API 명세 및 시퀀스 다이어그램
5. 보안 · 캐시 · 권한 가이드라인
6. Query Preset Manager UI 목업
7. 마이그레이션 전략
8. 성능 벤치마크 계획

---

## 🕒 예상 소요 시간

| 단계 | 내용 | 예상 시간 |
|------|------|-----------|
| 1 | 기존 시스템 분석 및 갭 확인 | 2시간 |
| 2 | 아키텍처 설계 및 다이어그램 작성 | 2시간 |
| 3 | API 스펙 및 DSL 정의 | 1.5시간 |
| 4 | 템플릿 헬퍼 시스템 설계 | 1시간 |
| 5 | UI 목업 및 플로우 설계 | 1시간 |
| 6 | 문서 정리 및 검토 | 0.5시간 |
| **총계** | | **8시간** |

---

## ✅ 완료 조건 (Acceptance Criteria)

1. ✅ 모든 확장 필드의 데이터 흐름 및 타입 정의 완료
2. ✅ 서버 · 프런트 간 쿼리 계약 스키마 작성
3. ✅ 템플릿 헬퍼 API 목록 및 예시 작성 (20개 이상)
4. ✅ 보안/캐시/권한 정책 상세 문서화
5. ✅ Query Preset Manager UI 와이어프레임 포함
6. ✅ 성능 목표 및 벤치마크 기준 정의
7. ✅ 하위 호환성 유지 전략 포함
8. ✅ 설계 문서가 docs/dev/specs 경로에 저장됨

---

## 🚀 후속 단계 예고

### Phase 3: 구현 (2주)
- 서버 API 개발
- 프론트엔드 컴포넌트 개발
- 템플릿 헬퍼 통합

### Phase 4: 최적화 (1주)
- 성능 튜닝
- 캐시 전략 구현
- 로드 테스트

### Phase 5: 배포 (3일)
- 스테이징 환경 테스트
- 마이그레이션 실행
- 프로덕션 배포

---

*작성자: O4O Platform 아키텍트팀*
*검토자: 시스템 설계 리드*