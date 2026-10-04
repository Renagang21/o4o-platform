# O4O STORE OWNER RBAC STANDARD V1

## 1. 목적

O4O 플랫폼에서 매장 운영자(Store Owner) 권한 판단 기준을 단일화한다.

본 문서는 매장 기능 접근 제어의 최종 기준이며, 모든 서비스는 이를 따른다.

---

## 2. 핵심 원칙

### 2.1 권한 판단 기준

store_owner 권한 판단은 role_assignments만을 기준으로 한다.

다른 데이터는 권한 판단 기준이 아니다.

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

매장 접근 자격은 **Owner 하나가 아니다.** 사업자가 허가한 사용자(Store Member)가 같은 매장을 쓴다.

- `kpa:store_member`
- `cosmetics:store_member`
- `pharmacy-hub:store_member`

owner 와 **같은 3종 집합**이다(런타임: `services/store/store-membership.service.ts`
`STORE_MEMBER_ROLE_BY_SERVICE`). 초대 수락이 발급하고, 같은 서비스에 남은 매장이 없을 때만 회수한다.

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
| `pharmacy-hub:store_owner` | `pharmacy-hub` | 호환 식별자로 보존된 PharmacyHub 매장 경영자 (런타임 registry 에 3.1 과 함께 등록됨 — `store-owner.utils.ts` `STORE_OWNER_ROLES_BY_SERVICE`) |

role 문자열은 바꾸지 않는다. 매장 운영 공간 자체는 공통 Store Workspace(`store.neture.co.kr`)이며 serviceKey 를 갖지 않는다.

---

## 4. 접근 제어 기준

다음 조건을 만족해야 매장 기능 접근이 가능하다.

```text
role_assignments.role IN ({service}:store_owner)
```

이 외의 조건은 접근 허용 기준으로 사용하지 않는다.

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

---

## 9. 주의 사항

* 권한 로직 수정 시 role_assignments 기준을 반드시 유지한다
* fallback 로직 재도입 금지
* 권한 판단과 데이터 상태를 혼합하지 않는다
