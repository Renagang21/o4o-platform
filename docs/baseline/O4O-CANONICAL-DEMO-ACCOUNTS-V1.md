# O4O-CANONICAL-DEMO-ACCOUNTS-V1

> **2026-10-20 사용자 승인 — 매장 경영자 Demo 참여 데이터 보정**: 매장 경영자 테스트 로그인 버튼 계정의 community·funding 서비스 가입 및 기존 Demo 약국의 CarePharm·드럭스토어형 약국 사업 참여를 실제 원장으로 보정한다. 기존 메인·약국·강의·매장 관계를 유지한다. 공급자·분회·조합은 별도 자격·소속 없이 가입한 것으로 가장하지 않으며, 다른 Demo의 소유권 이전이나 관리자·운영자 권한을 부여하지 않는다. 정확한 운영 적용 상태는 [집행 WO](../work-orders/WO-O4O-HOME-MEMBERSHIP-DISCOVERY-V1.md)와 [검증 CHECK](../checks/CHECK-O4O-HOME-MEMBERSHIP-DISCOVERY-V1.md)에서 구분한다.

> **2026-10-12 최신 확정**: 사용자가 제공한 매장 경영자·공급자·직원 세 계정을 전체 사용자 로그인 버튼과 연결 데이터의 정본으로 전환한다. 직원은 같은 체험 약국의 직원 권한만 가지며 전체관리자·운영자 계정은 포함하지 않는다. 값의 단일 정본은 공통 코드이며 구현·운영 반영은 인증 WO의 T01~T08에서 별도로 기록한다.

> **2026-10-07 갱신**: 모든 사용자 서비스 로그인 화면에 테스트 로그인 버튼을 제공한다. credential의 공통 코드 정본은 `packages/auth-utils/src/demoAccounts.ts`다. 매장 Demo는 합성 약국 승인 원장과 `neture:store_owner` 표식으로 접근하며 KPA 회원 승인으로 접근을 얻지 않는다. 인가 우회·관리자 권한은 없다.

> 발행: 2026-10-01 · 상태: **ACTIVE (정책 정본)**
> 집행 WO: [`WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1`](../work-orders/WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1.md)
> 선행: [`WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1`](../work-orders/WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1.md) (이메일·비밀번호 로그인)

---

## 0. 한 줄 요약

O4O의 Demo 계정은 공개 체험 진입점과 개발 샘플 데이터 계정이다. 경영자·공급자·직원 세 계정을
공통 정본으로 사용한다. 샘플 매장·공급자 데이터는 경영자·공급자의 소유권에 연결하고 직원은
같은 체험 매장의 승인된 직원 관계로 접근한다.

---

## 1. 목적 두 가지

```text
1. 외부 방문자가 회원가입 전에 O4O 서비스를 직접 둘러본다
2. 개발 과정에서 생기는 샘플·테스트 데이터의 정본 사용자가 된다
```

---

## 2. Canonical Demo Accounts

| 구분 | 로그인 아이디 | 비밀번호 | 용도 | 데이터 축 |
|---|---|---|---|---|
| **Store Owner Demo** | 공통 정본 `STORE_OWNER`의 email | 공통 정본 password | 매장 경영자 체험 | 매장 · 약국 · POP · 사이니지 · 매장 콘텐츠 · 주문 작업대 · 상품 진열 |
| **Supplier Demo** | 공통 정본 `SUPPLIER`의 email | 공통 정본 password | 공급자 체험 | 공급자 · 상품 · B2B 콘텐츠 · 상품 승인 · 서비스 배포 |
| **Store Staff Demo** | 공통 정본 `STORE_STAFF`의 email | 공통 정본 password | 매장 직원 체험 | 같은 Demo 약국의 직원 업무 · 소유/직원 관리 제외 |

**2026-10-12 사용자 확정:** 제공한 세 테스트 계정으로 전체 버튼·registry·데이터 연결을 전환한다.
주소·비밀번호의 코드 정본은 `packages/auth-utils/src/demoAccounts.ts` 하나이며 직원 credential은
경영자·공급자와 다르다. 전체관리자·운영자의 Google 계정은 이 Demo 계정에 포함하지 않는다.

