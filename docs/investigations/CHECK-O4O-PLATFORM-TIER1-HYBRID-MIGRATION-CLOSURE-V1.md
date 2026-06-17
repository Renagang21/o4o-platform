# CHECK-O4O-PLATFORM-TIER1-HYBRID-MIGRATION-CLOSURE-V1

> **성격**: 종료 고정 문서 (documentation-only) — 코드/route/backend/DB/운영 데이터 수정 0.
> **목적**: platform-admin surface Phase 1 이후 Neture admin 에 남아 있던 Tier 1 플랫폼 성격 기능 3종(운영자 관리 / 역할 관리 / 서비스 대상 정책) 정리 상태를 **종료 고정(CLOSED/PASS)**.
> **작성일**: 2026-06-17
> **선행 시리즈**: platform-admin surface(`/admin/platform`) route → UI → entrypoint → Tier 1 migration.

---

## 0. 종료 판정 (TL;DR)

> ✅ **O4O platform Tier 1 hybrid/migration phase = CLOSED / PASS.**
> - 운영자 관리 = **Neture-scoped 유지**(현 위치).
> - 역할 관리 = `/admin/platform/roles` **이동 완료**(legacy `/admin/roles` deprecated 보존).
> - 서비스 대상 정책 = `/admin/platform/service-audience` **이동 완료** + **backend guard 까지 platform 기준 정렬**(legacy `/admin/settings/service-audience` deprecated 보존).
> - 정책값/gate 로직/DB 무변경 — drug 연결 audience gate **소유권만** platform-admin 으로 고정.
> - 미검증: pure neture:admin-only / pure platform:admin negative guard(계정 부재) — 종료를 막지 않음.

---

## 1. 완료 lineage (commit)

| 작업 | commit | 비고 |
|---|---|---|
| IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1 | `076afad56` | 이동 결정 |
| WO-O4O-PLATFORM-TIER1-CROSSLINK-CARDS-V1 | `fdb435f90` | landing crosslink 카드 |
| WO-O4O-PLATFORM-ROLES-MENU-MIGRATION-V1 | `1479f5499` | 역할 관리 이동 |
| SMOKE-O4O-PLATFORM-ROLES-MENU-MIGRATION-POST-DEPLOY-V1 | `93159d97a` | 역할 이동 운영 검증 |
| IR-O4O-SERVICE-AUDIENCE-POLICY-OWNERSHIP-DECISION-V1 | `0f474a9aa` | 소유권 결정 |
| WO-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-MIGRATION-V1 | `f817f7e22` | 정책 이동 + guard 정렬 |
| (hash 기록) | `3c31cfd62` | |
| SMOKE-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-MIGRATION-POST-DEPLOY-V1 | `5c1b79c08` | **병렬 세션 staging 오염**으로 그 세션 commit 에 함께 포함되어 origin/main 에 푸시됨 — 문서 존재·검증 결과 유효, attribution 만 오염 |

> 일부 commit(crosslink/roles/ownership-decision 등)은 병렬 세션 작업으로 origin/main 에 반영됨. 본 closure 는 lineage 를 사용자 제공 기준으로 기록.

## 2. 고정 상태 — 운영자 관리

| 항목 | 값 |
|---|---|
| route | `/admin/operators` |
| 판정 | **Neture-scoped 유지 (현 위치, platform 이동 안 함)** |
| 사유 | neture:admin / neture:operator 부여·회수 — within-service 기능, cross-service 아님 |

## 3. 고정 상태 — 역할 관리

| 항목 | 값 |
|---|---|
| 신규 route | `/admin/platform/roles` |
| legacy route | `/admin/roles` (deprecated banner + 이동 버튼 보존) |
| backend | roles CUD platform admin 기준(기존) |
| 운영 smoke | `/admin/platform/roles` 렌더·39 roles 조회 PASS / `/admin/roles` deprecated 보존 PASS / role CUD 미실행 / 운영 데이터 변경 0 |

## 4. 고정 상태 — 서비스 대상 정책

