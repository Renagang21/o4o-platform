# IR-PLATFORM-CORE-01 Investigation Result Report

> **Investigation Request**: IR-PLATFORM-CORE-01  
> **Completed**: 2025-12-29  
> **Investigator**: Antigravity AI  
> **Type**: CGM Service Expansion Readiness Assessment

---

## Executive Summary

본 조사는 **혈당관리 약국 서비스 및 CGM 서비스(glucoseview)** 확장을 앞두고, 플랫폼 Core 레이어의 준비 상태를 평가했다.

### Overall Verdict

🟡 **PARTIAL - 선행 정리 필요**

플랫폼 Core는 **개념적으로는 CGM 서비스를 수용할 준비가 되어 있으나**, 다음 3가지 구조적 위험이 존재한다:

1. **Role 정의 방식의 이중성** (enum vs. string-based roles)
2. **약사/약국/환자 개념의 산재** (ServiceGroup에만 존재, Core에 없음)
3. **Organization-Core의 범용성 vs. 업종 특화** 경계 불명확

---

## 1. Core 준비도 평가표 (Preparedness Assessment)

| Core Module | 기능 준비도 | 역할·책임 경계 | 충돌 가능성 | 종합 판정 | 비고 |
|------------|------------|---------------|-----------|---------|------|
| **auth-core** | PASS | PARTIAL | PARTIAL | **PARTIAL** | 역할 정의 이중성 존재 |
| **organization-core** | PASS | PASS | PARTIAL | **PARTIAL** | 약국 Unit 모델링 가능하나 명시 없음 |
| **platform-core** | PASS | PASS | PASS | **PASS** | AppStore 분류 명확 |
| **appstore-core** | PASS | PASS | PARTIAL | **PARTIAL** | ServiceGroup 정의 존재하나 CGM 없음 |

---

## 2. Core별 상세 조사 결과

### 2.1 auth-core — 인증 & RBAC 시스템

**위치**: `packages/auth-core`

#### ✅ 기능 준비도: PASS

**발견 사항**:
- ✅ Users, Roles, Permissions 테이블 존재
- ✅ RBAC 구조 완비 (role_permissions, user_roles)
- ✅ 다중 역할 할당 지원 (user_roles 다대다 관계)

**CGM 관점**:
- 약사(pharmacist), 환자(patient) 역할을 **추가 정의 가능**
- 현재 `UserRole` enum에는 없지만, 확장 가능한 구조

#### 🟡 역할·책임 경계: PARTIAL

**문제점 발견**:

1. **Role 정의의 이중성**

```typescript
// apps/api-server/src/types/auth.ts
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  VENDOR = 'vendor',
  SELLER = 'seller',
  USER = 'user',
  BUSINESS = 'business',
  PARTNER = 'partner',
  SUPPLIER = 'supplier',
  MANAGER = 'manager',
  CUSTOMER = 'customer'  // Deprecated
}
```

👉 **약사(pharmacist), 환자(patient) 역할이 enum에 없음**

2. **ServiceGroup에서의 역할 정의**

```typescript
// apps/api-server/src/service-groups/index.ts (line 374)
yaksa: {
  ...
  defaultRoles: ['admin', 'pharmacist', 'member'],
}
```

👉 **'pharmacist'가 문자열로만 존재** (enum에 없음)

3. **실제 DB 마이그레이션**

```typescript
// apps/api-server/src/database/migrations/1733600000000-ExtendYaksaMemberFields.ts
// 약사 유형 (pharmacistType) 필드 존재
- 'working' / 'owner' / 'hospital' / 'public' / ...
```

👉 **약사 개념이 yaksa_members 테이블에만 존재**

**구조적 문제**:
- auth-core는 **범용 RBAC 시스템**으로 설계되어 "약사" 개념 없음
- ServiceGroup (yaksa)만 'pharmacist' 역할 정의
- 실제 약사 데이터는 **extension(yaksa_members)**에 존재

