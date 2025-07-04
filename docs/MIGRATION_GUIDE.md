# O4O Platform Migration Guide

**버전**: 1.0  
**최종 업데이트**: 2025-07-02  
**대상**: 개발팀 전체  

---

## 🎯 마이그레이션 가이드 개요

이 문서는 O4O Platform의 주요 마이그레이션 작업들을 단계별로 안내합니다. 각 마이그레이션은 시스템의 안정성을 보장하면서 점진적으로 진행됩니다.

---

## 🚀 현재 진행 중인 마이그레이션

### **1. React 18 → React 19 마이그레이션**

#### **📊 현재 상태**
| 서비스 | 현재 버전 | 목표 버전 | 상태 |
|--------|-----------|-----------|------|
| main-site | 19.1.0 | 19.1.0 | ✅ 완료 |
| admin-dashboard | 18.3.1 | 19.1.0 | 🔄 진행 필요 |
| crowdfunding | 18.2.0 | 19.1.0 | 🔄 진행 필요 |
| ecommerce | 19.1.0 | 19.1.0 | ✅ 완료 (레거시) |

#### **🔧 Admin Dashboard 마이그레이션**

##### **Step 1: 의존성 업데이트**
```bash
cd services/admin-dashboard

# React 19 설치
npm install react@^19.1.0 react-dom@^19.1.0

# 타입 정의 업데이트
npm install -D @types/react@^19.0.0 @types/react-dom@^19.0.0

# 관련 패키지 업데이트
npm install @vitejs/plugin-react@^4.3.4
```

##### **Step 2: 코드 변경사항**

```typescript
// Before (React 18)
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

// After (React 19) - 변경 없음, 하위 호환성 유지
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
```

##### **Step 3: 호환성 확인**

```typescript
// React 19에서 제거된 기능들 확인
// 1. React.FC 타입 사용 검토
const Component: React.FC<Props> = ({ children }) => {
  return <div>{children}</div>;
};

// 권장: 명시적 타입 정의
const Component = ({ children }: Props) => {
  return <div>{children}</div>;
};

// 2. useEffect 의존성 배열 엄격화
useEffect(() => {
  // effect logic
}, []); // 의존성 배열 정확히 명시
```

##### **Step 4: 빌드 및 테스트**

```bash
# 타입 체크
npm run type-check

# 빌드 테스트
npm run build

# 개발 서버 시작
npm run dev

# 기능 테스트
npm run test
```

##### **예상 소요 시간**: 2-3시간

#### **🔧 Crowdfunding 마이그레이션**

##### **Step 1: 의존성 업데이트**
```bash
cd services/crowdfunding/web

# React 19 설치
npm install react@^19.1.0 react-dom@^19.1.0
npm install -D @types/react@^19.0.0 @types/react-dom@^19.0.0
```

##### **Step 2: 특별 고려사항**
- 크라우드펀딩 특화 컴포넌트들 호환성 확인
- 결제 관련 라이브러리 호환성 검증
- 차트/그래프 라이브러리 업데이트

##### **예상 소요 시간**: 1-2시간

---

### **2. TypeScript Strict Mode 마이그레이션**

#### **📊 현재 상태**
| 서비스 | Strict Mode | 상태 |
|--------|-------------|------|
| api-server | ✅ 활성화 | 완료 |
| main-site | ❌ 비활성화 | 🔄 진행 필요 |
| admin-dashboard | ✅ 활성화 | 완료 |

#### **🔧 Main-Site Strict Mode 활성화**

##### **Step 1: 현재 상태 분석**
```bash
cd services/main-site

# 현재 타입 오류 확인
npx tsc --noEmit --strict

# 오류 개수 파악 (예상: 50-100개)
npx tsc --noEmit --strict 2>&1 | grep -c "error TS"
```

##### **Step 2: tsconfig.json 업데이트**
```json
{
  "compilerOptions": {
    // 기존 설정...
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUncheckedIndexedAccess": true
  }
}
```

##### **Step 3: 단계별 타입 오류 수정**

```typescript
// 1. Implicit any 수정
// Before
function processData(data) {
  return data.map(item => item.value);
}

// After
function processData(data: Array<{ value: number }>): number[] {
  return data.map(item => item.value);
}

// 2. Null/undefined 체크
// Before
const user = getUser();
return user.name;

// After
const user = getUser();
return user?.name || 'Unknown';

// 3. 함수 매개변수 타입 명시
// Before
const handleClick = (event) => {
  event.preventDefault();
};

// After
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
};
```

