# O4O-ORGANIZATION-ROLE-STANDARD-V1

> **WO-O4O-ORGANIZATION-ROLE-STANDARD-V1**
> Status: Active Standard
> Date: 2026-03-26
> Scope: 설계 기준 확정 (코드 변경 없음)

---

## 1. 목적

O4O 플랫폼 전반에서 **User / Role / Organization** 관계를 표준화하여
모든 서비스에 일관된 구조 기준을 적용한다.

---

## 2. 핵심 원칙

### 2.1 3축 분리

```
User          = 로그인 주체 (Identity)
Role          = 사용자 유형 / 권한 (Permission)
Organization  = 사업체 (Business Entity, 데이터의 중심)
```

### 2.2 절대 금지

| 금지 항목 | 이유 |
|-----------|------|
| 사업자 정보를 role에 저장 | Role은 권한 전용 (RBAC-FREEZE F9) |
| Organization을 role로 대체 | 사업체는 데이터 주체, role은 접근 제어 |
| Profile로 사업자 정보 저장 | Profile = 개인 자격/속성, Organization = 사업체 |
| role_assignments에 사업 데이터 혼재 | Layer A/B 혼합 금지 |

---

## 3. 표준 관계 구조

### 3.1 테이블 계층

```
users (Identity SSOT) [FROZEN - F10, F11]
 ├── role_assignments (Permission SSOT) [FROZEN - F9]
 │     └── role = '{service}:{type}' (사용자 유형/권한)
 ├── service_memberships (Service Access SSOT) [FROZEN - F10]
 │     └── serviceKey + status (서비스 접근 자격)
 └── organization_members (Business Role) [ACTIVE]
       ├── organization_id → organizations
       └── role = 'owner' | 'manager' | 'staff' | 'member' (조직 내 역할)
```

### 3.2 Layer 분리 (RBAC-ROLE-CATALOG-V1 기준)

| Layer | 테이블 | 역할 | 예시 |
|-------|--------|------|------|
| **Layer A** | `role_assignments` | 서비스 접근 권한 | `neture:supplier`, `glycopharm:pharmacy` |
| **Layer B** | `organization_members.role` | 조직 내 비즈니스 역할 | `owner`, `manager`, `staff` |

**Layer A와 B 혼합 금지.** Layer A는 "무엇을 할 수 있는가", Layer B는 "조직 안에서 어떤 역할인가".

### 3.3 Organizations 테이블 (사업체 SSOT)

```sql
organizations (
  id, name, code, type,           -- 식별
  business_number,                 -- 사업자등록번호
  address, phone,                  -- 연락처
  "parentId", level, path,         -- 계층 구조
  created_by_user_id,              -- 생성자
  metadata,                        -- 확장 데이터
  storefront_config, template_profile, storefront_blocks  -- 스토어 설정
)
```

**organization_service_enrollments**로 서비스별 활성화 관리:
```sql
organization_service_enrollments (
  organization_id, service_code, status, config
)
```

---

## 4. 서비스별 현재 상태 및 적용 기준

### 4.1 GlycoPharm — 표준 준수 (변경 없음)

| 항목 | 상태 |
|------|------|
| Organization | `organizations` 테이블 (PK shared with `glycopharm_pharmacies`) |
| 확장 데이터 | `glycopharm_pharmacy_extensions` (organization_id FK) |
| 서비스 등록 | `organization_service_enrollments` (service_code='glycopharm') |
| 멤버십 | `organization_members` (role: owner/member) |
| Layer A Role | `glycopharm:admin`, `glycopharm:operator`, `glycopharm:pharmacy` |
| Layer B Role | `organization_members.role` = owner/member |
| 사업자 정보 | `organizations.business_number` + `organizations.address` |
| 약국 해결 | `createPharmacyContextMiddleware` → org 소유권 조회 |

**판정**: 표준 구조. `glycopharm:pharmacy`는 순수 사용자 유형 role.

### 4.2 KPA — 표준 준수 (레거시 동기화 유지)

| 항목 | 상태 |
|------|------|
| Organization | `organizations` ← `kpa_organizations` 동기화 |
| 멤버십 | `kpa_members` (organization_id, role, membership_type) |
| Layer A Role | `kpa:admin`, `kpa:operator`, `kpa:branch_admin`, `kpa:district_admin` |
| Layer B Role | `kpa_members.role` = member/admin |
| Profile | `kpa_pharmacist_profiles`, `kpa_student_profiles` (개인 자격) |
| 사업자 정보 | `organizations` (약국/지부/분회 데이터) |

