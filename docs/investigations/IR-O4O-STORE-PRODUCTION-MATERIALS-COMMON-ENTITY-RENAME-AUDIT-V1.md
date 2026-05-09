---
id: IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1
title: "kpa_store_contents → store_production_materials 공통 entity rename 가능성 조사"
status: draft
date: 2026-05-09
scope:
  - 현재 `kpa_store_contents` table / `KpaStoreContent` entity 의 사용처 inventory
  - O4O 공통 Store capability 로 승격(`store_production_materials`) 가능 여부
  - rename / 신규 table / view alias / class-only rename 4 가지 전략 비교
  - API path, frontend, 다중 서비스(KPA / GlycoPharm / Cosmetics / Neture) 영향 범위
related:
  - docs/investigations/IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1.md
  - docs/investigations/IR-O4O-STORE-EXECUTION-CONTENT-ASSET-POLICY-V1.md
  - docs/investigations/IR-O4O-STORE-LIBRARY-CANONICAL-ASSET-FLOW-V1.md
  - docs/investigations/IR-O4O-COMMUNITY-TO-STORE-COPY-FLOW-AUDIT-V1.md
  - docs/architecture/STORE-LAYER-ARCHITECTURE.md
constraint:
  - 조사만 수행 — 코드 / migration / entity / table 변경 없음
  - 추정 금지 / 실제 코드 기준 / 자매 IR 사실은 출처 명시
---

# IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1

