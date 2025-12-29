# Cosmetics Domain DB Schema Rules

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: 2025-12-29

이 문서는 Cosmetics 도메인의 데이터베이스 스키마 규칙을 정의합니다.
**설명이 아닌 준수 규칙**이며, 모든 cosmetics 관련 개발은 이 규칙을 따라야 합니다.

---

## 1. Cosmetics DB 소유권 원칙 (절대 규칙)

### 1.1 독립 스키마 원칙

| 원칙 | 설명 |
|------|------|
| **자체 DB 스키마** | cosmetics 도메인은 자체 DB 스키마를 가진다 |
| **Core 테이블 생성 금지** | Core DB에 cosmetics 전용 테이블을 생성하지 않는다 |
| **참조만 허용** | Core DB는 참조만 가능, 소유권 없음 |

### 1.2 데이터 범위 원칙

cosmetics DB는 **비즈니스 상태**만 저장한다:
- 사용자 신원, 권한, 인증 정보는 저장하지 않는다
- Core의 `user_id`를 **외래 키로만 참조**한다

### 1.3 네이밍 규칙

모든 cosmetics DB 테이블은 `cosmetics_` prefix를 가진다.

```
cosmetics_products
cosmetics_brands
cosmetics_price_policies
cosmetics_product_logs
```

**예외 없음** - Core 테이블과 시각적으로도 구분되도록 강제

---

## 2. 허용되는 데이터 범위

cosmetics DB는 아래 데이터만 가질 수 있다.

### 2.1 상품 도메인

| 테이블 | 데이터 |
|--------|--------|
| `cosmetics_products` | 화장품 상품 기본 정보 |
| `cosmetics_brands` | 브랜드 정보 |
| `cosmetics_lines` | 라인 정보 |
| `cosmetics_ingredients` | 성분 정보 |
| `cosmetics_product_variants` | 용량/색상 등 변형 |
| `cosmetics_product_status` | 판매 상태 (노출/중지/품절) |

### 2.2 비즈니스 정책

| 테이블 | 데이터 |
|--------|--------|
| `cosmetics_price_policies` | 가격 정책 |
| `cosmetics_channel_policies` | 채널별 판매 가능 여부 |
| `cosmetics_region_policies` | 지역별 정책 |
| `cosmetics_partner_policies` | 파트너별 정책 |

### 2.3 비즈니스 행위 로그

| 테이블 | 데이터 |
|--------|--------|
| `cosmetics_product_logs` | 상품 변경 이력 |
| `cosmetics_price_logs` | 가격 변경 이력 |
| `cosmetics_status_logs` | 노출 상태 변경 이력 |

---

## 3. 절대 금지 데이터 (Core 침범 금지)

cosmetics DB에는 아래 항목을 **어떠한 형태로도 저장할 수 없다**.

| 금지 데이터 | 사유 |
|-------------|------|
| 사용자 개인정보 (email, phone, name 등) | Core 소유 |
| 역할/권한 정보 | Core Auth 소유 |
| 인증 토큰 | Core Auth 소유 |
| 세션 정보 | Core Auth 소유 |
| Core 설정값 (apps, settings 등) | Core 소유 |

---

## 4. Core와의 관계 규칙

### 4.1 사용자 참조 방식

```sql
-- 허용: user_id 문자열/UUID 참조
CREATE TABLE cosmetics_products (
  id uuid PRIMARY KEY,
  created_by_user_id uuid,  -- Core users.id 참조 (FK 제약 없음)
  ...
);

-- 금지: FK 제약 설정
-- CONSTRAINT fk_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
```

### 4.2 FK 제약 금지 원칙

| 규칙 | 설명 |
|------|------|
| `user_id` 저장 | 문자열 또는 UUID로만 저장 |
| FK 제약 | DB 레벨에서 걸지 않는다 (서비스 간 결합 방지) |
| Core 변경 영향 | Core DB 구조 변경이 cosmetics DB에 영향을 주면 안 된다 |

---

## 5. 스키마 변경 규칙

### 5.1 마이그레이션 원칙

| 규칙 | 설명 |
|------|------|
| 실행 주체 | cosmetics DB 마이그레이션은 **cosmetics-api만** 수행 |
| 동시 실행 금지 | Core 마이그레이션과 **절대 동시에 실행하지 않는다** |
| 독립 배포 | cosmetics 스키마 변경은 Core 배포와 **독립적으로 가능**해야 한다 |

### 5.2 마이그레이션 파일 위치

```
apps/cosmetics-api/
  src/
    database/
      migrations/
        YYYYMMDDHHMMSS-CreateCosmeticsProductsTable.ts
        YYYYMMDDHHMMSS-AddCosmeticsPricePolicies.ts
```

---

## 6. 예시 스키마

### 6.1 상품 테이블 예시

```sql
CREATE TABLE cosmetics_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 상품 정보 (cosmetics 소유)
  name varchar(255) NOT NULL,
  brand_id uuid REFERENCES cosmetics_brands(id),
  line_id uuid REFERENCES cosmetics_lines(id),
  description text,

  -- 상태
  status varchar(20) NOT NULL DEFAULT 'draft',
  is_visible boolean NOT NULL DEFAULT false,

  -- 감사 필드 (user_id는 참조만, FK 없음)
  created_by_user_id uuid,
  updated_by_user_id uuid,

  -- 타임스탬프
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX idx_cosmetics_products_brand ON cosmetics_products(brand_id);
CREATE INDEX idx_cosmetics_products_status ON cosmetics_products(status);
CREATE INDEX idx_cosmetics_products_visible ON cosmetics_products(is_visible);
```

### 6.2 브랜드 테이블 예시

```sql
CREATE TABLE cosmetics_brands (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  name varchar(100) NOT NULL,
  slug varchar(100) NOT NULL UNIQUE,
  description text,
  logo_url varchar(500),

  is_active boolean NOT NULL DEFAULT true,

  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. 위반 시 조치

본 규칙을 위반하는 작업은 **즉시 중단 및 재설계 대상**이다.

| 위반 유형 | 조치 |
|-----------|------|
| Core DB에 cosmetics 테이블 생성 | 즉시 롤백 |
| cosmetics DB에 사용자 정보 저장 | 즉시 삭제 및 재설계 |
| `cosmetics_` prefix 미사용 | 테이블 이름 변경 필수 |
| FK 제약을 Core 테이블에 설정 | FK 제거 |

---

## 8. 참조 문서

- CLAUDE.md §12 Cosmetics Domain Rules
- docs/services/cosmetics/service-definition.md
- docs/services/cosmetics/service-policy.md

---

*이 문서는 규칙이며, 이후 모든 cosmetics 개발은 이 문서를 기준으로 검증됩니다.*
