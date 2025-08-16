# O4O Platform 개발 버그 예방 가이드

## 🚨 반드시 지켜야 할 핵심 원칙

### 1. **의존성 관리가 최우선**
```bash
# 개발 시작 전 항상 실행
npm run clean
npm install
npm run build:packages  # 반드시 먼저!
```

### 2. **빌드 순서 절대 준수**
```
types → utils → ui → auth-client → auth-context → apps
```

### 3. **TypeScript 엄격 모드**
- `any` 사용 금지 → `unknown` 사용
- 모든 입력값 검증
- Type Guard 구현 필수

## 📋 개발 시작 전 체크리스트

```bash
□ Node.js 버전 확인 (20.x)
□ npm run clean 실행
□ npm install 실행
□ npm run build:packages 실행
□ npm run type-check 통과
□ npm run lint 통과
□ .env 파일 설정 확인
```

## 🐛 자주 발생하는 버그와 해결법

### 1. **Module Not Found 에러**
```typescript
// ❌ 잘못된 방법
import { User } from '../../../packages/types'

// ✅ 올바른 방법
import { User } from '@o4o/types'

// package.json에 명시적 선언 필수
"dependencies": {
  "@o4o/types": "file:../../packages/types"
}
```

### 2. **Query Parameter 타입 에러**
```typescript
// ❌ 잘못된 방법
const { limit = 20 } = req.query as { limit?: number };

// ✅ 올바른 방법
const { limit = '20' } = req.query as { limit?: string };
const limitNum = parseInt(limit) || 20;
```

### 3. **Undefined/Null 참조 에러**
```typescript
// ❌ 잘못된 방법
const userName = user.profile.name;

// ✅ 올바른 방법
const userName = user?.profile?.name || 'Unknown';
```

### 4. **순환 참조 에러**
```typescript
// ❌ 잘못된 방법
// User.ts
import { Order } from './Order';

// Order.ts  
import { User } from './User';

// ✅ 올바른 방법
// 인터페이스 분리 또는 타입만 import
import type { User } from './User';
```

## 🛠 개발 워크플로우

### 1. **기능 개발 시작**
```bash
# 1. 브랜치 생성
git checkout -b feature/새기능

# 2. 클린 설치
npm run clean && npm install

# 3. 패키지 빌드 (필수!)
npm run build:packages

# 4. 개발 서버 실행
npm run dev
```

### 2. **커밋 전 검증**
```bash
# 반드시 실행할 명령어들
npm run type-check    # 타입 에러 확인
npm run lint         # 코드 스타일 확인
npm run test         # 테스트 실행
npm run build        # 빌드 확인
```

### 3. **문제 발생 시**
```bash
# 1. 브라우저 콘솔 확인 (가장 중요!)
# 2. API 상태 확인
curl http://localhost:4000/health

# 3. 의존성 확인
npm ls @o4o/types

# 4. 전체 재빌드
npm run clean && npm run install:all
```

## ⚡ 빠른 문제 해결

### 하얀 화면 (White Screen)
```bash
# 1. 브라우저 콘솔 확인
# 2. 다음 명령어 실행
npm run clean
npm install
npm run build:packages
npm run dev
```

### 타입 에러
```bash
# 특정 워크스페이스 확인
npm run type-check --workspace=@o4o/admin-dashboard

# 전체 타입 체크
npm run type-check
```

### ESLint 에러
```bash
# 자동 수정
npm run lint:fix

# 특정 파일 무시
// eslint-disable-next-line
```

### 의존성 충돌
```bash
# 중복 패키지 확인
npm ls --depth=0

# 클린 재설치
rm -rf node_modules package-lock.json
npm install
```

## 🚫 절대 하지 말아야 할 것들

1. **console.log 남기기** → logger 사용
2. **any 타입 사용** → unknown 또는 구체적 타입
3. **에러 무시하기** → try-catch로 처리
4. **하드코딩** → 환경변수 사용
5. **빌드 순서 무시** → 항상 packages 먼저
6. **타입 단언 남용** → Type Guard 사용
7. **null 체크 생략** → 옵셔널 체이닝 사용

## 📌 개발 시 참고 문서

- TypeScript 가이드: `/docs/development/TYPESCRIPT_GUIDELINES.md`
- 의존성 관리: `/docs/development/dependency-resolution-analysis.md`
- 코드 품질: `/docs/development/CODE_QUALITY_ANALYSIS.md`
- 에러 분석: `/docs/reports/O4O_PLATFORM_ERROR_ANALYSIS_REPORT.md`
- NPM 스크립트: `/docs/development/NPM_SCRIPTS_GUIDE.md`

## 💡 Pro Tips

1. **개발 전 항상 패키지 빌드**
2. **브라우저 콘솔을 항상 열어두기**
3. **타입 체크를 자주 실행**
4. **의존성 추가 시 package-lock.json 커밋**
5. **PR 전에 전체 빌드 테스트**

---

이 가이드를 따르면 대부분의 일반적인 버그를 예방할 수 있습니다.
문제가 지속되면 관련 문서를 참조하거나 에러 메시지를 자세히 확인하세요.

*최종 업데이트: 2025-07-19*