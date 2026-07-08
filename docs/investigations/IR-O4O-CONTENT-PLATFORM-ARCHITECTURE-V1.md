# IR-O4O-CONTENT-PLATFORM-ARCHITECTURE-V1

> **O4O 콘텐츠 플랫폼의 최상위 아키텍처 문서.** 콘텐츠 자산 → 제작 → 저장 → 실행 → 재사용 → 배포의 전체 구조와 각 구성요소의 책임·인터페이스·데이터 흐름·복사 정책·확장 원칙을 코드 근거로 정의한다. 이후 콘텐츠 관련 기능은 이 문서를 기준으로 판단·확장한다.

- **작성일**: 2026-07-08
- **유형**: 아키텍처 정의 IR (read-only, 코드 변경 없음, CHECK 없음)
- **상위 묶음**: [`IR-O4O-STANDARD-CONTENT-EDITOR-PLATFORM-EVALUATION-V1`](IR-O4O-STANDARD-CONTENT-EDITOR-PLATFORM-EVALUATION-V1.md) + 편집기 3-WO([Media Library](../work-orders/WO-O4O-CONTENT-ASSET-MEDIA-LIBRARY-STANDARDIZATION-V1.md) / [Table](../work-orders/WO-O4O-CONTENT-EDITOR-TABLE-SUPPORT-STANDARDIZATION-V1.md) / [Video](../work-orders/WO-O4O-CONTENT-EDITOR-VIDEO-STANDARDIZATION-V1.md))를 상위에서 묶는 기준 문서.

---

## 1. 표준 원칙 (SSOT — 이 문서의 결론 요약)

| 구성요소 | 책임 (한 문장) |
|---|---|
| **Media Library** | 미디어(이미지·동영상·파일)의 **URL Provider**. 미디어 생명주기(업로드·보관·삭제) 소유. `media_assets` |
| **RichTextEditor** | **HTML Editor**. HTML 생성·편집만. 미디어는 URL만 저장, 파일 관리 안 함 |
| **ContentRenderer** | **표준 Renderer**. 모든 소비 표면이 편집기와 **동일 출력**을 내야 하는 단일 렌더러 |
| **HTML** | **저장 포맷**. 미디어·구조를 URL/마크업으로만 담음. 사용자는 직접 편집하지 않음(HTML 탭은 선택) |
| **Execution Asset** | **실행 자산**. 매장이 실제 배포하는 산출물. `store_execution_assets`(+ POP/QR 표면 메타) |
| **복사 정책** | **가져오기 = 값-복사 사본**. 원본 무FK 독립 사본. 매장/org 소유 |

> 이 6개 원칙이 유지되면 신규 콘텐츠 소스(HTML Snippet·Template·AI 자산·PDF 등)는 **기존 인터페이스 변경 없이** 확장 가능하다.

---

## 2. 구성요소 관계도

```text
                    ┌─────────────── Content Asset ───────────────┐
                    │                                             │
              Media Library         HTML Snippet(향후)      Template
              (media_assets)                                (content_templates)
                    │                                             │
                    └──────────────────┬──────────────────────────┘
                                       │ (URL / HTML 주입)
                                       ▼
                               RichTextEditor  ◄── AiContentModal (편집 보조/변환)
                               (@o4o/content-editor)
                                       │
                          ProductionMaterialEditorShell
                                       │  onChange(html)
                                       ▼
                    ┌──────────────── HTML 저장 (3계층) ────────────────┐
                    │                                                   │
          HUB 원본            매장 사본                        플랫폼 공용
       (kpa_contents)   (kpa_working_contents /         (shared_product_descriptions)
        org 격리 없음     kpa_store_contents /              master(barcode) 기준
                          o4o_asset_snapshots /
                          store_execution_assets)  ← 가져오기=값복사 사본
                                       │
                                       ▼
                               Execution Asset
                        (store_execution_assets: pop/qr/signage/banner/notice)
                          + store_pops / store_qr_codes (표면 메타)
                                       │
                                       ▼
                               ContentRenderer  (표준 Renderer)
                                       │
        ┌────────┬────────┬────────┬────────┬────────┬────────┬────────┐
       POP      QR     사이니지  태블릿   블로그   상품설명   공지    자료실/강의
```

