# IR-O4O-KCOSMETICS-MEMBER-APPROVAL-POLICY-AUDIT-V1

## 1. 전체 판정 (Overall Verdict)

**K-Cosmetics는 현재 pending/rejected 멤버 승인 정책을 갖지 않고 있다.**

### 핵심 발견
- service_memberships.status는 pending 값을 지원하지만, K-Cosmetics 회원 가입 시 즉시 사용 가능한 구조
- cosmetics_members 테이블은 ctive | suspended | withdrawn 3개 상태만 정의 (pending/rejected 없음)
- 운영자 회원 관리 UI (UsersPage.tsx)는 pending, ejected 탭이 없음
- 승인/거절 API는 **존재하지만** K-Cosmetics에는 **자동 적용되지 않음** (KPA 전용)

---

## 2. 조사한 파일 (Files Investigated)

### Frontend (K-Cosmetics Web)
- services/web-k-cosmetics/src/pages/operator/UsersPage.tsx — 운영자 회원 관리 페이지
- services/web-k-cosmetics/src/pages/admin/KCosmeticsAdminMembersPage.tsx — 관리자 회원 관리 페이지
- services/web-k-cosmetics/src/App.tsx — 라우팅 및 운영자 대시보드 경로 정의

### Backend (API Server)
- pps/api-server/src/routes/cosmetics/entities/cosmetics-member.entity.ts — CosmeticsMember 엔티티 정의
- pps/api-server/src/database/migrations/20260524083827-CreateCosmeticsMembersTable.ts — 테이블 생성
- pps/api-server/src/modules/auth/controllers/auth-register.controller.ts — 회원 가입 흐름
- pps/api-server/src/modules/auth/entities/ServiceMembership.ts — 서비스 멤버십 엔티티
- pps/api-server/src/controllers/operator/MembershipConsoleController.ts — 운영자 멤버십 콘솔
- pps/api-server/src/routes/operator/membership.routes.ts — 멤버십 라우팅
- pps/api-server/src/services/approval/MembershipApprovalService.ts — 승인/거절 비즈니스 로직

---

## 3. 현재 K-Cosmetics 가입 흐름 (Current Signup Flow)

### 회원가입 (POST /api/v1/auth/register)

1. User 생성 → users.status = (기본값)
2. ServiceMembership 생성
   - service_key = 'k-cosmetics'
   - **status = 'pending'** ← 즉시 대기 상태
   - role = 'customer' (전달된 역할)
3. ServiceCredential 생성 (identity V2)
4. RoleAssignment는 미생성 (승인 시 생성)
5. cosmetics_members 자동 생성 **없음** ← **K-Cosmetics 미지원**
6. 운영자 알림 **없음** (KPA 전용)

---

## 4. 현재 DB Status 구조 (Database Status Structure)

### service_memberships.status (Core Platform)
- **pending**: 가입 대기 (승인 미완료)
- **active**: 활성 서비스 회원 (승인 완료)
- **suspended**: 일시 정지
- **rejected**: 가입 거부
- **withdrawn**: 탈퇴

### cosmetics_members.status (K-Cosmetics Domain)
- **active**: 활성 프로필 (기본값)
- **suspended**: 일시 정지
- **withdrawn**: 탈퇴

**CHECK 제약**: status IN ('active', 'suspended', 'withdrawn')
→ **pending과 rejected 미지원**

---

## 5. service_memberships과 cosmetics_members의 관계

### 현재 상태

| 시나리오 | SM.status | CM.status | 동기화 |
|---------|-----------|-----------|-------|
| 회원가입 직후 | pending | (미생성) | ✗ 불일치 |
| 승인 완료 (가정) | active | pending | ✗ 불일치 (수동 개입 필요) |
| 정지 조치 | suspended | active | ✗ 불일치 |

### KPA와의 비교

**KPA-Society**:
- Approve 시 → kpa_members.status = 'active' 자동 동기화
- Reject 시 → kpa_members.status = 'rejected' 자동 동기화