##### **Step 4: 공통 타입 정의 강화**
```typescript
// types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'BUSINESS' | 'AFFILIATE' | 'ADMIN';
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  retailPrice: number;
  wholesalePrice?: number;
  affiliatePrice?: number;
  category: string;
  isActive: boolean;
}
```

##### **예상 소요 시간**: 4-6시간

---

### **3. 의존성 버전 통일 마이그레이션**

#### **📊 현재 상태**
| 패키지 | API Server | Main Site | Admin Dashboard | 목표 버전 |
|--------|------------|-----------|-----------------|-----------|
| axios | ^1.10.0 | ^1.10.0 | ^1.6.2 | ^1.10.0 |
| typescript | ^5.8.3 | ^5.8.3 | ^5.6.2 | ^5.8.3 |
| tailwindcss | - | ^4.1.11 | ^4.1.7 | ^4.1.11 |

#### **🔧 단계별 업데이트**

##### **Step 1: Admin Dashboard 의존성 업데이트**
```bash
cd services/admin-dashboard

# 주요 패키지 업데이트
npm install axios@^1.10.0
npm install -D typescript@^5.8.3
npm install tailwindcss@^4.1.11

# 호환성 확인
npm run type-check
npm run build
```

##### **Step 2: 버전 고정 정책 수립**
```json
// 루트 package.json에 공통 버전 명시
{
  "devDependencies": {
    "typescript": "5.8.3",
    "@types/node": "20.17.6",
    "eslint": "9.25.0",
    "prettier": "3.0.0"
  }
}
```

##### **Step 3: 자동화 스크립트 생성**
```bash
#!/bin/bash
# scripts/sync-dependencies.sh

echo "Syncing dependencies across workspaces..."

# 공통 버전 정의
TYPESCRIPT_VERSION="^5.8.3"
AXIOS_VERSION="^1.10.0"
TAILWIND_VERSION="^4.1.11"

# 각 서비스 업데이트
for service in services/*/; do
  if [ -f "$service/package.json" ]; then
    echo "Updating $service"
    cd "$service"
    npm install typescript@$TYPESCRIPT_VERSION
    npm install axios@$AXIOS_VERSION
    cd - > /dev/null
  fi
done

echo "Dependencies synced successfully!"
```

---

### **4. 서비스 구조 마이그레이션**

#### **🔧 Image Service 마이그레이션**

##### **현재 상태**: `src/` → **목표**: `services/image-service/`

##### **Step 1: 새 서비스 구조 생성**
```bash
# 새 서비스 폴더 생성
mkdir -p services/image-service

# 기존 파일 이동
mv src/* services/image-service/

# src 폴더 제거 (비어있는지 확인)
rmdir src
```

##### **Step 2: package.json 생성**
```json
{
  "name": "@o4o/image-service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nodemon server/index.ts",
    "build": "tsc",
    "start": "node dist/server/index.js",
    "test": "jest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^4.18.2",
    "sharp": "^0.34.2",
    "multer": "^1.4.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/multer": "^1.4.7",
    "nodemon": "^3.0.1",
    "typescript": "^5.8.3"
  }
}
```

##### **Step 3: 워크스페이스 통합**
```json
// 루트 package.json
{
  "workspaces": [
    "services/*",
    "shared"
  ]
}
```

##### **Step 4: API 통합**
```typescript
// services/api-server/src/routes/imageRoutes.ts
import express from 'express';
import { imageService } from '@o4o/image-service';

const router = express.Router();

router.post('/upload', imageService.uploadHandler);
router.get('/optimize/:id', imageService.optimizeHandler);

export default router;
```

##### **예상 소요 시간**: 2-3시간

#### **🔧 Ecommerce Service 레거시 마이그레이션**

##### **현재 상태**: 레거시 서비스 존재
##### **목표**: 안전한 제거 또는 아카이브

##### **Step 1: 의존성 분석**
```bash
# 사용 중인 참조 확인
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "ecommerce" | grep -v node_modules

# import 관계 분석
grep -r "from.*ecommerce" services/ --include="*.ts" --include="*.tsx"

# 상대 경로 참조 확인
grep -r "\.\./ecommerce" services/ --include="*.ts" --include="*.tsx"
```

