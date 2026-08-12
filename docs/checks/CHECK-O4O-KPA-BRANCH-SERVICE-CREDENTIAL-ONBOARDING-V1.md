# CHECK-O4O-KPA-BRANCH-SERVICE-CREDENTIAL-ONBOARDING-V1

- **WO**: `WO-O4O-KPA-BRANCH-SERVICE-CREDENTIAL-ONBOARDING-V1` — kpa-branch 로그인 계약 완결
- **일자**: 2026-08-12
- **판정**: **PASS** (필수 검증 8 중 6 런타임 PASS · 2 구조 확인 · 미실행 1건 명시)
- **commit**: `693be706f` (구현) · 본 문서(CHECK)
- **환경**: 프로덕션 (`https://api.neture.co.kr`, Cloud Run `o4o-core-api`, DB `o4o_platform`)

---

## 1. 401 원인

`serviceKey:'kpa-branch'` 로그인이 401 이던 이유는 인증 구조 결함이 아니라 **온보딩 경로 부재**였다.

- `auth-login.service.ts` 는 (1) `service_memberships` 존재 게이트 → (2) `service_credentials.password_hash ?? users.password` dual-read 순으로 동작한다. 이 경로는 이미 service-agnostic 이다.
- 그러나 kpa-branch 에는 **`service_memberships` + `service_credentials` 쌍을 만드는 write 경로가 하나도 없었다.**
  - `kpa-branch` 는 공통 handoff join 이 `joinEnabled:false` 로 막혀 있었고, 열려 있었더라도 handoff join 은 membership 만 만들고 credential 은 만들지 않는다.
  - `BranchMembershipService.join` 은 `branch_memberships`(분회 소속 축) 만 쓴다. 서비스 접근 축이 아니다.
- 그 결과 이전 smoke 에서 raw SQL 로 넣은 membership 은 role prefix 도 없고 credential 도 없어, 로그인이 `users.password` fallback 으로 흘렀다.

## 2. 재사용한 Identity V2 경로 (신규 인증 구조 없음)

`AuthRegisterController.register` 가 **유일한 canonical credential 생성 지점**이다. 두 분기(신규 사용자 / 기존 사용자) 모두 같은 트랜잭션 안에서
`service_memberships`(pending) + `service_credentials` upsert(`['userId','serviceKey']`) 를 함께 만든다.

kpa-branch 는 pharmacy-hub 선례와 동일한 **thin per-service join wrapper** 로 이 경로에 연결했다.

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/controllers/kpa-branch/BranchJoinController.ts` (신규) | 입력 검증 + 중복 membership 409 선판정 후 `AuthRegisterController.register` 위임 (`service:'kpa-branch'`, `role:'member'`). `branch_memberships` 를 쓰지 않는다. |
| `apps/api-server/src/controllers/kpa-branch/BranchServiceMembershipController.ts` (신규) | `MembershipApprovalService` 위임 승인/반려. `SCOPE_SERVICE_KEYS=['kpa-branch']`, `isPlatformAdmin:false`. 목록에 `hasServiceCredential` 노출. |
| `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts` (수정) | kpa-branch 가입 역할을 `member` 로 제한 + membership role 을 `kpa-branch:member` 로 prefix (승인 시 `resolveGrantedRole` 이 role 을 그대로 부여하므로 가입 시점에 저장해야 한다). |
| `apps/api-server/src/routes/kpa-branch/kpa-branch.routes.ts` (수정) | `POST /join`, `GET /join/status`, `GET|PATCH /admin/service-members*` 등록. |

## 3. credential 생성 시점

**서비스 가입 신청 시점**(register 트랜잭션)이다. 승인 시점이 아니다. 승인은 `service_memberships.status` 와 `role_assignments` 만 다룬다.
따라서 "가입은 했는데 비밀번호가 없다" 상태가 신규 경로에서는 발생하지 않는다.

## 4. 기존 사용자 처리 (광범위 backfill 없음)

- `users.password` 일괄 복사식 backfill 은 수행하지 않았다 (Phase 1 G-B No Backfill 유지).
- membership 은 있으나 credential 이 없는 사용자는 `POST /api/v1/auth/forgot-password` (`serviceKey:'kpa-branch'`) 로 **본인이 해당 서비스 비밀번호를 설정**한다. 재설정 write 경로가 `service_credentials` upsert 이므로 축이 유지된다.
- 운영 콘솔에서 이 대상을 식별할 수 있도록 `/admin/service-members` 목록에 `hasServiceCredential` 을 노출했다.
- **잔여 제약**: 재설정 메일 링크는 `getServiceOrigin('kpa-branch')=https://branch.kpa-society.co.kr` 를 가리키는데 이 도메인이 아직 연결되지 않았다. 후속 "공용 도메인 연결" WO 에서 해소한다.

## 5. 필수 검증 결과

