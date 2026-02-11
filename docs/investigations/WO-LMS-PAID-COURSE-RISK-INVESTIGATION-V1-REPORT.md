# WO-LMS-PAID-COURSE-RISK-INVESTIGATION-V1 결과 보고서

> **조사 일시**: 2026-02-11
> **조사 범위**: Enrollment / Course 접근 가드 / 결제 이벤트 / OrganizationScope / Certificate
> **조사 원칙**: 코드 수정 금지, 구조 변경 금지, 사실 기반 위험 탐지만 수행

---

## 1. 유료 도입 시 충돌 가능성 표

| 항목 | 충돌 가능성 | 영향 범위 | 해결 난이도 | 상세 |
|------|:----------:|:---------:|:----------:|------|
| **Enrollment 생성 흐름** | 🟡 중간 | EnrollmentService 1곳 | 쉬움 | 결제 완료 후 enrollCourse() 호출만 추가하면 됨. 단, race condition 존재 |
| **maxEnrollments race condition** | 🔴 높음 | CourseService | 중간 | 결제 후 인원 초과 가능. DB 트랜잭션/락 부재 |
| **Course 접근 가드** | 🔴 높음 | Controller 4-5곳 | 중간 | requireAuth만 존재, Enrollment 검증 없음. 접근 제어 산재 |
| **isFree 플래그 미사용** | 🟡 중간 | LessonController | 쉬움 | 필드 존재하나 어디서도 체크하지 않음 |
| **isOrganizationExclusive 미사용** | 🔴 높음 | CourseService, EnrollmentService | 중간 | 필드 존재하나 어디서도 체크하지 않음 |
| **User→Organization 관계 부재** | 🔴 높음 | User Entity + EnrollmentService | 어려움 | User 엔티티에 organizationId 없음 |
| **결제 이벤트 연계** | 🟢 낮음 | 신규 Handler 1개 | 쉬움 | PaymentEventHub 인프라 준비됨, Cosmetics 패턴 복제 |
| **OrderType 확장** | 🟡 중간 | DB migration + enum | 쉬움 | PostgreSQL enum ALTER TYPE 필요 |
| **Certificate 발급** | 🟢 낮음 | 독립적 | 없음 | 결제와 완전 독립. 단, 환불→자동 취소 로직 없음 |
| **Progress 보안** | 🔴 높음 | ProgressController | 중간 | enrollmentId 소유권 검증 없음 (타인 진도 조작 가능) |

---

## 2. 접근 가드 삽입 가능 위치

### 현재 상태: **단일 위치 아님 — 다중 위치에 산재**

| 엔드포인트 | 인증 | Enrollment 검증 | isPaid 검증 | isOrgExclusive 검증 |
|-----------|:----:|:---------------:|:-----------:|:-------------------:|
| `GET /courses/:id` | ✅ requireAuth | ❌ 없음 | ❌ 없음 | ❌ 없음 |
| `GET /lessons/:id` | ✅ requireAuth | ❌ 없음 | ❌ 없음 | N/A |
| `POST /progress` | ✅ requireAuth | ❌ 없음 (enrollmentId 직접 받음) | ❌ 없음 | N/A |
| `POST /courses/:id/enroll` | ✅ requireAuth | ✅ 중복 체크 | ❌ 없음 | ❌ 없음 |
| `POST /certificates/issue` | ✅ requireAuth | ✅ 완료 여부 확인 | ❌ 없음 | N/A |

### 권고: `requireEnrollment` 미들웨어 신설

현재 **어디에도 "이 사용자가 이 강의에 접근 가능한가?"를 판단하는 단일 지점이 없음**.

유료 모델 도입 시 **1개 미들웨어**를 만들어 lesson/progress 라우트에 삽입하면 됨:
```
requireAuth → requireEnrollment(active) → Controller
```

이렇게 하면 수정 범위: **미들웨어 1개 신설 + 라우트 등록 3-4줄**

---

## 3. 결제 → Enrollment 연결 방식 권고안

### 이벤트 기반 (권장 ✅)

**인프라 준비 완료**. PaymentEventHub + serviceKey 기반 라우팅이 이미 동작 중.

```
사용자 결제 요청
  → checkoutService.createOrder({ orderType: LEARNING, metadata: { courseId } })
  → Toss Payments 결제 처리
  → PaymentEventHub.emitCompleted({ serviceKey: 'learning', ... })
  → LmsPaymentEventHandler.handlePaymentCompleted()
     → enrollmentService.enrollCourse({ userId, courseId })
```

