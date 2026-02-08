# Platform Settings Storage & Ownership Strategy v0.2

> O4O 플랫폼 설정 저장 위치, 소유권, 보안 전략

**Version:** 0.2  
**Date:** 2025-12-24  
**Status:** Draft  
**Based on:** Settings Schema v0.1

---

## 개요

이 문서는 [Settings Schema v0.1](./settings-schema-v0.1.md)에서 정의한 설정 항목들의 **저장 위치**, **소유권**, **보안 처리 기준**을 정의합니다.

### 목적

1. **저장 위치 분류**: 각 설정이 환경변수(env), DB, 또는 Hybrid로 저장되는지 명시
2. **소유권 정의**: 각 설정을 누가 관리하고 변경할 수 있는지 명확화
3. **보안 기준 수립**: 민감 정보 암호화 및 접근 제어 정책 정의
4. **UI 접근 정책**: 관리자 UI에서 변경 가능한 설정과 불가능한 설정 구분

### 비-목적 (이 문서가 다루지 않는 것)

- ❌ DB 스키마 설계
- ❌ 암호화 알고리즘 구현
- ❌ UI 컴포넌트 설계
- ❌ API 엔드포인트 구현

---

## 저장 위치 분류

### 분류 기준

모든 설정은 다음 3가지 저장 위치 중 하나로 분류됩니다:

| 저장 위치 | 특징 | 변경 방식 | 적용 시점 |
|---------|------|---------|---------|
| **ENV** | 환경변수 파일 (.env) | 파일 수정 + 재시작 | 재시작 시 |
| **DB** | 데이터베이스 | 관리자 UI 또는 API | 즉시 또는 재시작 |
| **HYBRID** | ENV (기본값) + DB (오버라이드) | ENV 기본 + DB 우선 | DB 값 우선 |

---

## 저장 위치 결정 규칙

### ENV에 저장해야 하는 설정

다음 조건 중 **하나라도** 만족하면 ENV에 저장:

1. **인프라 의존성**: 데이터베이스 연결, 외부 서비스 URL 등
2. **부트스트랩 필수**: 시스템 시작 전에 필요한 설정
3. **환경별 차이**: Dev/Staging/Production 환경마다 다른 값
4. **보안 크리티컬**: API 키, 시크릿, 인증서 등
5. **불변성 요구**: 런타임 중 변경되면 안 되는 설정

**예시:**
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...
NODE_ENV=production
REDIS_URL=redis://...
```

### DB에 저장해야 하는 설정

다음 조건을 **모두** 만족하면 DB에 저장:

1. **런타임 변경 가능**: 재시작 없이 변경 가능해야 함
2. **관리자 UI 필요**: 비개발자도 변경할 수 있어야 함
3. **환경 독립적**: 모든 환경에서 동일한 값 사용
4. **비즈니스 로직**: 시스템 동작이 아닌 비즈니스 정책

**예시:**
```yaml
Platform.Auth.SessionTimeout: 3600
Service.Cosmetics.Sample.MaxPerOrder: 3
App.Yaksa.Dashboard.DefaultView: "overview"
```

### HYBRID로 저장해야 하는 설정

다음 조건을 **모두** 만족하면 HYBRID:

1. **기본값 필요**: ENV에 안전한 기본값 제공
2. **런타임 오버라이드**: DB에서 필요 시 변경 가능
3. **환경별 기본값**: 환경마다 다른 기본값이 필요하지만 런타임 변경도 필요

**예시:**
```bash
# .env (기본값)
PLATFORM_RATE_LIMIT_GLOBAL=1000

