# 사용자 관리 이메일/알림 인프라

## 1. 이메일 서비스 설정

### 1.1 SES/SMTP 설정
- **서비스**: Nodemailer (SMTP)
- **발신 도메인**: `noreply@neture.co.kr` (기본값)
- **포트/프로토콜**: 587/TLS (기본값)
- **인증 방식**: SMTP 인증 (사용자명/비밀번호)
- **설정 파일 경로**:
  - `/home/sohae21/o4o-platform/apps/api-server/src/config/config.ts`
  - `/home/sohae21/o4o-platform/apps/api-server/src/utils/email.ts`
  - `/home/sohae21/o4o-platform/apps/api-server/src/services/email.service.ts`
  - `/home/sohae21/o4o-platform/apps/api-server/src/services/emailService.ts`

**환경변수 (`.env`)**:
```bash
# 이메일 서비스 활성화 여부
EMAIL_SERVICE_ENABLED=false  # 기본값: false (비활성화)

# SMTP 설정
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false  # true면 465/SSL 사용
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password

# 발신자 정보
SMTP_FROM_NAME=O4O Platform
SMTP_FROM_EMAIL=noreply@neture.co.kr
EMAIL_FROM_NAME=O4O Platform
EMAIL_FROM=noreply@neture.co.kr
EMAIL_FROM_ADDRESS=noreply@neture.co.kr
```

**주의사항**:
- 현재 기본값으로 `EMAIL_SERVICE_ENABLED=false` 설정되어 **이메일 서비스가 비활성화** 상태
- SMTP 설정 불완전 시 경고 로그만 출력하고 이메일 발송을 스킵
- Gmail SMTP 사용 시 "앱 비밀번호" 필요 (2단계 인증 활성화 필요)
- 개발환경에서 SMTP 미설정 시 `jsonTransport` (콘솔 출력) 사용

### 1.2 도메인 인증
- **DKIM**: **미설정** ❌
- **SPF**: **미설정** ❌
- **DMARC**: **미설정** ❌
- **발신 도메인 검증**: **미검증** ❌

**이슈**:
- DKIM/SPF/DMARC 레코드가 설정되지 않아 이메일 스팸 필터링에 취약
- 도메인 검증 없이 발송 시 수신 거부율 증가 가능
- AWS SES/SendGrid 등 전문 서비스 미사용

**권장사항**:
- 프로덕션 환경에서는 AWS SES 또는 SendGrid 사용 권장
- DKIM/SPF 레코드 DNS 설정 필요
- 발신 도메인 검증 절차 수행 필요

### 1.3 바운스/컴플레인트 처리
- **SNS 토픽**: **미설정** ❌
- **웹훅 핸들러**: **미설정** ❌
- **바운스 처리**: **미구현** ❌
- **컴플레인트 처리**: **미구현** ❌
- **억제 목록**: **미구현** ❌

**이슈**:
- 하드/소프트 바운스 구분 없음
- 스팸 신고(Complaint) 처리 로직 없음
- 반송된 이메일 주소 재발송 차단 메커니즘 부재
- 이메일 평판 저하 리스크

### 1.4 발송 제한
- **일일 제한**: **미설정** ❌
- **시간당 제한**: **미설정** ❌
- **레이트 리밋**: **미설정** ❌
- **환경별 제한**: **미설정** ❌

**현재 구현**:
- 이메일 발송 제한 없음
- 동기적으로 발송 (큐잉 미사용)
- 타임아웃만 설정 (5초 connection, 30초 send)

## 2. 이메일 템플릿

### 2.1 템플릿 목록

현재 구현된 템플릿은 **코드 기반 (하드코딩)**과 **HTML 파일 기반** 두 가지로 나뉨

#### A. 코드 기반 템플릿 (`email.service.ts`)

