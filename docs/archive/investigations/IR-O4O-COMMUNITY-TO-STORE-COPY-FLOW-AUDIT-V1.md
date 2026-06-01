# IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1

> 커뮤니티 → 매장 자료함 "가져오기/복사" 흐름의 현재 구현 상태와
> "내 매장 = 독립 운영 공간" 철학과의 GAP 을 진단한 IR.
> **수정 없음. 정적 조사 + canonical 방향 제안.**

- 작성일: 2026-05-09
- 기준 브랜치: `main` (`d120c273b` 시점, sync 완료)
- 자매 IR: [IR-O4O-LMS-STORE-LIBRARY-INTEGRATION-V1](IR-O4O-LMS-STORE-LIBRARY-INTEGRATION-V1.md) (이 IR 이후 후속 WO들이 진행되어 본 IR이 그 결과를 종합 진단)
- 조사 범위
  - LMS 강의 / 콘텐츠 허브 / 자료실(Resources) 의 "가져오기" UI·API
  - `o4o_asset_snapshots` 저장 구조 + asset_type 분류
  - `reusable_policy` / 복사 가능 정책 필드 분포
  - `kpa_store_contents` (매장 전용 편집) + `staff_blog_posts` ownership
  - Store → Community publish 흐름 존재 여부
- 범위 제약
  - **KPA-Society 1차 정리**. GlycoPharm / K-Cosmetics 비교는 후속.
  - 실제 entity 변경·migration·UI 리팩토링은 **본 IR 범위 외**.

---

## 0. 결론 요약 (TL;DR)

> **Community → Store 가져오기 흐름은 LMS / 콘텐츠 허브에서 이미 동작하고 있으며 자료실(Resources)만 누락 상태다. 그러나 *"내 매장 = 독립 운영 공간 + Community → Store는 copy only"* 철학과 비교하면 두 가지 핵심 GAP 이 존재한다 — (1) 저장 방식이 자산 타입별로 일관되지 않음 (lesson만 Reference Metadata, 나머지 Full Copy), (2) `reusable_policy` 같은 *제작자가 복사 차단 가능* 정책이 LMS 강의에만 존재하고 cms/signage/content 에는 부재. 더 의외의 사실: *Store → Community publish 가 실제로 존재한다* (`POST /store-contents/:id/share-to-hub`) — 사용자의 "Store → Community publish 없음" 명세와 충돌. 정책 결정 필요.**

**현재 상태 핵심 사실 7가지**:

1. **가져오기 UI 존재 (LMS / 콘텐츠 / 자료실)** — `LMS = 동작` / `콘텐츠 = 동작 + bulk` / `자료실 = 부재`
2. **저장 시스템은 단일** — `o4o_asset_snapshots` 가 4개 asset_type (`cms` / `signage` / `lesson` / `content`) 모두 흡수
3. **저장 방식 비대칭** — `lesson` 만 Reference Metadata, 나머지 3종은 Full Copy (`content_json` 에 본문 포함)
4. **정책 필드 비대칭** — `lms_courses.reusable_policy` (restricted/organization/platform) 만 존재. cms/signage/content 는 제작자가 복사 차단 불가 (`is_deleted=false` 단순 게이트만)
5. **Backend enforcement 견고** — Resolver 패턴으로 정책/소유권/중복 모두 backend 검증. allowedRoles 4개 명시 (`kpa:admin`/`kpa:operator`/`kpa:pharmacist`/`kpa:store_owner`)
6. **Store ownership 분리 존재** — `kpa_store_contents.organization_id` 가 매장 ID. snapshot 편집(`source_type='snapshot_edit'`)과 직접 생성(`source_type='direct'`) 모두 매장 전용
7. **Store → Community publish 흐름 *존재함*** — `POST /store-contents/:id/share-to-hub` → `kpa_approval_requests(entity_type='store_share_to_hub')` → 운영자 승인 → `share_status='approved'`. **사용자 명세 ("Store → Community publish 없음")과 충돌 → 정책 재검토 필요**

