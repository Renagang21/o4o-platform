# 🌿 O4O Platform

통합형 디지털 운영 플랫폼 - 약국, 건강식품점, 로컬 식품점, 소형 리테일 숍을 위한 올인원 디지털 자동화 솔루션

## 🏗️ **Architecture**

```
o4o-platform/
├── services/
│   ├── main-site/          # React 메인 사이트 (neture.co.kr)
│   ├── api-server/         # Express.js API 서버 (PostgreSQL)
│   ├── ecommerce/          # 전자상거래 서비스 (예정)
│   ├── crowdfunding/       # 크라우드펀딩 서비스 (예정)
│   ├── forum/              # 커뮤니티 포럼 (예정)
│   └── signage/            # 디지털 사이니지 (예정)
├── docs/                   # 프로젝트 문서
└── scripts/                # 배포 및 관리 스크립트
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### **Installation**
```bash
# 전체 의존성 설치
npm run install:all

# PostgreSQL 데이터베이스 생성
createdb o4o_platform

# 환경변수 설정
cp .env.example .env
# .env 파일에서 DB 정보 수정

# 관리자 계정 생성
npm run create-admin
```

### **Development**
```bash
# 모든 서비스 동시 실행
npm run dev:all

# 개별 서비스 실행
npm run dev:api    # API 서버 (http://localhost:3000)
npm run dev:web    # 메인 사이트 (http://localhost:5173)
```

### **Production Build**
```bash
# 전체 빌드
npm run build:all

# 개별 빌드
npm run build:api
npm run build:web
```

## 🎯 **Services**

### **Main Site** (port 5173)
- React 18 + TypeScript
- Tailwind CSS + Framer Motion
- 사용자 인증 및 대시보드
- 서비스 허브

### **API Server** (port 3000)
- Express.js + TypeScript
- PostgreSQL + TypeORM
- JWT 인증
- REST API

### **Upcoming Services**
- **E-commerce**: 온라인 쇼핑몰 
- **Crowdfunding**: 프로젝트 펀딩
- **Forum**: 커뮤니티 및 전문가 네트워크
- **Signage**: 디지털 광고 시스템

## 🔧 **Tech Stack**

### **Frontend**
- React 18, TypeScript
- Vite, Tailwind CSS
- Framer Motion, React Router
- Axios, React Query

### **Backend**
- Node.js, Express.js
- TypeORM, PostgreSQL
- JWT, bcrypt
- Socket.io

### **DevOps**
- Docker, Docker Compose
- GitHub Actions
- AWS Lightsail

## 📊 **API Endpoints**

### **Authentication**
```
POST /api/auth/register     # 사용자 등록
POST /api/auth/login        # 로그인
GET  /api/auth/profile      # 프로필 조회
PUT  /api/auth/profile      # 프로필 수정
```

### **Admin**
```
GET  /api/admin/users              # 사용자 목록
GET  /api/admin/users/pending      # 승인 대기 목록
POST /api/admin/users/:id/approve  # 사용자 승인
POST /api/admin/users/:id/reject   # 사용자 거부
```

### **Services**
```
GET  /api/services/status   # 서비스 상태
GET  /api/services/ai       # AI 서비스 정보
GET  /api/services/rpa      # RPA 서비스 정보
```

## 🗃️ **Database Schema**

### **Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role user_role DEFAULT 'user',
  status user_status DEFAULT 'pending',
  business_info JSONB,
  last_login_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔐 **Security**

- JWT 기반 인증
- bcrypt 비밀번호 해싱
- Rate limiting
- CORS 설정
- Helmet.js 보안 헤더

## 📝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 **Support**

- 📧 Email: support@neture.co.kr
- 📞 Phone: 02-1234-5678
- 🌐 Website: https://neture.co.kr

---

**Made with ❤️ by O4O Platform Team**
