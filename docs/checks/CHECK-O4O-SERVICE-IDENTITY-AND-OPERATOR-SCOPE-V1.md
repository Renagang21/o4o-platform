# CHECK-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1

> 시작: 2026-09-27 · 상태: **`CODE_COMPLETE · 운영 미적용`**
> WO: [`WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1`](../work-orders/WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1.md)
>
> **하나의 작업이다.** S2-1 · S2-2 는 내부 구현 순서일 뿐 보고 단위가 아니다.
> **운영 적용과 실제 접근 확인 전에는 DONE 으로 보고하지 않는다.**

---

## 1. 진행 상태

| # | 항목 | 상태 | 커밋 |
|---|---|---|---|
| S1 | 설계 고정 | **완료** | WO §0~§10 |
| S1' | 권한 경계 보정 4건 | **완료** | — |
| S2 | 커뮤니티 도메인 + 게시글 경계(V7) + 라우트 노출 | **완료(코드)** | `ca4f21530` · `0665c16ae` · `c41468324` |
| S3 | 분회 개설 신청·승인 | **완료(코드)** | `9250a62dd` |
| S4 | 서비스 키 — **`community` 하나만** | **완료(코드)** | `c41468324` · `3d5c6b5fa` |
| S5 | Neture 배너 · 로그인 전 입력창 · handoff 대상 | **완료(측정 + 최소 구현)** | `3d5c6b5fa` |
| S6 | Store 전체 운영 범위·진입 | **완료(판정만 — 기능 0)** | 아래 §5 |
| S7 | 로그아웃 경로 | **완료(결함 수정)** | `80c219349` |
| S8 | CI · 원본 재확인 · 통제 배포 · 결과표 | **부분** — 아래 §7 · §8 | — |

---

## 2. 커뮤니티

### 2-1. 저장 (migration)

`1790400000000-CreateCommunityDomain` — 3테이블. migration + `manifest.ts` +
`expected-schema-states.ts` **같은 커밋**.

| 테이블 | 핵심 제약 |
|---|---|
| `communities` | `slug` 전역 UNIQUE(주소) · lower CHECK |
| `community_creation_requests` | `desired_slug` **pending 범위 부분 UNIQUE**(동시 선점 물리 차단) · `approved ↔ created_community_id` 상호 CHECK |
| `community_memberships` | `(community_id, user_id)` UNIQUE · `role(operator\|member)` · `status(pending\|active\|rejected\|withdrawn)` |

```text
5793 -> 5854 (+61)
c7ada575b9db6d4e8cbf8a2e158f4754bb86e3afa4ca2333f4e86916f60148e3
격리 PostgreSQL 15 (docker postgres:15 · 포트 55433 · throwaway DB) · 운영 DB 복사 아님
재실행: PRE/POST_MIGRATION_SCHEMA_ASSERTION = PASS · MIGRATION_JOB = SUCCESS
```

### 2-2. 권한 경계 — 세 축

```text
requireCommunityAccess        게시글 경계   참여 자격(정책) AND 가입 승인(community_memberships)
requireCommunityScope         개체 경계     ① 개체 일치 ② status='active' ③ (operator 요구 시) role='operator'
requireCommunityServiceScope  서비스 경계   community:admin — 개설 신청 심사
```

세 조건이 모두 필요한 이유: **승인된 일반 회원도 같은 `community_id`** 를 갖는다.
ID 만 비교하면 회원이 가입 승인·중재를 통과한다. `community:admin` · `platform:super_admin`
을 개체 가드에서 bypass 시키지 않는다.

**`community:operator` 는 만들지 않았다.** 전역 operator 를 두면 A 커뮤니티 운영자가 B 를
운영한다 — 분회에서 `kpa-branch:operator` 가 전역 역할이어서 생긴 문제와 같다.

### 2-3. 게시글 경계 (V7) — 폴백 커뮤니티도 예외 없음

종전에는 catalog policy(`authenticated` · `service_membership_any`)가 그대로 게시글
권한이었다. 서비스 membership 만 있으면 **가입 승인 없이** 읽고 썼다.

```text
게이트 위치   middleware/community-access.middleware.ts (routes → routes import 해소)
판정          ① 참여 자격(정책) AND ② community_memberships(status='active')
읽기          Community mount 에서는 읽기도 같은 게이트를 지난다
              (GET /posts · /posts/tags/popular · /posts/:id · /posts/:postId/comments)
비-Community  종전 optionalAuth 그대로
행 없음       통과가 아니라 거절 (fail-closed) · DB 오류도 통과로 바뀌지 않는다(next(error))
```

