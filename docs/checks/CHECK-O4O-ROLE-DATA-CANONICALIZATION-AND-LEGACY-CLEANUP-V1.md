# CHECK — WO-O4O-ROLE-DATA-CANONICALIZATION-AND-LEGACY-CLEANUP-V1

- **작성일**: 2026-08-11
- **선행**: `WO-O4O-ROLE-ASSIGNMENT-CONTRACT-CONSISTENCY-AUDIT-AND-HARDENING-V1` (`116b90689`) §6 후속 3건
- **기준 commit**: `a8a1e2cd3` (clean · `HEAD == origin/main`)
- **결론**: 구조 결함 **해소**, Neture 잔존 행 **정본 변환**, 접두 없는 역할 19행은
  **의미 확정 불가로 write 하지 않고 문제 큐로 보고**한다.

---

## 1. 정본 규칙 (확정)

| # | 규칙 | 근거 |
|---:|---|---|
| R1 | `role_assignments.role` 의 정본 표기는 **`{service}:{role_key}`** 접두형이다. 신규 write 경로는 접두형만 만든다. | `roles` 카탈로그 39행 중 33행이 접두형. scope guard(`allowedRoles`)는 전부 접두형 |
| R2 | 활성 유일성은 **`(user_id, role) WHERE is_active`** 다. 비활성 이력 행은 다중 허용한다. | 업무 규칙은 "활성 1행"뿐. 비활성까지 유일하게 강제할 이유가 없다 |
| R3 | `service_memberships.role` 은 **인가 판정에 쓰이지 않는다.** 승인·반려 시 `resolveGrantedRole()` 로 `role_assignments` 대상만 결정한다. | JWT memberships 클레임은 `{serviceKey, status}` 뿐 (`refresh-token.service.ts:135`), scope guard 도 service_key + status 만 본다 |
| R4 | 기존 접두 없는 저장값은 **의미가 확정되는 것만** 정본 변환한다. 추정 변환하지 않는다. | WO 원칙 · §4 문제 큐 |

---

## 2. 원인 — 3 컬럼 제약이 우회 코드를 낳고 있었다

실측 제약: `unique_active_role_per_user UNIQUE (user_id, role, is_active)`

같은 (user, role) 에 **활성 1행 + 비활성 1행이 공존 가능**하고(둘 다 제약 만족),
그 상태에서 활성 행을 내리면 기존 비활성 행과 충돌해 **23505** 로 실패한다.
그래서 write 경로마다 우회가 따로 자랐다.

| 경로 | 우회 방식 | 상태 |
|---|---|---|
| `RoleAssignmentService.assignRole` | 활성 우선 조회 → 비활성 복원 | 선행 WO 에서 추가 |
| `MembershipApprovalService.activateRoleAssignment` | 같은 패턴 재구현 | 별도 WO 에서 추가 |
| `MembershipApprovalService.deactivateRoleAssignment` | **비활성 쌍둥이를 DELETE** (회수 이력 파괴) | 별도 WO 에서 추가 |
| `RoleAssignmentService.removeRole` · `removeAllRoles` | **없음** | ← 본 WO 대상 |

→ 개별 경로에 우회를 하나 더 붙이는 대신 **제약 자체를 정본 규칙으로 교체**한다.

```
BEFORE  UNIQUE (user_id, role, is_active)
AFTER   UNIQUE (user_id, role) WHERE is_active     -- 부분 유니크 인덱스
```

새 인덱스는 기존 제약보다 **덜 엄격**하므로(활성 행에만 적용) 기존 데이터는 그대로 만족한다.
활성 행을 내리는 UPDATE 는 활성 유일성을 줄이는 방향이라 **구조적으로 충돌하지 않는다.**
행을 지우지 않으므로 회수 이력이 보존된다.

---

## 3. 프로덕션 read-only 전수 집계 (2026-08-11)

`role_assignments` — 총 **43행** / 활성 38 / 비활성 5 / 사용자 22

