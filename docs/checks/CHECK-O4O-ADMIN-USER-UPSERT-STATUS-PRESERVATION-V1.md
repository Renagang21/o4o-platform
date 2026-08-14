# CHECK-O4O-ADMIN-USER-UPSERT-STATUS-PRESERVATION-V1

**대상 WO**: WO-O4O-ADMIN-USER-UPSERT-STATUS-PRESERVATION-V1
**작성일**: 2026-08-14
**결론**: **제거할 결함이 없다.** 조사·재현 결과 `POST /admin/users` 는 기존 사용자의 계정 상태를 바꾸지 않는다.
WO 의 전제가 된 선행 보고가 **오귀속**이었다. 계약을 고정하는 **회귀 테스트만 추가**했다.

---

## 0. 요약

```text
기존 사용자 status 무단 변경:   0건 (코드 census + 실 API 재현으로 확인)
수정한 코드:                   0
추가한 회귀 테스트:             7 케이스 (신규 파일 1)
전체 api-server Jest:          123 suites / 1932 tests PASS
```

---

## 1. 원인 — 선행 보고의 오귀속 (정정)

### 1-1. 무엇이 틀렸나

선행 CHECK [`…KPA-STORE-ORGANIZATION-ENROLLMENT-BACKFILL…-V1`](CHECK-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-BACKFILL-AND-PRODUCTION-VERIFY-V1.md) §9-#2 에
다음과 같이 기록했다.

> `POST /api/v1/admin/users` 를 **기존 사용자**에게 호출하면 `status` 가 `approved` 로 되돌아간다

**이 진술은 사실이 아니다.** 본 WO 에서 재현을 시도했으나 재현되지 않았고, 코드에도 그런 경로가 없다.

### 1-2. 실제 원인 2가지

**(a) 관측 오류 — 잘못된 타임스탬프 컬럼을 읽었다**

`users` 테이블에는 `updated_at` 과 `updatedAt` 이 **둘 다** 존재한다.

```text
users 컬럼: status, isActive, updated_at, updatedAt
```

TypeORM `@UpdateDateColumn` 은 `updatedAt`(camelCase) 이다. 선행 조사에서 `updated_at`(snake) 을 읽었고
그 값이 계정 생성 시각에 멈춰 있어 **"status 변경이 기록되지 않았다"** 고 오판했다.
그 오판 위에 "그렇다면 POST 가 되돌린 것" 이라는 잘못된 인과를 세웠다.

**(b) 실제로 상태를 바꾼 것은 나 자신의 명시적 호출이었다**

해당 세션에서 `PATCH /admin/users/:id/status {"status":"approved"}` 를 **운영자 API 검증을 위해 직접 호출**했다.
계정이 active 였던 것은 그 호출의 정상 결과이지 `POST /admin/users` 의 부작용이 아니다.

---

## 2. write 경로 전수조사 (WO §1) — 미조사 0

`users.status` / `users.isActive` 를 쓰는 **런타임 코드**(migration·script 제외) 전수.

| # | 경로 | 위치 | 상태 write | 가드 |
|---|---|---|:---:|---|
| 1 | `PATCH /admin/users/:id/status` | `AdminUserController:649` | ✅ | **명시 전용 endpoint** (canonical) |
| 2 | `PUT /admin/users/:id` | `AdminUserController:613-614` | ✅ | `if (status !== undefined)` · `if (isActive !== undefined)` — 미전달 시 무변경 |
| 3 | `UserManagementController.update` | `:222` | ✅ | `if (status)` — 미전달 시 무변경 |
| 4 | `auth/services/user.service.ts` | `:133-135` | ✅ | 명시적 상태 변경 서비스 |
| 5 | `UserRepository.approve/reject` | `:109 :137 :162 :195` | ✅ | 명시적 승인/반려 플로우 |
| 6 | `admin/platform-accounts.routes.ts` | `:173` | ✅(isActive) | 명시적 플랫폼 계정 활성 토글 |
| 7 | `scripts/create-admin-user.ts` · `diagnose-admin-login.ts` | — | ✅ | CLI 스크립트 (API 아님) |
| **8** | **`POST /admin/users` (createUser) 기존 사용자 분기** | `AdminUserController:371-431` | **❌ 없음** | **users 행을 아예 저장하지 않는다** |

### 2-1. 요청 유형별 계약 구분 (WO §1)

