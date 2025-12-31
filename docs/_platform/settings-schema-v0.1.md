# Platform Settings Schema v0.1

> O4O 플랫폼 설정(Settings) 정의 및 분류 체계

**Version:** 0.1  
**Date:** 2025-12-24  
**Status:** Draft

---

## 개요

이 문서는 O4O 플랫폼에서 **'설정(Settings)'으로 인정되는 항목의 범위와 구조**를 공식적으로 선언합니다.

### 목적

1. **설정의 범위 명확화**: 무엇이 설정이고, 무엇이 설정이 아닌지 구분
2. **계층별 설정 분류**: Platform / Service / App 레벨 설정 구분
3. **설정 속성 정의**: 각 설정의 scope, mutability, visibility, sensitivity 명시
4. **구현 독립성**: 구현 방식(DB, UI, API)과 독립적인 개념 계층 정의

### 비-목적 (이 문서가 다루지 않는 것)

- ❌ 설정 저장 방식 (DB 스키마, 파일 형식)
- ❌ 설정 UI 디자인
- ❌ 설정 API 엔드포인트 설계
- ❌ 설정값 검증 로직

---

## 설정(Settings)의 정의

### 설정으로 인정되는 항목

다음 조건을 **모두** 만족하는 항목만 설정으로 인정됩니다:

1. **운영 중 변경 가능**: 코드 배포 없이 값을 변경할 수 있어야 함
2. **시스템 동작 영향**: 변경 시 시스템의 동작이나 정책이 달라짐
3. **영속성**: 변경된 값이 저장되고 재시작 후에도 유지됨
4. **명시적 관리 필요**: 운영자 또는 관리자가 의도적으로 관리해야 하는 값

### 설정이 아닌 항목

다음은 설정으로 간주하지 **않습니다**:

| 항목 유형 | 이유 | 예시 |
|---------|------|------|
| **환경 변수** | 배포 시점에 결정, 런타임 변경 불가 | `NODE_ENV`, `DATABASE_URL` |
| **하드코딩된 상수** | 코드 변경 필요 | `MAX_UPLOAD_SIZE = 10MB` |
| **사용자 데이터** | 사용자별 데이터, 설정이 아님 | 사용자 프로필, 주문 내역 |
| **일시적 상태** | 영속성 없음 | 세션 데이터, 캐시 |
| **계산된 값** | 다른 값으로부터 도출 | 총액 = 가격 × 수량 |
| **시스템 메타데이터** | 시스템이 자동 관리 | 생성일시, 수정일시 |

---

## 설정 계층 구조

O4O 플랫폼의 설정은 3개 계층으로 구분됩니다:

```
Platform Settings (플랫폼 설정)
  ↓ 상속/제약
Service Settings (서비스 설정)
  ↓ 상속/제약
App Settings (앱 설정)
```

---

## 1. Platform Settings (플랫폼 설정)

### 정의

**전체 플랫폼에 공통으로 적용**되는 설정으로, 모든 서비스와 앱이 따라야 하는 기준입니다.

### 속성

| 속성 | 값 | 설명 |
|------|-----|------|
| **Scope** | Global | 전체 플랫폼 |
| **Mutability** | Admin Only | 플랫폼 관리자만 변경 가능 |
| **Visibility** | Public | 모든 서비스/앱에서 참조 가능 |
| **Sensitivity** | High | 변경 시 전체 시스템 영향 |

### 예시

#### 1.1 인증 정책

```yaml
Platform.Auth.SessionTimeout: 3600  # 초 단위
Platform.Auth.PasswordMinLength: 8
Platform.Auth.MFA.Required: false
Platform.Auth.AllowedLoginMethods: ["email", "phone", "social"]
```

#### 1.2 파일 업로드 정책

```yaml
Platform.Upload.MaxFileSize: 10485760  # 10MB in bytes
Platform.Upload.AllowedExtensions: ["jpg", "png", "pdf", "docx"]
Platform.Upload.ScanForVirus: true
```

#### 1.3 운영 정책

```yaml
Platform.Maintenance.Mode: false
Platform.Maintenance.Message: "시스템 점검 중입니다"
Platform.Logging.Level: "info"  # debug, info, warn, error
Platform.RateLimit.Global: 1000  # requests per minute
```

#### 1.4 다국어 정책

```yaml
Platform.Localization.DefaultLanguage: "ko"
Platform.Localization.SupportedLanguages: ["ko", "en", "ja"]
Platform.Localization.Timezone: "Asia/Seoul"
```

---

## 2. Service Settings (서비스 설정)

### 정의

**특정 서비스에만 적용**되는 설정으로, 해당 서비스의 모든 앱이 공유합니다.

### 속성

| 속성 | 값 | 설명 |
|------|-----|------|
| **Scope** | Service | 특정 서비스 내 |
| **Mutability** | Service Admin | 서비스 관리자가 변경 가능 |
| **Visibility** | Service-wide | 해당 서비스의 모든 앱에서 참조 가능 |
| **Sensitivity** | Medium | 변경 시 해당 서비스 영향 |

### 예시

#### 2.1 Cosmetics Service Settings

