# CHECK-O4O-STORE-ACCESS-PRODUCTION-DEPLOY-AND-SMOKE-V1

> WO: `WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-PRODUCTION-DEPLOY-AND-SMOKE-V1`
> 기능 정본: [`O4O-STORE-ACCESS-AND-MEMBERSHIP-V1`](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md)
> 2026-10-03 · **운영 DB write 0**

---

## 1. 배포 전 census

```text
target SHA        a36a36741  (= origin/main · PR #277 squash merge)
API serving       o4o-core-api-03804-viw   image 35979b119
store-web serving store-web-00026-jet      image ae94763d1
DEPLOY_FREEZE     false      ← 현행 정본 운영값. 임의로 잠그지 않았다
진행 중 배포      0
migration         0 (incremental · migrations 디렉터리 diff 비어 있음)
```

### runtime diff — 이번 Store WO 뿐

| | 파일 |
|---|---|
| API (6) | `bootstrap/register-routes` · `routes/store/store-membership.routes` · `services/store/store-enrollment.service` · `services/store/store-membership.service` · `utils/service-tenant.resolver` · `utils/store-organization.resolver` |
| store-web (8) | `App` · `api/storeMembership` · `config/storeMenu` · `config/workspace` · `pages/NoStorePage` · `pages/StoreEnrollmentPage` · `pages/StoreInvitationsPage` · `pages/StoreMembersPage` |

미승인 runtime 변경 0 — STOP 조건 해당 없음. (`35979b119` 에는 Personal Assistant Phase A 가 이미
들어가 있었고, 그 뒤 main 전진분 중 API·store-web runtime 을 바꾼 것은 이번 WO 뿐이다.)

---

## 2. 배포 — 정상 Delivery promote

Delivery 가 target 을 이미 분류해 두고 명령까지 지정했다. 태그 · cherry-pick 을 만들지 않았다.

```text
commit status production: HELD_LEVEL_3 · held: api(L3), store(needs-api)
  → gh workflow run promote.yml -f sha=a36a36741…
run 37130940852  completed/success
  Classify → API(CI gate · build-and-deploy) → Web(after API) deploy-store → Report
```

| 서비스 | 전 | 후 | traffic |
|---|---|---|---|
| `o4o-core-api` | 03804-viw (`35979b119`) | **03807-xos (`a36a36741`)** | 100% 단일 |
| `store-web` | 00026-jet (`ae94763d1`) | **00029-qun (`a36a36741`)** | 100% 단일 |

`deploy-store` 외 다른 web 서비스 job 은 전부 skip — 불필요한 배포 0.

```text
/health/ready  200
/health        alive · production · 0.5.0
migration      INCREMENTAL_PENDING 0 · EXECUTED 0 (예상대로)
DEPLOY_FREEZE  false → false (변경 0)
```

---

## 3. 신규 route 가 실제로 올라왔나 — BEFORE/AFTER

배포 **전에** 같은 요청을 먼저 걸어 두었다. 404 → 401 변화가 반영의 증거다(200 이 아니라 401 인
것도 중요하다 — 인증 가드가 붙어 있다는 뜻).

```text
                                배포 전   배포 후
POST /api/v1/store/enrollment     404  →   401
GET  /api/v1/store/membership     404  →   401
GET  /api/v1/store/members        404  →   401
GET  /api/v1/store/invitations    404  →   401
```

store-web: `/` · `/start-store` · `/invitations` · `/store/members` 모두 200,
배포된 번들에 `매장 시작하기` · `받은 매장 초대` · `매장 구성원` 문자열 존재.
(SPA 는 아무 경로나 200 이라 경로 코드만으로는 증거가 되지 않아 번들 내용까지 확인했다.)

---

## 4. 운영 read-only smoke — write 0

### 기존 Store Owner 회귀 (Demo Store Owner)

