# IR-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-V1

**작성 일자**: 2026-06-03
**조사 환경**: HEAD (main) `627e6c4f0` 시점 (read-only)
**작업 성격**: read-only 조사 IR — 코드/UI/route/API/DB/migration/package 수정 없음
**목적**: Neture operator 회원관리(`/operator/members`) 편집 모달의 "운영 권한"(운영자/관리자) 변경 기능이 거버넌스 경계를 위반하는지 판정하고, platform admin 전용으로 수렴 가능한지(갭 여부) 확정한다.

---

## 1. 조사 개요

`neture.co.kr/operator/members` 회원 편집 모달에서 "운영 권한" 드롭다운(일반 회원 / 운영자 / 관리자)으로 **서비스 운영자·관리자가 같은 서비스 회원에게 운영자/관리자 권한(`role_assignments`)을 부여**할 수 있다. 사용자가 정한 canonical 정책은 "운영자/관리자 지정은 `admin.neture.co.kr`(platform admin)에서"이며, 현 화면은 이를 위반하는 drift다.

**핵심 판정**: **drift 확정 + platform admin 전용 수렴 가능(갭 없음)**.
- ① **거버넌스 누수** — 권한 부여(거버넌스, CLAUDE.md §11 Admin 영역)가 operator console에 mutation 형태로 노출됨. 백엔드 가드는 *절반만* 막혀 있어 서비스 **관리자**(`neture:admin`)는 여전히 operator/admin을 부여 가능.
- ② **단일 select 데이터 평면화 버그** — `role_assignments`는 1:N(운영자+관리자 동시 보유 가능)인데 UI는 단일 select + `DELETE 기존 → POST 신규` 덮어쓰기라 다중 역할을 손실/불일치시킴.
- ③ **두 개념 혼재** — "회원 유형"(`service_memberships.role`, 운영자 고유 업무)과 "운영 권한"(`role_assignments`, 거버넌스)이 같은 모달에 나란히 편집 가능하게 묶임.
- ④ **갭 없음** — platform admin(`apps/admin-dashboard`)에 부여/회수/일괄해제 UI + 백엔드 경로가 **additive·비파괴** 형태로 이미 완비 → operator console에서 편집을 떼어내도 대체 경로 존재.

---

## 2. 사전 git 상태

```
git rev-parse --short HEAD → 627e6c4f0
git rev-list --left-right --count HEAD...origin/main → 0  0
```

다른 세션 WIP(다수 `?? docs/investigations/CHECK-O4O-*`) 미접촉. 본 IR은 신규 IR 문서 1개만 생성, 코드/git 변경 없음.

---

## 3. 조사 대상 (file_path:line)

| 구분 | 항목 |
|------|------|
| operator 드롭다운 옵션 | `services/web-neture/src/pages/operator/EditUserModal.tsx:40-44` (`adminRoleOptions`) |
| operator select 렌더 | `packages/operator-core-ui/src/modules/members/CommonEditUserModal.tsx:402-406` |
| operator 역할 변경 로직 | `packages/operator-core-ui/src/modules/members/CommonEditUserModal.tsx:310-317` (DELETE→POST) |
| operator 백엔드 부여 | `apps/api-server/src/controllers/operator/MembershipConsoleController.ts:1034-1130` (`assignMemberRole`) |
| operator 백엔드 회수 | `apps/api-server/src/controllers/operator/MembershipConsoleController.ts:1136-1226` (`removeMemberRole`) |
| operator route | `apps/api-server/src/routes/operator/membership.routes.ts:47-48` |
| **platform admin UI** | `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` |
| platform admin 부여 | `POST /api/v1/admin/users`, `PUT /api/v1/admin/users/:id` — route `apps/api-server/src/routes/admin/users.routes.ts:40,56` / ctrl `AdminUserController.ts:189-376` |
| platform admin 회수 | `DELETE /api/v1/admin/users/:userId/role-assignments/:role` — route `users.routes.ts:86` / ctrl `AdminUserController.ts:483-533` |
| 테이블 | `apps/api-server/src/modules/auth/entities/RoleAssignment.ts:32-182`(1:N) / `ServiceMembership.ts:35-73`(1:1) |

---

## 4. 두 드롭다운의 성격 구분

