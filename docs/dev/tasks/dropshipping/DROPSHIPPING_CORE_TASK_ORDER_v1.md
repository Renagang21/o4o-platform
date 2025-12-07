# 📄 **Dropshipping Core – Master Task Order (P1~P3 전체)**

**버전:** 1.0
**작성일:** 2025-12-05
**대상:** `/apps/api-server/src/modules/dropshipping/`
**목적:** NextGen Architecture 기준 100% 정렬, 확장앱 전수조사 준비
**우선순위:** P1 → P2 → P3 순으로 즉시 실행

---

# 1. Overview

본 Task Order는 dropshipping Core에 대한 전면 정비 지시서입니다.
전체 리팩토링 조사 보고서에서 도출된 모든 문제(P1~P3)를 즉시 해결하기 위한 표준화된 작업 명령서입니다.

이 작업이 완료되면:

* Dropshipping Core는 NextGen 기준 100% 정렬
* cosmetics / organization / cgm 확장앱 조사 정확도 100% 확보
* CPT 완전 전환 이후의 구조적 노이즈 제거
* Core API → 안정적 SSOT(Single Source of Truth) 확립

---

# 2. Scope

작업 범위는 아래 모듈 전체입니다:

```
apps/api-server/src/modules/dropshipping/
├── controllers/
├── services/
├── entities/
├── dto/
├── routes/
└── utils/
```

추가 확인 범위:

```
apps/api-server/src/config/routes.config.ts
packages/dropshipping-core/
```

---

# 3. Priority Breakdown

## 🔴 P1 — Immediate Fix (48시간 이내)

**목표:** validation 정비 → API 안정성 확보 → 프로덕션 준비

### 작업 항목 (3개 DTO)

| 파일                         | DTO                    | 문제    | 해결                 |
| -------------------------- | ---------------------- | ----- | ------------------ |
| dropshipping.routes.ts:193 | UpdatePartnerDto       | 검증 없음 | class-validator 적용 |
| dropshipping.routes.ts:207 | CreateSellerProductDto | 검증 없음 | class-validator 적용 |
| dropshipping.routes.ts:229 | UpdateSellerProductDto | 검증 없음 | class-validator 적용 |

### 작업 지시

아래 규칙을 모든 DTO에 적용:

* interface → class 변환
* `@IsString`, `@IsUUID`, `@IsOptional`, `@IsNumber`, `@Min`, `@IsEmail` 등 필수 검증
* nullable 필드는 명확하게 optional 정의
* API 요청에서 undefined/null 혼동 없게 조정

### 완료 조건 (DoD)

* DTO 기준으로 API validation 실패 시 400 정상 반환
* Swagger 문서에서 DTO 필드 확인 가능(임시)
* 모든 Create/Update DTO가 class-validator 준수

---

# 4. 🟡 P2 — Short-Term Fix (1~2주)

## 4.1 RBAC Middleware 적용 (중요)

문제: 통합 라우트(`dropshipping.routes.ts`)에는 `requireRole` 적용 누락됨.

### 작업 지시

각 도메인별로 아래 역할 확인 후 미들웨어 적용:

* Seller → requireRole(UserRole.SELLER)
* Supplier → requireRole(UserRole.VENDOR)
* Partner → requireAnyRole([PARTNER, ADMIN])

### 예시 코드

```ts
router.get(
  '/sellers/me',
  requireAuth,
  requireRole(UserRole.SELLER),
  SellerController.getMyProfile
);
```

### DoD

* 모든 seller/supplier/partner endpoint 보호됨
* role mismatch 요청 시 403 정상 반환

---

## 4.2 TODO 20개 완전 해결 (Service 메서드 구현)

**다음 파일들의 TODO 주석을 모두 제거하고 기능 구현**

### 작업 목록

| 메서드                    | 파일                       | 상태 | 지시                     |
| ---------------------- | ------------------------ | -- | ---------------------- |
| approve/reject/suspend | approval.controller.ts   | 스텁 | Service에 실제 로직 구현      |
| createPolicy           | commission.controller.ts | 스텁 | CommissionEngine 로직 강화 |
| KPI 계산                 | dashboard.controller.ts  | 스텁 | Seller/Supplier KPI 구현 |
| Settlement 생성          | settlement.controller.ts | 스텁 | SettlementService 구현   |

### 구현 규칙

* Entity 기반 Rich Domain Logic 사용
* 단위 테스트 작성(Unit Test) 가능 형태로 구조화
* Controller에서는 로직 금지(Service로 위임)

---

## 4.3 테스트 커버리지 확보

### 지시

* 각 Service에 Unit Test 추가
* Controller에는 최소 1개 Integration Test 추가

### DoD

* `npm run test` 통과
* Service 기능의 정상 동작 보장

---

# 5. 🟢 P3 — Long-Term Refactor (차기 분기)

## 5.1 OpenAPI 문서 생성

### 작업 지시

* 각 Controller에 Swagger 데코레이터 적용
* DTO class-validator 기반 schema 자동 생성

### DoD

* `/api/docs`에서 Dropshipping 전체 API 명확히 표시됨

---

## 5.2 레거시 라우트 완전 제거 (2025-06-03 이후)

### 대상

```
routes.config.ts:514-561
/api/seller-products
/api/partners
/api/cpt/dropshipping/*
등 총 26개
```

### 지시

* 모든 클라이언트에서 NextGen API 호출로 변경된 것 확인
* 레거시 라우트 제거
* 삭제 이후 CI/CD 빌드 통과 확인

---

## 5.3 불필요한 패키지 제거

### 대상

```
packages/dropshipping-core/
```

문제: TS 소스 없음 → dist만 존재 → 과거 잔재로 추정

### 지시

* Codebase 전체 grep 후 참조 여부 확인
* 참조 없으면 패키지 삭제
* 참조 있을 경우 모듈로 통합 또는 마이그레이션

---

# 6. 종합 DoD (Definition of Done)

### ✔︎ P1 완료

* 모든 DTO class-validator 적용
* API validation 정상 작동

### ✔︎ P2 완료

* 통합 라우트 전체 RBAC 보호
* TODO 20개 모두 제거
* Service 메서드 완전 구현
* 테스트 커버리지 기본 확보

### ✔︎ P3 완료

* 레거시 라우트 제거
* OpenAPI API 문서화
* dropshipping-core 패키지 정리

### 🎯 최종 목표

Dropshipping Core의 **NextGen Architecture 정렬률 100%** 확보
→ cosmetics / organization / cgm 확장앱 조사 정확도 최대화

---

# 7. 후속 단계

## 다음 실행 순서

1. **본 Task Order(P1~P3) 개발 수행**
2. 정비 완료 후 간단한 sanity test → API 정상 동작 확인
3. **dropshipping-cosmetics 확장앱 전수조사 보고서 생성**
4. 확장앱 정렬 후 전체 Dropshipping Ecosystem 안정화

---

*최종 업데이트: 2025-12-05*