##### **Step 2: 데이터 마이그레이션 계획**
```sql
-- 필요시 데이터 백업
CREATE TABLE ecommerce_backup AS 
SELECT * FROM ecommerce_related_tables;

-- 데이터 이전 스크립트
INSERT INTO main_site_tables 
SELECT * FROM ecommerce_tables 
WHERE condition;
```

##### **Step 3: 단계별 제거**
```bash
# 1단계: .archive로 이동
mv services/ecommerce .archive/legacy-ecommerce-$(date +%Y%m%d)

# 2단계: 참조 업데이트
# 모든 import문을 main-site 경로로 변경

# 3단계: 테스트
npm run test:all
npm run build:all
```

---

## 🗄️ 데이터베이스 마이그레이션

### **TypeORM 마이그레이션 가이드**

#### **새 마이그레이션 생성**
```bash
cd services/api-server

# 엔티티 변경 후 마이그레이션 생성
npm run migration:generate -- -n AddUserPreferences

# 수동 마이그레이션 생성
npm run migration:create -- -n CustomDataMigration
```

#### **마이그레이션 실행**
```bash
# 개발 환경
npm run migration:run

# 프로덕션 환경 (주의!)
NODE_ENV=production npm run migration:run
```

#### **마이그레이션 롤백**
```bash
# 마지막 마이그레이션 롤백
npm run migration:revert

# 특정 마이그레이션까지 롤백
# migration 파일에서 down() 메서드 확인 후 실행
```

#### **데이터 마이그레이션 예시**
```typescript
// migrations/1234567890-MigrateUserRoles.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateUserRoles1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 기존 role 필드를 새 enum으로 변환
    await queryRunner.query(`
      UPDATE "user" 
      SET "role" = 'CUSTOMER' 
      WHERE "role" = 'customer'
    `);
    
    await queryRunner.query(`
      UPDATE "user" 
      SET "role" = 'BUSINESS' 
      WHERE "role" = 'business'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백 로직
    await queryRunner.query(`
      UPDATE "user" 
      SET "role" = 'customer' 
      WHERE "role" = 'CUSTOMER'
    `);
  }
}
```

---

## 🔧 환경 설정 마이그레이션

### **환경 변수 표준화**

#### **현재 문제점**
- 서비스별로 다른 환경 변수 명명 규칙
- 중복되는 설정값들
- 보안 수준이 다른 환경 변수 혼재

#### **표준화 방안**

##### **Step 1: 명명 규칙 통일**
```bash
# Before (각 서비스마다 다름)
API_URL=http://localhost:4000
SERVER_PORT=4000
DB_CONNECTION_STRING=postgresql://...

# After (표준화된 규칙)
O4O_API_URL=http://localhost:4000
O4O_API_PORT=4000
O4O_DB_HOST=localhost
O4O_DB_PORT=5432
O4O_DB_NAME=o4o_platform
```

##### **Step 2: 환경별 설정 분리**
```bash
# 환경별 파일 생성
.env.local          # 로컬 개발
.env.development    # 개발 서버
.env.staging        # 스테이징 서버
.env.production     # 프로덕션 서버
```

##### **Step 3: 설정 검증 스크립트**
```typescript
// scripts/validate-env.ts
const requiredEnvVars = [
  'O4O_API_URL',
  'O4O_DB_HOST',
  'O4O_DB_PORT',
  'O4O_DB_NAME',
  'O4O_JWT_SECRET'
];

function validateEnvironment() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set');
}

validateEnvironment();
```

---

## 🧪 테스트 환경 마이그레이션

### **테스트 데이터베이스 설정**

#### **현재 상태**: 테스트와 개발 DB 공유
#### **목표**: 독립적인 테스트 환경

##### **Step 1: 테스트 DB 생성**
```bash
# PostgreSQL 테스트 데이터베이스 생성
createdb o4o_platform_test

