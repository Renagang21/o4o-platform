# CHECK-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1

> 작성일: 2026-09-24 · 상태: **`CODE_AND_DOCS_DONE / AWAITING_CONTROLLED_DEPLOY`**
> WO: [`WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1`](../work-orders/WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1.md)
> 작업 브랜치: `wo/identity-account-display-alignment` · **migration 0 · production DB write 0**

---

## 1. Census — `user.role` / `roles[0]` / email 표시 (§6 · §10)

판정 대상: **git-tracked 활성 runtime 소스 5,161 파일**(dist · node_modules · 테스트 · migration ·
e2e · docs 제외, 주석 제거 후 판정).

### 1-1. 비결정 스칼라의 **생산자**

| 위치 | 내용 | 판정 |
|---|---|---|
| `utils/token.utils.ts` | JWT `role` claim = `userRoles[0]` | **COMPATIBILITY** → 결정적으로 교체 |
| `services/auth/auth-context.helper.ts` | `publicData.role = roles[0]` | **COMPATIBILITY** → 결정적으로 교체 |
| `modules/auth/controllers/auth-account.controller.ts` ×3 | `role: roles[0]` (`/auth/me` 응답 · `deriveUserScopes` 인자) | **COMPATIBILITY** → 결정적으로 교체 |

근원인 `role-assignment.service.ts`(RBAC SSOT)에 `ORDER BY` 를 넣는 방법도 있었으나
**FROZEN Core**(`@core O4O_PLATFORM_CORE` · CORE_CHANGE 승인 필요)라 건드리지 않았다.
대신 **생산자에서 정렬 사본**(`[...roles].sort()[0]`)으로 결정성을 만들었다 — 원본 배열은 그대로다.

### 1-2. **소비자** 판정표

| 위치 | 판정 | 처리 |
|---|---|---|
| `services/web-neture/.../hub/HubPage.tsx` | **ROUTING — 실제 결함** · `roles[0]` 하나로 허브 접근 차단(보유해도 첫 원소가 다르면 거부될 수 있음) | **수정** — `userRoles.some(...)` 보유 판정 |
| `apps/admin-dashboard/.../layout/AdminHeader.tsx` | **DISPLAY_ONLY(비결정)** · `역할: {user?.role} \| SSO 인증` | **수정** — 표시 계약으로 교체 |
| `controllers/forum/ForumRecommendationController.ts` + `recommendation-score.ts` | **BEHAVIORAL(비결정)** · `roles[0]` 로 admin/manager 가중치 판정 → 추천 순위가 요청마다 흔들릴 수 있음 | **수정** — `roles[]` 보유 판정(서비스 접두 suffix 포함) |
| `packages/operator-core-ui/.../OperatorMembersConsolePage.tsx` | **DISPLAY_ONLY(비결정)** · 해당 서비스 membership 이 없을 때 `roles[0]` 표시(다른 서비스 role 을 대표로 끌어옴) | **수정** — `'-'` 로 표기 |
| `apps/admin-dashboard/.../users/UserDetail.tsx` | **DISPLAY_ONLY(결함)** · `Assigned Roles` 가 스칼라 1개 · 연산자 우선순위 버그로 Badge 없이 배열 렌더 | **수정** — `roles[]` 전체 렌더 |
| `packages/auth-context/adminRouteAccess.ts` `collectUserRoles` | **COMPATIBILITY** — `role` 을 `roles[]` 에 **합집합**으로 추가. 순서 무관 | 유지 |
| `packages/auth-context/AuthProvider.tsx` `isAdmin` | **COMPATIBILITY** — `role \|\| activeRole \|\| roles.some(...)` OR 판정 | 유지 |
| `hooks/useAdminMenu.ts` · `hooks/useOperatorPolicy.ts` | **COMPATIBILITY** — `roles[]` 우선, 없을 때만 스칼라 fallback | 유지 |
| `utils/scope-assignment.utils.ts` `rolesToScopeLevel` | **안전** — `new Set([role, ...roles])` 합집합 | 유지 |
| `common/middleware/auth/service-access.middleware.ts` `payload.role` | **무관** — service token 의 provider 식별(플랫폼 role 아님) | 유지 |
| `middleware/errorHandler.middleware.ts` · `modules/neture/controllers/admin.controller.ts` | **로그/감사** | 유지 |
| `packages/ui/src/layout/AGHeader.tsx` (raw `user.role` 표시) | **DEAD** — `AGAppLayout`/`AGHeader` 소비처 0(apps·services 전수) | 미수정 · 보고 |
| `apps/admin-dashboard/src/pages/{test,__debug__}/**` | **DEV_ONLY** — 진단 화면 | 유지 |
| `modules/hub-content/hub-content.service.ts` `roles[0]` | **무관** — 상수 맵(`PRODUCER_TO_AUTHOR_ROLES`)의 첫 원소, 사용자 role 아님 | 유지 |

**결론: `roles[0]` 에 의존하는 active authorization consumer 0** (인가는 전부 배열/합집합).
단 **routing 1건(HubPage)** 이 실제로 존재했고 이번에 제거했다.

---

## 2. 변경 (코드)

