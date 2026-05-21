# IR-O4O-SERVICE-OPERATOR-POINT-BUDGET-AUDIT-V1

> **목적**: O4O 포인트/크레딧 구조를 "서비스 운영자 예산 기반 지급 구조"로 전환하기 위한 사전 조사  
> **일자**: 2026-05-21  
> **상태**: 조사 완료 — 코드 수정 없음  
> **후속 WO**: 별도 작성 예정

---

## 1. 현재 구현 요약

O4O Credit(Point) 시스템은 **LMS 기반 자동 적립 + 운영자 수동 관리** 수준에서 완전히 동작 중이다.

- **자동 적립**: LMS 퀴즈 통과 → quiz_pass(20점) / lesson_complete(10점) / course_complete(50점) 자동 지급
- **운영자 수동 지급**: `POST /api/v1/points/admin/grant` (구현 완료)
- **운영자 보상 차감**: `POST /api/v1/points/admin/spend` (payoutType 기반, 구현 완료)
- **사용자 조회**: `/api/v1/credits/me`, `/api/v1/credits/me/transactions` (구현 완료)
- **강사 기능**: 과정별 보상 지급 통계 조회만 가능, 직접 지급 불가

DB 구조는 2-테이블 설계(balances + transactions)로 견고하며, referenceKey UNIQUE 제약으로 중복 지급을 방어한다.

---

## 2. 관련 파일 목록

### 백엔드 핵심 모듈

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/credit/credit-constants.ts` | CREDIT_REWARDS 상수 (LESSON_COMPLETE:10, QUIZ_PASS:20, COURSE_COMPLETE:50) — 하드코딩 |
| `apps/api-server/src/modules/credit/entities/CreditBalance.ts` | 사용자 크레딧 잔액 Entity (userId unique, balance integer) |
| `apps/api-server/src/modules/credit/entities/CreditTransaction.ts` | 크레딧 거래 레코드 Entity (TransactionType, CreditSourceType enum 포함) |
| `apps/api-server/src/modules/credit/services/CreditService.ts` | 크레딧 적립 핵심 로직 — earnCredit (referenceKey dedup) |
| `apps/api-server/src/modules/credit/controllers/CreditController.ts` | GET /credits/me, /me/transactions |
| `apps/api-server/src/modules/credit/routes/credit.routes.ts` | 크레딧 라우트 등록 |

### 포인트 Facade 모듈

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/point/services/PointService.ts` | CreditService를 감싸는 Facade (grantPoint/spendPoint, PointPayoutType enum) |
| `apps/api-server/src/modules/point/controllers/PointAdminController.ts` | 운영자 grant/spend/listTransactions 엔드포인트 |
| `apps/api-server/src/modules/point/routes/point.routes.ts` | POST /points/admin/grant, /admin/spend, /admin/transactions |

### LMS 적립 호출 지점

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/lms/services/QuizService.ts` | submitQuiz()에서 quiz_pass/lesson_complete/course_complete 적립 호출 |
| `apps/api-server/src/modules/lms/controllers/InstructorController.ts` | 강사용 과정별 보상 통계 조회 (credit_transactions 쿼리) |

### DB 마이그레이션

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/database/migrations/20260415260000-CreateCreditTables.ts` | credit_balances, credit_transactions 테이블 생성 |
| `apps/api-server/src/database/migrations/20260416600000-AddSourceIndexToCreditTransactions.ts` | (sourceType, sourceId) 복합 인덱스 추가 |

### 프론트엔드

| 파일 | 역할 |
|------|------|
| `apps/main-site/src/pages/member/lms/LmsMemberCredits.tsx` | 약사 회원용 평점(크레딧) 관리 페이지 |
| `apps/main-site/src/components/lms-yaksa/CreditSummaryCard.tsx` | 평점 요약 카드 컴포넌트 |
| `apps/admin-dashboard/src/pages/operator/PointSpendPage.tsx` | 운영자 포인트 차감/지급 UI |
| `apps/admin-dashboard/src/components/lms-yaksa/CreditBadge.tsx` | 크레딧 뱃지 컴포넌트 |
| `services/web-kpa-society/src/api/credit.ts` | KPA 웹서비스용 creditApi 클라이언트 |

