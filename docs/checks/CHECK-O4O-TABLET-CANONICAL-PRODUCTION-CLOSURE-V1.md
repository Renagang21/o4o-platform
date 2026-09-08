# CHECK — O4O Tablet Canonical Production Closure V1

**WO**: `WO-O4O-TABLET-CANONICAL-PRODUCTION-CLOSURE-AND-COMMON-CORE-BOUNDARY-V1` §1~§4
**작업일**: 2026-09-08
**선행 commit**: `7971407f0` (WO-O4O-KPA-TABLET-GENERATION-CONSOLIDATION-AND-CANONICAL-REFERENCE-V1)
**결과**: **PRODUCTION E2E = PASS** (단 F·G 2건 BLOCKED — §5 사유)

---

## 1. 시작 기준점

| 항목 | 값 |
|---|---|
| `main` == `origin/main` | `7971407f0` |
| `7971407f0` 이 origin/main ancestor 인가 | **YES** |
| working tree | clean (다른 세션 파일 없음) |

---

## 2. 배포 상태 — 배포됨

`7971407f0` 이 production 에 실제 반영된 것을 워크플로 + 런타임 양쪽으로 확인했다.

| 워크플로 | headSha | 결과 |
|---|---|---|
| Deploy API Server (Cloud Run) | `7971407f0` | **success** |
| Deploy Web Services (Cloud Run) | `7971407f0` | **success** (`deploy-kpa-society` 포함 7개 전부 success) |

Cloud Run revision: `o4o-core-api` **`03545` → `03546-wjg`**, `kpa-society-web-01922-l5z`.

**런타임 확증**: 배포 후 공개 응답에 `product_list.selectionMode = "corner_display"` 가 나타났다.
이 필드는 `7971407f0` 에서 신설한 것이므로, **응답 자체가 신규 코드가 서빙 중임을 증명**한다.

---

## 3. BEFORE / AFTER 실측 대조

직전 CHECK 가 남긴 배포 전 기준선과 동일 조건(store `네뚜레-약국` · tablet `f8b78a16…`)으로 대조했다.

| endpoint | BEFORE (배포 전) | AFTER (배포 후) | 판정 |
|---|---|---|---|
| `/tablet/screen` | idle_media(1) · corner_description · content_list(4) · product_list(**selectionMode 없음**, 0) · qr_guide | idle_media(1) · corner_description · content_list(4) · product_list(**`corner_display`**, 0) · qr_guide | **예측대로** |
| `/tablet/products` | supplier 0 / local 3 / `configured` / selectedContentId 전부 null | **완전 동일** | **동일** |
| `/tablet/idle` | items 1 · `tabletSource=query` · opCommon null | **완전 동일** | **동일** |

직전 CHECK §8-3 의 AFTER 예측 3건이 **전부 적중**했다(반증 실패 = 예측 성립).
`product_content` 섹션은 BEFORE·AFTER 모두 없음 — 은퇴가 런타임에 회귀를 만들지 않았다.

---

## 4. Browser E2E (production)

인증은 `TEST-ACCOUNTS.local.md §4-2` 의 L1 토큰 주입을 썼다(서비스 웹 로그인은 §2 자격이
unknown 이라 불가). 문서 규정대로 **"로그인 자체" 는 이 회차의 검증 대상이 아니다.**

