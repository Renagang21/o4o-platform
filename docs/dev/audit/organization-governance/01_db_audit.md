# DB/스키마 조사 결과

**Date:** 2026-01-04  
**조사 범위:** Database Schema, Entities, Migrations, Seed Data

---

## 🎯 조사 목표

DB 레벨에서 "중앙(대한약사회 본부)" 개념이 남아있는지 전수 조사

---

## 🔍 주요 발견 사항

### ❌ 문제 1: Organization 엔티티에 'national' 타입 존재

**파일:** [`packages/organization-core/src/entities/Organization.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/entities/Organization.ts)

**문제:**
```typescript
/**
 * 조직 유형
 * - national: 본부  ⚠️ 문제 발견
 * - division: 지부
 * - branch: 분회
 */
@Column({
  type: 'varchar',
  length: 50,
  default: 'branch',
})
type!: 'national' | 'division' | 'branch';
```

**영향 범위:**
- DB 스키마 `organizations.type` 컬럼
- TypeScript 타입 정의
- 모든 조직 관련 쿼리 및 필터링

**우선순위:** **P0** (즉시 수정 필요)

---

### ❌ 문제 2: 초기 시드 데이터에서 중앙 조직 생성

**파일:** [`packages/organization-core/src/lifecycle/install.ts:282-307`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/lifecycle/install.ts#L282-L307)

**문제:**
```typescript
async function seedDefaultOrganization(
  dataSource: any,
  logger: any
): Promise<void> {
  logger.info('Seeding default organization...');

  const orgRepo = dataSource.getRepository(Organization);

  const existing = await orgRepo.findOne({ where: { code: 'NATIONAL' } });
  if (existing) {
    logger.info('Default organization already exists.');
    return;
  }

  const org = new Organization();
  org.name = '본부';  // ⚠️ 
  org.code = 'NATIONAL';  // ⚠️
  org.type = 'national';  // ⚠️
  org.level = 0;  // ⚠️
  org.path = '/national';  // ⚠️
  org.isActive = true;
  org.childrenCount = 0;

  await orgRepo.save(org);
  logger.info('Default organization created: 본부 (NATIONAL)');
}
```

**영향:**
- organization-core 설치 시 자동으로 "본부" 조직 생성
- 모든 신규 환경에 중앙 조직이 자동 생성됨

**우선순위:** **P0**

---

### ❌ 문제 3: Organization 레벨 계층 구조

**파일:** [`packages/organization-core/src/entities/Organization.ts:88-94`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/entities/Organization.ts#L88-L94)

**문제:**
```typescript
/**
 * 계층 레벨
 * - 0: 본부  ⚠️
 * - 1: 지부
 * - 2: 분회
 */
@Column({ type: 'int', default: 0 })
level!: number;
```

**영향:**
- level=0을 기준으로 중앙 조직을 식별하는 로직 존재 가능성
- 계층 구조 쿼리에서 level 기반 필터링

**우선순위:** **P1**

**비고:** 실제로 `level === 0` 조건을 사용하는 코드는 grep 검색 결과 발견되지 않았음. 그러나 주석에 명시되어 있어 혼란을 야기함.

---

### ❌ 문제 4: Organization Path에 '/national' 포함

**파일:** [`packages/organization-core/src/entities/Organization.ts:97-102`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/entities/Organization.ts#L97-L102)

**문제:**
```typescript
/**
 * 계층 경로 (예: "/national/seoul/gangnam")  ⚠️
 *
 * 하위 조직 조회 시 LIKE 검색에 사용됩니다.
 */
@Column({ type: 'text' })
path!: string;
```

**예시:**
- 대한약사회: `path = "/national"`
- 서울지부: `path = "/national/seoul"`
- 강남분회: `path = "/national/seoul/gangnam"`

**영향:**
- 모든 조직의 path가 `/national`로 시작
- path 기반 계층 쿼리에서 중앙 개념 전제

**우선순위:** **P0**

---

### ❌ 문제 5: DTO 타입 정의

**파일:** [`packages/organization-core/src/types/dtos.ts:23-27`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/types/dtos.ts#L23-L27)

**문제:**
```typescript
/**
 * - national: 본부  ⚠️
 * - division: 지부
 * - branch: 분회
 */
type: 'national' | 'division' | 'branch';
```

**영향:**
- API 응답 DTO
- 프론트엔드 TypeScript 타입

**우선순위:** **P0**

---

### ✅ 정상: RoleAssignment scopeType 구조

**파일:** [`packages/organization-core/src/entities/RoleAssignment.ts:64-83`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/entities/RoleAssignment.ts#L64-L83)

**확인:**
```typescript
/**
 * 권한 스코프 타입
 * - global: 전역 권한 (모든 리소스에 대한 권한)  ✅
 * - organization: 조직 권한 (특정 조직에 대한 권한)  ✅
 */
@Column({
  type: 'varchar',
  length: 50,
  default: 'global',
})
scopeType!: 'global' | 'organization';

/**
 * 스코프 ID
 *
 * scopeType='organization'인 경우 조직 ID
 * scopeType='global'인 경우 null  ✅
 */
@Column({ type: 'uuid', nullable: true })
scopeId?: string;
```

**평가:**
- `scopeType='global'`은 조직과 무관한 전역 권한을 의미
- Global Operator 개념과 일치
- 구조는 정상이나, "Global Operator" 역할 정의와의 명확한 연결 필요

**우선순위:** **정상** (별도 정비 필요 없음)

---

### ✅ 정상: OrganizationMember 구조

**파일:** [`packages/organization-core/src/entities/OrganizationMember.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/entities/OrganizationMember.ts)