# 테스트 환경 변수 설정
cat > .env.test << EOF
NODE_ENV=test
O4O_DB_HOST=localhost
O4O_DB_PORT=5432
O4O_DB_NAME=o4o_platform_test
O4O_DB_USERNAME=postgres
O4O_DB_PASSWORD=test_password
O4O_JWT_SECRET=test_secret_key
EOF
```

##### **Step 2: 테스트 설정 업데이트**
```typescript
// services/api-server/src/test-setup.ts
import { DataSource } from 'typeorm';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.O4O_DB_HOST,
  port: parseInt(process.env.O4O_DB_PORT || '5432'),
  username: process.env.O4O_DB_USERNAME,
  password: process.env.O4O_DB_PASSWORD,
  database: process.env.O4O_DB_NAME,
  entities: ['src/entities/*.ts'],
  synchronize: true, // 테스트 환경에서만 사용
  dropSchema: true,  // 테스트 시작 시 스키마 초기화
});
```

##### **Step 3: 테스트 데이터 시드**
```typescript
// services/api-server/src/test-utils/seed.ts
export async function seedTestData() {
  const userRepository = testDataSource.getRepository(User);
  const productRepository = testDataSource.getRepository(Product);
  
  // 테스트 사용자 생성
  const testUser = userRepository.create({
    email: 'test@example.com',
    password: 'hashedPassword',
    role: 'CUSTOMER'
  });
  await userRepository.save(testUser);
  
  // 테스트 상품 생성
  const testProduct = productRepository.create({
    name: 'Test Product',
    retailPrice: 1000,
    wholesalePrice: 800,
    category: 'Test Category'
  });
  await productRepository.save(testProduct);
  
  return { testUser, testProduct };
}
```

---

## 📋 마이그레이션 체크리스트

### **마이그레이션 시작 전**
- [ ] 현재 상태 백업 완료
- [ ] 마이그레이션 계획 문서화
- [ ] 롤백 계획 수립
- [ ] 팀 내 공유 및 승인
- [ ] 테스트 환경에서 사전 검증

### **마이그레이션 진행 중**
- [ ] 단계별 진행 상황 기록
- [ ] 각 단계마다 테스트 실행
- [ ] 문제 발생 시 즉시 롤백 준비
- [ ] 팀원들과 실시간 소통
- [ ] 진행 상황 문서 업데이트

### **마이그레이션 완료 후**
- [ ] 전체 시스템 테스트
- [ ] 성능 영향 확인
- [ ] 문서 업데이트
- [ ] 팀 공유 및 피드백 수집
- [ ] 모니터링 설정

---

## 🚨 롤백 계획

### **React 마이그레이션 롤백**
```bash
# package.json 롤백
git checkout HEAD~1 -- services/admin-dashboard/package.json
npm install

# 코드 변경사항 롤백
git revert <commit-hash>
```

### **데이터베이스 마이그레이션 롤백**
```bash
# 마지막 마이그레이션 롤백
npm run migration:revert

# 특정 시점으로 롤백
npm run migration:revert -- --to=1234567890
```

### **환경 설정 롤백**
```bash
# 환경 변수 백업에서 복원
cp .env.backup .env

# 서비스 재시작
pm2 restart all
```

---

## 📅 마이그레이션 일정

### **Week 1: React 19 마이그레이션**
- **Day 1-2**: admin-dashboard 마이그레이션
- **Day 3**: crowdfunding 마이그레이션
- **Day 4-5**: 테스트 및 버그 수정

### **Week 2: TypeScript Strict Mode**
- **Day 1-3**: main-site strict mode 활성화
- **Day 4-5**: 타입 오류 수정 및 테스트

### **Week 3: 의존성 통일**
- **Day 1-2**: 버전 통일 작업
- **Day 3**: 자동화 스크립트 작성
- **Day 4-5**: 테스트 및 검증

### **Week 4: 서비스 구조 정리**
- **Day 1-2**: Image service 마이그레이션
- **Day 3-4**: Ecommerce 레거시 정리
- **Day 5**: 문서 업데이트 및 정리

---

## 📞 마이그레이션 지원

### **기술 지원**
- **React 마이그레이션**: 프론트엔드 팀
- **TypeScript**: 전체 개발팀
- **데이터베이스**: 백엔드 팀
- **인프라**: DevOps 팀

### **문의 채널**
- **긴급 이슈**: GitHub Issues (urgent 라벨)
- **일반 문의**: 개발팀 채널
- **문서 업데이트**: Pull Request

---

**모든 마이그레이션은 안전성을 최우선으로 하며, 문제 발생 시 즉시 롤백할 수 있도록 준비되어 있습니다. 각 단계를 신중히 진행해주세요.**

*최종 업데이트: 2025-07-02*