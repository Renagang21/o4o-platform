# O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1

> **상태**: ACTIVE · **최종 갱신**: 2026-10-09 (본문 정합 — 운영자 비밀번호 변경 은퇴 · 목록 route · GlucoseView 은퇴 반영. 회원관리 API 표준 §4.4~§8 은 `apps/api-server/src/routes/operator/membership.routes.ts` 와 일치)
> (2026-10-04 정합) **운영자의 회원 비밀번호 변경은 은퇴했다** — `WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1`([CHECK](../../checks/CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1.md): admin/operator password 변경 surface 0 · PasswordModal 제거). 이후 도입된 이메일 · 비밀번호 로그인([CHECK](../../checks/CHECK-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1.md))은 **사용자 본인**의 인증 수단(가입 · 재설정 · 로그인 상태 `POST /auth/password`)이며 Admin 화면 · `platform:*` 세션은 Google 전용이다. 운영자가 대신 바꾸는 비밀번호 경로는 없다. 아래 §3.2 · §4.2 · §6.1 의 비밀번호 항목은 무효.

> **O4O 운영자 회원관리 표준 v1**
>
> 참조 구현: K-Cosmetics (UI/UX)
> 확정일: 2026-03-18

---

## 1. 표준 범위

**대상:** 운영자 대시보드 → 회원관리

**포함 기능:**
- 회원 목록
- 회원 상세
- 회원 수정
- 역할 관리
- 멤버십 승인/거절
- 상태 관리

---

### 1.1 서비스 권한·데이터 경계 (2026-10-09 정합)

인증 시 활성·유효한 `role_assignments`를 다시 읽어 역할 해제·강등을 기존 로그인에서도
다음 요청부터 반영한다. 조회 실패 시 이전 JWT 역할로 허용하지 않는다.
회원관리 API의 서비스 범위는 해당 서비스의 `admin`/`operator` 지정으로 판정하며,
일반 회원·매장 역할이나 서비스 가입만으로 다른 서비스 회원관리 권한을 주지 않는다.

목록·상세의 회원 가입 정보와 역할은 요청한 `serviceKey` 범위로 반환한다.
플랫폼 관리자의 전 서비스 조회는 기존 명시 `all=true` 계약을 유지한다.
회원 유형·상태·일괄 상태·복구·탈퇴 변경은 한 서비스로 한정한다.
서비스 권한이 하나이면 생략된 키를 그 서비스로 해석할 수 있으나,
다중 서비스 운영자와 플랫폼 관리자는 대상 `serviceKey`를 명시해야 한다.
탈퇴는 기존 계약대로 권한 개수와 무관하게 명시 키가 필요하다.
회원 유형의 `membershipServiceKey`도 같은 권한·소속 검증을 받는다.

사용자 확정 회원 관리 정책(2026-10-09):

| 업무 | 해당 서비스 admin | 해당 서비스 operator |
|---|---|---|
| 회원 조회·상세 | 허용 | 허용 |
| 가입 신청 승인·반려 (pending/rejected) | 허용 | 허용 |
| 정지·정지 해제·서비스 탈퇴 | 허용 | 차단 |
| 공통 이름·연락처·사업자 정보 수정 | 허용 | 허용 |
| 공통 계정 활성 상태 복구 | 중앙 계정 관리에서만 | 중앙 계정 관리에서만 |
| 서비스 운영자 지정·변경·해제 | 중앙 관리자만 | 중앙 관리자만 |

활성 회원을 반려 상태로 바꾸는 행위는 가입 심사가 아니라 이용 제한이므로 admin만 허용한다.
회원 유형·일반 역할 변경도 admin으로 한정하며 운영 tier 역할 부여·회수는 중앙 전용이다.
서비스 승인·재활성화 API는 요청자가 플랫폼 관리자라도 공통 계정 상태를 바꾸지 않는다.
공통 프로필 수정은 다른 서비스에서도 보이는 정보라는 기존 계약을 유지한다.
서비스 가입 정지·탈퇴는 운영자 지정 역할을 제거하지 않으며, 승인·복구가 중앙에서 회수한
운영자 역할을 재부여하거나 활성화하지 않는다. 가입 상태가 비활성이면 운영자 역할이 남아 있어도
회원관리 API는 현재 DB 가입 상태로 접근을 차단한다.

서버 guard와 공통 목록·상세·편집 소비처에 같은 권한을 적용한다. 강의(`/operator/members`),
공급자·펀딩·커뮤니티(`/operator/service-members/{serviceKey}`)도 공통 서비스 회원 콘솔을 사용한다.
개별 커뮤니티의 회원·운영자는 이 서비스 가입 콘솔의 대상과 구분한다.
구현·검증 범위는 [경계 수정 WO](../../work-orders/WO-O4O-SERVICE-OPERATOR-MEMBERSHIP-BOUNDARY-FIX-V1.md)를 참조한다.

