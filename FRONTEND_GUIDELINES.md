# 프론트엔드 개발 및 통합 지침서

> Claude Code가 프론트엔드 작업 시 반드시 준수해야 할 핵심 원칙들

## 🚨 **핵심 원칙 (절대 원칙)**

### 1. **기존 코드베이스 절대 보호**
- ✅ 기존의 모든 페이지와 기능이 정상 작동하도록 보장
- ✅ 새로운 기능 추가 시 기존 코드 파괴 금지
- ✅ 하위 호환성 100% 유지

### 2. **에러 전파 방지**
- ✅ Error Boundary를 모든 새로운 모듈에 의무적으로 적용
- ✅ 한 모듈의 오류가 전체 시스템에 영향주지 않도록 격리
- ✅ 조건부 import와 lazy loading 적극 활용

### 3. **점진적 통합**
- ✅ 새로운 기능을 독립적 모듈로 개발
- ✅ 기존 라우팅 구조를 보호하면서 점진적 추가
- ✅ A/B 테스트 가능한 구조로 설계

## 🏗️ **필수 구현 패턴**

### Error Boundary 패턴
```typescript
// 모든 새로운 모듈은 반드시 Error Boundary로 감싸기
<ModuleErrorBoundary moduleName="모듈명" fallbackUrl="/safe-route">
  <NewModule />
</ModuleErrorBoundary>
```

### Lazy Loading 패턴
```typescript
// 대용량 모듈은 반드시 lazy loading 적용
const LazyModule = lazy(() => import('./NewModule'));

export const SafeModule = () => (
  <ModuleErrorBoundary>
    <Suspense fallback={<LoadingSpinner />}>
      <LazyModule />
    </Suspense>
  </ModuleErrorBoundary>
);
```

### 조건부 Import 패턴
```typescript
// 선택적 의존성으로 모듈 격리
try {
  const { OptionalModule } = await import('@shared/optional-module');
  return <OptionalModule />;
} catch (error) {
  console.warn('Optional module not available:', error);
  return <FallbackComponent />;
}
```

## 📁 **디렉토리 구조 원칙**

```
services/main-site/src/
├── components/
│   ├── ErrorBoundary/          # 에러 처리 컴포넌트들
│   ├── LazyModules/            # 지연 로딩 래퍼들
│   └── [feature]/              # 기능별 컴포넌트
├── pages/
│   ├── [feature]/              # 기능별 페이지들
│   └── ...
shared/
├── components/
│   ├── [feature]/              # 공유 기능 컴포넌트
│   │   ├── index.ts           # 필수: barrel exports
│   │   └── ...
│   └── ui/
│       ├── index.ts           # 필수: UI 컴포넌트 exports
│       └── ...
```

## ⚙️ **Import/Export 규칙**

### 1. **Barrel Exports 필수**
```typescript
// shared/components/[feature]/index.ts
export { FeatureComponent } from './FeatureComponent';
export { FeatureService } from './FeatureService';
export type { FeatureProps } from './types';
```

### 2. **Alias 설정 필수**
```typescript
// vite.config.ts
alias: {
  '@shared/[feature]': path.resolve(__dirname, '../../shared/components/[feature]'),
  '@shared/ui': path.resolve(__dirname, '../../shared/components/ui'),
}
```

### 3. **TypeScript Path Mapping**
```json
// tsconfig.json
{
  "paths": {
    "@shared/*": ["../../shared/*"],
    "@shared/[feature]": ["../../shared/components/[feature]"]
  }
}
```

## 🔒 **안전성 체크리스트**

### 새 기능 추가 시 필수 확인사항:
- [ ] Error Boundary 적용됨
- [ ] Lazy loading 구현됨
- [ ] Fallback UI 제공됨
- [ ] 기존 페이지 정상 작동 확인
- [ ] TypeScript 타입 체크 통과
- [ ] Build 성공 확인
- [ ] 다국어 지원 (한국어 우선)

### 배포 전 필수 테스트:
- [ ] 모든 기존 페이지 접근 가능
- [ ] 새 기능 정상 작동
- [ ] 에러 발생 시 graceful degradation
- [ ] 모바일/데스크톱 반응형 확인

## 🎯 **성능 최적화 원칙**

### 1. **Code Splitting**
```typescript
// 기능별 청크 분리
const FeatureModule = lazy(() => import('./FeatureModule'));
```

### 2. **Bundle Size 관리**
```typescript
// vite.config.ts rollupOptions
manualChunks: {
  'vendor': ['react', 'react-dom'],
  'ui': ['@shared/ui'],
  '[feature]': ['@shared/[feature]']
}
```

### 3. **Tree Shaking 최적화**
```typescript
// 필요한 것만 import
import { Button } from '@shared/ui/Button';
// 전체 import 금지: import * from '@shared/ui';
```

## 🚨 **에러 처리 전략**

### 1. **사용자 친화적 메시지**
```typescript
const errorMessages = {
  ko: {
    moduleError: "모듈에 일시적인 문제가 있습니다.",
    fallbackAction: "다른 페이지로 이동하시겠습니까?"
  }
};
```

### 2. **개발자 디버깅 정보**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.error('Detailed error info:', error, errorInfo);
}
```

### 3. **에러 리포팅** (선택적)
```typescript
// 프로덕션 환경에서 에러 로깅
if (process.env.NODE_ENV === 'production') {
  // 에러 리포팅 서비스로 전송
}
```

## 📋 **일반적인 문제 해결**

### WSL/esbuild 플랫폼 문제:
```bash
rm -rf node_modules && npm install
# 또는 esbuild-wasm 사용 (성능 trade-off 있음)
```

### Import 에러:
1. barrel exports (`index.ts`) 확인
2. vite.config.ts alias 설정 확인
3. tsconfig path mapping 확인

### 빌드 실패:
1. TypeScript 타입 체크: `npm run type-check`
2. 순환 의존성 확인
3. 미사용 import 정리

## 🎉 **Best Practices**

### 1. **컴포넌트 설계**
- 작고 재사용 가능한 컴포넌트
- 명확한 Props 인터페이스
- 기본값 제공

### 2. **상태 관리**
- 로컬 상태 우선 사용
- 전역 상태는 꼭 필요한 경우만
- 상태 정규화

### 3. **테스팅**
- Error Boundary 테스트
- 로딩 상태 테스트
- 에러 상태 테스트

## 🔄 **지속적 개선**

### 정기 점검 항목:
- [ ] Bundle size 분석
- [ ] 사용하지 않는 코드 제거
- [ ] 의존성 업데이트
- [ ] 성능 메트릭 확인

---

**이 지침서는 모든 프론트엔드 작업의 기준이 됩니다. 새로운 기능 개발 시 반드시 이 원칙들을 따라주세요.**