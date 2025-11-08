# 격차 분석 (Gap Analysis)

> **조사 일시**: 2025-01-08
> **목적**: 현재 상태(단일 사용자 관리) vs 목표 상태(역할 분리형) 격차 분석 및 우선순위 설정

---

## 1. 격차 요약 테이블 (Overview)

| 영역 | 항목 | 현재 | 목표 | 격차 | 영향도 | 난이도 | 우선순위 |
|------|------|------|------|------|--------|--------|----------|
| **FE** | 라우팅 | 단일 `/users` | 역할별 `/suppliers` 등 | ⚠️ High | High | Medium | **P0** |
| **FE** | 메뉴 | 단일 "사용자" | 역할별 메뉴 | ⚠️ High | High | Low | **P0** |
| **FE** | 목록 화면 | 통합 테이블 | 역할별 전용 화면 | ⚠️ High | High | High | **P1** |
| **FE** | Auth 상태 | `user.role` | `activeRole + roles[]` | ⚠️ Medium | Medium | Low | **P1** |
| **API** | 회원가입 | 즉시 ACTIVE | 신청 → 승인 | ⚠️ High | High | High | **P0** |
| **API** | 역할 할당 | 관리자 수동 (검증 없음) | 신청 + 승인 | ⚠️ High | High | High | **P0** |
| **API** | JWT 토큰 | 단일 role | activeRole + roles[] | ⚠️ Medium | Medium | Medium | **P2** |
| **DB** | 역할 필드 | 3중 (role/roles/dbRoles) | dbRoles만 | ⚠️ High | High | High | **P1** |
| **DB** | 승인 로그 | 관계만 정의 | 실제 사용 + 이력 | ⚠️ High | Medium | Medium | **P1** |
| **ACL** | 권한 정의 | 하드코딩 | Permission 테이블 | ⚠️ High | Medium | High | **P2** |
| **ACL** | 권한 체크 | role 비교 | permission 체크 | ⚠️ Medium | Medium | Medium | **P2** |

**우선순위**:
- **P0** (Critical): 즉시 해결 필요 (보안/컴플라이언스/운영 블로커)
- **P1** (High): 다음 스프린트에 해결
- **P2** (Medium): 여유 있을 때 해결

---

## 2. 프론트엔드 격차 상세 (FE Gap Details)

### 2.1 라우팅 구조

| 항목 | 현재 | 목표 | 격차 | 증거 | 영향도 | 난이도 |
|------|------|------|------|------|--------|--------|
| 사용자 목록 | `/users` | `/suppliers`, `/sellers`, `/partners` | ⚠️ High | App.tsx:L40 | **High** | Medium |
| 신규 추가 | `/users/new` | `/suppliers/new`, `/sellers/new` 등 | ⚠️ High | App.tsx:L41 | **High** | Medium |
| 상세 | `/users/:id` | `/suppliers/:id` 등 | ⚠️ High | App.tsx:L42 | **High** | Medium |
| 승인 관리 | `/dropshipping/approvals` | `/admin/approvals` (통합) | ⚠️ Medium | wordpressMenuFinal.tsx:L129 | Medium | Low |

**근거**:
- ✅ **드롭쉬핑 메뉴**: 이미 역할별로 분리되어 있음 (`공급자`, `판매자`, `파트너`)
- ❌ **사용자 메뉴**: 통합되어 있음
- ⚠️ **모순**: 같은 시스템 내에 두 가지 접근 방식 혼재

**영향**:
- **UX**: 관리자가 역할별로 빠르게 접근 불가
- **보안**: 역할별 권한 체크 어려움
- **확장성**: 새 역할 추가 시 라우팅 복잡도 증가

**해결 방안**:
1. `/suppliers`, `/sellers`, `/partners` 라우트 신규 추가
2. 기존 `/users` 라우트 유지 (하위 호환)
3. 메뉴에서 역할별 링크 추가

---

### 2.2 메뉴 구조

