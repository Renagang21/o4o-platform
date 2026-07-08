# IR-O4O-CONTENT-RESOURCE-MANAGEMENT-ARCHITECTURE-V1

> **O4O 콘텐츠 플랫폼에서 사용하는 모든 콘텐츠 자산(Content Resource)의 관리 체계를 정의하는 최상위 기준 문서.** 이미지·동영상·HTML·Template·Snippet·PDF·AI 생성 자산·첨부파일을 **하나의 Content Resource 개념**으로 저장·관리·검색·재사용·삭제·추적하기 위한 아키텍처를 정의한다. Media Library 조사가 아니라, Media Library를 포함한 전체 자산 관리 표준이다.

- **작성일**: 2026-07-08
- **유형**: 아키텍처 정의 IR (read-only, 코드 변경 없음, CHECK 없음)
- **선행**: [`IR-O4O-CONTENT-PLATFORM-ARCHITECTURE-V1`](IR-O4O-CONTENT-PLATFORM-ARCHITECTURE-V1.md)(저장 3계층·복사 불변식) + 편집기 4-WO(Media Library / Table / Renderer / Video) 완료
- **결론 요약**: 현재 O4O에는 통일된 "Content Resource" 개념이 **없다**. 자산이 6+ 저장소에 분산되고, **서술적 메타데이터(제목·설명·태그·키워드·언어·소유)·버전·중복제거·통합검색·사용처 역추적이 대부분 미구현**이다. 본 IR이 canonical Resource 모델과 후속 WO 지도를 정의한다.

---

## 1. Resource 종류 인벤토리 (§3.1) — 저장소 매핑 (§3.2)

| Resource 종류 | 저장소(테이블/엔티티) | 본문/파일 | 상태 |
|---|---|---|---|
| **이미지/동영상/파일** | `media_assets` (`MediaAsset`) — GCS `o4o-media-library` `media/YYYY/MM/uuid.ext` | url/gcs_path | 존재 |
| **상품 이미지(별경로)** | GCS `products/{masterId}/{type}/uuid.ext` (`image-storage.service`) — **DB 레코드 없음** | url만 | 존재(사일로) |
| **Template** | `content_templates` (`ContentTemplate`) | contentHtml | 존재 |
| **HTML(실행자산)** | `store_execution_assets` (usage_type pop/qr/signage/banner/notice) | html_content/file_url | 존재 |
| **HTML(HUB 원본)** | `kpa_contents` / 서비스별 `*_contents` | blocks(jsonb)/body | 존재 |
| **HTML(매장 편집)** | `kpa_store_contents` / `kpa_working_contents` | content_json | 존재 |
| **자료함 사본** | `o4o_asset_snapshots` (`AssetSnapshot`) | content_json | 존재 |
| **상품설명(공용)** | `shared_product_descriptions` | content(HTML) | 존재 |
| **AI 생성물** | `product_ai_contents` (draft/source, upsert) | content | 존재(Resource 아님) |
| **HTML Snippet** | — | — | **미구현**(contentHtml 컬럼에 흡수) |
| **PDF/첨부** | `store_execution_assets`(file_url) 등 | file_url | 부분(전용 관리 없음) |

---

## 2. Resource별 실측 매트릭스 (§3.3~§3.9)

**범례**: ✅ 있음 · ◐ 부분 · ✗ 없음

| Resource | 제목 | 설명 | 태그 | 태그·본문 검색 | source_type | status | org/store | language | **버전** | 삭제 | 사용중 체크 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **media_assets** | ✗(originalName만) | ✗ | ✗ | ✗ | ✗(assetType) | ✗ | ✗(uploadedBy/serviceKey 스칼라) | ✗ | ✗ | **hard** | ✗ |
| ContentTemplate | ✅ | ✅ | ✗ | ✗ | ✗ | ✗(isActive) | ✗ | ✗ | ✗ | soft | ✗ |
| SharedProductDescription | ✗(master) | ✗ | ✗ | ✗ | ✅ | ✅ | ✗(master기준) | ◐ | ✗ | soft | ✗ |
| **StoreExecutionAsset** | ✅ | ✅ | ✅(jsonb) | ✅ | ✅ | ✗(isActive) | org | ✗ | ✗ | soft | **✅(활성 QR)** |
| kpa_contents | ✅ | ✅(summary) | ✅(jsonb) | ✅ | ✅ | ✅ | ✗ | ✗ | ✗ | soft | ✗ |
| kpa_store_contents | ✅ | ✗ | ✅(jsonb) | ✅ | ✅ | ◐(workspace) | org | ✗ | ✗ | **hard** | ✗ |
| o4o_asset_snapshots | ✅ | ✗ | ◐(json) | ◐ | source_service | ✗ | org | ✗ | ✗ | hard | ✗ |
| product_ai_contents(AI) | ✗ | ✗ | ✗ | ✗ | content_type | ✗ | ✗ | ✗ | ✗(upsert 덮어씀) | — | ✗ |

