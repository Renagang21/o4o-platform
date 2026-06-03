# IR-O4O-KCOS-RESOURCE-CAPABILITY-BACKEND-DESIGN-V1

> **조사/설계 보고서 (Investigation + Design) — 구현 금지, 코드·DB·migration 변경 없음.**
>
> K-Cosmetics 에 KPA / GlycoPharm 과 동일한 **Operator Resource Capability** 를 도입하기 위한 backend 구조 설계. **Capability 먼저, Wrapper 는 그 다음** 원칙.

- **작성일:** 2026-05-24
- **분류:** Investigation + Design (read-only)
- **선행 산출물:**
  - [IR-O4O-CROSS-SERVICE-CAPABILITY-PARITY-AUDIT-V1](IR-O4O-CROSS-SERVICE-CAPABILITY-PARITY-AUDIT-V1.md) (K-Cos Resource parity 22% 식별)
  - [IR-O4O-OPERATOR-ENTITY-UI-CANONICAL-AUDIT-V1](IR-O4O-OPERATOR-ENTITY-UI-CANONICAL-AUDIT-V1.md) (Resources commonization Tier 1.3 으로 분리)
- **참조 SSOT:**
  - `apps/api-server/src/routes/kpa/entities/kpa-content.entity.ts` (KPA canonical entity)
  - `apps/api-server/src/routes/glycopharm/entities/glycopharm-content.entity.ts` (GP entity — 후행 service 의 best template)
  - `apps/api-server/src/routes/glycopharm/controllers/resources.controller.ts` (GP canonical controller pattern)
- **사전 동기화:** origin/main 와 0 commits 차이, staged 비어 있음.
- **수정 행위:** **없음**

---

## 0. 최종 권고 — 한 줄 요약

> **GlycoPharm 의 `glycopharm_contents` 패턴을 그대로 따라 `cosmetics_contents` 신규 테이블 + `resources.controller.ts` 생성. GP 가 이미 KPA→GP 이식에서 검증한 single-migration 캐논 템플릿이므로 K-Cos 가 그 패턴을 mirror 하는 것이 risk 최소화 + parity 최대화.**

| 항목 | 권고 |
|---|---|
| 테이블 이름 | `cosmetics_contents` (GP `glycopharm_contents` 패턴) |
| Entity | `apps/api-server/src/routes/cosmetics/entities/cosmetics-content.entity.ts` (GP entity mirror) |
| Migration | 단일 migration (GP `1771200000027-CreateGlycopharmContentsTables.ts` 패턴) |
| Controller | `apps/api-server/src/routes/cosmetics/controllers/resources.controller.ts` (GP mirror) |
| Public route | `GET /api/v1/cosmetics/contents?sub_type=resource` |
| Operator routes | `GET / POST / PATCH /:id/status / DELETE /:id` (4 endpoints) |
| Permission | `cosmetics:operator` (operator routes) + optionalAuth (public) |
| 후속 WO 순서 | (1) `WO-O4O-KCOS-RESOURCES-BACKEND-V1` → (2) `WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1` |

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 |
| 조사 범위 | `apps/api-server/src/routes/{kpa,glycopharm,cosmetics,cms-content}/**` + `apps/api-server/src/modules/hub-content/**` + `apps/api-server/src/database/migrations/**` |
| 조사 방법 | 코드 정적 분석 + migration history + route 마운팅 추적 |

---

## 2. 현재 상태 — 3 service 비교

### 2.1 KPA-Society Resource Backend (Canonical 1세대)

