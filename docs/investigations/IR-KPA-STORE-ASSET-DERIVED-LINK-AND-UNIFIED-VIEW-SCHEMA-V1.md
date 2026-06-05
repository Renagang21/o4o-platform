# IR-KPA-STORE-ASSET-DERIVED-LINK-AND-UNIFIED-VIEW-SCHEMA-V1

> **조사 전용 (read-only).** 코드/마이그레이션/API/UI/git 변경 없음. KPA-Society `내 약국 → 내 자료함`에서 POP·QR·블로그(·사이니지) 제작 결과물을 **통합 노출**하고, **원본 콘텐츠 ↔ 파생 결과물 관계**를 추적하기 위한 스키마·데이터 흐름을 결정한다 (Phase 2-B 설계 근거).

- **작성일**: 2026-06-04
- **작업 유형**: Investigation (IR) — 구현·migration 없음
- **조사 범위**: `apps/api-server/src`, `services/web-kpa-society/src`, `packages`
- **선행**: `IR-KPA-STORE-CONTENT-LIBRARY-AND-ASSET-CREATION-FLOW-AUDIT-V1` / WO `1e50247de`(cross-create CTA) · `9d967d45a`(POP 저장) · `36c47f060`(콘텐츠→POP PDF)

---

## 1. Executive Summary

**결론: 저장소를 합치지 말 것. 기존 분절 저장소는 유지하고, (1) 내 자료함에서 결과물을 "읽기 통합 노출"하고, (2) 원본↔파생 관계는 별도 relation table 한 곳에 적재한다.** GCS orphan 정리는 별도 운영성 WO로 분리한다.

핵심 실측:
1. **결과물 3종은 서로 다른 테이블 + 서로 다른 boundary 컬럼**을 가진다 — QR=`store_qr_codes(organization_id)`, 블로그=`store_blog_posts(store_id+service_key)`, POP=`store_execution_assets(organization_id)`. 통합 테이블로 합치면 boundary·삭제정책·상태머신이 충돌한다.
2. **어떤 결과 테이블에도 "원본 콘텐츠 source-link" 컬럼이 없다.** 현재 출처 추적은 `description`/`excerpt` 의 텍스트 prefix(`[운영자 자료 가져옴]`)뿐 — 파싱 의존, 약함. (예외: `kpa_store_contents` 는 `source_metadata jsonb`+`snapshot_id`+`author_role` 로 강한 추적 보유.)
3. **`store_execution_assets` 에는 `metadata` 도 `source_*` 컬럼도 없다.** POP 결과(file/generated/pop)는 저장되지만 원본 관계를 담을 곳이 없다.
4. **읽기 통합은 마이그레이션 없이 가능**하다 — 기존 list API(QR `GET /pharmacy/qr`, 블로그 `GET /stores/:slug/blog/staff`, 콘텐츠 `GET /store-library/contents`)를 프론트에서 병합하면 된다.
5. **GCS 파일은 DB row 삭제와 분리**되어 있다 — GCS path(`media/{yyyy}/{mm}/{uuid}.ext`)에 org/asset id 가 없고, `store_execution_assets` 삭제가 GCS/`MediaAsset` 를 정리하지 않아 **orphan 발생**(Phase 2-A 검증에서 실측: asset row 삭제 후 GCS PDF 잔존).

**권장: 권장안 A** — ① 읽기 통합(매장 제작 자료, migration 0) → ② `store_asset_derivations` relation table 도입(원본↔파생) → ③ GCS orphan cleanup 별도 운영성 WO.

---

## 2. 선행 완료 상태

| 항목 | 결과 | commit |
|------|------|--------|
| 내 자료함/제작 흐름 audit | 완료 | (IR) |
| 콘텐츠/제작자료 → POP/QR/블로그/사이니지 cross-create CTA | 완료 | `1e50247de` |
| POP PDF 저장(GCS+store_execution_assets file/generated/pop) + 재출력 | 완료 | `9d967d45a` |
| 콘텐츠/제작자료(direct/snapshot) → POP PDF 생성 | 완료 | `36c47f060` |

남은 과제: 결과물(QR/블로그/POP) **내 자료함 통합 노출** + **원본↔파생 관계 추적** + GCS orphan.

---

## 3. 현재 저장소 구조 (결과물 중심)

