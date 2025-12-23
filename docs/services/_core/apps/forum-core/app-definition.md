# forum-core - Definition

> 앱 정의 문서

## 앱 정보

- **App ID:** forum-core
- **App Type:** core
- **Package:** @o4o/forum-core (formerly @o4o-apps/forum)
- **Service Group:** yaksa, platform
- **Status:** @status FROZEN - Foundation Core

## 역할 및 책임

### 주요 역할
포럼 핵심 기능을 제공하는 Foundation Core로서 게시판, 댓글, 좋아요 등을 관리한다.

### 책임 범위
- Forum 게시판 관리
- Post 관리
- Comment 관리
- Like/Reaction 관리

### 경계
- 포럼 기본 기능만 담당
- 업종별 확장은 Extension에 위임 (forum-yaksa, forum-cosmetics 등)
- 권한 관리는 organization-core에 위임

## 의존성

### Core Dependencies
(없음 - Foundation Core)

### Optional Dependencies
(없음)

## 외부 노출

### Services
- ForumService
- PostService
- CommentService

### Types
- Forum
- Post
- Comment
- Reaction

### Events
- `forum.created`
- `post.created`
- `post.updated`
- `comment.created`

## 설정

### 기본 설정
(manifest에 defaultConfig 없음)

### 환경 변수
(없음)

## 특징

- @status FROZEN (Foundation Core)
- Phase 2에서 forum-app → forum-core로 명칭 변경
- yaksa, platform 서비스에서 사용
