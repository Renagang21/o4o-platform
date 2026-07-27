# CHECK-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1

> WO: `WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1`
> 선행: [`CHECK-…-DEPLOY-AND-PRODUCTION-SMOKE-V1`](CHECK-O4O-KPA-STORE-HUB-PRODUCT-FLOW-DEPLOY-AND-PRODUCTION-SMOKE-V1.md) · [`CHECK-…-LISTING-CHANNEL-UPDATE-404-MINIMAL-FIX-V1`](CHECK-O4O-KPA-LISTING-CHANNEL-UPDATE-404-MINIMAL-FIX-V1.md)
> 작성일: 2026-07-27
> **현재 단계: 1단계 조사 완료 — 구현 미착수. 본 문서는 현황표 + 수정 대상 확정 보고서다.**

---

## 1. 조사 방법

KPA 10개 화면의 실제 소스(총 4,442줄)와 해당 backend 쿼리를 직접 읽어 확인했다.
추정·전례 인용 없이 코드 근거만 기록한다.

| 화면 | 컴포넌트 | 줄수 |
|------|----------|-----:|
| `/store-hub` | `StoreHubPage` → `StoreHubTemplate` + `StoreHubLatestFeed` | 60 + 470 |
| `/store-hub/content` | `HubContentLibraryPage` → `ContentHubTemplate`(공통) | 216 |
| `/store-hub/blog` | `HubBlogLibraryPage` | 412 |
| `/store-hub/pop` | `HubPopLibraryPage` | 369 |
| `/store-hub/qr` | `HubQrLibraryPage` | 380 |
| `/store-hub/video` | `HubVideoLibraryPage` | 368 |
| `/store-hub/signage` | `HubSignageLibraryPage` | 600 |
| `/store-hub/screen-set` | `HubScreenSetLibraryPage` | 487 |
| `/store-hub/multilingual-product-contents` | `HubMultilingualContentLibraryPage` | 281 |
| `/store-hub/b2b` | `HubB2BCatalogPage` | 799 |

범례: **✅** 갖춤 · **△** 있으나 결함/비표준 · **✗** 없음 · **—** 해당 없음

---

## 2. 현황표 (A) — 목록 조작

| 화면 | 검색 | 필터 | 정렬 | 페이지네이션 |
|------|------|------|------|--------------|
| `/store-hub` | — 요약 대시보드(의도) | — | — | — 섹션별 4~5행 미리보기 |
| `/store-hub/content` | ✅ **서버** (`fetchItems.search`) | ✅ 서버 소스탭 2 (콘텐츠 허브/운영 자료) | ✗ | ✅ 서버 `page/limit=12` + total |
| `/store-hub/blog` | ✗ | ✗ | △ **클라이언트**(현재 페이지) 제목·게시일 | △ **수제 이전/다음** (표준 `Pagination` 미사용) · 서버 `page/limit=20`+total |
| `/store-hub/pop` | ✗ | ✗ | △ 클라이언트 | ✅ 표준 `Pagination` |
| `/store-hub/qr` | ✗ | ✗ | △ 클라이언트 | ✅ 표준 `Pagination` |
| `/store-hub/video` | ✗ | ✗ | △ 클라이언트 | ✅ 표준 `Pagination` |
| `/store-hub/signage` | ✗ | △ 뷰탭(미디어/플레이리스트)=서버 · **출처(producer)=클라이언트** | △ 클라이언트 | △ 표준 `Pagination` 이나 **출처 필터 시 숨김** |
| `/store-hub/screen-set` | ✅ **서버** (`q` → `name ILIKE`) | ✅ 서버 템플릿 5종 + 소스탭 2 (운영자/공급자) | △ 클라이언트 | ✗ **없음. 서버 `LIMIT 200` 고정, total 없음** |
| `/store-hub/multilingual-product-contents` | ✗ | ✗ | — 카드 그리드 | △ **수제 이전/다음** · 서버 `page/limit=20`+total |
| `/store-hub/b2b` | ✗ | ✅ 서버 4탭 (전체/B2B/운영자/공급 승인 대상) | △ 클라이언트 | ✅ 표준 `Pagination` |