**Phase 1 권장 우선순위**:
1. **정책 일관성 통일** — cms/signage/content 에도 `reusable_policy` 추가 (또는 동등 정책 필드)
2. **lesson 외 Reference Metadata 검토** — Full Copy 장점(원본 독립) vs 단점(저장 비용·stale) 정책 결정
3. **자료실(Resources) 가져오기 흐름 도입** — 현재 직접 업로드만 가능
4. **Store → Community publish 정책 결정** — 의도한 흐름인지 legacy 인지 확인 후 보존/제거

---

## 1. 현재 "가져오기 / 복사" 기능 존재 여부

### 1.1 도메인별 가져오기 UI 매트릭스 (KPA-Society)

| 도메인 | 페이지 / Route | UI 존재 | 노출 조건 | Bulk | 호출 API |
|--------|---------------|:------:|----------|:----:|---------|
| **LMS 강의 목록** | [LmsCoursesPage.tsx#L66](services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx#L66) (`/lms/courses`) | ✅ "＋ 내 자료함에 추가" | `isStoreOwner && status==='published' && reusablePolicy!=='restricted'` | ❌ | `POST /assets/copy` (`assetType=lesson`) |
| **LMS 강의 상세** | LmsCourseDetailPage (`/lms/course/:id`) | ❌ | — | — | — |
| **콘텐츠 허브 섹션** | [ContentListPage.tsx#L228](services/web-kpa-society/src/pages/contents/ContentListPage.tsx#L228) (`/content`) | ✅ "내 자료함 가져가기" | 무제한 (공개 콘텐츠 전제) | ❌ | `POST /assets/copy` (`assetType=content`) |
| **콘텐츠 전체 목록** | [ContentDocumentsPage.tsx#L138](services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx#L138) (`/content/documents`) | ✅ Row + Drawer + **Bulk** | 무제한 + 소유자만 수정/삭제 | ✅ Promise.allSettled | `POST /assets/copy` (`assetType=content`) |
| **자료실 (community 측 view)** | — | ❌ **부재** | — | — | — |
| **자료함 / 콘텐츠 (매장 측)** | [StoreLibraryContentsPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx) (`/store/library/contents`) | ✅ 가져온 콘텐츠 표시 + 제작 시작 진입 | 매장 운영자 | — | (read-only) |
| **자료함 / 자료 (매장 측)** | [StoreLibraryResourcesPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx) (`/store/library/resources`) | ✅ 직접 업로드만 (가져오기 없음) | 매장 운영자 | — | `store_execution_assets` 직접 |

### 1.2 Role 별 노출 정책

| Role | LMS 강의 가져오기 | 콘텐츠 가져가기 | 자료실 가져오기 | 매장 자료함 관리 |
|------|:----------------:|:---------------:|:---------------:|:---------------:|
| 비로그인 | ❌ | ✅ (공개) | ❌ | ❌ |
| 일반 학습자 | ❌ | ✅ | ❌ | ❌ |
| `lms:instructor` | ❌ | ✅ | ❌ | ❌ |
| `kpa:pharmacist` | ❌ | ✅ | ❌ | ❌ |
| **`kpa:store_owner`** | ✅ | ✅ | (UI 없음) | ✅ |
| `kpa:operator` / `kpa:admin` | ✅ (정책에 따라) | ✅ | (UI 없음) | ✅ (관리) |

→ **현재 정책 일관성**: 콘텐츠 가져가기는 무제한, LMS 가져가기는 store_owner 한정. 자료실은 진입 자체가 없어 비교 불가.

### 1.3 Dead Button 검사

조사 결과 **dead button 없음**:
- LMS: `addedCourseIds` Set 으로 중복 시 disabled + "✓ 자료함에 있음" 표시
- 콘텐츠: 중복 시 success toast로 사용자 피드백 (silent ignore)
- backend 에러 (`SOURCE_NOT_FOUND` / `DUPLICATE_SNAPSHOT` / `POLICY_VIOLATION`) 모두 friendly toast 처리

---

## 2. 현재 저장 구조 — Snapshot Copy vs Reference 판정

### 2.1 `o4o_asset_snapshots` 컬럼 (canonical core)

[20260216000001-CreateO4oAssetSnapshots.ts](apps/api-server/src/database/migrations/20260216000001-CreateO4oAssetSnapshots.ts) + [AssetSnapshot.entity.ts](packages/asset-copy-core/src/entities/asset-snapshot.entity.ts):

| 컬럼 | 의미 | 비고 |
|------|------|------|
| `id` | UUID PK | — |
| `organization_id` | 매장 조직 ID | 멀티테넌트 격리 |
| `source_service` | `kpa` / `neture` | 원본 서비스 |
| `source_asset_id` | 원본 ID | **FK 없음** (soft reference) |
| `asset_type` | **`cms` \| `signage` \| `lesson` \| `content`** | 4종 union (lesson / content 후속 WO에서 추가) |
| `title` | 표시용 | — |
| `content_json` | jsonb | **타입별 의미 다름 — 핵심 GAP** |
| `created_by` | 사용자 ID | 감사용 |
| (unique) | `(org_id, source_asset_id, asset_type)` | 중복 방지 |

### 2.2 asset_type 별 저장 방식 (가장 중요한 표)

[KpaAssetResolver](apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts) 기준:

| asset_type | 저장 방식 | content_json 포함 항목 | 원본 변경 영향 | 정책 검증 |
|------------|:--------:|----------------------|---------------|----------|
| **cms** | **Full Copy** | title, body, imageUrl, linkUrl, metadata | ❌ snapshot 독립 | 존재 검증만 |
| **signage** | **Full Copy** | mediaType, sourceUrl, content, tags, metadata | ❌ snapshot 독립 | `deletedAt IS NULL` |
| **lesson** | **Reference Metadata** | courseId, thumbnail, summary, lessonCount, instructorName, **publicUrl** | ⚠️ 강의 archived/deleted 시 publicUrl 깨짐 | **`reusable_policy ≠ 'restricted'` + `status='published'`** |
| **content** | **Full Copy** | body, blocks, tags, category, sourceUrl, thumbnailUrl | ❌ snapshot 독립 | `is_deleted=false` |

### 2.3 판정: **혼합 — Full Copy 우세, lesson 만 예외**

- **Full Copy 가 기본 패턴** (3 of 4 types)
- **lesson 만 Reference Metadata** — IR-O4O-LMS-STORE-LIBRARY-INTEGRATION-V1 의 권장 ("강의는 lesson 다수·동영상 URL·수강 권한이 동적이라 시점-고정 복사가 의미를 잃는다") 가 그대로 구현됨
- **불일치는 의도된 것**이지만 *"가져오기 정책 통일"* 관점에서는 GAP

### 2.4 원본 lifecycle 영향

| 상황 | snapshot 동작 |
|------|--------------|
| 원본 cms_content 변경 | snapshot.content_json 그대로 (point-in-time) |
| 원본 cms_content 삭제 | snapshot 잔존, 신규 copy 만 차단 |
| 원본 signage_media deletedAt 설정 | snapshot 잔존, 신규 copy 만 차단 |
| 원본 lms_course archived | snapshot 잔존, 신규 copy 차단, **publicUrl 클릭 시 404** ← 약점 |
| 원본 kpa_content `is_deleted=true` | snapshot 잔존, 신규 copy 차단 |
| snapshot 자체 lifecycle | `kpa_store_asset_controls.lifecycle_status` (`active`/`expired`/`archived`) |

→ **snapshot은 원본 FK 없이 독립** — Community 변경이 Store 에 자동 전파되지 않는다는 철학에 부합. 단 lesson 만 publicUrl 의존성으로 read-time 깨짐 가능.

---

## 3. 내 자료함 저장 구조

### 3.1 매장 측 storage 시스템 (3-Layer)

| 레이어 | 테이블 | 역할 | source |
|--------|--------|------|--------|
| **1. Snapshot 보관** | `o4o_asset_snapshots` | 커뮤니티 가져옴 | community → copy |
| **2. Snapshot 운영 제어** | `kpa_store_asset_controls` | publish_status / lifecycle / forced 정책 | snapshot FK |
| **3. 매장 직접 자산** | `store_execution_assets` | 직접 업로드 (file/content/external-link) | 매장 직접 |
| **3-2. 매장 편집 콘텐츠** | `kpa_store_contents` | snapshot 편집 결과 + direct 작성 | snapshot_edit / direct |
| **3-3. 매장 블로그** | `staff_blog_posts` | 매장 블로그 게시글 | 매장 직접 |

### 3.2 `kpa_store_asset_controls` 컬럼 진화

[CreateKpaStoreAssetControls](apps/api-server/src/database/migrations/20260219000001-CreateKpaStoreAssetControls.ts) + V2/V3:

| 컬럼 | 의미 | 버전 |
|------|------|------|
| `snapshot_id` | snapshot FK | V1 |
| `publish_status` | `draft`/`published`/`hidden` | V1 |
| `channel_map` | jsonb (채널별 활성화) | V2 |
| `is_forced` / `forced_by_admin_id` / `forced_start_at`/`end_at` | HQ 강제 배포 | V2 |
| `is_locked` | 매장 수정 불가 | V2 |
| **`snapshot_type`** | `user_copy`/`hq_forced`/`campaign_push`/`template_seed` | **V3** |
| **`lifecycle_status`** | `active`/`expired`/`archived` | **V3** |

### 3.3 자료실(Resources) 페이지의 실제 저장

[StoreLibraryResourcesPage](services/web-kpa-society/src/pages/pharmacy/StoreLibraryResourcesPage.tsx) — **`store_library_items` 또는 `store_execution_assets` 직접 업로드 전용**. 커뮤니티에서 가져오기 흐름 없음.

→ **자료실 = 매장 직접 업로드 only**. 콘텐츠 페이지 (`/library/contents`)와 자료 페이지 (`/library/resources`) 가 의미적으로 다름:
- 콘텐츠: 가져옴 + 직접 작성
- 자료: 매장 직접 업로드 (PDF/이미지/링크)

---

## 4. 복사 가능 / 불가능 정책 — 가장 중요한 GAP

### 4.1 정책 필드 분포

| 도메인 | 필드 존재 | 필드명 | 값 | 검증 위치 |
|--------|:--------:|--------|----|----------|
| **LMS 강의** (`lms_courses`) | ✅ | **`reusable_policy`** | `restricted` / `organization` / `platform` | [KpaAssetResolver L82](apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts#L82) — backend resolver |
| **CMS** (`cms_contents`) | ❌ | — | — | 존재 검증만 |
| **Signage** (`signage_media`) | ❌ | — | — | `deletedAt IS NULL` 검증만 |
| **콘텐츠 허브** (`kpa_contents`) | ❌ | — | — | `is_deleted=false` 검증만 |
| **자료실** (`store_library_items`) | N/A | (애초 가져오기 흐름 없음) | — | — |

### 4.2 frontend / backend enforcement 분포

| 검증 대상 | Frontend | Backend |
|----------|:-------:|:-------:|
| User role / capability | ✅ ([LmsCoursesPage.tsx#L66](services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx#L66) `isStoreOwner` 체크) | ✅ ([create-asset-copy-controller.ts#L69](packages/asset-copy-core/src/factory/create-asset-copy-controller.ts#L69) `allowedRoles`) |
| Asset type 허용 | — | ✅ ([create-asset-copy-controller.ts#L87](packages/asset-copy-core/src/factory/create-asset-copy-controller.ts#L87) `allowedAssetTypes`) |
| **`reusable_policy`** | ✅ (LMS만 — 버튼 숨김) | ✅ ([KpaAssetResolver#L82](apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts#L82) — null 반환) |
| 원본 존재 / 삭제 | — | ✅ resolver |
| 중복 (org_id + source_asset_id + asset_type) | ✅ (캐시) | ✅ (DB unique) |
| Snapshot publish status | — | ✅ (read-time, `kpa_store_asset_controls`) |
| Snapshot lifecycle | — | ✅ (read-time, `kpa_store_asset_controls`) |

### 4.3 정책 GAP 요약

**현 상태**: 제작자가 복사 가능 여부를 *지정 가능* 한 도메인은 **LMS 강의 단 한 곳**.

→ **가장 큰 GAP**: cms / signage / content / 자료실 의 제작자는 자기 자산이 매장에 복사되는 것을 차단할 방법이 없음. 콘텐츠 허브는 무제한으로 매장에 복사 가능 (이게 의도라면 OK, 아니면 정책 통일 필요).

---

## 5. Community → Store 흐름 정리

### 5.1 단계별 구현 상태

```
Community 자산
 ├─ LMS 강의           ✅ 가져오기 UI (목록만, 상세 ❌) / 정책: reusable_policy
 ├─ 콘텐츠 허브        ✅ 가져오기 UI (개별 + Bulk) / 정책: 없음 (무제한)
 ├─ CMS                ⚠️ asset_type=cms 지원하나 진입 UI 위치 확인 필요
 ├─ Signage 미디어    ⚠️ asset_type=signage 지원하나 매장 측 진입 UI 위치 확인 필요
 └─ 자료실            ❌ 가져오기 흐름 부재 (직접 업로드만)
      ↓ POST /assets/copy
o4o_asset_snapshots (4 asset_types, content_json)
      ↓ kpa_store_asset_controls (publish/lifecycle/snapshot_type)
매장 자료함 (/store/library/contents)
      ↓ 제작 시작 (StartProductionModal)
POP / QR / Tablet / Blog / 상품 상세설명
```

### 5.2 미구현 / 충돌 영역

| 영역 | 상태 | 비고 |
|------|------|------|
| 자료실 가져오기 | ❌ 부재 | 자료실은 직접 업로드 전용 — 정책 결정 필요 |
| LMS 상세 페이지 가져오기 | ❌ 부재 | 의도적 (학습 흐름 전용) — 변경 권장 안 함 |
| cms/signage/content 정책 필드 | ❌ 부재 | 제작자가 복사 차단 불가 — Phase 1 권장 |
| Bulk 가져오기 (LMS) | ❌ 부재 | LMS는 개별만 — 콘텐츠는 Bulk 지원 |

### 5.3 legacy 충돌 구조

조사 결과 **legacy 충돌 없음**:
- 이전 `cms_contents` 직접 참조나 `signage_media` 직접 가져오기는 모두 `o4o_asset_snapshots` 흐름으로 통합됨
- WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1 commit (`f7c016cd3`) 으로 콘텐츠 허브의 별도 storage 가 사라짐

---

## 6. Store 전용 콘텐츠 구조

### 6.1 매장 측 콘텐츠 생성 경로 (3가지)

| 경로 | source_type | 진입점 | 저장 |
|------|-------------|--------|------|
| **Snapshot 편집** | `snapshot_edit` | [StoreContentEditPage](services/web-kpa-society/src/pages/pharmacy/StoreContentEditPage.tsx) | `kpa_store_contents` (snapshot_id FK) |
| **Direct 생성** | `direct` | (AI 생성 / 직접 작성) | `kpa_store_contents` (snapshot_id=NULL) |
| **블로그 게시글** | (별개 도메인) | [PharmacyBlogPage](services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx) | `staff_blog_posts` |

### 6.2 매장 측 강의 / AI 생성 가능 여부

| 기능 | 매장 운영자에게 노출? | 결과 저장 |
|------|:--------------------:|----------|
| LMS 강의 생성 | ❌ (강사 전용) | — |
| 매장 콘텐츠 생성 (Direct) | ✅ | `kpa_store_contents` (매장 organization_id) |
| AI 생성 콘텐츠 (블로그/상품) | ✅ (`ProductAiContent`) | `product_ai_content` (productId 기준) |
| 블로그 게시글 작성 | ✅ | `staff_blog_posts` (매장 store_id) |

### 6.3 결론

**매장은 강의를 *생성* 할 수 없고 *가져옴* 만 가능**. 콘텐츠/AI/블로그는 매장에서 직접 생성 가능하며 모두 매장 organization_id 로 격리.

---

## 7. Ownership / Permission 매트릭스

### 7.1 핵심 entity 별 ownership 필드

| Entity | `organization_id` | `service_key` | `created_by` | 의미 |
|--------|------------------|---------------|--------------|------|
| `lms_courses` | Community ID (KPA 본부 등) | (도메인 분리 별도) | `instructorId` | 커뮤니티 소유 강의 |
| `cms_contents` | Community ID 또는 NULL | varies | `authorId` | 커뮤니티 소유 |
| `signage_media` | Community ID | `kpa-society` 등 | uploader | 커뮤니티 소유 |
| `kpa_contents` | Community ID | `kpa-society` | author | 커뮤니티 소유 |
| **`o4o_asset_snapshots`** | **매장 organization_id** | `source_service` (다름) | 복사 사용자 | **매장 소유 (snapshot)** |
| **`kpa_store_contents`** | **매장 organization_id** | — | 매장 사용자 | **매장 소유 (편집/생성)** |
| **`staff_blog_posts`** | (`store_id` + `service_key`) | `kpa` | 매장 사용자 | **매장 소유 (블로그)** |
| `store_local_products` | 매장 organization_id | — | 매장 | 매장 소유 |
| `store_execution_assets` | 매장 organization_id | — | 매장 | 매장 소유 (직접 업로드) |

### 7.2 ownership 분리 평가

✅ **Community 소유 vs 매장 소유 가 `organization_id` 로 명확히 분리됨**.
✅ **snapshot 은 매장 organization_id 만 가지므로 lifecycle 독립**.
✅ **cross-org 접근 차단**: backend resolver 가 자기 매장 조직만 조회 가능하게 enforcement.

---

## 8. Snapshot Copy 철학 적합성 분석

### 8.1 사용자 명세 vs 실제 구현 매트릭스

| 사용자 명세 | 실제 구현 | 일치 |
|------------|-----------|:----:|
| Community = 공유 공간 | ✅ `lms_courses`, `cms_contents`, `kpa_contents`, `signage_media` 모두 community organization 소유 | ✅ |
| Store = 매장 독립 운영 공간 | ✅ `kpa_store_contents`, `staff_blog_posts`, `o4o_asset_snapshots` 모두 매장 organization_id 격리 | ✅ |
| Community → Store 는 copy only | ✅ `POST /assets/copy` 단방향 | ✅ |
| **Store → Community publish 없음** | ❌ **존재함** — `POST /store-contents/:id/share-to-hub` + `kpa_approval_requests(entity_type='store_share_to_hub')` | **충돌** |
| 복사 이후 원본과 독립 | ✅ snapshot 은 FK 없이 content_json 으로 시점-고정 (lesson 은 부분 예외) | ⚠️ lesson 만 Reference |
| 복사 가능 여부는 제작자가 결정 | ⚠️ **LMS 강의만** `reusable_policy` 로 결정 가능. cms/signage/content 는 정책 필드 없음 | **부분** |

### 8.2 가장 큰 구조적 충돌 요소

1. **Store → Community publish 흐름 *존재* 하나 명세는 "없음"** — *의도된 흐름인지 legacy 인지 정책 결정 필요*. 자매 IR(`IR-O4O-KPA-STORE-BLOG-SITE-ARCHITECTURE-V1`)의 future flow 와 관련 가능성 있음. 만약 의도라면 명세 업데이트, 아니라면 제거.
2. **정책 필드 비대칭** — LMS 만 `reusable_policy` 보유. 이로 인해 cms/signage/content 는 무제한 복사 가능. 통일 안 될 경우 *제작자가 콘텐츠 통제권 잃음*.
3. **저장 방식 비대칭** — `lesson` 만 Reference Metadata, 나머지 Full Copy. 통일 가능성 검토 필요 (대부분 도메인은 Full Copy 가 적합 — lesson 의 동적 권한이 예외).

### 8.3 단순화 가능성

**"복사 가능하면 무조건 snapshot copy" 정책 적용 가능 여부**:
- ✅ 가능. 단 lesson 만 Reference Metadata 인 것은 도메인 특성 (동적 lesson 추가 / 수강 권한 / 본문 노출 차단) 이라 그대로 두는 것이 맞음.
- 즉 *통일된 메시지*는 "**복사 가능 여부는 제작자가 결정 (`reusable_policy`) → snapshot 복사 → 원본과 독립**". lesson 의 Reference Metadata 는 이 메시지의 *예외 sub-pattern*.

---

## 9. 최종 판단

### 9.1 현재 구조 판정

| 축 | 판정 |
|----|------|
| **저장 중심** | **Snapshot Copy 중심** (4 types 모두 `o4o_asset_snapshots`) |
| **lesson 예외** | Reference Metadata sub-pattern (도메인 특성, 유지 권장) |
| **Reference 기반 legacy 잔존** | ❌ 없음 (WO-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1 으로 정리됨) |
| **단순화 가능성** | ✅ "snapshot copy + reusable_policy" 단일 정책으로 통일 가능 |
| **Store → Community publish** | **존재 — 명세와 충돌, 정책 결정 필요** |

### 9.2 Canonical 구조 제안

```
Community Layer
 ├─ 공유 콘텐츠 (lms_courses / cms_contents / kpa_contents / signage_media)
 ├─ reusable_policy (제작자 결정 — restricted / organization / platform)
 │  └─ ⚠️ 현재 lms_courses 만 보유. 다른 도메인 추가 권장
 └─ 일반 사용자 이용 (수강 / 열람)

           ↓ snapshot copy only (POST /assets/copy)
           ↓ Reference Metadata = lesson 만 / 나머지 Full Copy

Store Layer (organization_id 격리)
 ├─ 내 자료함 (o4o_asset_snapshots + kpa_store_asset_controls)
 ├─ 내 콘텐츠 (kpa_store_contents — snapshot_edit / direct)
 ├─ 내 블로그 (staff_blog_posts)
 ├─ POP / QR / Tablet / 상품 상세설명 (자료함에서 제작 시작)
 └─ ⚠️ Store → Community publish (POST /share-to-hub) — 정책 재검토 필요
```

### 9.3 정책 결정 필요 항목

| 결정 | 옵션 |
|------|------|
| **Store → Community publish 흐름** | (a) 의도된 흐름으로 보존 + 사용자 명세 업데이트 / (b) legacy 로 분류 후 제거 |
| **정책 필드 통일** | (a) cms/signage/content 모두 `reusable_policy` 추가 / (b) 콘텐츠는 무제한 유지 (제작자 통제권 포기) |
| **자료실 가져오기** | (a) `assetType='resource'` 추가 + 흐름 도입 / (b) 자료실은 매장 직접 업로드 전용으로 명시 |

---

## 10. 후속 WO 후보 (정책 결정 후 진행 가능)

| 우선순위 | WO 후보 | 작업 범위 | 의존 |
|:---:|---|---|---|
| **1** | **WO-O4O-COMMUNITY-STORE-SHARE-POLICY-DECISION-V1** | "Store → Community publish 흐름 보존/제거" 정책 IR 또는 코드 결정 | (정책 IR 선행) |
| **2** | **WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1** | cms_contents / kpa_contents 에 `reusable_policy` 컬럼 추가 + resolver 검증 | LMS 패턴 참고 |
| **3** | **WO-O4O-SIGNAGE-MEDIA-REUSABLE-POLICY-ALIGN-V1** | signage_media 에 `reusable_policy` (단 signage 동결 baseline 영향 검토 필요) | 위와 함께 / 별개 |
| **4** | **WO-O4O-LMS-DETAIL-PAGE-LIBRARY-ACTION-V1** | LMS 강의 상세 페이지에도 "내 자료함에 추가" 버튼 추가 (현재는 목록만) | (선택) |
| **5** | **WO-O4O-LMS-COURSES-BULK-LIBRARY-V1** | LMS 강의 목록에 Bulk 가져오기 (현재 콘텐츠는 지원, LMS 는 개별만) | 콘텐츠 패턴 참고 |
| **6** | **WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1** | 자료실(library/resources) 에 가져오기 흐름 도입 (asset_type='resource' 신규) | 정책 결정 (3-c 옵션) 후 |
| **7** | **WO-O4O-ASSET-SNAPSHOT-CROSS-SERVICE-AUDIT-V1** | GlycoPharm / K-Cosmetics 도 동일 패턴인지 비교 | KPA 정리 후 |

---

## 11. 핵심 질문 답변 매트릭스

> 본 IR 의 핵심 조사 질문에 대한 응답.

| 질문 | 답 |
|------|---|
| Q1. 가져오기 기능 존재? | ✅ LMS / 콘텐츠 동작. ❌ 자료실 부재. |
| Q2. dead button? | ❌ 없음. 정책/중복/에러 모두 friendly 처리. |
| Q3. snapshot copy인가 reference인가? | **혼합. lesson만 Reference Metadata, cms/signage/content 는 Full Copy.** |
| Q4. 원본 변경 영향? | ❌ 없음 (snapshot 독립). 단 lesson publicUrl 만 read-time 영향. |
| Q5. 자료실은 어떤 구조? | 직접 업로드 전용 (`store_execution_assets`). 가져오기 흐름 없음. |
| Q6. 제작자가 복사 차단 가능? | **LMS 강의만 가능** (`reusable_policy='restricted'`). cms/signage/content는 불가. |
| Q7. backend enforcement? | ✅ 견고. Resolver 패턴, allowedRoles, 중복 DB unique. |
| Q8. 매장에서 강의 생성 가능? | ❌ 강사 전용. 매장은 가져옴만. |
| Q9. 매장에서 콘텐츠/AI/블로그 생성 가능? | ✅ 모두 매장 organization_id 로 격리 저장. |
| Q10. ownership 분리 명확? | ✅ Community = community org_id / Store = 매장 org_id. |
| Q11. Store → Community publish 가능? | **⚠️ 가능 (`POST /share-to-hub`). 사용자 명세와 충돌 — 정책 결정 필요.** |
| Q12. snapshot copy 정책으로 단순화 가능? | ✅ "복사 가능하면 snapshot copy" 단일 정책으로 통일 가능. lesson 만 sub-pattern. |
| Q13. 가장 큰 구조적 충돌 요소? | (1) Store → Community publish 존재 / (2) reusable_policy 비대칭 / (3) 자료실 가져오기 부재 |

---

## 부록 A. 핵심 파일 인벤토리

### Frontend (services/web-kpa-society)
- `pages/lms/LmsCoursesPage.tsx` — 강의 목록 + 가져오기 UI
- `pages/lms/LmsCourseDetailPage.tsx` — 강의 상세 (가져오기 UI 없음)
- `pages/contents/ContentListPage.tsx` — 콘텐츠 허브
- `pages/contents/ContentDocumentsPage.tsx` — 콘텐츠 전체 목록 + Bulk 가져오기
- `pages/pharmacy/StoreLibraryContentsPage.tsx` — 매장 자료함 / 콘텐츠
- `pages/pharmacy/StoreLibraryResourcesPage.tsx` — 매장 자료함 / 자료
- `pages/pharmacy/StoreContentEditPage.tsx` — snapshot 편집
- `pages/pharmacy/PharmacyBlogPage.tsx` — 매장 블로그 작성
- `api/assetSnapshot.ts` — 가져오기 API client

### Backend (apps/api-server)
- `routes/o4o-store/controllers/asset-snapshot.controller.ts` — `POST /assets/copy` controller
- `routes/o4o-store/controllers/store-content.controller.ts` — `kpa_store_contents` + `share-to-hub`
- `modules/asset-snapshot/resolvers/kpa-asset.resolver.ts` — KPA 4 asset_type resolver
- `routes/kpa/services/content-approval.service.ts` — store_share_to_hub 승인

### 공통 패키지
- `packages/asset-copy-core/` — Resolver factory + AssetCopyService
- `packages/asset-copy-core/src/entities/asset-snapshot.entity.ts`
- `packages/interactive-content-core/src/entities/Course.ts` — `reusable_policy` enum

### DB Migrations
- `20260216000001-CreateO4oAssetSnapshots.ts`
- `20260216100001-AddUniqueConstraintAssetSnapshots.ts`
- `20260219000001-CreateKpaStoreAssetControls.ts` (+ V2/V3)
- `20260919000000-AddReusablePolicyToLmsCourses.ts` (lesson 정책 도입)

### 정책 / Canonical 문서
- [docs/architecture/STORE-LAYER-ARCHITECTURE.md](docs/architecture/STORE-LAYER-ARCHITECTURE.md)
- [docs/baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md](docs/baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md)
- [docs/investigations/IR-O4O-LMS-STORE-LIBRARY-INTEGRATION-V1.md](IR-O4O-LMS-STORE-LIBRARY-INTEGRATION-V1.md) — 본 IR 의 자매 IR (lesson 도메인 한정)
- [docs/investigations/IR-O4O-KPA-STORE-BLOG-SITE-ARCHITECTURE-V1.md](IR-O4O-KPA-STORE-BLOG-SITE-ARCHITECTURE-V1.md) — 매장 블로그 (store→public 흐름 관련)

---

*IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1*
*Updated: 2026-05-09*
*Status: Investigation Complete — 정책 결정 + 후속 WO 분기 대기 (변경 없음)*
