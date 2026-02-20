# Cosmetics Domain Rules (Mandatory)

> **CLAUDE.md §11-13에서 분리된 상세 규칙**
> 이 문서는 CLAUDE.md의 보조 문서입니다.

---

## 1. DB 소유권 원칙 (§11.1-11.5)

> cosmetics 도메인은 Core와 분리된 독립 DB 스키마를 가지며,
> 아래 규칙을 위반하는 작업은 **즉시 중단 및 재설계 대상**이다.

### 1.1 독립 스키마 원칙

| 원칙 | 설명 |
|------|------|
| 독립 스키마 | cosmetics 도메인은 자체 DB 스키마를 가진다 |
| Core 생성 금지 | Core DB에 cosmetics 전용 테이블 생성 금지 |
| 참조만 허용 | Core DB는 `user_id` 참조만 가능, 소유권 없음 |

### 1.2 테이블 네이밍 규칙

모든 cosmetics 테이블은 `cosmetics_` prefix 필수 (예외 없음)

```
cosmetics_products
cosmetics_brands
cosmetics_price_policies
```

### 1.3 절대 금지 데이터

cosmetics DB에 아래 데이터 저장 금지:
* 사용자 개인정보 (email, phone, name 등)
* 역할/권한/인증 정보
* Core 설정값 (apps, settings 등)

### 1.4 Core 관계 규칙

* `user_id`는 문자열/UUID로만 저장
* **FK 제약을 Core 테이블에 설정 금지** (서비스 간 결합 방지)
* Core DB 변경이 cosmetics DB에 영향을 주면 안 됨

### 1.5 마이그레이션 규칙

* cosmetics DB 마이그레이션은 **cosmetics-api만** 수행
* Core 마이그레이션과 **동시 실행 금지**
* cosmetics 스키마 변경은 Core 배포와 **독립적**이어야 함

### 1.6 주문 처리 원칙 (Phase 5-B 확정)

| 원칙 | 설명 |
|------|------|
| 주문 생성 | **E-commerce Core** 통해 처리 |
| OrderType | `COSMETICS` |
| 주문 원장 | `checkout_orders` (Core 소유) |
| Cosmetics 책임 | 상품/브랜드/가격 관리만 |

> Cosmetics는 **상품 데이터**에 대해 독립 스키마를 유지하되,
> **주문/결제**는 E-commerce Core를 통해 처리한다.

---

## 2. API 규칙 (§12)

> cosmetics-api는 화장품 비즈니스 로직만 담당하며,
> 플랫폼 기능(인증, 사용자 관리 등)을 재구현하는 것은 **절대 금지**한다.

### 2.1 API 책임 범위

| 허용 | 금지 |
|------|------|
| 상품/브랜드/가격 CRUD | 사용자 CRUD |
| 비즈니스 검증 | 로그인/토큰 발급 |
| Cosmetics DB 관리 | 인증/권한 처리 |
| 감사 로그 기록 | Core 설정 접근 |

### 2.2 인증 규칙

| 허용 | 금지 |
|------|------|
| JWT 검증 (verify) | JWT 발급 (sign) |
| user_id 추출 | 토큰 갱신 (refresh) |
| Scope 확인 | 새 토큰 생성 |

**Scope 규칙**: `cosmetics:read`, `cosmetics:write`, `cosmetics:admin`만 사용

### 2.3 데이터 접근 규칙

| DB | 읽기 | 쓰기 |
|----|------|------|
| Cosmetics DB | ✅ | ✅ |
| Core DB | ⚠️ 제한적 | ❌ 절대 금지 |

Core DB 읽기 허용: `users.id`, `users.name` (감사 로그 표시용만)

### 2.4 금지 API 엔드포인트

```
POST /cosmetics/users          ❌
POST /cosmetics/auth/login     ❌
POST /cosmetics/auth/token     ❌
GET  /cosmetics/settings       ❌
POST /cosmetics/orders         ❌
```

### 2.5 통신 규칙

| 허용 | 금지 |
|------|------|
| cosmetics-web → cosmetics-api | core-api → cosmetics-api |
| cosmetics-api → core-api (읽기) | cosmetics-api → 타 business-api |

---

## 3. Web Integration 규칙 (§13)

> cosmetics-web은 UI/UX 전담이며,
> 비즈니스 로직/DB 접근/인증 처리를 직접 구현하는 것은 **절대 금지**한다.

### 3.1 역할 분리

| 구성 요소 | 책임 | 금지 |
|-----------|------|------|
| cosmetics-web | UI/UX, 상태 표현 | 비즈니스 로직, DB 접근 |
| cosmetics-api | 비즈니스 로직, 검증 | JWT 발급, 사용자 관리 |
| core-api | 인증, 권한 | 도메인 비즈니스 |

### 3.2 호출 규칙

| 허용 | 금지 |
|------|------|
| Browser → cosmetics-web → cosmetics-api | Browser → cosmetics-api 직접 |
| cosmetics-web → core-api (로그인만) | cosmetics-web → 타 API 직접 |

### 3.3 인증/권한 흐름

```
로그인: Browser → cosmetics-web → core-api → JWT 발급
API:   cosmetics-web → cosmetics-api (Bearer JWT)
```

* JWT 저장: cosmetics-web (localStorage/cookie)
* JWT 검증: cosmetics-api만
* JWT 발급: core-api만

### 3.4 금지 사항 (절대)

| 금지 | 이유 |
|------|------|
| Web에서 비즈니스 검증 | API 책임 |
| Web에서 DB/ORM 접근 | 계층 분리 |
| Web에서 Core 설정 참조 | 도메인 분리 |
| API URL 하드코딩 | 환경 분리 |
| Browser → API 직접 호출 | 보안/CORS |

### 3.5 환경변수 규칙

```
# cosmetics-web 필수
COSMETICS_API_URL=https://cosmetics-api.neture.co.kr
CORE_API_URL=https://api.neture.co.kr

# 금지
하드코딩 URL ❌
```

---

## 4. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| 금지 API 생성 | 즉시 삭제 |
| JWT 발급 구현 | 즉시 제거 |
| Core DB 쓰기 | 롤백 및 재설계 |
| Web에서 비즈니스 로직 | API로 이전 |
| Web에서 DB 접근 | 즉시 제거 |
| Browser → API 직접 | cosmetics-web 경유로 변경 |

---

## 참조 문서

- 📄 E-commerce 계약: `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md`
- 📄 O4O Store 규칙: `docs/architecture/O4O-STORE-RULES.md`
- 📄 GlycoPharm Legacy: `docs/baseline/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md`

---

*Phase 9-A (2026-01-11) - CLAUDE.md 정리*