# DB (오버라이드)
Platform.RateLimit.Global: 1500  # ENV 값을 DB 값으로 오버라이드
```

---

## 설정별 저장 위치 매핑

### Platform Settings

#### 인증 정책 (Auth)

| 설정 | 저장 위치 | 이유 |
|------|---------|------|
| `Platform.Auth.SessionTimeout` | **DB** | 런타임 변경 가능, 비즈니스 정책 |
| `Platform.Auth.PasswordMinLength` | **DB** | 런타임 변경 가능, 보안 정책 |
| `Platform.Auth.MFA.Required` | **DB** | 런타임 변경 가능, 보안 정책 |
| `Platform.Auth.AllowedLoginMethods` | **DB** | 런타임 변경 가능, 비즈니스 정책 |
| `JWT_SECRET` | **ENV** | 보안 크리티컬, 환경별 차이 |
| `JWT_EXPIRATION` | **HYBRID** | ENV 기본값 + DB 오버라이드 |

#### 파일 업로드 정책 (Upload)

| 설정 | 저장 위치 | 이유 |
|------|---------|------|
| `Platform.Upload.MaxFileSize` | **DB** | 런타임 변경 가능, 비즈니스 정책 |
| `Platform.Upload.AllowedExtensions` | **DB** | 런타임 변경 가능, 보안 정책 |
| `Platform.Upload.ScanForVirus` | **DB** | 런타임 변경 가능, 보안 정책 |
| `UPLOAD_STORAGE_PATH` | **ENV** | 인프라 의존성, 환경별 차이 |
| `UPLOAD_STORAGE_TYPE` | **ENV** | 인프라 의존성 (local, s3, gcs) |

#### 운영 정책 (Maintenance, Logging)

| 설정 | 저장 위치 | 이유 |
|------|---------|------|
| `Platform.Maintenance.Mode` | **DB** | 런타임 즉시 변경 필요 |
| `Platform.Maintenance.Message` | **DB** | 런타임 변경 가능 |
| `Platform.Logging.Level` | **HYBRID** | ENV 기본값 + 런타임 변경 |
| `Platform.RateLimit.Global` | **HYBRID** | ENV 기본값 + 런타임 조정 |
| `LOG_FILE_PATH` | **ENV** | 인프라 의존성 |

#### 다국어 정책 (Localization)

| 설정 | 저장 위치 | 이유 |
|------|---------|------|
| `Platform.Localization.DefaultLanguage` | **DB** | 런타임 변경 가능 |
| `Platform.Localization.SupportedLanguages` | **DB** | 런타임 변경 가능 |
| `Platform.Localization.Timezone` | **DB** | 런타임 변경 가능 |

---

### Service Settings

#### Cosmetics Service

| 설정 | 저장 위치 | 이유 |
|------|---------|------|
| `Service.Cosmetics.Consultation.DefaultDuration` | **DB** | 비즈니스 정책, 런타임 변경 |
| `Service.Cosmetics.Consultation.MaxPerDay` | **DB** | 비즈니스 정책, 런타임 변경 |
| `Service.Cosmetics.Sample.MaxPerOrder` | **DB** | 비즈니스 정책, 런타임 변경 |
| `Service.Cosmetics.Sample.RequireConsultation` | **DB** | 비즈니스 정책, 런타임 변경 |
| `Service.Cosmetics.Display.AutoRotateInterval` | **DB** | UI 동작, 런타임 변경 |

#### Yaksa Service

| 설정 | 저장 위치 | 이유 |
|------|---------|------|
| `Service.Yaksa.Notification.DefaultChannel` | **DB** | 비즈니스 정책, 런타임 변경 |
| `Service.Yaksa.Notification.BatchTime` | **DB** | 운영 정책, 런타임 변경 |
| `Service.Yaksa.Membership.AutoRenewal` | **DB** | 비즈니스 정책, 런타임 변경 |
| `Service.Yaksa.Membership.GracePeriod` | **DB** | 비즈니스 정책, 런타임 변경 |
| `Service.Yaksa.Scheduler.Enabled` | **DB** | 운영 정책, 런타임 변경 |

#### E-commerce Service

| 설정 | 저장 위치 | 이유 |
|------|---------|------|
| `Service.Ecommerce.Order.MinAmount` | **DB** | 비즈니스 정책, 런타임 변경 |
| `Service.Ecommerce.Order.FreeShippingThreshold` | **DB** | 비즈니스 정책, 런타임 변경 |
| `Service.Ecommerce.Payment.AllowedMethods` | **DB** | 비즈니스 정책, 런타임 변경 |
| `Service.Ecommerce.Refund.AutoApproveUnder` | **DB** | 비즈니스 정책, 런타임 변경 |
| `PAYMENT_GATEWAY_API_KEY` | **ENV** | 보안 크리티컬, 환경별 차이 |

---

### App Settings

#### Cosmetics Signage App

| 설정 | 저장 위치 | 이유 |
|------|---------|------|
| `App.Cosmetics.Signage.Display.Layout` | **DB** | UI 동작, 런타임 변경 |
| `App.Cosmetics.Signage.Display.ItemsPerPage` | **DB** | UI 동작, 런타임 변경 |
| `App.Cosmetics.Signage.Display.AutoPlay` | **DB** | UI 동작, 런타임 변경 |
| `App.Cosmetics.Signage.Display.TransitionEffect` | **DB** | UI 동작, 런타임 변경 |

#### Yaksa Membership App

| 설정 | 저장 위치 | 이유 |
|------|---------|------|
| `App.Yaksa.Membership.Dashboard.DefaultView` | **DB** | UI 동작, 런타임 변경 |
| `App.Yaksa.Membership.Dashboard.ShowExpiredMembers` | **DB** | UI 동작, 런타임 변경 |
| `App.Yaksa.Membership.Notification.ReminderDays` | **DB** | 비즈니스 정책, 런타임 변경 |

#### E-commerce Cart App

| 설정 | 저장 위치 | 이유 |
|------|---------|------|
| `App.Ecommerce.Cart.SessionTimeout` | **DB** | 비즈니스 정책, 런타임 변경 |
| `App.Ecommerce.Cart.SaveForLater` | **DB** | 기능 토글, 런타임 변경 |
| `App.Ecommerce.Cart.MaxItems` | **DB** | 비즈니스 정책, 런타임 변경 |
| `App.Ecommerce.Cart.ShowRecommendations` | **DB** | 기능 토글, 런타임 변경 |

---

## 소유권 모델 (Ownership)

### 소유권 정의

각 설정은 명확한 **소유자(Owner)**와 **변경 권한(Mutability)**을 가집니다.

| 소유권 레벨 | 소유자 | 변경 권한 | 승인 필요 |
|-----------|-------|---------|---------|
| **Platform Owner** | 플랫폼 아키텍트 | Admin Only | Critical/High 설정 |
| **Service Owner** | 서비스 관리자 | Service Admin | Medium 설정 |
| **App Owner** | 앱 관리자 | App Admin | Low 설정 |
| **Operator** | 운영자 | Operator | Low 설정 (읽기 전용 가능) |

### 소유권 매핑

#### Platform Settings

| 설정 카테고리 | 소유자 | 변경 권한 | 이유 |
|------------|-------|---------|------|
| Auth | Platform Owner | Admin Only | 전체 시스템 보안 영향 |
| Upload | Platform Owner | Admin Only | 전체 시스템 보안 영향 |
| Maintenance | Platform Owner | Admin Only | 전체 시스템 가용성 영향 |
| Logging | Platform Owner | Admin Only | 전체 시스템 모니터링 영향 |
| Localization | Platform Owner | Admin Only | 전체 시스템 UX 영향 |

#### Service Settings

| 설정 카테고리 | 소유자 | 변경 권한 | 이유 |
|------------|-------|---------|------|
| Cosmetics.* | Service Owner (Cosmetics) | Service Admin | 해당 서비스만 영향 |
| Yaksa.* | Service Owner (Yaksa) | Service Admin | 해당 서비스만 영향 |
| Ecommerce.* | Service Owner (Ecommerce) | Service Admin | 해당 서비스만 영향 |

#### App Settings

| 설정 카테고리 | 소유자 | 변경 권한 | 이유 |
|------------|-------|---------|------|
| App.*.* | App Owner | App Admin / Operator | 해당 앱만 영향 |

---

## 보안 및 암호화 정책

### 민감 정보 분류

모든 설정은 민감도에 따라 분류됩니다:

| 민감도 | 정의 | 암호화 | 예시 |
|-------|------|-------|------|
| **Critical** | 노출 시 시스템 침해 가능 | 필수 (저장 + 전송) | API Key, Secret, Password |
| **High** | 노출 시 보안 위험 | 필수 (저장) | JWT Secret, DB Password |
| **Medium** | 노출 시 정보 유출 | 권장 | 이메일 주소, 전화번호 |
| **Low** | 노출 시 영향 없음 | 불필요 | UI 설정, 타임아웃 값 |

### 암호화 대상

#### ENV 설정 암호화

ENV 파일에 저장되는 민감 정보는 다음과 같이 처리:

| 설정 | 민감도 | 암호화 방식 |
|------|-------|-----------|
| `DATABASE_URL` | **High** | 환경변수 암호화 도구 사용 |
| `JWT_SECRET` | **Critical** | 환경변수 암호화 도구 사용 |
| `PAYMENT_GATEWAY_API_KEY` | **Critical** | 환경변수 암호화 도구 사용 |
| `REDIS_PASSWORD` | **High** | 환경변수 암호화 도구 사용 |

#### DB 설정 암호화

DB에 저장되는 민감 정보는 다음과 같이 처리:

| 설정 | 민감도 | 암호화 방식 |
|------|-------|-----------|
| `Platform.Auth.SessionTimeout` | **Low** | 암호화 불필요 |
| `Service.*.Notification.Email` | **Medium** | 컬럼 레벨 암호화 권장 |
| `App.*.API.Webhook.Secret` | **Critical** | 컬럼 레벨 암호화 필수 |

### 접근 제어

#### ENV 설정 접근

- **읽기**: 시스템 프로세스만 가능
- **쓰기**: 배포 프로세스 또는 인프라 관리자만 가능
- **UI 노출**: ❌ 불가 (보안상 이유)

#### DB 설정 접근

| 민감도 | 읽기 권한 | 쓰기 권한 | UI 노출 |
|-------|---------|---------|--------|
| **Critical** | Admin Only | Admin Only | ❌ 마스킹 처리 |
| **High** | Admin Only | Admin Only | ⚠️ 마스킹 처리 |
| **Medium** | Service/App Admin | Service/App Admin | ✅ 가능 |
| **Low** | Public | Service/App Admin | ✅ 가능 |

---

## UI 접근 정책

### 관리자 UI에서 변경 가능한 설정

다음 조건을 **모두** 만족하면 UI에서 변경 가능:

1. **저장 위치**: DB 또는 HYBRID
2. **민감도**: Medium 이하
3. **Mutability**: Admin, Service Admin, App Admin, Operator

#### 변경 가능 설정 예시

```yaml
# Platform Settings
Platform.Auth.SessionTimeout: 3600  # ✅ UI 변경 가능
Platform.Maintenance.Mode: false    # ✅ UI 변경 가능