---

## 3. 이 이메일의 의미 — **실제 수신 주소가 아니다**

> Canonical Demo email 은 메일을 받기 위한 주소가 아니라, **O4O 내부의 공개 Demo 식별자**다.
> 실제 Gmail 계정의 존재를 전제하지 않는다.

쓰임은 둘뿐이다 — **로그인 식별자** · **Demo 데이터 owner 식별자**.

## 4. 이 비밀번호의 의미 — **공개 정보**

공통 정본의 세 Demo credential은 사용자가 공개를 허용한 체험용 정보다. 직접 입력하거나 버튼으로 로그인할 수 있다.
다만 **여러 곳에 하드코딩하지 않고 한 곳(config/helper)에서 관리**한다.

공개해도 되는 근거는 **데이터 격리**다. Demo 사용자는 일반 사용자와 같은 identity 구조로 로그인하고,
보는 매장 · 공급자 등 데이터는 그 Demo 사용자의 ownership 에 귀속되어 다른 사용자 데이터와 연결되지
않는다(§18-1 "데이터 범위는 role 이 아니라 ownership 이 정한다"). 따라서 문서의 비밀번호 금지 규칙에서
이 공개 credential 은 예외다 — [`DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1` §10-4](../rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md).
예외는 이 정본이 정한 Demo 3계정에 한정한다.

## 5. 일반 사용자와 다른 점

```text
일반 이메일 사용자   /signup → 실제 이메일 → 확인 메일 → 확인 → 로그인
Demo 사용자         시스템 생성 → password credential 사전 생성
                   → role · membership · ownership 연결 → 공개 로그인
```

Demo 계정은 이메일 확인이 필요한 일반 회원이 **아니다.** 운영자가 의도적으로 만든 체험 계정이다.
이 예외는 CHECK 에 "Demo 예외" 로 명시한다 — 일반 사용자의 이메일 확인과 혼동하지 않는다.

## 6. 쓰지 않는 메일 기능

```text
이메일 확인 메일 · 확인 재발송 · forgot password mail · reset mail · 메일 기반 복구
```

Demo 계정에서 이 기능을 호출해도 **실제 발송이 일어나지 않게** 한다.

## 7. 비밀번호 정책 — 고정

```text
비밀번호 변경 금지 · forgot/reset 금지 · 메일 기반 복구 금지
```

UI 에서 버튼을 숨기는 것으로 끝내지 않는다. **서버에서 요청 자체를 차단**한다.

## 8. 계정 보호 (server-side)

공개 credential 이므로 일반 사용자보다 강하게 묶는다. 최소 차단 대상:

```text
비밀번호 변경 · 이메일 변경 · 계정 삭제 · Google 계정 연결 · 인증수단 변경
role 변경 · 사업자 ownership 해제 · store ownership 해제
platform role 획득 · 관리자 계정 전환
```

frontend 전용 보호가 아니라 **서버 정책**이어야 한다.

### 8-1. 구현 현황 (2026-10-02)

판정 정본은 `demo_accounts.user_id` 하나다 — 이메일 문자열 비교는 금지한다
(`apps/api-server/src/services/auth/demo-account.service.ts`). 조회가 실패하면 "Demo 아님"으로
넘기지 않고 예외를 올린다(fail-closed).