| 항목 | 값 |
|---|---|
| 테이블 | `kpa_contents` |
| Entity | `apps/api-server/src/routes/kpa/entities/kpa-content.entity.ts` |
| Migration history | **iterative**: `20260410400000-CreateKpaContentHub` → `20260429200000-AddUsageTypeToKpaContents` → `20260510000001-AddReusablePolicyToKpaContents` + sub_type backfill + 등 |
| 컬럼 | title / summary / blocks(jsonb) / tags(jsonb) / category / thumbnail_url / source_type / source_url / source_file_name / **usage_type** / status (draft/ready) / created_by / **reusable_policy** / is_deleted / timestamps |
| **sub_type** | ❌ **없음** (KPA 는 자료실 = 전체 테이블) |
| 통계 컬럼 | ❌ like_count / view_count 없음 |
| author_name | ❌ 없음 (created_by FK 만) |
| Frontend API | `services/web-kpa-society/src/api/resources` → `resourcesApi.operatorList / operatorCreate / operatorUpdateStatus / operatorDelete` |
| Operator routes | (KPA-routes 내 미확인 — `routes/kpa/` 에 별도 `resources.controller.ts` 부재. 다른 형태로 마운팅 추정) |

### 2.2 GlycoPharm Resource Backend (Canonical 2세대 — 권장 템플릿)

| 항목 | 값 |
|---|---|
| 테이블 | `glycopharm_contents` |
| Entity | `apps/api-server/src/routes/glycopharm/entities/glycopharm-content.entity.ts` |
| Migration | **단일 all-in-one**: `1771200000027-CreateGlycopharmContentsTables.ts` |
| 컬럼 | title / summary / blocks / tags / category / thumbnail_url / **sub_type** / source_type / source_url / source_file_name / **usage_type** / status (**draft/published/private**) / created_by / **updated_by** / **author_name** / **reusable_policy** / **like_count** / **view_count** / is_deleted / timestamps |
| Index | `(created_by, is_deleted)`, `(status, is_deleted)`, `(sub_type, is_deleted)` |
| Controller | `apps/api-server/src/routes/glycopharm/controllers/resources.controller.ts` — 336 lines, 2 router factory (public + operator) |
| Routes | `GET /contents` (optionalAuth, status filter, search, sub_type filter, sort by latest/popular/views) + `GET /operator/resources` + `POST /operator/resources` + `PATCH /operator/resources/:id/status` + `DELETE /operator/resources/:id` |
| Permission | operator: `requireGlycopharmScope('glycopharm:operator')` |
| Validation | `VALID_USAGE_TYPES = ['READ', 'LINK', 'DOWNLOAD', 'COPY']`, `VALID_STATUSES = ['draft', 'published', 'private']`, `deriveUsageType()` fallback |
| 마운팅 | `glycopharm.routes.ts:463,465` — `router.use('/contents', ...)` + `router.use('/operator/resources', ...)` |
| Frontend API | `services/web-glycopharm/src/api/resources` → `glycoResourcesApi` (동일 메서드 set, 응답 구조 `(res as any).data?.data ?? (res as any).data` 보강) |

### 2.3 K-Cosmetics — 현재 (Gap 확정)

| 항목 | 값 |
|---|---|
| 테이블 | ❌ **부재** (`cosmetics_contents` 검색 — 0 hit) |
| Entity | ❌ 부재 (`apps/api-server/src/routes/cosmetics/entities/` 8 entities 중 store/playlist/order/payment 만, content 없음) |
| Migration | ❌ 없음 (`migrations/*cosmetics*` 다수 있으나 contents 관련 0) |
| Controller | ❌ 부재 (`apps/api-server/src/routes/cosmetics/controllers/` 8 controllers 중 store/order/payment/community-hub/tourist-hub/dashboard/event-offer 만) |
| Routes 마운팅 | ❌ `cosmetics.routes.ts` grep — `resources/Resources/resource` 0 hit |
| Frontend API | ❌ `services/web-k-cosmetics/src/api/` 15 파일 중 `resources.ts` 부재 |
| Frontend Page | ❌ `OperatorResourcesPage.tsx` 부재 |

→ **K-Cos = Resource Capability 의 완전 부재 (backend + frontend 모두).** 선행 IR 의 22% parity 가 정확.

