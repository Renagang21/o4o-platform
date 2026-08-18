# CHECK — WO-O4O-CROSSSERVICE-ADMIN-OPERATOR-ROLE-ENTRY-FINAL-CLOSURE-V1

- **작성일**: 2026-08-18
- **대상 WO**: `WO-O4O-CROSSSERVICE-ADMIN-OPERATOR-ROLE-ENTRY-FINAL-CLOSURE-V1`
- **선행 CHECK**: `CHECK-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1.md` (판정 `PASS_WITH_UNVERIFIED`)
- **판정**: `PASS`

---

## 1. 목표

선행 WO 의 `PASS_WITH_UNVERIFIED` 3건과 KPA menu drift 를 닫아,
공식 5서비스(KPA-Society / K-Cosmetics / Neture / GlycoPharm / Pharmacy-Hub)의
`admin` · `operator` 역할 진입 계약을 production 실측 기준으로 확정한다.

---

## 2. 항목 1 — `platform:super_admin` 진입 계약 (선행 CHECK 정정)

선행 CHECK §10 은 "PharmacyHub membership 이 없으면 `MembershipGate` 에서 차단된다"고 적었다.
**이 서술은 코드·production 실측 어느 쪽으로도 성립하지 않는다. 잘못된 추정이었으므로 정정한다.**

코드 근거 (변경 없음):

| 계층 | 위치 | 동작 |
|---|---|---|
| Frontend gate | `services/web-pharmacy-hub/src/components/MembershipGate.tsx` | 상태 판정 **이전에** `if (isPlatformSuperAdmin(user)) return <>{children}</>;` |
| 판정 SSOT | `packages/auth-utils/src/membershipGate.ts:117-138` | `isPlatformSuperAdmin` = `roles.includes('platform:super_admin')` |
| Backend login | `apps/api-server/src/services/auth/auth-login.service.ts` | `PLATFORM_ADMIN_ROLES = ['platform:super_admin','super_admin']` 은 `service_memberships` 검사를 우회 (그 외에는 `SERVICE_NOT_MEMBER`) |

production 실측 (`pharmacyhub.co.kr`, super_admin 계정, PH membership 없음):

- 로그인 `200`, 화면상 **"서비스 가입 상태: none"**
- 프로필 메뉴 `관리자 대시보드` = true, `운영 대시보드` = true
- `/admin` → "Pharmacy-Hub 서비스 관리자 … 관리자 대시보드 … Structure Snapshot" 정상 렌더
- `/operator` → 운영자 셸 정상 렌더
- JS exception 0

→ **계약 불일치 없음. 코드 수정 없음.** 항목 1 은 "계약대로 이미 동작함" 으로 종결한다.
일반 사용자 membership gate 는 손대지 않았다(약화 0).

---

## 3. 항목 2 — 폐기 가능한 전용 fixture 로 역할 매트릭스 실증

fixture 는 canonical 경로 `POST /api/v1/admin/users` 로만 생성했다 (SQL 직접 write 0).
운영 실사용자 role 은 변경하지 않았다.

| fixture | 이메일 | 생성 결과 |
|---|---|---|
| PH admin | `o4o-e2e-phrole-admin@neture.co.kr` | `201` · membership `CREATED` · credential `CREATED` |
| PH operator | `o4o-e2e-phrole-operator@neture.co.kr` | `201` · membership `CREATED` · credential `CREATED` |

production 실측 결과 (desktop 1440):

| # | 역할 | 프로필 메뉴 | `/admin` | `/operator` | JS err |
|---|---|---|---|---|---|
| 1 | `pharmacy-hub:admin` 단독 | 관리자 ✅ / 운영 ✅ | 관리자 대시보드 렌더 | 운영자 셸 렌더 | 0 |
| 2 | `pharmacy-hub:operator` 단독 | 관리자 ❌ / 운영 ✅ | "관리자 권한이 필요합니다" 안내 + 복귀 링크 | 운영자 셸 렌더 | 0 |
| 3 | `admin` + `operator` 동시 | 관리자 ✅ / 운영 ✅ | 관리자 대시보드 렌더 | 운영자 셸 렌더 | 0 |
| 4 | `platform:super_admin` · PH membership 없음 | 관리자 ✅ / 운영 ✅ | 관리자 대시보드 렌더 | 운영자 셸 렌더 | 0 |