**판정**: 표준 구조. Profile은 개인 자격(면허번호, 대학 정보)으로 Organization과 분리됨.

**주의**: `kpa_members`는 `organization_members`와 별도 존재. 향후 통합 검토 대상이나 현재 변경 불필요.

### 4.3 K-Cosmetics — 표준 준수 (Bridge 완료)

| 항목 | 상태 |
|------|------|
| Organization | `organizations` ← `cosmetics_stores` bridge (`organization_id` column) |
| 멤버십 | `organization_members` (owner/manager) + `cosmetics_store_members` (owner/manager/staff) |
| Layer A Role | `cosmetics:admin`, `cosmetics:operator` |
| Layer B Role | `cosmetics_store_members.role` = owner/manager/staff |
| 사업자 정보 | `cosmetics_stores.business_number` + `organizations` |
| 미사용 Role | `cosmetics:pharmacist`, `cosmetics:user`, `cosmetics:supplier`, `cosmetics:seller`, `cosmetics:partner` |

**판정**: 구조적으로 표준 준수. **미사용 role 5개 정리 필요** (후속 WO).

### 4.4 Neture — 표준 미준수 (유일한 Gap)

| 항목 | 상태 | 문제 |
|------|------|------|
| Organization | **❌ 연결 없음** | `neture_suppliers`에 `organization_id` 없음 |
| 사업자 정보 | `neture_suppliers` 테이블에 임베딩 | businessNumber, representativeName, businessAddress 등 |
| 멤버십 | `service_memberships` (serviceKey='neture') | org membership 없음 |
| Layer A Role | `neture:admin`, `neture:operator`, `neture:supplier`, `neture:partner` |
| Layer B Role | **없음** | organization_members 미사용 |
| Supplier 식별 | `neture_suppliers.user_id` → users 직접 연결 | |

**판정**: **유일하게 organization 미통합 서비스.**

**현재 구조**:
```
users.id ← neture_suppliers.user_id (1:1)
neture_suppliers에 사업자 정보 전부 포함
```

**목표 구조** (후속 WO):
```
users.id ← organization_members.user_id
              └── organization_id → organizations (사업자 정보)
                    └── organization_service_enrollments (service_code='neture')
neture_suppliers → neture_supplier_extensions (organization_id FK)
```

**제약**: `NETURE-DOMAIN-ARCHITECTURE-FREEZE` 적용 — 명시적 WO 필요.

### 4.5 GlucoseView — 표준 준수 (Care 통합 경로)

| 항목 | 상태 |
|------|------|
| Organization | `organizations` (GlycoPharm pharmacy와 공유) |
| 약사 데이터 | `glucoseview_pharmacists` (면허, 승인 워크플로우) |
| 환자 데이터 | `glucoseview_customers` + `patient_health_profiles` |
| Layer A Role | `glucoseview:admin`, `glucoseview:operator`, `glucoseview:pharmacist`, `glucoseview:user` |
| 약국 해결 | Care middleware → `organizations` + `organization_members` |
| 사업자 정보 | `organizations` (GlycoPharm pharmacy 경유) |

**판정**: 표준 구조. 약국은 GlycoPharm organization을 공유.

---

## 5. Role 정의 표준

### 5.1 명명 규칙

```
{service}:{type}
```

### 5.2 유효한 Role 유형

| 유형 | 의미 | 예시 |
|------|------|------|
| `admin` | 서비스 관리자 (구조/정책/금융) | `neture:admin` |
| `operator` | 서비스 운영자 (콘텐츠/모니터링) | `glycopharm:operator` |
| `pharmacy` | 약국 운영자 (사용자 유형) | `glycopharm:pharmacy` |
| `supplier` | 공급자 (사용자 유형) | `neture:supplier` |
| `partner` | 파트너 (사용자 유형) | `neture:partner` |

### 5.3 Role이 담지 않는 것

- 사업자등록번호 → `organizations.business_number`
- 대표자명 → `organizations` 또는 extension 테이블
- 주소/연락처 → `organizations.address` / `organizations.phone`
- 면허번호 → Profile 테이블 (`kpa_pharmacist_profiles` 등)
- 조직 내 직급 → `organization_members.role`