| 파일 | 내용 |
|---|---|
| `packages/auth-context/src/accountDisplay.ts` **신규** | 표시 계약 SSOT — `ADMIN_SURFACE_ROLE` · `LOGIN_METHOD_LABEL` · `resolveAdminRoleLabel` · `buildAccountDisplayInfo`. **보유 여부로만 판정**하며 인가에 쓰지 않는다. 전역 우선순위 표를 만들지 않는다 |
| `packages/auth-context/src/index.ts` | 위 export |
| `AdminHeader.tsx` | `역할: {user?.role} \| SSO 인증` → **로그인 수단 / 관리 권한 / 프로필 이메일** 을 label 과 함께 분리 |
| `HubPage.tsx` | `roles[0]` 단일 검사 → `userRoles.some(...)` |
| `ForumRecommendationController.ts` · `recommendation.types.ts` · `recommendation-score.ts` | `role?: string`(=`roles[0]`) → `roles?: string[]` + 보유 판정 |
| `OperatorMembersConsolePage.tsx` | membership 없으면 `'-'` |
| `UserDetail.tsx` | `Assigned Roles` = `roles[]` 전체(없으면 "할당된 역할이 없습니다") |
| `token.utils.ts` · `auth-context.helper.ts` · `auth-account.controller.ts` | compatibility scalar 를 **정렬 사본**으로 결정화 |

**하지 않은 것**: `users.email` 컬럼 변경 · Google email 저장 · role/membership 데이터 변경 ·
RBAC SSOT(Core) 수정 · 전역 role 서열 신설.

## 3. 테스트 · 정적 guard

| 대상 | 결과 |
|---|---|
| `packages/auth-context/src/__tests__/accountDisplay.test.ts` (vitest 7) | **PASS** — ① role 배열 **모든 회전(permutation)** 에서 표시 동일 ② 사고 재현(첫 원소 `kpa-branch:operator`)에서도 "최고 관리자" ③ 표시 helper 와 인가 판정의 **독립성** ④ `loginMethod` 에 email 이 섞이지 않음 |
| `apps/api-server/src/__tests__/identity-account-display-contract.spec.ts` (jest 14) | **PASS** — G1 helper 가 보유 여부 판정 · G2 AdminHeader 에 `user.role`/"SSO 인증"/로그인-이메일 표기 없음 + 3항목 label 분리 · G3 HubPage `roles[0]` 부재 · G4 scalar 결정성 · G5 email 이름 |

vitest 쪽은 **CI 미연결**이다 — `ci-pipeline.yml` 에 step 을 추가하는 것은 CI 인프라 변경이라
**사용자 승인 필요**(CLAUDE.md 중지 조건). 그래서 같은 계약의 **정적 축을 api-server jest 에 두어**
CI 에서 자동 실행되게 했다. 승인 시 추가할 step 1줄:
`npx vitest run --config packages/auth-context/vitest.config.mjs`

정적 guard 자체의 **오탐 1건을 제조 중에 잡았다** — 줄 단위 주석 필터가 JSX 블록 주석의 중간 줄을
위반으로 읽었다. 블록 주석을 먼저 제거하도록 고치고, **guard 가 무력해지지 않았음을 증명하는
자기검사 테스트**(주석은 지우고 코드 줄은 남는다)를 같이 넣었다.

## 4. 문서 정합

| 문서 | 처리 |
|---|---|
| `baseline/USER-DOMAIN-SSOT-V1.md` | ERD 컬럼 목록에서 `password` · `loginAttempts` 제거 + `DROPPED` 행 추가. **§0 신설** — 현행 identity 축(`sub → linked_accounts → users.id`), `users.email` = 프로필 필드(인증 키 아님), 권한은 `role_assignments` 배열 판정 |
| `architecture/O4O-IDENTITY-ARCHITECTURE-V3.md` | 미래형 4곳을 현재 사실로 — `service_credentials` "전환 기간 한정 잔존" → **제거 완료** · 물리 제약에서 `password NOT NULL` 삭제 · 명시 연결 절차 → **전환 완료** · REVIEW-8 → **부분 해소**(잔존은 `users.email NOT NULL UNIQUE`). **V4 를 만들지 않았다** |
| `baseline/O4O-MYPAGE-CANONICAL-V1.md` | `PUT /users/password` 를 현행처럼 적은 근거 3곳 정정. **결정(Option D)은 불변** |
| `docs/CANONICAL-INDEX.md` | 두 행의 설명만 현재 상태로 갱신 (ACTIVE/SUPERSEDED 판정 불변) |
| `architecture/O4O-CORE-FREEZE-V1.md`(F10) · `architecture/USER-OPERATOR-FREEZE-V1.md`(F11) | **REPORT_ONLY** — `service_credentials` 신설/`users.password` 제거를 예정처럼 서술한 표가 남아 있다. Frozen Baseline 본문 수정은 §16-4 금지이므로 고치지 않고 보고한다 |

## 5. 검증

| 항목 | 결과 |
|---|---|
| `pnpm build:packages` | rc=0 |
| api-server `tsc --noEmit` | rc=0 |
| `pnpm run type-check:frontend` | **OK** |
| 표시 계약 vitest | 7/7 PASS |
| 정적 contract jest | 14/14 PASS |

## 6. 남은 것

- **배포**: Admin UI · 공용 패키지 · api-server 가 바뀌었으므로 detector 판정에 따른 통제 배포가 필요하다.
  판정은 `workflow success` 가 아니라 **deploy job 실행 · revision 생성 · traffic 전환** 3단계로 한다
  (Cloud Run traffic pin 때문에 명시적 전환 없이는 서빙이 바뀌지 않는다).
- **배포 후 smoke**: Google 로그인 → Admin 진입 → Header 의 세 항목 의미 확인 → F5 → 로그아웃 → 재로그인,
  그리고 read-only 로 `users 1 · Google sub 동일 · roles 11 · memberships 5 · platform:super_admin active` 불변 확인.
- **별도 판단**: ① auth-context vitest 의 CI step 추가(승인 필요) ② F10/F11 Freeze 본문 갱신 여부
  ③ `packages/ui` 의 DEAD layout(`AGHeader`/`AGAppLayout`) 처분.