### 2.4 cross-service 공통 인프라 후보 조사

#### (a) cms-content (`apps/api-server/src/routes/cms-content/`)

| 항목 | 값 |
|---|---|
| 모듈 | 6 파일 (service / utils / routes / slot.handler / mutation.handler / query.handler) |
| Entity | `CmsContent` from `@o4o-apps/cms-core` (별도 package) |
| Status 모델 | **4-stage**: `draft / pending / published / archived` (WO-O4O-CMS-PENDING-STATE-IMPLEMENTATION-V1) |
| Transition matrix | `CMS_ALLOWED_TRANSITIONS` (draft→pending/archived, pending→published/draft, published→archived, archived→terminal) |
| 의도 | **Generic CMS content** (KPA/GP/K-Cos resource 와 다른 paradigm — slot / pending approval 흐름) |

→ **다른 도메인.** KPA/GP resources 는 `draft/published/private` (3-state, 가시성 중심); CMS 는 `draft/pending/published/archived` (4-state, 승인 흐름 중심). **재사용 비추천**.

#### (b) hub-content (`apps/api-server/src/modules/hub-content/`)

| 항목 | 값 |
|---|---|
| 모듈 | 2 파일 (controller + service) |
| 의도 | **F4 Platform Content Policy** 의 HUB 3-축 모델 (Producer/Visibility/ServiceScope) 의 platform-level 통합 콘텐츠 |
| 관계 | F5 Content Stable 의 영역 |

→ **상위 layer.** Resource Library 의 "원천 자료" 가 아니라 publishing 의 receiving end. **재사용 비추천** (resource = producer side).

---

## 3. K-Cosmetics Gap 정리

| 차원 | KPA | GP | K-Cos | Gap |
|---|:---:|:---:|:---:|---|
| Backend Entity | ✓ | ✓ | ❌ | 신규 생성 필요 |
| Migration | ✓ (iterative) | ✓ (single) | ❌ | 신규 생성 필요 |
| Public `/contents` route | ✓ | ✓ | ❌ | 신규 생성 필요 |
| Operator `/operator/resources` routes | ✓ | ✓ | ❌ | 신규 생성 필요 |
| Operator scope | `kpa-society:operator` | `glycopharm:operator` | (필요: `cosmetics:operator`) | 권한 정의 이미 존재 |
| Frontend `resourcesApi` | ✓ | ✓ (`glycoResourcesApi`) | ❌ | 신규 생성 필요 |
| Frontend `OperatorResourcesPage` | ✓ | ✓ | ❌ | 신규 생성 필요 |
| `usage_type` enum | ✓ | ✓ (READ/LINK/DOWNLOAD/COPY) | ❌ | 신규 |
| `source_type` enum | ✓ (manual/upload/external) | ✓ | ❌ | 신규 |
| `reusable_policy` enum | ✓ (restricted/platform) | ✓ | ❌ | 신규 |

---

## 4. 후보 비교

### 4.1 후보 매트릭스

