# IR-O4O-STORE-DESCRIPTION-MULTILINGUAL-REGISTRATION-AUDIT-V1

> 성격: **read-only 조사** — 매장용 상품 설명서(STORE)를 상품별·언어별로 등록·활용할 수 있는 현재 구현 상태.
> Date: 2026-07-22 · 코드·DB·배포 변경 0.
> 근거: 정적 코드 분석(엔티티·migration·컨트롤러·프론트). 라이브 데이터 카운트는 §7·§10 참조(프로덕션 DB 고부하로 보류).

---

## 0. 한 줄 결론

**언어별 저장 기반과 운영자 등록은 완성**되어 있으나, **공급자 등록 화면은 ko 고정(백엔드↔프론트 갭)**, **태블릿/Screen Set/QR(screen_set)의 SPD 설명서는 사실상 ko 단일(이용자 언어 전환 없음)**, 그리고 실제 이용자 언어 전환은 **SPD와 무관한 별도 "다국어 QR" 시스템**에만 존재한다. 사용자의 사전 판단("기반은 있음, 사용자 등록·활용 동선은 별도 확인 필요")이 정확하다.

## 1. 언어별 저장 가능 여부 — ✅ 가능 (완성)

- 엔티티 `SharedProductDescription`(`apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts`): `language` = varchar(16), **nullable, default 'ko'**(L150-152). `description_type` union `B2B|B2C|STORE|SUPPLIER_STORE`(L94-101).
- **canonical 유일성 = `(master_id, description_type, COALESCE(language,'ko'))`** partial unique WHERE `status='canonical' AND deleted_at IS NULL` — migration `20261228000000-CanonicalPerMasterTypeLanguage.ts`(L43-47). 기존 `(master_id, description_type)` 제약을 DROP 하고 언어 축을 추가.
- 따라서 **동일 상품에 `STORE+ko` 와 `STORE+en` 을 동시에 canonical 로 보유 가능**. `setCanonical` 은 같은 (master, type, **동일 언어**) canonical 만 강등(service, `COALESCE(language,'ko')` 일치 조건) → 언어별 독립.

```
ProductMaster
└─ STORE
   ├─ ko  (canonical 가능)
   ├─ en  (canonical 가능, ko와 독립)
   └─ zh/ja … (동일 구조)
```

## 2. 언어별 등록 UI 존재 여부 — ⚠️ 역할별 상이

| 역할 | 화면 | 언어 선택 UI | 판정 |
|------|------|:---:|:---:|
| 운영자/관리자 | admin-dashboard `ProductMasterDetailPage.tsx` `StoreDescriptionPanel` | **`<select>` ko/zh/en**(L806-815, `STORE_DESC_LANGS`) | ✅ 있음 |
| 공급자 | web-neture `SupplierStoreDescriptionEditorDrawer.tsx` | **`const LANGUAGE='ko'` 하드코딩**(L31), 헤더 "…한국어" 고정 | ❌ 없음(ko 고정) |
| 매장 | web-kpa `StoreDescriptionViewModal.tsx` | 작성 UI 없음 · **조회 언어 탭만**(존재 언어만, L142-157) | 조회 전용 |

- **공급자 갭이 핵심**: 백엔드 `/neture/supplier/store-descriptions` 는 `language`(ko/zh/en/ja)를 받도록 구현되어 있으나(컨트롤러 L64·L79, `SaveSupplierStoreDescriptionInput.language`), **프론트가 ko 만 전송**한다. 즉 다국어 저장 능력은 있으나 공급자가 화면에서 다른 언어를 등록할 수단이 없다.

## 3. 역할별 지원 상태 — 운영자 / 공급자 / 매장

