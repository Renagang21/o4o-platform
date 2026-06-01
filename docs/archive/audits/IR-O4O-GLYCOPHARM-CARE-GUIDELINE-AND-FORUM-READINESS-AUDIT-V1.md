# IR-O4O-GLYCOPHARM-CARE-GUIDELINE-AND-FORUM-READINESS-AUDIT-V1

**Date**: 2026-03-22
**Scope**: GlycoPharm / GlucoseView 가이드라인 + 포럼 운영 준비도 감사

---

## 1. 가이드라인 현재 상태 표

| 서비스 | 라우트 | 페이지 상태 | 콘텐츠 구조 | 운영자 수정 가능 | 비고 |
|--------|--------|------------|------------|:---------------:|------|
| GlycoPharm (당뇨인용) | `/patient/care-guideline` | **구현 완료** | 정적 (하드코딩 7섹션) | ❌ | WO-GLYCOPHARM-PATIENT-CARE-GUIDELINE-V1 |
| GlucoseView (당뇨인용) | `/patient/care-guideline` | **구현 완료** | 정적 (하드코딩 7섹션, 동일) | ❌ | 동일 콘텐츠 |
| GlycoPharm (약국용) | 없음 | **미존재** | — | — | 라우트/페이지/내비게이션 없음 |
| GlucoseView (약국용) | 해당 없음 | — | — | — | GlucoseView는 환자 전용 서비스 |

**현재 콘텐츠 섹션** (양쪽 동일):
1. 혈당 모니터링 / 2. 식이요법 가이드 / 3. 운동 가이드 / 4. 약물 복용 안내
5. 저혈당·고혈당 대처 / 6. 합병증 예방 / 7. 정기 검진 안내

**콘텐츠 소스**: 컴포넌트 내 `GUIDE_SECTIONS` 상수 배열 (TSX). API 호출 없음, CMS 연동 없음.

---

## 2. CMS/운영자 편집 가능성 표

| 항목 | 현재 지원 여부 | 재사용 가능 여부 | 추가 개발 필요 여부 |
|------|:-------------:|:--------------:|:-----------------:|
| CMS 엔티티 (`cms_contents`) | ✅ 존재 | ✅ | 없음 |
| `type: 'guide'` 콘텐츠 타입 | ✅ 이미 정의됨 | ✅ | 없음 |
| `serviceKey` 기반 서비스 분기 | ✅ | ✅ | 없음 |
| Rich Text 에디터 (`@o4o/content-editor`) | ✅ TipTap 기반 | ✅ | 없음 |
| CMS CRUD API (`/api/v1/cms/contents`) | ✅ POST/PUT/GET/PATCH | ✅ | 없음 |
| `bodyBlocks` (구조화 본문) | ✅ TipTap JSON | ✅ | 없음 |
| 운영자 콘텐츠 관리 UI | ⚠️ KPA/Neture에만 존재 | ✅ 패턴 참조 가능 | **GlycoPharm용 신규 필요** |
| 가이드라인 → 환자 페이지 표시 | ❌ 현재 정적 | — | **CMS 조회 연동 필요** |
| 당뇨인용 / 약국용 분리 관리 | ✅ `metadata` 또는 별도 키 | ✅ | 설계만 필요 |

**핵심 발견**:
- CMS Core에 `guide` 타입이 이미 존재 → 가이드라인 콘텐츠를 CMS로 관리하는 데 데이터 모델 변경 불필요
- `@o4o/content-editor` (TipTap)가 이미 패키지로 존재하고 web-neture에서 사용 중
- KPA `ContentManagementPage`, Neture `HomepageCmsPage` 참조 패턴 활용 가능
- **GlycoPharm에 운영자 가이드라인 편집 페이지만 새로 만들면 됨**

---

## 3. 약국용 가이드라인 추가 가능성

**결론: 조건부 가능 (최소 개발 필요)**

### 가능 근거
- GlycoPharm 당뇨인용 가이드라인과 동일한 정적 페이지 패턴으로 즉시 생성 가능
- GlycoPharm `App.tsx`에 약사 전용 라우트 체계가 이미 존재 (`/care/*`, `/pharmacy/*`)
- 약사 메인 화면(`PharmacistPlaceholderPage`)에 내비게이션 추가만 하면 접근 경로 확보

### 필요한 최소 변경 지점

| # | 변경 | 파일 | 설명 |
|---|------|------|------|
| 1 | 페이지 생성 | `pages/care/PharmacistGuidelinePage.tsx` (NEW) | 약국용 가이드라인 정적 콘텐츠 |
| 2 | 라우트 등록 | `App.tsx` | `/care/guideline` 또는 `/pharmacy/guideline` 추가 |
| 3 | 내비게이션 | `PharmacistPlaceholderPage.tsx` | 메뉴 항목 추가 |
| 4 | lazy import | `App.tsx` | lazy 로딩 설정 |

**적절한 위치**: `/care/guideline` (Care 워크스페이스 하위 — 약사가 환자 케어 맥락에서 참조)

---

## 4. 포럼 카테고리 관리 구조 표