### 2.1 정렬이 전부 "현재 페이지 내"인 근거

`DataTable`([packages/operator-ux-core/src/list/DataTable.tsx](../../packages/operator-ux-core/src/list/DataTable.tsx))은
`manualSort` + `sortKey`/`sortDirection`/`onSortChange` 로 **서버 정렬을 지원**한다.
그러나 KPA HUB 10개 화면 중 이 props 를 넘기는 곳은 **0곳**이다 (grep 확인).
→ 모든 `sortable: true` 컬럼은 `sortAccessor` 로 **현재 페이지 데이터만** 정렬한다.
헤더는 전체 정렬처럼 보이므로 **오인 유발** (WO HUB-P2-02 확인).

### 2.2 screen-set `LIMIT 200` 근거

[store-tablet.routes.ts:1586-1594](../../apps/api-server/src/routes/platform/store-tablet.routes.ts#L1586-L1594) (운영자) ·
[store-tablet.routes.ts:1742-1753](../../apps/api-server/src/routes/platform/store-tablet.routes.ts#L1742-L1753) (공급자)
— 둘 다 `ORDER BY updated_at DESC LIMIT 200`, `page`/`limit`/`COUNT(*)` **없음**.
→ 201번째부터 **무고지 절단**. 프론트도 total 을 받지 못해 페이지네이션을 만들 수 없다.

### 2.3 signage 출처 필터의 구조적 한계

[HubSignageLibraryPage.tsx:164-176](../../services/web-kpa-society/src/pages/pharmacy/HubSignageLibraryPage.tsx#L164-L176) —
`producer` 필터는 **현재 페이지 배열에 대한 클라이언트 필터**이고,
`mediaTotalFiltered` 도 그 페이지 길이다. 코드는 이를 인지하고
`totalPages > 1 && sourceFilter === 'all'` 조건으로 **필터 활성 시 페이지네이션을 숨긴다**(의도적 가드).
→ 데이터 오염은 없으나, 사용자는 **필터 결과가 전체인 줄 오인**한다. 2.1 과 같은 계열의 문제다.

---

## 3. 현황표 (B) — 가져오기 · 안내 · 진입

| 화면 | 가져오기 안내 | 빈 상태 | 홈 노출 | 메뉴 진입 | 이미 가져온 항목 표시 | 가져온 사본 확인 경로 |
|------|---------------|---------|:-------:|:---------:|:---------------------:|------------------------|
| `/store-hub` | — | ✅ 섹션별 독립(로딩/오류/빈) | 자기 자신 | ✅ 홈 | — | — |
| `/store-hub/content` | ✅✅ **독립 사본 + 재복사 시 새 사본 명시** | ✅✅ 전체/검색·필터/소스탭별 3종 | ✅ 최신 콘텐츠 | ✅ 콘텐츠 가져오기 | ✅ `loadCopiedIds` → "복사 완료" | ✅ `afterCopyAction` "작업하러 가기 →" |
| `/store-hub/blog` | △ footer "내 약국 블로그에서 수정·발행" 만 — **사본·중복 안내 없음** | ✅ 빈/오류재시도/매장미연결 | ✗ **누락** | ✅ 블로그 | ✗ | △ footer 링크(조건부), 일괄 후 CTA 없음 |
| `/store-hub/pop` | △ 동일 | ✅ | ✅ 디지털 자료 | ✅ POP | ✗ | △ footer 링크(조건부) |
| `/store-hub/qr` | △ 동일 + drawer 에 slug 재발급 안내 ✅ | ✅ | ✅ 디지털 자료 | ✅ QR-code | ✗ | △ footer 링크(조건부) |
| `/store-hub/video` | △ 동일 | ✅ | ✅ 디지털 자료 | ✅ 동영상 | ✗ | △ footer 링크(조건부) |
| `/store-hub/signage` | ✗ **없음** (중복은 사후 토스트 "이미 매장에 추가된 항목입니다") | ✅ 필터별 문구 분기 | ✅ 디지털 자료 | ✅ 사이니지 콘텐츠 | ✗ | ✗ **없음** (토스트만) |
| `/store-hub/screen-set` | ✅✅ **"매장 소유의 독립 사본" 명시** | ✅ 소스별 분기 | ✗ **누락** | ✅ 태블렛 화면 | ✗ | ✅✅ 완료 패널 + `highlightScreenSetId` 이동 |
| `/store-hub/multilingual-product-contents` | △ 헤더 "복사되어 원본과 분리" — 중복 안내 없음 | ✅ 단일 | ✗ **누락** | ✗ **부재** | ✗ | ✅ import 후 `/my?groupId=` 자동 이동 |
| `/store-hub/b2b` | — 가져오기가 아니라 **취급 추가**(사본 아님) | ✅ 필터별 분기 | ✅ 새로 공급 가능한 상품 | ✅ 상품 카탈로그 | ✅✅ `isAdded` 배지 + 일괄 시 skip | ✅ 조건부 "채널 관리로 이동 →" |

### 3.1 홈 피드 실제 구성

[StoreHubLatestFeed.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreHubLatestFeed.tsx) 3섹션:

```text
새로 공급 가능한 상품   ← getCatalog            (4행)
최신 콘텐츠             ← contentHub + cms      (4행)
최신 디지털 자료         ← DIGITAL_KINDS = ['pop','qr','video','signage']  (5행)
```

→ **블로그 · 태블렛 화면 · 다국어 상품 콘텐츠 3종이 홈에 없다.**
파일 상단 주석의 "전체 목록 화면" 열거(`/b2b · /content · /pop · /qr · /video · /signage`)에도 이 3종이 빠져 있어,
누락은 **의도가 아니라 자원 추가 시 홈 반영을 놓친 결과**로 보인다.

### 3.2 다국어 상품 콘텐츠 메뉴 — 소유 영역 판정

WO §8 이 "조사 후 결정"으로 남긴 항목이다. 조사 결과:

| 라우트 | 성격 | 현재 진입점 |
|--------|------|-------------|
| `/store-hub/multilingual-product-contents` | **HUB 원본 진열 + 가져오기** (운영자 발행분 → 매장 복사) | **없음** |
| `/store-hub/multilingual-product-contents/my` | 매장 소유 사본 관리 | 가져오기 완료 후 자동 이동 |
| `/store/products/multilingual/{kind}/{id}` | 매장 소유 저작 화면 | ✅ `StoreHandledProductsPage` "다국어 콘텐츠" 버튼 (`20f1d8502`) |

→ `/store-hub/multilingual-product-contents` 는 **다른 HUB 화면과 동일한 "운영자 원본을 내 매장으로 가져오는" 화면**이다
(`listMlcHub` = HUB 목록, `importMlcFromHub` = 복사). 따라서 **매장 HUB 사이드바가 올바른 위치**다.
`20f1d8502` 가 연결한 것은 별개의 **매장 소유 저작 화면**이므로 이 부재를 해소하지 않는다.

---

## 4. 조사에서 새로 드러난 사항 (WO 목록 외)

| ID | 내용 | 근거 |
|----|------|------|
| **N-1** | 공통 HUB 목록 API `GET /hub/contents` 에 **검색 파라미터가 아예 없다** (`q`/`search` 없음, ILIKE 없음) | [hub-content.controller.ts:45-83](../../apps/api-server/src/modules/hub-content/hub-content.controller.ts#L45-L83) — 허용 쿼리 = `serviceKey`/`producer`/`sourceDomain`/`page`/`limit` |
| **N-2** | `/hub/contents` 소비처가 **KPA·GlycoPharm·K-Cosmetics·Neture·admin-dashboard 5개** | grep 23개 파일 |
| **N-3** | signage 출처 필터 = 현재 페이지 클라이언트 필터 (§2.3) | 코드 주석에 자인 |
| **N-4** | blog 만 표준 `Pagination` 미적용 — pop/qr/video/signage 는 이미 이관됨(`WO-…-STANDARD-TABLE-AND-SIGNAGE-MENU-IA-V1`) | blog 에 수제 버튼 잔존 |
| **N-5** | 다국어 가져오기 모달의 "O4O 주문 가능 상품" 목록이 `getListings({service_key:'kpa'})` + `p.product_name` 사용 → 프로덕션에서 **항상 0건**(실데이터 전량 `neture`)이고 이름도 `undefined` | [HubMultilingualContentLibraryPage.tsx:87-88](../../services/web-kpa-society/src/pages/pharmacy/HubMultilingualContentLibraryPage.tsx#L87-L88) |

**N-5 는 F2 와 직접 연결되는 유일한 지점**이다 (WO §4 조건 충족 → 별도 발견으로 기록).
단 F2 본체(응답 병합 축 재설계)는 이번 WO 범위 밖이며, N-5 도 **기록만 하고 수정하지 않는다.**

---

## 5. 수정 대상 확정 (구현 착수 전 승인 필요)

### 5.1 착수 권장 — 저위험·닫힌 범위

| # | 대상 | 내용 | 영향 |
|---|------|------|------|
| **A-1** | blog 페이지네이션 | 수제 이전/다음 → 표준 `Pagination` | KPA 1파일 |
| **A-2** | 다국어 페이지네이션 | 수제 이전/다음 → 표준 `Pagination` | KPA 1파일 |
| **A-3** | 정렬 오인 제거 | blog/pop/qr/video/signage/screen-set/b2b 의 `sortable: true` **제거** (서버 정렬 미구현이므로 WO §5 "선택지 B") | KPA 7파일, 표시만 |
| **A-4** | 다국어 메뉴 추가 | `PharmacyHubLayout` 에 "다국어 상품 콘텐츠" 추가 (§3.2 판정 근거) | KPA 1파일 |
| **A-5** | 가져오기 안내 표준화 | blog/pop/qr/video/signage/다국어에 **독립 사본 + 재가져오기 = 새 사본** 문구 통일 (`/store-hub/content` 문구를 기준으로) | KPA 6파일, 문구만 |
| **A-6** | signage 사본 확인 경로 | 가져오기 후 "내 약국 사이니지에서 보기" 링크 추가 (현재 토스트만) | KPA 1파일 |
| **A-7** | 홈 피드 분류 확정 | 블로그 → **최신 콘텐츠**, 태블렛 화면 → **최신 디지털 자료** 편입. 다국어는 **홈 미포함**(상품 축 자원이라 3섹션 어디에도 맞지 않음) | KPA 1파일 |

A-3 근거: WO §5 는 "서버 정렬 구현이 과도하게 커지면 정렬 UI 제거를 우선"이라 명시했다.
현재 서버 정렬 파라미터는 `/hub/contents`·screen-set·catalog **어디에도 없어** 7화면 + 3개 백엔드를 동시에 바꿔야 한다.
데이터량도 적으므로(프로덕션 대부분 0~20행) **제거가 맞다.**

A-7 근거: §3.1. 다국어를 홈에서 빼는 것은 "홈은 요약이며 모든 자원을 넣는 화면이 아니다"(WO §7)에 부합한다.

### 5.2 중지 조건 해당 — 이번 WO에서 제외 권장

| # | 대상 | 사유 |
|---|------|------|
| **B-1** | blog/pop/qr/video/signage **검색 추가** | N-1·N-2 — 공통 `/hub/contents` 에 검색이 없어 **backend 공통 모듈 변경**이 필요하고 소비처가 5개다. WO §14 "검색 지원에 대규모 API 재설계 필요" 중지 조건에 정면으로 해당. CLAUDE.md Shared Module Change Protocol 상 별도 WO 로 소비처 전수 영향 검토가 선행되어야 한다. |
| **B-2** | screen-set **페이지네이션** | `LIMIT 200` → `page/limit` + `COUNT(*)` 는 backend 2개 엔드포인트 변경. 다만 **소비처가 KPA 단독**이라 B-1 보다 훨씬 좁다 — §6 참조. |
| **B-3** | signage 출처 필터 **서버 이관** | `/hub/contents` 는 `producer` 를 이미 서버 파라미터로 지원하나, 현재 프론트가 클라이언트로 처리 중. 서버 이관 자체는 가능하지만 B-1 과 같은 공통 API 축이라 함께 판단하는 편이 안전. |
| **B-4** | "이미 가져온 항목" 표시 (blog/pop/qr/video/signage/screen-set/다국어) | 자원별 사본 추적 컬럼·조회 경로가 제각각이며 blog/pop/qr 은 **원본 추적 컬럼 자체가 없다**(WO §13 "blog/pop/qr 원본 추적 컬럼 추가" 금지 항목). 데이터 계약 변경 없이는 불가. |
| **B-5** | F2 / F3 / N-5 | WO §4 — 자동 포함하지 않음. N-5 는 기록만. |

### 5.3 판단 필요 — 사용자 결정 대기

**B-2 (screen-set 페이지네이션)** 만 애매하다.

- WO §6 은 "태블렛 화면 HUB 표준 페이지네이션"을 **완료 기준에 명시**했다.
- 그러나 backend 변경이 필요하다 (`LIMIT 200` → `page`/`limit`/`COUNT`).
- 완화 요인: 이 두 엔드포인트의 **소비처는 KPA `HubScreenSetLibraryPage` 단독**이다 (`/hub/contents` 와 달리 공통 API 아님).
  → 공통 모듈 리스크는 없고, 변경은 SQL 2곳 + 응답 형태 1종 + 프론트 1파일로 닫힌다.
- 다만 WO §13 "하지 않을 것"에 backend 변경 금지가 명시돼 있지는 않으나, 6번 원칙 "기존 데이터 계약은 변경하지 않는다"의 해석 여지가 있다(응답 형태가 배열 → `{data, pagination}` 으로 바뀜).

---

## 6. 제안

**A-1 ~ A-7 만 이번 WO 에서 구현**하고, B-1 ~ B-5 는 각각 별도 WO 로 분리한다.
B-2 는 사용자 판단에 따라 A 군에 포함할 수 있다.

이 범위면 **backend 무변경 · GP/KCos 무변경 · 데이터 계약 무변경**이 유지되고,
WO §16 완료 기준 중 다음이 충족된다.

```text
✅ 현재 페이지만 정렬하는 오해 제거        (A-3)
✅ 홈 피드 자원 분류 확정                  (A-7)
✅ 다국어 상품 콘텐츠 메뉴 위치 확정        (A-4, §3.2 근거)
✅ 중복 가져오기 안내 정합                  (A-5)
✅ 빈 상태·오류·성공 안내 정비              (A-6 + A-5)
✅ 기존 가져오기·사본 계약 무변경
△ 검색 UI 와 실제 서버 결과 일치           (B-1 분리 — 검색 UI 를 새로 넣지 않으므로 불일치도 생기지 않음)
△ 태블렛 화면 HUB 표준 페이지네이션         (B-2 판단 대기)
```

---

## 7. 승인된 범위

사용자 확정: **A-1 ~ A-7 만 구현. B-1 ~ B-5 는 별도 WO 로 분리.**
B-2 는 `WO-O4O-KPA-SCREEN-SET-HUB-SERVER-PAGINATION-V1` 로 후속 진행.

---

# 구현 결과

## 8. 조사 표 정정 (§3)

구현 중 확인한 사실로 조사 표 1건을 정정한다.

| 항목 | 조사 시 기재 | 실제 |
|------|--------------|------|
| `/store-hub/signage` 가져온 사본 확인 경로 | ✗ 없음 (토스트만) | **정적 안내는 있었다** — `/store/marketing/signage` 링크가 하단에 상시 노출. 없던 것은 **가져오기 직후의 확인 CTA** 였다. A-6 는 이 부분만 보강했다. |

## 9. 변경 내역 (11파일 · KPA 프론트 전용)

| 항목 | 파일 | 내용 |
|------|------|------|
| **A-1** | `HubBlogLibraryPage.tsx` | 수제 이전/다음 → 표준 `Pagination`. POP/QR/동영상/사이니지는 기이관 상태였고 블로그만 잔존 |
| **A-2** | `HubMultilingualContentLibraryPage.tsx` | 수제 이전/다음 → 표준 `Pagination` |
| **A-3** | `HubBlog·Pop·Qr·Video·Signage·ScreenSet·B2BCatalogPage.tsx` + `StoreHubLatestFeed.tsx` | `sortable`/`sortAccessor` 제거. 재도입 조건(`manualSort`+`onSort`)을 주석에 명시 |
| **A-4** | `PharmacyHubLayout.tsx` | '다국어 상품 콘텐츠' 메뉴 추가 (`약국 상품·거래` 그룹 끝 — 구매 흐름 3항목을 끊지 않는 위치) |
| **A-5** | `HubBlog·Pop·Qr·Video·SignageLibraryPage.tsx` + `HubMultilingualContentLibraryPage.tsx` | 사본 정책 안내 표준화 (아래 §9.1) |
| **A-6** | `HubSignageLibraryPage.tsx` | 가져오기 직후 확인 배너 + canonical 목록 링크. 탭 전환 시 배너 해제 |
| **A-7** | `StoreHubLatestFeed.tsx` | 블로그 → 최신 콘텐츠 / 태블렛 화면 → 최신 디지털 자료 / 다국어 → 홈 미포함 |

commit: `a71de1f64` (A-1~A-7) · `c5809eb58` (A-6 후속 — 탭 전환 시 배너 해제)

### 9.1 A-5 — 실제 중복 정책이 3갈래였다

WO 는 문구를 2종으로 상정했으나, backend 를 확인하니 **3갈래**였고 그중 하나는 WO 의 어느 문구와도 맞지 않았다.

| 자원 | backend 실제 동작 | 근거 | 적용 문구 |
|------|-------------------|------|-----------|
| 블로그 / POP / QR / 동영상 | 매번 사본 **INSERT** (중복 차단 없음. `existingBase` 조회는 slug 충돌 회피용) | [blog.controller.ts:499](../../apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts#L499) | "…독립 사본으로 저장됩니다. 같은 자료를 다시 가져오면 **새로운 사본이 생성됩니다**." |
| 사이니지 (asset-snapshot) | 매번 새 snapshot. UNIQUE 제약이 **제거됨** | [DropUniqueConstraintAssetSnapshots20260920000000](../../apps/api-server/src/database/migrations/20260920000000-DropUniqueConstraintAssetSnapshots.ts) | 위와 동일 (값 복사형) |
| 다국어 상품 콘텐츠 | `ON CONFLICT (organization_id, target_kind, target_id, content_key) DO UPDATE` → **덮어쓰기** | [multilingual-product-content.controller.ts:669-682](../../apps/api-server/src/routes/o4o-store/controllers/multilingual-product-content.controller.ts#L669-L682) | "…같은 상품에 다시 가져오면 **새 사본이 생기지 않고 기존 사본이 원본의 최신 내용으로 덮어쓰기** 됩니다." |

- **사이니지에 "중복 추가되지 않을 수 있습니다" 를 쓰지 않았다.** WO 는 사이니지를 중복 차단형으로 상정했으나, UNIQUE 제약이 이미 제거되어 실제로는 새 사본이 생긴다. 화면의 `DUPLICATE_SNAPSHOT` catch 분기는 해당 migration 이후 dead path 이며, 방어적으로 유지하되 안내 문구는 실제 동작을 따랐다.
- QR 은 사본마다 매장 slug 가 새로 발급되므로 그 점을 문구에 포함했다.

### 9.2 A-7 — 홈 3영역 의미 유지

```text
새로 공급 가능한 상품   ← 상품 Offer                                    (4행, 변경 없음)
최신 콘텐츠             ← 콘텐츠 허브 + CMS + 블로그                      (4행 유지)
최신 디지털 자료         ← POP + QR + 동영상 + 사이니지 + 태블렛 화면       (5행 유지)
다국어 상품 콘텐츠       ← 홈 미포함
```

- **행 수를 늘리지 않았다.** 소스만 추가해 최신순으로 경쟁시키고 기존 `PREVIEW_ROWS`(4) / `PREVIEW_ROWS_DIGITAL`(5) 를 그대로 유지했다.
- 태블렛 화면은 공통 `/hub/contents` 에 없어 **전용 HUB API `listOperatorTemplates()` 를 읽기 전용으로 호출**해 병합했다 → **backend 변경 0**. 실패 시 `try/catch` 로 해당 자원만 조용히 제외하고 섹션 전체를 오류로 만들지 않는다.
- 콘텐츠 섹션이 혼합 소스가 되어, 행 클릭 대상을 항목별 `route` 로 분기하고 헤더의 '전체 보기' 도 `콘텐츠 / 블로그` 2개로 나눴다(디지털 자료 섹션과 동일 패턴).

## 10. 게이트 · 배포

| 항목 | 결과 |
|------|------|
| KPA `tsc --noEmit` | **PASS** (exit 0) |
| `npm run build` | **PASS** (exit 0, built in 21.88s) |
| 배포 workflow | `deploy-web-services.yml` run `30275476358` — **success** |
| detect-changes | `deploy-kpa-society` 만 선택 / glycopharm·k-cosmetics·neture **skipped** |
| 리비전 | `kpa-society-web-01728-f65` |

> 로컬 메모리 여유가 0.2GB 까지 떨어져 `tsc`/`vite` 가 기동 단계에서 OOM 으로 죽는 일이 있었다.
> 병렬 세션 프로세스는 건드리지 않고 재시도만으로 통과시켰다 (typecheck 2회차, build 1회차 성공).

## 11. 프로덕션 smoke — 10화면

계정: 약국 경영자 `renagang21@gmail.com` / 조직 `테스트 약국 매장`. read-only(가져오기·저장 mutation 없음).

| 화면 | h1 | console error | HTTP 4xx/5xx | 정렬 헤더 | 수제 pager |
|------|-----|:---:|:---:|:---:|:---:|
| `/store-hub` | 약국 운영 허브 | 0 | 0 | **0** | **0** |
| `/store-hub/content` | 약국에서 바로 쓰는 콘텐츠 | 0 | 0 | **0** | **0** |
| `/store-hub/blog` | 매장 HUB 블로그 | 0 | 0 | **0** | **0** |
| `/store-hub/pop` | 매장 HUB POP | 0 | 0 | **0** | **0** |
| `/store-hub/qr` | 매장 HUB QR-code | 0 | 0 | **0** | **0** |
| `/store-hub/video` | 매장 HUB 동영상 | 0 | 0 | **0** | **0** |
| `/store-hub/signage` | 플랫폼 디지털사이니지 | 0 | 0 | **0** | **0** |
| `/store-hub/screen-set` | 태블렛 화면 (HUB) | 0 | 0 | **0** | **0** |
| `/store-hub/multilingual-product-contents` | 매장 HUB 다국어 상품 콘텐츠 | 0 | 0 | **0** | **0** |
| `/store-hub/b2b` | 상품 카탈로그 | 0 | 0 | **0** | **0** |

**A-3 PASS** — 10화면 전부 `th[aria-sort]` / 정렬 버튼 0개.
**A-1·A-2 PASS** — 수제 이전/다음 잔여 0.

### A-4 메뉴 (PASS)

```text
사이드바: 홈 / 상품 카탈로그 / 이벤트·특가 / 장바구니 / 다국어 상품 콘텐츠
          / 블로그 / POP / QR-code / 동영상 / 사이니지 콘텐츠 / 태블렛 화면 / 콘텐츠 가져오기
메뉴 클릭 → https://kpa-society.co.kr/store-hub/multilingual-product-contents  ✅
```

### A-7 홈 (PASS)

```text
섹션      : 새로 공급 가능한 상품 / 새로운 콘텐츠 / 새로운 디지털 자료   (3영역 유지)
전체 보기 : 콘텐츠 · 블로그 · POP · QR 템플릿 · 동영상 · 사이니지 · 태블렛 화면   (7개)
```

### A-5 문구 (부분 실증)

| 화면 | 실렌더 | 사유 |
|------|:------:|------|
| 블로그 | ✅ 값 복사형 문구 노출 | 운영자 published 블로그 **1건** 존재 |
| 사이니지 | ✅ 값 복사형 문구 노출 | 안내가 상시 노출 구조 |
| 다국어 | ✅ 덮어쓰기 문구 노출 | 안내가 헤더에 상시 노출 |
| POP · QR · 동영상 | **미노출** | **원본 0건** — 안내가 `slug && items.length > 0` 조건부 footer 라 렌더되지 않음 |

프로덕션 원본 건수 (read-only 확인):

```sql
store_blog_posts   (operator, published) → kpa 1건
store_pops         (operator)            → 0건
store_videos       (operator)            → 0건
operator_qr_templates                    → 0건
store_tablet_screen_sets (operator 원본)  → 0건
```

→ **POP/QR/동영상의 문구 미노출은 구현 누락이 아니라 데이터 부재**다. 코드 반영은 커밋 `a71de1f64` diff 로 확인되며, 동일 조건부 구조를 쓰는 블로그가 실제로 렌더된 것으로 패턴이 실증된다.
→ 같은 이유로 **홈 '최신 디지털 자료' 의 태블렛 화면 행도 실증되지 않았다**(원본 0건). 편입 자체는 섹션 헤더의 '태블렛 화면 전체 보기' 링크 노출로 확인된다.

## 12. 완료 기준 대조 (WO §16)

| 기준 | 결과 |
|------|------|
| 검색 UI 와 실제 서버 결과 일치 | ✅ 검색 UI 를 새로 추가하지 않았으므로 불일치 없음 (B-1 분리) |
| 현재 페이지만 정렬하는 오해 제거 | ✅ 10화면 실측 0 |
| 태블렛 화면 HUB 표준 페이지네이션 | ⏭ **B-2 로 분리** (`WO-O4O-KPA-SCREEN-SET-HUB-SERVER-PAGINATION-V1`) |
| 홈 피드 자원 분류 확정 | ✅ 3영역 유지 + 행 수 유지 |
| 다국어 상품 콘텐츠 메뉴 위치 확정 | ✅ 매장 HUB 사이드바, 클릭 진입 실측 |
| 중복 가져오기 안내 정합 | ✅ 실제 정책 3갈래에 맞춰 분기 (§9.1) |
| 빈 상태·오류·성공 안내 정비 | ✅ A-6 확인 배너 + A-5 문구 |
| 기존 가져오기·사본 계약 무변경 | ✅ backend·DB·API 무변경 |
| KPA typecheck/build PASS | ✅ |
| 프로덕션 smoke PASS | ✅ (§11, 일부 항목 데이터 부재로 미실증 — 정직 보고) |
| CHECK 작성 · path-specific commit/push | ✅ |

## 13. 범위 제외 확인

```text
B-1 공통 HUB 검색 API 확장      — 미착수
B-2 태블렛 화면 서버 페이지네이션 — 미착수 (후속 WO)
B-3 사이니지 출처 필터 서버 이관  — 미착수
B-4 이미 가져온 항목 표시        — 미착수
B-5 F2 / F3 / N-5               — 미착수 (기록만)
GP/KCos                         — 무변경 (코드·배포 모두)
backend / DB / migration        — 무변경
데이터 계약                      — 무변경
```

병렬 세션이 동시 수정 중이던 파일(`PharmacySellPage.tsx`, `ProductMarketingPage.tsx`,
`StoreAssetsPage.tsx`, `StoreRecruitmentApplicationsPage.tsx`, `web-neture/**`, `apps/api-server/**`)은
**커밋에 포함하지 않았다** — pathspec 으로 A군 11파일만 지정해 커밋했다.

---

*조사: 2026-07-27 · 구현·배포·smoke 완료: 2026-07-27*
