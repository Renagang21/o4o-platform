# CHECK-O4O-PLATFORM-USERS-SEARCH-COMPANY-FIELD-FIX-V1

> **작업명:** WO-O4O-PLATFORM-USERS-SEARCH-COMPANY-FIELD-FIX-V1
> **유형:** 운영 장애 FIX — `/admin/platform-users` 검색 500. platform-users endpoint **한정**.
> **결과: PASS — search 절에서 존재하지 않는 `user.company` 제거(email/firstName/lastName 유지). PII 투영·필터·pagination·GET-only 무회귀. api-server typecheck 0.**
> 선행: SMOKE-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-POST-DEPLOY-V1 (search FAIL) — 2026-06-17

---

## 1. 원인

- `GET /api/v1/admin/platform-users?search=...` → 500 `LIST_FAILED`.
- search 절이 `... OR user.company ILIKE :s` 참조 → **User 엔티티에 `company` 속성 없음**(`User.ts`: email/firstName/lastName/nickname 존재, company 없음) → TypeORM 쿼리 오류.

## 2. 수정 파일 (1 + CHECK)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/admin/platform-users.routes.ts` | search 절에서 `user.company` 제거 |
| `docs/investigations/CHECK-O4O-PLATFORM-USERS-SEARCH-COMPANY-FIELD-FIX-V1.md` | 본 CHECK |

```diff
- '(user.firstName ILIKE :s OR user.lastName ILIKE :s OR user.email ILIKE :s OR user.company ILIKE :s)'
+ '(user.firstName ILIKE :s OR user.lastName ILIKE :s OR user.email ILIKE :s)'
```
- 검색 대상: email / firstName / lastName (모두 User 실재 속성). nickname 등 추가 안 함(WO §5.1 최소 안전안).

## 3. 정책 준수

- **platform-users endpoint 한정** — 기존 `/admin/users` · `AdminUserController.getUsers` **미수정**(frozen core 성격, 동일 latent bug 는 §6 후보로만 기록).
- **PII projection 불변** — 응답 필드 변경 0(검색 대상은 WHERE 절일 뿐, SELECT 투영 무관). 허용 8필드(id/email/name/roles/status/isActive/createdAt/lastLoginAt) 유지.
- **GET-only 유지** — mutation 추가 0.

## 4. 검증

- **api-server typecheck PASS** (EXIT 0).
- 정적: WHERE 절만 변경(company 제거), SELECT projection·필터·pagination·guard 무변경.
- **배포 후 API 재검증 권장**(§6 SMOKE-...-SEARCH-FIX): `?search=<email 일부>` → 200/결과, `?search=없는값` → 200/empty, status/role/page2 무회귀, 응답 8필드 유지.

## 5. 완료 판정

**PASS.** search 500 원인(`user.company`) 제거, 검색 대상 email/firstName/lastName, PII 투영·필터·pagination·GET-only 무회귀, api-server typecheck 통과, platform-users 한정(기존 admin/users 미접촉).

## 6. 별도 점검 후보 (이번 커밋 미포함)

- `AdminUserController.getUsers`(frozen `/admin/users`)도 동일 `user.company ILIKE` 라인 보유 → **동일 latent 500 가능**. frozen/admin core 성격이라 본 FIX 에 미혼합. 별도 판단(IR/WO) 후보로만 기록.

## 7. 후속

1. `SMOKE-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-SEARCH-FIX-V1` — 배포 후 search 200 + PII 미노출 + 필터/pagination 무회귀 재검증.
2. (선택) `IR-O4O-ADMIN-USERS-SEARCH-COMPANY-LATENT-BUG-V1` — frozen `/admin/users` 동일 라인 점검.

---

*Date: 2026-06-17 · platform users search company FIX · PASS · platform-users.routes search 절 user.company 제거(email/firstName/lastName 유지) · PII 투영/필터/pagination/GET-only 무회귀 · 기존 /admin/users·AdminUserController 미수정(동일 latent bug 별도 후보) · api-server typecheck 0 · 배포후 search smoke 권장.*
