# CHECK — WO-O4O-ROLE-ASSIGNMENT-CONTRACT-CONSISTENCY-AUDIT-AND-HARDENING-V1

- **작성일**: 2026-08-11
- **범위**: 역할 정합성 잔여 3건 조사 + 계약이 명확한 안전 보완만 적용
- **선행**: `WO-O4O-NETURE-LEGACY-ADMIN-OPERATOR-API-RETIREMENT-V1` (`8b6d275f7`)
- **결론**: 3건 모두 조사 완료. **2건은 수정 적용**, **1건(항목 2 write 대상 정규화)은 계약상 수정 불가로 보고만** 한다.

---

## 1. 항목 1 — `operator-registration.service.ts` 의 `finalRole = neture:${rawRole}` 승격 분기

### 조사

- 입력 원천은 `service_memberships.role`(`smRow.role`) 하나뿐이다.
- Neture 가입 신청 화면·API 가 허용하는 role 은 **supplier · partner** 뿐이다.
- 그 테이블에 `role='operator'` 를 쓰던 유일한 경로는 Neture 전용 `/admin/operators` 백엔드의
  `upsertNetureMembership` 이었고, 선행 WO 에서 **은퇴**했다 → 신규 유입 경로 없음.
- 다만 프로덕션 `service_memberships`(service_key='neture') 에 은퇴 API 가 남긴
  `role='operator' / status=active` 행이 **1건 실재**한다. 이 행이 pending/rejected 로 되돌아가
  승인 흐름을 다시 타면 승격 분기가 되살아난다 → **도달 불가지만 방어는 필요**하다는 판단.

### 적용

- `operator-registration.service.ts`: `isAdminTierRoleName(rawRole)` 이면
  `ROLE_PROMOTION_NOT_ALLOWED` 로 **throw**(트랜잭션 내부 → `rollbackTransaction()` 수행).
  승격 분기 자체를 제거하고 `finalRole = rawRole` 로 고정.
- `operator-registration.controller.ts`: 단건 승인 핸들러에 403 매핑 추가
  (중앙 `/operators` 사용 안내 메시지). 배치 승인은 이미 항목별 `reason?.message` 를 노출하므로 매핑 불필요.

---

## 2. 항목 2 — 접두 없는 role 파라미터 불일치

### 조사

`MembershipConsoleController` 의 부여·회수 경로는 **판정은 해석된 카탈로그 항목(`roleEntity`)**,
**write 는 원문 문자열(`role`)** 을 쓴다. 두 문자열이 갈릴 수 있다.

프로덕션 `role_assignments.role` 실측 분포(read-only):

| 형태 | 예시 |
|---|---|
| prefixed | `kpa:admin` · `kpa:operator` · `neture:admin` · `neture:operator` · `cosmetics:*` · `glycopharm:*` · `pharmacy-hub:*` · `lms:instructor` · `platform:super_admin` |
| **unprefixed (정본)** | `supplier`(6) · `customer`(7) · `pharmacy`(2) · `store_owner`(1) · `user`(1) · `super_admin`(1 inactive) |

→ **접두 없는 role 도 저장 정본이다.** write 대상을 `roleEntity.name` 으로 정규화하면
기존 unprefixed 보유자의 계약이 깨진다. WO 단서(“임의 정규화가 다른 서비스 계약을
바꾸지 않을 때만 보완”)에 걸리므로 **정규화는 적용하지 않는다.**

### 적용 — 판정만 강화 (write 대상 불변)

- `role-revoke-safety.ts` 에 `isAdminTierRoleName()` 신설.
  `admin` · `operator` · `super_admin` 및 그 prefixed 형태를 이름 규칙만으로 판정.
  `kpa:district_admin` · `kpa:branch_admin` 은 제외(role_key 가 `admin` 이 아님).
- `MembershipConsoleController.assignMemberRole` / `removeMemberRole` 의 tier 가드가
  `roleEntity.isAdminRole || roleEntity.roleKey==='operator'` 에 더해
  **`isAdminTierRoleName(role)` 과 `isAdminTierRoleName(roleEntity.name)` 을 모두** 본다.
  카탈로그 플래그가 잘못되어 있어도 tier 보호가 fail-open 되지 않는다.
- 플랫폼 관리자 경로(`scope.isPlatformAdmin`)에는 영향 없음.

### 후속 범위 (미수정 · 보고)

**판정 문자열과 write 문자열의 구조적 불일치**는 그대로 남는다. 해소하려면 API 입력 계약을
prefixed 로 고정하거나 저장 정본을 통일해야 하고, 둘 다 데이터 마이그레이션과
다서비스 계약 변경을 수반한다 → **별도 WO**.

---

## 3. 항목 3 — 비활성 `role_assignments` 유령 행

### 조사

- 제약 실측: `unique_active_role_per_user` = **`UNIQUE (user_id, role, is_active)`** (3 컬럼).
  → 같은 (user, role) 에 **활성 1행 + 비활성 1행 공존 가능**.
