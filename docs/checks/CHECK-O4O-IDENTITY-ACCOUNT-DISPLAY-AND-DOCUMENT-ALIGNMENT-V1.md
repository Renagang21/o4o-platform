# CHECK-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1

> 작성일: 2026-09-24 · 상태: **`DEPLOYED / SMOKE_PASS`** — 6서비스 통제 배포·smoke 완료(§6). 잔여: §6-4 계정 상태 수정의 admin 재배포 1건
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

**판정 (사용자 확정 2026-09-24): RBAC Core 에 `ORDER BY` 를 추가하지 않는다 · 별도 Core 정렬 WO 도 만들지 않는다.**

근거: `role_assignments` 는 **집합 SSOT** 이고 role 순서 자체에 business meaning 이 없다.
Core 에서 정렬해 버리면 오히려 "첫 원소가 대표 역할" 이라는 의미가 **다시 생긴다**(§3-2 와 반대).
census 결과 authorization/routing 의 scalar 소비는 0 이고 routing 결함은 배열 보유 판정으로 고쳤으므로,
**출력 경계에서만 compatibility scalar 를 결정적으로** 만드는 지금 구조가 구조적으로 맞다.
장기적으로 `user.role` 의 active consumer 가 진짜 0 이 되는 시점에는 정렬을 넣는 것보다
**scalar 자체를 제거**하는 쪽을 검토한다.

구현: `apps/api-server/src/utils/compat-primary-role.ts` — 코드 단위 비교의 **최소값**을 직접 고른다.
`sort()` 를 쓰지 않는다(비교 함수 없는 `sort()` 는 의도를 코드로 드러내지 않아 SonarQube reliability
규칙에 걸렸고, `localeCompare` 는 **로케일 의존**이라 "결정성" 목적과 상충한다).

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
| `token.utils.ts` · `auth-context.helper.ts` · `auth-account.controller.ts` | compatibility scalar 를 `compatPrimaryRole()` 로 결정화(5곳) |
| `utils/compat-primary-role.ts` **신규** | 코드 단위 비교의 최소값을 직접 고른다 — `sort()` · `localeCompare` 미사용. 반환값은 **대표 역할이 아니다** |

**하지 않은 것**: `users.email` 컬럼 변경 · Google email 저장 · role/membership 데이터 변경 ·
RBAC SSOT(Core) 수정 · 전역 role 서열 신설.

## 3. 테스트 · 정적 guard

| 대상 | 결과 |
|---|---|
| `packages/auth-context/src/__tests__/accountDisplay.test.ts` (vitest 7) | **PASS** — ① role 배열 **모든 회전(permutation)** 에서 표시 동일 ② 사고 재현(첫 원소 `kpa-branch:operator`)에서도 "최고 관리자" ③ 표시 helper 와 인가 판정의 **독립성** ④ `loginMethod` 에 email 이 섞이지 않음 |
| `apps/api-server/src/__tests__/identity-account-display-contract.spec.ts` (jest 14) | **PASS** — G1 helper 가 보유 여부 판정 · G2 AdminHeader 에 `user.role`/"SSO 인증"/로그인-이메일 표기 없음 + 3항목 label 분리 · G3 HubPage `roles[0]` 부재 · G4 scalar 결정성 · G5 email 이름 |

**CI 연결 완료 (사용자 승인 2026-09-24).** `ci-pipeline.yml` 의 기존 package-level Vitest 블록에
`auth-context` step 을 추가했다 — 새 CI 구조를 만든 것이 아니라 **같은 정책에 한 패키지를 추가**한 것이다.

```yaml
- name: Run tests (auth-context Vitest)
  run: pnpm exec vitest run --config packages/auth-context/vitest.config.mjs
```

형제 5개 step 은 `npx` 를 쓰지만 이 step 은 **`pnpm exec`** 다. SonarCloud 가 **새로 추가된 줄**에만
적용하는 보안 규칙 때문이다 — `githubactions:S6505`(npx 는 on-demand 설치 + lifecycle script 실행 가능) ·
`githubactions:S8543`(정확한 버전 고정). `pnpm exec` 는 **이미 설치된 로컬 바이너리만 실행**하므로
on-demand 설치 경로가 없다. 기존 5개는 이 WO 의 변경 대상이 아니라 그대로 두었다(정렬은 별건 · 보고).

블록 주석의 집계도 실제 상태로 정정했다: **5개 / 17 files / 241 tests → 6개 / 18 files / 248 tests**,
설명 줄 `auth-context  account display · admin role display · authorization separation (7)` 추가.
다른 CI 구조 · job · selector 는 **변경하지 않았다**(baseline 완화 0).

정적 축은 그대로 유지한다 — `identity-account-display-contract.spec.ts`(jest)가 같은 계약의
텍스트 축을 CI 에서 자동 실행한다.

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