| 형태 | role (활성/비활성) |
|---|---|
| 접두형 | `kpa:store_owner`(4/0) · `platform:super_admin`(2/3) · `pharmacy-hub:store_owner`(2/0) · `cosmetics:admin` `cosmetics:operator` `cosmetics:store_owner` `glycopharm:admin` `glycopharm:operator` `glycopharm:store_owner` `kpa:admin` `kpa:operator` `lms:instructor` `neture:admin` `neture:operator` `pharmacy-hub:admin` `pharmacy-hub:operator` (각 1/0) |
| **접두 없음** | `customer`(7/1) · `supplier`(6/0) · `pharmacy`(2/0) · `store_owner`(1/0) · `user`(1/0) · `super_admin`(0/1) — **합 19행** |

- 활성+비활성 쌍둥이 **(user, role) 1쌍** — `platform:super_admin`
- `(user, role, is_active)` 중복 그룹 **0건** → 새 인덱스 생성 가능
- `service_memberships` neture `role='operator'` **1행** (active)

---

## 4. 접두 없는 19행 — write 하지 않는다 (문제 큐)

WO 단서(“둘 이상의 정본으로 해석될 수 있으면 write 금지”)에 **전부 해당**한다.
membership 실측과 카탈로그가 서로 다른 서비스를 가리키거나, 변환 대상 자체가 없다.

| role | 행수 | 카탈로그 판정 | 실제 membership 실측 | 판정 |
|---|---:|---|---|---|
| `supplier` | 6 | `service_key='glycopharm'` | 2명은 `neture/supplier`, 4명은 membership 없음 | **모순** — 카탈로그(glycopharm) vs 실데이터(neture) |
| `customer` | 8 | `service_key='glycopharm'` | 5명이 `platform/customer`, 3명 없음 | **모순** — 카탈로그 vs 실데이터(platform). `platform:customer` 는 카탈로그에 없음 |
| `pharmacy` | 2 | `service_key='glycopharm'` | 1명 `glycopharm/pharmacy`, 1명 없음 | **변환 대상 부재** — `glycopharm:pharmacy` 가 카탈로그에 없음 |
| `store_owner` | 1 | 카탈로그에 없음 | membership 없음 | **후보 4개**(kpa/cosmetics/glycopharm/pharmacy-hub) |
| `user` | 1 | 카탈로그에 없음 (`neture:user` 만 존재) | membership 없음 | 추정 불가 |
| `super_admin` | 1 (비활성) | 카탈로그에 없음 | membership 없음 | `platform:super_admin` 추정이나 근거 부족 |

### 4-1. 방치의 영향 (실측 판정)

- **권한 상승 아님.** scope guard 는 `allowedRoles`(전부 접두형) 정확 일치만 통과시키므로
  접두 없는 역할은 **어떤 서비스 scope 도 열지 않는다.**
- `User.hasRole('store_owner')` 류의 접미 매칭은 접두형(`kpa:store_owner`)도 동일하게 통과시키므로
  **서비스 무관성은 접두 없는 행 때문에 생긴 것이 아니다**(`hasRole` 자체의 성질).
- 비활성 `super_admin` 1행은 권한 계산에 포함되지 않는다.

### 4-2. 유입 경로 — 1건은 차단, 1건은 보고

| 스크립트 | 기존 | 조치 |
|---|---|---|
| `scripts/create-admin-user.ts` | `'super_admin'` (접두 없음) 삽입 | **수정** → `UserRole.SUPER_ADMIN`(`platform:super_admin`). 기존 값은 `hasRole()` 의 어떤 분기에도 걸리지 않아 **isAdmin() 을 통과하지 못하는 관리자 계정**을 만들고 있었다 (프로덕션 `super_admin` 1행의 출처) |
| `scripts/create-manager-user.ts` | `'admin'` (접두 없음) 삽입 | **보존** — 어느 서비스의 admin 인지 결정 불가(`platform:admin` 은 `is_assignable=false`). 주석으로 표시하고 문제 큐 등재 |

---

## 5. Neture `service_memberships.role='operator'` 1행 — 정본 변환

**삭제하지 않는다.** 이 행의 주인은 `role_assignments` 에 `neture:admin` · `neture:operator` 를
**실제 활성 보유**한 정상 운영자다. 멤버십 행을 지우면 `createMembershipScopeGuard` 가
`MEMBERSHIP_NOT_FOUND` 로 Neture 접근을 전부 막는다 → 삭제는 회귀다.

`neture:operator` 로 확정한 근거 (추정이 아니라 대조):

