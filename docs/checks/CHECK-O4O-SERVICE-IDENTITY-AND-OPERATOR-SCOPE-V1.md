# CHECK-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1

> 시작: 2026-09-27 · 상태: **`병합 완료(2026-09-28, 880642e9b) · 배포 1(2edfe9b33 · migration 0) 트래픽 전환 · Google 로그인 7/7 PASS · 새로고침 유지 확인 대기로 배포 1 미완료(§8-5) · 배포 2(이 작업) 미배포 · DEPLOY_ENABLED=false · 승격 CLI 결함 정정(§8-2, 95377812e) · 운영 적용·실제 접근 검증 전`**
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

> **SUPERSEDED (2026-09-28)** — 아래 표·수치는 스키마와 맞지 않는 fixture 에서 나온 기록이라 근거로 쓰지 않는다.
> 정정 후 baseline fresh bootstrap 위에서 재검증한 결과는 **§8-2** 가 대체한다. 원문은 기록으로 남긴다.

격리 PostgreSQL 15 fixture 로 **실제 적용해** 확인 (옛 기록):

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
      (1차 리뷰 지적)
2차   서버측 서비스 단위 무효화를 구현. 단 판정을 **폐기 시각 대 토큰 iat** 로 했다.
      `iat` 는 초 단위라 ① 같은 초에 재로그인하면 새 토큰도 거절되고 ② 같은 초의 기존
      토큰과 새 토큰을 구별할 수 없다. 게다가 테스트가 재로그인 시각을 2초 옮겨
      그 경우를 **은폐**했다. (2차 리뷰 지적)
3차   시간 비교를 버리고 **세대(session_epoch)** 판정으로 교체.
      단 **refresh 경로만** 막았다. 로그아웃 뒤 남은 access token 으로 handoff 를 새로
      발급받거나, 로그아웃 전에 받아 둔 handoff 토큰을 로그아웃 뒤 교환할 수 있었다.
      관리자 화면 origin 은 서비스로 해석되지 않아 서버측 폐기를 **건너뛰었다.**
      한 서비스 재로그인이 **다른 서비스 세션을 죽였다.** (3차 리뷰 지적)
4차   긴 세션을 만들어 주는 경로를 막고 관리자 범위를 명시.
      단 **원장에 적히는 "출발" 이 토큰이 증명한 값이 아니었다** — claim 없는 토큰은 검사를
      건너뛰고, 출발 서비스는 Origin 파생값이며, 세대는 기록 시점의 현재값이었다. (4차 리뷰)
5차   원장이 **검증된 access token 의 출발 서비스·세대**를 증명하게 — §6-6.
      단 claim 없는 토큰은 여전히 **Origin 으로 범위를 좁혔다** — A 로그아웃 뒤 `Origin: B`
      로 B 의 세대만 검사받았다. 일반 서비스 대상 발급은 출발 검사 자체가 없었다. (5차 리뷰)
6차   claim 없는 토큰 = 사용자 전체 최대 세대 · 모든 발급 경로가 같은 출발 검사 — §6-6 #1 · #4.
```

### 6-1. 근본 원인

refresh token 에 **서비스 식별자가 없었다**. `iss`/`aud` 는 서버 상수(`o4o-platform` /
`o4o-api`)이고 `domain` 인자는 access token 에만 반영됐다. 서버가 "어느 서비스의 세션인가" 를
모르므로 선택지가 **전역 폐기 아니면 무폐기** 둘뿐이었다.

### 6-2. 왜 시각이 아니라 세대인가 (2차 리뷰의 핵심)

```text
JWT iat        초 단위
revoked_at     마이크로초

① 로그아웃한 **같은 초에 재로그인** → 새 토큰도 iat < revoked_at → 거절
② 같은 초의 **기존 토큰과 새 토큰의 iat 가 같다** → 구별 불가
```

②가 본질이다 — 초 단위 값으로는 같은 초 안의 선후를 알 수 없으므로 경계를 어느 쪽으로 잡아도
한쪽이 틀린다. `>` 로 잡으면 재로그인이 막히고, `>=` 로 완화하면 끊어야 할 직전 토큰이 산다.
**그래서 시간 비교 자체를 버렸다.**

### 6-3. 구현 (세대 기반)

```text
RefreshTokenPayload.serviceKey · sessionEpoch
  발급     로그인(origin 파생) · handoff(대상 서비스/워크스페이스) — 그 시점의 세대를 새긴다
  회전     세대를 **그대로 승계** (다시 읽으면 로그아웃 뒤 회전 한 번으로 세션이 부활한다)
service_session_revocations   (user_id, service_key) → session_epoch
  logout                      세대 += 1
  refresh 판정                 token.sessionEpoch < 현재 세대 → SERVICE_SESSION_REVOKED
                              (전역 family 검사보다 **먼저** 본다)
users.refreshTokenFamily      손대지 않는다 — 전역 축이며 logout-all 의 것이다
utils/session-origin          origin → 서비스 판정 한 곳 (handoff 의 지역 함수도 교체)
revoked_at                    감사·정리용으로만 남는다 (판정에 쓰지 않는다)
```

격리 PostgreSQL 15 에서 **같은 트랜잭션(= 같은 시각) 안에서도 세대가 1→2 로 갈리는 것**을
확인했다. 시각이 같아도 두 토큰이 구별된다.

⚠️ **두 가지 함정** (둘 다 실제로 밟았고 테스트가 잡았다)

```text
verifyRefreshToken 이 payload 를 **좁혀 재구성**한다 — 새 claim 을 거기 명시하지 않으면
  조용히 사라지고, 검사가 legacy 경로로 떨어져 "어느 서비스 로그아웃이든 거절" 이 된다.

sessionEpoch **0 은 유효한 값**이다 — truthy 검사로 빠뜨리면 그 토큰이 "배포 전 토큰" 으로
  취급돼 첫 로그아웃 뒤 정상 세션까지 거절된다. `|| null` 대신 typeof 검사를 쓴다.
