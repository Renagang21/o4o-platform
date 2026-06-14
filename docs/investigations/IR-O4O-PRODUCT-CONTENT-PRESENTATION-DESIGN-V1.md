# IR-O4O-PRODUCT-CONTENT-PRESENTATION-DESIGN-V1

> **유형:** 설계 IR (read-only, 코드/UI/API/DB/route/menu 무변경)
> **목적:** 제품과 연결된 콘텐츠를 사용자 화면에서 어떻게 보여주고(전체/일반/제품 탭) 찾게(검색·필터) 할지 설계하고, 구현 전 결정해야 할 데이터/정책 갭을 확정한다.
> **작성:** 2026-06-13
> **선행:** IR-O4O-KPA-CONTENT-LIST-AND-EDITOR-FLOW-AUDIT-V1

---

## ⚠️ 핵심 결론 (먼저 읽을 것)

> **제품 콘텐츠 presentation 은 "구현 가능하나 순수 프론트 변경이 아니다."** 콘텐츠 리스트 행이 현재 **productId 를 담지 않고**, 콘텐츠 API 어디에도 **productId/tag 필터가 없으며**, 무엇보다 **"용도 B2B/B2C/공통"을 받칠 데이터 필드가 존재하지 않는다**(B2C 는 channel_type, "B2B" 값 자체 부재).
>
> **구현 전 3개 결정 필요:** ① **"제품 콘텐츠"의 canonical 정의** — `product_marketing_assets`(junction) vs `ProductAiContent`(제품 바인딩) 중 무엇이 "제품 콘텐츠"인가, ② **"용도 B2B/B2C/공통"의 backing** — 신규 콘텐츠 필드 vs channel 재해석 vs 항목 보류, ③ **역방향(asset→product) 조회 + 행에 product 정보 부여**(백엔드).
>
> → **판정: 단계적 — Phase 1(콘텐츠유형/용도 필터·탭, 경량) FE+소량 BE 로 즉시 가능. Phase 2(제품 콘텐츠 탭·제품명/연결제품 필터)는 위 3 결정 + 백엔드 선행 필요.**

## 1. 설계 목표 (사용자 요구)

