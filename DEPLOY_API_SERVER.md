# API Server 프로덕션 배포 가이드

## 500 에러 해결을 위한 긴급 배포

### 1. 로컬에서 빌드 완료
```bash
cd /home/dev/o4o-platform/apps/api-server
npm run build
```

### 2. 프로덕션 서버 접속 후 실행할 명령어

```bash
# 1. 프로덕션 서버 접속
ssh sohae21@13.125.144.8

# 2. 프로젝트 디렉토리로 이동
cd /home/sohae21/o4o-platform

# 3. 최신 코드 가져오기
git pull origin main

# 4. API 서버 디렉토리로 이동
cd apps/api-server

# 5. 의존성 설치
npm install

# 6. TypeScript 빌드
npm run build

# 7. PM2로 API 서버 재시작
pm2 restart o4o-api

# 8. 로그 확인
pm2 logs o4o-api --lines 50
```

### 3. 확인 사항

#### 수정된 파일
- `/apps/api-server/src/routes/v1/userRole.routes.ts`
  - `requireAdmin` 미들웨어 제거됨
  - 이제 인증만 필요함 (관리자 권한 불필요)

#### 테스트할 엔드포인트
- `GET /api/v1/users/roles` - 역할 목록 조회
- `GET /api/v1/content/categories` - 카테고리 목록 조회

### 4. 문제 해결

#### Categories 테이블 없음 에러가 발생하는 경우:
```bash
# TypeORM 마이그레이션 실행
npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts

# 또는 스키마 동기화 (주의: 데이터 손실 가능)
npx typeorm-ts-node-commonjs schema:sync -d src/database/data-source.ts
```

#### 권한 문제로 스키마 동기화 실패 시:
```bash
# PostgreSQL에 직접 접속하여 테이블 생성
psql -U o4o_user -d o4o_platform

# Categories 테이블 수동 생성
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  meta_title VARCHAR(255),
  meta_description TEXT,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  nsleft INTEGER NOT NULL DEFAULT 1,
  nsright INTEGER NOT NULL DEFAULT 2,
  parent_id UUID REFERENCES categories(id)
);
```

### 5. 최종 확인
```bash
# API 서버 상태 확인
pm2 status

# API 엔드포인트 테스트
curl https://api.neture.co.kr/api/v1/users/roles -H "Authorization: Bearer YOUR_TOKEN"
```

## 중요 사항
- PM2 프로세스 이름이 `o4o-api`가 아닐 수 있음. `pm2 list`로 확인 필요
- 환경 변수 설정 확인 필요 (`.env.production` 파일)
- 데이터베이스 연결 정보 확인 필요