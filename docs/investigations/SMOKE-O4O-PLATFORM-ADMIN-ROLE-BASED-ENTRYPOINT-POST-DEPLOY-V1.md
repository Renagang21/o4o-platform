# SMOKE-O4O-PLATFORM-ADMIN-ROLE-BASED-ENTRYPOINT-POST-DEPLOY-V1

> **성격**: 배포 후 browser smoke (Playwright, 운영 환경). 코드/route/backend/DB 수정 0. **운영 데이터 변경 0**(read-only, mutation 미실행).
> **대상**: Neture `/admin` 진입 카드 + 카드 클릭 → `/admin/platform/*` + Neture admin 무회귀.
> **선행**: `WO-O4O-PLATFORM-ADMIN-ROLE-BASED-ENTRYPOINT-V1` (commit `66132b54c`)
> **검증 일시**: 2026-06-16
> **배포 확인**: CI "Deploy Web Services (Cloud Run)" headSha `66132b54c` = **completed success** → 운영 반영됨.
> **계정**: 통합 운영자 계정(SSOT, neture:admin + platform:super_admin 동시 보유) — 자격증명 미기재.
> **판정: ⚠️ PARTIAL PASS** — 진입점 표시·이동·UI·무회귀 정상. pure neture:admin-only 미노출 / pure platform:admin 직접 접근은 계정 부재로 미검증.

---

## 0. 판정 요약 (TL;DR)

| 검증 | 결과 |
|---|:--:|
| platform 권한 계정 → `/admin` 에 "O4O 플랫폼 관리" 카드 표시 | ✅ |
| 카드 클릭 → `/admin/platform` 이동 + landing 표시 | ✅ |
| `/admin/platform/accounts` 접근 | ✅ |
| `/admin/platform/services` 접근 | ✅ |
| section local nav | ✅ |
| Neture admin(operators/roles/service-audience) 무회귀 | ✅ |
| console / 4xx-5xx unexpected error | 0 |
| 운영 데이터 변경 | 미실행(0) |
| **pure neture:admin-only 카드 미노출** | ⚠️ 미검증(계정 부재) |
| **pure platform:admin 직접 접근** | ⚠️ 미검증(계정 부재) |

## 1. 배포 반영 확인

| 항목 | 결과 |
|---|---|
| CI Deploy Web Services `66132b54c` | **completed: success** |
| `/admin` 카드 + 클릭 이동 browser 검증 | 정상 → 운영 반영 |

## 2. 진입점 / 이동 검증

| 단계 | 결과 |
|---|---|
| `/admin` 렌더 | 정상, console/net 0 |
| **"O4O 플랫폼 관리" 카드 표시** | ✅ (키워드 "O4O 플랫폼 관리" + "플랫폼 관리로 이동") |
| **카드 클릭** | `a[href="/admin/platform"]` 클릭 → afterUrl `/admin/platform`, landing("플랫폼 계정 관리") 표시 ✅ |

## 3. accounts / services / local nav

| route | finalUrl | console err | 4xx/5xx | 관찰 |
|---|---|:--:|:--:|---|
| `/admin/platform/accounts` | 동일 | 0 | 0 | 플랫폼 계정 관리 · 최근 로그인 · nav(계정/서비스) |
| `/admin/platform/services` | 동일 | 0 | 0 | 플랫폼 서비스 관리 · nav |

→ section nav + accounts/services 정상(직전 SMOKE-...-UI 와 동일 상태 유지).

## 4. Neture admin 무회귀

| route | finalUrl | console err | 4xx/5xx | 관찰 |
|---|---|:--:|:--:|---|
| `/admin/operators` | 동일 | 0 | 0 | 운영자 관리 · 플랫폼 (Tier1 유지) |
| `/admin/roles` | 동일 | 0 | 0 | 역할 관리 · 서비스 대상 정책 · 플랫폼 (Tier1 유지) |
| `/admin/settings/service-audience` | 동일 | 0 | 0 | 서비스 대상 정책 · 플랫폼 (Tier1 유지) |

- `/admin` 4-Block 대시보드 + Tier1 "(플랫폼)" 라벨/배너 유지. 진입 카드 추가가 기존 화면에 영향 없음.

## 5. 운영 데이터 미변경

- navigation + 텍스트/링크 클릭(카드)만 수행 — 비밀번호 재설정/활성 토글/서비스 상태 변경 **미실행**(WO §7).
- **운영 데이터 변경 0.**

## 6. 미검증 / 제약 항목

| 항목 | 사유 |
|---|---|
| **pure neture:admin-only → `/admin` 카드 미노출** | 사용 계정이 platform:super_admin 보유 → 카드 표시됨(미노출 케이스 검증 불가). 코드 정적: `hasPlatformAdminRole(['neture:admin']) === false` → 미렌더 보장. |
| **pure platform:admin → `/admin/platform` 직접 접근** | 순수 platform:admin 계정 부재. (설계상 PlatformRoute 가 platform:admin 허용, `/admin` 대시보드 카드는 미도달 — WO CHECK §7 알려진 제약.) |
| 서버 보호 메시지/ mutation | 운영 데이터 보호 — 미실행 |

## 7. 발견된 FIX 필요 항목

- **없음.** 진입점 표시/이동/UI/무회귀/에러 전부 정상.

## 8. 판정

**⚠️ PARTIAL PASS** — platform 권한자 진입 카드 표시 + 클릭 이동 + accounts/services + Neture admin 무회귀 정상, console/network 0, 운영 데이터 변경 0. pure neture:admin-only 미노출 / pure platform:admin 직접 접근만 계정 부재로 미검증(코드 정적 보장).

→ platform-admin section **route → UI → 진입점 1차 완성**.

## 9. 후속

1. `IR-O4O-PLATFORM-GLOBAL-USERS-UI-SCOPE-AUDIT-V1` — global users 범위 조사.
2. `IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1` — Tier 1 이동 결정(마지막).
3. (선택) `WO-O4O-PLATFORM-ADMIN-GLOBAL-ENTRYPOINT-V1` — 순수 platform:admin 보편 진입점.
4. (권장) pure neture:admin-only / pure platform:admin 계정 확보 시 권한 경계 1회 보강.

---

## 부록 — 검증 방법/제약

| 항목 | 값 |
|------|------|
| 수정 파일 | 없음 (smoke 문서만 신규 생성) |
| 생성 문서 | `docs/investigations/SMOKE-O4O-PLATFORM-ADMIN-ROLE-BASED-ENTRYPOINT-POST-DEPLOY-V1.md` |
| 검증 도구 | Playwright headless chromium (login → /admin 카드 확인 → 카드 클릭 → hard-nav, console/network/keyword 수집, mutation 미실행) |
| 배포 commit | `66132b54c` (Cloud Run deploy success) |
| 자격증명 | SSOT env 주입, 보고서 미기재 |
| 운영 데이터 변경 | **없음** (read-only) |
| commit hash | (commit 후 기재) |
