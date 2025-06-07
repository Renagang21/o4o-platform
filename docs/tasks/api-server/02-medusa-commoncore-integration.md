
# Cursor 작업: Common-Core와 기존 Medusa 시스템 연동

## 🎯 수정된 연동 목표
AWS Lightsail에서 운영 중인 기존 Medusa.js 시스템(o4o-apiserver)과 Common-Core 인증 시스템을 연동하여 통합 인증을 구현합니다.

## 🌐 현재 운영 환경
```
AWS Lightsail 인프라:
├── o4o-webserver (13.125.144.8)
│   └── neture.co.kr (React SPA)
└── o4o-apiserver (43.202.242.215)
    └── api.neture.co.kr (Medusa.js + PostgreSQL)
```

## 🔧 기존 시스템 정보
- **Medusa.js**: 이미 설치 및 실행 중
- **PostgreSQL**: 기존 Medusa DB 운영 중
- **도메인**: api.neture.co.kr로 서비스 중
- **환경 변수**: DATABASE_URL, JWT_SECRET 등 설정됨

## 📋 연동 작업 계획

### 1단계: 기존 시스템 확인 및 분석

#### 1.1 현재 Medusa 설정 파악
```bash
# o4o-apiserver 접속 후 확인 필요사항
ssh ubuntu@43.202.242.215 -i aws-o4o-apiserver-ssh-key.pem

# 현재 Medusa 프로젝트 위치 확인
find /home/ubuntu -name "medusa-config.js" -type f

# 현재 PostgreSQL 연결 정보 확인
cat .env | grep DATABASE_URL

# 현재 실행 중인 Medusa 프로세스 확인
pm2 list
ps aux | grep medusa
```

#### 1.2 데이터베이스 스키마 확인
```sql
-- PostgreSQL 접속 후 현재 테이블 구조 확인
\c o4o_db  -- 또는 실제 DB명
\dt        -- 테이블 목록
\d customer -- Customer 테이블 구조 확인
```

### 2단계: Common-Core 패키지 준비

#### 2.1 NPM 패키지로 배포 준비
```json
// common-core/package.json 수정
{
  "name": "@renagang21/common-core",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  }
}
```

#### 2.2 기존 Medusa와 호환되는 구조로 수정
```typescript
// src/services/medusa-auth.service.ts (신규 생성)
import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';

export class MedusaAuthService {
  private authService: AuthService;
  private jwtService: JwtService;

  constructor() {
    this.authService = new AuthService();
    this.jwtService = new JwtService();
  }

  // Medusa 커스텀 엔드포인트용 회원가입
  async registerWithMedusa(req: MedusaRequest, res: MedusaResponse) {
    const { email, password, first_name, last_name } = req.body;

    try {
      // 1. Common-Core에서 사용자 생성
      const user = await this.authService.register({
        email,
        password,
        first_name,
        last_name
      });

      // 2. Medusa Customer 생성
      const customerService = req.scope.resolve('customerService');
      const customer = await customerService.create({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        metadata: {
          common_core_user_id: user.id
        }
      });

      // 3. Common-Core User에 customer_id 연결
      await this.authService.updateUser(user.id, {
        customer_id: customer.id
      });

      // 4. JWT 토큰 생성
      const tokens = this.jwtService.generateTokens({
        userId: user.id,
        customerId: customer.id,
        email: user.email,
        role: user.role
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        },
        customer: {
          id: customer.id,
          email: customer.email
        },
        tokens
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Medusa 커스텀 엔드포인트용 로그인
  async loginWithMedusa(req: MedusaRequest, res: MedusaResponse) {
    const { email, password } = req.body;

    try {
      // Common-Core 로그인
      const user = await this.authService.login(email, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '이메일 또는 비밀번호가 잘못되었습니다.'
        });
      }

      // Medusa Customer 조회
      const customerService = req.scope.resolve('customerService');
      const customer = await customerService.retrieveByEmail(email);

      // JWT 토큰 생성
      const tokens = this.jwtService.generateTokens({
        userId: user.id,
        customerId: customer?.id,
        email: user.email,
        role: user.role
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        customer: customer || null,
        tokens
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}
```

### 3단계: Medusa 커스텀 엔드포인트 구현

#### 3.1 Medusa 프로젝트에 Common-Core 설치
```bash
# o4o-apiserver에서 실행
cd /path/to/medusa/project
npm install @renagang21/common-core

# 또는 로컬 패키지로 연결
npm link /path/to/common-core
```

#### 3.2 커스텀 API 라우트 생성
```typescript
// src/api/store/auth/register.ts
import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import { MedusaAuthService } from '@renagang21/common-core';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const medusaAuthService = new MedusaAuthService();
  return await medusaAuthService.registerWithMedusa(req, res);
}
```

```typescript
// src/api/store/auth/login.ts
import { MedusaRequest, MedusaResponse } from '@medusajs/medusa';
import { MedusaAuthService } from '@renagang21/common-core';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const medusaAuthService = new MedusaAuthService();
  return await medusaAuthService.loginWithMedusa(req, res);
}
```

### 4단계: 데이터베이스 마이그레이션

#### 4.1 기존 Medusa DB에 Common-Core 테이블 추가
```sql
-- 기존 Medusa PostgreSQL에 users 테이블 생성
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'user',
  customer_id VARCHAR(255), -- Medusa Customer와 연결
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_customer_id ON users(customer_id);
```

#### 4.2 Customer 테이블에 Common-Core 연결 정보 추가
```sql
-- Medusa customer 테이블에 메타데이터로 common_core_user_id 저장
-- (이미 metadata JSONB 컬럼이 있으므로 추가 작업 불필요)
```

### 5단계: 프론트엔드 연동

#### 5.1 React에서 통합 인증 API 사용
```typescript
// main-site/src/services/auth.service.ts
const API_BASE = 'https://api.neture.co.kr';

export const authService = {
  register: async (userData: RegisterData) => {
    const response = await fetch(`${API_BASE}/store/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  },

  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE}/store/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  }
};
```

### 6단계: 배포 및 테스트

#### 6.1 Common-Core 패키지 배포
```bash
# common-core 프로젝트에서
npm run build
npm publish --access public
```

#### 6.2 Medusa 서버 재시작
```bash
# o4o-apiserver에서
pm2 restart medusa
# 또는
npm run start
```

## ✅ 검증 시나리오

### 1. 회원가입 테스트
```bash
curl -X POST https://api.neture.co.kr/store/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "first_name": "홍",
    "last_name": "길동"
  }'
```

### 2. 로그인 테스트
```bash
curl -X POST https://api.neture.co.kr/store/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### 3. 데이터베이스 확인
```sql
-- Common-Core users 테이블 확인
SELECT id, email, role, customer_id FROM users;

-- Medusa customer 테이블 확인
SELECT id, email, metadata FROM customer;
```

## 🎯 성공 지표

- [ ] Common-Core와 Medusa 양쪽에 사용자 데이터 생성
- [ ] JWT 토큰에 userId와 customerId 모두 포함
- [ ] 프론트엔드에서 통합 인증 API 정상 호출
- [ ] 기존 Medusa 기능들과 충돌 없음
- [ ] 역할 기반 접근 제어 정상 동작

---

**이 작업을 통해 기존 운영 중인 Medusa 시스템을 중단하지 않고 Common-Core 인증을 통합할 수 있습니다.**