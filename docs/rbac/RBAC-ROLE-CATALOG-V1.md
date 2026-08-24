# RBAC Role Catalog V1

> 허용 Role 목록 및 접두어 정책 | 2026-02-27

---

## 1. Layer A — role_assignments 허용 Role 목록

### Platform Roles (접두어 없음)

| Role | 용도 | 부여 |
|------|------|------|
| `user` | 일반 사용자 (기본값) | 허용 |
| `customer` | 고객 | 허용 |

#### 접두어 없는 admin tier(`super_admin` · `admin` · `operator`)는 **신규 부여 금지**

플랫폼 관리자 역할의 정본은 **`platform:` 접두어 계약**이다(`platform:super_admin`).
접두어 없는 admin tier 는 legacy 값이며 **어떤 경로도 새로 부여하지 않는다.**

- 멤버십 lifecycle(승인 · 정지 해제)은 `isBareAdminTierRole()` 로 부여를 거부한다
  — `apps/api-server/src/services/approval/MembershipApprovalService.ts`.
  서비스 membership 의 `role` 문자열이 `admin`/`super_admin` 이어도 역할은 생기지 않는다
  (WO-O4O-CROSSSERVICE-LEGACY-BARE-ROLE-CENSUS-AND-CLEANUP-V1 D-B).
- Neture 가입 승인도 같은 이유로 승격을 거부한다
  (`operator-registration.service.ts` — `ROLE_PROMOTION_NOT_ALLOWED`).
- 추측 변환도 하지 않는다. bare 값에 서비스 접두어를 붙이는 것은 권한 확대다.

**아직 읽는 곳은 있다**(회수가 아니라 부여만 막은 상태). 아래 소비처는 legacy 호환으로
bare 값을 여전히 인정하므로, 값이 존재하면 그대로 동작한다.

| 소비처 | 인정하는 bare 값 |
|--------|------------------|
| `services/auth/auth-login.service.ts` (`PLATFORM_ADMIN_ROLES`) | `super_admin` |
| `modules/lms/routes/lms.routes.ts` (`PLATFORM_ADMIN_ROLES`) | `admin` · `super_admin` |
| `utils/role-revoke-safety.ts` (`isAdminTierRoleName` — 회수 안전장치) | `admin` · `operator` · `super_admin` |

> 2026-08-24 프로덕션 실측: 활성 bare admin tier 0행(`super_admin` 1행은 비활성 이력).
> 즉 위 소비처가 실제로 태우는 사용자는 없다. 소비처 제거는 별도 판단 사항이다.

`platform:admin` · `platform:operator` 는 **코드에서 제거됐다**(보유자 0 ·
`platform:super_admin` 대비 독립 권한 0) — `apps/api-server/src/types/roles.ts`.

### Commerce · Service Roles (접두어 없음)

| Role | 용도 |
|------|------|
| `vendor` | 벤더 |
| `seller` | 판매자 |
| `supplier` | 공급자 — Neture 공급자에 실사용. 접두어 없음이 의도된 계약이다 (WO-NETURE-ROLE-NORMALIZATION-V1) |
| `partner` | 파트너 |
| `manager` | 매니저 |
| `pharmacy` | GlycoPharm 약국. 접두어 없음이 **정규값**이다 — `20260318110000-RenamePharmacistToPharmacyRole` 로 `pharmacist` → `pharmacy` 개명, `20260326100000-NormalizeGlycopharmPharmacyRole` 로 확정. 소비처는 bare 문자열을 직접 읽는다 (`controllers/forum/ForumRecommendationController.ts`) |

> 2026-08-24 프로덕션 실측(활성 role_assignments): `supplier` 6 · `pharmacy` 2 · `customer` 7 · `user` 2.
> `vendor` · `seller` · `partner` · `manager` 는 **보유자 0** 이다. 목록에는 남기되 신규 부여 대상이 아니다.
> (`manager` 를 조회하는 코드 대부분은 `organization_members.role` — RBAC role 축이 아니다.)

> `store_owner` 는 이 목록에 없다 — 매장 경영자 판정은 전부 접두어 형태다
> (`{kpa|glycopharm|cosmetics|pharmacy-hub}:store_owner`). bare `store_owner` 를 읽는
> 소비처는 0이며, 유일하게 남아 있던 활성 1행은 회수됐다
> (migration `20270318000000-RevokeOrphanedBareStoreOwnerRole`).

### Service Prefix Roles

