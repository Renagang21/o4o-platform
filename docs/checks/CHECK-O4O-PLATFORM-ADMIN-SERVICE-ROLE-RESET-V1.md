# CHECK-O4O-PLATFORM-ADMIN-SERVICE-ROLE-RESET-V1

> 작성일: 2026-09-26 · 상태: **`CODE_DONE / AWAITING_DEPLOY_AND_REVOKE`**
> **migration 0 · schema 0 · production DB 직접 write 0**

---

## 1. 목표 상태

```text
플랫폼 관리자 = platform:super_admin
             = 모든 서비스의 운영자를 지정 · 해제할 수 있다

플랫폼 관리자 ≠ 각 서비스의 admin
             ≠ 각 서비스의 operator
```

관리자 계정에 붙어 있는 서비스 역할 9개를 회수해 `platform:super_admin` 하나만 남긴다.

## 2. 왜 코드부터 고쳤는가 — 가드가 정리를 막고 있었다

회수 경로는 저장소 전체에 2개뿐이고, **둘 다** 자기 해제를 전면 금지하고 있었다.

| 경로 | 차단 |
|---|---|
| `DELETE /api/v1/admin/users/:userId/role-assignments/:role` | `SELF_ROLE_REVOKE_FORBIDDEN` — 대상 계정 조회보다 앞 |
| `DELETE /api/v1/operator/members/:userId/roles/:role` | 같은 코드. 주석에 "platform admin 여부와 무관하게 적용" 명시 |

대상이 요청자 본인 계정이므로 **화면에서 눌러도 403** 이고, 남는 방법은 두 번째 `platform:super_admin`
을 임시로 세웠다가 되돌리는 우회뿐이었다. 그것은 정비가 아니라 회피다.

추가로 `{service}:admin` 5종은 `LAST_ADMIN_PROTECTED` 도 받는다. 그 서비스의 마지막 활성 admin 이면
누가 실행해도 403 이라, 관리자에게만 붙어 있는 서비스 admin 은 영영 정리할 수 없었다.

**가드를 우회하지 않고 가드의 의미를 바로잡았다.**

## 3. 변경 — 계약 축소(삭제 아님)

```text
platform:super_admin 자신의 service-scoped role 해제 = 허용
platform:super_admin 자신의 platform role 해제       = 금지 (그대로)

platform:super_admin 의 마지막 {service}:admin 해제   = 허용
그 밖의 요청자의 마지막 admin 해제                    = 기존 보호 그대로
```

| 파일 | 내용 |
|---|---|
| `utils/role-revoke-safety.ts` | `isServiceScopedRole()` · `canRevokeOwnRole()` 판정 신설. `revokeServiceAdminRoleWithLock(..., { allowLastAdmin })` 옵션 추가 — **판정·잠금·UPDATE 가 한 트랜잭션 안에 있어야 하므로 호출부가 아니라 정본에서 받는다** |
| `controllers/admin/AdminUserController.ts` | 자기 해제 가드에 `canRevokeOwnRole` 적용 · 마지막 admin 예외를 요청자 권한으로 전달 |
| `controllers/operator/MembershipConsoleController.ts` | 동일. 판정원은 이 컨트롤러가 이미 쓰는 `scope.isPlatformAdmin` 으로 통일(이중 파생 금지) |

**열지 않은 것**

- 자기 `platform:super_admin` 해제 — `SUPER_ADMIN_ROLE_PROTECTED`(중앙) · `LAST_PLATFORM_SUPER_ADMIN`(콘솔) 그대로
- 자기 `platform:admin` 등 다른 platform 역할 해제 — 금지 그대로
- prefix 없는 legacy 이름(`admin` · `operator`)의 자기 해제 — 어느 서비스 역할인지 문자열로 확정할 수 없어 **fail-closed**
- 비플랫폼 요청자의 모든 기존 보호 — 불변
- 동시성 계약 — `FOR UPDATE` 잠금·단일 트랜잭션 그대로

## 4. 테스트 (전부 PASS)

| 대상 | 결과 |
|---|---|
| `utils/__tests__/role-revoke-self-scope.test.ts` **신설** (16) | `isServiceScopedRole` 경계(platform 접두 · prefix 없음 · `:admin` · `neture:` · 비문자열) · `canRevokeOwnRole` 진리표 · `allowLastAdmin` 4경우(기본 보호 유지 · 예외 해제 · 미보유는 여전히 not_holder · 2명 이상은 옵션 무관) |
| `AdminUserController.roleRevokeSafety.test.ts` (32) | 구 계약 `자기 해제 = 무조건 금지` 를 **뒤집었다**. 플랫폼 관리자의 자기 operator·자기 마지막 admin 해제 허용 / 자기 `platform:*` · legacy 이름은 거절 / **비플랫폼 요청자는 종전 그대로 거절** / 플랫폼 관리자의 타인 마지막 admin 해제 허용(+ `FOR UPDATE` 유지) |
| `MembershipConsoleController.roleRevokeSafety.test.ts` (24) | 같은 계약을 두 번째 경로에서 고정. 마지막-admin 보호의 회귀는 **중앙 경로(비플랫폼 요청자)** 가 계속 담당하고, 이 경로에서는 "판정 SQL 이 느슨해지지 않았다"(`is_active = true` · 대상 role 문자열 1개)로 고정 |

`tsc --noEmit` rc=0 · 변경 6파일 `eslint` 0 errors / 0 **new** warnings.
`controllers/admin` + `controllers/operator` + `utils` 전체 로컬 재실행 = **157 PASS**.

## 5. 실행하지 못한 것 (정직 기록)

**운영 DB read-only census 를 수행하지 못했다.** 이 PC 에 ADC(`application_default_credentials.json`)가 없고
DB 자격정보를 담은 `.env` 도 없어 Cloud SQL Auth Proxy 를 띄울 수 없다. 따라서

- `platform:super_admin` 활성 보유자가 정확히 1명인지
- 각 `{service}:admin` 의 활성 보유자 수

를 **실측하지 못했다.** 추정으로 채우지 않는다. 회수 실행과 최종 검증은 **Admin 화면 실증**으로 대체한다
(`gcloud auth application-default login` 이 한 번 실행되면 DB 실측도 추가한다).

## 6. 남은 것

- **API 배포** — 이 변경은 API 단독(detector 판정으로 확정). 판정은 job 실행 · revision 생성 · traffic 전환 3단계.
- **회수 실행** — `admin.neture.co.kr` 에서 canonical revoke 로 9개:
  `cosmetics:admin` · `cosmetics:operator` · `kpa:admin` · `kpa:operator` · `kpa-branch:operator` ·
  `neture:admin` · `neture:operator` · `pharmacy-hub:admin` · `pharmacy-hub:operator`
- **POST 검증** — 관리자 active role = `platform:super_admin` 1개 · 서비스 admin/operator active = 0 ·
  `users` · Google identity · `service_memberships` 불변 · 테스트 계정 불변.
- **판정** — 하나라도 남으면 `PARTIAL / BLOCKED`. 남았는데 COMPLETE 로 적지 않는다.
