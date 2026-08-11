# CHECK-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-SAFETY-GUARDS-V1

- **WO**: WO-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-SAFETY-GUARDS-V1
- **선행 조사**: IR-O4O-NETURE-OPERATOR-ASSIGNMENT-DUPLICATION-AUDIT-V1 (판정 GUIDE-REPLACE)
- **작업일**: 2026-08-11
- **범위**: 중앙 관리자 `/operators` 의 서비스 역할 해제 경로에 Neture 전용 화면에만 있던 안전 계약 이식
- **판정**: PASS

---

## 1. 배경

`GUIDE-REPLACE` 후속 순서 중 **1번**이다. Neture `/admin/operators` 를 중앙 `/operators` 안내 화면으로
교체하기 **전에** 중앙 경로의 안전 가드를 먼저 보완한다. 안내를 먼저 적용하면 중앙 화면 사용이 늘어난
상태에서 마지막 `neture:admin` 해제와 자기 역할 해제가 가능해지기 때문이다.

이식 원본은 Neture 전용 백엔드의 두 보호다.

| 보호 | Neture 원본 | 중앙 이식 후 |
|---|---|---|
| 마지막 활성 admin 해제 차단 | `neture.controller.ts` deactivate — `LAST_ADMIN_PROTECTED` | `LAST_ADMIN_PROTECTED` (403) |
| 자기 자신 해제 차단 | 동 self-deactivation 차단 | `SELF_ROLE_REVOKE_FORBIDDEN` (403) |

---

## 2. 변경 파일

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/utils/role-revoke-safety.ts` (신규) | 서비스 admin 판정 규칙 + 오류 코드·메시지 |
| `apps/api-server/src/controllers/admin/AdminUserController.ts` | `revokeRoleAssignment` 에 두 가드 적용 |
| `apps/api-server/src/controllers/admin/__tests__/AdminUserController.roleRevokeSafety.test.ts` (신규) | 16 케이스 |

신규 테이블·migration·역할 체계 변경 **없음**. `users.isActive` · `service_memberships` ·
`service_credentials` · 로그인 구조 **미변경**. 해제는 계속 assignment row 의 `is_active=false` (soft revoke).

---

## 3. 공통 규칙 적용 판단 (WO 요구: "다른 서비스에도 같은 위험이 있는지")

Neture 고정 문자열이 아니라 **서비스 공통 규칙**으로 일반화했다. `role_assignments` 는 F9 RBAC SSOT 이며
`kpa:admin` · `cosmetics:admin` · `glycopharm:admin` 등도 동일 경로로 해제되므로 위험이 같다.

**판정 기준**: role 이 `{serviceKey}:admin` 형태이고 `serviceKey != 'platform'` 일 때 서비스 admin.

| 대상 | 보호 | 근거 |
|---|:---:|---|
| `neture:admin` · `kpa:admin` · `cosmetics:admin` · `glycopharm:admin` · `glucoseview:admin` · `pharmacy-hub:admin` | O | 서비스 단위 관리자 |
| `kpa:district_admin` · `kpa:branch_admin` | X | `is_admin_role=true` 이지만 서비스 단위 관리자가 아니다. `_admin` 접미사는 `:admin` 과 다르므로 문자열 규칙으로 정확히 갈린다 |
| `platform:super_admin` | (별도) | 기존 `SUPER_ADMIN_ROLE_PROTECTED` 가 상위에서 이미 차단. 기존 보호 유지 |
| `platform:admin` | X | 서비스 admin 아님(deprecated). 기존 동작 그대로 |
| `*:operator` | X | 마지막 1명이어도 해제 허용 (기존 정책) |

**`roles` 카탈로그 조회를 쓰지 않은 이유**: `is_admin_role` 은 district/branch admin 까지 포함해 과대 집합이고,
해제 경로에서 카탈로그 조회가 실패하면 보호가 조용히 열리는(fail-open) 경로가 생긴다. 명명 규약의 정본은
`20260318100000-ExtendRolesTable.ts` seed 다.

기존 서비스별 정책과의 **충돌 없음** — 어떤 서비스도 "마지막 admin 해제 허용"을 명시한 곳이 없다.

---

## 4. 동시성 처리

WO 요구사항("동시 해제로 마지막 admin 보호가 우회될 가능성")을 트랜잭션으로 닫았다.

```
AppDataSource.transaction:
  SELECT user_id FROM role_assignments WHERE role = $1 AND is_active = true FOR UPDATE
  → 보유자 집합 판정 (비보유자 404 / 마지막 1명 403)
  → 같은 트랜잭션에서 UPDATE ... SET is_active = false
