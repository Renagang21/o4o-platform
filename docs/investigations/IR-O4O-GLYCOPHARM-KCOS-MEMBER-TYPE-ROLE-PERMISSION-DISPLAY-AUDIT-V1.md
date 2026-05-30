# IR-O4O-GLYCOPHARM-KCOS-MEMBER-TYPE-ROLE-PERMISSION-DISPLAY-AUDIT-V1

> 조사 전용 IR — 원인 판정까지가 목표. **코드 수정 없음.**
> 일자: 2026-05-30
> 선행: `IR-O4O-CROSSSERVICE-MEMBER-TYPE-ROLE-PERMISSION-DISPLAY-AUDIT-V1` (Neture 확정·정비 완료)

---

## 1. 전체 판정

- **GlycoPharm / K-Cosmetics 모두 Neture(수정 전)와 동일한 구조 결함을 가진다 — Case B + Case E 확정.**
  - 리스트 "유형" 컬럼 = `service_memberships.role` **원값**(`defaultGetPrimaryRole`), `roleDisplayMap` 미전달 →
    bare `operator`/`admin`/`user` 가 들어오면 **raw 노출**(Case B).
  - 두 서비스 모두 **운영 권한 컬럼·대시보드 접근 컬럼이 아예 없음** → Neture(수정 전)보다도 분리가 덜 됨.
    KPA(2컬럼)·Neture(수정 후 3컬럼)와 비교해 표시 기준 편차가 크다(Case E).
- **수정 모달도 동일 결함**: `normalizeAdminRoleDisplay` 미설정 → 운영 권한 초기값이 **namespaced-only 매칭**.
  bare `operator`/`admin`(또는 membership.role 혼입)인 계정은 모달 "운영 권한"이 "일반 회원"으로 잘못 표시될 수 있다.
- **Case D(데이터 혼입) — 미확인**: 실제로 GP/KCos 계정에 bare operator/admin 혼입이 있는지는 DB/브라우저 확인 필요.
  결함은 **코드상 존재**하나 발현 여부는 데이터에 의존.
- **Neture 수정 방식은 그대로 재사용 가능** — Neture 보정에서 공통 컴포넌트에 추가한 opt-in 인프라
  (`roleColumnHeader`, `normalizeAdminRoleDisplay`)가 이미 있으므로, GP/KCos는 **wrapper만** 정비하면 된다.

---

## 2. GlycoPharm 현황

**파일**: [services/web-glycopharm/src/pages/operator/UsersPage.tsx](../../services/web-glycopharm/src/pages/operator/UsersPage.tsx) ·
[EditUserModal.tsx](../../services/web-glycopharm/src/pages/operator/EditUserModal.tsx) ·
공통 [OperatorMembersConsolePage.tsx](../../packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx) · [CommonEditUserModal.tsx](../../packages/operator-core-ui/src/modules/members/CommonEditUserModal.tsx)

- **리스트 표시 기준**: 공통 `OperatorMembersConsolePage` 사용. `getPrimaryRole`/`roleDisplayMap`/`roleColumnHeader`/
  `extraColumns` **모두 미전달** → 기본 1컬럼 "유형" = `defaultGetPrimaryRole` = `membership.role`(glycopharm) 원값,
  없으면 `roles[0]` → `'user'`. `RoleBadge` 의 ROLE_STYLES 에 `pharmacy`/`supplier`/`glycopharm:operator` 는 있으나
  **bare `operator`/`admin` 키 없음** → 그 값이 들어오면 raw 영문 노출.
  roleTabs: `약사`(glycopharm:pharmacist) / `약국 경영자`(glycopharm:store_owner). **운영 권한·대시보드 접근 컬럼 없음.**
- **수정 모달 표시 기준**: `CommonEditUserModal` + `GLYCOPHARM_CONFIG`.
  membershipRoleOptions `[pharmacy, supplier]`, adminRoleOptions `['', glycopharm:operator, glycopharm:admin]`,
  **`normalizeAdminRoleDisplay` 없음** → 운영 권한 초기값은 role_assignments 의 namespaced 값만 매칭.
