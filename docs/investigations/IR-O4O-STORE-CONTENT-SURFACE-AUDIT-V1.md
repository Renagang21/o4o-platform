# IR-O4O-STORE-CONTENT-SURFACE-AUDIT-V1

> **유형:** Investigation Report (read-only — 코드/DB/route/운영데이터 변경 0)
> **대상:** KPA Society / GlycoPharm / K-Cosmetics 3서비스의 "내 매장·내 약국 콘텐츠" + 매장 허브(store-hub) 콘텐츠 화면
> **목적:** 즉시 수정이 아니라, 각 서비스 store-facing 콘텐츠 실제 구조를 확인하고 매장 허브 콘텐츠 페이지 정비 방향의 근거 확보
> **작성일:** 2026-06-17
> **상태:** 조사 완료

---

## 0. 결론 요약 (TL;DR)

1. **백엔드·데이터 계층은 이미 공통화(service-neutral)되어 있다.** HUB 목록 API(`GET /api/v1/hub/contents?serviceKey=…`), 복사 자산 테이블(`o4o_asset_snapshots`), 가져오기 엔드포인트(`/{service}/stores/:slug/{blog|pop|qr}/staff/import`), 대상 테이블(`store_blog_posts`/`store_pops`/`store_qr_codes`)이 3서비스 동일. → **정비 대상은 frontend store-hub 화면의 IA·문구·탭이지 backend가 아니다.**

2. **`/store-hub/content` 는 "CMS 콘텐츠 1개 sourceDomain" 전용 화면이다.** POP·QR·블로그·사이니지는 **이미 `/store-hub/{pop,qr,blog,signage}` 형제(sibling) 허브 페이지**로 분리돼 있고 각자 가져오기 흐름이 있다. → 사용자 가설 "콘텐츠 페이지 탭 = 전체/POP/QR/블로그/안내문/사이니지" 는 **현 아키텍처와 충돌**(이미 페이지 단위로 분리됨). 탭은 콘텐츠 페이지가 아니라 **store-hub 부모 네비게이션**에 해당하는 구조.

3. **KPA `/store-hub/content` 만 outlier 다.** GlycoPharm·K-Cosmetics 는 공통 `ContentHubTemplate` + "콘텐츠 자료실" 프레이밍 + CMS 타입 필터 `전체/공지/가이드/지식/프로모션/뉴스` 를 이미 사용. KPA 는 독자 `HubContentLibraryPage` + "플랫폼 콘텐츠 / 본부·공급사 CMS 콘텐츠" 프레이밍 + `전체/공지·소식/가이드/지식자료/혜택·이벤트` 5탭.

4. **가설 검증 결과: "매장 허브 콘텐츠 = 내 매장 콘텐츠의 가져오기/공급/탐색 화면" 은 참.** 3서비스 모두 복사/가져오기 → `내 자료함`(자산) 또는 `내 매장 블로그/POP/QR` 사본으로 귀착하며, 원본/사본 분리 문구도 동일.

5. **권장: 즉시 구조 신설이 아니라 "KPA 를 GlycoPharm·K-Cosmetics canonical 로 수렴"** (소수를 다수 표준에 정렬). 탭을 콘텐츠 페이지에 욱여넣지 말 것. 후속 WO 후보는 §8·§10.

---

## 1. 조사 대상 & 방법

| 서비스 | frontend 디렉터리 | store 라벨 | 공개 도메인 |
|--------|------------------|-----------|------------|
| KPA Society | `services/web-kpa-society` | 약국 / 내 약국 / 약국 운영 허브 | kpa-society.co.kr |
| GlycoPharm | `services/web-glycopharm` | 약국 / 내 약국 / 약국 운영 허브 | glycopharm.co.kr |
| K-Cosmetics | `services/web-k-cosmetics` | 매장 / 내 매장 / 매장 운영 허브 | k-cosmetics.site |

방법: route/page/component/API client 정적 분석(frontend 3서비스) + backend route/controller/entity 정적 분석. **DB 미조회, 코드/스키마 미변경.**

---

