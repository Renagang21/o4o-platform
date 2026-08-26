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
| App Registry | `/api/v1/admin/apps/*` (관리자 read), `/api/v1/apps/availability` (게이팅 read) |
| Settings | `/api/v1/settings/*` |

> **App Registry 경로 정정** (WO-O4O-PUBLIC-APPSTORE-READ-CONTRACT-CENSUS-AND-DISPOSITION-V1)
> 이 표에 오래 적혀 있던 `/api/v1/appstore/*` 는 write/runtime 계약이 선행 WO 들에서 은퇴한 뒤
> `APPS_CATALOG` 를 무인증 투영하는 read 2종만 남아 있었고, code·frontend·external consumer 0 ·
> organic traffic 0 · `/admin/apps/market` 과 DUPLICATE_READ 로 확인돼 함께 은퇴했다.
> App 설치·활성 정본은 `app_registry` 테이블이며, 그 read 는 위 두 경로가 담당한다.
> App 정의 metadata 정본은 `apps/api-server/src/app-manifests/appsCatalog.ts` 다.

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