- **운영 권한 / 대시보드 접근 일치 여부**: **대시보드 접근 컬럼이 없으므로 리스트에서 비교 불가.**
  모달 운영 권한만 존재하며, bare operator/admin 계정이 있으면 "일반 회원"으로 오표시될 구조.
- **문제 여부**: 구조적 결함 존재(Case B + E + 모달 namespaced-only). 발현은 데이터 의존(미확인).
- **수정 필요성**: 있음. Neture와 동일 패턴으로 정비 권장(별도 WO).

---

## 3. K-Cosmetics 현황

**파일**: [services/web-k-cosmetics/src/pages/operator/UsersPage.tsx](../../services/web-k-cosmetics/src/pages/operator/UsersPage.tsx) ·
[EditUserModal.tsx](../../services/web-k-cosmetics/src/pages/operator/EditUserModal.tsx)

- **리스트 표시 기준**: GlycoPharm과 동일 — 공통 console, 커스텀 prop 미전달 → 기본 1컬럼 "유형" =
  `membership.role`(k-cosmetics) 원값. roleTabs: `판매자`(cosmetics:store_owner) / `소비자`(consumer/customer).
  **운영 권한·대시보드 접근 컬럼 없음.**
- **수정 모달 표시 기준**: `CommonEditUserModal` + `KCOSMETICS_CONFIG`.
  membershipRoleOptions `[seller, consumer, pharmacist, supplier, partner]`,
  adminRoleOptions `['', cosmetics:operator, cosmetics:admin]`, **`normalizeAdminRoleDisplay` 없음** → namespaced-only.
  추가로 `profileClassification`(subRole: store_owner/store_staff) 사용 — 3서비스 중 유일.
- **운영 권한 / 대시보드 접근 일치 여부**: 대시보드 접근 컬럼 없음 → 리스트 비교 불가. 모달 운영 권한만 존재,
  동일하게 bare operator/admin 오표시 구조.
- **문제 여부**: GlycoPharm과 동일 구조 결함. + subRole 차원이 하나 더 있어 표시 축이 더 많다.
- **수정 필요성**: 있음. Neture 패턴 재사용 + subRole(매장 역할)은 별도 축으로 유지.

---

## 4. KPA 기준 모델과의 비교

- KPA(`MemberManagementPage.tsx`, 독립 구현, `kpa_members.id` 기반)는 리스트에서
  **활동 유형(`activity_type`) + 추가 권한(`capabilities` badge)** 을 **2컬럼으로 분리**한다.
  → 참여자 특성과 플랫폼 권한을 명시적으로 분리한 **기준(올바른) 모델**.
- 정렬 상태: **KPA(2컬럼 분리) ≈ Neture 수정 후(3컬럼: 회원유형/운영권한/대시보드) > GlycoPharm·K-Cosmetics(1컬럼, 분리 없음)**.
- 단, KPA는 독립 구현이라 공통화 직접 재사용 대상이 아니며, **본 조사에서 KPA 코드는 수정하지 않는다**(참고 모델).

---

## 5. Neture 수정 방식 재사용 가능성 — **높음**

Neture 보정(`WO-O4O-NETURE-MEMBER-LIST-MODAL-PERMISSION-DISPLAY-CORRECTION-V1`)에서 공통 컴포넌트에 추가한
**opt-in/additive 인프라가 이미 존재**한다(default 보존 → 현재 GP/KCos 무영향):

| 공통 인프라 | 위치 | 재사용 방법 |
|---|---|---|
| `roleColumnHeader?` prop | OperatorMembersConsolePage / types | GP·KCos wrapper 에서 `'회원 유형'` 전달 |
| `extraColumns?` (복수) | OperatorMembersConsolePage | 운영 권한 컬럼 + (선택)대시보드 접근 컬럼 주입 |
| `normalizeAdminRoleDisplay?` | CommonEditUserModal / EditUserModalConfig | 각 서비스 CONFIG 에 `true` |
| token 기반 helper 패턴 | Neture UsersManagementPage | `${service}Tokens` / participant / operatorRole 헬퍼를 서비스별로 동형 작성 |

→ GP/KCos 정비는 **각 서비스 wrapper(UsersPage / EditUserModal) 변경만**으로 가능. 추가 공통 변경 불필요(추정).
  대시보드 접근 라벨은 서비스별 role 네임스페이스(`glycopharm:*` / `cosmetics:*`)에 맞춰 helper 작성 필요.

