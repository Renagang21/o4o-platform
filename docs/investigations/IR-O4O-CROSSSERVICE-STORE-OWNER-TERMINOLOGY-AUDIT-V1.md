---
id: IR-O4O-CROSSSERVICE-STORE-OWNER-TERMINOLOGY-AUDIT-V1
title: 4 서비스 매장 경영자 / Store Owner 용어 · 내부값 정합성 조사
status: completed
date: 2026-05-24
domain: cross-service / role-terminology / canonical-alignment
related:
  - WO-O4O-LOGIN-SERVICEKEY-FRONTEND-ALIGNMENT-V1
  - WO-O4O-AUTH-REGISTER-UX-IMPROVEMENT-V1
  - WO-O4O-KCOS-COSMETICS-MEMBER-PROFILE-FOUNDATION-V1
  - WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION-V1
  - WO-O4O-GLYCO-CARE-BACKEND-CLEANUP-V1
  - UnifyNetureRoles20260331500000 (migration)
  - UnifyCosmeticsRolesCatalog20260331500000 (migration)
  - BackfillStoreOwnerRoles20260900000000 (migration)
  - NormalizeServiceMembershipsCosmeticsKey20260929000000 (migration)
constitution:
  - CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)
  - CLAUDE.md §7 (Boundary Policy — serviceKey/role 분리)
  - CLAUDE.md §14 F11 (User/Operator Freeze — Operator=membership 기반)
  - docs/baseline/USER-DOMAIN-SSOT-V1.md
  - docs/baseline/ROLE-POLICY-AND-GUARD-V1.md
  - docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md (§3.2 운영사업자 정의)
---

# IR-O4O-CROSSSERVICE-STORE-OWNER-TERMINOLOGY-AUDIT-V1

> Neture 의 `seller` 내부값을 "매장 경영자" 개념으로 정비하기 전에, **KPA-Society / GlycoPharm / K-Cosmetics / Neture 4 서비스가 현재 어떤 용어와 내부값을 쓰는지** 코드 사실로 조사. 결과를 토대로 Neture seller 처리 방향(유지/정규화/alias) 을 권고. **읽기 전용 조사 — 코드 수정 없음.**

---

## 0. TL;DR

| 의문 | 코드 fact 기반 답 |
|------|-----------------|
| 4 서비스가 같은 개념을 같은 내부값으로 쓰나? | ❌ 4 서비스가 4 가지 다른 패턴 |
| K-Cos 가 canonical인가? | ✅ 가장 정규화된 상태 — `cosmetics:store_owner` role + `sub_role` 분류 + service_key='k-cosmetics' canonical |
| Neture 에 store_owner 가 있나? | ❌ **0 건** — `seller` 만 존재 |
| 즉시 수정 가능한 drift? | Neture 대시보드 "셀러" 라벨 → "매장 경영자" 통일 (UI only) |
| 내부값 정규화 필요? | ✅ **별도 WO 필요** — Neture seller → store_owner migration, GP `pharmacy_owner` sub_role 명칭 정렬, KPA pharmacy/store 코드 위치 정리 |
| 최종 권고 | **Option C 변형** — 공통 internal value 는 `store_owner` 정규화 단계적 진행 + UI 는 도메인별 한글 유지 (약국 / 매장) |

---

## 1. 배경