| 기능 | 현재 지원 | API | UI | 추가 개발 필요 |
|------|:---------:|:---:|:--:|:-------------:|
| 카테고리 생성 (사용자 요청) | ✅ | `POST /forum/category-requests` | `/forum/request-category` | 없음 |
| 카테고리 생성 (관리자 직접) | ✅ | `POST /forum/categories` | 없음 (API만) | 없음 |
| 운영자 요청 검토/승인 | ✅ | `PATCH .../forum-requests/:id/review` | `/operator/forum-requests` | ⚠️ Mock 데이터 → 실데이터 전환 필요 |
| 카테고리 수정 | ✅ | `PUT /forum/categories/:id` | ⚠️ 부분적 | 없음 |
| 카테고리 정렬 | ✅ | `sortOrder` 필드 존재 | ❌ UI 없음 | 선택적 |
| 카테고리 노출 관리 | ✅ | `isActive`, `isPinned` 필드 | ⚠️ 부분적 | 없음 |
| 접근 권한 (`accessLevel`) | ✅ | `all/member/business/admin` | ❌ UI 없음 | 선택적 |
| 승인 시 자동 카테고리 생성 | ✅ | 트랜잭션 기반 | 자동 | 없음 |

### "운영자가 카테고리 1개를 만들 수 있는가?"

**YES — 3가지 방법 가능:**

1. **사용자 요청 → 운영자 승인** (권장 워크플로)
   - 사용자: `/forum/request-category`에서 요청 제출
   - 운영자: `/operator/forum-requests`에서 승인 → 자동 생성

2. **관리자 API 직접 호출**
   ```
   POST /api/v1/forum/categories
   { "name": "당뇨 관리 팁", "description": "...", "isActive": true }
   ```

3. **운영자 포럼 관리 페이지** (부분 구현 — Mock 데이터)
   - 페이지: `/operator/forum-management`
   - 현재 상태: UI 존재하나 Mock 데이터 사용 → 백엔드 연동 시 즉시 사용 가능

---

## 5. 최종 결론

### 5.1 장애 사항

| 질문 | 답변 | 장애 |
|------|------|------|
| 당뇨인용 + 약국용 가이드라인을 초기 콘텐츠형으로 만드는 데 장애가 있는가? | **없음** | 당뇨인용은 이미 완성. 약국용은 동일 패턴으로 즉시 생성 가능 |
| 운영자가 두 가이드라인을 직접 수정하는 구조로 전환 가능한가? | **가능** | CMS `guide` 타입 + `@o4o/content-editor` + 운영자 편집 UI 신규 개발로 전환 |
| GlycoPharm 커뮤니티에 포럼 카테고리 1개를 추가할 수 있는가? | **가능** | API(직접 생성) 또는 요청→승인 워크플로 모두 작동 |

### 5.2 다음 단계 WO 순서

| 순서 | WO 명칭 (제안) | 범위 | 난이도 |
|:----:|---------------|------|:------:|
| **1** | WO-GLYCOPHARM-PHARMACIST-GUIDELINE-V1 | 약국용 가이드라인 정적 페이지 생성 + 라우트 + 내비게이션 | 낮음 |
| **2** | WO-GLYCOPHARM-FORUM-CATEGORY-SEED-V1 | 포럼 카테고리 1개 추가 (API 직접 호출 또는 승인 워크플로 연동) | 낮음 |
| **3** | WO-GLYCOPHARM-GUIDELINE-CMS-MIGRATION-V1 | 정적 가이드라인 → CMS `guide` 타입 전환 + 운영자 편집 페이지 | 중간 |
| **4** | WO-GLYCOPHARM-GUIDELINE-FORUM-LINKAGE-V1 | 포럼 피드백 → 가이드라인 수정 운영 프로세스 연결 (선택적) | 낮음 |

**1→2는 즉시 실행 가능** (정적 콘텐츠 + API 호출).
3은 운영 필요성이 확인된 후 실행.
4는 커뮤니티가 활성화된 후 운영 판단으로 결정.

---

## 부록: 관련 파일 위치

### 가이드라인
- `services/web-glycopharm/src/pages/patient/CareGuidelinePage.tsx`
- `services/web-glucoseview/src/pages/patient/CareGuidelinePage.tsx`

### CMS
- `packages/cms-core/src/entities/CmsContent.entity.ts` — 엔티티 (type: 'guide' 포함)
- `apps/api-server/src/routes/cms-content/cms-content.routes.ts` — CRUD API
- `packages/content-editor/` — TipTap Rich Text 에디터

### 포럼
- `packages/forum-core/src/backend/entities/ForumCategory.ts` — 카테고리 엔티티
- `apps/api-server/src/controllers/forum/ForumCategoryController.ts` — 카테고리 CRUD
- `apps/api-server/src/services/forum/ForumCategoryRequestService.ts` — 요청/승인 서비스
- `services/web-glycopharm/src/pages/forum/RequestCategoryPage.tsx` — 사용자 요청 UI
- `services/web-glycopharm/src/pages/operator/forum-management/OperatorForumManagementPage.tsx` — 운영자 관리 UI

### 운영자 콘텐츠 관리 참조 패턴
- `services/web-kpa-society/src/pages/operator/ContentManagementPage.tsx`
- `services/web-neture/src/pages/operator/HomepageCmsPage.tsx`

---

*Generated: 2026-03-22*
*Status: Complete*
