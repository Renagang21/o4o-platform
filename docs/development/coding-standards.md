# 🚀 O4O Platform 개발 가이드

> **핵심 개발 정보 통합본** - 이 파일만 읽으면 바로 개발 가능

---

## ⚡ **빠른 시작 (30초)**

```bash
# 1. 개발 서버 시작
npm run dev:all

# 2. 접속 확인
http://localhost:3000  # React 웹
http://localhost:4000  # Express API
```

---

## 🛠️ **개발 환경 요구사항**

### **필수 설치**
- **Node.js**: 20.19.3 (현재 설치됨 ✅)
- **PostgreSQL**: 16.9 (현재 설치됨 ✅)
- **npm**: 10.8.2 (현재 설치됨 ✅)

### **프로젝트 방침**
- ❌ **Docker 사용 안 함** (AWS Lightsail 환경 고려)
- ✅ **WSL Ubuntu + 직접 설치** 방식
- ✅ **TypeScript 100%** 적용
- ✅ **PM2** 프로세스 관리

---

## 📂 **프로젝트 구조**

```
o4o-platform/
├── services/
│   ├── api-server/          # 백엔드 (Express + TypeORM)
│   ├── main-site/           # 프론트엔드 (React + Vite)
│   └── ecommerce/           # 별도 React 앱들
├── scripts/                 # 자동화 스크립트
├── docs/                    # 문서 (이 파일만 보면 됨)
└── CLAUDE.md               # Claude Code 세션용
```

---

## 🔧 **핵심 개발 명령어**

### **서비스 시작**
```bash
npm run dev:all        # 모든 서비스 (권장)
npm run dev:api        # API 서버만
npm run dev:web        # React 앱만
```

### **데이터베이스**
```bash
# PostgreSQL 관리
sudo systemctl start postgresql
sudo systemctl status postgresql

# TypeORM 마이그레이션
cd services/api-server
npm run migration:run
npm run migration:revert
```

### **코드 품질**
```bash
npm run type-check:all  # TypeScript 검사
npm run lint:all        # ESLint 검사
npm run lint:fix        # 자동 수정
```

---

## 🗄️ **데이터베이스 설정**

### **현재 상태**
```bash
PostgreSQL: 16.9 실행 중 ✅
포트: 5432 ✅
데이터베이스: o4o_platform (생성 필요)
```

### **연결 정보**
```bash
# .env 파일 (services/api-server/.env)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=o4o_platform
```

### **데이터베이스 생성**
```sql
sudo -u postgres psql
CREATE DATABASE o4o_platform;
\q
```

---

## 🛍️ **구현된 기능들**

### **백엔드 API (100% 완료)**
```
✅ 인증: 회원가입, 로그인, 프로필 (4개)
✅ 상품: CRUD, 필터링, 추천 (6개)  
✅ 장바구니: 추가, 수정, 삭제 (4개)
✅ 주문: 생성, 조회, 취소 (3개)
```

### **데이터 엔티티 (9개 완료)**
```
✅ User, Product, Category
✅ Cart, CartItem  
✅ Order, OrderItem
✅ CustomPost, CustomPostType
```

### **핵심 기능**
```
✅ 역할별 차등가격 (고객/사업자/제휴)
✅ 실시간 재고관리
✅ ACID 트랜잭션 보장
✅ JWT 인증 시스템
```

---

## 🚨 **현재 상황 (Phase 2)**

### **완료됨**
- ✅ Node.js 20 업그레이드
- ✅ PostgreSQL 16 설치  
- ✅ TypeScript 오류 수정
- ✅ 개발 서버 실행 확인

### **진행 중**
- ⏳ PostgreSQL 데이터베이스 생성
- ⏳ TypeORM 연결 활성화
- ⏳ 마이그레이션 실행

### **다음 단계**
- 🎯 프론트엔드 API 연동
- 🎯 전체 기능 통합 테스트

---

## 🔍 **문제 해결**

### **자주 발생하는 문제**
```bash
# 포트 충돌
sudo lsof -i :3000
sudo lsof -i :4000

# PostgreSQL 재시작
sudo systemctl restart postgresql

# 의존성 재설치
npm install && cd services/api-server && npm install
```

### **TypeScript 오류**
```bash
# 타입 검사
npm run type-check

# 컴파일 문제 시
rm -rf node_modules && npm install
```

---

## 🌐 **배포 정보**

### **개발 환경**
```
웹: http://localhost:3000
API: http://localhost:4000
DB:  localhost:5432
```

### **프로덕션 환경**
```
도메인: neture.co.kr
인프라: AWS Lightsail
배포: GitHub Actions (자동)
```

---

## 💡 **개발 팁**

### **빠른 테스트**
```bash
# API 헬스체크
curl http://localhost:4000/api/health

# 웹 서버 확인
curl http://localhost:3000
```

### **코드 스타일**
- TypeScript strict 모드 사용
- ESLint + Prettier 적용
- RESTful API 원칙 준수
- ACID 트랜잭션 필수

---

## 📞 **도움이 필요할 때**

1. **이 파일** 다시 읽기 (90% 해결)
2. **CLAUDE.md** 파일 확인 (Claude Code용)
3. **GitHub Issues** 생성

---

**🎯 목표: 이 파일만 보고도 바로 개발할 수 있도록!**