**핵심 관찰:**
- **media_assets = 순수 파일 레코드.** 제목·설명·태그·키워드·언어·소유 조직 전부 없음. 파일 식별은 `originalName`(원본 파일명)에만 의존.
- **버전 관리 = 전 자산 부재.** candidate→canonical(큐레이션 상태), snapshot override(편집 레이어), usageCount(사용 분석)는 모두 버전이 아님.
- **태그·본문 검색은 store 계열 4개**(StoreExecutionAsset/kpa_contents/kpa_store_contents/o4o_asset_snapshots)에만 `::text ILIKE` + `tags @> jsonb`로 실재. **media_assets·ContentTemplate·SharedProductDescription은 검색 부재.**
- **삭제 시 사용 중 참조 보호는 StoreExecutionAsset(활성 QR 409 거부) 한 곳뿐.** 나머지는 무조건 삭제(media_assets는 hard delete + GCS 삭제).

---

## 3. 검색 (§3.4) — 통합 검색 부재, 사일로

- **통합 Resource 검색 화면·API 없음.** 저장소마다 독립 목록 API: `MediaLibraryService.list()`(folder/assetType 필터만, **검색어 파라미터 없음**), `AssetCopyService.listByOrganization()`(title ILIKE), store execution asset 목록, signage media, neture 상품 이미지 — 전부 분리.
- 태그 검색 실재 위치: `kpa.routes.ts`(kpa_contents), `store-library-feed.controller.ts`(snapshot/execution asset 통합 피드 — **매장 자료함 내부 한정**), glycopharm resources, working-content.
- 교차-표면 검색 부재는 기존 감사에도 기록(`IR-O4O-LIBRARY-CROSSSURFACE-UIUX-AUDIT-V1`).

## 4. 재사용 (§3.5) — 값-복사 사본, 중복 누적

- 재사용 = **가져오기=값복사 사본** 불변식(선행 아키텍처 IR §7 확립). AssetSnapshot는 원본 무FK 독립 사본.
- **중복제거(dedup) 없음(설계상 의도적).** `o4o_asset_snapshots`는 과거 UNIQUE 제약을 migration으로 제거 → 동일 원본을 가져올수록 사본 누적. `media_assets`는 파일 해시/체크섬 없음 → 같은 이미지 재업로드 시 별도 GCS 객체+행. **유일한 dedup은 content_hub→매장 사본**(derivation 기반).

## 5. 사용처 추적 (§3.6) — 부분, 채널 누락

- `store_asset_derivations`(polymorphic, FK 없음, source/derived 양방향 인덱스) — **구조적으로 정/역방향 조회 가능**하나 **실제 적재는 3종뿐**: `pop_pdf`·`blog_post`·content_hub 사본(`store_execution_asset`).
- **QR·사이니지·태블릿은 derivation에 적재 안 됨** → soft reference(`store_qr_codes.library_item_id`, `store_tablet_displays.content_id`)로 정방향(파생→원본) 단건만 알 수 있고, "Resource → 사용처 목록" 역추적은 각 소비 테이블 개별 스캔 필요.
- **media_assets·product_ai_contents는 derivation 그래프 밖** → 미디어 자산·AI 산출물의 사용처 추적 **전면 불가**.

## 6. 버전 (§3.8) · 삭제 (§3.9) · 파일명/네이밍 (§3.10) · Resource ID (§4)

