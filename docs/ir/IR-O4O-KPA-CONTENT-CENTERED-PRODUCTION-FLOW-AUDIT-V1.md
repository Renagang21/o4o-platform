# IR-O4O-KPA-CONTENT-CENTERED-PRODUCTION-FLOW-AUDIT-V1

> KPA 매장 콘텐츠/QR/POP/블로그/사이니지/제작자료 흐름 전수 조사 (read-only)
> 작성: 2026-06-25 · 상태: **Superseded (대부분 구현 완료)** · 갱신: 2026-06-27
> 목적: "무엇이 어디에서 만들어지고 어디에서 참조되는가"를 확정하여 후속 정비 WO의 기준선 수립

> ⚠️ **SUPERSEDED 노트 (2026-06-27):** 본 IR 작성(2026-06-25) 시점과 거의 동시에 **병렬 세션이 §13 후속 후보 1~7을 이미 구현·smoke PASS** 완료했다(아래 §13 각 항목의 ✅ 커밋 참조). 따라서 본 IR의 구조 분석(§A~F, §8)은 기준선으로 유효하나, **§13 "후속 WO"는 대부분 obsolete**이며 신규 착수 대상이 아니다. 명확히 남은 항목(#8 등)은 병렬 작업 종료 후 별도 재조사 예정.

---

## 0. 성격 / 범위

- **read-only.** 본 조사 과정에서 코드·DB·메뉴·운영 데이터를 변경하지 않았다.
- 서비스: **KPA Society 우선.** GP/K-Cosmetics는 영향 여부만 확인하고 변경 대상 아님.
- 본 문서는 결론(정비안)을 제시하되, 실제 변경은 후속 WO에서 수행한다.

### 배경 (해결된 임시 정합 + 남은 근본 과제)

연속 발생한 "한쪽엔 보이고 한쪽엔 안 보임" 문제는 임시 정합으로 해소됨:
- `WO-O4O-KPA-STORE-LIBRARY-CONTENT-CREATED-BUT-LIST-MISSING-V1`: `/store/library/contents` 목록에 snapshot + direct + execution-asset(content) 모두 노출.
- `WO-O4O-KPA-QR-ASSET-PICKER-INCLUDE-DIRECT-CONTENTS-V1`: QR 자산 선택 모달 "내 매장 자료"에 direct content 포함 + 공개 landing 의 direct content 렌더.

→ 그러나 이는 **양쪽 목록을 맞춘 임시 정합**이지 저장소·역할의 근본 정비가 아니다. 본 IR이 그 기준을 만든다.

### 사용자가 정한 방향 (정비 원칙)

1. **콘텐츠 = 원본.** QR/POP은 콘텐츠를 활용한 **결과물**.
2. **블로그는 콘텐츠 기반 자동 제작 대상이 아니다** — 편집기 중심.
3. **사이니지는 항상 별도 운영 영역** — 콘텐츠 선택 후 제작 액션에 미포함.
4. **"매장 제작 자료" 별도 메뉴는 없애는 방향 검토** (저장소 유지와 메뉴 노출은 분리 판단).
5. **AI 제작 단계는 QR/POP/블로그 흐름에서 제거**, 편집기 내부 AI 보조만 유지.
6. **희망 흐름**: 콘텐츠 목록에서 대상 선택 → 그 자리에서 QR/POP 제작 모달 → 저장 → QR은 QR 목록에만, POP은 POP 목록에만.

---

## A. 화면별 데이터 소스 비교표

| 화면 | route | API | source table | 포함 origin | 제외 origin | 검색 범위 | 비고 |
|------|-------|-----|--------------|-------------|-------------|-----------|------|
| 콘텐츠 목록 | `/store/library/contents` | `GET /store-library/contents` | `o4o_asset_snapshots` + `kpa_store_contents` + `store_execution_assets` UNION | snapshot(cms,content) / direct / execution-asset(content) | file/link 자산, video | **제목만(ILIKE)** | canonical 사용자 뷰. [store-library-feed.controller.ts](../../apps/api-server/src/routes/o4o-store/controllers/store-library-feed.controller.ts) |
| 자료(파일) | `/store/library/resources` | `GET /pharmacy/library` | `store_execution_assets` | file/content/link 전체 | — | 제목/설명/카테고리 | [store-library.controller.ts](../../apps/api-server/src/routes/o4o-store/controllers/store-library.controller.ts) |
| 매장 제작 자료 | `/store/library/production-materials` | (복합) | `store_execution_assets`(generated) + direct + QR + blog 아티팩트 | 제작 결과물 | — | — | "결과물 통합 뷰". [StoreProductionMaterialsPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx) |
| QR 자산 선택 모달 | `/store/marketing/qr` (모달) | `getStoreExecutionAssets` + `listContentHubItems` + `fetchStaffBlogPosts` + mlc + (신규)direct feed | `store_execution_assets` / `kpa_contents`(ready) / `store_blog_posts` / mlc / `kpa_store_contents`(direct) | asset / content-hub / blog / mlc / direct-content | snapshot 단독 노출 없음 | 탭별 제목 검색 | [StoreAssetSelectorModal.tsx](../../services/web-kpa-society/src/components/store/StoreAssetSelectorModal.tsx) |
| 운영자 콘텐츠 허브 | `/operator/content-hub` | `GET /contents` | `kpa_contents` | 운영자 콘텐츠 | — | **제목/요약/본문/작성자/태그** | 유일하게 태그·본문 검색 지원 |
| QR 공개 랜딩 | `/qr/:slug` | `GET /qr/public/:slug` | `store_qr_codes` (+ 본문 해석) | product/video/page/link | — | — | page 본문 해석: `kpa_contents`→`kpa_store_contents`→`store_asset`(libraryItemHtml)→redirect |

**핵심 divergence**: 사용자 화면 canonical(`/store/library/contents`)은 3소스 UNION이지만 **검색이 제목만**이고 **태그 미노출**. 반면 운영자 허브만 본문/태그 검색을 갖춤. QR 자산 선택 모달은 탭별로 5개 소스를 흩어서 봄(통합 뷰 아님).

---

## B. 생성 경로별 저장소 비교표

| 생성 경로 | route | 저장 API | 저장 테이블 | origin/source | 태그 | QR 대상 가능 | POP 대상 가능 | 비고 |
|-----------|-------|----------|-------------|---------------|------|:---:|:---:|------|
| 매장 직접 콘텐츠 작성 | `/store/content/direct/:id` (+ 생성) | `POST /store-contents` | `kpa_store_contents` (source_type='direct') | direct | ❌ 없음 | ✅(page) | ✅ | content_json: `{html}`/`{blocks}`/배열. AI 단계 **없음** |
| 운영자 콘텐츠 허브 | `/operator/content-hub` | `POST /contents` | `kpa_contents` | operator | ✅ jsonb | ✅(page, content-hub) | △ | status draft/ready. RichTextEditor body |
| 매장 가져오기(운영자→매장) | HUB import | `POST /stores/:slug/.../import` | 대상별(`o4o_asset_snapshots` / `store_blog_posts` / `store_pops`) | snapshot/copy | 부분 | ✅ | ✅ | 원본과 분리(사본). 원본 수정 시 사본 무영향 |
| 직접 업로드(파일/콘텐츠) | `/store/library/resources` | `POST /pharmacy/library` 또는 `POST /store/assets` | `store_execution_assets` | uploaded | ❌ | ✅(asset) | ✅ | asset_type file/content/external-link |
| 제작자료 에디터 | `/store/library/production-materials/new` | (asset 저장) | `store_execution_assets` | generated | ❌ | ✅ | ✅ | ProductionMaterialEditorPage |

**관찰**: 콘텐츠 "원본"이 될 수 있는 저장소가 3개(`kpa_store_contents`, `kpa_contents`, `o4o_asset_snapshots`)로 분산. `store_execution_assets`는 **업로드 자료 + 제작 결과물**이 혼재(원본/결과물 경계 모호).

---

## C. 결과물별 저장 위치 / 참조 방식

| 결과물 | 저장 테이블 | 콘텐츠 참조 방식 | 다른 메뉴 노출 | 권장 정리 방향 |
|--------|-------------|------------------|----------------|----------------|
| **QR** | `store_qr_codes` | **참조**(landingType/landingTargetId/libraryItemId). content-hub/direct=page+target=id(복사X), asset=libraryItemId, blog/mlc=link URL | QR 목록만 | 참조 유지. 콘텐츠 목록에서 직접 생성 모달 호출 추가 |
| **POP** | `store_pops` (html **복사**) + 생성 시 `store_execution_assets`(usage_type='pop', source_type='generated') | **복사**(html 스냅샷). 추가로 PDF 자산 생성 | store_pops 목록 + **제작자료 목록에도 노출**(execution_asset) | PDF 자산이 콘텐츠 목록·제작자료에 중복 노출 → 정리 대상 |
| **블로그** | `store_blog_posts` (html **복사**) + `store_asset_derivation` 계보 기록 | **복사**(생성 시 1회). 이후 독립 | 블로그 목록만 | 자동 생성/AI 제거(편집기만). derivation은 유지 |
| **사이니지** | `store_playlists` / `store_playlist_items`(snapshot_id 참조) | snapshot **복사** 참조. `store_execution_assets`와 **FK 없음(완전 분리)** | 사이니지 영역만 | **별도 영역 유지**. 본 정비 범위 제외 |

**중복 노출 핫스팟**: POP PDF 생성 시 `store_execution_assets(usage_type='pop')` 가 생기는데, 이게 `/store/library/contents`(execution-asset content 포함 조건) 및 제작자료에 동시 노출될 수 있음 → "결과물이 원본 목록에 섞임".

---

## D. AI 기능 사용처

| 영역 | AI 기능(버튼) | frontend | backend endpoint | outputType | GP/KCos 공유 | 제거 = 버튼 숨김만? |
|------|---------------|----------|------------------|-----------|:---:|:---:|
| QR 제작 | "AI 문구 생성" | [StoreQRPage.tsx:793](../../services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx) (모달 1169-1183) | `POST /api/ai/content` | store_qr | ❌ **KPA 전용** | ✅ (안전) |
| POP 제작 | "AI 문구 생성" | StorePopPage.tsx:467 (600-611) | `POST /api/ai/content` | pop | ✅ **GP+KCos 동일 페이지** | ✅ 단, GP/KCos도 영향 |
| 블로그 | "AI로 정리하기" | PharmacyBlogPage.tsx:507 (547-557) | `POST /api/ai/content` | blog | ✅ **GP 동일 페이지** | ✅ 단, GP도 영향 |
| 편집기 툴바 | "AI 정리" | [Toolbar.tsx](../../packages/content-editor/src/components/Toolbar.tsx):599 | `POST /api/ai/content` | flexible | ✅ 전 서비스 공유 | **유지(편집기 내부)** |
| 직접 콘텐츠 작성 | — 없음 | — | — | — | — | — |

- **단일 공유 엔드포인트** `POST /api/ai/content` ([ai-proxy.routes.ts:202](../../apps/api-server/src/routes/ai-proxy.routes.ts)) + `services/ai-prompts/`(pop/blog/storeQr/titleSuggest/summary/productDetail/storeSns/flexible). **백엔드 삭제 금지**(GP/KCos/툴바/LMS 공유).
- **편집기 내부 AI 보조(`AiContentModal`/Toolbar "AI 정리")는 공유 컴포넌트 → 유지.**
- **제거 안전도**: QR AI 버튼 = KPA 전용(안전). POP/블로그 AI 버튼 = GP/KCos와 페이지 공유 → KPA만 제거하려면 서비스별 분기 또는 GP/KCos 협의 필요.

---

## E. 메뉴 제거 영향 (제작자료)

| 메뉴/route | 현재 역할 | 참조 관계 | 메뉴 숨김 가능 | route 유지 필요 | 비고 |
|-----------|----------|----------|:---:|:---:|------|
| `/store/library/production-materials` | 제작 결과물 통합 뷰 | StoreHomePage CTA / StoreLibraryContentsPage "새 제작 자료 만들기" / ProductionMaterialEditorPage 저장 후 redirect / 빈 상태 버튼 | ✅ (메뉴만) | ✅ **유지 권장** | route 제거 시 저장 후 redirect·딥링크 파손 |
| `/store/library/production-materials/new` | 제작자료 에디터 | 위 진입 버튼들 | ✅ | ✅ | — |

- **메뉴 config**: `packages/store-ui-core/src/config/storeMenuConfig.ts` (공유 패키지, `KPA_SOCIETY_STORE_CONFIG`/`COSMETICS_STORE_CONFIG`/`GLYCOPHARM_STORE_CONFIG`). **KPA만 메뉴 숨김 = config의 KPA 항목만 제거**(GP/KCos 무영향).
- **결론**: **"메뉴 숨김 가능 / route 유지 필요"** — 메뉴에서 제작자료를 빼도 기존 저장/redirect/딥링크는 route가 살아있어야 안 깨진다. `store_execution_assets` 데이터·기존 QR 참조는 그대로 보존.
- **주의**: ProductionMaterialEditorPage 저장 후 redirect 대상이 숨겨진 페이지가 되면 UX 단절 → 메뉴 숨김 WO 시 **redirect 목적지를 콘텐츠 목록으로 재지정**하는 후속 필요.

---

## 8. 검색 / 태그 구조 (현황)

| 테이블 | 태그 컬럼 | 타입 | 본문 | 비고 |
|--------|-----------|------|------|------|
| `kpa_contents` (운영자) | `tags` | **jsonb `[]`** | `body`(html)+`blocks` | 유일하게 태그·본문 검색 지원 |
| `kpa_store_contents` (direct) | ❌ 없음 | — | `content_json` | 태그 부재 |
| `o4o_asset_snapshots` (snapshot) | ❌ 없음 | — | `content_json` | 태그 부재 |
| `store_execution_assets` (결과/업로드) | ❌ 없음 (`category`만) | — | `html_content`/`file_url` | 태그 부재 |

- **콘텐츠 목록 feed 검색 = 제목 ILIKE만** (본문/태그/카테고리 미포함).
- **운영자 허브 검색 = 제목/요약/본문/작성자/태그(text cast) + `tags @> jsonb` 정확매칭**.
- **인덱스**: 4개 테이블 모두 **태그/제목 인덱스 없음**(org/status/category 인덱스만).
- **통합 태그 검색 = 현재 불가.** 3개 테이블에 tags 컬럼이 없음. 필요 작업:
  1. `kpa_store_contents`·`o4o_asset_snapshots`·`store_execution_assets`에 `tags jsonb` 추가(migration).
  2. feed 검색을 제목→제목+본문(content_json text)+태그로 확장.
  3. 성능 위해 GIN(tags)/제목 인덱스 추가.
  4. snapshot은 `content_json`에서 태그 추출 또는 신규 입력 UX 필요.

---

## F. 권장 정비안 (3안 비교)

### A안 — direct content canonical
콘텐츠 원본을 `kpa_store_contents`(direct)로 통일. QR/POP은 direct content 참조. `store_execution_assets`는 결과물/legacy 호환 저장소로만.

### B안 — unified feed canonical
사용자 화면 canonical을 `/store/library/contents` feed로 둠. 내부 source(snapshot/direct/execution)는 origin 명확화하여 모두 포함. QR/POP은 feed item의 origin+id를 그대로 참조.

### C안 — 단계적 전환 (권장 ★)
3 source를 당분간 모두 지원하되 **신규 콘텐츠 생성은 direct content로만 수렴**. 기존 execution-asset content는 legacy target 유지. 제작자료 메뉴는 숨기고, 참조가 사라지면 장기 제거.

| 비교 항목 | A안 | B안 | **C안(권장)** |
|-----------|-----|-----|-----|
| 사용자 이해도 | 높음(콘텐츠=direct) | 중(origin 개념 노출) | 높음(점진) |
| 구현 난이도 | 높음(retarget 필요) | 낮음(이미 feed 존재) | 낮음~중 |
| 기존 QR/POP 파손 위험 | **높음**(execution 참조 retarget) | 낮음 | **낮음**(legacy 유지) |
| 데이터 중복 | 감소 | 유지 | 점진 감소 |
| 검색/태그 구현 용이성 | 높음(단일 소스) | 중 | 중(direct에 태그 추가부터) |
| GP/KCos 공통화 | 중 | 높음 | 높음 |
| 장기 유지보수 | 높음 | 중 | **높음** |

### 권장 결론 (하이브리드: C 주축 + B의 뷰 + A의 신규 수렴)

- **사용자 canonical 뷰** = `/store/library/contents` feed (B). 검색을 제목→본문+태그로 확장.
- **신규 콘텐츠 원본** = `kpa_store_contents`(direct) (A의 정신). 태그 컬럼 추가.
- **`store_execution_assets`** = **결과물/legacy 호환**으로 역할 고정(원본 생성 진입점에서 제외). 메뉴 숨김(route 유지).
- 근거: execution_assets는 POP PDF 결과물 + 기존 QR 참조 + 가져온 자료가 얽혀 있어 **삭제·즉시 retarget 불가**. 따라서 "원본은 direct로 수렴 + execution은 결과/legacy"로 역할만 분리하고 데이터는 보존하는 C안이 파손 위험 최소.

---

## 11. 기존 데이터 영향 (운영 DB read-only count 실행 완료)

> **WO-O4O-KPA-CONTENT-CENTERED-PRODUCTION-FLOW-DB-COUNT-BACKFILL-V1**
> - **실행 일시**: 2026-06-26
> - **실행 방식**: `cloud-sql-proxy`(127.0.0.1:15433) → `psql` **read-only SELECT** (프로젝트 표준 prod read-only 접속). 데이터/스키마 변경 없음. 자격증명·접속 정보 미기록.
> - **범위**: §11.1~§11.5 전역 count + §11.6 대표 매장(테스트 약국 / Sohae 약국) per-store count.

### 11.0 실행한 SQL (요약)

```sql
-- 콘텐츠 source별 건수
SELECT count(*) FROM o4o_asset_snapshots WHERE asset_type IN ('cms','content');           -- snapshot
SELECT count(*) FROM kpa_store_contents  WHERE source_type='direct';                       -- direct
SELECT count(*) FROM store_execution_assets WHERE is_active AND asset_type='content';      -- exec-content
-- QR landing_type별 (active)
SELECT landing_type, count(*) FROM store_qr_codes WHERE is_active GROUP BY landing_type;
-- QR이 execution asset 참조(삭제 시 파손 위험) + 실제 매칭
SELECT count(*) AS refs, count(e.id) AS matched
  FROM store_qr_codes q LEFT JOIN store_execution_assets e ON e.id=q.library_item_id
 WHERE q.is_active AND q.library_item_id IS NOT NULL;
-- POP usage_type 자산
SELECT count(*) FROM store_execution_assets WHERE is_active AND usage_type='pop';
-- execution_assets 고아 후보(generated + QR 미참조 [+ pop 제외])
SELECT count(*) FROM store_execution_assets e
 WHERE e.is_active AND e.source_type='generated'
   AND NOT EXISTS (SELECT 1 FROM store_qr_codes q WHERE q.library_item_id=e.id AND q.is_active);
-- 대표 매장: 위 쿼리에 organization_id=<org> 추가
```

### 11.1 콘텐츠 source별 전체 건수

| source | count | 비고 |
|--------|----:|------|
| snapshot | **5** | o4o_asset_snapshots asset_type cms/content |
| direct | **4** | kpa_store_contents source_type direct |
| exec-content | **3** | store_execution_assets active content |

### 11.2 QR target source별 건수 (active)

| landing_type | count | 비고 |
|--------------|----:|------|
| page | **7** | 전부 page (video/link/product/tablet 등 active 0건) |

### 11.3 QR이 execution asset을 참조하는 건수

| 항목 | count | 의미 |
|------|----:|------|
| active QR with library_item_id | **3** | execution asset 직접 참조 |
| matched execution assets | **3** | 실제 active execution asset row 매칭(100%) |

→ active QR 3건이 `store_execution_assets`를 `library_item_id`로 직접 참조. **삭제/타깃 변경 시 공개 URL 파손**.

### 11.4 POP usage_type 자산 건수

| asset_type | count | 비고 |
|-----------|----:|------|
| (전체) | **0** | `usage_type='pop'` active execution asset 0건 |

→ 현재 POP 결과물 execution asset **없음** → 콘텐츠/제작자료 목록에 POP 결과물이 섞이는 중복 노출 위험은 **현재 0**.

### 11.5 execution_assets 고아 후보

| 후보 조건 | count | 해석 |
|----------|----:|------|
| generated + QR 미참조 | **0** | POP 포함 가능 |
| generated + QR 미참조 + usage_type != pop | **0** | 고아 후보 |

→ active generated execution-content **3건이 전부 QR에 참조**됨(§11.3 matched=3). **고아 0**. 정리/마이그레이션 대상 없음.

### 11.6 대표 매장별 count

| 매장 | organization_id | snapshot | direct | exec-content | active QR | QR libref | POP |
|------|-----------------|-------:|-----:|-----------:|--------:|--------:|---:|
| 테스트 약국 (renagang21) | 9c87f46b… | 1 | 4 | 3 | 7 | 3 | 0 |
| Sohae 약국 | c9beb4a2… | 1 | 0 | 0 | 0 | 0 | 0 |

> 전역 active QR 7건·direct 4건·exec-content 3건이 **전부 테스트 약국 1개 매장에 집중**(테스트 환경 데이터). Sohae 약국은 snapshot 1건 외 비어 있음. 즉 현재 운영 DB는 **실데이터가 아닌 테스트 데이터 우세** — 절대 건수는 작으나 production 스케일 대표성은 낮음.

### 11.7 해석 및 후속 WO 우선순위 영향

- **QR**: §11.3 = active QR 3건이 execution asset 직접 참조(matched 100%) → `store_execution_assets` 즉시 삭제·타깃 변경 금지. **legacy target 해석 유지 필수**(C안 = `WO-...-CONTENT-SOURCE-CANONICAL-V1` 정당화). 제작자료 **route는 유지**, 메뉴만 숨김 가능.
- **POP**: §11.4 = POP 결과물 execution asset **0건** → **`WO-O4O-KPA-QR-POP-RESULT-SCOPE-V1` 우선순위 하향**. 현재 중복 노출 실데이터 없음 → 긴급도 낮음(POP 생성 경로 정착 후 재측정 권장).
- **고아 정리**: §11.5 = 고아 0 → execution-asset 정리·마이그레이션 전용 WO **불필요**.
- **검색/태그**: §11.1 = source별 ≤5건(소규모) → **1차 검색 확장은 단순 `ILIKE`/text cast로 시작 가능**, GIN index·tags 컬럼·text search는 데이터 증가 후로 연기 가능. → `WO-O4O-KPA-CONTENT-LIST-SEARCH-TAG-V1`은 **(1) 본문/요약 검색 확장(작게) → (2) 태그 컬럼/UX** 2단계로 분리 착수가 안전.
- **제작자료 메뉴**: QR 참조 3건 존재 → `/store/library/production-materials` **route·legacy landing 유지**, 사용자 메뉴 숨김만 검토(`WO-...-PRODUCTION-MATERIALS-MENU-HIDE-V1`).

---

## 13. 후속 WO 후보 → 실제 구현 현황 (2026-06-27 git log 대조)

> 본 IR 작성과 거의 동시에 병렬 세션이 1~7을 구현·smoke PASS 완료. 신규 착수 대상은 #8(장기)만 남음.

| # | 후보 WO | 상태 | 증거 커밋 |
|:-:|---------|:----:|-----------|
| 1 | 콘텐츠 목록 검색/태그 확장 | ✅ **완료** | `b95f131c4` 태그 검색/필터+출처 탭 (`WO-O4O-KPA-CONTENT-LIST-TAG-SEARCH-FILTER-V1`), `efdf36125` 태그 필드, `4d5f942be` 검색 제목→본문/요약 |
| 2 | 콘텐츠 목록 인라인 QR 생성 | ✅ **완료** | `3895d5cd9` (`WO-O4O-KPA-CONTENT-LIST-INLINE-QR-CREATE-V1`) + `794501935` smoke PASS |
| 3 | 콘텐츠 목록 인라인 POP 생성 | ✅ **완료** | `b194e01ed` (`WO-O4O-KPA-CONTENT-LIST-INLINE-POP-CREATE-V1`) + `05d4211c2` smoke PASS |
| 4 | QR/POP 결과물 노출 범위 정리 | ✅ **완료** | `4a56bd3fb` (`WO-O4O-KPA-QR-POP-RESULT-SCOPE-V1`) + `d40a679d5` smoke PASS, `0bf9da384` POP PDF 목록 |
| 5 | 제작자료 메뉴 숨김 | ✅ **완료** | `4a56bd3fb` (#4와 동일 WO에 포함 — 매장 제작 자료 메뉴 숨김) |
| 6 | 블로그/콘텐츠 AI 진입 제거 | ✅ **완료** | `5d39312a6` POP/Blog/resources AI 진입 제거(gp/kcos/kpa), `8b71a4ff8`/`cd1ab82a8` content-creation AI 제거, `422132d13` dead client wrapper 정리 |
| 7 | QR 제작 AI 단계 제거 | ✅ **완료** | `5d022ae00` (`WO-O4O-KPA-QR-AI-STEP-REMOVE-V1`) + `0ed225f18` smoke PASS |
| 8 | 콘텐츠 source canonical 전환 | ⏳ **재조사 필요** | 신규 생성 direct 수렴 / execution legacy 정리(C안). 병렬 작업 종료 후 현재 코드 기준 재감사 예정 |

**남은 작업 = #8 뿐(추정).** 1~7은 본 IR이 제안하기 전/동시에 이미 완료됨. #8의 실제 잔여 범위는 병렬 세션 종료 후 별도 재조사로 확정한다.

---

## 완료 기준 점검

- [x] 코드·DB 무변경 (read-only)
- [x] 콘텐츠/QR/POP/블로그/사이니지/제작자료 현재 구조 표로 정리(A~E + §8)
- [x] 검색·태그 구현 가능성 확인(현재 불가 + 필요 작업 명시)
- [x] 제작자료 메뉴 제거 가능성·위험 정리(메뉴 숨김 가능 / route 유지 필요)
- [x] QR/POP 콘텐츠 목록 직접 제작 경로 제시(후속 WO 2·3)
- [x] AI 제거 범위 정리(QR 안전 / POP·블로그 GP·KCos 공유 / 백엔드 유지)
- [x] 기존 QR/POP 공개 URL 비파손 전략 제시(참조 유지 + legacy 보존 C안)
- [x] 운영 DB 실제 count (§11 read-only 실행 완료 — 2026-06-26, WO-...-DB-COUNT-BACKFILL-V1)