```

### 6-4. 판정 규칙

| 상황 | 결과 | 이유 |
|---|---|---|
| `sessionEpoch` ≥ 현재 세대 | 통과 | 그 로그아웃 이후에 발급된 토큰이다 |
| `sessionEpoch` < 현재 세대 | **거절** | 끊으려던 세션이다 |
| **다른** 서비스만 폐기됨 | 통과 | 서비스 단위 범위의 핵심 |
| 같은 순간의 로그아웃 → 재로그인 | 통과 | 세대가 올라갔으므로 시각이 같아도 갈린다 |
| 같은 순간의 **직전** 토큰 | **거절** | 〃 — 반대 방향도 정확하다 |
| claim 없음(배포 전) · 폐기 기록 **있음** | **거절** | 통과시키면 배포 직후 최대 7일간 로그아웃이 무력해진다 |
| claim 없음(배포 전) · 폐기 기록 **없음** | 통과 | 거절하면 배포만으로 전원이 로그아웃된다 |
| 로그아웃 요청의 서비스 판정 불가 | 폐기 **0건** | 범위를 모르는 채 전역으로 넓히지 않는다 — 그것이 고치려던 결함이다 |

세션 귀속은 **요청 origin 파생**이다. 본문 `serviceKey` 를 쓰지 않는다 — 클라이언트가 자기
세션을 다른 서비스로 표시해 그 서비스 로그아웃에 끊기게 만들 수 있다.

### 6-5. 옆길 차단 (4차 · 3차 리뷰 반영)

§8 의 세대 판정은 refresh 경로에만 걸려 있었다. 리뷰가 지적한 것은 **긴 세션을 새로 만들어
주는 경로들**이다. 전용 spec(`service-logout-auth-boundary.spec.ts`)으로 먼저 재현했다 —
수정 전 5건 실패.

| # | 열려 있던 경로 | 막은 방법 |
|---|---|---|
| 1 | 로그아웃 뒤 남은 access token(최대 15분)으로 **handoff 새로 발급** | access token 에도 `serviceKey`·`sessionEpoch` 를 싣고 **발급**에서 그 세대를 본다 |
| 2 | 로그아웃 **전에** 받아 둔 handoff 토큰을 로그아웃 뒤 TTL(60초) 안에 **교환** | `handoff_tokens.source_session_epoch` 를 **INSERT 안의 subquery** 로 기록하고 교환 시 현재 세대와 비교 |
| 3 | 관리자 화면 로그아웃이 **서버측 폐기를 건너뜀** | `admin.neture.co.kr` · `dev-admin` 을 **명시적 `admin` 범위**로 |
| 4 | 로그아웃 DB 작업 실패에도 **성공 응답** | `500 LOGOUT_REVOCATION_FAILED`. 쿠키는 그대로 지운다 |

```text
막는 것    이미 로그아웃된 A 의 **오래된 인증으로 시작한** 이동
막지 않는 것 살아 있는 B 세션에서 A 로 가는 정상 이동
판정 기준   출발 서비스의 세대 하나 — 둘을 구분하는 축은 이것뿐이다
```

**`requireAuth` 에는 넣지 않았다.** 모든 API 요청에 DB 조회를 더하면 Core 경로 비용이 요청마다
늘고, 막아야 하는 것은 "짧은 인증으로 **긴 세션을 새로 만드는 일**" 이다. 그래서 검사는 handoff
발급·교환 두 지점에만 둔다.

**관리자 범위를 `neture` 로 접지 않은 이유**: 관리자 세션은 서비스 가입 축이 아니다. 접으면
① 관리자 로그아웃이 일반 Neture 세션까지 끊거나 ② Neture 로그아웃이 관리자 세션을 끊는다.
알 수 없는 origin 은 여전히 `null` 이며 범위를 임의로 넓히지 않는다.

### 6-6. 출발 인증의 일관성 (5차 · 4차 리뷰 반영)

세 경계가 **한 뿌리**였다. 원장에 적히는 "출발" 이 토큰이 증명한 값이 아니면, 교환 시점의
세대 비교가 **엉뚱한 서비스**나 **엉뚱한 시점**을 본다.

| # | 열려 있던 것 | 왜 열렸나 | 막은 방법 |
|---|---|---|---|
| 1 | claim 없는 **배포 전 access token** 으로 로그아웃 뒤 발급 | `serviceKey` claim 이 없으면 검사를 **건너뛰었다** → 만료 전 최대 15분 | claim 없으면 **Origin 을 보지 않고** refresh 와 같은 **사용자 전체 최대 세대** 규칙 (어느 서비스든 폐기 기록 있으면 거절 · 없으면 통과). 원장 출발 = `'unknown'` + 초기 세대 → 교환도 최대 세대로 판정 (6차) |
| 2 | 토큰의 서비스 ≠ 요청 **Origin** | 검사는 토큰의 서비스를 보는데 원장에는 **Origin 파생값**을 적었다. 일반 HTTP 클라이언트는 Origin 을 지정할 수 있다 | 원장의 출발을 **토큰이 증명한 서비스**로 고정 |
| 4 | **일반 서비스 대상**(대표 진입·workspace 가 아닌) 발급 | 출발 검사를 대표 진입·workspace 두 분기에만 넣었다 → 로그아웃된 서비스의 access token 으로 발급되고, 원장 세대 null 이라 교환 검사도 건너뛰었다 | 세 분기 모두 `resolveVerifiedHandoffSource` 를 거친다. Origin 파생 헬퍼(`detectSourceServiceKey`)는 제거 (6차) |
| 3 | 발급 **검사와 기록 사이**의 로그아웃 | INSERT 안 subquery 는 조회·기록 간격만 없앴다. 앞선 **토큰 검증과 INSERT 사이**는 남아, 그 사이 로그아웃이 끼면 원장에 새 세대가 적혔다 | 원장에 **토큰의 세대**(검증에 쓴 값)를 적는다 — 현재 세대를 다시 읽지 않으므로 간격이 판정에 영향을 주지 않는다 |

**판정을 한 함수로 모았다.** `isSessionScopeLive(userId, serviceKey, tokenEpoch)` 를 refresh
경로와 handoff 발급·교환이 **함께** 쓴다. 3차에서는 refresh 만 엄격하고 handoff 는 느슨해서
그쪽이 옆길이 됐다 — 규칙이 두 벌이면 한쪽이 뒤처진다.

**검사 위치**: 발급 **직전**. 잘못된 입력(알 수 없는 대상 등)에 DB 를 쓰지 않고, 검증과 기록
사이 간격도 가장 좁다.

**정상 흐름은 유지된다**: 살아 있는 B 세션에서 A 로 가는 handoff 는 발급·교환 모두 성공한다
(V32). 막는 것은 "이미 로그아웃된 A 의 오래된 인증으로 시작한 이동" 하나다.

### 6-7. 재로그인과 서비스 독립성 — 단일 family 계약과의 접점

서비스 독립성은 **재로그인까지** 성립해야 한다. A 로그아웃 직후 B 가 살아 있는 것만으로는
부족했다.

```text
원인   users.refreshTokenFamily 는 사용자당 **한 칸**이다.
       로그인마다 새 family → 그 칸이 교체 → 다른 서비스·기기 토큰이 family 불일치
       → 불일치 처리가 family 를 **비운다** → 모든 세션 연쇄 사망
