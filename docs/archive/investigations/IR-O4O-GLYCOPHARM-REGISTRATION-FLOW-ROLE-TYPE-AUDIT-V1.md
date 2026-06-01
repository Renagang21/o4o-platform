# IR-O4O-GLYCOPHARM-REGISTRATION-FLOW-ROLE-TYPE-AUDIT-V1

> **조사 목적:** GlycoPharm 가입 유형 현황 파악 — 약사/근무약사 + 약국/약국 경영자 두 유형의 구현 상태, 역할 값 일관성, 용어 정합성 검토
>
> **범위:** 코드 정적 분석 (DB·UI 변경 없음)
>
> **기준일:** 2026-05-27

---

## 1. 가입 경로 현황

GlycoPharm은 **단일 RegisterPage + 두 개의 post-login Apply 페이지** 구조로 운영된다.

### 1-A. RegisterPage (가입 단계)

파일: `services/web-glycopharm/src/pages/auth/RegisterPage.tsx`

- 현재 `memberType = 'pharmacy'` **하드코딩** — 약국 경영자 전용
- `role: 'pharmacy'` + 사업자 정보(businessName, businessNumber, representativeName 등) 수집
- 약사(근무약사 포함) 전용 가입 경로 **없음**
- 당뇨인 관련 UI/분기 **없음** (WO-O4O-GLYCO-CARE-BACKEND-CLEANUP-V1에서 제거됨)

**→ 정책 기준 '약국/약국 경영자' 참여자는 RegisterPage로 커버됨.**  
**→ 정책 기준 '약사/근무약사' 참여자의 회원가입 전용 경로는 없음.**

### 1-B. PharmacistApplyPage (post-login 신청)

파일: `services/web-glycopharm/src/pages/apply/PharmacistApplyPage.tsx`

- **로그인 후** 약사 직역 신청 경로
- `subRole` 선택: `pharmacy_owner` (약국경영자) | `staff_pharmacist` (근무약사)
- 입력 필드: 면허번호(선택) / 약국명(약국경영자 필수) / 약국 주소(선택)
- 이미 신청한 경우 상태 표시 (pending/approved/rejected/suspended)
- API: `glycopharmApi.applyMembership({ subRole, licenseNumber, pharmacyName, pharmacyAddress })`

**→ 정책 기준 '약사/근무약사' 참여자는 이 경로로 신청 가능.**

### 1-C. PharmacyApplyPage (post-login 신청)

파일: `services/web-glycopharm/src/pages/apply/PharmacyApplyPage.tsx`

- **로그인 후** 약국(법인 단위) 서비스 참여 신청
- 조직 유형: '개인 약국' 고정 (`organizationType: 'pharmacy'`)
- 서비스 선택: `dropshipping` / `sample_sales` / `digital_signage` (복수 선택)
- 입력 필드: 약국명 / 사업자등록번호 / 매장 URL(slug, 선택) / 메모
- API: `glycopharmApi.submitApplication({ organizationType, organizationName, businessNumber, serviceTypes, requestedSlug, note })`

**→ 약국 단위 서비스 참여(무재고 판매·샘플·사이니지) 신청 경로.**

---

## 2. RoleSelectPage — post-login 역할 진입

파일: `services/web-glycopharm/src/pages/auth/RoleSelectPage.tsx`

로그인 후 세 가지 경로 선택 제공:
- **약사** → `/apply/pharmacist` (PharmacistApplyPage)
- **운영자** → `/apply/pharmacy` (PharmacyApplyPage)
- **소비자** → `/` (홈)

**→ 약사/근무약사는 RoleSelectPage → PharmacistApplyPage 경로로 진입.**
**→ 약국 경영자는 RegisterPage (직접 가입) 또는 RoleSelectPage → PharmacyApplyPage 경로 진입.**

두 경로가 혼재하며 약국경영자가 두 곳에서 신청 가능한 **중복 경로**가 존재한다.

---

## 3. 역할(role) 값 일관성 검토

