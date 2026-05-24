# IR-O4O-SERVICE-MEMBER-PROFILE-CLASSIFICATION-V1

> **조사 보고서 (Investigation Report) — 조사·설계 전용 / 코드·DB·UI·migration 변경 없음.**
>
> KPA / GP / K-Cos 3 service 의 회원 프로필 분류 (직역 / 참여자 유형) 체계를 조사하고, **role (권한) 과 분리된 profile classification** 의 canonical 설계를 확정한다.

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only)
- **선행 산출물:**
  - [IR-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-DESIGN-V1](IR-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-DESIGN-V1.md)
  - `WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1` (a8becbadd)
  - `WO-O4O-KPA-USERS-PAGE-DEAD-CODE-REMOVAL-V1` (0b0d6a999)
- **사전 동기화:** origin/main 와 0 commits 차이.
- **수정 행위:** **없음**.

---

## 0. 한 줄 권고

> **3 service 모두 service-specific profile entity 의 `sub_role` (또는 동등 enum 컬럼) 패턴을 canonical 로 채택.** KPA 와 GP 는 이미 도입 완료 (KpaMember.activity_type + GlycopharmMember.sub_role) — 운영 UI 노출 만 follow-up. K-Cos 는 **CosmeticsMember entity 신설** (KPA/GP 패턴 mirror, sub_role enum: `store_owner` / `store_staff`) 이 필요 — 단 최소 선택지로 시작.
>
> **role 은 절대 늘리지 않는다.** `glycopharm:store_owner` / `cosmetics:store_owner` 같은 role-as-profile 패턴은 정리 대상 (현재 GP 는 alias only, K-Cos 는 backfill 마이그레이션 잔존).
>
> **EditUserModal 공통화 (P3) 는 본 IR 의 sub_role 인터페이스 가 확정된 후 진입.** 공통 modal 은 service-specific `subRoleOptions[]` 와 `subRoleField` 어댑터 슬롯으로 흡수.

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main (HEAD `0b0d6a999`) |
| 조사 방법 | 4 회 병렬 Explore agent (KPA / GP / K-Cos / backend) |
| 조사 범위 | users / service_memberships / role_assignments / KpaMember / KpaPharmacistProfile / GlycopharmMember / CosmeticsStoreMember / 3 service 의 register / EditUserModal / profile page / mypage / operator member controller PATCH endpoint |

---

## 2. 핵심 원칙 (사용자 directive — Freeze)

```
1. role 은 권한이다.
   - 무엇을 할 수 있는가
   - 어떤 화면에 접근할 수 있는가

2. 직역 / 참여자 유형은 profile classification 이다.
   - 어떤 사람인가
   - 어떤 안내와 콘텐츠가 필요한가
   - 어떤 서비스 경험을 제공할 것인가

3. role 을 추가하지 않는다.
   - 새로운 직역을 위해 새 role 을 만들지 않는다.
   - 서비스별 회원 프로필 필드로 참여자 유형을 관리한다.
```

---

## 3. 현재 구조 비교 — 3 Service

