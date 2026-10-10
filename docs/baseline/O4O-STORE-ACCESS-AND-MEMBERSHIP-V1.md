# O4O-STORE-ACCESS-AND-MEMBERSHIP-V1

> **2026-10-07 정책 갱신**: [O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md)이 메인 이메일 확인, 공통 모바일·커뮤니티 닉네임, Store 약국 전용 신규 가입, 사업자등록증 제출, 서비스별 가입과 로그인 분리의 현행 정본이다. 아래의 다업종 Store 신규 가입·최소 User 필수 정보 없음·메인 수동 승인·미가입 로그인 거부 서술은 해당 범위에서 대체됐다. 기존 역할·관계·인증 수단 경계는 유지한다.

> **Status**: Active · **확정일**: 2026-10-03 · **갱신**: 2026-10-05 (§3-A 약국 자가 가입 제외)
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
| **Store Member** | 사업자가 허가한 사용자(직원 · 담당자) | **Role** `role_assignments` 의 `{prefix}:store_member` **∧ Relationship** `organization_members` 활성 `'staff'` 행 **∧** 조직↔서비스 linkage |
| (없음) | 그 외 전부 | 초대 대기(`'invited'`) 포함 — **수락 전에는 아무 접근도 없다** |

V1 은 이 둘만 둔다. admin · manager 같은 중간 등급을 새로 만들지 않는다 — 기존
`organization_members` 에 이미 있는 값이고, 그 의미는 각 서비스 프로비저닝이 정한다.

### 결정 순서 (바꾸지 않는다)

```text
1. 세션 사용자        userId 는 세션에서만. body/query 의 userId 는 받지 않는다
2. 조직 확정          Owner = isStoreOwner() 가 해석한 조직
                     Member = 자기 활성 행의 조직 (요청이 고르지 않는다)
3. Role              role 이 없으면 거부 (Identity V3 §7-1)
4. Relationship      활성 'staff' 행이 없으면 거부
5. 업종 경계          조직 ↔ serviceKey linkage (STORE_SERVICE_ORG_LINKAGE)
```

**인가는 role 이 한다.** [`O4O-IDENTITY-ARCHITECTURE-V3`](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) §7 이
`role_assignments` 를 Authorization SSOT 로, `organization_members` 같은 Relationship 행을
**접근 판정의 조건**으로 정한다. 관계 행 하나가 생겼다고 권한이 생기지 않는다.

```text
kpa:store_member · cosmetics:store_member · pharmacy-hub:store_member · cafe24-b2b:store_member
```

owner role 과 같은 `{prefix}:{role}` 규약이다. 수락이 발급하고 해제가 회수하되, **같은 서비스의
다른 매장에 아직 소속돼 있으면 회수하지 않는다**(한 곳에서 빠졌다고 나머지 접근까지 끊지 않는다).

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
저장소 전체에서 쓰이지 않던 값이다. 그리고 이 역할 값은 **관계**일 뿐이다 — 권한은 §2 의 role 이 준다.

### 매장 목록

`'staff'` 는 owner 조직 해석 집합(`STORE_MEMBER_ROLES` = owner/admin/manager)에 **넣지 않는다**.
그 배열을 넓히면 소유 판정까지 함께 넓어진다. 대신 `findStoreMemberOrganizationCandidates()` 를
따로 두고 `/work-scope/accessible-stores` 가 둘을 합쳐 돌려준다.

**은퇴한 이메일 초대 토큰 도메인(`operator_invitations`)을 되살리지 않는다.** 그 테이블은 남아
있지만 런타임 소비가 0 이고, `google-only-auth-cleanup.spec.ts` 가 참조 자체를 금지한다.

---

## 3-A. 사업자 가입 (자가 가입)

로그인한 사용자가 `store.neture.co.kr` 에서 직접 매장을 연다.