##### 이메일 검증 메일 (verification)
- **템플릿 경로**: 코드 내장 (`verificationEmailTemplate`)
- **발송 트리거**: 회원가입 완료 후 이메일 검증 요청 시
- **변수**:
  - `name`: 사용자명
  - `actionUrl`: 이메일 검증 링크 (24시간 유효)
  - `companyName`: 회사명 (기본값: "O4O Platform")
  - `supportEmail`: 고객지원 이메일
  - `year`: 현재 연도
- **링크 형식**: `https://neture.co.kr/verify?token={token}`
- **다국어 지원**: 한국어만 지원 (하드코딩)

##### 비밀번호 재설정 메일 (passwordReset)
- **템플릿 경로**: 코드 내장 (`passwordResetTemplate`)
- **발송 트리거**: 비밀번호 재설정 요청 시
- **변수**:
  - `name`: 사용자명
  - `actionUrl`: 비밀번호 재설정 링크
  - `expiresIn`: 토큰 만료 시간 (기본값: "1시간")
  - `companyName`: 회사명
  - `supportEmail`: 고객지원 이메일
  - `year`: 현재 연도
- **링크 형식**: `${ADMIN_URL}/reset-password?token={token}`
- **보안**: 보안 경고 메시지 포함

##### 가입 환영 메일 (welcome)
- **템플릿 경로**: 코드 내장 (`welcomeEmailTemplate`)
- **발송 트리거**: 이메일 검증 완료 후
- **변수**:
  - `name`: 사용자명
  - `companyName`: 회사명
  - `actionUrl`: 서비스 시작 링크
  - `supportEmail`: 고객지원 이메일
  - `year`: 현재 연도
- **특징**: 이용 가능한 서비스 목록 표시

##### 계정 잠금 메일 (accountLocked)
- **템플릿 경로**: 코드 내장 (`accountLockedTemplate`)
- **발송 트리거**: 계정 잠금 시 (로그인 실패 반복 등)
- **변수**:
  - `name`: 사용자명
  - `actionUrl`: 계정 확인 링크
  - `companyName`: 회사명
  - `supportEmail`: 고객지원 이메일
  - `year`: 현재 연도
- **특징**: 보안 경고 및 조치 사항 안내

#### B. HTML 파일 기반 템플릿

##### 계정 승인 메일
- **템플릿 경로**: `/home/sohae21/o4o-platform/apps/api-server/src/templates/email/userApproved.html`
- **발송 트리거**: 관리자가 계정 승인 시
- **변수**:
  - `userName`: 사용자명
  - `userEmail`: 사용자 이메일
  - `userRole`: 사용자 역할
  - `approvalDate`: 승인 일시
  - `notes`: 승인 메모 (선택)
  - `loginUrl`: 로그인 페이지 URL
- **다국어 지원**: 한국어

##### 계정 거부 메일
- **템플릿 경로**: `/home/sohae21/o4o-platform/apps/api-server/src/templates/email/userRejected.html`
- **발송 트리거**: 관리자가 계정 거부 시
- **변수**:
  - `userName`: 사용자명
  - `rejectReason`: 거부 사유
  - `supportUrl`: 고객지원 URL
- **다국어 지원**: 한국어

##### 계정 정지 메일
- **템플릿 경로**: `/home/sohae21/o4o-platform/apps/api-server/src/templates/email/accountSuspended.html`
- **발송 트리거**: 관리자가 계정 정지 시
- **변수**:
  - `userName`: 사용자명
  - `suspendReason`: 정지 사유
  - `suspendedDate`: 정지 일시
  - `suspendDuration`: 정지 기간 (선택)
  - `appealUrl`: 이의 신청 URL
- **다국어 지원**: 한국어

##### 계정 재활성화 메일
- **템플릿 경로**: `/home/sohae21/o4o-platform/apps/api-server/src/templates/email/accountReactivated.html`
- **발송 트리거**: 정지된 계정 재활성화 시
- **변수**:
  - `userName`: 사용자명
  - `reactivatedDate`: 재활성화 일시
  - `notes`: 메모 (선택)
  - `loginUrl`: 로그인 URL
  - `termsUrl`: 이용약관 URL
  - `policyUrl`: 개인정보처리방침 URL