| # | 시나리오 | 결과 | 실측 |
|:---:|---|:---:|---|
| A | Tablet 관리 진입 · 2탭(코너별 운영 / 태블릿 콘텐츠) | **PASS** | 태블릿(2) 코너 카드 · 탭 전환 정상 · console error 0 · dead link 0 |
| B | Screen Set 목록 → 생성 → 상세 → 보관 | **PASS** | 목록 200(12건) · 생성 201 · 상세 200 · 보관 200 |
| C | content_list 콘텐츠 선택·저장 | **미실시** | 운영 매장의 실제 세트를 편집해야 함 → 회피 |
| D | product_list runtime 노출 | **PASS** | 코너별로 다른 상품 정상 노출(피부 3 / 구강 3), 노출 게이트 회귀 없음 |
| E | 상품 상세 기본 fallback(STORE canonical) | **PASS** | 구강관리 코너 content_list 카드가 SPD(`o4o_product_description`) 본문 렌더 |
| F | 매장 선택 product-linked content 우선 | **BLOCKED** | §5 참조 |
| G | 선택 해제 시 STORE canonical 복귀 | **BLOCKED** | §5 참조 |
| H | 코너 적용 현황 정합 | **PASS** | 코너 카드 "지금 나오는 화면" = 적용 세트명 일치 |
| I | 실제 Tablet URL(`?tabletId=`) | **PASS** | 코너 안내 + 콘텐츠 4장 + 상품 3개 + QR 정상 |
| J | QR screen_set 모바일 뷰어 | **PASS** | 같은 세트가 코너 안내 + 콘텐츠 4장으로 렌더 |
| K | Screen Set 교체 | **부분 PASS** | 교체 진입(`화면 바꾸기`) 확인. 실제 교체 실행은 운영 코너 상태 변경이라 미실행 |
| L | lifecycle(보관 → 목록 복귀) | **PASS** | archive 200 · 목록 12→12 · 생성분 비활성 확인 |
| M | `tabletId` 없는 기존 공개 URL(first_active) | **PASS** | 가장 오래된 active 태블릿(구강관리)으로 결정적 해석 · 전체 렌더 정상 |

**집계: PASS 9 / 부분 PASS 1 / BLOCKED 2 / 미실시 1**

### 4-1. 테스트 데이터 정리

생성한 것은 폐기용 Screen Set **1개**(`[E2E폐기예정]…`)뿐이며 **보관 처리로 정리 완료**했다.
기존 세트·태블릿 적용 상태·진열·콘텐츠는 **하나도 변경하지 않았다.**

### 4-2. 게이트 오탐 정정 (기록)

1차 실행에서 `I`·`M` 이 PASS 로 나왔으나 스크린샷 확인 결과 **스타일된 404 셸**이었다.
원인은 두 가지였고 둘 다 내 쪽 오류다:
- kiosk 경로를 `/store/{slug}/tablet`(= API 경로)로 잘못 지정 → 실제는 `/tablet/{slug}`
- 판정 규칙이 "white-screen 아님 + console error 0" 뿐이라 404 페이지가 통과

경로를 교정하고 판정에 `not-found-shell` 검사를 추가한 뒤 재측정해 위 표의 결과를 얻었다.
**1차 PASS 는 무효이며 위 표가 유효 결과다.**

---

## 5. BLOCKED 2건 — 중지 조건 해당

**F(매장 선택 product-linked content 우선) · G(해제 시 복귀)** 는 실행하지 않았다.

- 이 두 시나리오는 `kpa_store_content_product_links` 에 **실제 운영 매장의 상품↔콘텐츠 연결을
  생성**해야 성립한다. 해당 테이블은 프로덕션 **전체 0행**이며, 행을 넣는 순간
  **운영 중인 매장 태블릿의 상품 설명이 실제로 바뀐다.**
- WO §11 「production E2E 에 운영 데이터 훼손 필요」 중지 조건에 해당하므로 실행하지 않고 보고한다.

대신 계약이 성립함은 **다른 층위에서 증명**돼 있다:
- SQL 층: 직전 회차에서 신·구 쿼리를 프로덕션 실데이터로 나란히 실행해 동치 실증.
- 코드 층: 계약 spec 이 "1순위 근거 = 링크 원장 · `disp.content_id` 필수 조건 아님"을 회귀 고정.
- 런타임 층: 2순위(STORE canonical)가 실제로 렌더됨을 **E** 로 확인.

→ **1순위 우선순위 자체의 런타임 실증만 미완**이다. 후속에서 검증 전용 매장을 확보해 닫는다.

---

## 6. Runtime 동일성 판정 (§4)

