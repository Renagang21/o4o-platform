# CHECK-O4O-SCREEN-SET-RESOLVER-CONTENT-SOURCE-SEAM-V1

> WO: `WO-O4O-SCREEN-SET-RESOLVER-CONTENT-SOURCE-SEAM-V1`
> 성격: 리팩터(경계 분리) — `resolveScreenSetSections`의 화면 구성 책임은 유지, `content_list` **원본 조회**만 명시적 adapter 경계로 분리.
> Date: 2026-07-20

---

## 0. 결론

`content_list` 카드의 **원본 조회**(store_content / o4o_product_description DB 조회)를 `ContentSourceAdapter` 계약으로 분리하고, 기존 조회 구현을 **기본 Store Adapter**(`createStoreContentSourceAdapter`)로 그대로 이동했다. resolver(`resolveScreenSetSections` / `resolveContentListItems`)는 **화면 구성**(블록 정렬·표시·상품·idle·QR + content_list 의 visible/순서/override/카드 조립)만 담당한다. 응답·공개 렌더 **불변**.

- adapter 없는 묵시적 DB fallback 없음 — 4개 호출부(공개 태블릿 / Screen Set QR / draft preview / 관리자·매장 미리보기)가 기본 Store Adapter 를 **명시 주입**.
- DB 조회 SQL·파라미터 순서 **byte-equivalent**(그대로 이동). 신규 테이블·컬럼·migration·데이터 write 0.

---

## 1. 조사한 resolver 의존성 (실행 1)

`resolveScreenSetSections`(store-public-screen-set-resolve.ts) 책임 구분:

| 책임 | 처리 | 이번 WO |
|------|------|:------:|
| 블록 정렬·is_visible·section 구성 | resolver 루프 | 유지 |
| 상품 목록(product_list, supplier+local gate) | `queryTabletVisibleProducts`/`resolveScreenSetLocalProducts` | 유지 |
| 대기 화면(idle_media) | `resolveTabletIdleItems` | 유지 |
| QR(qr_guide) URL 서버 도출 | `buildScreenSetQrUrl` | 유지 |
| 정적 텍스트(corner_description 등) | `shapeStaticBlock` | 유지 |
| **content_list 원본 조회** | `resolveContentListItems` → **resolveO4oItem/resolveStoreItem DB 조회** | **← adapter 분리 대상** |

호출부(2 함수, 코드 3곳):
- `resolveScreenSetSections`: 공개 태블릿 `store-public-tablet.handler.ts:515` · Screen Set QR `store-qr-landing.controller.ts:336`.
- `resolveContentListItems`(직접): draft/관리자·매장 preview `store-tablet.routes.ts:1481`.

## 2. 분리한 adapter 계약 (실행 3)

`store-public-tablet-content-source.ts`(신규):
```ts
interface ResolvedSourceContent { itemId; sourceBadge; baseTitle; baseSummary; thumbnailUrl; hasDetail; relatedProductName; detail:{html} }
interface ContentSourceAdapter {
  fetchProductDescription(masterId, language): Promise<ResolvedSourceContent | null>;  // o4o_product_description(SPD STORE canonical)
  fetchStoreContent(organizationId, contentId): Promise<ResolvedSourceContent | null>; // store_content(kpa_store_contents)
}
```
- 반환 `null` = 미존재 / 접근 불가(타 org·archived·설명 없음) → resolver 가 item skip. **누락 처리 방식 불변**.
- `displayTitle/displaySummary` override·`visible`·순서 적용은 **resolver(resolveContentListItems)** 에 유지(원본 조회만 분리).

## 3. 기본 Store Adapter (실행 4)

`createStoreContentSourceAdapter(dataSource)` — 기존 `resolveO4oItem`/`resolveStoreItem` 의 DB 조회를 **그대로 이동**:
- o4o: `product_masters` + LATERAL `shared_product_descriptions`(STORE·canonical·deleted_at IS NULL, language 우선→ko fallback). SQL·`$1`(masterId)/`$2`(language) 동일.
- store: `kpa_store_contents` (id + organization_id, workspace_status≠archived). SQL·파라미터 동일.
- 정규화 형태(itemId/badge/baseTitle/baseSummary/hasDetail/relatedProductName/detail.html) = 기존 카드에서 override 적용 직전 값.

## 4. 전환한 호출부 (실행 5)