## 2. store-hub(매장 허브) 콘텐츠 표면 — 3서비스 비교

매장 허브는 **단일 콘텐츠 페이지가 아니라 여러 sourceDomain 형제 페이지의 집합**이다. 3서비스 모두 동일한 골격:

| store-hub 하위 | sourceDomain | KPA 컴포넌트 | GlycoPharm 컴포넌트 | K-Cosmetics 컴포넌트 | 가져오기 → 귀착 |
|----------------|--------------|-------------|---------------------|----------------------|-----------------|
| `/store-hub/content` | `cms` | `HubContentLibraryPage` | `HubContentListPage` | `HubContentPage` | 복사 → `/store/library/contents` (`o4o_asset_snapshots`) |
| `/store-hub/blog` | `blog` | `HubBlogLibraryPage` | `HubBlogLibraryPage` | `HubBlogLibraryPage` | 가져가기 → `/store/content/blog` (`store_blog_posts`, draft) |
| `/store-hub/pop` | `pop` | `HubPopLibraryPage` | `HubPopLibraryPage` | `HubPopLibraryPage` | 가져가기 → 내 매장 POP (`store_pops`, draft) |
| `/store-hub/qr` | `qr` | `HubQrLibraryPage` | `HubQrLibraryPage` | `HubQrLibraryPage` | 가져가기 → `/store/marketing/qr` (`store_qr_codes`) |
| `/store-hub/signage` | `signage-media` / `signage-playlist` | `HubSignageLibraryPage` | `HubSignageLibraryPage` | `HubSignagePage` | 추가 → `/store/marketing/signage/playlist` (snapshot) |
| `/store-hub/b2b`, `/store-hub/event-offers`, `/store-hub/cart` | — | 동일 | 동일 | 동일 | (비콘텐츠) |

→ **콘텐츠 "유형"은 이미 페이지 단위로 1급 분리**되어 있다. `/store-hub/content` 는 그중 CMS 유형 전용.

### 2.1 `/store-hub/content` (CMS 전용) 화면 비교 — 여기가 divergence 지점

| 항목 | KPA Society | GlycoPharm | K-Cosmetics |
|------|-------------|------------|-------------|
| 컴포넌트 | `HubContentLibraryPage` (독자) | `HubContentListPage` (ContentHubTemplate 기반) | `HubContentPage` (ContentHubTemplate 기반) |
| 화면 제목 | **"플랫폼 콘텐츠"** | **"매장에서 바로 쓰는 콘텐츠"** | **"매장에서 바로 쓰는 콘텐츠"** |
| 설명 문구 | "본부/공급사가 제공하는 CMS 콘텐츠를 탐색하고 내 매장에 복사합니다" | "GlycoPharm 약국을 위한 콘텐츠 자료실" | "K-Cosmetics 매장을 위한 콘텐츠 자료실" |
| 탭/필터 | `전체 / 공지·소식 / 가이드 / 지식자료 / 혜택·이벤트` (5) | `전체 / 공지 / 가이드 / 지식 / 프로모션 / 뉴스` (6) | `전체 / 공지 / 가이드 / 지식 / 프로모션 / 뉴스` (6) |
| 리스트 형태 | 카드 | 카드 그리드 | 카드 그리드 |
| 검색 | 제목/요약 | 콘텐츠 검색 | 콘텐츠 검색 |
| 페이지네이션 | 20/page | 12/page | 12/page |
| 복사 버튼 | "내 매장에 복사" | "내 약국에 복사" | "내 매장에 복사" |
| 빈 상태 | "현재 제공되는 콘텐츠가 없습니다" | (템플릿 공통) | (템플릿 공통) |
| 가져오기 후 안내 | (원본/사본 분리 안내) | "복사된 콘텐츠는 내 약국 > 자산 관리에 별도 사본으로 저장됩니다 …" | "복사된 콘텐츠는 내 매장 > 자산 관리에 별도 사본으로 저장됩니다 …" |
| API | `cmsApi.getContents` + `assetSnapshotApi.copy` | `GET /hub/contents?serviceKey=glycopharm&sourceDomain=cms` + `POST /glycopharm/assets/copy` | `GET /hub/contents?serviceKey=k-cosmetics&sourceDomain=cms` + `POST /cosmetics/assets/copy` |