---

## 6. 바로 수정 가능한 범위

- GP/KCos wrapper 에 Neture 동형 정비:
  - `roleColumnHeader='회원 유형'`
  - token 기반 `getPrimaryRole`(참여 유형만) + `roleDisplayMap`(general→일반 회원)
  - `extraColumns`: 운영 권한 컬럼(관리자>운영자, bare/namespaced 인정) + (선택)대시보드 접근 컬럼
  - 각 CONFIG 에 `normalizeAdminRoleDisplay: true`
- 데이터·write-path 미수정. 표시·초기값만.

## 7. 추가 설계가 필요한 범위

- **대시보드 접근 컬럼 신설 여부**: Neture는 기존에 있었으나 GP/KCos에는 없다. 운영 권한 컬럼만으로 충분한지,
  대시보드 접근까지 추가할지 서비스별 UX 판단 필요.
- **K-Cosmetics subRole(매장 역할) 축**: 회원 유형/운영 권한/매장 역할 3축이 되어 컬럼 폭·표시 우선순위 설계 필요.
- **서비스별 role 네임스페이스 차이**(glycopharm:store_owner vs cosmetics:store_owner 등) 반영한 helper 표준화.

## 8. 데이터 write-path 별도 조사 필요 여부 — **필요(별도 트랙)**

- GP/KCos의 `service_memberships.role` / `role_assignments` 에 bare `operator`/`admin` 또는 운영 권한 혼입이
  실제 존재하는지 = Case D. UI 정비와 분리해 별도 IR/WO 로 조사.
- 결함이 발현되려면 혼입 계정이 있어야 하므로, write-path 조사가 우선순위 판단의 근거가 된다.

## 9. O4O 철학 충돌 점검

- O4O는 **참여 주체(공급자/매장/운영 사업자)** 와 **운영 권한(operator/admin)** 을 서로 다른 축으로 정의한다
  (`O4O-BUSINESS-PHILOSOPHY-V1 §3`, `USER-OPERATOR-FREEZE-V1` F11).
- **회원 유형과 운영 권한이 같은 컬럼에 혼합 표시되는지**: GP/KCos는 1컬럼 "유형"이 `membership.role` 원값을 보여
  bare operator 혼입 시 두 축이 한 컬럼에 섞인다 → 충돌.
- **참여 주체와 운영 권한 축이 분리되어 있는지**: 분리 안 됨(컬럼 없음).
- **공통화 필요한지**: 필요. KPA/Neture가 이미 분리 모델 → GP/KCos를 동형 정비해 4서비스 표시 기준을 정렬하는 것이 철학 정합.

---

## 미확인 항목 (추적)

- [ ] GP/KCos 계정에 bare `operator`/`admin` 또는 membership.role 운영권한 혼입이 실제 있는지 (DB/브라우저).
- [ ] GP/KCos 리스트에서 raw operator/admin/user 가 실제 노출되는 계정이 있는지 (브라우저).
- [ ] GP/KCos 모달 운영 권한이 실제로 "일반 회원" 오표시되는 계정이 있는지 (브라우저).

---

## 결론 / 후속

- **판정**: GP·KCos 모두 Neture(수정 전)와 동일한 Case B + E 구조 결함 + 모달 namespaced-only 결함. Case D는 미확인.
- **Neture 동일 문제 여부**: 예 — 구조상 동일(오히려 대시보드 접근 컬럼이 없어 분리가 더 부족).
- **수정 필요**: 예 — 단, **바로 수정 금지**. 본 IR 확정 후 서비스별 정비 WO로 진행.
- **후속 WO 필요**: 예 — 예: `WO-O4O-GLYCOPHARM-KCOS-MEMBER-LIST-MODAL-PERMISSION-DISPLAY-ALIGNMENT-V1`
  (Neture 패턴 재사용, 데이터 미수정). Case D(write-path)는 별도 트랙.

*코드 분석 기반. 데이터 발현·브라우저 확인 항목은 위 "미확인 항목"에 명시. 코드 수정 없음.*