- **다국어 지원**: 한국어

##### 커미션 계산 완료 메일
- **템플릿 경로**: `/home/sohae21/o4o-platform/apps/api-server/src/templates/email/commissionCalculated.html`
- **발송 트리거**: 파트너/셀러 커미션 계산 완료 시
- **변수**:
  - `vendorName`: 파트너/셀러명
  - `orderDate`: 주문 일시
  - `orderId`: 주문 ID
  - `orderAmount`: 주문 금액
  - `commissionRate`: 커미션 비율
  - `commissionAmount`: 커미션 금액
  - `settlementDate`: 정산 예정일
  - `pendingAmount`: 보류 중 금액
  - `settlementStatus`: 정산 상태
  - `dashboardUrl`: 대시보드 URL
- **다국어 지원**: 한국어

##### 정산 요청 메일
- **템플릿 경로**: `/home/sohae21/o4o-platform/apps/api-server/src/templates/email/settlementRequest.html`
- **발송 트리거**: 정산 요청 접수 시
- **변수**:
  - `recipientName`: 수신자명
  - `requestId`: 요청 ID
  - `requestDate`: 요청 일시
  - `settlementPeriod`: 정산 기간
  - `transactionCount`: 거래 건수
  - `settlementAmount`: 정산 금액
  - `bankName`: 은행명
  - `accountNumber`: 계좌번호
  - `accountHolder`: 예금주
  - `reviewDeadline`: 검토 마감일
  - `expectedPaymentDate`: 지급 예정일
  - `settlementUrl`: 정산 상세 URL
- **다국어 지원**: 한국어

#### C. 파일 시스템 템플릿 (`emailService.ts`)

별도의 HTML/TXT 템플릿 파일 시스템:
- **템플릿 경로**: `/home/sohae21/o4o-platform/apps/api-server/src/templates/emails/`
- **지원 템플릿**:
  - `password-reset.html` / `password-reset.txt`
  - `email-verification.html` / `email-verification.txt`
  - `welcome.html` / `welcome.txt`
  - `account-approved.html`
  - `account-rejected.html`
  - `order-confirmation.html`
  - `security-alert.html`

**템플릿 변수 치환 방식**: `{{variableName}}` 패턴

### 2.2 템플릿 관리
- **저장 위치**:
  1. 코드 내장 (TypeScript 함수)
  2. 파일 시스템 (`/src/templates/email/`, `/src/templates/emails/`)
  3. DB 템플릿 (NotificationTemplate 엔티티, 미사용)
- **렌더링 엔진**:
  - 간단한 문자열 치환 (`{{variable}}` → value)
  - Handlebars 스타일 조건문 (`{{#if}}`) 수동 처리
- **버전 관리**: **미구현** ❌
- **미리보기**: **미구현** ❌

**이슈**:
- 템플릿이 코드, 파일, DB 세 곳에 분산되어 관리 어려움
- 버전 관리 부재로 템플릿 변경 이력 추적 불가
- 템플릿 미리보기 기능 없음
- 다국어 지원 미흡 (한국어만 지원)
- DB 템플릿 엔티티 존재하지만 실제 사용되지 않음

## 3. 발송 인프라

### 3.1 큐잉 시스템
- **큐 구현**: BullMQ (웹훅 전용), NotificationService (인앱 알림 전용)
- **큐 이름**:
  - `webhooks` (BullMQ)
  - NotificationService 내부 큐 (이메일/SMS/푸시)
- **작업자(Worker) 설정**:
  - 웹훅: 동시 처리 10개, 레이트 리밋 100/초
  - 알림: 우선순위별 배치 처리
- **우선순위**:
  - NotificationService: `low`, `medium`, `high`, `urgent` (4단계)
  - BullMQ: 우선순위 지정 가능

**현재 구현**:
- **이메일 발송은 큐잉 미사용** ❌
  - `email.service.ts`, `emailService.ts`는 동기적 발송
  - `notification.service.ts`는 큐잉 사용하지만 인앱 알림 위주
