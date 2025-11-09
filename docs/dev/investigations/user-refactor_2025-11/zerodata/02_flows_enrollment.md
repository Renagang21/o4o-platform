# Enrollment 플로우 설계 (신청-승인-할당)

> **작성일**: 2025-01-08
> **Phase**: P0
> **목적**: 역할 신청부터 대시보드 접근까지의 전체 플로우 정의

---

## 원칙

1. **명확한 상태 전이**: PENDING → APPROVED → ASSIGNED → DASHBOARD ACCESS
2. **감사 추적**: 모든 단계를 audit_logs에 기록
3. **사용자 피드백**: 각 단계마다 상태 안내
4. **관리자 워크플로우**: 승인/반려/보류 선택 + 사유 입력

---

## 1. 전체 플로우 개요

```
사용자           →  역할 신청   →  관리자 검토   →  시스템 할당   →  대시보드 접근
일반회원 가입       enrollment      approve          assignment       /dashboard/{role}
(PENDING)          (신청서 제출)    (KYC 검증)        (권한 부여)       (기능 사용)
```

---

## 2. 회원가입 플로우 (변경됨)

### 2.1 시퀀스 다이어그램

```
사용자       →  POST /auth/register  →  User 생성      →  자동 로그인 X
   │                    │                   │                 │
   │  1. 기본정보 입력  │                   │                 │
   │  - email, password │                   │                 │
   │  - name            │                   │                 │
   │───────────────────>│                   │                 │
   │                    │  2. 이메일 중복 확인               │
   │                    │───────────────────>│                 │
   │                    │  3. 사용자 생성                    │
   │                    │  - status: PENDING                 │
   │                    │  - 역할 할당 없음                  │
   │                    │───────────────────>│                 │
   │                    │  4. 응답 (token X)│                 │
   │  5. 가입 완료 안내 │<───────────────────│                 │
   │  "이메일 인증 후 로그인"              │                 │
   │<───────────────────│                   │                 │
```

### 2.2 변경사항 (기존 vs 신규)

| 항목 | 기존 (03_schema_current) | 신규 (P0) |
|------|-------------------------|-----------|
| **초기 상태** | `ACTIVE` (즉시 활성) | `PENDING` (대기) |
| **역할 할당** | `CUSTOMER` 자동 할당 | 역할 없음 |
| **자동 로그인** | ✅ 즉시 로그인 | ❌ 이메일 인증 필요 |
| **토큰 발급** | ✅ JWT 반환 | ❌ 토큰 없음 |

### 2.3 API 변경

```typescript
// POST /auth/register
// 기존
{
  user: { id, email, role: 'customer', status: 'ACTIVE' },
  token: 'jwt-token'
}

// 신규 (P0)
{
  user: { id, email, status: 'PENDING' },
  message: '가입이 완료되었습니다. 이메일을 확인해주세요.'
}
```

---

## 3. 역할 신청 플로우 (Enrollment)

### 3.1 시퀀스 다이어그램

```
사용자       →  POST /enrollments    →  RoleEnrollment  →  KycDocument  →  알림
   │                    │                    │                │             │
   │  1. 역할 선택      │                    │                │             │
   │  - supplier/seller/partner            │                │             │
   │───────────────────>│                    │                │             │
   │  2. 신청서 작성    │                    │                │             │
   │  - 기업정보        │                    │                │             │
   │  - 연락처          │                    │                │             │
   │  - 서류 업로드     │                    │                │             │
   │───────────────────>│  3. enrollment 생성│                │             │
   │                    │  - status: PENDING │                │             │
   │                    │  - application_data: {...}         │             │
   │                    │───────────────────>│                │             │
   │                    │  4. 서류 저장      │                │             │
   │                    │  - 사업자등록증    │                │             │
   │                    │  - 신분증          │                │             │
   │                    │─────────────────────────────────────>│             │
   │                    │  5. audit_log 기록 │                │             │
   │                    │  - event: enrollment.created        │             │
   │                    │───────────────────────────────────────────────────>│
   │  6. 신청 완료 안내 │                    │                │             │
   │  "검토 후 연락드리겠습니다"           │                │             │
   │<───────────────────│                    │                │             │
```

### 3.2 API 정의

**POST /enrollments**

Request:
```json
{
  "role": "supplier",
  "application_data": {
    "company_name": "주식회사 테스트",
    "tax_id": "123-45-67890",
    "business_email": "business@test.com",
    "business_phone": "02-1234-5678",
    "business_address": "서울특별시..."
  },
  "documents": [
    {
      "document_type": "business_registration",
      "file_url": "s3://...",
      "file_name": "사업자등록증.pdf"
    }
  ]
}
```