```yaml
Service.Cosmetics.Consultation.DefaultDuration: 30  # 분 단위
Service.Cosmetics.Consultation.MaxPerDay: 10
Service.Cosmetics.Sample.MaxPerOrder: 3
Service.Cosmetics.Sample.RequireConsultation: true
Service.Cosmetics.Display.AutoRotateInterval: 15  # 초 단위
```

#### 2.2 Yaksa Service Settings

```yaml
Service.Yaksa.Notification.DefaultChannel: "sms"  # sms, email, push
Service.Yaksa.Notification.BatchTime: "09:00"
Service.Yaksa.Membership.AutoRenewal: true
Service.Yaksa.Membership.GracePeriod: 7  # 일 단위
Service.Yaksa.Scheduler.Enabled: true
```

#### 2.3 E-commerce Service Settings

```yaml
Service.Ecommerce.Order.MinAmount: 10000  # 최소 주문 금액
Service.Ecommerce.Order.FreeShippingThreshold: 50000
Service.Ecommerce.Payment.AllowedMethods: ["card", "transfer", "virtual"]
Service.Ecommerce.Refund.AutoApproveUnder: 30000  # 자동 승인 금액
```

---

## 3. App Settings (앱 설정)

### 정의

**특정 앱에만 적용**되는 설정으로, 해당 앱의 동작을 제어합니다.

### 속성

| 속성 | 값 | 설명 |
|------|-----|------|
| **Scope** | App | 특정 앱 내 |
| **Mutability** | App Admin / Operator | 앱 관리자 또는 운영자가 변경 가능 |
| **Visibility** | App-only | 해당 앱에서만 참조 가능 |
| **Sensitivity** | Low | 변경 시 해당 앱만 영향 |

### 예시

#### 3.1 Cosmetics Signage App

```yaml
App.Cosmetics.Signage.Display.Layout: "grid"  # grid, carousel, list
App.Cosmetics.Signage.Display.ItemsPerPage: 6
App.Cosmetics.Signage.Display.AutoPlay: true
App.Cosmetics.Signage.Display.TransitionEffect: "fade"
```

#### 3.2 Yaksa Membership App

```yaml
App.Yaksa.Membership.Dashboard.DefaultView: "overview"
App.Yaksa.Membership.Dashboard.ShowExpiredMembers: false
App.Yaksa.Membership.Notification.ReminderDays: [7, 3, 1]  # 만료 전 알림
```

#### 3.3 E-commerce Cart App

```yaml
App.Ecommerce.Cart.SessionTimeout: 1800  # 30분
App.Ecommerce.Cart.SaveForLater: true
App.Ecommerce.Cart.MaxItems: 100
App.Ecommerce.Cart.ShowRecommendations: true
```

---

## 설정 속성 상세 정의

### Scope (범위)

설정이 적용되는 범위:

- **Global**: 전체 플랫폼
- **Service**: 특정 서비스
- **App**: 특정 앱

### Mutability (변경 가능성)

누가 설정을 변경할 수 있는가:

- **Admin Only**: 플랫폼 관리자만 변경 가능
- **Service Admin**: 서비스 관리자가 변경 가능
- **App Admin**: 앱 관리자가 변경 가능
- **Operator**: 운영자가 변경 가능
- **Read-only**: 변경 불가 (참조만 가능)

### Visibility (가시성)

누가 설정을 읽을 수 있는가:

- **Public**: 모든 서비스/앱에서 참조 가능
- **Service-wide**: 해당 서비스의 모든 앱에서 참조 가능
- **App-only**: 해당 앱에서만 참조 가능
- **Admin-only**: 관리자만 조회 가능

### Sensitivity (민감도)

설정 변경의 영향 범위:

- **High**: 전체 시스템에 영향 (신중한 변경 필요)
- **Medium**: 서비스 또는 여러 앱에 영향
- **Low**: 특정 앱에만 영향
- **Critical**: 시스템 안정성에 직접 영향 (변경 시 승인 필요)

---

## 설정 명명 규칙

### 형식

```
{Level}.{Domain}.{Category}.{Name}
```

### 예시

```yaml
Platform.Auth.Session.Timeout          # 플랫폼 > 인증 > 세션 > 타임아웃
Service.Cosmetics.Sample.MaxPerOrder   # 서비스 > 화장품 > 샘플 > 주문당 최대
App.Yaksa.Dashboard.DefaultView        # 앱 > 약사 > 대시보드 > 기본 뷰
```

### 규칙

1. **계층 명시**: 첫 번째 세그먼트는 반드시 `Platform`, `Service`, `App` 중 하나
2. **도메인 명시**: Service/App 레벨은 서비스/앱 이름 포함
3. **카테고리 그룹화**: 관련 설정은 동일 카테고리로 그룹화
4. **명확한 이름**: 설정의 목적이 명확히 드러나야 함
5. **PascalCase 사용**: 각 세그먼트는 PascalCase

---

## 설정 상속 및 오버라이드

### 상속 규칙

```
Platform Settings
  ↓ (상속)
Service Settings (Platform 설정 상속 + Service 고유 설정)
  ↓ (상속)
App Settings (Service 설정 상속 + App 고유 설정)
```

