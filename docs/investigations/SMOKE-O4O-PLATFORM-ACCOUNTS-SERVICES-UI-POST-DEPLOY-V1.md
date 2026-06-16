# SMOKE-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-POST-DEPLOY-V1

> **성격**: 배포 후 browser smoke (Playwright, 운영 환경). 코드/route/backend/DB 수정 0. **운영 데이터 변경 0**(read-only nav만, mutation 미실행).
> **대상**: Neture `/admin/platform/{,accounts,services}` + Neture admin 무회귀.
> **선행**: `WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1` (commit `a4e93fc1e`)
> **검증 일시**: 2026-06-16
> **배포 확인**: CI "Deploy Web Services (Cloud Run)" headSha `a4e93fc1e` = **completed success** → 운영 반영됨.
> **계정**: 통합 운영자 계정(SSOT, neture:admin + platform:super_admin 동시 보유) — 자격증명 미기재.
> **판정: ⚠️ PARTIAL PASS** — 주요 UI/데이터/무회귀 정상. pure neture:admin-only 차단은 계정 부재로 미검증.

---

## 0. 판정 요약 (TL;DR)

| 검증 | 결과 |
|---|:--:|
| `/admin/platform` landing(카드 3종 + nav) | ✅ |
| `/admin/platform/accounts` 접근 + 계정 목록(2건) | ✅ |
| `/admin/platform/services` 접근 + 서비스 목록(8건, read-only) | ✅ |
| section local nav(플랫폼 홈/계정/서비스) | ✅ |
| 계정 action 버튼(비밀번호 재설정/활성 토글) 표시 | ✅ |
| Neture `/admin` · operators · roles 무회귀 | ✅ |
| console / 4xx-5xx unexpected error | 0 |
| **운영 데이터 변경(reset/토글)** | 미실행(0) |
| **pure neture:admin-only `/admin/platform/*` 차단** | ⚠️ 미검증(계정 부재) |

## 1. 배포 반영 확인

| 항목 | 결과 |
|---|---|
| CI Deploy Web Services `a4e93fc1e` | **completed: success** |
| `/admin/platform/accounts`·`/services` browser 렌더 | 정상(redirect 없음) → 운영 반영 |

## 2. 검증 결과 (route별)

| route | finalUrl | redirect | 목록 수 | console err | 4xx/5xx | 관찰 |
|---|---|:--:|:--:|:--:|:--:|---|
| `/admin/platform` | `/admin/platform` | 없음 | 카드 3 | 0 | 0 | 플랫폼 계정/서비스/Global(연결 예정) 카드 + nav |
| `/admin/platform/accounts` | 동일 | 없음 | **table 2행** | 0 | 0 | 계정 목록(live API 2건 일치) · 비밀번호/활성/비활성/최근 로그인 |
| `/admin/platform/services` | 동일 | 없음 | **card 8** | 0 | 0 | 서비스 목록(live API 8건 일치) · 활성/대표 · read-only |
| `/admin` | `/admin` | 없음 | — | 0 | 0 | 운영자 관리/역할 관리/플랫폼 (Neture admin 정상) |
| `/admin/operators` | 동일 | 없음 | — | 0 | 0 | 운영자 관리/플랫폼 (Tier1 유지) |
| `/admin/roles` | 동일 | 없음 | role matrix 39행 | 0 | 0 | 역할 관리/서비스 대상 정책/플랫폼 (Tier1 유지) |

### 2.1 데이터 바인딩 검증
- accounts table 2행 = live `GET /admin/platform-accounts`(2건)와 일치.
- services 8 card = live `GET /admin/platform-services`(8건)와 일치.
→ UI ↔ backend 데이터 정상 연결.

## 3. modal / confirm / 운영 데이터 미변경

- 본 smoke 는 **navigation + 텍스트 수집만** 수행 — 비밀번호 재설정/활성 토글 **실행하지 않음**(WO §6).
- 비밀번호 재설정 버튼 · 활성/비활성 버튼 **존재 확인**(텍스트 "비밀번호"/"활성"/"비활성"). modal/confirm 실제 클릭은 미수행(운영 데이터 보호 — 클릭 시에도 "재설정"/confirm 전까지 mutation 없음, 안전상 미클릭).
- **운영 데이터 변경 0.**

## 4. section local navigation

- `/admin/platform`, `/accounts`, `/services` 3개 route 모두 nav 키워드(플랫폼 홈/계정 관리/서비스 관리) 표시 → nested layout + Outlet 정상.

## 5. Neture admin 무회귀

- `/admin`·`/admin/operators`·`/admin/roles` 전부 정상 렌더, redirect/403/크래시 0. "(플랫폼)" 라벨 유지(운영자/역할/서비스 대상 정책).
- platform section UI 추가가 기존 Neture 서비스 admin 에 영향 없음.

## 6. 미검증 / 제약 항목

| 항목 | 사유 |
|---|---|
| **pure neture:admin-only → `/admin/platform/*` 차단** | 사용 계정(sohae2100)이 neture:admin + platform:super_admin 동시 보유 → 접근 가능(차단 미발생). pure neture:admin-only 계정 부재로 차단 직접 검증 불가. (코드상 nested 라우트가 `PlatformRoute(PLATFORM_ROLES)` 하위 → neture:admin 단독 `Navigate('/')` 보장 — 정적.) |
| 서버 보호 메시지(SELF_LOCK 등) | mutation 미실행으로 미관측(운영 데이터 보호) |

## 7. 발견된 FIX 필요 항목

- **없음.** 접근/렌더/데이터/무회귀/에러 전부 정상.

## 8. 판정

**⚠️ PARTIAL PASS** — platform accounts/services UI 운영 반영·렌더·데이터 바인딩·local nav·무회귀 정상, console/network 오류 0, 운영 데이터 변경 0. pure neture:admin-only 차단만 계정 부재로 미검증(코드 정적 보장).

## 9. 후속

1. `WO-O4O-PLATFORM-ADMIN-ROLE-BASED-ENTRYPOINT-V1` — platform 권한자 한정 진입점 노출(현재 route-only).
2. `IR-O4O-PLATFORM-GLOBAL-USERS-UI-SCOPE-AUDIT-V1` — global users 범위 조사.
3. `IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1` — Tier 1 이동 결정.
4. (권장) pure neture:admin-only 계정 확보 시 `/admin/platform/*` 차단 1회 확인.

---

## 부록 — 검증 방법/제약

| 항목 | 값 |
|------|------|
| 수정 파일 | 없음 (smoke 문서만 신규 생성) |
| 생성 문서 | `docs/investigations/SMOKE-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-POST-DEPLOY-V1.md` |
| 검증 도구 | Playwright headless chromium (login → hard-nav → finalUrl/console/network/keyword/row-count 수집, mutation 미실행) |
| 배포 commit | `a4e93fc1e` (Cloud Run deploy success) |
| 자격증명 | SSOT env 주입, 보고서 미기재 |
| 운영 데이터 변경 | **없음** (read-only) |
| commit hash | (commit 후 기재) |
