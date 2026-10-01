# WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1

> 발행: 2026-10-01 · 상태: **Phase A(census) 착수**
> 정책 정본: [`O4O-CANONICAL-DEMO-ACCOUNTS-V1`](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md)
> 진행 기록: `docs/checks/CHECK-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1.md`
>
> **하나의 작업이다.** 계정 생성 · relink · 보호 · 로그인 버튼 · 안내를 서비스별·단계별 WO 로 나누지 않는다.
> 계정이 생겼다는 사실로 완료를 판정하지 않는다.

---

## INITIAL_PURPOSE

canonical Demo account 2개를 구축하고, 기존 테스트 데이터를 가능한 범위에서 이 계정들로 정리한다.
처음 방문한 사용자가 로그인 화면에서 Demo 계정을 선택해 O4O 를 직접 둘러볼 수 있게 한다.

## CONFIRMED_DECISIONS

```text
Store Owner Demo   teststoreowner@gmail.com / testmail1!   매장 경영자 체험 + 매장 샘플 데이터 owner
Supplier Demo      testsupplier@gmail.com    / testmail1!   공급자 체험 + 공급자 샘플 데이터 owner

두 email 은 실제 메일 송수신 주소가 아니다 — O4O 내부 Demo identifier 다
생성 방식    일반 /signup 이 아니라 운영자 관리 canonical system account
인증 이후    기존 정본 구조만 사용 (users.id · role_assignments · service_memberships ·
             supplier/store relationship · user_password_credentials)
             별도 Demo 인증 체계를 만들지 않는다
Demo 로그인   기존 이메일·비밀번호 로그인 endpoint 를 그대로 호출 (별도 Demo login API 없음)
Google 연결   금지 (linked_accounts(provider='google') 생성 0)
비밀번호      고정 — 변경 · forgot · reset 전부 server-side 차단
Admin        platform:* 없음 · admin-dashboard 접근 금지
credential   UI 여러 곳에 복제하지 않고 한 곳(config/helper)에서 관리
```

## OUT_OF_SCOPE

```text
Account Security UI (Google 사용자 첫 비밀번호 추가)   별도 후속 — Demo 와 섞지 않는다
다른 서비스 이메일 로그인 UI 확산                      별도 후속
Influencer / Partner Demo                             기능이 정식 설계된 뒤 별도 WO
legacy Partner role · table 복구                      금지
실제 이메일 가입 E2E (확인 메일 · reset 메일)          Demo 로 하지 않는다 (§24)
완전한 sandbox                                        V1 은 명확한 위험 기능부터 차단
```

## DONE_CRITERIA

```text
CANONICAL_DEMO_USERS = 2 (store owner · supplier)
PUBLIC EXPERIENCE LOGIN = ACTIVE (로그인 화면 Demo 버튼 2개)
DEMO DATA OWNER POLICY = ACTIVE (정책 문서 + 개발 규칙)
ARBITRARY TEST USERS = 가능한 범위에서 제거 (근거 기록)
Demo 보호 smoke PASS (비밀번호 변경 · forgot/reset · Google 연결 · 삭제 · admin 접근 차단)
로그인 smoke PASS (두 계정 각각 진입 → ownership 확인 → logout → 재로그인)
운영 적용 + 실계정 확인 전에는 DONE 으로 쓰지 않는다
```

---

## Phase A — 기존 데이터 census (read-only · **운영 write 0**)

운영 DB 에 쓰기 전에 조사부터 한다. 확인 대상:

```text
users · linked_accounts · user_password_credentials
role_assignments · service_memberships
supplier ownership · organization relations
store ownership · store memberships
상품 owner · 콘텐츠 author · POP · signage
sample order · sample approval · 기타 주요 FK
```

기존 테스트 사용자/사업자/매장이 있는지, 각각 무엇에 연결돼 있는지 센다.

### A-1. 기존 사용자 분류

각 사용자를 아래 넷 중 하나로 판정하고 **근거를 CHECK 에 기록**한다.

```text
REUSE_AND_RELINK · DELETE_AFTER_RELINK · KEEP · UNKNOWN
```

> **실제 사용자로 판단되는 계정은 절대 Demo 계정으로 전환하지 않는다.**

### A-2. Demo 식별 방식 조사

