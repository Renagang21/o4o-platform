# 사용자 관리 보안/개인정보/감사 체계

**조사일**: 2025-11-08
**조사 범위**: 인증, 권한, 개인정보, 감사 추적
**대상 시스템**: O4O Platform API Server

---

## 1. 보안 메커니즘

### 1.1 비밀번호 보안

#### 해시 알고리즘
- **알고리즘**: bcrypt (bcryptjs)
- **구현 위치**:
  - `apps/api-server/src/entities/User.ts` (Entity 레벨 해싱)
  - `apps/api-server/src/utils/auth.utils.ts` (유틸리티 함수)
- **솔트 라운드**: 10 (기본값, `BCRYPT_SALT_ROUNDS` 환경변수로 설정 가능)
- **자동 솔트 생성**: bcrypt가 자동으로 솔트 생성 및 관리

```typescript
// User Entity - BeforeInsert/BeforeUpdate Hook
@BeforeInsert()
@BeforeUpdate()
async hashPassword() {
  if (this.password && !this.password.startsWith('$2')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
}

// auth.utils.ts
const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
return bcrypt.hash(password, saltRounds);
```

#### 비밀번호 강도 정책
- **최소 길이**: 8자
- **필수 요소**:
  - 대문자 1개 이상
  - 소문자 1개 이상
  - 숫자 1개 이상
  - 특수문자 1개 이상 (`!@#$%^&*(),.?":{}|<>`)
- **검증 함수**: `validatePasswordStrength()` in `auth.utils.ts`

**발견 사항**:
- ✅ 강력한 비밀번호 정책 적용
- ⚠️ 비밀번호 재사용 방지 미구현
- ⚠️ 비밀번호 만료 정책 없음
- ⚠️ 비밀번호 변경 이력 추적 없음

### 1.2 계정 보호

#### 로그인 실패 처리
- **실패 횟수 추적**: `User.loginAttempts` 필드
- **계정 잠금**: `User.lockedUntil` 필드
- **잠금 확인**: `User.isLocked` getter 메서드

```typescript
get isLocked(): boolean {
  return !!(this.lockedUntil && this.lockedUntil > new Date());
}
```

**발견 사항**:
- ⚠️ 실패 횟수 임계값이 코드에 명시되지 않음
- ⚠️ 잠금 해제 시간이 동적으로 설정되지 않음
- ⚠️ IP 기반 차단과 계정 기반 차단이 명확히 분리되지 않음

#### 레이트 리미팅 (Rate Limiting)

**구현 계층**:
1. **Express Rate Limit** (`rateLimiter.ts`)
   - Redis 기반 분산 레이트 리미팅
   - 다중 서버 환경 지원

2. **Rate Limiter 설정** (`rate-limiters.config.ts`)
   - 엔드포인트별 개별 설정
   - 프록시 환경 IP 처리

**레이트 리밋 정책**:

| 리미터 | 시간 윈도우 | 최대 요청 | 적용 대상 |
|--------|-------------|-----------|-----------|
| `strictLimiter` | 15분 | 5회 | 로그인, 회원가입 |
| `defaultLimiter` | 15분 | 100회 | 일반 API |
| `apiLimiter` | 1분 | 60회 | API 엔드포인트 |
| `uploadLimiter` | 1시간 | 100회 | 파일 업로드 |
| `publicLimiter` | 15분 | 1000회 | 공개 엔드포인트 |
| `settingsLimiter` | 15분 | 2000회 | 설정 엔드포인트 |

**스마트 레이트 리미터** (`SmartRateLimiter` 클래스):
- 1분에 100개 이상 요청 시 IP 자동 차단
- 1초에 10개 이상 요청 시 버스트 패턴 감지
- 30분 후 자동 차단 해제
- 의심스러운 IP 목록 관리

**발견 사항**:
- ✅ 다층 레이트 리미팅 구현
- ✅ Redis 기반 분산 환경 지원
- ✅ 프록시 환경 IP 추출 처리
- ⚠️ localhost 요청 스킵 (프로덕션에서 주의 필요)

#### IP 차단 (Security Audit Service)

**구현 위치**: `services/SecurityAuditService.ts`

**자동 IP 차단 규칙**:
- 15분 내 로그인 실패 5회 → IP 차단
- SQL Injection 시도 감지 → 즉시 차단
- 보안 규칙 위반 → 차단/챌린지

