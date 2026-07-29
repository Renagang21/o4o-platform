# IR-O4O-KPA-STORE-HUB-FINAL-INTEGRATED-GAP-AND-REGRESSION-AUDIT-V1

> **조사 전용 문서.** 코드 변경 0 / DB write 0 / API write 0 / migration 0 / 배포 0 / 테스트 데이터 생성 0.
> 발견사항은 본 IR 에서 수정하지 않고 **별도 WO 로 분리**한다.
> 선행 감사([IR-O4O-STORE-HUB-END-TO-END-CURRENT-STATE-AUDIT-V1](IR-O4O-STORE-HUB-END-TO-END-CURRENT-STATE-AUDIT-V1.md), 기준 `d9cc1b0` · 2026-07-26)의 19건이 **현재 main 에서 실제로 닫혔는지**를 코드·프로덕션 DB·API 로 재검증한 최종 통합 감사이다.

---

## 1. Executive Summary

### 1.1 최종 판정 — **CLOSED_WITH_FOLLOWUPS** (KPA 매장 HUB 범위)

| 축 | 판정 | 요지 |
|----|:----:|------|
| **상품 계열 가져오기 게이트** (선행 P0-01/02/04) | **CLOSED** | `/apply` 가 카탈로그와 **동일 게이트를 서버에서 재검증**하도록 코드 수정 완료 + 프로덕션 offer 0건(DATA_PASS) |
| **콘텐츠 계열 원본→사본→활용 동선** | **CLOSED** | 7개 KPA HUB 화면 전부 import=사본 계약·독립성·오류 4상태+재시도 정합. 프로덕션 사본 무결성 clean |
| **KPA 사용자 flow 차단 요인** | **없음** | HUB원본→가져오기→매장사본→활용을 막는 STILL_OPEN 항목 0건 |
| **잔존 STILL_OPEN (KPA 범위)** | **후속 WO** | 드리프트 방지(P1-02)·보안 하드닝(P1-05)·UX/기술부채(P2-01/04/05/09)·데이터 의존 게이트(P1-06 DATA_PASS) |
| **GP / K-Cosmetics 영역** | **OUT_OF_SCOPE** | P0-03·P1-03·P1-01(GP/KCos 부분)은 사용자 결정으로 보류 — 이번 조사 범위 밖 |

**한 줄 결론:** 선행 감사의 **P0 4건 중 KPA 에 영향을 주는 3건(P0-01/02/04)은 코드에서 실제로 닫혔고**, 프로덕션 데이터·API·사본 무결성이 이를 뒷받침한다. KPA 매장 경영자의 매장 HUB 핵심 동선을 **차단하는 결함은 0건**이므로 매장 HUB 는 **CLOSED_WITH_FOLLOWUPS** 로 유지 가능하다. 잔존 항목은 전부 (a) 보안 하드닝·드리프트 방지·UX 정합의 **후속 WO**, 또는 (b) 사용자가 보류한 **GP/KCos 정비**이다.

### 1.2 왜 NOT_CLOSED 가 아닌가

선행 감사 §14 의 실위험 미확인 4항목을 이번에 실증한 결과:

| 미확인 항목 (선행) | 이번 실증 결과 | 판정 |
|--------------------|----------------|:----:|
| PUBLIC 의약품 offer 존재 여부 (P1-06 실위험) | `supplier_product_offers` **0행** → PUBLIC 의약품 offer 0 | DATA_PASS |
| PRIVATE offer 실제 운용 건수 (P0-02 실위험) | offer 0행 + **코드 게이트도 landed** | 이중 안전 |
| 상품 apply 우회 가능성 (P0-01 실위험) | `findApplicableOffer` 게이트 재검증 **코드 존재** | CLOSED |
| 사본 무결성 (cross-service/org 유출) | orphan 0·cross-service 0·cross-org 0 | PASS |