### 2-4. 기존 참여자 이행 — **증거 기반 · 기본 dry-run**

`scripts/community-catalog-promotion.ts` (CLI). 데이터 전용 migration 은 스키마 지문이
직전 상태와 같아져 `EXPECTED_SCHEMA_STATES` 중복으로 C22 에 걸리므로 CLI 다.

```text
승인 기준 = ① 기록된 참여 증거  AND  ② 현재 참여 자격
  ① 그 커뮤니티 forum 원장 코드(forumStorageCodes)의 글 또는 댓글을 실제로 쓴 사람
     forum_post.forum_id → forum_category_requests.service_code (댓글은 그 글의 원장)
  ② 카탈로그 participation policy 를 지금도 통과 (service_memberships active)

서비스 membership 만 있고 활동 기록이 없는 사용자는 **승인하지 않는다.**
증거 없는 일괄 승인은 가입 승인형이라는 결정 자체를 무효로 만든다.
```

격리 PostgreSQL 15 fixture 로 **실제 적용해** 확인:

| fixture | 증거 | 자격 | 결과 |
|---|---|---|---|
| A 글 작성 + kpa-society active | O | O | **승인** |
| B 댓글만 작성 + pharmacy-hub active | O | O | **승인**(댓글도 증거) |
| C kpa-society active · 활동 0 | X | O | 승인 안 함 |
| D 글 작성 · membership 없음 | O | X | 승인 안 함 |

```text
dry-run   evidence 3 / eligible 2 (pharmacy) · 1 (cosmetics) · 1 (o4o-general) · inserted 0
apply     inserted 4 → 재실행 inserted 0 (멱등)
게이트 질의로 행 단위 확인: A·B 통과 · C·D 불통과 → 컨테이너 정리
```

### 2-5. lifecycle · 라우트

| 흐름 | 규칙 |
|---|---|
| 개설 신청 | slug **검사 1회차**. 이미 쓰는 주소면 409 |
| 개설 승인 | slug **검사 2회차**. 선점됐으면 **임의 주소로 개설하지 않고** `slug_conflict` |
| 개설 승인 부여 | `community_memberships(operator, active)` + `service_memberships('community')` |
| 개설 승인 **미부여** | `community:admin` · `community:operator` — `role_assignments` write **0** |
| 가입 | **승인형 하나**. 자동 승인 없음. 거절은 자격을 만들지 않고, 거절 뒤 재신청 가능 |
| 심사 주체 | 개설 = `community:admin`(서비스) / 가입 = 개체 operator. **섞이지 않음을 테스트로 고정** |

---

## 3. 분회 (S3)

```text
신청       POST /api/v1/kpa-branch/branch-requests                        (인증만)
내 이력    GET  /api/v1/kpa-branch/branch-requests/mine                   (인증만)
심사       GET/POST /api/v1/kpa-branch/admin/branch-requests[/:id/...]    (kpa-branch:admin)
기존 경로  POST /api/v1/kpa-branch/admin/branches                         (platform:super_admin) — 남긴다
```

**승인 주체를 `kpa-branch:admin` 으로 둔 이유**: `kpa-branch:operator` 는 서비스 **전역**
역할이어서 개별 분회 운영자도 갖는다. 그 역할로 열면 A 분회 운영자가 B 분회 개설을 승인한다.
개별 분회 한정(`resolveBranch` + `requireBranchScope`)은 심사 경로에 붙이지 않는다 — 대상
분회가 아직 없다.

**첫 운영자는 새 컬럼 없이 기존 4축**으로 만든다:

```text
branch_memberships(active)               어느 분회인가  — role 컬럼을 두지 않는 기존 설계 유지
role_assignments('kpa-branch:operator')  운영자인가     — canonical assignRole 경로만
service_memberships('kpa-branch')        서비스 접근 자격
```

분회별 역할(`kpa-branch:operator:{id}`)을 만들지 않는다 — 209개 분회에 전입·전출이 상시
발생하므로 소속 축을 `role_assignments` 에 중복 저장하면 곧 drift 다.
`role_assignments` **직접 SQL 0건**을 테스트로 고정했다(RBAC SSOT = F9 frozen).

