# IR-O4O-KPA-MEMBER-REGISTRATION-NOTIFICATION-AND-EMAIL-AUDIT-V1

**작성일**: 2026-05-16
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**선행**:
- WO-O4O-KPA-AUTHGATE-LEGACY-ACTIVITY-REDIRECT-CLEANUP-V1 (`64b567eca`)
- WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION-V1 (`6a6f9426e`)
- WO-O4O-KPA-REGISTER-MODAL-ACTIVITY-AND-PHARMACY-OWNER-INTEGRATION-V1 (`2bc8e8434`)
- IR-O4O-KPA-MEMBER-ONBOARDING-AND-APPROVAL-FLOW-AUDIT-V1

---

## 0. 한 줄 결론

> **알림·이메일 인프라 모두 이미 존재한다. 새 테이블 불필요. 운영자 신청 알림 + 신청자 in-app 알림 + 신청 접수 메일만 코드 추가하면 된다.**
> 회원 승인/반려/정지/복원 이메일은 **이미 작동 중**, 탈퇴 메일만 미구현.
> 운영자 UI(Action Queue / NotificationBell)는 인프라가 다 있고 마운트만 안 됨.

---

## 1. 운영자 알림 인프라

### 1.1 Notification entity (DB)

[apps/api-server/src/entities/Notification.ts:67-151](apps/api-server/src/entities/Notification.ts#L67-L151)

| 컬럼 | type | nullable | 의미 |
|---|---|---|---|
| id | uuid | No | PK |
| userId | uuid | No | 수신자 (직접 ID 지정 — broadcast는 호출자가 N건 INSERT) |
| serviceKey | varchar(100) | Yes | O4O 서비스 경계 (`kpa-society` 등) |
| organizationId | uuid | Yes | 테넌트 경계 (분회/약국 등) |
| actorId | uuid | Yes | 알림 발생자 (시스템 이벤트는 NULL) |
| channel | varchar(50) | No | `in_app` \| `email` (default in_app) |
| type | varchar(50) | No | NotificationType union |
| title | varchar(255) | No | 제목 |
| message | text | Yes | 본문 |
| metadata | jsonb | Yes | 추가 메타 (member_id 등) |
| priority | varchar(20) | Yes | low / normal / high / critical |
| isRead | boolean | No | 읽음 상태 (default false) |
| readAt | timestamp | Yes | 읽음 시각 |
| createdAt / updatedAt | timestamp | No | 자동 |

인덱스: `(userId, isRead, createdAt)` / `(serviceKey, userId, createdAt)` / `(organizationId, createdAt)` / `(type, createdAt)` — 운영자 알림 조회/카운트 모두 인덱스 커버됨.

마이그레이션: [20260913000000-CreateNotificationsTable.ts](apps/api-server/src/database/migrations/20260913000000-CreateNotificationsTable.ts) — 이미 운영 적용.

### 1.2 NotificationService

[apps/api-server/src/services/NotificationService.ts:47-100](apps/api-server/src/services/NotificationService.ts#L47-L100)

```ts
createNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  metadata?: Record<string, any>;
  channel?: 'in_app' | 'email';
  serviceKey?: string;
  organizationId?: string;
  actorId?: string;
  priority?: string;
}): Promise<Notification>
```

- 동작: notifications INSERT + (in_app 시) `notificationEventHub.emitNotification(...)` SSE 발행
- SSE 실패는 try/catch 격리, 호출자에게 던지지 않음
- 호출자는 직접 userId 지정 — broadcast는 호출자가 N건 호출 (예: contact-request 패턴)

### 1.3 기존 NotificationType enum

[Notification.ts:24-56](apps/api-server/src/entities/Notification.ts#L24-L56) — 28개 type 정의됨.

회원가입 관련으로 재사용 가능한 기존 type:
- `role.application_submitted` — 역할 신청 접수 (LMS instructor 등에 사용 중)
- `role.approved` — 역할 승인

회원가입 신청 전용 type **없음** → `member.registration_pending` / `member.registration_approved` / `member.registration_rejected` 신규 추가 권장.

### 1.4 KPA-Society 운영자 broadcast 패턴 (이미 검증된 패턴)

[contact-request.controller.ts:72-96](apps/api-server/src/routes/kpa/controllers/contact-request.controller.ts#L72-L96):

```ts
// Operator notification (best-effort)
try {
  const operators: { userId: string }[] = await dataSource.query(
    `SELECT DISTINCT user_id AS "userId"
       FROM role_assignments
      WHERE role IN ('kpa:operator','kpa:admin')
        AND is_active = true
      LIMIT 20`,
  );
  await Promise.allSettled(
    operators.map((op) =>
      notificationService.createNotification({
        userId: op.userId,
        type: 'contact.new',
        title: `새 문의: ${typeLabel}`,
        message: `${name} 님이 문의를 남겼습니다.`,
        serviceKey: 'kpa-society',
        metadata: { contactRequestId: saved.id, contactType: type },
      }),
    ),
  );
} catch (err) {
  logger.warn('[ContactRequest] operator notification failed (best-effort)', err);
}
```

→ **회원가입 신청 알림에 같은 패턴 그대로 사용 가능.**

### 1.5 운영자 알림 settings — `OperatorNotificationSettings`

[apps/api-server/src/entities/OperatorNotificationSettings.ts:15-24](apps/api-server/src/entities/OperatorNotificationSettings.ts#L15-L24):

```ts
interface NotificationTypeSettings {
  registrationRequest: boolean;   // 회원가입 신청 ✓ 이미 정의됨
  partnerApplication: boolean;
  supplierApplication: boolean;
  contactInquiry: boolean;
  systemAlert: boolean;
  dailyReport: boolean;
  serviceApplication?: boolean;
}
```

→ **운영자가 회원가입 알림 on/off 토글할 수 있는 설정이 이미 entity-level 에 존재.** 별도 마이그레이션 없이 활용 가능.

### 1.6 운영자 UI

- [KpaOperatorDashboard.tsx](services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx) — 5-Block 표준(KPI / AI Summary / Action Queue / Activity Log / Quick Actions) **완전 구현됨**
- Action Queue([operatorConfig.ts:194-253](services/web-kpa-society/src/pages/operator/operatorConfig.ts#L194-L253))에 이미 "회원 승인 검토" 항목 포함 (link: `/operator/members`)
- [KpaGlobalHeader.tsx](services/web-kpa-society/src/components/KpaGlobalHeader.tsx) — 알림 벨 **미마운트** (credit 뱃지만 표시)
- Frontend `notificationsApi` 클라이언트 — [services/web-kpa-society/src/api/notifications.ts](services/web-kpa-society/src/api/notifications.ts) 이미 존재 (getUnreadCount, list, markAsRead, markAllAsRead)
- `@o4o/account-ui` 패키지의 NotificationBell + useNotifications — 이미 존재, KPA 헤더에 import 만 하면 됨

### 1.7 회원 관리 화면 deeplink

- 라우트: `/operator/members` ([OperatorRoutes.tsx:123](services/web-kpa-society/src/routes/OperatorRoutes.tsx#L123))
- 탭 상태: `status-pending` / `status-active` / `status-rejected` / `status-suspended` / `status-withdrawn` (5개 탭)
- **현재 URL query param 미지원** — `MemberManagementPage`가 `useSearchParams`를 쓰지 않음. 알림 클릭 → `/operator/members?tab=status-pending` 형식 deeplink 활성화하려면 query 파싱 추가 필요 (minor 변경)

---

## 2. 이메일 발송 인프라

### 2.1 mailService 본체

[packages/mail-core/src/mail.service.ts](packages/mail-core/src/mail.service.ts) (`MailService` 클래스, Facade)

- SDK: **Nodemailer v6** (SMTP)
- 의존성: `MailTransportService` + `MailTemplateService`
- 환경변수:
  - `EMAIL_SERVICE_ENABLED` (boolean)
  - `SMTP_HOST` (기본 smtp.gmail.com)
  - `SMTP_PORT` (587), `SMTP_SECURE` (false)
  - `SMTP_USER` / `SMTP_PASS` (GitHub secrets)
  - `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`
- Health: `isServiceAvailable()` (enabled && initialized && transporter 존재)
- 실패 정책: 발송 실패는 로깅만 (retry 없음). EmailLog 비동기 기록(fire-and-forget).
- 운영 환경: Cloud Run 배포 env 에 이미 셋업됨 ([.github/workflows/deploy-api.yml:302](.github/workflows/deploy-api.yml#L302))
- 운영 환경 미설정 시 `_isEnabled = false` → `isServiceAvailable() = false` → 호출 시점에 자동 skip (예외 안 던짐)

### 2.2 회원 상태전환 메일 호출 매트릭스 — **이미 작동 중**

[member.controller.ts:642-686](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L642-L686):

| oldStatus | newStatus | 함수 | 상태 |
|---|---|---|---|
| pending | active | `sendUserApprovalEmail` | ✅ 구현 |
| pending | rejected | `sendUserRejectionEmail` | ✅ 구현 |
| * | suspended | `sendAccountSuspensionEmail` | ✅ 구현 |
| suspended | active | `sendAccountReactivationEmail` | ✅ 구현 |
| pending → withdrawn | (없음) | — | ❌ 미구현 |
| active → withdrawn | (없음) | — | ❌ 미구현 |

발송 위치: PATCH 핸들러 try/catch 외부 — **non-blocking**. 회원 상태 변경은 메일 실패 시에도 성공.

`emailService.isServiceAvailable()` + `oldStatus !== newStatus` 가드 존재 → 동일 상태 PATCH 시 중복 발송 방지.

### 2.3 이메일 템플릿 목록

[apps/api-server/src/templates/email/*.html](apps/api-server/src/templates/email/) — 17개 템플릿:

| 템플릿 | 함수 |
|---|---|
| userApproved.html | sendUserApprovalEmail |
| userRejected.html | sendUserRejectionEmail |
| accountSuspended.html | sendAccountSuspensionEmail |
| accountReactivated.html | sendAccountReactivationEmail |
| serviceApplicationSubmitted.html | sendServiceApplicationSubmittedEmail |
| serviceApplicationApproved.html | sendServiceApplicationApprovedEmail |
| serviceApplicationRejected.html | sendServiceApplicationRejectedEmail |
| serviceApplicationOperatorNotification.html | sendServiceApplicationOperatorNotification |
| roleApplicationSubmitted/Approved/Rejected/AdminNotification.html | role 신청용 4종 |
| email-verification.html / password-reset.html / welcome.html | 계정 일반 |
| settlementRequest.html / commissionCalculated.html | 정산 관련 |

- 형식: HTML 파일 + inline fallback, `{{key}}` placeholder, `{{#if field}}…{{/if}}` 조건부 (정규식 기반 mini-engine — 완전한 Handlebars 아님)
- **서비스별 분기 부재**: 모든 템플릿이 Neture 브랜딩(헤더 그라데이션, ©2024 Neture footer). KPA-Society 전용 브랜딩 미구현. `EMAIL_FROM_NAME` env 만 서비스 구분 가능
- 신청 접수 메일 재사용 가능: `serviceApplicationSubmitted.html` 또는 신규 `kpaMemberRegistrationSubmitted.html` 신설

### 2.4 신청 단계 메일 — **미구현**

- `POST /api/v1/auth/register` ([auth-register.controller.ts:165-257](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L165-L257)) 의 createKpaRecords 직후 신청 접수 메일 발송 코드 없음
- 이메일 검증 메일(`PasswordResetService.requestEmailVerification`)만 fire-and-forget으로 발송
- `POST /kpa/members/apply` ([member.controller.ts:95-226](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L95-L226)) 도 동일하게 신청 접수 메일 없음

### 2.5 중복 발송 / 테스트 계정 차단

| 항목 | 상태 |
|---|---|
| `oldStatus !== newStatus` 가드 | ✅ 존재 |
| 멱등성 token / dedup window | ❌ 부재 (운영자가 잘못 재PATCH 하면 중복 발송) |
| 테스트 계정 차단 (test@/dev@/@kpa-test.kr 등) | ❌ 부재 |
| 운영 환경 이외 skip | ❌ 부재 (env 토글로만 차단) |
| EmailLog 기록 | ✅ 비동기 fire-and-forget |

---

## 3. POST /register 트랜잭션 구조 & hook 위치

### 3.1 트랜잭션 경계

[auth-register.controller.ts:165-257](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L165-L257):

```
AppDataSource.transaction(async (manager) => {
  // L: User 생성
  // M: ServiceMembership(status='pending') 생성
  // N: createKpaRecords(manager, userId, data) — kpa_members + kpa_member_services + (개설약사 시) users.businessInfo merge
  // P: createGlycopharmApplication(manager, ...) — glycopharm 케이스
})

// 트랜잭션 commit 완료
// L258-267: PasswordResetService.requestEmailVerification() — best-effort try/catch
```

### 3.2 권장 hook 삽입 위치

- **운영자 in-app 알림** → 트랜잭션 commit **이후** (L258 근방, try/catch 격리). DB write 실패와 격리됨.
- **신청 접수 메일** → 트랜잭션 commit **이후** 동일 위치. `emailService.isServiceAvailable()` 가드 + try/catch.
- **둘 다 트랜잭션 내부에 두지 말 것** — 외부 I/O(SMTP/SSE) 실패가 회원가입 자체를 rollback 시키는 위험.

### 3.3 권장 payload 구조

```ts
notificationService.createNotification({
  userId: operatorUserId,
  type: 'member.registration_pending',  // 신규 추가
  title: '신규 KPA 회원 가입 신청',
  message: `${name} (${membershipType}) ${activityTypeLabel ?? ''} 신청을 검토해 주세요.`,
  serviceKey: 'kpa-society',
  actorId: createdUserId,
  metadata: {
    memberId: kpa_member.id,
    userId: createdUserId,
    membershipType,            // pharmacist_member | pharmacy_student_member
    activityType,              // pharmacy_owner | pharmacy_employee | ...
    pharmacyName,              // 가입 단계 입력값
    licenseNumber,             // (약사) — masked 표시 권장
  },
});
```

---

## 4. PATCH /kpa/members/:id/status — 알림 추가 hook 위치

[member.controller.ts:642-686](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L642-L686) 의 emailService 호출 블록 **직전 또는 직후**에 추가:

```ts
if (oldStatus !== newStatus && (newStatus === 'active' || newStatus === 'rejected')) {
  try {
    await notificationService.createNotification({
      userId: member.user_id,                  // 신청자 본인
      type: newStatus === 'active' ? 'member.registration_approved' : 'member.registration_rejected',
      title: newStatus === 'active' ? 'KPA 회원가입이 승인되었습니다' : 'KPA 회원가입이 반려되었습니다',
      message: newStatus === 'active'
        ? '약사회 커뮤니티에 접근할 수 있습니다.'
        : (req.body.note?.trim() || '가입 신청을 다시 검토해 주세요.'),
      serviceKey: 'kpa-society',
      actorId: req.user!.id,
      metadata: { memberId: member.id, decision: newStatus },
    });
  } catch (e) { console.error('[KPA Notification] ...'); }
}
```

개설약사 자동 활성화 흐름과 결합: 승인 메일에 `pharmacyName / organizationId / storeOwnerActivated: true` 추가 가능 ([WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION-V1](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L532-L596) 의 orgResult 재사용).

---

## 5. 산출물 요약

### 5.1 인프라 존재 여부

| 항목 | 상태 |
|---|---|
| Notification entity / DB 테이블 | ✅ 존재 |
| NotificationService (in-app + SSE) | ✅ 존재 |
| OperatorNotificationController (운영자 알림 설정 API) | ✅ 존재 |
| OperatorNotificationSettings entity (registrationRequest 토글) | ✅ 존재 (이미 필드 정의됨) |
| `kpa:operator` 전체 broadcast 패턴 | ✅ 검증된 패턴 존재 (contact-request) |
| Frontend `notificationsApi` 클라이언트 | ✅ 존재 |
| `@o4o/account-ui` NotificationBell + useNotifications | ✅ 존재 |
| KPA 운영자 대시보드 5-Block (Action Queue 포함) | ✅ 완성 |
| KpaGlobalHeader에 NotificationBell mount | ❌ 미마운트 |
| /operator/members deeplink (query param) | ❌ 미지원 |
| mailService + SMTP 인프라 | ✅ 존재 (Cloud Run env 셋업) |
| 회원 승인/반려/정지/복원 메일 | ✅ 작동 중 |
| 회원 탈퇴(withdrawn) 메일 | ❌ 미구현 |
| 신청 접수 메일 (POST /register) | ❌ 미구현 |
| 메일 템플릿 17종 | ✅ 존재 (Neture 브랜딩 단일) |
| EmailLog 발송 기록 | ✅ 존재 (fire-and-forget) |

### 5.2 신규 회원가입 신청 알림 구현 가능 위치

- **Backend**: [auth-register.controller.ts:258](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L258) (트랜잭션 commit 후) — operator broadcast 추가
- **Frontend**: 알림 클릭 → `/operator/members?tab=status-pending` deeplink (단 query param 처리 필요)
- **Settings**: OperatorNotificationSettings.notifications.registrationRequest 기존 토글 활용

### 5.3 회원 승인 메일 구현 가능 위치

- 이미 [member.controller.ts:642-686](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L642-L686) 에 구현됨
- 추가 작업:
  - 탈퇴(withdrawn) 메일 함수·템플릿 추가
  - 개설약사 승인 메일에 약국 정보 placeholder 추가 (선택)
  - 신청자 in-app 알림 호출 추가

### 5.4 필요한 신규 테이블 / type / template

| 항목 | 필요 여부 |
|---|---|
| 신규 테이블 | ❌ 불필요 |
| `NotificationType` enum 신규 값 | ✅ 3개 추가 권장 (`member.registration_pending` / `member.registration_approved` / `member.registration_rejected`) — 또는 기존 `role.application_submitted` / `role.approved` 재사용도 가능 |
| 신규 메일 템플릿 | 선택: `userWithdrawn.html` (탈퇴 메일), `kpaMemberRegistrationSubmitted.html` (신청 접수 — `serviceApplicationSubmitted.html` 재사용도 가능) |
| Frontend NotificationBell mount | ✅ KpaGlobalHeader에 import만 추가 |
| `/operator/members?tab=...` query 처리 | ✅ useSearchParams 한 줄 |

### 5.5 최소 구현 범위 (Stage 6 — 알림+메일 Phase 1)

```
[Frontend]
- KpaGlobalHeader.tsx : NotificationBell mount (account-ui 패키지 사용)
- MemberManagementPage.tsx : useSearchParams + activeTab 초기화

[Backend]
- Notification.ts : NotificationType union 에 3종 추가
  • member.registration_pending  (운영자용)
  • member.registration_approved (신청자용)
  • member.registration_rejected (신청자용)
- auth-register.controller.ts : 트랜잭션 commit 후 kpa-society 운영자 broadcast 알림
- member.controller.ts PATCH /:id/status : 신청자 in-app 알림 (pending→active / rejected)
- (선택) emailService.sendKpaMemberRegistrationSubmitted: 신청 접수 메일
```

### 5.6 위험 요소

| # | 위험 | 완화 |
|---|---|---|
| W1 | 알림 broadcast — kpa:operator 전체에게 발송 → 운영자 수 증가 시 N건 INSERT 비용 | LIMIT 20 유지 (contact-request 패턴), 추후 큐 도입 검토 |
| W2 | 외부 I/O 실패가 회원가입 자체를 rollback 위험 | 트랜잭션 외부 try/catch 격리 (이미 패턴 검증됨) |
| W3 | 운영자 잘못된 재PATCH로 메일/알림 중복 발송 | `oldStatus !== newStatus` 가드 이미 존재, transition 별 type-specific 가드 강화 권장 |
| W4 | 테스트 계정 발송 차단 부재 | `NODE_ENV` 또는 이메일 도메인 화이트리스트 추가 검토 (별도 WO) |
| W5 | 신청 알림 메일 발송 정책 모호 (운영자 OperatorNotificationSettings 설정 vs 무조건 발송) | OperatorNotificationSettings.notifications.registrationRequest 토글 활용 (default true) |
| W6 | SSE 미연결 사용자가 in-app 알림 못 받음 | 표준 동작 — 다음 페이지 진입 시 unread-count 폴링으로 확인됨. Acceptable. |
| W7 | KPA 전용 메일 브랜딩 부재 (현재 Neture 브랜딩 단일) | `EMAIL_FROM_NAME` env 분리 / 서비스별 템플릿 디렉터리 (별도 WO) |
| W8 | 회원가입 시 organization_id 없음 → notification.organizationId NULL | 정상 — KPA는 분회/약국 미지정 가입도 허용 |

### 5.7 권장 구현 단계

**Phase 1 (최소 — 본 WO 권장 후속)**
1. `NotificationType` enum에 3종 추가 (`member.registration_*`)
2. `POST /api/v1/auth/register` 트랜잭션 commit 후 kpa-society 운영자 broadcast 알림 추가
3. `PATCH /kpa/members/:id/status` 의 pending→active/rejected 분기에 신청자 in-app 알림 추가
4. `MemberManagementPage`에 `?tab=...` query param 처리
5. `KpaGlobalHeader`에 `NotificationBell` mount

**Phase 2 (이메일 보강)**
6. KPA 신청 접수 메일 추가 (`sendKpaMemberRegistrationSubmittedEmail` + 템플릿; `serviceApplicationSubmitted.html` 재사용 옵션)
7. 탈퇴(withdrawn) 메일 추가 (`sendAccountWithdrawalEmail` + `userWithdrawn.html`)
8. 개설약사 승인 메일에 약국 정보 placeholder 포함 (`organizations.id` / `pharmacyName` / `storeOwnerActivated`)

**Phase 3 (정책 강화)**
9. 메일/알림 dedup window (audit log timestamp 기반 — 같은 날 동일 transition 재발송 차단)
10. 테스트 계정 발송 차단 (NODE_ENV 또는 도메인 화이트리스트)
11. KPA 전용 메일 브랜딩 (`EMAIL_FROM_NAME=KPA Society`, 별도 템플릿 디렉터리)
12. OperatorNotificationSettings UI에서 `registrationRequest` 토글 노출

---

## 6. 참조

- **알림 관련 코드**:
  - [Notification.ts](apps/api-server/src/entities/Notification.ts)
  - [NotificationService.ts](apps/api-server/src/services/NotificationService.ts)
  - [OperatorNotificationController.ts](apps/api-server/src/controllers/OperatorNotificationController.ts)
  - [OperatorNotificationSettings.ts](apps/api-server/src/entities/OperatorNotificationSettings.ts)
  - [notifications.routes.ts](apps/api-server/src/routes/notifications.routes.ts)
  - 검증된 broadcast 패턴: [contact-request.controller.ts:72-96](apps/api-server/src/routes/kpa/controllers/contact-request.controller.ts#L72-L96)
- **메일 관련 코드**:
  - [packages/mail-core/src/mail.service.ts](packages/mail-core/src/mail.service.ts)
  - [apps/api-server/src/services/email.service.ts](apps/api-server/src/services/email.service.ts)
  - [apps/api-server/src/templates/email/*.html](apps/api-server/src/templates/email/)
  - 회원 상태 메일 호출: [member.controller.ts:642-686](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L642-L686)
- **Hook 위치**:
  - 신청: [auth-register.controller.ts:165-257](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L165-L257)
  - 승인: [member.controller.ts:438-]
- **운영자 UI**:
  - [KpaOperatorDashboard.tsx](services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx)
  - [operatorConfig.ts](services/web-kpa-society/src/pages/operator/operatorConfig.ts)
  - [MemberManagementPage.tsx](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx)
  - [KpaGlobalHeader.tsx](services/web-kpa-society/src/components/KpaGlobalHeader.tsx)
  - [notifications.ts (API 클라이언트)](services/web-kpa-society/src/api/notifications.ts)
- **공통 패키지**:
  - [@o4o/account-ui NotificationBell](packages/account-ui/src/components/NotificationBell.tsx)
  - [@o4o/account-ui useNotifications](packages/account-ui/src/notifications/useNotifications.ts)

---

*조사 전용 — 코드/DB 수정 없음. 후속 작업은 §5.7 단계별 WO 로 분리.*