| 호출부 | 파일 | 주입 |
|--------|------|------|
| 공개 태블릿 Screen Set | store-public-tablet.handler.ts | `resolveScreenSetSections(ds, input, createStoreContentSourceAdapter(ds))` |
| Screen Set QR | store-qr-landing.controller.ts | 동일 |
| draft/관리자·매장 preview | store-tablet.routes.ts | `resolveContentListItems(createStoreContentSourceAdapter(ds), org, config)` (루프 前 1회 생성) |

`resolveScreenSetSections(dataSource, input, contentSource)` · `resolveContentListItems(source, org, config)` — adapter **필수 인자**(묵시적 fallback 없음).

## 5. sections 전후 동등성 (실행 2·6)

- **byte-equivalent by construction**: DB SQL·파라미터·정규화 로직 그대로 이동, 카드 조립은 `title: displayTitle ?? baseTitle` 등 기존과 동일.
- **단위 테스트 5 PASS**(`__tests__/store-public-tablet-content-resolve.test.ts`, mock adapter): 잘못된 config→[] · visible=false 제외 · sortOrder 정렬 · displayTitle/displaySummary override(있으면 우선/없으면 baseTitle) · 미존재(null) skip+나머지 유지 · sourceType→adapter 메서드 라우팅+org 전달.
- 인접 회귀: `store-public-tablet-screen`·`store-tablet-idle-block` 18 PASS.

## 6. 프로덕션 검증 (실행 8) — DEFERRED (API 배포 후 수행)

- [ ] 공개 태블릿 `/:slug/tablet/screen` content_list 카드(제목·요약·순서·표시·detail html) 불변.
- [ ] Screen Set QR `/qr/public/:slug` content_list 동일 소스·동일 카드.
- [ ] 제작기 draft preview(POST /screen-sets/preview) content_list 정합(저장 후 공개와 동일).
- [ ] 보호 샘플(구강/피부) sections·상품 집합 불변. console/pageerror/예상 외 API 오류 0.

## 7. 변경 파일 (실행 10)

```
apps/api-server/src/routes/platform/store-public/store-public-tablet-content-source.ts   (신규 adapter 계약 + 기본 Store Adapter)
apps/api-server/src/routes/platform/store-public/store-public-tablet-content-resolve.ts   (원본 조회 위임, 화면 구성만 유지)
apps/api-server/src/routes/platform/store-public/store-public-screen-set-resolve.ts       (contentSource 주입 파라미터)
apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts           (기본 adapter 주입)
apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts           (기본 adapter 주입)
apps/api-server/src/routes/platform/store-tablet.routes.ts                                (preview 기본 adapter 주입)
apps/api-server/src/routes/platform/store-public/__tests__/store-public-tablet-content-resolve.test.ts (신규 5 테스트)
```
- **DB·migration·데이터 write 0**. API 응답 필드·상품/코너/QR resolver 무변경.

## 8. 중지 조건 점검

| 조건 | 발생? |
|------|:-----:|
| adapter 분리 위해 API 응답 계약 변경 필요 | ❌ (응답 필드 불변) |
| 상품·코너·QR resolver 재작성 필요 | ❌ (content_list 원본 조회만) |
| 일부 호출부가 adapter 없이 묵시적 DB 조회 요구 | ❌ (3 코드 호출부 모두 명시 주입) |
| 추출 전후 sections 상이 | ❌ (byte-equivalent·테스트 5 PASS) |
| 운영자·공급자 미래 요구 추정 미사용 추상화 | ❌ (Store Adapter 1개만, 실사용) |

## 9. 완료 기준 대비

| 기준 | 상태 |
|------|------|
| 화면 구성 로직 / 원본 조회 로직 분리 | ✅ |
| 기본 Store Adapter 가 기존 조회 결과 완전 유지 | ✅ (byte-equivalent) |
| content_list 순서·표시·제목·요약 override 불변 | ✅ (테스트 5) |
| 누락 콘텐츠 처리 방식 불변 | ✅ (null → skip) |
| 타블렛·Screen Set QR 동일 resolver 사용 | ✅ |
| draft preview·공개 결과 정합 | ⏳ (프로덕션 검증 §6 DEFERRED) |
| console·pageerror·API 오류 0 | ⏳ (§6) |
| DB·migration·데이터 write 0 | ✅ |
