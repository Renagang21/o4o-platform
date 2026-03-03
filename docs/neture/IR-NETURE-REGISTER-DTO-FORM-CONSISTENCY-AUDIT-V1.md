# IR-NETURE-REGISTER-DTO-FORM-CONSISTENCY-AUDIT-V1

> **유형**: 구조 조사 (Investigation Report)
> **범위**: Neture 가입(Register) 4계층 필드 정합성 감사
> **일자**: 2026-02-28
> **상태**: 100% 구조 조사 전용 — 수정 제안 없음

---

## 개요

Neture 가입 과정의 4계층을 비교 분석한다:

1. **프론트엔드** — `services/web-neture/src/pages/RegisterPage.tsx`
2. **DTO** — `apps/api-server/src/modules/auth/dto/register.dto.ts`
3. **Controller** — `apps/api-server/src/modules/auth/controllers/auth.controller.ts` (`register()`)
4. **DB** — `apps/api-server/src/modules/auth/entities/User.ts` + `BusinessInfo` JSON

---

## 1. 프론트엔드 ↔ DTO 필드 비교표

### 1-1. 프론트엔드 전송 필드 (RegisterPage.tsx)

| # | 프론트 필드명 | 타입 | 필수 | 전송 시 키 |
|---|-------------|------|------|-----------|
| 1 | `email` | string | ✅ | `email` |
| 2 | `password` | string | ✅ | `password` |
| 3 | `passwordConfirm` | string | ✅ | `passwordConfirm` |
| 4 | `name` | string | ✅ | `name` |
| 5 | `phone` | string | ✅ | `phone` |
| 6 | `companyName` | string | ✅ | `companyName` |
| 7 | `businessNumber` | string | ✅ | `businessNumber` |
| 8 | `businessType` | string | ✅ | `businessType` |
| 9 | `agreeTerms` | boolean | ✅ | `agreeTerms` |
| 10 | `agreePrivacy` | boolean | ✅ | `agreePrivacy` |
| 11 | `agreeMarketing` | boolean | ❌ | `agreeMarketing` |
| 12 | — (자동) | string | ✅ | `role` (selectedRole) |
| 13 | — (자동) | string | ✅ | `service` ('neture') |

> **API 호출**: `POST /api/v1/auth/register` body = `{ ...formData, phone, role: selectedRole, service: 'neture' }`

### 1-2. DTO 정의 필드 (register.dto.ts)

| # | DTO 필드명 | 데코레이터 | 필수 | 비고 |
|---|-----------|-----------|------|------|
| 1 | `email` | `@IsEmail` | ✅ | |
| 2 | `password` | `@IsString @MinLength(8)` | ✅ | |
| 3 | `passwordConfirm` | `@IsString` | ✅ | |
| 4 | `lastName` | `@IsString @MinLength(1)` | ✅ | 프론트에서 미전송 |
| 5 | `firstName` | `@IsString @MinLength(1)` | ✅ | 프론트에서 미전송 |
| 6 | `nickname` | `@IsString @MinLength(2)` | ✅ | 프론트에서 미전송 |
| 7 | `tos` | `@IsBoolean` | ✅ | 프론트는 `agreeTerms` |
| 8 | `phone` | `@IsOptional @IsString` | ❌ | |
| 9 | `role` | `@IsOptional @IsString` | ❌ | |
| 10 | `service` | `@IsOptional @IsString` | ❌ | |
| 11 | `membershipType` | `@IsOptional @IsString` | ❌ | Neture 미사용 |
| 12 | `licenseNumber` | `@IsOptional @IsString` | ❌ | Neture 미사용 |
| 13 | `universityName` | `@IsOptional @IsString` | ❌ | Neture 미사용 |
| 14 | `studentYear` | `@IsOptional @IsNumber` | ❌ | Neture 미사용 |
| 15 | `organizationId` | `@IsOptional @IsUUID` | ❌ | Neture 미사용 |
| 16 | `pharmacistFunction` | `@IsOptional @IsString` | ❌ | Neture 미사용 |
| 17 | `pharmacistRole` | `@IsOptional @IsString` | ❌ | Neture 미사용 |
| 18 | `businessName` | `@IsOptional @IsString` | ❌ | 프론트는 `companyName` |
| 19 | `businessNumber` | `@IsOptional @IsString` | ❌ | |
| 20 | `privacyAccepted` | `@IsOptional @IsBoolean` | ❌ | 프론트는 `agreePrivacy` |
| 21 | `marketingAccepted` | `@IsOptional @IsBoolean` | ❌ | 프론트는 `agreeMarketing` |