- **운영자**: 완성. `POST /admin/o4o-product-db/masters/:id/store-descriptions {language, content, summary}` → `createCandidate` + `setCanonical`(저장 즉시 언어별 canonical). 검수 큐(`operator-supplier-store-description-review.controller.ts`)도 (master, STORE, **언어**) 단위 충돌 판정.
- **공급자**: 백엔드 완성 · **프론트 부분(ko 고정)**. 저장 status = draft/needs_review(canonical 직접 승격 없음, 운영자 검수 경유). (master, STORE, language) 단일 작업행 upsert.
- **매장**: 설계상 **등록 미대상**(WO-…-DESCRIPTION-USAGE-POLICY-FIX-V1 — 매장 복사 없이 STORE canonical 직접 조회·표시). `GET /store-contents/b2c-descriptions` 는 전체 언어 canonical 반환(언어 필터 없음), 매장은 언어 탭으로 "보기"만.

## 4. QR 지원 상태 — 두 갈래(하나는 언어 전환 없음, 하나는 별도 시스템)

- **QR `/qr/{slug}` (screen_set / SPD 경로)**: `store-qr-landing.controller.ts` landing_type='screen_set' → `resolveScreenSetSections`(언어 인자 없음). content_list 카드 언어는 저작 config 고정(기본 ko). **이용자 언어 전환 UI 없음**(`PublicScreenSetViewer.tsx`·`QrLandingPage.tsx` 에 locale/language 매치 0).
- **다국어 QR `/multilingual-products/{publicKey}` (별도 시스템)**: `store_multilingual_product_content_groups`/`_pages`(엔티티+migration `20260621010000`) + `multilingual-product-content.controller.ts`. `?locale=` 로 언어 페이지 선택, **언어 탭 UI 있음**, 지원 7언어(**ko/en/zh/ja/vi/th/id**). **SPD 와 조인·참조 전무** — target=`store_local_products`/`organization_product_listings`, content=자유 JSON. 즉 SPD STORE 설명서와 **완전 별개**의 다국어 랜딩 시스템이며 태블릿/Screen Set 과 연결되지 않는다.

## 5. 태블릿·Screen Set 지원 상태 — ⚠️ SPD 설명서는 사실상 ko 단일

- content_list(SPD STORE): `createStoreContentSourceAdapter.fetchProductDescription(masterId, language)` — SQL `ORDER BY (d.language=$2) DESC, (d.language='ko') DESC, d.updated_at DESC`(요청 언어 우선, ko fallback). 그러나 `language` 는 **이용자 런타임 값이 아니라 카드 config 저작값**이며 `parseContentListConfig` 기본 `'ko'`. `resolveScreenSetSections`/공개 `GET /:slug/tablet/screen` 에 **lang 파라미터 없음** → 이용자 전환 불가.
- content picker(`GET /tablet-content-sources/o4o-descriptions`): **master 단위 반환 + `languages` 배열**만 노출(언어별 검색·선택 아님). 태블릿 편집기에서 카드 언어를 명시 선택하는 UI는 확인되지 않음(item.language 기본 ko) → **태블릿 Screen Set 설명서는 사실상 ko 단일**(추정: 저작 UI에 언어 선택 노출 없음).
- 예외: **product_list 상품 상세**에는 인라인 언어 전환 버튼이 있으나(WO-…-INLINE-MULTILINGUAL-BRIDGE-V1), 소스가 SPD 가 아니라 **진열 선택 콘텐츠 `kpa_store_contents.content_json.translations`**(status ready/published locale), 클라이언트 전환(재조회 없음). 즉 SPD 다국어와 무관한 별도 경로.

## 6. Fallback 규칙

- **SPD STORE**(태블릿/QR screen_set): 요청 언어 → **ko** → 아무 canonical STORE 최신본(updated_at DESC). 항상 1건 시도, HTML 비면 카드 skip.
- **다국어 QR 시스템**: 요청 locale → **en** → group `default_locale` → **ko** → 없으면 null(공개 404 `NO_PUBLISHED_PAGE`). `fallbackReason` 표기.

## 7. 실제 데이터 표본 수 — ⚠️ 라이브 카운트 보류(정직 기록)

