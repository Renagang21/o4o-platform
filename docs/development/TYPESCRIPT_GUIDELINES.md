# 📘 O4O Platform TypeScript 가이드라인

## 🎯 목표
- 100% 타입 안전성 달성
- 런타임 오류 90% 감소
- 개발 생산성 향상

## ✅ TypeScript 설정 표준

### API 서버 (Backend)
```json
{
  "compilerOptions": {
    "strict": true,              // ✅ 모든 strict 옵션 활성화
    "noImplicitAny": true,       // ✅ 암시적 any 금지
    "strictNullChecks": true,    // ✅ null/undefined 엄격 검사
    "target": "ES2020",          // Node.js 14+ 지원
    "module": "commonjs"         // Node.js 호환성
  }
}
```

### Frontend 앱
```json
{
  "compilerOptions": {
    "strict": true,              // ✅ 이미 활성화됨
    "jsx": "react-jsx",          // React 17+ JSX 변환
    "target": "ES2020",          // 모던 브라우저 지원
    "module": "ESNext"           // ES 모듈 사용
  }
}
```

## 📁 공통 타입 정의 구조

### @o4o/types 패키지 구성
```
packages/types/src/
├── index.ts          # 모든 타입 export
├── api.ts            # API 관련 타입
├── auth.ts           # 인증 관련 타입
├── common.ts         # 공통 타입
├── database.ts       # 데이터베이스 타입
├── performance.ts    # 성능 관련 타입
├── analytics.ts      # 분석 관련 타입
└── graceful-degradation.ts  # 장애 대응 타입
```

## 🔧 타입 정의 베스트 프랙티스

### 1. any 타입 사용 금지
```typescript
// ❌ Bad
function processData(data: any): any {
  return data;
}

// ✅ Good
function processData<T>(data: T): T {
  return data;
}

// ✅ Better - 구체적 타입 정의
interface ProcessedData {
  id: string;
  result: unknown;
}

function processData(data: unknown): ProcessedData {
  // 타입 가드 사용
  if (typeof data === 'object' && data !== null && 'id' in data) {
    return {
      id: String((data as { id: unknown }).id),
      result: data
    };
  }
  throw new Error('Invalid data format');
}
```

### 2. unknown vs any
```typescript
// ✅ unknown 사용 - 타입 검사 강제
function handleResponse(response: unknown): string {
  if (typeof response === 'string') {
    return response;
  }
  if (typeof response === 'object' && response !== null) {
    return JSON.stringify(response);
  }
  return String(response);
}

// ❌ any 사용 - 타입 검사 우회
function handleResponse(response: any): string {
  return response; // 위험: 런타임 오류 가능
}
```

### 3. 제네릭 활용
```typescript
// ✅ 재사용 가능한 타입 안전 함수
interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

async function executeQuery<T>(sql: string): Promise<QueryResult<T>> {
  const result = await db.query(sql);
  return {
    rows: result.rows as T[],
    rowCount: result.rowCount
  };
}

// 사용 예시
interface User {
  id: string;
  name: string;
}

const users = await executeQuery<User>('SELECT * FROM users');
// users.rows는 User[] 타입
```

### 4. Union 타입과 타입 가드
```typescript
// ✅ Union 타입으로 다양한 케이스 처리
type APIResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

// 타입 가드 함수
function isSuccessResponse<T>(
  response: APIResponse<T>
): response is { success: true; data: T } {
  return response.success === true;
}

// 사용 예시
const response = await fetchUser();
if (isSuccessResponse(response)) {
  console.log(response.data); // T 타입
} else {
  console.error(response.error); // string 타입
}
```

### 5. 데이터베이스 쿼리 타입
```typescript
// ✅ TypeORM 쿼리 타입 안전성
import { SelectQueryBuilder } from 'typeorm';

// 쿼리 빌더 래퍼
function createQueryBuilder<T>(
  entity: new () => T
): SelectQueryBuilder<T> {
  return AppDataSource.getRepository(entity).createQueryBuilder();
}

// 사용 예시
const users = await createQueryBuilder(User)
  .where('age > :age', { age: 18 })
  .getMany(); // User[] 타입 자동 추론
```

### 6. 이벤트 핸들러 타입
```typescript
// ✅ React 이벤트 핸들러
import { ChangeEvent, MouseEvent } from 'react';

interface FormProps {
  onSubmit: (data: FormData) => void;
}

function Form({ onSubmit }: FormProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; // string 타입
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  return (
    <form>
      <input onChange={handleChange} />
      <button onClick={handleClick}>Submit</button>
    </form>
  );
}
```

## 🚀 마이그레이션 전략

### 점진적 any 타입 제거
1. **파일별 접근**: `// @ts-strict` 주석으로 파일별 활성화
2. **우선순위 설정**: 
   - 핵심 비즈니스 로직 우선
   - 자주 사용되는 유틸리티 함수
   - API 엔드포인트
3. **단계별 전환**:
   ```typescript
   // Step 1: any → unknown
   function process(data: any) {} → function process(data: unknown) {}
   
   // Step 2: unknown → 구체적 타입
   function process(data: unknown) {} → function process(data: UserData) {}
   ```

### 타입 커버리지 측정
```bash
# 타입 커버리지 확인 스크립트
npm run lint 2>&1 | grep -c "Unexpected any"

# 목표: 0개
```

## 🛡️ 타입 안전성 유지

### Pre-commit Hook 설정
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run type-check && npm run lint"
    }
  }
}
```

### CI/CD 파이프라인
```yaml
# .github/workflows/ci.yml
- name: Type Check
  run: npm run type-check
  
- name: Lint Check
  run: npm run lint
```

### ESLint 규칙
```javascript
// eslint.config.js
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-return': 'error'
  }
}
```

## 📊 현재 상태 (2025-07-16)

### Phase 2 완료 후
- **API 서버**: ✅ 0개 any 타입 (100% 타입 안전)
- **Main Site**: ✅ 0개 any 타입
- **Admin Dashboard**: ✅ 0개 any 타입
- **전체**: 308개 → 예정 (패키지 및 테스트 파일)

### 달성한 목표
1. ✅ API 서버 TypeScript strict mode 활성화
2. ✅ 핵심 서비스 100% 타입 안전성
3. ✅ 데이터베이스 쿼리 타입 정의
4. ✅ 성능 및 분석 서비스 타입 정의

## 🎯 향후 계획

### Phase 3 목표
1. 테스트 파일 타입 안전성 확보
2. 빌드 스크립트 타입 정의
3. 개발 도구 타입 개선
4. 100% 타입 커버리지 달성

### 장기 목표
- 전체 코드베이스 any 타입 0개 유지
- 자동화된 타입 검증 시스템
- 타입 기반 문서 자동 생성
- 런타임 타입 검증 추가

## 💡 팁과 트릭

### VS Code 설정
```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.updateImportsOnFileMove.enabled": "always"
}
```

### 유용한 TypeScript 유틸리티 타입
```typescript
// Partial - 모든 속성을 선택적으로
type PartialUser = Partial<User>;

// Required - 모든 속성을 필수로
type RequiredUser = Required<User>;

// Pick - 특정 속성만 선택
type UserName = Pick<User, 'id' | 'name'>;

// Omit - 특정 속성 제외
type UserWithoutPassword = Omit<User, 'password'>;

// Record - 키-값 매핑
type UserMap = Record<string, User>;
```

---

**작성일**: 2025-07-16  
**최종 수정**: Phase 2 완료 시점  
**다음 검토**: Phase 3 시작 시점