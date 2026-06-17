# SMOKE-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-POST-DEPLOY-V1

> **대상 WO:** WO-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-V1
> **유형:** 운영 배포 후 smoke (API 직접 호출 검증). 운영 데이터 변경 없음(GET only).
> **판정: PARTIAL PASS** — 목록·**PII 투영**·상태/역할 필터·pagination·platform guard **PASS**. **search FAIL**(`LIST_FAILED` — 엔드포인트가 존재하지 않는 `user.company` 참조). negative guard 미검증(계정 제약). browser UI 미수행(API 계약으로 대체).
> **검증일:** 2026-06-17 (UTC ~00:50)

---

## 1. 배포 상태

- 커밋 `2b0b3a44e` → CI: **Deploy API Server in_progress → 완료**, 새 리비전 **`o4o-core-api-02221-z7k`** 라이브(이전 02220 대체 확인). Web Services deploy 완료.
- 검증 시점 API 리비전에 `/api/v1/admin/platform-users` 엔드포인트 **반영됨**(응답 정상 수신).

## 2. 검증 계정

- `sohae2100@gmail.com` (통합 admin). 로그인 응답 roles 10개에 **`platform:super_admin` 포함** 확인 → platform guard 통과 계정.
- httpOnly 쿠키 인증(body 토큰 없음) — 쿠키 jar 로 검증.
- **pure neture:admin-only / pure platform-only 계정 부재** → negative guard runtime 미검증(코드상 PlatformRoute+requireRole, accounts/services 동형).
- ⚠️ 자격증명은 `docs/local/TEST-ACCOUNTS.local.md`(gitignore) 에서 transient 사용 — 본 문서 미기재.

## 3. 검증 결과 (API: `GET /api/v1/admin/platform-users`)

| # | 항목 | 결과 |
|---|------|------|
| 3.1 | 기본 목록(page=1) | ✅ success:true, pagination `{page:1,limit:3,total:33,totalPages:11}` |
| 3.2 | **PII/보안 필드 미노출** | ✅ **PASS** — row keys = `[id,email,name,roles,status,isActive,createdAt,lastLoginAt]` **8개 허용 필드만**. 비허용 EXTRA **NONE**, PII/보안(password/refreshTokenFamily/lastLoginIp/phone/businessInfo/avatar/동의ts/nickname/firstName/lastName) **NONE** |
| 3.3 | status filter(`active`) | ✅ success:true, total 13, 전 행 status=active |
| 3.4 | role filter(`platform:super_admin`) | ✅ success:true, rows 2, 전 행 해당 role 보유 (RBAC "super_admin 2명"과 일치) |
| 3.5 | pagination(page=2) | ✅ page 2, limit 3, total 33, rows 3 |
| 3.6 | **search(`neture`/한글)** | ❌ **FAIL** — `{"success":false,"error":"사용자 목록 조회 실패","code":"LIST_FAILED"}` (모든 검색어) |
| 3.7 | platform guard | ✅ platform:super_admin 계정 200. (비-platform 계정 미보유 → negative 미검증) |
| 3.8 | mutation | ✅ GET-only — endpoint 에 POST/PUT/PATCH/DELETE 없음(코드 확인) |

## 4. 🔴 발견 결함 (FAIL) — search LIST_FAILED

- **증상:** `?search=<any>` → 500/`LIST_FAILED`. 목록/필터/pagination 은 정상이나 **검색만 실패**.
- **원인(코드 정적):** `platform-users.routes.ts` 의 search 절이 `(user.firstName ILIKE :s OR user.lastName ILIKE :s OR user.email ILIKE :s OR **user.company** ILIKE :s)` 를 사용. **User 엔티티에 `company` 속성 없음**(`User.ts` grep 결과 없음) → TypeORM 쿼리 오류.
- **유래:** `AdminUserController.getUsers`(line 79)의 동일 search 절을 복제 → **동일 latent 버그가 frozen `/admin/users` 에도 존재**(해당 경로 search 도 동일 실패 추정).
- **영향:** 검색 기능만 무력(목록/필터/pagination/PII 안전은 정상). 운영 데이터 영향 없음.
- **WO §7 준수:** smoke 단계 — **즉시 수정하지 않고 기록**. 별도 FIX WO 로 분리(§7).

## 5. browser UI smoke

- **미수행(별도).** §6.4 핵심(PII 미노출)은 **API 응답 = UI 소비 데이터**로 authoritative 검증됨(§3.2). action 버튼 부재는 정적 사실(`PlatformUsersPage` 에 mutation 핸들러 0). Landing 카드/nav/무회귀(accounts·services·Neture admin)는 배포 후 브라우저 확인 권장.

## 6. 운영 데이터 변경 없음

- 전 호출 GET. 상태변경/삭제/파기/role 변경/비밀번호 **0**. mutation 미호출.

## 7. 판정

**PARTIAL PASS.**
- ✅ 목록·**PII 안전 투영(핵심)**·status/role 필터·pagination·platform guard·GET-only·운영데이터 무변경.
- ❌ **search FAIL**(`user.company` 부재 — FIX 필요).
- ⏸ negative guard 미검증(pure 비-platform 계정 부재) / browser UI 미수행(API 계약으로 대체).

→ 개인정보 노출 방지(본 작업 핵심 목표)는 **운영 환경에서 PASS 확인**. 검색 결함은 FIX WO 로 분리.

## 8. 후속

1. **(FIX 필요)** `WO-O4O-PLATFORM-USERS-SEARCH-COMPANY-FIELD-FIX-V1` — `platform-users.routes.ts` search 절에서 `user.company` 제거(또는 User 의 실제 회사 필드로 교체). + `AdminUserController.getUsers` 동일 라인 점검(frozen 영역 → 별도 판단).
2. 배포 후 browser UI smoke(action 버튼 부재 / 카드·nav / accounts·services·Neture admin 무회귀).
3. (조건부) governance 확장 IR / Tier 1 이동 IR — search FIX 후 platform-admin 1차 종료 고정 CHECK 권장.

---

*Date: 2026-06-17 · platform global users read-only 배포후 smoke · PARTIAL PASS · 리비전 o4o-core-api-02221-z7k · PII 투영 PASS(허용 8필드만, 보안/PII NONE) · status/role/pagination/guard PASS · search FAIL(user.company 부재 → LIST_FAILED, AdminUserController 복제 latent 버그) · negative guard·browser UI 미검증 · 운영데이터 무변경 · 후속 search FIX WO.*
