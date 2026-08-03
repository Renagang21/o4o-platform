# CHECK-O4O-SCREEN-SET-PRODUCT-QR-SELECTION-V1

> WO: `WO-O4O-SCREEN-SET-PRODUCT-QR-SELECTION-V1`
> 목표: Screen Set 의 각 제품에 표시할 QR 을 **매장 경영자가 직접 선택**하고, 태블릿·모바일 코너 화면에서 동일하게 보여준다.
> 신규 테이블·migration·신규 엔드포인트 **없음** → §중지 조건 미해당.

---

## 1. 선택값 저장 구조 (신규 DB 구조 없음)

기존 `product_list` 블록 config 안에 **additive** 저장한다. 새 테이블·컬럼·엔드포인트가 없다.

```jsonc
// store_tablet_screen_blocks.config  (blockType = 'product_list')
{
  "source": "selected_products",
  "products": [
    { "productType": "supplier", "productId": "<organization_product_listings.id>", "qrCodeId": "<store_qr_codes.id>" },
    { "productType": "local",    "productId": "<store_local_products.id>" }        // ← QR 미선택 = 키 자체 없음
  ]
}
```

`packages/screen-content-core/src/index.ts`

- `SelectedProductRef` 에 `qrCodeId?: string` 추가(옵셔널 — 과거 저장값과 완전 호환).
- `selectedProductsOf()` 가 `qrCodeId` 를 보존(빈 문자열·비문자열은 미선택 취급).
- `withSelectedProducts()` 는 **선택된 경우에만** `qrCodeId` 를 직렬화 → 미선택 상품의 저장 형태는 이전과 byte 동일.
- 신규 순수 함수 `withProductQr(products, target, qrCodeId | null)` — 지정/해제. 다른 상품 선택에 영향 없음, 같은 QR 을 여러 상품에 지정 가능.
- 상품 dedup 키(`productRefKey`)는 그대로 `type:id` — QR 은 dedup 기준이 아니다.

**대표 QR 자동 판정·QR 자동 생성 없음.** 값은 사용자가 고른 기존 QR id 뿐이다.

---

## 2. QR 목록 조회 · 권한 경계

편집기는 QR 목록을 스스로 알지 않고 **주입** 받는다(패키지 순수성 유지).

| 계층 | 내용 |
|------|------|
| 편집기 prop | `fetchStoreQrCodes?: () => Promise<ScreenSetQrOption[]>` (`@o4o/tablet-screen-set-editor`) — **미주입이면 QR 선택 UI 미노출** |
| 주입처 | `services/web-kpa-society/.../TabletScreenSetManager.tsx` → `fetchStoreQrOptions()` = `getStoreQrCodes({page:1, limit:200})` |
| API | 기존 `GET /api/v1/kpa/pharmacy/qr` (신규 엔드포인트 없음) |
| 가드 | `requireAuth` + `requirePharmacyOwner` |
| 데이터 경계 | `WHERE qr.organization_id = $1 AND qr.is_active = true` — **매장 소유 + 활성만** |

→ WO §중지 조건 "현재 QR 목록 API 로 매장 소유 경계를 안전하게 확인할 수 없는 경우" **미해당**.

운영자(`OperatorTabletScreenSetsPage`)·공급자(`SupplierTabletScreenSetsPage`) 제작기는 이 prop 을 주입하지 않는다 → **기존 화면 무변경**(매장 QR 문맥 없음).

### 편집기 UI

- 선택한 상품 행마다 `QR 선택` / `QR 변경` / `QR 해제` 버튼 + 현재 선택된 QR 제목 표시.
- QR 선택 모달: 제목 검색 + 목록에 **제목 · 유형 · 연결 대상(`/qr/{slug}`)** 표시, 하단 `QR 표시 안 함`(해제).
- 안내 문구는 용도 중립 — "매장에 이미 만들어 둔 QR 중에서 고릅니다 … 여기서 QR을 새로 만들지는 않습니다."
  O4O 는 상품 QR·콘텐츠 QR·코너 QR 의 용도를 규정하지 않는다.

---

## 3. Resolver — 선택 QR → 공개 URL (read-only)

`apps/api-server/src/routes/platform/store-public/store-public-screen-set-resolve.ts`

- `parseSelectedProducts()` 가 `qrCodeId` 를 함께 파싱(프론트 계약과 동일 규칙 재확인).
- 신규 `resolveSelectedQrUrls()`:
  - `SELECT id, slug FROM store_qr_codes WHERE organization_id = $1 AND is_active = true AND id = ANY($2::uuid[])`
  - uuid 형식이 아닌 값은 조회 전 제거(캐스팅 오류 방지).
  - `buildScreenSetQrUrl(serviceKey, slug)` → 공개 절대 URL `https://{domain}/qr/{slug}`.
  - **SELECT 전용** — 직전 WO(`…QR-WRITE-BOUNDARY-FIX-V1`)의 "공개 경로 DB write 0" 계약 유지.