| 항목 | 현재 | 목표 | 격차 | 증거 | 영향도 | 난이도 |
|------|------|------|------|------|--------|--------|
| 사용자 메뉴 | 단일 "사용자" | "공급자", "판매자", "파트너" (최상위) | ⚠️ High | wordpressMenuFinal.tsx:L100-111 | **High** | **Low** |
| 드롭쉬핑 메뉴 | 별도 존재 | 사용자 메뉴와 통합 (선택) | ⏳ | wordpressMenuFinal.tsx:L120-132 | Low | Low |

**해결 방안**:
1. **옵션 A**: 드롭쉬핑 메뉴를 사용자 메뉴로 이동
   ```typescript
   {
     id: 'users',
     label: '사용자',
     children: [
       { label: '공급자', path: '/suppliers' },
       { label: '판매자', path: '/sellers' },
       { label: '파트너', path: '/partners' },
       { label: '일반 사용자', path: '/users' },  // customers
       { label: '관리자', path: '/admins' }
     ]
   }
   ```

2. **옵션 B**: 현재 구조 유지 (드롭쉬핑 별도 메뉴)
   - 장점: 이미 구현됨
   - 단점: 일관성 부재

---

### 2.3 사용자 목록 화면

| 항목 | 현재 | 목표 | 격차 | 증거 | 영향도 | 난이도 |
|------|------|------|------|------|--------|--------|
| 테이블 | 통합 (탭 필터) | 역할별 전용 테이블 | ⚠️ High | UsersListClean.tsx | **High** | **High** |
| 컬럼 | 공통 컬럼 | 역할별 특화 컬럼 | ⚠️ High | UsersListClean.tsx:L392-398 | **High** | High |
| 액션 | 공통 액션 | 역할별 특화 액션 | ⚠️ Medium | UsersListClean.tsx:L254-277 | Medium | Medium |
| Bulk Actions | prompt 입력 | UI 폼 | ⚠️ High | UsersListClean.tsx:L254-257 | Medium | **Low** |

**예시 - 공급자 전용 컬럼**:
- 회사명 (`companyName`)
- 사업자번호 (`taxId`)
- 승인 상태 (`status`)
- 승인일 (`approvedAt`)
- 상품 수 (`productCount`)

**현재 컬럼** (공통):
- Username, Name, Email, Role, Posts, Date

**해결 방안**:
1. 역할별 컴포넌트 분리: `SuppliersList.tsx`, `SellersList.tsx` 등
2. 공통 컴포넌트 추출: `UserListBase.tsx` (재사용)
3. 역할별 컬럼 설정: `supplierColumns`, `sellerColumns` 등

---

## 3. API 격차 상세 (API Gap Details)

### 3.1 회원가입 흐름

| 항목 | 현재 | 목표 | 격차 | 증거 | 영향도 | 난이도 |
|------|------|------|------|------|--------|--------|
| 역할 선택 | 불가 (CUSTOMER 고정) | 가입 시 역할 선택 | ⚠️ High | auth.ts:L149 | **High** | Medium |
| 상태 | 즉시 ACTIVE | PENDING 상태로 생성 | ⚠️ High | auth.ts:L150 | **High** | **Low** |
| 승인 | 승인 절차 없음 | 관리자 승인 후 APPROVED | ⚠️ High | - | **High** | High |
| 알림 | 없음 | 가입/승인 시 이메일 발송 | ⚠️ Medium | - | Medium | Medium |

**현재 흐름**:
```
사용자 → 가입 폼 → POST /auth/signup → User 생성 (ACTIVE) → 즉시 로그인
```

**목표 흐름**:
```
사용자 → 가입 폼 → POST /auth/signup → User 생성 (PENDING) → 이메일 발송
관리자 → 승인 관리 → POST /approvals/:id/approve → User 상태 APPROVED → 알림
```