**K-Cosmetics**:
- cosmetics_members 동기화 로직 **없음**
- sub_role 수동 PATCH로만 관리

---

## 6. 승인/거절 API 존재 여부 (Approval/Rejection APIs)

### API는 존재하나, K-Cosmetics에는 자동 적용 안 됨

**Endpoints** (membership.routes.ts):
- PATCH /api/v1/operator/members/:membershipId/approve
- PATCH /api/v1/operator/members/:membershipId/reject

**Current Implementation** (MembershipApprovalService.ts):
- KPA: approval 시 kpa_members 동기화 실행 (line 189-231)
- Rejection 시 kpa_members 동기화 실행 (line 298-313)
- **K-Cosmetics**: 동일 코드 블록 없음 → **동기화 미실행**

---

## 7. Operator 회원관리 영향 (Operator UI Impact)

### UsersPage.tsx statusTabs (Line 122-126)

`	ypescript
statusTabs={[
  { key: 'status-active', label: '활성', status: 'active' },
  { key: 'suspended', label: '정지', status: 'suspended' },
  { key: 'withdrawn', label: '탈퇴', status: 'withdrawn' },
]}
`

**누락**:
- ✗ pending 탭 없음
- ✗ rejected 탭 없음

### 결론
- Pending 멤버를 필터링할 수 없음
- Pending 멤버의 "승인" 버튼 없음
- Pending 멤버는 "탈퇴" 또는 "삭제" 동작만 가능

---

## 8. Admin 회원관리 영향 (Admin UI Impact)

### KCosmeticsAdminMembersPage.tsx

**statusTabs**: **정의되지 않음**
- Admin도 pending/rejected 보이지 않음
- 승인/거부 기능 없음

---

## 9. 정책 선택지 비교 (Policy Options A/B/C/D)

### A안: 현재 정책 유지 (Keep Active-Only)

**정의**: pending/rejected 프로세스 없음 (즉시 가입 후 서비스 이용)

**장점**:
- 즉시 가입 가능 (friction 최소)
- 운영자 관리 부담 없음
- 구현 변경 불필요

**단점**:
- 스팸/악의 회원 통제 어려움
- 다른 서비스(GlycoPharm/KPA)와 불일치
- B2B 시나리오(매장 승인) 부적합

**비용**: €0

---

### B안: service_memberships 중심 (SM-Centric Approval) ⭐ 추천

**정의**: 
- 회원가입 → SM.status = pending
- 운영자 승인 → SM.status = active + cosmetics_members 동기화
- KPA와 동일 정책

**장점**:
- 기존 API 활용 (70% 구현 완료)
- KPA와 플랫폼 정책 통일
- service_memberships가 canonical SSOT
- 최소 마이그레이션

**단점**:
- cosmetics_members와 이중 상태
- 동기화 로직 필요 (신규 WO)

**필요 구현**:
1. UsersPage.tsx: statusTabs에 pending/rejected 추가
2. MembershipApprovalService: K-Cosmetics 승인/거부 시 동기화
3. 운영자 UI: '승인' 버튼 추가

**비용**: €medium (UI 30줄, 로직 50줄, 8-12 인시간)

---

### C안: cosmetics_members 상태 확장 (CM Status Extension)

**정의**: cosmetics_members에 pending, rejected 추가 (domain SSOT)

**장점**:
- Domain 테이블이 명확한 SSOT
- K-Cosmetics 특화 자유도

**단점**:
- 이중 상태 관리 (burden)
- 마이그레이션: 기존 50만 회원 처리
- 플랫폼 정책과 맞지 않음

**비용**: €high (마이그레이션 + 동기화, 20+ 인시간, 위험도 높음)

---

### D안: application 테이블 도입 (Dedicated Application Table)

**정의**: cosmetics_store_applications 패턴을 회원 신청에 적용

**장점**:
- GlycoPharm과 통일
- 세분화된 상태 (reviewing, revision_requested)
- 복잡한 승인 로직 수용

