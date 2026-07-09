# IR-O4O-PRODUCT-TO-QR-FLOW-AUDIT-V1

> 상위 IR: `IR-O4O-QR-BUSINESS-FLOW-AUDIT-V1` §2-A (Product → QR)
> 조사 성격: **Read-only Audit** (코드 무변경)
> 작성: 2026-07-09 · Status: Audit Complete

## 업무: Product → QR

### 사용자의 목적
매장 담당자가 취급 상품(O4O 표준상품 / 매장 직접등록 상품) 화면에서 **그 상품을 안내하는 QR을 바로 만든다.** 상품을 보고 있는 자리에서 QR 출력물까지 최소 동선으로 이어지길 원한다.

---

### 현재 업무 흐름 (구현 기준)

세 개의 상품 화면 어디에도 **상품 행(row)에서 QR로 가는 직접 경로가 없다.**

| 화면 | 라우트 | QR 관련 Action |
|------|--------|----------------|
| 취급상품 통합목록 `StoreHandledProductsPage` | `/store/handled-products` | **없음** (O4O 상세설명 가져오기 / 사용 설명서 / **콘텐츠 만들기** / 관리) |
| 매장 직접등록 `StoreLocalProductsPage` | `/store/commerce/local-products` | 행에는 없음. 편집 모달 안에서 *다국어 콘텐츠가 연결된 경우에만* `MultilingualPublicActions`의 "QR 보기" |
| admin 상품마스터 `ProductMastersPage / ProductMasterDetailPage` | `/admin/o4o-product-db/masters` | **없음** (GET-only, 텍스트 참조만) |

실제로 상품에서 QR에 도달하려면 **2-hop 우회**가 필요하다.

```
취급상품 목록 → [콘텐츠 만들기] → /store/library/contents?create=1&pType=&pId=&pName=
   → 콘텐츠 작성·저장 → 콘텐츠 목록에서 [QR-code 만들기](인라인 StoreQrCreateModal) → QR 생성
```

QR 쪽에는 상품 대상 경로가 **부분적으로만** 존재한다.
- `POST /pharmacy/qr` 는 `landingType='product'` + `productId` 를 받되, **`productId`는 `supplier_product_offers.id`(공급자 오퍼)만 검증**한다 (`store-qr-landing.controller.ts:798-814`).
- `GET /pharmacy/qr/source/products` 도 `supplier_product_offers` 를 반환한다.
- **`product_masters.id` 를 QR 대상으로 받는 API/컬럼 경로는 존재하지 않는다.** (`product-usage-links.service.ts:188` — `notMapped: ['qr_direct','tablet_direct']`, 별도 QR↔master 매핑 테이블 없음.)

즉 현재 구조에서 "상품을 가리키는 QR"은 (a) 공급자 오퍼(offer)를 직접 대상으로 하거나, (b) 상품이 링크된 자료함 콘텐츠를 경유하는 두 가지뿐이다.

---

### 문제점 (업무 단절 지점)

1. **진입 단절** — 상품 화면(취급상품/마스터)에 QR Action이 아예 없다. 사용자는 "상품 → QR"을 한 흐름으로 인지하지만 실제로는 콘텐츠 화면을 반드시 경유해야 한다.
2. **개념 불일치** — 백엔드에는 "ProductMaster를 대상으로 하는 QR"이라는 개념 자체가 없다. 상품 QR = 오퍼 QR 또는 콘텐츠 QR로만 표현된다. 사용자 기대("이 상품의 QR")와 데이터 모델이 어긋난다.
3. **복귀 단절** — "콘텐츠 만들기"로 넘어간 뒤 저장하면 콘텐츠 상세/목록으로 돌아오고, 거기서 다시 인라인 QR을 눌러야 한다. 상품 → 콘텐츠 → QR 3단계가 각각 별도 화면 전환이다.

---

### 개선안 (최소 범위 우선)

| 우선순위 | 개선안 | 활용 방식 |
|:---:|------|------|
| 1 | **취급상품 목록 행에 "QR 만들기" Action 추가** | 기존 `productionTargets` prefill 메커니즘(StoreQRPage가 router state `production.source.items[]` 수신·prefill, `StoreQRPage:267-299`) 이용. 상품 정보를 넘겨 기존 QR 생성 화면으로 진입 → **Front만 수정, 신규 화면 0** |
| 2 | O4O listing(공급자 오퍼 연결) 상품은 `landingType='product'` 로 **오퍼 대상 QR을 곧바로** 생성 | 기존 `POST /pharmacy/qr` + `GET /pharmacy/qr/source/products` 재사용. 단, listing→offer id 해석 경로 확인 필요 |
| 3 | 오퍼가 없는 상품(로컬/마스터 단독)은 "콘텐츠 먼저 만들기"로 자연 유도하되, **콘텐츠 저장 완료 화면에서 곧바로 "QR 만들기"** 로 이어지도록 연결 | 기존 인라인 QR(StoreQrCreateModal) 재사용, 화면 연결만 추가 |