수정   로그인이 **살아 있는 family 를 승계**한다(handoff 가 이미 그렇게 한다).
       family = "이 사용자의 살아 있는 세션 계보" · 서비스 단위 종료는 세대가 담당
       logout-all 은 family 를 비우므로 그 뒤 로그인은 새 family 를 만든다
부수효과 다중 기기 로그인도 함께 고쳐진다 — 종전에는 기기 2의 로그인이 기기 1을 끊었다
```

> **⚠️ 되돌리기 어려운 trade-off (사용자 판단 필요).**
> 재로그인이 family 를 회전시키지 않으므로 **탈취된 refresh token 은 재로그인만으로
> 무효화되지 않는다.** 대응 경로는 `logout-all` 이다.
>
> 종전 동작은 그 위험을 덮는 대신 **다른 서비스·기기 세션을 죽이고** 있었다. 둘 중 하나를
> 택해야 하는 구조이고, 요구사항("다른 서비스 세션 유지")에 맞춰 후자를 택했다.
> 탈취 대응을 재로그인에 묶어야 한다면 서비스별 family(= 세션 레코드 도입)가 필요하고,
> 그것은 별도 WO 다.

### 6-8. 남는 한계 (설계상)

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
| V14 | **서버측 서비스 단위 무효화(세대 기반)** — 그 서비스 토큰 거절 · 다른 서비스 토큰 통과 · 회전이 세대를 승계 · **같은 순간 재로그인 통과 · 같은 순간 직전 토큰 거절**(시간 이동 없음) · 연속 로그아웃 누적 · 세대 0 을 claim 없음으로 취급하지 않음 · 배포 전 토큰은 폐기 기록 있을 때만 거절 · 판정 불가 시 폐기 0 · `logout-all` 전역 폐기 유지 | PASS |
| V20 | 같은 트랜잭션(= 같은 시각) 안에서도 세대가 1→2 로 갈린다 (격리 PG15 실측) | PASS |
| V21 | 로그아웃된 서비스의 access token 으로 handoff **발급 불가** · 다른 서비스 토큰은 발급 정상 | PASS |
| V22 | 발급 뒤 출발 서비스 로그아웃 시 그 handoff 토큰 **교환 불가** · 출발이 살아 있으면 정상 | PASS |
| V23 | `admin.neture.co.kr` → 명시적 `admin` 범위 · 알 수 없는 origin 은 여전히 `null` | PASS |
| V24 | 로그아웃 폐기 실패는 **성공으로 응답하지 않는다** | PASS |
| V25 | A 로그아웃 → A 재로그인 → **B refresh 생존** · 로그인이 family 를 승계 | PASS |
| V26 | supplier·funding 경계가 같은 팩토리를 쓰고 `scopeRoleMapping` 이 값으로 채워져 있다 | PASS |
| V27 | SonarCloud Quality Gate **OK** — 새 코드 중복 2.05% (113/5508 · 기준 3% 이하) | PASS |
| V28 | claim 없는 배포 전 access token 으로 로그아웃 뒤 **handoff 발급 불가** | PASS |
| V29 | 폐기 기록이 없으면 배포 전 토큰도 발급 정상 (배포만으로 막지 않는다) | PASS |
| V30 | Origin 을 다른 서비스로 지정해도 원장의 출발은 **토큰이 증명한 서비스** | PASS |
| V31 | 발급 검사와 원장 기록 사이에 로그아웃이 끼어도 교환 **차단** (원장은 토큰 세대를 적는다) | PASS |
| V32 | 살아 있는 B 세션 → A 이동은 발급·교환 **모두 성공** | PASS |
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
api-server jest  3분할 전부 green (4차 리뷰 반영 후 재실행)
  shard 1/3   125 suite · 2,372 PASS
  shard 2/3   124 suite · 1,961 PASS
  shard 3/3   123 suite · 2,063 PASS
  합계        372 suite · 6,396 PASS · 0 FAIL

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

> **체크 상태는 `gh pr view --json statusCheckRollup` 으로 본다.** `gh pr checks` 는
> SonarCloud 를 나열하지 않아, 그 목록만 보고 "전 체크 pass" 라고 두 번 잘못 보고했다.
> 목록에 없는 것을 "없다" 로 읽지 말 것.

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

### 8-0. 병합 후 실측 (2026-09-28 · 병합 `880642e9b` · PR HEAD `7ba57bcbc`)

**배포 상태 — 운영 미배포.** 워크플로 "success" 는 deploy job 이 skip 된 결과다.

| 항목 | 실측 |
|---|---|
| 병합 직후 워크플로 | API `36369965282` · Web `36369965107` · Admin `36369965142` — 전부 conclusion success 이나 `build-and-deploy` · 각 `deploy-*` · admin deploy = **skipped**, 실행된 것은 detect · `deploy-hold-notice` 뿐 |
| `DEPLOY_ENABLED` | `false` (2026-09-25T23:02:43Z 갱신) |
| 운영 revision (전부 traffic 100%) | `o4o-core-api-03755-6zf` · `neture-web-01660-xsx` · `o4o-admin-dashboard-01315-2wn` · `store-web-00018-cnm` · `lecture-web-00017-vlh` · `kpa-branch-web-00178-sj9` 외 — 생성 2026-09-25 22:52~22:55Z(병합 이전) |
| 운영 API 기준 커밋 | `14587a9ad` (run `36198504033`, 마지막으로 `build-and-deploy` 가 실제 실행된 run) |
| 운영 migration | `typeorm_migrations` 689행 · 최신 `DropLegacyPasswordAuthSchema1790251584623`. `communities` · `community_memberships` · `service_session_revocations` · 분회 신청 표 **없음** |

| # | 결과 | 근거 · 한계 |
|---|---|---|
| U1 | **사전 측정 완료 · 공식 dry-run 미실행** | 승격 CLI 는 dry-run 에서도 `communities` 를 조회하므로 migration 6 전에는 실행 불가. CLI 와 같은 증거·자격 SQL 을 read-only 트랜잭션으로 실행(§8-2 컬럼 정정 적용): `pharmacy` 증거 1 · 자격 1 / `cosmetics` 0 · 0 / `o4o-general` 1 · 1 → **예상치: insert 2행 · 대상 사용자 1명(= `platform:super_admin` 보유자)** — 사용자 결정(2026-09-28)으로 *예상치*로만 기록한다. migration 6 적용 후 **공식 dry-run 수치·대상이 이 예상치와 일치하는지 보고 → 사용자가 `--apply` 승인 여부 결정**. 현재 `--apply` 미승인. 원장: kpa-society 글 6 · 댓글 6 / neture 글 1 / pharmacy-hub 0. 원장 매핑이 없는 글 1건(어느 커뮤니티 증거에도 포함되지 않음). users 전체 3 |
| U2 | **간접 확인 — `valid:true` · 배포 준비의 긍정적 근거로만 기록** | `iframerpc?action=checkOrigin` 이 이번에는 200 응답. 대조군 판별력 확인: `zz-unregistered-probe.neture.co.kr` · `http://study.neture.co.kr` = `valid:false`. **비공식 endpoint 이므로 Console 확인과 동급으로 쓰지 않는다** — 배포 후 실제 Google 로그인으로 확정 |
| U3 | **간접 확인 — 7개 모두 `valid:true` · 긍정적 근거(최종 PASS 는 배포 후 실제 로그인)** | supplier · funding · community · pharmacy · retail · kpa · store `.neture.co.kr`. URL 트랙 §21-19-3 기록 시점(전부 `false`)과 달라졌다 = 사용자 Console 저장 반영 |
| U4 | **코드 준비 · 배포 조건 잔존** | 운영 대비 main 미배포 70커밋(first-parent 22). 아래 §8-3 |

