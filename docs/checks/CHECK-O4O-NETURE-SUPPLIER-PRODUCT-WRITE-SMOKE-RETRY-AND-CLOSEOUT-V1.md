# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-WRITE-SMOKE-RETRY-AND-CLOSEOUT-V1

- **WO**: WO-O4O-NETURE-SUPPLIER-PRODUCT-WRITE-SMOKE-RETRY-AND-CLOSEOUT-V1
- **일자**: 2026-08-12
- **판정**: **PASS (코드 변경 0건 — 실데이터 smoke 로 직전 HOLD 7항목 전부 CLOSE)**

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 HEAD | `a06d3cb252067cbaa2f7c651ebb636c04b1b13ba` |
| 작업 트리 | clean (다른 세션 dirty 파일 없음) |
| 회귀 방지 기준 수정 | `6d79a93fd` (WO-…-OFFER-UPDATE-PRIVATE-GATE-FIX-V1) — 본 WO 에서 **실데이터로 재검증만** 수행 |

## 2. 계정 · serviceKey 확인

| 항목 | 결과 |
|---|---|
| 계정 | `renagang21@gmail.com` (공급자 `(주)네뚜레 공급자 테스트`) |
| serviceKey | `neture` — UI 로그인 폼이 자동 전송 |
| UI 로그인 | PASS |
| `/supplier/dashboard` | PASS |
| `/supplier/products` | PASS |
| `/supplier/store-descriptions` | PASS |
| `/supplier/store-materials-status` | PASS |

> 직전 WO 의 "비밀번호 불일치" 판정은 오진이었다. 원인은 **serviceKey 없는 로그인 API 호출**이며,
> serviceKey 없는 curl 401 을 계정 실패로 판정하지 않는다. 비밀번호 원문은 본 문서에 기록하지 않는다
> (SSOT = `docs/local/TEST-ACCOUNTS.local.md`, gitignored).

## 3. 신규 상품 등록 — PASS

| 항목 | 값 |
|---|---|
| 상품명 | `[SMOKE] Neture Supplier Product Write Closeout` |
| offerId | `63d6960e-b1da-4e65-86e8-f5df1c35785f` |
| masterId | `9cd9288f-5368-49ef-b686-718c4bac9a0b` |
| supplierId | `91169739-6291-4bed-b1e9-b3d4a93d65eb` |
| 등록 직후 상태 | `is_active=false` / `is_public=false` / `distribution_type=PRIVATE` / `service_keys={}` / `allowed_seller_ids={}` |

## 4. 등록 직후 수정 저장 — PASS (회귀의 핵심)

- 공급가 `10,000 → 11,000` 저장 성공. 저장 시점 상태는 `PRIVATE` + `allowedSellerIds=[]` 그대로.
- DB 확인: `price_general = 11000`.
- 즉, `PRIVATE_REQUIRES_SELLER_IDS` 가 **순수 정보 수정을 더 이상 막지 않는다**는 계약이 실데이터로 확인됐다.
  (직전 CHECK 에서 HOLD 였던 항목)

## 5. PRIVATE 노출 차단 — PASS

- `is_active=f`, `is_public=f`, `distribution_type=PRIVATE`, `service_keys={}`.
- 소비 경로 필터 시뮬레이션(`distribution_type <> 'PRIVATE' OR $x = ANY(allowed_seller_ids)`)
  → `public_visible=f`, `passes_seller_filter=f`.
- 운영 HUB · 매장 노출 0건. 게이트 완화가 노출 차단을 약화시키지 않는다.

## 6. ProductMaster · offerId 연결 유지 — PASS

- offer ↔ master JOIN 정상 해석, `regulatory_type=GENERAL`.
- F12 불변식대로 **ProductMaster 는 Resource/Offer 를 모른다** — 단방향 참조 유지. 정책 변경 없음.

## 7. 매장용 설명서 draft 저장 — PASS

| 항목 | 값 |
|---|---|
| SPD id | `8c679422-8498-468d-8faa-b6f6ce71e5cb` |
| description_type | `STORE` |
| language | `ko` |
| source_type | `supplier` |

## 8. 검수 요청 — PASS