- 웹훅만 BullMQ로 비동기 처리
- Redis 기반 큐 (BullMQ)

**이슈**:
- 이메일 발송이 동기적으로 처리되어 API 응답 지연 가능
- 대량 이메일 발송 시 성능 저하 우려
- 이메일 큐와 웹훅 큐가 분리되지 않음

### 3.2 재시도 정책
- **재시도 횟수**:
  - 웹훅: 최대 3회 (BullMQ)
  - 알림: 최대 3회 (NotificationService)
- **재시도 간격**:
  - 웹훅: 지수 백오프 (1초 → 2초 → 4초)
  - 알림: 5초 × 시도 횟수
- **DLQ (Dead Letter Queue)**:
  - 웹훅: BullMQ의 Failed Queue
  - 알림: NotificationService 내부 retryQueue

**현재 구현**:
- **이메일 발송은 재시도 정책 없음** ❌
- `email.service.ts`, `emailService.ts`는 1회 시도 후 실패 시 에러 반환
- `notification.service.ts`는 재시도 지원하지만 이메일 발송에는 미적용

**이슈**:
- 이메일 발송 실패 시 자동 재시도 없음
- 일시적 네트워크 오류로 인한 발송 실패 복구 불가
- DLQ 미구현으로 실패한 이메일 추적 어려움

### 3.3 발송 추적
- **발송 성공/실패 로그**:
  - 로그 파일 (`logger.info`, `logger.error`)
  - DB 미저장 ❌
- **오픈율 추적**: **미구현** ❌
- **클릭율 추적**: **미구현** ❌
- **대시보드**: **미구현** ❌

**현재 구현**:
- 로그만 남기고 DB에 발송 이력 저장 안 함
- 이메일 발송 성공/실패 여부만 로그로 기록
- 웹훅은 Prometheus 메트릭으로 추적

**이슈**:
- 발송 이력 조회 불가
- 사용자별 이메일 수신 이력 추적 불가
- 오픈율/클릭율 분석 불가
- 이메일 마케팅 효과 측정 불가

### 3.4 배치 발송
- **대량 발송 시나리오**: `notification.service.ts`의 `sendBulkNotifications()`
- **배치 크기**:
  - urgent: 50건
  - high: 30건
  - medium: 20건
  - low: 10건
- **스로틀링**: 우선순위별 큐 처리 간격 (10초 ~ 2분)

**현재 구현**:
- `sendBulkNotifications()`는 순차 발송 (병렬 아님)
- 이메일 직접 발송 서비스는 배치 미지원

**이슈**:
- 대량 이메일 발송 시 순차 처리로 느림
- 발송 속도 제어 미흡
- SMTP 서버 부하 고려 없음

## 4. 알림 채널 (있는 경우)

### 4.1 SMS 발송
- **서비스**: **미구현** ❌
- **발송 번호**: 미설정
- **템플릿**: 미설정
- **사용 시나리오**: 미정의

**현재 구현**:
- `notification.service.ts`에 SMS 발송 메서드 존재 (`sendSMS`)
- 실제 SMS 서비스 연동 없음 (로그만 출력)

```typescript
private async sendSMS(recipient: any, content: any): Promise<void> {
  // SMS service integration would go here
  logger.info('SMS notification sent', {
    phone: recipient.phone,
    message: content.smsBody
  });
}
```

**이슈**:
- SMS 발송 기능 미구현 (스텁 코드만 존재)
- Twilio, Aligo 등 SMS 서비스 미연동

### 4.2 푸시 알림
- **서비스**: **미구현** ❌
- **디바이스 토큰 관리**: 미구현
- **페이로드**: 미정의
- **사용 시나리오**: 미정의

**현재 구현**:
- `notification.service.ts`에 푸시 알림 메서드 존재 (`sendPushNotification`)
- 실제 푸시 서비스 연동 없음 (로그만 출력)