### 1-3. 프론트 ↔ DTO 직접 비교

| 프론트 필드 | DTO 필드 | 일치 여부 | 설명 |
|-----------|---------|----------|------|
| `email` | `email` | ✅ 일치 | |
| `password` | `password` | ✅ 일치 | |
| `passwordConfirm` | `passwordConfirm` | ✅ 일치 | |
| `name` | `lastName` + `firstName` | 🔴 불일치 | 프론트는 단일 `name`, DTO는 `lastName`(필수) + `firstName`(필수) 분리 |
| — | `nickname` | 🔴 누락 | DTO 필수(@MinLength(2))이나 프론트에서 전송하지 않음 |
| `phone` | `phone` | ✅ 일치 | |
| `companyName` | `businessName` | 🟡 키 불일치 | 의미 동일, 필드명 상이 |
| `businessNumber` | `businessNumber` | ✅ 일치 | |
| `businessType` | — | 🟡 DTO 부재 | DTO에 `businessType` 필드 없음 |
| `agreeTerms` | `tos` | 🟡 키 불일치 | 의미 동일, 필드명 상이 |
| `agreePrivacy` | `privacyAccepted` | 🟡 키 불일치 | 의미 동일, 필드명 상이 |
| `agreeMarketing` | `marketingAccepted` | 🟡 키 불일치 | 의미 동일, 필드명 상이 |
| `role` | `role` | ✅ 일치 | |
| `service` | `service` | ✅ 일치 | |

---

## 2. DTO ↔ Controller ↔ DB 매핑표

### 2-1. Controller 매핑 로직 (auth.controller.ts `register()`)

Controller는 **DTO 검증 없이** `req.body as RegisterRequestDto` 타입 단언을 사용한다.
class-validator 데코레이터가 정의되어 있으나 **런타임에 실행되지 않는다**.

```typescript
// auth.controller.ts:282
const data = req.body as RegisterRequestDto;  // 타입 단언만 — 런타임 검증 없음
```

### 2-2. Controller → User 엔티티 매핑 상세

| DTO 필드 | Controller 변환 | User 엔티티 컬럼 | DB 타입 | 비고 |
|---------|---------------|----------------|---------|------|
| `email` | `data.email` | `email` | varchar (unique) | |
| `password` | `bcrypt.hash(data.password, 10)` | `password` | varchar | 해시 저장 |
| `lastName` | `data.lastName` | `lastName` | varchar (nullable) | 프론트 미전송 → `undefined` |
| `firstName` | `data.firstName` | `firstName` | varchar (nullable) | 프론트 미전송 → `undefined` |
| `lastName`+`firstName` | `` `${data.lastName}${data.firstName}` `` | `name` | varchar (default '운영자') | 프론트 미전송 시 `"undefinedundefined"` |
| `nickname` | `data.nickname` | `nickname` | varchar (nullable) | 프론트 미전송 → `undefined` → NULL |
| `phone` | `data.phone` | `phone` | varchar (nullable) | |
| `service` | `data.service` | `serviceKey` | varchar (nullable) | 키 변환: service → serviceKey |
| — | 하드코딩 | `status` | enum | `UserStatus.PENDING` 고정 |
| — | 하드코딩 | `isActive` | boolean | `true` 고정 |
| `tos` | — | — | — | Controller에서 사용하지 않음 (저장 안 됨) |
| `privacyAccepted` | — | — | — | Controller에서 사용하지 않음 |
| `marketingAccepted` | — | — | — | Controller에서 사용하지 않음 |

### 2-3. BusinessInfo JSON 매핑

Controller는 `licenseNumber`, `businessName`, `businessNumber` 중 하나라도 있으면 `businessInfo` JSON으로 조립한다:

```typescript
// auth.controller.ts 내 businessInfo 조립 로직
if (data.licenseNumber || data.businessName || data.businessNumber) {
  user.businessInfo = {
    licenseNumber: data.licenseNumber,
    businessName: data.businessName,
    businessNumber: data.businessNumber,
  };
}
```

| DTO 필드 | BusinessInfo 키 | DB 저장 | 비고 |
|---------|----------------|---------|------|
| `businessName` | `businessName` | `businessInfo->businessName` | 프론트는 `companyName`으로 전송 → `businessName`은 undefined |
| `businessNumber` | `businessNumber` | `businessInfo->businessNumber` | 프론트 키 일치 → 정상 저장 |
| `licenseNumber` | `licenseNumber` | `businessInfo->licenseNumber` | Neture 프론트 미전송 |