**CGM 영향**:
- CGM 서비스에서 "환자(patient)" 역할 필요 시 **동일한 이중성 발생**
- enum에 추가 vs. 문자열만 사용 **일관성 없음**

#### 🟡 충돌 가능성: PARTIAL

**충돌 시나리오**:

| 시나리오 | 위험도 | 설명 |
|---------|-------|------|
| 환자 역할 추가 | MEDIUM | `UserRole.PATIENT` 추가 시 기존 USER와 충돌 가능 |
| 약사 역할 정규화 | MEDIUM | 'pharmacist' enum 추가 시 yaksa 설정과 동기화 필요 |
| 권한 스코프 충돌 | LOW | Scope 네이밍 규칙 준수 시 충돌 없음 |

**권장 조치**:
1. ❗ **UserRole enum 정책 결정 필요**
   - Option A: 모든 도메인 역할을 enum에 추가 (`PHARMACIST`, `PATIENT`)
   - Option B: enum은 플랫폼 역할만, 도메인 역할은 문자열 허용
2. ⚠️ ServiceGroup `defaultRoles`과 enum 동기화 메커니즘 필요

---

### 2.2 organization-core — 조직 관리

**위치**: `packages/organization-core`

#### ✅ 기능 준비도: PASS

**발견 사항**:
- ✅ Organizations, OrganizationMembers, OrganizationUnits 테이블 존재
- ✅ 계층 구조 지원 (maxDepth: 5)
- ✅ 멤버 관리 시스템 완비

**CGM 관점**:
- "약국" Entity는 **Organization 또는 OrganizationUnit으로 모델링 가능**
- 다음 구조 가능:
  ```
  Organization (약사회/지부)
  └── OrganizationUnit (개별 약국들)
      └── OrganizationMembers (약사들)
  ```

#### ✅ 역할·책임 경계: PASS

**명확한 책임**:
- ✅ 조직 계층 관리만 담당
- ✅ "약국"이라는 업종 개념은 담당하지 않음 (범용 조직)
- ✅ 비즈니스 도메인 로직 없음

**CGM 영향**:
- 약국 단위 CGM 데이터 집계 시 organization_id 참조 가능
- 환자가 특정 약국에 등록된 상황 모델링 가능

#### 🟡 충돌 가능성: PARTIAL

**애매한 경계**:

1. **"약국" 개념의 소유권 불명확**

현재 상태:
- organization-core: 범용 "조직" 개념만 (업종 중립)
- yaksa ServiceGroup: "약사회" 특화 설정만 (조직 구조 없음)
- 실제 약국 정보: **없음** (OrganizationUnit으로 표현 가능하나 명시 안됨)

**CGM 시나리오**:
- "당뇨 관리 약국" 개념이 필요할 때:
  - `OrganizationUnit.type = 'pharmacy'` 사용?
  - 별도 `cgm_pharmacies` 테이블 생성?
  - `organization_metadata` JSON 필드 활용?

**위험 요소**:
- OrganizationUnit은 **범용 구조**이므로 약국 특화 필드 없음
- CGM에서 약국 타입 (일반약국 vs. 당뇨약국 vs. ...) 구분 어려움

**권장 조치**:
1. ✅ "약국"은 OrganizationCore 범용 Unit 사용 (확장마다 별도 테이블 생성 금지)
2. ⚠️ 약국 타입/메타데이터는 **비즈니스 Extension**에서 `pharmacy_profiles` 테이블로 관리
3. ❗ organization-core는 업종 중립 유지 필수

---

### 2.3 platform-core — 플랫폼 설정 & 앱 레지스트리

**위치**: `packages/platform-core`

#### ✅ 기능 준비도: PASS

**발견 사항**:
- ✅ app_registry, settings, account_activities 테이블
- ✅ AppStore 설치 상태 추적
- ✅ 플랫폼 범용 설정 관리

**CGM 관점**:
- CGM standalone app 등록 가능
- CGM 관련 플랫폼 설정 (환자 데이터 보관 기간 등) 추가 가능