**차단 관리**:
```typescript
blockIP(ipAddress: string): void
unblockIP(ipAddress: string): void
isIPBlocked(ipAddress: string): boolean
getIPRisk(ipAddress: string): 'low' | 'medium' | 'high' | 'blocked'
```

### 1.3 공격 방어

#### XSS (Cross-Site Scripting) 방어
- **Helmet.js 사용**: Content Security Policy (CSP) 설정
- **CSP 정책** (`main.ts`):
  ```javascript
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
  ```

**발견 사항**:
- ✅ Helmet.js 적용
- ⚠️ `unsafe-inline`, `unsafe-eval` 허용 (XSS 위험 증가)
- ⚠️ 입력값 sanitization 미확인
- ⚠️ 출력 시 이스케이프 처리 미확인

#### CSRF (Cross-Site Request Forgery) 방어
- **CORS 설정**: 명시적인 origin 화이트리스트
- **Credentials 허용**: `credentials: true`
- **SameSite 쿠키**: `sameSite: 'lax'` (AuthService)

**CORS 화이트리스트**:
```javascript
const allowedOrigins = [
  "https://neture.co.kr",
  "https://admin.neture.co.kr",
  "https://api.neture.co.kr",
  // ... development origins
];
```

**발견 사항**:
- ✅ CORS 화이트리스트 적용
- ✅ SameSite 쿠키 설정
- ⚠️ CSRF 토큰 미사용
- ⚠️ SameSite='strict' 권장 (현재 'lax')

#### SQL Injection 방어
- **ORM 사용**: TypeORM (파라미터화된 쿼리 자동 생성)
- **SQL Injection 감지 미들웨어**: `securityMiddleware.ts`

**감지 패턴**:
```typescript
const sqlPatterns = [
  /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|into|where|table)\b)/i,
  /(\b(or|and)\b.*=.*)/i,
  /(--|\||;|\/\*|\*\/|xp_|sp_)/i,
  /('|")\s*(or|and)\s*('|")\s*=/i
];
```

**처리 방식**:
- 의심 패턴 감지 시 400 에러 반환
- SecurityAuditService에 로그 기록
- IP 주소 차단 고려

**발견 사항**:
- ✅ TypeORM 사용으로 기본 방어
- ✅ SQL Injection 패턴 감지 미들웨어
- ✅ 보안 이벤트 로깅
- ⚠️ 정규표현식 우회 가능성 존재

#### 세션 하이재킹 방어
- **httpOnly 쿠키**: `httpOnly: true`
- **Secure 쿠키**: 프로덕션에서 `secure: true`
- **세션 스토어**: Redis 기반 (프로덕션)

### 1.4 토큰 관리

#### JWT 시크릿 관리
- **액세스 토큰 시크릿**: `JWT_SECRET` 환경변수
- **리프레시 토큰 시크릿**: `JWT_REFRESH_SECRET` (fallback: `JWT_SECRET`)
- **필수 검증**: 환경변수 누락 시 서버 시작 실패

```typescript
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
```

**발견 사항**:
- ✅ 환경변수 필수 검증
- ⚠️ **시크릿 강도 검증 없음** (길이, 복잡도 체크 없음)
- ⚠️ 환경별 시크릿 분리 권장사항 없음
- ⚠️ 시크릿 로테이션 정책 없음

#### 토큰 만료 정책
- **액세스 토큰**: 15분 (기본값, `JWT_ACCESS_TOKEN_EXPIRES`)
- **리프레시 토큰**: 7일 (기본값, `JWT_REFRESH_TOKEN_EXPIRES`)

```typescript
// Access Token
expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES || '15m'

// Refresh Token
expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES || '7d'
```

#### 토큰 무효화
- **리프레시 토큰 패밀리**: `User.refreshTokenFamily` 필드
- **토큰 패밀리 변경**: 로그아웃/비밀번호 변경 시 기존 토큰 무효화

**발견 사항**:
- ✅ 토큰 패밀리 기반 무효화
- ⚠️ 블랙리스트/화이트리스트 미구현
- ⚠️ 즉시 무효화가 어려움 (토큰 만료 전까지 유효)

#### 토큰 Rotation
- **리프레시 토큰 Rotation**: 구현 확인 필요
- **RefreshTokenService**: 별도 서비스 존재