| 차단 대상 | 상태 | 지점 |
|---|---|---|
| 비밀번호 변경 (`POST /auth/password`) | **구현** | `email-auth.service.ts` `setPasswordForUser` — 403 `DEMO_ACCOUNT_FORBIDDEN` |
| forgot (`/auth/password/forgot`) | **구현** | 토큰 0 · 메일 0 · 응답 문구는 일반 계정과 동일(Demo 여부 비노출) |
| reset (`/auth/password/reset`) | **구현** | 과거 발급 토큰도 소비 단계에서 403 · 세션 폐기 0 |
| 계정 삭제 | **구현** | `AdminUserController.deleteUser` · `UserManagementController.deleteUser` — 삭제 **전** 403 |
| Google 계정 연결 | **구현** | `google-auth.service.ts` `createGoogleUser` — 403 (`EMAIL_IN_USE` 로 뭉개지 않는다) |
| platform role 획득 · 관리자 전환 | **기존 보호로 충족** | `POST /admin/platform-accounts/:id/super-admin` 은 Google 연결을 요구한다(`GOOGLE_LINK_REQUIRED`) — Demo 는 연결이 없다 |
| 이메일 변경 | **구현** (2026-10-02) | `AdminUserController.updateUser` · `UserManagementController.updateUser` — email 이 바뀌는 요청이면 write **전** 403 |
| role 변경 | **구현** (2026-10-02) | Admin `updateUser`(roles) · `updateUserRoles` · `revokeRoleAssignment` · `platform-accounts.routes` · `operator-assignment.service` · membership console/approval(KPA · 분회 · 종전 PharmacyHub — 폐기된 구현 이력이며 복구 대상 아님) · KPA member · 분회 운영자 지정/해제 · 분회 생성 승인 · Neture 운영자 등록 승인/반려 · Cosmetics 매장 신청 심사 · LMS 강사 · `auth-account.controller` · 커뮤니티 개체 운영자 지정/해제(`setRole`) · 커뮤니티 개설 승인(`approveCreation`) |
| ownership 해제 · 변경 | **구현** (2026-10-02) | membership `withdraw` · `deleteMember` · 매장 경영자 해지 `createCase`/`terminateCase`/`purgeCase` · Neture 공급자 승인/반려/비활성화/재활성화(user_id 또는 owner 조직 경유) |

로그인은 막지 않는다 — 체험 입구이므로 비밀번호 로그인은 그대로 된다.
**이 표에 적힌 것만 서버가 막는다.** 판정은 `demo_accounts.user_id` 만 본다(대상이 조직 id 로만 들어오면
owner 행을 거쳐 같은 registry 를 본다 — `isDemoOrganization`). Frozen `role-assignment.service.ts` 는
고치지 않고 호출부에서 거절한다.
계약 테스트: `services/auth/__tests__/demoAccountGuard.contract.test.ts`(D5 — guard 가 첫 write 보다 앞) ·
`demoAccountWriteGuard.behavior.test.ts`(이메일 · role · ownership 거절 · 일반 사용자 불변 · fail-closed) ·
`emailAuthService.test.ts` V13 · `googleAuthService.test.ts` 'Demo 계정 보호'.

### 8-2. 약관 동의(Terms Acceptance) 강제 제외 — 2026-10-02 사용자 확정

> 이전의 "약관 게이트에 Demo bypass 를 넣지 않는다" 판단을 **명시적으로 변경한 최종 결정**이다.
> 근거: 운영 smoke 에서 canonical Demo 계정이 약관 게이트(428 `TERMS_ACCEPTANCE_REQUIRED`) 때문에
> 서비스 기능 API 를 쓸 수 없음이 확인됐다 (CHECK §2-8).

```text
Demo Account 는 실제 개인 사용자나 계약 주체가 아니라 O4O 서비스 체험을 위한 공유형 시스템 계정이다.
따라서 Demo Account 에는 일반 사용자용 약관 동의 절차를 요구하지 않는다.
예외 범위는 Terms Acceptance Gate 에 한정한다 — 인증 · service membership · ownership · role ·
Demo write guard(§8-1) · password/session 정책은 일반 경로와 동일하게 적용한다.
```

**raw pending 과 enforced pending 을 구분한다.**

| 용어 | 의미 | 일반 사용자 | Demo |
|---|---|---|---|
| raw pending | 약관 데이터 기준 아직 동의하지 않은 정책 (`getPendingForUser`) | 같다 | 존재할 수 있다 |
| enforced pending | 서비스 접근을 실제로 막는 정책 (`getEnforcedPendingForUser`) | 같다 | `[]` |

- 하지 않는 것: `user_policy_acceptances` 사전 생성 · 위조 · "동의한 것"으로 기록 · raw 상태 삭제.
  방문자에게 공용 계정의 약관 동의를 맡기지도 않는다.
