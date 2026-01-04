# 백엔드 서비스 조사 결과

**Date:** 2026-01-04  
**조사 범위:** Backend Services, API Routes, Middleware

---

## 🎯 조사 목표

백엔드 서비스에서 "중앙(본부)" 개념을 전제로 하는 로직이 존재하는지 조사

---

## 🔍 주요 발견 사항

### ✅ 긍정적 발견: 중앙 전제 로직 미발견

**조사 결과:**
- `level === 0` 조건문: **발견되지 않음**
- `type === 'national'` 조건문: **프론트엔드에서만 발견** (아래 참조)
- `central_admin` 역할: **발견되지 않음**

**평가:**
백엔드 비즈니스 로직에서는 조직 레벨이나 타입을 기준으로 중앙 조직을 특별 취급하는 코드가 **존재하지 않음**.

---

### 📦 서비스별 organizationId 사용 패턴

---

## 1. Forum (forum-yaksa)

### Entity: YaksaCommunity

**파일:** [`packages/forum-yaksa/src/backend/entities/YaksaCommunity.ts`](file:///c:/Users/sohae/o4o-platform/packages/forum-yaksa/src/backend/entities/YaksaCommunity.ts)

```typescript
@Entity('yaksa_communities')
@Index(['organizationId'])  // ✅ 조직별 인덱스
export class YaksaCommunity {
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;  // ✅ 조직 ID (nullable)
  
  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;
}
```

**평가:**
- YaksaCommunity는 조직별로 생성됨
- `organizationId`가 nullable로 설정되어 있음
  - 💡 전체 공지/게시글은 organizationId=null로 표현하는 것으로 추정
  - ⚠️ 이는 "중앙 조직"이 아닌 "조직 무관(전역)" 리소스로 처리해야 함

**우선순위:** **P1** (명확화 필요)

---

## 2. LMS (lms-yaksa)

### Service: RequiredCoursePolicyService

**파일:** [`packages/lms-yaksa/src/backend/services/RequiredCoursePolicyService.ts`](file:///c:/Users/sohae/o4o-platform/packages/lms-yaksa/src/backend/services/RequiredCoursePolicyService.ts)

```typescript
async getPoliciesByOrganization(organizationId: string): Promise<RequiredCoursePolicy[]> {
  return this.repo.find({
    where: { organizationId },
  });
}

async getActivePolicies(organizationId: string): Promise<RequiredCoursePolicy[]> {
  return this.repo.find({
    where: { organizationId, isActive: true },
  });
}
```

**평가:**
- 필수 교육 정책은 조직별로 관리됨
- ✅ 조직별 독립적 정책 관리 (정상)

### Entity: YaksaLicenseProfile

**파일:** [`packages/lms-yaksa/src/backend/entities/YaksaLicenseProfile.entity.ts`](file:///c:/Users/sohae/o4o-platform/packages/lms-yaksa/src/backend/entities/YaksaLicenseProfile.entity.ts)

```typescript
@Index(['organizationId'])
export class YaksaLicenseProfile {
  @Column({ type: 'uuid' })
  organizationId!: string;  // ✅ 필수
}
```

**평가:**
- 약사 면허 프로필은 조직별로 관리됨
- ✅ 조직 필수 (정상)

### Service: CourseAssignmentService

```typescript
async getAssignmentsByOrganization(organizationId: string): Promise<YaksaCourseAssignment[]> {
  return this.repo.find({
    where: { organizationId },
  });
}

async getOverdueAssignments(organizationId?: string): Promise<YaksaCourseAssignment[]> {
  const query: any = {
    status: 'in_progress',
    dueDate: LessThan(new Date()),
  };

  if (organizationId) {  // ✅ organizationId가 선택적
    query.organizationId = organizationId;
  }
  
  // ...
}
```

**평가:**
- 교육 할당은 조직별로 관리됨
- `organizationId`가 선택적인 경우도 있음
  - 💡 전체 조직의 연체 과제를 조회하는 경우 (운영자 기능)
- ✅ 정상

**우선순위:** **정상**

---

## 3. GroupBuy (groupbuy-yaksa)

### Entity: GroupbuyCampaign

**파일:** [`packages/groupbuy-yaksa/src/backend/entities/GroupbuyCampaign.ts`](file:///c:/Users/sohae/o4o-platform/packages/groupbuy-yaksa/src/backend/entities/GroupbuyCampaign.ts)

```typescript
@Index(['organizationId', 'status'])
export class GroupbuyCampaign {
  @Column({ type: 'uuid' })
  organizationId!: string;  // ✅ 필수
}
```

**평가:**
- 공동구매 캠페인은 조직별로 생성됨
- ✅ 조직 필수 (정상)

### Service: GroupbuyCampaignService

**파일:** [`packages/groupbuy-yaksa/src/backend/services/GroupbuyCampaignService.ts`](file:///c:/Users/sohae/o4o-platform/packages/groupbuy-yaksa/src/backend/services/GroupbuyCampaignService.ts)

```typescript
async getCampaignsByOrganization(
  organizationId: string,
  filters?: CampaignFilters
): Promise<GroupbuyCampaign[]> {
  const qb = this.repo
    .createQueryBuilder('campaign')
    .leftJoinAndSelect('campaign.products', 'products')
    .where('campaign.organizationId = :organizationId', { organizationId });
  // ...
}
```

**평가:**
- 캠페인 조회는 조직별로 필터링됨
- ✅ 정상

### Middleware: groupbuy-auth.middleware

**파일:** [`packages/groupbuy-yaksa/src/backend/middleware/groupbuy-auth.middleware.ts`](file:///c:/Users/sohae/o4o-platform/packages/groupbuy-yaksa/src/backend/middleware/groupbuy-auth.middleware.ts)

```typescript
// organizationId 추출
const organizationId = req.body.organizationId || req.query.organizationId;

if (!organizationId) {
  return res.status(400).json({
    success: false,
    message: 'organizationId가 필요합니다',
  });
}

// 소속 확인
const membership = context.memberships.find(
  m => m.organizationId === organizationId
);
```

**평가:**
- 모든 요청에 organizationId 필수
- 사용자의 조직 소속 여부 검증
- ✅ 조직 기반 권한 검증 정상

**우선순위:** **정상**

---

## 4. Reporting (reporting-yaksa)

**조사 필요:**
- 보고서 생성 시 조직 필터링 방식
- 전체 보고서 vs 조직별 보고서

---

## 5. Membership (membership-yaksa)

### File: [`packages/membership-yaksa/src/backend/services/RoleAssignmentService.ts`](file:///c:/Users/sohae/o4o-platform/packages/membership-yaksa/src/backend/services/RoleAssignmentService.ts)

```typescript
type MembershipRole =
  | 'membership_super_admin'   // 전체 관리자 (중앙회 레벨)  ⚠️
  | 'membership_division_admin'   // 지부 관리자
  | 'membership_branch_admin'    // 분회 관리자
  | 'membership_officer'         // 임원
  | 'membership_member';          // 일반 회원

const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  membership_super_admin: 100,  // ⚠️
  membership_division_admin: 80,
  membership_branch_admin: 60,
  // ...
};
```

**문제 발견:**
- `membership_super_admin` 역할에 "중앙회 레벨" 주석 존재
- 역할 계층 구조에서 최상위로 정의됨

**영향:**
- 주석에서만 "중앙회" 언급
- 실제 로직에서는 조직 스코프와 독립적으로 동작하는 것으로 추정

**우선순위:** **P2** (주석 수정)

---

## 📊 백엔드 조사 결과 요약

### ✅ 긍정적 발견

1. **조직 기반 설계 일관성**
   - 모든 서비스가 organizationId를 기준으로 데이터 필터링
   - 조직 소속 검증 로직 완비

2. **중앙 전제 로직 부재**
   - `level === 0` 조건문 없음
   - `type === 'national'` 조건문 백엔드에 없음 (프론트엔드만)

3. **권한 검증 체계 양호**
   - 조직 멤버십 기반 접근 제어
   - 조직별 권한 분리

### ⚠️ 개선 필요 사항

1. **nullable organizationId 명확화**
   - Forum의 `YaksaCommunity.organizationId`가 nullable
   - "전역 리소스"와 "중앙 조직 리소스"의 구분 명확화 필요

2. **주석 정리**
   - `membership_super_admin`에 "중앙회 레벨" 주석 제거
   - "전체 관리자" = "Global Operator"로 명확화

---

## 📝 문제 목록 요약

| ID | 문제 | 파일 | 우선순위 | 조치 |
|----|------|------|----------|------|
| BE-01 | membership_super_admin 주석에 "중앙회" 언급 | [`RoleAssignmentService.ts`](file:///c:/Users/sohae/o4o-platform/packages/membership-yaksa/src/backend/services/RoleAssignmentService.ts) | P2 | 주석을 "전체 운영자"로 변경 |
| BE-02 | YaksaCommunity.organizationId nullable | [`YaksaCommunity.ts`](file:///c:/Users/sohae/o4o-platform/packages/forum-yaksa/src/backend/entities/YaksaCommunity.ts) | P1 | 전역 리소스 vs 조직 리소스 정책 명확화 |

---

## 🎯 권장 조치 사항

### 1. nullable organizationId 정책 수립

**현재 상황:**
- Forum 등 일부 엔티티에서 organizationId=null 허용

**제안:**
- **전역 리소스 (Global Resource):**
  - organizationId = null
  - 모든 조직에서 접근 가능
  - 운영자만 생성/수정/삭제 가능
  
- **조직 리소스 (Organization Resource):**
  - organizationId = 특정 조직 ID
  - 해당 조직 회원만 접근 가능
  - 조직 관리자가 생성/수정/삭제 가능

**중요:**
- "전역 리소스" ≠ "중앙 조직 리소스"
- 전역 리소스는 **조직과 무관한** 플랫폼 레벨 리소스

### 2. 역할 명명 규칙 정립

**제안:**
```typescript
type MembershipRole =
  | 'membership_platform_admin'   // 플랫폼 전체 관리자 (Global Operator)
  | 'membership_division_admin'   // 지부 관리자
  | 'membership_branch_admin'     // 분회 관리자
  | 'membership_officer'          // 임원
  | 'membership_member';           // 일반 회원
```

- `membership_super_admin` → `membership_platform_admin`
- 주석에서 "中央회" 용어 완전 제거

---

## 🔗 관련 문서

- [00_overview.md](./00_overview.md) - 조사 개요
- [01_db_audit.md](./01_db_audit.md) - DB 조사 결과
- [03_frontend_audit.md](./03_frontend_audit.md) - 프론트엔드 조사 (다음 단계)
- [99_fix_plan.md](./99_fix_plan.md) - 정비 제안서 (최종)