```

READ COMMITTED 에서 후행 트랜잭션은 선행 커밋 이후 잠금을 얻고, 이미 `is_active=false` 로 바뀐 행은
`WHERE` 재평가에서 탈락한다. 따라서 admin 2명을 동시에 해제해도 뒤의 요청이 `LAST_ADMIN_PROTECTED` 로 거절된다.

서비스 admin 이 아닌 역할은 트랜잭션을 타지 않고 **기존 단일 UPDATE 경로를 그대로 유지**한다(동작 변경 0).

부수 개선: 보유자 조회 한 번으로 "미보유(404)"와 "마지막 1명(403)"이 갈리므로, 아무도 갖지 않은 역할을
해제할 때 `LAST_ADMIN_PROTECTED` 로 잘못 안내되지 않는다.

---

## 5. 검증

### 테스트 (WO 지정 7항목 전부 포함, 16 케이스)

`npx jest src/controllers/admin/__tests__` → **5 suites / 55 tests PASS**

| WO 요구 케이스 | 결과 |
|---|:---:|
| 서비스 admin 1명일 때 해제 거절 | PASS (403 + UPDATE 미실행) |
| 서비스 admin 2명 이상이면 1명 해제 허용 | PASS |
| 자기 역할 해제 거절 | PASS (계정 조회 전 차단) |
| 다른 사용자의 operator 역할 해제 허용 | PASS |
| 비활성 assignment 는 활성 admin 수 미포함 | PASS (`is_active = true` 한정 검증) |
| 다른 서비스 admin 은 마지막 admin 수 미포함 | PASS (대상 role 만 조회) |
| `platform:super_admin` 보호·권한 가드 회귀 없음 | PASS |

추가 케이스: `kpa:district_admin` 비보호 · `platform:admin` 기존 경로 · 미보유자 404 ·
`FOR UPDATE` 및 동일 트랜잭션 UPDATE · soft revoke 계약(`DELETE FROM role_assignments` ·
`service_memberships` · `service_credentials` · `UPDATE users` 미발생).

### Typecheck

`npx tsc --noEmit -p apps/api-server/tsconfig.json` → **exit 0**

---

## 6. 범위 밖 관찰 (수정하지 않음 · 별도 판단 필요)

1. **ghost row 와 `unique_active_role_per_user`**
   제약이 `UNIQUE(user_id, role, is_active)` **3컬럼**이라 같은 (user, role) 의 비활성 유령 행이 남을 수 있다.
   Neture 의 deactivate 는 `is_active=false` 전환 전에 기존 비활성 행을 **삭제**해 `23505` 를 피한다.
   중앙 경로에는 그 삭제가 없어, 사전에 유령 행이 있으면 해제가 `23505` 로 실패할 수 있다.
   행 삭제는 파괴적 변경이고 WO 범위 밖이라 추가하지 않았다. (재활성화는
   `role-assignment.service.ts` `assignRole` 이 기존 행을 되살리므로 중앙에 별도 버튼이 필요 없다.)

2. **`MembershipConsoleController.removeMemberRole` 우회**
   `scope.isPlatformAdmin` 이면 tier 제한을 건너뛰므로, 이 경로로는 이번 두 가드를 거치지 않고
   마지막 서비스 admin·자기 역할 해제가 가능하다. 공통화 대상 후보이나 다른 콘솔의 계약이라 손대지 않았다.

3. **응답 코드 차이**
   Neture 원본은 마지막 admin 차단을 `400` 으로 반환했으나, 중앙은 권한/정책 거절이므로 `403` 으로 맞췄다.
   Neture 전용 경로는 그대로 두었으므로 기존 소비처 회귀 없음.

---

## 7. 후속 순서 (변경 없음)

1. ~~중앙 역할 해제 안전 가드 이식~~ ← 본 CHECK
2. 중앙 `/operators` 비밀번호 UX·라우트 검증 잔여 정리 (`admin/users.routes.ts` 의 실효성 없는 `min:6` 포함)
3. Neture 운영자 화면을 중앙 안내 화면으로 교체
4. 소비처 0 재확인 후 Neture 전용 API 은퇴 — **프런트 교체만으로는 권한 부여 우회 API 가 닫히지 않으므로 반드시 별도 작업**
