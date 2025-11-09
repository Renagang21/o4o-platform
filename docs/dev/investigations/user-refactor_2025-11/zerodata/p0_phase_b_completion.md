# Phase B — API & RBAC 구현 완료 보고서

**작성일**: 2025-01-08
**Phase**: B - API & RBAC
**브랜치**: feat/user-refactor-p0-zerodata
**상태**: ✅ 구현 완료 (TypeScript 컴파일 통과)

---

## 요약 (Executive Summary)

Phase B의 목표는 P0 RBAC 시스템을 위한 API 엔드포인트 및 미들웨어 구현이었습니다.

**구현 결과**:
- ✅ RBAC 미들웨어 3종 구현 (requireAuth, requireAdmin, requireRole)
- ✅ 사용자 Enrollment API 2개 엔드포인트
- ✅ 관리자 Review API 4개 엔드포인트
- ✅ /me 엔드포인트 확장 (assignments 배열 포함)
- ✅ 레이트 리미터 2종 추가 (enrollment, adminReview)
- ✅ TypeScript 컴파일 에러 제로 달성

---

## 구현 내역

### 1. RBAC 미들웨어 (`src/middleware/auth.middleware.ts`)

#### 구현 함수

**1.1 requireAuth()**
- JWT 토큰 검증 (Bearer 헤더 또는 httpOnly 쿠키)
- 사용자 DB 조회 및 isActive 확인
- 401 Unauthorized 반환 (미인증 시)

**1.2 requireAdmin()**
- requireAuth 선행 실행
- User.hasRole('admin'|'super_admin'|'operator') 확인
- 403 Forbidden 반환 (무권한 시)
- 구조화 로그: userId, path, method, ip, timestamp

**1.3 requireRole(role: string)**
- requireAuth 선행 실행
- RoleAssignment 테이블에서 (userId, role, isActive=true) 확인
- assignment.isValidNow() 호출로 유효기간 검증
- 403 Forbidden 반환 (무권한 시)
- req.roleAssignment에 assignment 객체 바인딩

#### 에러 코드 표준화
- AUTH_REQUIRED: 토큰 누락
- INVALID_USER: 사용자 미존재 또는 비활성
- USER_INACTIVE: 계정 비활성
- INVALID_TOKEN: 토큰 만료/오류
- FORBIDDEN: 관리자 권한 필요
- ROLE_REQUIRED: 특정 역할 필요

---

### 2. Enrollment API (사용자) (`src/routes/enrollments.routes.ts`)

#### 2.1 POST /api/enrollments

**요청 Body**:
```json
{
  "role": "supplier|seller|partner",
  "fields": { /* 역할별 필드 */ },
  "agree": { /* 약관 동의 */ }
}
```

**검증 로직**:
- role 값 검증 (supplier/seller/partner만 허용)
- fields 객체 필수 확인
- 중복 신청 방지: 동일 (userId, role)의 PENDING/ON_HOLD 상태 존재 시 409 Conflict

**응답**:
- 201 Created
- 409 Conflict (중복 신청)
- 422 Unprocessable Entity (필드 누락)

**보안**:
- requireAuth() 미들웨어 적용
- enrollmentLimiter: 분당 3회 제한

**감사 로그**:
- AuditLog 생성: action='enrollment.create', changes 배열 기록

#### 2.2 GET /api/enrollments/my

**응답**:
```json
{
  "enrollments": [
    {
      "id": "uuid",
      "role": "supplier",
      "status": "PENDING",
      "submitted_at": "2025-01-08T...",
      "decided_at": null,
      "decided_by": null,
      "decision_reason": null,
      "application_data": { /* 신청 데이터 */ },
      "created_at": "2025-01-08T...",
      "updated_at": "2025-01-08T..."
    }
  ]
}
```

**정렬**: createdAt DESC

---

### 3. Admin Review API (관리자) (`src/routes/admin/enrollments.routes.ts`)

#### 3.1 GET /api/admin/enrollments

**쿼리 파라미터**:
- role: supplier|seller|partner
- status: PENDING|APPROVED|REJECTED|ON_HOLD
- q: 이메일/이름 검색
- date_from, date_to: 제출일 범위
- page, limit: 페이지네이션 (기본 page=1, limit=20, 최대 100)