```
콘텐츠 리스트:  [전체] [일반 콘텐츠] [제품 콘텐츠]
검색:          제목 · 태그 · 제품명
필터:          콘텐츠 유형(POP/QR/블로그/안내문) · 용도(B2B/B2C/공통) · 연결 제품
```

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` · HEAD `716a73c9` · origin 0/0 |
| 다른 세션 WIP | operator-core-ui / instructor-course-form / pnpm-lock / CHECK-CODEX — **미접촉** |
| 조사 기준 commit | `716a73c9` |

## 3. 현재 데이터 모델 (제품 ↔ 콘텐츠)

### 3.1 두 가지 연결 메커니즘 (정리 필요)
| 메커니즘 | 테이블 | 연결 방식 | 정방향 조회 | 역방향 |
|----------|--------|----------|:--:|:--:|
| **product_marketing_assets** | junction(product_id, asset_type[qr/library/pop/signage], asset_id, organization_id, UQ) | **QR 자동 링크**(landingType='product' 생성 시) + library/pop/signage **수동**(`POST /pharmacy/products/:id/marketing`) | ✅ `GET /pharmacy/products/:id/marketing`(links+qrAssets+libraryAssets+summary) | ❌ asset→products 없음 |
| **ProductAiContent** | product_id + content_type(product_description/pop_short/pop_long/qr_description/signage_text) + content | 제품별 AI 콘텐츠 직접 바인딩 | ✅ `GET /products/:id/ai-contents`, idx(productId,contentType) | — |

> **결정 필요 ①:** "제품 콘텐츠" = 마케팅 자산 링크(junction)인가, 제품 바인딩 콘텐츠(ProductAiContent)인가, 둘 다인가? 둘은 성격이 다름(자산 연결 vs 콘텐츠 본문). canonical 정의를 먼저 정해야 리스트의 "제품 콘텐츠" 판정 기준이 선다.

### 3.2 제품 측 필드 (검색/필터 가능 항목)
- **ProductMaster**: name, brand_name(검색 가능), category_id, tags(JSONB), drug_category(otc/rx/quasi), regulatory_type.
- **OrganizationProductListing**(매장 취급 상품, **organizationId** 경계): master_id, offer_id, price, status, event 기간.
- **LocalProduct**(표시 도메인): name, category, summary, thumbnail, badge_type.
- 제품명 검색: `ProductMaster.name/brand_name ILIKE`(QR landing 에서 사용 중).

### 3.3 ⚠️ B2B/B2C 분류 — backing 필드 부재
- 제품·콘텐츠에 **b2b/b2c/공통 필드 없음.**
- 분류는 **`OrganizationChannel.channel_type`** 에만: ENUM = **`B2C` / `KIOSK` / `TABLET` / `SIGNAGE`** (via `OrganizationProductChannel` 매핑). → **"B2B" 라는 값 자체가 없음.**
- 즉 사용자 요구 "용도: B2B/B2C/공통" 은 **현재 데이터로 직접 표현 불가.** (channel 은 콘텐츠가 아니라 제품-채널 노출 매핑.)

> **결정 필요 ②:** "용도 B2B/B2C/공통" 을 (a) 콘텐츠에 신규 `usage_segment` 필드로 신설, (b) channel 재해석(콘텐츠와 약결합 — 부적합), (c) 본 단계 보류 중 무엇으로 할지. **가장 큰 설계 갭.**

## 4. 현재 콘텐츠 리스트 UI (확장성)

| 리스트 | 테이블 | 현재 탭 | 현재 검색/필터 | 행에 product? |
|--------|--------|---------|---------------|:--:|
| StoreLibraryContentsPage(`/store/library/contents`) | DataTable(@o4o/ui), **StoreContentsSelector**(공유) | 콘텐츠/강의 + 문서형/코스형 | 제목 검색만 | ❌ 없음 |
| StoreProductionMaterialsPage(`/store/library/production-materials`) | **custom flexbox**(비공유) | **없음(flat 병합)** | 없음(4소스 client merge) | ❌ 없음 |
| StoreProductDescriptionsPage | sidebar 제품 목록 + 편집기 | — | 제품별(sidebar) | ✅ **제품 바인딩**(ProductAiContent) |

- **행 데이터(DocumentRow/LessonRow/ProductionMaterialItem)에 productId/productName/tags 없음** — 추가 필요.
- **콘텐츠 API 필터**: `getStoreExecutionAssets`만 `category`/`usageType` 받음(**현재 미사용**). 나머지(listContents/getStoreQrCodes/fetchStaffBlogPosts)는 page/limit/search 정도. **productId·tag 필터 전무.**
- **태그 검색**: 콘텐츠 리스트 미배선(자료실엔 있음).
- **이미 존재하는 제품-콘텐츠 UI**: `StoreProductDescriptionsPage`(제품→설명 콘텐츠, sidebar). → "제품 콘텐츠"의 한 형태가 부분적으로 이미 있음.

## 5. 설계안 — 콘텐츠 유형 / 용도 매핑

| 사용자 요구 | 현재 데이터 매핑 | 구현 난이도 |
|-------------|-----------------|:--:|
| 콘텐츠 유형 POP/QR/블로그/**안내문** | kind badge(material/qr/blog) + `store_execution_assets.usage_type`(pop/qr/signage/banner/**notice**=안내문) | **저~중** (usageType 필터 이미 API 지원, UI만) |
| 용도 B2B/B2C/공통 | **backing 없음**(결정 ② 필요) | **높음**(신규 필드 설계) |
| 연결 제품 | product_marketing_assets / ProductAiContent | **높음**(역방향 조회 + 행 product 부여) |
| 제목 검색 | 일부 존재 | 저 |
| 태그 검색 | 콘텐츠 리스트 미배선 | 중(BE+UI) |
| 제품명 검색 | 콘텐츠→junction→ProductMaster.name JOIN | 중~높 |

## 6. 권장 presentation 설계

### 탭 구조
```
[전체]  [일반 콘텐츠]  [제품 콘텐츠]
 └ 전체: 모든 제작 콘텐츠
 └ 일반: 제품 링크 없는 콘텐츠
 └ 제품: product_marketing_assets 또는 ProductAiContent 로 제품에 연결된 콘텐츠 (결정 ① 기준)
