# Alpha Outcome Rules

> **Status**: Active Policy
> **Created**: 2025-12-25
> **Phase**: P1 - Alpha Outcome Formalization
> **Authority**: CLAUDE.md 종속

---

## 1. 이 문서의 지위

이 문서는 G7~B2 Alpha Phase에서 검증된 결과를 **플랫폼 공식 규칙**으로 고정한다.

* Forum API/Web Alpha (G7)
* Commerce API Alpha (G9)
* LMS API Alpha (G12)
* Dropshipping API Alpha (B2)

위 4개 Alpha 구현에서 **반복 검증된 패턴만** 이 문서에 포함된다.

---

## 2. Alpha App 성공 조건 (공통)

### 2.1 필수 조건 (Mandatory)

Alpha 앱이 "성공"으로 인정되려면 아래를 **모두** 충족해야 한다.

| 조건 | 설명 | 검증 방법 |
|------|------|-----------|
| **Reference 기반** | app-api-reference (G10, FROZEN)에서 복사 | 코드 구조 비교 |
| **Reference 무수정** | Reference 원본 파일 수정 없음 | git diff 확인 |
| **타입 체크 통과** | `pnpm -F <app> type-check` 성공 | CI/로컬 실행 |
| **빌드 성공** | `pnpm -F <app> build` 성공 | CI/로컬 실행 |
| **Health 엔드포인트** | `/health`, `/health/ready` 200 OK | 수동/자동 테스트 |
| **Core API 인증 위임** | 자체 JWT 검증 없음, Core API `/api/v1/auth/verify` 사용 | 코드 리뷰 |

### 2.2 권장 조건 (Recommended)

| 조건 | 설명 |
|------|------|
| Observation 문서 작성 | `g8-alpha-observation.md`에 관찰 결과 기록 |
| 도메인 에러 코드 확장 | Reference ErrorCodes를 spread하여 확장 |
| 도메인 유효성 검증 함수 | Reference ValidationResult 타입 사용 |

---

## 3. App API 설계 규칙 (확정)

### 3.1 인증/권한 3단계 모델

모든 App API 엔드포인트는 아래 3가지 중 하나에 해당한다.

| 단계 | 이름 | 미들웨어 | 예시 |
|------|------|----------|------|
| **Level 0** | Public | 없음 | 상품 목록, 게시글 목록 |
| **Level 1** | Authenticated | `requireAuth` | 내 주문, 내 게시글 |
| **Level 2** | Role-based | `requireAuth` + 역할 검증 | 셀러 주문, 관리자 기능 |

### 3.2 역할 검증 패턴 (B2에서 확정)

```typescript
// 역할 검증 헬퍼 패턴 (표준)
function hasRole(user: UserContext | undefined, role: string): boolean {
  if (!user || !user.roles) return false;
  return user.roles.includes(role) || user.roles.includes('admin');
}

// 사용 예
if (!hasRole(authReq.user, 'seller')) {
  return res.status(403).json({
    success: false,
    error: { code: 'SELLER_ROLE_REQUIRED', message: '셀러 권한이 필요합니다.' }
  });
}
```

### 3.3 데이터 필터링 패턴 (권한별 뷰)

| 권한 | 노출 데이터 | 숨김 데이터 |
|------|------------|------------|
| Public | 기본 정보 | 가격 원가, 마진, 내부 ID |
| Authenticated (Buyer) | 내 주문 정보 | 셀러 마진, 공급자 정보 |
| Role (Seller) | 마진, 정산 정보 | 다른 셀러 데이터 |
| Role (Admin) | 전체 데이터 | - |

---

## 4. 플랫폼형 도메인 정의

### 4.1 도메인 유형 분류

| 유형 | 정의 | 예시 |
|------|------|------|
| **단순 도메인** | 단일 사용자 CRUD | Forum (게시글), LMS (강좌) |
| **플랫폼형 도메인** | 다자 관계 + 역할 분리 | Dropshipping (Buyer/Seller/Supplier) |

### 4.2 플랫폼형 도메인 필수 조건

도메인이 "플랫폼형"으로 분류되려면 아래 중 **2개 이상** 충족해야 한다.

| 조건 | 설명 |
|------|------|
| **다자 관계** | 2개 이상의 역할이 같은 리소스에 접근 (Buyer ↔ Seller ↔ Supplier) |
| **역할별 뷰 분리** | 같은 데이터를 역할에 따라 다르게 노출 |
| **정산/마진 개념** | 거래에 수익 분배 로직 포함 |
| **워크플로우 상태** | 리소스가 상태 전이를 가짐 (pending → confirmed → shipped) |

### 4.3 Alpha 구현된 도메인 분류

