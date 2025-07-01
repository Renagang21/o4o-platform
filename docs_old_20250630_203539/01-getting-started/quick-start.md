# ⚡ 5분 퀵스타트 가이드

> **목표**: 5분 내에 O4O Platform 개발환경 구축 및 실행

신규 개발자가 **즉시 개발을 시작**할 수 있도록 최적화된 가이드입니다.

---

## 🎯 **시작하기 전 체크리스트**

### **⚠️ 중요: 버전 확인 필수**
**AI 코딩 전 반드시 [버전 관리 가이드](../00-version-management/current-versions.md)를 확인하세요!**

- **Node.js**: 현재 설치 `22.16.0` → 요구사항 `20.18.0` ⚠️
- **정확한 버전**: React 19.1.0, TypeScript 5.8.3, Tailwind CSS 4.1.7

### **필수 요구사항**
- ✅ **Node.js 20.18.0** (⚠️ 현재 22.16.0 → 수정 필요!)
- ✅ **npm 9+** (현재: 10.9.2 ✅) 
- ✅ **Git**
- ✅ **VS Code** 또는 **Cursor** (권장)

### **📱 운영체제별 설치**
```bash
# Windows (Chocolatey)
choco install nodejs git

# macOS (Homebrew)  
brew install node git

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

---

## ⚡ **5분 설정 (복사-붙여넣기로 완료)**

### **1단계: Node.js 버전 맞추기 (1분)**
```bash
# ⚠️ 중요: 현재 Node.js 22.16.0 → 20.18.0으로 변경 필요
# NVM 사용 (권장)
nvm install 20.18.0
nvm use 20.18.0

# 확인
node --version  # v20.18.0이어야 함
npm --version   # 10.9.2여야 함
```

### **2단계: 저장소 클론 (30초)**
```bash
git clone https://github.com/Renagang21/o4o-platform.git
cd o4o-platform
```

### **3단계: 전체 의존성 설치 (2분)**
```bash
# 루트 + 모든 서비스 의존성 한번에 설치
npm run install:all
```

### **4단계: 환경 설정 (1분)**
```bash
# API 서버 환경 설정
cd services/api-server
cp .env.example .env

# 기본 설정으로 즉시 시작 가능 (PostgreSQL 연결은 선택사항)
echo "DATABASE_URL=postgresql://username:password@localhost:5432/o4o_platform" >> .env
echo "JWT_SECRET=your-super-secret-jwt-key-here" >> .env
echo "PORT=4000" >> .env

cd ../..
```

### **5단계: 개발 서버 시작 (30초)**
```bash
# 모든 서비스 동시 시작 (API + React)
npm run dev:all
```

### **6단계: 접속 확인 (30초)**
- 🎨 **React 앱**: http://localhost:5173
- 🔗 **API 서버**: http://localhost:4000
- 💊 **Health Check**: http://localhost:4000/api/health

---

## ✅ **성공 확인**

### **📊 터미널 출력 확인**
```bash
✅ API Server running on http://localhost:4000
✅ React App running on http://localhost:5173
✅ TypeScript compilation: success
✅ Both services ready!
```

### **🌐 브라우저 테스트**

1. **React 앱** (http://localhost:3000) 
   - O4O Platform 홈페이지 표시
   - React 19 + Vite 빌드 시스템

2. **API 헬스체크** (http://localhost:4000/api/health)
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-06-25T...",
     "services": {
       "database": "pending", // PostgreSQL 연결 전까지 pending
       "api": "running"
     }
   }
   ```

---

## 🚀 **즉시 개발 시작**

### **💻 백엔드 개발**
```bash
# API 서버만 실행
npm run dev:api

# TypeScript 컴파일 체크
npm run type-check

# 코드 스타일 체크  
npm run lint
```

### **🎨 프론트엔드 개발**
```bash
# React 앱만 실행
npm run dev:web

# 컴포넌트 자동 생성 (Cursor 전용)
npm run cursor:generate-component
```

### **📱 풀스택 개발**
```bash
# 모든 서비스 동시 개발
npm run dev:all

# 스마트 개발 시작 (자동 감지)
npm run dev:smart
```