```typescript
private async sendPushNotification(recipient: any, template: any, content: any): Promise<void> {
  // Push notification service integration would go here
  logger.info('Push notification sent', {
    userId: recipient.id,
    title: content.pushTitle,
    body: content.pushBody
  });
}
```

**이슈**:
- 푸시 알림 기능 미구현 (스텁 코드만 존재)
- FCM, APNS 등 푸시 서비스 미연동
- 디바이스 토큰 등록/관리 로직 없음

### 4.3 인앱 알림
- **알림 테이블**: `notifications` (Notification 엔티티)
- **읽음/안 읽음 상태**: `read`, `readAt` 컬럼으로 관리
- **실시간 전송**: **미구현** (WebSocket/SSE 없음)

**DB 스키마 (`Notification` 엔티티)**:
```typescript
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ length: 50 })
  type: string;

  @Column('uuid')
  recipientId: string;

  @Column({ type: 'json', nullable: true })
  data?: any;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('User')
  recipient: User;
}
```

**현재 구현**:
- `notification.service.ts`의 `sendInAppNotification()`으로 DB 저장
- 읽음 처리 API 존재 가능 (별도 확인 필요)
- 실시간 푸시는 없고 폴링 방식으로 조회해야 함

**이슈**:
- 실시간 알림 전송 미지원
- 사용자가 주기적으로 API를 호출해야 알림 확인 가능
- WebSocket/SSE 미구현

### 4.4 사용자 알림 설정
- **채널별 on/off**: **미구현** ❌
- **알림 유형별 설정**: **미구현** ❌
- **설정 저장**: **미구현** ❌

**이슈**:
- 사용자가 알림 수신 채널을 선택할 수 없음
- 알림 유형별 수신 거부 불가
- 마케팅 알림 vs 시스템 알림 구분 없음
- 개인정보보호법 및 정보통신망법 준수 리스크

## 5. 발견된 이슈

### 5.1 이메일 발송 이슈

#### 1) 서비스 기본 비활성화
- **문제**: `EMAIL_SERVICE_ENABLED=false` 기본값으로 이메일 발송 안 됨
- **영향**: 가입 인증 메일, 비밀번호 재설정 메일 등 모든 이메일 미발송
- **해결**: 프로덕션 환경에서 `EMAIL_SERVICE_ENABLED=true` 설정 필요

#### 2) 도메인 인증 미비
- **문제**: DKIM, SPF, DMARC 레코드 미설정
- **영향**:
  - 이메일 스팸 분류 가능성 높음
  - 수신 거부율 증가
  - 발신자 평판 저하
- **해결**: DNS 레코드 설정 및 도메인 검증 필요

#### 3) 바운스/컴플레인트 미처리
- **문제**: 반송 메일, 스팸 신고 처리 로직 없음
- **영향**:
  - 존재하지 않는 이메일 주소로 반복 발송
  - 발신자 평판 저하
  - IP 차단 리스크
- **해결**: SNS 토픽 설정 및 바운스/컴플레인트 핸들러 구현 필요

#### 4) 템플릿 관리 미흡
- **문제**: 템플릿이 코드, 파일, DB에 분산
- **영향**:
  - 템플릿 수정 시 코드 변경 필요
  - 버전 관리 불가
  - 다국어 지원 어려움
- **해결**: 템플릿 DB 일원화 및 관리 시스템 구축 필요

#### 5) 발송 추적 부재
- **문제**: 발송 이력 DB 미저장, 로그만 기록
- **영향**:
  - 발송 이력 조회 불가
  - 오픈율/클릭율 분석 불가
  - 사용자 불만 처리 어려움 (메일 안 왔다고 할 때 증명 불가)
- **해결**: 발송 이력 DB 저장 및 대시보드 구축 필요

#### 6) 이메일 서비스 중복 구현
- **문제**: `email.service.ts`와 `emailService.ts` 두 개 존재
- **영향**:
  - 코드 중복
  - 유지보수 어려움
  - 어느 서비스를 사용할지 혼란
- **해결**: 하나로 통합 필요

### 5.2 알림 채널 이슈