## 4-A. SonarCloud Quality Gate — 실패 → 수정 (2026-09-25)

PR #231 1차에서 **SonarCloud 만 fail** 했다(나머지 체크 전부 pass).
사유: **`D Reliability Rating on New Code`** (요구 ≥ A). 내용은 내가 새로 넣은 코드 5곳이었다.

| 지적 | 대상 | 처리 |
|---|---|---|
| BUG CRITICAL ×5 — "Provide a compare function … to reliably sort elements alphabetically" | `[...roles].sort()[0]` (token.utils · auth-context.helper · auth-account.controller ×3) | `compatPrimaryRole()` 로 교체 — **정렬을 쓰지 않고** 코드 단위 최소값을 고른다 |
| CODE_SMELL MINOR ×1 | `HUB_ALLOWED_ROLES.includes` | `new Set(...)` + `.has()` |

지적이 타당했다: 비교 함수 없는 `sort()` 는 UTF-16 코드 단위 정렬이라 "알파벳 정렬" 의도를
코드로 드러내지 않는다. 다만 Sonar 가 권하는 `localeCompare` 는 **로케일 의존**이어서 이 값의 목적
(요청마다 같은 값)과 상충하므로 채택하지 않고, 비교를 명시한 최소값 선택으로 해결했다.
**2차 (같은 PR, 새 HEAD)**: Reliability 는 해소됐고 이번엔 **`C Security Rating on New Code`** 였다.
지적 2건 모두 **내가 추가한 CI 한 줄**이었다 — `npx vitest ...` 에 대한 `githubactions:S6505` ·
`S8543`. 기존 5개 형제 step 도 같은 패턴이지만 Sonar 는 **new code 만** 평가한다.
`pnpm exec` 로 바꿔 해결했다(설치 경로 자체가 없어 더 안전하다). 기존 5줄은 이 WO 범위가 아니라 유지.

**gate baseline 완화 0** — 두 차례 모두 규칙을 끄거나 예외를 추가하지 않고 코드를 고쳤다.

정적 guard G4 도 새 구현으로 갱신하고, "비교 함수 없는 `sort()` 로 대표값을 만들지 않는다" 를
**추가 단정**으로 고정했다(재유입 차단).

## 5. 검증

| 항목 | 결과 |
|---|---|
| `pnpm build:packages` | rc=0 |
| api-server `tsc --noEmit` | rc=0 |
| `pnpm run type-check:frontend` | **OK** |
| 표시 계약 vitest | 7/7 PASS |
| 정적 contract jest | 14/14 PASS |

## 6. 통제 배포 (2026-09-24 22:05~22:24Z)

기준 SHA 를 **`757727b58`** 로 고정하고(직전 `origin/main` 재확인) 태그
`deploy/2026-09-25-identity-display` 로 dispatch 했다. 다른 Claude 세션 0.

| 항목 | 값 |
|---|---|
| detector 판정 | admin **true** · api_deploy **true** · web **neture · k-cosmetics · kpa-society · pharmacy-hub** true / lecture · store · kpa-branch · signage-player · hospital-pharmacy **false** |
| dispatch | API 1 · Admin 1 · Web 1(4서비스) — **전 서비스 강제 배포 아님** |
| 승인 전 확인 | 6개 deploy job 전부 **`waiting`**, 무관한 web job 5개 **`skipped`** (job 상태로 판정 · workflow 결론으로 판정하지 않음) |
| migration | **`INCREMENTAL_PENDING = 0` · `INCREMENTAL_EXECUTED = 0`** · PRE/POST assertion PASS · fingerprint 전후 동일(`6503cfb6…`/5793 — B-2 상태 유지) |
| `DEPLOY_ENABLED` | 22:05:10Z open → **22:23:59Z `false` 복귀** |

### 6-1. 진행 중 발견 — `deploy-web-services.yml` 의 concurrency 충돌

이 워크플로는 **`concurrency: group: deploy-web-${{ github.ref }}`** 다. 같은 태그로 서비스별
4번 dispatch 하면 **서로를 취소**한다(실제로 2건이 즉시 `cancelled`). 4건을 모두 취소한 뒤
이 워크플로가 지원하는 **detector replay 모드**(`base_sha`/`head_sha`)로 **한 run 에 묶었다** —
결과는 정확히 대상 4개 `waiting` · 무관 5개 `skipped` 였다. `service=all`(9개)로 넓히지 않았다.
취소된 run 들은 승인 전이라 **배포 0**.

### 6-2. traffic 전환 (6개 준비 확인 후 일괄)

`Ready=True` 6개를 모두 확인한 뒤 전환했다. `neture-web` 은 pin 이 없어 이미 새 revision 을
서빙하고 있었고 나머지 5개는 명시적 `update-traffic` 이 필요했다.