- 직전 발견: Neture RegisterModal 에서 사용자는 "매장 경영자" 라벨로 표시되는 선택지를 클릭하지만, 내부값은 `seller` 로 저장됨 ([RegisterModal.tsx:36](services/web-neture/src/components/RegisterModal.tsx#L36))
- 동시에 4 서비스 공통 흐름이 `pharmacy → store` 정규화로 진행 중 (KPA migration, GP store_blog_posts 신규 entity, K-Cos NormalizeServiceMembershipsCosmeticsKey 등 직접 증거 있음)
- 의문: Neture seller 를 그대로 둘지 / `store_owner` 정규화할지 / 서비스별 alias 로 둘지 — **4 서비스 현재 상태를 먼저 확정해야** 결정 가능

---

## 2. 조사 범위

| # | 범위 | 산출물 |
|---|------|--------|
| 1 | UI 한글 라벨 (4 서비스) | 단어별 파일경로:라인 + 사용 위치 |
| 2 | 내부 role / activity_type / sub_role 값 (4 서비스) | 값별 파일경로:라인 + 의미 |
| 3 | service_key 정확한 값 (4 서비스) | canonical 매핑 표 |
| 4 | Neture seller 전수 사용처 | 파일별 + 의미 + supplier 혼용 여부 |
| 5 | KPA/GP/K-Cos 공통 패턴 vs 차이 | mirror 부분 / drift 부분 |
| 6 | 정규화 후보안 (Option A / B / C) | 장단점 + 수정 범위 + migration 필요 여부 |
| 7 | 최종 권고 | 즉시 / 후속 / 보류 분기 |
| 8 | Philosophy Conflict Check | 사업철학 SSOT 정합성 |

---

## 3. 조사 결과 — UI 한글 라벨 (서비스별 표)

### 3.1 KPA-Society

| 한글 라벨 | 파일경로:라인 | 사용 위치 |
|----------|--------------|----------|
| "약국 경영자" | [config/dashboard.ts:30](services/web-kpa-society/src/config/dashboard.ts#L30) | 라우팅 정책 주석 |
| "약국 개설자" | [RegisterModal.tsx:40](services/web-kpa-society/src/components/RegisterModal.tsx#L40) | 가입 모달 설명 (activity_type='pharmacy_owner') |
| "개설약사" | [RegisterModal.tsx:40](services/web-kpa-society/src/components/RegisterModal.tsx#L40) | 가입 모달 옵션 라벨 |
| "매장 경영자" | [config/navigation.ts:31](services/web-kpa-society/src/config/navigation.ts#L31), [App.tsx:185-228](services/web-kpa-society/src/App.tsx#L185-L228) | 내비/HUB/매장 관리 feature 주석 |
| "매장 HUB" | [App.tsx:674-688](services/web-kpa-society/src/App.tsx#L674-L688) | 라우트 + 컴포넌트 |
| "약국 HUB" | [App.tsx:674](services/web-kpa-society/src/App.tsx#L674) | legacy 주석 |
| "근무약사" | [App.tsx:551,651](services/web-kpa-society/src/App.tsx#L551) | /work/* 라우트 (activity_type='pharmacy_employee') |
| "판매자" | [MyContentPage.tsx:106,388](services/web-kpa-society/src/pages/dashboard/MyContentPage.tsx#L106) | 공급자 파트너십 대상 설명 |

**해석**: "약국 경영자" / "매장 경영자" / "약국 개설자" / "개설약사" 4 개가 동일 사용자(activity_type='pharmacy_owner') 를 가리키며 동의어로 혼재. "내 매장" / "내 약국" / "약국 HUB" / "매장 HUB" 도 같은 영역을 두 라벨로 표현.

### 3.2 GlycoPharm

| 한글 라벨 | 파일경로:라인 | 사용 위치 |
|----------|--------------|----------|
| "약국 경영자" | [RegisterPage.tsx:442](services/web-glycopharm/src/pages/auth/RegisterPage.tsx#L442) | 가입 페이지 섹션 제목 |
| "내 약국" | [api/glycopharm.ts:437](services/web-glycopharm/src/api/glycopharm.ts#L437), [MobilePharmacyPage.tsx:32](services/web-glycopharm/src/pages/mobile/MobilePharmacyPage.tsx#L32) | API 주석 + 모바일 탭 라벨 |
| "내 매장" | [B2BTableList.tsx:214](services/web-glycopharm/src/pages/hub/B2BTableList.tsx#L214), [GlycoPharmHubLayout.tsx:47](services/web-glycopharm/src/components/layouts/GlycoPharmHubLayout.tsx#L47) | HUB 카드 + 가져가기 액션 |
| "약국 HUB" | [MobilePharmacyPage.tsx:40](services/web-glycopharm/src/pages/mobile/MobilePharmacyPage.tsx#L40) | 모바일 탭 라벨 |
| "매장 HUB" | [config/navigation.ts:30](services/web-glycopharm/src/config/navigation.ts#L30), [HubBlogLibraryPage.tsx:166](services/web-glycopharm/src/pages/hub/HubBlogLibraryPage.tsx#L166) | 내비 주석 + HUB 페이지 제목 |
| "매장 운영 허브" (설정) | `glycopharmConfig.terminology.storeHubLabel` | 설정 라벨이 "매장 운영 허브" 인데 코드 일부는 "내 약국" 사용 |

**해석**: KPA와 동일 도메인(약국) 이지만 "매장" 표현 도입 시도. **설정과 코드 불일치** (설정 = "매장 운영 허브", 코드 일부 = "내 약국"). UI 일관성 부족.

### 3.3 K-Cosmetics

| 한글 라벨 | 파일경로:라인 | 사용 위치 |
|----------|--------------|----------|
| "매장 경영자" | [EditUserModal.tsx:46](services/web-k-cosmetics/src/pages/operator/EditUserModal.tsx#L46) | profileClassification sub_role 라벨 |
| "매장 근무자" | [EditUserModal.tsx:47](services/web-k-cosmetics/src/pages/operator/EditUserModal.tsx#L47) | profileClassification sub_role 라벨 |
| "매장 운영자" | [config/dashboard.ts:14](services/web-k-cosmetics/src/config/dashboard.ts#L14) | 역할 라벨 ('cosmetics:store_owner' 매핑) |
| "판매자" | [RegisterPage.tsx:21](services/web-k-cosmetics/src/pages/auth/RegisterPage.tsx#L21) | 가입 페이지 역할 선택 |
| "약국" | (검색 0 건) | K-Cos 도메인 외 표현 없음 ✅ |

**해석**: "매장" 표현 일관 + "약국" 누출 없음 — **가장 canonical**. 가입 시 "판매자" 라벨이 남아있으나 (legacy) backfill migration 으로 내부값은 'cosmetics:store_owner' 로 정규화 완료.

### 3.4 Neture

| 한글 라벨 | 파일경로:라인 | 사용 위치 |
|----------|--------------|----------|
| "매장 경영자" | [RegisterModal.tsx:36](services/web-neture/src/components/RegisterModal.tsx#L36) | 가입 폼 역할 선택 카드 + 설명: "매장을 운영하는 경영자" |
| "매장 정보" | [RegisterModal.tsx:568](services/web-neture/src/components/RegisterModal.tsx#L568) | seller 선택 시 입력 폼 헤드라인 |
| "매장명" | [RegisterModal.tsx:579](services/web-neture/src/components/RegisterModal.tsx#L579) | seller 입력 필드 |
| "셀러" | [config/dashboard.ts:18-19](services/web-neture/src/config/dashboard.ts#L18-L19) | 대시보드 라벨 (`getNetureRoleLabel`) |
| "매장을 운영하는 사장님" | [SellerOverviewPage.tsx:41-46](services/web-neture/src/pages/seller/SellerOverviewPage.tsx#L41-L46) | 페이지 제목/설명 |

**해석**: **가입 폼은 "매장 경영자"** 인데 대시보드는 "셀러" 사용. **UI 라벨 자체에서 혼용** — 동일 사용자가 가입과 운영 화면에서 다른 라벨로 표시됨.

---

## 4. 조사 결과 — 내부값 (서비스별 표)

### 4.1 4 서비스 service_key 및 prefix

| 서비스 | service_memberships.service_key | role prefix | 매핑 변환 필요? |
|--------|--------------------------------|-------------|----------------|
| KPA | `'kpa-society'` | `'kpa:'` | ✅ (`ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY['kpa']='kpa-society'`) |
| GlycoPharm | `'glycopharm'` | `'glycopharm:'` | ❌ self-map |
| K-Cosmetics | `'k-cosmetics'` | `'cosmetics:'` | ✅ (`['cosmetics']='k-cosmetics'`) |
| Neture | `'neture'` | `'neture:'` | ❌ self-map |

**해석**: KPA / K-Cos 만 prefix→key 변환 필요. service_key 자체는 4 서비스 모두 canonical 확정 (K-Cos는 migration `20260929`로 'cosmetics'→'k-cosmetics' 정규화 완료).

### 4.2 KPA-Society 내부값

| 값 | 파일경로:라인 | 의미 |
|----|--------------|------|
| `activity_type='pharmacy_owner'` | [RegisterModal.tsx:32,40](services/web-kpa-society/src/components/RegisterModal.tsx#L32-L40) | **가입 시 신고값** (kpa_members.activity_type) |
| `'kpa:store_owner'` (RBAC role) | [role-constants.ts:20](services/web-kpa-society/src/lib/role-constants.ts#L20) | **승인 시 부여** role (role_assignments) |
| `membership_type='pharmacist_member'` | [RegisterModal.tsx:23,64](services/web-kpa-society/src/components/RegisterModal.tsx#L23) | 약사 정회원 |
| `KpaMember.role='member'/'operator'/'admin'` | [member.controller.ts:967](apps/api-server/src/modules/kpa/controllers/member.controller.ts#L967) | 조직 내 역할 |

**가입→승인 흐름**:
```
RegisterModal: activity_type='pharmacy_owner' 선택
  ↓ POST /auth/register
  ↓ kpa_members.activity_type='pharmacy_owner' (status='pending')
운영자 승인 (member.controller.ts:603-761)
  ↓ organizations (code='kpa-pharm-{businessNumber}') 생성
  ↓ organization_members(role='owner') 추가
  ↓ role_assignments.role='kpa:store_owner' 부여
  ↓ platform_store_slugs 예약
```

### 4.3 GlycoPharm 내부값

| 값 | 파일경로:라인 | 의미 |
|----|--------------|------|
| `'glycopharm:pharmacist'` | [role-constants.ts:18](services/web-glycopharm/src/lib/role-constants.ts#L18) | **모든 member 의무 부여** |
| `'glycopharm:store_owner'` | [role-constants.ts:20](services/web-glycopharm/src/lib/role-constants.ts#L20) | `subRole='pharmacy_owner'` 인 경우만 추가 |
| `subRole='pharmacy_owner'`/`'staff_pharmacist'` | [glycopharm-member.entity.ts:22](apps/api-server/src/routes/glycopharm/entities/glycopharm-member.entity.ts#L22) | DB `glycopharm_members.sub_role` |
| `membership_type='pharmacist'` | [glycopharm-member.entity.ts:37](apps/api-server/src/routes/glycopharm/entities/glycopharm-member.entity.ts#L37) | patient 제거됨 (cleanup WO 후) |

**Guard**: [GlycoHubGuard.tsx:42](services/web-glycopharm/src/components/auth/GlycoHubGuard.tsx#L42) — pharmacist OR store_owner 통과.

**해석**: GP 는 KPA 보다 sub_role 컬럼을 명시적으로 사용. `pharmacy_owner` 라는 sub_role 명칭은 KPA의 activity_type 과 같음 — 도메인(약국) 정합.

### 4.4 K-Cosmetics 내부값

| 값 | 파일경로:라인 | 의미 |
|----|--------------|------|
| `role_assignments.role='cosmetics:store_owner'` | [BackfillStoreOwnerRoles20260900000000.ts:22](apps/api-server/src/database/migrations/20260900000000-BackfillStoreOwnerRoles.ts#L22) | RBAC role (prefixed) |
| `service_memberships.role='cosmetics:store_owner'` | [BackfillStoreOwnerRoles20260900000000.ts:86](apps/api-server/src/database/migrations/20260900000000-BackfillStoreOwnerRoles.ts#L86) | 서비스 회원 role |
| `service_memberships.service_key='k-cosmetics'` | [NormalizeServiceMembershipsCosmeticsKey20260929000000.ts:54,83](apps/api-server/src/database/migrations/20260929000000-NormalizeServiceMembershipsCosmeticsKey.ts#L54) | canonical service_key |
| `cosmetics_members.sub_role='store_owner'`/`'store_staff'` | [cosmetics-member.entity.ts:32](apps/api-server/src/modules/cosmetics/entities/cosmetics-member.entity.ts#L32) | 프로필 분류 (권한과 별개) |
| `cosmetics_store_members.role='owner'`/`'manager'`/`'staff'` | [cosmetics-store-member.entity.ts:27-30](apps/api-server/src/modules/cosmetics/entities/cosmetics-store-member.entity.ts#L27-L30) | 특정 매장 내 직급 (N:M) |

**해석**: 가장 정밀한 layered 모델 — **권한(role)** vs **분류(sub_role)** vs **매장 내 직급(store_member.role)** 3 layer 분리. UnifyCosmeticsRolesCatalog migration 에서 'seller' role 완전 제거됨.

### 4.5 Neture 내부값

| 값 | 파일경로:라인 | 의미 |
|----|--------------|------|
| `SignupRole = 'supplier' \| 'partner' \| 'seller' \| 'user'` | [RegisterModal.tsx:19](services/web-neture/src/components/RegisterModal.tsx#L19) | 가입 폼 선택지 4 종 |
| `service_memberships.role='seller'` | [auth-register.controller.ts:53-57](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L53-L57) | **legacy unprefixed** (가입 시 저장) |
| `role_assignments.role='seller'` | [UnifyNetureRoles20260331500000.ts:40-45](apps/api-server/src/database/migrations/20260331500000-UnifyNetureRoles.ts#L40-L45) | 승인 시 unprefixed seller 부여 |
| `LEGACY_ROLES.SELLER='seller'` | [role-constants.ts:29](services/web-neture/src/lib/role-constants.ts#L29) | legacy 상수 |
| `NETURE_ROLES.SELLER='neture:seller'` | [role-constants.ts:18](services/web-neture/src/lib/role-constants.ts#L18) | prefixed 상수 (정의는 있으나 실제 저장 안 됨) |
| `NETURE_SCOPE_CONFIG.allowedRoles` | [service-configs.ts](packages/security-core/src/service-configs.ts) | `['neture:admin', 'neture:operator', 'neture:supplier', 'neture:partner']` — **`'neture:seller'` 미포함** |

**해석**: Neture seller 는 **운영 role 이 아닌 B2B 사용자 role**. NETURE_SCOPE_CONFIG 의 관리 role 집합에서 의도적으로 제외됨. 정의는 prefixed 상수가 있으나 **실제 저장은 모두 unprefixed `'seller'`** — drift.

---

## 5. Neture seller 사용처 상세

### 5.1 전수 사용처

| # | 영역 | 파일경로:라인 | 의미 |
|---|------|--------------|------|
| 1 | UI 가입 | [RegisterModal.tsx:35-38](services/web-neture/src/components/RegisterModal.tsx#L35-L38) | role 선택 카드 ("매장 경영자" 라벨) |
| 2 | UI 가입 | [RegisterModal.tsx:567-589](services/web-neture/src/components/RegisterModal.tsx#L567-L589) | seller 선택 시 매장 정보 입력 폼 |
| 3 | 백엔드 가입 | [auth-register.controller.ts:53-57](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L53-L57) | service_memberships.role='seller' 저장 |
| 4 | RBAC | [UnifyNetureRoles20260331500000.ts:40-45](apps/api-server/src/database/migrations/20260331500000-UnifyNetureRoles.ts#L40-L45) | role_assignments 'neture:seller' → 'seller' 정규화 (역방향) |
| 5 | 라우트 | [seller.controller.ts](apps/api-server/src/modules/neture/controllers/seller.controller.ts) | SellerController — 제품, 주문, 계약 |
| 6 | 서비스 | [seller.service.ts](apps/api-server/src/modules/neture/services/seller.service.ts) | getMyProducts, getAvailableSupplyProducts |
| 7 | Entity | [NetureSupplier.entity.ts:24-156](apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts#L24-L156) | neture_suppliers (seller/supplier 통합 테이블) |
| 8 | Dashboard | [config/dashboard.ts:18-19](services/web-neture/src/config/dashboard.ts#L18-L19) | "셀러" UI 라벨 매핑 |
| 9 | Dashboard | [config/dashboard.ts:32,44](services/web-neture/src/config/dashboard.ts#L32-L44) | `/seller/overview` 라우트 매핑 |
| 10 | Guard 분기 | [role-constants.ts:58,97](services/web-neture/src/lib/role-constants.ts#L58-L97) | SUPPLIER_ROLES / DASHBOARD_B2B_ROLES 에 seller 포함 |

### 5.2 의미 분석

- **seller** = "개별 매장 점주" (Neture context)
- **supplier** = "제품 공급사 (제조/도매)"
- 둘은 다른 비즈니스 타입이지만 **같은 `neture_suppliers` 테이블에 row 가 생김** ([NetureSupplier.entity.ts](apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts)) — **테이블명과 의미 불일치 (Drift)**
- `SellerController` 와 `SupplierController` 가 따로 존재하나 entity 는 공유

### 5.3 store_owner 부재 확인

검색 결과:
- `'store_owner'` literal Neture context: **0 건**
- `'neture:store_owner'`: **0 건**
- store_owner 관련 entity / migration: 없음

→ Neture 에 `store_owner` 개념 자체가 정의된 적 없음. K-Cos 의 `cosmetics:store_owner` 와 정합되려면 새로운 role 추가 + migration 필요.

---

## 6. KPA/GP/K-Cos 공통 패턴 vs 차이

### 6.1 공통 패턴

| 패턴 | KPA | GP | K-Cos |
|------|:---:|:--:|:-----:|
| `service:store_owner` role 존재 | ✅ `kpa:store_owner` | ✅ `glycopharm:store_owner` | ✅ `cosmetics:store_owner` |
| 가입 후 운영자 승인 흐름 | ✅ | ✅ | ✅ |
| service_key canonical 확정 | ✅ | ✅ | ✅ (migration 20260929) |
| role prefix 사용 | ✅ | ✅ | ✅ |
| 별도 member entity (도메인별) | ✅ kpa_members | ✅ glycopharm_members | ✅ cosmetics_members |
| sub_role / activity_type 컬럼 | ✅ activity_type | ✅ sub_role | ✅ sub_role |
| 매장 내 N:M 직급 entity | (organization_members) | (없음) | ✅ cosmetics_store_members |

### 6.2 차이점

| 항목 | KPA | GP | K-Cos |
|------|-----|----|----|
| sub_role 컬럼명 | `activity_type` | `sub_role` | `sub_role` |
| sub_role 값 | `'pharmacy_owner'` | `'pharmacy_owner'` / `'staff_pharmacist'` | `'store_owner'` / `'store_staff'` |
| store_owner role 부여 단계 | 승인 시 자동 (activity_type='pharmacy_owner' 기반) | 승인 시 + subRole 조건부 | 승인 시 + sub_role 별도 PATCH |
| UI 기본 표현 | 약국 (혼재 매장) | 약국 + 매장 혼재 | **매장 (canonical)** |
| pharmacy/store 코드 위치 혼재 | ✅ /pharmacy/* + /store/* 공존 | ✅ pharmacy_* (DB) + store_* (신규) | ❌ store_* 통일 |
| 의무 부여 role (다중 부여) | `kpa:store_owner` 단독 | `glycopharm:pharmacist` 의무 + `store_owner` 조건부 | `cosmetics:store_owner` 단독 |

### 6.3 Neture 가 맞춰야 할 기준 (K-Cos canonical 기반)

| 기준 | Neture 현재 | 목표 |
|------|------------|------|
| store_owner role 존재 | ❌ 0 건 | ✅ `'neture:store_owner'` |
| prefixed role 저장 | ❌ unprefixed `'seller'` | ✅ `'neture:store_owner'` (prefixed) |
| service_memberships.role 정합 | ❌ `'seller'` | ✅ `'neture:store_owner'` |
| role_assignments.role 정합 | ❌ `'seller'` | ✅ `'neture:store_owner'` |
| sub_role 컬럼 도입 여부 | ❌ 없음 | (옵션) `neture_members.sub_role='store_owner'` 도입 검토 |
| 매장 정보 entity 분리 | ⚠️ neture_suppliers 공유 (drift) | (옵션) `neture_stores` 분리 검토 |
| UI 라벨 통일 | ❌ "매장 경영자" + "셀러" 혼용 | "매장 경영자" 단일 |
| supplier 와 의미 구분 | ⚠️ entity 공유 | role 명확 분리 |
| RegisterModal 폼 선택값 | `'seller'` | `'store_owner'` 또는 라벨 유지 + 백엔드 매핑 |

---

## 7. 정규화 후보안 (Option A / B / C)

### 7.1 Option A — Neture seller 유지, UI 라벨만 통일

| 항목 | 내용 |
|------|------|
| 변경 범위 | `services/web-neture/src/config/dashboard.ts:18-19` "셀러" → "매장 경영자" 라벨만 |
| DB migration | ❌ 불필요 |
| 기존 사용자 영향 | ❌ 없음 |
| Guard/Route 영향 | ❌ 없음 |
| Market Trial 대상 조건 | ❌ 영향 없음 |
| 장점 | 즉시 적용 가능, 위험 0 |
| 단점 | K-Cos / KPA canonical 과 어긋난 상태 지속, internal 값 drift 유지 |
| Phase | A (즉시) |

### 7.2 Option B — Neture 내부값을 `store_owner` 로 전환, `seller` 는 legacy alias

| 항목 | 내용 |
|------|------|
| 변경 범위 | RegisterModal SignupRole 타입 + service_memberships.role 신규 저장값 + role_assignments 신규 저장값 + Guard 분기 + LEGACY_ROLES.SELLER 유지 (alias) |
| DB migration | ✅ 필요 — 기존 seller row 를 store_owner 로 백필 또는 dual lookup |
| 기존 사용자 영향 | ⚠️ JWT roles 재발급 시점에 영향. dual lookup 으로 grace period 확보 가능 |
| Guard/Route 영향 | ✅ SUPPLIER_ROLES / DASHBOARD_B2B_ROLES 정정 + SellerRoute 명칭 정리 |
| Market Trial 대상 조건 | ✅ seller 참조 점검 + store_owner 추가 |
| 장점 | Neture 가 K-Cos 와 같은 canonical 정렬 |
| 단점 | migration 위험 + alias 유지 비용 |
| Phase | C (장기) |

### 7.3 Option C — 서비스 공통 internal value = `store_owner`, UI 는 도메인별 한글 (권장)

| 항목 | 내용 |
|------|------|
| 변경 범위 | 단계적: Phase A (UI 라벨) → Phase B (백엔드 매핑 — RegisterModal 'seller' → 'store_owner' 변환) → Phase C (DB migration + JWT 재발급) |
| DB migration | ✅ 필요 (Phase C) |
| 기존 사용자 영향 | ⚠️ Phase C 에서 grace period 필요 |
| Guard/Route 영향 | ✅ 단계적 정렬 |
| Market Trial 대상 조건 | ✅ 점검 필요 |
| 장점 | 4 서비스 canonical 통일. K-Cos 패턴 mirror. 사업철학 SSOT §3.2 "운영사업자" 정의 정합 |
| 단점 | 3 phase 작업 분량. KPA / GP 의 activity_type / sub_role 명칭 정렬도 함께 필요 |
| Phase | A 즉시 / B 단기 / C 장기 |

### 7.4 Option 비교 매트릭스

| 기준 | A | B | C |
|------|:-:|:-:|:-:|
| 즉시 적용 가능 | ✅ | ❌ | ✅ (Phase A 만) |
| DB migration 위험 | 0 | 중 | 중 (Phase C) |
| K-Cos canonical 정합 | ❌ | ✅ | ✅ |
| 4 서비스 통일성 | ❌ | △ (Neture만) | ✅ |
| 사업철학 정합 | △ | △ | ✅ |
| 향후 공통화 적합성 | ❌ | △ | ✅ |
| KPA pharmacy_owner sub_role 명칭 정렬 포함 | ❌ | ❌ | ✅ (Phase B에서) |

---

## 8. 최종 권고

### 8.1 권장: **Option C (단계적 정규화) — 변형**

세 단계로 분리:

#### Phase A — 즉시 (UI only)

- **WO-O4O-NETURE-SELLER-UI-LABEL-ALIGNMENT-V1**
- 범위: [config/dashboard.ts:18-19](services/web-neture/src/config/dashboard.ts#L18-L19) `'셀러'` → `'매장 경영자'` 라벨 변경
- 효과: 가입 폼 라벨과 대시보드 라벨 통일
- 영향: 0 — UI string only
- 작업 시간: 10 분

#### Phase B — 단기 (백엔드 매핑 추가)

- **WO-O4O-NETURE-STORE-OWNER-CANONICAL-MAPPING-V1**
- 범위:
  - RegisterModal 의 `SignupRole = 'seller'` 유지 (frontend), 백엔드에서 `'seller'` → `'store_owner'` 변환 후 저장
  - 새 가입자부터 `service_memberships.role = 'store_owner'` / `role_assignments.role = 'store_owner'`
  - 기존 `'seller'` row 는 dual lookup (Guard 가 둘 다 통과)
  - NETURE_SCOPE_CONFIG.scopeRoleMapping 에 `store_owner` 추가
- 효과: 신규 가입은 canonical, 기존 데이터 grace
- 영향: 작은 — Guard 로직 + auth-register controller
- 작업 시간: 0.5-1 일

#### Phase C — 장기 (Migration + 정리)

- **WO-O4O-NETURE-SELLER-TO-STORE-OWNER-MIGRATION-V1**
- 범위:
  - DB migration: `'seller'` → `'store_owner'` 백필
  - SellerController / seller.service.ts → StoreOwnerController / store-owner.service.ts 리네임 (또는 의미 유지)
  - LEGACY_ROLES.SELLER 제거
  - `/seller/overview` 라우트 → `/store-owner/overview` (선택)
  - JWT 재발급 정책 결정
- 영향: 중간 — Neture 전체 seller 코드 정합 + DB 1회 migration
- 작업 시간: 2-3 일
- 위험: JWT 재발급 시점의 회원 영향 — grace period 설계 필수

### 8.2 추가 권고 — KPA / GP 정렬도 같이 검토

| 항목 | 현재 | 권고 |
|------|------|------|
| KPA `activity_type='pharmacy_owner'` 컬럼명 | activity_type | (유지) — 가입 신고값이므로 컬럼명 자체는 그대로 OK. 다만 sub_role 으로 리네임 검토 가능 |
| GP `subRole='pharmacy_owner'` 값 | pharmacy_owner | (유지) — 약국 도메인 의미 명확. K-Cos 의 `store_owner` 와는 도메인 다름 |
| GP 설정 vs 코드 불일치 | "매장 운영 허브" 설정 + "내 약국" 코드 | **별도 WO 필요** — UI 라벨 정렬 |
| KPA pharmacy/store 코드 위치 | /pharmacy/* + /store/* 공존 | **별도 WO** — 단계적 store 통일 (현재 진행 중인 것 같음) |

### 8.3 즉시 수정 vs 보류

| 항목 | 분류 |
|------|------|
| Neture 대시보드 "셀러" → "매장 경영자" | **즉시** (Phase A) |
| Neture seller → store_owner internal value | **단기** (Phase B+C) |
| GP "매장 운영 허브" 설정 vs "내 약국" 코드 불일치 | **단기** (별도 WO) |
| KPA pharmacy_* / store_* 코드 위치 정리 | **장기** (별도 WO, 현재 진행 중인 작업과 연결) |
| KPA activity_type → sub_role 리네임 | **보류** (의미 변경 없음, 우선순위 낮음) |

### 8.4 migration 필요 여부

| 작업 | DB migration | 작업 차원 |
|------|:-----------:|----------|
| UI 라벨만 통일 (Phase A) | ❌ | string 1-2 줄 |
| 백엔드 매핑 (Phase B) | ❌ | controller 변환 1 곳 |
| seller → store_owner 백필 (Phase C) | ✅ | UPDATE role_assignments + service_memberships |

---

## 9. Philosophy Conflict Check

| 검증 항목 | 현 상태 | 판정 |
|----------|--------|------|
| "seller / 셀러 / 판매자" 표현이 O4O 사업철학과 충돌하는가 | Neture seller 가 supplier 와 entity 공유 (drift) | ⚠️ 부분 충돌 — supplier (B2B 공급사) 와 store 점주가 같은 테이블이라 의미 모호 |
| 매장 경영자 개념이 일반 이용자(`user`)와 분리되어야 하는가 | 4 서비스 모두 분리됨 (store_owner role 또는 sub_role) | ✅ 분리 정합 |
| Neture 가 KPA/GP/K-Cos 와 용어상 어긋나는가 | seller (Neture) vs store_owner (KPA/GP/K-Cos) | ❌ 어긋남 |
| 서비스별 UI 용어 차이 (약국 vs 매장) 허용 가능한가 | 도메인 다름 → 자연스러움 | ✅ KPA/GP="약국" + K-Cos/Neture="매장" 정합 |
| 내부값 정규화 필요한가 | 내부값은 통일이 합리적 (서비스 무관한 RBAC layer) | ✅ 필요 |
| 사업철학 SSOT §3.2 ("운영사업자") 와 정합 | Neture 의 운영자/관리자(NETURE_SCOPE_CONFIG) ≠ seller. seller 는 실제 사업자(매장 경영자) | ✅ 다층 layer 정합 — 단 명칭만 정리 필요 |

**결론**: 사업철학 위반은 없음. 단지 **표면적 명칭 (seller) 이 정합되지 않아 4 서비스 통일성을 해칠 뿐**. Option C 단계적 정규화로 해결 가능.

---

## 10. 산출물 요약

| 항목 | 결과 |
|------|------|
| 조사 대상 파일 | KPA: 8개 + GP: 12개 + K-Cos: 9개 + Neture: 15개 + 공통 인프라 4개 (총 48 파일 명시 참조) |
| 4 서비스 UI 용어 표 | §3.1 ~ §3.4 |
| 4 서비스 내부값 표 | §4.1 ~ §4.5 |
| Neture seller 전수 사용처 | §5.1 (10 영역) |
| KPA/GP/K-Cos 공통 패턴 vs 차이 | §6.1 ~ §6.2 |
| Neture 가 맞춰야 할 기준 | §6.3 |
| Option A/B/C 비교 | §7.1 ~ §7.4 |
| 최종 권고 | §8 (Option C 변형, Phase A/B/C 분리) |
| 즉시 수정 / 후속 / 보류 분류 | §8.3 |
| Migration 필요 여부 | §8.4 (Phase C 만 필요) |
| Philosophy Conflict Check | §9 (위반 없음, 명칭만 drift) |
| 코드 변경 | **없음** (조사 전용 IR) |

### 핵심 결론 (사용자 사전 예측 정합)

```text
Neture seller = 의미상 매장 경영자, 그러나 내부값은 'seller' (legacy unprefixed)
K-Cos 가 4 서비스 중 가장 canonical (cosmetics:store_owner + sub_role 정합)
Neture 에 store_owner 개념이 0 건 — drift 가 가장 큼
즉시: UI 라벨 "셀러" → "매장 경영자" 통일 (Phase A, 10분)
단기: 백엔드 매핑 추가 (Phase B, 신규 가입자만 store_owner 저장)
장기: DB migration + JWT 재발급 정책 + SellerController 정합 (Phase C)
도메인별 UI (약국 vs 매장) 는 그대로 유지 — 자연스러움
내부값 정규화 (store_owner) 는 통일이 합리적
```

---

## 11. 후속 WO 제안

| 순번 | WO | Phase | 범위 |
|:---:|----|:----:|------|
| 1 | **WO-O4O-NETURE-SELLER-UI-LABEL-ALIGNMENT-V1** | A 즉시 | dashboard.ts 라벨 1줄 |
| 2 | **WO-O4O-NETURE-STORE-OWNER-CANONICAL-MAPPING-V1** | B 단기 | 백엔드 매핑 + dual Guard |
| 3 | **WO-O4O-NETURE-SELLER-TO-STORE-OWNER-MIGRATION-V1** | C 장기 | DB migration + JWT 정책 |
| 4 | **WO-O4O-GLYCOPHARM-UI-LABEL-CONSISTENCY-V1** | 단기 | "매장 운영 허브" 설정 vs "내 약국" 코드 불일치 정리 |
| 5 | **WO-O4O-KPA-PHARMACY-STORE-CODE-LOCATION-V1** | 장기 | /pharmacy/* legacy + /store/* 정리 (별도 트랙으로 이미 진행 중일 수도) |

---

*Author: Claude (Investigation only — no code change executed)*
*Investigation date: 2026-05-24*
*Status: completed — ready for follow-up WO (Phase A 즉시 / Phase B+C 단계화)*
