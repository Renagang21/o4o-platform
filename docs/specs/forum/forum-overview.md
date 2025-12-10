# Forum App Overview

## 1. 목적(Purpose)

커뮤니티 게시판(Forum)의 핵심 앱으로,
게시글(Post), 댓글(Comment), 카테고리(Category), 알림(Notification) 구조를 제공하며
Organization 연동을 통해 멀티 조직(멀티테넌트) 환경을 지원한다.

## 2. 개요(Overview)

- **Core App**: forum-core (범용 게시판 엔진)
- **Extension App**: forum-yaksa (약사회 특화), forum-cosmetics (화장품 커뮤니티)
- **CMS 연동**: CPT(Post, Category), ACF(필드 확장), View(목록/상세)
- **Organization 연동**: organizationId 기반 멀티테넌트 지원

## 3. 핵심 구성요소(Key Components)

### 1) Post (게시글)

| 필드 | 타입 | 설명 |
|------|------|------|
| title | string | 제목 |
| content | blocks | 본문 (블록 기반) |
| authorId | relation | 작성자 참조 |
| categoryId | relation | 카테고리 참조 |
| organizationId | relation | 조직 참조 (optional) |
| status | enum | 상태 (draft/published/hidden) |
| viewCount | number | 조회수 |

### 2) Comment (댓글)

| 필드 | 타입 | 설명 |
|------|------|------|
| postId | relation | 게시글 참조 |
| authorId | relation | 작성자 참조 |
| content | text | 댓글 내용 |
| parentId | relation | 부모 댓글 (대댓글용) |

### 3) Category (카테고리)

| 필드 | 타입 | 설명 |
|------|------|------|
| name | string | 카테고리명 |
| slug | string | URL용 슬러그 |
| parentId | relation | 부모 카테고리 |
| order | number | 정렬 순서 |

### 4) Notification (알림)

| 필드 | 타입 | 설명 |
|------|------|------|
| userId | relation | 수신자 참조 |
| type | enum | 알림 유형 (comment/mention/reply) |
| postId | relation | 관련 게시글 |
| isRead | boolean | 읽음 여부 |

## 4. 흐름(Flow)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  게시글 작성  │───▶│    댓글      │───▶│    알림      │
└──────────────┘    └──────────────┘    └──────────────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│  조회/검색   │───▶│ 카테고리 정렬 │
└──────────────┘    └──────────────┘
```

**요약**: 게시글 작성 → 댓글 → 알림 → 조회/검색 → 카테고리 기반 정렬

## 5. 규칙(Rule Set)

1. **단순 구조 유지**: Forum 구조는 Post/Comment 중심으로 단순하게 유지
2. **멀티테넌트 지원**: organizationId 연동 시 다중 조직(멀티테넌트) 지원
3. **검색 모듈 분리**: 검색 기능은 별도 확장 모듈로 제공
4. **Extension 패턴**: 특화 기능은 forum-yaksa 등 Extension으로 확장
5. **블록 기반 본문**: 게시글 본문은 CMS 블록 시스템 사용

---
*최종 업데이트: 2025-12-10*
*상태: 초안 완료*