| 도메인 | 유형 | 사유 |
|--------|------|------|
| Forum | 단순 | 단일 사용자 게시글 CRUD |
| Commerce | 단순 | 기본 상품/주문 (역할 분리 없음) |
| LMS | 단순 | 강좌/수강 (역할 분리 없음) |
| Dropshipping | 플랫폼형 | Buyer/Seller/Supplier + 마진 + 상태 전이 |

---

## 5. Mock 허용 범위

### 5.1 Alpha 단계 Mock 허용

| 항목 | Mock 허용 | 실제 구현 필요 |
|------|----------|---------------|
| 데이터 저장 | ✅ 메모리 배열 | ❌ |
| 인증 검증 | ❌ | ✅ Core API 위임 |
| 비즈니스 로직 | ✅ 시뮬레이션 | ❌ |
| 외부 API 연동 | ✅ Mock 응답 | ❌ |
| 결제 처리 | ✅ 시뮬레이션 | ❌ |

### 5.2 Production 전환 시 필수 교체

Alpha → Production 전환 시 아래는 **반드시 실제 구현**으로 교체해야 한다.

| 항목 | Alpha | Production |
|------|-------|------------|
| 데이터 저장 | 메모리 배열 | Database (TypeORM) |
| 외부 결제 | 시뮬레이션 | PG 연동 |
| 파일 업로드 | Mock | Cloud Storage |
| 이메일 발송 | 로그 출력 | SMTP/SES |

---

## 6. 다음 Alpha 선택 기준

### 6.1 의미 있는 확장 조건

다음 Alpha가 "의미 있는 확장"이 되려면 아래 중 **1개 이상** 충족해야 한다.

| 조건 | 설명 | 예시 |
|------|------|------|
| **새로운 역할 도입** | 기존에 없던 역할 추가 | Supplier, Partner |
| **새로운 관계 패턴** | 기존에 없던 다자 관계 | Healthcare ↔ CGM ↔ User |
| **새로운 연동 패턴** | 외부 시스템 연동 | 쇼핑몰 API, 의료기기 API |
| **정산 실제 구현** | Mock에서 실제로 전환 | 정산 배치, 수익 분배 |

### 6.2 우선순위 판단

| 우선순위 | 조건 | 다음 Alpha 후보 |
|----------|------|-----------------|
| **High** | 플랫폼형 + 새로운 역할 | Supplier API, Partner API |
| **Medium** | 기존 역할 + 새로운 연동 | Healthcare CGM, 쇼핑몰 연동 |
| **Low** | 단순 도메인 + 기존 패턴 | (B2 이후 낮은 의미) |

### 6.3 권장하지 않는 다음 Alpha

| 유형 | 사유 |
|------|------|
| 단순 CRUD 앱 | G7/G9/G12에서 이미 검증됨 |
| 기존 앱의 기능 확장 | Alpha 단계에서 불필요 |
| UI/Web 앱 단독 | API 없이 의미 없음 |

---

## 7. Reference 활용 규칙 (재확인)

### 7.1 app-api-reference 상태

| 항목 | 상태 |
|------|------|
| 버전 | G10 |
| 상태 | **FROZEN** |
| 수정 권한 | 명시적 Work Order + 2회 이상 반복 검증 필요 |

### 7.2 신규 앱 생성 워크플로우

```
1. cp -r apps/app-api-reference apps/<new-app>
2. package.json name/description 수정
3. env.ts PORT 수정
4. health.routes.ts service 이름 수정
5. api.routes.ts 삭제 → <domain>.routes.ts 생성
6. main.ts import/라우트 수정
7. type-check & build 성공 확인
```

### 7.3 도메인 확장 패턴

```typescript
// 에러 코드 확장 (spread 사용)
const DomainErrorCodes = {
  ...ErrorCodes,
  DOMAIN_SPECIFIC_ERROR: 'DOMAIN_SPECIFIC_ERROR',
} as const;

// 유효성 검증 확장 (ValidationResult 타입 사용)
function validateDomainInput(body: unknown): ValidationResult & { data?: DomainInput } {
  // Reference의 ValidationError, ValidationResult 타입 활용
}
```

---

## 8. 완료 선언

이 문서로 아래 질문에 **즉답 가능**해야 한다.

| 질문 | 답변 방법 |
|------|-----------|
| "이 앱은 Alpha로 충분한가?" | §2 성공 조건 체크리스트 |
| "이 도메인은 플랫폼형인가?" | §4.2 필수 조건 2개 이상 충족 여부 |
| "다음에 뭘 만들어야 하나?" | §6 선택 기준 + 우선순위 |
| "Mock은 어디까지 허용되나?" | §5 Mock 허용 범위 |

---

## 9. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-25 | 1.0 | 초기 작성 (P1 Phase 결과) |

---

*This document is part of the P1 Phase - Alpha Outcome Formalization.*
*Authority: CLAUDE.md 종속*
