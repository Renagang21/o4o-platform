# CHECK-O4O-SCREEN-SET-PREVIEW-PRODUCT-PARITY-V1

> WO: `WO-O4O-SCREEN-SET-PREVIEW-PRODUCT-PARITY-V1`
> 목표: Screen Set 제작기 미리보기에서도 **실제 태블릿 화면과 동일하게** 선택 상품과 상품별 QR 을 표시한다.
> 신규 DB·migration·엔드포인트 **없음**. 기존 API 계약 파기 없음 → §중지 조건 미해당.

---

## 1. 재사용한 resolver (판정 로직 복제 0)

공개 resolver 안에 인라인으로 있던 **명시 선택 상품 branch** 를 그대로 들어올려 export 함수 1개로 만들었다.

`apps/api-server/src/routes/platform/store-public/store-public-screen-set-resolve.ts`

```ts
export async function resolveSelectedProductListSection(
  dataSource: DataSource,
  ctx: { organizationId; storeId; serviceKey; storeSlug: string | null; tabletId?: string | null },
  config: unknown,
): Promise<SelectedProductListSectionData | null>   // null = 명시 선택 없음(legacy)
```

| 소비처 | 경로 |
|--------|------|
| 공개 태블릿 runtime | `GET /:slug/tablet/screen` → `resolveScreenSetSections` |
| QR 모바일 랜딩 | `GET /qr/public/:slug` → `resolveScreenSetSections` |
| **제작기 draft 미리보기(신규)** | `POST /screen-sets/preview` |

- 내부 로직(`parseSelectedProducts` · `queryTabletVisibleProducts` 게이트 교집합 · `resolveSelectedLocalProducts` · `resolveSelectedQrUrls` · 선택 순서 보존)은 **한 글자도 바뀌지 않았다** — 위치만 이동.
- **SELECT 전용** — 직전 WO(`…QR-WRITE-BOUNDARY-FIX-V1`)의 "공개 경로 DB write 0" 계약 유지.
- 미리보기 전용 상품 판정 코드는 **0줄**(WO §원칙).

## 2. 미리보기 응답 변경

`apps/api-server/src/routes/platform/store-tablet.routes.ts` (`POST /screen-sets/preview`)

```diff
- } else if (bt === 'product_list') {
-   // 뷰어가 fetchProducts 로 상품을 별도 표시 → preview sections 에서 생략.
-   continue;
+ } else if (bt === 'product_list') {
+   const selectedData = await resolveSelectedProductListSection(dataSource, { … }, config);
+   if (selectedData) sections.push({ blockType: bt, sortOrder: order++, data: selectedData });
```

- store 스코프(`serviceKey`/`storeSlug`)는 **공개 경로와 같은 출처**인 `platform_store_slugs`(store_id + is_active)에서 도출한다 → 미리보기와 공개 화면의 상품 스코프가 구조적으로 동일. 행이 없으면 기본 `kpa`, slug `null`(안전). 조회는 `product_list` 블록이 있을 때만 1회.
- `storeId = organizationId`(KPA 규약, 공개 경로와 동일). `tabletId = null` — 선택 모드는 코너 진열로 집합을 좁히지 않으므로 결과에 영향 없음.
- **legacy 모드(`legacy_tablet_displays`)** 는 함수가 `null` 을 반환 → 기존과 동일하게 섹션 생략(뷰어가 `fetchProducts` 로 표시). 회귀 0.

### 응답 필드(공개·미리보기 공통, additive)

| 필드 | 의미 |
|------|------|
| `products` | 선택 순서 그대로. 각 record 에 `qrUrl`(선택한 **활성** QR 만, 없으면 `null`) |
| `selectionMode: 'selected'` | kiosk 가 자체 조회 대신 이 목록을 쓰도록 하는 기존 표식 |
| `localProductsEndpoint` | 기존 |
| `selectedCount` / `excludedCount` | **신규 additive** — 저장된 선택 수 / 노출 게이트에서 제외된 수(편집기 안내용). 미인식 소비처는 무시 |

신규 엔드포인트·필드 제거·shape 변경 없음 → 기존 API 계약 파기 없음.

## 3. 상품·QR parity

| 지점 | 처리 |
|------|------|
| 상품 집합 | 공개와 동일한 `queryTabletVisibleProducts` TABLET 노출 게이트 통과분과 선택 목록의 **교집합** |
| 순서 | 저장된 선택 순서(supplier/local 혼합) 그대로 |
| 상품별 QR | 동일한 `resolveSelectedQrUrls` — `organization_id` + `is_active = true` 만. 비활성·삭제·타 매장 QR → `qrUrl=null` → 미리보기에서도 미표시 |
| 렌더 | 미리보기도 `TabletKioskPage`(태블릿) / 동일 sections(모바일) → 카드 QR·확대 모달 동일 컴포넌트 |