**발견 사항**:
- ⚠️ Refresh Token Rotation 정책 불명확
- ⚠️ 재사용 감지(Reuse Detection) 미확인

---

## 2. 개인정보 보호

### 2.1 데이터 수집

#### 필수 정보 (User Entity)
- `email` (unique, 인증 수단)
- `password` (bcrypt 해시)

#### 선택 정보
- `firstName`, `lastName`, `name`
- `avatar` (프로필 이미지 URL)
- `businessInfo` (JSON, 사업자 정보)
- `betaUserId`, `domain`

#### 메타데이터
- `lastLoginAt`, `lastLoginIp`
- `loginAttempts`, `lockedUntil`
- `approvedAt`, `approvedBy`
- `provider`, `provider_id` (소셜 로그인)

**발견 사항**:
- ✅ 최소 수집 원칙 준수 (이메일, 비밀번호만 필수)
- ⚠️ 수집 근거 및 동의 관리 시스템 미확인
- ⚠️ 개인정보 처리방침 연동 부재

### 2.2 데이터 보호

#### 저장 암호화
- **비밀번호**: bcrypt 해시 (단방향)
- **기타 PII**: 암호화되지 않음 (평문 저장)

**발견 사항**:
- ✅ 비밀번호 해시화
- ❌ **이메일, 이름 등 PII 암호화 없음**
- ❌ **사업자 정보(businessInfo) 암호화 없음**

#### 전송 암호화
- **HTTPS**: 프로덕션 환경에서 강제 (`secure: true` 쿠키)
- **TLS 버전**: 설정 확인 필요

#### 마스킹
- **toPublicData() 메서드**: 민감 정보 제외한 공개 데이터 반환
  ```typescript
  toPublicData() {
    return {
      id: this.id,
      email: this.email,
      // password 제외
      // loginAttempts, lockedUntil 제외
      // refreshTokenFamily 제외
    };
  }
  ```

**발견 사항**:
- ✅ API 응답에서 비밀번호 제외
- ⚠️ 로그에서 민감정보 마스킹 미확인
- ⚠️ 관리자 화면에서 비밀번호 해시 노출 가능성

#### 접근 제어
- **권한 기반 접근 제어 (RBAC)**:
  - `User.role`, `User.dbRoles`
  - `User.permissions`, `User.getAllPermissions()`
- **관리자 전용 API**: `/admin/*` 경로 보호

**발견 사항**:
- ✅ 역할 기반 접근 제어
- ✅ 권한 체크 메서드 (`hasPermission`, `hasRole`)
- ⚠️ 최소 권한 원칙 적용 여부 불명확

### 2.3 데이터 보관/삭제

#### 보관 기간
- **명시적 정책 없음**: 코드상 보관 기간 정책 미확인

#### 삭제 방식
- **Soft Delete 지원**: `deletedAt` 필드 존재 (일부 엔티티)
- **User 엔티티**: Soft Delete 미확인

```typescript
// 일부 엔티티에서 발견
@Column({ type: 'timestamp', nullable: true })
deletedAt?: Date;
```

**발견 사항**:
- ⚠️ **일관된 삭제 정책 부재**
- ⚠️ User 엔티티에 `deletedAt` 필드 없음
- ⚠️ 탈퇴 시 Hard Delete vs Soft Delete 정책 불명확

#### 탈퇴 처리
- **탈퇴 API**: 확인 필요
- **연관 데이터 처리**: Cascade 정책 확인 필요

**발견 사항**:
- ❌ **명시적 탈퇴 처리 로직 미확인**
- ⚠️ GDPR "삭제권" 구현 부재

#### 자동 삭제
- **구현 확인 안 됨**: 보관 기간 경과 후 자동 삭제 로직 없음

### 2.4 법규 준수

#### GDPR 요구사항
- **데이터 이동권** (Right to Data Portability): 미구현
- **삭제권** (Right to Erasure): 미구현
- **접근권** (Right of Access): 부분 구현 (사용자 정보 조회 API)
- **정정권** (Right to Rectification): 구현 (프로필 수정 API)

**발견 사항**:
- ⚠️ GDPR 요구사항 부분적으로만 충족
- ❌ 데이터 내보내기 기능 없음
- ❌ 완전 삭제 기능 없음

#### PIPA (개인정보보호법)
- **개인정보 처리방침**: 확인 필요
- **동의 관리**: 미확인

