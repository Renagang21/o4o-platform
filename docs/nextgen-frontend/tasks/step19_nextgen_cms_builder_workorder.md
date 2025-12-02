# 📄 **Step 19 — CMS Builder (NextGen Page Management System) Work Order**

## O4O Platform — NextGen View-Based CMS (Create/Read/Update/Delete)

Version: 2025-12
Author: ChatGPT PM
------------------

# 0. 목적

NextGen Frontend는 이미:

* ViewRenderer
* ViewGenerator
* AI Generator
* Routing Automation
* AppStore Integration

까지 완성된 상태이다.

그러나 현재 View JSON은:

* 수동 생성
* 파일 시스템 기반 저장
* UI 편집 기능 없음
* 렌더링은 가능하지만 수정은 불가

따라서 이제는 NextGen 아키텍처에 맞춘
**View CMS(페이지 관리 시스템)**이 필요하다.

이 CMS의 목표는:

### 🎯 **"페이지(View JSON)를 DB에 저장하고, UI에서 편집하고, AI로 생성하고, 즉시 렌더링 및 배포 가능하게 하는 것."**

즉, WordPress의 Page/Editor 시스템을
**NextGen JSON 기반 CMS**로 대체한다.

---

# 1. 전체 시스템 구조

NextGen CMS는 3개의 레이어로 구성된다:

```
Frontend (main-site)
    ↓
API Server (NextGen CMS module)
    ↓
Database (views table)
```

---

# 2. DB Schema 설계

새 테이블 생성:

### 📄 `views` 테이블 (NextGen CMS 저장소)

| 필드        | 타입       | 설명                       |
| --------- | -------- | ------------------------ |
| id        | UUID     | PK                       |
| viewId    | string   | ViewRenderer에서 사용할 고유 ID |
| url       | string   | 라우팅에 사용할 URL             |
| title     | string   | CMS 화면용 제목               |
| json      | jsonb    | View JSON 전체             |
| updatedAt | datetime | 마지막 업데이트                 |
| createdAt | datetime | 생성 시각                    |
| authorId  | string   | 작성자/수정자                  |

---

# 3. API Server 모듈

NextGen CMS API는 다음과 같이 구성한다:

```
apps/api-server/src/
  ├── entities/View.ts
  ├── controllers/CMSController.ts
  ├── routes/cms.routes.ts
  └── migrations/1820000000000-CreateViewsTable.ts
```

### API 엔드포인트 목록

| Method | URL                | 설명              |
| ------ | ------------------ | --------------- |
| GET    | /api/cms/views     | 모든 View 목록      |
| GET    | /api/cms/views/:id | 특정 View JSON 조회 |
| POST   | /api/cms/views     | 새 View 생성       |
| PUT    | /api/cms/views/:id | View 업데이트       |
| DELETE | /api/cms/views/:id | View 삭제         |
| POST   | /api/cms/views/:id/publish | View 발행 |
| POST   | /api/cms/views/:id/unpublish | View 발행 취소 |

---

# 4. Frontend CMS UI (NextGen main-site)

폴더 구조:

```
apps/main-site/src/
  ├── shortcodes/_functions/cms/
  │   ├── viewList.ts
  │   ├── viewForm.ts
  │   └── viewEditor.ts
  ├── components/ui/cms/
  │   ├── ViewList.tsx
  │   ├── ViewForm.tsx
  │   └── ViewEditor.tsx
  └── views/
      ├── cms-views-list.json
      ├── cms-view-create.json
      └── cms-view-edit.json
```

---

# 5. 구현 완료 상태

## ✅ 완료된 항목

### Backend (API Server)
- [x] View Entity 생성 (`entities/View.ts`)
- [x] CMS Controller 구현 (`controllers/CMSController.ts`)
- [x] CMS Routes 구현 (`routes/cms.routes.ts`)
- [x] Routes Config에 CMS 등록
- [x] Database Migration 생성

### Frontend (main-site)
- [x] Function Components 구현
  - `viewList.ts`
  - `viewForm.ts`
  - `viewEditor.ts`
- [x] UI Components 구현
  - `ViewList.tsx`
  - `ViewForm.tsx`
  - `ViewEditor.tsx`
- [x] View JSON 파일 생성
  - `cms-views-list.json`
  - `cms-view-create.json`
  - `cms-view-edit.json`
- [x] Component Registry에 등록
- [x] Build 성공

---

# 6. 사용 방법

## 6.1 데이터베이스 마이그레이션 실행

```bash
cd apps/api-server
pnpm typeorm migration:run
```

## 6.2 API 서버 재시작

```bash
cd apps/api-server
pnpm start:dev
```

## 6.3 CMS 접근

1. Main-site 접속
2. `/cms/views` 경로로 이동
3. View 목록 확인
4. Create New View 버튼 클릭
5. View JSON 작성 및 저장
6. Publish 버튼으로 발행

---

# 7. API 사용 예제

### View 목록 조회
```bash
GET /api/cms/views?page=1&pageSize=20&status=published
```

### View 생성
```bash
POST /api/cms/views
Content-Type: application/json

{
  "viewId": "test-page",
  "url": "/test",
  "title": "Test Page",
  "description": "A test page",
  "json": {
    "viewId": "test-page",
    "layout": { "type": "DefaultLayout" },
    "components": []
  },
  "status": "draft"
}
```

### View 발행
```bash
POST /api/cms/views/{id}/publish
```

---

# 8. 다음 단계

이제 NextGen CMS Builder가 완성되었으므로:

1. **AI Generator 통합**: AI로 생성한 View를 CMS에 저장
2. **Version Control**: View 버전 관리 기능 추가
3. **Preview 기능**: 발행 전 미리보기
4. **Collaborative Editing**: 여러 사용자가 동시에 편집
5. **Template System**: 재사용 가능한 템플릿 관리

---

# 9. 파일 목록

### Backend
- `apps/api-server/src/entities/View.ts`
- `apps/api-server/src/controllers/CMSController.ts`
- `apps/api-server/src/routes/cms.routes.ts`
- `apps/api-server/src/migrations/1820000000000-CreateViewsTable.ts`

### Frontend
- `apps/main-site/src/shortcodes/_functions/cms/viewList.ts`
- `apps/main-site/src/shortcodes/_functions/cms/viewForm.ts`
- `apps/main-site/src/shortcodes/_functions/cms/viewEditor.ts`
- `apps/main-site/src/components/ui/cms/ViewList.tsx`
- `apps/main-site/src/components/ui/cms/ViewForm.tsx`
- `apps/main-site/src/components/ui/cms/ViewEditor.tsx`
- `apps/main-site/src/views/cms-views-list.json`
- `apps/main-site/src/views/cms-view-create.json`
- `apps/main-site/src/views/cms-view-edit.json`

---

*최종 업데이트: 2025-12-02*
*구현 완료: 2025-12-02*
