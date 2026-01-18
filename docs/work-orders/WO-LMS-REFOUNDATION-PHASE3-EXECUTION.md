# WO-LMS-REFOUNDATION-PHASE3-EXECUTION

## Phase 3: Orphan 정리 & Frontend 정합성 실행 보고서

> **실행일**: 2026-01-18
> **상태**: COMPLETED

---

## 1. 실행 선언

```
Phase 3 Work Order 실행 지시
목표: ORPHAN 코드 0개, Frontend 경로 정렬
```

---

## 2. 조사 결과

### 2.1 Backend Routes vs Controllers
- **총 115개 라우트** 검증
- **모든 라우트에 대응하는 컨트롤러 메서드 존재**
- **Orphan 라우트: 0개**

### 2.2 lms-marketing dist/node_modules
- `dist/` - .gitignore에 올바르게 설정됨 (미커밋)
- `node_modules/` - .gitignore에 올바르게 설정됨 (미커밋)
- **정상 상태 확인**

### 2.3 Frontend API 경로 불일치 발견

| App | API Client | Frontend 경로 (Before) | Backend 실제 경로 |
|-----|-----------|----------------------|------------------|
| admin-dashboard | lmsMarketing.ts | `/api/v1/lms-marketing/product` | `/api/v1/lms/marketing/products` |
| admin-dashboard | lmsMarketing.ts | `/api/v1/lms-marketing/quiz-campaign` | `/api/v1/lms/marketing/quiz-campaigns` |
| admin-dashboard | lmsMarketing.ts | `/api/v1/lms-marketing/survey-campaign` | `/api/v1/lms/marketing/survey-campaigns` |
| main-site | productContentApi.ts | `/api/v1/lms-marketing/product` | `/api/v1/lms/marketing/products` |
| main-site | quizCampaignApi.ts | `/api/v1/lms-marketing/quiz-campaign` | `/api/v1/lms/marketing/quiz-campaigns` |
| main-site | surveyCampaignApi.ts | `/api/v1/lms-marketing/survey-campaign` | `/api/v1/lms/marketing/survey-campaigns` |

---

## 3. 수정 작업

### 3.1 admin-dashboard/src/lib/api/lmsMarketing.ts

**변경 사항:**
- `API_BASE`: `/api/v1/lms-marketing` → `/api/v1/lms/marketing`
- Product endpoints: `/product` → `/products`
- Quiz Campaign endpoints: `/quiz-campaign` → `/quiz-campaigns`
- Survey Campaign endpoints: `/survey-campaign` → `/survey-campaigns`
- HTTP methods: `PUT` → `PATCH` (Update 작업)
- Action endpoints: `publish/unpublish/end` → `activate/pause/complete`

### 3.2 main-site/src/lib/api/productContentApi.ts

**변경 사항:**
- `API_BASE`: `/api/v1/lms-marketing/product` → `/api/v1/lms/marketing/products`

### 3.3 main-site/src/lib/api/quizCampaignApi.ts

**변경 사항:**
- `BASE_PATH`: `/api/v1/lms-marketing/quiz-campaign` → `/api/v1/lms/marketing/quiz-campaigns`

### 3.4 main-site/src/lib/api/surveyCampaignApi.ts

**변경 사항:**
- `BASE_PATH`: `/api/v1/lms-marketing/survey-campaign` → `/api/v1/lms/marketing/survey-campaigns`

---

## 4. ContentBundleViewer 통합

### 조사 결과
- ContentBundleViewer는 **main-site에만 존재** (`apps/main-site/src/components/lms-core/viewer/`)
- admin-dashboard에서 ContentBundle 관련 기능 **미사용**
- **공통화 불필요** - 현재 시점에서 admin-dashboard에 Viewer가 필요하지 않음

### 결정
- ContentBundleViewer 통합 작업은 **Skip**
- admin-dashboard에서 ContentBundle 뷰어 기능이 필요할 때 별도 작업으로 진행

---

## 5. 검증 결과

### 5.1 빌드 테스트
```bash
# admin-dashboard
pnpm --filter '@o4o/admin-dashboard' run build  ✓ SUCCESS

# main-site
pnpm run build (apps/main-site)  ✓ SUCCESS
```

### 5.2 ORPHAN 코드 현황
| 카테고리 | 상태 |
|---------|------|
| Backend Routes without Controller | 0개 |
| Frontend API without Backend | 0개 (수정 완료) |
| Unused dist/node_modules in git | 0개 |

---

## 6. Phase 3 완료 요약

| 작업 항목 | 상태 |
|----------|------|
| 사용 불가 API 클라이언트 제거/수정 | ✅ 완료 |
| Frontend 경로 정렬 (Backend 기준) | ✅ 완료 |
| Viewer 통합 | ⏭️ Skip (미사용) |
| dist/node_modules 정리 | ✅ 정상 확인 |
| ORPHAN 코드 0개 검증 | ✅ 완료 |

---

## 7. 수정된 파일 목록

```
apps/admin-dashboard/src/lib/api/lmsMarketing.ts
apps/main-site/src/lib/api/productContentApi.ts
apps/main-site/src/lib/api/quizCampaignApi.ts
apps/main-site/src/lib/api/surveyCampaignApi.ts
```

---

*Phase 3 Execution Completed: 2026-01-18*
*Status: COMPLETED*
