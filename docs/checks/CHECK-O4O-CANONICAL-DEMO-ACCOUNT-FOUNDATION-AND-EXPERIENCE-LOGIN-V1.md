# CHECK-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1

> 대상 WO: [`WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1`](../work-orders/WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1.md)
> 정책 정본: [`O4O-CANONICAL-DEMO-ACCOUNTS-V1`](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md)
> 작성: 2026-10-01 · 상태: **Phase A(census) 완료 / 운영 write 0 — 승인 대기**

---

## 1. Phase A — 기존 데이터 census (2026-10-01 · read-only · **쓰기 0**)

Cloud SQL Auth Proxy 경유 · 전부 `BEGIN READ ONLY` 트랜잭션.

### 1-1. 사용자 — **3명뿐이다**

| # | `users.id` | 이메일(가림) | 생성 | 마지막 로그인 | 역할 | 판정 |
|---|---|---|---|---|---|---|
| 1 | `cfd2a5e7…` | `renari***@gmail.com` (서철환) | 26-05-15 | 26-09-30 | **`platform:super_admin`** 외 11 | **KEEP** — 실제 운영자 |
| 2 | `c0156a4a…` | `renaga***@gmail.com` | 26-09-26 | 26-09-30 | `community:admin` · `supplier:admin` · `funding:admin` 외 10 | **KEEP** — 실사용 계정(이 WO 들의 검증 주체) |
| 3 | `322667c8…` | `testgm***@gmail.com` | 26-09-25 | 26-09-26 | `cosmetics:operator` · `neture:operator` | **UNKNOWN** — 아래 1-4 |

셋 다 Google 연결(`linked_accounts` 3행) · `user_password_credentials` **0행**(비밀번호 가진 계정 없음).

> **이미 "임의 테스트 사용자" 가 거의 없다.** 과거 users reset 으로 테스트 계정이 사라진 상태이고,
> 남은 것은 위 3명뿐이다. 즉 이 WO 의 "기존 테스트 사용자 정리" 는 **삭제 작업이 아니라
> 주인 없는 데이터에 주인을 만들어 주는 작업**에 가깝다.

### 1-2. 조직 — 25개, 그중 **24개가 살아 있는 owner 가 없다**

```text
organizations        pharmacy 15 · supplier 7 · store 2 · association 1  = 25
organization_members 3행뿐 — 그중 2행이 **삭제된 사용자**를 가리킨다
```

| `organization_members` | 조직 | 소유자 | 상태 |
|---|---|---|---|
| `c9beb4a2…` Sohae 약국 | pharmacy | `cfd2a5e7…` | **살아 있음**(실제 운영자) |
| `9c87f46b…` **테스트 약국** | pharmacy | `970b5b0e…` | **orphan** — users 에 없음 |
| `aed9eda9…` Renagang 약국 | pharmacy | `500e8ddd…` | **orphan** — users 에 없음 |

→ **살아 있는 owner 가 없는 조직 24개.** 대부분 `[E2E_TEST]` 접두가 붙은 검증용이다.

### 1-3. 샘플 데이터가 어디에 붙어 있나

| 데이터 | 수 | 주인 |
|---|---|---|
| `kpa_store_contents` | **15** | 전부 `9c87f46b…` = **테스트 약국**(owner 가 orphan) |
| `store_playlists` | 11 | `9c87f46b…` 5 · `8596a54f…` 5 · `68e1291f…` 1 |
| `signage_media` | 7 | `organizationId` **전부 NULL** |
| `checkout_orders` | 23 | buyer 전부 `cfd2a5e7…`(실제 운영자) · supplier `91169739…` 16 · `251adaaf…` 6 |
| `product_approvals` | 3 | — |
| `neture_suppliers` | 3 | 조직 `초윤` · `(주)네뚜레 공급자 테스트` · `(주)쓰라이프존` |
| `product_masters` / `product_landings` | 272,040 | 공공데이터 seed — **이 WO 대상 아님** |
| `kpa_members` 1 · `branch_memberships` 3 | | |

### 1-4. 삭제된/대상 사용자에 붙은 행 (`322667c8` · `970b5b0e` · `500e8ddd`)

