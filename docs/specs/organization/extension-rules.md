# Organization-Core Extension 개발 가이드

**버전**: v1.0
**작성일**: 2025-11-30
**목적**: organization-core 기반 Extension App 개발 규칙

---

## 📋 목차

1. [Extension 개요](#1-extension-개요)
2. [Extension 패턴](#2-extension-패턴)
3. [Extension 개발 절차](#3-extension-개발-절차)
4. [도메인별 Extension 예시](#4-도메인별-extension-예시)
5. [Best Practices](#5-best-practices)

---

## 1. Extension 개요

### 1.1 Core/Extension 패턴

organization-core는 **범용 조직 엔진**으로 도메인 중립적입니다.

도메인별 특화 기능은 **Extension App**으로 구현합니다:

```
organization-core (범용 조직 엔진)
 ├─ organization-yaksa (약사회 전용 확장)
 ├─ organization-cosmetics (화장품 전용 확장)
 └─ organization-traveler (여행자 전용 확장)
```

### 1.2 Extension의 역할

| 역할 | 설명 | 예시 |
|------|------|------|
| **메타데이터 확장** | Organization.metadata에 도메인 전용 필드 추가 | 약사회: 면허번호, 약국정보 |
| **도메인 엔티티 연동** | 도메인 엔티티에 organizationId 추가 | ForumPost.organizationId |
| **UI 커스터마이징** | 조직 관리 UI 커스터마이징 | 약사회 전용 대시보드 |
| **비즈니스 로직** | 도메인 전용 검증/처리 로직 | 약사 면허 검증 |
| **자동화** | 조직 생성 시 자동 리소스 생성 | 게시판 자동 생성 |

---

## 2. Extension 패턴

### 2.1 메타데이터 확장 패턴

**organization-core (Core):**
```typescript
@Entity('organizations')
class Organization {
  id: string;
  name: string;
  code: string;
  type: 'national' | 'division' | 'branch';
  metadata: Record<string, any>;  // 확장 포인트
}
```

**organization-yaksa (Extension):**
```typescript
// Extension이 metadata 스키마 정의
interface YaksaOrganizationMetadata {
  // 약사회 전용 필드
  licenseNumber?: string;      // 면허번호
  pharmacyName?: string;       // 약국명
  pharmacyAddress?: string;    // 약국 주소
  pharmacyPhone?: string;      // 약국 전화번호
  establishedDate?: string;    // 설립일
  memberCount?: number;        // 회원 수
}

// 사용 예시
const org = new Organization();
org.metadata = {
  licenseNumber: "12345-67890",
  pharmacyName: "서울약국",
  pharmacyAddress: "서울시 강남구 테헤란로 123"
} as YaksaOrganizationMetadata;
```

**organization-cosmetics (Extension):**
```typescript
interface CosmeticsOrganizationMetadata {
  // 화장품 매장 전용 필드
  storeCode: string;           // 매장 코드
  businessLicense: string;     // 사업자 등록번호
  managerName: string;         // 매니저 이름
  squareMeters: number;        // 매장 면적
  inventorySystem?: string;    // 재고 시스템
}
```

---

### 2.2 도메인 엔티티 연동 패턴

**Forum Extension 예시:**

```typescript
// packages/forum-core/src/entities/ForumPost.ts
@Entity('forum_posts')
class ForumPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  // ✅ organizationId 추가 (nullable)
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;
}
```

**LMS Extension 예시:**

```typescript
// packages/lms-core/src/entities/Course.ts
@Entity('courses')
class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  // ✅ organizationId 추가
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;
}
```

---

### 2.3 자동화 패턴 (Lifecycle Hooks)

**organization-forum Extension:**

조직 생성 시 자동으로 조직 전용 게시판 생성:

```typescript
// packages/organization-forum/src/lifecycle/install.ts
export async function onOrganizationCreated(
  context: OrganizationLifecycleContext
): Promise<void> {
  const { organization, dataSource } = context;
  const categoryRepo = dataSource.getRepository(ForumCategory);

  // 조직 전용 게시판 자동 생성
  const category = new ForumCategory();
  category.name = `${organization.name} 게시판`;
  category.organizationId = organization.id;
  category.isOrganizationExclusive = true;

  await categoryRepo.save(category);
}
```

**organization-lms Extension:**

조직 생성 시 자동으로 기본 교육과정 생성:

```typescript
// packages/organization-lms/src/lifecycle/install.ts
export async function onOrganizationCreated(
  context: OrganizationLifecycleContext
): Promise<void> {
  const { organization, dataSource } = context;
  const courseRepo = dataSource.getRepository(Course);

  // 기본 교육과정 생성
  const course = new Course();
  course.title = `${organization.name} 기본 교육`;
  course.organizationId = organization.id;
  course.isRequired = true;

  await courseRepo.save(course);
}
```

---

## 3. Extension 개발 절차

### 3.1 프로젝트 구조

```
packages/organization-yaksa/
├── src/
│   ├── entities/           # 추가 엔티티 (선택적)
│   ├── services/           # 비즈니스 로직
│   ├── controllers/        # API 컨트롤러
│   ├── lifecycle/          # 라이프사이클 훅
│   │   ├── install.ts
│   │   ├── activate.ts
│   │   ├── deactivate.ts
│   │   └── uninstall.ts
│   ├── types/              # TypeScript 타입 정의
│   │   └── YaksaOrganizationMetadata.ts
│   └── manifest.ts         # App Store manifest
├── package.json
└── README.md
```

### 3.2 manifest.ts 작성

```typescript
// packages/organization-yaksa/src/manifest.ts
import { AppManifest } from '@o4o/types';

export const manifest: AppManifest = {
  appId: 'organization-yaksa',
  name: '약사회 조직 확장',
  version: '1.0.0',
  type: 'extension',
  description: '약사회 조직에 특화된 메타데이터 및 기능 확장',

  // 의존성: organization-core 필수
  dependencies: [
    {
      appId: 'organization-core',
      version: '^1.0.0',
      required: true
    }
  ],

  // 소유 테이블 (선택적)
  ownsTables: [],

  // 권한 정의
  permissions: [
    'organization.yaksa.read',
    'organization.yaksa.manage'
  ],

  // 라이프사이클 훅
  lifecycle: {
    install: './lifecycle/install',
    activate: './lifecycle/activate',
    deactivate: './lifecycle/deactivate',
    uninstall: './lifecycle/uninstall'
  },

  // API 라우트
  routes: [
    {
      path: '/api/organization/yaksa',
      method: 'GET',
      handler: './controllers/YaksaOrganizationController.list'
    }
  ]
};
```

### 3.3 TypeScript 타입 정의

```typescript
// packages/organization-yaksa/src/types/YaksaOrganizationMetadata.ts
export interface YaksaOrganizationMetadata {
  licenseNumber?: string;      // 면허번호
  pharmacyName?: string;       // 약국명
  pharmacyAddress?: string;    // 약국 주소
  pharmacyPhone?: string;      // 약국 전화번호
  establishedDate?: string;    // 설립일
  memberCount?: number;        // 회원 수
  specialization?: string[];   // 전문 분야
  certifications?: string[];   // 인증 정보
}

// 타입 가드
export function isYaksaOrganization(metadata: any): metadata is YaksaOrganizationMetadata {
  return metadata && typeof metadata.licenseNumber === 'string';
}
```

### 3.4 Service 구현

```typescript
// packages/organization-yaksa/src/services/YaksaOrganizationService.ts
@Injectable()
export class YaksaOrganizationService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepo: Repository<Organization>
  ) {}

  async validateLicenseNumber(licenseNumber: string): Promise<boolean> {
    // 약사 면허번호 검증 로직
    const pattern = /^\d{5}-\d{5}$/;
    return pattern.test(licenseNumber);
  }

  async updateYaksaMetadata(
    organizationId: string,
    metadata: YaksaOrganizationMetadata
  ): Promise<Organization> {
    const org = await this.organizationRepo.findOne({ where: { id: organizationId } });
    if (!org) {
      throw new NotFoundException('조직을 찾을 수 없습니다.');
    }

    // 메타데이터 병합
    org.metadata = {
      ...org.metadata,
      ...metadata
    };

    return await this.organizationRepo.save(org);
  }

  async getYaksaOrganizations(): Promise<Organization[]> {
    // 약사회 조직만 조회 (metadata에 licenseNumber가 있는 조직)
    const orgs = await this.organizationRepo.find();
    return orgs.filter(org => isYaksaOrganization(org.metadata));
  }
}
```

---

## 4. 도메인별 Extension 예시

### 4.1 organization-yaksa (약사회)

**메타데이터 확장:**
```typescript
{
  licenseNumber: "12345-67890",
  pharmacyName: "서울약국",
  pharmacyAddress: "서울시 강남구 테헤란로 123",
  pharmacyPhone: "02-1234-5678",
  establishedDate: "1990-03-15",
  memberCount: 150,
  specialization: ["한방", "약국경영"],
  certifications: ["우수약국", "건강기능식품"]
}
```

**자동화:**
- 조직 생성 시 약사회 전용 게시판 자동 생성
- 조직 생성 시 약사 교육 기본 과정 자동 등록

**검증 로직:**
- 약사 면허번호 형식 검증
- 약국 사업자 등록번호 검증

---

### 4.2 organization-cosmetics (화장품)

**메타데이터 확장:**
```typescript
{
  storeCode: "STORE-001",
  businessLicense: "123-45-67890",
  managerName: "김매니저",
  squareMeters: 150,
  inventorySystem: "ERP-COSMETICS-V2",
  brandPartners: ["로레알", "에스티로더"],
  monthlyRevenue: 50000000
}
```

**도메인 엔티티 연동:**
```typescript
// Product.organizationId 추가
// Inventory.organizationId 추가
// Sales.organizationId 추가
```

**자동화:**
- 조직 생성 시 재고 카테고리 자동 생성
- 조직 생성 시 기본 상품 템플릿 생성

---

### 4.3 organization-traveler (여행자)

**메타데이터 확장:**
```typescript
{
  travelAgencyLicense: "TA-2024-1234",
  regionCoverage: ["서울", "경기", "인천"],
  specialization: ["국내여행", "문화관광"],
  guideCount: 25,
  vehicleCount: 5,
  insuranceInfo: "여행자 보험 A+ 등급"
}
```

**자동화:**
- 조직 생성 시 여행 상품 카테고리 자동 생성
- 조직 생성 시 가이드 관리 기능 활성화

---

## 5. Best Practices

### 5.1 메타데이터 설계 원칙

**✅ DO:**
- 도메인 전용 필드만 metadata에 추가
- TypeScript interface로 타입 정의
- 선택적(optional) 필드로 설계
- 타입 가드 함수 제공

**❌ DON'T:**
- organization-core 엔티티 직접 수정 금지
- 필수(required) 필드 추가 금지 (Core 호환성 유지)
- 다른 Extension의 metadata 덮어쓰기 금지

---

### 5.2 도메인 엔티티 연동 원칙

**✅ DO:**
- organizationId는 nullable로 설정
- @ManyToOne 관계 추가
- Organization 삭제 시 SET NULL 또는 CASCADE 정책 명시

**❌ DON'T:**
- organizationId를 필수(required)로 설정 금지
- Organization 엔티티 직접 수정 금지

---

### 5.3 라이프사이클 훅 원칙

**✅ DO:**
- 트랜잭션 내에서 실행
- 에러 처리 철저히
- 롤백 가능하도록 설계

**❌ DON'T:**
- 외부 API 호출 금지 (타임아웃 위험)
- 무한 루프 금지
- 다른 Extension의 데이터 직접 수정 금지

---

### 5.4 권한 설계 원칙

**✅ DO:**
- Extension 전용 권한 정의 (`organization.yaksa.manage`)
- organization-core 권한 재사용
- 조직 스코프 권한 활용

**❌ DON'T:**
- organization-core 권한 덮어쓰기 금지
- 전역 권한 남용 금지

---

### 5.5 테스트 원칙

**필수 테스트:**
1. organization-core 없이 설치 시도 → 에러
2. 메타데이터 검증 로직 테스트
3. 라이프사이클 훅 실행 테스트
4. 도메인 엔티티 연동 테스트

```typescript
// __tests__/organization-yaksa.spec.ts
describe('organization-yaksa Extension', () => {
  it('should require organization-core dependency', async () => {
    // organization-core 없이 설치 시도
    await expect(
      appManager.install('organization-yaksa')
    ).rejects.toThrow('Dependency not met: organization-core');
  });

  it('should validate license number format', () => {
    const service = new YaksaOrganizationService();
    expect(service.validateLicenseNumber('12345-67890')).toBe(true);
    expect(service.validateLicenseNumber('invalid')).toBe(false);
  });

  it('should create forum category on organization creation', async () => {
    const org = await createOrganization({ type: 'division' });
    const category = await forumCategoryRepo.findOne({
      where: { organizationId: org.id }
    });
    expect(category).toBeDefined();
    expect(category.name).toBe(`${org.name} 게시판`);
  });
});
```

---

**작성자**: Claude Code
**최종 업데이트**: 2025-11-30
**버전**: v1.0
**상태**: 설계 완료
