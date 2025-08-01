# CPT/ACF Loop Block 구현 가이드

## 📌 구현 순서 및 체크리스트

### 🎯 Phase 1: 기본 블록 구조 (3-4일)

#### 1.1 블록 등록 및 설정
```typescript
// 파일 위치: apps/admin-dashboard/src/components/editor/blocks/CPTLoopBlock/

□ block.json 생성
  - 블록 메타데이터 정의
  - attributes 스키마 정의
  - supports 옵션 설정

□ index.tsx 생성
  - registerBlockType 호출
  - 블록 아이콘 설정
  - example 데이터 제공

□ edit.tsx 생성
  - 에디터 컴포넌트 구현
  - useBlockProps 훅 사용
  - 기본 UI 레이아웃

□ save.tsx 생성
  - null 반환 (서버 사이드 렌더링)
  - 또는 기본 컨테이너 마크업
```

#### 1.2 Inspector 컨트롤
```typescript
// 파일: inspector.tsx

□ InspectorControls 구현
  - PanelBody 구조
  - 각 설정 섹션 분리

□ Query 설정 패널
  - SelectControl: Post Type
  - RangeControl: Posts per Page
  - SelectControl: Order By
  - ToggleControl: Order (ASC/DESC)

□ Display 설정 패널  
  - SelectControl: Template
  - RangeControl: Columns (1-6)
  - ToggleControl: Show elements
```

#### 1.3 API 연동
```typescript
// 파일: hooks/usePostQuery.ts

□ usePostQuery 훅 구현
  - SWR 또는 React Query 사용
  - 에러 핸들링
  - 로딩 상태 관리

□ API 클라이언트 함수
  - fetchPosts()
  - fetchPostTypes()
  - fetchCategories()
```

### 🎯 Phase 2: ACF 필드 통합 (4-5일)

#### 2.1 필드 감지
```typescript
// 파일: hooks/useACFFields.ts

□ ACF 필드 목록 가져오기
  - API 엔드포인트 호출
  - 필드 타입별 분류
  - 필드 그룹 정보

□ 필드 스키마 파싱
  - 필드 타입 매핑
  - 유효성 검사 규칙
  - 조건부 로직 파싱
```

#### 2.2 필드 매핑 UI
```typescript
// 파일: components/FieldMapper.tsx

□ 필드 매핑 인터페이스
  - 드롭다운 선택기
  - 필드 미리보기
  - 매핑 저장

□ 동적 필드 추가
  - "Add Field" 버튼
  - 필드 삭제 기능
  - 필드 순서 변경
```

#### 2.3 필드 렌더러
```typescript
// 파일: components/field-renderers/

□ 필드 타입별 렌더러
  - TextFieldRenderer
  - ImageFieldRenderer
  - RepeaterFieldRenderer
  - RelationshipFieldRenderer

□ 필드 값 포맷팅
  - 날짜 포맷
  - 숫자 포맷
  - HTML 처리
```

### 🎯 Phase 3: 템플릿 시스템 (3-4일)

#### 3.1 기본 템플릿
```typescript
// 파일: templates/

□ Default Template
  - 기본 리스트 형태
  - 제목, 발췌, 이미지

□ Grid Template
  - 그리드 레이아웃
  - 반응형 컬럼

□ List Template
  - 가로 레이아웃
  - 이미지 + 콘텐츠

□ Card Template
  - 카드 스타일
  - 그림자 효과
```

#### 3.2 템플릿 설정
```typescript
// 파일: components/TemplateSettings.tsx

□ 템플릿별 옵션
  - 이미지 크기
  - 발췌 길이
  - 표시 요소

□ 스타일 커스터마이징
  - 색상 선택
  - 간격 조정
  - 테두리 스타일
```

#### 3.3 프리뷰 시스템
```typescript
// 파일: components/PostPreview.tsx

□ 실시간 프리뷰
  - 설정 변경 즉시 반영
  - 로딩 상태 표시
  - 에러 상태 처리

□ 반응형 프리뷰
  - 데스크톱/태블릿/모바일
  - 뷰포트 시뮬레이션
```

### 🎯 Phase 4: 고급 기능 (4-5일)

#### 4.1 필터링 시스템
```typescript
// 파일: components/FilterBuilder.tsx

□ 카테고리/태그 필터
  - 다중 선택
  - 포함/제외 옵션

□ 메타 필터
  - 필드 선택
  - 비교 연산자
  - 값 입력

□ 날짜 필터
  - 날짜 범위
  - 상대적 날짜
```