**해결 방안**:
1. signup 시 `status: PENDING` 설정
2. `/auth/login`에서 PENDING 사용자 로그인 차단
3. `/admin/approvals` API 구현
4. 이메일 발송 (가입 확인, 승인 알림)

---

### 3.2 역할 할당/변경

| 항목 | 현재 | 목표 | 격차 | 증거 | 영향도 | 난이도 |
|------|------|------|------|------|--------|--------|
| 역할 변경 | 관리자가 직접 변경 (검증 없음) | 신청 + 승인 프로세스 | ⚠️ High | UsersListClean.tsx:L254-273 | **High** | High |
| 검증 | 없음 | 역할별 필수 조건 검증 | ⚠️ High | - | **High** | Medium |
| 로그 | 없음 | ApprovalLog에 기록 | ⚠️ High | User.ts:L165-169 | Medium | Medium |
| 알림 | 없음 | 사용자에게 알림 발송 | ⚠️ Medium | - | Medium | Low |

**현재 코드** (문제점):
```typescript
// UsersListClean.tsx:L254-273
const newRole = prompt('Enter new role');  // ← UI 없음
await authClient.api.patch(`/users/${id}`, { role: newRole });  // ← 검증 없음
```

**목표 코드**:
```typescript
// 사용자가 역할 신청
await api.post('/users/:id/apply-role', { targetRole: 'supplier', businessInfo: {...} });
// → status: PENDING, targetRole: 'supplier' 저장

// 관리자가 승인
await api.post('/approvals/:id/approve', { reason: '...' });
// → User.role 업데이트, ApprovalLog 생성, 알림 발송
```

---

## 4. DB 격차 상세 (DB Gap Details)

### 4.1 역할 필드 정리

| 항목 | 현재 | 목표 | 격차 | 증거 | 영향도 | 난이도 |
|------|------|------|------|------|--------|--------|
| 역할 필드 | `role`, `roles[]`, `dbRoles[]` | `dbRoles[]` + `activeRole` 만 | ⚠️ High | User.ts:L40-78 | **High** | **High** |
| 데이터 이행 | 미완료 | 레거시 → 신규 마이그레이션 | ⚠️ High | - | **High** | **High** |
| 코드 정리 | hasRole() 3중 체크 | dbRoles만 체크 | ⚠️ Medium | User.ts:L198-206 | Medium | Medium |

**현재 문제**:
```typescript
// User.ts:L198-206
hasRole(role: UserRole | string): boolean {
  const hasDbRole = this.dbRoles?.some(r => r.name === role) || false;
  const hasLegacyRoles = this.roles?.includes(role) || false;  // ← 중복
  const hasLegacyRole = this.role === role;  // ← 중복
  return hasDbRole || hasLegacyRoles || hasLegacyRole;
}
```

**마이그레이션 스크립트**:
```sql
-- 1. 레거시 role → dbRoles 이행
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = u.role
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
);

-- 2. 레거시 roles[] → dbRoles 이행
-- (배열 필드 파싱 필요)

-- 3. 레거시 필드 제거
ALTER TABLE users DROP COLUMN role;
ALTER TABLE users DROP COLUMN roles;
```

---

### 4.2 승인 로그

| 항목 | 현재 | 목표 | 격차 | 증거 | 영향도 | 난이도 |
|------|------|------|------|------|--------|--------|
| 테이블 | 관계만 정의 | 실제 사용 | ⚠️ High | User.ts:L165-169 | Medium | Medium |
| 로그 기록 | 없음 | 모든 승인/거부 기록 | ⚠️ High | - | Medium | Medium |
| 쿼리 | 없음 | 사용자별 승인 이력 조회 | ⚠️ Medium | - | Low | Low |