# Service Settings
Service.Cosmetics.Sample.MaxPerOrder: 3  # ✅ UI 변경 가능

# App Settings
App.Yaksa.Dashboard.DefaultView: "overview"  # ✅ UI 변경 가능
```

### 관리자 UI에서 변경 불가능한 설정

다음 조건 중 **하나라도** 만족하면 UI에서 변경 불가:

1. **저장 위치**: ENV (HYBRID의 ENV 기본값 포함)
2. **민감도**: Critical 또는 High
3. **Mutability**: Read-only

#### 변경 불가 설정 예시

```bash
# ENV 설정 (UI 변경 불가)
DATABASE_URL=...  # ❌ ENV, 인프라 의존성
JWT_SECRET=...    # ❌ ENV, Critical 민감도
```

---

## ENV 예외 규칙

### ENV에 남겨야 하는 설정

다음 설정은 **반드시** ENV에 유지:

#### 1. 인프라 연결 정보

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
ELASTICSEARCH_URL=http://...
```

**이유**: 시스템 부트스트랩 전에 필요, DB 연결 없이 접근 불가

#### 2. 보안 크리티컬 정보

```bash
JWT_SECRET=...
ENCRYPTION_KEY=...
API_SECRET_KEY=...
```

**이유**: 노출 시 시스템 침해 가능, 환경별로 다른 값 사용