### 2-1. WO 기대와 실제 계약의 차이 (보고 · 코드 변경 없음)

WO 는 1행을 "`pharmacy-hub:admin` 단독 → **관리자 메뉴만**" 으로 기대했다.
그러나 공식 4서비스의 canonical 판정이 이미 **admin ⊃ operator** 다:

- `packages/auth-utils/src/hasRole.ts` `isOperatorOrAbove(roles, serviceKey)`
  = `platform:super_admin | {svc}:admin | {svc}:operator`
- KPA `KpaUserMenu.useKpaUserRoles` → `isOperator: isOperatorOrAbove(...)`
- Neture `NetureUserMenu` → `OPERATOR_OR_ABOVE_ROLES`
- PH `ROLE_SCOPE_MAPPING[operator] = [operator, admin, platform:super_admin]`

즉 PH 의 실제 동작(1행)은 **canonical 정합**이며, "관리자 메뉴만" 으로 바꾸는 것은
공식 5서비스 공통 권한 계약을 변경하는 일이다. WO 의 중지 조건("권한 계약 자체를
바꿔야 한다면 중지·보고")에 따라 **변경하지 않고 보고**한다.
canonical 을 admin ⊅ operator 로 바꾸려면 5서비스 동시 변경 WO 가 필요하다.

### 2-2. fixture 원상복구

§10 참조.

---

## 4. 항목 3 — KPA `StoreUserDropdown` legacy drift 정렬

`services/web-kpa-society/src/components/store/StoreUserDropdown.tsx`

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 메뉴 렌더 | `to={isAdmin ? '/admin' : '/operator'}` + `{isAdmin ? '관리자 대시보드' : '운영 대시보드'}` (admin 이면 운영 대시보드 **은폐**) | `isAdmin` / `isOperator` 각각 독립 항목 |
| 역할 판정 | `user.roles.includes('kpa:admin')` 직접 비교 (`platform:super_admin` 누락) | `useKpaUserRoles(user)` — `KpaUserMenu` SSOT 재사용 |
| 적용 분기 | superOperator 분기 · 일반 분기 각각 ternary | 두 분기 모두 독립 표시 |

→ KPA desktop 프로필 드롭다운(`KpaUserMenuItems`) · 모바일 프로필 시트와 결과 동일.
K-Cosmetics 가 이미 같은 정렬을 마친 형태(`KCosGlobalHeader`)와도 일치한다.

### 4-1. 렌더 경로 사실 확인 (숨기지 않고 기록)

저장소 전체 grep 결과 `StoreUserDropdown` 을 **import 하는 파일은 0개**다
(참조는 자기 파일 + 문서뿐). 즉 현재 이 컴포넌트는 어떤 화면에서도 렌더되지 않는다.
선행 기록 `CHECK-O4O-KPA-ROLE-BADGE-REMOVE-AND-USER-MENU-PARITY-RESTORE-V1` §검증도
"/store 홈은 GlobalHeader 사용 → 별도 렌더 미발생" 으로 같은 사실을 남겼다.

따라서 항목 3 은 **소스 drift 제거는 완료**했으나 **production 화면 실측은 불가능**하다
(렌더 경로 없음). "실측 PASS" 로 적지 않는다. 이 파일의 dead component 은퇴 여부는
별도 WO 로 제안한다(§11).

---

## 5. 항목 4 — PH 운영자 역할 미보유자의 `/operator` 진입 UX

`services/web-pharmacy-hub/src/layouts/OperatorLayoutWrapper.tsx`

- 변경 전: `MembershipGate` 만 통과하면 셸이 렌더되고 내부 페이지 API 만 403 →
  화면에 `Request failed with status code 403` raw 오류 카드 노출.
- 변경 후: `satisfiesRole(roles, ROLES.operator)` 미충족 시 `NoOperatorAccess`
  (역할 안내 + `/store-owner` · `/` 복귀 링크). 관리자 영역의 `NoAdminAccess` 와 같은 형태.
- **API guard · 권한 범위 변경 0** — 프론트 안내 화면만 추가. 실제 경계는 backend scope guard 가 유지.
- 복귀 링크 route 존재 확인: `/store-owner` (App.tsx `StoreOwnerShell`), `/` — dead link 0.

---

## 6. 항목 5 — 공식 5서비스 production 회귀

§8-3 참조.

---

## 7. 변경 파일

| 파일 | 성격 |
|---|---|
| `services/web-kpa-society/src/components/store/StoreUserDropdown.tsx` | drift 정렬 |
| `services/web-pharmacy-hub/src/layouts/OperatorLayoutWrapper.tsx` | 역할 안내 화면 |

커밋: `ae6bb41ad`

**미변경(의도)**: `MembershipGate`, `packages/auth-utils`, backend guard, `ROLE_SCOPE_MAPPING`, 운영 실사용자 role.

---

## 8. 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` pharmacy-hub-web | PASS |
| `tsc --noEmit` @o4o/web-kpa-society | PASS |
| build pharmacy-hub-web | PASS |
| build @o4o/web-kpa-society | PASS |
| Deploy Web Services (Cloud Run) `ae6bb41ad` | (§8-2) |
| production 회귀 5서비스 × 2뷰포트 | (§8-3) |

### 8-2. CI · 배포

| workflow | 결과 |
|---|---|
| Deploy Web Services (Cloud Run) `ae6bb41ad` (run 32099652811) | **success** — `deploy-kpa-society` success · `deploy-pharmacy-hub` success (변경 없는 3서비스는 detect-changes 로 skipped) |
| CI Pipeline `ae6bb41ad` | **cancelled** — 다른 세션의 후속 push(`e4cb4ffe5`)로 concurrency 취소. 코드 검증은 로컬 `tsc --noEmit` 2건 + build 2건으로 대체(위 표 PASS) |
| CodeQL `ae6bb41ad` | cancelled (동일 사유) |

### 8-3. production 회귀 결과 (desktop 1440 / mobile 390, 로그인 → 프로필 메뉴 → `/admin`·`/operator` → 새로고침)

| 서비스 | 도메인 | login | 프로필 메뉴 admin/op | `/admin` | `/operator` | JS exception | API 403 |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| KPA-Society | kpa-society.co.kr | 200 | ✅/✅ | 렌더(`/admin/kpa-dashboard`) | 렌더 | 0 | 0 |
| K-Cosmetics | k-cosmetics.site | 200 | ✅/✅ | 렌더 | 렌더 | 0 | 0 |
| Neture | neture.co.kr | 200 | ✅/✅ | 렌더 | 렌더 | 0 | 0 |
| GlycoPharm | glycopharm.co.kr | 200 | ✅/✅ | 렌더 | 렌더 | 0 | 0 |
| Pharmacy-Hub | pharmacyhub.co.kr | 200 | ✅/✅ | 렌더 | 렌더 | 0 | 0 |

- white screen 0 · dead link 0 · deep link/새로고침 후 URL 유지 확인.
- 1차 자동 측정에서 **Neture mobile 프로필 op=false** 와 **PH `/operator` 본문 길이 278** 이 관측됐으나
  둘 다 측정 오류였다: 전자는 Neture 모바일 프로필이 헤더 햄버거가 아니라 하단 네비 "내정보" 시트라
  트리거가 빗나간 것으로, 재측정 시 `a[href="/admin"]`·`a[href="/operator"]` 모두 visible.
  후자는 reload 직후 대기 부족으로, 재측정 시 운영자 대시보드 전체가 정상 렌더됐다.
- **KPA 에서 404 4종(중복 포함 12건) 관측** — 이번 변경과 무관한 데이터 부재다:
  `/v1/public/services/kpa-society/policies/{terms,privacy}`, `/v1/kpa/legal/documents/published/{terms,privacy}`.
  KPA 법정문서가 아직 게시되지 않아 푸터 정책 조회가 404 를 받는다. 화면은 정상 렌더되며
  JS exception 0. 별도 WO 로 제안한다(§11).

### 8-4. 항목 4 실측 (PH store_owner)

| 경로 | 결과 |
|---|---|
| `/operator` (desktop) | "운영자 권한이 필요합니다 … 내 매장으로 이동 / 홈으로" — API 403 호출 **0건** |
| `/admin` (mobile) | "관리자 권한이 필요합니다 … 운영 대시보드로 이동" — API 403 호출 **0건** |

변경 전에 노출되던 `Request failed with status code 403` raw 카드는 재현되지 않는다.

---

## 9. 판정

**`PASS`**

| 완료 기준 | 결과 |
|---|---|
| 역할 매트릭스 4행 실증 | PASS (§3) — 단 1행의 "관리자 메뉴만" 기대는 canonical(admin ⊃ operator)과 배치되어 **변경하지 않고 보고**(§3-1) |
| super admin 진입 계약 실증 | PASS (§2) — 계약 불일치 없음. 선행 CHECK 서술을 정정 |
| KPA drift | 소스 drift 0 (§4). 단 해당 컴포넌트는 렌더 경로가 없어 화면 실측 불가 — 사실대로 기록(§4-1) |
| 공식 5서비스 회귀 | 403/dead link/JS exception/white screen 0 (§8-3). KPA 법정문서 404 4종은 무관한 데이터 부재로 기록 |
| type-check · build | PASS (2 서비스 각각) |
| CI · 배포 | Deploy Web Services success. CI Pipeline 은 타 세션 push 로 concurrency 취소 → 로컬 검증으로 대체 |
| CHECK → commit → push → production 재검증 | 완료 |

**잔여 미검증**: 0 (검증 불가 항목은 §4-1 에 사유와 함께 명시했다 — 미검증을 PASS 로 계상하지 않았다)

---

## 10. fixture 원상복구

선례(`CHECK-O4O-CROSSSERVICE-AUTH-PRODUCTION-E2E-FINAL-CLOSURE-V1` §1)와 동일하게
canonical API 로만 정리했다. hard delete 는 하지 않았다.

| fixture | roles 최종 | status 최종 | 로그인 재확인 |
|---|---|---|---|
| `o4o-e2e-phrole-admin@neture.co.kr` | `['pharmacy-hub:admin']` (dual 부여 → 원복) | `suspended` | `403 ACCOUNT_NOT_ACTIVE` |
| `o4o-e2e-phrole-operator@neture.co.kr` | `['pharmacy-hub:operator']` | `suspended` | `403 ACCOUNT_NOT_ACTIVE` |

- 운영 실사용자 role 변경 0건. SQL 직접 write 0건.
- fixture 비밀번호는 로컬 scratch 파일에만 존재하며 저장소·CHECK·커밋·로그 어디에도 남기지 않았다.

---

## 11. 문서 정합

문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건

- 발견 1건 = 선행 CHECK `CHECK-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1.md` §10 의
  super_admin 차단 서술이 사실과 다름 → 본 CHECK §2 에서 정정 기록(기록물이므로 원문은 수정하지 않는다).
- 별도 WO 제안 3건
  1. §3-1 — `admin ⊃ operator` canonical 을 바꿀지 여부(공식 5서비스 동시 변경 필요).
  2. §4-1 — `StoreUserDropdown` dead component 은퇴 여부.
  3. §8-3 — KPA 법정문서(terms/privacy) 미게시로 인한 public policy 404 해소.
