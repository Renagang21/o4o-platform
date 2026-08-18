# CHECK-O4O-SERVICE-MEMBERSHIP-UPSERT-STATUS-PRESERVATION-V1

**대상 WO**: WO-O4O-SERVICE-MEMBERSHIP-UPSERT-STATUS-PRESERVATION-V1
**선행 CHECK**: [`CHECK-O4O-ADMIN-USER-UPSERT-STATUS-PRESERVATION-V1`](CHECK-O4O-ADMIN-USER-UPSERT-STATUS-PRESERVATION-V1.md) §8-#1
**작성일**: 2026-08-14

---

## 0. 요약

**결함 실재 — 수정 완료.** `ensureServiceMemberships()` 가 기존 비-active membership 을
`active` 로 조용히 승격하고 `role` 까지 덮어썼다. 정지·반려·탈퇴·승인대기 회원이
**역할 추가만으로 서비스 접근 권한을 되찾을 수 있었다.**

```text
확립된 계약:  ensure membership existence ≠ approve / reactivate membership

수정 파일:    1 (AdminUserController.ts)
추가 테스트:  9 케이스 (신규 파일 1) — 수정 전 8 FAIL → 수정 후 9 PASS
전체 Jest:    124 suites / 1941 tests PASS
DB/migration: 변경 0 · 운영 데이터 정정 0
```

---

## 1. 결함

`AdminUserController.ensureServiceMemberships()` (수정 전)

```ts
const existing = await smRepo.findOne({ where: { userId, serviceKey } });
if (!existing) {
  await smRepo.save(smRepo.create({ userId, serviceKey, status: 'active', role: roleName }));
} else if (existing.status !== 'active') {
  existing.status = 'active';     // ← 조용한 승격
  existing.role   = roleName;     // ← 가입 역할 덮어쓰기
  await smRepo.save(existing);
}
```

`POST /admin/users` 로 **기존 사용자에게 role 을 추가**하면 이 함수가 호출된다.
그 부수효과로 `pending` / `suspended` / `rejected` / `withdrawn` membership 이 `active` 가 됐다.

**문제의 성격**

| 관점 | 내용 |
|---|---|
| 권한 | `service_memberships.status='active'` 는 서비스 접근 판정의 축이다 (`membership-guard.middleware` · `*-scope.middleware` · `createRequireStoreOwner` 의 `MEMBERSHIP_NOT_ACTIVE` 게이트). 즉 **접근 권한이 되살아난다** |
| 감사 | canonical 승인 경로가 기록하는 `approved_by` · `approved_at` 없이 상태가 바뀌어 **승인 이력이 남지 않는다** |
| 일관성 | 반려 사유(`rejection_reason`)가 남은 채 `active` 가 되어 상태와 사유가 모순된다 |
| 정합 | `active` membership 은 role 을 안 바꾸고 비-active 만 바꿔 **role 갱신이 재활성화의 부수효과**로만 일어났다 |

---

## 2. write 경로 전수조사 (WO §1) — 미조사 0

`service_memberships.status` 를 쓰는 **런타임 경로** 전수. (migration·`__tests__` 제외)

| # | 경로 | 성격 | 판정 |
|---|---|---|---|
| 1 | **`AdminUserController.ensureServiceMemberships`** | **upsert (role/credential 추가의 부수효과)** | **❌ 결함 → 수정** |
| 2 | `MembershipApprovalService.approveMembership` | canonical 승인 (`approved_by`·`approved_at`·role 동기화) | ✅ 정상 |
| 3 | `MembershipApprovalService.rejectMembership` | canonical 반려 (`rejection_reason`) | ✅ 정상 |
| 4 | `MembershipApprovalService.suspendMembership` | canonical 중지 | ✅ 정상 |
| 5 | `MembershipApprovalService.reactivateMembership` | canonical 재활성화 | ✅ 정상 |
| 6 | `MembershipConsoleController` (806·811) | 운영자 콘솔의 명시적 상태 변경 | ✅ 정상 |
| 7 | `auth-register.controller` (216·523) | 신규 가입 → `pending` 생성 | ✅ 정상 |
| 8 | `handoff.controller` (351) | 명시적 `pending` 전환 | ✅ 정상 |
| 9 | `supplier.service` (140·201·371·458) | 공급자 **승인/반려/정지/재활성** 플로우 | ✅ 정상 (명시적 승인 의미) |
| 10 | `partner-contract.service` (760) | 파트너 **계약 승인** 플로우 | ✅ 정상 (명시적 승인 의미) |
| 11 | `glycopharm-member.service` (236) | 명시적 반려 | ✅ 정상 |
| 12 | `BranchJoinController` · `PharmacyHubJoinController` | 서비스 가입 신청 생성 | ✅ 정상 |