| 차원 | A. `cosmetics_contents` 신규 (GP 패턴 mirror) | B. `cms_contents` 재사용 | C. `hub-content` 활용 | D. 기존 cosmetics 테이블 재사용 |
|---|:---:|:---:|:---:|:---:|
| KPA/GP parity (status 모델 draft/published/private) | ✅ 정확 일치 | ❌ 4-state CMS workflow 다름 | ❌ 상위 layer | ❌ store/order 와 무관 |
| `usage_type` (READ/LINK/DOWNLOAD/COPY) | ✅ 가능 | ❌ cms 에 없음 | ❌ | ❌ |
| `source_type` (manual/upload/external) | ✅ 가능 | ❌ | ❌ | ❌ |
| `reusable_policy` (restricted/platform) | ✅ GP 와 동일 | ❌ | ❌ | ❌ |
| Operator 관리 (CRUD + 상태 + 삭제) | ✅ GP controller 그대로 | △ CmsContent 에 transition matrix 다름 | ❌ | ❌ |
| Public 조회 (`sub_type=resource` 필터) | ✅ GP 와 동일 | △ slot 구조 다름 | ❌ | ❌ |
| 향후 AI / Store Execution 확장성 | ✅ blocks(jsonb) + sub_type 으로 확장 가능 | △ slot 구조 의도 다름 | △ HUB publishing layer | ❌ |
| Migration 비용 | ⭐ 낮음 (GP migration 1 파일 mirror) | ❌ 큰 정책 정합 비용 | ❌ 큰 정합 비용 | ❌ 의미 없음 |
| 재작업 위험 | ⭐ 낮음 (GP 가 이미 검증) | ⭐⭐ 높음 (transition 모델 충돌) | ⭐⭐ 매우 높음 | ⭐⭐⭐ 매우 높음 |
| Frontend commonization 후속 | ⭐ 높음 (operator-core-ui resources wrapper 가능) | ❌ 별도 UI 필요 | ❌ | ❌ |

### 4.2 후보별 평가 요약

#### ✅ A. `cosmetics_contents` 신규 (GP 패턴 mirror) — **권장**

장점:
- KPA → GP 이식이 이미 GP `glycopharm_contents` 로 검증된 **canonical template**
- 모든 enum / status / reusable_policy / usage_type 패턴 정확 mirror
- frontend commonization (`OperatorResourcesPage` wrapper) 의 전제 조건 충족
- single migration (GP 패턴) 으로 KPA 의 iterative 부담 회피
- backend code 는 거의 100% GP controller copy + namespace 만 cosmetics 로 교체

단점:
- 신규 테이블 1 개 추가 (소규모)
- 향후 추가 service (예: 신규 사업) 마다 같은 패턴 반복 — long-term 으로는 generic resource module 추출 후보 (Tier 4 의 영역)

#### ❌ B. `cms_contents` 재사용

장점: 신규 테이블 없음
단점:
- **status 모델 충돌**: cms 는 4-state (draft/pending/published/archived) workflow, resources 는 3-state (draft/published/private) 가시성
- transition matrix 가 다름 (cms 는 pending → published/draft 승인 흐름)
- KPA / GP 와 paradigm 다름 → frontend commonization 불가
- 의도와 안 맞음 — cms 는 slot-based content publishing, resources 는 자료실 (다른 도메인)

#### ❌ C. `hub-content` 활용

장점: 없음 (상위 layer)
단점: F4 Platform Content Policy 의 HUB Producer/Visibility/ServiceScope 모델 — resources 는 그 hub 의 producer side 의 원천 자료. layer 자체가 다름.

#### ❌ D. 기존 cosmetics 테이블 재사용

장점: 없음
단점: 기존 entities 는 store/order/payment/event-offer 도메인. content/resource 와 무관.

### 4.3 권고 — **A 확정**

GP 가 이미 KPA 패턴을 검증해서 single-migration 으로 깔끔하게 정리한 상태. K-Cos 가 GP 를 mirror 하면 **risk 최소 + capability 최대 + frontend commonization 의 전제 조건 충족**.

---

## 5. 권한 구조 설계

| Route | Permission | 비고 |
|---|---|---|
| `GET /api/v1/cosmetics/contents` (public) | `optionalAuth` | 비로그인: published 만 / 로그인: 본인 draft/private 포함 (GP 패턴 그대로) |
| `GET /api/v1/cosmetics/operator/resources` | `authenticate + requireCosmeticsScope('cosmetics:operator')` | GP 의 `requireGlycopharmScope` mirror |
| `POST /api/v1/cosmetics/operator/resources` | 동일 | sub_type 자동 'resource' 주입 |
| `PATCH /api/v1/cosmetics/operator/resources/:id/status` | 동일 | VALID_STATUSES check |
| `DELETE /api/v1/cosmetics/operator/resources/:id` | 동일 | soft delete (`is_deleted = true`) |