- 구조·migration 으로 **언어별 STORE canonical 동시 보유 가능**을 확인. 기존 다국어 STORE 설명서 생성 기록 존재: HFF 복합형 EN 배치, OTC Track A EN grounded(에르도스테인/트리메부틴 등 KO+EN), admin StoreDescriptionPanel ko/zh/en.
- **정밀 라이브 카운트(언어별 STORE canonical row 수)는 미수집**: `shared_product_descriptions` 가 **본 조사 시점 동시 세션(OTC Track A·HFF 복합형 배치)이 대량 쓰기 중인 hot table** 이라, cloud-sql-proxy(공유 5442 토큰 만료 + 신규 5443 fresh 토큰) 모두에서 read-only 집계 SELECT 가 반복 타임아웃(≥95s). DB 부하 해소 후 재집계 필요. **수치를 추정으로 채우지 않고 미수집으로 보고.**

## 8. 완성 / 부분 완성 / 미구현 판정

| 영역 | 판정 | 근거 |
|------|:---:|------|
| 언어별 저장 기반(스키마·canonical 유일성) | **완성** | §1 |
| 운영자 언어별 등록(UI+API) | **완성** | §2·§3 |
| 공급자 언어별 등록 | **부분** | 백엔드 O, 프론트 ko 고정 |
| 매장 언어별 등록 | 미대상(설계) | 조회 전용 정책 |
| 태블릿/Screen Set SPD 설명서 언어 활용 | **부분/사실상 미구현** | 카드 config 언어만, 저작·이용자 전환 UI 없음, ko 단일 |
| QR(screen_set) SPD 언어 전환 | **미구현** | 이용자 전환 UI 없음 |
| 별도 다국어 QR 시스템(`multilingual_product_content`) | **완성** | 7언어 저작·공개·fallback |
| SPD ↔ 다국어 QR 시스템 연계 | **미구현(별개 병존)** | 조인·연결 없음 |

## 9. 필요한 최소 후속 작업 (제안 — 자동 착수 아님)

1. **[가장 작은 갭] 공급자 매장용 설명서 언어 선택 UI**: `SupplierStoreDescriptionEditorDrawer` 의 `LANGUAGE='ko'` 하드코딩을 언어 선택(ko/zh/en/ja)으로 교체. 백엔드 무변경(이미 지원). 프론트 소규모.
2. **[정책 결정 선행] SPD STORE 다국어 vs 별도 다국어 QR 시스템 관계 정리**: 두 다국어 경로가 병존(SPD language / `multilingual_product_content`)하며 서로 무관. "설명서 다국어"의 SSOT를 어느 쪽으로 둘지, 태블릿/Screen Set이 어느 소스를 다국어로 쓸지 명문화 필요. 결정 전에는 3·5의 갭을 메우지 않는 것이 안전.
3. **[큰 작업·설계 결정] 태블릿/Screen Set/QR(screen_set) 이용자 언어 전환**: 공개 화면 API에 lang 도입 + 카드 언어 저작 선택 + 뷰어 전환 UI + fallback 정책. 2의 결정에 종속.
4. **[운영] DB 부하 해소 후 언어별 STORE canonical 실 카운트 재집계**(§7 보완).

> 우선순위: 1(소규모·안전) → 2(정책 결정) → 3(2 종속, 큰 작업). 1 외에는 **기능 구현 전 정책 결정이 선행**되어야 하며, 본 IR 은 후속 WO 를 자동 착수하지 않는다(핸드오프 전용).

## 10. 코드·DB·배포 변경 0 확인

- read-only 조사만 수행: 정적 코드 분석(Explore 에이전트 2, 읽기 전용) + read-only 데이터 표본 시도(집계 SELECT, DB 고부하로 타임아웃 → **write·변경 0**).
- 신규 설명서·Screen Set·매장 사본 생성 0, DB write 0, 배포 0, 기능 구현 0.
- git 변경 = **본 IR 문서 1개(문서만)**. 소스·스키마·마이그레이션 무변경.
