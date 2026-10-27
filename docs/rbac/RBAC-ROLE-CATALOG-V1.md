# RBAC Role Catalog V1

> **본문 전체 PH 부분 폐기 우선순위 (2026-10-11 · #427):** [완전 폐기 정책](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md)은 이 문서의 모든 절·표·코드 예시·불변식·후속 계획·최종 판정에 있는 PharmacyHub/PH 전용 유지·확장 계약을 대체한다. 개별 절의 표기는 이를 다시 명시한 것이며 표기가 없는 다른 PH 지시도 현행 운영/구현 의무가 아니다. 다른 서비스·공통 Core/Freeze·인쇄 QR 연결과 법정 보유 판단은 그대로다.


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

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PharmacyHub 운영·가입·role·공급/결제·공통화/parity·호환 보존 판정은 [완전 폐기 정책](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 복구/발급/확장 대상이 아니며 전용 자원·데이터는 귀속/FK·법정 보유 확인 후 제거한다. 인쇄 QR 연결과 공용·Neture 데이터 및 이 절의 다른 서비스/Common/Core/Freeze 계약은 유지한다. 아래 PH 표기는 폐기 전 구조·구현 이력이며 현행 운영 의무가 아니다.


| Role | 용도 |
|------|------|
| `vendor` | 벤더 |
| `seller` | 판매자 |
| `supplier` | 공급자 — Neture 공급자에 실사용. 접두어 없음이 의도된 계약이다 (WO-NETURE-ROLE-NORMALIZATION-V1) |
| ~~`partner`~~ | ~~파트너~~ — 은퇴 (2026-09-15, Legacy Partner runtime 은퇴 · 활성 보유자 0 · 비활성 이력 row 3건은 physical cleanup 대상) |
| `manager` | 매니저 |
| `pharmacy` | 은퇴 서비스 유래 bare 역할. 접두어 없음이 **정규값**이다. 소비처는 bare 문자열을 직접 읽는다 (`controllers/forum/ForumRecommendationController.ts`) |

> 2026-08-24 프로덕션 실측(활성 role_assignments): `supplier` 6 · `pharmacy` 2 · `customer` 7 · `user` 2.
> `vendor` · `seller` · `manager` 는 **보유자 0** 이다. 목록에는 남기되 신규 부여 대상이 아니다. (`partner` 는 카탈로그·가드에서 제거됨)
> (`manager` 를 조회하는 코드 대부분은 `organization_members.role` — RBAC role 축이 아니다.)

> `store_owner` 는 이 목록에 없다 — 매장 경영자 판정은 전부 접두어 형태다
> (`{kpa|cosmetics|pharmacy-hub}:store_owner`). bare `store_owner` 를 읽는
> 소비처는 0이며, 유일하게 남아 있던 활성 1행은 회수됐다
> (migration `20270318000000-RevokeOrphanedBareStoreOwnerRole`).

### Service Prefix Roles

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PharmacyHub 운영·가입·role·공급/결제·공통화/parity·호환 보존 판정은 [완전 폐기 정책](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 복구/발급/확장 대상이 아니며 전용 자원·데이터는 귀속/FK·법정 보유 확인 후 제거한다. 인쇄 QR 연결과 공용·Neture 데이터 및 이 절의 다른 서비스/Common/Core/Freeze 계약은 유지한다. 아래 PH 표기는 폐기 전 구조·구현 이력이며 현행 운영 의무가 아니다.


| Prefix | 서비스 | 예시 |
|--------|--------|------|
| `platform:` | 플랫폼 Core | `platform:super_admin` |
| `kpa:` | KPA Society(serviceKey `kpa-society`) | `kpa:admin`, `kpa:operator`(scope 허용은 이 둘, admin ⊃ operator) · `kpa:store_owner`(매장 workspace 축). (2026-10-06 정정) `kpa:pharmacist` · `kpa:student` 는 deprecated — 신규 부여 대상 아님, 일부 활성 행 잔존 가능. `kpa:branch_admin` · `kpa:branch_operator` · `kpa:district_admin` 은 **제거됨** — 부여 금지. 정본 [`KPA-ROLE-MATRIX-V1`](../baseline/KPA-ROLE-MATRIX-V1.md) |
| `kpa-branch:` | 약사 분회 서비스(serviceKey `kpa-branch`) — `kpa:*` 와 독립 권한 경계 | `kpa-branch:admin`, `kpa-branch:operator`, `kpa-branch:member`. 분회 소속은 role 이 아니라 `branch_memberships`. scope config = `apps/api-server/src/middleware/kpa-branch-scope.middleware.ts`(Pharmacy-Hub 와 같은 로컬 예외). 정본 [`KPA-BRANCH-ROLE-MATRIX-V1`](../baseline/KPA-BRANCH-ROLE-MATRIX-V1.md) |
| `neture:` | 네처 | `neture:admin`, `neture:operator`, `neture:seller`, `neture:supplier` (~~`neture:partner`~~ 은퇴 2026-09-15) |
| ~~`glucoseview:`~~ | 글루코스뷰 — **은퇴**(2026-10-06 정정: service catalog · security-core · runtime 에 없음) | ~~`glucoseview:admin`, `glucoseview:operator`~~ — 부여 금지 |
| `cosmetics:` | K-화장품 | `cosmetics:admin`, `cosmetics:operator` |
| `pharmacy-hub:` | 파머시 허브 | `pharmacy-hub:admin`, `pharmacy-hub:operator`, `pharmacy-hub:store_owner` |
| `lecture:` | O4O 강의 | `lecture:admin`, `lecture:operator`, `lecture:instructor` — 일반 학습자는 role 없이 `service_memberships('lecture')` |

#### Admin ⊃ Operator 계층

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PharmacyHub 운영·가입·role·공급/결제·공통화/parity·호환 보존 판정은 [완전 폐기 정책](../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 복구/발급/확장 대상이 아니며 전용 자원·데이터는 귀속/FK·법정 보유 확인 후 제거한다. 인쇄 QR 연결과 공용·Neture 데이터 및 이 절의 다른 서비스/Common/Core/Freeze 계약은 유지한다. 아래 PH 표기는 폐기 전 구조·구현 이력이며 현행 운영 의무가 아니다.


KPA · Neture · K-Cosmetics · Pharmacy-Hub · Lecture 는 admin ⊃ operator 계층을 `scopeRoleMapping` 으로 **명시**한다.
Lecture의 `instructor`는 운영 계층과 별도 capability이며 admin/operator가 대신하지 않는다.

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
- Lecture scope config도 같은 Freeze 원칙으로 `apps/api-server/src/middleware/lecture-scope.middleware.ts`에 둔다.
  `packages/security-core/src/types.ts`에는 self-map serviceKey의 type-only 확장만 추가한다.

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

## 약국 협업체 운영자 지정 — 2026-10-18

사용자 요청에 따라 `admin.neture.co.kr/operators`에서 아래 네 대상을 각각 지정한다.
공통 계정과 canonical `neture` 가입 원장은 유지하며, 사업 키를 새 service membership으로 만들지 않는다.

| 대상 | Admin | Operator |
|---|---|---|
| pharmacy | `neture:pharmacy_admin` | `neture:pharmacy_operator` |
| carepharm | `neture:carepharm_admin` | `neture:carepharm_operator` |
| megapharm | `neture:megapharm_admin` | `neture:megapharm_operator` |
| pharmcoop | `neture:pharmcoop_admin` | `neture:pharmcoop_operator` |

두 역할은 해당 사업의 기존 운영 기능을 이용한다. Neture 전체 관리·플랫폼 관리·다른 사업 운영 권한은 부여하지 않는다.
`pharmcoop` 범위는 연합회 산하 조합관리이며 개별 조합 운영 권한으로 전파되지 않는다. 연합회 admin은 조합 최종 결정과 조합 admin 지정·해제를, operator는 검토·보완을 담당한다.
기존 `neture:admin/operator`와 활성 `semi_franchise_operators` 관계를 함께 가진 담당자는 비조합 사업에서만 계속 이용한다.
매 요청 활성·유효기간을 확인하며, 역할만으로 약국 소유·참여 가입을 만들거나 기존 가입 상태를 변경하지 않는다.
Google 연결 계정만 지정하며, 신규 계정 생성·타인 비밀번호 설정 경로는 추가하지 않는다.

근거: [약국 협업체 운영자 지정 WO](../work-orders/WO-O4O-ADMIN-PHARMACY-COLLABORATOR-ROLES-V1.md).

### 개별 협동조합 역할 — 2026-10-18

`cooperative_roles`에 조합 ID·사용자별 `admin` 또는 `operator`를 지정한다. 전역 `role_assignments` 역할이나 Neture 전역 운영 자격을 추가하지 않는다.
연합회 admin이 조합 admin을, 조합 admin이 자기 조합 operator를 지정·해제한다.
조합 admin은 회원 자격을 최종 결정하며 operator는 검토·보완·처리 요청을 한다.
한 사람은 조합마다 다른 역할을 가질 수 있다. 자기 역할 해제·마지막 사용 가능한 admin 해제를 막고, 역할/회원 상태 종료는 다른 조합·약국 조직·매장 권한에 영향을 주지 않는다.
개별 조합 배정 대상은 기존 활성·이메일 인증 계정이다. 위의 공통 관리자 Google 연결 조건은 연합회 전역 역할 지정 경로의 조건이며 local 조합 역할의 필수 조건으로 확대하지 않는다.
상세: [협동조합 권한 설계](../design/DESIGN-O4O-COOPERATIVE-ROLE-AND-MEMBER-MANAGEMENT-V1.md).


### 신규 Partner 지원 서비스 — 2026-10-26

사용자 승인 범위: `partner.neture.co.kr`의 로그인·운영자·별도 가입형 커뮤니티를 함께 구현한다. 서비스 identity와 role prefix는 모두 **`partner-support`**다. 은퇴한 `partner`·`neture:partner`·Legacy Partner 관계를 복원하지 않는다.

| 역할 | 범위 | 부여 경로 |
|---|---|---|
| `partner-support:admin` | Partner 커뮤니티 일상 운영 | 기존 중앙 운영자 초대·본인 수락 |
| `partner-support:operator` | Partner 커뮤니티 일상 운영 | 기존 중앙 운영자 초대·본인 수락 |

현 단계의 두 역할은 활성 공통 계정·이메일 확인·활성 `service_memberships(service_key=partner-support)`와 현재 유효한 중앙 역할 배정을 모두 요구한다. 글·댓글/신고·게시판·회원 정지/해제·최소 운영 이력을 처리하며 플랫폼 계정 삭제·타 서비스 권한·협의/계약/보상 판정 권한은 주지 않는다. 가입 회원이나 작업공간 소유자는 이 역할을 받지 않는다. 일반 회원은 별도 가입 API에서 명시적으로 참여한다. 범용 service join 경로는 사용하지 않으며 다른 서비스 가입을 이용 자격으로 합성하지 않는다.

개발·검증·push, 실제 운영자 지정·초대 수락, 운영 migration·배포는 [Partner 커뮤니티 WO](../work-orders/WO-O4O-PARTNER-COMMUNITY-V1.md)에서 구분한다.