**`cosmetics:operator` 권한 확인:** [serviceScope.ts](apps/api-server/src/utils/serviceScope.ts) + [membership.routes.ts](apps/api-server/src/routes/operator/membership.routes.ts) 의 requireRole 목록에 이미 `cosmetics:admin / cosmetics:operator` 존재 (선행 IR 확인됨). 추가 작업 없음.

**`requireCosmeticsScope` 함수:** GP 의 `requireGlycopharmScope` 패턴 mirror 필요 — 이미 `apps/api-server/src/routes/cosmetics/` 의 다른 controller 들이 `requireCosmeticsScope` 류를 사용 중일 가능성 (별건 확인). **확인 후 mirror 또는 신설**.

---

## 6. API 설계안 (GP 와 100% 동일)

### 6.1 Public — `GET /api/v1/cosmetics/contents`

```
Query: page / limit / search / sub_type / usage_type / source_type / status / sort (latest/popular/views)
Auth: optionalAuth
응답:
{
  success: true,
  data: {
    items: [{ id, title, summary, tags, category, status, sub_type, source_type, usage_type,
              source_url, source_file_name, thumbnail_url, created_by, author_name,
              like_count, view_count, reusable_policy, created_at, updated_at }],
    total, page, limit, totalPages
  }
}
```

### 6.2 Operator — 4 endpoints (GP 와 100% 동일)

```
GET    /api/v1/cosmetics/operator/resources     — 전체 status 포함, sub_type='resource' 강제 filter
POST   /api/v1/cosmetics/operator/resources     — title 필수, sub_type 자동 'resource' 주입
PATCH  /api/v1/cosmetics/operator/resources/:id/status   — VALID_STATUSES 검증
DELETE /api/v1/cosmetics/operator/resources/:id  — soft delete
```

응답: `{ success: true, data: ... }`
에러: `{ success: false, error: { code, message } }`

---

## 7. Response Shape — frontend commonization 정합

KPA `ResourceItem` + GP `GlycoResourceItem` + 신규 K-Cos `KCosResourceItem` 이 모두 동일 shape 이어야 `OperatorResourcesPage` wrapper 가 generic 으로 작동.

**공통 필드:**
```ts
interface ResourceItem {
  id: string;
  title: string;
  summary: string | null;
  tags: string[];
  category: string | null;
  status: 'draft' | 'published' | 'private';
  source_type: 'manual' | 'upload' | 'external';
  source_url: string | null;
  source_file_name: string | null;
  usage_type: 'READ' | 'LINK' | 'DOWNLOAD' | 'COPY' | null;
  thumbnail_url: string | null;
  created_by: string | null;
  author_name: string | null;
  like_count: number;     // GP 만 (KPA 는 0 으로 default 가능)
  view_count: number;     // 동일
  reusable_policy: 'restricted' | 'platform';
  created_at: string;
  updated_at: string;
}
```

**KPA vs GP 차이:** KPA 는 `like_count` / `view_count` / `author_name` / `updated_by` 컬럼 부재. 해결 옵션:
- (a) K-Cos 는 GP 와 100% 동일 (like_count / view_count / author_name 포함) → frontend wrapper 에서 KPA 응답에는 default 0/null 처리
- (b) KPA backend 도 같은 컬럼 추가 (선행 정합 WO) → 본 IR 범위 외

**권고: (a)** — K-Cos 는 GP 와 동일하게, frontend wrapper 가 KPA 응답의 누락 필드를 defensive 처리. (b) 는 별건 KPA 정합 WO 의 영역.

---

## 8. 최종 결정 (구현 명세)

### 8.1 신규 파일 목록 (후속 WO 의 산출물)

