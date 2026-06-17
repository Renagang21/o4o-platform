# SMOKE-O4O-PLATFORM-ROLES-MENU-MIGRATION-POST-DEPLOY-V1

> **대상 WO:** WO-O4O-PLATFORM-ROLES-MENU-MIGRATION-V1
> **유형:** 운영 배포 후 browser smoke (Playwright) + roles API 확인. 운영 데이터 변경 없음(조회/이동만, role CUD 미실행).
> **판정: PASS (핵심) / PARTIAL — 부가 항목 일부 미완.** `/admin/platform/roles` 렌더·`/admin/roles` deprecated 배너·entrypoint·roles API 모두 **운영 검증 PASS**. Tier 2(accounts/services) 무회귀 browser 재확인 + console 캡처는 브라우저 세션 종료로 미완(부가). negative guard 미검증(계정 제약).
> **검증일:** 2026-06-17 (UTC ~02:10)

---

## 1. 배포 / 계정

- 커밋 `1479f5499`. CI Pipeline 완료, neture-web 리비전 `neture-web-01125-wpd`(내 커밋 포함) 라이브.
- 계정 `sohae2100@gmail.com`(roles 10개에 `platform:super_admin` 포함) — UI 로그인. pure neture:admin-only 계정 부재 → negative guard 미검증.
- roles backend(무변경) live: `GET /api/v1/operator/roles` → success, **39 roles**.

## 2. 검증 결과 (Playwright, 운영 www.neture.co.kr)

| # | 항목 | 결과 |
|---|------|------|
| 6.1 | entrypoint | ✅ 로그인 후 `/admin` 에 "O4O 플랫폼 관리 → /admin/platform" 카드 표시 |
| 6.2 | **`/admin/platform/roles` 렌더** | ✅ **PASS** — platform section 헤더/nav, "O4O 플랫폼 역할 관리" 안내 배너, 역할 관리 화면(**39개** roles), service 필터(전체/Platform/Neture/GlycoPharm/KPA/K-Cosmetics/LMS) + 검색 + table 정상 |
| 6.3 | platform section nav | ✅ 플랫폼 홈·계정 관리·서비스 관리·사용자 조회·**역할 관리** 표시, active 정상 |
| 6.4 | **기존 `/admin/roles` 보존+deprecated** | ✅ **PASS** — 상단 "역할 관리는 O4O 플랫폼 관리 영역으로 이동되었습니다 … `/admin/platform/roles`" 배너 + "플랫폼 역할 관리로 이동" 버튼. 기존 역할 화면(39 roles) **기능 보존**(hard delete/redirect 없음) |
| 6.5 | Tier 2(accounts/services) 무회귀 | ⏸ **browser 재확인 미완**(세션 종료). users 는 직전 smoke PASS. accounts/services 페이지 컴포넌트는 본 WO 미변경(landing 카드/nav/신규 route 만 추가) |
| 6.7 | console/network 오류 | ⏸ **캡처 미완**(브라우저 세션 종료) — roles/roles 화면 렌더 중 blank/redirect loop/4xx-5xx 관측 없음(스냅샷 정상 렌더) |
| — | role CUD | 미실행(운영 데이터 보호) |
| — | negative guard(pure neture:admin) | 미검증(계정 부재) |

> 6.2/6.4 스냅샷은 39-role cross-service 카탈로그가 양쪽 route 에서 정상 렌더됨을 확인. `/admin/platform/roles` 는 platform nav 안에서, `/admin/roles` 는 Neture admin layout + deprecated 배너와 함께.

## 3. 핵심 판정 근거

- **이동 성공**: 신규 `/admin/platform/roles`(platform section)에서 역할 관리가 정상 동작(데이터 39 roles 조회, 필터/검색 UI). frontend platform guard 하위 + backend roles API(무변경) 정합.
- **기존 동선 비파괴**: `/admin/roles` 는 기능 유지 + 이동 안내 배너 → 북마크/링크 회귀 0.
- **entrypoint 연결**: `/admin` → `/admin/platform` 카드 정상.

## 4. 미완/미검증 (FIX 불요)

- Tier 2 accounts/services **browser 무회귀 재확인** + **console 캡처**: Playwright persistent profile 잠금으로 세션 종료되어 미완. 단 ① 본 WO 가 accounts/services 페이지를 변경하지 않음(landing/nav/신규 route 만), ② users 는 직전 smoke PASS → **회귀 위험 낮음**. 배포 후 재-smoke 또는 다음 브라우저 세션에서 보완 권장.
- negative guard: pure neture:admin-only 계정 부재로 미검증(정적: PlatformRoute 에 neture:admin 미포함).

## 5. 운영 데이터 보호

- 전 과정 조회/이동만. role 생성/수정/삭제/비활성 **미실행**. 운영 데이터 변경 **0**.

## 6. 판정

**PASS (핵심 이동) / PARTIAL (부가 재확인 미완).**
- ✅ `/admin/platform/roles` 렌더·nav·배너·39 roles 조회 / `/admin/roles` deprecated 보존 / entrypoint / roles API — **운영 검증 완료**.
- ⏸ Tier 2 browser 무회귀 재확인·console 캡처(브라우저 세션 종료) / negative guard(계정 제약) — 미완, FIX 불요(회귀 위험 낮음).

→ 역할 관리는 platform-admin section 으로 **안정 이동 확인**. FIX 필요 없음.

## 7. 후속

1. (보완) 다음 브라우저 세션에서 Tier 2(accounts/services) 무회귀 + console error 0 재확인.
2. `IR-O4O-SERVICE-AUDIENCE-POLICY-OWNERSHIP-DECISION-V1` — 서비스 대상 정책 소유권/guard 결정(이동 선행).
3. `IR-O4O-ADMIN-GUARD-FRONTEND-BACKEND-RECONCILE-V1` — frontend↔backend guard 불일치 전수.
4. (후속) `/admin/roles` 안정화 후 redirect/제거 검토.

---

*Date: 2026-06-17 · roles 이동 배포후 smoke(Playwright, neture-web-01125-wpd) · PASS(핵심)/PARTIAL · /admin/platform/roles 렌더(nav+배너+39 roles 조회)·/admin/roles deprecated 배너+기능 보존·entrypoint·roles API 39 PASS · Tier2 browser 무회귀·console 재확인 미완(브라우저 세션 종료)·negative guard 미검증(계정) · role CUD 미실행 운영데이터 무변경 · FIX 불요.*
