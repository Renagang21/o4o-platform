# Cosmetics API Contract Validation

> **Version**: 1.0
> **Status**: Reference (CI 구현 가이드)
> **Created**: 2025-12-29

이 문서는 Cosmetics API 계약 검증의 CI 구현 가이드를 정의합니다.

---

## 1. 검증 개요

### 1.1 검증 목적

```
OpenAPI 스펙 (계약) ←→ 실제 코드 (구현)
       ↓
   불일치 시 빌드 실패
```

### 1.2 검증 대상

| 대상 | 검증 내용 |
|------|-----------|
| cosmetics-api | OpenAPI ↔ 실제 라우트 일치 |
| cosmetics-web | API 호출 ↔ OpenAPI 정의 일치 |

---

## 2. 필요 도구

### 2.1 권장 도구

```bash
# OpenAPI 검증
npm install -D @redocly/cli

# 계약 테스트
npm install -D dredd

# 타입 생성
npm install -D openapi-typescript

# 런타임 검증
npm install -D express-openapi-validator  # API
npm install -D openapi-fetch              # Web
```

### 2.2 package.json 스크립트

```json
{
  "scripts": {
    "openapi:lint": "redocly lint docs/services/cosmetics/openapi.yaml",
    "openapi:types": "openapi-typescript docs/services/cosmetics/openapi.yaml -o src/types/cosmetics-api.ts",
    "openapi:validate": "dredd docs/services/cosmetics/openapi.yaml http://localhost:3003",
    "contract:test": "npm run openapi:lint && npm run openapi:validate"
  }
}
```

---

## 3. cosmetics-api CI 검증

### 3.1 GitHub Actions Workflow

```yaml
# .github/workflows/cosmetics-api-contract.yml
name: Cosmetics API Contract Validation

on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/cosmetics-api/**'
      - 'docs/services/cosmetics/openapi.yaml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'apps/cosmetics-api/**'
      - 'docs/services/cosmetics/openapi.yaml'

jobs:
  validate-contract:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: cosmetics_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Lint OpenAPI spec
        run: npx @redocly/cli lint docs/services/cosmetics/openapi.yaml

      - name: Build cosmetics-api
        run: pnpm -F cosmetics-api build

      - name: Start API server
        run: |
          pnpm -F cosmetics-api start &
          sleep 10
        env:
          NODE_ENV: test
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: cosmetics_test
          DB_USERNAME: test
          DB_PASSWORD: test

      - name: Run contract tests
        run: npx dredd docs/services/cosmetics/openapi.yaml http://localhost:3003

      - name: Validate route coverage
        run: |
          # 실제 라우트 추출
          node scripts/extract-routes.js > actual-routes.txt

          # OpenAPI 라우트 추출
          node scripts/extract-openapi-routes.js > expected-routes.txt

          # 비교
          diff actual-routes.txt expected-routes.txt || (echo "Route mismatch!" && exit 1)
```

### 3.2 라우트 추출 스크립트 예시

```javascript
// scripts/extract-routes.js
// cosmetics-api의 실제 라우트를 추출하는 스크립트

const app = require('../apps/cosmetics-api/dist/main');

function extractRoutes(app) {
  const routes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods);
      methods.forEach(method => {
        routes.push(`${method.toUpperCase()} ${middleware.route.path}`);
      });
    }
  });

  return routes.sort();
}

const routes = extractRoutes(app);
routes.forEach(r => console.log(r));
```

```javascript
// scripts/extract-openapi-routes.js
// OpenAPI 스펙에서 라우트를 추출하는 스크립트

const yaml = require('js-yaml');
const fs = require('fs');

const spec = yaml.load(fs.readFileSync('docs/services/cosmetics/openapi.yaml', 'utf8'));

const routes = [];
Object.entries(spec.paths).forEach(([path, methods]) => {
  Object.keys(methods).forEach(method => {
    if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
      routes.push(`${method.toUpperCase()} ${path}`);
    }
  });
});

routes.sort().forEach(r => console.log(r));
```

---

## 4. cosmetics-web CI 검증

### 4.1 GitHub Actions Workflow

```yaml
# .github/workflows/cosmetics-web-contract.yml
name: Cosmetics Web API Contract Validation

on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/cosmetics-web/**'
      - 'docs/services/cosmetics/openapi.yaml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'apps/cosmetics-web/**'
      - 'docs/services/cosmetics/openapi.yaml'

jobs:
  validate-api-usage:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Generate types from OpenAPI
        run: |
          npx openapi-typescript docs/services/cosmetics/openapi.yaml \
            -o apps/cosmetics-web/src/types/cosmetics-api.ts

      - name: Type check
        run: pnpm -F cosmetics-web type-check

      - name: Validate API calls
        run: |
          # API 호출 패턴 추출 및 검증
          node scripts/validate-api-calls.js
```

### 4.2 타입 안전 API 클라이언트

