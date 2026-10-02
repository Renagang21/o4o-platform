# CHECK-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1

> 대상 WO: [`WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1`](../work-orders/WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1.md)
> 정책 정본: [`O4O-CANONICAL-DEMO-ACCOUNTS-V1`](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md)
> 작성: 2026-10-01 · 갱신: 2026-10-01 (Phase A 판정 확정 · Phase B 설계) · 상태: **Phase B 설계 완료 / 운영 write 0 — 최종 승인 대기**

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
| `322667c8` (`testgm***`) | **KEEP_UNKNOWN (확정 · 2026-10-01)** | Google 연결 · ownership 0 · identity 미확인. **삭제·role 변경·relink·Demo 전환 전부 하지 않는다.** 미접속이라는 사실만으로는 삭제 근거가 되지 않으며, 이번 Demo 작업에 이 계정을 처리할 필요도 없다 |
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

**`demo_accounts` registry 로 확정했다 (사용자 결정 2026-10-01).**

| 후보 | 현황 | 평가 |
|---|---|---|
| 1 기존 account metadata/profile | `users.businessInfo` 는 `json`(≠`jsonb`) — 질의·인덱스에 불리 | 비추천 |
| 2 기존 user classification | `users.status`(active/pending…) 는 계정 상태 축이라 의미 충돌 | 비추천 |
| 3 작은 `demo_accounts` registry | 새 테이블 1개(아주 작음) · email 문자열 비교를 한 곳에 가둔다 | **유력** |
| 4 `users` 신규 column | Core 테이블 변경 — `O4O-CORE-FREEZE-V1` 범위 | 신중 |

**채택 근거**: `users` 는 identity SSOT 이자 Core Freeze 대상이라 운영 목적 컬럼을 붙이지 않는다 ·
`status` 는 계정 생명주기와 의미가 충돌한다 · `businessInfo` 는 플랫폼 운영 개념을 사용자 **사업
정보**에 넣는 셈이다 · registry 는 Demo 라는 **운영 목적**을 **정체성**과 분리한다.

### 2-1. 설계 — `demo_accounts` (migration `1790940000000-CreateDemoAccounts`)

```text
id · user_id · demo_type · is_active · created_at · updated_at
PK(id) · UNIQUE(user_id) · FK(user_id → users.id ON DELETE CASCADE)
CHECK(demo_type IN ('STORE_OWNER','SUPPLIER'))
부분 UNIQUE: (demo_type) WHERE is_active   ← 활성 유형은 하나
```

| 결정 | 이유 |
|---|---|
| **email · password 를 넣지 않는다** | 정본 키는 `user_id` 다. 로그인은 기존 `users.email` + `user_password_credentials` 를 그대로 쓴다. 이 표의 존재 이유가 `if (email === 'teststoreowner@example.com')` 확산을 막는 것이다 |
| `demo_type` 은 2값으로 시작 | INFLUENCER · PARTNER · OPERATOR_SANDBOX 는 그 기능이 설계될 때 CHECK 에 더한다. 지금 넣으면 쓰지 않는 값이 정본인 척한다 |
| `UNIQUE(demo_type)` 전체가 아니라 **부분** | 유형당 1개는 지금의 운영 방침이지 구조 제약이 아니다. 비활성 기록을 보존하면서 활성 중복만 막는다 |
| `demo_organizations` **만들지 않음** | Demo Account → owner → Demo Organization → Sample Data 로 개념은 구분하되, 이번 relink 요구는 `organization_members` 로 충족된다. 필요해지면 그때 만든다 |

**격리 검증**(로컬 PostgreSQL 17.9 · throwaway DB · 운영 DB fingerprint 채택 아님):
baseline fresh bootstrap + incremental 1..12 → **5927 → 5944 (+17)** ·
`LIVE = EXPECTED = 09d5a917…` · `POST_MIGRATION_SCHEMA_ASSERTION = PASS` ·
재실행 pending 0 / executed 0(멱등) · DB 제거 · migration contract **21 pass / 0 fail** · tsc 0.

### 2-2. 판정 helper — **구현 완료** (2026-10-01)