→ F2/N-5 상당의 상품 apply 게이트가 **코드로 닫혔고** 데이터도 이를 막지 않으므로, NOT_CLOSED 로 볼 근거가 사라졌다.

### 1.3 재검증 기준

| 항목 | 값 |
|------|-----|
| 저장소 / 브랜치 | `c:\Users\home\coding\o4o-platform` · `main` |
| 재검증 기준 commit | `2456f85e` (2026-07-29, 조사 시점 HEAD) |
| 선행 감사 기준 commit | `d9cc1b0` (2026-07-26) |
| 조사 방식 | 정적 코드 분석 + **프로덕션 read-only DB(SELECT)** + **프로덕션 API smoke** + SPA shell smoke |
| 브라우저 자동화 smoke | **NOT_TESTABLE (프로파일 잠금)** — 동시 세션이 Playwright 프로파일 점유. HTTP/API smoke 로 대체 |
| 코드·DB·API write | **0** (전 과정 read-only) |

---

## 2. 진입 · 메뉴 · route 지도 (KPA 매장 HUB, 현재 main)

`PharmacyHubLayout` 사이드바 기준. 선행 감사 §4.1 대비 **변동점 2건**(P2-03·P2-08 해소)을 반영.

| 자원 | 사이드바 메뉴 | 전체 목록 route | 상세 | 가져오기 후(활용) | 홈 피드 포함 |
|------|:-------------:|-----------------|------|-------------------|:------------:|
| 상품 | ✅ | `/store-hub/b2b` | 행 확장 | `/store/commerce/products` | ✅ |
| CMS/일반 콘텐츠 | ✅ | `/store-hub/content` | Drawer | `/store/content` | ✅ |
| POP | ✅ | `/store-hub/pop` | Drawer | `/store/content/pop` | ✅ |
| QR | ✅ | `/store-hub/qr` | Drawer | `/store/marketing/qr` | ✅ |
| 동영상 | ✅ | `/store-hub/video` | Drawer | 매장 사본 | ✅ |
| 사이니지 미디어/플레이리스트 | ✅ | `/store-hub/signage` | Drawer | `/store/content?tab=signage` | ✅(미디어) |
| 태블렛 화면 세트 | ✅ | `/store-hub/screen-set` | 인라인 미리보기 | `/store/commerce/tablet-displays` | ✅(신규) |
| 블로그 | ✅ | `/store-hub/blog` | Drawer | 매장 블로그 | ✅(신규) |
| **다국어 상품 콘텐츠** | **✅ (신규 추가)** | `/store-hub/multilingual-product-contents` | — | `.../my` | — |
| 이벤트·특가 / 장바구니 | ✅ | `/store-hub/event-offers`, `/cart` | — | — | — |

**정합 결과**

- 데드링크(메뉴 있고 route 없음): **0건**
- route 있고 메뉴 없음: **0건** — 선행 P2-03(`multilingual-product-contents` 메뉴 부재) **해소** (`PharmacyHubLayout.tsx:80` 메뉴 항목 추가)
- 중복 메뉴: 0건. legacy `/hub/*` → `/store-hub` redirect 정상

---

## 3. 자원 10종 원본→가져오기→매장사본→활용 E2E (현재 main)

