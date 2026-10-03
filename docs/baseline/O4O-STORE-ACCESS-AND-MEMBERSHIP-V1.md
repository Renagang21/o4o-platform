# O4O-STORE-ACCESS-AND-MEMBERSHIP-V1

> **Status**: Active · **확정일**: 2026-10-03
> **WO**: `WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1`
> **상위 정본**: [`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) §3 ·
> [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §3
> **인접 정본**: [`O4O-STORE-OWNER-RBAC-STANDARD-V1`](../architecture/auth/O4O-STORE-OWNER-RBAC-STANDARD-V1.md)

`store.neture.co.kr`(공통 Store Workspace)에 **누가 들어올 수 있는가**를 정한다.
서비스 가입(`service_memberships`) · 사업자 소속(`organization_members`) · 매장 접근은 서로 다른
축이고, 이 문서는 세 번째 축만 다룬다.

---

## 1. 다섯 축을 섞지 않는다

```text
1. Authentication        누구인가                users / linked_accounts
2. Service Membership    어느 서비스에 들어갈 수 있나   service_memberships(status='active')
3. Organization 소속     어느 사업자에 속하나      organization_members(left_at IS NULL)
4. Store 접근 자격       그 매장을 쓸 수 있나      ← 이 문서
5. Permission Level      그 안에서 무엇을 하나     owner / member
```

`service_membership ≠ organization_membership ≠ store access` 다. 하나가 있다고 나머지가
따라오지 않는다.

---

## 2. 접근 자격 — 두 단계뿐이다

| 자격 | 뜻 | 판정 |
|---|---|---|
| **Store Owner** | 사업자 대표 · 소유 접근 | **기존 판정 그대로** — `role_assignments` 의 `{prefix}:store_owner` + 해당 서비스 active membership + 조직 해석 (`isStoreOwner()`) |
| **Store Member** | 사업자가 허가한 사용자(직원 · 담당자) | `organization_members` 활성 행의 `role = 'staff'` + 그 조직이 요청 서비스에 연결됨 |
| (없음) | 그 외 전부 | 초대 대기(`'invited'`) 포함 — **수락 전에는 아무 접근도 없다** |

V1 은 이 둘만 둔다. admin · manager 같은 중간 등급을 새로 만들지 않는다 — 기존
`organization_members` 에 이미 있는 값이고, 그 의미는 각 서비스 프로비저닝이 정한다.

### 결정 순서 (바꾸지 않는다)

```text
1. 세션 사용자        userId 는 세션에서만. body/query 의 userId 는 받지 않는다
2. 조직 확정          Owner = isStoreOwner() 가 해석한 조직
                     Member = 자기 활성 행의 조직 (요청이 고르지 않는다)
3. 자격 판정          owner > member > none
4. 업종 경계          조직 ↔ serviceKey linkage (STORE_SERVICE_ORG_LINKAGE)
```

`x-store-organization-id` 선택 힌트는 **허용 후보 안에서만** 고르는 힌트다. 후보에 없는 매장을
가리키면 그 힌트는 버려지고, 그 매장으로 해석되지 않는다.

---

## 3. 왜 새 테이블을 만들지 않았나

매장 접근의 SSOT 는 이미 `organization_members` 다(`UNIQUE (organization_id, user_id)` ·
활성 = `left_at IS NULL`). 초대 대기를 담을 `status` 컬럼은 없지만 **역할 값으로 표현**할 수 있고,
기존 질의는 전부 명시적 allowlist(`role IN (...)` · `role = ANY($n)`)라 새 값은 어느 경로에도
권한을 주지 않는다(전수 확인).

```text
'invited'   초대됨 — 접근 0
'staff'     수락함 — Store Member
```

`'member'` 를 쓰지 않았다: `organization_members.role` 의 **DB 기본값이 'member'** 라 다른 경로가
만든 기존 행이 이미 그 값일 수 있고, 거기에 접근을 주면 조용한 권한 확대가 된다. `'staff'` 는
저장소 전체에서 쓰이지 않던 값이다.

**은퇴한 이메일 초대 토큰 도메인(`operator_invitations`)을 되살리지 않는다.** 그 테이블은 남아
있지만 런타임 소비가 0 이고, `google-only-auth-cleanup.spec.ts` 가 참조 자체를 금지한다.

---

## 4. 초대 · 수락 · 해제

```text
Owner → 초대(이메일로 기존 가입자 조회)
      → organization_members(role='invited')      ← 접근 0
초대받은 본인 → 수락
      → role='staff'                              ← Store Member
Owner → 해제
      → left_at = now()                           ← 행은 남긴다(이력)
```

| API (`/api/v1/store`) | 자격 |
|---|---|
| `GET /membership` | 로그인 — 내 자격을 서버가 확정해 돌려준다 |
| `GET /members` | Owner |
| `POST /members/invite` | Owner |
| `DELETE /members/:userId` | Owner — `'invited'`·`'staff'` 행만. owner·admin·manager 는 거절 |
| `GET /invitations` | 로그인 — 내가 받은 초대 |
| `POST /invitations/:organizationId/accept` | **초대받은 본인만** |

### 메일을 보내지 않는다

초대는 **이미 가입한 사용자**를 이메일로 조회해 연결한다. 운영자 지정 경로와 같은 모양이고,
외부 발송은 production action 이라 이 축에 넣지 않았다.

---

## 5. 막는 것 (frontend 가드로 만족하지 않는다)

```text
Store A 구성원 → Store B URL·id 직접 요청     → 자기 매장으로만 해석 (요청이 조직을 고르지 못한다)
다른 업종 매장 → 다른 serviceKey 로 접근       → linkage 불일치로 none
membership 없는 로그인 사용자 → 매장 진입      → none
Member → 초대 · 해제 · 구성원 목록            → 403 STORE_OWNER_REQUIRED
초대받지 않은 사용자 → 수락                   → 404 INVITATION_NOT_FOUND · membership 생성 0
초대 → 계정 생성                              → 하지 않는다 (404 USER_NOT_FOUND)
```

계약 테스트: `services/store/__tests__/storeMembership.test.ts` (M1~M6).
변이 검사로 확인했다 — 수락의 본인 확인 · 업종 경계 · 해제 역할 제한을 각각 제거하면 테스트가 깨진다.

---

## 6. V1 한계 (알고 남긴 것)

| 한계 | 왜 |
|---|---|
| **미가입자 초대 불가** | 토큰·메일 발송이 필요하고, 은퇴한 초대 도메인을 되살리지 않기로 했다. 초대 대상은 먼저 가입해야 한다 |
| **사업자 가입(Store 신규 생성) 미포함** | 조직·매장 생성 경로는 서비스별 프로비저닝이 이미 갖고 있다(`PharmacyHubStoreProvisioningService` · `Cafe24B2bStoreProvisioningService` · cosmetics · KPA). 공통 생성 경로를 새로 만들면 중복이 된다 — 별도 WO |
| **권한 등급 2개** | owner / member 뿐. 세분화는 실제 요구가 나온 뒤에 한다 |
| **다중 Store** | 읽기는 이미 지원된다(`resolveAccessibleStores`). Member 의 다중 매장 선택 UI 는 V1 범위 밖 |

---

## 7. Demo 계정

Demo 전용 우회를 만들지 않는다. Store Owner Demo 는 일반 구조를 그대로 따른다
(`demo_accounts` 는 Demo **판정**이고 접근 자격이 아니다 —
[`O4O-CANONICAL-DEMO-ACCOUNTS-V1`](O4O-CANONICAL-DEMO-ACCOUNTS-V1.md) §18-1).
