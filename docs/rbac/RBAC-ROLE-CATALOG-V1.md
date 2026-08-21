# RBAC Role Catalog V1

> 허용 Role 목록 및 접두어 정책 | 2026-02-27

---

## 1. Layer A — role_assignments 허용 Role 목록

### Platform Roles (접두어 없음)

| Role | 용도 |
|------|------|
| `super_admin` | 플랫폼 최고 관리자 |
| `admin` | 플랫폼 관리자 |
| `operator` | 플랫폼 운영자 |
| `user` | 일반 사용자 (기본값) |
| `customer` | 고객 |

### Commerce Roles (접두어 없음)

| Role | 용도 |
|------|------|
| `vendor` | 벤더 |
| `seller` | 판매자 |
| `supplier` | 공급자 |
| `partner` | 파트너 |
| `manager` | 매니저 |

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