| 자원 | 원본 노출 게이트 | 가져오기 서버 재검증 | 사본 독립성 | 활용 경로 | E2E |
|------|------------------|:--------------------:|:-----------:|-----------|:---:|
| 블로그 | `service_key`+`author_role='operator'`+`published` | ✅ 동일 조건 재구성 | FULL_COPY | 매장 블로그 게시 | ✅ |
| POP | 동일 | ✅ | FULL_COPY | POP builder→PDF | ✅ |
| QR | 동일 | ✅ | FULL_COPY (+ page target 매장사본 치환 가드) | 공개 URL·출력·통계 | ✅ |
| 동영상 | 동일 | ✅ | FULL_COPY (`copied_from_id`) | QR 연결 | ✅ |
| CMS/콘텐츠 | `serviceKey`+`published`+scope | ✅ (`KpaAssetResolver`, `kpa`/`kpa-society` 한정) | FULL_COPY (`sourceAssetId`) | QR·태블렛 | ✅ |
| 사이니지 미디어 | `serviceKey`+`active`+`scope=global`+source 3종 | ✅ | FULL_COPY | 플레이리스트 | ✅ |
| 사이니지 플레이리스트 | 동일 | ✅ | FULL_COPY | 화면 송출 | ✅ |
| 태블렛 화면 세트 | `service_key`+`origin='operator'`+`operator_template` | ✅ **트랜잭션 내 재검증** | FULL_COPY (`store_asset_derivations`) | 코너별 운영 적용 | ✅ |
| 상품 | `distribution_type`+**서비스 승인 게이트**+**PRIVATE 매장범위 게이트** | ✅ **`findApplicableOffer` 재검증(신규)** | REFERENCE(의도) | 설명서·QR·POP·태블렛 | ✅ |
| 다국어 상품 콘텐츠 | 매장 소유 | — | 매장 소유 | 상품 QR | ✅ |

> **핵심 불변식 유지 확인:** "목록에 안 보이는 것은 가져올 수도 없다"가 **상품 계열에서도 이제 성립**한다 — `POST /apply` 가 `findApplicableOffer` 로 카탈로그와 동일한 `buildServiceApprovalGateSql` + `buildPrivateSellerScopeSql` 를 재적용하기 때문. 선행 감사에서 상품만 깨져 있던 성질이 닫혔다.

---

## 4. 선행 19건 Closure Matrix (기준 `d9cc1b0` → 현재 `2456f85e`)

### P0 (4건)

| ID | 판정 | 근거(현재 main) |
|----|:----:|-----------------|
| **HUB-P0-01** 상품 apply 게이트 미재검증 | **CLOSED** | `pharmacy-products.controller.ts:426-428` `findApplicableOffer` 가 catalog 와 동일 `buildServiceApprovalGateSql` 재적용. WO-...APPLY-APPROVAL-GATE-PARITY-V1 landed. DATA_PASS(offer 0행) |
| **HUB-P0-02** PRIVATE `allowed_seller_ids` 미검사 | **CLOSED** | `buildPrivateSellerScopeSql` 를 catalog(`:254`)·count(`:342`)·apply(`:154`) 3경로 전부 적용. WO-...PRIVATE-OFFER-SELLER-SCOPE-GATE-V1 landed. DATA_PASS |
| **HUB-P0-03** GP/KCos 자료함 KPA 하드와이어링 | **STILL_OPEN / OUT_OF_SCOPE** | `glycopharm.routes.ts:388,391`·`cosmetics.routes.ts:155,158` 여전히 KPA 고정 컨트롤러 마운트. **사용자 결정으로 GP/KCos 정비 보류** — 이번 조사 범위 밖 |
| **HUB-P0-04** apply `service_key` 클라이언트 입력 | **CLOSED** | `pharmacy-products.controller.ts:393-406` serviceKey 를 마운트에서 도출, body 불일치 시 `400 SERVICE_KEY_MISMATCH`. Guard Rule 4 정렬 |

### P1 (6건)

