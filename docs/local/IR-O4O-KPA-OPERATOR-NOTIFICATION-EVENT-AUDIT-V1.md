# IR-O4O-KPA-OPERATOR-NOTIFICATION-EVENT-AUDIT-V1

> **타입**: Investigation Report (READ-ONLY)
> **범위**: KPA Society 운영자 알림 이벤트 전수 감사
> **상태**: COMPLETE
> **작성일**: 2026-05-19

---

## 1. 조사 요약

KPA Society의 알림 시스템을 전수 감사한 결과, 현재 알림 발송이 실제로 구현된 위치는 **코드베이스 전체 5개 파일**뿐이며, KPA 전용 승인 흐름(약국 개설 신청, 강사 자격, 회원 자격)의 대부분은 알림 누락 상태이다.

---

## 2. 현재 알림 발송 구현 현황

### 2-1. 발송 위치 전수 목록

| 파일 | 이벤트 타입 | 수신자 | 채널 |
|------|------------|--------|------|
| `modules/auth/controllers/auth-register.controller.ts` | `member.registration_pending` | 운영자(kpa:operator, kpa:admin) 전원 (≤20명) | in-app + SSE |
| `routes/kpa/controllers/member.controller.ts` | `member.registration_approved` | 신청자 | in-app + SSE |
| `routes/kpa/controllers/member.controller.ts` | `member.registration_rejected` | 신청자 | in-app + SSE |
| `routes/kpa/controllers/member.controller.ts` | (email) pending→active | 신청자 | email |
| `routes/kpa/controllers/member.controller.ts` | (email) pending→rejected | 신청자 | email |
| `routes/kpa/controllers/member.controller.ts` | (email) suspended | 신청자 | email |
| `routes/kpa/controllers/member.controller.ts` | (email) suspended→active | 신청자 | email |
| `routes/kpa/controllers/contact-request.controller.ts` | `contact.new` | 운영자(kpa:operator, kpa:admin) 전원 (≤20명) | in-app + SSE |
| `modules/lms/services/CourseService.ts` | `lms.course_submitted` | 강사(instructorId) | in-app |
| `modules/lms/services/CourseService.ts` | `lms.course_approved` | 강사(instructorId) | in-app |
| `modules/lms/services/CourseService.ts` | `lms.course_rejected` | 강사(instructorId) | in-app |
| `services/marketTrial.notification.ts` | `market_trial.submitted/approved/rejected/joined/recruiting_success/recruiting_failed/outcome_confirming/fulfilled` | 다양(이하 §2-4 참조) | in-app |

### 2-2. 알림 발송이 확인된 KPA 도메인

**구현 완료 영역:**
- **회원 가입 심사 (member.registration_*)**: 운영자→신규 가입 접수, 신청자→승인/반려 (in-app + email)
- **문의 접수 (contact.new)**: 운영자→파트너/강의 개설 문의
- **LMS 강의 심사 (lms.course_*)**: 강사→검토요청/승인/반려

**누락 영역 (§5 상세):**
- 약국 개설 신청 승인/반려
- 강사 자격 승인/반려  
- 회원 자격 검토 (qualification)
- KPA 회원 상태 변화 중 pending→rejected 제외한 기타 전환

### 2-3. 운영자 수신 쿼리 패턴

모든 "운영자 수신" 알림은 동일한 쿼리를 사용한다:

```sql
SELECT DISTINCT user_id AS "userId"
FROM role_assignments
WHERE role IN ('kpa:operator', 'kpa:admin')
  AND is_active = true
LIMIT 20
```

- `Promise.allSettled()` 패턴으로 비동기 발송 (best-effort)
- 실패해도 메인 비즈니스 로직에 영향 없음
- LIMIT 20 — 운영자 수 하드캡 (현재 운영 규모 기준 충분)

### 2-4. Market Trial 알림 흐름 (별도 서비스)

`services/marketTrial.notification.ts`는 Neture 도메인 Market Trial 전용 알림 서비스다. KPA와 무관.

---

## 3. NotificationType 정규 상태 분석

### 3-1. 전체 타입 목록 (Notification.ts 기준)

```
총 30개 타입 정의
```

### 3-2. 상태별 분류

#### ✅ ACTIVE — 코드에서 실제 사용됨