- 상품 record 에 `qrUrl` 을 additive 부여. 삭제·비활성·타 매장·미선택 → `null` → 표시 안 함(안전 제외).
- 상품 가시성 게이트(`queryTabletVisibleProducts` TABLET 채널 승인 등)·선택 순서 로직 **불변**.

태블릿 공개 runtime 과 `/qr/{slug}` 모바일 랜딩이 **이 resolver 하나를 공유**하므로 두 화면의 QR 표시가 구조적으로 동일하다.

---

## 4. 태블릿 · 모바일 표시

| 화면 | 파일 | 내용 |
|------|------|------|
| 태블릿 | `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | `DisplayProduct.qrUrl` 추가 · `mapSectionProduct` 가 carry · 상품 카드 하단 QR(64px) · 터치 시 **기존 코너 QR 확대 모달과 동일한 오버레이/스타일** 재사용(`productQrZoom`) |
| 모바일 | `services/web-kpa-society/src/pages/qr/PublicScreenSetViewer.tsx` | `ProductCard.qrUrl` 추가 · 동일한 카드 하단 QR + 확대 모달 |

- 카드 QR 터치는 `stopPropagation` — 상품 상세 진입과 분리된다.
- 모바일은 `QrImage` 를 `@o4o/tablet-kiosk-core` 에서 **재사용**(신규 export). `qrcode.react` 를 소비처에 재도입하지 않으므로 의존성 추가·설치 없음, 두 화면의 QR 렌더가 동일 구현이다.
- QR 이 없는 상품은 이전과 완전히 동일하게 렌더된다(추가 여백·빈 박스 없음).

---

## 5. DB · API 변경 여부

- **DB**: 테이블/컬럼/migration **0**. 저장은 기존 `store_tablet_screen_blocks.config` JSON 내부.
- **API**: 신규 엔드포인트 **0**. 기존 `GET /pharmacy/qr` 재사용, 공개 resolver 응답의 상품 record 에 `qrUrl` **1개 필드 additive**(미인식 소비처는 무시 → 회귀 0).
- QR 생성·slug 생명주기·archive/restore 로직 **미변경**.

---

## 6. 검증

| §검증 항목 | 결과 |
|------|------|
| 제품별 QR 선택·변경·해제 | ✅ 행별 `QR 선택/변경` + `QR 해제` + 모달 `QR 표시 안 함` — `withProductQr` 순수 함수 |
| 여러 제품에 서로 다른 QR | ✅ 값이 상품 ref 단위로 저장(공유 상태 없음) |
| 같은 QR 을 여러 제품에 | ✅ dedup 키는 상품(`type:id`)만 — QR 중복 제약 없음 |
| QR 미선택 제품 정상 표시 | ✅ `qrCodeId` 키 미저장 → `qrUrl=null` → QR 영역 자체 미렌더 |
| 비활성·삭제 QR 안전 미표시 | ✅ resolver 가 `is_active = true` + `organization_id` 로만 해석 → 그 외 `null` |
| 저장·재진입 시 선택 유지 | ✅ block config 왕복(`selectedProductsOf` ↔ `withSelectedProducts`)에서 보존 |
| 태블릿·모바일 동일 표시 | ✅ 같은 resolver 산출 `qrUrl` + 같은 `QrImage` 컴포넌트 |
| typecheck | ✅ `services/web-kpa-society` 0 error · `services/web-neture` 0 error |
| | ✅ `apps/api-server` — 총 19건 **전부 `src/scripts/*`(타 세션 작업, build tsconfig 제외)**, 내 변경 경로 0 |
| 공유 패키지(`screen-content-core`·`tablet-kiosk-core`·`tablet-screen-set-editor`) | ✅ source-only — 소비 앱 typecheck 로 검증(자체 typecheck 스크립트 없음) |
| 브라우저 스모크 | ⏸ 미실시(배포 전) — §7 |

---

## 7. 후속 · 실 스모크 필요 항목

1. 매장 제작기 → 상품 선택 → `QR 선택` 모달에 내 매장 활성 QR 목록 노출 → 지정 후 저장 → 재진입 시 유지.
2. 공개 태블릿 화면·`/qr/{slug}` 모바일 화면에서 동일 상품에 동일 QR 표시 + 확대 보기.
3. 지정한 QR 을 매장 QR 관리에서 비활성화 → 두 화면 모두 해당 상품 QR 미표시(오류 없이).
4. **범위 밖(설계상)**: 상품을 명시 선택하지 않은 legacy 모드(`legacy_tablet_displays`, 코너 진열 그대로)에는 편집기에 상품 행이 없어 QR 을 붙일 대상이 없다. WO §범위("선택값은 `product_list.config.selectedProducts` 에 저장")와 일치.
5. **기존 잔여**: 제작기 draft 미리보기(`POST /screen-sets/preview`)는 이전부터 `product_list` 섹션을 생략한다 → 미리보기에는 상품·상품 QR 이 보이지 않는다(이번 WO 로 생긴 회귀 아님, 직전 CHECK §5 잔여 항목과 동일).