| ID | 판정 | 근거(현재 main) |
|----|:----:|-----------------|
| **HUB-P1-01** GP/KCos HUB 콘텐츠 검색 서버 무시 | **STILL_OPEN / 대부분 OUT_OF_SCOPE** | `hub-content.controller.ts:47` 여전히 `search` 미독. GP/KCos 영향분은 범위 밖. 공유 백엔드 `HubContentQueryService` 검색 미지원은 후속 WO |
| **HUB-P1-02** KPA 프론트 serviceKey 리터럴 산재 | **STILL_OPEN (드리프트 방지 리팩터)** | `HubPopLibraryPage.tsx:31 const SERVICE_KEY='kpa'` 등 화면별 로컬 리터럴 유지, 상수 미통합. **이축 자체는 의도**(정상 동작). 회귀 방지용 후속 WO |
| **HUB-P1-03** GP/KCos 동영상·태블렛·다국어 부재 | **PARTIALLY_CLOSED / OUT_OF_SCOPE** | 다국어 **백엔드 대칭** 마운트됨(`glycopharm.routes.ts:463`·`cosmetics.routes.ts:204`, "UI는 KPA 파일럿 전용" 명시). 동영상·화면세트 UI/백엔드 여전히 KPA 전용 |
| **HUB-P1-04** mixed 모드 total 부정확 + screen-set 누락 | **STILL_OPEN (저영향)** | `hub-content.service.ts:245 total=items.length`, `queryMixed(:216-222)` 가 `queryScreenSet` 미포함. **실사용 영향 낮음** — KPA/GP/KCos 프론트 전부 `sourceDomain` 지정 호출 |
| **HUB-P1-05** HUB 목록 API 무인증 + serviceKey 쿼리 | **STILL_OPEN (보안 하드닝)** | `hub-content.controller.ts:45` auth 미들웨어 없음, `:47` serviceKey 쿼리 파라미터. **대상=`published` 운영자 자료**(매장 데이터 유출 아님). API smoke 로 재현 확인(§6) |
| **HUB-P1-06** 상품 카탈로그 의약품/매장유형 게이트 부재 | **STILL_OPEN (code) / DATA_PASS** | `pharmacy-products.controller.ts` 에 medication/regulatory_type 게이트 없음. 단 **offer 0행 → PUBLIC 의약품 offer 0** → 현 시점 노출 실체 없음 |

### P2 (9건)

| ID | 판정 | 근거(현재 main) |
|----|:----:|-----------------|
| **HUB-P2-01** KPA HUB 검색창/`search` 파라미터 없음 | **STILL_OPEN** | `api/hubContent.ts:20-26` `HubContentListParams` 에 `search` 필드 없음 |
| **HUB-P2-02** 현재 페이지 내 client sort 오인 | **CLOSED** | 정렬 UI 전 화면 제거 — `HubPopLibraryPage.tsx:167-168` "현재 페이지만 정렬되는 UI 제거" (Blog/Qr/Video/Signage/ScreenSet 동일) |
| **HUB-P2-03** 다국어 route 메뉴 부재 | **CLOSED** | `PharmacyHubLayout.tsx:80` 메뉴 항목 추가 |
| **HUB-P2-04** KPA hubContentApi raw fetch + env 직접 | **STILL_OPEN** | `api/hubContent.ts:16 import.meta.env.VITE_API_BASE_URL`, `:38 fetch(url)` — authClient 미전환 |
| **HUB-P2-05** `screen-set` 도메인 소비처 0 | **STILL_OPEN** | 백엔드 도메인 유효하나 `sourceDomain:'screen-set'` grep 0 hit. 프론트는 `/store/screen-set-hub/templates` 사용 |
| **HUB-P2-06** 중복 가져오기 안내 불균등 | **CLOSED** | 8개 HUB 화면 전부 "다시 가져오면 새 사본" 안내 표준화(`HubPopLibraryPage.tsx:313` 등) |
| **HUB-P2-07** 태블렛 화면 HUB `LIMIT 200` 무페이지네이션 | **CLOSED** | `store-tablet.routes.ts:1580` 구 LIMIT 200 제거→서버 페이지네이션, `:1607` `pagination{page,limit,total,totalPages}` 반환 (WO-...SCREEN-SET-HUB-SERVER-PAGINATION-V1) |
| **HUB-P2-08** 홈 피드 blog·screen-set 누락 | **CLOSED** | `StoreHubLatestFeed.tsx:169` blog 병합, `:254-264` screen-set 병합 |
| **HUB-P2-09** 원본 추적 blog/pop/qr 텍스트 접두어뿐 | **STILL_OPEN** | `pop.controller.ts:133`·`blog.controller.ts:557`·`qr.controller.ts:229` 여전히 excerpt/description 접두어(구조 컬럼 없음). schema 변경 수반 → 별도 판단 |

