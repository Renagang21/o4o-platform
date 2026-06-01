# IR-O4O-MAIL-SYSTEM-AUDIT-V1

> **조사 목적**: O4O Platform 전체 메일 시스템 현황 파악 및 Mail Core 추출 전략 수립
>
> **결론**: **CASE 1** — 메일 시스템이 이미 존재하나, **중복·분산·비통합** 상태. Core 추출 + 통합 필요.

---

## 1. 라이브러리

| 패키지 | 버전 | 위치 |
|--------|------|------|
| `nodemailer` | `^7.0.5` / `^7.0.6` | `apps/api-server/package.json` |
| `@types/nodemailer` | `^6.4.17` | devDependencies |

- 외부 메일 API (SendGrid, Mailgun, SES) — `SmtpSettings` Entity에 provider 필드 존재하나, **실제 SDK 미설치**. nodemailer 단독 사용.

---

## 2. 메일 서비스 파일 — 중복 구조 (핵심 발견)

### 2.1 중복된 EmailService 클래스 (**3개**)

| # | 파일 | 패턴 | Export | 크기 |
|---|------|------|--------|------|
| A | `services/email.service.ts` | `new EmailService()` 직접 export | `export const emailService = new EmailService()` | 990줄 |
| B | `services/emailService.ts` | `getInstance()` 싱글톤 | `export const emailService = EmailService.getInstance()` | 447줄 |
| C | `utils/email.ts` | 함수형 (순수 함수) | `export async function sendEmail()` | 52줄 |

#### A. `email.service.ts` (Primary — 26개 파일이 import)

- **Import 경로**: `from '../services/email.service.js'`
- **Templates**: `../templates/email/` (14개 HTML 파일)
- **기능**:
  - 4개 인라인 템플릿: verification, passwordReset, welcome, accountLocked
  - 15+ 전용 메서드: sendUserApprovalEmail, sendUserRejectionEmail, sendAccountSuspensionEmail, sendAccountReactivationEmail, sendCommissionCalculatedEmail, sendSettlementRequestEmail, sendRoleApplication (4종), sendServiceApplication (4종)
  - `isServiceAvailable()`, `getServiceStatus()` 헬스체크
- **사용처**: adminController, role-application.controller, platformInquiryController, invoice-dispatch.service, authentication.service, ErrorAlertService

#### B. `emailService.ts` (Secondary — 4개 파일이 import)

- **Import 경로**: `from '../services/emailService.js'` (대소문자 다름!)
- **Templates**: `../templates/emails/` (3개 HTML 파일, 경로 다름!)
- **기능**: sendPasswordResetEmail, sendEmailVerification, sendWelcomeEmail, sendSecurityAlert, sendAccountApprovalEmail, sendOrderConfirmation
- **사용처**: passwordResetService, ErrorAlertService, BackupService

#### C. `utils/email.ts` (Utility — 1개 파일이 import)

- **Import 경로**: `from '../utils/email.js'`
- **패턴**: `config.smtp` 객체에서 설정 읽음
- **사용처**: formController (폼 알림 전송)

### 2.2 문제점

1. **동일 export 이름** (`emailService`) → import 경로만 다름, 실수 유발
2. **템플릿 디렉토리 분리**: `templates/email/` vs `templates/emails/` — 14개 + 3개 = 17개 템플릿 분산
3. **설정 소스 분리**: A는 `process.env` 직접, B도 `process.env` 직접, C는 `config.smtp` 객체
4. **ErrorAlertService**가 B (`emailService.ts`)를 import하는데, **BackupService**도 B를 사용 → A와 B 동시 운영 중

---

## 3. 엔티티 (DB 테이블)

| Entity | 테이블 | 용도 |
|--------|--------|------|
| `SmtpSettings` | `smtp_settings` | SMTP 서버 설정 (provider, host, port, auth, rate limit, test 결과) |
| `EmailLog` | `email_logs` | 발송 이력 (recipient, status, messageId, provider, emailType) |
| `PasswordResetToken` | `password_reset_tokens` | 비밀번호 재설정 토큰 |

