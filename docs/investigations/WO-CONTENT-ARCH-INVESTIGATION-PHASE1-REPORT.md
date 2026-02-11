# WO-CONTENT-ARCH-INVESTIGATION-PHASE1 결과 보고서

> **조사 일시**: 2026-02-11
> **조사 범위**: Content / LMS / Quiz / Access Policy / Payment / Signage
> **조사 원칙**: 코드 수정 금지, 구조 변경 금지, 사실 기반 조사만 수행

---

## 1. Entity 맵

### A. Content 관련 Entity (CMS Core — Frozen)

| Entity | Table | Org-Scoped | Service-Scoped | Status | Type | 비고 |
|--------|-------|:----------:|:--------------:|:------:|:----:|------|
| **CmsContent** | `cms_contents` | ✓ | ✓ (serviceKey) | draft/published/archived | hero/notice/news/featured/promo/event | 핵심 콘텐츠 |
| **CmsContentSlot** | `cms_content_slots` | ✓ | ✓ | isActive | slotKey | 콘텐츠 배치+잠금 |
| **CmsMedia** | `cms_media` | ✓ | — | isActive | image/video/audio/document | 디지털 자산 |
| **CmsMediaFile** | `cms_media_files` | — | — | isActive | variant | 파일 변형(thumb/webp) |
| **CmsMediaFolder** | `cms_media_folders` | ✓ | — | — | — | 폴더 구조 |
| **CmsMediaTag** | `cms_media_tags` | — | — | — | — | 미디어 태깅 |
| **CmsCptType** | `cms_cpt_types` | ✓ | — | isActive | — | Custom Post Type 정의 |
| **CmsCptField** | `cms_cpt_fields` | — | — | isActive | text/select/file... | CPT 필드 정의 |
| **CmsTemplate** | `cms_templates` | ✓ | — | isActive | page/post/archive/single | 템플릿 |
| **CmsTemplatePart** | `cms_template_parts` | — | — | — | — | 템플릿 블록 |
| **CmsView** | `cms_views` | ✓ | — | isActive | list/grid/detail | 뷰 설정 |
| **CmsMenu** | `cms_menus` | ✓ | — | isActive | — | 메뉴 |
| **CmsMenuItem** | `cms_menu_items` | — | — | — | — | 메뉴 항목 |
| **CmsMenuLocation** | `cms_menu_locations` | — | — | — | — | 메뉴 위치 |
| **CmsSetting** | `cms_settings` | — | — | — | — | CMS 설정 |
| **CmsAcfFieldGroup** | `cms_acf_field_groups` | — | — | — | — | ACF 그룹 |
| **CmsAcfField** | `cms_acf_fields` | — | — | — | — | ACF 필드 |
| **CmsAcfValue** | `cms_acf_values` | — | — | — | — | ACF 값 |

**Application Layer**:

| Entity | Table | 비고 |
|--------|-------|------|
| **CustomPost** | `custom_posts` | CPT 인스턴스 (slug, status, fields, content) |
| **CustomPostType** | `cms_cpt_types` | backward-compat 재export |
| **CustomField** | `cms_fields` | 필드 정의 |
| **Page** | `cms_pages` | 페이지 관리 (version history 포함) |
| **ReusableBlock** | `reusable_blocks` | 재사용 블록 (visibility: private/public/organization) |
| **CmsContentRecommendation** | `cms_content_recommendations` | 추천(좋아요) — unique(contentId, userId) |
| **ContentUsageLog** | `content_usage_logs` | 재생 분석 (PLAY_START/END 등) |

**Query Service**: `ContentQueryService` (`modules/content/content-query.service.ts`)
- listPublished, listFeatured, getById, toggleRecommendation, incrementViewCount
- serviceKey 기반 스코핑, 정렬: latest/featured/views

**Type 정의**: `@o4o/types/content` — ContentType, ContentSortType, ContentSourceType, ContentStatus + 한국어 라벨

---

### B. LMS 관련 Entity (lms-core — 14 테이블)