| 차원 | KPA | GP | K-Cos |
|---|---|---|---|
| **Profile entity** | `KpaMember` + `KpaPharmacistProfile` | `GlycopharmMember` | 없음 (User entity + cosmetics_store_members 매장 관계만) |
| **Profile classification 컬럼** | `kpa_members.activity_type` (enum 11종) + `membership_type` + `fee_category` + `sub_role` (예정) | `glycopharm_members.sub_role` (enum 2종: `pharmacy_owner` / `staff_pharmacist`) + `membership_type='pharmacist'` 고정 | **부재** (cosmetics_store_members.role 은 매장 내 직급, user 프로필 아님) |
| **가입 시 직역 선택** | ✅ RegisterModal (6종 노출) — 단 공직약사(government) UI 미노출 | ✅ PharmacistApplyPage (2종) | ❌ RegisterPage: consumer / seller 가입 신분 만, 매장 직급 선택 없음 |
| **본인 (mypage) 수정 가능** | ✅ MyProfilePage (10종, pharmacy_owner 제외 직접변경 불가) | ❌ 미확인 (PharmacistApplyPage 만) | ❌ |
| **운영자 수정 가능** | ✅ MemberManagementPage Drawer inline (11종 enum) | ❌ **EditUserModal 에 subRole 필드 부재** | ❌ |
| **Role 연계 (혼재 정도)** | △ `pharmacy_owner` → `kpa:store_owner` 자동 부여 (혼재 — 동기화 미흡) | ✅ subRole 과 role 완전 분리 (best practice) | △ `seller` membership → `cosmetics:store_owner` role 자동 변환 (backfill migration 20260900000000) |
| **분리 점수 (조사 결과)** | **55/100** | **90/100** | (분류 자체가 부재이므로 N/A) |
| **Live page lines** | KpaMember entity 활용 (MemberManagementPage 1850+) | sub_role 활용 (UI 갭 존재) | 사용자 프로필 수준 분류 없음 |

---

## 4. 사용자 directive 의 목표 분류 vs 현재 코드 매핑

### 4.1 KPA — 7종 직역 (사용자 명시)

| # | 사용자 directive | 현재 `activity_type` enum | UI 노출 | Gap |
|---|---|---|:---:|---|
| 1 | 근무약사 | `pharmacy_employee` | ✅ RegisterModal / MyProfile / Operator | — |
| 2 | 약국 경영자 | `pharmacy_owner` | ✅ RegisterModal / Operator (MyProfile 변경 불가) | 본인 변경 차단 (정책 — pharmacy_request 승인 경로만) |
| 3 | 병원약사 | `hospital` | ✅ | — |
| 4 | 산업약사 | `other_industry` (제약/제조/유통/공공/학교 일괄) | ✅ | 의미적 세분화 (`manufacturer` / `importer` / `wholesaler` 등 enum 은 있으나 UI 1종으로 일괄) |
| 5 | 공직약사 | `government` | ❌ enum 만 존재, UI 미노출 | **노출 추가 필요** |
| 6 | 약대생 | (별도) `membership_type='pharmacy_student_member'` | ✅ 별도 탭 | activity_type 미사용 — 직역 이원화 |
| 7 | 기타 | `other` | ✅ | — |

→ **KPA: 인프라 OK, UI 갭 2 건** (공직약사 노출 + 약대생 activity_type 통일).

### 4.2 GP — 2종 직역 (사용자 명시)

| # | 사용자 directive | 현재 `sub_role` enum | 노출 위치 | Gap |
|---|---|---|---|---|
| 1 | 근무약사 | `staff_pharmacist` | PharmacistApplyPage ✅ | **EditUserModal 미노출** |
| 2 | 약국 경영자 | `pharmacy_owner` | PharmacistApplyPage ✅ | **EditUserModal 미노출**, 본인 수정 가능 여부 미확정 |

→ **GP: 인프라 OK, EditUserModal 갭만 존재.**

### 4.3 K-Cos — 2종 직역 (사용자 명시)

| # | 사용자 directive | 현재 저장 위치 | Gap |
|---|---|---|---|
| 1 | 매장 경영자 | `cosmetics_store_members.role='owner'` (매장-회원 관계) + `cosmetics:store_owner` (role_assignment, seller backfill 산물) | **사용자 프로필 수준 분류 없음** — 매장 없이 가입한 user 는 분류 불가 |
| 2 | 매장 근무자 | `cosmetics_store_members.role∈{'manager','staff'}` (매장-회원 관계) | **사용자 프로필 수준 분류 없음** + 가입 UI 부재 |

→ **K-Cos: 인프라 부재** (매장 직급 ≠ 사용자 직역). 신설 필요.

---

## 5. Role vs Profile Classification 분리표 (3 Service Canonical)

### 5.1 Role (권한 — 변경 금지)