| 유형 | 처리 | user-global status |
|---|---|---|
| 신규 user 생성 | `txUserRepo.save(created)` — `status`/`isActive` 를 body 값(기본 `approved`/`true`)으로 설정 | **설정** (기존 계약 유지) |
| 기존 user 에 service membership 추가 | `ensureServiceMemberships()` → `service_memberships` 만 write | **무변경** |
| 기존 user 에 role 추가 | `roleAssignmentService.assignRole()` → `role_assignments` 만 write | **무변경** |
| 기존 user profile 수정 | `PUT /admin/users/:id` (별도 endpoint) | 명시 전달 시에만 |
| 명시적 status 변경 | `PATCH /admin/users/:id/status` | **설정** (전용 계약) |

`createUser` 기존 사용자 분기의 트랜잭션은 `roleAssignmentService.assignRole` ·
`ensureServiceMemberships` · `ServiceCredential.insert` **3가지만** 수행하고 `User` repository 에는
접근하지 않는다. 응답의 `user` 는 조회해 온 `existingUser` 를 그대로 직렬화한 값이다.

---

## 3. 재현 시도 (WO §2) — 재현되지 않음

프로덕션에서 검증 전용 계정(`suspended`)으로 실측했다.

```text
BEFORE   status=suspended  isActive=t  updatedAt=2026-08-14 12:42:12.656855
호출     POST /api/v1/admin/users   (기존 사용자 · body 에 status 없음 · roles=['kpa:store_owner'])
응답     success=true  isExistingUser=true  user.status=suspended
AFTER    status=suspended  isActive=t  updatedAt=2026-08-14 12:42:12.656855   ← 완전 동일
```

**status 불변 · isActive 불변 · updatedAt 불변** → 결함 없음.

---

## 4. 인접 상태 동시 확인 (WO §5)

`POST /admin/users` 로 기존 사용자에게 role 을 추가한 전후의 전체 스냅샷을 `diff` 했다.

| 확인 항목 | 결과 |
|---|:---:|
| `users.status` | 불변 (`suspended`) |
| `users.isActive` | 불변 |
| `users.updatedAt` (approval/status timestamp) | **불변** |
| `service_memberships.status` ×4 | 불변 (전부 `active`) |
| `role_assignments.is_active` ×5 | 불변 (전부 `true`) |
| `service_credentials` ×4 | 불변 (`KEEP_EXISTING_CREDENTIAL`) |
| login lock 상태 | 불변 (§6) |

```text
diff BEFORE AFTER → 변화 없음
```

**user-global 상태와 service-scoped 상태가 섞이지 않음을 확인했다.**

### 4-1. 부수 관찰 — service-scoped 재활성화 (범위 밖)

`ensureServiceMemberships()` 는 기존 membership 이 `active` 가 아니면 **`active` 로 되돌린다**
(`AdminUserController:184-187`). 이는 **service-scoped** 상태이며 user-global status 와 무관하다.
다만 "정지된 membership 이 role 추가만으로 되살아난다" 는 성질은 동일 계열의 논점이다.

- 이번 검증 계정의 membership 은 4건 모두 이미 `active` 라 **실제 변화는 없었다**(§4 diff).
- WO §7 이 membership 정책 변경을 금지하므로 **고치지 않았다.** §8 에 후속 항목으로 기록한다.

---

## 5. 회귀 테스트 (WO §2·§9)

`apps/api-server/src/controllers/admin/__tests__/AdminUserController.statusPreservation.test.ts` **신규**.
DB 없이 repository/트랜잭션 stub 으로 계약을 고정한다.

| 케이스 | 검증 |
|---|---|
| **A-1** 기존 suspended + role 추가 | User repository `save`/`insert` **호출 0회** |
| **A-2** 기존 suspended | 응답 `user.status='suspended'` · `isActive=false` |
| **A-3** body 에 `status:'approved'`, `isActive:true` 를 실어도 | 기존 사용자 상태 **불변** (상태 변경은 PATCH 전용) |
| **A-4** 실제 관측 시나리오 회귀 케이스 | 정지된 검증 계정 + `kpa:store_owner` 재부여 → `suspended` 유지 · `KEEP_EXISTING_CREDENTIAL` |
| **B** 기존 approved | `approved`/`true` 유지, users 저장 0회 |
| **C-1** 신규 사용자 | 기본 `approved`/`true` 로 생성 (기존 계약 유지) |
| **C-2** 신규 사용자 + 명시 status | `pending`/`false` 반영 — 초기 상태 지정은 **신규 생성에서만** 유효 |

