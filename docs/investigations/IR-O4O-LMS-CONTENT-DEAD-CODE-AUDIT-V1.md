# IR-O4O-LMS-CONTENT-DEAD-CODE-AUDIT-V1

> 목적: LMS/Content 영역 dead code, 중복 route, 미사용 컴포넌트 조사

**조사일**: 2026-05-11  
**조사 범위**: `services/web-kpa-society/src/`  
**변경사항**: 없음 (조사 전용)

---

## 1. Route 연결 구조 — /lms

### 현재 상태

| Route | 컴포넌트 | 위치 |
|-------|---------|------|
| `/lms` | `LmsCoursesPage` | App.tsx:762 (메인) |
| `/lms/courses` | `LmsCoursesPage` | App.tsx:763 (동일 컴포넌트) |
| `/lms/course/:id` | `LmsCourseDetailPage` | App.tsx:764 |
| `/lms/course/:courseId/lesson/:lessonId` | `LmsLessonPage` | App.tsx:765 |
| `/lms/certificate` | `LmsCertificatesPage` | App.tsx:766 |

**주목**: `/lms`와 `/lms/courses` 는 동일 컴포넌트(`LmsCoursesPage`)를 사용.  
`/lms/courses`는 `/lms`의 canonical이 확정된 이후 중복 생성된 route.

---

## 2. Route 연결 구조 — /content

| Route | 컴포넌트 | 비고 |
|-------|---------|------|
| `/content` | `ContentListPage` | 허브 (3섹션 미리보기) |
| `/content/documents` | `ContentDocumentsPage` | 전체 목록 |
| `/content/resources` | `ContentDocumentsPage` (subType='resource') | 자료실, 동일 컴포넌트 재사용 |
| `/content/courses` | `ContentCoursesPage` | 코스형 자료 |
| `/content/surveys` | `ContentSurveysPage` | 설문조사 |
| `/content/documents/new` | `ContentWritePage` | 작성 |
| `/content/:id` | `ContentDetailPage` | 상세 |
| `/content/:id/edit` | `ContentWritePage` | 수정 |

**레거시 redirect** (App.tsx:724-730, 접근 가능하나 실제로는 다른 route로):
```
/content/new        → /content/documents/new
/content/write      → /content/documents/new
/content/new/survey → /content/surveys/new
/content/new/course → /content/courses/new
/content/new/lecture → /content/courses/new
/content/new/quiz   → /lms
/contents           → /content
/content/notice     → /content
/content/news       → /content
```

---

## 3. Dead Code 확정 — EducationPage

### 판정: **Remove**

**파일**: `services/web-kpa-society/src/pages/lms/EducationPage.tsx` (231줄)

**근거**:
- App.tsx에서 `import`/`lazy load` 없음
- App.tsx 주석: `WO-O4O-LMS-CANONICAL-ROUTE-ALIGN-V1: EducationPage 제거, /lms → LmsCoursesPage`
- `/lms` route는 현재 `LmsCoursesPage` 사용 중
- `pages/lms/index.ts`에 export 잔존 (제거 필요)

**기능 비교**:

| 기능 | EducationPage | LmsCoursesPage |
|------|:---:|:---:|
| 강의 목록 조회 | ✓ | ✓ |
| 강사 신청/심사 CTA | ✓ | ✓ |
| 강사 본인 강의 수정/종료 | ✓ | ✓ |
| 검색 (URL param 기반) | ✗ | ✓ |
| 체크박스 선택 + bulk 추가 | ✗ | ✓ |
| 페이지네이션 | ✗ | ✓ |
| assetSnapshot bulk 처리 | ✗ | ✓ |
| URL 상태 관리 | ✗ | ✓ |

`EducationPage`는 `LmsCoursesPage`의 완전한 부분집합이며, 더 이상 route에 연결되지 않음.

**삭제 예상 효과**:
- 231줄 제거
- `pages/lms/index.ts` export 1줄 제거
- `LmsHubTemplate` import 제거 (KPA에서 유일한 사용처)

---

## 4. 중복 컴포넌트 — InstructorHeaderAction

### 판정: **Refactor** (EducationPage 삭제 후 자동 해소)

동일한 컴포넌트가 2파일에 로컬 정의됨:
- `pages/lms/EducationPage.tsx:42` — 삭제 대상 파일이므로 따라서 제거됨
- `pages/lms/LmsCoursesPage.tsx:42` — 유지

EducationPage 삭제만으로 중복 해소.

---

## 5. 중복 Route — /lms vs /lms/courses

### 판정: **Refactor** (하나를 redirect로 처리)

`/lms`와 `/lms/courses` 둘 다 `LmsCoursesPage`를 렌더링.
Navigation에서 `/lms` 사용, 직접 URL 입력 시 `/lms/courses`도 접근 가능.

**권장**: `/lms/courses` → `/lms` redirect로 단일화 (또는 `/lms/courses` 유지하고 `/lms` → redirect)

---

## 6. 중복 Bulk 패턴 — LmsCoursesPage vs ContentCoursesPage

### 판정: **Document** (현재 중복이나 즉시 제거 위험)

두 파일이 거의 동일한 bulk 추가 패턴 구현:

```typescript
// LmsCoursesPage:183 / ContentCoursesPage (동일 패턴)
await Promise.all(
  [...selectedCourseIds].map(async (courseId) => {
    try {
      await assetSnapshotApi.copy({ sourceService: 'kpa', sourceAssetId: courseId, assetType: 'lesson' });
      result.succeeded.push(courseId);
    } catch (err: any) {
      const code = err?.response?.data?.error?.code ?? err?.code;
      if (code === 'DUPLICATE_SNAPSHOT') result.duplicated.push(courseId);
      else result.failed.push({ courseId, message: ... });
    }
  }),
);
```

