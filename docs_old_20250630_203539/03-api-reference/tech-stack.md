# 기술 스택 & 버전 정보

## 📚 현재 사용 중인 기술 스택 (2024-06-18 기준)

### 🎨 프론트엔드
- **React**: ^18.2.0 - UI 라이브러리
- **TypeScript**: ^5.0.0 - 타입 안전성
- **Tailwind CSS**: ^3.3.0 - 스타일링
- **TipTap**: ^2.0.0 - 리치 텍스트 에디터

### ⚙️ 백엔드  
- **Express**: ^4.18.0 - Node.js 웹 프레임워크
- **TypeScript**: ^5.0.0 - 타입 안전성
- **TypeORM**: ^0.3.0 - ORM

### 🗄️ 데이터베이스 & 캐시
- **PostgreSQL**: 14+ - 메인 데이터베이스
- **Redis**: 7+ - 캐시 & 세션 저장소

### 🧪 테스트
- **Jest**: ^29.0.0 - 유닛 테스트
- **Playwright**: ^1.30.0 - E2E 테스트  
- **Supertest**: ^6.3.0 - API 테스트

### 🚀 배포 & 자동화
- **PM2**: ^5.3.0 - 프로세스 매니저
- **Docker**: 24+ - 컨테이너화
- **GitHub Actions**: (예정) - CI/CD

### 🤖 AI & 자동화
- **Cursor**: IDE with AI assistance
- **Claude**: AI assistant
- **MCP**: Model Context Protocol

## 🔄 버전 업데이트 히스토리

### 2024-06-18
- Medusa 최신 버전으로 업데이트 (설정 마이그레이션 필요)
- TipTap v2.0 적용
- TypeScript 5.0 업그레이드

### 예정된 업데이트
- GitHub Actions CI/CD 구축
- Docker 컨테이너 환경 완성
- PostgreSQL 15 업그레이드

## ⚠️ 알려진 버전 이슈

### Medusa 버전 불일치
- **문제**: 설치된 버전과 문서/설정 버전 불일치
- **해결**: [troubleshooting.md](../02-operations/troubleshooting.md#medusa-버전-불일치-문제) 참조

### Node.js 호환성
- **필수**: Node.js 18.x 이상
- **권장**: Node.js 20.x LTS
- **확인**: `node --version`

## 📦 주요 패키지 의존성

### 프로덕션 의존성
```json
{
  "react": "^18.2.0",
  "express": "^4.18.0", 
  "typescript": "^5.0.0",
  "typeorm": "^0.3.0",
  "redis": "^4.6.0",
  "jsonwebtoken": "^9.0.0"
}
```

### 개발 의존성
```json
{
  "jest": "^29.0.0",
  "playwright": "^1.30.0",
  "eslint": "^8.0.0",
  "prettier": "^2.8.0",
  "concurrently": "^7.6.0"
}
```

## 🔧 버전 관리 명령어

```bash
# 현재 버전 확인
npm list --depth=0

# 특정 패키지 버전 확인  
npm list react typescript express

# 업데이트 가능한 패키지 확인
npm outdated

# 안전한 업데이트 (minor/patch만)
npm update

# 메이저 버전 업그레이드 (주의!)
npm install package@latest
```

## 📋 기술 선택 이유

### React 선택 이유
- 컴포넌트 재사용성
- 큰 생태계와 커뮤니티
- TypeScript 지원 우수

### Express 선택 이유  
- 가벼움과 유연성
- 미들웨어 생태계 풍부
- TypeScript 호환성

### PostgreSQL 선택 이유
- ACID 트랜잭션 지원
- JSON 데이터 타입 지원
- 확장성과 성능

---

**마지막 업데이트**: 2024-06-18  
**다음 리뷰**: 라이브러리 업그레이드 시 또는 월 1회