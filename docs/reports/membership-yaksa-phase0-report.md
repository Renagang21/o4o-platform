# Membership-Yaksa Phase 0 조사 완료 보고

> **작성일:** 2025-12-11
> **작성자:** Claude Code Agent
> **브랜치:** feature/membership-yaksa-phase0

---

## 1. 전체 조사 요약

### 1.1 기존 코드 구조

**패키지 위치:** `packages/membership-yaksa/`

#### Entities (6개)
| Entity | 테이블명 | 설명 |
|--------|----------|------|
| Member | yaksa_members | 핵심 회원 정보 |
| MemberCategory | yaksa_member_categories | 회원 분류 (정회원, 준회원 등) |
| Affiliation | yaksa_member_affiliations | 조직 소속 정보 (다중 소속 지원) |
| MembershipRoleAssignment | yaksa_membership_roles | 직책 배정 |
| MembershipYear | yaksa_membership_years | 연회비 납부 이력 |
| Verification | yaksa_member_verifications | 자격 검증 이력 |

#### Services (8개)
- MemberService (핵심 - computedStatus, bulkUpdate 포함)
- MemberCategoryService
- AffiliationService
- MembershipYearService
- VerificationService
- StatsService
- ExportService
- NotificationService

#### Controllers (4개)
- MemberController
- StatsController
- ExportController
- VerificationController

#### Lifecycle (4개)
- install.ts
- activate.ts
- deactivate.ts
- uninstall.ts

### 1.2 현재 Member Entity 필드

```typescript
// 기존 필드 (현재 구현)
id: string (PK, UUID)
userId: string (FK → users.id)
organizationId: string (FK → organizations.id)
licenseNumber: string (면허번호, unique)
name: string
birthdate: string (YYYY-MM-DD)
isVerified: boolean
categoryId?: string (FK → yaksa_member_categories.id)
phone?: string
email?: string
pharmacyName?: string
pharmacyAddress?: string
isActive: boolean
metadata?: Record<string, any> (JSONB)
createdAt: Date
updatedAt: Date

// Relations
affiliations: Affiliation[]
membershipYears: MembershipYear[]
verifications: Verification[]
category: MemberCategory
```

---

## 2. 데이터 갭 분석

### 2.1 Yaksa 서비스에 필수인데 누락된 필드

| 필드명 | 타입 | 설명 | 우선순위 |
|--------|------|------|----------|
| `pharmacistLicenseNumber` | string | 약사면허번호 (licenseNumber 중복?) | 검토 필요 |
| `licenseIssuedAt` | Date | 면허 발급일 | 높음 |
| `licenseRenewalAt` | Date | 면허 갱신일 | 높음 |
| `pharmacistType` | enum | 약사 유형 (근무/개설/병원/공직/산업) | 높음 |
| `workplaceName` | string | 근무지명 (pharmacyName 외) | 중간 |
| `workplaceAddress` | string | 근무지 주소 | 중간 |
| `workplaceType` | enum | 근무지 유형 (약국/병원/제약사/관공서 등) | 높음 |
| `yaksaJoinDate` | Date | 약사회 가입일 | 높음 |
| `officialRole` | string | 공식 직책 (분회장, 지부장, 총무 등) | 중간 |
| `gender` | enum | 성별 | 중간 |
| `registrationNumber` | string | 회원등록번호 (약사회 내부 번호) | 높음 |

### 2.2 기존 필드 중 검토 필요 사항

| 필드 | 현황 | 개선 방안 |
|------|------|-----------|
| `pharmacyName` | 약국명만 저장 | workplaceName으로 일반화 |
| `pharmacyAddress` | 약국 주소만 저장 | workplaceAddress로 일반화 |
| `metadata` | JSONB로 확장 데이터 저장 | 자주 쓰는 필드는 정규 컬럼으로 승격 |

### 2.3 권장 구조 개선

**옵션 A: Member Entity 확장**
- 누락 필드를 Member Entity에 직접 추가
- 장점: 단순, 쿼리 성능 우수
- 단점: Entity 비대화

**옵션 B: MemberProfile 분리 Entity 생성**
- 기본 정보는 Member, 상세 정보는 MemberProfile
- 장점: 관심사 분리
- 단점: Join 필요

**권장: 옵션 A** (Member Entity에 필수 필드 추가, metadata는 확장용으로 유지)

---

## 3. 연동 앱 요구사항 분석

### 3.1 reporting-yaksa

**현재 상태:** `MembershipSyncService` 구현 완료

**연동 포인트:**
- 신상신고서 승인 시 → Member Entity 자동 업데이트
- `syncToMembership` + `syncTarget` 필드로 어떤 필드를 동기화할지 정의
- 예: `syncTarget: "metadata.workplaceType"` → `member.metadata.workplaceType` 업데이트

**필요 조치:**
- Member Entity에 공식 컬럼이 있으면 `syncTarget`이 직접 해당 컬럼을 가리킬 수 있음
- 현재는 metadata에 저장 → 정규 컬럼으로 승격 권장

### 3.2 lms-yaksa

**현재 상태:** `dependencies.optional: ['membership-yaksa']`

**연동 포인트:**
- `YaksaLicenseProfile`: 면허/자격 정보 관리 (별도 Entity)
- `RequiredCoursePolicy`: 필수 교육 정책 (pharmacistType 기반)
- `CreditRecord`: 연수 평점 기록 (memberId 참조)
- `YaksaCourseAssignment`: 강좌 배정 (memberId 참조)

**필요 조치:**
- Member.pharmacistType이 필수 교육 정책 결정에 사용됨
- lms-yaksa는 membership-yaksa의 Member를 참조하므로, Member에 pharmacistType 필드 추가 필요

### 3.3 organization-core

**현재 상태:** `dependencies.core: ['organization-core']`