> **핵심:** GlycoPharm·K-Cosmetics 는 **동일 ContentHubTemplate + 동일 6-필터 + 동일 "콘텐츠 자료실" 언어**로 이미 정렬됨. KPA 만 "플랫폼 콘텐츠 / CMS 탐색" 이라는 **CMS-운영자 관점 프레이밍 + 5탭** 으로 남아 있는 소수.

---

## 3. 내 매장·내 약국 콘텐츠 표면 — 3서비스 비교

3서비스 모두 "내 자료함"(보관) + "콘텐츠 실행"(blog/pop/qr/signage) + "상품 연결" 구조로 거의 동형.

| 표면 | 경로 | KPA | GlycoPharm | K-Cosmetics |
|------|------|-----|------------|-------------|
| 자료함-콘텐츠 | `/store/library/contents` | `StoreLibraryContentsPage` | `StoreLibraryContentsPage` | `StoreLibraryContentsPage` |
| 자료함-자료 | `/store/library/resources` | ✓ | (production-materials 통합) | ✓ |
| 자료함-제작자료 | `/store/library/production-materials` | ✓ | ✓ | ✓ |
| 상품 설명 | `/store/library/product-descriptions` (KPA: `/store/marketing/product-descriptions`) | ✓ | ✓ | ✓ |
| 블로그 | `/store/content/blog` | `PharmacyBlogPage` | `PharmacyBlogPage` | `StoreBlogManagePage` |
| POP | `/store/marketing/pop` (+ `/pop/library` 사본) | `StorePopPage` | `StorePopPage` | `StorePopPage` |
| QR | `/store/marketing/qr` | `StoreQRPage` | `StoreQrPage` | `StoreQrPage` |
| 사이니지 | `/store/marketing/signage/playlist` | `StoreSignagePage` | `StoreSignageMainPage` | `StoreSignagePage` |
| 상품별 마케팅 | `/store/commerce/products/:id/marketing` · `/pop` | (StoreQRPage 내 product landing) | `ProductMarketingPage`·`ProductPopBuilderPage` | `ProductMarketingPage`·`ProductPopBuilderPage` |

**자료함의 역할(3서비스 공통):** `/store/library/contents` 는 보관용이 아니라 **POP·QR(·블로그·사이니지) 제작에 다시 쓰는 원본**. "제작 시작" → POP/QR 생성 흐름. (KPA banner: "내 자료함의 콘텐츠는 보관용이 아니라 POP·QR·블로그·사이니지 제작에 다시 활용할 수 있는 원본")

---

## 4. 콘텐츠 유형 비교표

| 콘텐츠 유형 | 내부 키(sourceDomain/type) | KPA | GlycoPharm | K-Cosmetics | 공통화 상태 |
|------------|---------------------------|-----|------------|-------------|------------|
| CMS 콘텐츠 | `cms` (notice/guide/knowledge/promo/news 등) | ✓ (복사 전용) | ✓ | ✓ | 백엔드 공통. 프론트 KPA만 outlier |
| 블로그 | `blog` | ✓ | ✓ | ✓ | 완전 공통 (import → store_blog_posts) |
| POP | `pop` | ✓ | ✓ | ✓ | 완전 공통 (import → store_pops) |
| QR | `qr` | ✓ | ✓ | ✓ | 완전 공통 (import → store_qr_codes) |
| 사이니지(미디어/플레이리스트) | `signage-media`/`signage-playlist` | ✓ | ✓ | ✓ | 완전 공통 (snapshot copy) |
| 상품 설명 | `product_description` (ProductAiContent) | ✓ | ✓ | ✓ | 공통 (AI 재생성 흐름) |
| 안내문 | — | **별도 유형 없음** | **별도 유형 없음** | **별도 유형 없음** | 미존재 (POP/CMS 내 포섭) |
| 이미지/배너/동영상 | signage media type(image/video) | 사이니지 내 | 사이니지 내 | 사이니지 내 | 별도 표면 없음 |