1. `roles` 카탈로그에 `neture:operator`(service_key='neture', role_key='operator') 실재
2. 같은 사용자가 `role_assignments` 에 `neture:operator` 활성 보유 (SSOT 일치)
3. **접두형 멤버십 role 선례가 프로덕션에 이미 있다** — `pharmacy-hub/pharmacy-hub:operator`,
   `pharmacy-hub/pharmacy-hub:store_owner`, `k-cosmetics/cosmetics:store_owner`

왜 지금 고치는가: `resolveGrantedRole()` 은 멤버십 role 을 그대로 `role_assignments.role` 로 부여한다.
이 행이 다시 승인 흐름을 타면 **접두 없는 `operator` 행이 새로 생성**된다(신규 legacy 유입).

---

## 6. 변경 파일

| 파일 | 내용 |
|---|---|
| `migrations/20270301000000-ReplaceRoleAssignmentsActiveUniqueConstraint.ts` | **신규** — 제약 → 부분 유니크 인덱스 교체. 활성 중복 사전 검사 후 실패시킴. down() 복원 가능 |
| `migrations/20270302000000-NormalizeNetureOperatorMembershipRole.ts` | **신규** — neture `operator` → `neture:operator` (멱등) |
| `modules/auth/entities/RoleAssignment.ts` | `@Unique(3컬럼)` → `@Index(unique, where: 'is_active')` |
| `modules/auth/services/role-assignment.service.ts` | `removeRole` 구조 근거 명시 · `assignRole` 비활성 복원 대상을 최신 1행으로 **결정적** 고정 |
| `services/approval/MembershipApprovalService.ts` | `ON CONFLICT` 구문 교체 · `deactivateRoleAssignment` 의 **이력 DELETE 제거** |
| `services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts` | `ON CONFLICT` 구문 교체 |
| `scripts/create-admin-user.ts` | `ON CONFLICT` 교체 + `platform:super_admin` 정본화 |
| `scripts/create-manager-user.ts` | `ON CONFLICT` 교체 (role 문자열 보존 + 문제 큐 주석) |
| `__tests__/role-assignment.removeRole.test.ts` | **신규** — 새 제약 모사 fake 로 해제·이력보존·왕복 10 tests |
| `__tests__/role-assignment.ghostRow.test.ts` | 결정적 복원(`order`) 반영 |

`ON CONFLICT ON CONSTRAINT "unique_active_role_per_user"` 는 **제약 이름**을 요구하므로 부분 인덱스로는 못 쓴다.
런타임 호출부 **4곳 전부** `ON CONFLICT (user_id, role) WHERE is_active` 로 교체했다.
기존 마이그레이션들은 타임스탬프 순서상 본 마이그레이션보다 **먼저** 실행되므로 신규 DB 재구축에도 안전하다.

---

## 7. dry-run 예상량

| 항목 | 값 |
|---|---|
| 활성 중복 (인덱스 생성 차단 요인) | **0** |
| 기존 제약 존재 | 1 |
| 신규 인덱스 기존재 | 0 |
| **`role_assignments` 데이터 변경 예상** | **0행** (구조만 교체) |
| **`service_memberships` 변경 예상** | **1행** |
| 착수 시점 총량 | 43 / 활성 38 / 비활성 5 |

---

## 8. 검증

| 항목 | 방법 | 결과 |
|---|---|:--:|
| api-server typecheck | `tsc --noEmit` | ✅ exit 0 |
| api-server build typecheck | `tsc -p tsconfig.build.json --noEmit` | ✅ exit 0 |
| 해제·이력보존·왕복 (신규) | `jest role-assignment` | ✅ 2 suites / **10 tests** |
| 보안·scope·격리 회귀 | `jest security` | ✅ 17 suites / **388 tests** |
| 승인·반려 회귀 | `jest approval` | ✅ 3 suites / 30 tests |
| 중앙 `/operators` 콘솔·교차서비스 격리 | `jest operator` | ✅ 5 suites / 81 tests |
| KPA 역할 가드 무회귀 | `jest kpa-role-guard` | ✅ 24 tests |
| 프로덕션 DB | read-only SELECT/COUNT (개인정보 미조회 · user_id 마스킹) | 준수 |

### 8-1. 운영 데이터 적용 경로