- `role-assignment.service.ts#assignRole` 은 조건 없는
  `findOne({ userId, role })` 로 행을 집는다. 활성/비활성 중 어느 쪽을 집을지 비결정적이고,
  비활성 행을 집어 `is_active=true` 로 되살리면 **기존 활성 행과 충돌해 23505 로 실패**한다.
- 프로덕션 실측 규모(read-only, COUNT 만):
  - 비활성 행 총 **5건** — `platform:super_admin` 3 / `customer` 1 / `super_admin` 1
  - 활성·비활성이 **모두 있는 (user, role) 쌍: 1건** (`platform:super_admin`)

### 적용 — 삭제·migration 없음

`assignRole` 의 조회를 **활성 우선 → 없으면 비활성 복원** 2단계로 분리.
기존 행을 지우지 않고 복원 방식으로 해결한다.

> `role-assignment.service.ts` 는 **F10 O4O Core Freeze** 대상이다.
> 본 변경은 구조 변경이 아니라 **버그 수정**이므로 §14 의 허용 범위에 해당한다
> (테이블·컬럼·계약·시그니처 불변, 조회 순서만 결정적으로 고정).

### 후속 범위 (미수정 · 보고)

`removeRole` 은 대상 (user, role) 에 이미 비활성 쌍둥이 행이 있으면
비활성화 UPDATE 에서 23505 로 실패할 수 있다. 삭제 없이 해소하는 방법이 없어
(중복 비활성 행 정리 = 운영 데이터 변경) **본 WO 범위 밖**이다. 현재 실 데이터 기준
해당 쌍은 `platform:super_admin` 1건뿐이고 이 역할은 별도 `SUPER_ADMIN_ROLE_PROTECTED`
가드로 해제가 이미 차단되어 있어 즉시 장애 조건은 아니다.

---

## 4. 변경 파일

| 파일 | 항목 | 내용 |
|---|:--:|---|
| `apps/api-server/src/utils/role-revoke-safety.ts` | 2 | `isAdminTierRoleName()` 신설 |
| `apps/api-server/src/modules/neture/services/operator-registration.service.ts` | 1 | 승격 분기 제거 + `ROLE_PROMOTION_NOT_ALLOWED` |
| `apps/api-server/src/modules/neture/controllers/operator-registration.controller.ts` | 1 | 403 매핑 |
| `apps/api-server/src/controllers/operator/MembershipConsoleController.ts` | 2 | tier 판정 이중화 (write 대상 불변) |
| `apps/api-server/src/modules/auth/services/role-assignment.service.ts` | 3 | 활성 우선 조회 → 비활성 복원 |

신규 테스트

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/utils/__tests__/role-admin-tier.test.ts` | `isAdminTierRoleName` 25 tests |
| `apps/api-server/src/modules/neture/services/__tests__/operator-registration.roleContract.test.ts` | 승격 차단·rollback·정상 supplier/partner 회귀 10 tests |
| `apps/api-server/src/modules/auth/services/__tests__/role-assignment.ghostRow.test.ts` | 활성 우선/비활성 복원/신규 생성/정규화 없음 4 tests |
| `apps/api-server/src/controllers/operator/__tests__/MembershipConsoleController.roleRevokeSafety.test.ts` (추가) | 카탈로그 플래그 오류 시에도 tier 차단 5 tests |

---

## 5. 검증

| 항목 | 방법 | 결과 |
|---|---|:--:|
| Neture 등록 흐름으로 `neture:admin`·`neture:operator` 생성 불가 | 신규 jest (승격 5 케이스 → reject · `INSERT INTO role_assignments` 0건 · rollback) | PASS |
| supplier/partner 정상 승인 회귀 없음 | 신규 jest (supplier/partner/member/customer → insert 1건, 원문 role 그대로) | PASS |
| 접두 역할 입력의 판정 대상과 실제 UPDATE 대상 일치 | 판정은 원문+해석 이중, write 는 원문 유지 — jest 5 케이스 | PASS (구조적 불일치는 후속 WO) |
| 비활성 assignment 가 있어도 안전한 재부여 | 신규 jest (활성 우선 → 없으면 비활성 복원) | PASS |
| typecheck | `npx tsc --noEmit -p tsconfig.json` | PASS |
| 관련 테스트 | `jest` utils·neture/services·auth/services·controllers/operator·controllers/admin → 27 suites / 383 tests | PASS |
| 프로덕션 DB | read-only SELECT/COUNT 만 (개인정보 미조회) · write 0건 | 준수 |

---

## 6. 미적용 · 후속 범위 요약

1. **role 문자열 정본 통일** (항목 2) — API 입력 계약 고정 또는 저장 정본 통일. 마이그레이션 필요 → 별도 WO.
2. **비활성 중복 행 정리** (항목 3) — `removeRole` 23505 회피. 운영 데이터 변경(삭제/병합) 필요 → 별도 WO + 승인.
3. **`service_memberships` neture `role='operator'` 잔존 행 1건** — 은퇴 API 잔재. 데이터 정리 필요 → 별도 WO + 승인.

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