| 서비스 | 새 revision | 전환 후 | 이전 |
|---|---|---|---|
| `o4o-core-api` | `03753-pnk` | **100%** | `03751-ctw` → 0% |
| `o4o-admin-dashboard` | `01311-kbf` | **100%** | `01310-cwm` → 0% |
| `neture-web` | `01658-fzw` | **100%** | pin 없음(자동 추종) |
| `k-cosmetics-web` | `01166-rtp` | **100%** | `01165-wzj` → 0% |
| `kpa-society-web` | `01998-wg4` | **100%** | `01997-d7x` → 0% |
| `pharmacy-hub-web` | `00256-9jh` | **100%** | `00255-qw8` → 0% |

### 6-3. Production smoke — **PASS**

| 축 | 결과 |
|---|---|
| API | `/health` 200 · `/health/ready` `{"status":"ready"}` · `/auth/google/config` `enabled:true` · 가짜 idToken **401** · `POST /auth/login` **404**(은퇴 유지) |
| web 진입 | `admin.neture.co.kr` · `neture.co.kr` · `k-cosmetics.co.kr` · `kpa-society.co.kr` · `pharmacyhub.co.kr` **전부 200** |
| **Admin 계정 메뉴** | `로그인 수단 Google` / `관리 권한 최고 관리자` / `프로필 이메일 …` **세 줄 분리 확인**(사용자 화면). 이전의 `역할: kpa-branch:operator \| SSO 인증` 소멸 |
| **Neture 허브** | 약관 재동의 게이트 통과 후 `/workspace/hub` **진입 성공** — `platform:super_admin` 보유자가 차단되지 않았고 `관리자 운영(Admin)` 섹션까지 렌더됐다. **roles[0] 비결정 차단 제거를 실사용으로 실증** |
| DB 불변 | `users` 1 · admin `cfd2a5e7…` · status **active** · Google sub `117391***` · roles active **11** · memberships active **5** · `lastLoginAt` / google `lastUsedAt` **2026-09-24 22:30:45 로 동반 전진** |

※ 처음 `kpa.neture.co.kr` · `pharmacy.neture.co.kr` 로 찍어 000 이 났는데 **내가 도메인을 잘못 짚은 것**이었다
(정본은 `kpa-society.co.kr` · `pharmacyhub.co.kr`). 장애가 아니다.

### 6-4. smoke 중 발견 — `계정: 승인대기` **거짓 표시** (같은 WO 에서 수정)

Admin 계정 메뉴의 계정 상태가 **항상 노란색 "승인대기"** 였다. 원인:

```tsx
{user?.isApproved ? '승인됨' : '승인대기'}
```

`isApproved` 는 **백엔드에 존재하지 않는 필드**다 — `users` 에는 `approvedAt` 컬럼만 있고
`/auth/me` 는 `status`(UserStatus)와 파생값 `accountAccess` 를 내려준다. 따라서 값은 항상
`undefined` 였고 **로그인한 모든 관리자에게 "승인대기"** 가 보였다(실제 계정은 `status = active`).

`/auth/me` 가 실제로 주는 `status` 로 표시하도록 고쳤다:
`active`/`approved` → 정상 · `pending` → 승인대기 · `suspended` → 정지 · `rejected` → 거부 ·
`inactive` → 비활성 · **매핑에 없는 값은 지어내지 않고 원문 그대로**(거짓 라벨보다 낫다).

§10 의 "잘못된 의미를 전달하는 active UI 는 이번 WO 에서 정정한다" 에 해당하므로 같은 WO 에서 처리했다.
`user.isApproved` 소비처는 admin 전체에서 이 한 곳뿐이었다(전수 확인). admin tsc rc=0 · 표시 계약 15/15 PASS.
**이 수정은 admin-dashboard 재배포가 필요하다**(§7).

## 7. 남은 것

- **§6-4 계정 상태 수정의 배포** — admin-dashboard 1개만 대상. 짧은 통제 창 하나가 더 필요하다.
  (이번 WO 의 나머지는 §6 에서 배포·smoke 까지 끝났다.)
- **별도 판단 (2026-09-24 축소 확정)**:
  ① auth-context vitest CI 연결 → **이번 WO 에서 처리 완료**(§3).
  ② RBAC Core `ORDER BY` → **하지 않음 · 별도 WO 없음**(§1-1 판정).
  ③ DEAD `AGHeader`/`AGAppLayout` → **REPORT_ONLY**, 지금 별도 WO 를 만들지 않고 다음 dead-code 정비에 합친다.
  ④ F10/F11 Freeze 본문 갱신 여부 → 사용자 판단 대기(REPORT_ONLY 유지).
