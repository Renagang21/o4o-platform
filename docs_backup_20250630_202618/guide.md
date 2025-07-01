# 📖 O4O Platform 개발 가이드

## 🎯 **개발 시작하기**

O4O Platform은 AI 기반 마이크로서비스 개발환경을 제공합니다. 이 가이드를 통해 빠르게 개발을 시작할 수 있습니다.

---

## 🚀 **빠른 시작 (Quick Start)**

### **📋 사전 요구사항**
- **Node.js** 22.16.0+ (LTS)
- **npm** 11.4.2+
- **PostgreSQL** 15+
- **Redis** (선택사항)
- **Cursor** 1.0+ (권장)

### **⚡ 1분 설정**
```bash
# 1. 저장소 클론
git clone https://github.com/Renagang21/o4o-platform.git
cd o4o-platform

# 2. 의존성 설치
npm run install:all

# 3. 환경변수 설정
cp .env.example .env
# .env 파일 편집 후

# 4. 개발 서버 시작
npm run dev:all
```

### **🌐 서비스 접속**
- **메인 사이트**: http://localhost:3000
- **API 서버**: http://localhost:4000
- **Swagger 문서**: http://localhost:4000/api-docs

---

## 🛠️ **개발 워크플로우**

### **🔄 일반적인 개발 과정**
1. **브랜치 생성**: `git checkout -b feature/기능명`
2. **환경 시작**: `npm run dev:all`
3. **코드 작성**: 해당 서비스 폴더에서 개발
4. **테스트**: `npm run test`
5. **빌드**: `npm run build:all`
6. **커밋**: `git commit -m "feat: 새 기능"`
7. **푸시**: `git push origin feature/기능명`
8. **Pull Request 생성**

### **🤖 AI 협업 워크플로우**
```bash
# 1. Cursor에서 컨텍스트 제공
# docs/next-chat-context.md 내용 복사

# 2. 환경 정보 명시
"현재 환경: Node.js 22.16.0, React 19, TypeScript 5.8.3"

# 3. 작업 요청
"최신 버전 기준으로 [컴포넌트/API] 개발해줘"

# 4. 코드 검증
npm run lint && npm run test
```

---

## 📁 **서비스별 개발 가이드**

### **🌍 Main-Site (React)**
```bash
# main-site 서비스 진입
cd services/main-site

# 개발 서버 시작
npm run dev

# 새 컴포넌트 생성
npm run generate:component -- ComponentName

# 빌드
npm run build
```

### **⚙️ API-Server (Express)**
```bash
# api-server 서비스 진입  
cd services/api-server

# 개발 서버 시작
npm run dev

# 새 엔드포인트 생성
npm run generate:endpoint -- users

# 마이그레이션 실행
npm run migration:run

# 빌드
npm run build
```

### **💰 Crowdfunding Service**
```bash
cd services/crowdfunding
npm run dev
# 포트: 4001
```

### **🛍️ Ecommerce Service**
```bash
cd services/ecommerce
npm run dev
# 포트: 4002
```

### **💬 Forum Service**
```bash
cd services/forum
npm run dev
# 포트: 4003
```

### **📺 Signage Service**
```bash
cd services/signage
npm run dev
# 포트: 4004
```

---

## 🎨 **코딩 패턴 및 표준**

### **📐 TypeScript 패턴**
```typescript
// ✅ 권장: 명시적 타입 정의
interface User {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'creator';
  createdAt: Date;
}

// ✅ 권장: Generic 활용
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// ❌ 비권장: any 타입 사용
function processData(data: any): any {
  return data;
}
```

### **⚛️ React 컴포넌트 패턴**
```typescript
// ✅ 권장: Function Component + TypeScript
interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

const MyComponent: React.FC<Props> = ({ title, onSubmit }) => {
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="p-4">
      <h1>{title}</h1>
      {/* 컴포넌트 내용 */}
    </div>
  );
};

export default MyComponent;
```

### **🔌 API 엔드포인트 패턴**
```typescript
// ✅ 권장: 구조화된 Controller
export class UserController {
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await this.userService.findAll();
      res.json({
        success: true,
        data: users,
        message: 'Users fetched successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message
        }
      });
    }
  }
}
```

### **🗄️ 데이터베이스 엔티티 패턴**
```typescript
// ✅ 권장: TypeORM 엔티티
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'user', 'creator'],
    default: 'user'
  })
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 🏗️ **빌드 및 배포**

### **🔨 로컬 빌드**
```bash
# 전체 빌드
npm run build:all

# 서비스별 빌드
npm run build:api    # API 서버
npm run build:web    # 웹 사이트

