# CHECK-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-CACHE-INVALIDATION-V1

- **WO**: `WO-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-CACHE-INVALIDATION-V1`
- **일자**: 2026-08-11
- **판정**: PASS
- **선행**: `CHECK-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-SAFETY-GUARDS-V1` · `CHECK-O4O-MEMBERSHIP-CONSOLE-ROLE-REVOKE-SAFETY-GUARDS-V1`

---

## 1. 목표

중앙 `/operators` 의 역할 해제(`DELETE /api/v1/admin/users/:userId/role-assignments/:role`)가
`role_assignments` 를 직접 UPDATE 하면서 권한 캐시 무효화를 빠뜨리던 갭을 닫는다.
Neture 사용자를 중앙 화면으로 안내하면 이 경로의 사용이 늘어나므로 전환 전에 선반영한다.

---

## 2. 조사 결과

### 2-1. 캐시 계약 (기존)

`apps/api-server/src/modules/auth/utils/role-cache.ts` — `WO-O4O-AUTH-ROLE-FRESHEN-V1`

| 항목 | 값 |
|---|---|
| 성격 | per-process in-memory `Map`, TTL 60s, key = `userId` |
| 소비 지점 | `/auth/me` hot path (매 페이지 로드·포커스) |
| 무효화 API | `invalidateRoles(userId)` — 동기 `Map.delete` |
| 명시된 관례 | "Explicit invalidation on assignRole / removeRole / removeAllRoles" |
| 수용된 지연 | multi-instance Cloud Run 에서 최대 60s eventual consistency |

### 2-2. 저장소 전체 호출 지점 (변경 전)

| 위치 | 시점 |
|---|---|
| `role-assignment.service.ts:172` `assignRole` | `repository.save()` **성공 후**, 반환 전 |
| `role-assignment.service.ts:218` `removeRole` | `save()` 성공 후, 반환 전 |
| `role-assignment.service.ts:239` `removeAllRoles` | `save()` 성공 후, 반환 전 |
| `MembershipConsoleController.ts:1554` | 직전 WO 에서 추가 — 트랜잭션 해제 성공 후, 응답 전 |
| **`AdminUserController.revokeRoleAssignment`** | **없음 (누락)** |

즉 중앙 경로만 관례에서 벗어나 있었다. 해제된 사용자는 최대 60s 동안 이전 역할로 판정될 수 있었다.

### 2-3. 실패 계약 — 롤백 구조는 없다 (그리고 만들지 않았다)

- `invalidateRoles` 는 `cache.delete(userId)` 한 줄이다. `void` 를 반환하고 I/O·await 가 없어
  현실적으로 throw 하지 않는다. 즉 **보상 트랜잭션의 대상이 아니다.**
- 저장소 어디에도 캐시 무효화 실패를 이유로 DB 작업을 되돌리는 경로가 없다
  (위 4개 호출 지점 모두 `save()` 커밋 후 호출하고 결과를 검사하지 않는다).
- 따라서 **기존 시스템의 일관된 실패 계약을 그대로 따랐다** — DB 성공 후 호출, 결과 미검사, 롤백 없음.
  캐시 TTL 60s 가 최악의 경우의 상한이므로 fail-safe 이기도 하다.

---

## 3. 적용 내용

`apps/api-server/src/controllers/admin/AdminUserController.ts`

- `import { invalidateRoles } from '../../modules/auth/utils/role-cache.js';` 추가
- `revokeRoleAssignment` 의 **`if (affected === 0) → 404` 검사 직후, `logger.info` · 응답 직전** 한 지점에서 호출

```ts
      invalidateRoles(userId);   // userId = 역할을 잃은 대상 사용자
```

이 한 지점이 두 해제 분기를 모두 덮는다.

| 분기 | 도달 조건 |
|---|---|
| 일반 역할 (`UPDATE role_assignments`) | `affected > 0` |
| 서비스 admin (`revokeServiceAdminRoleWithLock`) | `outcome.status === 'revoked'` 이고 `affected > 0` |

**호출되지 않는 경로** — `SUPER_ADMIN_ROLE_PROTECTED` 403 / `SELF_ROLE_REVOKE_FORBIDDEN` 403 /
`User not found` 404 / `LAST_ADMIN_PROTECTED` 403 / `ROLE_ASSIGNMENT_NOT_FOUND` 404 / catch 500.
모두 호출 지점보다 앞에서 `return` 하거나 예외로 빠진다.

**무효화 대상은 `userId`(대상 사용자)** 이며 요청자(`requesterId`)가 아니다.

---

## 4. 변경하지 않은 것

- 역할 해제 판정 로직과 오류 코드·메시지 (추가·수정 0)
- 마지막 서비스 admin 보호 · 자기 해제 보호 · `platform:super_admin` 보호
- `revokeServiceAdminRoleWithLock` 의 SQL · 트랜잭션 · soft revoke 계약
- role · membership · credential · 로그인 구조 / DB schema · migration
- `MembershipConsoleController` (직전 WO 에서 이미 적용됨) · Neture 전용 API

---

## 5. 검증

`AdminUserController.roleRevokeSafety.test.ts` 에 `역할 해제 후 권한 캐시 무효화` 11건 추가 (16 → 27 PASS).

| WO 요구 테스트 | 케이스 |
|---|---|
| 일반 역할 해제 성공 시 무효화 | `neture:operator` 해제 → `invalidateRoles(TARGET_ID)` 1회 |
| 서비스 admin 해제 성공 시 무효화 | `neture:admin`(보유자 2명) 해제 → 호출 확인 |
| 대상 사용자 ID 무효화 확인 | `mock.calls` 가 정확히 `[[TARGET_ID]]` — 요청자 ID 미호출 |
| 자기 해제 거절 시 미호출 | 403 `SELF_ROLE_REVOKE_FORBIDDEN` |
| 마지막 admin 거절 시 미호출 | 403 `LAST_ADMIN_PROTECTED` |
| 미보유 역할 거절 시 미호출 | 서비스 admin 404 · 일반 역할 `affected 0` 404 |
| (추가) 보호·실패 경로 미호출 | `SUPER_ADMIN_ROLE_PROTECTED` 403 · 계정 없음 404 · DB 예외 500 |
| soft revoke·트랜잭션 무회귀 | `FOR UPDATE` + 동일 트랜잭션 UPDATE 유지, 추가 DB 왕복 0 |

```
npx jest src/controllers/admin/__tests__ src/controllers/operator/__tests__
→ Test Suites: 8 passed, Tests: 118 passed
npx tsc --noEmit -p tsconfig.json  → exit 0
```

---

## 6. 후속 순서

1. Neture `/admin/operators` 를 중앙 `/operators` 안내 화면으로 교체
2. `adminOperatorApi` 4개 함수 소비처 0 재확인
3. Neture 전용 4개 API 은퇴로 권한 우회 경로 완전 폐쇄

접두 없는 `role` 파라미터 불일치 · 비활성 유령 assignment 는 이번 전환과 분리된 정합성 작업으로 유지한다.

---

## 7. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
