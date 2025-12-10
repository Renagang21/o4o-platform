# [DEPRECATED] 페이지 관리 기능 구현 가이드

> **⚠️ DEPRECATED (2025-12-10)**
>
> 이 문서는 WordPress 스타일의 page-based 구조를 설명하며,
> **CMS 2.0의 View System으로 대체되었습니다.**
>
> 현재 권장 문서:
> - [view-system.md](./view-system.md) - View System 아키텍처
> - [view-guideline.md](../../app-guidelines/view-guideline.md) - View 개발 가이드

---

## 📋 개요
"글 → 모든 글" 관리 기능을 "페이지 → 모든 페이지"로 적용하기 위한 구현 가이드입니다.

## 🔍 현재 구조 분석

### 1. 글(Posts) 관리 구조
```
📁 src/pages/posts/
├── Posts.tsx              # 메인 컨테이너
├── PostsManagement.tsx    # WordPress 스타일 목록 관리
├── Categories.tsx         # 카테고리 관리
└── Tags.tsx              # 태그 관리

📁 src/pages/editor/
├── StandaloneEditor.tsx   # 통합 에디터
└── EditorRouteWrapper.tsx # 라우트 래퍼 (강제 재마운트)
```

### 2. 페이지(Pages) 관리 현재 구조
```
📁 src/pages/pages/
├── PagesRouter.tsx        # 라우터
├── Pages.tsx             # 기본 페이지 목록
└── NewPage.tsx           # 새 페이지 생성

📁 src/pages/content/
├── PageListWordPress.tsx  # WordPress 스타일 목록 (사용 중)
├── PageForm.tsx          # 페이지 폼 (구형)
└── PageFormWYSIWYG.tsx   # WYSIWYG 에디터 (구형)
```

## 🎯 목표 아키텍처

### 글과 페이지의 차이점
| 구분 | 글(Posts) | 페이지(Pages) |
|------|-----------|---------------|
| 용도 | 시간순 콘텐츠 | 정적 콘텐츠 |
| 카테고리 | ✅ 지원 | ❌ 미지원 |
| 태그 | ✅ 지원 | ❌ 미지원 |
| 형식(Format) | ✅ 다양한 형식 | ❌ 표준만 |
| 템플릿 | ❌ 미지원 | ✅ 페이지 템플릿 |
| 계층구조 | ❌ 미지원 | ✅ 부모-자식 관계 |
| 댓글 | ✅ 기본 활성화 | ❌ 기본 비활성화 |

## 📝 구현 계획

### Phase 1: 페이지 목록 관리 개선
1. **PageListWordPress.tsx 개선**
   - PostsManagement.tsx의 구조 적용
   - 페이지 특화 기능 추가:
     - 부모 페이지 필터
     - 템플릿 필터
     - 계층 구조 표시 (들여쓰기)

2. **필요한 수정사항**
   ```typescript
   // 추가할 필터
   - parentFilter: string  // 부모 페이지 필터
   - templateFilter: string // 템플릿 필터
   
   // 수정할 열 구성
   - 카테고리/태그 열 제거
   - 템플릿 열 추가
   - 부모 페이지 열 추가
   ```

### Phase 2: 페이지 편집기 통합
1. **StandaloneEditor 재사용**
   - mode="page" 지원 확인
   - 페이지 특화 설정 추가

2. **라우트 구성 수정**
   ```typescript
   // src/pages/pages/PagesRouter.tsx
   <Routes>
     <Route path="/" element={<PageListWordPress />} />
     <Route path="/new" element={
       <Navigate to="/editor/pages/new" replace />
     } />
     <Route path="/:id/edit" element={
       <Navigate to="/editor/pages/:id" replace />
     } />
   </Routes>
   ```

3. **페이지 편집 시 추가 필드**
   - 페이지 템플릿 선택
   - 부모 페이지 선택
   - 페이지 순서
   - 페이지 속성

### Phase 3: API 통합
1. **postApi 확장 또는 pageApi 생성**
   ```typescript
   export const pageApi = {
     // 페이지 목록 (계층 구조 포함)
     getHierarchical: async () => {},
     
     // 페이지 템플릿 목록
     getTemplates: async () => {},
     
     // 부모 페이지 변경
     updateParent: async (id: string, parentId: string) => {},
   }
   ```

2. **API 엔드포인트 매핑**
   - GET `/v1/content/pages` - 페이지 목록
   - GET `/v1/content/pages/:id` - 페이지 상세
   - POST `/v1/content/pages` - 페이지 생성
   - PUT `/v1/content/pages/:id` - 페이지 수정
   - DELETE `/v1/content/pages/:id` - 페이지 삭제

## 🔧 구현 상세

