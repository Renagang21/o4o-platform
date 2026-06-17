# CHECK-O4O-PLATFORM-ADMIN-SURFACE-PHASE1-CLOSURE-V1

> **유형:** Phase 종료 고정 (문서 only — 코드/DB/운영 변경 0). platform-admin surface 1차 트랙 closure.
> **판정: CLOSED / PASS** — route·accounts·services·users(read-only, PII 안전)·entrypoint 완료, 운영 smoke(search FIX 포함) PASS. negative-guard runtime·Tier 1 이동은 별도 후속.
> **작성일:** 2026-06-17

---

## 0. 종료 선언

```
O4O platform-admin surface Phase 1 = CLOSED / PASS
단, pure-role negative runtime 검증과 Tier 1 migration 은 별도 후속으로 분리한다.
```

`/admin/platform` 은 **계정·서비스·사용자 조회(read-only, PII 안전, 검색 정상)** 까지 갖춘 1차 platform-admin surface 로 고정한다.

---

## 1. 트랙 lineage (IR/WO/SMOKE + commit)

| 단계 | 문서 | commit | 결과 |
|------|------|--------|------|
| 설계 | IR-O4O-PLATFORM-ADMIN-SURFACE-DESIGN-V1 (Phased B) | (선행) | 결정 |
| 섹션 routing | WO-O4O-ADMIN-PLATFORM-SECTION-ROUTING-V1 | `11d14a050` (+check `3d4a4246c`) | 완료 |
| 〃 smoke | SMOKE-...-SECTION-ROUTING-POST-DEPLOY-V1 | `2ff3a3614`/`028d07710` | PARTIAL PASS |
| accounts·services UI | WO-O4O-PLATFORM-ACCOUNTS-SERVICES-UI-V1 | `a4e93fc1e` (+check `c12aadd19`) | 완료 |
| 〃 smoke | SMOKE-...-ACCOUNTS-SERVICES-UI-POST-DEPLOY-V1 | `938203c03`/`7c2341f48` | PARTIAL PASS |
| entrypoint | WO-O4O-PLATFORM-ADMIN-ROLE-BASED-ENTRYPOINT-V1 | `66132b54c` (+check `356099a52`) | 완료 |
| 〃 smoke | SMOKE-...-ROLE-BASED-ENTRYPOINT-POST-DEPLOY-V1 | `a2f926057`/`926b86535` | PARTIAL PASS |
| users 범위 IR | IR-O4O-PLATFORM-GLOBAL-USERS-UI-SCOPE-AUDIT-V1 (권장 B) | `dea9499f3` | 조사 완료 |
| users read-only | WO-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-V1 | `2b0b3a44e` | 완료 |
| 〃 smoke | SMOKE-...-READONLY-LIST-POST-DEPLOY-V1 | `1c3e9e367` | PII PASS / search FAIL |
| search FIX | WO-O4O-PLATFORM-USERS-SEARCH-COMPANY-FIELD-FIX-V1 | `36174fde1` | 완료 |
| 〃 smoke | SMOKE-...-SEARCH-FIX-V1 | `d3d19dd05` | **PASS** |

---

## 2. Phase 1 완료 기능

| # | surface | route / endpoint | 성격 |
|---|------|------|------|
| 4.1 | platform section | `/admin/platform` (PlatformRoute) | Neture service admin 과 분리된 sibling section |
| 4.2 | accounts | `/admin/platform/accounts` (`/api/v1/admin/platform-accounts`) | 계정 목록·비밀번호 재설정·활성 토글(서버 보호 SELF_LOCK/LAST_SUPER_ADMIN/SUPER_ADMIN_ONLY) |
| 4.3 | services | `/admin/platform/services` (`/api/v1/admin/platform-services`) | 서비스 목록 read-only(상태 변경은 후속) |
| 4.4 | users | `/admin/platform/users` (`GET /api/v1/admin/platform-users`) | 전체 사용자 read-only(검색/상태·role 필터/pagination), **안전 projection** |
| 4.5 | entrypoint | Neture admin dashboard '플랫폼 관리' 카드 | `hasPlatformAdminRole` 노출(sidebar 미추가) |

---

## 3. 권한 guard 기준

- 허용: `platform:admin` · `platform:super_admin`.
- 비허용: `neture:admin` only / service admin only / operator only.
- 정적 보장: PLATFORM_ROLES 에 neture:admin 미포함, PlatformRoute 하위 route, backend `requireRole(['platform:admin','platform:super_admin'])`.
- **미검증(런타임):** pure neture:admin-only 차단 / pure platform:admin-only 직접 접근 UX — 해당 계정 부재(통합 계정만 존재).

