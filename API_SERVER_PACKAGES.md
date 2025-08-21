# 🔌 API Server 패키지 분석 및 최적화 가이드

> **최종 업데이트**: 2025년 8월 21일  
> **NestJS**: 10.4.15 | **TypeORM**: 0.3.21 | **Node.js**: 22.18.0

## 📦 현재 패키지 구성

### 🎯 **핵심 의존성 (변경 어려움)**

| 패키지 | 현재 버전 | 최신 버전 | 역할 | 변경 난이도 |
|--------|-----------|-----------|------|------------|
| **@nestjs/core** | 10.4.15 | 10.4.15 | 프레임워크 코어 | ⚠️ 높음 |
| **@nestjs/typeorm** | 10.0.2 | 10.0.2 | ORM 통합 | ⚠️ 높음 |
| **typeorm** | 0.3.21 | 0.3.21 | ORM | ⚠️ 높음 |
| **pg** | 8.14.1 | 8.14.1 | PostgreSQL 드라이버 | ✅ 안정 |

### ✅ **쉽게 변경 가능한 패키지**

#### **인증/보안 관련**
| 패키지 | 현재 버전 | 대체 방안 | 이유 |
|--------|-----------|-----------|------|
| **bcrypt** | 6.0.0 | argon2 | 더 안전한 해싱 |
| **jsonwebtoken** | 9.0.2 | jose | 더 현대적인 JWT |
| **helmet** | 6.0.1 | 최신 버전 유지 | ✅ 안정 |
| **passport** | 0.7.0 | 최신 버전 유지 | ✅ 안정 |

#### **캐싱/세션**
| 패키지 | 현재 버전 | 대체 방안 | 이유 |
|--------|-----------|-----------|------|
| **ioredis** | 5.6.1 | 유지 | ✅ 최적 |
| **node-cache** | 5.1.2 | lru-cache로 통합 | 중복 제거 |
| **lru-cache** | 11.1.0 | 유지 | ✅ 최신 |
| **connect-redis** | 9.0.0 | 유지 | ✅ 최신 |

#### **파일 처리**
| 패키지 | 현재 버전 | 대체 방안 | 이유 |
|--------|-----------|-----------|------|
| **multer** | 2.0.1 | @nestjs/platform-express 내장 | 중복 제거 |
| **sharp** | 0.34.3 | 유지 | ✅ 이미지 처리 최적 |
| **exceljs** | 4.4.0 | 유지 | ✅ 엑셀 처리 |
| **adm-zip** | 0.5.16 | node-archiver | 더 현대적 |

#### **유틸리티**
| 패키지 | 현재 버전 | 대체 방안 | 이유 |
|--------|-----------|-----------|------|
| **uuid** | 11.1.0 | crypto.randomUUID() | Node.js 내장 |
| **slugify** | 1.6.6 | 유지 | ✅ 가벼움 |
| **node-cron** | 4.2.1 | @nestjs/schedule | NestJS 통합 |
| **nodemailer** | 7.0.5 | @nestjs-modules/mailer | NestJS 통합 |

### 🗑️ **제거 가능한 패키지**

| 패키지 | 이유 | 대체 방법 |
|--------|------|----------|
| **bcryptjs** | bcrypt와 중복 | bcrypt만 사용 |
| **node-fetch** | Node.js 18+ fetch 내장 | 내장 fetch 사용 |
| **express** | NestJS가 내부적으로 처리 | 제거 |
| **cors** | NestJS 내장 | app.enableCors() |
| **compression** | NestJS 내장 | 미들웨어로 처리 |
| **cookie-parser** | NestJS 내장 | 제거 |
| **express-validator** | class-validator로 대체 | 제거 |
| **tail** | 사용 안 함 | 제거 |
| **ua-parser-js** | 필요시 CDN | 제거 |

### ⚠️ **버전 충돌 패키지**

| 패키지 | 문제 | 해결 방안 |
|--------|------|----------|
| **vite** | 7.1.1 (최신 과도) | 5.4.19로 다운그레이드 |
| **@types/node** | 22.17.2 | 20.x로 다운그레이드 |
| **zod** | 4.0.17 (구버전) | 3.23.x 유지 또는 제거 |

## 🚀 최적화 후 package.json