### 1. PageListWordPress.tsx 수정 예시
```typescript
// 페이지 특화 필터 추가
const [parentFilter, setParentFilter] = useState('all');
const [templateFilter, setTemplateFilter] = useState('all');

// 계층 구조 표시를 위한 데이터 처리
const buildHierarchy = (pages: Page[]) => {
  const map = new Map();
  const roots = [];
  
  // 부모-자식 관계 구축
  pages.forEach(page => {
    map.set(page.id, { ...page, children: [] });
  });
  
  pages.forEach(page => {
    if (page.parentId) {
      const parent = map.get(page.parentId);
      if (parent) {
        parent.children.push(map.get(page.id));
      }
    } else {
      roots.push(map.get(page.id));
    }
  });
  
  return roots;
};

// 계층 구조 렌더링
const renderHierarchicalTitle = (page: Page, level = 0) => {
  return (
    <div style={{ paddingLeft: `${level * 20}px` }}>
      {level > 0 && '— '}{page.title}
    </div>
  );
};
```

### 2. StandaloneEditor 페이지 모드 지원
```typescript
// 페이지 설정 추가
const pageSettings = mode === 'page' ? {
  template: 'default',
  parentId: null,
  menuOrder: 0,
  allowComments: false,
} : null;

// 저장 시 페이지 타입 설정
const baseData = {
  ...existingData,
  type: mode, // 'page' or 'post'
  pageSettings: pageSettings,
};
```

### 3. 라우트 통합
```typescript
// App.tsx에서
<Route path="/pages/*" element={<PagesRouter />} />

// 에디터 라우트는 이미 설정됨
<Route path="/editor/pages/new" element={
  <EditorRouteWrapper mode="page" />
} />
<Route path="/editor/pages/:id" element={
  <EditorRouteWrapper mode="page" />
} />
```

## ⚡ 빠른 구현 체크리스트

### 즉시 적용 가능한 부분
- [x] StandaloneEditor는 이미 mode="page" 지원
- [x] EditorRouteWrapper 재사용 가능
- [x] API 구조 동일 (type 필드로 구분)

### 수정 필요한 부분
- [ ] PageListWordPress.tsx에 계층 구조 표시 추가
- [ ] 페이지 특화 필터 추가 (부모, 템플릿)
- [ ] 페이지 편집 시 추가 필드 UI
- [ ] 페이지 목록에서 에디터로 리다이렉트

### 새로 구현할 부분
- [ ] 페이지 템플릿 관리 기능
- [ ] 부모-자식 관계 관리 UI
- [ ] 페이지 순서 변경 기능

## 🚀 구현 순서 권장사항

1. **1단계: 목록 페이지 개선** (1-2일)
   - PageListWordPress.tsx 개선
   - 계층 구조 표시 구현
   - 필터 기능 추가

2. **2단계: 편집기 통합** (1일)
   - 라우트 리다이렉트 설정
   - StandaloneEditor 페이지 모드 테스트
   - 페이지 특화 UI 추가

3. **3단계: API 통합** (1일)
   - 페이지 CRUD 테스트
   - 계층 구조 저장/로드
   - 템플릿 기능 구현

4. **4단계: 세부 기능** (1-2일)
   - 페이지 복제
   - 일괄 작업
   - 페이지 미리보기

## 📌 주의사항

1. **데이터 타입 일관성**
   - Post와 Page는 같은 API를 사용하지만 type 필드로 구분
   - 페이지는 categories, tags 필드가 비어있음

2. **UI/UX 차이점**
   - 페이지는 시간순이 아닌 계층 구조로 표시
   - 날짜보다 템플릿과 부모 페이지가 중요

3. **권한 관리**
   - 페이지 편집 권한은 보통 더 제한적
   - 부모 페이지 변경 시 권한 체크 필요

## 🔗 참고 파일

### 주요 참조 파일
- `/src/pages/posts/PostsManagement.tsx` - 글 관리 전체 구조
- `/src/pages/editor/StandaloneEditor.tsx` - 통합 에디터
- `/src/pages/editor/EditorRouteWrapper.tsx` - 라우트 래퍼
- `/src/services/api/postApi.ts` - API 서비스

### 수정 대상 파일
- `/src/pages/content/PageListWordPress.tsx` - 페이지 목록 (개선 필요)
- `/src/pages/pages/PagesRouter.tsx` - 페이지 라우터 (수정 필요)
- `/src/pages/pages/Pages.tsx` - 기본 페이지 컴포넌트 (대체 예정)

## 💡 추가 개선 아이디어

1. **드래그 앤 드롭 순서 변경**
   - 페이지 순서를 드래그로 변경
   - 계층 구조도 드래그로 변경

2. **페이지 빌더 통합**
   - 비주얼 페이지 빌더 추가
   - 섹션 기반 편집

3. **SEO 최적화**
   - 페이지별 메타 태그 관리
   - Open Graph 설정
   - 구조화된 데이터

---

*작성일: 2025년 1월*
*작성자: Claude Code Assistant*