**연동 포인트:**
- Member.organizationId → Organization.id 참조
- Affiliation.organizationId → Organization.id 참조
- 조직 계층 (지부/분회)에 따른 회원 조회

**필요 조치:**
- 조직 변경 시 Member.organizationId 및 Affiliation 자동 업데이트 Hook 필요

### 3.4 forum-yaksa

**현재 상태:** 직접 연동 없음 (조사 필요)

**예상 연동 포인트:**
- Member 직책(officialRole) → 포럼 권한 매핑
- 예: 분회장 → 분회 게시판 관리 권한

---

## 4. Frontend 요구사항

### 4.1 MyPage에 필요한 정보

| 섹션 | 필요 데이터 | 현재 지원 |
|------|-------------|-----------|
| 기본 정보 | 이름, 생년월일, 연락처, 이메일 | ✅ 지원 |
| 면허 정보 | 면허번호, 발급일, 갱신일 | ⚠️ 번호만 |
| 약사 유형 | 근무/개설/병원/공직/산업 | ❌ 미지원 |
| 근무지 정보 | 근무지명, 주소, 유형 | ⚠️ 약국만 |
| 소속 정보 | 지부/분회, 직책 | ✅ 지원 |
| 연수 교육 | 이수 현황, 평점 | 🔗 lms-yaksa |
| 신상신고 | 제출 이력, 상태 | 🔗 reporting-yaksa |
| 회비 납부 | 연회비 현황 | ✅ 지원 |

### 4.2 Admin에 필요한 정보

| 기능 | 현재 지원 |
|------|-----------|
| 회원 목록 (필터링/검색) | ✅ 지원 |
| 회원 상세 조회 | ✅ 지원 |
| 회원 일괄 업데이트 | ✅ 지원 |
| 회원 통계 | ✅ 지원 |
| 엑셀 내보내기 | ✅ 지원 |
| 자격 검증 워크플로우 | ✅ 지원 |

---

## 5. Phase 1 개발 항목 리스트

### 5.1 Entity 확장 (Migration-First)

**작업 순서:**
1. Migration 파일 생성 (`ALTER TABLE yaksa_members ADD COLUMN ...`)
2. Member Entity 업데이트
3. MemberService DTO 업데이트
4. API 테스트

**추가할 컬럼:**
```sql
-- Phase 1 Migration
ALTER TABLE yaksa_members ADD COLUMN license_issued_at DATE;
ALTER TABLE yaksa_members ADD COLUMN license_renewal_at DATE;
ALTER TABLE yaksa_members ADD COLUMN pharmacist_type VARCHAR(50);
ALTER TABLE yaksa_members ADD COLUMN workplace_name VARCHAR(200);
ALTER TABLE yaksa_members ADD COLUMN workplace_address TEXT;
ALTER TABLE yaksa_members ADD COLUMN workplace_type VARCHAR(50);
ALTER TABLE yaksa_members ADD COLUMN yaksa_join_date DATE;
ALTER TABLE yaksa_members ADD COLUMN official_role VARCHAR(100);
ALTER TABLE yaksa_members ADD COLUMN gender VARCHAR(10);
ALTER TABLE yaksa_members ADD COLUMN registration_number VARCHAR(50) UNIQUE;
```

### 5.2 서비스 수정

| 서비스 | 수정 내용 |
|--------|-----------|
| MemberService | CreateMemberDto, UpdateMemberDto에 신규 필드 추가 |
| MemberService | computeStatus에 pharmacistType 반영 |
| ExportService | 엑셀 내보내기에 신규 필드 포함 |

### 5.3 API 확장

| Endpoint | 수정 내용 |
|----------|-----------|
| POST /members | 신규 필드 지원 |
| PUT /members/:id | 신규 필드 지원 |
| GET /members | 신규 필드 필터링 지원 |
| GET /members/stats | 신규 통계 (pharmacistType별) |

### 5.4 연동 흐름도

```
[Reporting-Yaksa]
     |
     | (승인 시 동기화)
     v
[Membership-Yaksa: Member Entity]
     |
     +-----> [LMS-Yaksa: 교육 정책 결정]
     |
     +-----> [Organization-Core: 조직 계층]
     |
     +-----> [Forum-Yaksa: 권한 매핑]
```

---

## 6. 위험 요소 (Risks)

| 위험 | 영향 | 대응 방안 |
|------|------|-----------|
| 기존 데이터 마이그레이션 | 기존 Member 레코드에 신규 필드 NULL | nullable로 설정, 점진적 데이터 보강 |
| reporting-yaksa syncTarget 변경 | 기존 템플릿 syncTarget 경로 변경 필요 | 템플릿 마이그레이션 스크립트 작성 |
| lms-yaksa 의존성 | Member.pharmacistType 없으면 정책 결정 불가 | Phase 1 완료 후 lms-yaksa 연동 |
| 배포 순서 | Migration → Entity → Service 순서 준수 | CI/CD 파이프라인에 순서 명시 |

---

## 7. 결론 및 권고사항

### 7.1 즉시 진행 권고
1. **Member Entity 확장** - 누락 필드 추가 (Migration-First)
2. **MemberService 업데이트** - DTO 및 computeStatus 개선
3. **reporting-yaksa 템플릿 검토** - syncTarget 경로 확인

### 7.2 Phase 1 완료 후 진행
1. lms-yaksa 완전 연동 (pharmacistType 기반 정책)
2. forum-yaksa 권한 매핑
3. MyPage UI 업데이트

### 7.3 향후 고려사항
1. 회원등록번호(registrationNumber) 자동 생성 규칙 정의
2. 면허 갱신 알림 시스템
3. 근무지 변경 이력 추적

---

*Phase 1 작업 요청서가 필요하시면 말씀해 주세요.*
