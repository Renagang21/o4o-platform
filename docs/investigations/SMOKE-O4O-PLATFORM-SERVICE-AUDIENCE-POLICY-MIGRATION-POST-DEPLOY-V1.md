# SMOKE-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-MIGRATION-POST-DEPLOY-V1

> **성격**: 배포 후 browser smoke (Playwright, 운영). 코드/route/backend/DB 수정 0. **운영 데이터 변경 0** — PUT(저장) 미실행, 조회/route/배너 중심.
> **대상**: Neture `/admin/platform/service-audience` + legacy deprecated + backend GET guard + platform 무회귀.
> **선행**: `WO-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-MIGRATION-V1` (commit `f817f7e22`)
> **검증 일시**: 2026-06-17
> **배포 확인**: `f817f7e22` — **Deploy API Server + Deploy Web Services 모두 completed success** (backend guard + frontend 둘 다 반영).
> **계정**: 통합 운영자 계정(SSOT, neture:admin + platform:super_admin) — 자격증명 미기재.
> **판정: ⚠️ PARTIAL PASS** — 핵심 route/GET/render/deprecated/nav/무회귀 정상. pure neture:admin-only negative guard 계정 부재로 미검증.

---

## 0. 판정 요약 (TL;DR)

| 검증 | 결과 |
|---|:--:|
| `/admin/platform/service-audience` 렌더 + 정책목록(4행) | ✅ |
| **GET `/neture/admin/service-audience-policies` 200**(platform guard, count 4) | ✅ |
| landing 카드 → service-audience, badge "이동 완료" | ✅ |
| platform section nav 에 "서비스 대상 정책" | ✅ |
| legacy `/admin/settings/service-audience` deprecated banner("플랫폼으로 이동") | ✅ |
| platform 무회귀(roles 39행/users 20행) | ✅ |
| `/admin/operators`(Neture-scoped) 무회귀 | ✅ |
| console / 4xx-5xx | 0 |
| 운영 데이터 변경(PUT) | 미실행(0) |
| **pure neture:admin-only 차단** | ⚠️ 미검증(계정 부재) |

## 1. 배포 반영 확인

| 항목 | 결과 |
|---|---|
| Deploy API Server (Cloud Run) `f817f7e22` | **completed success** (backend guard 반영) |
| Deploy Web Services (Cloud Run) `f817f7e22` | **completed success** (frontend 반영) |

## 2. 신규 platform route + backend GET

| 항목 | 결과 |
|---|---|
| `/admin/platform/service-audience` finalUrl | 동일(redirect 없음) |
| 정책 목록 행 | **4행** 렌더 |
| platform governance 안내 문구 | 표시(platform, 약국 키워드) |
| **GET `/api/v1/neture/admin/service-audience-policies`** | **status 200, success, count 4** (platform:super_admin) |

→ frontend(PlatformRoute) ↔ backend(platform guard) 정합. API 배포 완료 상태에서 GET 200 = 새 platform guard 하에서 정상 인가.

## 3. landing 카드 / nav

- landing: "서비스 대상 정책" 카드 + **"이동 완료"** 배지, 링크 `/admin/platform/service-audience`. 운영자 관리(/admin/operators)·역할 관리(/admin/platform/roles) 카드 유지.
- section nav: 플랫폼 홈 / 계정 관리 / 서비스 관리 / 사용자 조회 / 역할 관리 / **서비스 대상 정책** 표시.

## 4. legacy deprecated 확인

- `/admin/settings/service-audience` 렌더 정상 + **deprecated banner("플랫폼으로 이동")** 표시. redirect/blank/loop 없음.
- sohae2100(platform:super_admin)은 legacy 페이지에서도 정책 목록 로드됨(5행) — platform guard 통과. (pure neture:admin 이면 backend 403 이 의도된 결과 — 계정 부재로 미관측.)

## 5. platform / Neture 무회귀

| route | rows | console | 4xx/5xx |
|---|---|:--:|:--:|
| `/admin/platform/roles` | 39 (role matrix) | 0 | 0 |
| `/admin/platform/users` | 20 | 0 | 0 |
| `/admin/operators` | 2 | 0 | 0 |

→ 역할 관리/사용자 조회/계정/서비스 + Neture-scoped 운영자 관리 모두 정상.

## 6. 운영 데이터 미변경

- smoke 는 navigation + GET 조회만 — **PUT/저장/정책값 변경 미실행**(WO §7). **운영 데이터 변경 0.**

## 7. 미검증 / 제약

| 항목 | 사유 |
|---|---|
| **pure neture:admin-only → service-audience 403** | 사용 계정이 platform:super_admin 보유 → 양 route GET 200(차단 미발생). pure neture:admin-only 계정 부재로 회수(403) 직접 검증 불가. 코드/배포 정적: backend `requireRole(platform...)`, frontend PlatformRoute. |
| PUT(저장) guard | 운영 데이터 보호 — 미실행 |

## 8. 발견된 FIX 필요 항목

- **없음.** route/GET/render/deprecated/nav/무회귀 전부 정상, 에러 0, 데이터 변경 0.

## 9. 판정

**⚠️ PARTIAL PASS** — 서비스 대상 정책 platform 이동(frontend route + backend guard)이 운영 반영·접근·조회·무회귀 정상. legacy deprecated 안내 정상. console/network 0, 운영 데이터 변경 0. pure neture:admin-only 차단만 계정 부재로 미검증(정적 보장).

→ Tier 1 정리(운영자=Neture 유지 / 역할 관리·서비스 대상 정책=platform 이동) **운영 검증 완료**.

## 10. 후속

1. `CHECK-O4O-PLATFORM-TIER1-HYBRID-MIGRATION-CLOSURE-V1` — Tier 1 현재 상태 종료 고정.
2. `WO-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-API-PATH-ALIGN-V1` — API path neture/admin → platform 정리.
3. `WO-O4O-PLATFORM-SERVICE-AUDIENCE-LEGACY-ROUTE-CLEANUP-V1` — legacy route 제거.
4. `IR-O4O-ADMIN-GUARD-FRONTEND-BACKEND-RECONCILE-V1` — 남은 guard 불일치 점검.
5. (권장) pure neture:admin-only 계정 확보 시 차단 1회 확인.

---

## 부록 — 검증 방법/제약

| 항목 | 값 |
|------|------|
| 수정 파일 | 없음 (smoke 문서만 신규 생성) |
| 생성 문서 | `docs/investigations/SMOKE-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-MIGRATION-POST-DEPLOY-V1.md` |
| 검증 도구 | Playwright headless chromium (login → hard-nav + page-context GET, console/network/keyword/row-count 수집, PUT 미실행) |
| 배포 commit | `f817f7e22` (API + Web deploy success) |
| 자격증명 | SSOT env 주입, 보고서 미기재 |
| 운영 데이터 변경 | **없음** (read-only) |
| commit hash | `5c1b79c08` (병렬 세션 staging 오염으로 그 세션 commit 에 함께 포함되어 origin/main 에 푸시됨 — 문서 존재·검증 결과 유효, attribution 만 오염) |
