# O4O STORE OWNER RBAC STANDARD V1

> **상태**: ACTIVE · **최종 갱신**: 2026-10-04 (내부 모순 정합 — 접근 판정은 Role ∧ Relationship([STORE-ACCESS-AND-MEMBERSHIP](../../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md)), `role_assignments` 는 Authorization SSOT 로 유지. §2.1 · §4 · §5 · §8 에 `2026-10-04 정합` 주석)

## 1. 목적

O4O 플랫폼에서 매장 운영자(Store Owner) 권한 판단 기준을 단일화한다.

본 문서는 매장 기능 접근 제어의 최종 기준이며, 모든 서비스는 이를 따른다.

---

## 2. 핵심 원칙

### 2.1 권한 판단 기준

store_owner 권한 판단은 role_assignments만을 기준으로 한다.

다른 데이터는 권한 판단 기준이 아니다.

> (2026-10-04 정합) 위 두 문장은 "**권한(Authorization)의 원천**은 `role_assignments` 하나다"(RBAC SSOT, [RBAC-FREEZE](../../rbac/RBAC-FREEZE-DECLARATION-V1.md))로 읽는다. 매장 **접근 판정**은 그 role 만으로 끝나지 않는다 — Role ∧ Relationship 이다(§3.1-A · 정본 [STORE-ACCESS-AND-MEMBERSHIP](../../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md) §2 · [IDENTITY-V3](../O4O-IDENTITY-ARCHITECTURE-V3.md)). 현행 `isStoreOwner()`(`apps/api-server/src/utils/store-owner.utils.ts`)는 해당 서비스 active `service_memberships` ∧ `role_assignments` 활성 `{prefix}:store_owner` 를 보고, 조직은 `organization_members`(owner·admin·manager) 기반 `resolveStoreOrganization()` 으로 해석하며, 게시된 매장 경영자 이용계약 미승낙이면 차단한다. `activity_type` · `sub_role` 등 속성(§2.2)은 여전히 판단 기준이 아니다.

---

### 2.2 데이터와 권한의 분리

- role_assignments: 권한 (Authority)
- organization_members: 조직 내 역할 (Membership)
- activity_type / sub_role: 사용자 속성 (Attribute)

이 세 요소는 서로 독립적이며 권한 판단에 혼용하지 않는다.

---

### 2.3 store_owner 정의

store_owner는 매장 운영 기능을 사용할 수 있는 권한이다.

포함 기능:

- /store
- /store-hub
- /store-hub/b2b
- 상품/주문/진열/사이니지 등 매장 운영 기능

---

## 3. 역할 구조