| Entity | Table | 핵심 컬럼 | 비고 |
|--------|-------|-----------|------|
| **Course** | `lms_courses` | title, level, status, duration, credits, instructorId, organizationId, isOrganizationExclusive, requiresApproval, maxEnrollments | 강의 |
| **Lesson** | `lms_lessons` | courseId, type(VIDEO/ARTICLE/QUIZ/ASSIGNMENT/LIVE), content(JSONB), videoUrl, quizData, order, isFree | 레슨 |
| **Enrollment** | `lms_enrollments` | userId, courseId, status(PENDING/IN_PROGRESS/COMPLETED/CANCELLED/EXPIRED), progressPercentage, certificateId | 수강등록 |
| **Progress** | `lms_progress` | enrollmentId, lessonId, status, timeSpent, completionPercentage, score, quizAnswers | 학습진도 |
| **Certificate** | `lms_certificates` | userId, courseId, certificateNumber(CERT-TIMESTAMP-RANDOM), credits, isValid, expiresAt | 수료증 |
| **LMSEvent** | `lms_events` | courseId, type(LECTURE/WORKSHOP/EXAM/WEBINAR), startAt, endAt, onlineUrl, attendanceCode, maxAttendees | 이벤트 |
| **Attendance** | `lms_attendance` | eventId, userId, status(PRESENT/LATE/ABSENT/EXCUSED), usedCode, geoLocation | 출석 |
| **ContentBundle** | `lms_content_bundles` | type(EDUCATION/PRODUCT/CAMPAIGN/INFO/MARKETING), contentItems(JSONB), organizationId | 범용 콘텐츠 컨테이너 |
| **Quiz** | `lms_quizzes` | questions(JSONB), passingScore, timeLimit, maxAttempts, bundleId?, courseId? | 퀴즈 정의 |
| **QuizAttempt** | `lms_quiz_attempts` | quizId, userId, answers(JSONB), score, earnedPoints, passed, attemptNumber | 퀴즈 시도 |
| **Survey** | `lms_surveys` | status, allowAnonymous, allowMultipleResponses, maxResponses, bundleId? | 설문 |
| **SurveyQuestion** | `lms_survey_questions` | surveyId, type(SINGLE/MULTI/TEXT/RATING/SCALE/DATE/NUMBER), options(JSONB), conditionalDisplay | 설문문항 |
| **SurveyResponse** | `lms_survey_responses` | surveyId, userId?, answers(JSONB), status, isAnonymous | 설문응답 |
| **EngagementLog** | `lms_engagement_logs` | userId, bundleId?, lessonId?, event(VIEW/CLICK/QUIZ_SUBMIT/...), metadata | 참여 로그 |

**핵심 구조**:
- Course → Lesson (1:N, ordered)
- Course → Enrollment → Progress (per-lesson)
- Enrollment → Certificate (completion 시 발급)
- Course → LMSEvent → Attendance
- Quiz는 **독립** 또는 **Course에 종속** 가능 (courseId nullable)
- ContentBundle은 **범용 컨테이너** (교육/마케팅/캠페인 모두 지원)

---

### C. Quiz 관련 Entity

#### Core (lms-core)

| Entity | Table | Quiz 종속? | Score 저장 | 비고 |
|--------|-------|:----------:|:----------:|------|
| **Quiz** | `lms_quizzes` | courseId(optional), bundleId(optional) | — | 퀴즈 정의, questions는 JSONB 내장 |
| **QuizAttempt** | `lms_quiz_attempts` | quizId FK | score(%), earnedPoints, totalPoints, passed | 시도 기록 |

#### Marketing (lms-marketing)

| Entity | Table | 비고 |
|--------|-------|------|
| **QuizCampaign** | `lms_marketing_quiz_campaigns` | 마케팅 래퍼 — Core Quiz ID만 참조 (중복 없음) |
| **SurveyCampaign** | `lms_marketing_survey_campaigns` | 설문 캠페인 래퍼 |
| **ProductContent** | `lms_marketing_product_contents` | 제품 콘텐츠 배포 |

**Quiz vs Survey 구분**:
| 항목 | Quiz | Survey |
|------|------|--------|
| 채점 | ✓ (score/passed) | ✗ |
| 시간제한 | ✓ | ✗ |
| 익명 | ✗ | ✓ |
| 문항 저장 | JSONB 내장 | 별도 테이블 |
| 문항 타입 | single/multi/text (3종) | 7종 (+ rating/scale/date/number) |

**마케팅 Quiz vs 교육 Quiz**: Campaign 래퍼 유무로 구분. Core Quiz 엔진 공유.

---