### SmtpSettings (129줄)

- Provider 지원: custom, gmail, outlook, sendgrid, mailgun, ses, naver, daum
- OAuth2 필드: clientId, clientSecret, refreshToken, accessToken, tokenExpiry
- Rate Limit: maxEmailsPerHour (100), maxEmailsPerMinute (10)
- 테스트: testEmailAddress, lastTestDate, lastTestSuccess, lastTestError
- 템플릿: headerHtml, footerHtml, signatureHtml

### EmailLog (77줄)

- Status enum: pending, sent, failed, bounced, complained
- 추적: sentAt, openedAt, clickedAt
- 메타: emailType, userId, orderId, metadata (JSON)

---

## 4. API 엔드포인트

### 4.1 SMTP Admin API (`/api/v1/smtp`)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/settings` | requireAuth + requireRole(['admin','staff']) | SmtpController.getSettings |
| PUT | `/settings` | requireAuth + requireAdmin | SmtpController.updateSettings |
| POST | `/test` | requireAuth + requireAdmin | SmtpController.testConnection |
| GET | `/logs` | requireAuth + requireRole(['admin','staff']) | SmtpController.getEmailLogs |
| GET | `/stats` | requireAuth + requireRole(['admin','staff']) | SmtpController.getEmailStats |
| POST | `/logs/:id/resend` | requireAuth + requireAdmin | SmtpController.resendEmail (TODO) |

### 4.2 Password Reset API (`/api/v1/auth`)

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/forgot-password` | Public | PasswordController.forgotPassword |
| POST | `/reset-password` | Public | PasswordController.resetPassword |
| POST | `/find-id` | Public | PasswordController.findId |

---

## 5. 비밀번호 재설정 흐름

### 5.1 두 가지 경로 존재 (중복!)

#### 경로 A: `PasswordResetService` + `emailService.ts` (B)

```
POST /api/v1/auth/forgot-password
  → PasswordController.forgotPassword()
    → PasswordResetService.requestPasswordReset(email, serviceUrl)
      → crypto.randomBytes(32) → SHA256 hash
      → PasswordResetToken 엔티티 저장 (1시간 만료)
      → emailService.sendPasswordResetEmail(email, token, serviceUrl)
```

- **ALLOWED_ORIGINS 화이트리스트**: neture.co.kr, glycopharm.co.kr, glucoseview.co.kr, k-cosmetics.o4o.com, kpa-society.o4o.com, admin.neture.co.kr, localhost
- `passwordResetService.ts` 사용

#### 경로 B: `AuthenticationService` 내 인라인 (Legacy)

```
authentication.service.ts:requestPasswordReset()
  → crypto.randomBytes(20) → hex
  → user.resetPasswordToken / user.resetPasswordExpires 에 직접 저장
  → emailService.sendEmail() (email.service.ts — A)
  → inline HTML 템플릿 (10분 만료)
```

- User 엔티티에 직접 토큰 저장 (별도 테이블 미사용)
- `email.service.ts` 사용

### 5.2 차이점

| 항목 | 경로 A (PasswordResetService) | 경로 B (AuthenticationService) |
|------|------|------|
| 토큰 저장 | `password_reset_tokens` 테이블 | `users.resetPasswordToken` 컬럼 |
| 토큰 생성 | 32바이트 + SHA256 | 20바이트 + hex |
| 만료 시간 | 1시간 | 10분 |
| 이메일 서비스 | emailService.ts (B) | email.service.ts (A) |
| Origin 검증 | ALLOWED_ORIGINS 화이트리스트 | 없음 (FRONTEND_URL 고정) |

### 5.3 이메일 인증 흐름

```
PasswordResetService.requestEmailVerification()
  → 토큰 생성 + PasswordResetToken 저장 (type='verification', 24시간 만료)
  → emailService.sendEmailVerification(email, token)