#### 1) SMS/푸시 미구현
- **문제**: SMS, 푸시 알림 스텁 코드만 존재
- **영향**:
  - 긴급 알림 발송 불가
  - 2FA 구현 불가 (SMS OTP)
  - 모바일 사용자 경험 저하
- **해결**: Twilio/Aligo (SMS), FCM/APNS (푸시) 연동 필요

#### 2) 사용자 설정 부재
- **문제**: 알림 수신 채널/유형 설정 불가
- **영향**:
  - 법적 리스크 (마케팅 수신 동의 미관리)
  - 사용자 불편
  - 스팸 신고 증가 가능
- **해결**:
  - UserNotificationPreferences 테이블 추가
  - 알림 설정 페이지 구현
  - 마케팅 수신 동의/거부 관리

#### 3) 실시간 알림 미지원
- **문제**: 인앱 알림 실시간 푸시 없음
- **영향**:
  - 사용자가 주기적으로 폴링해야 알림 확인 가능
  - 서버 부하 증가 (폴링)
  - UX 저하
- **해결**: WebSocket 또는 SSE 구현 필요

### 5.3 성능 이슈

#### 1) 큐잉 미사용 (동기 발송)
- **문제**: 이메일 발송이 동기적으로 처리
- **영향**:
  - API 응답 지연 (이메일 발송 시간만큼)
  - SMTP 서버 장애 시 API 타임아웃
  - 대량 발송 불가
- **해결**:
  - BullMQ로 이메일 큐 구현
  - 비동기 발송으로 API 응답 속도 개선

#### 2) 재시도 정책 부재
- **문제**: 이메일 발송 실패 시 재시도 없음
- **영향**:
  - 일시적 네트워크 오류로 발송 실패
  - 사용자 불만 (메일 안 옴)
  - 관리자 수동 재발송 필요
- **해결**:
  - 지수 백오프 재시도 정책 구현
  - 최대 3~5회 재시도

#### 3) 대량 발송 미지원
- **문제**: 순차 발송으로 대량 이메일 처리 느림
- **영향**:
  - 공지사항 발송 시 시간 오래 걸림
  - SMTP 서버 부하
  - 레이트 리밋 초과 가능
- **해결**:
  - 배치 발송 구현
  - 스로틀링 (예: 100건/초)
  - 여러 SMTP 서버 로드밸런싱

## 6. 개선 권장사항

### 6.1 단기 (1개월)

#### 1. 이메일 서비스 활성화 및 검증 (우선순위: 높음)
- [ ] `.env`에 `EMAIL_SERVICE_ENABLED=true` 설정
- [ ] SMTP 설정 완료 (Gmail 또는 AWS SES)
- [ ] 발송 테스트 (가입 인증, 비밀번호 재설정)
- [ ] 에러 핸들링 개선 (타임아웃, 네트워크 오류)

#### 2. 도메인 인증 완료 (우선순위: 높음)
- [ ] DKIM 레코드 DNS 등록
- [ ] SPF 레코드 DNS 등록 (`v=spf1 include:_spf.google.com ~all`)
- [ ] DMARC 정책 설정 (`v=DMARC1; p=quarantine; rua=mailto:postmaster@neture.co.kr`)
- [ ] 발신 도메인 검증 (AWS SES 또는 Google Admin)

#### 3. 바운스 처리 구현 (우선순위: 중간)
- [ ] SNS 토픽 생성 (AWS SES 사용 시)
- [ ] 바운스 웹훅 엔드포인트 구현
- [ ] 하드 바운스 이메일 억제 목록 추가
- [ ] 소프트 바운스 재시도 정책 수립

#### 4. 큐잉 시스템 도입 (우선순위: 높음)
- [ ] BullMQ 이메일 큐 생성 (`email-queue`)
- [ ] 이메일 발송 워커 구현
- [ ] 기존 동기 발송 코드 큐 발송으로 변경
- [ ] 재시도 정책 설정 (3회, 지수 백오프)

