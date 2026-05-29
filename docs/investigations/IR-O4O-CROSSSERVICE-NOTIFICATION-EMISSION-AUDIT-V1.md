# IR-O4O-CROSSSERVICE-NOTIFICATION-EMISSION-AUDIT-V1 결과 보고

## 1. 전체 판정

현재 O4O 플랫폼의 인-앱 알림(in-app notification) 시스템은 **부분적 구현 상태**입니다.

- **구현 완료**: KPA-Society, LMS, Market Trial (Neture), 연락처 요청
- **구현 누락**: GlycoPharm 회원 승인/거절, K-Cosmetics 회원 승인/거절, Neture 파트너/공급자 신청 승인/거절
- **데이터 모델**: 통합 \Notification\ 엔티티 + 별도 \ForumNotification\ 엔티티 (2원 구조)
- **API**: 표준화된 REST API (\/api/v1/notifications/*\) + SSE 스트림 지원
- **UI**: 공통 \NotificationBell\ 컴포넌트 (account-ui 패키지)

---

## 2. 조사한 파일 목록

### 코어 엔티티 & 서비스
- apps/api-server/src/entities/Notification.ts
- apps/api-server/src/entities/ForumNotification.ts  
- apps/api-server/src/services/NotificationService.ts
- apps/api-server/src/services/forum/ForumNotificationService.ts

### API 라우트
- apps/api-server/src/routes/notifications.routes.ts
- apps/api-server/src/routes/forum/forum.notifications.routes.ts
- apps/api-server/src/routes/operator-notification.routes.ts

### 알림 생성 지점
- apps/api-server/src/modules/auth/controllers/auth-register.controller.ts
- apps/api-server/src/routes/kpa/controllers/member.controller.ts
- apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts
- apps/api-server/src/routes/kpa/controllers/contact-request.controller.ts
- apps/api-server/src/modules/lms/services/CourseService.ts
- apps/api-server/src/services/marketTrial.notification.ts

### UI 컴포넌트
- packages/account-ui/src/components/NotificationBell.tsx
- packages/account-ui/src/notifications/useNotifications.ts

---

## 3. Notification 데이터 모델

### 3.1 주 엔티티: \Notification\ (통합 알림)

**테이블**: notifications

**필드**:
- id (uuid, PK)
- userId (uuid, FK→users) - 수신자
- serviceKey (varchar 100) - 서비스 경계 (kpa-society, glycopharm, neture, k-cosmetics)
- organizationId (uuid) - 다중 테넌트 경계
- actorId (uuid) - 알림 트리거 사용자
- channel ('in_app' | 'email') - 채널
- type (NotificationType) - 알림 타입
- title (varchar 255) - 제목
- message (text) - 상세 메시지
- metadata (jsonb) - 추가 데이터
- priority (varchar 20) - 우선도
- isRead (boolean)
- createdAt, updatedAt, readAt (timestamps)

**인덱스**:
- [userId, isRead, createdAt]
- [serviceKey, userId, createdAt]
- [organizationId, createdAt]
- [type, createdAt]

### 3.2 포럼 전용: \ForumNotification\

**테이블**: forum_notifications

별도 엔티티로 포럼 알림 관리 (comment, reply, mention, like, bookmark, approve, reject, pending_review, category_update)

---

## 4. Notification API 현황

### REST 엔드포인트

| 경로 | 메서드 | 설명 | 파라미터 |
|------|--------|------|---------|
| /notifications/unread-count | GET | 미읽음 개수 | serviceKey, organizationId |
| /notifications | GET | 목록 (페이지네이션) | page, limit, isRead, serviceKey, organizationId |
| /notifications/read | POST | 읽음 처리 | notificationIds[] 또는 all:true |
| /notifications/stream | GET | SSE 스트림 | serviceKey, organizationId |
| /forum/notifications/* | * | 포럼 전용 | - |

### SSE Stream

- 인증 필수
- 실시간 알림 전송
- serviceKey/organizationId 필터링 지원

---

## 5. NotificationBell / useNotifications 동작

### useNotifications 훅 (packages/account-ui)

- 마운트 시 unreadCount 조회
- 드롭다운 열 때 목록 조회 (10개 기본)
- 읽음 처리: 단일 또는 전체
- 에러 silent swallow (bell UI는 절대 블록 없음)
- 폴링 옵션 지원 (기본값: 0 = 비활성)

### NotificationBell 컴포넌트

- Bell 아이콘 + unreadCount 배지
- Dropdown 패널 (w-80 sm:w-96, max-h-28rem)
- 항목 클릭 → onMarkAsRead + onItemClick
- 외부 클릭/ESC 시 자동 닫힘

---

## 6. 알림 타입 목록

### 정의된 NotificationType (Notification.ts)

**주문/정산**: order.new, order.status_changed, settlement.new_pending, settlement.paid

**상품**: price.changed, stock.low

**역할**: role.approved, role.application_submitted

**회원**: member.license_expiring, member.license_expired, member.verification_expired, member.fee_overdue_warning, member.fee_overdue, member.report_rejected, member.education_deadline

**LMS**: lms.course_submitted, lms.course_approved, lms.course_rejected

**마켓 트라이얼**: market_trial.submitted, market_trial.approved, market_trial.rejected, market_trial.joined, market_trial.recruiting_success, market_trial.recruiting_failed, market_trial.outcome_confirming, market_trial.fulfilled

**연락처**: contact.new

**KPA 회원**: member.registration_pending, member.registration_approved, member.registration_rejected

**KPA 약국**: pharmacy.request_submitted, pharmacy.request_approved, pharmacy.request_rejected

**기타**: custom

---

## 7. 알림 생성 지점 전체 목록

### KPA-Society

| 이벤트 | 수신자 | 타입 | 파일 | 라인 |
|--------|--------|------|------|------|
| 회원 신청 | operator | member.registration_pending | auth-register.controller.ts | 400-424 |
| 회원 승인 | user | member.registration_approved | member.controller.ts | ~891 |
| 회원 거절 | user | member.registration_rejected | member.controller.ts | ~891 |
| 약국 신청 | operator | pharmacy.request_submitted | pharmacy-request.controller.ts | 114-129 |
| 약국 승인 | user | pharmacy.request_approved | pharmacy-request.controller.ts | 325-338 |
| 약국 거절 | user | pharmacy.request_rejected | pharmacy-request.controller.ts | 376-391 |
| 연락처 | operator | contact.new | contact-request.controller.ts | 82-93 |

### LMS

- course_submitted → instructor
- course_approved → instructor
- course_rejected → instructor
(CourseService.ts, organizationId 사용, serviceKey 없음)

### Neture 마켓 트라이얼

- submitted → supplier
- approved → supplier
- rejected → supplier
- joined → participant
- recruiting_success/failed → supplier + participants

(marketTrial.notification.ts)

### K-Cosmetics

- member.registration_pending → operator (신청 시만)
- 승인/거절 알림 없음

### GlycoPharm

- 알림 구현 없음 (이메일만)

---

## 8. 서비스별 알림 생성 현황

`
KPA-Society:          ✅ 100% (7/7)
  ✅ 회원 신청 → operator
  ✅ 회원 승인 → user
  ✅ 회원 거절 → user
  ✅ 약국 신청 → operator
  ✅ 약국 승인 → user
  ✅ 약국 거절 → user
  ✅ 연락처 → operator

LMS:                  ✅ 90% (3/3, metadata 결함)
  ✅ 강의 제출/승인/거절 → instructor
  ❌ courseId missing

Neture Market Trial:  ✅ 90% (5/5, 파트너 미확인)
  ✅ 신청/승인/거절 → supplier
  ✅ 참여 → participant
  ✅ 결과 → all

K-Cosmetics:         ⚠️ 33% (1/3)
  ✅ 회원 신청 → operator
  ❌ 회원 승인/거절 없음

GlycoPharm:          ❌ 0% (0/3)
  ❌ 회원 신청/승인/거절 모두 없음
  (이메일만 구현)

Neture 파트너/공급자: ❓ 미확인
`

---

## 9. 수신자 조회 방식

### Operator 조회 패턴

`sql
SELECT DISTINCT user_id AS "userId"
FROM role_assignments
WHERE role IN (':operator', ':admin')
  AND is_active = true
LIMIT 20
`

**사용처**: KPA (kpa:operator|admin), K-Cosmetics (cosmetics:operator|admin)

**방식**: Promise.allSettled로 개별 실패 격리

### 문제점

1. GlycoPharm: operator 조회 없음 (이메일만)
2. 운영자 역할 미설정 시 알림 전달 불가
3. 역할 삭제 후 이력 미처리

---

## 10. targetUrl / 이동 경로 정합성

| 알림 타입 | targetUrl | 구현 |
|-----------|-----------|------|
| member.registration_pending | /operator/members?tab=status-pending | ✅ |
| member.registration_approved | /mypage | ✅ |
| member.registration_rejected | /mypage | ✅ |
| pharmacy.request_submitted | /operator/pharmacy-requests | ✅ |
| pharmacy.request_approved | /store/info | ✅ |
| pharmacy.request_rejected | /mypage | ✅ |
| contact.new | (없음) | ❌ |
| lms.course_* | (없음, courseId 부재) | ❌ |
| market_trial.* | /supplier/market-trial/:id | ✅ |

### 권장 추가

- contact.new: targetUrl: '/operator/contact-requests'
- lms.course_*: courseId + targetUrl: '/lms/courses/{courseId}'

---

## 11. 알림 누락 후보

### 수신자별 누락

**GlycoPharm**
- 회원 승인/거절 → 신청자에게 알림 없음 ❌
- 회원 신청 → 운영자에게 알림 없음 ❌ (이메일만)

**K-Cosmetics**
- 회원 승인/거절 → 신청자에게 알림 없음 ❌

**Neture 파트너/공급자**
- 신청/승인/거절 → 알림 미확인 ❓

### 이벤트 타입 누락

- KPA fee_overdue: 타입만 정의, 구현 없음
- KPA license_expiring: 타입만 정의, 구현 없음

---

## 12. 중복/불필요 알림 후보

### 현황

- 각 이벤트당 1개 호출만 있음 (중복 없음)
- contact.new: targetUrl 없음 (이동 불가)
- lms.course_*: courseId 없음 (상세 이동 불가)
- LMS: serviceKey 없음 (조회 필터 불가)

---

## 13. 서비스별 알림 현황 요약

| 서비스 | 구현도 | 신청→operator | 승인→user | 거절→user |
|--------|--------|---------|---------|---------|
| KPA-Society | 100% | ✅ | ✅ | ✅ |
| LMS | 90% | - | ✅ | ✅ |
| Neture Trial | 90% | ✅ | ✅ | ✅ |
| K-Cosmetics | 33% | ✅ | ❌ | ❌ |
| GlycoPharm | 0% | ❌ | ❌ | ❌ |

---

## 14. 후속 WO 후보

### 긴급 (P0)

1. WO-O4O-GLYCOPHARM-MEMBERSHIP-APPROVAL-NOTIFICATION-V1
   - Glycopharm 회원 승인/거절 알림 + operator 신청 알림

2. WO-O4O-KCOSMETICS-MEMBERSHIP-APPROVAL-NOTIFICATION-V1
   - K-Cosmetics 회원 승인/거절 알림

### 중요 (P1)

3. WO-O4O-CONTACT-REQUEST-TARGETURL-FIX-V1
4. WO-O4O-LMS-NOTIFICATION-METADATA-FIX-V1
5. WO-O4O-NETURE-PARTNER-SUPPLIER-NOTIFICATION-V1

---

## 15. 위험 요소

### 데이터 일관성

- 회원 승인/거절 시 여러 시스템 동시 업데이트 (users, service_memberships, kpa_members, role_assignments, 알림)
- 트랜잭션 경계 불명확 (일부 raw SQL)
- 알림 발송 후 회원 승인 실패 가능성

### Operator 조회 실패

- role_assignments 미설정 시 알림 미발송
- GlycoPharm: operator role 설정 필요

### 401 처리 미흡

- useNotifications에서 401 응답 시 처리 없음
- 토큰 만료 후 bell 비동작

### SSE 연결 누수

- cleanup 보장 미확인
- 라우트 변경 시 자동 닫힘 미확인

---

## 16. Current Structure vs O4O Philosophy

### 잘 구현된 영역

- ✅ serviceKey로 서비스 경계 명확화
- ✅ organizationId로 다중 테넌트
- ✅ role_assignments 기반 권한
- ✅ metadata JSONB 확장성

### 개선 필요 영역

- ⚠️ 트랜잭션 경계 불명확
- ⚠️ 운영자별 audit log 없음
- ⚠️ 알림 발송 실패 재시도 없음
- ⚠️ GlycoPharm: 이메일/in-app 채널 분리로 일관성 미흡

---

## 17. 다음 작업 제안

### Phase 1: 누락 기능 (1-2주)

1. GlycoPharm 회원 승인/거절 알림
2. K-Cosmetics 회원 승인/거절 알림  
3. Neture 파트너/공급자 알림
4. contact.new + lms.course_* targetUrl

### Phase 2: 데이터 품질 (1주)

1. 모든 알림에 serviceKey 추가 (LMS)
2. operator role 설정 검증
3. 이중 발송 테스트

### Phase 3: 안정성 (2주)

1. SSE 연결 관리
2. 트랜잭션 경계 명확화
3. 알림 발송 재시도

### Phase 4: 운영 (1주)

1. operator broadcast 감사 로그
2. 알림 현황 대시보드
3. 90일 old read 정리

---

**조사 완료**: 2026-05-29  
**상태**: ✅ COMPLETE