# WO-LMS-INSTRUCTOR-ROLE-V1-FREEZE

> **고정일**: 2026-02-11
> **상태**: v1 기준선 고정 (Frozen)
> **변경 허용**: v1.1 (UI 개선만) / v2 (구조 확장)

---

## 1. 목적

LMS를 **결제 없는 승인 기반 학습 시스템**으로 정의하고,
현재 구조를 v1 기준선으로 고정한다.

이 문서는:

- 구조 확장 억제
- 복잡도 통제
- 1인 운영 유지
- 향후 v2 경계 정의

를 목적으로 한다.

---

## 2. 현재 구조 정의 (v1 기준선)

### 2.1 역할 구조

```
User
 ├─ 일반회원
 └─ instructor (운영자 승인 후 부여)
```

강사 역할 부여는 `InstructorApplication` 기반.

운영자 승인 시:
- `RoleAssignment`에 `lms:instructor` 추가

### 2.2 Course 모델

```
Course
 ├─ instructorId (FK → User)
 ├─ isPaid (boolean)
 ├─ requiresApproval (boolean)
 └─ status (DRAFT / PUBLISHED / ARCHIVED)
```

중요:
- Course 단위 승인 워크플로우 없음
- 강사 승인 모델만 존재

### 2.3 Enrollment 모델

```
EnrollmentStatus
 ├─ PENDING      (수강 신청)
 ├─ APPROVED     (강사 승인)
 ├─ REJECTED     (강사 거절)
 ├─ IN_PROGRESS  (학습 중)
 ├─ COMPLETED    (수료)
 ├─ CANCELLED    (취소)
 └─ EXPIRED      (만료)
```

접근 허용 조건:

```
if (course.isPaid)
    require enrollment.status IN (APPROVED, IN_PROGRESS, COMPLETED)
else
    공개
```

### 2.4 결제 구조

- E-commerce checkout 흐름 **미사용**
- PaymentEventHub **미사용** (serviceKey='lms' 주문 생성 경로 없음)
- 자동 결제 없음
- 환불 로직 없음
- 강의료는 플랫폼 외부 처리

### 2.5 Dormant Payment Infrastructure

다음 요소는 v1에서 사용하지 않으나,
향후 v2 복원 가능성을 위해 **코드를 보존**한다:

| 요소 | 위치 | 상태 |
|------|------|------|
| `OrderType.LMS` | `packages/ecommerce-core/.../EcommerceOrder.entity.ts` | Dormant |
| `LmsPaymentEventHandler` | `apps/api-server/.../LmsPaymentEventHandler.ts` | Dormant (초기화됨, 트리거 없음) |
| `Course.price` | `packages/lms-core/.../Course.ts` | Dormant (필드 존재, UI 미노출) |
| `EnrollmentService.__fromPayment` | `apps/api-server/.../EnrollmentService.ts` | Dormant (경로 존재, 호출 없음) |

**Dormant 조건**:
- checkout 경로가 존재하지 않으므로 실행 불가
- serviceKey='lms' 주문이 생성되지 않음
- 결제 UI 연결 금지
- 가격 필드 사용자 노출 금지

---

## 3. 승인 흐름 정의

### 강사 승인

```
User → InstructorApplication(pending)
       ↓
Operator 승인
       ↓
InstructorApplication(approved) + Role: lms:instructor
```

### 수강 승인

```
수강자 → Enrollment(PENDING)
          ↓
강사 승인 (본인 강좌만)
          ↓
Enrollment(APPROVED) → 콘텐츠 접근 가능
```

---

## 4. v1에서 금지된 확장 항목

다음은 v1에서 **절대 도입 금지**:

1. 플랫폼 자동 결제 활성화 (Dormant 코드 트리거 연결)
2. 강좌 단위 승인 워크플로우
3. 구독 모델
4. 기간제 접근
5. 할인/쿠폰
6. 자동 정산
7. 강사 수익 분배 엔진
8. 조직별 가격 정책
9. 재승인 자동 트리거
10. Enrollment 자동 만료

위 항목은 v2 이상에서만 검토.

---

## 5. 보안 기준

필수 유지 조건:

- Instructor API는 `course.instructorId` 기반 소유권 검증
- Enrollment 중복 방지 (unique: userId + courseId)
- 수강 승인/거절은 강좌 소유 강사만 가능
- APPROVED / IN_PROGRESS / COMPLETED 상태만 콘텐츠 접근 허용
- 무료 강좌는 기존 동작 유지 (enrollment 불필요)
- 유료 과정 생성은 `lms:instructor` 역할 필수

---

## 6. v1 구조 철학

LMS v1은:

> "전문직 커뮤니티 내 승인 기반 강의 운영 시스템"

이며,

> "플랫폼이 수익을 자동화하지 않는 구조"

이다.

---

## 7. 향후 v2 확장 경계

v2에서만 허용되는 논의:

- Dormant Payment 활성화 여부
- 강좌 단위 승인 도입 여부
- 정산 자동화
- 강사 평가 시스템
- 조직 기반 강좌 권한
- 콘텐츠 검수 자동화

---

## 8. API 엔드포인트 (v1 고정)

### Instructor Routes

| Method | Path | 권한 |
|--------|------|------|
| POST | `/api/v1/lms/instructor/apply` | requireAuth |
| GET | `/api/v1/lms/instructor/applications` | requireAdmin |
| POST | `/api/v1/lms/instructor/applications/:id/approve` | requireAdmin |
| POST | `/api/v1/lms/instructor/applications/:id/reject` | requireAdmin |
| GET | `/api/v1/lms/instructor/courses` | requireInstructor |
| GET | `/api/v1/lms/instructor/enrollments` | requireInstructor |
| POST | `/api/v1/lms/instructor/enrollments/:id/approve` | requireInstructor + 소유권 |
| POST | `/api/v1/lms/instructor/enrollments/:id/reject` | requireInstructor + 소유권 |

---

## 9. Freeze 선언

현재 구조를 LMS v1 기준선으로 고정한다.

이후 기능 추가는:
- **v1.1**: UI 개선만 허용
- **v2**: 구조 확장 (Dormant 활성화 포함)

으로만 허용한다.

---

*Frozen: 2026-02-11*
*Status: v1 Baseline Lock*