#### 동의 관리
- **수집/이용 동의**: 구현 확인 안 됨
- **마케팅 동의**: 구현 확인 안 됨

**발견 사항**:
- ❌ **명시적 동의 관리 시스템 부재**
- ⚠️ 약관 동의 이력 추적 없음

---

## 3. 감사 추적

### 3.1 감사 로그 범위

#### AuditLog Entity (`entities/AuditLog.ts`)
**추적 대상**:
- Commission, Conversion, Policy, Partner 등 엔티티 변경
- 관리자 작업 (created, updated, deleted, adjusted, cancelled, paid, refunded)

**기록 내용**:
- `entityType`, `entityId`: 변경된 엔티티
- `action`: 수행된 작업
- `userId`: 작업 수행자
- `changes`: 변경 전후 값 (JSON)
- `reason`: 변경 사유
- `ipAddress`, `userAgent`: 접속 정보

**인덱스**:
```typescript
@Index('IDX_audit_logs_entity', ['entityType', 'entityId'])
@Index('IDX_audit_logs_user', ['userId'])
@Index('IDX_audit_logs_created', ['createdAt'])
```

#### UserActivityLog Entity (`entities/UserActivityLog.ts`)
**추적 이벤트** (ActivityType enum):
- **인증**: LOGIN, LOGOUT, PASSWORD_CHANGE, EMAIL_CHANGE
- **프로필**: PROFILE_UPDATE, AVATAR_UPDATE, BUSINESS_INFO_UPDATE
- **계정 상태**: ACCOUNT_ACTIVATION, ACCOUNT_DEACTIVATION, ACCOUNT_SUSPENSION, EMAIL_VERIFICATION
- **역할/권한**: ROLE_CHANGE, PERMISSION_GRANT, PERMISSION_REVOKE
- **관리자**: ADMIN_APPROVAL, ADMIN_REJECTION, ADMIN_NOTE_ADD
- **보안**: PASSWORD_RESET_REQUEST, PASSWORD_RESET_COMPLETE, TWO_FACTOR_ENABLE, TWO_FACTOR_DISABLE
- **API**: API_KEY_CREATE, API_KEY_DELETE, API_ACCESS_DENIED
- **시스템**: DATA_EXPORT, DATA_DELETION, GDPR_REQUEST

**기록 내용**:
- `userId`, `activityType`, `activityCategory`
- `title`, `description`
- `ipAddress`, `userAgent`
- `metadata` (JSON): 상세 정보
- `performedByUserId`: 작업 수행자 (관리자 작업의 경우)

**Helper 메서드**:
```typescript
static createLoginActivity(userId, ipAddress, userAgent, metadata)
static createRoleChangeActivity(userId, oldRole, newRole, performedByUserId, reason)
static createAdminApprovalActivity(userId, performedByUserId, reason)
// ... 등
```

#### AccountActivity Entity (`entities/AccountActivity.ts`)
**추적 대상**:
- 계정 연동/해제 (linked, unlinked, merged)
- 로그인 (login)
- 연동 실패 (failed_link)

**기록 내용**:
- `userId`, `action`, `provider`
- `ipAddress`, `userAgent`
- `metadata` (JSON)

#### SecurityAuditService (`services/SecurityAuditService.ts`)
**보안 이벤트 추적**:
- 인증 (auth.*): login, logout, failed_login, password_reset, permission_denied
- 데이터 (data.*): access, create, update, delete, export, import
- 관리자 (admin.*): settings_change, user_created, role_changed
- 시스템 (system.*): file_upload, backup, restore
- API (api.*): rate_limit, invalid_request
- 보안 (security.*): intrusion_attempt, malware_detected, sql_injection, xss_attempt

**기록 내용**:
- `type`, `severity` (low/medium/high/critical)
- `userId`, `userEmail`, `ipAddress`, `userAgent`
- `action`, `resource`, `result`
- `details` (JSON)

**보안 규칙 엔진**:
- 자동 차단 규칙 (예: 5회 로그인 실패 → IP 차단)
- 알림 규칙 (예: 대량 데이터 내보내기)

**발견 사항**:
- ✅ **포괄적인 감사 로그 시스템**
- ✅ 인증, 권한, 프로필, 보안 이벤트 추적
- ✅ IP, User Agent, 변경 사유 기록
- ⚠️ 로그 보존 기간 정책 미확인