| 항목 | 값 |
|---|---|
| 신규 route | `/admin/platform/service-audience` |
| legacy route | `/admin/settings/service-audience` (deprecated banner 보존) |
| backend API path | `/api/v1/neture/admin/service-audience-policies` (1차 유지) |
| backend guard | `requireNetureScope('neture:admin')` → **`requireRole(['platform:admin','platform:super_admin'])`** 정렬 완료 |
| 운영 smoke (`5c1b79c08`/`f817f7e22`) | `/admin/platform/service-audience` 렌더 + 정책 4행 조회 PASS / GET policies **200** PASS / legacy deprecated banner PASS / roles·users·operators 무회귀 PASS / console·4xx-5xx 0 / **PUT 미실행 · 운영 데이터 변경 0** |

## 5. 정책값 / gate 불변 확인 (서비스 대상 정책)

| 변경하지 않은 것 | 변경한 것 |
|---|---|
| `service_audience_policies` 값 / DB schema / migration | frontend 위치·route·안내 |
| `offer.service` drug gate 로직 | backend guard(소유권) |
| `partner-contract.service` drug gate 로직 | |
| `ServiceAudienceService` resolver 동작 | |

→ **핵심 고정: drug 연결 audience gate 의 소유권 = platform-admin.** "누가 수정하는가"만 변경, "어떻게 작동하는가"는 불변.

## 6. 남은 미검증

- pure neture:admin-only 계정으로 platform route/API 차단 직접 확인.
- pure platform:admin-only 계정 직접 접근 UX.
- 일부 browser console 캡처 보완.
→ 계정 부재/세션 제약으로 미검증. 핵심 route/API/guard/조회/무회귀는 검증 완료 — **종료를 막지 않음**(코드/배포 정적 보장).

## 7. 남은 후속 (별도 트랙)

| WO/IR | 범위 |
|---|---|
| `WO-O4O-PLATFORM-SERVICE-AUDIENCE-POLICY-API-PATH-ALIGN-V1` | `/neture/admin` prefix API path 정리 결정/구현 |
| `WO-O4O-PLATFORM-SERVICE-AUDIENCE-LEGACY-ROUTE-CLEANUP-V1` · `WO-O4O-PLATFORM-ROLES-LEGACY-ROUTE-CLEANUP-V1` | legacy route 제거(운영 안정화 + 사용중단 확인 후) |
| `IR-O4O-ADMIN-GUARD-FRONTEND-BACKEND-RECONCILE-V1` | 남은 frontend/backend guard 불일치 전수 점검(운영자 관리 등) |
| (선택) 병렬 세션 git staging 오염 사례 기록 | path-specific commit 절차 보강 |

## 8. 병렬 세션 git 오염 기록 (참고)

- SMOKE 문서(`SMOKE-...-SERVICE-AUDIENCE-...-POST-DEPLOY-V1`)는 commit 직전 **병렬 세션의 `git add`/commit 이 끼어들어** 그 세션 commit `5c1b79c08`("chore(ui): scan operator-ux-core...")에 함께 포함되어 origin/main 에 푸시됨.
- 이후 발생한 의도치 않은 merge commit 은 **`reset --hard ORIG_HEAD` 로 되돌림**(다른 세션 미푸시 commit 미훼손, push 안 함). divergence 정리(0/0)는 병렬 세션이 수행.
- **문서 존재·검증 결과는 유효.** attribution(commit message) 만 오염. 본 closure §1 에 명시.
- 교훈: 공유 working copy + 활성 병렬 세션 환경에서 path-specific commit 도 staging race 에 노출됨 → `git commit <explicit paths>` 또는 단일 호출 chain 권장.

## 9. 완료 판정 문구

> **O4O platform Tier 1 hybrid/migration phase = CLOSED / PASS.**
> 운영자 관리는 Neture-scoped 로 유지, 역할 관리와 서비스 대상 정책은 platform-admin section 으로 이동 완료.
> 서비스 대상 정책은 backend guard 까지 platform-admin 기준으로 정렬. legacy routes 는 deprecated 상태로 보존한다.

---

## 부록 — 산출/제약

| 항목 | 값 |
|------|------|
| 수정 파일 | 없음 (종료 고정 문서 + SMOKE hash 정정만) |
| 생성 문서 | `docs/investigations/CHECK-O4O-PLATFORM-TIER1-HYBRID-MIGRATION-CLOSURE-V1.md` |
| 코드/route/backend/DB/운영 데이터 변경 | 0 |
| 다른 세션 WIP | 미접촉(working tree 의 signage store-playlist WIP 등) |
| commit hash | `ba93d6fad` (closure + SMOKE hash 정정, `git commit <explicit paths>` 로 오염 회피) |