PasswordResetService.verifyEmail(token)
  → 토큰 검증 → user.emailVerified = true
  → PENDING → ACTIVE 상태 전환
  → emailService.sendWelcomeEmail(email, name)
```

---

## 6. 메일 사용처 전체 맵

| 카테고리 | 파일 | 사용 서비스 | 용도 |
|----------|------|------------|------|
| **Auth** | authentication.service.ts | A (email.service) | 비밀번호 재설정 (legacy), 아이디 찾기 |
| **Auth** | passwordResetService.ts | B (emailService) | 비밀번호 재설정 (NextGen), 이메일 인증 |
| **Admin** | adminController.ts | A (email.service) | 사용자 승인/거부/정지/재활성화 알림 |
| **Role** | role-application.controller.ts | A (email.service) | 역할 신청/승인/거부 알림, 관리자 알림 |
| **Commerce** | invoice-dispatch.service.ts | A (email.service) | 청구서 발송 (PDF 첨부) |
| **Platform** | platformInquiryController.ts | A (email.service) | 플랫폼 문의 관리자 알림 |
| **Form** | formController.ts | C (utils/email) | 폼 알림 전송 |
| **Ops** | ErrorAlertService.ts | B (emailService) | 에러 알림 |
| **Ops** | BackupService.ts | B (emailService) | 백업 완료 알림 |
| **Ops** | IncidentEscalationService.ts | — (미구현) | 인시던트 에스컬레이션 (stub) |
| **Ops** | ScheduledReportingService.ts | — (stub) | 정기 보고 (stub) |
| **SMTP Admin** | SmtpController.ts | nodemailer 직접 | SMTP 설정 관리 + 테스트 발송 |
| **Service App** | application.controller.ts (KPA, Glyco, Gluco) | A (email.service) | 서비스 가입 신청 알림 |

### Packages (API 서버 외부)

| 패키지 | 파일 | 상태 |
|--------|------|------|
| yaksa-scheduler | NotificationService.ts | **TODO stub** (nodemailer 미사용, 로그만 출력) |
| membership-yaksa | NotificationService.ts | **TODO stub** (동일) |

---

## 7. 환경 변수

| 변수 | 기본값 | 사용 위치 |
|------|--------|----------|
| `SMTP_HOST` | `smtp.gmail.com` | config.ts, app.config.ts, email.service.ts, emailService.ts |
| `SMTP_PORT` | `587` | 동일 |
| `SMTP_SECURE` | `false` | 동일 |
| `SMTP_USER` | `''` | 동일 |
| `SMTP_PASS` | `''` | 동일 |
| `SMTP_FROM_NAME` | `O4O Platform` | config.ts, app.config.ts |
| `SMTP_FROM_EMAIL` | `noreply@neture.co.kr` | config.ts, app.config.ts |
| `EMAIL_SERVICE_ENABLED` | `false` | app.config.ts, email.service.ts, emailService.ts |
| `EMAIL_FROM_ADDRESS` | `SMTP_USER` fallback | emailService.ts |
| `EMAIL_FROM_NAME` | `O4O Platform` | emailService.ts |
| `EMAIL_FROM` | `noreply@neture.co.kr` | email.service.ts |
| `PLATFORM_ADMIN_EMAIL` | `admin@neture.co.kr` | platformInquiryController.ts |
| `ADMIN_EMAIL` | `admin@neture.co.kr` | role-application.controller.ts |

### 설정 파일 중복

| 파일 | SMTP 설정 |
|------|----------|
| `config/config.ts` | `config.smtp` 객체 (utils/email.ts가 사용) |
| `config/app.config.ts` | 동일 변수, `isConfigured()` 헬스체크 포함 |
| `email.service.ts` | `process.env` 직접 읽음 |
| `emailService.ts` | `process.env` 직접 읽음 |

---

## 8. 이메일 템플릿

### `templates/email/` (14개 — email.service.ts 사용)

| 파일 | 용도 |
|------|------|
| userApproved.html | 사용자 승인 알림 |
| userRejected.html | 사용자 거부 알림 |
| accountSuspended.html | 계정 정지 알림 |
| accountReactivated.html | 계정 재활성화 알림 |
| commissionCalculated.html | 커미션 정산 알림 |
| settlementRequest.html | 정산 요청 알림 |
| roleApplicationSubmitted.html | 역할 신청 확인 |
| roleApplicationAdminNotification.html | 역할 신청 관리자 알림 |
| roleApplicationApproved.html | 역할 승인 알림 |
| roleApplicationRejected.html | 역할 거부 알림 |
| serviceApplicationSubmitted.html | 서비스 가입 신청 확인 |
| serviceApplicationOperatorNotification.html | 서비스 가입 운영자 알림 |
| serviceApplicationApproved.html | 서비스 가입 승인 |
| serviceApplicationRejected.html | 서비스 가입 거부 |

### `templates/emails/` (3개 — emailService.ts 사용)

| 파일 | 용도 |
|------|------|
| email-verification.html | 이메일 인증 |
| password-reset.html | 비밀번호 재설정 |
| welcome.html | 환영 메일 |

### 인라인 템플릿 (email.service.ts 내부)

- verification, passwordReset, welcome, accountLocked — 4개 (file 템플릿 fallback으로 사용)

### 인라인 템플릿 (emailService.ts 내부)

- password-reset, email-verification, welcome, account-approved, account-rejected, order-confirmation — 6개 (file 템플릿 미존재 시 fallback)

---

## 9. 현황 요약 — 주요 문제

### P1. EmailService 3중 중복

- 동일 기능(메일 발송)을 3개 파일이 독립 구현
- 각기 다른 설정 읽기 패턴, 다른 에러 핸들링, 다른 타임아웃
- `emailService`라는 동일 export명으로 import 경로만 다름 → 혼동 유발

### P2. 비밀번호 재설정 2중 경로

- `PasswordResetService` (토큰 테이블, 1시간) vs `AuthenticationService` (User 컬럼, 10분)
- 어느 경로가 실제 라우트에 연결되어 있는지 혼란

### P3. 템플릿 디렉토리 분산

- `templates/email/` (14개) + `templates/emails/` (3개) + 인라인 (10개)
- 디자인 통일 불가, 유지보수 어려움

### P4. SmtpController ↔ EmailService 단절

- `SmtpController`가 `SmtpSettings` DB에서 설정을 읽어 nodemailer 직접 생성
- `email.service.ts`와 `emailService.ts`는 `process.env`에서 직접 읽음
- **Admin에서 SMTP 설정을 변경해도 실제 메일 발송에 반영 안 됨**

### P5. Packages NotificationService stub

- `yaksa-scheduler`, `membership-yaksa`의 NotificationService가 TODO stub
- 메일 발송 연동 미완성

---

## 10. 판정

| CASE | 설명 | 해당 여부 |
|------|------|----------|
| CASE 1 | 메일 시스템 존재 → Core 추출만 | **해당 (부분)** |
| CASE 2 | 비밀번호 재설정만 존재 | ❌ |
| CASE 3 | 메일 기능 없음 | ❌ |

**최종 판정: CASE 1+** — 메일 시스템이 광범위하게 존재하지만, **3중 중복 + 2중 비밀번호 재설정 + 설정 단절** 문제로 인해 단순 추출이 아닌 **통합 정리 + Core 추출**이 필요.

---

## 11. Mail Core 추출 권장 전략

### Phase 1: 통합 (Consolidation)

1. **단일 EmailService** — `email.service.ts` (A)를 기반으로 통합
   - B (`emailService.ts`)의 기능을 A에 병합
   - C (`utils/email.ts`)의 사용처를 A로 전환
   - B, C 파일 제거
2. **단일 템플릿 디렉토리** — `templates/email/`로 통일
   - `templates/emails/` 3개 파일을 이동·리네이밍
3. **비밀번호 재설정 단일화** — `PasswordResetService` 유지, `AuthenticationService` 내 legacy 제거
4. **설정 단일화** — `SmtpSettings` DB 설정과 `process.env` fallback 통합

### Phase 2: Core 추출

1. **`mail-core` 패키지** 생성 (`packages/mail-core/`)
   - MailService (transporter 관리, sendEmail)
   - TemplateEngine (파일 기반 + fallback 인라인)
   - MailConfig (env 읽기 + DB SmtpSettings 읽기 통합)
   - EmailLog 기록 (기존 entity 활용)
2. **API 서버 서비스들** — `mail-core` import로 전환
3. **Packages** — NotificationService stub를 `mail-core` 연동으로 교체

### Phase 3: 확장

1. Provider 추상화 (nodemailer / SendGrid / SES)
2. 큐 기반 발송 (rate limit 적용)
3. 발송 이력 대시보드 (기존 SmtpController 확장)

---

## 12. 파일 목록 (전체)

### 서비스/유틸리티 (메일 관련)

| 파일 | 역할 |
|------|------|
| `services/email.service.ts` | Primary EmailService (990줄) |
| `services/emailService.ts` | Secondary EmailService (447줄) — 중복 |
| `utils/email.ts` | 함수형 sendEmail (52줄) — 중복 |
| `services/passwordResetService.ts` | 비밀번호 재설정 + 이메일 인증 (219줄) |
| `controllers/SmtpController.ts` | SMTP 설정 관리 Admin API (453줄) |

### 엔티티

| 파일 | 테이블 |
|------|--------|
| `entities/SmtpSettings.ts` | `smtp_settings` |
| `entities/EmailLog.ts` | `email_logs` |
| `entities/PasswordResetToken.ts` | `password_reset_tokens` |

### 라우트

| 파일 | 경로 |
|------|------|
| `routes/v1/smtp.routes.ts` | `/api/v1/smtp/*` |
| `modules/auth/controllers/password.controller.ts` | `/api/v1/auth/forgot-password`, `/reset-password`, `/find-id` |

### 설정

| 파일 | 역할 |
|------|------|
| `config/config.ts` | `config.smtp` 객체 |
| `config/app.config.ts` | `smtp` 설정 + `isConfigured()` |

### 타입

| 파일 | 역할 |
|------|------|
| `types/email-auth.ts` | EmailOptions, EmailTemplateData, PasswordResetToken 인터페이스 |

### 템플릿 (17개 HTML)

- `templates/email/` — 14개 (계정 관리, 역할, 서비스 신청, 커미션)
- `templates/emails/` — 3개 (인증, 비밀번호 재설정, 환영)

### 사용 컨트롤러/서비스 (import하는 파일)

| 파일 | import 대상 |
|------|------------|
| `services/authentication.service.ts` | A (email.service) |
| `controllers/adminController.ts` | A (email.service) |
| `routes/v2/role-application.controller.ts` | A (email.service) |
| `controllers/platformInquiryController.ts` | A (email.service) |
| `routes/glycopharm/services/invoice-dispatch.service.ts` | A (email.service) |
| `routes/kpa/controllers/application.controller.ts` | A (email.service) |
| `routes/glycopharm/controllers/application.controller.ts` | A (email.service) |
| `routes/glucoseview/controllers/application.controller.ts` | A (email.service) |
| `services/passwordResetService.ts` | B (emailService) |
| `services/ErrorAlertService.ts` | B (emailService) |
| `services/BackupService.ts` | B (emailService) |
| `controllers/formController.ts` | C (utils/email) |

---

*Created: 2026-03-12*
*Status: Complete*