| 파일 | 역할 | 줄 수 추정 |
|---|---|---:|
| `apps/api-server/src/database/migrations/{ts}-CreateCosmeticsContentsTables.ts` | 단일 all-in-one migration (GP 1771200000027 mirror) | ~60 |
| `apps/api-server/src/routes/cosmetics/entities/cosmetics-content.entity.ts` | TypeORM entity (GP entity mirror) | ~100 |
| `apps/api-server/src/routes/cosmetics/controllers/resources.controller.ts` | `createCosmeticsContentsRouter` + `createCosmeticsOperatorResourcesRouter` (GP controller mirror) | ~340 |
| `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts` (수정) | `router.use('/contents', ...)` + `router.use('/operator/resources', ...)` 마운팅 (GP 463/465 mirror) | +5 |
| (옵션) `apps/api-server/src/routes/cosmetics/entities/index.ts` (수정) | entity export 추가 | +1 |

**합계: 신규 3 파일 + 수정 2 파일.** Backend-only.

### 8.2 ESM Entity 규칙 (CLAUDE.md §2)

`cosmetics-content.entity.ts` 작성 시:
- `@Entity('cosmetics_contents')` (스네이크 케이스 테이블)
- 다른 entity 참조 없음 (Resource 단독) → ManyToOne string 형식 불필요
- `import type` 만 사용 (해당 없음)

### 8.3 Core 동결 정책 (CLAUDE.md §3) 영향

| Core | 영향 |
|---|---|
| cms-core | ❌ 무관 (다른 paradigm) |
| auth-core | ❌ 무관 |
| platform-core | ❌ 무관 |
| organization-core | ❌ 무관 |

→ Core 동결 위반 없음. K-Cos service-specific 도메인 추가일 뿐.

### 8.4 Production Migration 표준 (CLAUDE.md §0)

- 배포: main 배포 → CI/CD 자동 실행
- Migration 검증: Cloud Run 로그 확인 (`gcloud logging read`)
- 별도 사용자 승인 불요 (단일 신규 테이블 CREATE)

---

## 9. 후속 WO 제안 — 순서 고정

### 9.1 `WO-O4O-KCOS-RESOURCES-BACKEND-V1` (1순위 — 본 IR 의 직접 후속)

| 항목 | 내용 |
|---|---|
| 범위 | 신규 3 파일 (entity / controller / migration) + 수정 2 파일 (cosmetics.routes.ts / entities index) |
| 패턴 | GP `glycopharm_contents` / `glycopharm-content.entity` / `resources.controller.ts` mirror |
| Backend 변경 | YES (의도) — entity + controller + route + migration |
| Frontend 변경 | 0 (K-Cos `OperatorResourcesPage.tsx` 신설은 다음 WO) |
| DB 변경 | YES — `cosmetics_contents` 테이블 신설 |
| Migration | YES (single migration) |
| 회귀 위험 | 매우 낮음 (신규 테이블, 다른 영역 무영향) |
| 검증 | Cloud Run 배포 후 `gcloud logging read` 로 migration 성공 확인 + `curl GET /api/v1/cosmetics/contents` (빈 목록 응답) |

### 9.2 `WO-O4O-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION-V1` (2순위 — backend 완료 후)

| 항목 | 내용 |
|---|---|
| 범위 | (a) K-Cos `kCosResourcesApi` + `OperatorResourcesPage.tsx` 신설 + (b) KPA + GP + K-Cos 3 service 가 동일 `OperatorResourcesConsolePage` wrapper 호출 |
| 패턴 | `operator-core-ui/modules/resources/OperatorResourcesConsolePage.tsx` (GP-only AiContentModal slot 포함) |
| Backend 변경 | 0 (선행 WO 가 완료 전제) |
| Frontend 변경 | 신규 wrapper + 3 service thin wrapper |
| 회귀 위험 | 낮음 (KPA/GP 는 wrapper 통합만, 동작 동일) |

→ **본 IR 의 핵심 권고: Capability 먼저, Wrapper 는 그 다음** (사용자 결정 그대로).

---

## 10. 본 IR 이 결정하지 않는 것

