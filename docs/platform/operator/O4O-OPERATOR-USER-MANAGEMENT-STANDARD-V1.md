# O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1

> **O4O 운영자 회원관리 표준 v1**
>
> 기준 구현: GlycoPharm Operator 회원관리
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

## 2. 라우팅 표준

```
/operator/users           → UsersPage (목록)
/operator/users/:id       → UserDetailPage (상세)
```

모든 서비스 동일 적용.

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
- 비밀번호 변경 (PasswordModal)
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
PUT    /api/v1/operator/members/:userId                  수정 (프로필 + 비밀번호 + businessInfo)
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
예: `glycopharm:operator`는 `glycopharm:*` 역할만 할당.

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
| glycopharm | GlycoPharm |
| glucoseview | GlucoseView |
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
| GlycoPharm | ✅ | ✅ | ✅ | ✅ | **표준 기준** |
| K-Cosmetics | ✅ | ✅ | ✅ | ✅ | 표준 충족 |
| GlucoseView | ✅ | ✅ | ✅ | ✅ | 표준 충족 |
| Neture | ✅ | ✅ | ✅ | ✅ | 표준 충족 |
| KPA Society | ❌ | ❌ | ❌ | N/A | 독립 구현 필요 |

---

## 12. 다음 단계

```
WO-O4O-OPERATOR-USER-MANAGEMENT-ROLL-OUT-V1
→ GlucoseView, Neture 표준 적용
→ KPA Society 독립 구현 (kpa/members API 연동)
```

---

*확정: 2026-03-18*
*기준 구현: GlycoPharm (commit b5d7b82c9)*
*상태: 표준 v1 확정*