# 빌드 결과 확인
ls services/*/dist
```

### **🐳 Docker 빌드**
```bash
# 개발용 빌드
docker-compose -f docker-compose.dev.yml up --build

# 프로덕션 빌드
docker-compose -f docker-compose.production.yml up --build

# 개별 서비스 빌드
docker build -t o4o-api ./services/api-server
docker build -t o4o-web ./services/main-site
```

### **🚀 배포 과정**
```bash
# 1. 테스트 실행
npm run test:all

# 2. 빌드
npm run build:all

# 3. 스테이징 배포
npm run deploy:staging

# 4. 프로덕션 배포 (승인 후)
npm run deploy:production
```

### **📊 배포 확인**
```bash
# 헬스체크
curl http://localhost:4000/health

# 서비스 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f api-server
docker-compose logs -f main-site
```

---

## 🧪 **테스트 가이드**

### **🎯 테스트 전략**
- **단위 테스트**: 70% 커버리지 목표
- **통합 테스트**: API 엔드포인트 전체
- **E2E 테스트**: 핵심 사용자 플로우
- **성능 테스트**: 응답시간 100ms 이하

### **🔬 테스트 실행**
```bash
# 전체 테스트
npm run test

# 단위 테스트
npm run test:unit

# 통합 테스트
npm run test:integration

# E2E 테스트
npm run test:e2e

# 커버리지 리포트
npm run test:coverage
```

### **📝 테스트 작성 패턴**
```typescript
// 단위 테스트 예시
describe('UserService', () => {
  let userService: UserService;
  let userRepository: MockRepository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService, mockRepository(User)]
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should create a user', async () => {
    const userData = { email: 'test@example.com' };
    const expectedUser = { id: '1', ...userData };
    
    userRepository.save.mockResolvedValue(expectedUser);
    
    const result = await userService.create(userData);
    
    expect(result).toEqual(expectedUser);
    expect(userRepository.save).toHaveBeenCalledWith(userData);
  });
});
```

---

## 🐛 **문제 해결 (Troubleshooting)**

### **🚨 일반적인 문제**

#### **포트 충돌 문제**
```bash
# 포트 사용 중인 프로세스 확인
lsof -i :3000
lsof -i :4000

# 프로세스 종료
kill -9 [PID]

# 또는 다른 포트 사용
PORT=3001 npm run dev:web
```

#### **npm 설치 실패**
```bash
# 캐시 정리 후 재설치
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# 권한 문제 (Mac/Linux)
sudo chown -R $(whoami) ~/.npm
```

#### **데이터베이스 연결 실패**
```bash
# PostgreSQL 상태 확인
pg_isready -h localhost -p 5432

# 연결 정보 확인
psql -h localhost -U postgres -d o4o_platform

# Docker로 PostgreSQL 시작
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
```

#### **TypeScript 컴파일 에러**
```bash
# 타입 정의 재설치
npm install @types/node @types/express --save-dev

# TypeScript 버전 확인
npx tsc --version

# 설정 파일 검증
npx tsc --noEmit
```

### **🔧 환경별 해결책**

#### **Windows 환경**
```powershell
# PATH 문제 해결
$env:PATH += ";C:\Program Files\nodejs\"

# PowerShell 권한 설정
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 줄바꿈 문제 해결
git config --global core.autocrlf false
```

#### **Mac/Linux 환경**
```bash
# Node.js 버전 관리
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22.16.0
nvm use 22.16.0

# 권한 문제 해결
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### **🤖 AI 협업 문제**

#### **Cursor 설정 문제**
```bash
# MCP 서버 재설정
npm run setup:mcp

# Cursor 상태 확인
npm run cursor:health-check

# 설정 동기화
npm run cursor:sync-team
```

#### **버전 불일치 문제**
- **[AI 버전 관리 가이드](ai-collaboration/version-management-guide.md)** 참조
- 최신 버전 정보를 AI에게 명시적으로 제공
- "최신 버전 기준으로" 명시하여 요청

---

## 📈 **성능 최적화**

### **⚡ 프론트엔드 최적화**
```bash
# 번들 분석
npm run analyze

# 코드 스플리팅 적용
# React.lazy() 활용

# 이미지 최적화
# WebP, AVIF 형식 사용
```

### **🔧 백엔드 최적화**
```bash
# 데이터베이스 쿼리 최적화
# TypeORM 쿼리 빌더 활용

# 캐싱 적용
# Redis 캐시 레이어

# 커넥션 풀 최적화
# PostgreSQL 연결 풀 설정
```

---

## 📚 **추가 리소스**

### **📖 참고 문서**
- [프로젝트 개요](overview.md)
- [아키텍처 상세](architecture.md)
- [AI 협업 가이드](ai-collaboration/)
- [UI/UX 설계 가이드](development-guide/) (서비스별)

### **🛠️ 유용한 도구**
- **Cursor IDE**: AI 통합 개발환경
- **Postman**: API 테스트
- **pgAdmin**: PostgreSQL 관리
- **Redis Commander**: Redis 관리
- **Docker Desktop**: 컨테이너 관리

### **📞 커뮤니티 & 지원**
- **GitHub Issues**: 버그 리포트 및 기능 요청
- **GitHub Discussions**: 개발 관련 토론
- **Team Chat**: 실시간 협업

---

## 🎉 **성공적인 개발을 위한 팁**

### **💡 개발 생산성 향상**
1. **AI 협업 활용**: Cursor Background Agent 적극 활용
2. **타입 안전성**: TypeScript strict 모드 유지
3. **코드 품질**: ESLint + Prettier 자동 적용
4. **테스트 작성**: TDD 방식 권장
5. **문서 업데이트**: 코드 변경 시 문서 동시 업데이트

### **🚀 배포 안정성**
1. **점진적 배포**: 스테이징 → 프로덕션
2. **자동화된 테스트**: CI/CD 파이프라인 활용
3. **모니터링**: 실시간 헬스체크
4. **롤백 준비**: 신속한 이전 버전 복구

### **🤝 팀 협업**
1. **일관된 코딩 스타일**: 팀 표준 준수
2. **명확한 커밋 메시지**: Conventional Commits
3. **적극적인 코드 리뷰**: 품질 및 지식 공유
4. **문서화 습관**: 개발과 동시에 문서 갱신

---

**🚀 O4O Platform과 함께 차세대 마이크로서비스를 개발하세요!**

---

**📅 마지막 업데이트**: 2025-06-19  
**🏆 상태**: 개발환경 완료, 활발한 개발 진행 중  
**🎯 다음 단계**: 서비스별 기능 구현 완성