프로덕션 직접 write 는 **정책 차단**되어 수행하지 못했다. CLAUDE.md §0 의 정본 경로인
**마이그레이션 → main 배포 시 CI/CD 자동 실행**으로 적용한다. 두 마이그레이션 모두 멱등이며
사전 검사·`down()` 을 갖는다. 배포 후 실제 변경량 대조는 §9 에 기록한다.

---

## 9. 배포 후 실제 변경량 대조

적용 경로: commit `efbaa7a70` push → `Deploy API Server (Cloud Run)` **success** → 마이그레이션 자동 실행.
`typeorm_migrations` 에 `ReplaceRoleAssignmentsActiveUniqueConstraint20270301000000` ·
`NormalizeNetureOperatorMembershipRole20270302000000` 2건 기록 확인.

| 항목 | dry-run 예상 | **실제** | 일치 |
|---|---|---|:--:|
| `role_assignments` 데이터 변경 | 0행 | **0행** (43 / 활성 38 / 비활성 5 — 착수 시점과 동일) | ✅ |
| `service_memberships` 변경 | 1행 | **1행** (`neture/operator` 0건 · `neture/neture:operator` 1건) | ✅ |
| 제약 → 부분 인덱스 교체 | 1건 | **1건** | ✅ |

교체 결과 실측:

```text
ux_role_assignments_user_role_active
  CREATE UNIQUE INDEX ... ON public.role_assignments USING btree (user_id, role) WHERE is_active
role_assignments 잔여 제약: PK · chk_org_scope · FK 2개  (unique_active_role_per_user 제거됨)
```

**이력 보존 확인** — 쌍둥이 쌍(`platform:super_admin`, 활성 1 + 비활성 1)이 **그대로 공존**한다.
새 구조에서 합법이며 삭제된 행은 0개다. 역할 분포도 불변(접두 24행/16종 · 무접두 19행/6종).

### 9-1. 프로덕션 기능 회귀 (배포 후)

| 항목 | 결과 |
|---|---|
| `GET /health` | ✅ 200 |
| 정식 폼 로그인 (`platform:super_admin` 계정) | ✅ `success=true` · `roles=["platform:super_admin"]` · memberships active |
| `GET /api/v1/auth/status` | ✅ 200 |
| `GET /api/v1/admin/users?limit=1` (역할 기반 인가) | ✅ 200 |
| `GET /api/v1/admin/platform-accounts` (ADMIN_ACCESS_ROLES) | ✅ 200 |

---

## 10. 유지 확인

- 중앙 `/operators` 콘솔 계약 불변 (`MembershipConsoleController` 무변경)
- 서비스별 역할 경계 불변 (scope config·`allowedRoles` 무변경 · security 388 PASS)
- membership·credential·로그인 계약 불변 (JWT 클레임 형태 무변경 · `service_memberships.role` 은 인가 비참여)
- 은퇴한 Neture 운영자 관리 API 복원하지 않음
- 역할 문자열 임의 일괄 변환 없음 (§4)

---

## 11. 문제 큐 (write 하지 않음 · 정책 판단 필요)

| # | 대상 | 필요한 결정 |
|---:|---|---|
| 1 | `supplier` 6행 | 카탈로그(glycopharm) 와 실데이터(neture) 중 어느 쪽이 정본인가 |
| 2 | `customer` 8행 | `platform/customer` 멤버십에 대응하는 정본 역할명이 카탈로그에 없다 (신설 vs glycopharm 귀속) |
| 3 | `pharmacy` 2행 | `glycopharm:pharmacy` 카탈로그 신설 여부 |
| 4 | `store_owner` 1행 · `user` 1행 · `super_admin` 1행(비활성) | 소유 서비스 확정 불가 — 계정 단위 확인 필요 |
| 5 | `scripts/create-manager-user.ts` 의 `'admin'` | 어느 서비스의 admin 인가 (`platform:admin` 은 is_assignable=false) |
| 6 | `service_memberships` 의 접두/무접두 혼재 | `glycopharm/operator` · `kpa-society/admin` 등은 본 WO 범위 밖(은퇴 API 잔재 아님) |
| 7 | `roles` 카탈로그의 무접두 6행 (`consumer` `customer` `partner` `pharmacist` `pharmacy` `supplier`) | 카탈로그에서 은퇴시킬지 |

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 (문제 큐 §11 로 대체)