### D. Access Policy 관련

**정의 위치**: `packages/types/src/auth/permissions.ts` (SSOT)

**접근 제어 계층**:

```
1. Authentication (로그인 여부)
   ↓
2. RBAC (Role-Based Access Control)
   - Permission Middleware: requirePermission, requireRole, requireAdmin
   - RoleAssignment 엔티티: isActive + validFrom/validUntil 시간 기반
   ↓
3. Organization/Service Scope
   - serviceKey 필터링 (glycopharm, kpa, glucoseview...)
   - organizationId 필터링 (조직 범위 제한)
   ↓
4. Publication Status
   - status = 'published' 필수 (공개 API)
   - publishedAt/expiresAt 시간 기반
   ↓
5. Course 전용 규칙
   - Enrollment 여부
   - requiresApproval → PENDING 상태
   - isOrganizationExclusive → 조직 한정
```

**핵심 발견**:
- ❌ **Quiz 전용 접근 제어 없음** — 엔티티/미들웨어 모두 부재
- ❌ **Lesson 단위 접근 제어 없음** — Course 접근 상속
- ❌ **유료 콘텐츠 게이트 없음** — isPaid/price 필드 부재
- ❌ **구독(Subscription) 엔티티 없음**
- ❌ **콘텐츠 만료 로직 미구현** — expiresAt 필드 존재하나 쿼리에서 체크 불확실

---

### E. 결제 연동

**결론: Content/Learning과 결제 연동 = ZERO**

**E-commerce Core (Frozen)**:
- `EcommerceOrder` — OrderType: RETAIL, DROPSHIPPING, B2B, SUBSCRIPTION, GLYCOPHARM
- ❌ `LEARNING`, `COURSE`, `EDUCATION`, `CONTENT` OrderType **없음**
- Payment Events (PAYMENT_COMPLETED 등) → LMS가 **구독하지 않음**

**현재 결제 적용 서비스**:
| 서비스 | OrderType | 상태 |
|--------|-----------|------|
| GlycoPharm | GLYCOPHARM | ✅ 활성 |
| Cosmetics | 독립 스키마 (cosmetics_*) | ✅ 활성 |
| Dropshipping | DROPSHIPPING | ✅ 활성 |
| Tourism | TOURISM (계획) | 🚧 미구현 |
| **LMS/Content** | **없음** | ❌ 무결제 |

**Course/Enrollment에 결제 필드 없음**: price, isPaid, orderId, paymentStatus 모두 부재.
**현재 모델**: 모든 학습/과정은 **무료**, 조직 역할 기반 접근만 존재.

---

### F. Signage 소비 구조

**핵심 결론: Signage는 완전히 독립된 미디어 시스템**

#### Signage Entity 목록 (digital-signage-core)

| Entity | Table | 비고 |
|--------|-------|------|
| **SignageMedia** | `signage_media` | 독립 미디어 (video/image/html/text/rich_text/link) |
| **SignageMediaTag** | `signage_media_tags` | 미디어 태그 |
| **SignagePlaylist** | `signage_playlists` | 플레이리스트 컨테이너 |
| **SignagePlaylistItem** | `signage_playlist_items` | 순서 지정 아이템 (isForced 플래그 포함) |
| **SignageSchedule** | `signage_schedules` | 시간 기반 스케줄 |
| **SignageTemplate** | `signage_templates` | 레이아웃 템플릿 |
| **SignageTemplateZone** | `signage_template_zones` | 템플릿 영역 |
| **SignageLayoutPreset** | `signage_layout_presets` | 레이아웃 프리셋 |
| **SignageContentBlock** | `signage_content_blocks` | 재사용 콘텐츠 블록 |
| **SignagePlaylistShare** | `signage_playlist_shares` | 조직 간 공유 |

**핵심 답변**:

| 질문 | 답변 |
|------|------|
| 영상 콘텐츠를 Signage가 직접 참조? | ❌ 자체 `signage_media` 테이블 사용, Content Core FK 없음 |
| 변환/가공 로직 존재? | ❌ 패스스루 — URL 직접 저장 |
| 강의 영상 = 사이니지 영상? | ❌ 완전 별도 시스템 |
| Signage exposure 설정? | ✓ 다층: source(hq/supplier/community/store) + scope(global/store) + isForced |