```json
{
  "dependencies": {
    // NestJS 핵심 (유지)
    "@nestjs/core": "10.4.15",
    "@nestjs/common": "10.4.15",
    "@nestjs/platform-express": "10.4.15",
    "@nestjs/typeorm": "10.0.2",
    "@nestjs/swagger": "7.4.2",
    "@nestjs/schedule": "4.1.1",
    "@nestjs/jwt": "10.2.0",
    "@nestjs/passport": "10.0.3",
    "@nestjs/throttler": "6.2.1",
    
    // DB (유지)
    "typeorm": "0.3.21",
    "pg": "8.14.1",
    
    // 인증/보안 (개선)
    "argon2": "^0.31.0",  // bcrypt 대체
    "jose": "^5.0.0",     // jsonwebtoken 대체
    "helmet": "7.1.0",
    "passport": "0.7.0",
    "passport-google-oauth20": "2.0.0",
    "passport-kakao": "1.0.1",
    "passport-naver-v2": "2.0.8",
    
    // 캐싱/세션 (최적화)
    "ioredis": "5.6.1",
    "lru-cache": "11.1.0",
    "connect-redis": "9.0.0",
    
    // 파일 처리 (유지)
    "sharp": "0.34.3",
    "exceljs": "4.4.0",
    "json2csv": "6.0.0",
    
    // 유틸리티 (최적화)
    "class-transformer": "0.5.1",
    "class-validator": "0.14.2",
    "reflect-metadata": "0.1.13",
    "slugify": "1.6.6",
    "winston": "3.8.2",
    "socket.io": "4.8.3",
    "xml2js": "0.6.2"
  },
  
  "devDependencies": {
    "@nestjs/cli": "11.0.10",
    "@nestjs/testing": "10.4.15",
    "@types/node": "20.14.0",  // 다운그레이드
    "typescript": "5.9.2",
    "vite": "5.4.19",  // 다운그레이드
    "vitest": "3.2.4",
    "jest": "29.7.0",
    "supertest": "7.1.4"
  }
}
```

## 📉 최적화 효과

### **패키지 수 감소**
- 현재: 59개 dependencies
- 최적화 후: **42개** (-17개)

### **번들 크기 예상 감소**
- bcryptjs 제거: -50KB
- node-fetch 제거: -60KB  
- express 관련 제거: -200KB
- 중복 패키지 제거: -150KB
- **총 예상 감소**: ~460KB

### **보안 개선**
- bcrypt → argon2: 더 강력한 해싱
- jsonwebtoken → jose: 최신 JWT 표준

### **유지보수성 개선**
- NestJS 내장 기능 활용
- 중복 패키지 제거
- 버전 충돌 해결

## 🔧 마이그레이션 가이드

### **Phase 1: 즉시 가능** (1시간)
```bash
# 불필요한 패키지 제거
npm uninstall bcryptjs node-fetch express cors compression cookie-parser express-validator tail ua-parser-js

# 버전 조정
npm install vite@5.4.19 @types/node@20.14.0
```

### **Phase 2: 코드 수정 필요** (2-3시간)
```typescript
// bcrypt → argon2
import * as argon2 from 'argon2';
const hash = await argon2.hash(password);
const valid = await argon2.verify(hash, password);

// jsonwebtoken → jose
import * as jose from 'jose';
const jwt = await new jose.SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256' })
  .sign(secret);

// node-fetch → 내장 fetch
const response = await fetch(url);

// uuid → crypto
import { randomUUID } from 'crypto';
const id = randomUUID();
```

### **Phase 3: NestJS 통합** (3-4시간)
```typescript
// node-cron → @nestjs/schedule
@Cron('0 0 * * *')
async handleCron() { }

// nodemailer → @nestjs-modules/mailer
@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}
}
```

## ⚠️ 주의사항

### **테스트 필수 항목**
1. 인증/로그인 (argon2 마이그레이션)
2. JWT 토큰 생성/검증 (jose 마이그레이션)
3. 파일 업로드 (multer 제거)
4. 스케줄 작업 (cron 변경)
5. 이메일 발송 (mailer 변경)

### **롤백 계획**
- 각 Phase별 git 브랜치 생성
- 기존 package.json 백업
- 단계별 테스트 후 진행

## 📊 우선순위

### **P0 - 즉시 제거**
- bcryptjs, node-fetch, express 관련 패키지들

### **P1 - 버전 조정**  
- vite, @types/node

### **P2 - 점진적 마이그레이션**
- bcrypt → argon2
- jsonwebtoken → jose
- node-cron → @nestjs/schedule

### **P3 - 장기 개선**
- nodemailer → @nestjs-modules/mailer
- 추가 최적화

---

*API 서버는 패키지 변경이 비교적 쉬우므로 점진적으로 최적화할 수 있습니다.*
*각 단계별로 충분한 테스트 후 프로덕션 적용을 권장합니다.*