```text
services/auth/demo-account.service.ts
  isDemoAccount(userId, manager?) · getDemoAccountType(userId, manager?)
  isDemoLoginEmail(normalizedEmail, manager?)   # 로그인 전 경로(forgot · Google 가입) 전용
```

`isDemoLoginEmail` 도 `users` → `demo_accounts` 를 거친다 — 상수 이메일과 비교하지 않으므로
판정 정본은 여전히 `user_id` 다. 조회 실패는 통과로 바꾸지 않는다(fail-closed).

비밀번호 변경 차단 · forgot/reset 차단 · Google 연결 차단 · 계정 삭제 차단 · 위험 API 차단 ·
Demo 배지가 **전부 같은 정본**을 보게 한다. 이메일 비교는 쓰지 않는다.

---

## 2-3. Supplier Demo 조직 후보 — **확정 필요** (write 전 결정)

supplier 조직 7개 중 `neture_suppliers` 행이 있는 것은 3개다.

| 조직 | `neture_suppliers` | 상태 | **연결된 주문** | 평가 |
|---|---|---|---|---|
| `95aad740…` (주)네뚜레 공급자 테스트 | `91169739…` | ACTIVE | **16** | 이름은 테스트지만 주문이 가장 많이 붙어 있다 |
| `69e985ae…` (주)쓰라이프존 | `251adaaf…` | ACTIVE | **6** | 실제 상호명 |
| `a79e18fd…` 초윤 | `5de3098e…` | PENDING | **0** | 실제 상호명 · 승인 전 |
| 나머지 4개(`(주)다크호스` 등) | 없음 | — | 0 | 껍데기 조직 |

세 조직 모두 `organization_members` **0행**(owner 없음) · `neture_suppliers.user_id` 전부 NULL.

> **주의**: 주문 22건의 buyer 는 실제 운영자(`cfd2a5e7`)다. 조직 owner 를 바꾸는 것은 주문 행을
> 수정하지 않지만, **Demo 계정이 실제 운영자의 주문 이력을 보게 된다.** 매장 쪽(`9c87f46b`)처럼
> 깨끗하게 갈리지 않는다.

**권고**: `95aad740…`(주문 16 · 이름이 명시적으로 테스트)를 Supplier Demo 조직으로 쓰되,
주문 노출이 곤란하면 `a79e18fd…`(주문 0 · 단 PENDING 상태라 승인 처리 필요)를 쓴다.
**둘 중 하나를 지정해 주셔야 write 를 시작한다.**

---

## 2-4. Phase B write plan — **예상 변경 목록** (아직 실행 0)

### B-A. Identity foundation

| # | 대상 | 작업 | 예상 행 |
|---|---|---|---|
| 1 | `demo_accounts` | migration 적용(배포 경로) | 테이블 1 |
| 2 | `users` | Demo 2명 생성 (`teststoreowner@example.com` · `testsupplier@example.com`) | **+2** |
| 3 | `user_password_credentials` | bcrypt(`PasswordCredentialService` 동일 정책) 2건 | **+2** |
| 4 | `demo_accounts` | STORE_OWNER · SUPPLIER 등록 | **+2** |
| 5 | `role_assignments` | canonical 역할만 (store owner 축 · supplier 축) | 미확정 — B-A 직전 재확인 |
| 6 | `service_memberships` | 해당 서비스 active | 미확정 — 같음 |

- 이메일 확인 절차를 거치지 않는다(실제 수신 주소가 아님). 로그인 가능한 상태를 **명시적으로** 설정하고 그것이 **Demo 예외**임을 여기 적는다.
- `linked_accounts(provider='google')` **생성 0**.
- `platform:*` **부여 0** · admin-dashboard 접근 없음.
- 평문 비밀번호를 DB 에 저장하지 않는다.

### B-B. Relink (B-A 검증 후)

| # | 대상 | 작업 | 예상 행 |
|---|---|---|---|
| 7 | `organization_members` | `9c87f46b`(테스트 약국) → Store Owner Demo owner **추가** | **+1** |
| 8 | `organization_members` | 확정된 supplier 조직 → Supplier Demo owner **추가** | **+1** |
| 9 | 검증 | 매장 콘텐츠 15 · 플레이리스트 5 가 새 owner 로 정상 조회되는지 | write 0 |
| 10 | `organization_members` | **검증 후에만** orphan 2행(`970b5b0e` · `500e8ddd`) 제거 | **-2** |

