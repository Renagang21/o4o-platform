# React Children Error Report

## 문제 설명
```
Uncaught TypeError: Cannot set properties of undefined (setting 'Children')
    at vendor-react-Bl9seSsm.js:17:4206
    at vendor-radix-DWVSOKi0.js:9:51
```

## 원인 분석

### 1. React Import 문제
- React 19에서는 `import React from 'react'` 대신 named imports 사용 권장
- 일부 라이브러리가 `React.Children` 등 React namespace에 접근 시도
- Radix UI가 React 객체를 예상하지만 undefined 받음

### 2. 버전 충돌
- 프로젝트: React 19.1.1
- Radix UI: React 18 호환 버전
- WordPress 패키지: React 18 요구

### 3. 번들링 문제
- Vite가 React를 별도 청크로 분리 (vendor-react)
- Radix UI가 별도 청크 (vendor-radix)
- 청크 간 React 참조 문제 발생

## 해결 방안

### 방안 1: React Interop Layer 추가
```typescript
// vite.config.ts에 추가
define: {
  'React': 'window.React',
}

// index.html에 추가
<script>
  import * as React from 'react';
  window.React = React;
</script>
```

### 방안 2: Radix UI 패치
```json
// package.json overrides
"overrides": {
  "@radix-ui/*": {
    "react": "19.1.1"
  }
}
```

### 방안 3: React Legacy 모드
```typescript
// main.tsx
import React from 'react';
import * as ReactNamespace from 'react';

// Legacy compatibility
if (!React.Children) {
  Object.assign(React, ReactNamespace);
}
```

## 즉시 적용 가능한 해결책

1. **Vite 설정 수정**
```typescript
// vite.config.shared.ts
resolve: {
  alias: {
    'react': path.resolve(__dirname, 'node_modules/react'),
    'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
  }
}
```

2. **React Shim 생성**
```typescript
// src/react-shim.ts
import * as React from 'react';
import * as ReactDOM from 'react-dom';

(window as any).React = React;
(window as any).ReactDOM = ReactDOM;

export { React, ReactDOM };
```

3. **Entry Point 수정**
```typescript
// src/main.tsx
import './react-shim';
// ... rest of imports
```

## 테스트 방법
1. 빌드: `npm run build:admin`
2. 개발서버: `npm run dev:admin`
3. 브라우저 콘솔에서 확인: `console.log(React.Children)`

## 참고 자료
- [React 19 Breaking Changes](https://react.dev/blog/2024/04/25/react-19)
- [Vite React Plugin](https://github.com/vitejs/vite-plugin-react)
- [Radix UI React 19 Support](https://github.com/radix-ui/primitives/issues/2577)