### 3.2 로그 보존

#### 보존 기간
- **명시적 정책 없음**: 코드상 보존 기간 설정 없음
- **SecurityAuditService**: 메모리 기반, 최대 10,000개 이벤트 보관

```typescript
if (this.events.length > 10000) {
  this.events = this.events.slice(0, 10000);
}
```

**발견 사항**:
- ⚠️ **SecurityAuditService는 메모리 기반** (서버 재시작 시 손실)
- ⚠️ DB 영속화 구현 중 (`persistEvent` 메서드 존재하나 미구현)
- ⚠️ 보존 기간 정책 부재 (최소 6개월~1년 권장)

#### 보존 위치
- **Database**: AuditLog, UserActivityLog, AccountActivity (TypeORM)
- **Memory**: SecurityAuditService (임시)

#### 보존 형식
- **JSON/JSONB**: 변경 이력, 메타데이터

### 3.3 로그 보안

#### 무결성 보장
- **미구현**: 로그 해시, 서명 없음

#### 접근 제어
- **미확인**: 로그 조회 권한 정책 불명확

#### 변조 방지
- **미구현**: Append-only 저장소 없음

**발견 사항**:
- ❌ **로그 무결성 보장 메커니즘 부재**
- ❌ **로그 변조 방지 없음**
- ⚠️ 관리자가 로그를 삭제할 수 있는지 확인 필요

### 3.4 로그 분석

#### 실시간 모니터링
- **SecurityAuditService**: 실시간 규칙 엔진

#### 알림
- **구현 중**: `sendSecurityAlert()` 메서드 존재 (이메일/Slack 미구현)

```typescript
private sendSecurityAlert(event: SecurityEvent, rule: SecurityRule): void {
  // In production, send email/Slack notification
  logger.warn(`[SECURITY ALERT] ${rule.name} triggered`, { event, rule });
}
```

#### 대시보드
- **SecurityStats**: 통계 데이터 제공
  - `totalEvents`, `failedLogins`, `suspiciousActivities`
  - `topIPs`, `eventsByType`, `eventsBySeverity`
  - `recentEvents`

**발견 사항**:
- ✅ 보안 이벤트 통계 제공
- ⚠️ 실시간 대시보드 UI 미확인
- ⚠️ 알림 시스템 미완성

---

## 4. 발견된 이슈

### 4.1 보안 이슈 (우선순위별)

#### 🔴 Critical (즉시 조치 필요)
1. **JWT 시크릿 강도 검증 부재**
   - 현상: 환경변수 존재 여부만 확인, 길이/복잡도 미검증
   - 위험: 약한 시크릿 사용 시 토큰 위조 가능
   - 권장: 최소 32바이트 이상, 영숫자+특수문자 조합 강제

2. **개인정보 평문 저장**
   - 현상: 이메일, 이름, 사업자정보 등 암호화 없이 저장
   - 위험: DB 탈취 시 즉시 노출
   - 권장: 민감 정보 필드 레벨 암호화 (AES-256-GCM)

3. **로그 무결성 보장 부재**
   - 현상: 감사 로그 해시/서명 없음
   - 위험: 관리자 권한 탈취 시 로그 변조 가능
   - 권장: 로그 체인 해싱 또는 외부 SIEM 전송

#### 🟠 High (1개월 내 조치)
4. **CSRF 토큰 미사용**
   - 현상: CORS만 의존, CSRF 토큰 없음
   - 위험: 인증된 사용자 대상 CSRF 공격 가능
   - 권장: csurf 라이브러리 적용 또는 SameSite='strict'

5. **비밀번호 재사용 방지 없음**
   - 현상: 이전 비밀번호 이력 미저장
   - 위험: 동일 비밀번호 반복 사용 가능
   - 권장: 최근 5개 비밀번호 해시 저장 및 비교

6. **토큰 블랙리스트 부재**
   - 현상: 로그아웃 후에도 토큰 유효
   - 위험: 탈취된 토큰 즉시 무효화 불가
   - 권장: Redis 기반 토큰 블랙리스트 구현

7. **XSS 방어 약화**
   - 현상: CSP에서 `unsafe-inline`, `unsafe-eval` 허용
   - 위험: XSS 공격 가능성 증가
   - 권장: CSP 엄격화, nonce 기반 인라인 스크립트