#### ✅ 역할·책임 경계: PASS

**명확한 책임**:
- ✅ 앱 생명주기 관리만 담당
- ✅ 비즈니스 도메인 로직 없음
- ✅ 설정은 key-value 범용 저장소로만 동작

#### ✅ 충돌 가능성: PASS

**충돌 없음**:
- platform-core는 CGM 개념 전혀 모름 (정상)
- 도메인 중립적 구조 유지 중

---

### 2.4 appstore-core — ServiceGroup 정의

**위치**: `apps/api-server/src/service-groups/index.ts`

#### ✅ 기능 준비도: PASS

**발견 사항**:
- ✅ ServiceGroup 정의 프레임워크 존재
- ✅ cosmetics, yaksa, hospital 등 정의됨
- ✅ Standalone app 분류 명확

**CGM 관점**:
- 현재 yaksa ServiceGroup에 pharmacy 개념 존재 (line 327):
  ```typescript
  yaksa: {
    name: '약사 인트라넷',
    description: '약국 및 약사 조직을 위한 인트라넷 서비스',
    category: 'organization',
    defaultRoles: ['admin', 'pharmacist', 'member'],
  }
  ```
- hospital ServiceGroup도 정의됨 (환자 관리, line 390)

#### ✅ 역할·책임 경계: PASS

**명확한 경계**:
- ✅ ServiceGroup은 **앱 분류 및 template 관리**만 담당
- ✅ 비즈니스 로직 없음

#### 🟡 충돌 가능성: PARTIAL

**CGM 서비스 분류 미정**:

현재 ServiceGroup 정의:
- `cosmetics`: 화장품 드롭쉬핑 (commerce)
- `yaksa`: 약사 인트라넷 (organization)
- `hospital`: 병원 서비스 (health) — **isActive: false**

**CGM은 어디에 속하는가?**

| Option | ServiceGroup | Category | 적합성 | 이슈 |
|--------|-------------|----------|-------|------|
| **Option A** | yaksa | organization | 🟡 PARTIAL | yaksa는 "약사회" 중심, CGM은 "환자" 중심 |
| **Option B** | hospital | health | 🟡 PARTIAL | hospital은 "병원", 약국은 다름 |
| **Option C** | **새 그룹 (pharmacy)** | health | ✅ GOOD | 약국 전용 ServiceGroup 생성 |

**문제점**:
1. yaksa ServiceGroup은 **약사회 조직 관리** 목적
   - 회원 관리, 게시판, 교육 중심
   - 환자 데이터 관리 개념 없음
2. hospital ServiceGroup은 **병원** 전제
   - `requiredKeys: ['patients', 'appointments']` (line 398)
   - 약국 워크플로우와 다름

**구조적 충돌 가능성**:
- **NOW**: yaksa ServiceGroup에 CGM 추가 시
  - `forbiddenKeys`에 'cosmetics', 'products' 있음 (line 334)
  - 하지만 'cgm', 'glucose' 금지는 없음 → 추가 가능
  - 그러나 **개념적 충돌**: yaksa는 "약사 커뮤니티", CGM은 "환자 케어"

- **LATER**: pharmacy ServiceGroup 생성 시
  - yaksa와 pharmacy의 경계 모호해짐
  - "약사회 서비스"와 "약국 서비스"의 차이점 정의 필요

**권장 조치**:
1. ❗ **CGM ServiceGroup 정책 결정 필요**
   - Option 1: yaksa 확장 (단기)
   - Option 2: pharmacy 신규 생성 (중장기)
2. ⚠️ pharmacy ServiceGroup 생성 시 yaksa와의 명확한 차별화 필요
   - yaksa: 약사회 조직 관리, 커뮤니티
   - pharmacy: 약국 운영, 환자 케어 (CGM, 복약 지도 등)

---

## 3. 충돌 가능 지점 목록 (Conflict Point Inventory)