---

## 3. Content Asset (콘텐츠 자산 계층)

| 자산 | 저장소 | 상태 |
|---|---|---|
| **미디어(이미지/동영상/파일)** | `media_assets` (GCS `o4o-media-library`) + `MediaLibraryService` | 존재. **편집기 연동은 45개 중 3개뿐**(WO-1 대상) |
| **Template** | `content_templates` (`ContentTemplate`, category: product/qr_code/pop/general) | 편집기에 통합됨. 현재 `ProductDetailDrawer` 단독 실사용 |
| **HTML Snippet** | — | **미구현**. 향후 확장 대상 |
| **Prompt / PDF / SVG / Icon** | — | 미구현. 확장 후보 |

**원칙**: 모든 자산은 Media Library(또는 향후 Snippet/Template 저장소)가 생명주기를 소유하고, 편집기는 그 **URL/HTML을 삽입**만 한다.

---

## 4. Content Editor (제작 계층)

- **표준 편집기** = TipTap 기반 `@o4o/content-editor` `RichTextEditor` (교체 근거 없음 — 상위 IR 결론).
- **공용 셸** = `ProductionMaterialEditorShell`. 단 주입 인터페이스 `InjectedEditorProps` 에 미디어 prop이 없어 **구조적 차단**(WO-1 대상).
- **삽입 계약** = WO-1에서 Media Type 인지형(`insertMedia({type,url,...})`)으로 표준화 예정. WO-2(Table)·WO-3(Video)는 이 계약 위에 확장.
- **현 기능 공백**: Table(WO-2), Video mp4(WO-3), 미디어 라이브러리 표준화(WO-1). Round-trip은 최강점.

---

## 5. Storage (저장 계층) — 3계층 모델

| 계층 | 테이블(엔티티) | 소유 | 성격 |
|---|---|---|---|
| **HUB 원본** | `kpa_contents` (`KpaContent`) | `created_by`, **org 격리 없음** | 운영자 HUB 공급 원본 (Broadcast 도메인) |
| **매장 사본** | `kpa_working_contents`(운영자 개인 사본, @deprecated) · `kpa_store_contents`(매장 편집 레이어, Workspace A SSOT) · `o4o_asset_snapshots`(표준 자료함 사본) · `store_execution_assets`(실행 자산) | `owner_id` / `organization_id` | 값-복사 독립 사본, 모두 org/store 격리 |
| **플랫폼 공용** | `shared_product_descriptions` | master(barcode) 기준, 매장 소유 아님 | O4O 전체 상품 DB 공용 자산 |

**본문 필드 이질성 주의**: `kpa_contents`=`blocks jsonb` / `kpa_working_contents`=`body text` / `kpa_store_contents`=`content_json jsonb` / `store_execution_assets`=`html_content text` / `shared_product_descriptions`=`content text(HTML)`. **HTML과 block 배열이 혼재**한다 — 통일 대상 후보.

---

## 6. Execution Asset (실행 계층)

- **표준 테이블**: `store_execution_assets` — `usage_type`(pop/qr/signage/banner/notice, application-level union), `asset_type`(file/content), `source_type`(uploaded/generated), `html_content`.
- **표면 메타 분리**: POP은 `store_pops`(author_role operator/store), QR은 `store_qr_codes`(landing + `library_item_id` soft ref)가 별도 표면 메타 보유.
- **파생 추적**: `store_asset_derivations`(polymorphic, FK 없음) — 원본↔사본 추적 전용.

---

## 7. Reuse / Copy Policy (복사 정책)