> **시사점:** 사용자가 후보로 든 "안내문" 은 현재 어느 서비스에도 **독립 콘텐츠 유형으로 존재하지 않는다**(POP/CMS 로 흡수). 표준 탭 후보에 "안내문" 을 넣으려면 신규 도메인 정의가 선행돼야 함 → 본 IR 범위 밖.

---

## 5. 생성/가져오기/활용 흐름 비교표

| 항목 | KPA | GlycoPharm | K-Cosmetics | 판단 |
|------|-----|------------|-------------|------|
| 직접 생성(블로그/POP/QR) | 매장측 직접 작성 | 매장측 직접 작성 | 매장측 직접 작성 | 공통 |
| AI 생성/보조 | 일부 | POP/상품설명 AI prefill | POP/QR/상품설명 AI | KCos·GP 가 AI 통합 더 진전 |
| 템플릿 | 일부 | 일부 | POP 템플릿(모던/소프트/전문형) | KCos 가 명시적 |
| 허브에서 가져오기 | ✓ (5 도메인) | ✓ | ✓ | 공통 |
| 가져온 콘텐츠 사본화 | ✓ snapshot/import | ✓ | ✓ | 공통 |
| 원본/사본 분리 | ✓ (문구 명시) | ✓ (문구 명시) | ✓ (문구 명시) | 공통 — 거의 동일 카피 |
| 중복 가져오기 | 허용(새 사본) | 허용 | 허용 | 공통 (DB unique 제거됨) |
| 수정/삭제 권한 | 사본 매장 소유, draft | 동일 | 동일 | 공통 |
| 사이니지 활용 | snapshot → playlist | 동일 | 동일 | 공통 |
| 상품 연결 | QR landing=product | product marketing graph | product marketing graph | KCos·GP 가 더 구조화 |

**가져오기 = 복사** 원칙은 3서비스 모두 준수: 사본은 매장 소유·draft, 원본 수정/삭제 무영향, 재복사 시 새 사본, 사본 독립 삭제 가능. (backend: `author_role='store'`, `status='draft'`, `o4o_asset_snapshots` source 스냅샷)

---

## 6. backend/API/entity 공통성 (정비 안전성 근거)

- **HUB 목록**: `GET /api/v1/hub/contents` 단일 service-neutral 엔드포인트(`serviceKey` + `sourceDomain` 파라미터). `HubContentQueryService`. → KPA 프론트는 일부 `cmsApi.getContents` 사용(legacy), GP/KCos 는 `hubContentApi.list` 사용 — **프론트 client 차이일 뿐 backend 동일**.
- **복사 자산**: `o4o_asset_snapshots` (`source_service`/`source_asset_id`/`asset_type`/`content_json`). `@o4o/asset-copy-core` 팩토리. 3서비스 모두 `POST /{service}/assets/copy` (`assetType: 'cms'|'signage'|…`).
- **가져오기**: `/{service}/stores/:slug/{blog|pop|qr}/staff/import` → `store_blog_posts`/`store_pops`/`store_qr_codes` (`author_role='store'`, draft). 라우트/엔티티/로직 3서비스 동일.
- **divergence(backend)**: ① blog.controller `DEFAULT_SERVICE_KEY='glycopharm'` (KPA·Cos 는 명시 전달, GP 는 default 의존 — 잠재 리스크), ② asset copy 허용 role 이 KPA 만 명시(4개), GP/Cos 미명시, ③ QR resolver Phase1 placeholder(`null`) 일부. → **본 IR 의 frontend 정비와 독립**. 별도 정리 후보로만 기록.

→ **frontend store-hub 콘텐츠 화면 정비는 backend/DB 무변경으로 가능**(이미 공통 API 위에 얹혀 있음).

---

## 7. 현재 KPA `/store-hub/content` 구조 적합성 판단