### 3.1 NOW — 즉각 발생 가능한 충돌

| ID | 충돌 유형 | 관련 Core | 현재 상태 | 위험도 | 조치 필요성 |
|----|---------|----------|---------|-------|----------|
| **C-01** | Role enum 불일치 | auth-core | yaksa에만 'pharmacist' 존재 | MEDIUM | CGM 전 정리 권장 |
| **C-02** | 환자 역할 정의 없음 | auth-core | USER로 대체 가능하나 명시성 부족 | LOW | CGM 개발 중 추가 가능 |

### 3.2 LATER — CGM 서비스 개발 시 발생 가능

| ID | 충돌 유형 | 관련 Core | 발생 시점 | 위험도 | 조치 필요성 |
|----|---------|----------|---------|-------|----------|
| **C-03** | ServiceGroup 경계 모호 | appstore-core | pharmacy SG 생성 시 | MEDIUM | 명확한 정책 문서 필요 |
| **C-04** | 약국 Entity 이중 정의 | organization-core | CGM 약국 정보 저장 시 | LOW | OrganizationUnit 재사용 권장 |
| **C-05** | 환자-약국 관계 모델링 | (new) | CGM 등록 기능 구현 시 | LOW | patient_pharmacies 테이블 생성 |

---

## 4. 종합 판정 요약

### 4.1 ✅ 지금 바로 개발해도 되는 영역

1. **CGM Standalone App 생성** (appstore-core)
   - platform-core의 app_registry 등록 가능
   - 독립 서비스로 동작 가능
   - 충돌 없음

2. **환자(Patient) 역할 추가** (auth-core)
   - `UserRole.PATIENT` 또는 문자열 'patient' 추가
   - 기존 구조와 충돌 없음
   - 즉시 진행 가능

3. **조직 단위 활용** (organization-core)
   - 약국을 OrganizationUnit으로 모델링
   - 기존 API 재사용 가능

### 4.2 ⚠️ 선행 정리가 필요한 영역

1. **UserRole 정책 정리** (auth-core)
   - enum vs. 문자열 역할 정책 결정
   - ServiceGroup defaultRoles 동기화 방안
   - **예상 소요**: 1일

2. **CGM ServiceGroup 정의** (appstore-core)
   - yaksa 확장 vs. pharmacy 신규 생성 결정
   - forbiddenKeys, requiredKeys 정의
   - **예상 소요**: 0.5일

### 4.3 ❌ 현재는 손대지 말아야 할 영역

1. **auth-core, organization-core, platform-core 구조 자체**
   - 모두 FROZEN 상태 (Phase A/B complete)
   - 구조 변경은 Phase review 필요
   - CGM은 **기존 구조 재사용**으로 충분

---

## 5. CGM 서비스 확장 로드맵 (권장)

### Phase 1: 정책 정리 (1-2일)

1. UserRole enum 정책 결정
   - 모든 도메인 역할 enum 추가 vs. 문자열 허용
   - ServiceGroup과 동기화 방안

2. CGM ServiceGroup 정의
   - yaksa 확장 vs. pharmacy 신규
   - 명확한 경계 문서화

### Phase 2: CGM App 개발 (즉시 가능)

1. ✅ CGM standalone app 생성
2. ✅ Patients, GlucoseReadings, PharmacyProfiles 테이블 생성
3. ✅ 환자-약국 관계 모델링

### Phase 3: 통합 (CGM 개발 후)

1. OrganizationCore와 연동 (약국 단위 집계)
2. Auth-core 환자 역할 활용
3. Platform-core 설정 활용 (데이터 보관 정책)

---

## 6. 핵심 발견 사항 (Key Findings)

### 긍정적 발견

✅ **플랫폼 Core는 도메인 중립적으로 잘 설계되어 있음**
- auth-core: 범용 RBAC
- organization-core: 업종 무관 조직 관리
- platform-core: 비즈니스 로직 없는 앱 관리