**결론: "가져오기 = 값-복사 사본" 불변식이 플랫폼 전반에서 성립.** (근거: [`IR-O4O-COPY-ON-IMPORT-INVARIANT-AUDIT-V1`](../ir/IR-O4O-COPY-ON-IMPORT-INVARIANT-AUDIT-V1.md) 전수 감사 — 원본 직접 참조 운영 데이터 0건)

- 자료함 복사 → `o4o_asset_snapshots` 새 row(본문 전체 복사, source_asset_id는 FK 아님·메타만)
- HUB→개인 사본 → `kpa_working_contents`(sync 없음, @deprecated)
- POP import → `store_pops` 사본, QR copy-guard → `store_execution_assets`(asset_type='content') 사본
- 태블릿/QR은 **매장 소유 사본을 soft reference**(FK 없음), 원본 HUB 직접참조 아님
- **clone/얕은복사 경로 없음** — 전부 `repo.create({스칼라})` 값 복사

**미결 예외 1건 (정책 결정 대상, 버그 아님)**: QR `page` landing이 `kpa_contents` 원본을 우선 조회하는 경로. content_hub는 Broadcast 도메인(F4)이라 "1회 게시→모든 매장 라이브 원본" broadcast 모델도 성립 가능. 운영 데이터 미실현(활성 QR 7/7 사본). → 후속 WO: **사본화 강제(a) vs broadcast 명문화(b)** 결정.

---

## 8. Rendering (렌더링 계층) — ⚠ 정합성 결함 발견

**결론: 이미지는 완전 일치, 그러나 YouTube/iframe·표는 소비 표면에서 편집기와 어긋난다.** 이것이 이 IR의 최대 발견이다.

| 요소 | 편집기 ↔ 소비(ContentRenderer) 정합 |
|---|---|
| **이미지** | ✅ **완전 일치** — `IMAGE_DISPLAY_STYLES` 단일 소스를 편집기·렌더러 양쪽 주입(폭/정렬 동일) |
| **YouTube/iframe** | ⚠ **불일치** — `ContentRenderer` 기본/`product-detail` variant는 `sanitizeHtml`(iframe **제거**). `guide` variant만 `sanitizeRichHtml`로 보존. → **LMS 강의·상품상세·공지·자료실에서 편집기의 YouTube가 통째로 사라짐** |
| **표(Table)** | ⚠ **CSS 부재** — 렌더러 어디에도 표 CSS 없음(WO-2 §5.5 의존) |
| **이탈 표면 3곳** | signage-player(자체 ContentRenderer) · glycopharm `CourseDetailPage`(raw `sanitizeHtml` → 이미지 CSS·YouTube 둘 다 누락) · main-site forum(블록 렌더) |

### 8.1 결함의 의미 — WO-3 범위에 직결

WO-3(Video)가 편집기에 동영상을 넣어도, **소비 표면(default variant)이 `sanitizeHtml`로 iframe을 제거하면 사용자에겐 동영상이 안 보인다.** 즉 "동영상 표준화"는 편집기 노드만이 아니라 **ContentRenderer의 variant/sanitize 정합**까지 포함해야 실제로 성립한다. → WO-3 완료 기준 §12(ContentRenderer 동일 출력)의 실질 근거이며, 이 IR이 그 필요성을 코드로 확증한다.

---

## 9. AI (콘텐츠 AI 계층)

**정책: "초안 생성 AI는 페이지 진입점에서 제거, 편집 보조/변환은 보존."** (근거: `IR-O4O-AI-CONTENT-GENERATION-ENTRYPOINT-AUDIT-V1`)

- **보존**: Toolbar "AI 정리" + `AiContentModal`(텍스트/URL 변환·정리) + 백엔드 `/api/ai/content`·`/api/ai/url-to-blocks`. 편집기 결과 → `setContent` 자동 반영.
- **페이지형 초안 진입점 제거**: POP/QR문구/블로그/상품설명/자료생성/라이브러리 (다수 WO로 정리 완료).
- **잔존 초안 생성 AI(정책적 유지)**: LMS(course-structure/lesson-body), QR 설명(`/api/ai/qr-description` 코너별), 사이니지 AI 생성, 매장 제작 자료 흐름.
- **오퍼레이터 AI**: `CopilotEngineService.generateInsights()` — 대시보드 인사이트(요약). **콘텐츠 편집과 무관**.