```text
account_activities   500e8ddd 25 · 322667c8 4 · 970b5b0e 4
action_logs          500e8ddd 25 · 970b5b0e 4
organization_members 970b5b0e 1 · 500e8ddd 1
service_memberships · role_assignments · user_policy_acceptances · notifications   322667c8 (각 1~2)
linked_accounts      322667c8 1
```

→ `970b5b0e` · `500e8ddd` 는 **이미 삭제된 사용자**인데 ownership · 감사 로그가 남아 있다(참조 무결성 공백).
→ `322667c8`(`testgm***`)은 **살아 있는 계정**이고 소유한 조직·상품·콘텐츠가 **없다**.

### 1-5. 분류 판정

| 대상 | 판정 | 근거 |
|---|---|---|
| `cfd2a5e7` · `c0156a4a` | **KEEP** | 실제 사용자 · 최근 로그인 · 운영 권한 |
| `322667c8` (`testgm***`) | **UNKNOWN → 사용자 확인 필요** | 이름 없음 · 26-09-26 이후 미접속 · 소유 데이터 0. 다만 Google 연결 계정이라 **실제 사람일 수 있다** — 자동 삭제·전환하지 않는다 |
| `9c87f46b` 테스트 약국 + 콘텐츠 15 · 플레이리스트 5 | **REUSE_AND_RELINK** | 이름이 테스트이고 owner 가 orphan · 샘플 데이터가 가장 많이 붙어 있다 → **Store Owner Demo 후보** |
| `[E2E_TEST]` 조직 다수 | **DELETE_AFTER_RELINK 후보** | 자동 검증 흔적 · 붙은 데이터 거의 없음. 단 이번 범위에서 삭제까지 하지 않는다 |
| supplier 조직 7 중 `neture_suppliers` 3 | **REUSE 후보** | `(주)네뚜레 공급자 테스트` 가 **Supplier Demo 후보** |
| `checkout_orders` 23 | **KEEP** | buyer 가 실제 운영자 — **건드리지 않는다** |
| `signage_media` 7 (org NULL) | **UNKNOWN** | 소속이 없어 Demo 연결 여부는 별도 판단 |

> **STOP 조건 점검**: 실제 주문(`checkout_orders`)의 buyer 가 실제 운영자(`cfd2a5e7`)다.
> 이 데이터는 Demo 로 옮기지 않는다. 테스트 데이터와 실제 데이터가 **섞여 있지는 않다** —
> 주문은 실사용자 쪽, 매장 콘텐츠는 orphan 테스트 조직 쪽으로 깨끗하게 갈린다.

---

## 2. Demo 식별 방식 — 조사 결과 (WO Phase A-2)

아직 **선택하지 않았다.** 조사만 기록한다.

| 후보 | 현황 | 평가 |
|---|---|---|
| 1 기존 account metadata/profile | `users.businessInfo` 는 `json`(≠`jsonb`) — 질의·인덱스에 불리 | 비추천 |
| 2 기존 user classification | `users.status`(active/pending…) 는 계정 상태 축이라 의미 충돌 | 비추천 |
| 3 작은 `demo_accounts` registry | 새 테이블 1개(아주 작음) · email 문자열 비교를 한 곳에 가둔다 | **유력** |
| 4 `users` 신규 column | Core 테이블 변경 — `O4O-CORE-FREEZE-V1` 범위 | 신중 |

→ 3번이 유력하나 **새 migration 이 필요**하므로 WO §6 대로 **사용자 보고 후 결정**한다.
그 전까지는 코드에서 Demo 판정을 구현하지 않는다(문자열 비교 확산 방지).

---

## 3. 운영 write 승인 대기 목록

```text
Demo users 2 생성 · password credential 2 생성
role_assignments · service_memberships 생성
9c87f46b(테스트 약국) ownership → Store Owner Demo relink
supplier 조직 ownership → Supplier Demo relink
demo 식별 구조(migration) 생성
기존 test user / E2E 조직 삭제
```

현재까지 운영 **write 0** — 조회만 했다.

---

## 4. 다음

Phase A 결과 보고 → 사용자 승인 → Demo 식별 구조 결정 → Phase B(생성) → C(보호) → D(relink)
→ F(체험 로그인 UI) → G(위험 기능 census) → H(smoke) → DONE.