> **순서**: 새 owner 를 먼저 붙이고 → 화면·권한 검증 → 그 다음 orphan 제거. 반대로 하지 않는다.

### 비대상 (건드리지 않는다)

```text
checkout_orders 23            buyer = 실제 운영자
cfd2a5e7 · c0156a4a           실사용자
322667c8 (testgm***)          KEEP_UNKNOWN — user · role · membership 전부 미접촉
c9beb4a2 Sohae 약국            실제 운영자 소유
signage_media 7 (org NULL)    의미 확인 전 임의 relink 금지
E2E 조직 다수 · 기존 user 삭제  이번 단계 아님
product_masters 272,040       공공데이터 seed
```

---

## 2-5. Phase C — 서버 보호 구현 (2026-10-01 · PR #264 · 운영 write 0)

공개 credential 이므로 **비밀번호를 아는 사람이 그것을 바꿀 수 있다**는 것이 가장 큰 구멍이었다.
화면에서 버튼을 숨기는 것으로는 막히지 않는다 — 서버에서 요청 자체를 거절한다.

| 경로 | 구현 | 결과 |
|---|---|---|
| `POST /auth/password` | `email-auth.service.ts` `setPasswordForUser` | 403 `DEMO_ACCOUNT_FORBIDDEN` — 정책 검사·현재 비밀번호 확인보다 **먼저** |
| `POST /auth/password/forgot` | `requestPasswordReset` | 토큰 0 · 메일 0 · 응답 문구는 일반 계정과 동일(Demo 여부 비노출) |
| `POST /auth/password/reset` | `resetPassword` | 과거 발급 토큰도 소비 단계에서 403 · 세션 폐기 0 |
| 계정 삭제 | `AdminUserController.deleteUser` · `UserManagementController.deleteUser` | 삭제 **전** 403 (계약 테스트가 호출 순서를 본다) |
| Google 연결 | `google-auth.service.ts` `createGoogleUser` | 403. `EMAIL_IN_USE` 로 뭉개지 않는다 — 사유가 "이미 쓰는 주소"가 아니라 "고정된 테스트 계정"이다 |
| platform role 획득 | 기존 보호로 충족 | `POST /admin/platform-accounts/:id/super-admin` 은 Google 연결을 요구한다(`GOOGLE_LINK_REQUIRED`) · Demo 는 연결이 없다 |

**막지 않은 것** — 이메일 변경 · role 변경 · ownership 해제. 정책 §8 의 최소 목록 중 남은 3건이며
별도 WO 다. 정책 정본 §8-1 에 현황 표로 적었다(구현 범위를 문서가 넘겨 말하지 않게).

**로그인은 막지 않는다** — 체험 입구이므로 비밀번호 로그인은 그대로 된다.

### 검증

```text
jest src/services/auth src/scripts/__tests__     13 suites · 232 tests PASS
tsc --noEmit                                     PASS
eslint (변경 9파일)                               신규 경고 0 (기존 warning 4건은 내 줄 아님)
```

**변이 검사** — 판정을 상시 `false` 로 바꾸고 재실행하면 **8개 테스트가 실패**한다:

```text
V13 비밀번호 변경 거절 / forgot 토큰·메일 0 / reset 거절 / 판정은 user_id
Google 가입 403
계약 D2(활성 행·바인딩) / 유형 반환 / D3(fail-closed)
```

보호 없이 통과하는 테스트가 0 임을 이것으로 확인했다(통과만 보고 PASS 로 적지 않기 위해서).

### 식별자 정정

`teststoreowner@example.com` · `testsupplier@example.com` — 예약 도메인이라 실제 메일함이 없다
(공개 credential 이 실재 주소를 가리키지 않게). CLI 상수 · 정책 정본 · WO · CHECK 일괄 정정.
`normalizeLoginEmail` · `isLoginEmailShapeValid` · 마스킹(`t***@e***.com`) 모두 통과 확인.

### 구축 CLI dry-run 재실행 (2026-10-01 · 식별자 정정 후 · **write 0**)