**응답**:
```json
{
  "items": [ /* enrollment 객체 배열 */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**보안**: requireAdmin() + standardLimiter

#### 3.2 PATCH /api/admin/enrollments/:id/approve

**Body**: `{ "reason": "승인 사유" }` (선택)

**처리 로직** (트랜잭션):
1. Enrollment 상태 검증 (canApprove()로 PENDING/ON_HOLD만 허용)
2. enrollment.approve(adminId, reason) 호출
3. RoleAssignment upsert:
   - 기존 assignment 있으면 재활성화
   - 없으면 신규 생성 (isActive=true, validFrom=now)
4. User 상태 업데이트: PENDING → ACTIVE (해당 시)
5. ApprovalLog 생성 (action='approved')
6. AuditLog 생성 (changes 배열 기록)

**멱등성**: 이미 APPROVED 상태면 200 + 현재 상태 반환

**보안**: requireAdmin() + adminReviewLimiter (분당 20회)

#### 3.3 PATCH /api/admin/enrollments/:id/reject

**Body**: `{ "reason": "거부 사유" }` (필수)

**처리 로직** (트랜잭션):
1. enrollment.reject(adminId, reason) 호출
2. ApprovalLog 생성 (action='rejected')
3. AuditLog 생성

**멱등성**: 이미 REJECTED 상태면 200 반환

#### 3.4 PATCH /api/admin/enrollments/:id/hold

**Body**:
```json
{
  "reason": "보류 사유",
  "required_fields": ["businessLicense", "bankStatement"]  // 선택
}
```

**처리 로직** (트랜잭션):
1. required_fields가 있으면 reviewNote에 포함
2. enrollment.hold(adminId, reviewNote) 호출
3. ApprovalLog 생성 (action='status_changed', metadata에 required_fields 저장)
4. AuditLog 생성

**보안**: requireAdmin() + adminReviewLimiter

---

### 4. /me 엔드포인트 확장 (`src/routes/auth-v2.ts`)

**기존**: 사용자 기본 정보만 반환
**변경**: assignments 배열 추가

**응답 예시**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "홍길동",
    "status": "ACTIVE",
    "businessInfo": { /* ... */ },
    "permissions": [],
    "isActive": true,
    "isEmailVerified": true,
    "createdAt": "2025-01-01T...",
    "updatedAt": "2025-01-08T..."
  },
  "assignments": [
    {
      "role": "supplier",
      "active": true,
      "activated_at": "2025-01-08T...",
      "deactivated_at": null,
      "valid_from": "2025-01-08T...",
      "valid_until": null,
      "assigned_by": "admin-uuid",
      "assigned_at": "2025-01-08T..."
    },
    {
      "role": "seller",
      "active": false,
      "activated_at": null,
      "deactivated_at": "2024-12-31T...",
      "valid_from": "2024-12-01T...",
      "valid_until": "2024-12-31T...",
      "assigned_by": "admin-uuid",
      "assigned_at": "2024-12-01T..."
    }
  ]
}
```

**레거시 필드 제거**: role, roles, activeRole 응답에서 제외

---

### 5. 레이트 리미터 추가 (`src/config/rate-limiters.config.ts`)

#### 5.1 enrollmentLimiter
- 창: 1분
- 최대: 3회
- 메시지: "Too many enrollment requests. Please try again later."
- 코드: ENROLLMENT_RATE_LIMIT_EXCEEDED

#### 5.2 adminReviewLimiter
- 창: 1분
- 최대: 20회
- 메시지: "Too many admin review requests"
- 코드: ADMIN_REVIEW_RATE_LIMIT_EXCEEDED

**적용**:
- GET/POST /api/enrollments → enrollmentLimiter
- GET/PATCH /api/admin/enrollments → adminReviewLimiter

---

### 6. 라우트 등록 (`src/config/routes.config.ts`)

**추가된 라우트**:
```typescript
// 사용자 Enrollment
app.use('/api/enrollments', enrollmentLimiter, enrollmentsRoutes);
app.use('/api/v1/enrollments', enrollmentLimiter, enrollmentsRoutes);

// 관리자 Review
app.use('/api/admin/enrollments', adminReviewLimiter, adminEnrollmentsRoutes);
app.use('/api/v1/admin/enrollments', adminReviewLimiter, adminEnrollmentsRoutes);
```

---

## 엔티티 필드 매칭 이슈 해결

### 문제
초기 구현 시 엔티티 필드명을 잘못 가정:
- `decidedAt` → 실제: `reviewedAt`
- `reviewerId` → 실제: `reviewedBy`
- `metadata` 필드 사용 시도 → 실제: 미존재

