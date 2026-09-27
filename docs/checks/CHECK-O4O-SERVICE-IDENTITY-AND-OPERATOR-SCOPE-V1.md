# CHECK-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1

> 시작: 2026-09-27 · 상태: **`CI_GREEN (리뷰 반영 후) · 병합·운영 적용 대기`**
> PR: [#241](https://github.com/Renagang21/o4o-platform/pull/241) — 1차 CI green 후
> **리뷰에서 세 경계가 확정 요구사항과 다르다고 지적돼 같은 PR 에서 정정했다**(§11).
> 정정 후 재검증: 전 체크 pass · `mergeStateStatus = CLEAN`.
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

## 4. 서비스 키 (S4) — **3개 신설 · 독립 주소 · 독립 운영자 범위**

구현 중 "`supplier` · `funding` 은 기존 `neture` 키로 충분하다" 고 판정을 바꿨다가
**리뷰에서 철회했다.** 최종은 착수 설계와 같은 3키다. 판정 이력은 WO §4-0.

| 대상 | 주소 | 운영자 범위 | 사업자·참여자 축(불변) |
|---|---|---|---|
| `community` | `community.neture.co.kr` | `community:admin` | 개별 커뮤니티 `community_memberships` |
| `supplier` | `supplier.neture.co.kr` | `supplier:admin` · `:operator` | `organization_members → organizations(type='supplier') → neture_suppliers` (FROZEN §7 · 이 WO 는 건드리지 않았다) |
| `funding` | `funding.neture.co.kr` | `funding:admin` · `:operator` | 기존 market-trial 참여 계약 |

세 주소는 같은 `neture-web` 을 서빙한다(Cloud Run 서비스를 서브도메인 수만큼 만들지 않는다).
호스트 라우팅은 이미 `web-neture/src/lib/hostProfile.ts` 가 갖고 있고 세 프로필의 `/` 가
진입이므로 `basePath` 를 두지 않는다. CORS 원본 3개는 URL 트랙이 이미 등록해 두었다.

### 4-0. 왜 중간 판정을 철회했는가

실측 자체는 사실이었다. 틀린 것은 **그 사실이 답하는 질문**이었다.

```text
FROZEN §7 이 답하는 질문     이 사용자가 **어느 공급자 조직을 소유**하는가
요구사항이 묻는 질문          누가 그 **서브도메인 영역을 운영**하는가
```

두 질문을 하나로 묶어 "기존 축으로 충분" 이라 읽었다. 조직 소유권 검사가 있다는 사실은
서브도메인 전체 운영자 권한을 구분하지 않아도 된다는 뜻이 아니다.

**FROZEN 과 충돌하지 않는다**: 새 키는 조직 소유권 관계를 대체하지 않는다.
`neture-identity.middleware` 와 `organization_members` 는 그대로이고 추가되는 것은
운영자측 경계뿐이므로, 같은 질문에 답이 둘이 되는 상황(= 인가 축 분열)이 아니다.

### 4-1. 전환 영향 — 배포 시 반드시 확인

```text
/suppliers/* 운영자 9경로   neture:admin    → supplier:admin
market-trial 운영자 라우터   neture:operator → funding:operator
제품·마스터·카테고리 경로     neture:admin 유지 (Neture 제품 DB 업무 — 옮기지 않았다)
```

> **기존 `neture:*` 보유자는 이 두 영역 접근을 잃는다.** 배포 전후로 새 역할을 부여해야 한다.
> `platform:super_admin` 은 platformBypass 로 계속 통과하므로 전면 잠금은 발생하지 않는다.

### 4-2. 카탈로그 · 역할

| 항목 | 내용 |
|---|---|
| `ServiceKey` union (`@o4o/security-core`) | `community` · `supplier` · `funding` 추가 — type-only · self-map. 소비처 전수 확인: 다른 세 `Record<ServiceKey,…>` 는 각자 **지역 union** 이라 영향 없음 |
| `service-catalog` | 3개 등록 · 각자 독립 domain · `basePath` 없음 · **`joinEnabled: false`** |
| 지정 카탈로그 추가 | `kpa-branch:admin` · `community:admin` · `supplier:{admin,operator}` · `funding:{admin,operator}` |
| 만들지 않음 | `community:operator` — 개별 커뮤니티 운영은 개체 역할로만 |
| 기존 11개 역할 | **그대로 둔다**(삭제·이름 변경 없음) |

**`joinEnabled: false` 가 안전 장치다.** `true` 로 두면 범용
`POST /auth/services/{key}/join` 이 **어느 커뮤니티에도 승인받지 않은** 사람에게
`service_memberships` 를 만들어 주고, 그 행은 진입 자격이므로 개별 승인을 서비스 단위로
우회한다. 되돌리면 실패하는 테스트로 고정했다.

`platform_services` 행은 seed 하지 않는다 — 런타임이 그 표를 읽지 않으며 `lecture` 도
같은 상태다(데이터 전용 migration 은 C22).

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

## 6. 로그아웃 (S7) — 두 번 고쳤다

착수 시점의 전제("`/auth/logout` = 현재 세션 종료")가 **사실이 아니었다.**

```text
착수  logout → logoutAll 위임 → users.refreshTokenFamily = null (사용자 전체 범위)
      = 한 서비스 로그아웃이 9개 주소를 모두 끊는다. 프런트는 두 경로를 이미 구분해
        불렀으므로(useServiceAuth) 차이는 서버 하나에 있었다.
1차   전역 폐기를 제거하고 쿠키 정리에만 의존 → **아무것도 무효화하지 않는다.**
      이미 발급된 refresh token 이 서버에서 계속 유효하므로 "세션 종료" 가 아니다.
      (리뷰 지적)
2차   서버측 **서비스 단위** 무효화를 구현했다 — 아래.
```

### 6-1. 근본 원인

refresh token 에 **서비스 식별자가 없었다**. `iss`/`aud` 는 서버 상수(`o4o-platform` /
`o4o-api`)이고 `domain` 인자는 access token 에만 반영됐다. 서버가 "어느 서비스의 세션인가" 를
모르므로 선택지가 **전역 폐기 아니면 무폐기** 둘뿐이었다.

### 6-2. 구현

```text
RefreshTokenPayload.serviceKey    발급 3지점 전부 — 로그인(origin 파생) · handoff(대상
                                  서비스/워크스페이스) · 회전(승계)
service_session_revocations       (user_id, service_key) → revoked_at
logout(userId, serviceKey)        그 서비스 행만 갱신
refresh 검사                       iat < revoked_at 이면 SERVICE_SESSION_REVOKED
                                  (전역 family 검사보다 **먼저** 본다)
users.refreshTokenFamily          손대지 않는다 — 전역 축이며 logout-all 의 것이다
utils/session-origin              origin → 서비스 판정 한 곳 (handoff 의 지역 함수도 교체)
```

⚠️ **`verifyRefreshToken` 은 payload 를 좁혀 재구성한다.** 거기에 새 claim 을 명시하지 않으면
조용히 사라지고, 검사가 legacy 경로로 떨어져 "어느 서비스 로그아웃이든 거절" 이 된다
(= 다른 서비스 세션이 함께 끊긴다). 실제로 이 실수를 했고 테스트가 잡았다.

### 6-3. 판정 규칙

| 상황 | 결과 | 이유 |
|---|---|---|
| 토큰 `serviceKey` 있음 · 그 서비스 폐기 뒤 발급 | 통과 | 재로그인은 차단 대상이 아니다 |
| 토큰 `serviceKey` 있음 · 그 서비스 폐기보다 먼저 발급 | **거절** | 끊으려던 세션이다 |
| 토큰 `serviceKey` 있음 · **다른** 서비스만 폐기 | 통과 | 서비스 단위 범위의 핵심 |
| 토큰 `serviceKey` **없음**(배포 전 발급) · 폐기 행 존재 | **거절** | 통과시키면 배포 직후 최대 7일간 로그아웃이 무력해진다. 종전(전역 폐기)과 같은 수준이라 보안 후퇴 아님 |
| 로그아웃 요청의 서비스 판정 불가 | 폐기 **0건** | 범위를 모르는 채 전역으로 넓히지 않는다 — 그것이 고치려던 결함이다 |

세션 귀속은 **요청 origin 파생**이다. 본문 `serviceKey` 를 쓰지 않는다 — 클라이언트가 자기
세션을 다른 서비스로 표시해 그 서비스 로그아웃에 끊기게 만들 수 있다.

### 6-4. 남는 한계 (설계상)

```text
access token(15분)   폐기 대상이 아니다 — 만료까지 유효하다
무효화 단위          서비스. 기기·세션 단위가 아니다
```

세션 레코드가 없어 "세션 하나" 를 식별할 축이 없다. 서비스는 토큰 claim 으로 식별할 수 있는
**가장 좁은 축**이다. 세션 레코드 도입은 별도 WO 다.

기존 `logout-all` 계약 9건은 변경 없이 통과한다.

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
| V14 | **서버측 서비스 단위 무효화** — 그 서비스 토큰은 `SERVICE_SESSION_REVOKED` 로 거절 · 다른 서비스 토큰은 통과 · 회전이 귀속을 승계 · 재로그인 통과 · claim 없는 배포 전 토큰은 거절 · 판정 불가 시 폐기 0 · `logout-all` 전역 폐기 유지 | PASS |
| V18 | 세 서비스 독립 주소(`community`·`supplier`·`funding`.neture.co.kr) · `basePath` 없음 · origin 3개 등록 | PASS |
| V19 | handoff 가 **대상 서비스**를 토큰에 새긴다 (SERVICE·WORKSPACE 양쪽) | PASS |
| V15 | 승격 CLI 안전 성질 4종(기본 dry-run · 증거 AND 자격 · 기존 행 미덮어쓰기 · 파라미터 바인딩) | PASS |
| V16 | mount 된 커뮤니티 5곳의 key 가 모두 승격 대상 카탈로그 안 (잠금 방지 불변식) | PASS |
| V17 | `community` 가 Admin RBAC 카탈로그에 있음 (지정 화면이 서비스를 인식) | PASS |

### 7-1. 대체된 옛 계약 — 뒤집었다 (삭제 아님)

`WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1` 의 계약 5건이 이 WO 로
무효가 됐다. **전체 테스트가 그것을 잡아냈고**, 지우지 않고 뒤집었다 —
되돌리면 `community-workspace-catalog-and-access.spec.ts` 가 먼저 실패한다.

| 옛 계약 | 지금 | 유지된 원래 의도 |
|---|---|---|
| PH-only → pharmacy write 통과 · authenticated → o4o-general 통과 | `COMMUNITY_MEMBERSHIP_REQUIRED` — catalog policy 는 참여 자격일 뿐 | 참여 자격 없으면 `COMMUNITY_ACCESS_DENIED` · 비로그인 401 (그대로) |
| 새 Community membership 테이블 **0** | 개체 원장 3테이블 (`service_memberships` 로는 "어느 커뮤니티의 운영자인가" 를 표현할 수 없다) | **Forum Core 복제 금지** — `forum_*` · `community_post` · `community_comment` 재생성 0 |
| `/api/v1/communities` 조회 전용 | lifecycle write 추가 | 카탈로그 조회 2경로는 여전히 `optionalAuth` 하나 · 모든 write 가 `authenticate` 로 시작(무인증 write 0) |

**측정으로 확인해 구현하지 않은 것** (변경 0):

| 항목 | 측정 결과 |
|---|---|
| 로그인 전 AI 입력창 | 이미 노출. Composer 는 `isAuthenticated` 로 감싸이지 않고 `submit` 만 로그인 모달로 보내며 입력을 state 에 보존 |
| study(lecture) handoff | 이미 카탈로그 대상(`domain: study.neture.co.kr`). `joinEnabled=false` 라 '가입 가능한 서비스' 제외가 정상 |
| supplier · funding handoff | 같은 `.neture.co.kr` 쿠키 범위의 neture 축 — 대상 추가 불필요 |

### 7-2. 전체 검증 (CI 방식 실행 · **리뷰 반영 후 재실행**)

```text
api-server jest  3분할 전부 green
  shard 1/3   124 suite · 2,361 PASS
  shard 2/3   124 suite · 1,965 PASS
  shard 3/3   122 suite · 2,039 PASS   ← 첫 실행 1 FAIL → 아래 재검증 지적 후 green
  합계        370 suite · 6,365 PASS · 0 FAIL

pnpm run type-check              OK (api-server 포함)
pnpm run type-check:frontend     OK (9 web)
pnpm run typecheck:app-store-packages  OK
node scripts/lint-ratchet.mjs    46 errors = baseline 46 (통과)
node scripts/check-unsafe-routes.mjs   1,153 파일 · 위반 0
node scripts/check-typeorm-entities.mjs  DEFINED_BUT_UNREGISTERED 0 · 중복 0 · stale 0
node scripts/db/check-migration-contract.mjs  21 pass / 0 fail
변경 파일 eslint                  0 error
```

> **lint ratchet 은 파일 단위 lint 로는 보이지 않았다.** 이 WO 의 spec 두 곳이 inline
> `require` 를 써서 48 > 46 이 됐고, 저장소 전체 ratchet 에서만 드러났다. 수정 후 46 복귀.

**재검증이 잡은 것 2건** — 둘 다 이번 정정의 부수 효과이며 계약은 유지된다.

| # | 잡힌 것 | 왜 생겼나 | 처리 |
|---|---|---|---|
| 1 | `operator-role-catalog.test.ts` — 화면·서버 카탈로그 **순서** 불일치 | 계약이 같은 집합 **그리고 같은 순서**를 요구한다. `supplier`·`funding` 을 admin 에서는 `community` 앞, api 에서는 뒤에 넣었다 | admin 쪽을 `community` 뒤로 정렬 |
| 2 | `lecture-service-foundation.spec.ts` — `handoff.controller` 에 origin 판정 코드 없음 | 그 판정을 `utils/session-origin` 으로 옮겼다(로그인·로그아웃·handoff 가 같은 답을 써야 한다) | 검사를 새 파일로 옮기고, 부분 문자열 일치 금지를 **두 파일 모두**에 적용. **handoff 가 공용 판정을 쓰는지**도 추가로 고정 |

### 7-2-b. PR #241 CI — 전부 green

```text
PR   https://github.com/Renagang21/o4o-platform/pull/241
     mergeStateStatus = CLEAN · 실패 체크 0

API Server Jest (1/3 · 2/3 · 3/3)   pass
Code Quality Check                  pass
Build Applications (admin-dashboard) pass
Analyze (typescript) · CodeQL        pass
Guard Static Analysis               pass
Detect affected scope               pass  (api + admin + web:neture · global_or_unknown=false)
```

**CodeQL code-scanning 게이트가 두 번 fail 했다** (workflow 자체는 pass — 별개 게이트).

두 번 모두 `js/missing-rate-limiting` **high** 이고 오탐이 아니었다. 2차는 리뷰 반영으로
`/suppliers/*` 9줄을 고치면서 그 줄이 new code 로 판정돼 떴다 — 그 경로들은 원래
rate limit 이 없었고 각자 DB 조회·갱신을 한다.

| 회차 | 위치 | 조치 |
|---|---|---|
| 1차 | `kpa-branch.routes.ts` 신청 경로 2건 | 분회 신청·심사 5경로 + 커뮤니티 신청·심사 경계에 `apiLimiter` |
| 2차 | `admin.controller.ts` `/suppliers/*` 9건 | 그 9경로 + funding 운영자 라우터에 `apiLimiter` |

**교훈**: 기존 경로를 다른 축으로 옮기면 그 줄이 new code 가 되어 **그 경로가 원래 갖고 있던
누락까지 내 책임으로 드러난다.** 가드만 바꾸고 나머지는 그대로일 것이라 가정하면 안 된다.


| | 내용 |
|---|---|
| 경고 | `js/missing-rate-limiting` **high** 2건 · `kpa-branch.routes.ts` 신청 경로 |
| 판정 | **오탐 아님.** 신청은 인증만 요구하므로 로그인한 누구나 호출할 수 있고, 1건마다 slug 조회 + INSERT 가 나간다 |
| 조치 | `middleware/rateLimiter` 의 `apiLimiter`(분당 60 · IP+userId). `config/rate-limiters.config` 의 limiter 는 CodeQL 이 인식하지 못한다는 선례(`admin/platform-accounts.routes.ts` · `store-owner-terminations.routes.ts`)를 따랐다 |
| 범위 | 분회 신청·심사 5경로 + **커뮤니티 개설/가입 신청·심사 경계**(같은 이유가 그대로 성립 — CodeQL 이 아직 지적하지 않은 쪽도 선제 적용) |
| 테스트 | 배선 검사는 mock 으로 표시한 가드만 모으므로 실제 미들웨어인 `apiLimiter` 를 보지 못한다 → 두 라우터 모두 **소스 수준 검사**를 추가. 누가 떼면 실패한다 |

남아 있는 `js/missing-token-validation`(CSRF · `setup-middlewares.ts:247`)은 2026-03-23
생성된 **선행 경고**이며 이 PR 의 diff 밖이다.

### 7-3. 실패했으나 이 변경과 무관한 것

| 게이트 | 판정 |
|---|---|
| `type-check:frontend` — `web-hospital-pharmacy` TS2307 ×3 | **환경 문제.** `@o4o/file-understanding-core` 가 package.json 에 있으나 이 워크트리 `node_modules` 에 링크되지 않았다(설치 시점이 그 의존성보다 앞섬). `pnpm install --frozen-lockfile` + `build:packages` 후 **OK**. 추적 파일 변경 0 |
| `check-forbidden-tables.mjs` — `o4o_payments` · `neture_settlement_orders` | **선행 위반.** 내 diff 에 없는 기존 entity 2개. 현재 변경과 무관한 실패이므로 고치지 않고 보고한다(§9 D4) |
| `HomeEntryPanel` vitest 4건 | **선행 실패.** 내 변경을 stash 해도 같은 4건이 실패한다(§9 D3) |

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
1. migration job  (incremental 6·7·8 — 커뮤니티 3 · 분회 신청 1 · 세션 폐기 1 테이블)
2. 승격 CLI dry-run  → 숫자 확인(U1 해소)
3. 승격 CLI --apply  → 폴백 커뮤니티 3개를 DB 행으로 + 증거 기반 회원 이행
4. API revision 배포 + traffic 전환
5. web 배포
6. Admin 화면에서 운영자 역할 부여 —
     supplier:{admin|operator} · funding:{admin|operator} · community:admin · kpa-branch:admin
```

> **3 을 4 보다 먼저 한다.** V7 게이트가 서빙되기 전에 폴백 커뮤니티 행과 회원이 있어야
> 한다. 순서가 뒤바뀌면 기존 참여자 전원이 `COMMUNITY_MEMBERSHIP_REQUIRED` 로 막힌다.
>
> 반대로 **1 이 2 보다 먼저**여야 한다 — 승격 CLI 가 쓰는 `communities` ·
> `community_memberships` 는 incremental 6 이 만든다. `service_session_revocations`(8)도
> 4 보다 먼저 있어야 한다 — 없으면 로그아웃·refresh 가 없는 표를 조회한다.
>
> **6 은 4 직후에 한다.** `/suppliers/*` 와 market-trial 운영자 경로가 새 역할을 요구하도록
> 바뀌므로, 역할을 부여하기 전까지 기존 `neture:*` 보유자는 그 두 영역에 들어갈 수 없다
> (`platform:super_admin` 은 계속 통과하므로 전면 잠금은 아니다 — §4-1).

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
| D4 | `check-forbidden-tables.mjs` 위반 2건 — `apps/api-server/src/entities/payment/PlatformPayment.entity.ts`(`o4o_payments`) · `apps/api-server/src/modules/neture/entities/neture-settlement-order.entity.ts`(`neture_settlement_orders`) | 내 diff 에 없는 기존 entity. CLAUDE.md §4 금지 테이블 규칙 위반이지만 **현재 변경과 무관한 실패**이며 결제·정산 구조 판단이 필요하다 |

---

## 11. 리뷰 반영 (PR #241 · 같은 PR 에서 정정)

1차 CI green 뒤 리뷰에서 **구현이 확정 요구사항과 다른 세 곳**이 지적됐다. 테스트 실패가
아니라 목표와의 차이였다. 새 WO 를 만들지 않고 같은 PR 에서 맞췄다.

| # | 지적 | 정정 |
|---|---|---|
| 1 | 커뮤니티를 `neture.co.kr/community` 내부 경로로 등록했다 | `community.neture.co.kr` **독립 서비스**로. `basePath` 제거, 프런트도 내부 이동 대신 다른 서비스와 같은 handoff 경로 (§4) |
| 2 | 변경된 `/auth/logout` 이 서버 토큰을 무효화하지 않고 기록만 남긴다 | refresh token 에 서비스 claim 을 넣고 `service_session_revocations` 로 **서버측 서비스 단위 무효화**를 구현 (§6) |
| 3 | `supplier` · `funding` 이 `neture:operator` 범위를 계속 공유한다 | 두 키를 신설하고 운영자 경로를 옮겼다. 조직 소유권 검사는 그대로 (§4 · §4-0) |

> **내 판정이 틀렸던 지점을 남긴다.** 2번은 "구조적 한계라 여기까지가 최선" 이라고 적었는데,
> 실제 한계는 **refresh token 에 서비스 claim 이 없다**는 것이었고 그것은 claim 을 더하면
> 해소되는 문제였다. 3번은 FROZEN 정본이 답하는 질문과 요구사항이 묻는 질문을 하나로 묶어
> 읽었다. 둘 다 "측정했으니 판정도 맞다" 로 넘어간 경우다 — 측정값이 어느 질문에 답하는지를
> 먼저 확인해야 했다.

---

## 10. 문서 정합

발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(D1)

- WO §2 표 2·3 행 · §4 전면 · §7 · S4 순서를 **실측으로 정정**(WO §4-0 방향 변경 기록 6항목).
- 정정 사유는 모두 코드 실측이며, 기준 문서(FROZEN 정본)는 수정하지 않았다.
