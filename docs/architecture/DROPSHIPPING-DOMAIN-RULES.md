# Dropshipping Domain Rules (DS-1)

> **이 문서는 Dropshipping 도메인의 절대 기준이다.**
> 이 문서를 위반하는 코드는 버그로 간주된다.
> DS-2 이후 모든 구현은 이 문서의 규칙을 따른다.

**Version:** 1.0.0
**Status:** Active
**Last Updated:** 2025-12-31

---

## 1. Domain Boundary (도메인 경계)

### 1.1 Dropshipping 도메인이 소유하는 것

Dropshipping 도메인은 다음을 **배타적으로 소유**한다.

| 소유 대상 | 설명 |
|-----------|------|
| **SupplierCatalogItem** | 공급자가 등록한 상품 원본 |
| **SellerOffer** | 판매자가 생성한 판매 제안 |
| **OrderRelay** | 주문 전달 및 이행 상태 |
| **Settlement** | 정산 배치 및 거래 내역 |
| **Commission** | 수수료 규칙 및 거래 기록 |

### 1.2 Dropshipping 도메인이 절대 소유하지 않는 것

다음은 Dropshipping 도메인의 **소유 범위에서 제외**된다.

| 제외 대상 | 소유 도메인 | 이유 |
|-----------|------------|------|
| User / Account | Auth Core | 인증·신원은 Core 책임 |
| Organization | Organization Core | 조직 구조는 Core 책임 |
| Role / Permission | Auth Core | 권한 체계는 Core 책임 |
| EcommerceOrder | Ecommerce Core | 판매 원장은 Ecommerce 책임 |
| Payment / Transaction | Payment Core | 결제는 Payment 책임 |
| Product (범용) | 각 도메인 | 범용 상품 테이블 공유 금지 |

### 1.3 Core와의 관계 원칙

Dropshipping 도메인은 Core에 **의존하되 침범하지 않는다**.

- Core 테이블을 **읽을 수 있다** (user_id, organization_id 참조)
- Core 테이블을 **수정할 수 없다**
- Core 테이블에 **FK 제약을 설정할 수 없다**
- Core 로직을 **재구현할 수 없다**

---

## 2. Core ↔ Dropshipping 규칙

### 2.1 허용된 참조 (Allowed)

| 참조 방향 | 허용 항목 | 방식 |
|-----------|----------|------|
| Dropshipping → Core | `user_id` | UUID 문자열 저장 (Soft FK) |
| Dropshipping → Core | `organization_id` | UUID 문자열 저장 (Soft FK) |
| Dropshipping → Ecommerce | `ecommerce_order_id` | UUID 문자열 저장 (Soft FK) |

### 2.2 금지된 참조 (Forbidden)

| 금지 항목 | 이유 |
|-----------|------|
| Core 테이블에 FK 제약 설정 | 서비스 간 강결합 방지 |
| Core 테이블 직접 JOIN | 성능·결합도 문제 |
| Core 테이블 쓰기 | 도메인 경계 침범 |
| Core 엔티티 상속/확장 | 의존성 역전 |
| Core API 우회 직접 호출 | 계약 위반 |

### 2.3 FK 강결합 금지 원칙

Dropshipping 엔티티는 **외부 도메인에 대한 FK 제약을 설정하지 않는다**.

```
✅ 허용: user_id: string (UUID만 저장)
❌ 금지: @ManyToOne(() => User) user: User
```

### 2.4 ID 참조 방식 규칙

외부 도메인 ID 참조 시 다음 규칙을 따른다.

| 규칙 | 설명 |
|------|------|
| **타입** | `string` 또는 `uuid` (VARCHAR(36)) |
| **컬럼명** | `{domain}_{entity}_id` 형식 (예: `ecommerce_order_id`) |
| **Nullable** | 연결이 선택적일 경우 `nullable: true` |
| **인덱스** | 조회 빈도에 따라 인덱스 추가 |
| **검증** | 애플리케이션 레벨에서 존재 여부 확인 |

---

## 3. Database Ownership Rules

### 3.1 테이블 네이밍 규칙

모든 Dropshipping 테이블은 `dropshipping_` prefix를 **필수로 사용**한다.

```
✅ dropshipping_supplier_catalog_items
✅ dropshipping_seller_offers
✅ dropshipping_order_relays
✅ dropshipping_settlements
✅ dropshipping_commission_rules

❌ supplier_catalog_items (prefix 누락)
❌ products (범용 이름)
❌ orders (범용 이름)
```

### 3.2 Core 테이블 직접 수정 금지

Dropshipping 마이그레이션에서 Core 테이블을 **절대 수정하지 않는다**.