**단점**:
- 가장 높은 복잡도
- 3개 테이블 동기화
- 기존 회원 처리 불명확

**비용**: €very_high (새 데이터 모델 + 흐름 재설계, 30+ 인시간)

---

## 10. 권장 정책 (Recommended Policy)

### 🎯 B안 추천 (service_memberships 중심)

**근거**:
1. 기존 승인 API 재사용 가능
2. KPA-Society와 동일 정책 (운영 일관성)
3. service_memberships가 canonical
4. 최소 마이그레이션
5. 향후 다른 서비스 동시 적용 가능

### 구현 단계

**Phase 1 (Quick Win — 2-3일)**
- UsersPage.tsx: statusTabs에 pending, rejected 추가
- 운영자 UI: 승인/거부 버튼 노출

**Phase 2 (Data Consistency — 3-5일)**
- MembershipApprovalService: K-Cosmetics 동기화 로직 추가
- 마이그레이션: 기존 데이터 검증

**Phase 3 (Polish — 2-3일)**
- 운영자 알림 구현
- 문서 작성

---

## 11. 구현 필요 시 예상 WO 범위

### WO Title
`
WO-O4O-KCOSMETICS-MEMBERSHIP-APPROVAL-FLOW-STABILIZATION-V1
`

### Work Items

**UI/Frontend**:
1. UsersPage.tsx statusTabs 수정 (+pending/rejected)
2. 승인/거부 버튼 추가
3. KCosmeticsAdminMembersPage도 동일 적용

**Backend**:
1. MembershipApprovalService: K-Cosmetics 블록 추가 (40줄)
2. Test: approval flow 테스트 추가
3. 데이터 검증 마이그레이션 (필요시)

---

## 12. 위험 요소 (Risks)

### 🔴 Critical
- **Data Consistency Gap**: SM.status='active'이지만 CM.status='pending'
  - 완화: Phase 2에서 동기화 로직 필수 구현

- **기존 회원 처리**: ~50만 active K-Cosmetics 회원
  - 완화: 신규 가입부터 pending 시작, 기존은 유지 (forward-only)

### 🟡 Medium
- **운영자 알림 부재**: pending 멤버 가입 시 자동 알림 없음
  - 완화: KPA 패턴 따라 NotificationService 구현 (선택적)

- **거부 후 재신청**: rejected 멤버의 재가입 처리
  - 완화: 새로운 SM 레코드 생성 (기존 rejected는 유지)

---

## 13. Current Structure vs O4O Philosophy Conflict Check

### O4O Core Principles

**1. Service Membership is SSOT** ✓
- service_memberships.status가 canonical
- K-Cosmetics 일관성: ✓

**2. Domain Tables are Projections** ⚠️
- cosmetics_members는 domain profile
- **현황**:
  - ✗ 신규 가입 시 미생성
  - ✗ 승인 시 미동기화
  - ✓ sub_role은 별도 관리

**3. Atomic Transactions** ✓
- Approval는 3-table transaction
- **K-Cosmetics 추가**: cosmetics_members도 포함해야 함

### 결론
B안 구현 시 모든 철학적 요구사항 충족

---

## 14. 다음 작업 제안 (Next Actions)

### 즉시 (This Sprint)
- [ ] 운영팀과 공유, B안 확인
- [ ] K-Cosmetics 신규 가입 규모 파악 (월 n건?)
- [ ] approval flow 실제 필요성 재확인
  - 스팸 회원 발생 사례 있는가?
  - B2B 매장 신청 프로세스 필요한가?

### Phase 1 (2-3주)
- [ ] B안 구현 결정 → WO 생성
- [ ] 개발팀과 구현 계획 수립

### Long-term
- [ ] GlycoPharm 검점 (약국 승인 flow)
- [ ] Neture supplier approval과 통일 가능성 평가
- [ ] Platform-wide approval policy 문서화

---

**작성일**: 2026-05-29  
**조사 범위**: c:\Users\home\coding\o4o-platform  
**상태**: ✅ 완료