### 8-2. 발견 → 정정 — 승격 CLI 컬럼명 결함 (`95377812e`)

```text
CLI(정정 전)  forum_comment c JOIN forum_post p ON p.id = c.post_id
실제 스키마    forum_comment."postId"   (canonical-schema-baseline.ts:1542 · 운영 동일)
정정          JOIN forum_post p ON p.id = c."postId"   (EVIDENCE_CTE 1곳)
```

- 영향(정정 전): 운영에서 CLI 는 첫 증거 질의에서 `column c.post_id does not exist` 로 **실패**(쓰기 전 실패 — 데이터 손상 없음). 격리 DB 에서 옛 SQL 로 같은 오류 재현 확인.
- 회귀 테스트: `community-workspace-catalog-and-access.spec.ts` — baseline `forum_comment` 가 `"postId" uuid NOT NULL` 이고 `post_id` 가 없음 + CLI JOIN 이 `c."postId"` 를 씀. 31/31 PASS · 옛 코드로 되돌리면 1건 FAIL 확인 · `tsc --noEmit` 0.
- **재검증 (격리 PostgreSQL 15 · baseline fresh bootstrap + incremental 1~9 · `POST_MIGRATION_SCHEMA_ASSERTION = PASS`)**

| fixture | 활동 | 서비스 membership | 기대 | 결과 |
|---|---|---|---|---|
| A | 글 (kpa · pharmacy-hub 원장) | kpa-society active | pharmacy 승인 | **승인** |
| B | **댓글만** (pharmacy-hub 원장) | pharmacy-hub active | pharmacy 승인 | **승인** |
| C | 글 (neture 원장) | kpa-society active | o4o-general 만 · pharmacy 아님 | **o4o-general 만** |
| D | 글 (kpa 원장) | 없음 | 승인 안 함 | **승인 안 함** |
| E | **댓글만** (neture 원장) | 없음 | o4o-general(authenticated) 승인 | **승인** |
| F | **댓글만** (kpa 원장) | k-cosmetics(다른 서비스) | 승인 안 함 | **승인 안 함** |
| G | 글 (k-cosmetics 원장) | k-cosmetics active | cosmetics 승인 | **승인** |

```text
dry-run   pharmacy evidence 4 / eligible 2 · cosmetics 1/1 · o4o-general 2/2 · TOTAL eligible=5 inserted=0
apply     inserted 2 + 1 + 2 = 5 → 재실행 inserted 0 (멱등)
행 확인    cosmetics{G} · o4o-general{C,E} · pharmacy{A,B}  — 전부 기대치
```

**판정: 댓글만 쓴 사용자도 자격을 통과하면 승인 대상에 포함된다(B · E). 자격 없는 댓글 작성자는 제외(F).** fixture 컨테이너 정리 완료.

### 8-3. 함께 배포되는 변경 (U4)

| 묶음 | 커밋 | 배포 조건 |
|---|---|---|
| 이 작업 | PR #241 (`880642e9b`) | migration incremental 6·7·8·9 · §8-2 선행 |
| URL 재구성 · Store 이전 | `236c22dfc` · `5c824eb8e` · `aa2be0759` · `ef0f35652` · `dc5b16451` · `83d44c189` · `7dcf85f65` 외 | [`CHECK-O4O-URL-FIRST-CENSUS-V1` §21-19](CHECK-O4O-URL-FIRST-CENSUS-V1.md) — Google 원본 게이트는 U3 로 해소 가능. 플래그(`VITE_UNIFIED_STORE_HANDOFF` · `VITE_HOST_CUTOVER_*`) `'false'` 유지 배포. §21-11 handoff 제약 확장 migration 은 **첫 배포 후** 커밋 예정(main 에 없음 — 정합) |
| 인증 게이트 b·c | `6b85e6e95` · `5fd971083` | URL 트랙 §21-5 |
| Supplier Domain 경계 동결 | `303221b8b` | 해당 트랙 CHECK |
| 병원약국 V1 무로그인 | `2f4777aca` | 신규 패키지 `file-understanding-core` · lockfile 변경 포함 |
| 관리자 권한 부여 | PR #239 · #240 | — |