**필요한 것**:
1. `OrderType.LEARNING` enum 추가 (DB migration)
2. `LmsPaymentEventHandler` 클래스 신설 (Cosmetics 패턴 복제)
3. Order.metadata에 `courseId` 포함 계약

**기존 패턴 근거**: `KCosmeticsPaymentEventHandler`, `NeturePaymentEventHandler`

### 직접 서비스 호출 (비권장 ❌)

CLAUDE.md §3 위반 가능성: "Core → Service 방향 의존성 금지"
Payment Core → LMS 직접 호출은 아키텍처 규칙 위반.

---

## 4. "단순 유료 Course v1" 구현 가능 여부 판단

### 판단: ⚠️ 부분 수정 필요

**안전하게 갈 수 있는 부분**:
- 결제 이벤트 → Enrollment 생성 (인프라 준비됨)
- OrderType 확장 (단순 enum 추가)
- Certificate 로직 (충돌 없음)

**수정이 반드시 필요한 부분**:
- `requireEnrollment` 미들웨어 신설 (lesson/progress 접근 제어)
- `maxEnrollments` race condition 해소 (DB 트랜잭션 또는 atomic increment)
- `isOrganizationExclusive` 검증 추가 (현재 사문화 상태)

**구조적 위험 (v1에서 회피 가능)**:
- User→Organization 관계 부재 → **v1에서는 organizationId가 null인 플랫폼 과정만 유료 대상으로 한정하면 회피**
- Progress 소유권 검증 → **v1에서 미들웨어로 해결**
- 환불→인증서 취소 → **v1에서는 수동 운영으로 대응**

---

## 5. 상세 조사 결과

### A. Enrollment 생성 흐름

**생성 위치**: `EnrollmentService.enrollCourse()` (Service layer)

**검증 순서**:
1. 중복 Enrollment 체크 — `findOne({ userId, courseId })` + DB unique 제약
2. Course 존재 확인
3. `course.isFull()` — maxEnrollments 체크
4. `course.canEnroll()` — status=PUBLISHED + 날짜 범위 확인
5. `requiresApproval=true` → status=PENDING, 아니면 IN_PROGRESS

**발견된 문제**:
- **Race condition**: `isFull()` 체크와 `incrementEnrollment()` 사이에 트랜잭션/락 없음
  - 동시 요청 시 maxEnrollments 초과 가능
  - 유료 모델에서: 결제 완료 후 인원 초과로 등록 실패 시나리오 발생 가능
- **requiresApproval과 유료 모델**: 승인 필요 + 유료인 경우 "결제 → PENDING → 관리자 승인 → IN_PROGRESS" 3단계 흐름 필요. 현재는 "등록 → PENDING → 승인" 2단계만 구현

### B. Course 접근 가드

**현재 상태**: `requireAuth` 미들웨어만 존재

- **모든 인증된 사용자가 모든 Course/Lesson 상세에 접근 가능**
- Enrollment 없이도 Lesson 내용 열람 가능
- `lesson.isFree` 필드 존재하나 **어디서도 체크하지 않음**
- Progress 기록 시 enrollmentId를 요청 body에서 직접 받아 **소유권 검증 없음**

**접근 제어가 존재하는 유일한 곳**: `CertificateService.issueCertificate()` — enrollment 존재 + 완료 여부 확인

### C. 결제 이벤트 구조

**PaymentEventHub** (`apps/api-server/src/services/payment/PaymentEventHub.ts`):
- Node.js EventEmitter 기반 (in-process, 동기)
- `serviceKey` 필터링으로 서비스별 라우팅
- `PaymentCompletedEvent` 페이로드: paymentId, orderId, paidAmount, serviceKey, metadata

**기존 핸들러 패턴** (Cosmetics/Neture):
1. `initialize()`에서 `paymentEventHub.onPaymentCompleted(handler, serviceKey)` 구독
2. 중복 처리 방지 (in-memory Set)
3. Order status 업데이트 (CREATED → PAID)

**OrderType enum** (PostgreSQL enum):
```
RETAIL, DROPSHIPPING, B2B, SUBSCRIPTION, GLYCOPHARM
```
- LEARNING 추가 시: `ALTER TYPE` migration 필요
- 기존 서비스 영향 없음 (generic order creation)