| 질문 | 판단 |
|------|------|
| 매장 사용자가 쓰는 콘텐츠 유형과 맞나 | 부분. CMS 유형(공지/가이드/지식)은 매장 활용 자료로 타당하나, "혜택·이벤트" 는 event-offer 표면과 중복 소지 |
| 내 매장 콘텐츠 관리 구조와 연결되나 | ✓ 복사 → `/store/library/contents` 로 연결 (3서비스 공통) |
| CMS 분류 vs 매장 활용 분류 중 어디에 가까운가 | **CMS 분류**(notice/guide/knowledge/promo/news). 매장 실행 분류(POP/QR/blog)는 별도 페이지가 이미 담당 |
| 제목·문구 적절성 | **부적절(소수 일탈).** "플랫폼 콘텐츠 / 본부·공급사 CMS 콘텐츠 탐색" 은 운영자/플랫폼 관점. GP·KCos 의 "매장에서 바로 쓰는 콘텐츠 / 콘텐츠 자료실" 이 매장 사용자 관점에 부합하며 이미 2/3 표준 |
| 탭 적절성 | "혜택·이벤트" 1개를 제외하면 GP·KCos 의 `공지/가이드/지식/프로모션/뉴스` 와 사실상 동형. KPA 만 라벨/구성이 어긋남 |

**결론: KPA `/store-hub/content` 는 기능적으로는 정상이나 IA·문구·탭이 GP·KCos canonical 에서 이탈한 outlier. 유지보다 수렴이 적절.**

---

## 8. 매장 허브 콘텐츠 페이지 정비 방향 제안

### 8.1 원칙 (가설 검증 반영)
- 매장 허브 콘텐츠 페이지의 역할 = **"내 매장으로 가져올 CMS 콘텐츠를 탐색·복사하는 자료실"** (가설 §7-Q5 = 참).
- **콘텐츠 "유형"(POP/QR/블로그/사이니지)을 콘텐츠 페이지의 탭으로 만들지 않는다.** 이미 store-hub 형제 페이지로 분리됨. 탭 추가는 중복 IA·기능 혼선.
- 정비 = **신설이 아니라 KPA 를 GP·KCos canonical 로 수렴**(`ContentHubTemplate` + 동일 문구 + 동일 6-필터).

### 8.2 제목/문구 (KPA 정렬 대상)
- 현재(KPA): "플랫폼 콘텐츠" / "본부·공급사가 제공하는 CMS 콘텐츠를 탐색하고 내 매장에 복사합니다"
- 권장(GP·KCos canonical): "매장에서 바로 쓰는 콘텐츠" / "{서비스} 매장(약국)을 위한 콘텐츠 자료실"

### 8.3 탭/필터 (KPA 정렬 대상)
- 현재(KPA): `전체 / 공지·소식 / 가이드 / 지식자료 / 혜택·이벤트`
- 권장(canonical): `전체 / 공지 / 가이드 / 지식 / 프로모션 / 뉴스` (CMS type 필터). "혜택·이벤트" → event-offer 표면과 중복이므로 `프로모션` 으로 흡수 검토.

### 8.4 가져오기 안내 문구 (이미 GP·KCos 동일 — KPA 정렬)
> "복사된 콘텐츠는 내 매장(약국) > 자산 관리에 별도 사본으로 저장됩니다. 원본이 수정·삭제되어도 내 매장 사본은 영향받지 않습니다. 다시 복사하면 새 사본으로 저장되며, 필요 없는 사본은 내 매장에서 삭제할 수 있습니다."

### 8.5 store-hub 부모 네비게이션(유형 축)
- 유형 분리는 부모 네비에서: `콘텐츠(CMS) / 블로그 / POP / QR / 사이니지 / B2B / 이벤트`. 3서비스 이미 동형 → 정비 불필요(확인만).

---

## 9. 핵심 질문 답변 (§7 Q1~Q5)