---

## 2. 라우팅 표준

```
/operator/users           → UsersPage (목록)
/operator/users/:id       → UserDetailPage (상세)
```

모든 서비스 동일 적용.

> (2026-10-04 정합) 현재 K-Cosmetics · KPA Society 는 목록을 `/operator/members` 에 두고 `/operator/users` 는 그쪽으로 redirect 한다. 상세 canonical 경로는 서비스마다 다르다 — K-Cosmetics = `/operator/members/:id`(`UsersPage.tsx` `fullDetailHref`, `/operator/users/:id` 는 legacy alias), KPA Society = `/operator/users/:id`. 목록 UI 는 `@o4o/operator-core-ui` 의 `OperatorMembersConsolePage` 공통 구현을 쓴다(K-Cosmetics `UsersPage.tsx`). Neture 는 목록 canonical 경로가 `/operator/members` 다(`operatorMenuGroups.ts` · 대시보드 링크, `/operator/users` 는 legacy alias). 상세는 `App.tsx` 에 `/operator/members/:id` · `/operator/users/:id` 가 모두 등록돼 있으나 실제 화면 흐름은 아직 `/operator/users/:id` 를 생성한다 — `UsersManagementPage.tsx` 가 `fullDetailHref` 를 넘기지 않아 `OperatorMembersConsolePage` 기본값(`/operator/users/:id`)을 쓰고, `UserDetailPage.tsx` 의 `netureConfig` 가 `listPath` 를 생략해 뒤로가기 · 삭제 후 이동도 `/operator/users` 다. 따라서 Neture 상세의 현재 실효 경로는 `/operator/users/:id` 이며, `/operator/members/:id` 로의 소비처 전환은 별도 WO 대상이다.

---

## 3. UsersPage (목록) 표준

### 3.1 필수 구성

| 영역 | 구성 |
|------|------|
| 헤더 | 제목 + 부제목 + 새로고침 버튼 |
| 통계 | 4개 카드 (전체 / 활성 / 대기 / 거절) |
| 탭 | 전체 / 가입 대기 |
| 검색 | 입력창 (이름/이메일) + 검색 버튼 + Enter 트리거 |
| 필터 | 상태 드롭다운 (전체/활성/대기/거부/정지) |
| 테이블 | 이름, 이메일, 역할, 서비스, 가입일, 상태, 관리 |
| 페이지네이션 | 이전/다음 + 페이지 표시 (20건 단위) |

### 3.2 인라인 액션

| 상태 | 가능 액션 |
|------|----------|
| pending | 승인, 거부 |
| rejected | 승인 |
| active/approved | 정지 |
| suspended | 활성화 |
| 모든 상태 | 수정, 비밀번호 변경, 삭제 |

> (2026-10-09 정합) "비밀번호 변경" 은 은퇴. 수정은 admin/operator 모두, 정지·활성 회원 복구·삭제는 admin만 허용한다(§1.1).

### 3.3 행 클릭

```tsx
onClick={() => navigate(`/operator/users/${user.id}`)}
```

상세 페이지 이동. 관리 버튼 클릭 시 `e.stopPropagation()`.

---

## 4. UserDetailPage (상세) 표준

### 4.1 헤더

- 아바타 (이름 첫 글자)
- 이름 + 이메일
- 상태 배지
- 뒤로가기 버튼

### 4.2 기본 정보 섹션

| 항목 | 표시 조건 |
|------|----------|
| 이름 | 항상 |
| 닉네임 | user.nickname 존재 시 |
| 이메일 | 항상 |
| 전화번호 | user.phone 존재 시 |
| 상태 | 항상 |
| 가입일 | 항상 |
| 수정일 | user.updatedAt 존재 시 |

**액션 버튼:**
- 승인/거부 (pending 시)
- 정지 (active/approved 시)
- 활성화 (suspended/rejected 시)
- 정보 수정 (EditUserModal)
- 비밀번호 변경 (PasswordModal) — (2026-10-04 정합) 은퇴, PasswordModal 코드 0
- 삭제 (confirm 필수)

### 4.3 사업자 정보 섹션 (조건부)

**표시 조건:** `user.businessInfo && (user.businessInfo.businessName || user.company)`

| 항목 | 필드 |
|------|------|
| 사업자명 | businessName \|\| company |
| 사업자등록번호 | businessNumber |
| 세금계산서 이메일 | email |
| 업태 | businessType |
| 업종 | businessCategory |
| 주소 | address + address2 |

### 4.4 역할 관리 섹션 (필수)