> **BusinessInfo 타입 정의** (`types/user.ts`):
> `businessName`, `businessNumber`, `businessType`, `ceoName`, `address`, `businessRegistrationUrl`, `onlineBusinessNumber`, `onlineBusinessRegistrationUrl`

### 2-4. Role Assignment 매핑

```typescript
// auth.controller.ts — 트랜잭션 외부에서 실행
if (data.role && data.service) {
  const roleString = `${data.service}:${data.role}`;
  // role_assignments 테이블에 INSERT
}
```

| DTO 필드 | 조합 | 저장 위치 | 비고 |
|---------|------|----------|------|
| `role` + `service` | `"neture:supplier"` 또는 `"neture:partner"` | `role_assignments.role` | 트랜잭션 외부 — 실패해도 사용자 생성은 완료 |

---

## 3. 정합성 문제 리스트

### 🔴 HIGH — 데이터 손실 또는 의도치 않은 값 저장

| # | 문제 | 계층 | 영향 |
|---|------|------|------|
| H-1 | **`name` vs `lastName`+`firstName` 불일치** | Front → DTO → Controller | 프론트는 `name` 단일 필드 전송. Controller는 `data.lastName` + `data.firstName`을 결합하여 `user.name`에 저장. 프론트에서 `lastName`/`firstName` 미전송 → `user.name`에 `"undefinedundefined"` 문자열 저장 가능. `user.lastName`/`user.firstName`은 `undefined` → NULL 저장. |
| H-2 | **`nickname` 필수인데 미전송** | Front → DTO | DTO에서 `@IsString @MinLength(2)` 필수 데코레이터. 프론트에서 전혀 전송하지 않음. class-validator가 런타임에 미실행이므로 오류 없이 통과 → `user.nickname = undefined` → NULL 저장. |
| H-3 | **`companyName` vs `businessName` 키 불일치** | Front → DTO → Controller | 프론트는 `companyName`으로 전송, DTO/Controller는 `businessName`으로 읽음. `data.businessName`은 undefined → `businessInfo.businessName`에 undefined 저장. 프론트의 `companyName` 값은 유실. |
| H-4 | **class-validator 런타임 미실행** | Controller | `req.body as RegisterRequestDto` 타입 단언만 사용. DTO에 정의된 `@IsEmail`, `@MinLength`, `@IsBoolean` 등 모든 검증 데코레이터가 런타임에 작동하지 않음. 유효하지 않은 데이터가 그대로 DB에 도달. |

### 🟡 MEDIUM — 필드 유실 또는 불명확한 동작

| # | 문제 | 계층 | 영향 |
|---|------|------|------|
| M-1 | **`agreeTerms` vs `tos` 키 불일치** | Front → DTO | 프론트는 `agreeTerms` 전송, DTO는 `tos` 필드 정의. `data.tos`는 undefined. Controller에서 `tos`를 사용하지 않으므로 실질적 영향은 없으나, 약관 동의 여부가 어디에도 기록되지 않음. |
| M-2 | **`agreePrivacy` vs `privacyAccepted` 키 불일치** | Front → DTO | 프론트는 `agreePrivacy` 전송, DTO는 `privacyAccepted`. 마찬가지로 개인정보 동의 여부 미기록. |
| M-3 | **`agreeMarketing` vs `marketingAccepted` 키 불일치** | Front → DTO | 프론트는 `agreeMarketing` 전송, DTO는 `marketingAccepted`. 마케팅 동의 여부 미기록. |
| M-4 | **`businessType` DTO 부재** | Front → DTO | 프론트는 `businessType` 필드를 전송하지만 DTO에 해당 필드 정의 없음. BusinessInfo 타입에는 `businessType` 존재하나 Controller 조립 로직에서 참조하지 않음 → 값 유실. |
| M-5 | **동의 정보 미저장** | Controller → DB | `tos`, `privacyAccepted`, `marketingAccepted` 어느 것도 User 엔티티에 컬럼이 없고, Controller에서 저장 로직도 없음. 법적 동의 기록이 DB에 남지 않음. |

### 🟢 LOW — 기능상 무해하나 구조적 불일치