| UI 필드 | 매핑 | 성격 | operator 권한 |
|---------|------|------|---------------|
| **회원 유형** (공급자/파트너…) | `service_memberships.role` | 서비스 내 참여 유형 | ✅ operator 고유 업무 (편집 유지) |
| **운영 권한** (운영자/관리자) | `role_assignments.role` (`neture:operator`/`neture:admin`) | **권한 부여 = 거버넌스** | ❌ platform admin 전용으로 이관 |

---

## 5. 현 백엔드 가드 현황 (절반만 차단)

`MembershipConsoleController.assignMemberRole` (1074-1110):
- 일반 **운영자**는 admin 역할 부여 불가 (`Only admins can manage admin-level roles`).
- 서비스 scope 밖 역할 차단.
- **그러나** 서비스 **관리자**(`neture:admin`)는 같은 서비스 회원에게 `neture:operator`·`neture:admin`을 **여전히 부여 가능** → 공동관리자/운영자 양산 surface가 열려 있음.

→ UI만 제거하면 API로 우회되므로 **백엔드 가드 강화가 함께 필요**.

---

## 6. Platform Admin 측 현황 (갭 없음)

| 항목 | 상태 | 근거 |
|------|------|------|
| 앱 | 있음 | `apps/admin-dashboard` (`@o4o/admin-dashboard`, admin.neture.co.kr 대응) |
| 부여/회수/일괄해제 UI | 있음 | `OperatorsPage.tsx` — RowActionMenu(Edit/권한해제) + ActionBar(Bulk) |
| 다중 역할 | **Additive** | `toggleRole` roles 배열 토글, 백엔드 `for (const r of rolesToAssign) assignRole(...)` |
| 회수 | **비파괴 soft-revoke** | per-assignment `is_active=false` (덮어쓰기 아님) |
| scope 가드 | 있음 | `requireRole(['platform:admin','platform:super_admin'])` (route L40/56/86) |

→ operator console 단일 select 덮어쓰기 버그와 **정반대로 올바르게 구현**됨. 이관 시 기능 갭 없음.

---

## 7. 결정 (사용자 승인: 2026-06-03)

**운영자/관리자 권한 부여(`role_assignments` write)는 platform admin 전용.** 서비스 운영자·관리자는 부여/회수 불가, 표시(읽기)만 허용.

근거: 사용자 정책(admin.neture.co.kr canonical)과 일치 · 거버넌스 경계 단일 규칙으로 단순 · 서비스 admin 자기 권한 상승 surface 제거.

---

## 8. 최소 수정 범위 (후속 WO 대상 — 본 IR에서는 구현하지 않음)

1. **프론트(operator console)** — `CommonEditUserModal`의 "운영 권한"을 **읽기 전용 다중 배지**로 전환 (운영자+관리자 동시 표시). select + 310-317 DELETE/POST 역할 변경 로직 제거. "회원 유형" 편집은 유지.
2. **백엔드(defense in depth)** — `assignMemberRole`/`removeMemberRole`에서 대상이 operator/admin 레벨 역할이면 `scope.isPlatformAdmin`만 통과, 서비스 운영자·관리자 → 403.
3. **표시 정합** — 단일 select 평면화 폐기로 ②번 데이터 손실 버그 동시 해소. 부여/회수는 platform admin `OperatorsPage`로 일원화.

---

## 9. Freeze 영향 / WO 필요

본 변경은 다음 동결 영역을 건드린다 → **정식 WO 필수**:
- **F9 RBAC SSOT** — `role_assignments` write-path 권한 주체 변경(operator write 제거).
- **F11 User/Operator** — Operator 권한 범위 조정. (테이블 구조 불변이므로 스키마 변경은 없음.)

> 📄 관련: `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` · `docs/architecture/USER-OPERATOR-FREEZE-V1.md` · CLAUDE.md §11

---

## 10. 후속

- [ ] WO 발행: 위 §8 3계층 최소 수정 (`WO-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-LOCK-V1` 가칭)
- [ ] 적용 후 검증: ① operator console에서 운영 권한 읽기전용 확인, ② operator/admin scope로 `POST/DELETE .../roles` 직접 호출 시 403, ③ platform admin `OperatorsPage`에서 부여/회수 정상 동작.