- 예외는 **enforced pending 계산 한 곳**(`policy-acceptance.service.ts` `getEnforcedPendingForUser`)에서만
  적용한다. 판정 정본은 `demo_accounts.user_id`(활성) — 이메일 문자열 비교 금지.
- enforced pending 을 쓰는 경로: requireAuth 게이트(`enforceTermsAcceptance`) · 이메일 로그인 응답 ·
  `GET /auth/me` (프론트의 재동의 화면은 이 목록으로 그려진다). `GET /api/v1/auth/policy-acceptances`
  는 raw 정책 상태를 그대로 보여 준다.
- raw pending 이 없으면 Demo 조회를 하지 않는다. Demo 조회가 실패하면 예외를 **열지 않는다** — raw 를
  그대로 강제한다(428 유지).
- 일반 사용자 약관 정책(`terms-acceptance.policy.ts`)은 바뀌지 않는다. 약관 버전이 올라가도 Demo 는
  별도 준비가 필요 없다.
- 계약 테스트: `__tests__/security/terms-acceptance-gate.spec.ts` 'Demo 계정 약관 예외' · '소비처 계약'.

## 9. 허용하는 것 / 막는 것

```text
허용(가능한 넓게)  화면 이동 · 목록/상세 조회 · 콘텐츠·상품 조회
                  매장 운영 화면 · 공급자 화면 · 샘플 데이터 조회
막는다(외부 영향)  실결제 · 실주문 확정 · 외부 메일/메시지 발송 · 외부 API 전송
                  실제 계약 · 실사용자 초대 · 권한 변경 · 사업자 변경 · 대량 삭제
```

V1 은 완전한 sandbox 를 만들지 않는다 — **명확히 위험한 것부터** 막는다.

## 10. 로그인 화면 (Demo 진입)

```text
처음 방문하셨나요?
테스트 계정으로 O4O 서비스를 둘러볼 수 있습니다.

[ 공급자 화면 둘러보기 ]  [ 매장 경영자 화면 둘러보기 ]  [ 매장 직원 화면 둘러보기 ]

이메일 / 비밀번호 / [로그인]      또는      [ Google 계정으로 계속 ]
```

Demo 버튼은 **기존 이메일·비밀번호 로그인 경로를 그대로 호출**한다.
별도 Demo 인증 시스템을 만들지 않는다.

## 11. 로그인 후 표시

`테스트 계정` 배지를 표시한다. 최초 진입 시 한 번만 안내한다 — **반복 modal 금지**.

```text
현재 테스트 계정으로 서비스를 둘러보고 있습니다.
일부 계정 관리 및 실제 업무 기능은 제한됩니다.
```

## 12·13. 메인 · 서비스 안내

메인과 각 서비스 홈에 **같은 짧은 문구**를 쓴다. 서비스마다 다른 Demo 설명을 만들지 않는다.

```text
O4O 가 처음이신가요?
로그인 화면에서 테스트 계정을 선택하면 회원가입 전에 서비스를 직접 둘러볼 수 있습니다.
```

## 14. 기존 테스트 데이터 재사용

새로 다 만들지 않는다. 먼저 조사하고 분류한다.

```text
REUSE_AND_RELINK · DELETE_AFTER_RELINK · KEEP · UNKNOWN
```

재사용 가능한 것은 Demo 계정으로 **연결**한다. 2026-10-08 사용자가 현재 계정과 데이터를 모두 테스트 데이터로 지정했다. 현재 데이터에 대한 과거 실사용 분류는 보존 근거가 아니다. 연결하지 않는 불필요 테스트 데이터와 개발을 방해하는 계정은 대상 조사·복구 자료 확보·기능 검증 후 정리한다. 신규 실사용 데이터가 생기면 이번 테스트 데이터 정리의 대상으로 확대하지 않는다.

## 15. 개발 데이터 생성 원칙

```text
매장 데이터가 필요하면   → STORE_OWNER Demo의 기존 사용자 ID
공급자 데이터가 필요하면 → SUPPLIER Demo의 기존 사용자 ID
직원 체험이 필요하면     → STORE_STAFF Demo와 같은 체험 약국의 직원 관계
```

