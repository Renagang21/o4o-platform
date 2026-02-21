# Core Boundary

> **Status**: Active | **Phase**: G2 App Architecture

---

## Core API (`o4o-core-api`)

**Core = 플랫폼 공통 인프라** (모든 도메인 서비스가 의존)

### Core 도메인

| 도메인 | 엔드포인트 |
|--------|-----------|
| Authentication | `/api/v1/auth/*` |
| User Management | `/api/v1/users/*` |
| Role & Permission | `/api/v1/roles/*` |
| Organization | `/api/v1/organizations/*` |
| App Registry | `/api/v1/appstore/*` |
| Settings | `/api/v1/settings/*` |

### Frozen Cores

`auth-core`, `cms-core`, `platform-core`, `organization-core` — 구조/테이블 변경 금지 (CLAUDE.md §5)

---

## 상호작용 규칙

| 방향 | 허용 | 금지 |
|------|------|------|
| Domain → Core | REST API 호출, JWT 검증 | Core DB 직접 조회/수정 |
| Domain → Domain | REST API, 이벤트 | 타 서비스 DB 접근 |
| Core → Domain | REST API (드물게), 이벤트 | Domain 가용성 의존 |

---

## 패키지 의존 규칙

| 패키지 유형 | 사용 범위 |
|------------|----------|
| `*-client` (auth-client 등) | 모든 프론트엔드 |
| `*-core` | 소유 서비스만 |
| `types`, `utils`, `ui` | 공유 가능 |

**금지**: `apps/api-server` → `packages/forum-core` 등 도메인 패키지 직접 import

---

*참조: CLAUDE.md §3 (App 계층), §5 (Core 동결), §12 (Business Service Rules)*