| 금지 항목 | 예시 |
|-----------|------|
| Core 테이블 ALTER | `ALTER TABLE users ADD COLUMN ...` |
| Core 테이블 DROP | `DROP TABLE organizations` |
| Core 인덱스 수정 | `CREATE INDEX ON users(...)` |
| Core 데이터 INSERT/UPDATE | `INSERT INTO roles ...` |

### 3.3 로그 / 스냅샷 테이블 원칙

상태 변경 이력이 필요한 경우 **별도 로그 테이블**을 생성한다.

```
dropshipping_seller_offer_logs      (상태 변경 이력)
dropshipping_order_relay_snapshots  (시점 스냅샷)
dropshipping_settlement_audit_logs  (감사 로그)
```

### 3.4 범용 테이블 공유 금지

다음 범용 테이블을 **Dropshipping과 공유하지 않는다**.

| 금지 대상 | 대안 |
|-----------|------|
| `products` | `dropshipping_supplier_catalog_items` 사용 |
| `orders` | `dropshipping_order_relays` 사용 |
| `transactions` | `dropshipping_commission_transactions` 사용 |
| `settings` | `dropshipping_settings` 사용 |

---

## 4. API Contract Rules

### 4.1 API 경로 규칙

모든 Dropshipping API는 다음 경로를 **고정적으로 사용**한다.

```
/api/v1/dropshipping/*
```

### 4.2 API 책임 구분

| API 유형 | 경로 패턴 | 접근 주체 | 책임 |
|----------|----------|----------|------|
| **Public** | `/api/v1/dropshipping/catalog/*` | 인증된 사용자 | 카탈로그 조회 |
| **Seller** | `/api/v1/dropshipping/seller/*` | Seller 역할 | 판매자 운영 |
| **Supplier** | `/api/v1/dropshipping/supplier/*` | Supplier 역할 | 공급자 운영 |
| **Admin** | `/api/v1/dropshipping/admin/*` | Admin 역할 | 전체 관리 |

### 4.3 타 도메인 API 직접 호출 금지

Dropshipping 서비스에서 다른 도메인 API를 **직접 호출하지 않는다**.

| 금지 항목 | 이유 |
|-----------|------|
| `cosmetics-api` 직접 호출 | 서비스 간 결합 |
| `yaksa-api` 직접 호출 | 서비스 간 결합 |
| `payment-api` 직접 호출 | Core 경유 필수 |

### 4.4 Ecommerce Core 연동 규칙

주문 생성 시 **반드시 Ecommerce Core를 경유**한다.

```
1. 판매자가 주문 수신
2. EcommerceOrderService.create() 호출 (필수)
3. ecommerce_order_id 획득
4. dropshipping_order_relays에 ecommerce_order_id 저장
5. 이후 이행 프로세스 진행
```

---

## 5. State Model (상태 모델)

### 5.1 SellerOffer 상태

SellerOffer는 다음 상태만 가질 수 있다.

```
draft → pending → active → paused → retired
```

| 상태 | 설명 | 전이 가능 상태 |
|------|------|---------------|
| `draft` | 초안 (미공개) | pending |
| `pending` | 승인 대기 | active, draft |
| `active` | 활성 (판매 중) | paused, retired |
| `paused` | 일시 중지 | active, retired |
| `retired` | 종료 (영구) | (없음) |

### 5.2 OrderRelay 상태

OrderRelay는 다음 상태만 가질 수 있다.

```
created → allocated → fulfilled → shipped → delivered → closed
```

| 상태 | 설명 | 전이 가능 상태 |
|------|------|---------------|
| `created` | 주문 생성됨 | allocated, cancelled |
| `allocated` | 공급자 할당됨 | fulfilled, cancelled |
| `fulfilled` | 이행 완료 | shipped |
| `shipped` | 배송 시작 | delivered |
| `delivered` | 배송 완료 | closed |
| `closed` | 주문 종료 | (없음) |
| `cancelled` | 취소됨 | (없음) |

### 5.3 Settlement 상태

Settlement는 다음 상태만 가질 수 있다.

```
scheduled → calculated → confirmed → paid
```

| 상태 | 설명 | 전이 가능 상태 |
|------|------|---------------|
| `scheduled` | 정산 예정 | calculated |
| `calculated` | 금액 산정됨 | confirmed, disputed |
| `confirmed` | 확정됨 | paid |
| `paid` | 지급 완료 | (없음) |
| `disputed` | 이의 제기 | calculated |

### 5.4 상태 추가 규칙

위 상태 모델에 대한 **상태 추가는 DS-Phase 이후에만 허용**된다.

- 새로운 상태 추가 시 반드시 DS-1 문서 갱신 필수
- 상태 삭제는 금지 (하위 호환성)
- 상태 이름 변경은 금지 (API 계약)

---

## 6. Entity Ownership (엔티티 소유권)

### 6.1 핵심 엔티티 목록