> #9·#10 도 기존 membership 을 `active` 로 바꾸지만, **관리자가 공급자·파트너를 승인하는 명시적 플로우**이므로
> "upsert 의 부수효과" 가 아니다. WO 대상이 아니며 변경하지 않았다.

### 2-1. 요청 유형별 계약 (WO §1 구분)

| 유형 | membership 처리 |
|---|---|
| 신규 사용자 생성 | membership 없음 → `active` 생성 (**기존 계약 유지**) |
| 기존 사용자 + 새 서비스 추가 | membership 없음 → `active` 생성 (**기존 계약 유지**) |
| 기존 사용자 + role 추가 | membership 있음 → **status·role 무변경** (수정) |
| credential 생성 | membership 에 **영향 없음** (수정 후 검증) |
| membership 승인/반려/중지/탈퇴 | `MembershipApprovalService` **전용** |

---

## 3. 재현 (WO §2)

수정 전 코드에 대해 테스트를 먼저 작성했고 **8개가 실패**했다 — 결함 재현 성립.

```text
× 기존 pending    → role 추가 → 그대로 유지        (실제: active 로 승격됨)
× 기존 suspended  → role 추가 → 그대로 유지        (실제: active 로 승격됨)
× 기존 rejected   → role 추가 → 그대로 유지        (실제: active 로 승격됨)
× 기존 withdrawn  → role 추가 → 그대로 유지        (실제: active 로 승격됨)
× 기존 membership 의 role 도 덮어쓰지 않는다        (실제: roleName 으로 덮어씀)
× credential 생성과 membership 승인 분리
× (membershipPolicy 응답 필드 부재)
√ 신규 사용자 → membership active 로 생성           (기존 계약은 이미 정상)
```

---

## 4. 수정 (WO §3)

### 4-1. 동작

```ts
if (!existing) {
  // 없을 때만 생성 (기존 계약 유지)
  await smRepo.save(smRepo.create({ userId, serviceKey, status: 'active', role: roleName }));
  created += 1;
} else {
  // 기존 membership 은 status·role 모두 건드리지 않는다.
  // 재활성화가 필요하면 명시적 승인/reactivate 경로를 쓴다.
  kept += 1;
}
```

### 4-2. 조용한 동작 금지 — `membershipPolicy` 응답 추가

기존 `credentialPolicy` 패턴과 동일하게, membership 에 무슨 일이 있었는지 응답에 명시한다.
관리자가 "역할은 줬는데 이 사용자가 아직 그 서비스를 못 쓴다" 는 사실을 알 수 있어야 하기 때문이다.

| 값 | 의미 |
|---|---|
| `CREATED` | membership 이 없어 새로 만들었다 (`status='active'`) |
| `KEEP_EXISTING_STATUS` | 기존 membership 을 그대로 두었다 (status·role 무변경) |
| `MIXED` | 여러 서비스가 섞였다 (일부 생성 · 일부 보존) |
| `NOT_APPLICABLE` | prefixed role 이 없어 membership 대상이 아니다 |

신규 사용자 응답(201)과 기존 사용자 응답(200) 양쪽에 실었다.

### 4-3. 변경하지 않은 것