### 4.1 집계

| 판정 | 개수 | ID |
|------|:----:|-----|
| **CLOSED** | 8 | P0-01, P0-02, P0-04, P2-02, P2-03, P2-06, P2-07, P2-08 |
| **PARTIALLY_CLOSED** | 1 | P1-03 (OUT_OF_SCOPE) |
| **STILL_OPEN — KPA 후속 WO** | 7 | P1-02, P1-04, P1-05, P1-06(DATA_PASS), P2-01, P2-04, P2-05, P2-09 |
| **STILL_OPEN — OUT_OF_SCOPE (GP/KCos)** | 2 | P0-03, P1-01(GP/KCos 부분) |

> STILL_OPEN 8건(KPA 범위) 중 **KPA 사용자 flow 를 차단하는 항목은 0건**. 전부 보안 하드닝(P1-05)·드리프트 방지(P1-02)·저영향 정합(P1-04)·데이터 의존 게이트(P1-06)·UX/기술부채(P2-01/04/05/09).

---

## 5. 신규 발견사항 (선행 감사에 없던 것)

**신규 P0/P1 결함: 0건.** 재검증 과정에서 선행 19건 외 신규 회귀·결함은 발견되지 않았다.

| 항목 | 성격 | 비고 |
|------|------|------|
| P1-03 다국어 백엔드 대칭 마운트 | **개선(회귀 아님)** | GP/KCos 에 다국어 백엔드가 추가되었으나 UI 는 KPA 전용 — "backend symmetry" 주석 명시. 미완이나 결함 아님 |
| 상품 count 쿼리 게이트 동기화 | **개선 확인** | `pharmacy-products.controller.ts:336,342` count 쿼리도 목록과 동일 게이트 — 페이지네이션 total 정확성 확보 |

---

## 6. 프로덕션 read-only 실증 (§10 SELECT only)

> 접속: `cloud-sql-proxy` 경유 read-only. **비밀값·자격증명은 본 문서에 기록하지 않음.** 조사 후 내 프록시 종료(동시 세션 프록시 미간섭). 프로덕션 API 는 무인증 공개 엔드포인트만 GET.

### 6.1 상품 데이터 (P0-01/02, P1-06 실위험 해소)

| 집계 | 값 | 함의 |
|------|----|----|
| `supplier_product_offers` 총행 | **0** | PUBLIC/SERVICE/PRIVATE offer 전무 → apply 우회·PRIVATE 노출·PUBLIC 의약품 노출 **실체 0** |
| `organization_product_listings` 총행 | **20** | 전부 `service_key='neture'`, 전부 약국 조직, master 기준만 |
| cross-service listing 유출 | **0** | |

### 6.2 사본 무결성 (독립성·격리 실증)

| 집계 | 값 |
|------|----|
| screen-set 매장 사본 | 12 (전부 약국 조직) |
| screen-set operator 템플릿(원본) | 0 |
| orphan 매장 사본(원본 참조 깨짐) | **0** |
| cross-org 사본 유출 | **0** |
| `store_asset_derivations` provenance 행 | 24 |

### 6.3 콘텐츠 원본 재고 (smoke 대상 결정용)

| 자원 | operator 원본 행 |
|------|:----------------:|
| blog | 1 |
| signage-media | 5 |
| cms (`serviceKey=kpa`) | 1 (hero) |
| cms (`serviceKey=kpa-society`) | 53 |
| pop / qr / video / screen-set 원본 | 0 |

### 6.4 프로덕션 API smoke (무인증 공개 엔드포인트)