Response (201):
```json
{
  "enrollment": {
    "id": "enrollment-uuid",
    "role": "supplier",
    "status": "PENDING",
    "created_at": "2025-01-08T10:00:00Z"
  },
  "message": "신청이 접수되었습니다. 검토 후 연락드리겠습니다."
}
```

### 3.3 검증 규칙

- [ ] 동일 역할에 대해 PENDING 신청이 없어야 함
- [ ] 필수 서류가 모두 업로드되어야 함
- [ ] 신청서 필수 필드 검증 (역할별 다름)

---

## 4. 관리자 검토 플로우 (Review)

### 4.1 시퀀스 다이어그램 (승인)

```
관리자       →  GET /admin/enrollments  →  PATCH /admin/enrollments/:id  →  RoleAssignment  →  Profile  →  알림
   │                    │                          │                           │                 │          │
   │  1. 신청 목록 조회 │                          │                           │                 │          │
   │  - 필터: role, status                        │                           │                 │          │
   │───────────────────>│                          │                           │                 │          │
   │  2. 상세 확인      │                          │                           │                 │          │
   │  - 신청서 내용     │                          │                           │                 │          │
   │  - KYC 서류        │                          │                           │                 │          │
   │───────────────────>│                          │                           │                 │          │
   │  3. 승인 처리      │                          │                           │                 │          │
   │  - PATCH /:id      │                          │                           │                 │          │
   │  - status: APPROVED│                          │                           │                 │          │
   │  - review_note     │                          │                           │                 │          │
   │─────────────────────────────────────────────>│                           │                 │          │
   │                    │  4. enrollment 업데이트  │                           │                 │          │
   │                    │  - status: APPROVED      │                           │                 │          │
   │                    │  - reviewed_at: NOW()    │                           │                 │          │
   │                    │  - reviewed_by: admin_id │                           │                 │          │
   │                    │─────────────────────────>│  5. assignment 생성       │                 │          │
   │                    │                          │  - role: supplier         │                 │          │
   │                    │                          │  - is_active: true        │                 │          │
   │                    │                          │  - assigned_by: admin_id  │                 │          │
   │                    │                          │───────────────────────────>│                 │          │
   │                    │                          │  6. profile 생성          │                 │          │
   │                    │                          │  - supplier_profiles      │                 │          │
   │                    │                          │  - application_data 복사  │                 │          │
   │                    │                          │─────────────────────────────────────────────>│          │
   │                    │                          │  7. user.status 업데이트  │                 │          │
   │                    │                          │  - status: ACTIVE         │                 │          │
   │                    │                          │───────────────────────────>│                 │          │
   │                    │                          │  8. audit_log 기록        │                 │          │
   │                    │                          │  - enrollment.approved    │                 │          │
   │                    │                          │  - assignment.created     │                 │          │
   │                    │                          │───────────────────────────────────────────────────────>│
   │  9. 성공 응답      │                          │                           │                 │          │
   │<─────────────────────────────────────────────│                           │                 │          │
   │                    │                          │  10. 이메일 발송 (비동기) │                 │          │
   │                    │                          │  - "승인 완료, 로그인하세요"                │          │
```

### 4.2 API 정의

**GET /admin/enrollments**

Query Params:
```
?role=supplier&status=PENDING&page=1&limit=20
```

