# Cosmetics/K-Cosmetics Step 2 조사 보고서 v0.1

**Work Order**: WO-COSMETICS-STEP2-INVESTIGATION
**Phase**: Step 2 (의존성 중심 조사)
**Date**: 2026-01-11
**Investigator**: Claude Code
**Purpose**: Neture 의존성 및 단독 테스트 가능성 확인 (판단/수정 없음)

---

## A. 서비스 기본 성격 확인 (Identity Check)

### A-1. 서비스 정의 (현재 코드 기준)

**서비스 구성:**
- **API**: `apps/api-server/src/routes/cosmetics/`
- **Frontend**: `services/web-k-cosmetics/`

**서비스 유형:**
- **주체**: B2B + B2C 혼합형
- **성격**: 상품 중심 (프랜차이즈 쇼윈도)
- **특징**: 독립 스키마 (`schema: 'cosmetics'`)

**정의문:**
> "Cosmetics/K-Cosmetics는 자체 상품 DB를 가진
> 프랜차이즈 쇼윈도 형태의 상품 중심 서비스이다."

### A-2. 단독 실행 가능성

**✅ Neture 없이 서비스 기동 가능**

**Frontend 라우트 (web-k-cosmetics/App.tsx):**
```tsx
/ → HomePage
/login → LoginPage
/contact → ContactPage
/supplier/* → RoleNotAvailablePage
/partner/* → RoleNotAvailablePage
```

**Backend API 엔드포인트:**
```
GET  /api/v1/cosmetics/products
GET  /api/v1/cosmetics/products/:id
GET  /api/v1/cosmetics/brands
GET  /api/v1/cosmetics/brands/:id
POST /api/v1/cosmetics/products (인증 필요)
PUT  /api/v1/cosmetics/products/:id (인증 필요)
...
POST /api/v1/cosmetics/orders (주문 생성)
GET  /api/v1/cosmetics/orders
GET  /api/v1/cosmetics/orders/:id
```

**판정:**
- ✅ Neture 비연결 상태에서도 모든 주요 화면 접근 가능
- ✅ 사용자 여정이 강제로 Neture로 빠지지 않음
- ✅ 독립적인 상품/주문 플로우 존재

---

## B. Neture 의존성 조사 (핵심)

### B-1. Neture 연계 지점 검색

**코드 검색 결과:**
```bash
grep -r "neture|Neture" apps/api-server/src/routes/cosmetics/
# → No files found
```

**판정:** ❌ Neture 연계 지점 없음

### B-2. Neture 미존재 시 영향

**예상 영향:** 없음

**근거:**
- Cosmetics 코드베이스에 Neture 참조 0건
- 독립 스키마 (`cosmetics`) 사용
- 독립 라우트 (`/api/v1/cosmetics`)
- 독립 Frontend (`web-k-cosmetics`)

**판정:** ⭕ 완전 독립 서비스 (Neture 의존 없음)

---

## C. 다른 서비스 의존성 조사 (Neture 외)

### C-1. Auth / User / Role

**인증 미들웨어:**
```ts
// cosmetics.routes.ts
import { requireAuth as coreRequireAuth } from '../../middleware/auth.middleware.js';

function requireCosmeticsScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userScopes = authReq.user?.scopes || [];

    if (
      userScopes.includes(requiredScope) ||
      userScopes.includes('cosmetics:admin') ||
      userScopes.includes('admin') ||
      authReq.user?.roles?.includes('admin')
    ) {
      return next();
    }
    // 403
  };
}
```

**Cosmetics 전용 Scope:**
```
cosmetics:read
cosmetics:write
cosmetics:admin
```

**판정:**
- ⭕ 공통 Auth Core 사용 (정상)
- ⭕ Cosmetics 전용 Scope 정의 (독립성 양호)
- ❌ Cosmetics 전용 Role은 없음 (Scope로 대체)

### C-2. Dropshipping / S2S