**역할 테이블 컬럼:**
- 역할명
- 활성 여부
- 범위 (scopeType:scopeId)
- 부여일
- 관리 (제거 버튼)

**역할 추가:**
- "역할 추가" 버튼 → RoleModal (dropdown select)
- 이미 할당된 역할은 목록에서 제외

**ASSIGNABLE_ROLES (서비스별):**

```ts
// TODO: Backend API로 할당 가능 역할 목록 대체 예정
const ASSIGNABLE_ROLES = [
  { value: '{service}:admin', label: '{Service} Admin' },
  { value: '{service}:operator', label: '{Service} Operator' },
  { value: '{service}:member', label: '{Service} Member' },
];
```

**역할 제거:**
- 활성 역할만 제거 가능
- confirm 필수

**API:**
```
POST   /api/v1/operator/members/{userId}/roles      { role: string }
DELETE /api/v1/operator/members/{userId}/roles/{role}
```

### 4.5 서비스 멤버십 섹션

**테이블 컬럼:**
- 서비스명 (SERVICE_LABELS 매핑)
- 상태
- 역할
- 가입일
- 관리 (승인/거부)

**액션:**
- pending/rejected → 승인 가능
- pending/active → 거부 가능 (사유 입력)

**API:**
```
PATCH /api/v1/operator/members/{membershipId}/approve
PATCH /api/v1/operator/members/{membershipId}/reject   { reason?: string }
```

---

## 5. EditUserModal 표준

### 5.1 기본 정보 필드

| 필드 | 이름 | 필수 | 비고 |
|------|------|------|------|
| lastName | 성 | - | |
| firstName | 이름 | - | |
| nickname | 닉네임 | ✅ | |
| phone | 휴대전화 | - | 숫자만 입력 |

### 5.2 사업자 정보 필드 (조건부)

**표시 조건:** hasBusinessInfo (businessInfo.businessName \|\| company 존재 시)

| 필드 | 이름 | 비고 |
|------|------|------|
| businessName | 사업자명 | |
| businessNumber | 사업자등록번호 | 숫자만, maxLength=10 |
| taxEmail | 세금계산서 이메일 | email 타입 |
| businessType | 업태 | |
| businessCategory | 업종 | |
| address1 | 주소 | |
| address2 | 상세주소 | |

### 5.3 API

```
PUT /api/v1/operator/members/{userId}
```

JSON merge — 기본 필드 + businessInfo 필드 함께 전송.

---

## 6. API 표준

### 6.1 공통 API (모든 서비스)

```
GET    /api/v1/operator/members                          목록 (page, limit, status, search)
GET    /api/v1/operator/members/stats                    통계
GET    /api/v1/operator/members/:userId                  상세
PUT    /api/v1/operator/members/:userId                  수정 (프로필 + businessInfo — 비밀번호는 2026-09 은퇴)
PATCH  /api/v1/operator/members/:userId/status           상태 변경
PATCH  /api/v1/operator/members/:membershipId/approve    멤버십 승인
PATCH  /api/v1/operator/members/:membershipId/reject     멤버십 거부
POST   /api/v1/operator/members/:userId/roles            역할 추가
DELETE /api/v1/operator/members/:userId/roles/:role       역할 제거
DELETE /api/v1/operator/members/:userId                  삭제
```

### 6.2 서비스별 예외

**Neture:**
```
POST /api/v1/neture/operator/registrations/:userId/approve   가입 승인
POST /api/v1/neture/operator/registrations/:userId/reject    가입 거부
```
MembershipConsole과 병행 사용. 가입 승인/거부만 자체 엔드포인트.

**KPA:**
```
GET    /api/v1/kpa/members                    약사 회원 목록
PATCH  /api/v1/kpa/members/:id/status         상태 변경
PATCH  /api/v1/kpa/members/:id/role           역할 변경
```
독립 유지. 사유: kpa_members 구조, 면허/분회/자격 관리.

---

## 7. 데이터 표준

### 7.1 목록 응답