| 타입 | 발송 위치 | 수신자 |
|------|---------|--------|
| `member.registration_pending` | auth-register.controller | 운영자 |
| `member.registration_approved` | member.controller | 신청자 |
| `member.registration_rejected` | member.controller | 신청자 |
| `contact.new` | contact-request.controller | 운영자 |
| `lms.course_submitted` | CourseService | 강사 |
| `lms.course_approved` | CourseService | 강사 |
| `lms.course_rejected` | CourseService | 강사 |
| `market_trial.submitted` | marketTrial.notification | 운영자 |
| `market_trial.approved` | marketTrial.notification | 제품주 |
| `market_trial.rejected` | marketTrial.notification | 제품주 |
| `market_trial.joined` | marketTrial.notification | 약국주 |
| `market_trial.recruiting_success` | marketTrial.notification | 제품주 |
| `market_trial.recruiting_failed` | marketTrial.notification | 제품주 |
| `market_trial.outcome_confirming` | marketTrial.notification | 약국주 |
| `market_trial.fulfilled` | marketTrial.notification | 제품주 |
| `custom` | (범용 — custom 발송 경로 있음) | any |

총 **15개 타입** 실제 사용

#### ❌ DEAD — 타입만 존재, 발송 코드 없음

| 타입 | 원래 의도 | 비고 |
|------|----------|------|
| `order.new` | 주문 접수 알림 | 커머스 통합 전 잔재 |
| `order.status_changed` | 주문 상태 변경 | 커머스 통합 전 잔재 |
| `settlement.new_pending` | 정산 대기 | 미구현 |
| `settlement.paid` | 정산 완료 | 미구현 |
| `price.changed` | 가격 변경 | 미구현 |
| `stock.low` | 재고 부족 | 미구현 |
| `role.approved` | 역할 승인 | RBAC 재설계로 사용처 없어짐 |
| `role.application_submitted` | 역할 신청 | RBAC 재설계로 사용처 없어짐 |
| `member.license_expiring` | 면허 만료 예정 | Phase 20-B 계획 잔재 |
| `member.license_expired` | 면허 만료 | Phase 20-B 계획 잔재 |
| `member.verification_expired` | 검증 만료 | Phase 20-B 계획 잔재 |
| `member.fee_overdue_warning` | 회비 연체 경고 | Phase 20-B 계획 잔재 |
| `member.fee_overdue` | 회비 연체 | Phase 20-B 계획 잔재 |
| `member.report_rejected` | 신고서 반려 | 미구현 |
| `member.education_deadline` | 교육 마감 | 미구현 |

총 **15개 타입** dead (발송 코드 없음)

---

## 4. 역할/자격 변경 이벤트 알림 현황

### 4-1. 약국 개설 신청 (pharmacy-request.controller.ts)

| 이벤트 | 현재 상태 | 발송 대상 |
|--------|----------|---------|
| POST / — 신청 등록 | ❌ **알림 없음** | 운영자 |
| PATCH /:id/approve — 승인 | ❌ **알림 없음** | 신청자 |
| PATCH /:id/reject — 반려 | ❌ **알림 없음** | 신청자 |

**코드 확인:**
```
grep -n "createNotification\|notificationService" pharmacy-request.controller.ts
→ 0건
```

약국 개설 신청은 전체 흐름에서 알림이 전혀 없다. 운영자도 신청 접수를 알림으로 받지 못하며, 신청자도 승인/반려 결과를 알림으로 받지 못한다.

### 4-2. 강사 자격 (instructor.controller.ts, instructor.service.ts)

| 이벤트 | 현재 상태 | 발송 대상 |
|--------|----------|---------|
| 자격 신청 | ❌ **알림 없음** | 운영자 |
| 자격 승인 | ❌ **알림 없음** | 신청자 |
| 자격 반려 | ❌ **알림 없음** | 신청자 |

**코드 확인:**
```
grep -n "createNotification\|notificationService" instructor.controller.ts instructor.service.ts
→ 0건
```

### 4-3. 회원 자격 검토 (qualification.controller.ts)

| 이벤트 | 현재 상태 | 발송 대상 |
|--------|----------|---------|
| 자격 신청 | ❌ **알림 없음** | 운영자 |
| pending → approved | ❌ **알림 없음** | 신청자 |
| pending → rejected | ❌ **알림 없음** | 신청자 |

**코드 확인:**
```
grep -n "createNotification\|notificationService" qualification.controller.ts
→ 0건
```

### 4-4. 회원 상태 변경 (member.controller.ts)

| 이벤트 | 현재 상태 | 채널 |
|--------|----------|------|
| pending → active | ✅ in-app(`member.registration_approved`) + ✅ email | in-app + email |
| pending → rejected | ✅ in-app(`member.registration_rejected`) + ✅ email | in-app + email |
| active → suspended | ❌ in-app 없음 / ✅ email만 | email only |
| suspended → active | ❌ in-app 없음 / ✅ email만 | email only |
| 기타 상태 전환 | ❌ 없음 | — |