#### 3. 환경 구분자

```bash
NODE_ENV=production
APP_ENV=staging
DEBUG=false
```

**이유**: 배포 환경 구분, 조건부 로직 실행

#### 4. 외부 서비스 인증 정보

```bash
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
PAYMENT_GATEWAY_API_KEY=...
SMTP_PASSWORD=...
```

**이유**: 외부 서비스 연동, 환경별 차이

### ENV에서 DB로 이동 가능한 설정

다음 조건을 **모두** 만족하면 ENV → DB 이동 가능:

1. **인프라 독립적**: DB 연결 후에도 사용 가능
2. **보안 영향 낮음**: 노출되어도 시스템 침해 불가
3. **런타임 변경 필요**: 재시작 없이 변경 가능해야 함
4. **환경 독립적**: 모든 환경에서 동일한 값 사용

#### 이동 가능 예시

```bash
# ENV (기존)
SESSION_TIMEOUT=3600
MAX_UPLOAD_SIZE=10485760

# DB (이동 후)
Platform.Auth.SessionTimeout: 3600
Platform.Upload.MaxFileSize: 10485760
```

---

## HYBRID 설정 동작 방식

### 우선순위 규칙

HYBRID 설정은 다음 우선순위로 값을 결정:

```
1. DB 값 (최우선)
   ↓ (DB 값 없으면)
2. ENV 값 (기본값)
   ↓ (ENV 값 없으면)
3. 코드 하드코딩 기본값 (최후)
```

