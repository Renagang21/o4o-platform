# IR-O4O-LMS-STORE-LIBRARY-INTEGRATION-V1

**조사 일자**: 2026-05-09
**조사 기준**: main (`a40c46e81` 시점, sync 완료)
**조사 범위**: LMS 강의 → "내 자료함(Store Library) → 콘텐츠" 가져오기 canonical 구조 / 강의 활용 허용 정책 / Full Copy vs Reference Metadata 결정 / POP·QR·블로그·상품 상세설명 연계 흐름
**조사자**: Claude Opus 4.7 (코드 수정 없음, 정적 분석)

---

## 0. 핵심 결론 (TL;DR)

> **LMS 강의는 현재 "내 자료함" 어디에도 source로 등록되어 있지 않다.** Asset snapshot 시스템(`o4o_asset_snapshots`)은 `assetType: 'cms' | 'signage'` 두 가지만 지원하며, KPA 메뉴 코드에는 명시적으로 *"강좌/레슨형 콘텐츠는 콘텐츠 항목 내부에서 type 표시만, 별도 그룹 금지"* 라는 design intent가 코멘트로 고정되어 있다([storeMenuConfig.ts:212](packages/store-ui-core/src/config/storeMenuConfig.ts#L212)). 즉 **목표는 "강의 항목을 별도 메뉴로 두지 않고, 자료함의 'library-contents' 안에 `assetType='lesson'`(또는 `'course'`)로 노출하는 것"**이다.
>
> **권장 방향**: **C-Reference Metadata 방식 + 강의 자체에 `reusable_policy` 컬럼 추가**.
> Full Copy(현재 CMS/Signage 방식)는 LMS에 부적합 — 강의는 lesson 다수·동영상 URL·수강 권한이 동적이라 시점-고정 복사가 의미를 잃는다. 대신 lightweight metadata snapshot(courseId, title, thumbnail, lessonCount, instructor, summary, publicUrl)을 저장하고 **읽기 시점에 원본 visibility/존재여부를 검증**한다.

**핵심 사실**:

1. **LMS 백엔드는 단일 모듈** ([apps/api-server/src/modules/lms](apps/api-server/src/modules/lms))로 KPA/GlycoPharm/K-Cosmetics가 공유. `lms_courses`는 `visibility('public'|'members')` + `status('draft'|'pending_review'|'published'|'archived')` + `content_kind('lecture'|'content_resource')` 3축으로 이미 분류됨.
2. **`content_kind = 'content_resource'` 컬럼이 이미 존재**([20260906000000-AddContentKindToLmsCourses.ts](apps/api-server/src/database/migrations/20260906000000-AddContentKindToLmsCourses.ts)) — "콘텐츠 자원형 강의"라는 개념이 entity 수준에서 인정되어 있다. 이는 store library 노출 후보의 1차 필터로 활용 가능.
3. **Store Library는 두 개의 분리된 시스템**:
   - `o4o_asset_snapshots` (Full Copy, jsonb `content_json`) — community/HUB CMS·Signage 가져오기
   - `store_execution_assets` (file/content/external-link) — 매장 직접 업로드
   현재 둘 다 LMS course/lesson을 source로 받지 않는다.
4. **재사용 허용 정책 컬럼 부재** — `lms_courses`에 `allowReuse`, `allow_copy`, `reusable_policy` 같은 컬럼 없음. 현재 `visibility`(public/members)는 *수강 접근성*이지 *재사용 허용*이 아니다. 두 축은 분리되어야 한다.
5. **POP / QR / 상품 상세설명 흐름은 LMS 미연동** — `landingType: 'product' | 'page' | 'link'`(lesson 미지원), `ProductAiContent.contentType: 'product_description' | 'pop_short' | 'pop_long' | 'qr_description' | 'signage_text'`(lesson 미포함)([store-ai/entities/product-ai-content.entity.ts](apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts)). 신규 wiring 필요.
6. **Phase 1 권장 산출물 = 5가지** ① `lms_courses.reusable_policy` 컬럼 추가 ② asset-snapshot resolver에 `LmsCourseAssetResolver` 추가 ③ assetType union에 `'lesson'` 추가 ④ StoreLibraryContentsPage에 type 필터 확장 ⑤ "강의 가져가기" 액션을 LMS 리스트 row에 추가.

---

## 1. 현재 LMS 강의 구조 조사

### 1.1 핵심 엔티티 (DB Schema)

[20260410000001-CreateLmsCoreTables.ts](apps/api-server/src/database/migrations/20260410000001-CreateLmsCoreTables.ts) + 후속 ALTER 마이그레이션 6건 기준:

| 테이블 | 핵심 컬럼 | 비고 |
|--------|----------|------|
| `lms_courses` | `id`, `title`, `description`, `thumbnail`, `instructorId`, `organizationId`, `status`(draft/pending_review/published/archived), `visibility`(public/members), `isPaid`, `price`, `content_kind`(lecture/content_resource), `tags`, `publishedAt` | **소유 도메인: Core** |
| `lms_lessons` | `id`, `courseId`(FK), `title`, `type`(article/video/quiz/assignment/live), `content`(JSONB), `videoUrl`, `videoDuration`, `order`, `duration`, `isFree`, `requiresCompletion` | Core |
| `lms_enrollments` | `userId`, `courseId`, `status`(pending/active/completed/failed), `progressPercentage`, `completedLessons`, `enrolledAt` | Extension |
| `lms_progress` | `enrollmentId`, `lessonId`, `status`, `timeSpent`, `completionPercentage`, `attempts`, `quizAnswers`(JSONB) | Extension |
| `lms_certificates` | `userId`, `courseId`, `certificateNumber`, `verificationCode` | Extension |

### 1.2 Lesson Type / Content Kind

**Lesson Type**: `article` (기본) / `video` / `quiz` / `assignment` / `live`
**Content Kind**: `lecture` (기본, 일반 수강형) / `content_resource` (콘텐츠 자원형) — *후자가 store library 후보의 1차 필터 후보*

### 1.3 공개 / 가시성 / 승인 흐름

| 축 | 값 | 의미 |
|----|----|------|
| `status` | draft → pending_review → published → archived | 작성 lifecycle. KPA는 `kpaLmsScopeGuard`가 published 진입 검증 |
| `visibility` | public / members(default) | **수강 접근성** (인증 필요 여부) |
| `isPaid` | boolean | 유료 강의 여부 (price와 함께) |
| `content_kind` | lecture / content_resource | **콘텐츠 활용 분류** (학습형 vs 자원형) |

### 1.4 강의 상세 Canonical Route

| 서비스 | 학습자 | 강사 |
|--------|--------|------|
| KPA-Society | `/lms`, `/lms/courses`, `/lms/course/:id`, `/lms/course/:courseId/lesson/:lessonId` | `/instructor/courses`, `/instructor/courses/:id` |
| K-Cosmetics | 동일 패턴 (`/lms/course/:id`) | 동일 |
| GlycoPharm | 부분 적용 (`/operator/LmsCoursesPage.tsx`) | 부분 |

### 1.5 인증 정책

| 대상 | 인증 |
|------|:----:|
| 공개 강의 목록 | ❌ (visibility=public 필터) |
| 강의 상세 | visibility=public이면 ❌, members면 ✅ |
| Lesson 본문 직접 접근 | ✅ enrollment 검증 필수 |
| 수강 신청 | ✅ |

### 1.6 강의 삭제 / 비공개 전환의 영향 범위

- 현재 enrollment, progress, certificate가 강의 삭제 시 어떻게 처리되는지 ON DELETE 정책 명시 부재 (확인 필요).
- **store library가 LMS를 reference하면 동일 문제 발생** — 강의 archived/deleted 시 store library item의 fallback 정책이 신규 필요.

---

## 2. 현재 "내 자료함 → 콘텐츠" 구조 조사

### 2.1 메뉴 진입점

[storeMenuConfig.ts:213-216](packages/store-ui-core/src/config/storeMenuConfig.ts#L213-L216):

```
내 자료함
  ├── library-contents  → /library/contents  (콘텐츠 = snapshot 기반)
  └── library-resources → /library/resources (자료 = 직접 업로드)
```

**메뉴 코멘트**(`storeMenuConfig.ts:210-212`)가 design intent를 명시:
> *"매장이 커뮤니티/공급자에서 가져와 보유한 source/reference 보관함. 제작 시작(POP/QR/블로그/상품 상세설명)은 본 그룹에서만 진입. (강좌/레슨형 콘텐츠는 콘텐츠 항목 내부에서 type 표시만, 별도 그룹 금지)"*

→ **canonical 방향이 이미 코드에 박혀 있음**: LMS 강의는 `library-contents` 안에 type=lesson으로 들어가야 하며 `library-lessons` 같은 신규 메뉴를 만들면 안 된다.

### 2.2 Store Library 스토리지 구조

| 시스템 | 용도 | 저장 방식 |
|--------|------|----------|
| `o4o_asset_snapshots` | community / HUB에서 **가져와 보관**하는 콘텐츠 | **FULL COPY** (jsonb `content_json`) |
| `kpa_store_asset_controls` | snapshot의 게시/lifecycle/snapshot_type 제어 | snapshot FK + policy 메타 |
| `store_execution_assets` | 매장이 **직접 업로드**한 file/content/external-link | URL/메타만 |

[20260216000001-CreateO4oAssetSnapshots.ts](apps/api-server/src/database/migrations/20260216000001-CreateO4oAssetSnapshots.ts) 컬럼:

| 컬럼 | 타입 | 비고 |
|------|------|------|
| `id` | UUID | PK |
| `organization_id` | UUID | 멀티테넌트 |
| `source_service` | varchar(50) | `kpa` / `neture` |
| `source_asset_id` | UUID | 원본 asset ID (FK 아님 = soft reference) |
| `asset_type` | varchar(20) | **현재: `cms` / `signage` 만** |
| `title` | text | |
| `content_json` | jsonb | **전체 스냅샷** |
| `created_by` | UUID | 복사 사용자 |

[kpa_store_asset_controls](apps/api-server/src/database/migrations/20260219000001-CreateKpaStoreAssetControls.ts) + V2/V3 ALTER:

| 컬럼 | 값 | 비고 |
|------|----|------|
| `publish_status` | draft / published / hidden | |
| `snapshot_type` | user_copy / hq_forced / campaign_push / template_seed | V3 추가 |
| `lifecycle_status` | active / expired / archived | V3 추가 |
| `is_locked` | boolean | 매장 수정 불가 (HQ 강제 시) |

### 2.3 Resolver 패턴

[packages/asset-copy-core/src/](packages/asset-copy-core/src/) — `AssetCopyService.copyWithResolver()`가 source service별 resolver를 호출:
- `KpaAssetResolver` — `cms_contents` / `signage_media` 조회
- `NetureAssetResolver` — `signage_media` 조회

→ **LmsCourseAssetResolver** 추가 시 동일 패턴 확장 가능.

### 2.4 현재 COPY vs LINK 정책

**현재**: **FULL COPY**. 원본 수정 시 동기화 없음. 중복 방지(`{organizationId, sourceAssetId, assetType}` unique).
**Orphan handling**: 원본 삭제 시 snapshot은 유지 — 단 resolver null 반환 시 신규 copy는 실패.
**Visibility check**: source의 publish 상태 검증 로직 **없음** (현재 약점).

---

## 3. LMS 강의 가져가기 UX 조사

### 3.1 현재 LMS 리스트(`/lms/courses`) 액션 슬롯

[LmsCoursesPage.tsx (KPA)](services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx) 기준:

| 액션 슬롯 | 존재 | 비고 |
|----------|:----:|------|
| 수강하기 (CTA) | ✅ | 메인 액션 |
| Row action (편집/발행/삭제) | ✅ | 강사 대시보드(`/instructor/courses`)에만 |
| Dropdown menu | ❌ | 학습자 리스트는 단순 카드 |
| Detail drawer | ❌ | 클릭 시 `/lms/course/:id` 페이지 이동 |
| 모바일 대응 | 부분 | maxWidth: 900px 고정 |

### 3.2 강의 상세 페이지 액션 가능 여부

[LmsCourseDetailPage.tsx](services/web-kpa-society/src/pages/lms/LmsCourseDetailPage.tsx):
- 미수강: "수강하기" 버튼
- 수강 중: "계속 학습"
- 수강 완료: "인증서 보기"
- **신규 슬롯 추가 여지 있음** — "내 자료함에 추가" 버튼을 헤더 우측 또는 footer에 노출 가능 (단 `reusable_policy = allowed` 인 강의에만)

### 3.3 이미 가져간 강의 중복 처리

`o4o_asset_snapshots` unique key `{organization_id, source_asset_id, asset_type}`로 자동 차단되며, UX는 두 가지 후보:
- **Option A**: 버튼 disable + "이미 자료함에 있습니다" 메시지
- **Option B**: 버튼 그대로 노출 + 클릭 시 자료함 row로 이동 (read-friendly)

→ 권장: **Option B** (snapshot 탐색 비용 < UX 명확성)

---

## 4. 강의 활용 허용 정책 조사

### 4.1 기존 콘텐츠 도메인의 정책 컬럼 매핑

| 도메인 | 테이블 | 제작주체 | 가시성 | 상태 |
|--------|--------|---------|-------|------|
| CMS | `cms_contents` | `authorRole` | `visibilityScope` (platform/service/organization) | `status` |
| Signage | `signage_media` / `signage_playlists` | `source` (hq/supplier/community/store) | `scope` (global/store) | `status` |
| Supplier Library | `neture_supplier_library_items` | — | `visibility` (personal/service) | — |
| LMS | `lms_courses` | `instructorId` (간접) | `visibility` (public/members) | `status` |

→ **LMS의 `visibility`는 *수강 접근성*이지 *재사용 허용*이 아니다**. 별도 축 신규 컬럼이 필요.

### 4.2 신규 컬럼 후보

| 컬럼명 후보 | 타입 | 값 | 평가 |
|-----------|------|----|------|
| `allow_store_library_usage` | boolean | true/false | 단순. 그러나 향후 "조직 내만 / 플랫폼 전체" 같은 단계 분리 불가 |
| `reusable_policy` | varchar(20) | `restricted` / `organization` / `platform` | **3단계 → CMS의 `visibilityScope` 컨벤션과 일관**. 권장 |

**권장**: `lms_courses.reusable_policy varchar(20) NOT NULL DEFAULT 'restricted'`
- `restricted`: 본인/소속 강의자만 (현재 default)
- `organization`: 동일 organizationId 매장만 가져갈 수 있음
- `platform`: 모든 매장 가져갈 수 있음

### 4.3 Migration 전략

- 기본값 `'restricted'` (보수적) — 기존 강의는 자동으로 자료함 노출 안 됨.
- 강사가 강의 편집 페이지에서 명시적으로 변경.
- 운영자(KPA admin)는 override 가능 (별도 column 또는 `kpa_operator_audit_logs`로 추적).
- Phase 1에서는 `restricted` / `platform` 2단계만 시작, `organization`은 Phase 2로 분할 가능.

### 4.4 향후 유료 강의 대응

- `isPaid = true` 강의는 `reusable_policy = 'platform'`이라도 store library 가져가기 시 별도 검증 필요.
- 후속 결정 사항. 본 IR은 무료 + `content_kind = content_resource` 강의를 1차 타겟으로 권장.

### 4.5 비공개 / 삭제 시 기존 store library item 처리

| 원본 변화 | store library item 정책 |
|----------|------------------------|
| `status` → archived | item은 유지, "원본 보관됨" 표시. POP/QR 신규 제작 차단 |
| `visibility` public → members | item은 유지, public URL fallback 검증 |
| `reusable_policy` platform → restricted | 신규 가져가기 차단, 기존 item은 유지 |
| 강의 삭제 | item은 유지, "원본 삭제됨" 상태로 마킹. 제작 시도 시 차단 |

---

## 5. 강의 가져가기 데이터 구조 조사 (Full Copy vs Reference Metadata)

### 5.1 두 방식 비교

| 항목 | Full Copy (현재 CMS/Signage) | Reference Metadata (권장) |
|------|------------------------------|--------------------------|
| 저장 데이터 | course + lessons + body 전체 | courseId + title + thumbnail + summary + lessonCount + instructorName + publicUrl |
| Storage 증가 | **큼** (강의 1개 = lesson N개 × video URL × content body) | 매우 작음 (~1KB) |
| 원본 수정 동기화 | ❌ (시점-고정) | 읽기 시점 fetch (정확) |
| 원본 삭제 대응 | snapshot 잔존 (orphan) | resolver null → "원본 삭제됨" 표시 |
| 권한/visibility 동적 변화 대응 | ❌ (snapshot은 권한 무시) | ✅ 매 조회 시 검증 |
| 저작권/license 변화 대응 | ❌ | ✅ |
| POP 생성 가능 | ⚠️ snapshot의 정적 텍스트로 생성 | ✅ ProductAiContent + 강의 메타 결합 |
| QR 생성 가능 | ⚠️ snapshot 자체 URL | ✅ `/lms/course/:id` 직접 링크 |
| 블로그 임베드 | ⚠️ 정적 HTML | ✅ live preview card (oEmbed-like) |
| 상품 상세설명 활용 | ⚠️ | ✅ |
| 오프라인 fallback | ✅ | ❌ (네트워크 필요) |

### 5.2 결정 근거

**LMS는 Reference Metadata가 적합한 이유**:

1. **수강 권한이 동적** — Full Copy하면 enrollment 없는 사용자에게 lesson body가 노출되어 비즈니스 모델 침해.
2. **lesson은 다수 + 동영상** — Full Copy의 storage 비용이 CMS 대비 10~100배.
3. **강의 업데이트 빈도 높음** — 강사가 lesson을 추가/수정할 때마다 store snapshot이 stale해짐.
4. **POP/QR/블로그 활용 = 발견(discovery)이 본질** — 매장이 콘텐츠를 *전시*하기 위함이지 *복제*가 목적이 아님.

### 5.3 Reference Metadata 스냅샷 schema 권장안

```typescript
// asset_type = 'lesson' (또는 'course') 일 때 content_json 내부
{
  courseId: string,        // FK to lms_courses
  title: string,
  thumbnail: string | null,
  summary: string,         // description 앞 200자
  lessonCount: number,
  instructorName: string,
  contentKind: 'lecture' | 'content_resource',
  capturedAt: ISO8601,     // snapshot 생성 시각
  publicUrl: string,       // /lms/course/:id 절대경로
  sourceService: 'kpa' | 'neture' | 'glycopharm' | 'k-cosmetics'
}
```

→ 원본 fetch는 read 시점에 LmsCourseAssetResolver가 수행. snapshot은 *최후 fallback* 표시용.

---

## 6. Store 활용 흐름 조사 (POP / QR / 블로그 / 상품 상세설명)

### 6.1 현재 흐름 진입점

| 흐름 | 진입점 | source 종류 (현재) | LMS 강의 source 가능? |
|------|--------|------------------|:--------------------:|
| POP 제작 | [StorePopPage.tsx](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx), [ProductPopBuilderPage.tsx](services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx) | file / content / external-link / product (pop_short, pop_long) | ❌ |
| QR 생성 | [StoreQRPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx) | landingType: product / page / link | ❌ |
| 블로그 글 작성 | [StoreBlogPage.tsx](services/web-kpa-society/src/pages/store/StoreBlogPage.tsx) + [shared-space-ui/blog](packages/shared-space-ui/src/blog/) | text / image / link / list block | ⚠️ link block으로만 |
| 상품 상세설명 | [ProductMarketingPage.tsx](services/web-kpa-society/src/pages/pharmacy/ProductMarketingPage.tsx) | ProductAiContent (product_description) | ❌ |

### 6.2 LMS 강의 활용 시 신규 wiring

| 흐름 | 추가 작업 |
|------|----------|
| **POP** | StorePopPage origin filter에 `'lesson'` 추가, 템플릿: 강의 thumbnail + title + QR(공개URL) + summary |
| **QR** | StoreQRPage `landingType` enum에 `'lesson'` 추가, 또는 `'page'` + `landingTargetUrl = /lms/course/:id`로 우회 (단순). 권장: 명시적 `'lesson'` type |
| **블로그** | shared-space-ui에 `LessonCard` block 추가 (preview card 스타일, oEmbed-like). `link` block과 분리 |
| **상품 상세설명** | ProductAiContent.contentType union에 `'lesson_excerpt'` 추가 (Phase 2 권장) |

### 6.3 단순 링크 vs Embed vs Preview Card 비교

| 방식 | 사용처 | 평가 |
|------|--------|------|
| 단순 링크 | 블로그 본문 inline | 빠름, 그러나 클릭 유도 약함 |
| Embed (iframe) | 신규 권장 안 함 | 보안/스타일 충돌 |
| **Preview Card** | POP 썸네일, 블로그 inline, 상품 상세 | **권장** — thumbnail+title+summary+CTA. shared-space-ui에 신규 컴포넌트 추가 |

### 6.4 AI 요약 생성 위치

- ProductAiContent는 productId 기준이므로 직접 재사용 불가.
- 신규 entity 후보: `course_ai_content` (productId 대신 courseId, contentType: `pop_short` / `pop_long` / `qr_description` / `summary`).
- Phase 2 권장. Phase 1은 강의의 기존 description / lesson 첫 문단을 그대로 활용.

---

## 7. Canonical 정책 제안 정리

### 7.1 구조 결정 매트릭스

| 항목 | 결정 |
|------|------|
| 가져가기 방식 | **Reference Metadata** (Full Copy 아님) |
| Snapshot 저장 위치 | `o4o_asset_snapshots` 재사용, `asset_type = 'lesson'` 신규 추가 |
| Store Library Item Type | `'lesson'` (단일, course/lesson 분리 불필요 — UX는 course 단위 표시) |
| 메뉴 위치 | `/library/contents` 안에서 type 필터로 노출 (별도 메뉴 신설 금지) |
| Reusable Policy | `lms_courses.reusable_policy varchar(20) DEFAULT 'restricted'` |
| 공개 변경 대응 | 읽기 시점 resolver가 검증, item은 유지하되 "변경됨" 표시 |
| 삭제 대응 | item 유지, 제작 시도 차단, "원본 삭제됨" 라벨 |
| 유료 강의 대응 | Phase 1에서는 `isPaid=false`만 1차 타겟. 유료 강의는 Phase 2 |
| QR / POP / 블로그 / 상품 활용 | Preview Card 패턴 통일, shared-space-ui에 컴포넌트 추가 |

### 7.2 어휘 정합성

| 잘못된 표현 | 정확한 표현 | 근거 |
|------------|------------|------|
| "강의 자료실" / "library-lessons" | "내 자료함 → 콘텐츠 (type=lesson)" | 메뉴 코멘트가 별도 그룹 금지 명시 |
| "강의 복사" | "강의 메타데이터 가져가기" | Full Copy 아님 |
| "강의 snapshot" | "강의 reference snapshot" | 의도 명확화 |
| "공개 강의" | (가시성=public) vs (재사용=platform) 분리 | 두 축이 다름 |

---

## 8. Gap 분석

| 영역 | 현재 상태 | Canonical 목표 | 신규 설계 필요 |
|------|----------|---------------|----------------|
| LMS-Library 연결 | ❌ 전무 | Reference Metadata 기반 노출 | `LmsCourseAssetResolver` 신규 |
| `asset_type` 확장 | `cms` / `signage` 2종 | `lesson` 추가 | DB constraint + resolver dispatcher |
| 재사용 정책 | LMS에 컬럼 없음 | `reusable_policy` 3단계 | migration + 강의 편집 UI |
| 메뉴 노출 | LibraryContentsPage가 cms만 fetch | type 필터 다중화 | StoreLibraryContentsPage tab/filter 확장 |
| LMS 리스트 row action | "수강하기" 단일 | 학습자: 그대로 / 강사 대시보드: 재사용정책 토글 / 매장운영자: "내 자료함에 추가" | 3개 컴포넌트 변경 |
| POP 생성 source | file/content/external-link | + lesson | StorePopPage origin enum 확장 |
| QR landingType | product/page/link | + lesson | StoreQRPage landingType 확장 |
| 블로그 LessonCard | ❌ | shared-space-ui에 신규 컴포넌트 | 패키지 export 추가 |
| 상품 상세설명 LMS 연결 | ❌ | Phase 2 (선택) | course_ai_content entity |
| 권한/Visibility 동적 검증 | snapshot은 검증 없음 | resolver가 매 조회 시 검증 | resolver 안에 visibility check |
| 원본 삭제/archived 대응 | 없음 | "원본 보관됨/삭제됨" 표시 + 제작 차단 | resolver null 처리 + UI badge |

---

## 9. 최종 판단

### 9.1 옵션 평가

| 옵션 | 설명 | 평가 |
|------|------|------|
| **A. Full Copy** | CMS/Signage와 동일하게 강의 전체 jsonb 복사 | ❌ 비추천. lesson body / video URL / 권한 동적 → snapshot 부적합 |
| **B. 단순 외부 링크** | store library에 `external-link`로만 등록 (별도 type 신설 안 함) | ⚠️ 단기 가능. 그러나 강의 메타(thumbnail/lessonCount/instructor)가 표현되지 않아 UX 빈약 |
| **C. Reference Metadata** | `asset_type='lesson'` + lightweight snapshot + read-time resolver | ✅ **권장** |
| **D. Hybrid (메타+선택적 lesson body 캐시)** | C + 일부 lesson body 캐시 | ⏳ Phase 3 이후. 1차 도입은 과도 |

### 9.2 권장 방향: C (Phase 1)

**Phase 1 (3 WO)**:

1. **`lms_courses.reusable_policy` 컬럼 추가 + 강의 편집 UI 토글** (Migration + Instructor 페이지 변경).
2. **`asset_type='lesson'` 추가 + `LmsCourseAssetResolver` + `o4o_asset_snapshots` constraint 확장** (Resolver 패턴 그대로 따름).
3. **StoreLibraryContentsPage type 필터 확장 + LMS 리스트 row에 "내 자료함에 추가" 액션 추가** (Frontend 2개 변경).

**Phase 2 (2~3 WO)**:

4. POP/QR/블로그 LessonCard wiring (origin enum 확장).
5. 유료 강의 대응 정책 (구매 검증).
6. course_ai_content entity (선택).

### 9.3 KPA 외 서비스 적용 가능성

LMS 백엔드는 단일 모듈이고, 4개 서비스(KPA/Neture/Glyco/K-Cosmetics) 모두 동일 `lms_courses` 테이블을 공유. 따라서 Phase 1 결과는 **Neture 제외 3개 서비스에 동시 적용 가능**(Neture는 LMS 페이지 자체 부재). 단 store library는 KPA가 1차이며 Glyco/Cosmetics 적용은 후속 WO로 분할.

---

## 10. 산출물 및 후속 WO 순서 제안

### 10.1 이 IR이 다루는 산출물

- ✅ LMS 강의 entity / route / 인증 / 공개 정책 매핑
- ✅ Store Library 시스템 (snapshot vs execution_assets) 분리 구조 정리
- ✅ 현재 LMS-Store 연결 부재 사실 확인 + 메뉴 코멘트의 design intent 발견
- ✅ Full Copy vs Reference Metadata 비교 및 권장 결정
- ✅ `reusable_policy` 컬럼 신규 후보 + canonical 명명
- ✅ POP/QR/블로그/상품 상세설명 활용 흐름 매트릭스
- ✅ 어휘 정합성 (별도 메뉴 금지 / Full Copy 어휘 사용 금지)
- ✅ 후속 WO 순서

### 10.2 후속 WO 순서

| 순서 | WO 후보 | 목적 | 의존 |
|:----:|---------|------|------|
| 1 | **WO-O4O-LMS-REUSABLE-POLICY-COLUMN-V1** | `lms_courses.reusable_policy` 컬럼 추가 + 강사 강의 편집 UI 토글 | 없음 |
| 2 | **WO-O4O-ASSET-SNAPSHOT-LESSON-TYPE-V1** | `asset_type='lesson'` 추가 + `LmsCourseAssetResolver` 구현 + read-time visibility 검증 | 1 |
| 3 | **WO-O4O-STORE-LIBRARY-CONTENTS-LESSON-FILTER-V1** | `/library/contents` type 필터 확장(cms+lesson 통합 표시) + 자료 row 클릭 시 강의 detail drawer | 2 |
| 4 | **WO-O4O-LMS-LIST-ADD-TO-LIBRARY-ACTION-V1** | LMS 강의 리스트(`/lms/courses`)에 "내 자료함에 추가" 액션 추가 (`reusable_policy` 검증 + duplicate 처리) | 2 |
| 5 | **WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1** | shared-space-ui에 `LessonCard` preview component 추가 (블로그·POP 공통) | 2 |
| 6 | **WO-O4O-STORE-POP-LESSON-ORIGIN-V1** | POP origin filter에 `lesson` 추가 + 강의 메타 기반 POP 템플릿 | 2, 5 |
| 7 | **WO-O4O-STORE-QR-LESSON-LANDING-V1** | QR `landingType` enum에 `lesson` 추가 + `/lms/course/:id` 자동 url | 2 |
| 8 | **WO-O4O-LMS-PAID-COURSE-LIBRARY-POLICY-V1** | 유료 강의의 store library 노출/구매 검증 정책 | 1, 2 (Phase 2) |
| 9 | **WO-O4O-COURSE-AI-CONTENT-ENTITY-V1** | course_ai_content entity (POP/QR description/summary AI 생성) | 5 (Phase 2/3) |

WO 1·2가 선행 필수. 3·4·5는 2 이후 병렬 가능. 6·7은 5 완료 후 진행.

### 10.3 주의사항

- **별도 메뉴(`library-lessons` 등) 신설 금지** — `storeMenuConfig.ts:212` design intent 위반.
- **Full Copy 사용 금지** — LMS는 Reference Metadata만. content_json은 lightweight metadata 한정.
- **`visibility` 와 `reusable_policy` 혼동 금지** — 수강 접근성과 재사용 허용은 독립된 두 축.
- **LMS Frozen baseline 침범 금지** — `lms_courses` 컬럼 추가는 가능하나 entity 구조 변경/relation 변경은 별도 WO.
- **kpaLmsScopeGuard 무효화 금지** — write path는 그대로 유지, 본 IR은 read/snapshot path만 다룸.
- **유료 강의는 Phase 1 제외** — `isPaid=false` + `content_kind='content_resource'` 강의를 1차 타겟.
- **Storefront/Neture는 적용 대상 아님** — Neture는 LMS 페이지 부재. KPA 1차, Glyco/Cosmetics는 후속.

---

*IR-O4O-LMS-STORE-LIBRARY-INTEGRATION-V1*
*Updated: 2026-05-09*
*Status: Investigation Complete — 후속 WO 분기 대기*
