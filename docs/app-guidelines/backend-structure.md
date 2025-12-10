# Backend Structure Guideline

**버전:** 2.0.0
**상태:** Active

---

## 1. Purpose

앱의 backend 모듈(Entities, Services, Routes) 구조와 작성 규칙을 정의한다.

## 2. Overview

- backend는 앱의 서버 측 로직을 담당한다.
- Module Loader가 backend/index.ts를 자동으로 로드한다.
- 모든 backend 요소는 index.ts에서 export해야 등록된다.

## 3. Directory Structure

```
packages/{app-name}/
└── src/
    └── backend/
        ├── index.ts          # Export point (필수)
        ├── entities/         # TypeORM 엔티티
        │   └── {Entity}.ts
        ├── services/         # 비즈니스 로직
        │   └── {service}.service.ts
        └── routes/           # API 라우트
            └── {route}.routes.ts
```

## 4. Key Components

### 4.1 Entities (TypeORM)

```typescript
// backend/entities/ForumPost.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('forum_posts')
export class ForumPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;
}
```

### 4.2 Services

```typescript
// backend/services/forum.service.ts
import { ForumPost } from '../entities/ForumPost';

export class ForumService {
  async findAll(): Promise<ForumPost[]> {
    // 비즈니스 로직
  }
}
```

### 4.3 Routes

```typescript
// backend/routes/forum.routes.ts
import { Router } from 'express';
import { ForumService } from '../services/forum.service';

const router = Router();

router.get('/', async (req, res) => {
  const posts = await forumService.findAll();
  res.json({ data: posts });
});

export default router;
```

### 4.4 Index Export (필수)

```typescript
// backend/index.ts
export * from './entities/ForumPost';
export { ForumService } from './services/forum.service';
export { default as forumRoutes } from './routes/forum.routes';
```

## 5. Rules

1. **index.ts export 필수**: export하지 않은 요소는 Module Loader가 인식하지 못한다.
2. **route prefix 규칙**: manifest의 routes.prefix 값을 따른다.
3. **Entity 명명 규칙**: PascalCase, 테이블명은 snake_case.
4. **Service 분리**: 비즈니스 로직은 Service에, 라우팅 로직은 Routes에 분리.
5. **의존성 주입**: Service 간 의존성은 생성자 주입 방식 권장.

---

## Related Documents

- [app-overview.md](./app-overview.md)
- [manifest-guideline.md](./manifest-guideline.md)
- [schema-drift-prevention.md](./schema-drift-prevention.md)

---
*최종 업데이트: 2025-12-10*