#### 4.2 페이지네이션
```typescript
// 파일: components/PaginationControls.tsx

□ 숫자 페이지네이션
  - 페이지 번호 표시
  - 이전/다음 버튼

□ Load More 버튼
  - 추가 로드 기능
  - 로딩 애니메이션

□ 무한 스크롤
  - Intersection Observer
  - 자동 로드
```

#### 4.3 성능 최적화
```typescript
// 파일: utils/performance.ts

□ 쿼리 캐싱
  - 메모이제이션
  - 캐시 무효화

□ 이미지 최적화
  - Lazy loading
  - srcset 생성
  - WebP 지원

□ 코드 분할
  - 동적 import
  - 템플릿 지연 로딩
```

### 🎯 Phase 5: 프론트엔드 통합 (3-4일)

#### 5.1 프론트엔드 렌더러
```typescript
// 파일: apps/main-site/src/components/blocks/CPTLoopBlock.tsx

□ 블록 파서
  - 속성 읽기
  - 설정 적용

□ 서버 사이드 렌더링
  - PHP 렌더 함수
  - 또는 Next.js SSR

□ 클라이언트 인터랙션
  - 필터 동작
  - 페이지네이션
```

#### 5.2 스타일 시스템
```css
/* 파일: styles/cpt-loop-block.css */

□ 기본 스타일
  - 레이아웃 스타일
  - 타이포그래피

□ 템플릿 스타일
  - 각 템플릿별 CSS
  - 반응형 미디어 쿼리

□ 테마 통합
  - CSS 변수 사용
  - 테마 색상 적용
```

## 📝 코드 예제

### 블록 등록 예제
```typescript
// index.tsx
import { registerBlockType } from '@wordpress/blocks';
import { loop as icon } from '@wordpress/icons';
import Edit from './edit';
import metadata from './block.json';

registerBlockType('o4o/cpt-loop', {
  ...metadata,
  icon,
  edit: Edit,
  save: () => null, // 서버 사이드 렌더링
});
```

### Query Hook 예제
```typescript
// usePostQuery.ts
export function usePostQuery(query: PostQuery) {
  const { data, error, isLoading } = useSWR(
    ['posts', query],
    () => fetchPosts(query),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    posts: data?.posts || [],
    total: data?.total || 0,
    loading: isLoading,
    error,
  };
}
```

### 필드 렌더러 예제
```typescript
// ImageFieldRenderer.tsx
export function ImageFieldRenderer({ field, value }: FieldRendererProps) {
  if (!value) return null;
  
  const imageData = typeof value === 'object' ? value : { url: value };
  
  return (
    <img
      src={imageData.url}
      alt={imageData.alt || ''}
      loading="lazy"
      className="cpt-loop-field-image"
    />
  );
}
```

## 🧪 테스트 계획

### 단위 테스트
```typescript
// __tests__/usePostQuery.test.ts
□ Query 파라미터 검증
□ API 응답 처리
□ 에러 케이스
□ 캐싱 동작

// __tests__/FieldMapper.test.tsx
□ 필드 선택 동작
□ 매핑 저장
□ 유효성 검사
```

### 통합 테스트
```typescript
// __tests__/CPTLoopBlock.integration.test.tsx
□ 블록 삽입
□ 설정 변경
□ 프리뷰 업데이트
□ 저장 및 로드
```

### E2E 테스트
```typescript
// e2e/cpt-loop-block.spec.ts
□ 블록 추가 플로우
□ 쿼리 설정 및 결과 확인
□ 템플릿 변경
□ 프론트엔드 표시
```

## 🚀 배포 체크리스트

### 개발 완료 확인
- [ ] 모든 Phase 완료
- [ ] 테스트 통과
- [ ] 코드 리뷰
- [ ] 문서 작성

### 빌드 및 최적화
- [ ] 프로덕션 빌드
- [ ] 번들 크기 확인
- [ ] 성능 프로파일링
- [ ] 접근성 검사

### 배포 준비
- [ ] 마이그레이션 스크립트
- [ ] 백업 계획
- [ ] 롤백 절차
- [ ] 모니터링 설정

## 📚 참고 문서

- [WordPress Block Editor Handbook](https://developer.wordpress.org/block-editor/)
- [ACF REST API Documentation](https://www.advancedcustomfields.com/resources/rest-api/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [SWR Documentation](https://swr.vercel.app/)