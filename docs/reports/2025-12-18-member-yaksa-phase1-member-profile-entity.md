# member-yaksa Phase 1 완료 보고서

## 작업 정보

| 항목 | 내용 |
|------|------|
| Work Order | WO-MEMBER-YAKSA-PHASE1 |
| Phase | Phase 1 - MemberProfile Entity |
| 작업일 | 2025-12-18 |
| 브랜치 | feature/member-yaksa-phase1 |
| 상태 | ✅ 완료 |

## 구현 내용

### 1. MemberProfile 엔티티

**파일**: `packages/member-yaksa/src/backend/entities/MemberProfile.ts`

```typescript
@Entity('member_profiles')
@Index(['userId'], { unique: true })
@Index(['occupationType'])
@Index(['pharmacistLicenseNumber'])
export class MemberProfile {
  id: string;               // UUID PK
  userId: string;           // 사용자 FK (unique)
  pharmacistLicenseNumber: string;  // 🔒 READ-ONLY
  occupationType: OccupationType;    // 🔒 READ-ONLY
  pharmacyName?: string;    // 약국명 (본인 수정만)
  pharmacyAddress?: string; // 약국 주소 (본인 수정만)
  pharmacyPhone?: string;
  hospitalName?: string;    // 병원약사용
  agencyName?: string;      // 공직약사용
  companyName?: string;     // 산업약사용
  profileStatus: ProfileStatus;
  completionRate: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastProfileUpdateAt?: Date;
}
```

**직역 유형 (OccupationType)**:
- `OWNER_PHARMACIST`: 개설약사
- `STAFF_PHARMACIST`: 근무약사
- `HOSPITAL_PHARMACIST`: 병원약사
- `PUBLIC_PHARMACIST`: 공직약사
- `INDUSTRY_PHARMACIST`: 산업약사
- `SUSPENDED`: 휴직

### 2. 정책 구현

| 필드 | 정책 | 구현 |
|------|------|------|
| `pharmacistLicenseNumber` | READ-ONLY | Controller에서 수정 시도 시 400 + `MP-E004` |
| `occupationType` | READ-ONLY | Controller에서 수정 시도 시 400 + `MP-E005` |
| `pharmacyName/Address` | 본인만 수정 | Service에서 `requesterId === userId` 검증 |

### 3. 에러 코드

```typescript
export const MemberProfileError = {
  PROFILE_NOT_FOUND: 'MP-E001',
  PROFILE_ALREADY_EXISTS: 'MP-E002',
  UNAUTHORIZED_UPDATE: 'MP-E003',
  LICENSE_NUMBER_READONLY: 'MP-E004',
  OCCUPATION_TYPE_READONLY: 'MP-E005',
  INVALID_OCCUPATION_TYPE: 'MP-E006',
  USER_NOT_FOUND: 'MP-E007',
} as const;
```

### 4. API 엔드포인트

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | `/api/v1/yaksa/member/profile/me` | 내 프로필 조회 | 로그인 회원 |
| PATCH | `/api/v1/yaksa/member/profile/me` | 내 프로필 수정 | 본인만 |
| GET | `/api/v1/yaksa/member/profile/:userId` | 특정 회원 조회 | 관리자/본인 |
| POST | `/api/v1/yaksa/member/profile/sync-from-reporting` | reporting 연동 | 시스템/관리자 |

### 5. Migration

**파일**: `packages/member-yaksa/src/migrations/001-create-member-profile.ts`

```sql
CREATE TABLE member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  pharmacist_license_number VARCHAR(50) NOT NULL,
  occupation_type VARCHAR(30) DEFAULT 'OWNER_PHARMACIST',
  pharmacy_name VARCHAR(200),
  pharmacy_address VARCHAR(500),
  pharmacy_phone VARCHAR(20),
  hospital_name VARCHAR(200),
  agency_name VARCHAR(200),
  company_name VARCHAR(200),
  profile_status VARCHAR(30) DEFAULT 'active',
  completion_rate INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_profile_update_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_member_profiles_occupation_type ON member_profiles(occupation_type);
CREATE INDEX idx_member_profiles_license ON member_profiles(pharmacist_license_number);
CREATE INDEX idx_member_profiles_status ON member_profiles(profile_status);
```

## 파일 목록

### 신규 생성

| 파일 | 설명 |
|------|------|
| `src/backend/entities/MemberProfile.ts` | 프로필 엔티티 |
| `src/backend/entities/index.ts` | 엔티티 exports |
| `src/backend/services/MemberProfileService.ts` | 비즈니스 로직 |
| `src/backend/services/index.ts` | 서비스 exports |
| `src/backend/controllers/MemberProfileController.ts` | API 컨트롤러 |
| `src/backend/controllers/index.ts` | 컨트롤러 exports |
| `src/backend/routes/memberProfileRoutes.ts` | 프로필 라우트 |
| `src/migrations/001-create-member-profile.ts` | DB 마이그레이션 |
| `src/migrations/index.ts` | 마이그레이션 exports |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/backend/index.ts` | 엔티티/서비스/컨트롤러 export 추가 |
| `src/backend/routes/index.ts` | memberProfileRoutes 연동 |
| `src/index.ts` | migrations export 추가 |
| `src/lifecycle/install.ts` | Phase 1 테이블/권한 정보 |
| `src/lifecycle/activate.ts` | Phase 1 라우트/API 정보 |
| `tsconfig.json` | 데코레이터 설정 추가 |

## 빌드 검증

```bash
$ pnpm -F @o4o-apps/member-yaksa build
> tsc
# 성공 (에러 없음)
```

## Definition of Done 체크리스트

- [x] MemberProfile 엔티티 생성
- [x] Migration 생성
- [x] Service 스켈레톤 (전체 구현)
- [x] Controller 스켈레톤 (전체 구현)
- [x] API 4종 스켈레톤 (전체 구현)
- [x] `pharmacistLicenseNumber` READ-ONLY 정책 구현
- [x] 약국 정보 본인 수정 정책 반영
- [x] `pnpm -F @o4o-apps/member-yaksa build` 성공

## 커밋 정보

```
commit 552eddfbc
feat(member-yaksa): Phase 1 MemberProfile Entity Implementation
```

## 다음 단계

### Phase 2 (예정)
- api-server에 member-yaksa 라우트 연동
- MemberProfile 엔티티 TypeORM 등록
- 실제 API 테스트

### Phase 3+ (예정)
- Home 통합 화면 (공지/공동구매/LMS/Forum)
- reporting-yaksa 실제 연동
- 프로필 완성도 자동 계산

---

*작성일: 2025-12-18*
*작성자: Claude Code*