```text
mode: DRY-RUN (measure only)
STORE_OWNER  user=CREATE password=CREATE(plan) registry=CREATE(plan) org=reuse(테스트 약국)
             owner=CREATE(plan) supplier=-            memberships=[kpa-society neture]
SUPPLIER     user=CREATE password=CREATE(plan) registry=CREATE(plan) org=CREATE
             owner=CREATE(plan) supplier=CREATE(plan) memberships=[supplier neture]
TOTAL writes=0
```

식별자 정정 전 계획과 **같다** — 두 계정 모두 신규 생성, 매장 조직은 기존 `9c87f46b`(테스트 약국)
재사용, 공급자 조직만 신규. 보호 대상(실사용자 2명 · `322667c8` · Sohae 약국 · 기존 supplier 조직
3개 · `checkout_orders`)은 계획에 **등장하지 않는다**.

병합(`01214353e`) 뒤 같은 명령을 다시 돌려 **같은 계획**을 얻었고, 운영 행수도 그대로다
(read-only · `BEGIN READ ONLY`):

```text
demo_accounts 0 · users 3 · user_password_credentials 0 · organizations 25 · checkout_orders 23
```

### 배포 상태 — **guard 는 운영에 없다**

```text
merge        01214353e (main)
운영 API     o4o-core-api-03783-jex · image 5f12c4acd  ← 내 병합 이전 빌드
DEPLOY_FREEZE = true (잠김 · 사용자 결정)
```

병합만으로는 배포되지 않는다. 보호가 운영에 올라가기 전에 `--apply` 를 돌리면 **보호 없는
공개 credential 이 운영에 존재하는 창**이 생긴다 — 그래서 순서는 배포 → 계정 생성이다.

## 2-6. Phase C 잔여 3건 — 이메일 변경 · role 변경 · ownership 해제 (2026-10-02 · 운영 write 0)

사용자 결정(2026-10-02): API 배포 HOLD → 정책 §8 의 남은 3건을 먼저 닫는다.
원칙: 판정 정본은 `demo_accounts.user_id` · email 문자열 비교 0 · write **전에** 거절 · 일반 사용자 동작 불변 ·
기존 admin/super-admin 보호 유지 · Frozen `role-assignment.service.ts` 무수정(호출부에서 거절).

### Fresh census — 실제로 존재하는 write 경로

