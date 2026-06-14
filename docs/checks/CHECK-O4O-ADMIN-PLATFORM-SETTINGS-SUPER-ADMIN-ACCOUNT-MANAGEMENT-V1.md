# CHECK-O4O-ADMIN-PLATFORM-SETTINGS-SUPER-ADMIN-ACCOUNT-MANAGEMENT-V1

> **WO:** WO-O4O-ADMIN-PLATFORM-SETTINGS-SUPER-ADMIN-ACCOUNT-MANAGEMENT-V1
> **유형:** admin-dashboard `/settings` 에 "관리자 계정" 탭 추가 + api-server additive 계정 관리 endpoint (full-stack)
> **작성일:** 2026-06-14
> **상태:** ✅ **구현 완료** — backend additive route(+register) + frontend Settings 탭. api-server tsc 0, 변경 파일 tsc 0. 배포/smoke는 §9.

## 1. 목적
admin.neture.co.kr `/settings` 에 최고/플랫폼 관리자 계정의 **로그인 ID·역할·활성 상태 확인 + 비밀번호 재설정(새 값만) + 활성 토글**을 제공. 기존 비밀번호는 조회/표시하지 않음. 역할 편집은 V1 범위 밖(RBAC Role Assignment 안내).

## 2. 변경 파일 (4 + CHECK)
| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/admin/platform-accounts.routes.ts` | **신규** — GET 목록 / PATCH password / PATCH status (가드·보호 격리) |
| `apps/api-server/src/bootstrap/register-routes.ts` | import + `app.use('/api/v1/admin/platform-accounts', …)` 2줄 |
| `apps/admin-dashboard/src/pages/settings/AdminAccountsSettings.tsx` | **신규** — 탭 컴포넌트(목록 테이블 + 비번 재설정 모달 + 상태 토글) |
| `apps/admin-dashboard/src/pages/settings/Settings.tsx` | 탭 등록(import + settingsTabs + Route) |

**무변경(중요):** frozen `AdminUserController`/`users.routes`(WO-O4O-CORE-FREEZE-V1) **미수정** — additive 신규 route 로 격리. DB/migration 없음. package.json/pnpm-lock/Dockerfile 없음. 기존 `/admin/users` 동작 불변. Neture/web-* 무관.

## 3. Backend (additive, 재사용 중심)
- 경로: `/api/v1/admin/platform-accounts` (기존 `/admin/platform`·`/admin/platform-services` 와 충돌 없는 신규 경로).
- 가드: `authenticate` + `requireRole(['platform:super_admin','platform:admin'])`.
- **재사용(중복 0):** `User` 엔티티, `hashPassword`(auth.utils), `roleAssignmentService`(RBAC SSOT: `getUsersWithRole`/`getRoleNames`/`hasRole`).
- **GET /** — `ADMIN_ACCOUNT_ROLES`(platform:super_admin/admin, neture:admin/operator) 보유 user 합집합 → 안전 DTO(id/email/name/roles/isActive/status/createdAt/lastLoginAt). **password 등 민감필드 미포함.** super_admin 우선 정렬.
- **PATCH /:id/password** — `{ newPassword }`, 최소 8자 검증 → `hashPassword` → 저장. 응답에 민감정보 0.
- **PATCH /:id/status** — `{ isActive }`.

### 3.1 서버측 보호 (frontend 차단에 의존하지 않음)
| 코드 | 보호 |
|------|------|
| `SELF_LOCK` | 본인(`req.user.id===id`) 비활성 차단 |
| `LAST_SUPER_ADMIN` | 비활성 시 활성 super_admin 이 0 이 되면 차단(활성 super_admin id 집합에서 대상 제외 후 0 검사) |
| `SUPER_ADMIN_ONLY` | super_admin 대상의 비번/상태 변경은 actor 도 super_admin 이어야 함 |
| `WEAK_PASSWORD` | 최소 길이 미만 차단 |

## 4. Frontend (탭)
- `/settings` settingsTabs 에 "관리자 계정"(Users 아이콘) 추가 + `admin-accounts` Route. 기존 OAuth/AI Services/AI Query/Email 구조 유지.
- `authClient.api` (get/patch). 목록 테이블(이름·이메일·역할 badge·활성·생성일·마지막 로그인) + 행별 "비밀번호 재설정"(모달: 새 비번+확인, 최소 8자/일치 검증) + "활성/비활성"(confirm).
- 역할 변경은 "RBAC Role Assignment 에서 관리" 안내만(편집 미제공).
- 접근 거부(403) 시 안내 문구 표시. toast(react-hot-toast)로 성공/실패.
- 접근 route 가드: 기존 `/settings` (`AdminProtectedRoute settings:read`) 상속 + API 가 super_admin/admin enforce(이중).

## 5. 보안 가드 요약
- 응답에 password/passwordHash/token 미포함(GET DTO 화이트리스트).
- 본인 잠금·마지막 super_admin·super_admin 대상 변경 권한 = **서버 enforce**(§3.1). frontend는 confirm/검증 보조만.
- 비밀번호 해싱은 기존 `hashPassword` 재사용(자체 bcrypt 작성 0). User `@BeforeUpdate` 해시 훅은 `$2` 접두 검사로 이중해시 안 함.

## 6. V1 범위 / 제외
- 포함: 목록·비번 재설정·활성 토글.
- 제외(의도): 역할 편집(RBAC Role Assignment 로), 계정 생성/삭제, 비번 조회/표시, DB/migration, 기존 frozen core 수정.

## 7. 검증
| 항목 | 결과 |
|------|------|
| api-server `tsc --noEmit` | ✅ exit 0, error 0 |
| admin-dashboard 변경 파일(AdminAccountsSettings/Settings) tsc | ✅ error 0 |
| admin-dashboard 전체 tsc | ⚠️ 기존 4건(`apps.routes.tsx` → `@o4o/cgm-pharmacist-app` 모듈 미해결) — **본 작업과 무관(타세션/기존)**, 본 변경 파일엔 에러 0 |
| frozen AdminUserController/users.routes | 무수정 |
| DB/migration/package/Dockerfile | 무변경 |
| 브라우저 smoke | ⏭️ 배포 후 — `/settings` "관리자 계정" 탭 진입 → 목록 표시 / 비번 재설정 모달 open·저장 / 본인 비활성 차단(403) / 마지막 super_admin 차단(403) 1회 확인 |

## 8. Commit / 배포
- backend(2) + frontend(2) + CHECK: 단일 path-specific commit `ee3ff4852` (push `7cce5ac4a..ee3ff4852`, divergence 0 0).
- 배포: **Deploy API Server** run `27492717295` ✅ success · **Deploy Admin Dashboard** run `27492717338` ✅ success · admin.neture.co.kr 200.
- **엔드포인트 sanity:** `GET /api/v1/admin/platform-accounts` (no auth) → **HTTP 401**(라우트 마운트 + 가드 작동 확인, 404 아님).
- 잔여: 인증 후 브라우저 smoke(§7) — Playwright 점유로 보류. 가용 시 super_admin 로그인 → `/settings` "관리자 계정" 탭 1회 확인 권장.

## 9. 후속 (선택)
1. 접근을 super_admin 전용으로 더 좁힐지 정책 결정(현재 super_admin+admin, super_admin 대상은 super_admin 만).
2. 감사 로그(action-log-core)로 비번 재설정/상태 변경 기록.
3. 역할 편집을 본 탭에 통합할지(현재는 RBAC 화면 분리 유지 권장 — 권한 자가잠금 위험).

## 10. 완료 판정
**PASS(구현).** frozen core 미수정 + additive 신규 endpoint(entity/hash/RBAC 재사용) + Settings 탭. 비번 조회 없이 재설정만, 본인·마지막 super_admin·super_admin 대상 보호 **서버 enforce**. tsc(본 변경) 0. 배포·smoke 후속.

---

*End of CHECK-O4O-ADMIN-PLATFORM-SETTINGS-SUPER-ADMIN-ACCOUNT-MANAGEMENT-V1*