```text
POP PDF      → store_execution_assets (asset_type=file, source_type=generated, category=pop, usage_type=pop) + GCS object
QR-code      → store_qr_codes (organization_id)                          [전용]
블로그        → store_blog_posts (store_id + service_key)                  [전용]
사이니지      → store_playlists / store_playlist_items(snapshot_id) / signage_media   [전용, snapshot 참조로 비교적 정합]

내 자료함 콘텐츠   → o4o_asset_snapshots + kpa_store_contents
내 자료함 자료     → store_execution_assets(uploaded) + o4o_asset_snapshots(resource)
내 자료함 제작자료  → kpa_store_contents(direct) + store_execution_assets(generated)  ← POP 결과가 여기 노출됨
```

---

## 4. DB Schema Map (조사 결과)

### store_execution_assets (`routes/platform/entities/store-execution-asset.entity.ts`)
- 컬럼: id, **organization_id**(boundary), title, description, file_url, file_name, file_size, mime_type, category, asset_type(file/content/external-link), usage_type(pop/qr/signage/banner/notice), url, html_content, source_type(uploaded/generated), is_active, created_at, updated_at
- **source 관계 컬럼: 없음 / metadata jsonb: 없음**
- 삭제: soft 권장 패턴(is_active) — **GCS/ MediaAsset 미연동**
- 통합 노출 적합성: ✅ (POP 이미 여기 적재). schema 변경 필요: 관계 추적하려면 **있음(아래 §9)**

### store_qr_codes (`routes/platform/entities/store-qr-code.entity.ts`)
- 컬럼: id, **organization_id**(boundary), type, title, description, **library_item_id**(논리 ref→store_execution_assets, FK 없음), landing_type(link/page/product), landing_target_id, slug(unique), is_active, created_at, updated_at
- **source 관계 컬럼: 없음** (출처=description prefix). list: `GET /pharmacy/qr` → items[+scanCount]. 삭제: **soft(is_active=false)**

### store_blog_posts (`routes/glycopharm/entities/store-blog-post.entity.ts`)
- 컬럼: id, **store_id**(boundary, nullable+CHECK), **service_key**, author_role(operator/store), title, slug, excerpt, content, status(draft/published/archived), published_at, created_at, updated_at
- **source 관계 컬럼: 없음** (출처=excerpt prefix). list: `GET /stores/:slug/blog/staff`. 삭제: **hard(remove)**. boundary: slug→pharmacy.id + verifyOwner

### kpa_store_contents (canonical "Store Production Material")
- 컬럼: id, snapshot_id, source_type(direct/snapshot_edit), **organization_id**, title, content_json, **source_metadata jsonb**, author_role, visibility_scope, workspace_status, …
- **source 추적: 강함** (source_metadata + snapshot_id). 3서비스 공통, rename 금지.

### o4o_asset_snapshots / kpa_store_asset_controls / store_playlists / store_playlist_items / signage_media
- snapshots: Hub 가져온 자산(assetType cms/signage/lesson/content/resource/blog/pop/qr). controls: publish_status+channel_map. playlist_items: **snapshot_id 참조**(사이니지 재사용 정합). signage_media: youtube/vimeo.

> **핵심:** 결과물 3종(QR/블로그/POP)은 boundary 컬럼이 제각각이고(`organization_id` vs `store_id+service_key`), 삭제정책도 soft/hard 혼재 → **물리 통합 부적합**.

---

## 5. API Map (통합 노출 관점)

| API | 역할 | 결과물 | source 처리 | 통합 노출 |
|-----|------|--------|------------|-----------|
| `GET /store-library/contents` | 내 자료함 콘텐츠 통합 feed | snapshots+direct | controls join | 기존 패턴(서버 통합 예시) |
| `GET /store/assets` | execution assets 목록(generated 포함) | POP file | category/usageType | 제작자료 탭 소스 |
| `GET /pharmacy/qr` | QR 목록(+scanCount) | QR | description prefix | **읽기 병합 가능** |
| `GET /stores/:slug/blog/staff` | 블로그 staff 목록 | 블로그 | excerpt prefix | **읽기 병합 가능** |
| `POST /pharmacy/pop/generate` | POP 생성+저장 | POP | (없음) | 결과 저장 완료 |
| `GET /store-playlists` | 플레이리스트 | 사이니지 | snapshot_id | 후속 |

→ **읽기 통합은 신규 API 없이 기존 3개 list 병합으로 성립**(클라이언트 또는 후속 서버 통합 endpoint).

---

## 6. 결과물별 현황