| 요청 | 결과 |
|------|------|
| `GET /api/v1/hub/contents` (serviceKey 없음) | `400 MISSING_SERVICE_KEY` — 게이트 정상 |
| `GET /api/v1/hub/contents?serviceKey=kpa` | `200` · 2건(blog "테스트" + cms hero) — §6.3 정합 |
| `GET /api/v1/hub/contents?serviceKey=kpa-society` | `200` · signage-media 실데이터 |
| `GET https://kpa-society.co.kr/store-hub` (SPA shell) | `200` · `<title>KPA Society …</title>` |

> **P1-05 재현 확인:** serviceKey 만 바꿔 무인증으로 다른 축 목록을 열람 가능함을 API smoke 로 실증(단, `published` 운영자 자료만 — 매장 데이터 아님).

---

## 7. 프로덕션 브라우저 smoke (§11)

**자동화 상태: NOT_TESTABLE (프로파일 잠금).** 동시 세션의 Chrome 이 Playwright 사용자 프로파일(`C:\Users\home\.playwright-o4o-profile`)을 점유하여 브라우저 기동이 즉시 종료됨(`이미 다른 세션에서 사용 중`). **동시 세션을 강제 종료하지 않음.** 렌더 검증은 정적 렌더 경로 분석 + §6.4 API/SPA smoke 로 대체.

| 화면 | 자동화 렌더 | 대체 근거 | 데이터 실증 |
|------|:-----------:|-----------|-------------|
| `/store-hub` (홈) | NOT_TESTABLE_PROFILE_LOCK | SPA shell 200 + `StoreHubLatestFeed` 정적경로 | blog1·signage5 병합 가능 |
| `/store-hub/b2b` (상품) | NOT_TESTABLE_PROFILE_LOCK | catalog/count 게이트 정적 확인 | **NOT_TESTABLE_DATA_ABSENCE** (offer 0) |
| `/store-hub/content` | NOT_TESTABLE_PROFILE_LOCK | API 200 (cms kpa=1) | 부분 실증 |
| `/store-hub/blog` | NOT_TESTABLE_PROFILE_LOCK | API 200 (blog=1) | 실증 |
| `/store-hub/signage` | NOT_TESTABLE_PROFILE_LOCK | API 200 (signage=5) | 실증 |
| `/store-hub/pop` `/qr` `/video` | NOT_TESTABLE_PROFILE_LOCK | 정적 render 경로 | **NOT_TESTABLE_DATA_ABSENCE** (원본 0) |
| `/store-hub/screen-set` | NOT_TESTABLE_PROFILE_LOCK | 서버 페이지네이션 정적 확인 | **NOT_TESTABLE_DATA_ABSENCE** (operator 템플릿 0) |
| `/store-hub/multilingual-product-contents` | NOT_TESTABLE_PROFILE_LOCK | 메뉴·route 정합 확인 | 매장 소유 데이터 의존 |

> **데이터 희소성** 때문에 import/copy/retry 상호작용의 자동화 실증은 원본이 존재하는 blog(1)·signage(5)·cms(1) 로 한정되며, 그마저 프로파일 잠금으로 자동화 불가. 오류 4상태+재시도 계약은 **정적 코드에서 7개 화면 전부 확인**(선행 CHECK-...PAGINATION-CLOSEOUT-V1 §8 및 본 IR §4 P2-06 참조). **테스트 데이터는 생성하지 않았다.**

---

## 8. 검증 불가 / 미확인 항목 (정직성 선언)

| 항목 | 상태 | 사유 |
|------|:----:|------|
| 각 HUB 화면 실제 DOM 렌더·상호작용 | **미확인(자동화)** | 프로파일 잠금. 정적+API smoke 로 부분 대체 |
| import→copy→retry 실데이터 상호작용 | **NOT_TESTABLE_DATA_ABSENCE** | pop/qr/video/screen-set 원본 0. 데이터 생성 금지 원칙 준수 |
| P1-06 잠재 위험 재발 조건 | **조건부** | 향후 PUBLIC 의약품 offer 등록 시 코드 게이트 부재가 실위험화 — 후속 WO 트리거 |
| GP/KCos 실사용자 role 겸직 분포 (P0-03 실위험) | **미확인 / OUT_OF_SCOPE** | GP/KCos 보류 결정 |