#### 🟡 Medium (3개월 내 조치)
8. **계정 잠금 정책 불명확**
   - 현상: 실패 횟수 임계값, 잠금 시간이 하드코딩되지 않음
   - 위험: 브루트포스 공격 방어 불일치
   - 권장: 환경변수화 및 명시적 정책 문서화

9. **비밀번호 만료 정책 없음**
   - 현상: 비밀번호 영구 사용 가능
   - 위험: 장기간 사용 시 보안 저하
   - 권장: 90일 주기 변경 강제 (선택적)

10. **SecurityAuditService 메모리 기반**
    - 현상: 서버 재시작 시 보안 이벤트 손실
    - 위험: 공격 패턴 추적 불가
    - 권장: DB 영속화 완료

### 4.2 개인정보 이슈

#### 🔴 Critical
11. **GDPR 삭제권 미구현**
    - 현상: 사용자 데이터 완전 삭제 기능 없음
    - 위험: GDPR 위반, 법적 리스크
    - 권장: 탈퇴 시 개인정보 완전 삭제 또는 익명화

12. **동의 관리 시스템 부재**
    - 현상: 개인정보 수집/이용 동의 이력 미추적
    - 위험: PIPA 위반, 법적 리스크
    - 권장: 동의 이력 테이블 추가, 약관 버전 관리

#### 🟠 High
13. **데이터 내보내기 기능 없음**
    - 현상: GDPR 데이터 이동권 미지원
    - 위험: GDPR 위반
    - 권장: JSON/CSV 형식 내보내기 API 제공

14. **로그 마스킹 미확인**
    - 현상: 애플리케이션 로그에 민감정보 노출 가능
    - 위험: 로그 파일 탈취 시 개인정보 유출
    - 권장: 로거 설정에서 이메일, 이름 마스킹

#### 🟡 Medium
15. **개인정보 보관 기간 정책 부재**
    - 현상: 탈퇴 회원 데이터 보관 기간 불명확
    - 위험: 불필요한 정보 장기 보관
    - 권장: 탈퇴 후 30일 유예 후 삭제 정책

16. **Soft Delete 정책 불일치**
    - 현상: 일부 엔티티만 Soft Delete 지원
    - 위험: 데이터 복구/삭제 정책 혼란
    - 권장: 전사 일관된 삭제 정책 수립

### 4.3 감사 이슈

#### 🟠 High
17. **로그 보존 기간 정책 부재**
    - 현상: 감사 로그 자동 삭제/아카이빙 정책 없음
    - 위험: 스토리지 무한 증가 또는 중요 로그 손실
    - 권장: 최소 1년 보존, 이후 아카이빙

18. **로그 접근 제어 불명확**
    - 현상: 누가 감사 로그를 조회할 수 있는지 불명확
    - 위험: 무단 로그 접근
    - 권장: 감사 로그 조회 권한 명시 (Super Admin만)

#### 🟡 Medium
19. **알림 시스템 미완성**
    - 현상: 보안 이벤트 알림이 로그로만 기록
    - 위험: 실시간 공격 감지 및 대응 지연
    - 권장: Slack/이메일 통합 완료

20. **대시보드 UI 부재**
    - 현상: 관리자가 보안 이벤트를 시각적으로 확인 불가
    - 위험: 공격 패턴 분석 어려움
    - 권장: Admin 대시보드에 보안 통계 페이지 추가

---

## 5. 개선 권장사항

### 5.1 단기 (1개월)

#### 보안
1. **JWT 시크릿 강도 검증 추가**
   ```typescript
   function validateJWTSecret(secret: string) {
     if (secret.length < 32) {
       throw new Error('JWT_SECRET must be at least 32 characters');
     }
     if (!/[A-Z]/.test(secret) || !/[a-z]/.test(secret) || !/[0-9]/.test(secret)) {
       throw new Error('JWT_SECRET must contain uppercase, lowercase, and numbers');
     }
   }
   ```

2. **CSRF 토큰 적용 또는 SameSite='strict' 변경**
   - AuthService cookieConfig에서 `sameSite: 'strict'` 설정
   - 또는 csurf 미들웨어 추가

3. **토큰 블랙리스트 구현**
   - Redis에 로그아웃/비밀번호 변경 시 토큰 JTI 저장
   - 인증 미들웨어에서 블랙리스트 확인