| Service | role 값 | 의미 | 부여 시점 |
|---|---|---|---|
| 공통 | `platform:super_admin` | 전체 관리자 | 명시 임명 |
| KPA | `kpa:admin` / `kpa:operator` / `kpa:member` / `kpa:store_owner` | KPA 권한 | 운영자 임명 (단 store_owner 는 activity_type='pharmacy_owner' 자동 — 정리 대상) |
| GP | `glycopharm:admin` / `glycopharm:operator` / `glycopharm:pharmacist` | GP 권한 | 운영자 임명 |
| GP | `glycopharm:store_owner` (alias only, 미사용) | — | — — **정리 대상 (별건)** |
| K-Cos | `cosmetics:admin` / `cosmetics:operator` / `cosmetics:store_owner` | K-Cos 권한 | seller → 자동 변환 (정리 대상 — backfill 산물) |

### 5.2 Profile Classification (직역 — 본 IR 의 canonical)

| Service | sub_role 값 | 의미 | 권한 영향 |
|---|---|---|:---:|
| KPA | `pharmacy_owner` / `pharmacy_employee` / `hospital` / `other_industry` / `government` / `pharmacy_student` / `other` (7종) | 직역 / 자격 | ❌ |
| GP | `pharmacy_owner` / `staff_pharmacist` (2종) | 약사 직역 | ❌ |
| K-Cos | `store_owner` / `store_staff` (2종, 신설 제안) | 매장 직역 | ❌ |

→ **role 과 profile 의 명확한 책임 분리.** Role 은 "할 수 있는 것", Profile 은 "어떤 사람인가".

### 5.3 사용자 directive 와의 일치 확인

| Service | 사용자 directive 분류 | 본 IR 의 sub_role 매핑 |
|---|---|---|
| KPA | 7종 (근무약사 / 약국 경영자 / 병원약사 / 산업약사 / 공직약사 / 약대생 / 기타) | 7종 모두 매핑됨 (단 공직약사 / 약학생 UI 정합 후속 필요) |
| GP | 2종 (근무약사 / 약국 경영자) | 2종 1:1 일치 (이미 구현 — `staff_pharmacist` / `pharmacy_owner`) |
| K-Cos | 2종 (매장 경영자 / 매장 근무자) | 2종 신설 제안 (`store_owner` / `store_staff`) |

→ **사용자 directive 와 100% 정합.**

---

## 6. 현재 코드 / DB Gap

### 6.1 인프라 Gap

| Service | Gap | 영향 |
|---|---|---|
| KPA | 공직약사 (government) UI 미노출 | 직역 7종 중 1종 분류 불가 |
| KPA | 약대생을 activity_type 으로 표현 안 함 (`membership_type` 으로만) | 직역 통일 체계 불완전 |
| KPA | `activity_type='pharmacy_owner'` → `kpa:store_owner` role 자동 매핑 (혼재) | role 변경 / activity_type 변경 시 동기화 미흡 |
| GP | EditUserModal 에 subRole 필드 부재 | 운영자가 약국 경영자 / 근무약사 변경 불가 |
| GP | PUT endpoint payload 에 `subRole` 미수용 | backend 확장 필요 |
| GP | `glycopharm:store_owner` role alias 잔재 | role 분리 원칙 위배 (정리 대상) |
| K-Cos | 사용자 프로필 수준 직역 분류 entity 부재 | 매장 없이 가입한 user 는 분류 불가 |
| K-Cos | RegisterPage 에 매장 경영자 / 근무자 선택 없음 | 가입 시점 직역 입력 불가 |
| K-Cos | EditUserModal 에 매장 직급 필드 없음 | 운영자 수정 불가 |
| K-Cos | `seller` membership → `cosmetics:store_owner` role 자동 변환 (backfill 산물) | role/profile 혼재 (정리 대상) |

### 6.2 Backend Endpoint Gap