✅ **CGM 서비스를 Standalone으로 개발 가능**
- 기존 Core를 변경하지 않고 확장 가능
- ServiceGroup 프레임워크 완비

### 구조적 위험 요소

🟡 **역할 정의 방식의 비일관성**
- auth-core enum vs. ServiceGroup 문자열
- "약사" 역할이 두 곳에 다르게 정의됨

🟡 **"약국" 개념의 소유권 불명확**
- organization-core (범용) vs. yaksa (특화) 경계 모호
- CGM에서 약국 정보 저장 위치 결정 필요

🟡 **ServiceGroup 분류 기준 불명확**
- yaksa (약사회) vs. pharmacy (약국) 구분 필요
- CGM이 어디 속할지 명확하지 않음

---

## 7. 최종 권장 사항

### 개발 착수 가능 여부

**판정**: 🟡 **조건부 착수 가능**

**조건**:
1. ❗ UserRole 정책 결정 (1일)
2. ❗ CGM ServiceGroup 정책 결정 (0.5일)

### 최소 선행 작업

다음 2가지만 정리하면 **즉시 진행 가능**:

#### 1. UserRole Policy Decision

**Option A (권장)**: 플랫폼 역할만 enum에 추가
```typescript
export enum UserRole {
  // Platform roles
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
  
  // Domain roles (추가)
  PHARMACIST = 'pharmacist',  // 약사
  PATIENT = 'patient',        // 환자
}
```

**Option B**: 문자열 역할 허용 (현재 상태 유지)
- ServiceGroup의 defaultRoles는 문자열로 유지
- auth-core enum은 최소한으로 유지
- 타입 안정성 낮음

#### 2. CGM ServiceGroup Decision

**Option A (단기)**: yaksa 확장
```typescript
yaksa: {
  requiredKeys: [...existing, 'cgm', 'glucose'],
  defaultRoles: ['admin', 'pharmacist', 'patient'],
}
```

**Option B (중기, 권장)**: pharmacy 신규 생성
```typescript
pharmacy: {
  id: 'pharmacy',
  name: '약국 서비스',
  category: 'health',
  requiredKeys: ['patients', 'cgm', 'prescriptions'],
  defaultRoles: ['admin', 'pharmacist', 'patient'],
  forbiddenKeys: ['forum', 'membership'],  // yaksa와 구분
}
```

---

## 8. 조사 결론

### 핵심 질문에 대한 답변

#### Q1. 플랫폼 Core는 CGM 서비스를 수용할 준비가 되어 있는가?

**A**: ✅ **YES** — 구조적으로 준비됨

- auth-core: RBAC으로 환자 역할 추가 가능
- organization-core: 약국 단위 모델링 가능
- platform-core: standalone app 등록 가능

#### Q2. 약사·약국·환자 역할 분리가 명확한가?

**A**: 🟡 **PARTIAL** — 개념은 있으나 산재됨

- "약사" 역할: yaksa ServiceGroup에만 문자열로 존재
- "약국" 개념: organization-core로 모델링 가능하나 명시 없음
- "환자" 역할: 없음 (추가 필요)

#### Q3. CGM 도입 시 충돌 가능성은?

**A**: 🟡 **MEDIUM** — 2가지 위험 요소 존재

1. Role enum 불일치
2. ServiceGroup 경계 모호

하지만 **모두 선행 정리 가능**

---

## 9. 다음 단계 (Next Steps)

### 즉시 실행 가능

1. UserRole 정책 결정 회의 (30분)
2. CGM ServiceGroup 정책 결정 회의 (30분)
3. 결정 사항 문서화 (1시간)

### CGM 개발 진행

선행 정리 완료 후:
1. ✅ CGM standalone app 골격 생성
2. ✅ patient, pharmacist 역할 적용
3. ✅ OrganizationCore 약국 단위 연동

---

**END OF INVESTIGATION REPORT**

*본 조사는 사실 발견(fact-finding)만을 목적으로 하며, 코드 변경 없이 수행되었음.*