동일 Screen Set(`피부관리 기본 화면 세트`)을 세 경로로 resolve 해 대조했다.

| 블록 | preview | tablet runtime | QR viewer | 판정 |
|---|---|---|---|:---:|
| `corner_description` | len=169 | 동일 | 동일 | **SAME** |
| `content_list` | items=4 (동일 4제목) | items=4 | items=4 | **SAME** |
| `qr_guide` | url 있음 | 동일 URL | 동일 URL | **SAME** |
| `idle_media` | items=1 | items=1 | **섹션 없음** | **LAYOUT_ONLY_DIFFERENCE** (문서화된 의도 — 대기화면은 무조작 태블릿 전용) |
| `product_list` | **섹션 없음** | `corner_display` · 실제 3상품 | `selected` · 0건 | **CONTRACT_DRIFT** |
| `product_content` | 없음 | 없음 | 없음 | **SAME** (은퇴 확인) |

### 6-1. CONTRACT_DRIFT 상세 — `product_list` 3경로 3계약

같은 세트인데 상품이 **preview 미표시 / tablet 3개 / QR 0개**로 셋 다 다르다.

| 경로 | 계약 | 근거 |
|---|---|---|
| preview | 상품 섹션 생략 | 저장 전 draft 는 적용 코너가 없다는 이유로 `continue` |
| tablet | ② 코너 진열(`store_tablet_displays`) | `tabletContext` 존재 → 1세대 진열 tier |
| QR | ③ 명시 선택만 | `WO-O4O-KPA-STORE-QR-SCREENSET-STATE-ALIGNMENT-V1` §5 (코너 무관 상품 유입 방지) |

**이것은 `7971407f0` 의 회귀가 아니다.** 세 계약 모두 그 커밋 이전부터 존재했고,
`7971407f0` 은 tablet 경로에 `selectionMode` **표식만** 추가해 이 차이를 **관측 가능하게** 만들었다.
(드리프트를 만든 것이 아니라 드러냈다.)

WO §4 지시대로 **이번 회차에서 리팩터링하지 않고** 경계 IR §6 에 원인·해결 후보와 함께 기록했다.

실무 영향: 코너 QR 을 찍은 고객은 그 코너 태블릿에 보이는 상품을 보지 못한다.

---

## 7. first_active production 결과

`tabletId` 없는 기존 공개 URL(`/tablet/네뚜레-약국`)이 정상 동작한다.
가장 오래된 active 태블릿(구강관리 코너)으로 **결정적으로** 해석되어 코너 안내·콘텐츠 5장·상품 3개가
모두 렌더됐다. **기존 URL breaking 0** — 직전 회차의 존치 판정이 production 에서 확인됐다.

---

## 8. 검증 요약

| 항목 | 결과 |
|---|---|
| 배포 | api-server · web 모두 `7971407f0` success |
| BEFORE/AFTER | 예측 3건 전부 적중 |
| Browser E2E | PASS 9 / 부분 1 / BLOCKED 2 / 미실시 1 |
| 3경로 동일성 | SAME 4 · LAYOUT_ONLY 1 · CONTRACT_DRIFT 1 |
| 운영 데이터 | 변경 0 (생성 1건은 보관 처리로 정리) |
| 코드 변경 | **0** (이번 회차는 검증·조사 전용) |

---

## 9. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
(경계·후속 제안은 `IR-O4O-TABLET-CANONICAL-COMMON-CORE-BOUNDARY-AND-PH-ADOPTION-GAP-V1` 에 있다.)

---

## 10. 종결 판정

**PRODUCTION E2E = PASS** — `7971407f0` 은 production 에서 canonical reference implementation 으로 성립한다.

단서 2건을 명시한다.
1. F·G(매장 선택 콘텐츠 우선/복귀)는 운영 데이터 훼손 없이 검증할 수 없어 **BLOCKED** 로 남았다.
2. `product_list` 3경로 CONTRACT_DRIFT 는 **선행 상태**이며 공통 Core 추출 전에 결론이 필요하다.
