# 🗄️ PostgreSQL 설정 가이드 (실제 환경 기준)

> **업데이트**: 2025-06-24  
> **상태**: Docker 없이 직접 설치 방식으로 수정  
> **환경**: WSL Ubuntu + Node.js 20 + PostgreSQL 16

---

## 📋 **현재 환경 정보**

### **✅ 완료된 사항**
- Node.js 20.19.3 설치 완료
- PostgreSQL 16 직접 설치 완료
- TypeORM 엔티티 9개 구현 완료
- 프로젝트 방침: **Docker 사용 안 함**

### **🔧 실제 환경 설정**
```bash
# 개발 환경
- 웹 서버: localhost:3000 (Vite)
- API 서버: localhost:4000 (Express)
- PostgreSQL: localhost:5432 (직접 설치)
- Node.js: 20.19.3
- PostgreSQL: 16.9
```

---

## 🚀 **PostgreSQL 설정 단계**

### **1단계: PostgreSQL 설치 (Docker 없이)**
```bash
# Ubuntu 패키지 업데이트
sudo apt update

# PostgreSQL 16 설치
sudo apt install -y postgresql postgresql-contrib

# 서비스 시작 및 자동 시작 설정
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 설치 확인
systemctl status postgresql
```

### **2단계: 데이터베이스 및 사용자 생성**
```bash
# postgres 사용자로 전환
sudo -u postgres psql

# 데이터베이스 생성
CREATE DATABASE o4o_platform;

# 사용자 생성 (옵션)
CREATE USER o4o_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;

# 종료
\q
```

### **3단계: 환경 변수 설정**
```bash
# services/api-server/.env 파일 수정
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=o4o_platform
DATABASE_URL=postgresql://postgres:password@localhost:5432/o4o_platform
```

### **4단계: TypeORM 연결 테스트**
```bash
cd services/api-server

# 데이터베이스 연결 테스트
npm run db:test

# API 서버 시작
npm run dev
```

---

## 🔍 **연결 확인 방법**

### **PostgreSQL 직접 연결**
```bash
# PostgreSQL 연결 테스트
sudo -u postgres psql -d o4o_platform

# 테이블 확인
\dt

# 연결 정보 확인
\conninfo
```

### **API 서버 헬스체크**
```bash
# API 서버 상태 확인
curl http://localhost:4000/api/health

# 예상 응답
{
  "status": "ok",
  "timestamp": "2025-06-24T...",
  "service": "api-server"
}
```

---

## ⚠️ **중요한 변경 사항**

### **❌ 이전 방식 (Docker)**
```bash
# 사용하지 않음
docker-compose -f docker-compose.dev.yml up -d postgres
```

### **✅ 새로운 방식 (직접 설치)**
```bash
# PostgreSQL 직접 관리
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### **프로젝트 방침**
- Docker 사용 안 함 (AWS Lightsail 환경 고려)
- WSL Ubuntu + 직접 설치 방식
- PM2로 프로세스 관리

---

## 🛠️ **문제 해결**

### **일반적인 문제들**
```bash
# PostgreSQL 상태 확인
systemctl status postgresql

# 포트 확인
ss -tlpn | grep :5432

# 로그 확인
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### **권한 문제**
```bash
# PostgreSQL 사용자 권한 설정
sudo -u postgres createuser --interactive

# 데이터베이스 소유권 변경
sudo -u postgres psql -c "ALTER DATABASE o4o_platform OWNER TO o4o_user;"
```

---

## 📊 **현재 구현 상태**

### **✅ 완료된 백엔드 API (14개 엔드포인트)**
- 인증 시스템 (4개): 회원가입, 로그인, 프로필
- 상품 관리 (6개): CRUD, 추천상품
- 장바구니 (4개): 추가, 수정, 삭제, 조회

### **✅ 완료된 데이터 엔티티 (9개)**
- User, Product, Category
- Cart, CartItem
- Order, OrderItem
- CustomPost, CustomPostType

### **⏳ 다음 단계**
1. PostgreSQL 연결 활성화
2. 마이그레이션 실행
3. 실제 데이터베이스 연동 테스트
4. 프론트엔드 API 통합

---

**📅 최종 업데이트**: 2025-06-24  
**🎯 목표**: Phase 2 완료 - 실제 데이터베이스 연동