| 결과물 | 저장 | boundary | 내 자료함 노출 | source-link 컬럼 | 삭제 | 비고 |
|--------|------|----------|:--------------:|:----------------:|------|------|
| **POP** | store_execution_assets(file/generated/pop)+GCS | organization_id | ✅ 제작자료 탭 | ❌ | soft(row) / **GCS 미정리** | 원본 관계 미저장 |
| **QR** | store_qr_codes | organization_id | ❌(자기 화면) | ❌(prefix) | soft | library_item_id 논리 ref |
| **블로그** | store_blog_posts | store_id+service_key | ❌(자기 화면) | ❌(prefix) | **hard** | slug 기반 boundary |
| **사이니지** | store_playlists/items | organization_id | △(별도) | snapshot_id ✓ | soft | 비교적 정합 → 후속 |

---

## 7. 내 자료함 통합 노출 후보안 비교

| | A. 매장 제작 자료에 읽기 통합 | B. 새 "제작 결과" 탭 | C. 전체보기/검색만 | D. 저장소 미러링 통합 |
|---|---|---|---|---|
| migration | 0 | 0 | 0~소 | 큼 |
| UX 명확성 | 높음(찾는 위치 일치) | 매우 높음 | 중 | 높음 |
| 구현 위험 | 낮음 | 낮음 | 중 | **높음(동기화/중복/orphan)** |
| 메뉴 변경 | 없음 | 탭 추가 | route 추가 | 없음 |
| 단점 | 탭 의미 넓어짐 | "제작 자료"와 중복감 | 불완전감 | **비권장** |

**권장: A (매장 제작 자료에 QR/블로그/POP 읽기 통합)** — 타입 배지로 구분, 행 액션은 결과물별(열기/출력/수정/삭제) 분기. D(미러링)는 명시적으로 비권장.

---

## 8. 파생 관계 저장 후보안 비교

| | 1. 각 결과 테이블 source 컬럼 | 2. store_execution_assets metadata jsonb | 3. store_asset_derivations relation table | 4. 읽기 통합만(관계 후속) |
|---|---|---|---|---|
| 적용 범위 | QR+블로그+POP 각각 | **POP만** | **POP+QR+블로그+사이니지 전부** | 없음 |
| migration | 다중 테이블 | 1컬럼 | 1 신규 테이블 | 0 |
| 조회 단순성 | 높음(역방향) | 중 | 높음(양방향) | - |
| 공통화(3서비스) | 어려움 | 부분 | **용이(service_key 포함)** | - |
| 단점 | 다중 migration·의미 복잡 | QR/블로그 미해결 | 결과물 삭제 시 relation 정리 필요 | 원본추적 미해결 |

**권장: 3 (store_asset_derivations)** — 모든 결과물 포괄 + 기존 테이블 변경 0 + 양방향 추적 + 3서비스 확장 용이.

제안 스키마(설계 초안, **이번 IR에서 구현 안 함**):
```text
store_asset_derivations
  id uuid pk
  service_key varchar(50)        -- kpa/glycopharm/cosmetics
  organization_id uuid           -- boundary(필수)
  source_kind varchar(30)        -- content_direct | content_snapshot | execution_asset
  source_id uuid
  source_title varchar(300)
  derived_kind varchar(30)       -- pop | qr | blog | signage_item
  derived_id uuid
  derived_title varchar(300)
  created_by uuid
  created_at timestamptz
  metadata jsonb null
  INDEX (organization_id, derived_kind)
  INDEX (organization_id, source_id)
```
write 지점: POP generate(save) / QR create / blog create(콘텐츠 기반) — source 가 있을 때만 1행 insert.

---

## 9. store_execution_assets metadata/source 컬럼 필요성

- **확인: `metadata` 없음, `source_*` 없음** (entity 실측).
- POP만 추적하려면 후보 2(metadata jsonb 1컬럼)로 충분하지만, **QR/블로그는 별도 테이블**이라 미해결 → 통합 추적엔 부적합.
- **결론: store_execution_assets 컬럼 추가보다 §8-3 relation table 이 우월.** (단, 읽기 통합 노출 자체는 컬럼 추가 없이 가능.)

---

## 10. GCS orphan cleanup 정책 검토

- GCS path: `media/{yyyy}/{mm}/{uuid}.{ext}` — **org/store/asset id 미포함** → path만으로 무참조 식별 불가.
- `store_execution_assets` 삭제 → **MediaAsset row·GCS object 미정리**(Phase 2-A 실측: asset 삭제 후 PDF 잔존).
- 식별 방법: `media_assets.url` ↔ `store_execution_assets.file_url` 역참조 또는 GCS 목록 vs DB 참조 대조(배치).
- **권장: 즉시 delete hook 보다 주기적 reconcile job. 이번 Phase 2-B 미포함 → 별도 운영성 WO `WO-KPA-GCS-ORPHAN-CLEANUP-V1`로 분리.** (정책만 본 IR에서 확정.)