```typescript
// apps/cosmetics-web/src/services/cosmetics-api.ts

import createClient from 'openapi-fetch';
import type { paths } from '../types/cosmetics-api';

const client = createClient<paths>({
  baseUrl: process.env.COSMETICS_API_URL,
});

// 타입 안전 API 호출
export const cosmeticsApi = {
  products: {
    list: (params: paths['/cosmetics/products']['get']['parameters']['query']) =>
      client.GET('/cosmetics/products', { params: { query: params } }),

    get: (id: string) =>
      client.GET('/cosmetics/products/{id}', { params: { path: { id } } }),

    create: (body: paths['/cosmetics/admin/products']['post']['requestBody']['content']['application/json']) =>
      client.POST('/cosmetics/admin/products', { body }),

    updateStatus: (
      id: string,
      body: paths['/cosmetics/admin/products/{id}/status']['patch']['requestBody']['content']['application/json']
    ) =>
      client.PATCH('/cosmetics/admin/products/{id}/status', {
        params: { path: { id } },
        body,
      }),
  },

  brands: {
    list: () => client.GET('/cosmetics/brands'),
    get: (id: string) => client.GET('/cosmetics/brands/{id}', { params: { path: { id } } }),
  },

  prices: {
    get: (productId: string) =>
      client.GET('/cosmetics/admin/prices/{productId}', { params: { path: { productId } } }),

    update: (
      productId: string,
      body: paths['/cosmetics/admin/prices/{productId}']['put']['requestBody']['content']['application/json']
    ) =>
      client.PUT('/cosmetics/admin/prices/{productId}', {
        params: { path: { productId } },
        body,
      }),
  },
};
```

---

## 5. 런타임 검증 (선택적)

### 5.1 cosmetics-api 런타임 검증

```typescript
// apps/cosmetics-api/src/middleware/openapi-validator.ts

import * as OpenApiValidator from 'express-openapi-validator';
import path from 'path';

export const openapiValidator = OpenApiValidator.middleware({
  apiSpec: path.join(__dirname, '../../../../docs/services/cosmetics/openapi.yaml'),
  validateRequests: true,
  validateResponses: true,
  validateSecurity: {
    handlers: {
      bearerAuth: async (req, scopes) => {
        // JWT 검증 로직
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return false;

        // scope 검증
        const decoded = verifyToken(token);
        return scopes.every(scope => decoded.scopes.includes(scope));
      },
    },
  },
});
```

### 5.2 NestJS 통합

```typescript
// apps/cosmetics-api/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { openapiValidator } from './middleware/openapi-validator';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // OpenAPI 검증 미들웨어 (개발/테스트 환경)
  if (process.env.NODE_ENV !== 'production') {
    app.use(openapiValidator);
  }

  await app.listen(3003);
}
bootstrap();
```

---

## 6. 검증 실패 처리

### 6.1 CI 실패 시

| 실패 유형 | 원인 | 해결 방법 |
|-----------|------|-----------|
| OpenAPI lint 실패 | 스펙 문법 오류 | openapi.yaml 수정 |
| 라우트 불일치 | 코드에 정의되지 않은 API | OpenAPI 먼저 업데이트 |
| 타입 체크 실패 | 스키마 변경 | 타입 재생성 |
| 계약 테스트 실패 | 응답 스키마 불일치 | API 구현 수정 |

### 6.2 오류 메시지 예시

```
❌ Contract Validation Failed

Routes defined in OpenAPI but not implemented:
  - POST /cosmetics/admin/products

Routes implemented but not in OpenAPI:
  - GET /cosmetics/users  <-- FORBIDDEN!

Response schema mismatch:
  - GET /cosmetics/products
    Expected: { data: [], meta: {} }
    Actual: { items: [] }  <-- Missing meta!
```

---

## 7. 개발 워크플로우

### 7.1 새 엔드포인트 추가 시

```bash
# 1. OpenAPI 스펙 업데이트
vim docs/services/cosmetics/openapi.yaml

# 2. 스펙 검증
npx @redocly/cli lint docs/services/cosmetics/openapi.yaml

# 3. 타입 생성
npm run openapi:types

# 4. API 구현
# ... 코드 작성 ...

# 5. 로컬 계약 테스트
npm run contract:test

# 6. PR 생성
git add .
git commit -m "feat(cosmetics-api): add new endpoint"
git push
```

### 7.2 pre-commit hook 설정

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# OpenAPI 변경 시 타입 재생성
if git diff --cached --name-only | grep -q "openapi.yaml"; then
  npm run openapi:types
  git add apps/cosmetics-web/src/types/cosmetics-api.ts
fi

# OpenAPI lint
npm run openapi:lint
```

---

## 8. 참조 문서

- docs/services/cosmetics/openapi.yaml (계약 원본)
- docs/services/cosmetics/openapi.rules.md (규칙)
- docs/architecture/cosmetics-api-rules.md
- CLAUDE.md §14 API Contract Enforcement Rules

---

*이 문서는 CI 구현 가이드이며, 실제 구현 시 프로젝트 구조에 맞게 조정이 필요합니다.*
