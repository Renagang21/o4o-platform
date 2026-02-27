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
| `glycopharm:` | 글라이코팜 | `glycopharm:admin`, `glycopharm:operator` |
| `glucoseview:` | 글루코스뷰 | `glucoseview:admin`, `glucoseview:operator` |
| `cosmetics:` | K-화장품 | `cosmetics:admin`, `cosmetics:operator` |

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
