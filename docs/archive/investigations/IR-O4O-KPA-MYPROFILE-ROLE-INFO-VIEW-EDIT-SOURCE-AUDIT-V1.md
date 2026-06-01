---
id: IR-O4O-KPA-MYPROFILE-ROLE-INFO-VIEW-EDIT-SOURCE-AUDIT-V1
title: "KPA 마이페이지 직역 정보 탭 — 보기/수정/Operator source mismatch 감사"
status: investigation-complete
date: 2026-05-17
type: investigation
scope:
  - /mypage/profile 직역 정보 탭의 보기 vs 수정 form 간 데이터 불일치 source 추적
  - 약사면허번호가 operator 화면에는 표시되나 mypage 양쪽에서 '-' 로 보이는 원인
  - 약국명/주소가 보기에는 있으나 수정 form 에는 비는 원인
  - 저장 시 write target 과 보기 read target 간 정합성
related:
  - IR-O4O-KPA-MYPROFILE-NICKNAME-SAVE-READ-AUDIT-V1 (basic 탭 — 본 IR 의 sibling)
  - IR-O4O-SERVICE-MEMBERSHIP-CANONICAL-KEY-DRIFT-CHECK-V1
  - WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1 (canonical key alignment 선행 WO)
  - FIX-O4O-MYPAGE-PROFILE-COLUMN-ROUTING-V1 (university/workplace SSOT 라우팅)
---

# IR-O4O-KPA-MYPROFILE-ROLE-INFO-VIEW-EDIT-SOURCE-AUDIT-V1

> Read-only 조사. 코드 수정 / DB 변경 없음. CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료) 준수.

---

## 0. Executive Summary

증상은 single bug 가 아니라 **3 개의 독립 원인** 이 직역 정보 탭 한 화면에 겹쳐서 나타나는 복합 현상이다.

| # | 증상 | 원인 | 영향 사용자 | 수정 난이도 |
|---|------|------|------------|-------------|
| **B1** | 약국명/주소가 보기 ✅ 수정 ❌ | 수정 form 이 `users.businessInfo` ONLY 초기화, `kpa_members.pharmacy_*` 무시 | 가입 신청만 거치고 마이페이지 직역 저장 안 한 모든 pharmacy_owner | **즉시 수정 가능** (resetRoleForm 1 곳) |
| **B2** | 약사면허/출신교/근무처가 보기·수정 모두 `-` | `getProfile` 응답이 `!isSuperOperator` 일 때만 `pharmacist` 객체 반환 — admin/operator role 보유자는 `pharmacist: null` | super_operator 이면서 동시에 pharmacy_owner 인 사용자 (예: sohae2100) | **정책 결정 필요** (gate 의도된 설계인지 확인 후) |
| **B3** | 보기 vs 수정 항목 구성 자체가 다름 (대표자명/세금/담당자전화는 수정에만) | 보기 화면은 약국 개설자 외부 표시용 필드만 렌더, 수정 form 은 사업자 정보 전체 캐시 필드 노출 | 모든 pharmacy_owner | **정책 결정 필요** (보기 항목 확장 vs 수정 form 축소) |
| (별건) | 저장 후 `kpa_members.pharmacy_*` 미동기화 | `setActivityType` → `PATCH /auth/me/profile` 은 `users.businessInfo` 만 write. `kpa_members` SSOT 분리 | 모든 pharmacy_owner 직역 수정 | **정책 결정 필요** (SSOT 일원화 또는 양방향 sync) |

**핵심 결론**: B1 은 한 줄 수정으로 즉시 해소. B2 는 admin 겸직 사용자만 영향이라 운영 시 거의 안 보일 수 있으나 sohae2100 케이스를 정확히 설명한다. B3 은 디자인 결정.

---

## 1. 조사 방법