### 해결
1. RoleEnrollment 엔티티의 헬퍼 메서드 활용:
   - `enrollment.approve(reviewerId, note)`
   - `enrollment.reject(reviewerId, note)`
   - `enrollment.hold(reviewerId, note)`

2. ApprovalLog 엔티티의 실제 필드 사용:
   - snake_case: `user_id`, `admin_id`, `previous_status`, `new_status`, `notes`
   - action 타입: 'approved' | 'rejected' | 'status_changed' | 'pending'

3. AuditLog 엔티티의 실제 구조:
   - `changes` 배열 (AuditChange[]) 사용
   - `payload` 필드는 존재하지 않음

4. User 상태 enum 사용:
   - `UserStatus.PENDING`, `UserStatus.ACTIVE` 명시적 사용

---

## 보안 및 품질

### httpOnly 쿠키 + CORS
- auth-v2.ts에서 쿠키 기반 인증 처리
- CORS credentials:true 설정 (main.ts에서 확인 완료)
- SameSite 정책 적용

### 에러 포맷 표준화
```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { /* optional additional info */ }
}
```

### 로그 민감정보 마스킹
- AuditLog에 신청 데이터 전체를 저장하지 않음
- fieldsCount만 기록하여 규모 파악
- 실제 신청 데이터는 RoleEnrollment.applicationData에만 저장

### 트랜잭션 보장
모든 상태 전이는 트랜잭션으로 처리:
```typescript
const queryRunner = AppDataSource.createQueryRunner();
await queryRunner.startTransaction();
try {
  // 전이 로직
  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  // 에러 처리
} finally {
  await queryRunner.release();
}
```

---

## 라우트 보호 매트릭스 (최종)

| Route                                  | Auth | Role Check     | Rate Limiter     | Notes                  |
| -------------------------------------- | ---- | -------------- | ---------------- | ---------------------- |
| `POST /api/auth/login`                 | -    | -              | standardLimiter  | 로그인                    |
| `GET /api/v1/auth/cookie/me`           | ✅    | -              | -                | assignments[] 포함       |
| `POST /api/enrollments`                | ✅    | -              | enrollmentLimiter| 분당 3회                 |
| `GET /api/enrollments/my`              | ✅    | -              | enrollmentLimiter| 내 신청 조회              |
| `GET /api/admin/enrollments`           | ✅    | admin/operator | adminReviewLimiter| 필터 지원               |
| `PATCH /api/admin/enrollments/:id/approve` | ✅ | admin/operator | adminReviewLimiter| 트랜잭션·로그            |
| `PATCH /api/admin/enrollments/:id/reject`  | ✅ | admin/operator | adminReviewLimiter| reason 필수             |
| `PATCH /api/admin/enrollments/:id/hold`    | ✅ | admin/operator | adminReviewLimiter| required_fields 선택    |

---

## 테스트 상태 (DoD 체크리스트)

### ✅ 기술 검증
- [x] TypeScript 컴파일 에러 제로
- [x] 엔티티 필드 매칭 확인 (RoleEnrollment, ApprovalLog, AuditLog)
- [x] 미들웨어 함수 시그니처 검증
- [x] 트랜잭션 경계 명확화
- [x] 레이트 리미터 바인딩 확인

### ⏳ 기능 검증 (수동 테스트 필요)
- [ ] POST /enrollments(supplier) → 201, `pending` / 중복 시 409
- [ ] GET /enrollments/my에 신청 건 노출
- [ ] GET /admin/enrollments?role=supplier&status=pending에서 조회
- [ ] PATCH approve → RoleAssignment(active=true) 생성·업데이트
- [ ] /me에 해당 역할이 assignments[]로 반영
- [ ] PATCH reject/hold 정상 전이 및 로그 기록
- [ ] 미인증 요청 401 / 무권한 403 일관 동작
- [ ] 전이 멱등성: approve 반복 호출 시 200 재응답
- [ ] AuditLog/ApprovalLog에 모든 이벤트 기록

---

## 산출물

### 코드 변경
1. **신규 파일**:
   - `src/routes/enrollments.routes.ts` (179줄)
   - `src/routes/admin/enrollments.routes.ts` (553줄)
   - `docs/dev/investigations/user-refactor_2025-11/zerodata/p0_phase_b_completion.md` (본 문서)