핵심: **신규 QR 생성 화면·신규 API를 만들지 않고**, 상품 행 Action 추가 + 기존 prefill 경로 연결로 대부분 해결 가능하다.

---

### 기존 기능/화면/API 재사용 여부
- **화면 재사용**: `StoreQRPage`(생성 폼·prefill 지원), `StoreQrCreateModal`(인라인) 모두 그대로 사용 가능.
- **API 재사용**: `POST /pharmacy/qr`, `GET /pharmacy/qr/source/products` 그대로 사용 가능(오퍼 대상).
- **신규 API 필요 여부**: listing/master 단독 상품을 오퍼 없이 QR 대상으로 직접 삼으려면 백엔드 확장이 필요하나, **이는 F12 불변식("QR↔master 직접 매핑 없음")과 충돌**하므로 권장하지 않음. → 콘텐츠 경유가 canonical.

---

### 기존 불변식과의 충돌 검토

| 불변식 | 충돌 여부 | 비고 |
|------|:---:|------|
| **QR 비저장·동적생성** (F12 ④) | 충돌 없음 | `qr-print.service.ts:8` "QR은 DB에 저장하지 않음(온디맨드)". 개선안은 메타데이터만 다룸 |
| **Permalink 구조** | ⚠️ **가정 정정 필요** | 상위 IR/메모리는 `neture.co.kr/r/{resourceId}` 를 전제했으나, **매장 QR의 실제 공개 경로는 `/qr/{slug}`** (`App.tsx:1081`, `GET /api/v1/{service}/qr/public/:slug`). 백엔드에 `/r/{resourceId}` 라우트 없음. Product→QR WO는 `/r/` 가 아니라 `/qr/{slug}` 기준으로 작성해야 함 |
| **가져오기=사본** | 충돌 없음 (준수 필요) | `ensureStoreCopyForPageTarget`(`qr-content-hub-copy.service.ts:68`)가 `landingType='page'` 원본 참조 시 매장 사본 강제. 콘텐츠 경유 개선안은 이 가드 통과 |
| **store_execution_asset 구조** | 충돌 없음 | `library_item_id`(uuid)=사본 참조, `landing_target_id`(varchar)=비-UUID 대상. JOIN 시 `id::text` 캐스팅 규칙 유지 |
| **기존 QR Action 중복** | 중복 없음 | 상품 화면에 현재 QR Action이 전무하므로 신규 추가는 중복이 아님 |

---

### 업무동선 점수

| 지표 | 현재 | 개선 후(예상) |
|------|:---:|:---:|
| 자연스러움 | 낮음 (상품→QR 직접 경로 없음) | 높음 |
| 단계 수 | 3단계(상품→콘텐츠→QR) | 1~2단계 |
| 클릭 수 | 다수(콘텐츠 작성 포함) | 오퍼상품 2클릭 / 무오퍼상품 콘텐츠 후 즉시 |
| 중복 작업 | 콘텐츠 목록 재탐색 | 제거 |
| 끊김 지점 | 진입·복귀 2회 | 0~1회 |

---

### 개선 난이도
- **Action 추가**: 예 (취급상품 행)
- **메뉴 이동**: 아니오
- **화면 연결**: 예 (prefill 경로 연결)
- **Front만 수정**: 대체로 가능 (오퍼 대상 QR)
- **Backend 수정 필요**: listing→offer 해석이 미흡할 경우 최소 확장 (조회 1건)
- **신규 기능 필요**: **없음** (master 직접 QR은 불변식 위반이므로 의도적으로 제외)

**종합 난이도: 낮음~중간** / **신규 기능 필요 여부: 없음**

---

### 후속 WO 방향
`WO-O4O-PRODUCT-TO-QR-FLOW-IMPROVEMENT-V1` — 취급상품 목록 행 "QR 만들기" Action 추가 + StoreQRPage prefill 연결. 오퍼 상품은 즉시 QR, 무오퍼 상품은 콘텐츠 경유 유도. **공개 경로는 `/qr/{slug}` 기준**, master 직접 QR 미도입.

**핵심 발견 2가지 (WO 작성 전 반드시 반영):**
1. 상품 화면에 QR Action이 전무 → 진입점 추가가 이 축의 본질. 신규 기능 아님.
2. Permalink 가정 정정: 매장 QR은 `/r/{resourceId}` 가 아니라 **`/qr/{slug}`** 사용.
