# Forum Web

> **Status**: Alpha (G7 Phase)
> **Created**: 2025-12-25
> **Based on**: web-server-reference (FROZEN)

약사 포럼 프론트엔드 애플리케이션입니다.

## Quick Start

```bash
# 개발 서버 (포트 3201)
pnpm -F @o4o/forum-web dev

# 빌드
pnpm -F @o4o/forum-web build

# 타입 체크
pnpm -F @o4o/forum-web type-check
```

## Features (Alpha)

- 로그인/로그아웃
- 게시글 목록 조회
- 게시글 상세 보기
- 게시글 작성 (로그인 필요)
- 댓글 조회 및 작성 (로그인 필요)

## Structure

```
apps/forum-web/
├── src/
│   ├── components/     # UI 컴포넌트
│   ├── pages/          # 페이지
│   ├── services/       # API 호출
│   ├── stores/         # 상태 관리 (AuthContext)
│   ├── App.tsx         # 라우팅
│   └── main.tsx        # 엔트리포인트
├── index.html
└── vite.config.ts
```

## Architecture Rules

- **authClient 필수**: 모든 API는 `authClient.api` 사용
- **API URL 직접 사용 금지**: authClient가 관리
- **JWT 직접 관리 금지**: authClient가 토큰 처리

## API Integration

Forum API 서버(포트 3100)와 연동됩니다.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/forum/threads` | GET | 게시글 목록 |
| `/api/v1/forum/threads/:id` | GET | 게시글 상세 |
| `/api/v1/forum/threads` | POST | 게시글 작성 |
| `/api/v1/forum/threads/:id/replies` | GET | 댓글 목록 |
| `/api/v1/forum/threads/:id/replies` | POST | 댓글 작성 |

## Reference

- [web-server-architecture.md](../../docs/_platform/web-server-architecture.md)
- [reference-freeze-policy.md](../../docs/_platform/reference-freeze-policy.md)