| Endpoint | 현재 수용 payload | sub_role 수용 가능? |
|---|---|---|
| `PUT /api/v1/operator/members/:userId` | name / email / phone / businessInfo.* / membershipRole / membershipServiceKey | ❌ subRole / activityType 미수용 |
| `KpaMember.activity_type` 수정 endpoint | KPA-specific PATCH 존재 (MemberManagementPage 사용) | ✅ |
| `GlycopharmMember.subRole` 수정 endpoint | (PharmacistApplyPage 만 사용) — Operator 측 PATCH 별도 신설 필요 | ❌ |
| K-Cos profile entity 자체 부재 | — | — |

---

## 7. EditUserModal 공통화 (P3) 영향 분석

### 7.1 공통 fields (4 service)

| 필드 | 공통 | 비고 |
|---|:---:|---|
| 이름 (firstName / lastName / nickname) | ✅ | |
| 이메일 | ✅ | R/O |
| 전화 | ✅ | |
| 상태 (status) | ✅ | |
| service 운영 권한 (role_assignments) | ✅ | `{service}:admin` / `{service}:operator` / 일반 |
| service membership role | ✅ | service_memberships.role |
| businessInfo (사업자명 / 번호 / 주소 등) | ✅ | hasBusinessInfo 조건부 |

### 7.2 Service-specific slot (sub_role) — **본 IR 핵심**

| Slot 이름 | KPA 값 | GP 값 | K-Cos 값 (제안) |
|---|---|---|---|
| `subRoleOptions[]` | 7종 (근무약사 / 약국 경영자 / 병원약사 / 산업약사 / 공직약사 / 약대생 / 기타) | 2종 (근무약사 / 약국 경영자) | 2종 (매장 경영자 / 매장 근무자) |
| `subRoleField` | `activity_type` | `subRole` | `subRole` (신설) |
| `subRoleApiKey` (PATCH payload key) | `activityType` | `subRole` | `subRole` |

### 7.3 공통 EditUserModal wrapper API (제안)

```typescript
interface OperatorEditUserModalProps {
  serviceKey: string;
  userId: string;
  // 공통 fields (wrapper 가 처리)
  commonFields: { /* name, phone, businessInfo 등 */ };
  // service-specific sub_role (slot)
  subRole?: {
    label: string;                        // "직역" / "약사 직역" / "매장 직급"
    options: Array<{ value: string; label: string }>;
    apiKey: string;                       // PATCH payload key
    readOnly?: boolean;                   // KPA pharmacy_owner 처럼 본인 변경 불가
    helpText?: string;
  };
  // service-specific businessInfo extras (KPA pharmacy_owner 만 12 fields)
  businessInfoExtras?: Array<{ key: string; label: string }>;
  // ...
  onClose: () => void;
  onSuccess: () => void;
}
```

→ **공통 modal 은 `subRole` 을 1 slot 으로 흡수.** sub_role 의 의미 / enum 값 / API key 는 service 가 주입.

### 7.4 P3 (EditUserModal 공통화) 진입 전 선행 작업

| 선행 | 이유 |
|---|---|
| KPA `activity_type` PATCH endpoint payload 확인 | wrapper 의 subRoleApiKey 가 호출할 endpoint 검증 |
| GP `subRole` PATCH endpoint 신설 | EditUserModal 에서 GP subRole 수정 시 호출 (현재 PharmacistApplyPage 만 사용) |
| K-Cos CosmeticsMember entity + sub_role 신설 | 본 IR 의 최우선 follow-up — entity 자체가 부재 |

---

## 8. 설계 옵션 비교 (사용자 명시 — A/B/C/D)

### Option A — 기존 필드 재사용

- **KPA**: `kpa_members.activity_type` (이미 enum 11종 보유)
- **GP**: `glycopharm_members.sub_role` (이미 enum 2종 보유)
- **K-Cos**: ❌ 기존 필드 부재 (cosmetics_store_members 는 매장 관계, user 프로필 아님)

판정: **3 service 중 2 service 만 가능. K-Cos 는 신설 필수.**

### Option B — `service_memberships.metadata` JSONB 컬럼 신규