---

## 10. 콘텐츠 생명주기

```text
생성(빈 편집기/외부 LLM 붙여넣기)
  → 편집(RichTextEditor + AI 정리 보조)
  → 저장(HTML, 3계층 중 하나)
  → 승인/게시(운영자 검수 · HUB 공급)
  → 복사(가져오기=값복사 사본)
  → 실행(Execution Asset: POP/QR/사이니지/태블릿…)
  → 배포(ContentRenderer 표준 렌더)
  → 보관/삭제(각 소유 계층이 관리)
```

---

## 11. 도출된 Gap 및 후속 WO 후보

| 순위 | Gap | 근거 | 후속 |
|:--:|---|---|---|
| **P0** | 미디어 라이브러리 표준화 | 45개 중 3개만 연동, 셸 구조적 차단 | **WO-1** (확정) |
| **P0** | Table 지원 (Round-trip 완성) | 확장 미설치 | **WO-2** (확정) |
| **P0** | **렌더링 정합 — 소비 표면 YouTube 드롭** | §8: default variant `sanitizeHtml` iframe 제거 → LMS/상품상세/공지/자료실에서 YouTube 소실 | **WO-3에 포함** 또는 별도 렌더링 정합 WO |
| **P1** | Video(mp4) 표준화 | 편집기 YT/Vimeo만 | **WO-3** (확정) |
| **P1** | QR content_hub 복사 vs broadcast 결정 | §7 미결 예외 | 정책 결정 WO |
| **P1** | 렌더링 이탈 3표면 수렴 | §8: signage-player·glycopharm course·forum | 정합 WO |
| **P2** | 본문 포맷 통일(HTML vs block) | §5: 5개 저장소 필드 이질 | 설계 WO |
| **P2** | HTML Snippet / Template 확대 | §3 미구현·단독사용 | 확장 WO |

---

## 12. 확장 원칙 (신규 기능 판단 기준)

신규 콘텐츠 기능을 추가할 때 다음을 만족하는지 이 문서 기준으로 검증한다.

1. 미디어/자산 생명주기는 **Media Library(또는 해당 자산 저장소)** 가 소유하는가? 편집기가 파일을 관리하려 하지 않는가?
2. 편집기는 **HTML(+URL)만** 저장하는가?
3. 삽입은 **WO-1 Media Type 계약**(또는 그 확장)을 시그니처 변경 없이 사용하는가?
4. 소비 표면은 **ContentRenderer 단일 렌더러**로 편집기와 동일 출력을 내는가? (variant/sanitize 정합 포함)
5. 가져오기는 **값-복사 사본**인가? 원본 직접 참조를 만들지 않는가?
6. 서비스별 분기 구현이 아니라 **공통 컴포넌트**인가?

---

## 13. 완료 기준 대비

| 기준 | 상태 |
|---|---|
| 구성요소·책임·인터페이스 문서화 | ✅ §1·§3~§9 |
| 데이터 흐름 / 컴포넌트 관계도 | ✅ §2·§10 |
| 복사 정책 조사 | ✅ §7 (일관·예외 1건) |
| 렌더링 일관성 조사 | ✅ §8 (결함 도출) |
| 확장 원칙 | ✅ §12 |
| 향후 WO 목록 | ✅ §11 |
| 코드 변경 없음 / read-only / CHECK 없음 | ✅ |

---

*Status: 아키텍처 정의 완료 (read-only). 이 문서를 콘텐츠 플랫폼 기준으로 하며, 후속 WO는 §11 기준 별도 지시로 착수.*