**ApprovalLog 테이블 구조** (재확인 필요):
```typescript
@Entity('approval_logs')
class ApprovalLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.approvalLogs)
  user: User;  // 신청자

  @ManyToOne(() => User, admin => admin.adminActions)
  admin: User;  // 승인/거부한 관리자

  @Column({ type: 'enum' })
  action: 'APPROVE' | 'REJECT';

  @Column({ type: 'enum' })
  targetRole: UserRole;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## 5. ACL 격차 상세 (ACL Gap Details)

### 5.1 권한 정의

| 항목 | 현재 | 목표 | 격차 | 증거 | 영향도 | 난이도 |
|------|------|------|------|------|--------|--------|
| 권한 목록 | User.ts에 하드코딩 | Permission 테이블 | ⚠️ High | User.ts:L221-237 | Medium | High |
| 관리 UI | 없음 | 권한 관리 화면 | ⚠️ Medium | - | Low | High |
| 역할-권한 매핑 | 코드에 직접 작성 | DB에 저장 (role_permissions) | ⚠️ High | - | Medium | High |

**Permission 테이블 구조** (제안):
```typescript
@Entity('permissions')
class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;  // 'users.view', 'content.create' 등

  @Column()
  displayName: string;

  @Column()
  category: string;  // 'users', 'content', 'admin' 등

  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[];
}
```

---

## 6. 우선순위별 작업 목록 (Prioritized Tasks)

### 6.1 P0 (Critical) - 즉시 해결

| 작업 | 영역 | 난이도 | 예상 시간 | 의존성 |
|------|------|--------|----------|--------|
| 1. signup 시 PENDING 상태로 생성 | API | Low | 1h | - |
| 2. 역할별 라우트 추가 (`/suppliers` 등) | FE | Medium | 4h | - |
| 3. 역할별 메뉴 추가 | FE | Low | 2h | #2 |
| 4. 승인 API 구현 (`/approvals/:id/approve`) | API | High | 8h | - |

**총 예상 시간**: 15시간 (2일)

---

### 6.2 P1 (High) - 다음 스프린트

| 작업 | 영역 | 난이도 | 예상 시간 | 의존성 |
|------|------|--------|----------|--------|
| 5. 역할별 목록 화면 구현 | FE | High | 16h | #2 |
| 6. 레거시 역할 필드 정리 (마이그레이션) | DB | High | 8h | - |
| 7. ApprovalLog 사용 시작 | API | Medium | 4h | #4 |
| 8. FE Auth 상태에 activeRole 사용 | FE | Low | 2h | #6 |

**총 예상 시간**: 30시간 (4일)

---

### 6.3 P2 (Medium) - 여유 있을 때

| 작업 | 영역 | 난이도 | 예상 시간 | 의존성 |
|------|------|--------|----------|--------|
| 9. Permission 테이블 구현 | DB | High | 16h | - |
| 10. 권한 기반 ACL 미들웨어 | API | Medium | 8h | #9 |
| 11. JWT 토큰에 activeRole 추가 | API | Medium | 4h | #6 |

**총 예상 시간**: 28시간 (3.5일)

---

## 7. 리스크 평가 (Risk Assessment)

### 7.1 High Risk

| 리스크 | 영향 | 확률 | 완화 방안 |
|--------|------|------|----------|
| **레거시 데이터 손실** | 🔴 Critical | Medium | 마이그레이션 전 백업, 롤백 계획 |
| **기존 사용자 로그인 실패** | 🔴 Critical | Low | PENDING 사용자만 차단, 기존 ACTIVE 유지 |
| **FE-API 불일치** | 🟡 High | High | API 먼저 구현 후 FE 업데이트 |

### 7.2 Medium Risk

| 리스크 | 영향 | 확률 | 완화 방안 |
|--------|------|------|----------|
| **성능 저하** (3중 역할 체크) | 🟡 Medium | High | 마이그레이션 완료 후 레거시 필드 제거 |
| **권한 체계 복잡도** | 🟡 Medium | Medium | Permission 테이블 도입 전 충분한 설계 |

---

## 8. 다음 단계

1. ✅ 추천사항 정리 (`07_recommendations_preV2.md`)
2. ⏳ P0 작업 착수

---

**작성**: Claude Code
**검증**: ⏳ Pending