```
- **제품 콘텐츠 탭의 행**: 연결 제품명 badge + 콘텐츠 유형 + 용도. → 행에 product 요약(id/name) 필요.

### 검색
- 제목(기존) + 태그(BE 태그 검색 + chip UI) + 제품명(junction JOIN).

### 필터
- **콘텐츠 유형**: usage_type(pop/qr/signage/banner/notice) + kind — **Phase 1 가능**.
- **용도(B2B/B2C/공통)**: 결정 ② 후 — **Phase 2/보류**.
- **연결 제품**: 제품 선택 → 해당 제품 콘텐츠만 — Phase 2(역방향 조회 필요).

## 7. 단계적 구현 제안

### Phase 1 — 경량(즉시 가능, FE + 소량 BE)
- StoreProductionMaterialsPage 에 **제목 검색 + 콘텐츠 유형 필터(kind/usage_type)** 추가(기존 `getStoreExecutionAssets(usageType)` 활용).
- 탭 골격 [전체/일반/제품] 도입(제품 탭은 Phase 2 데이터 연결 전까지 placeholder/비활성).
- StoreContentsSelector SubTab 에 "전체" 추가.

### Phase 2 — 제품 콘텐츠(백엔드 선행 + 결정 ①②③)
- 결정 ①(canonical 제품-콘텐츠 정의), ②(용도 backing), ③(역방향 asset→product + 리스트 행에 product 요약 join).
- 콘텐츠 API 에 `productId`/`tags`/`usageSegment` 필터 추가.
- `GET /assets/:assetId/products`(역방향) 또는 리스트 쿼리에 product join.
- 제품명 검색(ProductMaster JOIN), 연결 제품 필터.

## 8. 가져오기/게시 복사 정책 (명문화)

> 선행 IR 발견 반영 — 정책 분리 고정:

```
매장으로 가져가기 = 복사 (o4o_asset_snapshots full-copy, 원본과 단절)
  → 원본 수정·삭제가 복사본에 영향 없음 (snapshot immutable, source_asset_id=메타데이터)

운영자 → 매장 허브 공개 = 게시/노출 전환 (참조 + status 전이)
  → 복사 아님. 원본 status='published', HUB 가 원본 참조. 게시 후 원본 편집 가능 = 의도된 동작.