### 3.1 서비스별 store_owner

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PharmacyHub 운영·가입·role·공급/결제·공통화/parity·호환 보존 판정은 [완전 폐기 정책](../../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 복구/발급/확장 대상이 아니며 전용 자원·데이터는 귀속/FK·법정 보유 확인 후 제거한다. 인쇄 QR 연결과 공용·Neture 데이터 및 이 절의 다른 서비스/Common/Core/Freeze 계약은 유지한다. 아래 PH 표기는 폐기 전 구조·구현 이력이며 현행 운영 의무가 아니다.


공통 role 게이트(`isStoreOwner()`)가 아는 role 은 **이 3종이 전부**다 —
런타임 정본은 `apps/api-server/src/utils/store-owner.utils.ts` 의 `STORE_OWNER_ROLES_BY_SERVICE` 다.

- `kpa:store_owner`
- `cosmetics:store_owner`
- `pharmacy-hub:store_owner`

`pharmacy-hub:store_owner` 는 2026-10-04 이 목록에 합류한 것이 아니라 **처음부터 registry 에 있었고**
이 문서만 2종으로 적고 있었다(§3.4 각주에만 언급). 등록 누락은 실제로 사고가 된 적이 있다 —
registry 에 없으면 `isStoreOwner()` 가 role 게이트에서 끝나 `organizationId` 를 돌려주지 못해
공통 매장 API 진입이 막힌다(`CHECK-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1` §8-5).

**`cafe24-b2b:store_owner` 는 여기 없다.** 그 role 은 실재하고 Cafe24 프로비저닝이 부여하지만,
Cafe24 거래처 회원은 **HMAC 서명 쿠키 세션**으로 `/store/*` 에 들어가 공통 role 게이트를 거치지
않는다(`CHECK-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1`). 의도된 제외이며, 넣으면 공통 게이트가
아는 role 인 것처럼 보인다.

### 3.1-A 서비스별 store_member (2026-10-04 추가)

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PharmacyHub 운영·가입·role·공급/결제·공통화/parity·호환 보존 판정은 [완전 폐기 정책](../../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 복구/발급/확장 대상이 아니며 전용 자원·데이터는 귀속/FK·법정 보유 확인 후 제거한다. 인쇄 QR 연결과 공용·Neture 데이터 및 이 절의 다른 서비스/Common/Core/Freeze 계약은 유지한다. 아래 PH 표기는 폐기 전 구조·구현 이력이며 현행 운영 의무가 아니다.


매장 접근 자격은 **Owner 하나가 아니다.** 사업자가 허가한 사용자(Store Member)가 같은 매장을 쓴다.

- `kpa:store_member`
- `cosmetics:store_member`
- `pharmacy-hub:store_member`
- `cafe24-b2b:store_member`

**owner 게이트(3종)보다 하나 많다.** 초대·수락은 serviceKey 를 파라미터로 받는 **서비스 중립
표면**이고, 조직↔서비스 linkage(`STORE_SERVICE_ORG_LINKAGE`)가 `cafe24-b2b` 를 포함하기 때문이다.
그 조직에 초대받은 사람에게 발급할 role 이 없으면 수락이 관계만 `'staff'` 로 바꾸고 role 을 건너뛰어
**접근 0 · 재수락 불가**인 막다른 상태가 된다.

세 목록이 서로 다른 것은 정상이며, 각각의 기준이 다르다.

| 목록 | 범위 | 기준 |
|---|---|---|
| `STORE_OWNER_ROLES_BY_SERVICE` (3) | 공통 role 게이트가 아는 owner role | `isStoreOwner()` 를 거치는 서비스만. cafe24-b2b 는 HMAC 쿠키 세션이라 제외 |
| `STORE_MEMBER_ROLE_BY_SERVICE` (4) | 초대 수락이 발급하는 member role | 조직↔서비스 linkage 가 있는 서비스 전부 |
| `ENROLLABLE_SERVICE_KEYS` (3) | 자가 가입 가능 업종 | 외부 로그인 전용 채널(cafe24-b2b) 제외 |

런타임: `services/store/store-membership.service.ts` · `store-enrollment.service.ts`.
초대 수락이 발급하고, 같은 서비스에 남은 매장이 없을 때만 회수한다.

접근 판정은 **Role ∧ Relationship** 이다 — role 만으로도, 관계 행만으로도 들어오지 못한다.

| 자격 | Role | Relationship |
|---|---|---|
| Store Owner | `{prefix}:store_owner` + 해당 서비스 active membership | `organization_members` 활성 `owner`·`admin`·`manager` |
| Store Member | `{prefix}:store_member` | `organization_members` 활성 `'staff'` |

정본: [`O4O-STORE-ACCESS-AND-MEMBERSHIP-V1`](../../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md) ·
[`O4O-IDENTITY-ARCHITECTURE-V3`](../O4O-IDENTITY-ARCHITECTURE-V3.md) §7.

---

### 3.2 Neture

- neture:supplier는 store_owner와 동일 레벨의 비즈니스 역할로 취급한다.

---

### 3.3 seller 제거

seller는 독립 역할로 사용하지 않는다.

모든 seller는 store_owner로 통합한다.

---

### 3.4 role prefix ≠ 서비스 주소 의미 (2026-10-03 표기)

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PharmacyHub 운영·가입·role·공급/결제·공통화/parity·호환 보존 판정은 [완전 폐기 정책](../../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 복구/발급/확장 대상이 아니며 전용 자원·데이터는 귀속/FK·법정 보유 확인 후 제거한다. 인쇄 QR 연결과 공용·Neture 데이터 및 이 절의 다른 서비스/Common/Core/Freeze 계약은 유지한다. 아래 PH 표기는 폐기 전 구조·구현 이력이며 현행 운영 의무가 아니다.


role prefix 는 **내부 서비스 범위 이름**이며 현재 주소의 사업 의미와 다를 수 있다. 정본: [`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](../../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md).

| role | serviceKey | 현재 의미 |
|---|---|---|
| `kpa:store_owner` | `kpa-society` | 약국 사업자 서비스(`pharmacy.neture.co.kr`)의 매장 경영자. **KPA 분회(`kpa.neture.co.kr`, 약사 개인 대상)와 무관** |
| `cosmetics:store_owner` | `k-cosmetics` | 화장품 · 일반 소매 사업자 서비스(`retail.neture.co.kr`)의 매장 경영자 |
| `pharmacy-hub:store_owner` | `pharmacy-hub` | 호환 식별자로 보존된 PharmacyHub 매장 경영자 (런타임 registry 에 3.1 과 함께 등록됨 — `store-owner.utils.ts` `STORE_OWNER_ROLES_BY_SERVICE`) |

role 문자열은 바꾸지 않는다. 매장 운영 공간 자체는 공통 Store Workspace(`store.neture.co.kr`)이며 serviceKey 를 갖지 않는다.

`types/roles.ts` 의 `ROLE_REGISTRY` label 도 같다 — `kpa:store_owner` 의 label 은 `KPA Store Owner` 라는
**역사적 이름**이고 분회 소속을 뜻하지 않는다. 그 label 은 화면에 노출되는 소비처가 없고(2026-10-04 전수 확인),
이 표가 의미의 정본이다. 바꾸지 않는 이유가 하나 더 있다: 그 파일은 같은 모양의 role 항목이 100여 개
반복되는 구조라 **안의 어느 줄을 고쳐도 중복 블록에 들어가** 품질 게이트(New Code 중복)를 깨뜨린다.

---

## 4. 접근 제어 기준

다음 조건을 만족해야 매장 기능 접근이 가능하다.

```text
role_assignments.role IN ({service}:store_owner)
```

이 외의 조건은 접근 허용 기준으로 사용하지 않는다.

> (2026-10-04 정합) 위 식은 **필요조건**이며 충분조건이 아니다. 현행 접근 판정은 §2.1 정합 주석 · §3.1-A 표(Role ∧ Relationship)와 [STORE-ACCESS-AND-MEMBERSHIP](../../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md) §2 · 결정 순서(세션 → 조직 → 자격 → 업종 경계)를 따른다. Store Member 는 `{prefix}:store_member` ∧ `organization_members` 활성 `'staff'` 이다.

---

## 5. 승인 구조

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PharmacyHub 운영·가입·role·공급/결제·공통화/parity·호환 보존 판정은 [완전 폐기 정책](../../baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 복구/발급/확장 대상이 아니며 전용 자원·데이터는 귀속/FK·법정 보유 확인 후 제거한다. 인쇄 QR 연결과 공용·Neture 데이터 및 이 절의 다른 서비스/Common/Core/Freeze 계약은 유지한다. 아래 PH 표기는 폐기 전 구조·구현 이력이며 현행 운영 의무가 아니다.


매장 운영 권한은 다음 단계를 통해 부여된다.

```text
서비스 가입 승인
→ 매장 운영자(store_owner) 신청
→ 운영자 승인
→ role_assignments 생성
```

승인 전에는 store_owner 권한을 가지지 않는다.

> (2026-10-04 정합) 위 운영자 승인 경로 외에 현행 부여 경로가 더 있다 — `store.neture.co.kr` **사업자 자가 가입**(`kpa` · `cosmetics` · `pharmacy-hub`, 운영자 승인 없이 본인 신청 → `organization_members(owner)` → enrollment → `service_memberships` → `role_assignments`)과 PharmacyHub · Cafe24 B2B 프로비저닝. 모두 공용 helper `organizationOpsService.ensureOrganizationWithOwnerAndService()` 를 쓴다. 정본: [STORE-ACCESS-AND-MEMBERSHIP](../../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md) §3-A. "role 이 생기기 전에는 store_owner 권한이 없다" 는 원칙은 유효하다.

---

## 6. 금지 규칙

다음 방식은 권한 판단에 사용하지 않는다.

* activity_type='pharmacy_owner'
* sub_role='pharmacy_owner'
* organization_members.role='owner' (관계 행 **단독**으로는 권한이 아니다 — §3.1-A 의 Role ∧ Relationship 에서 **조건**으로만 쓴다)
* cosmetics:seller / k-cosmetics:seller

---

## 7. 마이그레이션 완료 상태

다음 전환이 완료되었다.

* kpa:store_owner backfill 완료
* k-cosmetics:seller → cosmetics:store_owner 전환 완료
* legacy fallback 제거 완료

---

## 8. 운영 기준

* role_assignments를 권한의 단일 소스로 사용한다 (SSOT)
* 신규 서비스는 {service}:store_owner 구조를 따른다
* supplier / partner는 별도 역할로 유지한다
* organization_members는 권한 판단에 사용하지 않는다

> (2026-10-04 정합) ① partner 역할은 Legacy Partner 전면 은퇴로 더 이상 존재하지 않는다([ROLE-WORKSPACE-ARCHITECTURE](../../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §7) — "supplier 는 별도 역할로 유지" 만 유효. ② "organization_members 는 권한 판단에 사용하지 않는다" 는 "권한(role)의 원천으로 쓰지 않는다" 로 읽는다. 접근 판정에서는 Relationship **조건**으로 쓴다(§3.1-A · §6 · [STORE-ACCESS-AND-MEMBERSHIP](../../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md)).

---

## 9. 주의 사항

* 권한 로직 수정 시 role_assignments 기준을 반드시 유지한다
* fallback 로직 재도입 금지
* 권한 판단과 데이터 상태를 혼합하지 않는다