**검색 결과:**
```bash
grep -r "dropshipping|s2s" apps/api-server/src/routes/cosmetics/
# → No matches found
```

**판정:** ❌ S2S 의존성 없음

### C-3. Yaksa / 약국 서비스

**검색 결과:**
```bash
grep -r "yaksa|pharmacy" apps/api-server/src/routes/cosmetics/
# → No matches found
```

**판정:** ❌ Yaksa 의존성 없음

### C-4. 주문/이행 책임

**Order Controller 존재:**
- `cosmetics-order.controller.ts`
- POST /orders (주문 생성)
- GET /orders (주문 목록)
- GET /orders/:id (주문 상세)

**판정:**
- ⭕ Cosmetics 자체가 주문/이행 책임을 짐
- ⭕ 독립 Commerce 서비스 성격

---

## D. 테스트 환경 관점 조사

### D-1. 단독 테스트 가능 여부

**필수 전제 조건:**
1. ✅ Auth Core 작동 (테스트 계정 필요)
2. ✅ Cosmetics DB 스키마 존재
3. ✅ 테스트용 상품 데이터

**테스트 가능 시나리오:**
```
1. 로그인 (Auth Core)
2. 상품 목록 조회 (GET /products)
3. 상품 상세 조회 (GET /products/:id)
4. 주문 생성 (POST /orders) - 인증 필요
5. 주문 조회 (GET /orders) - 인증 필요
```

**판정:** ✅ 테스트 계정 + Cosmetics DB만 있으면 단독 테스트 가능

### D-2. 테스트 차단 요소

**현재 확인된 차단 요소:**

1. **Cosmetics DB 스키마 미생성 가능성**
   - Migration 파일 존재 여부 미확인
   - 테이블 존재 전제 조건

2. **테스트 데이터 부재**
   - Sample Products 필요
   - Sample Brands 필요

3. **인증 필요 API**
   - 상품 등록/수정
   - 주문 생성
   - → 테스트 계정 필요

**보류 항목 (지금 고치지 않음):**
- Migration 실행 여부 확인
- Seed Data 준비
- Test Account 설정

---

## E. 관리자·운영 관점 의존성

### E-1. 관리자 화면 의존성

**Admin Dashboard 참조 (이전 조사 결과):**
```ts
// adminDashboardController.ts (수정 전)
- CosmeticsProduct
- CosmeticsBrand
```

**현재 상태:**
- Admin API는 Cosmetics Entity를 참조함
- 그러나 역방향 의존(Cosmetics → Admin)은 없음

**판정:**
- ⭕ Cosmetics는 Admin에 의존하지 않음
- ⭕ Admin이 Cosmetics를 조회하는 구조 (정상)

### E-2. 운영 시 혼란 가능성

**명확한 책임 영역:**
- Cosmetics는 자체 상품/주문 관리
- Admin은 전체 플랫폼 통계 조회

**혼란 요소:** ❌ 없음

---

## F. Step 2 판정 항목 (결론용)

### 1. 단독 테스트 가능 여부

**✅ 가능**

**근거:**
- Neture 의존 없음
- 다른 도메인 서비스 의존 없음
- Auth Core 의존만 존재 (정상)
- 자체 DB 스키마 (`cosmetics`)
- 독립 Frontend (`web-k-cosmetics`)

### 2. Neture 의존성 성격

**⭕ 독립 (의존 없음)**

**근거:**
- 코드 검색 결과: Neture 참조 0건
- 연계 지점 없음

### 3. 구조 위험 신호

**❌ 없음**

**근거:**
- 명확한 서비스 경계
- 자체 스키마
- Scope 기반 권한 통제
- 독립 주문/이행 책임

---

## G. Cosmetics 서비스 특성 요약

### G-1. 서비스 정체성

```
Cosmetics/K-Cosmetics =
  독립 Commerce 서비스
  (프랜차이즈 쇼윈도 + 상품 관리 + 주문 처리)
```