- `status = needs_review`, `submitted_at = 2026-08-12 02:25:17.052`.
- UI 토스트: "검수요청이 접수되었습니다 (한국어)".

## 9. store-materials-status 반영 — PASS

- 검수 대기 **1건** 으로 즉시 반영, 목록에 `· KO` 표기와 함께 노출.
- 철회 후 **0건** 으로 복귀.

## 10. 테스트 데이터 정리 — PASS (잔여 2건은 비노출 · 아래 §11 참조)

| 대상 | 처리 | 확인 |
|---|---|---|
| 설명서(SPD) | 철회 = soft delete | `deleted_at = 2026-08-12 02:26:56.560555` (status 는 `needs_review` 유지) |
| 상품(offer) | 목록 체크박스 → 일괄 삭제 → 확인 모달 | **행 자체 삭제(hard delete)** — `supplier_product_offers` 조회 0건, 해당 공급자 잔여 offer 0건 |
| 상품 목록 | — | "등록된 제품이 없습니다" / 전체 0 |
| 대시보드 카운터 | — | 등록 상품 0 · 판매 중 0 · 승인 완료 0 · 승인 대기 0 · 승인 미요청 0 |

**잔여 데이터 2건 (비노출 · 삭제하려면 DB write 승인 필요)**

1. `product_masters` 1행 — `[SMOKE] Neture Supplier Product Write Closeout` (status ACTIVE, orphan).
   공급자 UI 에 master 삭제 경로가 없고, DB 직접 삭제는 본 WO 금지 범위.
2. `shared_product_descriptions` 1행 — 위 SPD, `deleted_at` 설정된 soft delete 상태.

**노출 위험 재확인 (read-only)**: master 를 참조하는 18개 테이블 전수 조회 결과
`catalog_products / kpa_store_content_product_links / organization_product_listings / product_identifiers /
product_images / product_landings / service_products / store_cart_items / store_products /
store_product_description_selections / store_product_profiles / tablet_interest_requests` **모두 0건**.
offer 가 없으므로 어떤 소비 경로에도 나타나지 않는다.

## 11. HOLD

**신규 HOLD 없음.** WO §8 의 8개 HOLD 조건 중 어느 것도 발동하지 않았다.
§10 의 잔여 2건은 HOLD 가 아니라 **후속 정리 후보**다 (노출 0 · 삭제는 DB write 승인 필요).

**부수 관찰 (수정하지 않음)**: 상품 상세 Drawer 진입 시
`/api/v1/.../policies/offer/{offerId}` (스팟 정책) 가 이 공급자에게 **403** 을 반환한다.
UI 는 "이 상품의 스팟 정책을 볼 권한이 없습니다." 로 graceful degrade 하므로 기능 차단은 없다.
권한 축 판단이 필요하므로 본 WO(권한/role 변경 금지) 범위 밖 — 별도 WO 후보.

## 12. typecheck · build · deploy

| 항목 | 결과 |
|---|---|
| `pnpm --filter @o4o/web-neture typecheck` | PASS (exit 0) |
| `pnpm --filter @o4o/web-neture build` | PASS |
| api-server test/typecheck | **미실행** — api-server 코드 변경 0건 |
| API 배포 | **미수행** — API 코드 변경 0건 (WO §9 규정) |
| web 배포 | **미수행** — web 코드 변경 0건. 검증은 이미 배포된 프로덕션(neture.co.kr)에서 실데이터로 수행했다 |

## 13. commit SHA

- 본 CHECK 문서 커밋만 발생 (소스 변경 0건).

## 14. push 결과

- `main` push 완료 / `HEAD == origin/main`.

---

## 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건

- `docs/checks/CHECK-O4O-NETURE-SUPPLIER-OFFER-UPDATE-PRIVATE-GATE-FIX-V1.md` 는
  아직 "계정 자격증명 불일치" 로 HOLD 를 기록하고 있다(오진). 기록물(`docs/checks/`)은 §16-1 상
  인라인 정비 대상이 아니므로 **수정하지 않고 보고만** 한다. 정정 사실은 본 CHECK §2 에 남긴다.