4. **계정 잠금 정책 명시**
   ```typescript
   // 환경변수
   LOGIN_ATTEMPTS_LIMIT=5
   ACCOUNT_LOCK_DURATION_MINUTES=30
   ```

#### 개인정보
5. **동의 관리 테이블 추가**
   ```typescript
   @Entity('user_consents')
   class UserConsent {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     @Column()
     userId: string;

     @Column()
     consentType: 'terms' | 'privacy' | 'marketing';

     @Column()
     version: string; // 약관 버전

     @Column({ default: false })
     agreed: boolean;

     @CreateDateColumn()
     agreedAt: Date;
   }
   ```

6. **로그 마스킹 추가**
   ```typescript
   // logger.ts에 sanitizer 함수 추가
   function maskEmail(email: string) {
     return email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
   }
   ```

#### 감사
7. **SecurityAuditService DB 영속화 완료**
   - `persistEvent()` 메서드 구현
   - 보안 이벤트 엔티티 생성 또는 AuditLog 재사용

8. **로그 보존 정책 문서화**
   - 감사 로그: 1년 보존, 이후 아카이빙
   - 보안 이벤트: 6개월 보존
   - 사용자 활동: 3개월 보존

### 5.2 중기 (3개월)

#### 보안
9. **개인정보 필드 레벨 암호화**
   - TypeORM Transformer를 이용한 자동 암호화/복호화
   ```typescript
   @Column({
     type: 'text',
     transformer: {
       to: (value: string) => encrypt(value),
       from: (value: string) => decrypt(value)
     }
   })
   email: string;
   ```

10. **비밀번호 재사용 방지**
    - `password_history` 테이블 추가
    - 비밀번호 변경 시 최근 5개 해시와 비교

11. **CSP 엄격화**
    - `unsafe-inline`, `unsafe-eval` 제거
    - Nonce 기반 인라인 스크립트 허용

12. **2FA (Two-Factor Authentication) 구현**
    - TOTP 기반 2FA
    - 백업 코드 생성

#### 개인정보
13. **GDPR 삭제권 구현**
    - 탈퇴 API에서 `User.deletedAt` 설정 (Soft Delete)
    - 30일 후 배치 작업으로 완전 삭제 (Hard Delete)

14. **데이터 내보내기 API**
    - `/api/v1/users/me/export` 엔드포인트
    - JSON 형식으로 모든 사용자 데이터 반환

15. **개인정보 처리방침 버전 관리**
    - `privacy_policy_versions` 테이블
    - 사용자별 최신 버전 동의 여부 추적

#### 감사
16. **로그 무결성 보장**
    - 로그 체인 해싱 (이전 로그 해시를 다음 로그에 포함)
    - 또는 외부 SIEM (Splunk, ELK) 전송

17. **알림 시스템 완성**
    - Slack Webhook 통합
    - 이메일 알림 (관리자)
    - 심각도별 알림 채널 분리

18. **감사 로그 조회 권한 제어**
    - `AuditLogController`에 `@RequirePermission('audit.view')` 추가
    - Super Admin만 접근 가능

### 5.3 장기 (6개월)

#### 보안
19. **보안 헤더 강화**
    - Strict-Transport-Security (HSTS)
    - X-Content-Type-Options: nosniff
    - Referrer-Policy: no-referrer

20. **취약점 스캐닝 자동화**
    - OWASP ZAP 또는 Snyk 통합
    - CI/CD 파이프라인에 보안 스캔 추가

21. **침입 탐지 시스템 (IDS)**
    - Fail2ban 또는 CloudFlare WAF
    - 자동 IP 차단 및 복구

22. **보안 감사 인증**
    - ISO 27001 준비
    - 외부 보안 감사 수행

#### 개인정보
23. **개인정보 영향 평가 (PIA)**
    - 정기적 PIA 수행 (연 1회)
    - 개인정보 흐름도 작성

24. **개인정보 암호화 범위 확대**
    - 주민등록번호, 전화번호 등 추가 필드 암호화
    - KMS (Key Management Service) 도입

25. **개인정보 처리자 교육**
    - 개발자 대상 개인정보보호 교육
    - GDPR/PIPA 준수 가이드라인

#### 감사
26. **대시보드 고도화**
    - Grafana/Kibana 통합
    - 실시간 보안 이벤트 모니터링
    - 공격 패턴 시각화