---

## 📂 **프로젝트 구조 이해 (30초)**

```
o4o-platform/
├── 🔗 services/api-server/     # Express + TypeScript API
├── 🎨 services/main-site/      # React 19 + Vite 앱  
├── 🛍️ services/ecommerce/      # E-commerce 특화 서비스
├── 📚 docs/                    # 모든 문서 (지금 보고 있는 곳)
└── 🧪 tests/                   # 통합 테스트
```

### **🎯 핵심 파일 위치**
- **API 엔드포인트**: `services/api-server/src/routes/`
- **React 컴포넌트**: `services/main-site/src/components/`
- **비즈니스 로직**: `services/api-server/src/controllers/`
- **데이터 모델**: `services/api-server/src/entities/`

---

## 🐛 **즉석 문제 해결**

### **🔧 일반적인 문제**

#### **포트 충돌**
```bash
# 다른 서비스에서 포트 사용 중
lsof -i :3000 :4000
kill -9 <PID>

# 또는 포트 변경
export PORT=3001  # React 앱
export API_PORT=4001  # API 서버
```

#### **Node.js 버전 문제**
```bash
# 현재 버전 확인
node --version  # 20.x.x여야 함

# nvm으로 버전 관리 (권장)
nvm install 20.18.0
nvm use 20.18.0
```

#### **의존성 설치 실패**
```bash
# 캐시 정리 후 재설치
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## 🎯 **다음 단계**

### **✅ 5분 완료 후 할 일**

1. **📖 상세 가이드 읽기**
   - [개발환경 상세 설정](development-setup.md)
   - [API 문서 살펴보기](../03-api-reference/ecommerce-api-specification.md)

2. **🛍️ E-commerce API 테스트**
   ```bash
   # 상품 목록 조회
   curl http://localhost:4000/api/ecommerce/products
   
   # 헬스체크
   curl http://localhost:4000/api/health
   ```

3. **🗄️ 데이터베이스 연결** (선택사항)
   - [PostgreSQL 설정 가이드](../06-operations/postgresql-setup.md)
   - 로컬 개발은 DB 없이도 API 서버 실행 가능

4. **🤝 팀 개발 준비**
   - [Git 워크플로우](../04-development/git-workflow.md)
   - [코딩 표준](../04-development/coding-standards.md)

---

## 💡 **개발 팁**

### **⚡ 효율적인 개발 환경**
```bash
# 자동 재시작 + 타입 체크
npm run dev:all  # 권장

# 개별 서비스 개발
npm run dev:api   # 백엔드만
npm run dev:web   # 프론트엔드만
```

### **🔍 실시간 로그 확인**
```bash
# API 서버 로그
tail -f services/api-server/logs/app.log

# 개발 서버에서 실시간 확인
# Console에서 실시간 TypeScript 컴파일 상태 표시
```

### **📊 성능 모니터링**
- **React DevTools**: Chrome 확장프로그램
- **Network 탭**: API 호출 모니터링  
- **Console**: 에러 및 로그 확인

---

## 🏆 **축하합니다!**

**🎉 5분 만에 O4O Platform 개발환경 구축 완료!**

### **✅ 달성한 것들**
- ✅ 전체 프로젝트 클론 및 설정
- ✅ API 서버 (Express + TypeScript) 실행
- ✅ React 앱 (React 19 + Vite) 실행
- ✅ 개발 환경 완전 구축

### **🚀 지금 할 수 있는 것들**
- 🔗 **14개 API 엔드포인트** 테스트
- 🎨 **React 컴포넌트** 개발
- 💻 **TypeScript** 코드 작성
- 🛍️ **E-commerce 기능** 개발

---

<div align="center">

**🎯 목표 달성: 5분 내 개발 시작! 🎯**

[📖 상세 가이드](development-setup.md) • [🛍️ API 테스트](../03-api-reference/ecommerce-api-specification.md) • [🆘 문제 해결](troubleshooting.md)

**개발 준비 완료! 이제 코딩을 시작하세요! 💻✨**

</div>