- 모든 service 의 sub_role 을 service_memberships.metadata 에 통일 저장
- 비용: ALTER TABLE + nullable column (작음)

판정: ⚪ 가능하나 KPA / GP 의 기존 entity 와 중복 — 의미 분리 혼란. Drift 위험.

### Option C — `users.businessInfo.metadata.participant_type`

- platform-level JSONB 자유형
- 비용 0, migration 0

판정: ❌ 타입 안정성 약함 + KPA / GP 의 기존 enum entity 와 분리 — drift 큼.

### Option D — Service-specific Profile Entity (KPA / GP 패턴 mirror)

- **KPA**: KpaMember.activity_type 유지 (이미 도입)
- **GP**: GlycopharmMember.sub_role 유지 (이미 도입)
- **K-Cos**: `CosmeticsMember` entity 신설 (sub_role enum: `store_owner` / `store_staff`)
- 비용: K-Cos 만 entity + migration 신설 (KPA Phase 1 같은 규모)

판정: ✅ **권장.** 3 service 패턴 통일 + 타입 안정성 최고 + role / profile 완전 분리.

### Option D' (Option D 의 보조 — 최소 시작)

- K-Cos 신설 시 **enum 2종 만 시작**, 향후 확장
- 매장 경영자 (`store_owner`) / 매장 근무자 (`store_staff`) — 사용자 directive 그대로
- 매장 정보 (cosmetics_store_members.role) 와 별도 layer 로 유지 (`user 의 직역` vs `매장 내 역할`)

### 비교 요약

| 차원 | A (기존 재사용) | B (sm.metadata) | C (businessInfo.metadata) | **D (entity 패턴)** |
|---|:---:|:---:|:---:|:---:|
| KPA 적용 가능 | ✅ | ⚪ (이미 entity) | ⚪ | ✅ (현행) |
| GP 적용 가능 | ✅ | ⚪ (이미 entity) | ⚪ | ✅ (현행) |
| K-Cos 적용 가능 | ❌ | ✅ | ✅ | ✅ (신설) |
| 타입 안정성 | 강함 | 중간 | 약함 | **강함** |
| Migration 비용 | 0 | 작음 (ALTER) | 0 | 작음 (K-Cos CREATE) |
| role / profile 분리 | 강함 (GP) / 약함 (KPA) | 중간 | 약함 | **강함** |
| 3 service 통일성 | 70% | 100% | 100% | **100%** |
| Clean and Simple ([[principle_clean_and_simple]]) | △ | △ | △ | ✅ |
| **권장도** | 부분 | △ | ❌ | ✅ |

---

## 9. 최종 설계안 (Freeze) — Option D + 최소 시작

### 9.1 Service 별 sub_role canonical (사용자 directive 1:1 매핑)

```text
KPA (KpaMember.activity_type — 기존 유지, UI 갭만 follow-up):
  - pharmacy_owner      (약국 경영자)
  - pharmacy_employee   (근무약사)
  - hospital            (병원약사)
  - other_industry      (산업약사)
  - government          (공직약사)        ← UI 노출 필요
  - pharmacy_student    (약대생)          ← activity_type 통일 (또는 membership_type 유지 별도 결정)
  - other               (기타)

GP (GlycopharmMember.sub_role — 기존 유지, EditUserModal 노출 follow-up):
  - pharmacy_owner      (약국 경영자)
  - staff_pharmacist    (근무약사)

K-Cos (CosmeticsMember entity — 신설):
  - store_owner         (매장 경영자)
  - store_staff         (매장 근무자)
```

### 9.2 Role 정리 (별건 cleanup — 본 IR 결정 외)

| Service | Role | 처리 |
|---|---|---|
| KPA | `kpa:store_owner` | 유지 (단 activity_type 과의 자동 동기화 로직 점검 별건) |
| GP | `glycopharm:store_owner` (alias) | 제거 (별건 cleanup WO) |
| K-Cos | `cosmetics:store_owner` (seller backfill 산물) | 의미 재검토 — sub_role='store_owner' 의 profile 과 role 의 권한적 의미 명확화 필요 (별건) |

