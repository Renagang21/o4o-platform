# IR-O4O-BARE-OPERATOR-ADMIN-WRITE-PATH-AUDIT-V1

> 조사 전용 IR — 데이터 생성 경로 판정까지가 목표. **코드 수정·데이터 보정 없음.**
> 일자: 2026-05-30
> 선행: `IR-O4O-CROSSSERVICE-...` / `IR-O4O-GLYCOPHARM-KCOS-...` (UI 표시 정렬 완료),
> Neture/GP/KCos 회원 유형·운영 권한 분리 정비 완료. 본 IR은 그 근저의 데이터 원인을 조사.

---

## 1. 전체 판정

- **Case B (확정)** — 운영 권한(operator/admin)이 `service_memberships.role`(참여 유형용 컬럼)에 저장된다.
  Neture `sohae21@naver.com`처럼 membership.role 에 bare `operator` 가 들어간 사례가 이 경로의 산물.
- **Case D (확정 — 미검증 write-path 존재)** — `PUT /operator/members/:userId` 가 `membershipRole` 을
  **검증 없이** `service_memberships.role` 에 UPDATE 한다. operator/admin/임의값 저장 가능.
- **role_assignments 는 대체로 canonical (Case A/F)** — 운영 권한은 namespaced(`neture:operator` 등)로 저장하는
  정책이며, 승인 흐름이 bare→namespaced 변환을 수행한다. 단 일부 마이그레이션이 bare 값을 재삽입한 legacy 잔재 있음.
- **Case C 아님** — 리스트/로그인 API 는 DB 원값을 가공 없이 내려준다(병합으로 bare 를 *만들지* 않음).
- **Case E (부분)** — 서비스별 role prefix 불일치: K-Cosmetics 는 serviceKey `k-cosmetics` vs role `cosmetics:*`.
  KPA/Neture/GP 는 `{service}:operator` 일관. 저장 prefix 정책 공통화 여지.
- **DB 실데이터 직접 확인은 미완**(프로덕션 자격증명 부재) — 코드 경로 기준 판정. 아래 "미확인 항목" 참조.

> 요약: **bare operator/admin 의 1차 거처는 `service_memberships.role`** 이다. 등록/승인 흐름이 이 컬럼을
> "등록 role 소스"로 사용하며 bare admin/operator 를 수용하고, 승인은 role_assignments 만 namespace 하고
> membership.role 의 bare 값은 정리하지 않는다. + 미검증 PUT 이 동일 오염을 새로 만들 수 있다.

---

## 2. bare operator/admin 저장 위치 / 생성 위치

| 위치 | 형태 | 생성 경로 | 비고 |
|---|---|---|---|
| `service_memberships.role` | **bare** `operator`/`admin` | (a) 등록 시 role 지정, (b) `PUT /operator/members` membershipRole 미검증 UPDATE | **1차 오염 지점** — 참여 유형용 컬럼에 운영 권한 |
| `role_assignments.role` | namespaced `neture:operator` 등 | 승인 흐름이 bare→namespace 변환 후 INSERT / 모달 운영권한 저장(namespaced) | 정책상 canonical |
| `role_assignments.role` | bare `user`/`pharmacist` 등 | 일부 테스트 계정 마이그레이션 INSERT | legacy 잔재(operator/admin 아님) |

핵심 인용:
- 미검증 UPDATE — [MembershipConsoleController.ts:800-811](../../apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L800):
  ```ts
  if (membershipRole && typeof membershipRole === 'string') {
    const serviceKey = req.body.membershipServiceKey || scope.serviceKeys[0];
    if (serviceKey) {
      await AppDataSource.query(
        `UPDATE service_memberships SET role = $1, updated_at = NOW()
         WHERE user_id = $2 AND service_key = $3`,
        [membershipRole, userId, serviceKey],   // ← 검증/whitelist 없음
      );
    }
  }
  ```
