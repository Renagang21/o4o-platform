# SMOKE-O4O-ADMIN-PLATFORM-SECTION-ROUTING-POST-DEPLOY-V1

> **성격**: 배포 후 browser smoke 검증 (Playwright, 운영 환경). 코드/route/backend/DB 수정 0.
> **대상**: Neture 운영 사이트 `/admin/platform` + Neture admin Tier 1 route 무회귀.
> **선행**: `WO-O4O-ADMIN-PLATFORM-SECTION-ROUTING-V1` (commit `11d14a050`)
> **검증 일시**: 2026-06-16
> **배포 확인**: CI "Deploy Web Services (Cloud Run)" headSha `11d14a050` = **success** → `/admin/platform` 운영 반영됨.
> **계정**: 통합 운영자 계정(SSOT, neture:admin + platform:super_admin 동시 보유) — 자격증명 미기재.
> **판정: ⚠️ PARTIAL PASS** — platform 권한 접근 + Neture admin 무회귀 정상. pure neture:admin-only 차단은 계정 부재로 미검증.

---

## 0. 판정 요약 (TL;DR)

| 검증 | 결과 |
|---|:--:|
| platform 권한 계정 → `/admin/platform` 접근 + landing 표시 | ✅ |
| Tier 2 카드 3종(연결 예정) 표시 | ✅ |
| Tier 1 안내 표시 | ✅ |
| Neture `/admin`(서비스 admin) 무회귀 | ✅ |
| Tier 1 route(operators/roles/service-audience) 위치·라벨 유지 | ✅ |
| sidebar 오노출(neture:admin 단독) 없음(route-only) | ✅ |
| console / 4xx-5xx unexpected error | 0 |
| **pure neture:admin-only `/admin/platform` 차단** | ⚠️ **미검증**(계정 부재) |

→ WO §9 PARTIAL PASS 정의("pure neture:admin-only 계정 부재로 차단 검증 못 함")에 정확히 해당.

## 1. 배포 반영 확인

| 항목 | 결과 |
|---|---|
| CI Deploy Web Services (Cloud Run) `11d14a050` | **completed: success** (13:39Z) |
| `/admin/platform` browser-probe | landing 렌더 확인(redirect 없음) → **운영 반영됨** |

## 2. 검증 결과 (route별)

| route | finalUrl | redirect | console err | 4xx/5xx | 관찰 keyword |
|---|---|:--:|:--:|:--:|---|
| `/admin/platform` | `/admin/platform` | 없음 | 0 | 0 | **O4O 플랫폼 관리 · 연결 예정** · 운영자 관리/역할 관리/서비스 대상 정책(Tier1 안내) · 플랫폼 |
| `/admin` | `/admin` | 없음 | 0 | 0 | 운영자 관리 · 역할 관리 · 플랫폼 (Neture 서비스 admin 정상) |
| `/admin/operators` | `/admin/operators` | 없음 | 0 | 0 | 운영자 관리 · 플랫폼 · 회원 완전삭제 (Tier1 유지) |
| `/admin/roles` | `/admin/roles` | 없음 | 0 | 0 | 역할 관리 · 플랫폼 (Tier1 유지) |
| `/admin/settings/service-audience` | 동일 | 없음 | 0 | 0 | 서비스 대상 정책 · 플랫폼 (Tier1 유지) |

### 2.1 `/admin/platform` landing 상세
- 헤더 "O4O 플랫폼 관리" + platform admin 배지 + cross-service 안내 배너("platform:admin / platform:super_admin 으로만 접근").
- Tier 2 카드 3종 모두 "연결 예정" 표시: 플랫폼 계정 관리(`/api/v1/admin/platform-accounts`) · 플랫폼 서비스 관리(`/api/v1/admin/platform-services`) · Global 사용자 관리.
- Tier 1(운영자/역할/서비스 대상 정책) 미이동 안내 표시.

## 3. Neture admin 무회귀

- `/admin` 및 Tier 1 route 전부 정상 렌더, redirect/403/크래시 0. "(플랫폼)" 라벨 유지.
- platform section 도입이 기존 Neture 서비스 admin 에 영향 없음 확인.

## 4. sidebar 오노출 확인

- Neture `/admin` 텍스트에 `/admin/platform` 진입 링크 미출현(키워드 "플랫폼"은 Tier1 "(플랫폼)" 라벨에서 유래, platform section 링크 아님).
- WO 정책대로 **route-only**(sidebar 진입점 미추가) — neture:admin 단독 사용자 오노출 없음. ✅

## 5. 미검증 / 제약 항목

| 항목 | 사유 |
|---|---|
| **pure neture:admin-only → `/admin/platform` 차단** | 사용 계정(sohae2100)이 neture:admin + **platform:super_admin 동시 보유** → 접근 가능(차단 미발생). pure neture:admin-only 계정 부재로 "차단 redirect" 직접 검증 불가. (코드상 `PlatformRoute`=`RouteGuard(PLATFORM_ROLES)`, neture:admin ∉ PLATFORM_ROLES → `Navigate('/')` 보장 — 정적 확인.) |
| Tier 2 실제 기능 | 미구현(연결 예정) — 후속 WO |

## 6. 발견된 FIX 필요 항목

- **없음.** 접근/렌더/무회귀/에러 전부 정상.

## 7. 판정

| PARTIAL PASS 조건 | 충족 |
|---|:--:|
| platform 권한 계정 `/admin/platform` 접근 정상 | ✅ |
| landing + Tier 2 카드 + Tier 1 안내 표시 | ✅ |
| Neture admin 기존 route 무회귀 | ✅ |
| Tier 1 라벨/배너 유지 | ✅ |
| unexpected console/network 오류 없음 | ✅ |
| pure neture:admin-only 차단 검증 | ⚠️ 미검증(계정 부재, 명확히 기록) |

**판정: ⚠️ PARTIAL PASS** — platform section 운영 반영·접근·무회귀 정상. 차단 경로만 계정 부재로 미검증(코드 정적 보장).

## 8. 후속

- (권장) pure neture:admin-only 계정 확보 시 `/admin/platform` 차단(`/` redirect) 1회 확인.
- `WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1` — `/admin/platform/accounts`·`/services` 실제 UI + backend platform API 연결.
- `IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1` — Tier 1 이동 여부 + 역할 기반 진입점.

---

## 부록 — 검증 방법/제약

| 항목 | 값 |
|------|------|
| 수정 파일 | 없음 (smoke 검증 문서만 신규 생성) |
| 생성 문서 | `docs/investigations/SMOKE-O4O-ADMIN-PLATFORM-SECTION-ROUTING-POST-DEPLOY-V1.md` |
| 검증 도구 | Playwright headless chromium (login → hard-nav → finalUrl/console/network/keyword 수집) |
| 배포 commit | `11d14a050` (Cloud Run deploy success) |
| 자격증명 | SSOT env 주입, 보고서 미기재 |
| 운영 데이터 변경 | 없음(읽기 전용) |
| commit hash | `2ff3a3614` |