- `ServiceMembership` 엔티티 · 스키마 · status enum (**Core Freeze `WO-O4O-CORE-FREEZE-V1` 준수**)
- `MembershipApprovalService` 의 승인/반려/중지/재활성 계약
- 공급자·파트너 승인 플로우(§2 #9·#10)
- 신규 사용자 / 신규 서비스 가입의 초기 `active` 생성 계약
- 운영 데이터 (일괄 정정 0)

---

## 5. 검증 (WO §8)

| 항목 | 결과 |
|---|:---:|
| `apps/api-server` `tsc --noEmit` | **PASS** (exit 0) |
| 신규 membership 보존 테스트 | 수정 전 **8 FAIL** → 수정 후 **9/9 PASS** |
| 선행 WO 의 user-global status 테스트 | **7/7 PASS** (회귀 0) |
| AdminUserController 관련 Jest 전체 | **PASS** |
| **전체 api-server Jest** | **124 suites / 1941 tests PASS** |

### 5-1. 고정한 계약 (테스트 9 케이스)

```text
기존 active     → role 추가 → active 유지        · save 호출 0회
기존 pending    → role 추가 → pending 유지       · save 호출 0회
기존 suspended  → role 추가 → suspended 유지     · save 호출 0회
기존 rejected   → role 추가 → rejected 유지      · save 호출 0회
기존 withdrawn  → role 추가 → withdrawn 유지     · save 호출 0회
기존 membership → role 덮어쓰지 않음
membership 없음(기존 사용자) → active 생성 · membershipPolicy=CREATED
membership 없음(신규 사용자) → active 생성 (기존 계약 유지)
credential 신규 생성 → 기존 suspended membership 무변경 (credential 과 승인 분리)
```

---

## 6. 프로덕션 영향 (read-only)

WO §8 에 따라 프로덕션은 **read-only 확인만** 했다.

```text
service_memberships 상태 분포:  active 37 · rejected 1   (전체 38)
비-active membership:          pharmacy-hub / rejected / 1행
  그중 active role_assignments 보유 사용자: 0명
```

- 현재 노출 규모는 **1행**이며, 그 사용자는 active role 이 없어 실제로 승격된 이력은 확인되지 않는다.
- 즉 **운영 피해는 아직 발생하지 않았고**, 관리자가 그 회원에게 role 을 추가하는 순간 발생할 수 있었다.
- **운영 데이터 정정은 하지 않았다** (WO 금지). 기존 `rejected` 1행은 그대로 둔다.

### 6-1. 프로덕션 동작 smoke — 배포 후로 미룸 (정직 기록)

수정은 **아직 배포되지 않았다**. 지금 프로덕션에 `POST /admin/users` 를 쳐도 **구버전 동작**을 볼 뿐이다.
결함 재현은 실제 컨트롤러 코드에 대한 단위 테스트(수정 전 8 FAIL)로 이미 결정적으로 성립했으므로,
프로덕션 동작 확인은 **배포 후 후속 항목**으로 남긴다.

> 검증용 membership 을 일부러 비-active 로 바꿔 구버전 동작을 프로덕션에서 재현하는 것은
> 불필요한 운영 write 라 수행하지 않았다.

---

## 7. 완료 기준 대조 (WO §9 상당)

```text
user-global status 불변                                   ✅ (선행 WO 테스트 7/7 유지)
타 서비스 membership 불변                                  ✅ (서비스별 독립 처리 · 테스트)
credential 추가만으로 membership 승인되지 않음              ✅ (전용 테스트 케이스)
role 추가만으로 suspended/rejected 회원 로그인 가능해지지 않음 ✅ (4개 상태 전부 보존 확인)
신규 사용자 / 신규 서비스 가입 기존 계약 유지                ✅ (CREATED 경로 불변)
DB migration/schema 변경 없음                              ✅
운영 데이터 일괄 정정 없음                                  ✅
typecheck + Jest                                          ✅ (1941 tests)
```

---

## 8. 후속

| # | 내용 | 성격 |
|---|---|---|
| 1 | 배포 후 프로덕션에서 `membershipPolicy=KEEP_EXISTING_STATUS` 동작 확인 (§6-1) | 검증 |
| 2 | `users` 의 `updated_at` / `updatedAt` 이중 컬럼 정합화 — 별도 schema/technical-debt 작업 | 기술 부채 |
| 3 | 운영자 콘솔 UI 가 `membershipPolicy` 를 노출하면 "역할은 부여됐으나 서비스 미승인" 상태를 관리자가 즉시 인지할 수 있다 | UX(선택) |

---

## 9. DB / migration / 코드 변경

| 구분 | 내용 |
|---|---|
| **런타임 코드** | `AdminUserController.ts` 1파일 — `ensureServiceMemberships` 보존 로직 + `membershipPolicy` 응답 |
| **테스트** | 신규 1파일 (9 케이스) |
| **DB write** | **없음** (프로덕션 read-only 확인만) |
| **migration / schema** | **변경 0** — Core Entity `ServiceMembership` 무변경 |

---

---

# 2차 — read / guard 축 (2026-08-18)

> 1차(위 §0~§9, commit `ce8b244c7`)는 **write 축**을 마감했다.
> 확장 WO 는 여기에 **read/guard 축**을 추가했다: *"write 가 status 를 보존하더라도
> read/guard 가 non-active membership 을 통과시키면 완료가 아니다."*
> 기준 commit: `d552e9037` (origin/main).

## A. ensure 호출자 전수 (WO §2-A) — 미조사 0

`ensureServiceMemberships` 의 런타임 호출자는 **2곳뿐**이다 (나머지 참조는 migration 주석).

| # | 호출자 | 입력 | 기존 membership | 기존 status | write | status 변경 |
|---|---|---|---|---|:---:|:---:|
| 1 | `AdminUserController` L430 — 기존 사용자 + role/credential 추가 | `existingUser.id`, `rolesToAssign` | 있음 | 임의 | **없음** (`kept`) | **없음** |
| 2 | 〃 | 〃 | 없음 | — | INSERT (`status='active'`) | 생성 (기존 계약) |
| 3 | `AdminUserController` L530 — 신규 사용자 생성 | `saved.id`, `rolesToAssign` | 없음 | — | INSERT (`status='active'`) | 생성 (기존 계약) |

- 신규 가입(`auth-register`) · handoff · 공급자/파트너/분회/Pharmacy-Hub 가입은 **이 helper 를 쓰지 않고** 각자 생성 경로를 갖는다 (§B).
- credential 발급·재설정 경로에는 membership write 가 없다 (1차 테스트로 고정).
- operator/member provisioning(`operator-registration.service`, `PharmacyHubStoreProvisioningService`, `pharmacy-hub-store-subject-provisioning.ts`)은 **명시적 승인 또는 read-only** 이며 upsert 부수효과가 없다.

## B. WRITE 전수 보강 (WO §2-B)

1차 표(12경로)에 이번 재조사에서 확인한 6경로를 추가한다. **모두 명시적 승인/반려 또는 status 미변경**이다.

| # | 경로 | 분류 | 판정 |
|---|---|---|---|
| 13 | `routes/kpa/controllers/member.controller.ts:669` | APPROVE (`WHERE status='pending'` 멱등 가드) | ✅ 정상 |
| 14 | `routes/glycopharm/controllers/admin.controller.ts:421` | APPROVE (application 승인 UPSERT) | ✅ 정상 — 관리자 승인 액션 |
| 15 | `modules/neture/services/operator-registration.service.ts:122` | APPROVE (`status IN ('pending','rejected')`) | ✅ 정상 |
| 16 | 〃 `:277` | REJECT (`WHERE status='pending'`) | ✅ 정상 |
| 17 | 〃 `:300` | OTHER — `operator_notes` 만, status 미변경 | ✅ 정상 |
| 18 | `MembershipConsoleController:1097` | OTHER — `role` 만, status 미변경 | ✅ 정상 |

> #14 는 `ON CONFLICT DO UPDATE SET status='active'` 라 기존 suspended/withdrawn 도 되살린다.
> 다만 **관리자가 매장 신청을 승인하는 endpoint** 이므로 WO §4 의 "명시적 approve 경로" 예외에 해당한다. 변경하지 않았다.

## C. READ / guard 전수 (WO §2-C) — 미조사 0

| # | 축 | 위치 | 판정 기준 | 결과 |
|---|---|---|---|:---:|
| 1 | serviceKey 로그인 | `auth-login.service.ts:169` | membership **존재만** 확인 (status 미판정) | **의도적 예외 — 근거 있음** |
| 2 | 계정 상태 게이트 | `common/auth/account-access.policy.ts` | `users.status` → normal/restricted/blocked | ✅ (membership 축과 별개) |
| 3 | backend membership guard | `common/middleware/membership-guard.middleware.ts:107` | `status !== 'active'` → 403 `MEMBERSHIP_NOT_ACTIVE` | ✅ |
| 4 | 서비스 scope guard 전량 | kpa · neture · glycopharm · cosmetics · pharmacy-hub · kpa-branch · lms · service-legal | 전부 `createMembershipScopeGuard` 경유 (raw `createServiceScopeGuard` 직접 사용 **0건**) | ✅ |
| 5 | 커뮤니티 진입 | `routes/forum/service-forum.routes.ts:63` | `status !== 'active'` → 403 | ✅ |
| 6 | 매장 진입 (serviceKey 지정) | `utils/store-owner.utils.ts:168` | `status !== 'active'` → 403 | ✅ |
| 7 | **매장 진입 (back-compat · serviceKey 미지정)** | 〃 | **membership 검증을 건너뜀** | **❌ 결함 → 수정** |
| 8 | handoff 토큰 | `handoff.controller.ts:62·191` | 생성·교환 **양쪽** active 재검증 | ✅ |
| 9 | JWT memberships 생산 | `auth-context.helper.freshenUserContext` · `refresh-token.service:135` | 매 토큰 발급 시 DB 재조회 | ✅ |
| 10 | frontend gate (KPA/Neture/GlycoPharm/K-Cos/PH) | `packages/auth-utils/src/membershipGate.ts` | `active` 만 허용, 알 수 없는 값은 `'none'` fallback(차단측) | ✅ |
| 11 | Pharmacy-Hub 매장 provisioning/대시보드 | `PharmacyHubStoreProvisioningService:232` · `PharmacyHubStoreDashboardController:152` | `status !== 'active'` → 거부 / 상태 표기 | ✅ |
| 12 | 서비스 카탈로그 목록 | `routes/platform-services/*` | status 를 **표시**만 (진입 판정 아님) | ✅ |

### C-1. #1 (로그인) 은 왜 예외인가 — 추정이 아니라 문서 근거

[`IR-O4O-NEW-USER-SERVICE-REJECTION-LOGIN-POLICY-V1`](../investigations/IR-O4O-NEW-USER-SERVICE-REJECTION-LOGIN-POLICY-V1.md) 이
**B안(제한 로그인) 확정**으로 판정했다. 같은 IR §10-④ 가 *"한 서비스 active + 다른 서비스 suspended/rejected → 로그인 정상,
각 서비스 scope guard 가 독립 판정"* 을 명시한다. 즉 **로그인 허용 ≠ 서비스 진입 허용**이며 본 WO §5 의 차단 계약은
route 진입 축(#3~#7)에서 성립한다. 이 축은 본 WO 에서 변경하지 않았다.

```text
로그인 자체       : membership 존재하면 허용 (status 무관) — IR B안
제한 세션         : users.status='pending' → accountAccess='restricted' (allowlist route 만)
실제 route 진입   : service_memberships.status='active' 필수 (#3~#7) ← 본 WO 의 계약
```

## D. 결함 #7 — back-compat 매장 guard 의 membership 우회

`createRequireStoreOwner(dataSource)` 를 **serviceKey 없이** 호출하는 6곳은 membership 검증을 통째로 건너뛰었다.
`role_assignments` 의 `*:store_owner` role 만 있으면 `suspended` / `rejected` / `withdrawn` 회원도 통과한다.

```text
modules/store/store-library.routes.ts:32
modules/store-ai/controllers/store-ai.controller.ts:29
modules/store-ai/controllers/product-ai-recommendation.controller.ts:17
routes/o4o-store/controllers/store-product-library.controller.ts:81
routes/o4o-store/controllers/store-product-request.controller.ts:190
routes/platform/store-tablet.routes.ts:247
```

**수정**: back-compat 경로에 `active membership 최소 1개` 를 요구한다 (fail-closed).
이 경로는 조직 해석이 서비스 중립이라 "어느 서비스 membership 인지" 를 결정할 수 없으므로
서비스 단위 판정 대신 최소 조건을 건다. 서비스 단위 정밀 판정은 호출부에 `serviceKey` 를 넘기는
기존 점진 마이그레이션으로 계속 해소한다 (본 WO 에서 호출부는 변경하지 않았다 — 범위 밖).

### D-1. 재현

`src/utils/store-owner.utils.ts` 를 stash 한 상태에서 신규 테스트 실행 → **5 FAIL**. 수정 적용 후 **19 PASS**.

## E. 재현 6종 (WO §3)

write 축 6종은 1차에서 이미 테스트로 고정되어 있다 (`AdminUserController.membershipStatusPreservation.test.ts` 9 케이스).
재실행 결과 **9/9 PASS** — 회귀 없음. 본 2차에서는 read 축 재현을 추가했다 (§D-1).

| 케이스 | 기대 | 결과 |
|---|---|:---:|
| 기존 active + role/credential ensure | active 유지 | ✅ |
| 기존 pending 〃 | pending 유지 | ✅ |
| 기존 suspended 〃 | suspended 유지 | ✅ |
| 기존 rejected 〃 | rejected 유지 | ✅ |
| 기존 withdrawn 〃 | withdrawn 유지 (재가입 정책 판단 없음) | ✅ |
| membership 없음 + 신규 서비스 | `active` 생성 (기존 canonical 계약) | ✅ |

## F. 수정 내역

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/utils/store-owner.utils.ts` | back-compat 경로 membership 검증 추가 (+29/-1) |
| `apps/api-server/src/common/middleware/__tests__/membership-read-guard.contract.test.ts` | 신규 — read/guard 계약 19 케이스 |

- 런타임 write 로직 변경 **0** (1차에서 이미 마감).
- API contract 변경 없음 — 기존 403 응답 코드(`MEMBERSHIP_NOT_FOUND` / `MEMBERSHIP_NOT_ACTIVE`)를 그대로 쓴다.
- migration / schema / 운영 데이터 변경 **0**.

## G. 검증

| 항목 | 결과 |
|---|:---:|
| `apps/api-server` `tsc --noEmit` | **PASS** (exit 0 · 오류 0) |
| 신규 read/guard 계약 테스트 | 수정 전 **5 FAIL** → 수정 후 **19/19 PASS** |
| 1차 membership 보존 테스트 | **9/9 PASS** |
| **전체 api-server Jest** | **126 suites / 1965 tests PASS** |

### G-1. 프로덕션 영향 (read-only · write 0)

```text
service_memberships 상태 분포        : active 37 · rejected 1
prefixed *:store_owner role 보유자    : 9명 — 전원 active membership 보유 → 이번 강화의 차단 대상 0명
active membership 없는 store_owner    : 1명, 그러나 legacy 무prefix 'store_owner' 만 보유
                                       → ALL_STORE_OWNER_ROLES(prefixed 전용)에 포함되지 않아 원래도 통과 불가
```

즉 **이번 guard 강화로 접근을 잃는 실사용자는 0명**이며, 구조적 우회 경로만 닫혔다.
운영 데이터는 조회만 했고 UPDATE/DELETE 는 수행하지 않았다.

### G-2. 계정 smoke — 미수행 (정직 기록)

WO §8 의 "안전한 테스트 계정 smoke" 는 수행하지 않았다. 프로덕션에서 membership 을 `pending`/`suspended`/`rejected`
로 바꿔야 재현되는데, 그것은 **운영 데이터 write** 이고 WO §6 이 금지한다. 대신 결함을 미들웨어 실제 코드에 대한
단위 테스트(수정 전 5 FAIL)로 결정적으로 재현했다. 배포 후 동작 확인은 후속 항목이다.

## H. 잔존 위험

| # | 내용 | 성격 |
|---|---|---|
| 1 | JWT `memberships` 는 access token 발급 시점 스냅샷이다 (TTL **15분**). 승인 취소·정지 직후 최대 15분간 기존 토큰이 통과할 수 있다. refresh 시 DB 재조회로 해소된다 | 설계상 허용 — 즉시 무효화가 필요하면 별도 WO |
| 2 | back-compat 매장 경로 6곳은 여전히 "서비스 중립" 판정이다. 한 서비스만 active 인 사용자가 서비스 중립 store 라우트에 진입할 수 있다 (조직 해석이 서비스 중립이라 현 구조에서 정밀 판정 불가) | 점진 마이그레이션 대상 |
| 3 | `glycopharm/admin.controller:421` 의 승인 UPSERT 는 suspended/withdrawn 도 active 로 되살린다 (관리자 승인 액션이라 허용) | 정책 확인 완료 |
| 4 | `withdrawn` 재가입 정책은 canonical 근거가 없어 판단하지 않았다 (WO §7 준수 — 보존만) | 미결 |

## I. 완료 기준 대조 (WO §9)

```text
ensure 호출자 미조사 0            ✅ (§A · 런타임 호출자 2곳)
status WRITE 미조사 0             ✅ (1차 12 + 2차 6 = 18경로)
status READ 미조사 0              ✅ (§C · 12축)
무단 active 승격 0                ✅ (1차)
role 추가로 승인 0                ✅ (1차 테스트)
credential 추가로 승인 0          ✅ (1차 테스트)
타 서비스 membership 변화 0       ✅
non-active guard 우회 0           ✅ (§D 수정 후)
신규 생성 계약 유지               ✅
typecheck · Jest PASS             ✅ (126 suites / 1965 tests)
DB / migration 변경 0             ✅
```

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§8-#2 · §8-#3)

**2차 문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (§H-#2 back-compat 매장 경로 serviceKey 마이그레이션)
