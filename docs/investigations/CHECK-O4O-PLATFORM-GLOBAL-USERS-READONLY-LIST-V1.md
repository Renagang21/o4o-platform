# CHECK-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-V1

> **작업명:** WO-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-V1
> **유형:** platform-admin 전체 사용자 read-only 목록 1차 구현 (backend 안전 투영 endpoint + frontend read-only 페이지). additive.
> **결과: PASS — `GET /api/v1/admin/platform-users`(안전 필드 투영, platform guard) + `/admin/platform/users` read-only 페이지. raw `/admin/users` 미직결, action/PII 미노출. api-server·web-neture typecheck 0.**
> 선행: IR-O4O-PLATFORM-GLOBAL-USERS-UI-SCOPE-AUDIT-V1 (권장안 B) — 2026-06-17

---

## 1. 추가/수정 파일 (6 + CHECK)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/admin/platform-users.routes.ts` | **신규** — `GET /` 안전 투영 read endpoint |
| `apps/api-server/src/bootstrap/register-routes.ts` | import + `app.use('/api/v1/admin/platform-users', ...)` |
| `services/web-neture/src/lib/api/platform.ts` | `PlatformUser`/params/result 타입 + `platformAdminApi.getUsers()` |
| `services/web-neture/src/pages/admin/platform/PlatformUsersPage.tsx` | **신규** read-only 목록 페이지 |
| `services/web-neture/src/App.tsx` | lazy import + `<Route path="users">`(PlatformRoute 하위) |
| `services/web-neture/src/pages/admin/platform/PlatformSectionLayout.tsx` | local nav '사용자 조회' 추가 |
| `services/web-neture/src/pages/admin/platform/PlatformAdminLandingPage.tsx` | 'Global 사용자 관리' 카드 → '전체 사용자 조회', `to` 연결 + '조회 전용' 배지 |

> 기존 `/admin/users`(raw·mutation) **무변경**. operator/service-admin 회원관리 화면 무변경. DB/migration 0. Neture admin sidebar 미변경(section 내부 nav 만).

## 2. backend — 안전 투영 endpoint

`GET /api/v1/admin/platform-users` (`platform-users.routes.ts`)
- guard: `authenticate` → `requireRole(['platform:super_admin','platform:admin'])`. (서비스 admin/operator 비허용)
- query: `page` · `limit`(max 100) · `search`(firstName/lastName/email/company ILIKE) · `role`(role_assignments active EXISTS) · `status`. AdminUserController 목록 쿼리 패턴 복제(중복 최소), roles 배치 조회(role_assignments active ARRAY_AGG).
- **응답 투영(명시적 pick, spread 금지):**
  ```ts
  { id, email, name, roles[], status, isActive, createdAt, lastLoginAt }
  ```
- **제외(미반환):** password · refreshTokenFamily · phone · businessInfo · lastLoginIp · provider/provider_id · kakao URL · avatar · 동의 타임스탬프 · company 등 — 즉 `/admin/users` 의 raw spread(password 만 제거)와 정반대로 **허용 필드만 화이트리스트**.
- mutation **없음**(GET 1개만). 기존 `/admin/users` 의 POST/PUT/PATCH/DELETE 는 미사용·무변경.

## 3. frontend — read-only 페이지

`/admin/platform/users` (`PlatformUsersPage`, PlatformRoute 하위)
- 표시 컬럼: 이름/이메일 · 역할(라벨) · 상태 · 활성 · 가입일 · 최근 로그인. **관리 컬럼/버튼 없음**.
- 검색(이메일/이름/회사) + 상태 필터 + pagination(이전/다음, total/page 표시).
- **read-only 안내 2종**: "이 화면은 read-only … 이용중지·개인정보 파기·권한 변경은 각 전용 화면" + "최소 정보만 표시(연락처·동의·IP 미표시)".
- **action 버튼 미노출**: 수정/삭제/비활성화/이용중지/역할변경/상세개인정보/비밀번호 **전부 없음**.
- Landing 카드 '조회 전용' 배지 + local nav '사용자 조회' 진입.

## 4. 경계/정책 준수

| 레이어 | 책임 | 본 화면 |
|------|------|------|
| operator | 이용중지/재개 | 미노출 |
| service admin | 완전삭제/개인정보 파기 | 미노출 |
| **platform admin** | 전체 사용자 **식별/거버넌스 read-only** | ✅ 본 화면(조회만) |

- raw `/admin/users` frontend 직결 **금지** 준수 → 전용 투영 endpoint 경유.
- guard platform-level 유지(neture:admin 단독 비허용 — PlatformRoute + backend requireRole).

## 5. 검증

- **typecheck PASS:** api-server 0 · web-neture 0.
- 정적: 응답 필드 화이트리스트(refreshTokenFamily/lastLoginIp/phone/businessInfo/password **미포함**), GET-only(mutation 없음), pagination/search/role·status filter, frontend action 버튼 0, PlatformRoute guard.
- **browser smoke 미수행** — 운영 배포 후 권장(SMOKE-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-POST-DEPLOY-V1):
  1. `/admin/platform/users` 접근 → 목록/검색/상태필터/pagination
  2. 응답 PII 과다 노출 없음(네트워크 탭 — refreshTokenFamily/lastLoginIp/phone 부재)
  3. action 버튼 없음 · accounts/services 무회귀
- **계정 제약:** pure neture:admin-only / pure platform:admin 계정 부재 → negative guard runtime 검증 **미검증**(코드상 PlatformRoute+requireRole 동일 패턴, accounts/services 와 동형).

## 6. 불변 / 미구현 확인 (§7)

- 기존 `/admin/users` raw response·mutation **무변경**. 상태변경/삭제/파기/role·membership 편집 UI **없음**. detail page **없음**. 개인정보 상세 조회 **없음**.
- operator/member·service admin 회원관리 화면 **무변경**. Tier 1 route 이동 / sidebar role 진입점 / Finance / GP·KCos·KPA frontend / DB migration **변경 0**.

## 7. 완료 판정

**PASS.** 안전 투영 endpoint(`/admin/platform-users`, platform guard, 화이트리스트 필드, GET-only) + `/admin/platform/users` read-only 페이지(검색·필터·pagination, action 0, read-only 안내) + Landing/nav 연결. raw 직결 금지·PII 미노출·경계 침범 0 준수. typecheck 통과. browser/negative-guard 는 배포 후/계정 제약으로 미검증.

## 8. 후속

1. `SMOKE-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-POST-DEPLOY-V1` — 배포 후 smoke(목록/필터/PII 부재/action 부재/무회귀).
2. (조건부) `IR-O4O-PLATFORM-USER-GOVERNANCE-POLICY-V1` — service membership 요약·상세·role 편집·개인정보 파기·감사 로그(범위 확대 시).
3. `IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1` — Tier 1(운영자/역할 관리) 이동 별도 결정.

---

*Date: 2026-06-17 · platform global users read-only 1차 · PASS · GET /admin/platform-users(안전 투영: id/email/name/roles/status/isActive/createdAt/lastLoginAt, platform guard, GET-only) + /admin/platform/users read-only 페이지(검색·상태필터·pagination, action 0) · raw /admin/users 미직결, PII(refreshTokenFamily/lastLoginIp/phone/businessInfo) 미노출, mutation 0 · 기존 admin/users·operator·service admin 경계 무변경 · api-server·web-neture typecheck 0 · browser/negative-guard 배포후/계정제약 미검증.*