```json
{
  "success": true,
  "users": [{
    "id": "uuid",
    "email": "string",
    "firstName": "string?",
    "lastName": "string?",
    "name": "string?",
    "nickname": "string?",
    "company": "string?",
    "phone": "string?",
    "status": "active|pending|rejected|suspended|approved|inactive",
    "isActive": "boolean",
    "roles": ["string"],
    "memberships": [{
      "id": "uuid",
      "serviceKey": "string",
      "status": "string",
      "role": "string",
      "createdAt": "string"
    }],
    "createdAt": "string",
    "updatedAt": "string?"
  }],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 7.2 상세 응답

```json
{
  "success": true,
  "user": { /* ... 목록과 동일 필드 ... */ },
  "roles": [{
    "id": "uuid",
    "role": "string",
    "isActive": "boolean",
    "scopeType": "string?",
    "scopeId": "string?",
    "createdAt": "string"
  }],
  "memberships": [{
    "id": "uuid",
    "serviceKey": "string",
    "status": "string",
    "role": "string",
    "approvedBy": "string?",
    "approvedAt": "string?",
    "rejectionReason": "string?",
    "createdAt": "string"
  }]
}
```

### 7.3 businessInfo (optional)

```json
{
  "businessName": "string?",
  "businessNumber": "string?",
  "email": "string?",
  "businessType": "string?",
  "businessCategory": "string?",
  "address": "string?",
  "address2": "string?"
}
```

존재 시만 UI 표시.

---

## 8. 권한 표준

### 8.1 Backend Guard

```
requireAuth → injectServiceScope → requireRole([...operator/admin roles...])
```

### 8.2 서비스 격리

| 역할 | 접근 범위 |
|------|----------|
| Platform admin | 전체 서비스 (선택적 필터) |
| Service operator | 자신의 서비스 멤버만 |

### 8.3 역할 할당 경계

서비스 operator는 자신의 서비스 prefix 역할만 할당 가능.

### 8.4 Frontend Guard

Route-level RoleGuard. 페이지 접근 가능 시 모든 액션 허용.

---

## 9. UI/UX 규칙

### 9.1 이름 표시 (WO-O4O-NAME-NORMALIZATION-V1)

```ts
const displayName = (user.lastName && user.firstName)
  ? `${user.lastName}${user.firstName}`
  : user.name || user.email?.split('@')[0] || '사용자';
```

### 9.2 상태 배지

| 상태 | 라벨 | 색상 |
|------|------|------|
| active | 활성 | green |
| approved | 승인 | green |
| pending | 대기 | amber |
| rejected | 거부 | red |
| suspended | 정지 | red |
| inactive | 비활성 | slate |

### 9.3 서비스 라벨

| Key | 라벨 |
|-----|------|
| glucoseview | GlucoseView (서비스 은퇴 — 2026-03-18 시점 값) |
| k-cosmetics | K-Cosmetics |
| neture | Neture |
| kpa-society | KPA Society |
| platform | Platform |

### 9.4 공통 UI 패턴

| 요소 | 규칙 |
|------|------|
| 통계 카드 | 4컬럼 그리드, 아이콘 + 숫자 + 라벨 |
| 탭 | border-b-2 언더라인 |
| 테이블 | bg-slate-50 헤더, hover:bg-slate-50 행, divide-y |
| 배지 | inline-flex, rounded-full, px-2 py-0.5, text-xs |
| 모달 | fixed overlay bg-black/40, rounded-xl, shadow-xl |
| 로딩 | Loader2 animate-spin + 텍스트 |
| 에러 | bg-red-50, AlertCircle |
| 빈 상태 | Users w-12 아이콘 + 메시지 |
| 아이콘 | Lucide React |

---

## 10. 금지 사항

- ❌ Backend 변경 (이 표준 범위 외)
- ❌ API 구조 변경
- ❌ 서비스별 독자 UI 생성
- ❌ 표준 외 컬럼/필드 추가 (서비스별 예외 제외)
- ❌ 인라인 스타일 사용 (Tailwind CSS 통일)

---

## 11. 서비스별 적용 현황

| 서비스 | UsersPage | UserDetailPage | 역할 관리 | businessInfo | 상태 |
|--------|:---------:|:--------------:|:--------:|:----------:|------|
| K-Cosmetics | ✅ | ✅ | ✅ | ✅ | 표준 충족 |
| GlucoseView | ✅ | ✅ | ✅ | ✅ | 표준 충족 |
| Neture | ✅ | ✅ | ✅ | ✅ | 표준 충족 |
| KPA Society | ❌ | ❌ | ❌ | N/A | 독립 구현 필요 |

> (2026-10-04 정합) 위 표는 2026-03-18 시점 값이다. GlucoseView 는 서비스 은퇴([CHECK](../../checks/CHECK-O4O-GLUCOSEVIEW-FULL-LEGACY-REMOVAL-V1.md)) · KPA Society 는 `MemberManagementPage`(`/operator/members`) + `UserDetailPage`(`/operator/users/:id`) 로 독립 구현돼 있다. PharmacyHub · KPA 분회는 자체 회원 콘솔을 쓴다. 서비스별 현재 적용 상태는 재조사 전 판단 근거로 쓰지 않는다.

---

## 12. 다음 단계

```
WO-O4O-OPERATOR-USER-MANAGEMENT-ROLL-OUT-V1
→ GlucoseView, Neture 표준 적용
→ KPA Society 독립 구현 (kpa/members API 연동)
```

---

*확정: 2026-03-18*
*상태: 표준 v1 확정*