- **Q1. 3서비스 구조가 같은가/다른가** → **백엔드·데이터·내 매장 흐름은 같다(공통).** 다른 곳은 `/store-hub/content` **프론트 화면의 문구·탭·컴포넌트뿐**이며, GP·KCos 가 표준, KPA 가 outlier.
- **Q2. 내 매장 콘텐츠 표준 탭 후보** → 콘텐츠 페이지 한정으로는 **CMS 타입 필터 `전체/공지/가이드/지식/프로모션/뉴스`**. "전체/POP/QR/블로그/사이니지" 는 페이지(부모 네비) 축이지 콘텐츠 페이지 탭이 아니다.
- **Q3. 허브 콘텐츠 페이지가 내 매장과 같은 탭을 써야 하나** → **부분.** 가져오기 귀착(자료함·blog·pop·qr)은 일치시키되, 콘텐츠 페이지 자체의 탭은 CMS 분류를 유지하고 유형은 부모 네비로 분리(현행 유지).
- **Q4. KPA `공지·소식/가이드/지식자료/혜택·이벤트` 탭 적절성** → CMS 분류로는 타당하나 **GP·KCos canonical(`공지/가이드/지식/프로모션/뉴스`)과 어긋남**. "혜택·이벤트" 는 event-offer 중복 소지. → 주 탭으로 유지하되 canonical 라벨로 정렬 권장.
- **Q5. 매장 허브 콘텐츠의 권장 역할** → **③ 내 매장 콘텐츠의 가져오기/공급/탐색 허브**(가설 일치). 운영자 CMS 목록(①)·일반 게시판(④) 아님. 자료실 성격(②)과 가져오기 허브(③)의 결합.

---

## 10. 후속 WO 후보

1. **(권장) `WO-O4O-KPA-STOREHUB-CONTENT-CANONICAL-ALIGN-V1`** — KPA `HubContentLibraryPage` 를 GP·KCos `ContentHubTemplate` 패턴으로 수렴(제목/설명/6-필터/안내문구). frontend-only, backend 무변경. Shared Module Change Protocol 적용(소비처 = KPA store-hub 단일). "혜택·이벤트" → "프로모션" 통합 여부 결정 포함.
2. **(조건부) `IR-O4O-STOREHUB-CONTENT-TEMPLATE-COMMONIZATION-V1`** — 3서비스 콘텐츠 허브를 단일 `@o4o/shared-space-ui` ContentHubTemplate 소비로 완전 통합(KPA 독자 컴포넌트 제거) 타당성. (Platform UI System v1 연장선)
3. **(독립) `WO-O4O-STORE-IMPORT-BACKEND-CONSISTENCY-V1`** — blog.controller `DEFAULT_SERVICE_KEY` 명시화(3서비스), asset-copy 허용 role 명시 정렬, QR resolver placeholder 정리. backend 정리(본 IR 와 독립).
4. **(보류) "안내문" 콘텐츠 유형 신설 여부** — 현재 미존재. 도입 시 sourceDomain/도메인 정의 선행 필요. 수요 확인 후 별도 IR.

---

## 11. 준수 확인 (작업 제한 §9)

```
✅ read-only 조사 — 코드/route/UI/backend/DB 변경 0
✅ migration/schema/package/lockfile 변경 0
✅ 운영 데이터·민감 개인정보 실조회 0 (정적 분석만, 프로덕션 DB 미접속)
✅ legacy redirect/route 삭제 0, 배포 0
✅ 산출물 = 본 문서 1개만 (docs/investigations/IR-O4O-STORE-CONTENT-SURFACE-AUDIT-V1.md)
✅ 문서만 path-specific commit
```

### 변경 파일
- `docs/investigations/IR-O4O-STORE-CONTENT-SURFACE-AUDIT-V1.md` (신규, 본 문서)

### 변경하지 않은 항목
- 3서비스 frontend route/page/component, backend route/controller/entity, DB, package — 일절 무변경.

---

*read-only investigation · 백엔드·데이터·내 매장 흐름은 3서비스 공통 · divergence 는 KPA `/store-hub/content` 프론트(문구·탭·컴포넌트) outlier · POP/QR/블로그/사이니지는 이미 store-hub 형제 페이지(탭 아님) · 가설("매장 허브 콘텐츠 = 내 매장 콘텐츠 가져오기/공급 허브") 참 · 권장 = KPA 를 GP·KCos canonical 로 수렴, backend 무변경.*