- **버전: 전 자산 부재.** 자산은 사실상 **불변(immutable)** — media_assets는 rename 기능 없음(URL은 gcs_path에서 파생·고정), 변경 필요 시 새 업로드(새 id·새 url). "수정 = 새 Resource" 모델.
- **삭제**: media_assets/kpa_store_contents/o4o_asset_snapshots = hard, 나머지 soft(isActive/is_deleted/deletedAt). 사용 중 보호는 StoreExecutionAsset만.
- **파일명/네이밍**: media_assets = `randomUUID().ext`(무의미) + originalName 보존(**사용자 지정 display name 필드 없음**). store 계열(execution_asset/snapshot)은 `title` 자유 입력 가능("비타민C_대표이미지").
- **Resource ID vs URL vs 파일명**: `id`(uuid, DB PK, 독립) ↔ `fileName`(=uuid+ext, 물리) → `gcs_path` → `url`(파생·고정). originalName은 표시용 메타(url 무영향). **파일명 변경 = URL 변경 = 외부 참조 깨짐** → 현재 rename 경로 없음(불변 자산이 안전).

## 7. AI 관점 (§6) — AI가 자산을 검색·추천할 수 없다

- AI 생성물(`product_ai_contents`)은 **상품 종속 최신-덮어쓰기 draft**로, Resource로 관리되지 않음(upsert, 이력 없음). AI 산출물이 shared_product_descriptions/store_execution_assets/o4o_asset_snapshots로 흩어짐.
- **AI가 자산을 검색·추천·재사용하려면 필요한 메타데이터(설명·태그·키워드·용도·언어·사용맥락)가 media_assets에 전무** → 현재 AI 기반 자산 추천 불가.

---

## 8. Canonical Content Resource 모델 (§7) — 목표 구조

현재 분산·빈약한 자산을 **단일 논리 개념**으로 정의한다(물리 저장소는 종류별 유지 가능, 논리 계약을 통일).

```text
Content Resource
├── Resource ID        (불변 식별자 · URL/파일명과 분리)
├── Type               (image | video | html | template | snippet | pdf | ai | attachment)
├── File / Body        (url·gcs_path | html·content_json)
├── Metadata           (mimeType·size·width·height·createdAt·updatedAt)
├── Title              (사용자 지정 의미명 — media_assets 신규 필요)
├── Description        (신규 필요)
├── Tags / Keywords    (jsonb — media_assets 신규 필요, store 계열 정렬)
├── Owner              (uploadedBy + organization/store — media_assets 관계 정식화)
├── Source             (source_type: supplier/operator/ai/store/external…)
├── Usage              (사용처 역추적 — derivation 그래프 편입)
├── Language           (다국어 — 언어별 체인)
├── Version            (revision 이력 — 신규 필요)
└── References         (원본↔사본, 파생 관계)
```

**설계 원칙:**
1. **Resource ID는 URL/파일명과 분리된 불변 식별자** — 파일 교체·rename 시에도 ID 유지(현재는 새 업로드=새 ID로 깨짐).
2. **모든 Resource는 Title·Description·Tags를 갖는다** — 최소 서술 메타 표준화(media_assets 최우선).
3. **Owner는 organization/store 관계로 정식화** — 현재 uploadedBy(스칼라)/serviceKey(문자열)를 경계 정책(F6)과 정합.
4. **Usage는 derivation 그래프 단일화** — 전 소비 채널(POP/QR/사이니지/태블릿/블로그/상품설명)이 사용 시 derivation 적재.

---

## 9. 표준 산출물 (§8)

### 9.1 Metadata 표준 (최소 필수 필드)
모든 Resource: `id · type · title · description · tags · owner(org/store) · source · createdAt · updatedAt`. 파일형 추가: `mimeType · size · (width/height) · originalName`. 콘텐츠형 추가: `status · language`.

### 9.2 검색 구조 표준
`tags @> jsonb`(정확) + `title/description/body ILIKE`(부분)를 **모든 Resource에 공통 적용** + **교차-표면 통합 검색 표면**(현재 부재). media_assets에 title/description/tags 컬럼 + 검색 파라미터 추가가 선결.