27. **로그 분석 AI**
    - 머신러닝 기반 이상 탐지
    - 공격 패턴 자동 학습

28. **로그 아카이빙 자동화**
    - S3 Glacier 또는 Cloud Storage
    - 1년 경과 로그 자동 아카이빙

---

## 6. 체크리스트

### 보안 체크리스트
- [x] 비밀번호 bcrypt 해싱
- [x] 비밀번호 강도 정책
- [ ] 비밀번호 재사용 방지
- [ ] 비밀번호 만료 정책
- [x] 레이트 리미팅 (Redis 기반)
- [x] IP 차단 (자동/수동)
- [ ] 계정 잠금 정책 명시
- [x] Helmet.js (CSP, Frame Guard)
- [x] CORS 화이트리스트
- [ ] CSRF 토큰
- [x] SQL Injection 감지
- [x] XSS 방어 (CSP)
- [ ] CSP 엄격화 (unsafe-inline 제거)
- [x] JWT 액세스/리프레시 토큰
- [ ] JWT 시크릿 강도 검증
- [ ] 토큰 블랙리스트
- [ ] Refresh Token Rotation
- [ ] 2FA (Two-Factor Authentication)

### 개인정보 체크리스트
- [x] 최소 수집 원칙
- [ ] 수집 근거 및 동의 관리
- [x] 비밀번호 암호화
- [ ] 이메일, 이름 등 PII 암호화
- [ ] 사업자정보 암호화
- [x] HTTPS 전송 암호화
- [x] API 응답 민감정보 제외
- [ ] 로그 마스킹
- [ ] 관리자 화면 마스킹
- [ ] 개인정보 보관 기간 정책
- [ ] Soft Delete vs Hard Delete 정책
- [ ] 탈퇴 처리 로직
- [ ] GDPR 데이터 이동권
- [ ] GDPR 삭제권
- [ ] PIPA 개인정보 처리방침
- [ ] 동의 이력 관리

### 감사 체크리스트
- [x] 로그인/로그아웃 추적
- [x] 권한 변경 추적
- [x] 민감정보 접근 추적
- [x] 역할 전환 추적
- [x] 관리자 작업 추적
- [x] IP, User Agent 기록
- [x] 변경 사유 기록
- [ ] 로그 보존 기간 정책
- [ ] 로그 조회 권한 제어
- [ ] 로그 무결성 보장 (해시/서명)
- [ ] 로그 변조 방지 (Append-only)
- [ ] 로그 DB 영속화 (SecurityAuditService)
- [ ] 실시간 알림 (Slack/이메일)
- [ ] 보안 대시보드 UI
- [ ] 로그 아카이빙

---

## 7. 결론

### 강점
1. **포괄적인 감사 로그 시스템**: 인증, 권한, 프로필, 보안 이벤트를 다층적으로 추적
2. **다층 레이트 리미팅**: Redis 기반 분산 레이트 리미팅, 스마트 패턴 감지
3. **강력한 비밀번호 정책**: bcrypt 해싱, 8자 이상 + 대소문자/숫자/특수문자
4. **SQL Injection 방어**: TypeORM + 패턴 감지 미들웨어
5. **보안 규칙 엔진**: 자동 IP 차단, 위험도 평가

### 주요 취약점
1. **개인정보 평문 저장**: 이메일, 이름, 사업자정보 암호화 없음
2. **JWT 시크릿 강도 미검증**: 약한 시크릿 사용 가능
3. **GDPR/PIPA 미준수**: 삭제권, 데이터 이동권, 동의 관리 부재
4. **로그 무결성 보장 부재**: 감사 로그 변조 가능
5. **토큰 블랙리스트 부재**: 탈취 토큰 즉시 무효화 불가

### 우선순위 개선 작업
1. **즉시**: JWT 시크릿 검증, 토큰 블랙리스트, CSRF 방어 강화
2. **1개월**: 개인정보 암호화, 동의 관리, 로그 영속화
3. **3개월**: GDPR 삭제권, 데이터 내보내기, 로그 무결성
4. **6개월**: 2FA, 보안 감사 인증, 대시보드 고도화

---

**문서 버전**: 1.0
**마지막 업데이트**: 2025-11-08
**담당자**: Security Audit Team
**다음 검토 예정**: 2025-12-08
