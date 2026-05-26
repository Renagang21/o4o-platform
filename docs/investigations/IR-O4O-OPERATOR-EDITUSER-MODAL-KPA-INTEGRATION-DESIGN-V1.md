# IR-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-DESIGN-V1

**조사 목적:** KPA Society MemberManagementPage의 회원 수정 구조를 CommonEditUserModal에 통합할 수 있는지 조사하고, 통합 방식과 adapter 설계를 결정한다.  
**상태:** 조사 완료  
**날짜:** 2026-05-26

---

## 1. 조사 대상

| 항목 | 파일 경로 |
|------|-----------|
| KPA 회원 수정 UI | `services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx` |
| KPA 회원 컨트롤러 | `apps/api-server/src/routes/kpa/controllers/member.controller.ts` |
| KPA 회원 엔티티 | `apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts` |
| 라우트 등록 | `apps/api-server/src/routes/kpa/kpa.routes.ts` |
| 공통 모달 | `packages/operator-core-ui/src/modules/members/CommonEditUserModal.tsx` |

---

## 2. KPA MemberManagementPage 수정 구조

### 2-1. 수정 UI 형태
- **Drawer (슬라이드 패널)** — 행 클릭 시 우측에서 슬라이딩
- 독립 Modal이 아닌 페이지 인라인 Drawer (close → `setSelectedMember(null)`)
- 현재 약 **19개 편집 필드** (CommonEditUserModal의 ~6개와 대조)

### 2-2. 전체 편집 필드 목록

**기본 정보:**
| 필드 | 유형 | 비고 |
|------|------|------|
| `name` | text | users.name |
| `nickname` | text | users.nickname, 공백 허용(→ NULL) |
| `status` | select | `pending / active / suspended / rejected / withdrawn` |

**멤버십 정보:**
| 필드 | 유형 | 비고 |
|------|------|------|
| `membership_type` | select | `pharmacist / student / pharmacist_member / pharmacy_student_member` |
| `license_number` | text | 약사 면허번호, optional |
| `activity_type` | select | 11개 값 — SSOT 동기화 부작용 존재 |

**약국/사업자 정보 (activity_type=pharmacy_owner일 때 표시):**
| 필드 | 유형 | 비고 |
|------|------|------|
| `pharmacy_name` | text | 약국명, store_owner 자동 승급 필수 필드 |
| `pharmacy_phone` | text | 약국 대표 전화 |
| `ownerPhone` | text | 약사 개인 연락처 |
| `ceoName` | text | 사업자등록증 대표자명 |
| `contactName` | text | 담당자명 |
| `business_number` | text | 사업자등록번호, store_owner 자동 승급 필수 필드 |
| `taxInvoiceEmail` | email | 세금계산서 이메일 |
| `zipCode` | text | 우편번호 |
| `address1` | text | 기본 주소 |
| `address2` | text | 상세 주소 |

**표시 전용 (수정 불가):**
- `user.email` — 이메일
- `capabilities` (role_assignments) — 권한 칩 (읽기 전용)

---

## 3. KPA API 엔드포인트 구조

CommonEditUserModal이 사용하는 3-서비스(Neture/GlycoPharm/K-Cosmetics) 패턴과 비교:

| 구분 | 3-서비스 패턴 | KPA 패턴 |
|------|--------------|----------|
| 회원 상세 조회 | `GET /operator/members/:userId` | `GET /kpa/members` (list) |
| 회원 정보 수정 | `PUT /operator/members/:userId` | `PATCH /kpa/members/:id/info` |
| 상태 변경 | `PUT` 동일 payload 내 포함 | `PATCH /kpa/members/:id/status` (별도 엔드포인트) |
| ID 파라미터 | `users.id` | `kpa_members.id` 또는 `service_memberships.id` |
| 권한 Guard | 서비스별 scope | `kpa:operator` scope |

**핵심 차이:** KPA는 정보 수정과 상태 변경이 **분리된 엔드포인트**이며, Route ID가 `users.id`가 아닌 `kpa_members.id`이다.

---

## 4. KPA 백엔드 부작용 (Server-side side effects)

KPA `PATCH /kpa/members/:id/info` 는 단순 CRUD가 아닌 복합 동작을 수행한다:

1. **activity_type SSOT 동기화** — `kpa_pharmacist_profiles.activity_type` 업데이트 (WO-KPA-A-ACTIVITY-TYPE-SSOT-ALIGNMENT-V1)
2. **store_owner 자동 승급/박탈** — `activity_type` → `pharmacy_owner` 변경 시 `kpa:store_owner` role 자동 부여; 다른 값으로 변경 시 role 박탈
3. **pharmacy organization 자동 생성** — 최초 `pharmacy_owner` 승급 시 `organizations` row 생성 (code: `kpa-pharm-{businessNumber}`)
4. **skeleton kpa_members 자동 생성** — `service_memberships`만 있고 `kpa_members`가 없는 경우 자동 생성
5. **users.businessInfo JSONB 병합** — pharmacy 관련 필드를 `users.businessInfo` JSONB에 기록

이 부작용들은 **서버 측 처리**이므로 클라이언트 통합 설계에 직접 영향 없음. 단, 응답에 `warnings[]` 필드가 포함될 수 있음.

---

## 5. CommonEditUserModal 현재 구조 분석

CommonEditUserModal (`packages/operator-core-ui/src/modules/members/CommonEditUserModal.tsx`) 의 현재 지원 필드:

| 필드 | KPA 적용 여부 |
|------|-------------|
| `name` | ✅ 동일 |
| `email` | ✅ 동일 (읽기 전용) |
| `phone` | ✅ 동일 |
| `address` (단일 필드) | ⚠️ KPA는 3필드 분리 (`zipCode`, `address1`, `address2`) |
| `membershipRole` | ⚠️ KPA는 `membership_type` (ENUM 다름) |
| `adminRole` | ✅ 동일 (`kpa:operator`, `kpa:admin`) |
| `profileClassification` (optional) | ❌ KPA의 `activity_type`은 11개 값 + SSOT 부작용 — 단순 select가 아님 |
| `businessInfo` (businessName 등) | ⚠️ KPA는 약국 전용 10개 필드 |

**공통 적용 가능 필드:** `name`, `email`(읽기 전용), `adminRole`  
**KPA 전용 필드:** 16개 (membership_type, license_number, activity_type, pharmacy 관련 9개, nickname)

---

## 6. 통합 옵션 분석

### Option A: CommonEditUserModal + `extensionSections` prop 추가
KPA 전용 섹션을 `ReactNode` 또는 render prop으로 주입.

```typescript
// 개념적 예시
<CommonEditUserModal
  config={KPA_CONFIG}
  extensionSections={<KpaPharmacySection ... />}
/>
```

**장점:** 공통 모달 재사용, adminRole 중복 제거  
**단점:**
- CommonEditUserModal의 config 패턴 복잡도 급증
- 상태 관리 경계 모호 (extension이 모달의 save를 트리거해야 하는 문제)
- 3-서비스 thin wrapper 패턴의 단순성을 훼손
- 현재 CommonEditUserModal은 fields를 `formData` state로 관리 — KPA 19개 필드 수용 시 내부 복잡도 폭발

**결론:** 부적합

---

### Option B: CommonEditUserModal — 기본 필드만 (adminRole subset)
KPA Drawer에서 adminRole 편집만 CommonEditUserModal로 위임, 나머지는 기존 Drawer 유지.

**장점:** 최소 변경  
**단점:**
- KPA 편집 흐름이 두 UX로 분열 (Drawer + Modal 병존)
- 실질적 중복 제거 효과 없음
- 사용자 혼란 가능성

**결론:** 부적합

---

### Option C: `KpaEditUserModal` — operator-core-ui 독립 모듈 (권장)
`@o4o/operator-core-ui`에 KPA 전용 편집 모달을 **별도 module**로 추출.  
CommonEditUserModal과 **병렬 구조**이며, 내부적으로 공통 서브컴포넌트(BasicInfoSection 등) 공유.

```
packages/operator-core-ui/src/modules/
  members/
    CommonEditUserModal.tsx        ← 기존 (Neture/GlycoPharm/K-Cosmetics)
    KpaEditUserModal.tsx           ← 신규
    sections/
      BasicInfoSection.tsx         ← name, nickname 공용
      AdminRoleSection.tsx         ← adminRole 공용
      KpaPharmacySection.tsx       ← KPA 전용
```

**장점:**
- KPA 19개 필드 자유롭게 수용
- activity_type SSOT 동기화, warnings 처리 등 KPA 특수 로직 캡슐화
- MemberManagementPage Drawer → 독립 Modal로 리팩토링
- 공통 서브컴포넌트를 통한 점진적 코드 공유 가능
- CommonEditUserModal의 단순성 유지