suspended/reactivated 전환은 email은 있으나 in-app 알림 없는 비대칭 구조다.

---

## 5. 누락 이벤트 목록 (Gap Matrix)

| 이벤트 | 현재 | 기대 | 우선순위 |
|--------|------|------|---------|
| 약국 개설 신청 등록 → 운영자 알림 | ❌ | ✅ 운영자에게 `pharmacy_request.pending` | P1 |
| 약국 개설 신청 승인 → 신청자 알림 | ❌ | ✅ 신청자에게 `pharmacy_request.approved` | P1 |
| 약국 개설 신청 반려 → 신청자 알림 | ❌ | ✅ 신청자에게 `pharmacy_request.rejected` | P1 |
| 강사 자격 신청 → 운영자 알림 | ❌ | ✅ 운영자에게 `instructor.application_pending` | P2 |
| 강사 자격 승인 → 신청자 알림 | ❌ | ✅ 신청자에게 `instructor.approved` | P2 |
| 강사 자격 반려 → 신청자 알림 | ❌ | ✅ 신청자에게 `instructor.rejected` | P2 |
| 회원 자격 신청 → 운영자 알림 | ❌ | ✅ 운영자에게 `qualification.pending` | P2 |
| 회원 자격 승인 → 신청자 알림 | ❌ | ✅ 신청자에게 `qualification.approved` | P2 |
| 회원 자격 반려 → 신청자 알림 | ❌ | ✅ 신청자에게 `qualification.rejected` | P2 |
| active→suspended in-app 알림 | ❌ | ✅ 신청자에게 `member.status_suspended` | P2 |
| suspended→active in-app 알림 | ❌ | ✅ 신청자에게 `member.status_reactivated` | P3 |
| LMS 강의 제출 → 운영자 알림 | ❌ | ✅ 운영자에게 `lms.course_submitted` (강사→강사로만 감) | P2 |

> **참고**: `lms.course_submitted`는 현재 강사 본인에게만 발송됨. 운영자 알림 없어 검토 요청을 운영자가 polling 없이는 인지 불가.

---

## 6. Dead/Legacy 타입 구조 분석

### 6-1. order.* / settlement.* — 커머스 통합 전 잔재

```typescript
| 'order.new'
| 'order.status_changed'
| 'settlement.new_pending'
| 'settlement.paid'
```

이 타입들은 독립 알림 시스템 설계 단계에서 추가된 것으로, 현재 E-commerce Core(checkoutService)를 통한 주문 흐름과 연결된 알림 구현이 없다. 타입 선언만 존재.

### 6-2. price.changed / stock.low — 재고/가격 알림 미구현

ProductMaster 기반 재고/가격 변동 감지 로직 자체가 없으므로 타입만 존재.

### 6-3. role.approved / role.application_submitted — RBAC 재설계 잔재

RBAC-FREEZE-DECLARATION-V1 (Phase3-E 완료) 이후 `users.role`/`user_roles` 드롭됨. 이 타입들은 구 RBAC 모델 기반으로 설계됐으며, `role_assignments` 기반 현재 모델에서는 발송 경로가 없다.

### 6-4. member.license_* / member.fee_* / member.education_deadline — Phase 20-B 계획 잔재

```typescript
| 'member.license_expiring'
| 'member.license_expired'
| 'member.verification_expired'
| 'member.fee_overdue_warning'
| 'member.fee_overdue'
| 'member.report_rejected'
| 'member.education_deadline'
```

Phase 20-B로 계획됐으나 실제 스케줄러/크론 알림 구현이 없다. 면허 만료일 추적, 회비 납부 상태 추적 로직 자체가 없음. 타입만 선언된 상태.

---

## 7. NotificationBell UI 현황

`services/web-kpa-society/src/` 경로에서 `NotificationBell` 또는 `Notification` 컴포넌트 파일을 찾을 수 없었다.

발견된 유일한 파일:
- `services/web-kpa-society/src/api/notifications.ts` — API 클라이언트 (REST 조회용)

**추정**: NotificationBell 컴포넌트는 `admin-dashboard` 패키지 또는 `@o4o/operator-ux-core`에 위치하며, kpa-society 프론트엔드에서 해당 컴포넌트를 import해 사용하는 구조일 가능성이 있다. 또는 kpa-society 서비스에 Bell UI가 미구현 상태일 수 있다.

SSE 엔드포인트:
- `GET /api/v1/notifications/stream` — SSE 연결 (notificationEventHub)
- `GET /api/v1/notifications` — 알림 목록 (REST polling)