---

## 4. PII / 보안 projection 기준 (users)

- **raw `/admin/users` 직결 금지** → 전용 투영 endpoint `/admin/platform-users` 경유.
- **허용 8필드:** `id, email, name, roles, status, isActive, createdAt, lastLoginAt`.
- **금지(미반환):** password · refreshTokenFamily · lastLoginIp · phone · businessInfo · provider/provider_id · kakao URL · avatar · firstName · lastName · nickname · 동의 타임스탬프류.
- **운영 검증 완료(`d3d19dd05` smoke):** 전 호출 응답 keys = 허용 8필드만, PII/보안 누출 **CLEAN**. mutation 없음(GET-only). 운영 데이터 변경 0.

---

## 5. 운영 smoke 요약

| smoke | 핵심 판정 |
|------|------|
| section routing | PARTIAL PASS (FIX 불요) |
| accounts·services UI | PARTIAL PASS (FIX 불요) |
| role-based entrypoint | PARTIAL PASS (FIX 불요) |
| global users read-only | **PII projection PASS** / search FAIL |
| global users search FIX | **PASS** (search 200·필터·pagination·PII CLEAN) |

→ route/UI/entrypoint 운영 안정, global users **핵심 보안(PII) 운영 PASS**, 발견된 search 500 은 FIX 후 재검증 PASS. PARTIAL 사유는 일관되게 **pure-role 계정 부재(negative guard 미검증)**.

---

## 6. 남은 미검증 항목 (종료를 막지 않음)

```
- pure neture:admin-only 계정으로 /admin/platform 차단 확인
- pure neture:admin-only 계정에서 platform 카드 미노출 확인
- pure platform:admin-only 계정 직접 /admin/platform 접근 UX
- browser UI 에서 /admin/platform/users action 버튼 부재 확인
```
→ 핵심 API/PII/security 는 검증 완료. 위는 **계정 제약/배포후 browser** 사유로 미검증이며 후속에서 계정 확보 시 보완.

---

## 7. 후속 트랙 (별도 분리)

| 트랙 | 문서(후보) | 내용 |
|------|------|------|
| Tier 1 이동 결정 | `IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1` | 운영자/역할/서비스대상 정책을 Neture admin 유지 vs `/admin/platform` 이전 vs 하이브리드 + guard 전환 |
| user governance | `IR-O4O-PLATFORM-USER-GOVERNANCE-POLICY-V1` | service membership 요약·role 편집·detail·개인정보 파기·감사 로그 |
| global entrypoint | `WO-O4O-PLATFORM-ADMIN-GLOBAL-ENTRYPOINT-V1` | pure platform:admin 의 보편 진입점(dashboard 비경유) |
| services mutation | `WO-O4O-PLATFORM-SERVICES-STATUS-MUTATION-UI-V1` | 서비스 상태 변경(confirm/audit) |
| frozen latent bug | `IR-O4O-ADMIN-USERS-SEARCH-COMPANY-LATENT-BUG-V1` | `AdminUserController.getUsers` 의 `user.company` 동일 라인 점검(frozen core 별도 판단) |

---

## 8. 당장 하지 않을 일 (종료 고정)

```
Tier 1 route 이동 · role/permission 정책 변경 · global users mutation 추가 ·
회원 삭제/파기 · role assignment 편집 · service membership 편집 ·
platform services 상태 변경 · 새 앱/도메인 생성 · Finance 정비 · 기존 /admin/users 수정
```

---

## 9. 준수 확인

```
✅ 문서 only — 코드/route/UI/backend/DB/운영데이터 변경 0
✅ 산출물 = 본 문서 1개 (docs/investigations/CHECK-O4O-PLATFORM-ADMIN-SURFACE-PHASE1-CLOSURE-V1.md)
✅ path-specific commit
```

---

*Phase 1 CLOSED/PASS · /admin/platform = section+accounts+services+users(read-only,PII 안전)+entrypoint · 운영 smoke(search FIX 포함) PASS · negative-guard runtime·Tier1 이동·user governance·global entrypoint·services mutation·frozen latent bug 는 별도 후속 · 다음 권장 트랙 = IR-O4O-PLATFORM-TIER1-MENU-MIGRATION-DECISION-V1.*
