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

## 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§8-#2 · §8-#3)