`packages/tablet-kiosk-core/src/TabletKioskPage.tsx`

- 상품 로드 우선순위를 교정: `selectedSectionProducts` → `previewLayoutOnly` 순.
  `previewLayoutOnly`(레이아웃 전용 미리보기)는 "적용 코너가 없어 진열 상품 문맥이 없다"는 이유였는데, **명시 선택은 코너 문맥이 필요 없다**(제작자가 직접 고른 목록) → 선택이 있으면 미리보기에도 실제와 동일하게 표시.
  선택이 없는 legacy 문맥에서는 기존대로 골격(상품 0) 유지 → 기존 UX 회귀 0.
- 상품 로드 effect 의 내용 key 에 `qrUrl` 포함 → **QR 만 바꿔도** 미리보기에 즉시 반영.

## 4. 편집기 안내 (게이트 제외 수)

`packages/tablet-screen-set-editor/src/index.tsx`

- 미리보기 캡션이 선택 모드일 때 `직접 선택한 상품 N개를 실제 화면과 같은 순서·QR 로 표시합니다.` 로 바뀐다(legacy 는 기존 문구 유지).
- `excludedCount > 0` 이면 하단에 안내 배너:
  `선택한 상품 중 N개는 현재 매장 노출 조건(판매 승인·활성 여부 등)을 만족하지 않아 미리보기와 실제 화면 모두에서 표시되지 않습니다.`
  → WO §원칙 "게이트에서 제외된 상품은 미리보기에서도 제외하되, 가능하면 편집기에 제외 수를 안내" 충족.

## 5. DB · API 변경 여부

- **DB**: 테이블/컬럼/migration **0**. 신규 쿼리는 기존 `platform_store_slugs` SELECT 1건뿐.
- **API**: 신규 엔드포인트 **0**. 기존 `POST /screen-sets/preview` 응답의 `sections` 에 `product_list` 가 포함될 수 있고, 상품 섹션에 `selectedCount`/`excludedCount` 가 additive 로 추가된다.
- 공개 경로 **DB write 0** 유지.

## 6. 검증

| §검증 항목 | 결과 |
|------|------|
| 선택 상품이 제작기 미리보기에 표시 | ✅ preview 가 `product_list` 섹션 반환 + kiosk 가 `selectionMode='selected'` 소비(`previewLayoutOnly` 보다 우선) |
| 상품 순서 일치 | ✅ 공용 함수의 선택 순서 보존 로직 그대로(공개와 동일 코드) |
| 상품별 QR 표시 | ✅ 동일 `qrUrl` 산출 + 동일 `QrImage` 렌더 |
| 비활성 QR 미표시 | ✅ `is_active = true` + `organization_id` 로만 해석 → 그 외 `null` |
| 태블릿·모바일·미리보기 결과 일치 | ✅ 세 경로 모두 `resolveSelectedProductListSection` 단일 산출 |
| 상품 없는 Screen Set 정상 | ✅ 선택 없음 → `null` → 기존 생략 경로(legacy) 그대로 |
| typecheck | ✅ `services/web-kpa-society` 0 · `services/web-neture` 0 |
| | ✅ `apps/api-server` 총 19건 **전부 `src/scripts/*`(타 세션, build tsconfig 제외)** — `nonScript=0` |
| 공유 패키지(`tablet-kiosk-core`·`tablet-screen-set-editor`) | ✅ source-only — 소비 앱 typecheck 로 검증 |
| 브라우저 스모크 | ⏸ 미실시(배포 전) — §7 |

## 7. 후속 · 실 스모크 필요 항목

1. 매장 제작기에서 상품 선택 + QR 지정 → 저장 전 미리보기(오른쪽 패널·크게 보기 모달 둘 다)에 상품·QR 표시 확인.
2. 저장 후 실제 태블릿 화면 / `/qr/{slug}` 모바일과 상품 순서·QR 이 동일한지 대조.
3. 지정 QR 비활성화 → 미리보기·실화면 모두 해당 상품 QR 미표시.
4. 노출 게이트 미충족 상품 포함 시 편집기 안내 배너의 수치 확인.
5. **범위 밖(설계상)**: legacy 상품 모드는 코너 진열에 의존하므로 미리보기에서는 여전히 상품을 표시하지 않는다(WO §원칙 "legacy 상품 모드의 기존 동작은 유지").