- 작업 디렉토리: `c:\Users\sohae\o4o-platform`
- 대상 파일 read-only:
  - Frontend: [services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx), [contexts/AuthContext.tsx](services/web-kpa-society/src/contexts/AuthContext.tsx), [api/mypage.ts](services/web-kpa-society/src/api/mypage.ts)
  - Backend: [apps/api-server/src/routes/kpa/services/mypage.service.ts](apps/api-server/src/routes/kpa/services/mypage.service.ts), [routes/kpa/controllers/mypage.controller.ts](apps/api-server/src/routes/kpa/controllers/mypage.controller.ts)
  - Operator 비교: `services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx`, `apps/api-server/src/routes/kpa/controllers/member.controller.ts`
- DB 접근 없음. `git status` 작업 전후 변경 없음 (untracked IR 1 개 추가만).

---

## 2. 표 1 — 보기 화면 source 매핑 (mypage 직역 탭)

| 항목 | 화면 표시 source (frontend) | Backend 응답 필드 | 실제 DB 컬럼 |
|------|----------------------------|------------------|--------------|
| 약사면허 | `profile?.pharmacist?.licenseNumber` ([MyProfilePage.tsx:675](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L675)) | `pharmacist.licenseNumber` | `kpa_members.license_number` ([mypage.service.ts:88](apps/api-server/src/routes/kpa/services/mypage.service.ts#L88)) |
| 직역 | `user?.activityType` ([:681](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L681)) | `user.activityType` (auth context, **getProfile 응답 아님**) | `users.pharmacist_role` (auth-context 경로) |
| 출신교 | `profile?.pharmacist?.university` ([:692](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L692)) | `pharmacist.university` | `kpa_members.university_name` ([:89](apps/api-server/src/routes/kpa/services/mypage.service.ts#L89)) |
| 근무처 | `profile?.pharmacist?.workplace` ([:697](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L697)) | `pharmacist.workplace` | `users.businessInfo.metadata.workplace` ([:90](apps/api-server/src/routes/kpa/services/mypage.service.ts#L90)) |
| 약국명 | `pharmacyName = profile?.pharmacy?.name \|\| biz?.businessName` ([:380](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L380)) | `pharmacy.name` (1차) / `businessInfo.businessName` (fallback) | `kpa_members.pharmacy_name` / `users.businessInfo.businessName` |
| 약국 주소 | `pharmacyAddress = profile?.pharmacy?.address \|\| biz?.storeAddress (join) \|\| biz?.address` ([:381-384](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L381-L384)) | `pharmacy.address` (1차) / `businessInfo.storeAddress` / `businessInfo.address` | `kpa_members.pharmacy_address` / `users.businessInfo.storeAddress.*` |
| 약국 전화 | `pharmacyPhone = biz?.phone` ([:385](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L385)) | `businessInfo.phone` | `users.businessInfo.phone` |

**관찰**: 보기 화면은 **fallback chain 2 단** (`kpa_members.*` → `businessInfo.*`) 으로 어느 한쪽에만 값이 있어도 표시.

---

## 3. 표 2 — 수정 form 초기화 source 매핑 (resetRoleForm)

[services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx:195-213](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L195-L213)

```tsx
const resetRoleForm = (data: ProfileResponse) => {
  const biz = data.businessInfo || {};
  const storeAddr = biz.storeAddress || null;
  setRoleForm({
    activityType: user?.activityType || '',
    university: data.pharmacist?.university || '',
    workplace: data.pharmacist?.workplace || '',
    businessName: biz.businessName || '',                       // ⚠️ kpa_members.pharmacy_name 미참조
    ceoName: biz.ceoName || biz.representativeName || '',
    taxInvoiceEmail: biz.taxInvoiceEmail || biz.taxEmail || '',
    businessPhone: biz.phone || '',
    managerPhone: biz.managerPhone || '',
    storeZipCode: storeAddr?.zipCode || biz.zipCode || '',
    storeBaseAddress: storeAddr?.baseAddress || biz.address || '',  // ⚠️ kpa_members.pharmacy_address 미참조
    storeDetailAddress: storeAddr?.detailAddress || biz.address2 || '',
  });
};
```

| 항목 | form state | 초기화 source | 보기 source 와 차이 |
|------|-----------|--------------|---------------------|
| 약사면허 | `roleForm.licenseNumber` (disabled, [:541](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L541)) | `profile?.pharmacist?.licenseNumber` | 동일 |
| 출신교 | `roleForm.university` | `data.pharmacist?.university` | 동일 |
| 근무처 | `roleForm.workplace` | `data.pharmacist?.workplace` | 동일 |
| **약국명** | `roleForm.businessName` | `biz.businessName` ONLY | ⚠️ **mismatch — 보기는 `pharmacy.name` 우선** |
| **약국 주소** | `roleForm.storeZipCode/baseAddress/detailAddress` | `biz.storeAddress` ONLY | ⚠️ **mismatch — 보기는 `pharmacy.address` 우선** |
| 약국 전화 | `roleForm.businessPhone` | `biz.phone` | 동일 |
| 대표자명 | `roleForm.ceoName` | `biz.ceoName \|\| biz.representativeName` | 보기에 없음 (B3) |
| 세금계산서 이메일 | `roleForm.taxInvoiceEmail` | `biz.taxInvoiceEmail \|\| biz.taxEmail` | 보기에 없음 (B3) |
| 담당자 전화 | `roleForm.managerPhone` | `biz.managerPhone` | 보기에 없음 (B3) |

**즉**: 약국명/주소 두 필드만 보기는 `kpa_members` fallback 이 있고 수정은 없음 — **B1 의 직접 원인**.

---

## 4. 표 3 — Operator 회원관리 source 매핑

| 항목 | 화면 표시 source | API endpoint | DB 컬럼 |
|------|------------------|--------------|---------|
| 약사면허번호 | `m.license_number` (테이블 컬럼) | `GET /api/v1/kpa/members` ([member.controller.ts:360](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L360)) | `kpa_members.license_number` |
| 약국명/주소 | `m.pharmacy_name`, `m.pharmacy_address` | 동일 endpoint | `kpa_members.pharmacy_name`, `kpa_members.pharmacy_address` |

**결론**: operator 는 **`kpa_members` SSOT 만 본다.** 마이페이지 보기는 fallback 으로 `businessInfo` 도 보지만, operator 는 fallback 없음. → operator 화면의 면허번호는 `kpa_members.license_number` 에 값이 있으면 무조건 표시.

---

## 5. 표 4 — 항목별 mismatch matrix

✅ = 값 표시, ⚠️ = 가끔 비어보임, ❌ = 절대 표시 안됨

### Case A: 일반 pharmacy_owner (super_operator role 없음, 가입 신청 직후, 마이페이지 직역 저장 한 번도 안 함)

| 항목 | 마이페이지 보기 | 마이페이지 수정 form | Operator 회원관리 |
|------|:---------------:|:--------------------:|:-----------------:|
| 약사면허 | ✅ | ✅ (disabled) | ✅ |
| 약국명 | ✅ (kpa_members) | ❌ **비어있음 (B1)** | ✅ |
| 약국 주소 | ✅ (kpa_members) | ❌ **비어있음 (B1)** | ✅ |
| 약국 전화 | ⚠️ (businessInfo 없음 시 비어보임) | ⚠️ | ⚠️ (kpa_members 에 없으면) |
| 대표자명 | ❌ (B3) | ✅ (입력 가능) | (별건) |
| 세금계산서 이메일 | ❌ (B3) | ✅ | (별건) |

### Case B: super_operator + pharmacy_owner 겸직 (예: sohae2100 — `kpa:admin/kpa:operator` 보유)

| 항목 | 마이페이지 보기 | 마이페이지 수정 form | Operator 회원관리 |
|------|:---------------:|:--------------------:|:-----------------:|
| 약사면허 | ❌ **`-` 표시 (B2)** | ❌ **빈 값 (B2)** | ✅ (예: 99991) |
| 출신교 | ❌ (B2) | ❌ (B2) | ✅ |
| 근무처 | ❌ (B2) | ❌ (B2) | (별건) |
| 약국명 | ✅ (kpa_members) | ❌ (B1) | ✅ |
| 약국 주소 | ✅ (kpa_members) | ❌ (B1) | ✅ |

**B2 의 작동 원리** — [apps/api-server/src/routes/kpa/services/mypage.service.ts:87](apps/api-server/src/routes/kpa/services/mypage.service.ts#L87):

```ts
// Determine user type based on roles
const isSuperOperator = roles.some((r: string) =>
  ['kpa:admin', 'kpa:operator'].includes(r)
);
// ...
pharmacist: !isSuperOperator ? {
  licenseNumber: kpaMember?.license_number || null,
  university: kpaMember?.university_name || null,
  workplace: fullUser?.businessInfo?.metadata?.workplace || null,
} : null,
```

→ `kpa:admin` 또는 `kpa:operator` role 을 가진 사용자에게는 `pharmacist` 객체 자체가 **`null`** 로 반환된다. 동일 사용자가 동시에 pharmacy_owner 라도 `pharmacist.licenseNumber` 가 `undefined` 가 됨. 보기 화면 ([:675](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L675)) 의 `{profile?.pharmacist?.licenseNumber || '-'}` 는 `-` 출력. 수정 form 초기화도 동일 source 라 빈값.

**의도된 설계로 보임** (super_operator 는 약사 정보를 가질 필요 없다는 가정). 단, **겸직 사용자 (admin + pharmacy_owner) 케이스를 전제하지 않은 설계** — sohae2100 같은 test 운영자 계정이 그 누락 케이스에 해당.

---

## 6. 저장 경로 — Write target 분석

### 6-1. 기본 탭 (basic) `handleBasicSave` ([:216-230](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L216-L230))

```tsx
await mypageApi.updateProfile(basicForm);  // PUT /mypage/profile → name/lastName/firstName/nickname/phone
```
→ `users.*` 만 write. 직역 정보 무관.

### 6-2. 직역 탭 (role) `handleRoleSave` ([:238-282](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L238-L282))

```tsx
// 1) PUT /mypage/profile — university + workplace
await mypageApi.updateProfile({
  university: roleForm.university,
  workplace: roleForm.workplace,
});

// 2) PATCH /auth/me/profile — activityType + businessInfo
const businessInfoPayload: Record<string, any> = {};
if (isPharmacyOwnerEdit) {
  if (roleForm.businessName) businessInfoPayload.businessName = roleForm.businessName;
  if (roleForm.ceoName) businessInfoPayload.ceoName = roleForm.ceoName;
  if (roleForm.taxInvoiceEmail) businessInfoPayload.taxInvoiceEmail = roleForm.taxInvoiceEmail;
  if (roleForm.businessPhone) businessInfoPayload.phone = roleForm.businessPhone;
  if (roleForm.managerPhone) businessInfoPayload.managerPhone = roleForm.managerPhone;
  if (...storeAddress...) businessInfoPayload.storeAddress = { ... };
}
await setActivityType(roleForm.activityType, businessInfoPayload);
```

→ `setActivityType` ([AuthContext.tsx:394-403](services/web-kpa-society/src/contexts/AuthContext.tsx#L394-L403)) 는 `PATCH /auth/me/profile` 호출 — **`users.businessInfo` JSONB 만 update.** `kpa_members.pharmacy_name/pharmacy_address` 는 절대 건드리지 않음.

| Write 항목 | Write target | 비고 |
|------------|--------------|------|
| university | `kpa_members.university_name` | mypage.service.ts SSOT 라우팅 ✅ |
| workplace | `users.businessInfo.metadata.workplace` | mypage.service.ts SSOT 라우팅 ✅ |
| businessName | `users.businessInfo.businessName` | ⚠️ `kpa_members.pharmacy_name` 미동기화 |
| storeAddress | `users.businessInfo.storeAddress` | ⚠️ `kpa_members.pharmacy_address` 미동기화 |
| ceoName/tax/manager | `users.businessInfo.*` | kpa_members 에 대응 컬럼 없음 |

**결과**: 사용자가 직역 탭에서 약국명을 수정해도 `kpa_members.pharmacy_name` 은 그대로. 다음 보기 화면 진입 시 `profile.pharmacy.name` (= old 값) 이 우선 fallback 되어 표시 → 사용자 입장에서 "저장이 안 됐다"고 인식. (실제로는 `businessInfo.businessName` 에는 저장됨 — 보기 fallback 순서상 1번이 이김.)

---

## 7. 원인 판정 — 항목별

### B1 — 약국명/주소 보기 ✅ / 수정 ❌
- **단일 원인, 단일 파일**: [services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx:204, 209-211](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L204) 의 `resetRoleForm` 이 `data.pharmacy?.name` / `data.pharmacy?.address` 를 fallback 으로 보지 않음.
- 보기는 fallback 2단(`pharmacy.* → businessInfo.*`), 수정은 1단(`businessInfo.*` only) → **fallback 비대칭** 이 직접 증상의 원인.

### B2 — 약사면허/출신교/근무처 보기·수정 모두 `-` (super_operator 겸직)
- **단일 원인, 단일 파일**: [apps/api-server/src/routes/kpa/services/mypage.service.ts:87](apps/api-server/src/routes/kpa/services/mypage.service.ts#L87) 의 `!isSuperOperator` gate.
- super_operator role 보유자에게 `pharmacist: null` 반환 — 약사 본인이 admin/operator 겸직일 경우 자기 면허번호를 못 봄.
- 의도된 설계인지(약사 정보는 super_operator 화면에 부적절) vs 의도치 않은 누락(겸직 케이스 미고려)인지 **정책 결정 필요**.

### B3 — 보기 vs 수정 form 항목 구성 불일치
- 보기: 약국명/주소/전화 3 개 (외부 표시용)
- 수정: + 대표자명/세금계산서이메일/담당자전화 6 개 (사업자 캐시 풀셋)
- **단일 원인 아님 — 디자인 결정 결과.** 보기 화면에 대표자/세금/담당자 표시할지 / 수정 form 에서 그것들을 제외할지 정책 결정 필요.

### (별건) Write target asymmetry — pharmacy_name/address sync 누락
- **단일 원인, 다중 파일**: `setActivityType` 가 `users.businessInfo` 만 write, backend `/auth/me/profile` handler 에서 `kpa_members.pharmacy_name/pharmacy_address` 미동기화.
- B1 을 수정해도 (수정 form 이 `kpa_members.pharmacy_name` 을 보여줘도) **저장 시 write 가 `businessInfo` 에만 가므로 다음 진입 시 fallback 1순위인 `pharmacy.name` (kpa_members) 가 여전히 old 값** → "수정해도 그대로" 다시 발생 가능.
- **B1 의 짝 — 같이 처리 또는 SSOT 통일 결정 필요.**

---

## 8. 흐름 도식

### 현재 (B1 + 별건 동시 발생 시)

```
[가입 신청]
    ↓
[kpa_members.pharmacy_name = "OO약국"]   ← 보기 1순위 source

[마이페이지 직역 보기]
    ↓ profile.pharmacy.name || biz.businessName
    ✅ "OO약국" 표시

[마이페이지 직역 수정 진입]
    ↓ resetRoleForm: biz.businessName only
    ❌ 빈 input (kpa_members 무시) — 사용자: "어 빈데?"

[사용자가 "OO약국" 재입력 → 저장]
    ↓ setActivityType → PATCH /auth/me/profile
    ↓ users.businessInfo.businessName = "OO약국"
    ⚠️ kpa_members.pharmacy_name 그대로

[다시 보기 진입]
    ↓ profile.pharmacy.name (= 여전히 "OO약국") || biz.businessName
    ✅ "OO약국" 표시 (보기는 두 source 모두 같은 값이라 차이 없어 보임)
    BUT: 만약 사용자가 "OO약국2" 로 수정 저장 → 보기는 fallback 1순위가 이김 → 여전히 "OO약국" 표시
```

### B2

```
[sohae2100: roles = ['kpa:admin', 'kpa:operator', 'super_admin'], activityType='pharmacy_owner']
    ↓ kpa_members.license_number = '99991'

[GET /api/v1/kpa/mypage/profile]
    ↓ isSuperOperator = true → pharmacist: null
[Response] { pharmacist: null, pharmacy: {...}, businessInfo: {...} }

[보기/수정 모두]
    profile?.pharmacist?.licenseNumber || '-'  →  '-' 표시
```

---

## 9. 즉시 수정 가능 (단일 수정 후보)

### 9-1. B1 — 1 파일 / 3 라인 수정

[services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx:195-213](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L195-L213)

```diff
  const resetRoleForm = (data: ProfileResponse) => {
    const biz = data.businessInfo || {};
    const storeAddr = biz.storeAddress || null;
+   const pharmacyAddrParts = data.pharmacy?.address
+     ? data.pharmacy.address.split(/\s+/)   // 또는 별도 파싱 로직 — 정책 결정 필요
+     : null;
    setRoleForm({
      activityType: user?.activityType || '',
      university: data.pharmacist?.university || '',
      workplace: data.pharmacist?.workplace || '',
-     businessName: biz.businessName || '',
+     businessName: data.pharmacy?.name || biz.businessName || '',
      ceoName: biz.ceoName || biz.representativeName || '',
      ...
      storeZipCode: storeAddr?.zipCode || biz.zipCode || '',
      storeBaseAddress: storeAddr?.baseAddress || biz.address || '',
      storeDetailAddress: storeAddr?.detailAddress || biz.address2 || '',
    });
  };
```

**캐비아트**: `kpa_members.pharmacy_address` 는 단일 string. `storeAddress` 는 `{ zipCode, baseAddress, detailAddress }` 구조 → 단순 fallback 매핑 불가. 다음 중 선택 필요:
- 옵션 A: businessName 만 fallback 추가 (주소는 storeAddress 만 사용 유지)
- 옵션 B: pharmacy_address 를 baseAddress 로만 fallback (zipCode/detailAddress 는 빈 채로)
- 옵션 C: backend getProfile 응답 자체에서 storeAddress 를 pharmacy_address 로 fallback 채워서 내려주기 (frontend 수정 최소화)

### 9-2. B2 — 1 파일 / 1 라인 수정 (정책 채택 시)

[apps/api-server/src/routes/kpa/services/mypage.service.ts:87](apps/api-server/src/routes/kpa/services/mypage.service.ts#L87)

```diff
- pharmacist: !isSuperOperator ? {
+ pharmacist: kpaMember ? {                  // 옵션: super_operator 겸직도 pharmacist 표시
    licenseNumber: kpaMember?.license_number || null,
    university: kpaMember?.university_name || null,
    workplace: fullUser?.businessInfo?.metadata?.workplace || null,
  } : null,
```

또는 더 엄밀한 조건:

```ts
pharmacist: (kpaMember && (!isSuperOperator || isPharmacyOwner)) ? { ... } : null
```

→ **단, 의도된 설계인지 정책 확인 선행**. super_operator 보기 화면에 약사 정보 노출이 부적절한 도메인 이유가 있다면 frontend 에서 별도 graceful handling.

### 9-3. 별건 (Write sync) — 1 파일 / N 라인 (backend `/auth/me/profile` handler 수정)

`PATCH /auth/me/profile` 핸들러 (auth-account.controller.ts 추정) 에서 `businessInfo.businessName / storeAddress` write 시 **동일 사용자의 `kpa_members.pharmacy_name / pharmacy_address` 도 upsert**. 또는 반대로 `businessInfo.businessName` 만 SSOT 로 두고 mypage.service.ts 의 `pharmacy.name` fallback 을 `businessInfo.businessName` 으로 전환.

---

## 10. 정책 결정 필요 항목

| ID | 결정 사항 | 옵션 | 권장 |
|----|----------|------|------|
| **P1** | 약국명/주소 SSOT | A: `users.businessInfo` 단일 SSOT (kpa_members 컬럼 deprecate 또는 mirror-only) <br> B: `kpa_members` 단일 SSOT (businessInfo 캐시는 제거 또는 read-only mirror) <br> C: 양방향 sync (현재 + sync hook 추가) | **A** — 직역 정보는 사용자 자기 데이터, `kpa_members.pharmacy_*` 는 가입 신청 snapshot 으로 격하. operator backfill 시 mirror. |
| **P2** | super_operator + pharmacy_owner 겸직 사용자의 `pharmacist` 객체 노출 여부 | A: 무조건 노출 (kpaMember 존재 시) <br> B: activityType=pharmacy_owner 인 경우만 노출 <br> C: 현 설계 유지 + super_operator 전용 메시지 표시 | **B** — 의미적으로 정확. operator role 만 있는 비-약사 super_operator 는 그대로 null 유지. |
| **P3** | 보기 화면에 대표자명/세금/담당자 추가 vs 수정에서 제거 | A: 보기에 추가 (대칭) <br> B: 수정에서 제거 (보기 기준으로 정리) <br> C: 별도 "사업자 정보" 섹션 분리 | **A** — 사용자가 수정 후 자기 입력값 확인 못 하는 게 더 큰 UX 손상. |
| **P4** | B1 fallback 적용 시 주소 처리 | A: businessName 만 fallback <br> B: backend 응답에서 pharmacy_address → storeAddress 변환 후 내려주기 <br> C: pharmacy_address 를 baseAddress 로만 fallback | **B** — frontend 단순화, backend 책임. mypage.service.ts 한 곳 수정. |

---

## 11. 후속 WO 제안

### WO-O4O-KPA-MYPROFILE-ROLE-FORM-PHARMACY-FALLBACK-V1 (B1 즉시 수정)
- 범위: 1 파일 (resetRoleForm) + 선택적으로 backend getProfile 응답에서 storeAddress 변환 (P4-B 채택 시 1 파일 추가)
- P4 결정 후 진행

### WO-O4O-KPA-MYPROFILE-PHARMACIST-GATE-RELAX-V1 (B2 수정)
- 범위: 1 파일 1 라인 (mypage.service.ts:87 조건 완화)
- **P2 결정 후 진행**. 단순 코드 변경이나 의미는 정책 변경.

### WO-O4O-KPA-MYPROFILE-VIEW-FIELDS-PARITY-V1 (B3 수정)
- 범위: MyProfilePage.tsx 의 직역 보기 섹션에 대표자/세금/담당자 표시 추가 (P3-A 채택 시)
- P3 결정 후 진행

### WO-O4O-KPA-BUSINESSINFO-PHARMACY-SSOT-UNIFICATION-V1 (별건 — P1 채택 시)
- 범위: backend `/auth/me/profile` handler 또는 mypage.service.ts 의 source 라우팅 재설계
- **P1 결정 후 진행**. 가장 큰 작업. backfill 마이그레이션 동반 가능성.

---

## 12. 본 IR 의 범위 외

- 코드 수정 / 커밋 — 본 IR 은 read-only 조사.
- DB SELECT 검증 — 본 IR 은 코드 정적 분석만. 실제 운영 DB 의 `kpa_members.license_number` 값 분포는 sibling IR `IR-O4O-KPA-STOREOWNER-MISSING-ROLE-DRIFT-CHECK-V1` §2 참조 (sohae2100 의 km row 존재 확인됨).
- `/auth/me/profile` handler 의 코드 상세 — 본 IR 에서 read 하지 않음. 별건 WO 진행 시 그때 audit.
- 정책 결정 (§10) — 사용자 입력 대기.

---

## 13. 변경 이력

- 본 IR 작성 외 코드 변경 없음.
- `git status` 작업 전후 동일 (untracked IR 1 개 추가만).

---

*Status: Investigation Complete. Read-only. Awaiting policy decisions (§10) for follow-up WOs.*
*Updated: 2026-05-17*
*Version: 1.0*
