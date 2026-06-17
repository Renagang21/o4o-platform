# IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1

> **유형:** read-only 조사 — 코드/route/guard/backend/DB 변경 0.
> **대상:** Neture admin 내 "플랫폼" 라벨 Tier 1 메뉴 3종의 최종 위치/guard 결정.
> **판정: C(하이브리드) 즉시 채택 — 단 기능별 종착지 분리.** 운영자 관리=NETURE-SCOPED(현 위치 유지/A), 역할 관리·서비스 대상 정책=CROSS-SERVICE(향후 이동/B, 단 guard 정합 선행). 즉시 구현은 crosslink 카드(guard 무변경)만.
> 선행: CHECK-O4O-PLATFORM-ADMIN-SURFACE-PHASE1-CLOSURE-V1 — 2026-06-17

---

## 0. 결론 요약 (TL;DR)

- **3 기능은 동질이 아니다** → 단일 A/B/C 로 묶지 말 것.
  - **운영자 관리** = **NETURE-SCOPED**(neture:admin/operator 만 부여, `requireNetureScope('neture:admin')`) → **A(현 위치 유지)**.
  - **역할 관리** = **CROSS-SERVICE**(전 서비스 role 카탈로그, backend CUD 이미 `isPlatformAdmin` 전용) → **B(이동) 후보**, 단 frontend guard 과대허용 정리 필요.
  - **서비스 대상 정책** = **CROSS-SERVICE**(여러 serviceKey 정책, 화면도 "O4O 여러 서비스 대상 정책" 명시)이나 guard 는 `neture:admin` → **B(이동)** 후보, guard 정합 선행.
- **즉시 안전한 1차 = C(하이브리드)**: `/admin/platform` landing 에 3종 안내/크로스링크 카드만 추가(route/guard 무변경). 실제 이동·guard 전환은 후속 WO.
- **이미 존재하는 guard 불일치 발견**(이동 시 반드시 해소):
  - 운영자관리·서비스대상정책: frontend `AdminRoute`(neture:admin+platform:super_admin) **vs** backend `requireNetureScope('neture:admin')` → **platform:super_admin 단독은 현재 backend 403**.
  - 역할관리: frontend 가 neture:admin 허용하나 backend CUD 는 `isPlatformAdmin` → **neture:admin 은 화면 보이나 변경 403**.

---

## 1. 기능별 현황 (조사 결과)

| # | 기능 | route | frontend page | backend endpoint + guard(정확) | mutation 범위 | 분류 |
|---|------|------|------|------|------|------|
| 1 | **운영자 관리** | `/admin/operators` | `OperatorsPage.tsx` (AdminRoute) | `GET/POST/PATCH /neture/admin/operators` · **`requireNetureScope('neture:admin')`** | neture:admin/neture:operator **만** 부여·회수(role_assignments + service_memberships) | **NETURE-SCOPED** |
| 2 | **역할 관리** | `/admin/roles` | `RoleManagementPage`(@o4o/ui 공통) (AdminRoute) | `GET/POST/PUT/DELETE /api/v1/operator/roles` · route guard 넓음, **CUD 는 `scope.isPlatformAdmin`(platform:admin/super_admin) 전용** | `roles` 카탈로그(전 서비스: platform/neture/glycopharm/cosmetics/kpa/lms) 생성·수정·비활성 | **CROSS-SERVICE** |
| 3 | **서비스 대상 정책** | `/admin/settings/service-audience` | `ServiceAudiencePolicyPage.tsx` (AdminRoute) | `GET/PUT /neture/admin/service-audience-policies/:serviceKey` · **`requireNetureScope('neture:admin')`** | `service_audience_policies` 여러 serviceKey 의 `isPharmacyTargetService`/note | **CROSS-SERVICE** (화면 명시: "O4O 여러 서비스 대상 정책") |

- frontend `AdminRoute` = `allowedRoles=['neture:admin','platform:super_admin']` + `requireMembership='neture'` (RoleGuard).

## 2. guard 불일치 (이동 전 반드시 해소할 선행 이슈)

| 기능 | frontend 허용 | backend 실제 | 현 불일치 |
|------|------|------|------|
| 운영자 관리 | neture:admin + platform:super_admin | **neture:admin 만**(requireNetureScope) | **pure platform:super_admin → backend 403**(화면은 보임) |
| 서비스 대상 정책 | neture:admin + platform:super_admin | **neture:admin 만** | 동일 — platform:super_admin 단독 backend 403 |
| 역할 관리 | neture:admin + platform:super_admin | CUD = platform:admin/super_admin 전용 | **neture:admin → 변경 403**(조회는 service scope) |

→ 어떤 이동(B)도 **frontend·backend guard 정합 동반 필수**. 현 상태는 이미 표면-백엔드 권한이 어긋나 있음.

## 3. 선택지 비교 (기능별)