**Global Content 모델 (Sprint 2-6)**:
- `source`: hq(본사) / supplier(공급자) / community(커뮤니티) / store(매장)
- `scope`: global(전체 공개) / store(매장 한정)
- `parentMediaId`/`parentPlaylistId`: 복제 추적
- `isForced`: 본사 콘텐츠 강제 삽입 (운영자 수정 불가)

---

## 2. 구조 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                        O4O Platform                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────┐│
│  │   CMS Core       │   │   LMS Core       │   │  Signage     ││
│  │   (Frozen)       │   │   (14 tables)    │   │  Core        ││
│  ├──────────────────┤   ├──────────────────┤   ├──────────────┤│
│  │ CmsContent       │   │ Course           │   │ SignageMedia  ││
│  │ CmsContentSlot   │   │ Lesson           │   │ SignagePlay-  ││
│  │ CmsMedia         │   │ Enrollment       │   │  list         ││
│  │ CmsMediaFile     │   │ Progress         │   │ SignagePlay-  ││
│  │ CmsCptType       │   │ Certificate      │   │  listItem     ││
│  │ CmsCptField      │   │ LMSEvent         │   │ SignageSche-  ││
│  │ CmsTemplate      │   │ Attendance       │   │  dule         ││
│  │ CmsView          │   │ ContentBundle    │   │ SignageTem-   ││
│  │ CmsMenu          │   │ Quiz             │   │  plate        ││
│  │ ...              │   │ QuizAttempt      │   │ ...           ││
│  └──────┬───────────┘   │ Survey           │   └──────────────┘│
│         │               │ SurveyQuestion   │         ↑          │
│    ContentQuery-        │ SurveyResponse   │    SignageQuery-   │
│    Service              │ EngagementLog    │    Service         │
│    (serviceKey)         └──────┬───────────┘    (serviceKey)   │
│         │                      │                     │          │
│         │  ┌───────────────────┘                     │          │
│         │  │                                         │          │
│  ┌──────┴──┴──────────────────────────────────────┬──┘          │
│  │              Access Control Layer              │             │
│  ├────────────────────────────────────────────────┤             │
│  │ Permission Middleware (RBAC)                   │             │
│  │ Organization Scope (serviceKey + orgId)        │             │
│  │ Publication Status (published/draft/archived)  │             │
│  │ Enrollment Guard (LMS only)                    │             │
│  └────────────────────────────────────────────────┘             │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │           E-commerce Core (Frozen)                │           │
│  ├──────────────────────────────────────────────────┤           │
│  │ EcommerceOrder (RETAIL/DROPSHIPPING/B2B/SUB/GP)  │           │
│  │ CheckoutService                                   │           │
│  │ ❌ Learning/Content OrderType = 없음              │           │
│  │ ❌ LMS ↔ Payment 연동 = 없음                     │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │           LMS Marketing Extension                 │           │
│  ├──────────────────────────────────────────────────┤           │
│  │ QuizCampaign (Core Quiz ID 참조만)               │           │
│  │ SurveyCampaign (Core Survey ID 참조만)            │           │
│  │ ProductContent (ContentBundle 참조)               │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

**핵심**: CMS Core, LMS Core, Signage Core는 **서로 FK 없이 완전 독립**.

---

## 3. 중복 및 충돌 지점

### 3.1 미디어 저장 3중화

| 시스템 | 테이블 | 용도 |
|--------|--------|------|
| CMS Core | `cms_media` + `cms_media_files` | 디지털 자산 관리 (이미지, 문서) |
| Signage Core | `signage_media` | 사이니지 영상/이미지 |
| LMS Core | Lesson.videoUrl (필드) | 강의 영상 URL 직접 저장 |

→ **동일 영상이 3곳에 중복 저장 가능** (URL만 같고 레코드는 별도)

### 3.2 콘텐츠 타입 분산

| 위치 | 타입 구분 방식 |
|------|---------------|
| CmsContent.type | 'hero'/'notice'/'news'/'featured'/'promo'/'event' |
| ContentBundle.type | 'EDUCATION'/'PRODUCT'/'CAMPAIGN'/'INFO'/'MARKETING' |
| SignageMedia.mediaType | 'video'/'image'/'html'/'text'/'rich_text'/'link' |
| Lesson.type | 'VIDEO'/'ARTICLE'/'QUIZ'/'ASSIGNMENT'/'LIVE' |