```text
로그인 → 업종(서비스) · 사업자 이름 입력
      → 기존 사업자 연결 또는 신규 생성
      → organization_members(role='owner')
      → organization_service_enrollments(active)
      → service_memberships (status 보존 ensure)
      → role_assignments({prefix}:store_owner)
      → Store Workspace
```

**새 프로비저닝을 만들지 않았다.** 조직·소유·서비스 참여는 PharmacyHub·Cafe24 B2B 가 쓰는
공용 helper `organizationOpsService.ensureOrganizationWithOwnerAndService()` 가 그대로 한다.
이 경로는 **계기가 다른 새 채널**일 뿐이다(외부 로그인·운영자 승인이 아니라 본인 신청).

| 상황 | 결과 |
|---|---|
| 이미 이 서비스의 경영자 | `existing` — **아무 것도 만들지 않는다** |
| 내 조직이 이 서비스에 1개 연결됨 | `connected` — 그 조직에 붙인다(중복 생성 0) |
| 후보 0 | `created` — 새로 만든다 |
| 후보 2개 이상 | **409 `AMBIGUOUS_ORGANIZATION`** — 고르지 않는다 |

마지막 줄이 핵심이다. 어느 사업자인지는 사람이 정할 문제이고, 코드가 추측하면 남의 매장에 붙는다.

가입 가능 업종은 `cosmetics` · `pharmacy-hub` 다. `cafe24-b2b` 는 외부 로그인으로만 생기는
채널이라 자가 가입 대상이 아니다.

**약국(`kpa`)은 자가 가입 대상이 아니다 (2026-10-05, WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1).**
약국 매장은 내 매장(약국) 신청(`neture_pharmacy_memberships` — Neture 가입 승인(`service_memberships(neture)`)을 전제로만 읽는 별도 원장) → 자격 확인 · Neture 운영자 승인으로만 열리고,
약국 매장 접근 판정(`isStoreOwner(…, 'kpa')`)은 `kpa:store_owner` · `kpa-society` membership 이 아니라
"owner/admin/manager 인 조직의 내 매장(약국) 신청 원장 `active`" 다. 기준:
[`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §3-1 · §5.

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
| `POST /enrollment` | 로그인 — 사업자 가입(멱등) |
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
관계 행만 있고 role 이 없는 사용자 → 매장 진입  → none (Identity V3 §7-1)
```

초대 수락(`/invitations`)과 매장 시작하기(`/start-store`)는 **Store gate 밖**이다. 둘 다 매장이
아직 없는 사용자가 쓰는 화면이라, gate 안에 두면 "매장 없음" 화면에 막혀 아무 것도 못 한다.

계약 테스트: `services/store/__tests__/storeMembership.test.ts` (M1~M6).
변이 검사로 확인했다 — 수락의 본인 확인 · 업종 경계 · 해제 역할 제한을 각각 제거하면 테스트가 깨진다.

---

## 6. V1 한계 (알고 남긴 것)

| 한계 | 왜 |
|---|---|
| **미가입자 초대 불가** | 토큰·메일 발송이 필요하고, 은퇴한 초대 도메인을 되살리지 않기로 했다. 초대 대상은 먼저 가입해야 한다 |
| **사업자번호 검증 없음** | V1 은 이름만 받는다. 사업자 identity 확인은 각 서비스의 승인 절차가 갖고 있다 |
| **권한 등급 2개** | owner / member 뿐. 세분화는 실제 요구가 나온 뒤에 한다 |
| **다중 Store** | 읽기는 이미 지원된다(`resolveAccessibleStores`). Member 의 다중 매장 선택 UI 는 V1 범위 밖 |

---

## 7. Demo 계정

Demo 전용 우회를 만들지 않는다. Store Owner Demo 는 일반 구조를 그대로 따른다
(`demo_accounts` 는 Demo **판정**이고 접근 자격이 아니다 —
[`O4O-CANONICAL-DEMO-ACCOUNTS-V1`](O4O-CANONICAL-DEMO-ACCOUNTS-V1.md) §18-1).