### 3-A. Frontend → Backend 전송 값

| 경로 | Frontend 전송 role 값 | 의도 |
|------|----------------------|------|
| RegisterPage (약국경영자 신청) | `'pharmacy'` | 약국 경영자 |
| PharmacistApplyPage | role 미전송, subRole만 전송 | 약사/근무약사 |
| PharmacyApplyPage | role 미전송, organizationType만 전송 | 약국 참여 |
| RoleSelectPage (과거 흔적) | `'glycopharm:pharmacist'` (추정) | 약사 |

### 3-B. Backend VALID_ROLES 처리

파일: `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts`

```typescript
const VALID_ROLES = ['admin', 'super_admin', 'operator', 'user', 'pharmacy', 'pharmacist', 'student', ...];
```

- `'pharmacy'` → VALID_ROLES에 **포함** → effectiveRole = `'pharmacy'`
- `'glycopharm:pharmacist'` → VALID_ROLES에 **미포함** → effectiveRole = `'user'`

### 3-C. createGlycopharmApplication() 조건 불일치

```typescript
// auth-register.controller.ts (추정)
if (effectiveRole !== 'pharmacy') return; // pharmacy owner만 auto-create
```

- RegisterPage 경로(role='pharmacy') → glycopharm_applications 자동 생성 ✅
- PharmacistApplyPage 경로(role 미전송) → effectiveRole='user' → 자동 생성 안 됨 (별도 API 사용) ✅ (의도된 분리)
- `glycopharm:pharmacist` 전송 시 → effectiveRole='user' → 의도와 다른 결과 ⚠️

**판정**: `glycopharm:pharmacist` 문자열을 전송하는 경로가 현재 코드에서 발견되지 않으므로 실제 영향은 제한적이나, RoleSelectPage나 다른 경로에서 이 값이 사용될 경우 role 저장 실패 위험이 있다.

---

## 4. 백엔드 참여자 처리 흐름

### 4-A. 약국 경영자 (RegisterPage 경로)

```
RegisterPage (role='pharmacy', businessName, businessNumber, ...)
→ POST /api/v1/auth/register
→ auth-register.controller: createGlycopharmApplication() 호출
→ glycopharm_applications 레코드 생성
→ 운영자 승인 대기
→ 승인 시: OrganizationStore + GlycopharmPharmacyExtension + organization_service_enrollments + organization_members(role='owner') 생성
```

### 4-B. 약사/근무약사 (PharmacistApplyPage 경로)

```
회원가입 (email/password) → 로그인
→ RoleSelectPage → '약사' 선택 → PharmacistApplyPage
→ glycopharmApi.applyMembership({ subRole, licenseNumber, ... })
→ POST /api/v1/glycopharm/apply/membership (추정)
→ 별도 심사 테이블 저장
→ 운영자 승인 대기
→ 승인 시: glycopharm:pharmacist 역할 부여
```

**약사 승인 백엔드 경로는 RegisterPage 경로와 완전히 분리**되어 있다. createGlycopharmApplication()과 무관.

---

## 5. 용어 정합성 검토

### 정책 금지 표현 확인

| 금지 표현 | 발견 여부 |
|-----------|-----------|
| "Store Owner 승인" | 미발견 ✅ |
| "매장 생성" | 미발견 ✅ |
| "매장 운영 승인" | 미발견 ✅ |

### 실제 사용 표현

| 파일 | 사용 표현 | 적합성 |
|------|-----------|--------|
| PharmacistApplyPage | "약사 회원 신청", "운영자 검토 및 승인 절차" | ✅ 적합 |
| PharmacyApplyPage | "약국 참여 신청", "관리자 심사를 거쳐 승인" | ✅ 적합 |
| PharmacistApplyPage success | "운영자 승인 후 약사 기능을 이용하실 수 있습니다" | ✅ 적합 |
| PharmacyApplyPage | "신청서가 접수되었습니다. 심사 후 결과를 알려드리겠습니다" | ✅ 적합 |

