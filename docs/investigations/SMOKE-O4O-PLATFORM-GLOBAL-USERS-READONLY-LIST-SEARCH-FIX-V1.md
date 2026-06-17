# SMOKE-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-SEARCH-FIX-V1

> **대상 WO:** WO-O4O-PLATFORM-USERS-SEARCH-COMPANY-FIELD-FIX-V1
> **유형:** 운영 배포 후 재검증 (API 직접 호출). GET only — 운영 데이터 변경 없음.
> **판정: PASS** — search 500 해소(존재값 결과 / 없는값 empty), PII 투영·status/role 필터·pagination 무회귀.
> **검증일:** 2026-06-17 (UTC ~01:14)

---

## 1. 배포 상태

- FIX 커밋 `36174fde1` 반영. 검증 시점 라이브 리비전 **`o4o-core-api-02225-86g`**.
- 폴링으로 배포 전환 확인: 이전 리비전(02224)까지는 `search` 여전히 500 → **02225 부터 200**(fix 반영 시점 명확).

## 2. 검증 계정

- `sohae2100@gmail.com` (roles 에 `platform:super_admin` 포함). httpOnly 쿠키 인증.
- pure 비-platform 계정 부재 → negative guard 미검증(코드상 PlatformRoute+requireRole). 자격증명은 `docs/local/TEST-ACCOUNTS.local.md`(gitignore) transient 사용 — 본 문서 미기재.

## 3. 검증 결과 (`GET /api/v1/admin/platform-users`)

| # | 항목 | 결과 |
|---|------|------|
| 5.1 | 기본 목록(limit=3) | ✅ success, total 33, PII **CLEAN**(8필드만) |
| 5.2 | **search 존재값(`gmail`)** | ✅ **success, total 12, rows 3, PII CLEAN** — 500 해소 |
| 5.3 | **search 없는값** | ✅ success, total 0, empty(500 없음) |
| 5.4 | status=active | ✅ success, total 13, 전 행 active |
| 5.5 | role=platform:super_admin | ✅ success, rows 2, 전 행 해당 role |
| 5.6 | page=2 | ✅ page 2, total 33, rows 3 |
| 5.7 | **PII/보안 필드 미노출** | ✅ 전 호출 응답 keys = `[id,email,name,roles,status,isActive,createdAt,lastLoginAt]` 만. password/refreshTokenFamily/lastLoginIp/phone/businessInfo/firstName/lastName/nickname 등 **미노출** |

## 4. 회귀/안전 확인

- search 수정(WHERE 절 `user.company` 제거)이 **PII 투영(SELECT) 무영향** — 검색 결과 응답도 8필드만(5.2 CLEAN).
- status/role/pagination **무회귀**(5.4~5.6).
- GET only — mutation 미호출, 운영 데이터 변경 **0**.

## 5. 판정

**PASS.** `?search=` 500 해소(존재값 정상 결과 / 없는값 empty), PII 안전 투영 유지, status·role 필터·pagination 무회귀, 운영 데이터 무변경.
- ⏸ negative guard(pure 비-platform 계정 부재) · browser UI(action 버튼 부재/카드/무회귀)는 직전 smoke와 동일하게 미검증/배포후 권장 — 단 핵심 보안(PII)·기능(search/filter/pagination)은 운영 검증 완료.

## 6. 후속

- **platform-admin 1차 surface 종료 고정** 가능 → `CHECK-O4O-PLATFORM-ADMIN-SURFACE-PHASE1-CLOSURE-V1`(route/accounts/services/users/entrypoint/smoke 정리, 남은 후속을 Tier 1 이동 결정 / user governance / global entrypoint 로 분리).
- (선택) `IR-O4O-ADMIN-USERS-SEARCH-COMPANY-LATENT-BUG-V1` — frozen `/admin/users` 동일 `user.company` 라인 점검.

---

*Date: 2026-06-17 · platform users search FIX 배포후 smoke · PASS · 리비전 o4o-core-api-02225-86g · search 200(존재 total 12/없음 empty, 500 해소) · PII 투영 CLEAN(8필드) · status/role/pagination 무회귀 · GET-only 운영데이터 무변경 · negative guard·browser UI 미검증 · 후속 phase1 closure CHECK.*
