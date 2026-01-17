# WO-LMS-REFOUNDATION Phase 1 실행 가이드

## Quiz/Survey Core 정상화

> **상위 WO**: WO-LMS-REFOUNDATION-AND-MARKETING-REINTEGRATION-V1
> **작업 범위**: lms-core Quiz/Survey 라우팅 등록
> **예상 작업량**: 1-2일

---

## 1. 현재 상태 (문제)

```
packages/lms-core/src/controllers/
├── QuizController.ts      ← 완성됨, createQuizRoutes() 존재
├── SurveyController.ts    ← 완성됨, createSurveyRoutes() 존재
└── ...

apps/api-server/src/modules/lms/routes/
└── lms.routes.ts          ← ❌ Quiz/Survey 미등록
```

**증상**:
- Frontend (`contentBundleApi.ts`)가 `/api/v1/lms/quizzes/*` 호출
- Backend에서 404 Not Found 반환
- Quiz/Survey Entity + Service 완성되었으나 **DEAD CODE**

---

## 2. 목표 상태

```
/api/v1/lms/quizzes/*     ← ✅ 동작
/api/v1/lms/surveys/*     ← ✅ 동작
```

---

## 3. 작업 단계

### Step 1: lms.routes.ts에 Quiz 라우팅 추가

**파일**: `apps/api-server/src/modules/lms/routes/lms.routes.ts`

```typescript
// 상단 import 추가
import { createQuizRoutes } from '@o4o-apps/lms-core/controllers/QuizController.js';
import { createSurveyRoutes } from '@o4o-apps/lms-core/controllers/SurveyController.js';

// 라우터 등록 (파일 하단, export 전)
// Quiz routes - DataSource 주입 필요
// router.use('/quizzes', createQuizRoutes(dataSource));
// router.use('/surveys', createSurveyRoutes(dataSource));
```

⚠️ **주의**: `createQuizRoutes`와 `createSurveyRoutes`는 DataSource를 인자로 받음
- 현재 lms.routes.ts는 static Router 패턴
- DataSource 주입 방식 결정 필요

### Step 2: DataSource 주입 방식 선택

**Option A**: Factory 패턴으로 변경
```typescript
// lms.routes.ts
export function createLmsRoutes(dataSource: DataSource): Router {
  const router = Router();
  // ... 기존 라우트
  router.use('/quizzes', createQuizRoutes(dataSource));
  router.use('/surveys', createSurveyRoutes(dataSource));
  return router;
}
```

**Option B**: 글로벌 DataSource 참조
```typescript
import { AppDataSource } from '../../../database/connection.js';
router.use('/quizzes', createQuizRoutes(AppDataSource));
```

**권장**: Option A (테스트 용이성)

### Step 3: main.ts 또는 모듈 초기화 수정

DataSource 주입 방식에 따라 `main.ts` 수정

### Step 4: Frontend API 경로 확인

**파일**: `apps/main-site/src/lib/api/contentBundleApi.ts`

현재 호출 경로가 Backend와 일치하는지 확인:
```typescript
// 현재 선언된 경로
GET  /api/v1/lms/quizzes/{quizId}
POST /api/v1/lms/quizzes/{id}/attempts
GET  /api/v1/lms/surveys/{surveyId}
POST /api/v1/lms/surveys/{id}/responses
```

QuizController/SurveyController의 실제 경로와 대조 필요

### Step 5: 빌드 및 테스트

```bash
# 빌드
pnpm build --filter=@o4o-apps/api-server

# API 테스트
curl http://localhost:3001/api/v1/lms/quizzes
curl http://localhost:3001/api/v1/lms/surveys
```

---

## 4. 체크리스트

- [ ] QuizController import 추가
- [ ] SurveyController import 추가
- [ ] DataSource 주입 방식 결정
- [ ] lms.routes.ts 라우팅 등록
- [ ] main.ts 수정 (필요시)
- [ ] Frontend API 경로 확인
- [ ] 빌드 성공
- [ ] API 테스트 성공

---

## 5. 관련 파일

| 파일 | 역할 |
|------|------|
| `packages/lms-core/src/controllers/QuizController.ts` | Quiz API 핸들러 |
| `packages/lms-core/src/controllers/SurveyController.ts` | Survey API 핸들러 |
| `apps/api-server/src/modules/lms/routes/lms.routes.ts` | LMS 라우팅 **← 수정 대상** |
| `apps/main-site/src/lib/api/contentBundleApi.ts` | Frontend API 클라이언트 |

---

## 6. 성공 기준

- `GET /api/v1/lms/quizzes` → 200 OK (빈 배열 또는 목록)
- `GET /api/v1/lms/surveys` → 200 OK (빈 배열 또는 목록)
- Frontend ContentBundleViewer에서 Quiz/Survey 로드 성공

---

## 7. 후속 작업

Phase 1 완료 후:
- Phase 2: lms-marketing 재생성
- Phase 3: Orphan 정리

---

*Phase 1 Guide Created: 2026-01-17*
