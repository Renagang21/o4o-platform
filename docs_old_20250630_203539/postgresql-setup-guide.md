# 🗄️ O4O Platform PostgreSQL 연결 가이드

## 📋 Phase 2 시작: 데이터베이스 연결

O4O Platform의 모든 백엔드 API와 엔티티가 완성되었습니다. 이제 실제 PostgreSQL 데이터베이스와 연결하여 API를 테스트해보겠습니다.

## 🎯 완성된 구성 요소

### ✅ 백엔드 API (완료)
- **14개 REST API 엔드포인트** 구현 완료
- **9개 TypeORM 엔티티** 설계 완료
- **역할별 차등가격 시스템** 구현 완료
- **재고 관리 및 트랜잭션** 보장 완료

### ✅ 데이터베이스 설정 (완료)
- **TypeORM 연결 설정** 업데이트 완료
- **PostgreSQL 초기화 스크립트** 생성 완료
- **Docker Compose 환경** 준비 완료

## 🚀 PostgreSQL 연결 시작하기

### 1단계: 환경 설정

```bash
# 1. 개발 환경 변수 복사
cp .env.dev .env

# 2. 필요한 경우 .env 파일 수정
# (기본 설정으로도 충분히 작동합니다)
```

### 2단계: PostgreSQL 시작

```bash
# Docker Compose로 PostgreSQL 및 Redis 시작
docker-compose -f docker-compose.dev.yml up -d postgres redis

# 실행 확인
docker ps
```

예상 출력:
```
CONTAINER ID   IMAGE              PORTS                    NAMES
abc123def456   postgres:15-alpine 0.0.0.0:5432->5432/tcp   o4o-postgres-dev
def456ghi789   redis:7-alpine     0.0.0.0:6379->6379/tcp   o4o-redis-dev
```

### 3단계: 데이터베이스 연결 테스트

```bash
# 연결 테스트 스크립트 실행
node scripts/test-database.js
```

성공 시 출력:
```
🧪 O4O Platform PostgreSQL 연결 테스트 시작

1️⃣ 데이터베이스 연결 테스트...
✅ PostgreSQL 연결 성공!

2️⃣ 등록된 엔티티 확인...
📋 등록된 엔티티: [User, Product, Category, Cart, CartItem, Order, OrderItem, CustomPost, CustomPostType]
📊 총 9개 엔티티 등록됨

3️⃣ 데이터베이스 테이블 상태 확인...
🗃️ 생성된 테이블:
   1. users
   2. products
   3. categories
   4. carts
   5. cart_items
   6. orders
   7. order_items
   8. custom_posts
   9. custom_post_types

🎉 모든 데이터베이스 테스트 성공!
```

### 4단계: API 서버 시작

```bash
# API 서버 개발 모드 시작
cd services/api-server
npm install
npm run dev
```

성공 시 출력:
```
🚀 Neture API Server running on port 3000
📱 Environment: development
🌐 API Base URL: http://localhost:3000/api
🎨 Frontend URL: http://localhost:5173
✅ PostgreSQL connected successfully
📋 Registered entities: [User, Product, Category, Cart, CartItem, Order, OrderItem, CustomPost, CustomPostType]
```

### 5단계: API 테스트

```bash
# 헬스체크
curl http://localhost:3000/api/health

# 상품 목록 조회 (빈 배열 반환 예상)
curl http://localhost:3000/api/ecommerce/products
```

## 🛠️ 문제 해결

### ❌ 연결 실패 시

**1. PostgreSQL 컨테이너 상태 확인**
```bash
docker logs o4o-postgres-dev
```

**2. 포트 충돌 확인**
```bash
netstat -an | grep :5432
# 또는
lsof -i :5432
```

**3. 환경변수 확인**
```bash
cat .env | grep DB_
```

**4. Docker 네트워크 확인**
```bash
docker network ls
docker network inspect o4o-platform-dev
```

### 🔧 일반적인 해결 방법

**데이터베이스 초기화**
```bash
# 모든 컨테이너 중지 및 볼륨 삭제
docker-compose -f docker-compose.dev.yml down -v

# 다시 시작
docker-compose -f docker-compose.dev.yml up -d
```

**의존성 재설치**
```bash
cd services/api-server
rm -rf node_modules package-lock.json
npm install
```

## 📊 다음 단계

PostgreSQL 연결이 성공하면:

1. **🧪 실제 데이터 테스트**
   - 사용자 등록 API 테스트
   - 상품 등록 및 관리 테스트
   - 주문 처리 플로우 테스트

2. **🎨 프론트엔드 연동**
   - React 앱에서 API 호출
   - UI 컴포넌트와 백엔드 연결

3. **💳 결제 시스템 통합**
   - 실제 결제 게이트웨이 연동

## 🎯 핵심 API 엔드포인트

연결 완료 후 사용 가능한 주요 API:

### 🛍️ Ecommerce API
```
GET    /api/ecommerce/products          # 상품 목록
POST   /api/ecommerce/products          # 상품 등록
GET    /api/ecommerce/products/:id      # 상품 상세
POST   /api/ecommerce/cart/add          # 장바구니 추가
GET    /api/ecommerce/cart              # 장바구니 조회
POST   /api/ecommerce/orders            # 주문 생성
GET    /api/ecommerce/orders            # 주문 목록
```

### 👤 Auth API
```
POST   /api/auth/register               # 사용자 등록
POST   /api/auth/login                  # 로그인
POST   /api/auth/logout                 # 로그아웃
GET    /api/auth/profile                # 프로필 조회
```

## 🎉 축하합니다!

PostgreSQL 연결이 완료되면 O4O Platform의 핵심 백엔드가 완전히 작동하게 됩니다. 이제 실제 ecommerce 기능을 테스트하고 프론트엔드 개발을 시작할 수 있습니다!

---

📝 **문제 발생 시**: [GitHub Issues](https://github.com/Renagang21/o4o-platform/issues)에 보고해주세요.
📚 **전체 문서**: `docs/` 폴더의 상세 가이드를 참조하세요.