향후 `useBulkLibraryAdd` hook으로 추출 가능하나 현재는 Defer.

---

## 7. assetSnapshotApi 사용 현황 — 정상

### 판정: 모두 **Keep**

| assetType | 사용 파일 | 역할 |
|-----------|---------|------|
| `'cms'` | `StoreLibraryContentsPage` | 레거시 CMS 자산 (의도적 유지) |
| `'content'` | `ContentListPage`, `ContentDocumentsPage`, `StoreLibraryContentsPage` | KPA 콘텐츠 표준 |
| `'lesson'` | `LmsCoursesPage`, `ContentCoursesPage`, `StoreLibraryContentsPage` | LMS 강의 |
| `'signage'` | `StoreSignagePage`, `HubSignageLibraryPage` | 사이니지 |
| `'resource'` | `ResourcesHubPage`, `ContentDocumentsPage` | 자료실 |

에러 처리(`DUPLICATE_SNAPSHOT`, `SOURCE_NOT_FOUND`) 일관성 확인: ✓

---

## 8. LmsHubTemplate 사용 현황

### 판정: **Remove** (EducationPage 삭제 시 자동으로 미사용)

```
import { LmsHubTemplate } from '@o4o/shared-space-ui'
유일한 사용 파일: pages/lms/EducationPage.tsx
```

EducationPage 삭제 후 KPA에서 `LmsHubTemplate` 사용처 없음.  
`@o4o/shared-space-ui` 패키지 자체는 다른 컴포넌트로 계속 사용됨.

---

## 9. /demo/* 중복 라우트

### 판정: **Defer**

`/demo` 하위에 `/lms`, `/forum`, `/news`, `/mypage` 등 전체 라우트 중복 구현.  
App.tsx 주석: `"⚠️ 삭제 대상: 실제 지부/분회 서비스가 독립 도메인으로 제공되면 이 블록 전체 삭제"`

현재 삭제 시 Demo 기능 전체 마비. 독립 도메인 제공 시점에 일괄 처리.

---

## 10. StoreLibraryContentsPage — cms/content/lesson 3개 type fetch

### 판정: **Keep** (의도적 설계)

```typescript
const [cmsRes, contentRes, lessonRes, directRes] = await Promise.all([
  storeAssetControlApi.list({ type: 'cms', limit: 200 }),     // 레거시 CMS
  storeAssetControlApi.list({ type: 'content', limit: 200 }), // KPA 콘텐츠
  storeAssetControlApi.list({ type: 'lesson', limit: 200 }),  // LMS 강의
  directContentApi.list(),                                     // 직접 작성
]);
```

`cms` type은 레거시이나 이전 자산을 위해 의도적으로 유지. 미사용 import 없음.

---

## 11. Navigation vs Route 정합성

### 판정: **정상**

```typescript
// navigation.ts
{ label: '강의', href: '/lms' }
// App.tsx:762
<Route path="/lms" element={<LmsCoursesPage />} />
```

`/lms` → `LmsCoursesPage` 연결 정확함.  
`/content` 진입점은 Public Nav에 없음 (커뮤니티 회원 전용으로 sidebar에서 진입).

---

## 12. 전체 파일 상태 표

| 파일 | 상태 | 이유 |
|------|------|------|
| `pages/lms/EducationPage.tsx` | **Remove** | Dead code — App.tsx 미사용, LmsCoursesPage 대체 완료 |
| `pages/lms/LmsCoursesPage.tsx` | **Keep** | `/lms` canonical 페이지 |
| `pages/contents/ContentListPage.tsx` | **Keep** | `/content` 허브 |
| `pages/contents/ContentDocumentsPage.tsx` | **Keep** | `/content/documents` + `/content/resources` |
| `pages/contents/ContentCoursesPage.tsx` | **Keep** | `/content/courses` |
| `pages/contents/ContentSurveysPage.tsx` | **Keep** | `/content/surveys` |
| `/lms/courses` route | **Refactor** | `/lms`와 중복, redirect 처리 필요 |
| `InstructorHeaderAction` (EducationPage) | **Remove** | EducationPage 삭제로 자동 제거 |
| `InstructorHeaderAction` (LmsCoursesPage) | **Keep** | 유일 사용처 |
| Bulk 추가 로직 (두 파일) | **Defer** | 중복이나 지금 추출 위험 |
| `/demo/*` 라우트 | **Defer** | 독립 도메인 전환 시점에 일괄 삭제 |

---

## 13. 권장 WO 순서

### WO-1 (즉시, 5분, 위험도 없음)
```
WO-KPA-LMS-EDUCATIONPAGE-DEAD-CODE-REMOVAL-V1
- pages/lms/EducationPage.tsx 삭제
- pages/lms/index.ts에서 export 제거
- 영향: 0
```

### WO-2 (이후, 10분, 위험도 낮음)
```
WO-KPA-LMS-COURSES-ROUTE-DEDUP-V1
- /lms/courses route → /lms redirect로 단일화
- navigation canonical 확정
- 영향: 낮음
```

### WO-3 (나중, 별도 검토)
```
WO-KPA-BULK-LIBRARY-ADD-HOOK-EXTRACTION-V1
- useBulkLibraryAdd() hook으로 공통화
- LmsCoursesPage + ContentCoursesPage 사용
- 영향: 중간 (공통 로직 추출)
```

### WO-4 (독립 도메인 전환 시)
```
WO-KPA-DEMO-ROUTE-REMOVAL-V1
- /demo/* 라우트 전체 삭제
- DemoLayout, DashboardPage 삭제
- 영향: 높음 (사전 검증 필수)
```