#### 5. 이메일 서비스 통합 (우선순위: 중간)
- [ ] `email.service.ts`와 `emailService.ts` 중복 제거
- [ ] 하나의 서비스로 통합 (예: `EmailService`)
- [ ] 레거시 코드 마이그레이션

### 6.2 중기 (3개월)

#### 1. 템플릿 DB화 및 버전 관리 (우선순위: 중간)
- [ ] 템플릿 관리 API 구현 (`POST /api/v1/email-templates`)
- [ ] 템플릿 버전 테이블 추가 (`EmailTemplateVersion`)
- [ ] 템플릿 미리보기 기능 구현
- [ ] HTML/파일 템플릿 → DB 마이그레이션
- [ ] 코드 내장 템플릿 → DB 마이그레이션

#### 2. 발송 추적 및 대시보드 (우선순위: 중간)
- [ ] 발송 이력 테이블 추가 (`EmailLog`)
  ```sql
  CREATE TABLE email_logs (
    id UUID PRIMARY KEY,
    recipient_email VARCHAR(255),
    subject VARCHAR(500),
    template_id UUID,
    status VARCHAR(50), -- pending, sent, failed, bounced
    sent_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP
  );
  ```
- [ ] 발송 성공/실패 시 DB 기록
- [ ] 오픈율 추적 (1x1 픽셀 이미지)
- [ ] 클릭율 추적 (리다이렉트 링크)
- [ ] 관리자 대시보드 구현
  - 발송 통계 (일별/월별)
  - 템플릿별 성과
  - 오픈율/클릭율 차트

#### 3. SMS/푸시 알림 구현 (우선순위: 높음)
- [ ] Twilio 또는 Aligo SMS 연동
- [ ] SMS 템플릿 관리
- [ ] FCM/APNS 푸시 알림 연동
- [ ] 디바이스 토큰 등록/관리 API
- [ ] 2FA (SMS OTP) 구현

#### 4. 사용자 알림 설정 (우선순위: 높음)
- [ ] `UserNotificationPreferences` 테이블 추가
  ```sql
  CREATE TABLE user_notification_preferences (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    channel VARCHAR(50), -- email, sms, push, in_app
    category VARCHAR(50), -- security, marketing, transaction, system
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(user_id, channel, category)
  );
  ```
- [ ] 알림 설정 API (`GET/PUT /api/v1/users/me/notification-preferences`)
- [ ] 알림 설정 페이지 (프론트엔드)
- [ ] 마케팅 수신 동의 관리

#### 5. 실시간 알림 (우선순위: 중간)
- [ ] WebSocket 서버 구축 (Socket.io)
- [ ] 인앱 알림 실시간 푸시
- [ ] 알림 읽음 처리 API
- [ ] 알림 목록 조회 API (페이징)

### 6.3 장기 (6개월)

#### 1. 다국어 템플릿 (우선순위: 낮음)
- [ ] 사용자 언어 설정 (ko, en, ja, zh)
- [ ] 템플릿 다국어 버전 관리
- [ ] 언어별 템플릿 렌더링
- [ ] i18n 라이브러리 통합

#### 2. A/B 테스트 (우선순위: 낮음)
- [ ] 이메일 A/B 테스트 프레임워크
- [ ] 제목/본문 변형 테스트
- [ ] 성과 비교 (오픈율/클릭율)
- [ ] 자동 승자 선택

#### 3. 마케팅 자동화 (우선순위: 낮음)
- [ ] 이메일 캠페인 생성 API
- [ ] 세그먼트별 발송 (사용자 그룹)
- [ ] 자동 발송 스케줄링
- [ ] 캠페인 성과 리포트

#### 4. 전문 이메일 서비스 전환 (우선순위: 중간)
- [ ] AWS SES로 전환 (SMTP → SES API)
- [ ] 또는 SendGrid로 전환
- [ ] 바운스/컴플레인트 자동 처리
- [ ] 발송량 제한 자동 확장

