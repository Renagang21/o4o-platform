# 현재 흐름 조사 (Current Flows)

> **조사 일시**: 2025-01-08
> **목적**: 현재 사용자 가입, 로그인, 프로필 편집 흐름의 실제 시퀀스 파악

---

## 1. 회원가입 흐름 (Current Signup Flow)

### 1.1 시퀀스 다이어그램

```
사용자       →  Signup.tsx        →  POST /auth/signup  →  User 엔티티
   │               │                       │                    │
   │  1. 폼 입력   │                       │                    │
   │─────────────>│                       │                    │
   │               │  2. API 호출          │                    │
   │               │──────────────────────>│                    │
   │               │                       │  3. 이메일 중복 확인
   │               │                       │───────────────────>│
   │               │                       │<───────────────────│
   │               │                       │  4. 사용자 생성
   │               │                       │  - role: CUSTOMER
   │               │                       │  - status: ACTIVE ←───┐
   │               │                       │───────────────────>│  │
   │               │  5. token + user      │                    │  │
   │               │<──────────────────────│                    │  │
   │  6. 즉시 로그인                       │                    │  │
   │<──────────────│                       │                    │  │
   │               │                       │                    │  │
   └─ 7. 리다이렉트: /                     │                    │  │
                                           │                    │  │
                                           ❌ 승인 대기 없음 ────┘
```

**증거**:
- `apps/main-site/src/pages/auth/Signup.tsx:L76-102`
- `apps/api-server/src/routes/auth.ts:L149-150` (role: CUSTOMER, status: ACTIVE)

**현황**:
- ✅ **즉시 활성화**: `ACTIVE` 상태로 바로 생성
- ❌ **승인 대기 없음**: `PENDING` 상태로 생성 후 승인 **미사용**
- ❌ **역할 신청 불가**: 가입 시 역할 선택 **불가**, 무조건 `CUSTOMER`
- ❌ **이메일 인증 생략**: `isEmailVerified` 체크 안 함

---

## 2. 로그인 흐름 (Current Login Flow)

### 2.1 시퀀스 다이어그램

```
사용자       →  Login.tsx         →  POST /auth/login   →  User 엔티티  →  AuthProvider
   │               │                       │                   │               │
   │  1. 이메일/PW │                       │                   │               │
   │─────────────>│                       │                   │               │
   │               │  2. API 호출          │                   │               │
   │               │──────────────────────>│                   │               │
   │               │                       │  3. 사용자 조회    │               │
   │               │                       │  - email          │               │
   │               │                       │  - relations: dbRoles, activeRole
   │               │                       │──────────────────>│               │
   │               │                       │<──────────────────│               │
   │               │                       │  4. 비밀번호 검증  │               │
   │               │                       │  5. 상태 확인      │               │
   │               │                       │  - ACTIVE or APPROVED
   │               │                       │  6. JWT 생성       │               │
   │               │                       │  - payload: {userId, email, role}
   │               │                       │  7. lastLoginAt 업데이트
   │               │                       │──────────────────>│               │
   │               │  8. 응답              │                   │               │
   │               │  - token              │                   │               │
   │               │  - user {             │                   │               │
   │               │      role,            │  ← 레거시 단일    │               │
   │               │      roles[],         │  ← 다중 역할 정보 │               │
   │               │      activeRole,      │  ← 현재 활성 역할 │               │
   │               │      canSwitchRoles   │  ← 전환 가능 여부 │               │
   │               │    }                  │                   │               │
   │               │<──────────────────────│                   │               │
   │  9. setUser(user)                     │                   │               │
   │  - localStorage: admin-auth-storage, accessToken          │               │
   │               │──────────────────────────────────────────>│               │
   │               │                       │                   │  10. user.role만 사용
   │               │                       │                   │  ❌ activeRole 무시
   │               │                       │                   │──────────────>│
   │  11. 리다이렉트                       │                   │               │
   │  - getRedirectForRole(user.role)      │                   │               │
   │<──────────────│                       │                   │               │
```

**증거**:
- `apps/main-site/src/pages/auth/Login.tsx`
- `apps/api-server/src/routes/auth.ts:L32-99`
- `packages/auth-context/src/AuthProvider.tsx:L94-132`