```

- **"가져가기=복사" 원칙은 매장이 가져가는 경우에만 적용.** 운영자 HUB 공개는 별도 "게시/노출" 정책.
- 제품 콘텐츠도 동일: 매장이 제품 콘텐츠를 복제·활용하면 snapshot 복사, 운영자가 HUB 에 제품 콘텐츠를 공개하면 게시.

## 9. 결정 필요 항목 (요약)

| # | 결정 | 옵션 |
|:-:|------|------|
| ① | "제품 콘텐츠" canonical 정의 | product_marketing_assets(자산 링크) / ProductAiContent(바인딩 콘텐츠) / 둘 다 통합 뷰 |
| ② | "용도 B2B/B2C/공통" backing | 신규 콘텐츠 `usage_segment` 필드 / channel 재해석(부적합) / 본 단계 보류 |
| ③ | 역방향 조회 + 행 product 부여 | `/assets/:id/products` 신설 / 리스트 쿼리 product JOIN |

## 10. 후속 WO/IR 제안

| 후보 | 내용 | 단계 |
|------|------|:--:|
| `WO-O4O-CONTENT-LIST-TYPE-FILTER-PHASE1-V1` | production-materials 제목검색+유형필터+탭 골격(경량) | Phase 1 |
| `IR-O4O-PRODUCT-CONTENT-DATA-MODEL-DECISION-V1` | 결정 ①②③ 확정(canonical 정의·용도 backing·역방향) | Phase 2 선행 |
| `WO-O4O-PRODUCT-CONTENT-TAB-AND-FILTER-PHASE2-V1` | 제품 콘텐츠 탭·제품명/연결제품 필터(백엔드 포함) | Phase 2 |
| (정책) 가져가기=복사 / HUB=게시 명문화 | §8 을 baseline 문서로 승격 | 선택 |

## 11. 최종 판단

**제품 콘텐츠 presentation 은 구현 가치 높으나, 순수 UI 작업이 아니라 데이터/정책 결정 선행이 필요하다.**
- 핵심 흐름(제작·편집·복사)은 이미 기준형(선행 IR) → 본 단계는 **리스트 표현·검색·필터** 한정.
- **즉시 가능(Phase 1)**: 유형 필터·검색·탭 골격.
- **결정 선행(Phase 2)**: 제품 콘텐츠 탭·제품명/연결제품 필터·용도(B2B/B2C/공통) — 특히 **용도 backing 부재**가 최대 갭.
- 권장: **Phase 1 경량 WO 먼저**(가시 효과+위험 낮음) → **데이터 모델 결정 IR**(①②③) → Phase 2.

## 12. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| 제품=매장 경영 핵심 ↔ 콘텐츠 연결 | 데이터(junction/ProductAiContent) 있음, 사용자-facing 통합 뷰 미설계 |
| 가져가기=복사 원칙 | §8 명문화 — 매장 복사=snapshot detach, HUB=게시(참조) 분리 |
| 단순 다운로드 vs 실행 자산 vs 제품 콘텐츠 경계 | taxonomy 구분됨. 제품 콘텐츠는 "제품 연결" 차원 추가 |
| 용도 B2B/B2C/공통 | **backing 부재 — 신규 설계 필요**(현 channel_type 에 B2B 없음) |
| KPA 고유 강제 | 본 설계 KPA 기준, GP/KCos 확산 전 parity 확인 권장 |
| 1인 유지보수성 | Phase 1 경량 우선, Phase 2 백엔드는 결정 후 — 점진적 |

---

## 최종 요약

| 항목 | 결과 |
|------|------|
| 수정 파일 | **없음** (read-only 설계 IR) |
| 생성 IR | `docs/investigations/IR-O4O-PRODUCT-CONTENT-PRESENTATION-DESIGN-V1.md` |
| 조사 기준 commit | `716a73c9` |
| 제품-콘텐츠 연결 | product_marketing_assets(QR 자동+수동) + ProductAiContent(바인딩). 정방향 조회 OK, **역방향 없음** |
| 콘텐츠 리스트 | 행에 productId/tags 없음, productId/tag 필터 전무(usageType만 일부 API 지원·미사용) |
| B2B/B2C 용도 | **backing 필드 부재**(channel_type=B2C/KIOSK/TABLET/SIGNAGE, B2B 값 없음) — 최대 갭 |
| 복사 정책 | 매장 가져가기=복사(snapshot detach) / 운영자 HUB=게시(참조) — §8 명문화 |
| 판정 | 단계적 — Phase 1(유형 필터·탭 경량) 즉시 / Phase 2(제품 탭·제품명/연결제품) 결정 ①②③ + 백엔드 선행 |
| 다음 | `WO-...-TYPE-FILTER-PHASE1-V1`(경량) + `IR-...-PRODUCT-CONTENT-DATA-MODEL-DECISION-V1`(결정) |
| git status | 다른 세션 WIP(미접촉), 본 IR 문서만 신규 |