```text
5854 -> 5882 (+28)
c06a80afbbb9415b499bd94f36ba0a012460672c5afb4d22b36ea67258645f82
격리 PostgreSQL 15 (포트 55435 · throwaway DB) · baseline fresh bootstrap + incremental 1..7
재실행: PRE/POST_MIGRATION_SCHEMA_ASSERTION = PASS · MIGRATION_JOB = SUCCESS
migration 계약 검사 21 pass / 0 fail · 테이블·인덱스·CHECK·FK psql 확인 후 컨테이너 정리
```

---

## 4. 서비스 키 (S4) — **`community` 하나만**

착수 시 설계는 `supplier` · `funding` · `community` 세 키였다. **실측 결과 앞의 둘은
만들지 않는다.** 방향 변경 기록은 WO §4-0.

| 대상 | 판정 | 근거(실측) |
|---|---|---|
| `community` | **신설** | 개별 커뮤니티 위의 서비스 축이 기존 어떤 키로도 표현되지 않았다. `neture` 로 두면 Neture 회원 전원이 진입 자격을 가져 가입 승인형 결정과 어긋난다 |
| `supplier` | **신설 안 함** | FROZEN [`O4O-SUPPLIER-DOMAIN-BOUNDARY-V1`](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) §7 이 `organization_members → organizations(type='supplier') → neture_suppliers` 를 **canonical authorization** 으로 고정. 라우터는 `/api/v1/neture/supplier/**`, 가드는 `neture-identity.middleware` — 서비스 역할 축이 아니다 |
| `funding` | **신설 안 함** | 유통참여형 펀딩 = market-trial. 운영자 가드 실측 = `requireNetureScope('neture:operator')` (`routes/market-trial-operator.routes.ts`) |

FROZEN 도메인에 두 번째 인가 축을 넣는 비용이 새 키의 이득보다 크다.

**미해결로 남는 것**: `neture:operator` 하나가 여러 호스트를 연다는 IR §12 R1 은
해소되지 않는다. 키 추가 문제가 아니라 호스트별 운영 범위 분리 문제이므로 별도 WO 다.

### 4-1. 카탈로그 · 역할

| 항목 | 내용 |
|---|---|
| `ServiceKey` union (`@o4o/security-core`) | `community` 추가 — type-only · self-map. 소비처 전수 확인: 다른 세 `Record<ServiceKey,…>` 는 각자 **지역 union** 이라 영향 없음 |
| `service-catalog` | `community` 등록 · domain = 플랫폼 기본 호스트 · basePath `/community` · **`joinEnabled: false`** |
| 지정 카탈로그 추가 | `kpa-branch:admin`(seed 에 있었으나 화면에서 줄 수 없었다) · `community:admin` |
| 만들지 않음 | `community:operator` — 개별 커뮤니티 운영은 개체 역할로만 |
| 기존 11개 역할 | **그대로 둔다**(삭제·이름 변경 없음) |

**`joinEnabled: false` 가 안전 장치다.** `true` 로 두면 범용
`POST /auth/services/community/join` 이 **어느 커뮤니티에도 승인받지 않은** 사람에게
`service_memberships('community')` 를 만들어 주고, 그 행은 진입 자격이므로 개별 승인을
서비스 단위로 우회한다. 되돌리면 실패하는 테스트로 고정했다.

`platform_services` 행은 seed 하지 않는다 — 런타임이 그 표를 읽지 않으며 `lecture` 도
같은 상태다(데이터 전용 migration 은 C22).

---

## 5. Store (S6) — 판정만, 기능 0

WO §6 의 미결 질문("platform:super_admin 으로 충분한가 / 별도 역할이 필요한가")에 대한 판정:

```text
서비스 가입    추가하지 않는다 (Store 는 서비스가 아니라 조직·매장 축이다)
별도 역할      만들지 않는다
전체 운영 범위 기존 다중 서비스 운영자 집합이 이미 그 역할을 한다 —
               platform:super_admin · neture:{admin,operator} · cosmetics:{admin,operator} 등
진입 경로      store.neture.co.kr · WORKSPACE handoff (targetWorkspace='store')
               자격 = 서비스 membership 이 아니라 **접근 가능 organization ≥ 1**
               (resolveAccessibleStores · organization-first). 0건이면 403 HANDOFF_TARGET_NO_MEMBERSHIP
기능           통계·공급 업무 기능은 만들지 않았다 (OUT_OF_SCOPE 준수)
```