### 9.3 EditUserModal 공통화 (P3) — sub_role 슬롯 도입

위 9.1 의 sub_role 인터페이스 (label / options / apiKey / readOnly) 를 공통 modal 의 1 slot 으로 통합. 각 service 의 thin wrapper 에서 service-specific options 주입.

---

## 10. 후속 WO 제안 (Priority 순)

### Priority 1 (본 IR 의 직접 후속)

```
WO-O4O-KCOS-COSMETICS-MEMBER-PROFILE-FOUNDATION-V1
  - apps/api-server/src/routes/cosmetics/entities/cosmetics-member.entity.ts 신설
    (KpaMember / GlycopharmMember 패턴 mirror)
  - migration: cosmetics_members table + sub_role enum (store_owner / store_staff)
  - CHECK 제약 (sub_role IN ...)
  - 운영자 PATCH endpoint 신설 (PATCH /cosmetics/members/{userId})
  - K-Cos RegisterPage 에 매장 경영자 / 매장 근무자 선택 추가 (선택)
```

### Priority 2 (Priority 1 완료 후)

```
WO-O4O-OPERATOR-EDITUSER-MODAL-COMMONIZATION-V1
  - operator-core-ui/modules/members/EditUserModal 공통 wrapper 신설
  - subRole slot (label / options / apiKey / readOnly) 으로 service-specific 분기 흡수
  - businessInfoExtras slot (KPA pharmacy_owner 의 12 fields)
  - 4 service thin wrapper 전환
  - 전제: P1 완료 (K-Cos CosmeticsMember entity 존재)
```

### Priority 3 (병렬·후행 가능)

```
WO-O4O-GLYCOPHARM-SUB-ROLE-OPERATOR-PATCH-API-V1
  - GP 의 PATCH /operator/members/{id} payload 에 subRole 수용
  - EditUserModal P2 의 wrapper 가 호출 가능하게 정합
  - 본 WO 는 backend-only, frontend 변경 없음
```

### Priority 4 (KPA UI 정합)

```
WO-O4O-KPA-PROFILE-CLASSIFICATION-UI-ALIGNMENT-V1
  - 공직약사 (government) RegisterModal / MyProfile UI 노출
  - 약대생 activity_type 통일 정책 결정 + 마이그레이션
  - pharmacy_owner activity_type ↔ kpa:store_owner role 동기화 로직 점검
```

### Priority 5 (Role cleanup — 별건)

```
WO-O4O-GLYCOPHARM-STORE-OWNER-ROLE-ALIAS-REMOVAL-V1
  - GLYCOPHARM_ROLES.STORE_OWNER alias 제거 (실제 미사용)
  - role / profile 분리 원칙 정리

WO-O4O-KCOS-STORE-OWNER-ROLE-SEMANTICS-AUDIT-V1
  - cosmetics:store_owner role (seller backfill 산물) 의 의미 재검토
  - sub_role='store_owner' (profile) 과의 의미 분리 또는 통합 결정
```

---

## 11. O4O 철학 정합 체크

| 차원 | Option D 채택 시 | 충돌 |
|---|:---:|:---:|
| Role 은 권한 / Profile 은 직역 (본 IR 원칙) | ✅ 명확 분리 | 없음 |
| 같은 Capability → 같은 UI/UX (P2 EditUserModal 공통화) | ✅ subRole slot 으로 일관 표현 | 없음 |
| 서비스별 독립 도메인 | ✅ KpaMember / GlycopharmMember / CosmeticsMember 각각 분리 | 없음 |
| 신규 role 추가 금지 (사용자 directive) | ✅ role 0 증가 | 없음 |
| 기존 권한 구조 변경 금지 (사용자 directive) | ✅ 변경 없음 | 없음 |
| Clean and Simple ([[principle_clean_and_simple]]) | ✅ entity 신설 만, 자유형 metadata 회피 | 없음 |
| KPA-Society = reference implementation | ✅ KPA 의 KpaMember 패턴 그대로 mirror | 없음 |
| 사용자 directive — 최소 선택지 시작 | ✅ K-Cos 2종, GP 2종, KPA 기존 유지 | 없음 |