**현황**:
- ✅ **다중 역할 정보 반환**: API는 `roles[]`, `activeRole`, `canSwitchRoles` 반환
- ❌ **FE에서 무시**: FE는 `user.role`만 사용, 나머지 무시
- ❌ **역할 전환 UI 없음**: `canSwitchRoles`는 true여도 UI 없음

---

## 3. 사용자 목록 조회 흐름 (Users List)

### 3.1 시퀀스 다이어그램

```
관리자       →  UsersListClean    →  GET /users         →  User Repository
   │               │                       │                    │
   │  1. 페이지 접속                       │                    │
   │─────────────>│                       │                    │
   │               │  2. fetchUsers()      │                    │
   │               │──────────────────────>│                    │
   │               │                       │  3. findAll()      │
   │               │                       │  - SELECT * FROM users
   │               │                       │  ❌ 역할별 필터 없음
   │               │                       │  ❌ 전용 경로 없음
   │               │                       │───────────────────>│
   │               │  4. users[]           │                    │
   │               │<──────────────────────│                    │
   │  5. 렌더링    │                       │                    │
   │  - 탭: all / administrator / editor / subscriber
   │  - 필터: 클라이언트 사이드 (filteredUsers)
   │  - 테이블: 공통 컬럼 (username, email, role, posts, date)
   │<──────────────│                       │                    │
   │               │                       │                    │
   │  6. Bulk Action: change-role          │                    │
   │  - prompt("Enter new role")  ← UI 부재                    │
   │  - PATCH /users/:id { role: newRole } │                    │
   │  ❌ 검증 없음                         │                    │
   │─────────────>│──────────────────────>│───────────────────>│
```

**증거**:
- `apps/admin-dashboard/src/pages/users/UsersListClean.tsx:L88-124`
- `apps/admin-dashboard/src/pages/users/UsersListClean.tsx:L254-273`

**현황**:
- ✅ **단일 API**: GET `/users` (모든 역할 통합)
- ❌ **역할별 전용 엔드포인트 없음**: `/suppliers`, `/sellers` 등 없음
- ❌ **클라이언트 사이드 필터링**: 서버에서 필터링 안 함
- ❌ **역할 변경 검증 없음**: prompt로 직접 입력, 검증 없음

---

## 4. 역할 변경 흐름 (현재 - 관리자 수동 변경)

### 4.1 시퀀스 다이어그램

```
관리자       →  UsersListClean    →  PATCH /users/:id   →  User 엔티티
   │               │                       │                    │
   │  1. Bulk Action 선택: "change-role"  │                    │
   │─────────────>│                       │                    │
   │  2. prompt("Enter new role")          │                    │
   │<──────────────│                       │                    │
   │  3. 역할 입력 (예: "supplier")        │                    │
   │─────────────>│                       │                    │
   │               │  4. API 호출          │                    │
   │               │  - PATCH /users/:id   │                    │
   │               │  - body: { role: "supplier" }
   │               │──────────────────────>│                    │
   │               │                       │  5. user.role = "supplier"
   │               │                       │  ❌ 역할 검증 없음
   │               │                       │  ❌ 승인 과정 없음
   │               │                       │  ❌ 로그 기록 없음
   │               │                       │───────────────────>│
   │               │  6. 성공              │                    │
   │               │<──────────────────────│                    │
   │  7. UI 업데이트                       │                    │
   │<──────────────│                       │                    │
```

**증거**:
- `apps/admin-dashboard/src/pages/users/UsersListClean.tsx:L254-273`

**현황**:
- ❌ **검증 없음**: 어떤 역할이든 입력 가능
- ❌ **승인 흐름 없음**: 즉시 역할 변경
- ❌ **로그 없음**: 누가 언제 변경했는지 기록 안 됨
- ❌ **알림 없음**: 사용자에게 역할 변경 알림 없음

---

## 5. 드롭쉬핑 역할 승인 흐름 (별도 구현 추정)

### 5.1 시퀀스 다이어그램 (추정)