| 기능 | A 유지 | B 이동(/admin/platform + platform guard) | C 하이브리드(크로스링크) | 권장 |
|------|------|------|------|------|
| 운영자 관리 | 자연스러움(neture 전용) | 부적합 — neture:admin 부여 기능인데 platform guard 면 pure neture:admin 운영자 접근 상실 | 카드 안내만 | **A**(유지) |
| 역할 관리 | 위치 모호(cross-service인데 neture admin 안) | 적합(이미 backend platform 전용) — frontend 과대허용만 정리 | 카드 안내 + 이후 이동 | **B 종착**, 단 1차는 C |
| 서비스 대상 정책 | 위치 모호(cross-service) | 적합하나 guard 전환 시 pure neture:admin 상실 → 운영 책임 재배정 필요 | 카드 안내 + 이후 이동 | **B 종착**, 단 1차는 C |

## 4. guard 변경 영향 (누가 접근을 잃나)

- **운영자 관리/서비스 대상 정책을 platform guard 로 전환 시**: 현재 backend 가 `neture:admin` 만 허용 → **pure neture:admin 사용자가 접근 상실**. 통합 계정(neture:admin+platform:super_admin)은 무영향이나, 순수 neture:admin 운영자 존재 시 운영 단절. (현 환경엔 pure-role 계정 부재로 실증 불가 — 정책 결정 필요.)
- **역할 관리**: backend CUD 는 이미 platform 전용 → platform 이동해도 **신규 상실 없음**(오히려 frontend 과대허용 제거로 정합↑).

## 5. 핵심 질문 답변 (§7 Q1~Q10)

1. 운영자 관리가 부여/회수하는 role → **neture:admin / neture:operator 만**.
2. neture 전용 vs cross-service → **neture 전용(NETURE-SCOPED)**.
3. 역할 관리 matrix → **전 서비스 role 카탈로그**(platform/neture/glycopharm/cosmetics/kpa/lms).
4. platform role 포함? → **포함**(카탈로그에 platform:* 존재).
5. 서비스 대상 정책 수정 serviceKey → **여러 서비스**(cross-service).
6. backend guard → 운영자/audience=`requireNetureScope('neture:admin')`, 역할관리 CUD=`isPlatformAdmin`(platform:admin/super_admin).
7. platform guard 전환 시 상실 → 운영자/audience 는 **pure neture:admin 상실**, 역할관리는 상실 없음.
8. /admin/platform 이동 시 필요 변경 → route 이전 + frontend guard(PlatformRoute) + **backend guard 재작성**(neture-scope→platform requireRole) + 운영 책임 재배정.
9. 현 위치 유지 리스크 → platform-admin 일원화 미완 + 이미 존재하는 guard 불일치 잔존.
10. 권장 → **C(하이브리드) 1차 채택, 기능별 종착=운영자관리 A / 역할관리·서비스대상정책 B**(guard 정합 후).

## 6. 권장 (기능별 종착 + 단계)

```
1차 (즉시, 안전): C 하이브리드
  /admin/platform landing 에 Tier 1 안내/크로스링크 카드 3종 추가.
  route 이동·guard 변경 0. 운영 회귀 0.
  → WO-O4O-PLATFORM-TIER1-CROSSLINK-CARDS-V1

종착 (후속, 정책 확정 후):
  운영자 관리        → A 유지(Neture admin). neture 전용이므로 이동 부적합.
                       단 frontend/backend guard 정합(platform:super_admin backend 403 해소) 별도 검토.
  역할 관리          → B 이동(/admin/platform). backend 이미 platform 전용 → 저위험. frontend 과대허용 정리.
  서비스 대상 정책   → B 이동. 단 backend neture-scope→platform 전환 + 운영 책임 재배정(누가 cross-service 정책 수정) 결정 선행.
```

## 7. 후속 WO 후보

1. **(권장 1차) `WO-O4O-PLATFORM-TIER1-CROSSLINK-CARDS-V1`** — /admin/platform landing 에 운영자/역할/서비스대상 안내 카드(외부 링크). route/guard 무변경, frontend-only.
2. `WO-O4O-PLATFORM-ROLES-MENU-MIGRATION-V1`(B) — 역할 관리 /admin/platform 이전 + frontend guard 정리(backend 이미 platform 전용).
3. `IR-O4O-SERVICE-AUDIENCE-POLICY-OWNERSHIP-DECISION-V1` — 서비스 대상 정책의 운영 책임/guard(neture:admin↔platform) 재배정 결정(이동 선행).
4. `IR-O4O-ADMIN-GUARD-FRONTEND-BACKEND-RECONCILE-V1`(독립) — operators/audience 의 frontend(platform:super_admin 허용)↔backend(neture-scope) 불일치 해소.

## 8. 준수 확인

```
✅ read-only — 코드/route/guard/backend/DB/운영데이터 변경 0
✅ platform Phase 1(/admin/platform·accounts·services·users·entrypoint) 미접촉
✅ Tier 1 운영 기능 미접촉(조사만)
✅ 산출물 = 본 문서 1개 (path-specific)
```

---

*read-only · Tier 1 3종 비동질: 운영자관리=NETURE-SCOPED(A 유지)/역할관리·서비스대상정책=CROSS-SERVICE(B 종착) · 즉시=C 하이브리드 크로스링크(guard 무변경) · 기존 guard 불일치(operators/audience: platform:super_admin backend 403, roles: neture:admin 변경 403) 이동 전 해소 필수 · 후속 P1 crosslink cards → roles 이동 → audience ownership 결정.*
