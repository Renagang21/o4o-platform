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

- kpa:store_owner
- glycopharm:store_owner
- cosmetics:store_owner

### 3.2 Neture

- neture:supplier는 store_owner와 동일 레벨의 비즈니스 역할로 취급한다.

---

### 3.3 seller 제거

seller는 독립 역할로 사용하지 않는다.

모든 seller는 store_owner로 통합한다.

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
* organization_members.role='owner'
* cosmetics:seller / k-cosmetics:seller

---

## 7. 마이그레이션 완료 상태

다음 전환이 완료되었다.

* kpa:store_owner backfill 완료
* glycopharm:store_owner 구조 준비 완료
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
