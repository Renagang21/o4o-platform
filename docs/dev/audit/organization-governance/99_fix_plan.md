# 중앙 개념 완전 삭제를 위한 정비 제안서

**Version:** 1.0  
**Date:** 2026-01-04  
**요청자:** Rena  
**작성자:** Antigravity Agent  
**목적:** 약사회 SaaS에서 "대한약사회(중앙)" 개념을 완전히 제거하고 "지부(최상위) → 분회(하위)" 2단 구조로 전환

---

## 📋 Executive Summary

### 조사 결과 요약

총 **13개의 문제**를 발견했습니다:
- **P0 (즉시 수정 필요):** 9개
- **P1 (조속히 수정):** 2개
- **P2 (낮은 우선순위):** 2개

### 핵심 발견 사항

1. **DB 레벨:** Organization 엔티티에 'national' 타입 존재, 초기 시드에서 중앙 조직 자동 생성
2. **백엔드:** 중앙 전제 로직은 발견되지 않음 (✅ 긍정적)
3. **프론트엔드:** OrganizationUI 컴포넌트에서 'national' 타입 사용
4. **운영자 권한:** 구조는 양호하나 정책 명확화 필요

---

## 🔍 발견된 문제 목록

### 📊 DB/스키마 (5개 문제)

| ID | 문제 | 파일 | 우선순위 |
|----|------|------|----------|
| [DB-01](#db-01) | Organization.type에 'national' 존재 | [`Organization.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/entities/Organization.ts) | P0 |
| [DB-02](#db-02) | 초기 시드에서 중앙 조직 생성 | [`install.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/lifecycle/install.ts) | P0 |
| [DB-03](#db-03) | level=0 주석에 "본부" 명시 | [`Organization.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/entities/Organization.ts) | P1 |
| [DB-04](#db-04) | path에 '/national' 포함 | [`Organization.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/entities/Organization.ts) | P0 |
| [DB-05](#db-05) | DTO 타입에 'national' 존재 | [`dtos.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/types/dtos.ts) | P0 |

### 💻 백엔드 (2개 문제)

| ID | 문제 | 파일 | 우선순위 |
|----|------|------|----------|
| [BE-01](#be-01) | membership_super_admin 주석에 "중앙회" 언급 | [`RoleAssignmentService.ts`](file:///c:/Users/sohae/o4o-platform/packages/membership-yaksa/src/backend/services/RoleAssignmentService.ts) | P2 |
| [BE-02](#be-02) | YaksaCommunity.organizationId nullable | [`YaksaCommunity.ts`](file:///c:/Users/sohae/o4o-platform/packages/forum-yaksa/src/backend/entities/YaksaCommunity.ts) | P1 |

### 🎨 프론트엔드 (4개 문제)

| ID | 문제 | 파일 | 우선순위 |
|----|------|------|----------|
| [FE-01](#fe-01) | badgeColors에 'national' 정의 | [`OrganizationUI.tsx:12`](file:///c:/Users/sohae/o4o-platform/apps/main-site/src/components/common/OrganizationUI.tsx#L12) | P0 |
| [FE-02](#fe-02) | typeLabels에 'national':'본부' | [`OrganizationUI.tsx:19`](file:///c:/Users/sohae/o4o-platform/apps/main-site/src/components/common/OrganizationUI.tsx#L19) | P0 |
| [FE-03](#fe-03) | organization.type === 'national' 조건문 (드롭다운) | [`OrganizationUI.tsx:140`](file:///c:/Users/sohae/o4o-platform/apps/main-site/src/components/common/OrganizationUI.tsx#L140) | P0 |
| [FE-04](#fe-04) | membership.organization.type === 'national' 조건문 (목록) | [`OrganizationUI.tsx:183`](file:///c:/Users/sohae/o4o-platform/apps/main-site/src/components/common/OrganizationUI.tsx#L183) | P0 |

### 👤 운영자 권한 (2개 확인 필요)

| ID | 문제 | 우선순위 |
|----|------|----------|
| [OP-01](#op-01) | 운영자의 OrganizationMember 포함 여부 미확인 | P1 |
| [OP-02](#op-02) | 운영자 책임 범위 미정의 | P1 |

---

## 🛠️ 정비 계획

### Phase 1: DB 정비 (P0)

#### 1.1 Organization 엔티티 수정

**대상 파일:** [`packages/organization-core/src/entities/Organization.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/entities/Organization.ts)

**변경 사항:**

```diff
  /**
   * 조직 유형
-  * - national: 본부
   * - division: 지부
   * - branch: 분회
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: 'branch',
  })
- type!: 'national' | 'division' | 'branch';
+ type!: 'division' | 'branch';
```

```diff
  /**
   * 계층 레벨
-  * - 0: 본부
-  * - 1: 지부
-  * - 2: 분회
+  * - 0: 지부 (최상위 조직)
+  * - 1: 분회 (하위 조직)
   */
  @Column({ type: 'int', default: 0 })
  level!: number;
```

```diff
  /**
-  * 계층 경로 (예: "/national/seoul/gangnam")
+  * 계층 경로 (예: "/seoul/gangnam")
   *
   * 하위 조직 조회 시 LIKE 검색에 사용됩니다.
   */
  @Column({ type: 'text' })
  path!: string;
```

**주석 예시 업데이트:**
```diff
  /**
   * @example
   * ```typescript
   * // 약사회 조직 구조
-  * 대한약사회 (본부, level=0, path="/national")
-  *  ├─ 서울지부 (지부, level=1, path="/national/seoul")
-  *  │   ├─ 강남분회 (분회, level=2, path="/national/seoul/gangnam")
-  *  │   └─ 강서분회 (분회, level=2, path="/national/seoul/gangseo")
-  *  └─ 부산지부 (지부, level=1, path="/national/busan")
+  * 서울지부 (지부, level=0, path="/seoul")
+  *  ├─ 강남분회 (분회, level=1, path="/seoul/gangnam")
+  *  └─ 강서분회 (분회, level=1, path="/seoul/gangseo")
+  * 부산지부 (지부, level=0, path="/busan")
   * ```
   */
```

---

#### 1.2 DTO 타입 수정

**대상 파일:** [`packages/organization-core/src/types/dtos.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/types/dtos.ts)

**변경 사항:**
```diff
  /**
-  * - national: 본부
   * - division: 지부
   * - branch: 분회
   */
- type: 'national' | 'division' | 'branch';
+ type: 'division' | 'branch';
```

---

#### 1.3 초기 시드 함수 제거

**대상 파일:** [`packages/organization-core/src/lifecycle/install.ts:282-307`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/lifecycle/install.ts#L282-L307)

**변경 사항:**
- `seedDefaultOrganization()` 함수 **완전 제거**
- `install()` 함수에서 호출 부분 제거

```diff
  export async function install(context: InstallContext): Promise<void> {
    // ...
    
-   // 5. 초기 조직 생성 (선택적)
-   if (options.seedDefaultData) {
-     await seedDefaultOrganization(dataSource, logger);
-   }
    
    logger.info(`[${manifest.appId}] Installation completed successfully.`);
  }

- /**
-  * 초기 조직 생성
-  * 최상위 조직 (본부) 생성
-  */
- async function seedDefaultOrganization(
-   dataSource: any,
-   logger: any
- ): Promise<void> {
-   // ... (전체 제거)
- }
```

**비고:**
- 초기 조직은 운영자가 Admin 대시보드에서 수동 생성
- 또는 별도의 시드 스크립트로 지부/분회만 생성

---

### Phase 2: 프론트엔드 정비 (P0)

#### 2.1 OrganizationUI 컴포넌트 수정

**대상 파일:** [`apps/main-site/src/components/common/OrganizationUI.tsx`](file:///c:/Users/sohae/o4o-platform/apps/main-site/src/components/common/OrganizationUI.tsx)

**변경 사항:**

```diff
  // 조직 타입별 배지 색상
  const badgeColors = {
-   national: 'bg-purple-100 text-purple-800 border-purple-200',
    division: 'bg-blue-100 text-blue-800 border-blue-200',
    branch: 'bg-green-100 text-green-800 border-green-200',
  };

  // 조직 타입별 한글명
  const typeLabels = {
-   national: '본부',
    division: '지부',
    branch: '분회',
  };
```

```diff
  <span
    className={`w-2 h-2 rounded-full ${
-     organization.type === 'national'
-       ? 'bg-purple-500'
-       : organization.type === 'division'
+     organization.type === 'division'
        ? 'bg-blue-500'
        : 'bg-green-500'
    }`}
  />
```

```diff
  <span
    className={`w-2 h-2 rounded-full flex-shrink-0 ${
-     membership.organization.type === 'national'
-       ? 'bg-purple-500'
-       : membership.organization.type === 'division'
+     membership.organization.type === 'division'
        ? 'bg-blue-500'
        : 'bg-green-500'
    }`}
  />
```

---

### Phase 3: 백엔드 정비 (P1-P2)

#### 3.1 주석 수정

**대상 파일:** [`packages/membership-yaksa/src/backend/services/RoleAssignmentService.ts`](file:///c:/Users/sohae/o4o-platform/packages/membership-yaksa/src/backend/services/RoleAssignmentService.ts)

**변경 사항:**
```diff
  type MembershipRole =
-   | 'membership_super_admin'   // 전체 관리자 (중앙회 레벨)
+   | 'membership_super_admin'   // 전체 운영자 (Global Operator)
    | 'membership_division_admin'   // 지부 관리자
    | 'membership_branch_admin'    // 분회 관리자
    // ...
```

---

#### 3.2 전역 리소스 정책 명확화

**대상:** Forum, LMS 등에서 `organizationId=null` 처리 방식

**정책 수립:**

1. **전역 리소스 (Global Resource):**
   - `organizationId = null`
   - 모든 조직에서 접근 가능
   - 운영자만 생성/수정/삭제

2. **조직 리소스 (Organization Resource):**
   - `organizationId = 특정 조직 ID`
   - 해당 조직 회원만 접근
   - 조직 관리자가 생성/수정/삭제

**비고:** "전역 리소스" ≠ "중앙 조직 리소스"

---

### Phase 4: 운영자 정책 수립 (P1)

#### 4.1 Global Operator 정책 문서 작성

**신규 파일:** `docs/architecture/global-operator-policy.md`

**내용:**
```markdown
# Global Operator 정책

## 정의
- Global Operator는 O4O 플랫폼의 최상위 운영자
- 모든 조직과 독립적으로 시스템 전체를 관리

## 권한
- ✅ 모든 조직(지부/분회) 생성/수정/삭제
- ✅ 모든 조직 데이터 조회
- ✅ 테마 마켓플레이스 승인/관리
- ✅ 시스템 설정 관리

## 제약
- ❌ Global Operator는 어떤 조직의 멤버도 아님
- ❌ OrganizationMember 테이블에 레코드 없음
- ❌ 조직별 게시글/댓글 작성 불가 (시스템 공지만 가능)

## 역할 이름
- DB/코드: `super_admin` (기존 유지)
- UI/문서: "전체 운영자" 또는 "Global Operator"
```

---

#### 4.2 OrganizationMember 제약 검증

**확인 쿼리:**
```sql
-- 운영자가 OrganizationMember에 포함되어 있는지 확인
SELECT om.* 
FROM organization_members om
INNER JOIN users u ON om.user_id = u.id
INNER JOIN role_assignments ra ON ra.user_id = u.id
WHERE ra.role = 'super_admin' 
  AND ra.scope_type = 'global';
```

**결과:**
- **0건이어야 정상**
- 1건 이상이면 데이터 정리 필요

---

## 📅 릴리즈 시나리오

### Option 1: 단계적 릴리즈 (권장)

**Phase 1 (1주차):**
- DB 스키마 변경 (Organization.type, DTO)
- 백엔드 주석 수정
- 프론트엔드 OrganizationUI 수정

**Phase 2 (2주차):**
- 기존 데이터 마이그레이션
  - 'national' 타입 조직을 'division'으로 변경
  - path 재계산 (`/national/seoul` → `/seoul`)
- 운영자 정책 문서 작성

**Phase 3 (3주차):**
- 전역 리소스 정책 명확화
- 운영자 대시보드 UI 개선
- 조직 초기 생성 가이드 작성

---

### Option 2: 일괄 릴리즈

**준비 기간:** 2주
**릴리즈:** 1회

**장점:**
- 사용자 혼란 최소화
- 일관된 경험 제공

**단점:**
- 테스트 부담 증가
- 롤백 어려움

---

## 🧪 데이터 마이그레이션

### 기존 데이터 변환

**대상:** 현재 'national' 타입으로 생성된 조직

**변환 쿼리:**
```sql
-- 1. 'national' 타입을 'division'으로 변경
UPDATE organizations
SET type = 'division'
WHERE type = 'national';

-- 2. Path 재계산
-- 예: /national → /korea (또는 조직 code 기반으로)
UPDATE organizations
SET path = '/' || code
WHERE type = 'division' AND parent_id IS NULL;

-- 3. 하위 조직 path 재계산
-- 이는 재귀적으로 수행 필요 (application 레벨 또는 stored procedure)
```

**비고:**
- 실제 운영 환경에 'national' 타입 조직이 존재하는지 사전 확인 필요
- 없다면 이 단계는 생략 가능

---

## 🎯 조직 초기 시드 생성 규칙

### 신규 환경 초기화 시

**방법 1: 수동 생성 (권장)**
- 운영자가 Admin 대시보드에서 직접 생성
- 지부/분회만 생성

**방법 2: 시드 스크립트**
```typescript
// apps/api-server/src/scripts/seed-yaksa-organizations.ts
const divisions = [
  { code: 'SEOUL', name: '서울지부' },
  { code: 'BUSAN', name: '부산지부' },
  // ...
];

for (const div of divisions) {
  await orgRepo.save({
    code: div.code,
    name: div.name,
    type: 'division',  // ✅ 'national' 대신 'division'
    level: 0,
    path: `/${div.code.toLowerCase()}`,
    parentId: null,
    isActive: true,
  });
}
```

---

## ✅ 검증 체크리스트

### 코드 변경 후 확인

- [ ] DB에서 'national' 타입 조직이 존재하지 않음
- [ ] 모든 조직의 path가 '/national'로 시작하지 않음
- [ ] 프론트엔드에서 '본부' 라벨이 표시되지 않음
- [ ] 백엔드 주석에서 "중앙회" 용어가 없음
- [ ] 운영자가 OrganizationMember에 포함되지 않음
- [ ] 조직 생성 시 type='division' 또는 'branch'만 선택 가능
- [ ] API 응답에서 type 필드가 'national'을 반환하지 않음

### 기능 테스트

- [ ] 지부 생성 가능
- [ ] 분회 생성 가능
- [ ] 조직별 Forum 게시글 필터링 정상 동작
- [ ] 조직별 LMS 교육 할당 정상 동작
- [ ] 조직별 GroupBuy 캠페인 조회 정상 동작
- [ ] 운영자는 모든 조직 데이터 조회 가능

---

## 📊 예상 영향 범위

### 영향 받는 모듈

| 모듈 | 영향도 | 변경 내용 |
|------|--------|---------|
| organization-core | 🔴 High | 엔티티, DTO, 시드 함수 |
| main-site (frontend) | 🔴 High | OrganizationUI 컴포넌트 |
| membership-yaksa | 🟡 Medium | 주석 수정 |
| forum-yaksa | 🟢 Low | 정책 명확화만 |
| lms-yaksa | 🟢 Low | 정책 명확화만 |
| groupbuy-yaksa | 🟢 Low | 영향 없음 |

### 영향 받지 않는 영역 (✅)

- 백엔드 비즈니스 로직 (중앙 전제 로직 없음)
- 권한 검증 시스템 (이미 양호)
- 조직별 데이터 필터링 (정상 동작 중)

---

## 🔗 관련 문서

- [00_overview.md](./00_overview.md) - 조사 개요
- [01_db_audit.md](./01_db_audit.md) - DB 조사 결과 상세
- [02_backend_audit.md](./02_backend_audit.md) - 백엔드 조사 결과 상세
- [03_frontend_audit.md](./03_frontend_audit.md) - 프론트엔드 조사 결과 상세
- [04_operator_role_audit.md](./04_operator_role_audit.md) - 운영자 권한 조사 결과 상세

---

## 📝 결론

### 핵심 메시지

1. **긍정적 발견:**
   - 백엔드 로직은 이미 '중앙 전제' 없이 잘 설계되어 있음
   - 조직 기반 권한 검증 체계 양호

2. **개선 필요:**
   - DB 스키마와 프론트엔드에서 'national' 타입 제거 (P0)
   - 운영자 정책 명확화 (P1)

3. **예상 작업량:**
   - P0 수정: **1-2일** (파일 10개 미만)
   - P1 정책 수립: **3-5일** (문서 작성, 데이터 마이그레이션)
   - 전체 릴리즈: **2-3주** (단계적 접근 시)

### 다음 단계

1. **즉시 조치:** P0 문제 수정 (DB, 프론트엔드)
2. **단기:** 운영자 정책 수립 및 문서화
3. **중기:** 데이터 마이그레이션 및 검증

---

**승인 대기 중**  
**작성자:** Antigravity Agent  
**검토자:** _______  
**승인자:** _______  
**날짜:** 2026-01-04