### 오버라이드 규칙

- **Platform 설정**: 오버라이드 불가 (모든 서비스/앱이 따라야 함)
- **Service 설정**: 앱에서 오버라이드 가능 (단, 명시적으로 허용된 경우만)
- **App 설정**: 오버라이드 불가 (앱 내에서만 유효)

### 예시

```yaml
# Platform에서 정의
Platform.Upload.MaxFileSize: 10485760  # 10MB

# Service에서 오버라이드 시도 (불가)
# Service.Cosmetics.Upload.MaxFileSize: 20971520  # ❌ 오류

# App에서 Platform 설정 참조 (가능)
# App은 Platform.Upload.MaxFileSize를 그대로 사용
```

---

## 설정 변경 정책

### 변경 절차

1. **변경 요청**: 설정 변경 사유 및 영향 범위 명시
2. **영향 분석**: 변경 시 영향받는 서비스/앱 확인
3. **승인**: Sensitivity에 따라 승인 필요
   - **Critical/High**: 플랫폼 아키텍트 승인 필요
   - **Medium**: 서비스 오너 승인 필요
   - **Low**: 앱 관리자 승인으로 충분
4. **변경 적용**: 설정 변경
5. **모니터링**: 변경 후 시스템 동작 확인

### 변경 이력 관리

모든 설정 변경은 다음 정보를 기록해야 합니다:

- 변경 일시
- 변경자
- 변경 전 값
- 변경 후 값
- 변경 사유

---

## 설정 검증 규칙

### 필수 검증

모든 설정은 다음을 검증해야 합니다:

1. **타입 검증**: 설정값이 올바른 타입인가? (number, string, boolean, array)
2. **범위 검증**: 설정값이 허용된 범위 내인가?
3. **의존성 검증**: 다른 설정과의 의존성이 충족되는가?
4. **일관성 검증**: 관련 설정들이 서로 모순되지 않는가?

### 예시

```yaml
# 타입 검증
Platform.Auth.SessionTimeout: 3600  # ✅ number
Platform.Auth.SessionTimeout: "1 hour"  # ❌ string (number 필요)

# 범위 검증
Platform.Auth.PasswordMinLength: 8  # ✅ 유효 범위 (4-32)
Platform.Auth.PasswordMinLength: 100  # ❌ 범위 초과

# 의존성 검증
Platform.Auth.MFA.Required: true
Platform.Auth.MFA.Method: "totp"  # ✅ MFA 활성화 시 Method 필수

# 일관성 검증
Service.Cosmetics.Sample.MaxPerOrder: 3
Service.Cosmetics.Sample.RequireConsultation: true  # ✅ 일관성 유지
```

---

## 설정 문서화 요구사항

각 설정은 다음 정보를 문서화해야 합니다:

| 항목 | 필수 | 설명 |
|------|------|------|
| **Name** | ✅ | 설정 이름 (명명 규칙 준수) |
| **Description** | ✅ | 설정의 목적 및 동작 설명 |
| **Type** | ✅ | 데이터 타입 (number, string, boolean, array, object) |
| **Default** | ✅ | 기본값 |
| **Range/Options** | ⚠️ | 허용 범위 또는 선택지 (해당 시) |
| **Scope** | ✅ | Platform / Service / App |
| **Mutability** | ✅ | 누가 변경 가능한가 |
| **Visibility** | ✅ | 누가 참조 가능한가 |
| **Sensitivity** | ✅ | 변경 영향도 |
| **Dependencies** | ⚠️ | 다른 설정과의 의존성 (해당 시) |
| **Examples** | ⚠️ | 사용 예시 (권장) |

---

## 향후 확장 계획

### v0.2 예정 항목

- **동적 설정**: 런타임에 즉시 반영되는 설정
- **조건부 설정**: 특정 조건에서만 활성화되는 설정
- **설정 템플릿**: 서비스/앱 생성 시 기본 설정 템플릿
- **설정 마이그레이션**: 설정 스키마 변경 시 마이그레이션 전략

### v1.0 예정 항목

- **설정 UI 가이드라인**: 설정 UI 구현 시 따라야 할 가이드라인
- **설정 API 스펙**: 설정 CRUD API 표준 스펙
- **설정 저장소 전략**: 설정 저장 방식 (DB, 파일, 환경변수) 선택 가이드

---

## 부록: 설정 체크리스트

새로운 설정을 추가할 때 다음을 확인하세요:

- [ ] 이 항목이 설정 정의를 만족하는가?
- [ ] 올바른 계층(Platform/Service/App)에 배치되었는가?
- [ ] 명명 규칙을 준수하는가?
- [ ] 4가지 속성(Scope, Mutability, Visibility, Sensitivity)이 정의되었는가?
- [ ] 기본값이 설정되었는가?
- [ ] 타입 및 범위 검증 규칙이 정의되었는가?
- [ ] 다른 설정과의 의존성이 명시되었는가?
- [ ] 문서화 요구사항을 충족하는가?

---

*Version: 0.1*  
*Last Updated: 2025-12-24*  
*Owner: Platform Architecture Team*