**확인:**
```typescript
/**
 * OrganizationMember Entity
 *
 * 조직과 회원(User)을 연결하는 다대다(M:N) 연결 테이블입니다.
 */
@Entity('organization_members')
export class OrganizationMember {
  @Column({ type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'uuid' })
  userId!: string;
  
  // ...
}
```

**평가:**
- 조직과 사용자의 관계만 표현
- Global Operator는 이 테이블에 포함될 필요 없음 (정상)

**우선순위:** **정상**

---

## 📊 서비스별 organizationId 사용 패턴 (진행 중)

### Forum (forum-yaksa)

**조사 필요:**
- `yaksa_posts` 테이블에 organizationId 컬럼 존재 여부
- 전체 공지(중앙 공지) vs 지부/분회 공지 구분 방식

### LMS (lms-yaksa)

**조사 필요:**
- `lms_courses` 테이블에 organizationId 컬럼 존재 여부
- 전체 교육 vs 지부/분회 교육 구분 방식

### GroupBuy (groupbuy-yaksa)

**조사 필요:**
- `groupbuy_campaigns` 테이블에 organizationId 컬럼 존재 여부
- 전체 공동구매 vs 지부/분회 공동구매 구분 방식

---

## 📝 문제 목록 요약

| ID | 문제 | 파일 | 우선순위 | 조치 |
|----|------|------|----------|------|
| DB-01 | Organization.type에 'national' 존재 | [`Organization.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/entities/Organization.ts) | P0 | 'national' 타입 제거, 'division'만 유지 |
| DB-02 | 초기 시드에서 중앙 조직 생성 | [`install.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/lifecycle/install.ts) | P0 | seedDefaultOrganization 함수 제거 |
| DB-03 | level=0 주석에 "본부" 명시 | [`Organization.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/entities/Organization.ts) | P1 | 주석 수정 |
| DB-04 | path에 '/national' 포함 | [`Organization.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/entities/Organization.ts) | P0 | 최상위 조직 path를 '/{code}' 형태로 변경 |
| DB-05 | DTO 타입에 'national' 존재 | [`dtos.ts`](file:///c:/Users/sohae/o4o-platform/packages/organization-core/src/types/dtos.ts) | P0 | 'national' 타입 제거 |

---

## 🎯 권장 조치 사항

### 1. Organization.type 수정

**현재:**
```typescript
type!: 'national' | 'division' | 'branch';
```

**수정안:**
```typescript
type!: 'division' | 'branch';
```

**설명:**
- 'national' 타입 완전 제거
- 최상위 조직은 'division'으로 통일
- 예: "서울지부", "부산지부" 모두 type='division', level=0

### 2. Path 구조 변경

**현재:**
```
/national/seoul/gangnam
```

**수정안:**
```
/seoul/gangnam
```

**설명:**
- 최상위 조직의 path는 `/{code}` 형태
- 하위 조직은 `/{parent_code}/{code}` 형태

### 3. Level 의미 재정의

**현재:**
- 0: 본부
- 1: 지부
- 2: 분회

**수정안:**
- 0: 지부 (최상위 조직, parentId=null)
- 1: 분회 (하위 조직, parentId=지부ID)

### 4. 시드 데이터 제거

- `seedDefaultOrganization()` 함수 완전 제거
- 초기 조직은 운영자가 수동으로 생성하도록 변경

---

## 📋 체크리스트

- [x] Organization 엔티티 조사 완료
- [x] RoleAssignment 엔티티 조사 완료
- [x] OrganizationMember 엔티티 조사 완료
- [x] 시드 데이터 조사 완료
- [ ] Forum 서비스 organizationId 사용 패턴 조사
- [ ] LMS 서비스 organizationId 사용 패턴 조사
- [ ] GroupBuy 서비스 organizationId 사용 패턴 조사
- [ ] Migration 파일 전수 조사

---

## 🔗 관련 문서

- [00_overview.md](./00_overview.md) - 조사 개요
- [02_backend_audit.md](./02_backend_audit.md) - 백엔드 서비스 조사 (다음 단계)
- [99_fix_plan.md](./99_fix_plan.md) - 정비 제안서 (최종)
