# 🧩 Task: 포럼(Forum) 모듈 UI 개발 (`/forum`)

## 📌 주의 사항 (작업 폴더 경로 명시)

> ⚠️ 반드시 다음 경로 내부에서 작업하세요:

- ✅ 정확한 경로:
  ```
  Coding\o4o-platform\services\main-site
  ```

- ❌ 금지 경로:
  ```
  Coding\forum
  Coding\src\forum
  Coding\services\forum
  ```

---

## 🎯 목적
의료/건강 관련 주제를 중심으로 사용자 간 정보 공유와 토론이 가능한 포럼(게시판) 기능을 UI 차원에서 구현합니다.

---

## 📐 주요 화면 및 기능

### 1. 게시글 목록 페이지 (`/forum`)
- 주제 태그 필터 (`#약사`, `#의료기기`, `#후기` 등)
- 제목, 작성자, 댓글 수, 조회 수, 작성일 등 요약 표시
- 페이지네이션 적용

### 2. 게시글 상세 보기 (`/forum/:id`)
- 제목, 작성자, 작성일, 본문 내용
- 댓글 리스트 및 댓글 입력창
- 관련글 추천 섹션 (태그 기반)

### 3. 게시글 작성/수정 폼 (`/forum/write`)
- 제목, 내용, 태그 선택
- 저장 버튼 (임시 저장 가능)

---

## 💬 UI 구성 요소

- `ForumPostList.tsx` (목록)
- `ForumPostView.tsx` (상세보기)
- `ForumPostForm.tsx` (작성/수정)
- `CommentList.tsx`, `CommentInput.tsx` (댓글)
- `ForumSidebar.tsx` (카테고리/태그)

---

## 💡 디자인 참고
- 레딧(Reddit), 티스토리 커뮤니티 UI
- 뎁스별 댓글 표현 / 작성 시 에디터 (Tiptap 등)

---

## 🧪 테스트 체크리스트
- 목록 정렬 및 필터가 정상 작동하는가?
- 댓글 입력 시 실시간 반영되는가?
- 모바일에서도 리스트/뷰/작성 폼이 정상 동작하는가?

---

# ✅ Cursor 작업 지시문

## 작업 위치
- `Coding/o4o-platform/services/main-site/src/pages/forum/`

## 작업 요청
1. 위 페이지 구조에 따라 폴더 `/forum/` 내에 3개 페이지(`index.tsx`, `[id].tsx`, `write.tsx`)를 생성하세요.
2. 필요한 컴포넌트는 `/components/forum/` 내에 정의하세요.
3. 전체 Tailwind 기반 반응형 UI로 구성하고 mock data로 우선 렌더링 가능하게 하세요.
4. 댓글 컴포넌트는 기본 인터랙션(UI 및 상태관리)까지 포함해주세요.