→ **충돌 0 건.**

---

## 12. 본 IR 이 결정하지 않는 것

- Priority 1 ~ 5 WO 의 실제 실행 시점 (사용자 우선순위 결정)
- KPA 의 공직약사 / 약대생 UI 정합의 정확한 마이그레이션 정책 (P4 IR 또는 WO 에서 결정)
- GP `glycopharm:store_owner` alias 제거의 backward-compat 정책 (P5 별건)
- K-Cos `cosmetics:store_owner` role 의 의미 재해석 (별건 IR)
- K-Cos RegisterPage 에 매장 경영자 / 근무자 선택 UI 의 정확한 UX (P1 WO 에서 또는 별건)
- 매장 직급 (`cosmetics_store_members.role`) 과 사용자 직역 (`CosmeticsMember.sub_role`) 의 동기화 정책
- API client 통일 (별건 IR)
- Multi-service profile classification (1 user 가 KPA pharmacy_owner + GP staff_pharmacist 동시 보유 가능성)

---

## 13. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 큰 결정 | **Option D — 3 service service-specific profile entity 패턴 canonical 확정** |
| 사용자 directive 1:1 매핑 | ✅ KPA 7종 / GP 2종 / K-Cos 2종 모두 |
| role 추가 | **0 건** (사용자 directive 준수) |
| 후속 WO 제안 | 5 건 (P1 K-Cos foundation / P2 EditUserModal 공통화 / P3 GP backend / P4 KPA UI / P5 role cleanup) |
| K-Cos 인프라 부재 해소 경로 | P1 WO 1 건으로 완결 (entity + migration + endpoint) |
| EditUserModal 공통화 (P2) 의 선행 의존성 명확화 | sub_role slot 인터페이스 본 IR 에서 freeze |
| 사이클 정리 | Members 영역의 role / profile 분리 canonical 확정. 다음 단계는 K-Cos foundation. |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# 1. service profile entity 검색
find apps/api-server/src -name "*member.entity.ts" -o -name "*profile.entity.ts" | head -20

# 2. activity_type / sub_role 컬럼 검색
grep -rn "activity_type\|sub_role\|subRole\|activityType" apps/api-server/src/routes/{kpa,glycopharm,cosmetics}/entities/ 2>/dev/null

# 3. role enum 검색
grep -rn "store_owner\|pharmacy_owner" services/web-{glycopharm,k-cosmetics,kpa-society}/src/lib/role-constants.ts

# 4. K-Cos 매장 관계 vs 프로필 분류
grep -nE "cosmetics_store_members|CosmeticsStoreMember" apps/api-server/src/routes/cosmetics/entities/*.ts 2>/dev/null

# 5. backend PATCH endpoint payload
grep -rnE "updateMember|membershipRole|subRole|activityType" apps/api-server/src/modules/auth/controllers/membershipConsole*.ts 2>/dev/null
grep -rnE "updateMember|membershipRole|subRole|activityType" apps/api-server/src/controllers/operator/*.ts 2>/dev/null

# 6. 기존 IR 참조
ls docs/investigations/IR-O4O-KPA-PHARMACY-* docs/investigations/IR-O4O-BUSINESSINFO-* docs/investigations/IR-O4O-BUSINESS-REGISTRATION-* 2>/dev/null
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only) — Profile Classification Canonical Design*
*Status: ✅ 결정 — Option D (service-specific profile entity 패턴). 사용자 directive 1:1 매핑. role 추가 0.*
*Decision Required: Priority 1 — `WO-O4O-KCOS-COSMETICS-MEMBER-PROFILE-FOUNDATION-V1` 진입 여부 (K-Cos CosmeticsMember entity 신설).*