- **충돌 지점**: URL 트랙 §21-11 은 "첫 배포에 DB 변경을 섞지 않는다"(사용자 지시)를 전제로 migration 0 배포를 준비했다. 이 작업의 migration 4개가 main 에 들어와 **main tip 을 그대로 배포하면 그 첫 배포에 DB 변경이 섞인다.** → 사용자 결정(2026-09-28): 조건 유지 · 배포 SHA 를 나눈다(같은 WO) — **§8-4 에서 분리 가능 확인.**
- 운영자 역할 실측(read-only): 새 역할 `community:admin` · `supplier:*` · `funding:*` · `kpa-branch:admin` 보유 **0명**. 활성 `neture:admin` · `neture:operator` 보유 비-super_admin 1명(검증 계정) — 배포 후 `/suppliers/*` · market-trial 운영자 경로 접근을 잃으므로 §8-1 의 6 필요. 검증 계정은 `kpa-branch:operator` 만 있고 `kpa-branch:admin` 없음.

### 8-4. 배포 SHA 분리 — URL 트랙 첫 배포(DB 변경 0)와 이 작업의 배포

| | 배포 1 — URL 트랙 첫 배포 | 배포 2 — 이 작업 |
|---|---|---|
| SHA | `2edfe9b336a44c3f40eea90157504fef6a135690` (#241 병합 `880642e9b` 의 first parent) | main tip (`95377812e` 이후 — CLI 정정 포함) |
| 포함 | URL 재구성 · Store 이전(`7dcf85f65` 외) 및 그 이전 main 전체 | + PR #241 + CLI 정정 |
| DB 변경 | **0** — `git diff 14587a9ad..2edfe9b33 -- apps/api-server/src/database` 가 비어 있음. `expected-schema-states` 끝 = `DropLegacyPasswordAuthSchema1790251584623` = 운영 최신 migration | incremental 6·7·8·9 (Job 이 서비스 배포 전 실행) |
| 스키마 호환 | 운영 현 스키마 그대로 — fingerprint 단언 통과 조건 충족 | 6·7·8 = 새 테이블 · 9 = `handoff_tokens.source_session_epoch integer` **nullable 추가** → 배포 1 코드가 새 스키마 위에서도 동작 = **배포 2 → 배포 1 롤백 안전** |
| 배포 방식 | 태그 `deploy/<date>-<name>` 을 그 SHA 에 고정 → 태그 ref 로 `workflow_dispatch` (deploy job 은 `github.sha` = 태그 커밋을 빌드. 선례: `deploy/2026-09-26-google-only-auth-cleanup` → run `36198504033`) | 같은 방식 또는 main dispatch |

- **판정: 분리 가능 · 충돌 없음.** 배포를 멈출 사유 없음(단, 게이트는 사용자가 열 때까지 `false` 유지).
- 배포 1 에 함께 실리는 다른 트랙: `303221b8b`(Supplier 경계 동결) · `2f4777aca`(병원약국 — 신규 패키지 + lockfile) · PR #239/#240(관리자 권한 부여). 각 준비 상태는 해당 트랙 CHECK 기준. 기존 태그 `deploy/2026-09-26-platform-admin-grant`(→ `774803150`)는 실제 배포된 적 없음.

### 8-1. 배포 순서 (하드 선행 조건 · 2026-09-28 SHA 분리 반영)

```text
[배포 1 — 2edfe9b33 · migration 0]
  URL 트랙 §21-19 순서(API → neture-web → kpa-branch-web → 나머지 web → admin) · 검증 후 게이트 재폐쇄

[배포 2 — main tip]
1. migration job  (incremental 6·7·8·9 — 커뮤니티 3 · 분회 신청 1 · 세션 폐기 1 테이블 + handoff 세대 컬럼)
2. 승격 CLI dry-run  → 수치·대상이 §8-0 U1 예상치(2행 · 1명)와 일치하는지 보고
3. 승격 CLI --apply  → **사용자 승인 후에만** (현재 미승인)
4. API revision 배포 + traffic 전환
5. web · admin 배포
6. Admin 화면에서 운영자 역할 부여 (아래 역할 계획)
7. 실제 브라우저 접근 검증 · Google 실제 로그인(U2/U3 최종 판정)
```

**역할 계획 (사용자 결정 2026-09-28)** — 대상 `renagang21@gmail.com`, 역할 4개:
`community:admin` · `kpa-branch:admin` · `supplier:admin` · `funding:admin`

| 확인 | 결과 (read-only · 2026-09-28) |
|---|---|
| 후보 유일성 | 이메일 일치 1건 (유사 접두 포함 1건) — **유일** |
| 상태 | `status=active` · `isActive=true` · 내부 ID `c0156a4a…` (마스킹) |
| Google 연결 | `linked_accounts(provider='google')` 1행 · sub 존재 · 그 sub 의 소유자 1명 |
| `platform:super_admin` | 없음 — 새 경계에서 bypass 없이 역할+membership 으로만 통과해야 하는 계정 |
| 대상 역할 현재 보유 | 4개 모두 없음 |
| service_memberships | active: k-cosmetics · kpa-branch · kpa-society · lecture · neture · pharmacy-hub / **없음: community · supplier · funding** |

- **`:admin` ⊃ `:operator` 매핑 (코드 확인)**: `subdomain-operator-scope.ts` 의 `scopeRoleMapping` 이 `{key}:operator → [operator, admin]` · `{key}:admin → [admin]`. `service-scope-guard.ts` 가 이 매핑을 그대로 판정에 쓴다. 실제 경로: `/api/v1/neture/operator/market-trial/*` = `requireFundingScope('funding:operator')` → `funding:admin` 통과 / `/api/v1/neture/admin/suppliers*` 9개 = `requireSupplierScope('supplier:admin')`. `kpa-branch` 도 admin ⊃ operator ⊃ member. `community:admin` 은 단일 계층. **→ 중복 부여 불필요 확인.**
- **membership 조건 (추가 확인)**: 가드(`createMembershipScopeGuard`)는 super_admin 이 아니면 역할과 **해당 서비스 `service_memberships` active** 를 함께 요구한다(`supplier` · `funding` · `community` 는 키 그대로). 이 계정은 세 서비스 membership 이 없지만, 운영자 지정 경로(`operator-assignment.service` → `ensureServiceMembershipsForRoles`)가 **없으면 active 로 생성**하고 있으면 상태를 보존한다 → 부여 시 community · supplier · funding 은 `CREATED`, kpa-branch 는 기존 active 유지. 부여 응답의 `membershipPolicy` 로 확인한다.
- **화면 경로**: 두 화면은 아직 `web-neture` 안에 있다 — `/admin/supplier-governance`(프론트 `AdminRoute` = neture admin 역할 + neture membership) · `/operator/market-trial`(`OperatorRoute` = neture operator 이상 + neture membership). 이 계정은 `neture:admin`·`neture:operator`·neture membership 을 이미 가져 프론트 가드는 통과 — 백엔드 새 역할만 부여하면 된다. (새 역할만 가진 계정은 프론트 가드에서 막힌다 — 서브도메인 화면 이전은 URL 트랙 소관, 여기서는 보고만.)
- 역할 이양·기존 관리자 권한 회수는 이 작업에 섞지 않는다.

승격 CLI 실행 (운영 DB 접속은 Cloud SQL Auth Proxy 경유 — `SETUP.md` 가 정본):

```bash
cd apps/api-server
npx tsx src/scripts/community-catalog-promotion.ts            # 측정만 (write 0)
npx tsx src/scripts/community-catalog-promotion.ts --apply    # 숫자 확인 후
```

`package.json` 에 스크립트를 추가하지 않았다 — 의존성·스크립트 변경은 중지 조건이다.
기본값이 dry-run 이므로 `--apply` 없이 실행하면 한 행도 쓰지 않는다.

### 8-5. 배포 1 실측 (2026-09-28 · `2edfe9b33` · migration 0)

> **판정: 11개 서비스 전환 완료 · 병원약국 smoke PASS · 실제 Google 로그인 7/7 PASS(사용자 실측) · 새로고침 후 유지 미확인 → 배포 1 미완료.**
> 배포 2 · 승격 CLI `--apply` 는 시작하지 않았다.

| 항목 | 실측 |
|---|---|
| 태그 | `deploy/2026-09-28-url-first-deploy1` → `2edfe9b336a44c3f40eea90157504fef6a135690` |
| 게이트 | `DEPLOY_ENABLED` 04:26:45Z `true` → **05:10:45Z `false` 재폐쇄** (이후 유지 확인) |
| run | API `36377775299` (`build-and-deploy` success · production 환경 승인 = 사용자 GitHub UI · migration step success, 신규 migration 없음) · Web `36379598238` (`deploy-*` 9개 success) · Admin `36379600930` (deploy success) |
| main | 배포 창 동안 `8002d3ec1` 고정 — 외부 push 없음 |

**트래픽 — job success ≠ 배포 완료였다.** 6개 서비스가 2026-09-25 통제 배포 때 `update-traffic --to-revisions` 로 이름 지정 revision 에 고정돼 있어(`latestRevision: False`), 워크플로 배포는 새 revision 만 만들고 트래픽 0% 로 남겼다. 사용자가 이 PC 의 `gcloud`(활성 프로젝트 `netureyoutube` 확인)로 API 1건 → 읽기 전용 확인 → 나머지 5건 순서로 전환했다(내 전환 시도는 권한 분류기에 차단 — 우회하지 않음).

| 서비스 | 배포 전 | 배포 1 (traffic 100%) | 전환 |
|---|---|---|---|
| o4o-core-api | `03755-6zf` | `03756-txs` (생성 05:09:17Z) | 사용자 수동 |
| o4o-admin-dashboard | `01315-2wn` | `01316-hhp` | 사용자 수동 |
| k-cosmetics-web | `01168-bqk` | `01169-4dj` | 사용자 수동 |
| lecture-web | `00017-vlh` | `00018-pkv` | 사용자 수동 |
| pharmacy-hub-web | `00258-nw5` | `00259-9mj` | 사용자 수동 |
| kpa-society-web | `02000-d6n` | `02001-9wc` | 사용자 수동 |
| neture-web | `01660-xsx` | `01661-mq6` | 자동 |
| store-web | `00018-cnm` | `00019-x5v` | 자동 |
| hospital-pharmacy-web | `00011-qnr` | `00012-vbl` | 자동 |
| kpa-branch-web | `00178-sj9` | `00179-8q4` | 자동 |
| signage-player-web | `00091-j5m` | `00092-bzl` | 자동 |

롤백 = 같은 명령에 "배포 전" revision `=100`. 수동 전환한 6개는 여전히 이름 지정 고정 상태다 — 다음 배포(배포 2)도 같은 전환 단계가 필요하다.

**순서 이탈 (보고).** 계획은 API → web → admin 이었으나 Web · Admin 워크플로에는 production 환경 승인 단계가 없어 dispatch 즉시 배포됐고, API 는 승인 대기 중이었다. 자동 전환된 web 5개(병원약국 포함)가 API 전환(05:10Z 게이트 폐쇄 이후 · 05:46Z 확인 이전의 사용자 수동 전환) 전까지 옛 API `03755-6zf` 를 호출한 구간이 있었다. 배포 1 은 DB 변경 0 · handoff 플래그 `false` 라 데이터 영향은 없으나, **배포 2 는 API 를 먼저 dispatch·전환한 뒤 web · admin 을 dispatch 한다.**

**API · 병원약국 smoke (읽기 전용 / 실브라우저 Chromium)**

| 항목 | 결과 |
|---|---|
| `GET /health` · `/health/ready` | 200 · 200 |
| `POST /api/hospital/ai/structure` 빈 본문 | **400 `PROFILE_REQUIRED`** — 404 아님(라우트 등록 · 입력 검증 도달). AI 호출 · DB write 없음 |
| `/hospital` `hospital-drugs.xlsx` 안내 | PASS — "파일명은 hospital-drugs.xlsx 여야 합니다" |
| "원내 약품 폴더 연결" 버튼 | PASS |
| 연결 코드 UI | 없음 — PASS |
| Google 로그인 UI | 없음 — PASS |
| 콘솔 오류 | 0 |
| 검증 범위 | **Cloud Run 기본 URL**(`hospital-pharmacy-web` 서비스 URL `/hospital`)에서 검증한 범위만 PASS. 별도 사용자 도메인은 배포 1 대상이 아니다 |
| 정본 진입 `https://neture.co.kr/hospital` (서브디렉토리 · 2026-09-22 결정) | 같은 기준 재확인 PASS — xlsx 안내 · 폴더 연결 버튼 1 · 연결 코드 없음 · Google 로그인 UI 없음 · 콘솔 오류 0 |

**Google 원본 (배포 후 · 로그인 전 단계까지)** — `store` · `supplier` · `funding` · `community` · `pharmacy` · `retail` · `kpa` `.neture.co.kr` 7개 모두 루트 200, 로그인 화면에서 GIS 버튼 iframe `gsi/button` **200** · 렌더 1 · `origin` 관련 콘솔 오류 0. 미등록 원본이면 이 단계에서 거부되므로 §8-0 U2/U3 보다 한 단계 강한 근거다. 자격 교환 · 세션 발급까지 가는 실제 로그인은 내가 하지 않았다(브라우저의 운영 Google 세션으로 운영 서비스 세션을 만들지 않기 위해) → 아래 사용자 실측으로 판정.

**실제 Google 로그인 — 사용자 실측 (2026-09-28)**

| 항목 | 결과 |
|---|---|
| 7개 host Google 로그인 → 서비스 화면 진입 | **PASS** (store · supplier · funding · community · pharmacy · retail · kpa). 기존 가입 상태로 바로 진입한 것도 정상 동작 |
| §8-0 U2 / U3 | **PASS 확정** — 원본 등록이 실제 로그인으로 확인됨 |
| 새로고침 후 로그인 유지 | **미확인** — 각 host 1회 새로고침 결과 대기 |

**배포 1 마감 조건 잔여: 대상 host 7개의 새로고침 후 로그인 유지 1건.**

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

### 11-1. 2차 리뷰 (로그아웃 경계 · PR 설명)

| # | 지적 | 정정 |
|---|---|---|
| 4 | `iat`(초) 대 `revoked_at` 비교 → **같은 초 재로그인이 거절**되고, 같은 초의 기존·신규 토큰을 구별할 수 없다. 게다가 테스트가 재로그인 시각을 2초 옮겨 그 경우를 **검사하지 않았다** | 시간 비교를 버리고 **세대(`session_epoch`)** 판정으로 교체. 시간 이동을 제거하고 같은 초 **양방향** 테스트를 추가 (§6-2 · §6-3) |
| 5 | PR 설명이 현재 코드와 불일치 — "`community` 키만", "로그아웃 원장 write 0", "migration 6·7" | PR 설명 전면 갱신 (키 3개 · 세대 기반 무효화 · migration 6·7·8 · 역할 부여 단계) |

### 11-2. 3차 리뷰 (인증 경계 · SonarCloud)

리뷰가 로그인·로그아웃·갱신·handoff·관리자 화면을 **연결해** 조사했고, 단위로는 모두
통과하던 경로 네 개가 열려 있었다. 내용과 처리는 §6-5 · §6-6.

| # | 지적 | 처리 |
|---|---|---|
| 6 | 로그아웃 뒤 access token 으로 handoff 발급 · 발급 후 로그아웃 시 교환 | 두 지점에 세대 검사 추가 (§6-5) |
| 7 | 관리자 화면 로그아웃이 서버측 폐기를 건너뜀 · DB 오류에도 성공 응답 | `admin` 범위 명시 · 500 응답 (§6-5) |
| 8 | 한 서비스 재로그인이 다른 서비스 세션을 죽임 | 로그인이 살아 있는 family 를 승계 (§6-6 · **trade-off 기록**) |
| 9 | **SonarCloud 새 코드 중복 3.1%(기준 3%) 실패** — "전 체크 pass" 가 아니었다 | 아래 §11-3 |

> **내 보고가 틀렸다.** "전 체크 pass" 라고 두 번 썼는데 SonarCloud 는 실패 상태였다.
> `gh pr checks` 가 그 체크를 나열하지 않는데 **그 목록만 보고 단정**했다.
> 체크 상태는 `gh pr view --json statusCheckRollup` 으로 봐야 한다 — 목록에 없는 것을
> "없다" 로 읽지 말 것.

### 11-3. SonarCloud 중복 — 짐작으로 고치려다 악화시켰다

```text
3.10%  (141/4547)  최초 실패
3.43%  (179/5214)  ← supplier·funding scope guard 를 합친 뒤. **악화**
2.96%  (155/5242)  ← 파일별 분포를 측정한 뒤 실제 상위 두 곳을 줄여 통과
3.10%  (171/5516)  ← 4차 리뷰 수정으로 테스트가 늘며 **재실패**
2.05%  (113/5508)  ← 다시 측정해 **테스트 복사본**을 줄여 통과 (Quality Gate OK)
```

**두 번째 실패의 원인과 처리**: 171줄 중 **100줄이 테스트**였다 — lifecycle spec 2개의 동일한
저장소 plumbing(18+18)과 handoff spec 3개의 req/res 대역. 두 support 모듈로 뽑았다
(`__tests__/support/in-memory-repository.ts` · `handoff-http.ts`). `jest.mock` 팩토리는 hoisting
제약이 있어 옮기지 않았고, `support/` 는 jest testMatch 에 걸리지 않으므로 테스트로 수집되지 않는다.

`config/service-catalog.ts`(67줄)는 **손대지 않았다.** 선언적 데이터이고, 중복 블록이 workspace
리터럴이 아니라 **항목 전체**라서 `OPERATOR_ONLY_WORKSPACE` 추출로도 줄지 않았다. 팩토리로
감싸면 카탈로그 가독성을 잃는다 — 기준 안이므로 그대로 둔다.

**무엇이 틀렸나.** "거의 같은 두 파일이 있으니 그게 중복일 것" 이라고 짐작해 scope guard 를
합쳤다. 그런데 `measures/component_tree` 로 파일별 분포를 보니 **그 두 파일은 애초에 중복
목록에 없었다.** 그 사이 새 테스트가 중복을 더해 수치는 오히려 올라갔다.

**실제 상위 두 곳** (179줄 중 91줄):

| 파일 | 중복 | 원인 | 처리 |
|---|---|---|---|
| `config/service-catalog.ts` | 66 | 같은 workspace 자격 리터럴이 5개 서비스에 반복 | `OPERATOR_ONLY_WORKSPACE` 로 추출 — 이름으로 뜻이 드러나고, 한 곳만 고쳐 어긋날 여지가 없어진다 |
| `services/community/community-lifecycle.service.ts` | 25 | 승인·거절 4경로가 같은 조회·검증 반복 | `loadPendingRequest` · `loadPendingMembership`. 후자는 `communityId` 를 함께 보므로 **월권 방어가 두 경로에서 같은 규칙**이 된다 |

scope guard 통합은 되돌리지 않았다 — 중복 기여는 0 이었지만 `scopeRoleMapping` 을 한쪽만
고치는 실수(admin 전용 경로가 operator 에게 열리는 종류)를 구조적으로 막는 효과는 유효하다.

> **교훈**: 게이트 수치를 고칠 때도 **어디가 원인인지 먼저 측정**해야 한다. 코드를 읽고
> "여기가 중복 같다" 고 판단한 것이 틀렸고, 그 수정이 수치를 올렸다. 두 번째 실패에서는
> 바로 `measures/component_tree` 로 파일별 분포를 확인해 한 번에 줄였다.

### 11-4. 4차 리뷰 (handoff 출발 인증)

리뷰가 같은 handoff 경계를 다시 보고 세 경우를 짚었다. 내용과 처리는 §6-6.

| # | 지적 | 처리 |
|---|---|---|
| 10 | claim 없는 배포 전 토큰은 검사를 건너뛴다 | 최대 세대 규칙으로 판정 |
| 11 | 토큰 서비스와 Origin 불일치를 확인하지 않는다 | 원장 출발을 토큰 값으로 고정 |
| 12 | 발급 검사와 원장 기록 사이 간격 | 원장에 토큰 세대를 적는다 |

> **같은 결함을 세 번에 걸쳐 좁혔다.** 2차에서 시간 비교를, 3차에서 옆길을, 4차에서 "출발을
> 무엇으로 증명하는가" 를 고쳤다. 매번 "이번엔 됐다" 고 보고했는데, 공통 원인은 **판정 규칙이
> 경로마다 따로 있었다**는 점이었다. 이제 `isSessionScopeLive` 하나를 refresh·발급·교환이
> 공유한다 — 규칙이 한 벌이면 한쪽만 느슨해질 수 없다.

> **테스트로 결함을 가린 것이 더 나쁘다.** 2초 이동은 "통과시키려고" 넣은 것이고, 그 순간
> 그 테스트는 계약을 지키는 장치가 아니라 결함을 숨기는 장치가 됐다. 지금은 시간을 전혀
> 만지지 않고, 같은 순간에 **통과해야 하는 쪽과 거절돼야 하는 쪽을 함께** 검사한다.
> 재작성 후 테스트는 22건이다(종전 18).

### 11-5. 5차 리뷰 (claim 없는 토큰의 Origin 범위)

| # | 지적 · 발견 | 처리 |
|---|---|---|
| 13 | claim 없는 토큰은 Origin 으로 범위를 정한다 — A 로그아웃 뒤 `Origin: B` 요청은 B 세대만 검사돼 통과 | `readCallerScope` 가 claim 없으면 `null` → 최대 세대 규칙 (5-1c) |
| 14 | (세션 자체 발견) 일반 서비스 대상 발급 분기에 출발 검사가 없다 | 같은 검사를 거치게 하고 원장에 토큰 서비스·세대 기록 (5-1e) |
| 15 | PR 설명의 `INSERT subquery` 문구가 현재 구현과 다름 | 설명을 "토큰이 증명한 세대를 원장에 기록" 으로 정정 |

회귀 테스트 3건(`service-logout-auth-boundary.spec.ts` 5-1c · 5-1d · 5-1e)은 **수정 전 컨트롤러에서
실패하고 수정 후 통과**함을 확인했다. Origin 파생 출발을 고정하던 기존 단언 3곳(lecture ·
representative-entry · unified-store-workspace-handoff spec)은 새 계약(`'unknown'`)으로 바꿨다.

> **Origin 은 대체값으로도 쓰지 않는다.** 4차에서 "우선하지 않는다" 로만 고쳤고, claim 이 없을 때의
> 대체값으로는 남겨 두었다. 클라이언트가 지정할 수 있는 값은 순위와 무관하게 증명이 되지 못한다.

---

## 10. 문서 정합

발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(D1)

- 2026-09-28 CLI 정정 후: §2-4 옛 fixture 기록에 이 CHECK 내부 대체 표시(→ §8-2) — 기록물 내부 표시일 뿐 기준 문서 SUPERSEDED 표기(§16-3)에는 해당하지 않음. 기준 문서 변경 0.

- 2026-09-28 병합 후 실측: 이 CHECK 자체의 §2-4 fixture 기록이 스키마와 불일치(§8-2) — 기록물 내부 정정 표시만, 기준 문서 변경 0.

- WO §2 표 2·3 행 · §4 전면 · §7 · S4 순서를 **실측으로 정정**(WO §4-0 방향 변경 기록 6항목).
- 정정 사유는 모두 코드 실측이며, 기준 문서(FROZEN 정본)는 수정하지 않았다.
