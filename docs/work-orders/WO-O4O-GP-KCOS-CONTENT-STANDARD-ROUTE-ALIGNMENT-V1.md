# WO-O4O-GP-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1

> **목표:** GlycoPharm / K-Cosmetics 에 KPA 와 동일한 **회원 작성 콘텐츠**(`/content`) 풀세트를 백엔드 → 프론트 순으로 정렬한다.
> 현재 GP/KCos 백엔드에는 회원 write API 가 없고 operator 자료실(`/operator/resources`) CRUD + read-only `GET /contents?sub_type=resource` browse 만 존재한다.

---

## 0. 배경 / 타당성 (조사 확정)

| 항목 | KPA (reference) | GlycoPharm | K-Cosmetics |
|------|-----------------|------------|-------------|
| 회원 목록 `GET /contents` | ✅ ([kpa.routes.ts:1410](../../apps/api-server/src/routes/kpa/kpa.routes.ts#L1410)) | read-only only | read-only only |
| 회원 등록 `POST /contents` | ✅ (L1488) | ❌ | ❌ |
| 상세 `GET /contents/:id` | ✅ (L1572) | ❌ | ❌ |
| 수정 `PATCH /contents/:id` | ✅ (L1611) | ❌ | ❌ |
| 삭제 `DELETE /contents/:id` | ✅ (L1706) | ❌ | ❌ |
| 조회수 `POST /contents/:id/view` | ✅ (L1784) | ❌ | ❌ |
| 추천 `POST /contents/:id/recommend` | ✅ (L1731) | ❌ (table 없음) | ❌ (table 없음) |
| operator 자료실 CRUD | `/operator/resources` 류 | ✅ | ✅ |

- 회원 콘텐츠(`/content`) = `sub_type='content'` (프론트가 명시 — [ContentWritePage.tsx:105](../../services/web-kpa-society/src/pages/contents/ContentWritePage.tsx#L105)).
- 자료실/operator browse = `sub_type='resource'`.
- 백엔드는 `sub_type` 강제 안 함(필터만, create 시 `sub_type||null`) — 프론트가 `'content'` 박음.
- 회원 본문은 **`body`(rich text 문자열)** 에 저장 — 공통 `CommunityContentWriteShell` 의 단일 본문 필드 ([CommunityContentWriteShell.tsx:24](../../packages/shared-space-ui/src/community/CommunityContentWriteShell.tsx#L24)). `blocks` 는 사용하지 않음.

### 마이그레이션 필요 (조사로 정정 — 2026-06-14)

- `glycopharm_contents` / `cosmetics_contents` 는 `blocks`(jsonb) 만 있고 **`body` / `content_type` 컬럼이 없다.**
- 회원 본문은 `body` 에 저장되므로 **`body TEXT` nullable 컬럼 추가가 필수** (2 ALTER TABLE).
- `content_type` 은 프론트가 상수 `'information'` 만 전송(KPA 가 분류 UI 제거) → **저장하지 않음** (컬럼 불필요, 백엔드가 무시).
- `recommend` 는 범위 제외 → `*_content_recommendations` 테이블 없음, 추가하지 않음.

---

## 1. 불변 정책 (Invariants)

- 제품 비종속 (특정 상품에 묶지 않음).
- HUB browse 는 `/store-hub/content` 유지 — `/library/content` 복원 금지.
- KPA 무변경 (reference 만 참조, 코드 수정 0).
- home(`/home/latest`) 미수정.
- `body TEXT` nullable 컬럼 추가 외 스키마 변경 없음 — `content_type` 컬럼/`recommendations` 테이블 추가 금지.
- path-specific stage (git add . 금지). 다른 세션 WIP(StorePopPage 등) 미접촉.

---

## 2. Phase A — 백엔드 (선행, 게이트 필수)

### A-0. 마이그레이션
- `apps/api-server/src/database/migrations/` 에 단일 마이그레이션:
  - `ALTER TABLE glycopharm_contents ADD COLUMN IF NOT EXISTS body TEXT`
  - `ALTER TABLE cosmetics_contents ADD COLUMN IF NOT EXISTS body TEXT`
  - down: 각 `DROP COLUMN IF EXISTS body`.

### A-1. GP/KCos contents 라우터 팩토리에 회원 핸들러 미러링
대상: `glycopharm/controllers/resources.controller.ts`, `cosmetics/controllers/resources.controller.ts`
`createGlycopharm/CosmeticsContentsRouter` 에 KPA 회원 핸들러를 미러링:

| 메서드 | 인증 | 비고 |
|--------|------|------|
| `GET /` (목록) | optionalAuth | `?search ?sub_type ?my ?category ?tag ?status ?sort` 지원 (기존 resource browse 호환 유지) |
| `POST /` | authenticate | tags ≥1 필수, `body`/`sub_type`(`||null`)/`reusable_policy` 저장, `content_type` 무시, `usage_type` 파생 |
| `GET /:id` | optionalAuth | recommend 제외 (isRecommendedByMe 미포함) |
| `PATCH /:id` | authenticate | 본인(`created_by`) 또는 operator/admin |
| `DELETE /:id` | authenticate | 본인 또는 operator/admin, soft delete |
| `POST /:id/view` | optionalAuth | `view_count + 1` |

- **제외**: `POST /:id/recommend`, AI 엔드포인트(`/ai/*`), `copy-to-store` (범위 외).
- operator/admin 판정: `req.user.roles` 에 `{service}:operator` / `{service}:admin` / `platform:super_admin` 포함 여부 (인라인 헬퍼).
- 팩토리 시그니처에 `authenticate` 미들웨어 추가 → 호출부([glycopharm.routes.ts:558](../../apps/api-server/src/routes/glycopharm/glycopharm.routes.ts#L558), cosmetics 동형) 에서 전달.
- 감사로그(`writeAuditLog`)는 KPA 고유 — GP/KCos 팩토리에서는 생략.

### A-게이트
- `pnpm --filter @o4o/api-server typecheck` + `build` 통과.
- 엔드포인트 존재 확인(정적/배포 후 curl). **Phase A 완료 전 Phase B 착수 금지.**

---

## 3. Phase B — 프론트 (Phase A 이후)

KPA wrapper 미러링 (`CommunityContentWriteShell` / DetailView / SearchBar):
- route: `/content`, `/content/documents`, `/content/documents/new`, `/content/:id`, `/content/:id/edit`
- GP `/content` redirect→회원목록 대체, KCos `/content` 신규 연결, `sub_type='content'` 명시
- `contentApi` (서비스별) create/update/detail/list/remove/view 연결

---

## 4. 작업 규칙

- 사전 `git pull origin main`.
- 코드 변경 1파일씩 순차 + diff 보고.
- Phase 별 typecheck → commit/push (path-specific stage).
- 다른 세션 WIP 충돌 시 중단·보고.

## 5. 산출물
- CHECK: `docs/investigations/CHECK-O4O-GP-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1.md`

---

*Created: 2026-06-14 · Status: Phase A 완료(배포·마이그레이션·smoke PASS) · Phase B GP/KCos 구현 완료(documents-only)*