---

## 6. 로그아웃 (S7) — 결함 수정

착수 시점의 전제("`/auth/logout` = 현재 세션 종료")가 **사실이 아니었다.**

```text
종전  logout → logoutAll 위임 → users.refreshTokenFamily = null (사용자 전체 범위)
      = 한 서비스에서 로그아웃하면 모든 주소의 refresh 가 TOKEN_FAMILY_REVOKED
      프런트는 두 경로를 이미 구분해 불렀다(useServiceAuth) → 차이는 서버 하나
현재  logout    세션 원장 write 0. 호출자가 그 요청 origin 쿠키를 지운다
      logoutAll 전역 폐기를 자기 구현으로 (동작 불변)
```

**남는 구조적 한계**: 기기·서비스별 세션 레코드가 없어 서버가 특정 세션 하나만 무효화할
수단이 없다. 서버측 즉시 무효화가 필요하면 `logout-all` 을 쓴다. 세션 레코드 도입은 별도 WO.

기존 `logout-all` 계약 9건은 변경 없이 통과. `handoff.controller` 의 낡은 주석 정정.

---

## 7. 검증 결과

| # | 고정한 것 | 결과 |
|---|---|---|
| V1 | 승인된 일반 회원의 운영 기능 **403** | PASS |
| V2 | `pending` 회원의 게시글 수준 **403** | PASS |
| V3 | A 커뮤니티 운영자의 B 커뮤니티 요청 **403** | PASS |
| V4 | 가드가 서비스 전체 역할을 보지 않음 · 개설 승인 시 `role_assignments` write 0 | PASS |
| V5 | `kpa-branch:admin` 지정 가능 · `kpa-branch:operator` 와 분리 · seed 정의 | PASS |
| V6 | `requireBranchScope` 의 `organization_id` 비교 · operator 는 bypass 아님 | PASS |
| **V7** | **폴백 커뮤니티(`pharmacy`·`cosmetics`·`o4o-general`)도 가입 승인 필요 · 읽기 경로 포함 · fail-closed · DB 오류가 통과로 바뀌지 않음** | **PASS** |
| V8 | 첫 운영자에게 **서비스 가입**이 함께 생김(자기 커뮤니티 진입 막히지 않음) | PASS |
| V8-b | 그 첫 운영자에게 서비스 전체 역할 **미부여** | PASS |
| V9 | 개설 심사 = `community:admin` / 가입 심사 = 개체 operator · **교차 0** | PASS |
| V10 | 분회 첫 운영자 3축 · 분회별 역할 미생성 · `role_assignments` 직접 SQL 0건 | PASS |
| V11 | 분회 심사 = `kpa-branch:admin` · 심사 경로에 개별 분회 가드 없음 | PASS |
| V12 | 주소 2회 검사 · 선점 시 미개설(`slug_conflict`) · 임의 주소 개설 0 (커뮤니티 · 분회) | PASS |
| V13 | `community` `joinEnabled=false` — 서비스 단위 자가 가입이 개별 승인을 우회하지 않음 | PASS |
| V14 | `logout` 이 family 를 비우지 않음 · 다른 origin refresh 계속 동작 · `logout-all` 은 전역 폐기 유지 | PASS |

**측정으로 확인해 구현하지 않은 것** (변경 0):

| 항목 | 측정 결과 |
|---|---|
| 로그인 전 AI 입력창 | 이미 노출. Composer 는 `isAuthenticated` 로 감싸이지 않고 `submit` 만 로그인 모달로 보내며 입력을 state 에 보존 |
| study(lecture) handoff | 이미 카탈로그 대상(`domain: study.neture.co.kr`). `joinEnabled=false` 라 '가입 가능한 서비스' 제외가 정상 |
| supplier · funding handoff | 같은 `.neture.co.kr` 쿠키 범위의 neture 축 — 대상 추가 불필요 |

빌드 · 정적 검사:

```text
api-server tsc      0
web-neture tsc      0
변경 파일 eslint     0 error
migration 계약       21 pass / 0 fail
```

---

## 8. 미확인 — 배포 판정에 필요한 것 (한곳)