### 예시

```bash
# .env
PLATFORM_RATE_LIMIT_GLOBAL=1000
```

```yaml
# DB (settings 테이블)
Platform.RateLimit.Global: 1500
```

**결과**: `1500` (DB 값 우선)

### HYBRID 설정 변경 절차

1. **긴급 변경**: DB에서 즉시 변경 → 재시작 없이 적용
2. **영구 변경**: ENV 파일 수정 → 다음 배포 시 적용
3. **롤백**: DB 값 삭제 → ENV 기본값으로 복귀

---

## 설정 마이그레이션 전략

### ENV → DB 마이그레이션

ENV에서 DB로 이동 시 다음 절차를 따름:

1. **DB 스키마 준비**: settings 테이블에 컬럼 추가
2. **ENV 값 마이그레이션**: 기존 ENV 값을 DB에 복사
3. **코드 변경**: ENV 읽기 → DB 읽기로 변경
4. **검증**: 모든 환경에서 동작 확인
5. **ENV 제거**: ENV 파일에서 해당 항목 삭제

### DB → ENV 마이그레이션 (롤백)

DB에서 ENV로 복귀 시:

1. **ENV 파일 추가**: 현재 DB 값을 ENV에 추가
2. **코드 변경**: DB 읽기 → ENV 읽기로 변경
3. **배포**: 모든 환경에 배포
4. **DB 정리**: DB에서 해당 설정 제거

---

## 설정 저장소 요약

### 저장 위치별 설정 수

| 저장 위치 | Platform | Service | App | 합계 |
|---------|---------|---------|-----|------|
| **ENV** | 5-10개 | 0-2개 | 0-1개 | ~10개 |
| **DB** | 10-15개 | 10-20개 | 5-10개 | ~40개 |
| **HYBRID** | 2-5개 | 0-2개 | 0개 | ~5개 |

### 민감도별 설정 수

| 민감도 | ENV | DB | HYBRID | 합계 |
|-------|-----|-----|--------|------|
| **Critical** | 5개 | 0개 | 0개 | 5개 |
| **High** | 3개 | 2개 | 1개 | 6개 |
| **Medium** | 1개 | 10개 | 1개 | 12개 |
| **Low** | 1개 | 28개 | 3개 | 32개 |

---

## 부록: 설정 저장 위치 체크리스트

새로운 설정 추가 시 다음을 확인:

- [ ] 이 설정이 Settings Schema v0.1의 정의를 만족하는가?
- [ ] 저장 위치(ENV/DB/HYBRID)가 결정되었는가?
- [ ] 민감도(Critical/High/Medium/Low)가 정의되었는가?
- [ ] 암호화 필요 여부가 결정되었는가?
- [ ] 소유자(Owner)가 명확한가?
- [ ] UI 접근 가능 여부가 결정되었는가?
- [ ] ENV 예외 규칙을 확인했는가?

---

*Version: 0.2*  
*Last Updated: 2025-12-24*  
*Owner: Platform Architecture Team*  
*Based on: Settings Schema v0.1*