| # | 문제 | 계층 | 영향 |
|---|------|------|------|
| L-1 | **KPA 전용 필드가 DTO에 혼재** | DTO | `membershipType`, `licenseNumber`, `universityName`, `studentYear`, `organizationId`, `pharmacistFunction`, `pharmacistRole` — Neture 가입에서 전송하지 않는 KPA 전용 필드가 공유 DTO에 포함. 기능상 무해 (@IsOptional). |
| L-2 | **Role Assignment 트랜잭션 외부 실행** | Controller | 사용자 생성과 Role Assignment가 별도 트랜잭션. Role Assignment 실패 시 사용자는 생성되나 역할 없음 → 로그인 후 기능 접근 불가 (프론트 RoleGuard에서 차단). |
| L-3 | **`service` → `serviceKey` 키 변환** | Controller → DB | DTO 필드명 `service`, User 엔티티 컬럼명 `serviceKey`. Controller에서 `user.serviceKey = data.service`로 변환. 동작은 정상이나 네이밍 불일치. |

---

## 4. 위험 등급 분류 요약

| 등급 | 건수 | 핵심 특성 |
|------|------|----------|
| 🔴 HIGH | 4건 | 데이터 손실(`name`, `companyName`→`businessName`), 필수 필드 미전송(`nickname`), 검증 미실행(class-validator) |
| 🟡 MEDIUM | 5건 | 동의 정보 미기록(3건), 필드 유실(`businessType`), 약관 동의 미저장 |
| 🟢 LOW | 3건 | 공유 DTO 비대, 트랜잭션 분리, 네이밍 불일치 |

---

## 5. 데이터 흐름 요약도

```
[RegisterPage.tsx]
  │
  │  POST /api/v1/auth/register
  │  body: { email, password, passwordConfirm, name, phone,
  │          companyName, businessNumber, businessType,
  │          agreeTerms, agreePrivacy, agreeMarketing,
  │          role, service }
  │
  ▼
[auth.controller.ts register()]
  │  req.body as RegisterRequestDto  ← 타입 단언만 (검증 없음)
  │
  │  매핑:
  │    email       → user.email          ✅
  │    password    → bcrypt → user.password  ✅
  │    lastName    → user.lastName       ⚠️ undefined (프론트 미전송)
  │    firstName   → user.firstName      ⚠️ undefined (프론트 미전송)
  │    lastName+firstName → user.name    🔴 "undefinedundefined"
  │    nickname    → user.nickname       ⚠️ undefined → NULL
  │    phone       → user.phone          ✅
  │    service     → user.serviceKey     ✅ (키 변환)
  │    businessName → businessInfo.businessName  🔴 undefined (프론트는 companyName)
  │    businessNumber → businessInfo.businessNumber  ✅
  │    tos/privacyAccepted/marketingAccepted → ❌ 미저장
  │
  │    role+service → role_assignments.role  ✅ (트랜잭션 외부)
  │
  ▼
[User 엔티티 / users 테이블]
  email          : varchar (unique)     ← 정상
  password       : varchar              ← bcrypt hash
  name           : varchar              ← "undefinedundefined" 또는 default '운영자'
  firstName      : varchar (nullable)   ← NULL
  lastName       : varchar (nullable)   ← NULL
  nickname       : varchar (nullable)   ← NULL
  phone          : varchar (nullable)   ← 정상
  serviceKey     : varchar (nullable)   ← 'neture'
  businessInfo   : jsonb (nullable)     ← { businessNumber: "...", businessName: undefined }
  status         : enum                 ← PENDING
  isActive       : boolean              ← true
```

---

## 참조 파일

| 계층 | 파일 경로 | 핵심 라인 |
|------|----------|----------|
| 프론트엔드 | `services/web-neture/src/pages/RegisterPage.tsx` | 전체 (643줄) |
| DTO | `apps/api-server/src/modules/auth/dto/register.dto.ts` | 전체 (117줄) |
| Controller | `apps/api-server/src/modules/auth/controllers/auth.controller.ts` | 282-401 |
| User 엔티티 | `apps/api-server/src/modules/auth/entities/User.ts` | 전체 (306줄) |
| BusinessInfo 타입 | `apps/api-server/src/types/user.ts` | BusinessInfo interface |
| 인증 타입 | `apps/api-server/src/types/auth.ts` | UserStatus enum |

---

*Generated: 2026-02-28*
*Classification: Investigation Report — Read-Only*
*No code modifications, no refactoring suggestions, no migration designs, no Work Orders*