### G-2. 다른 서비스와의 관계

| 서비스 | 관계 | 성격 |
|--------|------|------|
| Neture | ❌ 없음 | 독립 |
| Auth Core | ⭕ 의존 | 필수 (인증) |
| Yaksa | ❌ 없음 | 독립 |
| Dropshipping | ❌ 없음 | 독립 |
| Admin | ← 참조됨 | 역방향 (정상) |

### G-3. Neture 대비 차이점

| 항목 | Neture | Cosmetics |
|------|--------|-----------|
| 주문/결제 | ❌ 없음 (Read-Only) | ✅ 있음 (Commerce) |
| 자체 DB | ⭕ 있음 (neture_*) | ⭕ 있음 (cosmetics_*) |
| 스키마 분리 | ⭕ 있음 (default) | ⭕ 있음 (cosmetics) |
| Frontend | ⭕ web-neture | ⭕ web-k-cosmetics |
| 인증 필요 | ❌ 없음 (Public) | ⭕ 있음 (Scope) |

**핵심 차이:**
- Neture: 정보 플랫폼 (Read-Only Hub)
- Cosmetics: Commerce 서비스 (Transaction 가능)

---

## H. Step 2 최종 결론

### 핵심 판정 (3문장)

1. **Cosmetics는 Neture와 완전히 독립된 Commerce 서비스이다.**

2. **Neture 없이도 단독 테스트 및 운영이 가능하다.**

3. **Auth Core 외에는 다른 서비스에 대한 구조적 의존이 없다.**

---

## I. 테스트 환경 준비 요구사항

### I-1. 필수 선행 조건

**DB 준비:**
```sql
-- Cosmetics 스키마 생성 (Migration 실행 필요)
CREATE SCHEMA IF NOT EXISTS cosmetics;

-- 테이블 생성
cosmetics_products
cosmetics_brands
cosmetics_lines
cosmetics_price_policies
cosmetics_price_logs
cosmetics_product_logs
```

**테스트 데이터:**
```
최소 1개 Brand
최소 3개 Products
```

**테스트 계정:**
```
Scope: cosmetics:read, cosmetics:write
또는 Role: admin
```

### I-2. 테스트 시나리오 (예시)

```
1. [Public] GET /api/v1/cosmetics/products → 200
2. [Public] GET /api/v1/cosmetics/brands → 200
3. [Auth] POST /api/v1/cosmetics/orders → 201
4. [Auth] GET /api/v1/cosmetics/orders → 200
```

---

## J. 다음 단계 권고 사항

### J-1. 조사 완료 판정

**Cosmetics Step 2 조사: ✅ 완료**

**이유:**
- 단독 테스트 가능 여부: 명확 (✅ 가능)
- Neture 의존성: 명확 (❌ 없음)
- 구조 위험 신호: 없음

### J-2. 다음 서비스 조사 대상

**권장 순서:**
1. **Yaksa** (Step 2 조사)
2. **Dropshipping** (Step 2 조사)
3. **Tourism** (Step 2 조사)

**이유:** Cosmetics가 독립적이므로, 다른 서비스도 동일 패턴인지 확인 필요

---

## K. 조사 메타데이터

**조사 방법:**
- 코드 읽기 (Read tool)
- 파일 패턴 검색 (Glob tool)
- 코드 내 패턴 검색 (Grep tool)
- 라우트 등록 확인 (main.ts, App.tsx)

**조사 범위:**
- Backend: apps/api-server/src/routes/cosmetics/
- Frontend: services/web-k-cosmetics/
- Admin 연계: adminDashboardController.ts

**조사 제외:**
- Migration 실행 상태
- 실제 DB 테이블 존재 여부
- 테스트 데이터 준비 상태
- UI/UX 디자인
- 성능/보안

**조사 시점:** 2026-01-11 (main branch, commit 81cb4757a)

---

*End of Report*
