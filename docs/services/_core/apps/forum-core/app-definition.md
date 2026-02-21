# forum-core

> **Status**: FROZEN (Foundation Core) | **Version**: 1.0.0 | **Package**: @o4o/forum-core

## 역할

포럼 핵심 기능 (게시판, 댓글, 좋아요). yaksa, platform에서 사용.

| 책임 | 경계 |
|------|------|
| Forum 게시판 관리 | 업종별 확장 → Extension (forum-yaksa 등) |
| Post / Comment / Reaction | 권한 → organization-core |

## 외부 노출

**Services**: ForumService, PostService, CommentService
**Types**: Forum, Post, Comment, Reaction
**Events**: `forum.created`, `post.created`, `post.updated`, `comment.created`

## API Routes

- `/api/v1/forum`
- `/api/v1/forum/:id/posts`
- `/api/v1/posts/:id/comments`

## Dependencies

없음 (Foundation Core)