**단점:**
- 공통 모달과 별도 구현 (DRY 완전 달성 불가)
- operator-core-ui 패키지 규모 증가

**결론:** **권장** — KPA 복잡도와 공통 모달 단순성 균형

---

### Option D: KPA 현행 유지 (Drawer 인라인)
MemberManagementPage의 Drawer 방식 그대로 유지.

**장점:** 변경 없음, 리스크 없음  
**단점:**
- operator-core-ui 패키지 의존 혜택 없음
- KPA 코드가 페이지 컴포넌트에 혼재 (1800+ 줄)
- 향후 유지보수 부담 누적

**결론:** 임시 선택 가능하나 장기적으로 부적합

---

## 7. 권장 방향: Option C 단계별 실행

### Phase 1 — KPA Drawer → KpaEditUserModal 분리 (WO 대상)
- `KpaEditUserModal.tsx` 를 `operator-core-ui/src/modules/members/` 에 신규 생성
- 기존 MemberManagementPage Drawer 내 편집 JSX (~1800줄 중 편집 섹션) 을 모달로 이전
- makeRequest adapter 패턴 동일 적용 (`PATCH /kpa/members/:id/info`, `PATCH /kpa/members/:id/status`)
- `warnings[]` 응답 처리 UI (토스트 또는 인라인) 포함
- MemberManagementPage: Drawer → `<KpaEditUserModal>` 호출로 교체

### Phase 2 — 공통 서브컴포넌트 추출 (선택, 별도 WO)
- `BasicInfoSection.tsx` (name/nickname)
- `AdminRoleSection.tsx` (adminRole select)
- CommonEditUserModal + KpaEditUserModal 공유

---

## 8. KPA adapter 설계 (Option C 기준)

```typescript
// KpaEditUserModalConfig 구조
interface KpaEditUserModalConfig {
  makeRequest: ApiRequestFn;
  adminRoleOptions: EditUserModalOption[];
  membershipTypeOptions: EditUserModalOption[];
  activityTypeOptions: EditUserModalOption[];
}

// KPA makeRequest adapter (web-kpa-society)
const makeRequest: ApiRequestFn = async (method, path, data) => {
  const url = path.replace(/^\/api\/v1/, '') || '/';
  const { data: res } = await api.request({ method, url, data });
  return res;
};

// 호출 패턴 (MemberManagementPage 내)
// fetch:  GET  /kpa/members (list에서 이미 보유, 별도 상세 조회 불필요)
// update: PATCH /kpa/members/{kpaMemberId}/info
// status: PATCH /kpa/members/{kpaMemberId}/status
```

**Route ID 주의:** KPA는 `kpa_members.id` (또는 `service_memberships.id`) 를 사용하며, CommonEditUserModal의 `users.id` 기반 패턴과 다름. KpaEditUserModal은 `memberId` prop으로 받아야 함.

---

## 9. 결론 및 WO 제안

### 결론
- CommonEditUserModal **직접 통합은 부적합**: 필드 수(19개 vs 6개), API 구조, ID 체계, 부작용 처리 모두 이질적
- **Option C (KpaEditUserModal 별도 모듈)** 가 유일한 실용적 통합 경로
- **Option D (현행 유지)** 는 단기적으로 수용 가능하나 Phase 1 WO 없이는 1800줄 페이지 파일 유지 비용 증가

### 후속 WO 제안

| WO ID | 제목 | 우선순위 |
|-------|------|----------|
| WO-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-V1 | KpaEditUserModal 추출 및 MemberManagementPage 리팩토링 | 중 |

**WO 범위:**
- `packages/operator-core-ui/src/modules/members/KpaEditUserModal.tsx` 신규 생성
- 편집 필드 전체 이전 (19개), warnings 처리 포함
- `MemberManagementPage.tsx` Drawer 편집 섹션 → `<KpaEditUserModal>` 교체
- 백엔드 수정 없음 (기존 `/kpa/members/:id/info`, `/kpa/members/:id/status` 엔드포인트 그대로 사용)

---

*조사자: Claude Code*  
*기준 WO: WO-O4O-OPERATOR-EDITUSER-MODAL-PHASE1-NETURE-GP-KCOS-V1 완료 후속*