| # | 항목 | 결과 | 근거 |
|:--:|---|:--:|---|
| ① | `serviceKey:'kpa-branch'` 정상 로그인 | **PASS** | `POST /kpa-branch/join` 201(`existingAccount:true`,`pendingApproval:true`) → membership `9e685362…` status `pending` role `kpa-branch:member` + credential 생성. 서비스 비밀번호 로그인 **200**, 플랫폼 비밀번호 로그인 **401** (credential 경로 확정, fallback 아님) |
| ② | 동일 사용자의 다른 서비스 로그인 회귀 없음 | **PASS** | kpa-society / neture / glycopharm / pharmacy-hub 기존 비밀번호 **200** |
| ③ | kpa-branch 비밀번호 변경 후 타 서비스 불변 | **PASS** | `PUT /users/password` (`serviceKey:'kpa-branch'`) 200 → 새 비밀번호 200 / 직전 branch 비밀번호 401, 동시에 타 서비스 4종(renagang21) + 4종(sohae2100) 모두 **200**. 해당 사용자 다른 credential 5건 미변경 |
| ④ | service membership 없는 사용자 차단 | **PASS** | `sohae2100@gmail.com`(활성·유효 비밀번호·platform 권한 보유) kpa-branch 로그인 **401 `SERVICE_NOT_MEMBER`**, 동일 계정 kpa-society **200**. platform 권한도 로그인 게이트를 우회하지 않음 |
| ⑤ | branch membership 만 있고 service membership 없음 → 서비스 접근 불가 | **PASS (구조)** | 로그인 게이트는 `service_memberships` 만 조회하며 `BranchMembershipService.join` 은 `branch_memberships` 만 write 한다. ④ 가 게이트 실동작을 실증. 전용 fixture 는 만들지 않음(운영 DB write 최소화) |
| ⑥ | service membership 만 있고 branch membership 없음 | **PASS** | 로그인 200 · `GET /me/branch` → `200 {data:null}` · `GET /branches/namgu/operator/site` → **403** |
| ⑦ | branch operator 비밀번호 변경 권한이 자기 서비스로 닫힘 | **PASS** | `GET /api/v1/operator/members` → **403 `ROLE_REQUIRED`**. allow-list(`platform:super_admin`,`neture:*`,`glycopharm:*`,`cosmetics:*`,`kpa:*`)에 `kpa-branch:*` 없음 |
| ⑧ | KPA Society / Neture / GlycoPharm / K-Cosmetics 회귀 없음 | **PASS** | 비밀번호 변경 전·후 및 fixture 정리 후 로그인 매트릭스 전부 200 |

**미실행 1건**: `/admin/service-members` 승인 PATCH 의 런타임 확인. 현재 `kpa-branch:admin` 보유 계정이 없고, `platform:super_admin` 계정(`renariver21@gmail.com`, `super-admin@o4o.com`)의 비밀번호가 `docs/local/TEST-ACCOUNTS.local.md` 에 없다. 승인 로직은 기존 `MembershipApprovalService` 를 그대로 위임하므로 신규 로직이 아니며, 첫 실운영 분회 운영자 지정 시 확인한다.

## 6. fixture 정리

### 6-1. 직전 WO smoke fixture (사용자 승인 하에 삭제)

삭제 전 → `service_memberships` 2 (`d0fadeca…`/`33bb009c…`) · `role_assignments` 4 (`9d7cf021`,`c5feafc5`,`7d0549f5`,`33d8a911`) · `branch_memberships` 6 (`61874313`,`20e234ec`,`1acc81d2`,`ad9c758b`,`70e466b3`,`8853b5e7`) · `branch_sites` 1 (`5f09caee…`) · `branch_posts` 1 (`28896386…`) · `branch_domains` 0 · kpa-branch credential 0.
트랜잭션 결과 `DELETE 1 / 1 / 6 / 4 / 2` → COMMIT. 삭제 후 전부 0. `kpa_organizations type='group'` **209 유지**(namgu·donggu 무손상), 사용자 계정 3건 무손상.

### 6-2. 본 검증 fixture (삭제 완료)

삭제 전: `service_memberships` `9e685362-b921-419f-b6c0-4a4012e1aab6`(user `6967ebe0…`, `pending`, `kpa-branch:member`) 1건, `service_credentials(kpa-branch)` 1건, `branch_memberships` 0, `role_assignments LIKE 'kpa-branch%'` 0.
`DELETE 1 / 1` → COMMIT. 삭제 후: kpa-branch membership 0 · credential 0. 해당 사용자의 다른 credential 5건(glycopharm·k-cosmetics·kpa-society·neture·pharmacy-hub) 및 `users.status='active'` 무변경.
정리 후 재확인: kpa-branch 로그인 401 `SERVICE_NOT_MEMBER`, 타 서비스 4종 200.

## 7. 축 분리 확인

`users`(Identity) / `service_memberships`(서비스 접근) / `service_credentials`(서비스 비밀번호) / `branch_memberships`(분회 소속) 4축을 혼합하지 않았다.
가입 경로는 앞 3축만 쓰고 `branch_memberships` 는 0 을 유지했다. 분회별 serviceKey·분회별 credential namespace 는 만들지 않았다.

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(공용 도메인 연결 — 재설정 메일 링크 해소).