- 승인이 role_assignments 만 namespace, membership.role 은 미정리 — [operator-registration.service.ts:130-142](../../apps/api-server/src/modules/neture/services/operator-registration.service.ts#L130):
  ```ts
  const rawRole = smRow.role || 'member';          // ← service_memberships.role 을 role 소스로 사용
  const ADMIN_ROLES = ['admin', 'operator'];
  const finalRole = ADMIN_ROLES.includes(rawRole)
    ? (rawRole.includes(':') ? rawRole : `neture:${rawRole}`)   // role_assignments 에만 namespace
    : rawRole;
  // INSERT INTO role_assignments ... finalRole ...   ← service_memberships.role 은 bare 그대로 유지
  ```

---

## 3. 서비스별 write-path

| 서비스 | membership.role 의미·소스 | 운영 권한 저장 | bare 수용 코드 |
|---|---|---|---|
| **Neture** | 등록 role 소스(`smRow.role`). 승인이 admin/operator→`neture:*`로 role_assignments INSERT | role_assignments(namespaced) | operator-registration.service `ADMIN_ROLES` |
| **GlycoPharm** | 공통 승인(MembershipApprovalService) 사용. membership.role 기반 | role_assignments(namespaced) + 별도 assign API | MembershipApprovalService `skipKpaProfile = ['admin','operator'].includes(smRole)` (membership.role 에 bare 수용 전제) |
| **K-Cosmetics** | 동일(공통). + cosmetics_members.subRole 별도 | role_assignments. role prefix `cosmetics:`(serviceKey 와 불일치) | 동일 |
| **KPA-Society** | kpa_members + service_memberships. KpaRolePrefixMigration 으로 operator→`kpa:operator` 변환 이력 | role_assignments(`kpa:*`) | MembershipApprovalService 동일 패턴 |

공통: `MembershipApprovalService` 가 `['admin','operator'].includes(membership.role)` 를 명시 검사(domain profile skip)
— 즉 **시스템 전반이 service_memberships.role 에 bare admin/operator 가 들어올 수 있음을 전제**로 동작한다.

---

## 4. service_memberships.role 의미 판정

- **설계 의도**: 참여 유형(default `'customer'`) — [ServiceMembership.ts](../../apps/api-server/src/modules/auth/entities/ServiceMembership.ts) (`role` 컬럼 주석: customer/user/supplier/partner 등).
- **실제 사용**: 등록 시 "요청 role" 저장소로 overload 되어, **운영 권한(bare operator/admin)도 담긴다.**
  승인 흐름이 이 값을 읽어 role_assignments 로 승격(namespace)하지만 원본 membership.role 은 정리하지 않는다.
- → **참여 유형 + (legacy/overload) 운영 권한 혼입.** Case B 의 근거.

## 5. role_assignments.role 의미 판정

- **canonical 운영 권한 저장소** (RBAC F9: role_assignments 단일 소스). 정책상 namespaced(`{service}:operator|admin`, `platform:*`).
  ROLE_REGISTRY([roles.ts](../../apps/api-server/src/types/roles.ts))에 bare 운영 role 없음 → bare 는 설계상 비정상.
- **write**: `RoleAssignmentService.assignRole()` 가 전달값 그대로 저장. 모달 운영권한 저장(POST /roles)은 namespaced 전달.
  승인 흐름은 bare→namespace 변환 후 저장. → 운영 권한은 namespaced 로 들어온다.
- **legacy 잔재**: `PrefixUnprefixedRoles`(1771200000019)가 bare→namespaced 일괄 변환했으나,
  이후 `ActivateGlycopharmTestAccounts`(20260317110000)가 bare `user`/`pharmacist` 재삽입(operator/admin 아님, namespacing 위반 잔재).

## 6. 로그인 roles[] 생성 과정

- `auth-context.helper.ts` `freshenUserContext` → `roleAssignmentService.getRoleNames(userId)` = **role_assignments.role 원값** +
  `service_memberships`(service_key/status/role) 별도 조회. `injectRolesIntoPublicData` 가 `publicData.roles = roles`(원값),
  `publicData.role = roles[0] || 'user'`. → **가공 없음, DB 원값.**

## 7. 회원 리스트 API roles[] / memberships[] 생성 과정

- [MembershipConsoleController.ts](../../apps/api-server/src/controllers/operator/MembershipConsoleController.ts) `getMembers`/`getMemberDetail`:
  - `roles[]` = `SELECT ARRAY_AGG(role) FROM role_assignments WHERE is_active` → **DB 원값 그대로**.
  - `memberships[].role` = `SELECT role FROM service_memberships` → **DB 원값 그대로**.
- → 프론트가 받는 roles[]/memberships[].role 은 **DB 원값**. 즉 화면에서 본 bare `operator` 는 DB(service_memberships.role)의 실제 값이다(Case C 아님).

## 8. 현재 write-path 가 정상인지 여부

- **role_assignments**: 운영 권한을 namespaced 로 저장 — **정상(canonical).**
- **service_memberships.role**: **미정상** —
  1. `PUT /operator/members` membershipRole **무검증 저장**(operator/admin 포함 가능) → 새 오염 가능(latent).
  2. 승인 흐름이 membership.role 의 bare 운영 권한을 **정리하지 않음**(role_assignments 만 namespace).
  - 단, 표준 모달의 membershipRoleOptions 는 참여 유형뿐이라 정상 UI 흐름에서는 operator 를 보내지 않음
    → **대량 신규 생성은 아니며, 주로 legacy 데이터 + 가드 부재로 인한 latent 위험.**

## 9. 기존 데이터 보정 필요 여부 — **필요(별도 WO)**

- `service_memberships.role IN ('operator','admin', ... bare 운영 권한)` 인 row 를 정리(참여 유형으로 환원하거나 비움)하고,
  해당 사용자의 운영 권한은 role_assignments(namespaced)로만 보유하도록 정합.
- DB 직접 확인이 안 된 상태이므로, 보정 WO 는 먼저 read-only 집계(SELECT)로 영향 범위를 확정한 뒤 수행.

## 10. 후속 WO 필요 여부 — **필요(2 트랙)**

1. **write-path 하드닝 WO** — `PUT /operator/members` membershipRole 을 **참여 유형 whitelist 로 검증**(operator/admin 거부;
   운영 권한은 role_assignments 경로로만). 승인 흐름이 membership.role 의 운영 권한 값을 정리/표준화하도록 보강 검토.
2. **데이터 보정 WO** — 기존 bare 운영 권한 오염 row 정리 + role_assignments 정합. (선 read-only 집계 → 후 마이그레이션)
- prefix 정책 공통화(K-Cosmetics `cosmetics:` vs serviceKey `k-cosmetics:`)는 별도 정리 항목으로 검토.

## 11. O4O 철학 충돌 점검

- **저장 구조에서도 참여 유형/운영 권한 분리?** — **부분 충돌.** role_assignments(운영 권한 canonical)와
  service_memberships(참여 유형)로 분리 설계됐으나, service_memberships.role 이 운영 권한을 담는 overload 가 존재
  → 저장 계층의 축 분리가 완결되지 않음(USER-OPERATOR-FREEZE F11 의 "role 은 membership 에서 파생" 과의 긴장).
- **role prefix 정책 일관성?** — namespaced 가 canonical(roles.ts/RBAC)이나, bare 잔재 + cosmetics/k-cosmetics 불일치 존재.
- **legacy bare role 유지 vs 제거?** — 운영 권한 bare 는 제거(정규화) 방향이 canonical 정합.
  단 표시 계층은 이미 정규화(suffix/bare 모두 인식)로 방어됨 → 저장 계층 정리는 데이터 보정 트랙으로.

---

## 미확인 항목 (추적)

- [ ] 프로덕션 DB 에서 `service_memberships.role IN ('operator','admin')` row 수·대상 계정 (read-only 집계, 자격증명 필요).
- [ ] 등록(signup) 시 service_memberships.role 에 operator/admin 이 실제로 지정되는 입력 경로가 현재도 열려 있는지(폼/시드/관리자 지정).
- [ ] role_assignments 의 bare 잔재(test 마이그레이션) 현황·정리 필요성.

확인용 집계 쿼리(자격증명 확보 시):
```sql
SELECT service_key, role, COUNT(*) FROM service_memberships
WHERE role IN ('operator','admin') OR role ~ '^(operator|admin)$'
GROUP BY service_key, role ORDER BY service_key, role;

SELECT role, COUNT(*) FROM role_assignments
WHERE is_active = true AND role !~ ':' GROUP BY role ORDER BY role;
```

---

## 조사 대상 파일

- [MembershipConsoleController.ts](../../apps/api-server/src/controllers/operator/MembershipConsoleController.ts) — membershipRole 무검증 UPDATE / 리스트·상세 roles[]·memberships[] 구성
- [operator-registration.service.ts](../../apps/api-server/src/modules/neture/services/operator-registration.service.ts) — Neture 승인 namespacing
- [MembershipApprovalService.ts](../../apps/api-server/src/services/approval/MembershipApprovalService.ts) — 공통 승인, `['admin','operator']` bare 수용 전제
- [ServiceMembership.ts](../../apps/api-server/src/modules/auth/entities/ServiceMembership.ts) · [RoleAssignment.ts](../../apps/api-server/src/modules/auth/entities/RoleAssignment.ts) · [roles.ts](../../apps/api-server/src/types/roles.ts)
- `auth-context.helper.ts` — 로그인 roles[] 주입
- 마이그레이션: PrefixUnprefixedRoles(1771200000019), CleanupLegacyRoles(20260228000001), NetureRolePrefixMigration(20260205060000), KpaRolePrefixMigration(20260205040103), ActivateGlycopharmTestAccounts(20260317110000)

*코드 경로 분석 기반. DB 실데이터 확인 항목은 "미확인 항목"에 명시. 코드 수정·데이터 보정 없음.*