**용어 면에서는 전반적으로 정책 기준에 부합.**

---

## 6. 조사 결과 종합

### 6-A. 두 참여자 유형 구현 상태

| 참여자 유형 | 정책 정의 | 현재 구현 | 상태 |
|------------|----------|----------|------|
| 약국/약국 경영자 | 매장 HUB + 내 매장 메뉴 이용 | RegisterPage 직접 가입 + PharmacyApplyPage | ✅ 구현됨 (중복 경로 있음) |
| 약사/근무약사 | 약사 직역 인증 후 기능 이용 | 회원가입 후 PharmacistApplyPage | ✅ 구현됨 (registration-time 선택 없음) |

### 6-B. 식별된 Drift 항목

| # | 항목 | 심각도 | 내용 |
|---|------|--------|------|
| D1 | 약국경영자 중복 경로 | 낮음 | RegisterPage(직접가입) + PharmacyApplyPage(post-login) 두 경로 혼재 |
| D2 | role='glycopharm:pharmacist' VALID_ROLES 미포함 | 중간 | 해당 값 전송 시 effectiveRole='user'로 강등. 현재 UI 경로에서 이 값을 사용하는 경로가 특정되지 않아 실제 영향 불명 |
| D3 | 가입 시점 참여자 유형 선택 없음 | 낮음 | 약사는 가입 후 별도 신청 필요. 사용자 경험 관점에서 약국경영자와 진입 경로 불균형 |
| D4 | PharmacistApplyPage subRole=pharmacy_owner 중복 | 낮음 | 약국경영자가 PharmacistApplyPage와 RegisterPage 두 경로에서 신청 가능 — 데이터 이원화 위험 |

### 6-C. 정책 정렬 판정

**판정: C — 구조 정렬, 일부 Drift 존재**

- 두 참여자 유형(약사+약국경영자)은 모두 구현된 경로가 존재
- 용어는 정책 기준에 부합
- 중복 경로 + role 값 불일치 등 소규모 drift 존재
- 당뇨인 경로는 코드에서 완전 제거됨

---

## 7. 권고사항

### 즉시 처리 (선택적)

없음 — 운영에 지장을 주는 Critical 항목 없음.

### 후속 WO 고려 항목

1. **WO-O4O-GLYCOPHARM-ROLE-VALUE-NORMALIZATION**: `glycopharm:pharmacist` VALID_ROLES 추가 또는 해당 값을 사용하는 경로 식별 후 `pharmacist`로 정규화
2. **WO-O4O-GLYCOPHARM-REGISTRATION-UX-UNIFICATION**: 약국경영자 중복 경로 정리 (RegisterPage or PharmacyApplyPage 단일화)
3. **후속 K-Cosmetics 비교**: RegisterPage 가입 유형 분기를 K-Cosmetics의 consumer/seller 분기와 비교하여 통합 가능 여부 검토

---

## 8. 참조 파일

| 파일 | 역할 |
|------|------|
| `services/web-glycopharm/src/pages/auth/RegisterPage.tsx` | pharmacy-owner 전용 가입 폼 |
| `services/web-glycopharm/src/pages/auth/RoleSelectPage.tsx` | post-login 역할 진입 선택 |
| `services/web-glycopharm/src/pages/apply/PharmacistApplyPage.tsx` | 약사/근무약사 신청 (subRole: pharmacy_owner \| staff_pharmacist) |
| `services/web-glycopharm/src/pages/apply/PharmacyApplyPage.tsx` | 약국 서비스 참여 신청 (dropshipping/sample_sales/digital_signage) |
| `services/web-glycopharm/src/pages/apply/MyApplicationsPage.tsx` | 신청 목록 조회 |
| `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts` | 가입 처리 + createGlycopharmApplication() |
| `apps/api-server/src/modules/auth/dto/register.dto.ts` | 공유 DTO |

---

*작성일: 2026-05-27*  
*상태: 완료 (코드 변경 없음)*