### D. OrganizationScope 충돌

**핵심 발견: `isOrganizationExclusive`는 사문화 상태**

- 필드 정의: `Course.isOrganizationExclusive: boolean (default false)` ✅
- **CourseService에서 체크**: ❌ 없음
- **EnrollmentService에서 체크**: ❌ 없음
- **Controller에서 체크**: ❌ 없음
- `Course.organizationId` → nullable ✅ (null = 플랫폼 전체)

**User Entity에 organizationId 없음**:
- User ↔ Organization 관계 미구현
- EnrollmentService가 사용자의 조직을 알 수 없음
- Enrollment.organizationId는 `data.organizationId || course.organizationId`로 설정
- **Controller에서 organizationId를 전달하지 않음**

**유료 모델 충돌 시나리오**:
| 시나리오 | 현재 동작 | 위험 수준 |
|---------|----------|:---------:|
| 유료 + orgExclusive=true | 아무 조직 사용자가 등록 가능 | 🔴 높음 |
| 유료 + organizationId=null | 모든 사용자 등록 가능 (정상) | 🟢 안전 |
| orgExclusive 쿼리 노출 | 타 조직 강의 목록 열람 가능 | 🟡 중간 |

**v1 회피 전략**: 유료 Course는 `organizationId=null` (플랫폼 전체)만 허용. `isOrganizationExclusive` 조합은 v2로 미룸.

### E. Certificate 로직 충돌

**결론: 충돌 없음 (독립적)**

- Certificate 발급: **수동 API 호출** (`POST /certificates/issue`), 자동 아님
- 발급 조건: Enrollment 존재 + status=COMPLETED. 그 외 조건 없음
- 결제 관련 필드/체크: **제로**
- 환불 시 자동 취소: **로직 없음** (수동 revoke API 존재)

**v1 영향 평가**:
| 항목 | 충돌 | 비고 |
|------|:----:|------|
| 발급 조건 | ✅ 안전 | 완료 여부만 확인, 결제 무관 |
| 환불→취소 | ⚠️ 수동 대응 | 자동화 없음, v1은 운영으로 처리 |
| 메타데이터 | ✅ 안전 | JSONB 확장 가능, 결제 정보 추가 가능 |

---

## 6. Phase 종료 조건 점검

| 조건 | 상태 | 비고 |
|------|:----:|------|
| Enrollment 생성 흐름 명확화 | ✅ | Service layer, 5단계 검증 확인 |
| 접근 가드 위치 명확화 | ✅ | 다중 위치 산재, 단일 미들웨어 필요 |
| 결제 이벤트 연계 가능성 확인 | ✅ | PaymentEventHub 인프라 준비됨 |
| 조직 스코핑 충돌 여부 확인 | ✅ | isOrganizationExclusive 사문화, v1에서 회피 가능 |
| Certificate 충돌 여부 확인 | ✅ | 충돌 없음 (독립적) |

---

## 7. v1 안전 구현을 위한 최소 수정 목록

유료 Course v1을 **안전하게** 구현하기 위한 최소 수정:

| # | 수정 | 파일 | 난이도 |
|---|------|------|:------:|
| 1 | `OrderType.LEARNING` enum 추가 | `EcommerceOrder.entity.ts` + DB migration | 쉬움 |
| 2 | `LmsPaymentEventHandler` 신설 | `services/lms/LmsPaymentEventHandler.ts` (신규) | 쉬움 |
| 3 | `requireEnrollment` 미들웨어 신설 | `modules/lms/middleware/` (신규) | 중간 |
| 4 | Lesson/Progress 라우트에 미들웨어 적용 | `lms.routes.ts` | 쉬움 |
| 5 | `Course.isPaid` 필드 추가 | `Course.ts` + DB migration | 쉬움 |
| 6 | `maxEnrollments` atomic increment | `CourseService.incrementEnrollment()` | 중간 |

**v1에서 의도적으로 미루는 것**:
- isOrganizationExclusive 검증 (v2)
- User→Organization 관계 구축 (v2)
- 환불→인증서 자동 취소 (v2)
- 쿠폰/할인 (scope 외)
- 구독 모델 (scope 외)

---

*Generated: 2026-02-11*
*Status: Risk Investigation Complete — 코드 수정 없음*