에이전트가 `test1@` · `supplier123@` · `storetest@` 같은 사용자를 계속 만들지 않는다.
불가피하게 만들었다면 **작업 종료 시 삭제하거나 disposition 을 기록**한다.

## 16. 기존 테스트 사용자 정리 순서

```text
1 user census → 2 role/membership → 3 supplier/store ownership → 4 FK(콘텐츠·상품·주문)
→ 5 재사용 relink → 6 불필요 데이터 삭제 → 7 **마지막에** user 삭제
```

기존 테스트 데이터의 삭제는 사용자 승인 범위다. 대상 DB와 참조 관계를 확인하고 연결·삭제 계획을 먼저 dry-run한다. DB 전체 초기화나 연결 관계를 모르는 자동 일괄 삭제로 대체하지 않는다. 실행 단계는 [WO-O4O-AUTH-REFACTOR-V1](../work-orders/WO-O4O-AUTH-REFACTOR-V1.md)을 따른다.

## 17. 소셜 연결 금지

Demo 계정에 Google·카카오 로그인 Identity를 **연결하지 않는다.**
인증 수단은 password credential 하나뿐이다.

## 18. 전체 관리자 정책 · role 허용 범위

```text
platform:* 없음 · admin-dashboard 접근 금지
```

`admin.neture.co.kr`의 관리 주체는 **전체 관리자**라고 부른다. 전체 관리자의 Google 전용 인증 정책을 그대로 따른다.

### 18-1. service-scoped role allowlist (2026-10-02 확정)

Demo 는 **role 을 가진다.** §5 의 "role · membership · ownership 연결" 이 그것이고, 그게 없으면
체험 화면에 들어가지 못한다. 다만 **허용 범위는 아래 세 값으로 고정**한다.

| | role | 쓰는 곳 |
|---|---|---|
| Store Owner Demo | `neture:store_owner` | `isStoreOwner('kpa')` — store-contents · store-playlists 진입 |
| Supplier Demo | `neture:supplier` | web-neture `SupplierRoute` 의 `SUPPLIER_ROLES` |
| Store Staff Demo | `kpa:store_member` | 승인 체험 약국의 활성 `staff` 관계와 함께 직원 접근 |

```text
금지  platform:*  ·  admin  ·  operator  ·  *:admin  ·  *:operator  ·  그 밖의 모든 role
```

**"role 자체를 주지 않는다" 가 아니다.** 체험이 목적이므로 화면 접근 자격은 준다. 대신 그 자격이
운영 권한으로 번지지 않게 **허용값을 좁게 적는다** — Demo 는 공개 credential 을 쓰므로, 역할이
하나 넓어지면 그만큼이 공개된다.

데이터 범위는 **Demo 조직 소유권과 승인된 직원 관계**가 정한다. 직원은 같은 Demo 약국만 사용하며 소유·직원 관리 권한을 받지 않는다. route guard 를 "Demo 니까" 로 우회하지 않는다.

구현 · 계약:

```text
PAUSED   apps/api-server/src/scripts/demo-account-provision.ts
         foundation 신규 생성은 운영 실행 대상 아님; 별도 대상 검토 후 재개
         ALLOWED_DEMO_ROLES = { neture:store_owner, neture:supplier }
         목록 밖 role 은 DB 를 건드리기 전(assertPreconditions)에 거절한다
ACTIVE   apps/api-server/src/scripts/demo-account-reconcile.ts
         기존 경영자/공급자 UUID 유지·고정 credential 정정·직원 registry/관계 + kpa:store_member
         기본 read-only plan·정확한 before-image digest·일괄 transaction·변경 세션 폐기
         등록된 경영자 Demo의 기존 kpa:store_owner만 before-image에 계획하고 비활성화; 삭제·신규 부여 없음
         foundation provision도 registry 주소 불일치 시 쓰기 전 중단; 계정/credential/registry/관계는 같은 transaction
계약     src/scripts/__tests__/demo-account-provision.contract.test.ts ⑦
         allowlist 값 · 실제 부여 role · 금지 prefix · 선행 거절 · INSERT guard 순서를 고정
```