→ **콘텐츠 타입 분류 체계가 시스템마다 독립**, 통합 검색/분류 불가

### 3.3 Quiz 문항 저장 이원화

| 방식 | 위치 | 특성 |
|------|------|------|
| JSONB 내장 | Quiz.questions, Lesson.quizData | 문항 재사용 불가, 간편 |
| 별도 테이블 | SurveyQuestion | 문항 독립 관리 가능 |

→ Quiz는 JSONB, Survey는 별도 테이블 — **일관성 없음**

### 3.4 접근 정책 분산

| 정책 유형 | 위치 | 비고 |
|-----------|------|------|
| RBAC | `permission.middleware.ts` | 전역 |
| Content 가시성 | CmsContent.status + serviceKey | 콘텐츠별 |
| Course 접근 | Enrollment 기반 | 수강등록 필수 |
| Forum 접근 | ForumQueryService scope | community/organization |
| Signage 접근 | Extension Guards | 서비스별 역할 |

→ **접근 정책이 5곳에 분산**, 통합 정책 부재

### 3.5 조직 스코핑 불일치

| 엔티티 | 스코핑 방식 |
|--------|------------|
| CmsContent | serviceKey + organizationId (둘 다 nullable) |
| Course | organizationId (nullable) + isOrganizationExclusive |
| SignageMedia | serviceKey + organizationId + source + scope |
| ForumPost | organization_id (nullable, community vs org) |

→ **조직 범위 제한 방식이 시스템마다 다름**

---

## 4. Core 후보 (잠정)

현재 구조에서 Core 승격 가능해 보이는 영역:

### 4.1 확정 Core (이미 Frozen)

- ✅ CMS Core (`packages/cms-core`) — 콘텐츠 관리
- ✅ LMS Core (`packages/lms-core`) — 학습 관리
- ✅ E-commerce Core (`packages/ecommerce-core`) — 주문/결제
- ✅ Signage Core (`packages/digital-signage-core`) — 사이니지

### 4.2 잠정 Core 후보

| 후보 | 현재 위치 | 이유 |
|------|-----------|------|
| **Media Core** | CMS Core + Signage Core + Lesson 분산 | 미디어 3중화 해소, 단일 미디어 참조 체계 필요 |
| **Access Policy Core** | middleware + 각 QueryService 분산 | 접근 정책 통합 관리, 유료 콘텐츠 게이트 대비 |
| **Organization Scope Core** | 각 엔티티 개별 구현 | serviceKey + organizationId 스코핑 표준화 |

### 4.3 확장(Extension) 후보

| 후보 | 현재 위치 | 이유 |
|------|-----------|------|
| **LMS-Marketing** | `packages/lms-marketing` | 이미 Extension 구조 (Campaign 래퍼) |
| **Quiz Engine** | LMS Core 내장 | 독립 분리 시 교육/마케팅 모두 활용 가능 |
| **Certificate Engine** | LMS Core 내장 | 범용 인증서 발급 (교육 외 활용 가능) |

---

## 5. Phase 종료 조건 점검

| 조건 | 상태 | 비고 |
|------|:----:|------|
| Entity 구조 전수 파악 | ✅ | CMS 18+ / LMS 14 / Signage 10+ / Quiz 5 |
| 접근 정책 위치 확인 | ✅ | 5곳 분산 확인 |
| Quiz–Course 관계 명확화 | ✅ | courseId nullable — 독립/종속 모두 가능 |
| Payment 연결 위치 확인 | ✅ | Learning/Content ↔ Payment = 없음 |
| Signage 소비 방식 확인 | ✅ | 독립 미디어 시스템, Content Core FK 없음 |

---

## 6. 다음 단계 권고

**Phase2: WO-CONTENT-ARCH-INVESTIGATION-PHASE2 (경계 재정의 분석)**

분석 대상:
1. Media 단일화 가능성 (CMS Media + Signage Media + Lesson video)
2. Access Policy 통합 설계
3. 유료 콘텐츠/구독 모델 도입 시 아키텍처 영향
4. Quiz 문항 저장 표준화 (JSONB vs 별도 테이블)
5. Organization Scope 패턴 표준화

---

*Generated: 2026-02-11*
*Status: Phase 1 Complete — 코드 수정 없음*
