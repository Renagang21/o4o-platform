# Cosmetics Domain Rules — OBSOLETE (퇴역 서비스 기록물)

> **상태**: OBSOLETE · 판정 확정(2026-10-07, `WO-O4O-CANONICAL-INDEX-S9-REMAINING-3-FINAL-DISPOSITION-V1`) — **K-Cosmetics 서비스(`k-cosmetics`, `retail.neture.co.kr`)는 퇴역이 결정됐다**(사용자 결정 2026-10-05 · [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §14). 이 문서는 별도 `cosmetics-api` · 독립 DB 를 전제한 서비스 전용 규칙이며 그 전제는 실재하지 않는다(아래 2026-10-04 정정). 대체 문서는 없다 — 남는 원칙은 이미 플랫폼 공통 정본이 정한다: 주문은 `checkoutService.createOrder()` 단일 지점 · 현행 주문 축은 공급자→매장 B2B(`CLAUDE.md` §4 · [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)) · 소비자 주문 410(COMMERCE-BOUNDARY), 인증 · 사용자 재구현 금지 · `authClient.api` · URL 하드코딩 금지(`CLAUDE.md` §1 · auth-core 동결 §3), cross-domain JOIN 금지 · Domain Boundary 필터([BOUNDARY-POLICY](O4O-BOUNDARY-POLICY-V1.md)), role/scope 는 RBAC SSOT. **아래 §1.1 · §1.3 · §1.4 와 `public.cosmetics_members`(→ users FK) · 매장 신청 테이블의 연락처 · 사업자번호 필드의 관계는 판정하지 않는다** — 퇴역 서비스의 테이블 처리(유지 · 제거 · archive)는 퇴역 작업이 범위를 정하며, 이 문서를 그 근거로도 반대 근거로도 쓰지 않는다. 퇴역 대상은 서비스이지 화장품 제품군(Neture 공급 제품 · 카테고리)이 아니다. 아래 본문은 2026-01 기록(+ 2026-10-04 사실 정정)으로만 읽는다 · **표기일**: 2026-10-07
>
> (원문) **CLAUDE.md §9 (도메인별 규칙) 의 Cosmetics 상세 규칙** (구 §11~§13 에서 분리) — 2026-10-07 이후 `CLAUDE.md` 는 이 문서를 규칙으로 가리키지 않는다.
>
> (2026-10-04 정합) **배포 구조 사실 정정**: 별도 `cosmetics-api` 서버 · `cosmetics-api.neture.co.kr` 은 존재하지 않는다. Cosmetics API 는 단일 core API(`apps/api-server`, Cloud Run `o4o-core-api`)의 `apps/api-server/src/routes/cosmetics/**` 이고, 웹은 `services/web-k-cosmetics` 다. 데이터는 같은 DB(`o4o_platform`)의 **`cosmetics` 스키마**(`cosmetics.cosmetics_products` 등 12개)에 있으며, `public.cosmetics_members`(FK → `public.users`) · `public.cosmetics_contents` 2개는 `public` 스키마에 있다(`apps/api-server/src/database/bootstrap/canonical-schema-baseline.ts`). 아래 본문의 "cosmetics-api / core-api / Cosmetics DB / Core DB" 는 각각 "`routes/cosmetics` 계층 / auth · platform 계층 / `cosmetics` 스키마 / `public` 의 Core 테이블" 로 읽는다. **유효**: `cosmetics_` prefix · 플랫폼 기능(인증 · 사용자) 재구현 금지 · 주문은 `CLAUDE.md` §4 경유. 독립성 원칙의 현행 범위는 판정하지 않고 종료(2026-10-07 OBSOLETE — 위 상태 줄).

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

> (2026-10-04 정합) 현행 코드 사실: `public.cosmetics_members.user_id` 는 `public.users(id)` 에 FK(`ON DELETE CASCADE`)를 가진다(`WO-O4O-KCOS-COSMETICS-MEMBER-PROFILE-FOUNDATION-V1` 의 서비스 회원 프로필 패턴). `cosmetics.cosmetics_stores` · `cosmetics.cosmetics_store_applications` 는 `owner_name` · `contact_phone` · `business_number` 를 저장한다. 위 §1.1 · §1.3 · §1.4 와의 관계(허용 예외인지, 원칙의 적용 범위를 `cosmetics` 스키마 상품 테이블로 한정할지)는 **판정 전**이다 — 이 문서만으로 해당 테이블 변경 근거로 쓰지 않는다.

### 1.5 마이그레이션 규칙

* cosmetics DB 마이그레이션은 **cosmetics-api만** 수행
* Core 마이그레이션과 **동시 실행 금지**
* cosmetics 스키마 변경은 Core 배포와 **독립적**이어야 함

> (2026-10-04 정합) 위 3항은 별도 `cosmetics-api` 를 전제한 stale 서술이다. 현행: `cosmetics` 스키마 migration 도 `apps/api-server` 의 단일 migration 체인으로, **API 배포 workflow 의 migration Job 만** 실행한다(`.github/workflows/deploy-api.yml` · [PRODUCTION-MIGRATION-STANDARD](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md)). 수동 적용은 `CLAUDE.md` DB · 보안 경계(사용자 명시 승인)를 따른다.

### 1.6 주문 처리 원칙 (Phase 5-B 확정)

| 원칙 | 설명 |
|------|------|
| 주문 생성 | **E-commerce Core** 통해 처리 |
| OrderType | `COSMETICS` |
| 주문 원장 | `checkout_orders` (Core 소유) |
| Cosmetics 책임 | 상품/브랜드/가격 관리만 |

> Cosmetics는 **상품 데이터**에 대해 독립 스키마를 유지하되,
> **주문/결제**는 E-commerce Core를 통해 처리한다.

> (2026-10-04 정합) `OrderType` 은 `CheckoutOrder` 엔티티에 매핑되지 않으며 서비스 구분은 `metadata.serviceKey` 다([E-COMMERCE-ORDER-CONTRACT](../baseline/E-COMMERCE-ORDER-CONTRACT.md) 행 · `CANONICAL-INDEX` §9). 소비자 주문 생성 `POST /cosmetics/orders` 는 `410 STORE_CONSUMER_ORDER_RETIRED` 로 은퇴했고(`routes/cosmetics/controllers/cosmetics-order.controller.ts` · [COMMERCE-BOUNDARY](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)), 현행 Cosmetics 주문 축은 공급자→매장 B2B([B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md))다.

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

> (2026-10-04 정합) `cosmetics:read` · `cosmetics:write` 는 코드에 없다. 현행 role/scope 는 RBAC SSOT(`role_assignments`, [RBAC-FREEZE](../rbac/RBAC-FREEZE-DECLARATION-V1.md))의 `cosmetics:admin` · `cosmetics:operator` · `cosmetics:store_owner` 등이며, Guard 는 `requireAuth` → `requireCosmeticsScope(...)` 표준(`CLAUDE.md` §11)을 따른다. "JWT 는 검증만 · 발급 · 갱신 금지" 원칙은 유효하다(발급은 auth 계층 단일).

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

> (2026-10-04 정합) 서버가 하나이므로 위 "API 간 통신" 표는 현행 구조에 해당하지 않는다. 같은 원칙은 코드 계층 경계로 적용된다 — `routes/cosmetics` 는 auth · user 계층을 재구현하지 않고, 다른 서비스 도메인 테이블과 cross-domain JOIN 하지 않는다([BOUNDARY-POLICY](O4O-BOUNDARY-POLICY-V1.md) Guard Rule 5).

---

## 3. Web Integration 규칙 (§13)

> cosmetics-web은 UI/UX 전담이며,
> 비즈니스 로직/DB 접근/인증 처리를 직접 구현하는 것은 **절대 금지**한다.

> (2026-10-04 정합) 현행 웹은 `services/web-k-cosmetics`(정적 SPA)이며 서버 프록시 계층이 없다. 브라우저의 SPA 가 `authClient.api`(`services/web-k-cosmetics/src/lib/apiClient.ts`, base `VITE_API_BASE_URL` → `/api/v1`)로 **단일 core API 를 직접 호출**한다 — 이것이 `CLAUDE.md` §1 의 표준 호출 방식이다. 따라서 §3.2 의 "Browser → cosmetics-api 직접 금지 · cosmetics-web 경유", §3.3 의 "cosmetics-api 만 JWT 검증", §3.5 의 `COSMETICS_API_URL` · `CORE_API_URL`, §4 의 "Browser → API 직접 → cosmetics-web 경유로 변경" 은 stale 이다. 유효: 웹에서 비즈니스 검증 · DB 접근 금지, API URL 하드코딩 금지(`CLAUDE.md` §1), JWT 발급은 auth 계층만.

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
- 📄 매장 commerce 경계: `docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md` · B2B 주문: `docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md`

---

*Phase 9-A (2026-01-11) - CLAUDE.md 정리*