| Prefix | 서비스 | 예시 |
|--------|--------|------|
| `platform:` | 플랫폼 Core | `platform:super_admin` |
| `kpa:` | KPA 약사회 | `kpa:admin`, `kpa:pharmacist`, `kpa:branch_admin`, `kpa:branch_operator` |
| `neture:` | 네처 | `neture:admin`, `neture:operator`, `neture:seller`, `neture:supplier`, `neture:partner` |
| `glycopharm:` | 글라이코팜 | `glycopharm:admin`, `glycopharm:operator`, `glycopharm:pharmacist`, `glycopharm:store_owner` |
| `glucoseview:` | 글루코스뷰 | `glucoseview:admin`, `glucoseview:operator` |
| `cosmetics:` | K-화장품 | `cosmetics:admin`, `cosmetics:operator` |
| `pharmacy-hub:` | 파머시 허브 | `pharmacy-hub:admin`, `pharmacy-hub:operator`, `pharmacy-hub:store_owner` |

#### Admin ⊃ Operator 계층

KPA · Neture · K-Cosmetics · Pharmacy-Hub · GlycoPharm 은 동일 계층을 `scopeRoleMapping` 으로 **명시**한다.

```text
{service}:admin    요구 → admin 만 허용
{service}:operator 요구 → operator 또는 admin 허용
```

- Pharmacy-Hub 의 `store_owner` 는 **사업자 신분** 역할이므로 admin 이 대신하지 않는다
  (`pharmacy-hub:admin` 은 운영 권한만 포괄).
- **`pharmacy-hub:supplier` 는 없다** (WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1).
  공급자는 Pharmacy-Hub 회원이 아니라 Neture 공급자(`neture:supplier`)이며, Neture 에서 켠 제공
  설정이 Pharmacy-Hub 매장 HUB 로 그대로 유입된다. 정본:
  [`docs/baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md`](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md).
- Pharmacy-Hub scope config 위치는 `apps/api-server/src/middleware/pharmacy-hub-scope.middleware.ts` 다.
  `security-core` 가 F1 Freeze 대상이라 의도적으로 로컬에 둔 것이며, 아래 §5 절차 2번의 예외다.
- GlycoPharm 은 `scopeRoleMapping` 이 없어 두 역할이 fallback(allowedRoles 전체 허용) 으로
  평가되던 상태였으나 **WO-O4O-GLYCOPHARM-AUTHORIZATION-HIERARCHY-AUDIT-AND-FIX-V1 에서 해소**됐다.
  이제 5개 서비스 모두 fallback 에 의존하지 않는다.

---

## 2. Layer B — organization_members (별도 관리)

| 테이블 | 컬럼 | 역할 |
|--------|------|------|
| `organization_members` | `role` | `owner`, `admin`, `member` |

Layer A와 Layer B는 혼합 금지:
- Layer A: 서비스 접근 권한 (누가 어떤 서비스를 쓸 수 있는가)
- Layer B: 조직 내 역할 (조직 안에서 무슨 권한을 가지는가)

---

## 3. 금지 Role 값

다음 값은 생성/할당 금지:

| 금지 값 | 사유 |
|---------|------|
| `administrator` | `admin` 사용 |
| `superadmin` | `super_admin` 사용 |
| `super-admin` | `super_admin` 사용 |
| `vendor_manager` | 복합 역할 금지 |
| `beta_user` | 기능 플래그로 대체 |
| `kpa-b:*` | 미승인 서비스 키 |
| `kpa-c:*` | 미승인 서비스 키 |

---

## 4. 접두어 정책

| 규칙 | 설명 |
|------|------|
| `service:role` 형태만 허용 | 예: `kpa:admin`, `neture:seller` |
| 접두어 없는 role | Platform Core로 간주 (`admin`, `user`, `seller` 등) |
| `platform:*` | `platform:super_admin`만 활성 사용 |
| 새 서비스 추가 시 | CLAUDE.md 6절 인프라 목록에 등록 후 접두어 사용 |

---

## 5. Role 추가 절차

1. 이 문서(`RBAC-ROLE-CATALOG-V1.md`)에 역할 추가
2. `packages/security-core/src/service-configs.ts`의 해당 서비스 config에 `allowedRoles` 추가
3. `UserRole` enum에 등록 (해당하는 경우)
4. `roleAssignmentService.assignRole()` 기반 할당 구현
5. PR 리뷰 시 이 문서 갱신 여부 확인

---

*Document Version: 1.0*
*Last Updated: 2026-02-27*
