# CHECK-O4O-ADMIN-ADMIN-ACCOUNTS-STANDARD-TABLE-AND-CRUD-V1

> WO: `WO-O4O-ADMIN-ADMIN-ACCOUNTS-STANDARD-TABLE-AND-CRUD-V1`
> 성격: `/settings/admin-accounts` O4O 표준 목록 전환 + 안전 액션. **중지 #4 발동 → CRUD는 설계 보고.**
> Date: 2026-07-25 · commit `90730851c`(1파일, admin-dashboard 전용) · Deploy Admin success · 브라우저 smoke PASS

## 0. 결론 — ✅ PASS (표준 목록+안전 액션 구현, 생성/편집 CRUD는 설계 보고)

중지 조건 4개 중 **#4(부트스트랩 migration 이 특정 계정에 super_admin 재부여)만 발동**. WO 규정("발동 시
표준 목록 전환 + 안전한 기존 액션까지만, CRUD 는 설계 보고")에 따라: 수동 table → **BaseTable+FilterBar+
RowActionMenu 표준 목록**, 검색·상태·역할 필터, 단건/일괄 활성·비활성, 비밀번호 재설정(기존 계약 재사용)을 구현.
계정 생성·이름/이메일 수정·역할 CRUD 는 **코드 미구현**, §8 설계 보고. backend·API·DB 무변경.

## 1. 중지 조건 판정

| # | 조건 | 발동 | 근거 |
|---|---|:---:|---|
| 1 | 생성 API 없고 직접 DB write 필요 | ❌ | `POST /admin/users`(AdminUserController.createUser) 존재, role_assignments 씀 |
| 2 | users.roles vs role_assignments 우선순위 불명확 | ❌ | **role_assignments SSOT 명확**(F9, legacy 컬럼 20260228 드롭). 관리자 write-path 전부 role_assignments |
| 3 | 마지막 super_admin 보호 backend 불가 | ❌ | `LAST_SUPER_ADMIN`·`SELF_LOCK`·`SUPER_ADMIN_ONLY`(platform-accounts.routes) + revoke/delete super_admin 전면 차단 실재 |
| 4 | **부트스트랩 migration 이 특정 사용자에 최고권한 재부여** | ✅ | `ActivateAdminUser`→sohae2100(users.role/roles) · `BootstrapCanonicalSeedAccounts`→super-admin@o4o.com(role_assignments). 신환경 bootstrap 시 재부여 |

→ #4 발동 → **CRUD 코드 미구현·설계 보고** 분기.

## 2. 표준 목록 전환 (구현)

- `AdminAccountsSettings.tsx` 수동 `<table>` → **`BaseTable`**(@o4o/ui) + `O4OColumn`. clone=UsersListClean.tsx 패턴.
- 컬럼: 이름/이메일(super_admin 방패 아이콘)·역할(badge)·상태·생성일·마지막 로그인·`RowActionMenu`. 정렬·컬럼가시성·선택(`selectable`).
- **`FilterBar`**: 검색(이름·이메일·역할) + 상태 필터(활성/비활성) + 역할 필터(목록 등장 역할) + 일괄 작업 select.
- Pagination: BaseTable 표준(계정 소수라 전체 렌더, 대량 시 표준 페이지네이션 동작).

## 3. 안전 기존 액션 (구현, 기존 계약 재사용)

- **비밀번호 재설정**: `PATCH /admin/platform-accounts/:id/password { newPassword≥8 }`(모달, 기존 값 미표시).
- **단건 활성/비활성**: `PATCH /admin/platform-accounts/:id/status { isActive }`(RowActionMenu).
- **일괄 활성/비활성**: 선택 계정에 status API **반복**(Promise.allSettled). 본인/마지막 super_admin 등은
  **backend 가 개별 차단**(SELF_LOCK/LAST_SUPER_ADMIN) → 성공/실패 집계 토스트. 신규 API 0.
- 목록 응답에 비밀번호·해시 없음(backend projection 유지).

## 4. 미구현 (중지 #4 → 설계 보고) — §8

- 계정 **생성**(이름/이메일/초기상태/역할/임시 비밀번호), **이름·이메일 수정**, **역할 할당/제거**.

## 5. 권한·SSOT·감사

- **SSOT = role_assignments**(F9). 역할 변경은 RBAC Role Assignment 화면 위임(본 탭 역할 표시만).
- 권한: 목록/액션 전부 `requireRole(['platform:super_admin','platform:admin'])` + super_admin 대상은 super_admin만.
  비인가 접근 401/403(backend), 딥링크 hard-nav→/login 튕김(guard) 확인.
- 감사: RoleAssignmentService·status/password 변경은 `logger.info` 기록(전용 감사 테이블은 별도 — 이번 무변경).

## 6. 검증

### 정적
- DataTable(BaseTable)·검색·상태·역할 필터·단건/일괄 토글·비밀번호 재설정 · users hard delete 0 · backend/API/DB 0 ·
  typecheck(admin-dashboard) 0 · build 0.

### 브라우저 smoke (admin.neture.co.kr, sohae2100=super_admin, client-side nav)
- 로그인 → 설정 → 관리자 계정 탭: `/settings/admin-accounts` · **h2 '관리자 계정'** · 검색·상태필터·일괄작업 select ·
  **BaseTable 렌더 rows 2**(sohae2100·super-admin@o4o.com) · super_admin 배지 · console/pageerror 0.
- 딥링크 `page.goto(/settings/admin-accounts)`→/login 튕김(비인가 guard 동작, client-nav 로만 진입).
- 마지막 super_admin/본인 보호: 대상 2계정 모두 super_admin이라 실제 상태 변경은 backend 가 차단 — UI·계약 실재
  확인(보호 계정 상태 변경 미실행, net-0).

### 기존 비밀번호 재설정 무회귀
- 동일 엔드포인트·모달 계약 유지(전환 후에도 동작).

## 7. KPA 외 / 서비스 운영자

- 변경 = admin-dashboard 프론트 1파일. KPA/Neture/GP/KCos 서비스 운영자 계정 무변경(본 탭은 platform 관리자만 대상).

## 8. 설계 보고 — 계정 생성/편집/역할 CRUD (중지 #4 해소 후 apply-WO)

**API 는 모두 실재**(재사용 가능):
- 생성 `POST /admin/users { email, password(≥6), firstName, lastName, roles:['platform:admin'|'super_admin'], status, isActive }`
  → role_assignments assignRole. 이메일 중복 시 기존 유저에 역할 추가.
- 수정 `PUT /admin/users/:id`(name/email/status/roles 재동기 removeAll+assign).
- 역할 제거 `DELETE /admin/users/:userId/role-assignments/:role`(soft, super_admin 전면 차단).

**보류 사유(중지 #4)**: 부트스트랩 2경로가 특정 계정에 super_admin 재부여 →
- 생성한 계정/역할 변경이 신환경·재배포 bootstrap 과 상호작용(특히 super_admin 계정 정합).
- 안전 착수 선행: ① bootstrap super-admin 대상을 전용 계정으로 확정·이전(ActivateAdminUser sohae2100 의존 정리)
  ② 생성 UI 의 역할 화이트리스트(super_admin 신규 부여 정책) 확정 ③ 이메일 중복·임시 비밀번호 UX 계약.
- 위 확정 후 → apply-WO 에서 위 API 로 생성/편집 모달 + 이메일 중복 방지 + 자기/마지막 super_admin 보호(backend
  실재) 연결. **backend 신규 0**(전부 재사용).

## 9. 커밋

- 코드 `90730851c`(AdminAccountsSettings.tsx) · 본 CHECK.