2. **수정 파일**:
   - `src/middleware/auth.middleware.ts` (205줄, 완전 재작성)
   - `src/routes/auth-v2.ts` (299줄, /me 엔드포인트 확장)
   - `src/config/rate-limiters.config.ts` (157줄, 2개 리미터 추가)
   - `src/config/routes.config.ts` (515줄, 4개 라우트 등록)

### 변경 요약 1페이지
- **RBAC 미들웨어**: requireAuth, requireAdmin, requireRole 구현
- **Enrollment API**: 신청 생성 + 내 신청 조회
- **Admin Review API**: 목록 조회 + 승인/거부/보류 (트랜잭션)
- **/me 확장**: assignments 배열 추가
- **레이트 리미터**: enrollment (3/min), adminReview (20/min)
- **에러 표준화**: { code, message, details? } 포맷

### 운영 Runbook (요약)

**1. 전이 실패 (트랜잭션 오류)**
- 로그 확인: `logger.error('Error approving enrollment', { enrollmentId, adminId })`
- DB 상태 확인: RoleEnrollment, RoleAssignment, ApprovalLog, AuditLog
- 트랜잭션은 자동 롤백되므로 부분 커밋 없음
- 재시도 가능 (멱등성 보장)

**2. 중복 신청 (409 Conflict)**
- 사용자: 기존 신청 상태 확인 (/api/enrollments/my)
- 운영자: 기존 신청 처리 후 재신청 안내

**3. 403 Forbidden 다발**
- requireAdmin 로그 확인: `logger.warn('Unauthorized admin access attempt')`
- 사용자 권한 확인: User.hasRole('admin'|'super_admin'|'operator')
- RoleAssignment 확인: (userId, role='admin', isActive=true)

**4. 레이트 리밋 초과**
- 클라이언트 측에서 429 Too Many Requests 처리
- enrollmentLimiter: 1분 대기 후 재시도
- adminReviewLimiter: 대량 작업 시 주기적 간격 필요

---

## 롤백 방안

### 라우트 비활성화
`src/config/routes.config.ts`에서 해당 라인 주석 처리:
```typescript
// app.use('/api/enrollments', enrollmentLimiter, enrollmentsRoutes);
// app.use('/api/admin/enrollments', adminReviewLimiter, adminEnrollmentsRoutes);
```

### 배포 리버트
```bash
git revert <commit-hash>
git push origin main
# GitHub Actions 자동 배포 실행
```

### 데이터 전이 되돌림 (주의!)
**경고**: RoleAssignment 생성은 되돌리기 어려움 (비즈니스 영향)
- 신규 생성된 RoleAssignment는 수동 비활성화:
  ```sql
  UPDATE role_assignments
  SET is_active = false, valid_until = NOW()
  WHERE id IN (...);
  ```
- ApprovalLog, AuditLog는 삭제하지 말고 보관 (감사 추적)

---

## Phase C 대비 사항

### 프론트엔드 연동
- `/me` 응답 구조 변경: assignments 배열 사용
- 레거시 role/roles/activeRole 제거에 따른 UI 수정 필요
- 401/403 에러 처리 표준화

### Dashboard 라우트 보호 (Phase C)
```typescript
// Phase C에서 추가 예정
app.use('/api/dashboard/supplier', requireRole('supplier'), supplierDashboardRoutes);
app.use('/api/dashboard/seller', requireRole('seller'), sellerDashboardRoutes);
app.use('/api/dashboard/partner', requireRole('partner'), partnerDashboardRoutes);
```

### 추가 테스트 필요
- E2E 테스트: Postman/curl로 전체 플로우 검증
- 부하 테스트: 레이트 리미터 임계값 조정
- 에러 시나리오: 401/403/409/422 응답 검증

---

## 결론

Phase B의 모든 구현 목표를 달성했습니다:

✅ **서버 중심 RBAC 시스템 구축**
✅ **Enrollment 신청 → 관리자 승인 → RoleAssignment 생성 플로우 완성**
✅ **트랜잭션·로그·멱등성·레이트리밋 보안 요구사항 충족**
✅ **TypeScript 컴파일 에러 제로 (타입 안정성 확보)**

**다음 단계**:
1. 기능 E2E 테스트 수행
2. 변경사항 커밋 및 PR 생성
3. Phase C (프론트엔드 연동 + Dashboard) 준비

---

**작성자**: Claude Code Agent
**검토자**: TBD
**승인자**: TBD
**문서 버전**: 1.0