### 9.3 재사용/삭제 정책 표준
- 재사용 = 값복사 사본 유지(불변식). **dedup은 파일 해시(sha256) 컬럼 도입 시 선택적 적용**.
- 삭제 = **사용 중 참조 체크를 전 Resource로 확대**(현재 StoreExecutionAsset만). media_assets hard delete 전 참조 스캔 필요. soft-delete 표준화 권장.

### 9.4 파일명·네이밍 가이드라인 (§3.10)
- 물리 파일명은 uuid 유지(불변·충돌 방지). **사용자 대면 이름 = Title 필드**(media_assets 신규).
- **Resource Naming Guideline**(권장): `{주제}_{용도}_{버전·날짜}` — 예 `비타민C_상품대표이미지_2026`, `알레르기_약국TV_30초`, `혈압관리_QR콘텐츠_v2`. 잘못된 예: `IMG001.jpg`, `최종최종.mp4`. (Title 필드에 적용, 물리 파일명과 무관)

---

## 10. Gap → 후속 WO 지도 (§8 향후 WO)

| 순위 | Gap | 근거 | 후속 WO 후보 |
|:--:|---|---|---|
| **P0** | media_assets 서술 메타(title/description/tags) + 검색 부재 | §2·§3 | `WO-...-MEDIA-ASSET-METADATA-SEARCH-V1` |
| **P0** | 통합 Resource 검색 표면 부재(사일로) | §3 | `WO-...-RESOURCE-UNIFIED-SEARCH-V1` |
| **P1** | 사용처 역추적 채널 누락(QR/사이니지/태블릿 derivation 미적재) + media/AI 그래프 밖 | §5 | `WO-...-RESOURCE-USAGE-DERIVATION-COVERAGE-V1` |
| **P1** | 삭제 시 사용 중 참조 보호 전 Resource 확대 | §2·§9.3 | `WO-...-RESOURCE-DELETE-INUSE-GUARD-V1` |
| **P2** | Owner(org/store) 관계 정식화 — media_assets | §2·§8 | `WO-...-MEDIA-ASSET-OWNERSHIP-V1` |
| **P2** | dedup(파일 해시) 도입 | §4 | `WO-...-RESOURCE-DEDUP-HASH-V1` |
| **P2** | 버전/revision 이력(필요성 검토 후) | §6 | `WO-...-RESOURCE-VERSIONING-V1` |
| **P3** | AI Resource 추천 메타 + product_ai_contents Resource화 | §7 | `WO-...-AI-RESOURCE-METADATA-V1` |
| **P3** | Resource Naming Guideline UI 적용 | §9.4 | `WO-...-RESOURCE-NAMING-UX-V1` |

---

## 11. 완료 기준 대비 (§9)

| 기준 | 상태 |
|---|---|
| Resource 저장·관리 체계 문서화 | ✅ §1·§2 |
| 검색 구조 | ✅ §3·§9.2 |
| 재사용 구조 | ✅ §4·§9.3 |
| 삭제 정책 | ✅ §6·§9.3 |
| 사용처 추적 | ✅ §5 |
| Metadata 표준 | ✅ §9.1 |
| 파일명/네이밍 가이드라인 | ✅ §9.4 |
| Canonical Resource 모델 | ✅ §8 |
| 향후 WO 목록 | ✅ §10 |
| 코드 변경 없음 / read-only / CHECK 없음 | ✅ |

---

## 12. 확장 원칙 (신규 Resource 기능 판단 기준)

신규 콘텐츠 자산 기능 추가 시 다음을 이 문서 기준으로 검증한다.
1. 새 자산이 §8 Canonical 필드(id/type/title/description/tags/owner/source/usage)를 갖는가?
2. 물리 저장소가 늘어도 **논리 Resource 계약**은 통일되는가(사일로 방지)?
3. 사용 시 **derivation 그래프에 적재**되어 역추적 가능한가?
4. 삭제 시 **사용 중 참조 보호**가 있는가?
5. 검색이 **공통 tags+본문 규약**을 따르는가?

---

*Status: 아키텍처 정의 완료 (read-only). 이 문서를 O4O 콘텐츠 Resource 관리 기준으로 하며, 후속 WO는 §10 기준 별도 지시로 착수.*