- 실제 코드 변경 (조사/설계 전용)
- WO-O4O-KCOS-RESOURCES-BACKEND-V1 의 실행 시점
- KPA backend 의 `like_count` / `view_count` / `author_name` 정합 (별건)
- KPA backend 의 operator routes 위치 (별도 확인 필요 — `routes/kpa/` 내 controller 분산 가능성)
- Frontend `OperatorResourcesConsolePage` wrapper 의 상세 API (AiContentModal slot 시그니처 등) — 후속 WO 의 영역
- 향후 추가 service 의 resource 도메인 추출 (Tier 4 generic module — 별건)

---

## 11. 현재 구조 vs O4O 철학 충돌 체크

| 차원 | 평가 | 충돌 |
|---|:---:|:---:|
| 공통 Core (operator-ux-core 등) | ✅ 인프라 충실 | 없음 |
| 서비스별 독립 도메인 | ✅ KPA/GP/K-Cos 각자 contents 테이블 보유 (의도된 분리) | 없음 |
| "같은 capability = 같은 backend 구조" | ✅ GP 가 KPA 패턴 mirror, K-Cos 도 같은 패턴 적용 — 일관성 확보 | 없음 |
| F6 Boundary Policy | ✅ `cosmetics:operator` scope guard 적용 | 없음 |
| ESM Entity 규칙 (F1 Core 외) | ✅ 단독 entity, 다른 entity 참조 없음 | 없음 |
| Core Freeze (F10) | ✅ cms-core / cms-content service 미영향 | 없음 |
| Production Migration Standard | ✅ 단일 migration, CI/CD 자동 실행 | 없음 |
| 사업 철학 (KPA = Community Canonical, GP/K-Cos 동등 축) | ✅ 본 IR 의 동일 capability 부여가 사용자 원칙 정합 | 없음 |

→ **충돌 0 건.** Capability parity 강화.

---

## 12. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| 새 즉시 WO 후보 | **1 건** (`WO-O4O-KCOS-RESOURCES-BACKEND-V1`) |
| 후속 WO 의 전제 조건 충족 | ✅ Frontend commonization WO (Tier 1.3) 의 K-Cos 차단 해소 |
| GP 패턴 = Canonical template 공식 인정 | ✅ 본 IR 명문화 |
| K-Cos Resource parity 22% → ~95% 회복 경로 확정 | ✅ Backend WO 후 frontend WO 로 완결 |
| 사이클 정리 | "Capability 먼저, Wrapper 는 그 다음" 원칙 정립 |

---

## 부록 — 조사 명령 (재현 가능)

```bash
# KPA / GP / K-Cos entity 비교
for SVC in kpa glycopharm cosmetics; do
  echo "=== $SVC ==="
  find apps/api-server/src/routes/$SVC/entities -name '*content*' -o -name '*resource*' 2>/dev/null
done

# GP canonical controller
cat apps/api-server/src/routes/glycopharm/controllers/resources.controller.ts

# K-Cos 부재 확인
grep -n "resources\|Resources\|resource" apps/api-server/src/routes/cosmetics/cosmetics.routes.ts
grep -rln "cosmetics_contents\|CosmeticsContent\|cosmeticsResources" apps/api-server/src

# Migration history
ls apps/api-server/src/database/migrations/*[Cc]ontent*.ts
ls apps/api-server/src/database/migrations/*[Gg]lycopharm*Contents*.ts

# cms-core vs glycopharm contents — paradigm 차이 확인
head -30 apps/api-server/src/routes/cms-content/cms-content.service.ts
```

---

*Created: 2026-05-24*
*Type: Investigation + Design Report (read-only)*
*Status: 조사 완료 — K-Cos backend gap 확정 + GP canonical template 채택 + 후속 WO 순서 고정.*
*Decision Required: `WO-O4O-KCOS-RESOURCES-BACKEND-V1` 진입 승인 → 후속 commonization WO.*