**본 IR 의 CLOSED 판정은 (a) 코드 게이트 존재 + (b) 프로덕션 데이터 무결성 + (c) API/SPA smoke 3중 근거에 기반한다.** 브라우저 자동화 미실증분은 위와 같이 명시한다.

---

## 9. 최종 판정 및 후속 WO 우선순위

### 9.1 판정: **CLOSED_WITH_FOLLOWUPS** (KPA 매장 HUB)

- KPA 영향 P0 3건(01/02/04) **CLOSED**(코드+데이터). KPA 사용자 flow 차단 요인 **0**.
- 잔존은 전부 후속 WO(보안·드리프트·UX) 또는 사용자 보류 GP/KCos.

### 9.2 후속 WO 우선순위 (본 IR 에서 수정하지 않음 — 분리 실행)

| 순서 | WO(권장명) | 대상 ID | 성격 | 트리거 |
|:----:|-----------|---------|------|--------|
| P1 | `WO-O4O-HUB-CONTENT-SERVICEKEY-PATH-SCOPING-V1` | HUB-P1-05, P2-04 | 보안 하드닝(무인증+쿼리 serviceKey→경로/인증) | 상시 |
| P1 | `WO-O4O-STORE-HUB-PRODUCT-MEDICATION-STORE-TYPE-GATE-V1` | HUB-P1-06 | 의약품/매장유형 게이트 | **PUBLIC 의약품 offer 등록 전** |
| P2 | `WO-O4O-KPA-STORE-HUB-SERVICEKEY-CONSTANT-CONSOLIDATION-V1` | HUB-P1-02 | 드리프트 방지 리팩터(동작 무변경) | 상시 |
| P2 | `WO-O4O-HUB-CONTENT-QUERY-SEARCH-PARAM-SUPPORT-V1` | HUB-P1-01, P2-01 | KPA/GP/KCos 검색 백엔드 지원 | 상시 |
| P2 | `WO-O4O-HUB-CONTENT-MIXED-MODE-TOTAL-AND-DOMAIN-COVERAGE-V1` | HUB-P1-04, P2-05 | mixed total 정확화 + 죽은 도메인 정리 | 상시 |
| P3 | `WO-O4O-STORE-HUB-COPY-ORIGIN-TRACKING-V1` | HUB-P2-09 | blog/pop/qr `copied_from_id` (schema 변경) | 별도 판단 |
| — | (보류) `WO-O4O-ASSET-SNAPSHOT-CONTROLLER-SERVICE-AWARE-FACTORY-V1` 외 | HUB-P0-03, P1-03 | GP/KCos 정비 | **사용자 결정 대기** |

---

## 10. 산출물 · 완료 기준

| 기준 | 상태 |
|------|:----:|
| route/메뉴 지도 (§2) | ✅ |
| 자원 10 E2E (§3) | ✅ |
| 19건 Closure Matrix (§4) | ✅ |
| 신규 발견사항 (§5) | ✅ (신규 결함 0) |
| 프로덕션 데이터 집계 (§6) | ✅ |
| 브라우저 smoke 결과 (§7) | ✅ (NOT_TESTABLE 명시) |
| 검증 불가 항목 (§8) | ✅ |
| 최종 판정 + 후속 WO (§9) | ✅ CLOSED_WITH_FOLLOWUPS |
| 코드/DB/API/migration/배포/테스트데이터 write | **0** |

---

*작성: 2026-07-29 · 재검증 기준 commit `2456f85e` · 선행 `d9cc1b0` · 코드 변경 0 / DB write 0 / API write 0*
