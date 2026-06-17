# CHECK-O4O-PLATFORM-TIER1-CROSSLINK-CARDS-V1

> **작업명:** WO-O4O-PLATFORM-TIER1-CROSSLINK-CARDS-V1
> **유형:** frontend-only 안내 강화 — `/admin/platform` landing 에 Tier 1 crosslink 카드 3종. route/guard/backend/DB **변경 0**.
> **결과: PASS — 텍스트 안내 → 운영자 관리/역할 관리/서비스 대상 정책 crosslink 카드(상태 배지 + 기존 route 링크)로 교체. 이동·guard·기능 변경 0. web-neture typecheck 0.**
> 선행: IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1 (C 하이브리드 1차) — 2026-06-17

---

## 1. 수정 파일 (1 + CHECK)

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/admin/platform/PlatformAdminLandingPage.tsx` | 기존 Tier 1 텍스트 안내 section → **crosslink 카드 3종**(TIER1_CARDS) 으로 교체. icon(ShieldCheck/Target) import 추가 |
| `docs/investigations/CHECK-O4O-PLATFORM-TIER1-CROSSLINK-CARDS-V1.md` | 본 CHECK |

> route/guard/backend/DB/Tier 2 카드/operators·roles·audience 기능 **변경 0**.

## 2. 추가한 crosslink 카드 (3종)

| 카드 | route(링크) | 상태 배지 | 설명 요지 |
|------|------|------|------|
| **운영자 관리** | `/admin/operators` | **현 위치 유지**(slate) | neture 전용 부여·회수 → 현 위치 유지 |
| **역할 관리** | `/admin/roles` | **이동 후보**(indigo) | cross-service role 카탈로그 → platform 이동 후보 |
| **서비스 대상 정책** | `/admin/settings/service-audience` | **소유권 결정 필요**(amber) | cross-service 정책 → 운영책임·guard 확정 후 이동 검토 |

- 카드 = 기존 route 로의 `<Link>` (신규 route 생성 0). 제목에 ArrowRight, route 경로 표기.
- section 헤더에 "후속 정책(IR-...-TIER1-MENU-MIGRATION-DECISION-V1)에 따라 정리, 현재 위치·권한 변경 없음" 명시.

## 3. 정책 준수 (§4)

- **route 이동 없음** — `/admin/operators`·`/admin/roles`·`/admin/settings/service-audience` 그대로. 카드는 링크일 뿐.
- **guard 변경 없음** — AdminRoute/PlatformRoute/requireNetureScope/requireRole/isPlatformAdmin 미변경.
- **기능 변경 없음** — 운영자 부여·역할 CUD·정책 저장 로직/API/DB 미변경.
- **guard 불일치 미수정** — IR §2 의 불일치(operators/audience: platform:super_admin backend 403, roles: neture:admin 변경 403)는 본 WO 에서 손대지 않음 → 별도 `IR-O4O-ADMIN-GUARD-FRONTEND-BACKEND-RECONCILE-V1`.

## 4. 검증

- **web-neture typecheck PASS** (EXIT 0).
- 정적: Tier 2 카드(accounts/services/users) section 무변경, Tier 1 section 만 카드화. 신규 route/guard import 없음(Link/icons 만).
- **browser smoke 미수행** — 배포 후 권장: `/admin/platform` 진입 → Tier 2 카드 + Tier 1 카드 3종 표시, 각 Tier 1 카드 클릭 시 기존 route 이동, accounts/services/users 무회귀, `/admin/operators`·`/admin/roles`·`/admin/settings/service-audience` 정상.

## 5. 불변 확인 (§7)

- Tier 1 route 이동 / AdminRoute·PlatformRoute / backend guard / 운영자·역할·정책 기능 / API / DB / Neture admin sidebar / GP·KCos·KPA / platform users·accounts·services **변경 0**.

## 6. 완료 판정

**PASS.** `/admin/platform` landing 에 Tier 1 crosslink 카드 3종(상태 배지 + 기존 route 링크) 추가, route/guard/backend/DB 무변경, Tier 2 무회귀, typecheck 통과. platform section 사용자가 "플랫폼 성격 기능의 현재 위치/향후 방향"을 인지 가능.

## 7. 후속

1. `WO-O4O-PLATFORM-ROLES-MENU-MIGRATION-V1` — 역할 관리 /admin/platform 이동(backend 이미 platform 전용 → 저위험, frontend guard 정리).
2. `IR-O4O-SERVICE-AUDIENCE-POLICY-OWNERSHIP-DECISION-V1` — 서비스 대상 정책 운영 책임/guard 재배정(이동 선행).
3. `IR-O4O-ADMIN-GUARD-FRONTEND-BACKEND-RECONCILE-V1` — operators/audience/roles frontend↔backend guard 불일치 전수 점검.

---

*Date: 2026-06-17 · platform Tier 1 crosslink 카드 · PASS · /admin/platform landing 에 운영자관리(현위치유지)/역할관리(이동후보)/서비스대상정책(소유권결정) 카드 3종(기존 route 링크) · route/guard/backend/DB 무변경, Tier 2 무회귀 · web-neture typecheck 0 · 후속 roles 이동/audience ownership/guard reconcile.*