§8 의 server-side 보호(비밀번호 변경 · 삭제 · Google 연결 차단)와 **다른 축**이다. 저쪽은 Demo
계정을 지키는 것이고, 이쪽은 Demo 계정이 **가질 수 있는 권한의 상한**이다.

## 19. 실제 이메일 가입 E2E 와 분리

Demo 계정으로 `/signup` → 확인 메일 → verify → forgot/reset 메일 경로를 검증하지 **않는다.**
필요하면 사용자가 **실제 수신 가능한 본인 주소**로 직접 한다. 영구 QA 메일 계정을 꼭 만들 필요는 없다.

## 20. 기존 Google 사용자의 비밀번호 추가

```text
Google 로그인 → My Home / 계정 설정 → password credential 추가
```

`forgot/reset` 으로 **첫** credential 을 만들지 않는다.
서버 API 는 있고 **UI 는 아직 없다** — 별도 작업으로 연결한다. 개인 공간 명칭은 [My Home 정본](O4O-MY-HOME-CANONICAL-V1.md)을 따른다(2026-10-11 문서 정비). 이 경로 표기는 UI 구현·배포 완료를 뜻하지 않는다.

## 21. Partner / Influencer

legacy Partner 구조는 삭제 상태를 유지한다. 지금 Demo 에 Partner 역할을 만들지 않는다.
Influencer/Partner 기능이 정식 설계되면 **별도 Demo 계정**을 추가한다(체험 + 샘플 데이터 owner 겸임).

## 22. 후속 작업 구분

```text
Demo Account 구축      계정 생성 · role/membership/ownership · relink · 보호 · 로그인 버튼 · 안내
Account Security UI    Google 사용자 첫 비밀번호 추가 · 비밀번호 사용자 변경
별도 후속              다른 서비스 이메일 로그인 UI 확산 · Token Lifecycle Hardening · Influencer/Partner Demo
```

---

*Created: 2026-10-01*

**전환 시 서비스 연결 검증:** 세 Demo 유형 모두 `DEMO_REQUIRED_MEMBERSHIPS`의 필수 가입 상태를 확인한다. 이 map은 foundation provision과 reconcile의 공통 정본이다. 기존 Demo의 누락 연결은 같은 user ID에 생성하며, 기존 pending/suspended/withdrawn 연결을 active로 바꾸지 않는다. 필요한 membership·role 의도는 검토 digest에 포함한다. 로그인 성공만으로 Lecture 등 기능 이용 가능을 판정하지 않는다.

운영 실행 분류는 [API scripts inventory](operations/O4O-API-SERVER-SCRIPTS-INVENTORY-V1.md)가 정본이다. 현재 기존 Demo 전환은 ACTIVE reconcile만 사용한다. foundation은 PAUSED로 유지하며 이 지시로 새 foundation 생성까지 자동 실행하지 않는다.

**단일 업무공간 검증:** 전환 시 기존 런타임 해석기로 승인 약국 후보(owner/admin/manager 포함)와 canonical 공급자 후보를 확인한다. 경영자는 의도한 약국의 owner 후보1개, 공급자는 ACTIVE 후보1개여야 한다. 다른 조직의 관계를 삭제·임의 선택하거나 Demo 역할을 넓혀 복수 컨텍스트를 숨기지 않는다.

**반대 도메인 관계 보호:** 각 유형은 의도한 조직과 역할의 활성 관계만 허용한다. 매장 경영자·직원의 canonical 공급자 관계 또는 legacy supplier pointer, 공급자의 반대 매장 관계가 있으면 공유 credential 적용 전 중단한다. legacy pointer 검사는 기존 supplier resolver 안의 read-only protection probe이며 컨텍스트 선택/권한 부여/로그 식별자 출력은 하지 않는다.

**registry·census:** target user에 비활성 Demo registry가 있으면 plan에서 명확히 중단하고 자동 재활성화/중복 insert하지 않는다. staff가 생성한 user-scoped membership/role/creator 행과 활성 staff 조직 관계는 매장 Demo census에 포함하며 owner/staff가 같은 조직을 가리켜도 행을 중복 집계하지 않는다.