---

## 8. 정규 운영자 알림 정책 제안

### 8-1. 수신자 결정 원칙

```
운영자 수신 = role_assignments WHERE role IN ('kpa:operator','kpa:admin') AND is_active = true LIMIT 20
신청자 수신 = 해당 userId 직접 지정
```

기존 패턴이 올바르므로 유지.

### 8-2. 이벤트 타입 명명 규칙

현재 혼재: `member.registration_*`, `lms.course_*`, `contact.new`, `market_trial.*`

권장 패턴: `{domain}.{entity}_{action}`
- 예: `pharmacy.request_pending`, `pharmacy.request_approved`
- 예: `instructor.application_pending`, `instructor.application_approved`
- 예: `member.qualification_pending`, `member.qualification_approved`

### 8-3. 이중 채널 원칙

| 전환 | in-app | email |
|------|--------|-------|
| 운영자 → 신청 접수 알림 | ✅ 필수 | 선택 |
| 신청자 → 승인 알림 | ✅ 필수 | ✅ 권장 |
| 신청자 → 반려 알림 | ✅ 필수 | ✅ 권장 |
| 신청자 → 정지 알림 | ✅ 필수 | ✅ 권장 |

현재 `member.registration_*`만 이중 채널 구현됨. 나머지는 이중 채널 필요.

---

## 9. 구현 우선순위 제안

### P1 — 즉시 구현 (사용자 경험 공백)

**WO-O4O-KPA-PHARMACY-REQUEST-NOTIFICATION-V1**
- `pharmacy-request.controller.ts` POST / → 운영자 알림 `pharmacy.request_pending`
- `pharmacy-request.controller.ts` PATCH /:id/approve → 신청자 알림 `pharmacy.request_approved` + email
- `pharmacy-request.controller.ts` PATCH /:id/reject → 신청자 알림 `pharmacy.request_rejected` + email
- `Notification.ts`에 3개 타입 추가

### P2 — 단기 구현 (운영 품질)

**WO-O4O-KPA-LMS-OPERATOR-NOTIFICATION-V1**
- `CourseService.ts` submitForReview() → 운영자 알림 `lms.course_submitted_operator` (운영자 수신)
- 현재 `lms.course_submitted`는 강사 본인만 수신

**WO-O4O-KPA-INSTRUCTOR-NOTIFICATION-V1**
- `instructor.controller.ts` 신청/승인/반려 → 각 알림 추가
- 3개 타입 추가: `instructor.application_pending`, `instructor.approved`, `instructor.rejected`

**WO-O4O-KPA-MEMBER-STATUS-INAPP-NOTIFICATION-V1**
- `member.controller.ts` suspended/reactivated → in-app 알림 추가
- (email은 이미 구현됨)

### P3 — 중기 구현 (완성도)

**WO-O4O-KPA-QUALIFICATION-NOTIFICATION-V1**
- `qualification.controller.ts` 신청/승인/반려 → 각 알림

**WO-O4O-NOTIFICATION-TYPE-CLEANUP-V1**
- Dead 타입 15개 제거 또는 `// FUTURE:` 주석으로 명시
- `role.approved`, `role.application_submitted` 즉시 제거 가능 (RBAC 완전 교체됨)
- `order.*`, `settlement.*`, `price.changed`, `stock.low` — 커머스 통합 로드맵과 연동 후 결정

---

## 10. 결론

| 항목 | 현황 |
|------|------|
| 실제 알림 발송 파일 수 | 5개 (`auth-register`, `member`, `contact-request`, `CourseService`, `marketTrial.notification`) |
| 활성 NotificationType | 15개 (custom 포함) |
| Dead NotificationType | 15개 (발송 코드 없음) |
| 주요 Gap | 약국 개설 신청 전체 (P1), 강사 자격 (P2), LMS 운영자 알림 (P2) |
| 운영자 수신 패턴 | role_assignments 기반 LIMIT 20 — 정상 |
| 이중 채널(in-app+email) | member.registration만 완전 구현 |
| NotificationBell UI | kpa-society에서 확인 불가 — admin-dashboard 또는 미구현 |

**가장 시급한 공백**: 약국 개설 신청(`pharmacy-request.controller.ts`) 전체 흐름에 알림이 전무하다. 운영자는 신청 접수를 수동 polling(`/operator/pharmacy-requests`) 없이는 알 수 없으며, 신청자는 승인/반려 결과를 이메일/알림 없이 직접 확인해야 한다.

---

*Authored by: Claude Code (IR-ONLY, 코드 변경 없음)*
*Based on: static code analysis of apps/api-server/src*