---

## 11. 권장안 (최종)

**권장안 A 채택** (사용자 판단 — 읽기 통합 + 별도 관계 테이블 — 과 정합):

```text
Phase 2-B-1 (저위험, migration 0):
  내 자료함 → 매장 제작 자료에 POP(기존) + QR + 블로그 결과물 "읽기 통합 노출".
  기존 list API(QR/blog/contents) 병합 + 타입 배지 + 결과물별 행 액션(열기/출력/수정/삭제).

Phase 2-B-2 (relation table, migration 1):
  store_asset_derivations 신규 테이블 도입. POP generate(save)/QR create/blog create(콘텐츠 기반)
  에서 source 존재 시 1행 적재. 기존 결과 테이블 컬럼 변경 0.

Phase 2-B-3 (별도 운영성):
  WO-KPA-GCS-ORPHAN-CLEANUP-V1 — reconcile job. (본 트랙과 분리)
```

선택 이유: 사용자 체감 즉시(2-B-1) + 저장소 미통합(분절 유지) + boundary 명확(organization_id) + 3서비스 확장 가능 + canonical(kpa_store_contents) 불훼손 + 삭제 동기화 위험 최소.

차순위: 권장안 C(store_execution_assets metadata)는 POP만 해결이라 기각. 권장안 B(relation 먼저)는 가능하나 UX 체감이 늦음.

---

## 12. 단계별 WO 제안

1. **WO-KPA-STORE-LIBRARY-RESULT-UNIFIED-VIEW-V1** (Phase 2-B-1)
   매장 제작 자료 탭에 QR/블로그/POP 읽기 통합(클라이언트 병합 또는 서버 통합 endpoint) + 타입 배지 + 행 액션. *migration 없음.* — **우선 착수 후보**
2. **WO-KPA-STORE-ASSET-DERIVATION-TABLE-V1** (Phase 2-B-2)
   `store_asset_derivations` 도입 + 3개 생성 지점 write 배선 + 원본/파생 역추적 조회. *migration 1(신규 테이블, nullable).*
3. **WO-KPA-GCS-ORPHAN-CLEANUP-V1** (운영성)
   media_assets↔store_execution_assets reconcile + 무참조 GCS object 정리 job.
4. (후속) 사이니지 결과물 통합 노출 — snapshot 참조 기반이라 별도.

우선순위: 1 → 2 → 3. 1은 즉시(저위험), 2는 신규 테이블이라 승인 필요, 3은 운영 정책.

---

## 13. 위험 요소

- **boundary 불일치**: 통합 노출/관계 조회 시 QR=organization_id, blog=store_id+service_key 를 각 소스 규칙대로 격리해야 함. 단일 필터 가정 금지(Boundary Policy §7).
- **블로그 hard delete**: 삭제 시 relation·통합 뷰에서 즉시 사라져야(역참조 정합). soft/hard 혼재 주의.
- **읽기 병합 pagination**: 3소스 독립 페이지네이션 → MVP는 소량 union+local sort, 대량은 서버 통합 endpoint 필요(over-fetch 주의).
- **GCS orphan 누적**: 정리 미도입 시 비용·관리 부담 → 별도 WO로 반드시 후속.
- **relation 정합성**: 결과물 삭제 시 derivation 행 정리(cascade 또는 정리 job).
- **canonical 보호**: kpa_store_contents rename·구조 변경 금지. 신규 relation table 로만 확장.
- **동시 세션**: 작업 시 staging 혼입 주의(반복 이슈).

---

## 14. 결론

저장소를 **합치지 않는다.** 분절된 전용 저장소(QR/블로그/POP/사이니지)는 boundary·삭제정책·상태머신이 달라 물리 통합이 위험하다. 대신 ① **읽기 통합 노출**(매장 제작 자료, migration 0)로 사용자 체감을 먼저 해결하고, ② **`store_asset_derivations` 단일 relation table**로 원본↔파생 관계를 일관 추적하며, ③ **GCS orphan 정리는 별도 운영성 WO**로 분리한다. 이는 위험을 단계적으로 통제하면서 3서비스 공통화 여지를 남기는 가장 안전한 경로다.

---

*조사 방식: read-only 병렬 코드 조사(Explore) + 엔티티/컨트롤러 실측 + Phase 2-A 검증 관측(GCS orphan). 코드/migration/API/UI 변경 없음. 본 IR은 git commit 하지 않는다(WO §15).*