#### 5. 고급 기능 (우선순위: 낮음)
- [ ] 이메일 예약 발송
- [ ] 반복 발송 (주간/월간 리포트)
- [ ] 이메일 워밍업 (신규 IP)
- [ ] IP 풀 관리 (전용 IP)
- [ ] 이메일 인증 (BIMI, DMARC aggregate reports)

## 7. 관련 파일 목록

### 이메일 서비스
- `/home/sohae21/o4o-platform/apps/api-server/src/utils/email.ts` (레거시)
- `/home/sohae21/o4o-platform/apps/api-server/src/services/email.service.ts`
- `/home/sohae21/o4o-platform/apps/api-server/src/services/emailService.ts`
- `/home/sohae21/o4o-platform/apps/api-server/src/services/passwordResetService.ts`

### 알림 서비스
- `/home/sohae21/o4o-platform/apps/api-server/src/services/notification.service.ts`

### 큐잉 시스템
- `/home/sohae21/o4o-platform/apps/api-server/src/queues/webhook.queue.ts` (웹훅 전용)
- `/home/sohae21/o4o-platform/apps/api-server/src/config/redis.ts`

### 엔티티
- `/home/sohae21/o4o-platform/apps/api-server/src/entities/EmailVerificationToken.ts`
- `/home/sohae21/o4o-platform/apps/api-server/src/entities/PasswordResetToken.ts`
- `/home/sohae21/o4o-platform/apps/api-server/src/entities/Notification.ts`
- `/home/sohae21/o4o-platform/apps/api-server/src/entities/NotificationTemplate.ts`

### 템플릿
- `/home/sohae21/o4o-platform/apps/api-server/src/templates/email/` (6개 HTML)
- `/home/sohae21/o4o-platform/apps/api-server/src/templates/emails/` (7개 HTML)

### 설정
- `/home/sohae21/o4o-platform/apps/api-server/src/config/config.ts`
- `/home/sohae21/o4o-platform/apps/api-server/.env.example`

## 8. 결론

### 8.1 현재 상태 요약
- **이메일 서비스**: 구현되어 있으나 **기본 비활성화**
- **템플릿**: 13개 템플릿 존재하지만 코드/파일에 분산
- **큐잉**: 웹훅만 BullMQ 사용, 이메일은 **동기 발송**
- **재시도**: 웹훅만 지원, 이메일은 **재시도 없음**
- **추적**: 로그만 기록, DB 저장 및 분석 **미구현**
- **SMS/푸시**: 스텁 코드만 존재, **실제 연동 없음**
- **사용자 설정**: **미구현** (법적 리스크)

### 8.2 우선순위별 권장사항

#### 🔴 긴급 (즉시)
1. 이메일 서비스 활성화 (`EMAIL_SERVICE_ENABLED=true`)
2. SMTP 설정 및 발송 테스트
3. 도메인 인증 (DKIM/SPF/DMARC)

#### 🟠 높음 (1개월)
1. 이메일 큐잉 시스템 구현 (BullMQ)
2. 재시도 정책 구현
3. 바운스 처리 로직 구현
4. 이메일 서비스 통합 (중복 제거)

#### 🟡 중간 (3개월)
1. 발송 이력 DB 저장 및 대시보드
2. SMS/푸시 알림 연동
3. 사용자 알림 설정 구현
4. 템플릿 DB화 및 관리 시스템

#### 🟢 낮음 (6개월)
1. 다국어 지원
2. A/B 테스트
3. 마케팅 자동화
4. 전문 이메일 서비스 전환 (AWS SES/SendGrid)

### 8.3 법적 준수 사항
- **정보통신망법**: 마케팅 수신 동의 관리 필수 (미구현 → 법적 리스크)
- **개인정보보호법**: 이메일 주소 수집/이용 동의 필요
- **스팸 방지**: 수신 거부 링크 필수 (미구현)
- **GDPR** (해외 서비스 시): 이메일 추적 동의 필요

---

**작성일**: 2025-11-08
**작성자**: AI Assistant
**버전**: 1.0