| | 결과 |
|---|---|
| 로그인 | OK · `demo={isDemo:true, demoType:STORE_OWNER}` |
| `GET /store/membership` | `level=owner` · `9c87f46b…`(테스트 약국) |
| `GET /work-scope/accessible-stores` | 테스트 약국 1건 — **member 후보 추가가 기존 목록을 깨지 않았다** |
| `GET /store/members` | owner 1명 · `status=active` |
| `GET /store/invitations` | `[]` |

### 접근 경계

| | 요청 | 결과 |
|---|---|---|
| 다른 매장 id 선택 힌트 | `x-store-organization-id: 00000000-…-0001` | **자기 매장으로만 해석** (`9c87f46b…`) — 넘어가지 못한다 |
| 업종이 다른 serviceKey | `?serviceKey=cosmetics` (이 매장은 kpa) | `level=none` |
| 매장 없는 사용자(Supplier Demo) | `GET /store/membership` | `level=none` |
| 〃 | `GET /store/members` | **403 `STORE_NOT_RESOLVED`** |

frontend 가드가 아니라 **서버 응답**으로 확인한 것이다.

---

## 5. 판정

```text
PRODUCTION_DEPLOY        = PASS
API_SERVING_SHA          = PASS (a36a36741)
STORE_WEB_SERVING_SHA    = PASS (a36a36741)
API_HEALTH_READY         = PASS (200)
STORE_WEB_HEALTH         = PASS (200)
OWNER_REGRESSION         = PASS
NEW_ROUTES_PRESENT       = PASS (404 → 401 · 번들 문자열)
READ_ONLY_AUTH_BOUNDARY  = PASS
MIGRATION_EXECUTED       = 0
PRODUCTION_DB_WRITE      = 0

STORE_ENROLLMENT_RUNTIME_E2E = PASS   (2026-10-03 · 사용자 승인 후 실행)
STORE_MEMBER_INVITE_E2E      = PASS
STORE_MEMBER_ACCEPT_E2E      = PASS
STORE_MEMBER_REMOVE_E2E      = PASS
ROLE_RELATIONSHIP_RUNTIME    = PASS   (운영에서 Role ∧ Relationship 성립 실측)
```

---

## 6. write E2E smoke 계획 (승인 대기)

### 운영 현재 상태 (read-only 실측)

```text
테스트 약국(9c87f46b) organization_members   2행 (owner active 1 · owner left 1)
전체 'staff' | 'invited' 행                  0
활성 *:store_member role                      0
Demo 계정                                     STORE_OWNER · SUPPLIER 각 1
```

새 역할 값이 운영에 **아직 0건**이라, 아래 변화는 전부 이번 smoke 가 만든 것으로 식별된다.

### 사용할 계정 · 조직

```text
Owner   Store Owner Demo   (teststoreowner@example.com) · 테스트 약국 9c87f46b
Member  Supplier Demo      (testsupplier@example.com)   · 현재 매장 0
```

실사용자 · 실사업자를 쓰지 않는다. 신규 계정도 만들지 않는다.

### 단계별 예상 row 변화

| # | 동작 | 변화 | 원복 |
|---|---|---|---|
| 1 | Owner 가 `/start-store` 로 kpa 가입 시도 | **0** — 이미 경영자라 `outcome=existing` (멱등 경로 확인) | 불필요 |
| 2 | Owner → Supplier 초대 | `organization_members` **+1행** (`role='invited'`, org=9c87f46b) | 3-b |
| 3 | Supplier 수락 | 그 행 `role` → `'staff'` · `role_assignments` **+1행** (`kpa:store_member`) | 3-b |
| 3-b | Owner → Supplier 해제 | 그 행 `left_at` 설정 · `kpa:store_member` 비활성화 | — |

INSERT 2 · UPDATE 2 · DELETE 0. 모두 **Demo 계정과 Demo 조직 안**에서만 일어나고, 3-b 로 접근이
원복된다(행은 이력으로 남는다 — 이 설계가 행을 지우지 않는다).

### 건드리지 않는 것

```text
실사용자 2명 · checkout_orders · 기존 owner 행 · 다른 조직 · Supplier Demo 의 공급자 조직
```

