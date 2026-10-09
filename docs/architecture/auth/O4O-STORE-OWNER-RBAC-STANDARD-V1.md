# O4O STORE OWNER RBAC STANDARD V1

> **상태**: ACTIVE · **최종 갱신**: 2026-10-09 (PH runtime owner/member capability·신규 발급 퇴역. 과거 원장·역할 회수 식별자는 유지. 접근 정본은 [STORE-ACCESS-AND-MEMBERSHIP](../../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md))

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

공통 role 게이트(`isStoreOwner()`)의 현재 등록은 아래 2개 서비스이며, 약국은 `neture:store_owner`와 내 매장 신청 원장도 사용한다.
런타임 정본은 `apps/api-server/src/utils/store-owner.utils.ts` 의 `STORE_OWNER_ROLES_BY_SERVICE` 다.

- `kpa:store_owner`
- `cosmetics:store_owner`

2026-10-09 PH 완전 퇴역으로 `pharmacy-hub:store_owner`를 runtime registry에서 제거했다. 과거 역할·조직 원장은 남기지만 현재 매장 권한이나 서비스 중립 매장 진입의 근거로 쓰지 않는다.

**`cafe24-b2b:store_owner` 는 여기 없다.** 그 role 은 실재하고 Cafe24 프로비저닝이 부여하지만,
Cafe24 거래처 회원은 **HMAC 서명 쿠키 세션**으로 `/store/*` 에 들어가 공통 role 게이트를 거치지
않는다(`CHECK-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1`). 의도된 제외이며, 넣으면 공통 게이트가
아는 role 인 것처럼 보인다.

### 3.1-A 서비스별 store_member (2026-10-04 추가)

매장 접근 자격은 **Owner 하나가 아니다.** 사업자가 허가한 사용자(Store Member)가 같은 매장을 쓴다.

- `kpa:store_member`
- `cosmetics:store_member`
- `cafe24-b2b:store_member`

`pharmacy-hub:store_member`는 과거 역할 회수 식별자로만 보존하며 현재 접근이나 신규 발급을 허용하지 않는다. PH 전용 초대는 관계를 활성화하지 않고, 현재 매장의 초대 수락은 PH 과거 linkage를 제외한다.

**owner 게이트(2개 서비스)보다 하나 많다.** 초대·수락은 serviceKey 를 파라미터로 받는 **서비스 중립
표면**이고, 조직↔서비스 linkage(`STORE_SERVICE_ORG_LINKAGE`)가 `cafe24-b2b` 를 포함하기 때문이다.
그 조직에 초대받은 사람에게 발급할 role 이 없으면 수락이 관계만 `'staff'` 로 바꾸고 role 을 건너뛰어
**접근 0 · 재수락 불가**인 막다른 상태가 된다.

세 목록이 서로 다른 것은 정상이며, 각각의 기준이 다르다.

| 목록 | 범위 | 기준 |
|---|---|---|
| `STORE_OWNER_ROLES_BY_SERVICE` (2개 서비스) | 공통 role 게이트가 아는 owner role | PH 퇴역; cafe24-b2b는 HMAC 쿠키 세션이라 제외 |
| `STORE_MEMBER_ROLE_BY_SERVICE` (과거 PH 포함 4) | member role 이름과 회수 식별자 | 현재 접근·신규 발급은 PH를 제외한 3개 서비스만 |
| `ENROLLABLE_SERVICE_KEYS` (0) | 자가 가입 가능 업종 | 약국은 내 매장 신청·승인 경로, 나머지 업종 신규 자가 가입은 종료 |

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

role prefix 는 **내부 서비스 범위 이름**이며 현재 주소의 사업 의미와 다를 수 있다. 정본: [`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](../../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md).

| role | serviceKey | 현재 의미 |
|---|---|---|
| `kpa:store_owner` | `kpa-society` | 약국 사업자 서비스(`pharmacy.neture.co.kr`)의 매장 경영자. **KPA 분회(`kpa.neture.co.kr`, 약사 개인 대상)와 무관** |
| `cosmetics:store_owner` | `k-cosmetics` | 화장품 · 일반 소매 사업자 서비스(`retail.neture.co.kr`)의 매장 경영자 |
| `pharmacy-hub:store_owner` | `pharmacy-hub` | 과거 원장·역할 회수 식별자. PH 퇴역으로 현재 runtime 매장 접근 불가 |

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

매장 운영 권한은 다음 단계를 통해 부여된다.

```text
서비스 가입 승인
→ 매장 운영자(store_owner) 신청
→ 운영자 승인
→ role_assignments 생성
```

승인 전에는 store_owner 권한을 가지지 않는다.

> (2026-10-09 정합) 약국은 내 매장 신청·운영자 승인과 해당 조직 관계로 판정한다. 업종 자가 가입 목록은 비어 있고 PH 프로비저닝은 퇴역했다. Cafe24 B2B의 별도 인증 경계는 유지한다. 정본: [STORE-ACCESS-AND-MEMBERSHIP](../../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md) §3-A.

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