### 라우트 등록

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/bootstrap/register-routes.ts` | creditRoutes, pointRoutes 등록 |
| `apps/api-server/src/routes/kpa/kpa.routes.ts` | KPA용 `/api/v1/kpa/credits/*` 엔드포인트 |

---

## 3. 현재 DB 구조 추정

### `credit_balances` 테이블

```sql
CREATE TABLE credit_balances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId      UUID NOT NULL UNIQUE,
  balance     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IDX_credit_balances_user ON credit_balances(userId);
```

### `credit_transactions` 테이블

```sql
CREATE TABLE credit_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId           UUID NOT NULL,
  amount           INTEGER NOT NULL,       -- 양수(earn/grant), 음수(spend)
  transactionType  VARCHAR(20) NOT NULL,   -- 'earn' | 'spend' | 'adjust'
  sourceType       VARCHAR(50) NOT NULL,   -- 아래 sourceType 목록 참조
  sourceId         UUID,                  -- 과정/퀴즈/레슨 ID (nullable)
  referenceKey     VARCHAR(255) UNIQUE,   -- 중복 방지 키 (nullable where IS NOT NULL)
  description      VARCHAR(500),
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IDX_credit_transactions_user         ON credit_transactions(userId);
CREATE INDEX IDX_credit_transactions_user_created ON credit_transactions(userId, created_at);
CREATE UNIQUE INDEX IDX_credit_transactions_reference_key
  ON credit_transactions(referenceKey) WHERE referenceKey IS NOT NULL;
CREATE INDEX idx_credit_transactions_source       ON credit_transactions(sourceType, sourceId);
```

### sourceType 전체 목록 (CreditSourceType enum 기준)

| sourceType | 지급 주체 | 구현 상태 |
|-----------|----------|---------|
| `lesson_complete` | 시스템 자동 | ✅ 동작 중 |
| `quiz_pass` | 시스템 자동 | ✅ 동작 중 |
| `course_complete` | 시스템 자동 | ✅ 동작 중 |
| `admin_grant` | 운영자 수동 | ✅ 동작 중 |
| `admin_spend` | 운영자 수동 | ✅ 동작 중 |
| `admin_adjust` | 운영자 조정 | ❌ 미구현 |
| `reward_payout_offline` | 운영자 정산 | ✅ spend로 구현 |
| `reward_payout_voucher` | 운영자 정산 | ✅ spend로 구현 |
| `reward_payout_survey` | 운영자 정산 | ✅ spend로 구현 |
| `reward_payout_course` | 운영자 정산 | ✅ spend로 구현 |
| `reward_payout_other` | 운영자 정산 | ✅ spend로 구현 |

---

## 4. 현재 포인트 지급 흐름 존재 여부

### 4-A. 동작 중인 흐름

#### 자동 적립 (LMS 퀴즈 → 크레딧)

```
User submits quiz
  └─ QuizService.submitQuiz()
      ├─ 채점 → passed
      ├─ PointService.grantPoint({ amount: 20, sourceType: 'quiz_pass',
      │    referenceKey: `quiz_pass:{userId}:{quizId}` })
      │    └─ CreditService.earnCredit() → DB insert (dedup via UNIQUE)
      ├─ (퀴즈가 레슨을 완료시키는 경우)
      │   └─ PointService.grantPoint({ amount: 10, sourceType: 'lesson_complete',
      │        referenceKey: `lesson_complete:{userId}:{lessonId}` })
      └─ (과정 전체 완료인 경우)
          └─ PointService.grantPoint({ amount: 50, sourceType: 'course_complete',
               referenceKey: `course_complete:{userId}:{courseId}` })
```

**Dedup 메커니즘**: referenceKey가 `{type}:{userId}:{id}` 형태로 결정적(deterministic) → DB UNIQUE 제약으로 중복 지급 원천 차단

#### 운영자 수동 지급

```
POST /api/v1/points/admin/grant
  └─ PointAdminController.grant()
      └─ PointService.grantPoint({
           sourceType: 'admin_grant',
           referenceKey: `admin_grant:{userId}:{Date.now()}`  ← 비결정적
         })
```

#### 운영자 보상 차감

```
POST /api/v1/points/admin/spend
  └─ PointAdminController.spend()
      └─ PointService.spendPoint({ payoutType, amount })
          ├─ AppDataSource.transaction()
          ├─ SELECT ... FOR UPDATE (pessimistic write lock)
          ├─ balance -= amount
          └─ CreditTransaction insert (amount: negative)
```

### 4-B. 미동작 잔재

| 기능 | 상태 | 비고 |
|------|------|------|
| 퀴즈 없는 레슨 독립 완료 크레딧 | ❌ 미구현 | QuizService 경유 시에만 lesson_complete 발생 |
| admin_adjust (잔액 직접 조정) | ❌ 미구현 | TransactionType.ADJUST 정의만 존재 |
| 강사 수동 지급 | ❌ 미구현 | 강사용 grant/spend 엔드포인트 없음 |
| 포럼 참여 적립 | ❌ 미구현 | sourceType 미정의 |
| 이벤트 참여 적립 | ❌ 미구현 | sourceType 미정의 |
| 콘텐츠 가져가기 적립 | ❌ 미구현 | sourceType 미정의 |

---

## 5. 문제점 / Drift

### 5-1. 명명 불일치 (Credit vs Point)

| 레이어 | 명칭 |
|--------|------|
| DB 테이블 | `credit_balances`, `credit_transactions` |
| Service | `CreditService`, `PointService` (Facade) |
| API 경로 | `/api/v1/credits/*` (사용자), `/api/v1/points/admin/*` (운영자) |
| 상수 | `CREDIT_REWARDS` |
| Frontend | "평점" (약사용 화면) |

**영향**: 개발자 혼동. 리네이밍 시 마이그레이션 + import 변경 다수 필요.

### 5-2. Facade 패턴의 책임 경계 불명확

- `CreditService` 주석: "Earn-only system"
- 실제: `PointService.spendPoint()`가 `CreditTransaction`을 직접 조작하여 계약 위반
- → Earn/Spend 모두 단일 CreditService로 통합하거나, 명확한 계층 분리 필요

### 5-3. 수동 보상 정책의 모순

- `CreditService.earnCredit()` 주석: "수동/관리자 직접 호출은 현재 단계에서 금지"
- 실제: `PointAdminController.grant()`가 이미 운영 중

### 5-4. Admin Grant의 비결정적 referenceKey

- Quiz/Lesson/Course: `{type}:{userId}:{sourceId}` → 멱등성 보장
- Admin Grant/Spend: `admin_grant:{userId}:{Date.now()}` → **재시도 시 중복 지급 가능**
- 클라이언트 중복 호출 방어 미구현

### 5-5. 운영자 다중 조직 스코프 가드 부재 (보안)

- `/api/v1/points/admin/*`은 `requireAdmin`만 가드
- KPA 운영자가 GlycoPharm 사용자의 포인트를 차감할 수 있는 구조적 위험
- `operatorOrgId` 스코프 필터 미적용

### 5-6. 보상액 고정 (운영 유연성 없음)

- `CREDIT_REWARDS = { LESSON_COMPLETE: 10, QUIZ_PASS: 20, COURSE_COMPLETE: 50 }`
- 운영자가 보상액을 조정할 수 있는 UI/API 없음
- 코드 주석에 "future operator-configurable settings"라고 명시했으나 미구현

### 5-7. 서비스 운영자 예산 Account 구조 부재

- 현재 구조: 운영자가 포인트를 **무제한** grant 가능 (예산 한도 없음)
- 목표 구조: 운영자별 월/연간 예산을 배정받고, 그 범위 내에서만 지급 가능
- → `operator_budget_accounts` 테이블 및 관련 로직 전무

---

## 6. 서비스 운영자 예산 구조 전환 시 최소 변경 범위

### Phase 1-A: 운영자 스코프 가드 (보안 필수)

**대상 파일**: `PointAdminController.ts`, `PointService.ts`, migration 1개

```
변경 내용:
1. credit_transactions에 operatorId 컬럼 추가
   ALTER TABLE credit_transactions ADD COLUMN operatorId UUID;

2. PointAdminController에서 요청자 operatorId 검증
   - 운영자가 관리하는 userId에 대해서만 grant/spend 허용

3. CreditTransaction insert 시 operatorId 기록
```

### Phase 1-B: 운영자 예산 Account 구조 신설

**신규 테이블 (migration 1개)**:

```sql
CREATE TABLE operator_budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operatorId   UUID NOT NULL,      -- 서비스 운영자 userId
  serviceKey   VARCHAR(50) NOT NULL, -- 'kpa-society', 'glycopharm' 등
  totalBudget  INTEGER NOT NULL DEFAULT 0,  -- 운영자가 배정받은 전체 예산
  usedBudget   INTEGER NOT NULL DEFAULT 0,  -- 지금까지 지급한 합계
  periodStart  TIMESTAMP,
  periodEnd    TIMESTAMP,
  created_at   TIMESTAMP NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (operatorId, serviceKey, periodStart)
);
```

**신규 Service**:

```
OperatorBudgetService
  - allocateBudget(operatorId, serviceKey, amount)  ← admin.neture.co.kr에서 배정
  - checkBudget(operatorId, amount): boolean
  - deductBudget(operatorId, amount)
```

**PointService 수정**:

```
기존: grantPoint(userId, amount, ...) → CreditService.earnCredit()
수정: grantPoint(userId, amount, operatorId, ...) → {
  OperatorBudgetService.checkBudget(operatorId, amount)
  CreditService.earnCredit(...)
  OperatorBudgetService.deductBudget(operatorId, amount)
}
```

### Phase 1-C: 보상액 DB 설정화

**신규 테이블 (migration 1개)**:

```sql
CREATE TABLE reward_policies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operatorId  UUID,                    -- null이면 플랫폼 기본값
  serviceKey  VARCHAR(50),
  sourceType  VARCHAR(50) NOT NULL,    -- 'quiz_pass', 'lesson_complete', ...
  amount      INTEGER NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);
-- 기본 시드: quiz_pass=20, lesson_complete=10, course_complete=50
```

**QuizService 수정**:

```
기존: CREDIT_REWARDS.QUIZ_PASS (하드코딩 상수)
수정: RewardPolicyService.getAmount('quiz_pass', serviceKey)
```

### Phase 1-D: admin.neture.co.kr 예산 배정 UI

- 대상 화면: `apps/admin-dashboard` (Neture 어드민 또는 플랫폼 어드민)
- 기능: 서비스별 운영자에게 월 예산 배정 + 잔여 예산 조회
- API: `POST /api/v1/admin/operator-budgets/allocate`, `GET /api/v1/admin/operator-budgets`

---

## 7. Phase 1에서 바로 구현 가능한 범위

| 항목 | 구현 복잡도 | 우선순위 |
|------|----------|---------|
| 운영자 스코프 가드 (`operatorId` 검증) | 낮음 — 10줄 수정 + migration | 🔴 보안 필수 |
| Admin Grant referenceKey 멱등성 개선 | 낮음 — referenceKey 로직 수정 | 🟡 안정성 |
| operator_budgets 테이블 + OperatorBudgetService | 중간 — 신규 table + service | 🟠 핵심 구조 |
| 보상액 reward_policies DB 설정화 | 중간 — 신규 table + RewardPolicyService | 🟡 운영 유연성 |
| admin.neture.co.kr 예산 배정 UI | 중간 — 신규 페이지 + API | 🟠 운영자 진입점 |
| KPA 운영자 대시보드 예산 현황 UI | 중간 — 기존 operator 화면 확장 | 🟡 가시성 |

**Phase 1 MVP 정의**:
1. `operator_budgets` 테이블 + 예산 차감 로직 (백엔드)
2. Admin 예산 배정 API + UI (admin.neture.co.kr)
3. 운영자 스코프 가드 (보안)

---

## 8. Phase 2 이후 결제 연동 시 남겨둘 범위

| 항목 | 이유 |
|------|------|
| 포인트 → 현금/상품권 환전 | 결제 Core와 연동 필요 (`reward_payout_*` sourceType 이미 준비됨) |
| 포인트 만료 처리 | 배치 job + expiresAt 컬럼 추가 필요 |
| 다중 포인트 지갑 | 강사 수익 / 이벤트 전용 지갑 분리 (아키텍처 변경) |
| 강사 수익 자동 정산 | 결제 흐름과 연동된 수수료 계산 구조 필요 |
| KPA ↔ O4O 포인트 통합 | 환전율 정책 및 외부 시스템 연동 |
| 포인트 양도/기부 | governance 정책 결정 후 |

**결제 Core 충돌 위험 확인**:
- 현재 credit_transactions는 E-commerce Core(order/payment)와 직접 JOIN 없음
- `sourceType`, `sourceId` 구조는 향후 `order_id` 등 payment sourceId로 확장 가능
- **충돌 없음** — 독립적 테이블이므로 Phase 2 연동 시 신규 sourceType 추가만으로 대응 가능

---

## 9. 결론 (조사 보고, 수정 없음)

### 현황 한 줄 요약

> O4O 포인트/크레딧 시스템은 **LMS 자동 적립 + 운영자 수동 지급** 수준에서 기능적으로 완성되어 있으나, **운영자 예산 한도 구조와 조직 스코프 가드가 없어** 무제한 지급과 타 조직 접근이 가능한 상태다.

### 전환 방향 확인

> 조사 기준에서 제시한 "포인트 지급 재원은 각 서비스 운영자 예산에서만 차감" 원칙은 현재 구현에서 **완전히 부재**한다. `operator_budgets` 테이블 신설과 PointService 수정이 핵심 변경이며, 기존 credit_balances/credit_transactions 구조는 그대로 유지할 수 있다.

### Phase 1 최소 WO 범위 제안

```
WO-O4O-SERVICE-OPERATOR-POINT-BUDGET-V1:
  1. operator_budgets 테이블 + OperatorBudgetService
  2. PointService에서 예산 체크/차감 연동
  3. 운영자 스코프 가드 (operatorId 검증)
  4. admin.neture.co.kr 예산 배정 API + UI
  5. KPA 운영자 대시보드 예산 현황 표시
```

---

*조사 수행: IR-O4O-SERVICE-OPERATOR-POINT-BUDGET-AUDIT-V1*  
*코드 수정 없음 — 모든 변경은 후속 WO에서 수행*