### 확인할 것

```text
수락 전 'invited' 상태에서 Supplier 의 accessible-stores 에 테스트 약국이 나오지 않는다
수락 후 나온다 (Role ∧ Relationship 이 운영에서도 성립)
해제 후 다시 사라진다 · role 회수
Owner 는 전 과정에서 자기 매장만 본다
```

---

## 7. write E2E smoke 실행 결과 (2026-10-03 · 사용자 승인 후)

각 단계마다 **운영 DB 를 직접 읽어** 예상 row 변화와 대조했다. 쓰기는 전부 운영 API 가 했고,
조회는 `BEGIN READ ONLY` 로만 했다.

| # | 동작 | HTTP · 응답 | DB 실측 |
|---|---|---|---|
| 0 | 기준 | — | owner 1 · `staff\|invited` 0 · `*:store_member` 0 · orders 23 |
| 1 | Owner `/store/enrollment` (kpa) | 200 · `outcome=existing` | **STEP 0 과 완전히 동일 — write 0** |
| 2 | Owner → Supplier 초대 | 200 · `role=invited` | `organization_members` **+1**(`invited`) · role 0 |
| 3 | Supplier 수락 | 200 · `role=staff` · `services=["kpa"]` | 그 행 `role→staff` · `kpa:store_member` **+1 active** |
| 4 | Owner → Supplier 해제 | 200 | 그 행 `active=false` · `kpa:store_member` **active=false** |

예상(INSERT 2 · UPDATE 2 · DELETE 0)과 **일치**했다. 예상 밖 row 변화는 없었다.

### Role ∧ Relationship 이 운영에서 성립하는가 — 이번 기능의 핵심

Supplier Demo 의 `accessible-stores` 를 세 시점에 읽었다.

```text
수락 전   [O4O 공급자 Demo(owner)]                      ← 테스트 약국 없음
수락 후   [O4O 공급자 Demo(owner), 테스트 약국(staff)]   ← 나타남
해제 후   [O4O 공급자 Demo(owner)]                      ← 다시 사라짐
```

`membership?serviceKey=kpa` 도 같은 축으로 `none → member → none` 이었다.
**초대 행(`invited`)만으로는 아무 접근도 생기지 않았다** — 수락이 role 을 발급해야 접근이 생긴다.

권한 분리도 운영에서 확인했다: Member 상태의 Supplier 가 `GET /store/members` 를 부르면
**403 `STORE_OWNER_REQUIRED`**(매장은 해석되지만 Owner 가 아니다).

### 영향 경계

```text
다른 조직의 staff|invited   0 → 0      checkout_orders  23 → 23 (불변)
실사용자 2명                 미접촉     기존 owner 행     미접촉
Supplier Demo 의 공급자 조직  미접촉 (전 과정에서 owner 로 그대로 보인다)
Owner 최종 회귀              level=owner · accessible-stores 1건 · members 1명 — 시작과 동일
```

### 남은 상태

```text
활성 'staff'|'invited' 행   0   (smoke 전과 같다)
활성 *:store_member         0   (비활성 이력 1건 — 설계상 행을 지우지 않는다)
테스트 약국 members          owner active + testsupplier role=staff active=false (이력)
```

접근은 완전히 원복됐고, 남은 것은 **이력 2건**(비활성 membership 행 · 비활성 role)뿐이다.
이 설계는 행을 지우지 않고 `left_at` · `is_active` 로 끈다 — 누가 언제 있었는지가 남는다.

### 관측 1건 — curl 411 (제품 결함 아님)

본문 없는 `POST .../accept` 를 curl 로 보내면 LB 가 **411 Length Required** 를 돌려준다.
`Content-Length: 0` 을 붙이면 정상 200 이다. 브라우저 `fetch` 는 본문 없는 POST 에 그 헤더를
스스로 붙이므로 화면 경로에는 영향이 없다. 운영 API 호출을 curl 로 재현할 때만 주의한다.