---

## 6. Organization이 담는 것

### 6.1 필수 필드 (organizations 테이블)

| 필드 | 용도 |
|------|------|
| `name` | 사업체명 |
| `code` | 고유 코드 (UNIQUE) |
| `type` | 유형 (branch, pharmacy, supplier, store 등) |
| `business_number` | 사업자등록번호 |
| `address` | 주소 |
| `phone` | 연락처 |
| `created_by_user_id` | 생성자 (소유자 추적) |

### 6.2 서비스별 확장 데이터

| 서비스 | 확장 테이블 | 확장 필드 |
|--------|------------|----------|
| GlycoPharm | `glycopharm_pharmacy_extensions` | enabled_services, hero_image, logo, sort_order |
| K-Cosmetics | `cosmetics_stores` (자체 필드) | region, status, slug, logo, hero_image |
| KPA | `kpa_organizations` (레거시) | description |
| Neture | **없음** (후속 WO에서 생성) | — |

---

## 7. FROZEN 제약 사항

이 표준은 기존 Freeze 선언을 준수합니다:

| Freeze | 영향 | 제약 |
|--------|------|------|
| F9 (RBAC) | `role_assignments` | 구조 변경 금지, roleAssignmentService만 사용 |
| F10 (O4O Core) | Auth, Membership, Approval, RBAC | Core Layer 모듈 구조 변경 금지 |
| F11 (User/Operator) | users, service_memberships, role_assignments 3테이블 | 컬럼 추가/삭제 금지 |
| F6 (Boundary) | Domain Boundary Matrix | 서비스별 Primary Boundary 변경 금지 |
| Neture Domain Freeze | neture_suppliers 등 | 구조 변경 시 명시적 WO 필요 |

---

## 8. Gap 분석 요약

### 8.1 표준 준수 서비스 (4/5)

| 서비스 | 상태 | 비고 |
|--------|------|------|
| GlycoPharm | **준수** | 완전 통합 |
| KPA | **준수** | kpa_members ↔ organization_members 이중화는 허용 |
| K-Cosmetics | **준수** | Bridge 완료 |
| GlucoseView | **준수** | GlycoPharm org 공유 |

### 8.2 미준수 서비스 (1/5)

| 서비스 | Gap | 우선순위 |
|--------|-----|---------|
| **Neture** | organization 미연결, 사업자 데이터 임베딩 | 후속 WO 필요 |

### 8.3 정리 대상

| 항목 | 서비스 | 내용 |
|------|--------|------|
| 미사용 Role 정리 | K-Cosmetics | pharmacist, user, supplier, seller, partner (5개) |
| PROFILE_MAP 등록 | GlucoseView | patient_health_profiles 미등록 |

---

## 9. 후속 Work Order

### 9.1 WO-O4O-NETURE-ORGANIZATION-INTEGRATION-V1 (우선)
- `neture_suppliers` → `organizations` 연결
- 사업자 데이터를 `organizations`로 이동
- `neture_supplier_extensions` 생성 (Neture 고유 필드)
- **NETURE-DOMAIN-ARCHITECTURE-FREEZE 예외 승인 필요**

### 9.2 WO-O4O-COSMETICS-ROLE-CLEANUP-V1
- 미사용 role 5개 비활성화 또는 제거
- `cosmetics:pharmacist`, `cosmetics:user`, `cosmetics:supplier`, `cosmetics:seller`, `cosmetics:partner`

### 9.3 WO-O4O-GLUCOSEVIEW-PROFILE-STANDARDIZATION-V1
- `patient_health_profiles` → PROFILE_MAP 등록
- `glucoseview_pharmacists` 표준화 검토

### 9.4 WO-O4O-KPA-MEMBERS-CONSOLIDATION-V1 (장기)
- `kpa_members` ↔ `organization_members` 통합 검토
- 현재는 이중화 허용 (기능적으로 문제 없음)

---

## 10. 검증 체크리스트

- [x] 각 서비스에서 organization 기반 구조 유지되는가
- [x] role이 권한/유형으로만 사용되는가
- [x] 사업자 정보가 organization에 존재하는가
- [ ] Neture만 미준수 — 후속 WO로 해결

---

*Version: 1.0*
*Author: AI Assistant*
*Approved: Pending*