Response:
```json
{
  "enrollments": [
    {
      "id": "enrollment-uuid",
      "user": {
        "id": "user-uuid",
        "email": "user@test.com",
        "name": "홍길동"
      },
      "role": "supplier",
      "status": "PENDING",
      "application_data": {...},
      "documents": [...],
      "created_at": "2025-01-08T10:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

**PATCH /admin/enrollments/:id**

Request (승인):
```json
{
  "status": "APPROVED",
  "review_note": "서류 확인 완료"
}
```

Request (반려):
```json
{
  "status": "REJECTED",
  "review_note": "사업자등록증이 유효하지 않습니다."
}
```

Request (보류):
```json
{
  "status": "ON_HOLD",
  "review_note": "추가 서류 요청 - 통장사본"
}
```

Response (200):
```json
{
  "enrollment": {
    "id": "enrollment-uuid",
    "status": "APPROVED",
    "reviewed_at": "2025-01-08T11:00:00Z",
    "reviewed_by": "admin-uuid",
    "review_note": "서류 확인 완료"
  },
  "assignment": {
    "id": "assignment-uuid",
    "role": "supplier",
    "is_active": true
  }
}
```

### 4.3 승인 시 자동 처리

1. **RoleAssignment 생성**
   - role: enrollment.role
   - user_id: enrollment.user_id
   - enrollment_id: enrollment.id
   - is_active: true
   - assigned_by: admin_id

2. **Profile 생성**
   - supplier_profiles / seller_profiles / partner_profiles
   - application_data 복사

3. **User 상태 업데이트**
   - status: ACTIVE

4. **Audit Log 기록**
   - enrollment.approved
   - assignment.created

5. **알림 발송** (비동기)
   - 이메일: "승인 완료, 로그인하세요"

---

## 5. 사용자 측 신청 현황 조회

### 5.1 API 정의

**GET /enrollments**

Response:
```json
{
  "enrollments": [
    {
      "id": "enrollment-uuid",
      "role": "supplier",
      "status": "PENDING",
      "created_at": "2025-01-08T10:00:00Z",
      "reviewed_at": null,
      "review_note": null
    }
  ]
}
```

### 5.2 상태별 UI 메시지

| 상태 | 메시지 | 액션 |
|------|--------|------|
| PENDING | "검토 중입니다. 영업일 기준 3일 이내 연락드립니다." | - |
| APPROVED | "승인되었습니다! 이제 {역할} 대시보드를 사용할 수 있습니다." | [대시보드 이동] |
| REJECTED | "신청이 거부되었습니다. 사유: {review_note}" | [재신청] |
| ON_HOLD | "추가 확인이 필요합니다. {review_note}" | [서류 추가] |

---

## 6. 대시보드 접근 플로우

### 6.1 시퀀스 다이어그램

```
사용자       →  GET /me              →  GET /dashboard/supplier  →  대시보드
   │                 │                          │                       │
   │  1. 로그인 후   │                          │                       │
   │───────────────>│  2. assignments 조회      │                       │
   │                │  - supplier: active       │                       │
   │                │───────────────────────────>│                       │
   │  3. /me 응답   │                          │                       │
   │  - assignments: [{ role: 'supplier', is_active: true }]           │
   │<───────────────│                          │                       │
   │  4. 대시보드 접근                         │                       │
   │─────────────────────────────────────────>│  5. RBAC 미들웨어     │
   │                │                          │  - hasRole('supplier') ✅
   │                │                          │───────────────────────>│
   │  6. 대시보드 화면                         │                       │
   │<──────────────────────────────────────────────────────────────────│
```

### 6.2 승인 전 접근 시 리디렉션

```typescript
// FE 라우팅 가드
function SupplierDashboard() {
  const { user } = useAuth();
  const hasSupplierRole = user?.assignments?.some(
    a => a.role === 'supplier' && a.isActive
  );

  if (!hasSupplierRole) {
    return <Redirect to="/apply/supplier/status" />;
  }

  return <SupplierDashboardContent />;
}
```

---

## 7. 상태 전이 다이어그램

```
[가입]
  ↓
[PENDING user]
  ↓
[역할 신청] → [PENDING enrollment]
  ↓                 ↓
[관리자 검토]        ↓
  ↓                 ↓
  ├─[승인] → [APPROVED enrollment]
  │             ↓
  │          [assignment 생성]
  │             ↓
  │          [profile 생성]
  │             ↓
  │          [ACTIVE user]
  │             ↓
  │          [대시보드 접근]
  │
  ├─[반려] → [REJECTED enrollment] → [재신청 가능]
  │
  └─[보류] → [ON_HOLD enrollment] → [서류 보완] → [PENDING]
```

---

## 8. Edge Cases 처리

### 8.1 중복 신청

**시나리오**: 이미 PENDING 신청이 있는데 다시 신청
**처리**: 409 Conflict 반환

```json
{
  "error": "DUPLICATE_ENROLLMENT",
  "message": "이미 처리 중인 신청이 있습니다.",
  "existing_enrollment_id": "enrollment-uuid"
}
```

### 8.2 반려 후 재신청

**시나리오**: REJECTED 상태의 신청이 있고 재신청
**처리**: 새 enrollment 생성 (기존은 보관)

### 8.3 이미 역할을 가진 경우

**시나리오**: 이미 supplier 역할이 있는데 supplier 신청
**처리**: 409 Conflict 반환

```json
{
  "error": "ALREADY_HAS_ROLE",
  "message": "이미 해당 역할을 보유하고 있습니다."
}
```

---

## 9. 검증 체크리스트

- [ ] 회원가입 시 PENDING 상태로 생성
- [ ] 역할 신청 API 동작 확인
- [ ] 관리자 승인 시 assignment 자동 생성
- [ ] Profile 자동 생성 확인
- [ ] audit_logs 기록 확인
- [ ] 승인 전 대시보드 접근 시 리디렉션
- [ ] 승인 후 대시보드 접근 성공
- [ ] 중복 신청 차단 확인
- [ ] 반려 후 재신청 가능 확인

---

**작성**: Claude Code
**상태**: ✅ P0 플로우 정의 완료
**다음**: `04_rbac_policy.md` (RBAC 정책 정의)