Demo 여부를 **email 문자열 비교로 여러 곳에 흩뿌리지 않는다.** 현재 스키마를 먼저 조사해 가장 작은
정본 구조를 고른다.

```text
1 기존 account metadata/profile 활용 가능 여부
2 기존 user classification 구조
3 작은 demo_accounts registry
4 users 신규 column
```

**새 migration 이 필요하면 사용자에게 먼저 보고한다.**

---

## Phase B — 생성 (사용자 승인 후)

```text
Store Owner Demo   users + user_password_credentials + role_assignments + service_memberships
                   + store/pharmacy ownership
Supplier Demo      users + user_password_credentials + role_assignments
                   + supplier organization relation
```

- 비밀번호는 기존 `PasswordCredentialService` 와 **같은 bcrypt 정책**으로 저장한다. 평문 저장 0.
- Demo email 은 실제 수신 주소가 아니므로 일반 verification flow 를 거치지 않는다.
  정상 로그인이 가능하도록 **필요한 상태를 명시적으로 설정**하고, 그것이 **Demo 예외**임을 CHECK 에 적는다.
- role·membership 은 **현재 canonical 구조만** 사용한다. `users.role` 같은 legacy scalar 를 직접 고치지 않는다.

## Phase C — 보호 (server-side)

```text
POST /auth/password · /auth/password/forgot 실제 발송 · /auth/password/reset
email 변경 · account delete · Google auth 연결
```

frontend 숨김과 **별개로** 서버 guard 를 둔다.

## Phase D — relink

가능한 기존 샘플 데이터는 새로 만들지 않고 연결한다. FK 무결성을 확인하며 진행한다.

```text
testsupplier    → test supplier organization · test products · B2B contents · sample approval
teststoreowner  → test store/pharmacy · POP · signage · store contents · sample operational data
```

## Phase E — 기존 테스트 사용자 삭제 (relink 완료 후에만)

삭제 전 `FK count · ownership · auth identity · role · membership · audit/history` 를 확인한다.
**확실하지 않은 사용자는 삭제하지 않는다.**

## Phase F — 체험 로그인 UI

```text
로그인 화면   [ 공급자 화면 둘러보기 ] [ 매장 경영자 화면 둘러보기 ]  (기존 email/password endpoint 사용)
로그인 후     `테스트 계정` 배지 + 최초 1회 안내 (반복 modal 금지)
메인 · 서비스 홈   공통 짧은 안내 문구 (서비스별로 다르게 쓰지 않는다)
```

## Phase G — 위험 기능 census

Demo 로 실행되면 외부 영향이 생기는 API 를 분류한다.

```text
SAFE_READ · DEMO_LOCAL_WRITE · EXTERNAL_EFFECT · ACCOUNT_CRITICAL
```

최소 차단 후보: 실결제 · 실주문 확정 · 외부 메시지/메일 · 외부 API push · 실제 계약 ·
실사용자 초대 · role 변경 · owner 변경 · account delete · 대량 삭제.

## Phase H — smoke

```text
Store Owner   로그인 → store/pharmacy 진입 → ownership 확인 → 샘플 콘텐츠 → logout → 재로그인
Supplier      로그인 → supplier 진입 → organization 확인 → 상품/콘텐츠 → logout → 재로그인
보호          비밀번호 변경 차단 · forgot/reset 발송 0 · Google 연결 차단 · 삭제 차단 · admin 접근 차단
```

---

## 중단 조건 (STOP)

```text
기존 테스트 데이터가 실제 사용자와 혼합돼 있다
실제 주문·정산 데이터가 테스트 owner 에 연결돼 있다
Demo 생성에 core identity 대규모 변경이 필요하다
새 migration 이 예상보다 커진다
legacy Partner 복구가 필요해진다
```

무리하게 정리하지 않고 **별도 후속으로 분리**한다.

## 운영 DB write 승인 경계

Phase A census 는 read-only 로 바로 수행한다. 아래는 **사용자 명시 승인 후에만**:

```text
Demo users 생성 · password credential 생성 · role assignment 생성 · membership 생성
ownership relink · 기존 test users 삭제
```

**Phase A 결과를 먼저 보고한다.**

---

*Created: 2026-10-01*