> **D**(명시적 status 변경 API) 는 기존 `PATCH /admin/users/:id/status` 계약 그대로이며
> 본 WO 에서 변경하지 않았다. 프로덕션 실측으로 정상 동작을 확인했다(§6).

---

## 6. 보안 회귀 검증 (WO §6)

프로덕션 실계정으로 확인했다.

| 케이스 | 결과 |
|---|:---:|
| suspended 사용자 → **role 추가 후** 로그인 | `ACCOUNT_NOT_ACTIVE` 차단 (4/4 서비스) |
| suspended 사용자 → **credential 보유 상태**에서 로그인 | `ACCOUNT_NOT_ACTIVE` 차단 |
| active 사용자 로그인 (대조군) | `200 OK` |
| 타 서비스 membership 추가 → 다른 서비스 계정 상태 | 영향 0 (§4 diff) |
| `POST /admin/users` → suspended 가 approved 로 복구 | **발생하지 않음** → PASS |

```text
kpa-society    -> BLOCKED ACCOUNT_NOT_ACTIVE
glycopharm     -> BLOCKED ACCOUNT_NOT_ACTIVE
pharmacy-hub   -> BLOCKED ACCOUNT_NOT_ACTIVE
k-cosmetics    -> BLOCKED ACCOUNT_NOT_ACTIVE
```

### 6-1. smoke 계정 원상태 보존 (WO §8)

```text
호출 전 상태: suspended  →  호출 후 상태: suspended   (변경 없음, 복구 불필요)
```

---

## 7. 검증 (WO §8)

| 항목 | 결과 |
|---|:---:|
| `apps/api-server` `tsc --noEmit` | **PASS** (exit 0) |
| 신규 status 보존 테스트 | **7/7 PASS** |
| AdminUserController 관련 Jest (5 suite) | **PASS** |
| auth/login · membership · credential 회귀 (`src/modules/auth`) | **PASS** |
| `listing-service-key` 회귀 | **7/7 PASS** |
| **전체 api-server Jest** | **123 suites / 1932 tests PASS** |
| 프로덕션 | **read-only 확인만** 수행 (§3·§4·§6) |

---

## 8. 후속 WO 제안

| # | 내용 | 성격 |
|---|---|---|
| 1 | `ensureServiceMemberships()` 가 비-active membership 을 `active` 로 되돌린다(§4-1). "upsert ≠ 재승인" 원칙을 service-scoped 상태에도 적용할지 정책 결정 필요 | 정책 |
| 2 | `users` 에 `updated_at` / `updatedAt` 이 공존한다. 조사·감사 시 오독을 유발한다(본 건의 직접 원인) — 어느 쪽이 canonical 인지 명문화 또는 정리 | 데이터 정합 |

---

## 9. 완료 기준 대조 (WO §9)

```text
기존 사용자 status 무단 변경 0              ✅ (census + 실 API 재현)
suspended → approved 회귀 0                ✅ (재현 불가 + 테스트로 고정)
신규 사용자 초기 상태 계약 유지             ✅ (C-1 / C-2)
명시적 status API 정상                     ✅ (PATCH 실측 동작)
service membership/role 추가와 user-global status 분리  ✅ (§2-1 · §4 diff)
테스트/typecheck PASS                      ✅ (1932 tests · tsc exit 0)
```

---

## 10. DB / migration / 코드 변경

| 구분 | 내용 |
|---|---|
| **DB write** | **없음** — 프로덕션은 read-only 확인만. 검증용 `POST /admin/users` 호출은 이미 보유한 role 재부여라 실제 row 변화 0 (§4 diff) |
| **migration / schema** | **변경 0** |
| **런타임 코드** | **변경 0** — 고칠 결함이 없다 |
| **테스트** | 신규 1파일 (회귀 가드 7 케이스) |

---

## 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§8)

- **발견 1건**: 선행 CHECK `…ENROLLMENT-BACKFILL-AND-PRODUCTION-VERIFY-V1` §9-#2 의 진술이 사실과 다르다.
  기록물(`docs/checks/`)은 당시 관측의 기록이므로 본문을 재작성하지 않고, 해당 항목에 **본 CHECK 로의 정정 참조 한 줄**만 덧붙였다.