> "매장 제작 자료" 통합 entity 의 자연스러운 위치는 이미 `kpa_store_contents` 로 결정되어 있다
> ([CAPABILITY-AUDIT-V1](./IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1.md) §0 핵심 발견 #1).
> 본 IR 은 그 entity 를 KPA prefix 가 없는 공통 이름(`store_production_materials`) 으로 rename
> 가능한지를 정적으로 조사한다.

- 작성일: 2026-05-09
- 기준 브랜치: `main`
- 작업 규칙: 조사만 / 코드 수정 / migration / entity 생성 모두 금지

---

## 0. 결론 요약 (TL;DR)

> **현재 `kpa_store_contents` 는 코드 수준에서 이미 *KPA 전용이 아닌 공통 자산* 으로 동작하고 있다 — KPA / GlycoPharm / Cosmetics 세 서비스가 동일 컨트롤러(`createStoreContentController`) 를 `/store-contents` prefix 로 마운트하며 같은 table 을 공유한다. 컨트롤러·라우트 식별자에는 이미 `kpa-` prefix 가 없다. 다만 entity class(`KpaStoreContent`) 와 table 이름(`kpa_store_contents`) 두 곳만 KPA prefix 가 붙어 있고, 이로 인해 "이 자산이 KPA 전용처럼 보인다" 는 인지적 왜곡이 남아 있다. rename 의 *기술적 비용은 낮다* (FK 0개 · seed 0건 · raw SQL 2 군데 · 외부 API path 변경 불필요). 다만 결정적 제약이 하나 — `store_contents` 라는 이름은 *이미 점유* 되어 있다. `packages/interactive-content-core` 의 LMS Template-copy entity (`StoreContent` → table `store_contents`) 가 별도 도메인으로 살아 있고 `/api/v1/lms/store-contents/*` 로 노출된다. 즉, "공통화 = 단순 prefix 제거" 는 불가능하며, *반드시 다른 이름* 이 필요하다. IR 제안인 `store_production_materials` 는 이 충돌을 회피하면서 §1 자매 IR 의 의미("매장 제작 자료")와 정확히 일치한다.**

> **권장 경로: Option 2 — entity / class / 내부 SQL identifier 우선 변경, table rename 은 2단계.** Option 1(즉시 table rename) 은 다운타임 / 마이그레이션 오류 1 회 만으로도 운영 데이터가 사라질 수 있고, Cloud Run 의 dual-execution 마이그레이션 구조(api-server 시작 시 + Migration Job 양쪽) 와 잘 어울리지 않는다. Option 4(table 유지 + 문서만 공통화) 는 과거 prefix 가 고스란히 남아 장기 부채가 된다. Option 3(신규 table + 점진 이관) 은 *장점이 가장 크지만* 현재 운영 데이터 양·`source_type='direct'` 흐름의 신생함을 고려할 때 over-engineering 이다.

### 핵심 발견 8가지

1. **이미 multi-service 컨트롤러** — `createStoreContentController` 는 KPA / GlycoPharm / Cosmetics 세 라우터에서 공통 마운트되어 있다 ([§3.2](#32-라우트-마운트-3개-서비스-동일-컨트롤러)). 즉 공통화는 *완료된 사실* 이고, 남은 것은 entity / table 이름의 일관성뿐이다.
2. **`store_contents` 이름은 이미 점유됨** — `packages/interactive-content-core` 의 LMS Template-copy entity 가 `@Entity('store_contents')` 로 등록되고 `/api/v1/lms/store-contents/*` 로 활성 운영 중. 단순 prefix 제거 rename 은 충돌 ([§4.1](#41-store_contents-이름-점유-블로커-아님-회피-블로커)).
3. **FK 0건 / seed 0건** — `REFERENCES kpa_store_contents` / `FOREIGN KEY ... kpa_store_contents` 어디에도 없음. seed migration 도 0건. rename 의 데이터 무결성 부담이 거의 없다 ([§3.5](#35-fk--seed--demo-data-touchpoint)).
4. **raw SQL JOIN 2 군데** — `asset-render-filter.ts:120` / `published-assets.controller.ts:123` 두 곳에서 `LEFT JOIN kpa_store_contents sc ON sc.snapshot_id = s.id` 형태로 직접 참조. table rename 시 이 두 SQL 의 동기 변경이 필수.
5. **외부 API path 변경 불필요** — `/api/v1/{service}/store-contents/*` path 의미는 "매장 콘텐츠" 자체이므로, 내부 entity 명을 바꿔도 path 는 그대로 둘 수 있다. 호환성 문제 없음 ([§3.3](#33-api-path-구조)).
6. **legacy 컬럼 잔존** — `share_status` / `shared_at` / `shared_request_id` 는 `WO-O4O-REMOVE-STORE-TO-COMMUNITY-SHARE-FLOW-V1` 으로 *write 경로는 제거됨* 이나 컬럼 자체와 read 경로 일부(`content-approval.service.ts:160` 주석 참조) 가 잔존. rename 작업과 별개의 cleanup WO 가 이미 예고되어 있음.
7. **`source_type` 은 이미 service-agnostic** — `'snapshot_edit' | 'direct'` 로 KPA 고유 어휘가 없음. 공통 entity 로 승격 시 추가 작업 불필요.
8. **신규 컬럼 후보 중 *지금 반드시 필요한 것은 없다*** — `service_key` / `purpose` / `usage_type` / `source_material_id` 등은 모두 향후 결과물 reference 통일 작업(자매 IR `EXECUTION-CONTENT-ASSET-POLICY-V1` Phase 1 #2,#3) 에서 함께 다룰 후속 WO 후보. 본 IR rename 작업은 *컬럼 추가 없이* 진행 가능.

### 권장 결정

| 항목 | 권장 |
|------|------|
| 결론 옵션 | **Option 2** — entity/class/SQL identifier 우선 변경, table rename 은 2단계 |
| 권장 entity 이름 | `StoreProductionMaterial` |
| 권장 table 이름 | `store_production_materials` |
| 권장 controller 파일 | `store-production-material.controller.ts` (또는 현 파일 재사용 + 내부 import 만 변경) |
| API path | **유지** (`/api/v1/{service}/store-contents`) |
| migration 방식 | (Phase 2에서) `ALTER TABLE ... RENAME TO ...` 단일 트랜잭션 |
| 후속 WO | (a) entity rename · (b) raw SQL identifier 정렬 · (c) frontend type rename · (d) `share_*` 컬럼 cleanup · (e) (별도) table rename |

---

## 1. canonical 흐름 정의 (조사 기준)

자매 IR [`IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1`](./IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1.md) §1 의 흐름을 그대로 인용:

```text
[입력]
 ├─ 가져온 콘텐츠 (snapshot)           ← o4o_asset_snapshots
 ├─ 가져온 강의 (lesson reference)
 ├─ 매장 자료 (file/external-link)     ← store_library_items
 └─ 직접 입력 (direct content)
        │
        ▼
[편집 / AI 정리]
 ├─ snapshot 편집 (kpa_store_contents.snapshot_edit)
 ├─ direct 작성  (kpa_store_contents.direct)
 └─ AI 정리     (product_ai_content)
        │
        ▼
[매장 제작 자료]   ← 본 IR 의 rename 대상 entity
        │
        ▼
[사용처 결과물 생성]
 ├─ POP / QR / 블로그 / 상품 상세설명
        │
        ▼
[결과물 → 제작 자료 reference]
```

본 IR 의 핵심 질문:

> **"매장 제작 자료" 단계에 위치한 `kpa_store_contents` 를, KPA prefix 가 없는 공통 이름으로 지금 옮길 수 있는가?**

---

## 2. 현재 entity 정의

### 2.1 entity 파일

[apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts):

```typescript
@Entity('kpa_store_contents')
@Index('IDX_kpa_store_contents_snap', ['snapshot_id'])
@Index('IDX_kpa_store_contents_org', ['organization_id'])
export class KpaStoreContent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', nullable: true }) snapshot_id: string | null;
  @Column({ type: 'varchar', length: 30, default: 'snapshot_edit' })
  source_type: 'snapshot_edit' | 'direct';
  @Column({ type: 'uuid' }) organization_id: string;
  @Column({ type: 'varchar' }) title: string;
  @Column({ type: 'jsonb', default: '{}' })
  content_json: Record<string, unknown>;
  @UpdateDateColumn() updated_at: Date;
  @Column({ type: 'uuid', nullable: true }) updated_by: string | null;

  // share_* 3 컬럼 — write 경로 제거됨, cleanup 예정
  @Column({ type: 'varchar', length: 20, nullable: true })
  share_status: 'pending' | 'approved' | 'rejected' | null;
  @Column({ type: 'timestamptz', nullable: true }) shared_at: Date | null;
  @Column({ type: 'uuid', nullable: true }) shared_request_id: string | null;
}
```

### 2.2 register 위치

| 위치 | 라인 | 역할 |
|------|------|------|
| [apps/api-server/src/database/connection.ts](apps/api-server/src/database/connection.ts) | 288 | import |
| 같음 | 793 | DataSource entities 배열 등록 |
| [apps/api-server/src/routes/kpa/entities/index.ts](apps/api-server/src/routes/kpa/entities/index.ts) | 18 | re-export |

### 2.3 migration 이력 (3건)

| 파일 | 클래스 | 변경 내용 |
|------|--------|----------|
| `20260219000003-CreateKpaStoreContents.ts` | `CreateKpaStoreContents20260219000003` | CREATE TABLE / IDX_snap / IDX_org / UQ(snap, org) |
| `20260909000000-AddShareStatusToKpaStoreContents.ts` | `AddShareStatusToKpaStoreContents20260909000000` | `share_status`, `shared_at`, `shared_request_id` + partial index. **write 경로 폐기, 컬럼/read 일부 잔존.** |
| `20260917000000-ExtendKpaStoreContentsForDirect.ts` | `ExtendKpaStoreContentsForDirect20260917000000` | `source_type` 추가 / `snapshot_id` nullable / UQ → partial unique index |

### 2.4 index / unique constraint

| 종류 | 이름 | 컬럼 | 조건 |
|------|------|------|------|
| Index | `IDX_kpa_store_contents_snap` | `(snapshot_id)` | — |
| Index | `IDX_kpa_store_contents_org` | `(organization_id)` | — |
| Unique partial index | `UQ_kpa_store_contents_snap_org_partial` | `(snapshot_id, organization_id)` | `WHERE snapshot_id IS NOT NULL` |
| Index (partial) | `IDX_kpa_store_contents_share_status` | `(share_status)` | `WHERE share_status IS NOT NULL` |

---

## 3. 사용처 inventory

### 3.1 entity import 사용처

`KpaStoreContent` 클래스를 직접 import 하는 곳은 단 **2 군데**:

| 파일 | 용도 |
|------|------|
| [apps/api-server/src/database/connection.ts](apps/api-server/src/database/connection.ts) | DataSource 등록 |
| [apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts) | 7회 — repository 사용 (line 86 / 181 / 259 / 328 / 399 / 457 / 564) |

### 3.2 라우트 마운트 — **3개 서비스 동일 컨트롤러**

| 라우터 | 라인 | 마운트 path |
|--------|------|-------------|
| [apps/api-server/src/routes/kpa/kpa.routes.ts](apps/api-server/src/routes/kpa/kpa.routes.ts) | 77, 375 | `/store-contents` |
| [apps/api-server/src/routes/glycopharm/glycopharm.routes.ts](apps/api-server/src/routes/glycopharm/glycopharm.routes.ts) | 32, 362 | `/store-contents` |
| [apps/api-server/src/routes/cosmetics/cosmetics.routes.ts](apps/api-server/src/routes/cosmetics/cosmetics.routes.ts) | 27, 117 | `/store-contents` |

> 컨트롤러 자체는 이미 `o4o-store/controllers/` 디렉토리에 있고 함수명도 `createStoreContentController` 로 KPA prefix 가 없다. **즉 "공통화" 는 컨트롤러 / 라우트 / 디렉토리 수준에서 *이미 완성* 되어 있다.** 남은 것은 entity 와 table 이름뿐.

### 3.3 API path 구조

외부 API path 는 prefix 가 service 이름이고, 내부 path 는 `/store-contents` 로 통일되어 있다. **rename 시 이 path 는 유지 가능** — 의미가 충돌하지 않는다.

```
GET    /api/v1/kpa/store-contents
POST   /api/v1/kpa/store-contents
GET    /api/v1/kpa/store-contents/direct/:id
PUT    /api/v1/kpa/store-contents/direct/:id
DELETE /api/v1/kpa/store-contents/direct/:id
GET    /api/v1/kpa/store-contents/:snapshotId
PUT    /api/v1/kpa/store-contents/:snapshotId
```

(GlycoPharm / Cosmetics 도 path 만 다르고 서명 동일)

### 3.4 raw SQL 직접 참조 — **2 군데**

`kpa_store_contents` table 이름을 raw SQL 에 직접 박은 곳:

| 파일 | 라인 | 형태 |
|------|------|------|
| [apps/api-server/src/routes/kpa/helpers/asset-render-filter.ts](apps/api-server/src/routes/kpa/helpers/asset-render-filter.ts) | 120 | `LEFT JOIN kpa_store_contents sc ON sc.snapshot_id = s.id AND sc.organization_id = s.organization_id` |
| [apps/api-server/src/routes/o4o-store/controllers/published-assets.controller.ts](apps/api-server/src/routes/o4o-store/controllers/published-assets.controller.ts) | 123 | (동일 형태) |

두 곳 모두 `o4o_asset_snapshots` 와 `kpa_store_asset_controls` 와 함께 3-way join 후 `COALESCE(sc.title, s.title) / COALESCE(sc.content_json, s.content_json)` 로 store override 우선 적용. **table rename 시 이 두 SQL 도 함께 변경 필수**.

(외에 entity / migration / 본 IR / 자매 IR 등 *코드 외 문서 / migration 자체* 가 14 군데 더 언급하지만 이는 rename 시 자연 정리됨)

### 3.5 FK / seed / demo data touchpoint

| 항목 | 결과 |
|------|------|
| `REFERENCES kpa_store_contents` | **0건** |
| `FOREIGN KEY ... kpa_store_contents` | **0건** |
| seed migration 에서 `kpa_store_contents` INSERT | **0건** (`apps/api-server/src/database/migrations/*Seed*.ts` 30+ 건 모두 무관) |
| `seed-store-hub.controller.ts` / `seed-test-accounts.ts` | 무관 |

> data 무결성 위험이 거의 없다. rename 자체는 트랜잭션 1 개로 안전.

### 3.6 frontend 사용처

| 파일 | 사용 형태 |
|------|----------|
| [services/web-kpa-society/src/api/assetSnapshot.ts](services/web-kpa-society/src/api/assetSnapshot.ts) | `storeContentApi`, `directContentApi` 두 객체 — `/store-contents`, `/store-contents/:id`, `/store-contents/direct/:id` 호출 |
| [services/web-kpa-society/src/pages/pharmacy/StoreContentEditPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreContentEditPage.tsx) | `storeContentApi.get/save` 사용 — 주석에만 `kpa_store_contents` 등장 |
| [services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx](services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx) | 주석에만 `kpa_store_contents` 등장 (`'direct(kpa_store_contents)'`) |
| [apps/admin-dashboard/src/pages/kpa/MyStoreContentsPage.tsx](apps/admin-dashboard/src/pages/kpa/MyStoreContentsPage.tsx) | `API_BASE = '/api/v1/kpa/store-contents'`, `interface StoreContent { ... }` |
| [apps/admin-dashboard/src/pages/kpa/StoreContentWorkspacePage.tsx](apps/admin-dashboard/src/pages/kpa/StoreContentWorkspacePage.tsx) | (관련 화면) |

> frontend 어디에도 `kpa_store_contents` table 이름이 *runtime 식별자* 로 박혀있지 않다(주석/이름만 등장). API path 도 `/store-contents` 로 충돌 가능성 없음.

### 3.7 빠른 사용처 매트릭스

| 영역 | 항목 | rename 영향 |
|------|------|:-----------:|
| Entity 파일 | `KpaStoreContent` 클래스 | ✅ 변경 |
| `connection.ts` | import / DataSource entities | ✅ 변경 |
| `kpa/entities/index.ts` | re-export | ✅ 변경 |
| Migration 3건 | identifier 그대로 | ⚠ 신규 rename migration 필요 |
| Controller (1 파일) | repository getRepository() | ✅ 변경 |
| 3 서비스 라우트 마운트 | `createStoreContentController` 호출 | 🟡 (선택) 함수명 변경 시 동시 수정 |
| Raw SQL 2 군데 | `kpa_store_contents` 테이블명 | ✅ 변경 |
| API path | `/store-contents` 유지 | ❌ 변경 불필요 |
| Frontend type 이름 | `StoreContent` / `StoreContentData` | 🟡 (선택) |
| Frontend API 함수 | `storeContentApi` / `directContentApi` | 🟡 (선택) |
| FK / seed | — | ❌ 영향 없음 |

---

## 4. 공통 Store capability 적합성 — 이름 후보 비교

### 4.1 `store_contents` 이름 점유 (블로커 아님, 회피 블로커)

[packages/interactive-content-core/src/entities/store/StoreContent.ts](packages/interactive-content-core/src/entities/store/StoreContent.ts):

```typescript
@Entity('store_contents')
@Index(['storeId', 'status'])
@Index(['templateId'])
@Index(['storeId', 'templateId'])
@Index(['slug'], { unique: true })
export class StoreContent {
  templateId, templateVersionId, storeId, title, description,
  status: StoreContentStatus, slug, shareImage, isPublic, metadata, ...
}
```

이 entity 는 **별도 도메인** — LMS Template → Store 복사 흐름 (`WO-O4O-STORE-CONTENT-COPY`).
- migration: [apps/api-server/src/migrations/1771200000012-CreateStoreContentTables.ts](apps/api-server/src/migrations/1771200000012-CreateStoreContentTables.ts) (`store_contents` + `store_content_blocks`)
- controller: [apps/api-server/src/modules/lms/controllers/StoreContentController.ts](apps/api-server/src/modules/lms/controllers/StoreContentController.ts)
- 라우트: `/api/v1/lms/store-contents/*` ([apps/api-server/src/modules/lms/routes/lms.routes.ts:368-399](apps/api-server/src/modules/lms/routes/lms.routes.ts))
- frontend: [apps/admin-dashboard/src/api/store-content.api.ts](apps/admin-dashboard/src/api/store-content.api.ts) — `class StoreContentApi { basePath = '/api/v1/lms/store-contents' }`

**즉, `kpa_store_contents → store_contents` 라는 *단순 prefix 제거* 는 충돌**:
- table 이름이 동일 → CREATE TABLE 충돌
- entity 클래스 이름이 동일 → TypeORM duplicate decorator
- API path 도 (서비스 prefix 가 다르긴 해도) 의미 충돌

따라서 본 IR 의 제안 — `store_production_materials` — 는 *우회용* 이 아니라 **충돌 회피의 유일한 경로** 다.

### 4.2 후보 이름 비교

| 후보 | 의미 명확성 | POP/QR/Blog/상품설명 포괄성 | 커뮤니티 콘텐츠와 혼동 가능성 | 결과물 vs 원본 자료 구분 | 장기 공통 Store 적합성 | 점유 여부 |
|------|:----------:|:-------------------------:|:------------------------:|:---------------------:|:--------------------:|:--------:|
| `store_production_materials` | ◎ | ◎ ("제작 자료" = upstream payload) | ❎ | ◎ ("결과물" 과 구분 명확) | ◎ | 미점유 |
| `store_contents` | △ ("contents" 가 너무 광범) | ◎ | ⚠ 커뮤니티 콘텐츠와 동의어처럼 보임 | ❌ 결과물도 contents | △ | **점유됨** (LMS Template-copy) |
| `store_created_contents` | ○ | ○ | △ "생성된 콘텐츠" → 결과물처럼 보임 | ⚠ | ○ | 미점유 |
| `store_execution_materials` | △ "실행" 어휘는 결과물(execution_assets) 측 | ⚠ | ⚠ | ❌ `store_execution_assets` 와 어휘 충돌 | △ | 미점유 |
| `store_content_sources` | ○ | ○ | ○ | ◎ "source" 명시 | ○ | 미점유 |

**1순위: `store_production_materials`**
- 자매 IR (`KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1`) 의 canonical 어휘와 정확히 일치
- "제작" = 매장이 자기 손으로 가공하여 만든 자료 (snapshot 편집 / direct 입력 / AI 정리 결과 모두 포섭)
- "materials" = 다음 단계(POP/QR/Blog/AI) 결과물이 가져다 쓰는 *재료* — 결과물(`store_execution_assets`) 과 의미 분리됨
- 커뮤니티 콘텐츠 (`forum_post`, `kpa_contents`) 와 어휘적 충돌 없음

**2순위: `store_content_sources`** — `source` 어휘가 결과물 reference (`source_material_id`) 와 어울리지만, "sources" 가 "원본 출처" 처럼 들려서 "이미 가공된 자료"라는 뉘앙스가 약하다.

---

## 5. Migration 전략 비교

### A. Table rename — `ALTER TABLE kpa_store_contents RENAME TO store_production_materials`

| 항목 | 평가 |
|------|------|
| 데이터 안전성 | ◎ — 단일 트랜잭션, 데이터 손상 가능성 0 |
| 다운타임 | ⚠ — Cloud Run dual-execution(api-server 시작 시 + Migration Job, [Memory: Migration Deployment & Execution Architecture](C:/Users/sohae/.claude/projects/c--Users-sohae-o4o-platform/memory/MEMORY.md)) 구조에서 *구 코드 + 신규 table* 또는 *신규 코드 + 구 table* 일시적 부정합 발생 가능 |
| 코드 동기화 | ⚠ — entity / raw SQL 2 군데 / index 4개 / migration self-reference 모두 *동일 배포에서* 변경되어야 함 |
| 롤백 | ○ — `DOWN: ALTER TABLE store_production_materials RENAME TO kpa_store_contents` |
| Index 이름 | ⚠ — `IDX_kpa_store_contents_*`, `UQ_kpa_store_contents_*` 4개 모두 별도 RENAME INDEX 필요 |

**위험 시나리오**: 배포 직후 cold start 중 새 컨테이너는 `store_production_materials` 를 찾고, 마지막 cold-down 중인 구 컨테이너는 `kpa_store_contents` 를 찾는 한 두 요청 간 5xx 가능성. 다만 짧은 윈도우 (수십 초). 운영 데이터 손상 위험은 거의 없음.

### B. 신규 table 생성 + data copy + 코드 전환

| 항목 | 평가 |
|------|------|
| 데이터 안전성 | ◎ — 구 table 보존, 점진 이관 |
| 코드 복잡도 | ❌ — *두 경로 동시 read/write* 기간이 길어짐 |
| 롤백 | ◎ |
| 적합성 | ❌ — 현재 `kpa_store_contents` 운영 row 수가 (자매 IR 시점 기준) 크지 않고, 이중-write 단계 자체가 새로운 버그 surface |

> **over-engineering**. 본 케이스에 부적합.

### C. View/alias compatibility

| 항목 | 평가 |
|------|------|
| 구조 | `store_production_materials` canonical → `CREATE VIEW kpa_store_contents AS SELECT * FROM store_production_materials` |
| 장점 | 외부 직접 SQL 접근(분석/operational queries) 호환 |
| 단점 | TypeORM repository 가 view 를 update 대상으로 인식하지 않음, INSTEAD OF trigger 필요 → 복잡도 폭증 |
| 적합성 | ❌ — 본 entity 는 운영 SQL 사용처가 거의 없어 view 보호 가치가 낮음 |

### D. Table 유지 + entity/class만 rename

| 항목 | 평가 |
|------|------|
| 즉시성 | ◎ — migration 불필요 |
| 의미 정합성 | ❌ — 가장 큰 부채. table 이름이 `kpa_store_contents` 인 채로 entity 만 `StoreProductionMaterial` 이면 *DB 레벨 식별자와 코드 식별자가 영구 분리*. 향후 신규 개발자 / 운영 SQL 모두 KPA prefix 를 보고 혼동 |
| 부분 개선 | ⚠ — 단 raw SQL 2 군데 와 migration history 의 식별자 잔존 |

> 임시 미봉책. 장기 부채.

### 추천: **Option 2 = D 의 즉시성 + A 의 완결성을 2 단계로 분할**

```
[Phase 2-A — code rename]   (즉시, 별도 migration 불필요)
   - entity 파일 rename:
       kpa-store-content.entity.ts → store-production-material.entity.ts
       class KpaStoreContent → class StoreProductionMaterial
   - @Entity('kpa_store_contents') 그대로 유지 (table 은 아직)
   - controller / index.ts / connection.ts import 정렬
   - frontend type 이름 정렬 (선택)

[Phase 2-B — table rename]   (별도 migration WO)
   - ALTER TABLE kpa_store_contents RENAME TO store_production_materials
   - ALTER INDEX 4건 RENAME
   - raw SQL 2 군데 동기 변경
   - @Entity 데코레이터 인자 변경
```

**왜 2 단계로 나누는가:**
- Phase 2-A 는 *DB 변경 없음* — 100% 안전, 어떤 시점에 배포해도 무중단
- Phase 2-B 는 dual-execution 마이그레이션 윈도우(수십 초) 만 짧은 위험 → 별도 WO 로 deploy window 잡고 진행

---

## 6. Data model 확장성 — 컬럼 추가 후보

자매 IR ([CAPABILITY-AUDIT §0 핵심 발견 #2](./IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1.md)) 가 이미 정리: `content_json` (jsonb) 으로 *컬럼 추가 없이* metadata 흡수 가능.

| 컬럼 | 지금 필요 | jsonb 충분 | 컬럼화 권장 | 비고 |
|------|:--------:|:---------:|:----------:|------|
| `id` | ✅ 보유 | — | — | 변경 없음 |
| `organization_id` | ✅ 보유 | — | — | 변경 없음 |
| `snapshot_id` | ✅ 보유 | — | — | nullable(`source_type='direct'` 행) |
| `source_type` | ✅ 보유 | — | — | `'snapshot_edit' | 'direct'` |
| `content_json` | ✅ 보유 | — | — | 모든 metadata 흡수처 |
| `share_status / shared_at / shared_request_id` | ❌ | — | — | **삭제 후보** (별도 cleanup WO) |
| `service_key` | ❌ | ✅ jsonb 가능 | (장기) ⚠ | 현재 multi-service 컨트롤러는 **mount path** 로 service 를 구분하므로 컬럼화 필요 없음. 단 cross-service 조회/통계 필요 시 그때 컬럼화 |
| `purpose` (POP/QR/Blog 어디 쓸지 의도) | ❌ | ✅ `content_json.purpose` | — | 자매 IR 권장 |
| `usage_type` | ❌ | ✅ `content_json.usage` | — | 동일 |
| `material_status` (draft/active/archived) | ❌ | ⚠ 차후 컬럼화 검토 | (장기) ⚠ | 결과물 lifecycle 통일 시 (자매 IR Phase 1 #4) |
| `source_material_service / source_material_id / created_from / original_source_type` | ❌ | ⚠ | (장기) ⚠ | **결과물 측에 source reference 추가** 가 우선 (자매 IR `EXECUTION-CONTENT-ASSET-POLICY-V1` Phase 1 #2,#3). 본 entity 측 추가는 후속 |

**결론**: rename 작업 자체는 *컬럼 변경 없음* 이 권장. 컬럼 추가 후보는 모두 후속 WO 로 분리.

---

## 7. Multi-service 영향 조사

### 7.1 현재 multi-service 사용 현황

| Service | mount | 사용 |
|---------|:-----:|:----:|
| KPA | ✅ | `/api/v1/kpa/store-contents` |
| GlycoPharm | ✅ | `/api/v1/glycopharm/store-contents` |
| Cosmetics | ✅ | `/api/v1/cosmetics/store-contents` |
| Neture | ❌ | 미마운트 |

> 컨트롤러는 service-agnostic (org membership 으로만 분기). Neture 도 동일 방식으로 mount 가능.

### 7.2 service 분리 메커니즘

| 메커니즘 | 현재 |
|---------|------|
| organization_id 분리 | ✅ 모든 query 에 필수 (line 88-89, 261, 459, 566 등) |
| serviceKey 필드 | ❌ entity 에 없음 — *서비스 분리는 mount path × org membership 로 충분* |
| KPA-specific 권한 | ⚠ `isStoreOwner(dataSource, userId, 'kpa')` (line 138, 224, 310, 383) — `'kpa'` 가 **하드코딩** |
| KPA-specific resolver | ⚠ `KpaMember` 를 통해 organization_id 해결 (line 49-52, 153, 226, 318) |

### 7.3 KPA 하드코딩 항목 (rename 작업 *외부* 의 별도 부채)

`store-content.controller.ts` 안에 잔존:

| 위치 | 코드 |
|------|------|
| line 138 | `await isStoreOwner(dataSource, userId, 'kpa')` |
| line 224 | `await isStoreOwner(dataSource, userId, 'kpa')` |
| line 310 | `await isStoreOwner(dataSource, userId, 'kpa')` |
| line 383 | `await isStoreOwner(dataSource, userId, 'kpa')` |
| line 36, 49-52, 153, 226-227, 318 | `KpaMember` repository fallback |

> 이는 *컨트롤러가 GlycoPharm / Cosmetics 라우트에 mount 되어도 권한 검사는 KPA 기준* 으로 한다는 뜻. **rename 의 책임 범위 밖** — 후속 WO `WO-O4O-STORE-CONTENT-CONTROLLER-SERVICE-AGNOSTIC-V1` 로 분리 권장.

### 7.4 공통 entity 승격 적합성

| 기준 | 평가 |
|------|------|
| organization-based 분리 가능 | ✅ |
| serviceKey 필요 여부 | ❌ 현 시점 불필요 (단 cross-service 통계 시 추가 검토) |
| KPA-specific 권한 분리 가능 | ⚠ 후속 WO 필요 (rename 과 독립) |
| 공통 `/store` route 사용 가능 | ✅ — 컨트롤러는 이미 `o4o-store/controllers/` 에 위치 |
| KPA-specific naming 제거 | ✅ 본 IR 의 rename 으로 entity / class / table 이름은 정리됨 |

---

## 8. Risk 분석

| Risk | 강도 | 원인 | 완화 |
|------|:----:|------|------|
| 운영 데이터 손상 | 🟢 낮음 | FK 0건 / seed 0건 / `ALTER ... RENAME TO` 는 in-place 식별자 변경만 | Phase 2-B 트랜잭션 1 개로 처리, DOWN 정의 |
| migration 실패 | 🟡 중간 | TypeORM migration class name 식별자 규칙 ([Memory: TypeORM Migration Class Naming](C:/Users/sohae/.claude/projects/c--Users-sohae-o4o-platform/memory/MEMORY.md)), index rename 누락 | rename migration 생성 시 4 index + UQ partial 모두 명시 |
| API backward compatibility | 🟢 낮음 | 외부 path `/store-contents` 유지 / 응답 필드 명 유지 | rename 작업이 응답 필드 건드리지 않음 |
| old route dependency | 🟢 낮음 | KPA / GlycoPharm / Cosmetics 라우트 마운트 코드는 `createStoreContentController` 함수명 의존 | 함수명 유지 또는 동시 변경 |
| dashboard assets 연결 | 🟡 중간 | `published-assets.controller.ts` 의 raw SQL JOIN | Phase 2-B 에서 SQL 동기 변경 |
| snapshot/direct origin 깨짐 | 🟢 낮음 | `source_type` 컬럼 자체는 변경 없음, COALESCE 로직 동일 | (확인) `asset-render-filter.ts` 와 `published-assets.controller.ts` 두 SQL 동기 |
| 운영 row 의 service 구분 불명 | 🟡 중간 | 현재는 `organization_id` 만으로 service 구분 (서비스 분리는 mount path) | service 별 통계 필요 시 후속 컬럼화 |
| CI / build 영향 | 🟢 낮음 | TypeScript project references([Memory: TypeScript Build Verification](C:/Users/sohae/.claude/projects/c--Users-sohae-o4o-platform/memory/MEMORY.md)) — entity 위치 변경 없음, import path 만 변경되면 `tsc -b --noEmit` 통과 |
| Cloud Run dual-execution 불일치 윈도우 | 🟡 중간 | api-server startup migration + Migration Job 양쪽이 동시 실행 가능 ([Memory: Migration Deployment & Execution Architecture](C:/Users/sohae/.claude/projects/c--Users-sohae-o4o-platform/memory/MEMORY.md)) | Phase 2-B 시 deploy window 잡기 + ALTER TABLE 은 idempotent 하게 작성 |
| frontend type 이름 부정합 | 🟢 낮음 | type 이름 변경은 별도 PR 가능 | (선택) 후속 WO |
| `share_*` legacy column 충돌 | 🟢 낮음 | column 자체 잔존, write 경로 폐기 | 별도 cleanup WO |
| Rollback 전략 | 🟢 낮음 | DOWN 에서 역순 rename 정의 | 단, `share_*` cleanup 이 함께 진행되면 rollback 복잡도 ↑ → cleanup 과 분리 |

---

## 9. 최종 정리

### A. 사용처 전체 inventory

| 카테고리 | 항목 |
|---------|------|
| Entity 클래스 | `KpaStoreContent` × 1 (`apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts`) |
| Entity import 사용처 | 2 (connection.ts / store-content.controller.ts) |
| Re-export | `apps/api-server/src/routes/kpa/entities/index.ts:18` |
| Migration | 3건 (CREATE, AddShareStatus, ExtendForDirect) |
| Index/UQ | 4건 (`IDX_*_snap` / `IDX_*_org` / `UQ_*_snap_org_partial` / `IDX_*_share_status`) |
| Controller 파일 | `apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts` |
| Controller 함수 | `createStoreContentController` (이미 KPA prefix 없음) |
| 라우트 마운트 | KPA / GlycoPharm / Cosmetics 3 곳 |
| API path | `/api/v1/{service}/store-contents` (외부 변경 불필요) |
| Raw SQL JOIN | 2 (`asset-render-filter.ts:120`, `published-assets.controller.ts:123`) |
| Hub-content 참조 | 주석/식별자 only — `hub-content.service.ts` 4 군데 (실 query 없음) |
| FK | **0** |
| Seed migration | **0** |
| Frontend API client | `services/web-kpa-society/src/api/assetSnapshot.ts` (`storeContentApi`, `directContentApi`) / `apps/admin-dashboard/src/api/store-content.api.ts` (별도 LMS 영역, **rename 영향 없음**) |
| Frontend page | `StoreContentEditPage.tsx` / `MyStoreContentsPage.tsx` / `StoreContentWorkspacePage.tsx` |
| Frontend SQL/table 직접 참조 | **0** (주석만 잔존) |
| Legacy 컬럼 (cleanup 대기) | `share_status` / `shared_at` / `shared_request_id` |

### B. Rename 가능 범위

| 식별자 | rename 가능 | 비고 |
|--------|:-----------:|------|
| Entity class `KpaStoreContent` | ✅ | `StoreProductionMaterial` 권장 |
| Entity 파일명 `kpa-store-content.entity.ts` | ✅ | `store-production-material.entity.ts` 권장 |
| Re-export 위치 `kpa/entities/index.ts` | ⚠ | 장기적으로 `o4o-store/entities/` 또는 `store-core` 로 이동 (별도 WO) |
| Table `kpa_store_contents` | ✅ | `store_production_materials` |
| Index 4건 | ✅ | `IDX_store_production_materials_*` 등 |
| Controller 파일명 | 🟡 | 이미 `store-content.controller.ts` (KPA prefix 없음) — 의미상 `store-production-material.controller.ts` 가 더 정합 (선택) |
| Controller 함수명 `createStoreContentController` | 🟡 | 의미상 `createStoreProductionMaterialController` 권장 (선택) |
| API path `/store-contents` | ❌ | **유지 권장** — 외부 호환성 |
| Frontend type 이름 | 🟡 | 정합성 위해 변경 권장 (선택) |

### C. 즉시 rename 가능 여부

| 단계 | 즉시 가능 | 권장 |
|------|:--------:|------|
| Phase 2-A — code rename (table 유지) | ✅ | **즉시 가능** — DB 변경 없음, FK 없음, 테스트만 통과하면 안전 |
| Phase 2-B — table rename | ⚠ | 별도 deploy window WO 권장 (dual-execution 윈도우) |

### D. 권장 table / entity 이름

```
Entity class :  StoreProductionMaterial
Entity file  :  store-production-material.entity.ts
Table        :  store_production_materials
Index        :  IDX_store_production_materials_snap
                IDX_store_production_materials_org
                UQ_store_production_materials_snap_org_partial
Controller   :  (선택) store-production-material.controller.ts / createStoreProductionMaterialController
API path     :  /api/v1/{service}/store-contents  (변경 없음)
```

### E. 권장 migration 방식

**Option 2 (Phase 2-A → Phase 2-B 분할)**

- Phase 2-A: code-only rename. migration 0개. 즉시 배포 가능.
- Phase 2-B: 단일 migration `RenameKpaStoreContentsToStoreProductionMaterials{TS}` —
  - `ALTER TABLE kpa_store_contents RENAME TO store_production_materials`
  - `ALTER INDEX IDX_kpa_store_contents_snap RENAME TO IDX_store_production_materials_snap`
  - `ALTER INDEX IDX_kpa_store_contents_org RENAME TO IDX_store_production_materials_org`
  - `ALTER INDEX "UQ_kpa_store_contents_snap_org_partial" RENAME TO "UQ_store_production_materials_snap_org_partial"`
  - `ALTER INDEX IDX_kpa_store_contents_share_status RENAME TO IDX_store_production_materials_share_status` (cleanup 까지 잠시 유지) **또는** `share_*` 컬럼 cleanup 과 동시 진행
  - 동일 PR 에서 raw SQL 2 군데 (`asset-render-filter.ts:120`, `published-assets.controller.ts:123`) 와 `@Entity()` 데코레이터 변경

> migration class name 은 [Memory: TypeORM Migration Class Naming](C:/Users/sohae/.claude/projects/c--Users-sohae-o4o-platform/memory/MEMORY.md) 규칙 준수.

### F. 필요한 사전 작업

1. **자매 IR (`EXECUTION-CONTENT-ASSET-POLICY-V1`) Phase 1 #1** — "매장 제작 콘텐츠 = 단일 entity" canonical 정책 선언이 *문서상* 으로 먼저 확정되어야 rename 의 근거가 명확해짐.
2. **frozen baseline 확인** — Store Layer Architecture (`F3`, [docs/architecture/STORE-LAYER-ARCHITECTURE.md](docs/architecture/STORE-LAYER-ARCHITECTURE.md)) 가 freeze 상태이나 본 변경은 *구조 변경이 아닌 식별자 정렬* 이므로 freeze 정책에 위반되지 않음. 단 explicit WO 형식으로 진행 권장.
3. **운영 데이터 양 확인** — Cloud SQL `SELECT count(*) FROM kpa_store_contents` 로 data scale 확인 (read-only 검증, [CLAUDE.md §0](CLAUDE.md))
4. **`share_*` cleanup 분리** — rename 과 column 삭제는 한 PR 에서 합치지 말 것 (rollback 복잡도)
5. **deploy window 협의** — Phase 2-B 는 dual-execution 윈도우 (수십 초) 가 발생할 수 있음

### G. 후속 WO 후보

| WO 제안 | 단계 | 의존 |
|---------|:---:|------|
| `WO-O4O-STORE-CONTENT-PRODUCTION-MATERIAL-CODE-RENAME-V1` | Phase 2-A | — |
| `WO-O4O-STORE-CONTENT-PRODUCTION-MATERIAL-TABLE-RENAME-V1` | Phase 2-B | Phase 2-A 머지 |
| `WO-O4O-STORE-CONTENT-LEGACY-SHARE-COLUMNS-CLEANUP-V1` | 독립 | — |
| `WO-O4O-STORE-CONTENT-CONTROLLER-SERVICE-AGNOSTIC-V1` | 독립 | KPA 하드코딩 (`isStoreOwner('kpa')` × 4) 제거, GlycoPharm / Cosmetics 권한 분기 도입 |
| `WO-O4O-STORE-CONTENT-ENTITY-RELOCATE-V1` (선택) | 독립 | `routes/kpa/entities/` → `modules/store-core/entities/` 또는 `store-core` 패키지 |
| `WO-O4O-STORE-CONTENT-FRONTEND-TYPE-RENAME-V1` (선택) | 독립 | type 이름 / API client 정합성 |
| `WO-O4O-STORE-CONTENT-SOURCE-MATERIAL-REFERENCE-V1` (자매 IR Phase 1 #2,#3 후속) | 독립 | 결과물 → 제작 자료 reference 통일 |

---

## 결론 (Option 판정)

```text
Option 1. 지금 바로 table rename 가능                                    ❌ 비권장
   - 기술적으로는 가능하나 dual-execution 윈도우의 위험을 단계적으로
     처리할 기회를 놓침. code 와 DB 변경이 한 PR 에 묶여 rollback 시
     영향 범위가 커짐.

Option 2. entity/class/API 내부명 먼저 변경, table rename 은 2단계         ✅ 권장
   - Phase 2-A 는 DB 변경 0건, 즉시 무중단 배포 가능
   - Phase 2-B 는 migration 1건, 별도 deploy window 로 안전 처리
   - frontend / 외부 API path 영향 없음
   - 자매 IR 의 canonical "매장 제작 자료" 어휘와 직접 정합

Option 3. 신규 common table 생성 후 점진 이관                              ❌ 비권장 (over-engineering)
   - 본 entity 의 운영 row scale / 신생함 / FK 0 건 / seed 0 건을 고려할 때
     이중-write 단계가 새로운 버그 surface 만 추가.

Option 4. 현재 table 유지, 문서상 canonical만 공통화                       ❌ 비권장 (단기 미봉)
   - 장기 부채. DB 식별자가 여전히 `kpa_*` prefix → 신규 개발자 / 운영 SQL
     모두 KPA 전용처럼 오해.
```

**최종 권장 — Option 2.**

> Phase 2-A (code rename, table 유지) 를 우선 머지하여 *코드상 공통화* 를 완성하고,
> Phase 2-B (`ALTER TABLE ... RENAME TO ...`) 는 별도 deploy window WO 로 분리하여
> dual-execution 윈도우의 short-term 위험을 격리한다. `share_*` 컬럼 cleanup,
> 컨트롤러 service-agnostic 화, entity relocate 는 모두 *독립 WO* 로 분리한다.

---

## Appendix — Inventory Cross-Reference

### Backend 변경 대상 파일 (Phase 2-A)

| 파일 | 변경 종류 |
|------|----------|
| `apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts` | rename → `store-production-material.entity.ts` (또는 `o4o-store/` 아래로 relocate) / class 이름 변경 |
| `apps/api-server/src/routes/kpa/entities/index.ts:18` | re-export path 갱신 |
| `apps/api-server/src/database/connection.ts:288, 793` | import / DataSource 등록 갱신 |
| `apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts` | import / repository 호출 7 군데 |
| (선택) controller 파일명 / 함수명 / mount 호출 측 (kpa.routes.ts:77,375 / glycopharm.routes.ts:32,362 / cosmetics.routes.ts:27,117) | 선택적 정렬 |

### Backend 변경 대상 파일 (Phase 2-B)

| 파일 | 변경 종류 |
|------|----------|
| 신규 migration `*-RenameKpaStoreContentsToStoreProductionMaterials.ts` | ALTER TABLE / ALTER INDEX × 4 |
| `apps/api-server/src/routes/kpa/helpers/asset-render-filter.ts:120` | raw SQL 식별자 |
| `apps/api-server/src/routes/o4o-store/controllers/published-assets.controller.ts:123` | raw SQL 식별자 |
| (Phase 2-A 에서 변경 안한 entity 의 `@Entity('kpa_store_contents')` → `@Entity('store_production_materials')`) | 데코레이터 인자 |

### Frontend 변경 대상 (선택, 별도 WO)

| 파일 | 변경 종류 |
|------|----------|
| `services/web-kpa-society/src/api/assetSnapshot.ts` | type 이름(`StoreContentData`) / 함수 이름 (선택) |
| `services/web-kpa-society/src/pages/pharmacy/StoreContentEditPage.tsx` | 주석만 |
| `services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx` | 주석만 |
| `apps/admin-dashboard/src/pages/kpa/MyStoreContentsPage.tsx` | type 이름 / page 이름 (선택) — **API path `/api/v1/kpa/store-contents` 는 유지** |

### 무관 (rename 영향 없음)

| 파일 | 이유 |
|------|------|
| `packages/interactive-content-core/src/entities/store/StoreContent.ts` | 별도 도메인 (LMS Template-copy) |
| `apps/api-server/src/migrations/1771200000012-CreateStoreContentTables.ts` | LMS `store_contents` 테이블 |
| `apps/api-server/src/migrations/1771200000013-AddStoreContentUsageFields.ts` | LMS `store_contents` 테이블 |
| `apps/api-server/src/modules/lms/controllers/StoreContentController.ts` | LMS Template-copy 컨트롤러 |
| `apps/api-server/src/modules/lms/routes/lms.routes.ts:368-399` | LMS 라우트 |
| `apps/admin-dashboard/src/api/store-content.api.ts` | LMS Template-copy API client |
| `apps/admin-dashboard/src/pages/store-content/*` | LMS Template-copy 페이지 |
| `apps/admin-dashboard/src/pages/dashboard/unified/cards/StoreContentCard.tsx` | LMS dashboard card |

---

*조사 완료. 코드/migration/table 변경 없음. 본 IR 의 권장 Option 2 진행은 별도 WO 승인 후.*
