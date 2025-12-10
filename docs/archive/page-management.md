# [ARCHIVED] 페이지 관리 기능 구현 가이드

> **⚠️ ARCHIVED (2025-12-10)**
>
> 이 문서는 WordPress 스타일의 page-based 구조를 설명하며,
> **CMS 2.0의 View System으로 대체되었습니다.**
>
> 현재 권장 구조:
> - [view-system.md](../design/architecture/view-system.md)
> - [view-guideline.md](../app-guidelines/view-guideline.md)
>
> 아래 내용은 레거시 참조용으로만 보관됩니다.

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

---

*Original created: 2025년 1월*
*Archived: 2025-12-10*
*Reason: Replaced by View System (CMS 2.0)*