| 엔티티 | 테이블명 | 소유자 |
|--------|---------|--------|
| SupplierCatalogItem | `dropshipping_supplier_catalog_items` | dropshipping-core |
| SellerOffer | `dropshipping_seller_offers` | dropshipping-core |
| OrderRelay | `dropshipping_order_relays` | dropshipping-core |
| SettlementBatch | `dropshipping_settlement_batches` | dropshipping-core |
| CommissionRule | `dropshipping_commission_rules` | dropshipping-core |
| CommissionTransaction | `dropshipping_commission_transactions` | dropshipping-core |

### 6.2 Extension 엔티티 규칙

도메인 확장(cosmetics, pharmaceutical 등)은 **별도 prefix**를 사용한다.

```
cosmetics_*          (dropshipping-cosmetics)
pharmaceutical_*     (dropshipping-pharmaceutical)
```

Extension은 Core 엔티티를 **참조만 하고 수정하지 않는다**.

---

## 7. Forbidden Actions (금지 사항)

### 7.1 절대 금지 목록

다음 행위는 **어떤 상황에서도 금지**된다.

| 금지 항목 | 이유 |
|-----------|------|
| Core 테이블 스키마 수정 | 도메인 경계 침범 |
| Core 데이터 직접 변경 | 무결성 훼손 |
| `users`, `organizations` 테이블 FK 설정 | 강결합 |
| 범용 `products`, `orders` 테이블 사용 | 도메인 혼합 |
| 타 Business API 직접 호출 | 서비스 결합 |
| 주문 생성 시 Ecommerce Core 우회 | 판매 원장 훼손 |
| 상태 모델 임의 변경 | 계약 위반 |
| `dropshipping_` prefix 미사용 | 네이밍 규칙 위반 |

### 7.2 예외 요청 절차

위 금지 사항에 대한 예외가 필요한 경우:

1. DS-1 문서에 예외 사유 명시
2. 아키텍처 리뷰 필수
3. CLAUDE.md 또는 DS-1 문서 갱신
4. 예외 없이는 구현 불가

---

## 8. Migration Rules (마이그레이션 규칙)

### 8.1 마이그레이션 파일 네이밍

```
{timestamp}-{action}-Dropshipping{Entity}.ts
```

예시:
```
1735600000000-CreateDropshippingSupplierCatalogItems.ts
1735600000001-AddIndexDropshippingSellerOffers.ts
```

### 8.2 마이그레이션 금지 사항

| 금지 항목 | 이유 |
|-----------|------|
| Core 테이블 참조 마이그레이션 | 도메인 분리 |
| 다른 도메인 테이블 수정 | 경계 침범 |
| `IF EXISTS` 없는 DROP | 안전성 |
| 데이터 마이그레이션과 스키마 혼합 | 롤백 어려움 |

### 8.3 롤백 필수

모든 마이그레이션은 **down() 메서드를 반드시 구현**한다.

---

## 9. Service Group Integration

### 9.1 SERVICE_GROUP 규칙

Dropshipping 기능은 다음 SERVICE_GROUP에서 활성화된다.

| SERVICE_GROUP | Dropshipping 활성화 | 비고 |
|---------------|-------------------|------|
| `cosmetics` | ✅ 활성 | dropshipping-cosmetics 확장 |
| `yaksa` | ❌ 비활성 | 별도 결정 시까지 |
| `sellerops` | ✅ 활성 | 판매자 운영 |
| `supplierops` | ✅ 활성 | 공급자 운영 |
| `global` | ❌ 비활성 | 명시적 활성화 필요 |

### 9.2 라우트 보호 규칙

Dropshipping 라우트는 **SERVICE_GROUP 미들웨어로 보호**한다.

```typescript
app.use('/api/v1/dropshipping', requireServiceGroup(['cosmetics', 'sellerops', 'supplierops']))
```

---

## 10. Compliance Checklist (준수 체크리스트)

DS-2 이후 구현 시 다음을 **반드시 확인**한다.

| 항목 | 확인 |
|------|------|
| 테이블명이 `dropshipping_`으로 시작하는가? | ☐ |
| Core 테이블에 FK가 없는가? | ☐ |
| 외부 ID는 Soft FK(문자열)인가? | ☐ |
| API 경로가 `/api/v1/dropshipping/*`인가? | ☐ |
| 주문 생성 시 Ecommerce Core를 경유하는가? | ☐ |
| 상태 전이가 정의된 모델을 따르는가? | ☐ |
| 마이그레이션에 down()이 구현되어 있는가? | ☐ |
| 타 도메인 API를 직접 호출하지 않는가? | ☐ |

---

*Document Version: 1.0.0*
*Created: 2025-12-31*
*Authority: CLAUDE.md Constitution*