```
공급자       →  공급자 신청        →  POST /suppliers/apply  →  Supplier 엔티티
   │               │                       │                          │
   │  1. 신청 폼 작성                      │                          │
   │  - 회사명, 사업자번호 등              │                          │
   │─────────────>│                       │                          │
   │               │  2. API 호출          │                          │
   │               │──────────────────────>│                          │
   │               │                       │  3. Supplier 생성        │
   │               │                       │  - status: PENDING
   │               │                       │  - user_id: FK
   │               │                       │─────────────────────────>│
   │               │  4. 신청 완료         │                          │
   │               │<──────────────────────│                          │
   │               │                       │                          │
관리자       →  승인 관리 화면    →  POST /suppliers/:id/approve  →  Supplier 엔티티
   │               │                       │                          │
   │  5. 승인 대기 목록 조회               │                          │
   │─────────────>│──────────────────────>│─────────────────────────>│
   │               │                       │  6. 승인 처리            │
   │               │                       │  - status: APPROVED
   │               │                       │  - approvedAt: NOW()
   │               │                       │  - approvedBy: admin.id
   │               │                       │─────────────────────────>│
   │               │                       │  7. User.roles 업데이트?
   │               │                       │  ⏳ 미확인
```

**확인 필요**:
- [ ] 실제 신청 API 경로
- [ ] 승인 시 User.role 또는 User.dbRoles 자동 업데이트 여부
- [ ] 승인 로그 기록 여부

---

## 6. 프로필 편집 흐름 (추정 - 미조사)

### 6.1 시퀀스 다이어그램 (추정)

```
사용자       →  UserProfile       →  PATCH /users/me    →  User 엔티티
   │               │                       │                    │
   │  1. 프로필 수정                       │                    │
   │  - 이름, 아바타 등                    │                    │
   │─────────────>│                       │                    │
   │               │  2. API 호출          │                    │
   │               │──────────────────────>│                    │
   │               │                       │  3. 업데이트       │
   │               │                       │───────────────────>│
   │               │  4. 성공              │                    │
   │               │<──────────────────────│                    │
   │  5. UI 업데이트                       │                    │
   │<──────────────│                       │                    │
```

**확인 필요**:
- [ ] 프로필 편집 API 경로
- [ ] 역할별 특화 필드 (businessInfo) 편집 UI
- [ ] 역할 변경 신청 UI 유무

---

## 7. 격차 요약 (Flows)

| 흐름 | 현재 상태 | 목표 (역할 분리형) | 격차 |
|------|----------|-------------------|------|
| **회원가입** | 즉시 ACTIVE | 신청 → 승인 흐름 | ⚠️ High |
| **역할 할당** | 관리자 수동 변경 (검증 없음) | 신청 + 승인 프로세스 | ⚠️ High |
| **로그인 응답** | 다중 역할 정보 **포함** | ✅ 이미 지원됨 | ✅ OK |
| **FE 역할 사용** | user.role만 사용 | activeRole + roles[] 사용 | ⚠️ High |
| **사용자 목록** | 통합 API + 클라이언트 필터링 | 역할별 전용 API | ⚠️ Medium |
| **드롭쉬핑 승인** | 별도 구현 (추정) | 모든 역할에 통일 | ⏳ 미확인 |

---

## 8. 주요 발견사항

### 8.1 API ↔ FE 불일치
- ✅ **API**: 다중 역할 정보 반환 (`roles[]`, `activeRole`, `canSwitchRoles`)
- ❌ **FE**: `user.role`만 사용, 나머지 무시
- ⚠️ **낭비**: API에서 준비한 데이터를 FE에서 사용하지 않음

### 8.2 승인 흐름 부분 구현
- ❌ **일반 회원가입**: 즉시 ACTIVE (승인 없음)
- ✅ **드롭쉬핑 신청**: 별도 승인 흐름 **존재** (추정)
- ⚠️ **일관성 부재**: 역할에 따라 다른 흐름

### 8.3 역할 변경 검증 부재
- ❌ **prompt로 직접 입력**: UI 없음
- ❌ **검증 없음**: 잘못된 역할 입력 가능
- ❌ **로그 없음**: 변경 이력 미기록

---

## 9. 다음 단계

1. ✅ ACL 매트릭스 작성 (`05_acl_matrix_current.md`)
2. ⏳ 격차 분석 (`06_gap_analysis.md`)
3. ⏳ 추천사항 정리 (`07_recommendations_preV2.md`)

---

**작성**: Claude Code
**검증**: ⏳ Pending