| 축 | 경로 | guard |
|---|---|---|
| 이메일 변경 | `AdminUserController.updateUser` · `UserManagementController.updateUser` | email 이 실제로 바뀌는 요청이면 403 |
| role 변경 | Admin `updateUser`(roles) · `updateUserRoles` · `revokeRoleAssignment` · `routes/admin/platform-accounts.routes.ts` | 403 |
| | `operator-assignment.service` (`OperatorAssignmentController`) | 403 |
| | `MembershipApprovalService` approve/reject/suspend/reactivate · `MembershipConsoleController` · `BranchServiceMembershipController` · `PharmacyHubMembershipConsoleController` | 403 |
| | KPA `member.controller` · `auth-account.controller` · LMS `InstructorController` | 403 |
| | 분회 `branch-operator-designation.service` designate/release · `branch-lifecycle.service` approveCreation | 403 (`BranchOperatorDesignationError` / `BranchLifecycleError` statusCode) |
| | Neture `operator-registration.service` approve/reject | 403 |
| | Cosmetics `cosmetics-store.service` 신청 심사(approve/reject 공통) | 403 |
| | 커뮤니티 `community-operator-designation.service` setRole · `community-lifecycle.service` approveCreation (PR #265 Codex P2 반영) | 403 |
| ownership 해제 · 변경 | `MembershipApprovalService` withdraw · deleteMember | 403 |
| | `store-owner-termination.service` createCase/terminateCase/purgeCase | 403 |
| | Neture `supplier.service` approve/reject/deactivate/reactivate — `user_id` **또는** owner 조직(`isDemoOrganization`) | result `DEMO_ACCOUNT_FORBIDDEN` → controller 403 |

간접 보호(호출부가 막혀 있으므로 별도 guard 없음): PharmacyHub `provisionStoreSubject` ·
`ensureStoreContextForOwner` · `ensureKpaStoreOrganization`.

**guard 하지 않은 것** — Cafe24 B2B provisioning: 사용자를 결정론적 synthetic email 또는 member link 로만
찾으므로 Demo 사용자에 도달할 수 없다.

### 검증

```text
신규 demoAccountWriteGuard.behavior.test.ts     18 tests PASS
  W1 Demo 대상 → 403 · write 0 (email · role · withdraw · deleteMember · termination · supplier
     비활성화(user_id NULL · owner 조직 경유) · 분회 지정/해제)
  W2 일반 사용자 → 기존 동작 그대로
  W3 demo_accounts 조회 실패 → 예외 전파(fail-closed) · write 0
demoAccountGuard.contract.test.ts D5/D5b        guard 가 메서드 첫 write 보다 앞 · controller 403 매핑 — 9 tests PASS
관련 suite 전체                                  737 tests: 736 PASS · 1 skipped · 0 failed
tsc --noEmit                                     PASS (auth-utils · types · security-core dist 재빌드 후)
```

기존 suite 10개는 mock DB 가 새 `demo_accounts` 조회에 답하지 못해 실패했다 — 각 suite 에서
`demoAccountService` 를 "Demo 아님"으로 고정했다(일반 사용자 경로 회귀 검증이라는 원래 목적 유지).

**변이 검사**

```text
M1 isDemoAccount · isDemoOrganization 상시 false   → W1 8건 실패
M2 조회 오류를 false 로 삼킴(try/catch)            → W3 5건 + 계약 D3 실패
```

두 변이 모두 원복 후 전체 PASS.

### PR #265 리뷰 반영

```text
Codex P2   커뮤니티 개체 role 경로 누락 — setRole · approveCreation 에 guard 추가
           community 테스트에 Demo 거절 · fail-closed 4건 추가 · D5 에 2행 추가
           변이(M1) → community Demo 거절 3건 실패 확인 후 원복
Sonar      신규 코드 중복 8.3% (기준 ≤3%) — 10개 suite 의 "Demo 아님" 고정 블록을
           `src/__tests__/support/not-demo-account.ts` 하나로 모음 ·
           MembershipConsoleController 의 5줄 guard 6곳을 `rejectDemoAccountTarget(res, userId)` 한 줄로
재실행      tsc --noEmit PASS · 관련 99 suites / 1534 tests PASS
```

### 범위 밖 발견 (보고만 · 수정 0)

```text
1 KPA PATCH /kpa/organizations/:id  isActive=false — Demo owner 조직 비활성화 미차단
2 Admin updateUser  status/isActive 변경 — Demo 사용자 정지 미차단 (정책 §8 최소 목록 밖)
3 Cosmetics removeMember · adminDeactivateMember — Demo 구축 계획에 cosmetics 행 없음 → 해당 없음
```

1·2 는 정책 §8 목록("권한 변경 · 사업자 변경")의 경계 판단이 필요하다 — 별도 WO 제안.

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

현재까지 운영 **write 0** — 조회만 했다. `demo_accounts` migration 은 적용됐고(테이블 0행),
서버 보호는 코드에만 있다(PR #264). 계정 생성(`--apply`)은 **승인 대기**다.

---

## 4. 다음

Phase A(census) · 식별 구조(`demo_accounts` 적용) · **C(서버 보호 · PR #264)** 완료.

남은 것:

```text
C' 잔여 3건         이메일 · role · ownership guard 구현(2-6) — 병합 후 통제 배포 승인됨
B  계정 생성        --apply 는 배포 검증 후 별도 승인 (dry-run 계획은 2-5 에 기록)
   배포             guard 완료 후 1회 통제 배포 — DEPLOY_FREEZE=true 유지(dispatch 직전 최소 시간만 해제)
D  relink           B 검증 후
F  체험 로그인 UI
G  위험 기능 census
H  smoke            Demo 계정 생성 전에는 불가(현재 store-owner·supplier 계정 0)
```

순서 주의: **보호가 운영에 올라간 뒤에 계정을 만든다**. 계정이 먼저 생기면 보호 없는
공개 credential 이 운영에 존재하는 창이 생긴다.