| # | 미확인 | 왜 |
|---|---|---|
| U1 | **운영의 기존 커뮤니티 참여자 행 수** | **운영 DB read 채널 없음**(ADC 부재). 승격 CLI 는 기본 dry-run 이므로 배포 창에서 먼저 측정한 뒤 `--apply` 한다. **임의 일괄 승인하지 않는다** |
| U2 | `study.neture.co.kr` 승인 원본 저장 여부 | Console 조회 수단 없음(내 `checkOrigin` 호출은 403) |
| U3 | 새 원본 7개의 저장 반영 여부 | 〃 — 배포 직전 재확인 필요 |
| U4 | 함께 배포될 다른 트랙(Store · URL 재구성) 준비 상태 | API 가 함께 나간다 |

**미확인을 0 으로 간주하지 않는다. 운영 적용을 PASS 로 쓰지 않는다.**

### 8-1. 배포 순서 (하드 선행 조건)

```text
1. migration job  (incremental 6·7 — 커뮤니티 3테이블 · 분회 신청 1테이블)
2. 승격 CLI dry-run  → 숫자 확인(U1 해소)
3. 승격 CLI --apply  → 폴백 커뮤니티 3개를 DB 행으로 + 증거 기반 회원 이행
4. API revision 배포 + traffic 전환
5. web 배포
```

> **3 을 4 보다 먼저 한다.** V7 게이트가 서빙되기 전에 폴백 커뮤니티 행과 회원이 있어야
> 한다. 순서가 뒤바뀌면 기존 참여자 전원이 `COMMUNITY_MEMBERSHIP_REQUIRED` 로 막힌다.
>
> 반대로 **1 이 2 보다 먼저**여야 한다 — 승격 CLI 가 쓰는 `communities` ·
> `community_memberships` 는 incremental 6 이 만든다.

승격 CLI 실행 (운영 DB 접속은 Cloud SQL Auth Proxy 경유 — `SETUP.md` 가 정본):

```bash
cd apps/api-server
npx tsx src/scripts/community-catalog-promotion.ts            # 측정만 (write 0)
npx tsx src/scripts/community-catalog-promotion.ts --apply    # 숫자 확인 후
```

`package.json` 에 스크립트를 추가하지 않았다 — 의존성·스크립트 변경은 중지 조건이다.
기본값이 dry-run 이므로 `--apply` 없이 실행하면 한 행도 쓰지 않는다.

---

## 9. 범위 밖 발견 — 보고만 (고치지 않음)

| # | 발견 | 왜 여기서 고치지 않는가 |
|---|---|---|
| D1 | `'kpa-society:admin'` · `'kpa-society:operator'` 가 3개 컨트롤러의 허용 역할 목록에 남아 있다 (`routes/o4o-store/controllers/store-product-request-admin.controller.ts` · `modules/neture/controllers/product-candidate.controller.ts` · `modules/neture/controllers/product-library.controller.ts`). `requireRole` 은 `role_assignments.role` 과 **정확히 일치**만 보고 정규화하지 않으며 실제 부여 문자열은 `kpa:*` 다 → KPA 운영자에게 실효 0 | **권한 부여 범위 변경**(중지 조건) + 이미 전용 트랙이 있다 — `WO-O4O-KPA-OPERATOR-CANONICAL-ROLE-GUARD-FIX-V1` 이 `routes/operator/membership.routes.ts` 를 같은 이유로 정정했고 cosmetics 는 `6b586fb06` 에서 선행 정정됐다. 그 트랙의 **잔여 3파일** |
| D2 | `apps/api-server/src/types/roles.ts` 의 지역 `ServiceKey` union 이 `kpa-branch` · `community` 를 모르는 상태로 stale (`@o4o/security-core` 의 것과 별개 union) | 소비처가 `audit-roles.ts` 스크립트뿐이라 런타임 영향 0. 두 union 통합은 구조 변경 |
| D3 | `services/web-neture/src/components/home/__tests__/HomeEntryPanel.{back-navigation,workspace-cards}.test.tsx` **4건 선행 실패** | 내 변경 전에도 같은 4건이 실패한다(stash 로 확인). 현재 변경과 무관한 실패 |

---

## 10. 문서 정합

발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(D1)

- WO §2 표 2·3 행 · §4 전면 · §7 · S4 순서를 **실측으로 정정**(WO §4-0 방향 변경 기록 6항목).
- 정정 사유는 모두 코드 실측이며, 기준 문서(FROZEN 정본)는 수정하지 않았다.
