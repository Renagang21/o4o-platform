# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-CREATION-AND-DESCRIPTION-WRITE-SMOKE-BATCH-V1

- **WO**: WO-O4O-NETURE-SUPPLIER-PRODUCT-CREATION-AND-DESCRIPTION-WRITE-SMOKE-BATCH-V1
- **작업일**: 2026-08-12
- **판정**: **PASS_WITH_HOLD** — 상품 등록 · 설명서 draft 저장 · 검수요청 · 현황 반영은 실데이터로 통과. **상품 수정 저장은 백엔드 계약 불일치로 실패(HOLD)**, 수정요청·재요청은 operator 조작 필요(HOLD).

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 HEAD | `fdc4551c3` (== origin/main, worktree clean) |
| 커밋 시점 HEAD | 아래 §13 |

## 2. 사용한 공급자 계정

| 항목 | 값 |
|---|---|
| 계정 | `renagang21@gmail.com` (Neture 공급자2 · 테스트공급자) |
| 조직 | (주)네뚜레 공급자 테스트 (supplier / owner) |
| 로그인 | **UI 정상 로그인 성공** → `/supplier/dashboard` |
| SSOT | `docs/local/TEST-ACCOUNTS.local.md` (git 추적 제외) |

> **선행 CHECK 정정**: `CHECK-O4O-NETURE-SUPPLIER-MATERIALS-STATUS-AND-REALDATA-CLOSEOUT-BATCH-V1` §2-1 은
> 이 계정의 Neture 로그인이 401 이라 "토큰 주입 우회"를 썼다고 기록했으나, 본 배치에서 **UI 로그인이 정상 동작**했다.
> 우회 없이 전 과정을 수행했다.

## 3. 테스트 상품 확보 방식 (WO §6)

WO §6 우선순위 2번(신규 등록)을 택하되, **ProductMaster 신규 생성은 0건**이 되도록 설계했다.

- 기존 `[SMOKE]` 계열 ProductMaster(2026-07-14 선행 smoke 잔존)의 바코드 `8809178390621` 를 등록 폼에 입력 → 조회
- 폼이 **"기존 Master 발견: [SMOKE] 매장용 설명서 검증 상품"** 으로 응답하고 상품명 자동 입력
- 따라서 이번 등록은 **기존 master 연결(offer 신규 1건)** 이며 `product_masters` write 0건

| 항목 | 값 |
|---|---|
| 상품명 | `[SMOKE] 매장용 설명서 검증 상품` (WO §6 TEST 라벨 요건 충족) |
| 노출 위험 | 없음 — 생성 즉시 `isActive:false` · `distributionType:PRIVATE` · `approvalStatus:PENDING` (UI: "내부 상품 … HUB에 노출되지 않습니다") |

## 4. 상품 등록 · 수정 smoke 결과

| 단계 | 결과 | 근거 |
|---|:---:|---|
| ① 신규 등록 | **PASS** | `POST 201 /neture/supplier/products` · console error 0 |
| ② 이미지/상세 정보 입력 | **부분** | 간단 소개 입력·저장됨. 이미지 업로드는 미수행(테스트 잔여물 최소화) |
| ③ 상품 수정 저장 | **FAIL → HOLD** | `PATCH 400 /neture/supplier/products/{offerId}` · `PRIVATE_REQUIRES_SELLER_IDS` |

### ③ 근인 (확정)

- `createSupplierOffer` 는 신규 등록을 **항상** `isPublic:false` + `serviceKeys:[]` + `allowedSellerIds:[]` 로 만든다
  → `deriveDistributionType(false, [])` = `PRIVATE` (= UI 의 "내부 상품")
- `updateSupplierOffer` 는 저장 직전에 `distributionType === PRIVATE && allowedSellerIds.length === 0` 이면 무조건 거부
  (`apps/api-server/src/modules/neture/services/offer.service.ts:1283-1287`)
- 결과: **신규 등록 직후의 내부 상품은 공급 방식을 설정하기 전까지 어떤 수정도 저장할 수 없다** (가격·설명·활성화 포함)
- 프론트에서 우회 불가 — 백엔드가 `updates.isPublic` 유무와 무관하게 저장된 `offer.isPublic` 으로 `distributionType` 을 재파생한다
  (`offer.service.ts:1224`). 즉 payload 에서 `isPublic` 을 빼도 동일하게 400.

→ 수정에는 **분배 검증 계약 변경**이 필요하다. `NETURE-DISTRIBUTION-ENGINE-FREEZE-V1`(F8) 영역이고
WO §7 수정 허용 목록(UI 보완) 밖이며 CLAUDE.md 중지 조건("Frozen Baseline · 공통 계약 변경 필요")에 해당 → **HOLD**.

## 5. ProductMaster · offerId 연결 확인

| 항목 | 값 |
|---|---|
| offerId | `6e50d985-51f6-4fcb-a604-3624e5079d40` |
| masterId | `23f51f76-1dd9-463a-b35a-d352d7710794` (기존 master, barcode `8809178390621`, GENERAL/ACTIVE) |
| ProductMaster 신규 생성 | **0건** (기존 master 연결) |
| offerId → masterId 해석 | 정상 — 설명서 저장이 `OFFER_REQUIRED`/`MASTER_NOT_LINKED` 없이 통과 |

## 6. 매장용 설명서 draft 저장 결과

| 항목 | 값 |
|---|---|
| 진입 경로 | 상품 등록 완료 패널 CTA `매장용 상품 설명서 작성` → `/supplier/store-descriptions` (편집기 자동 오픈, query 소거) |
| API | `POST 201 /neture/supplier/store-descriptions` |
| descriptionId | `f2b153c5-27b9-439f-964d-420a59436dfb` |
| 결과 | `status:draft` · `submittedAt:null` · language `ko` |

> Batch 1 의 CTA 보완과 Batch 2 의 언어 칩(KO/EN/中文/日本語)이 **실데이터로 함께 확인**됐다.

## 7. 검수 요청 결과

| 항목 | 값 |
|---|---|
| API | `POST 201 /neture/supplier/store-descriptions` (동일 행 갱신) |
| 결과 | `status:needs_review` · `submittedAt:2026-08-12T00:40:33.124Z` |
| 목록 뱃지 | `검수 대기` 로 전환 확인 · console error 0 |

## 8. 수정 요청 · 재요청 확인 결과 → **HOLD**

- `revision_requested` 로의 전이는 **operator 검수 화면 조작**이 필요하다 → WO §8 HOLD 조건 해당. 실행하지 않았다.
- 대신 공급자 측 렌더 경로를 정적으로 확인했다
  (`services/web-neture/src/pages/supplier/SupplierStoreDescriptionEditorDrawer.tsx:220,307-310`):
  - `운영자가 수정을 요청했습니다 · {revisionDueAt}까지 재요청` 배너
  - `사유: {reviewNote}` 표시
  - `수정 후 다시 검수 요청하세요. 기한이 지나면 이 설명서는 자동 삭제됩니다.` 안내
  - 재요청 = 동일 `검수요청` 버튼(`submit:true`) 재사용, 철회 가능 상태에 `revision_requested` 포함
- 상태 라벨은 목록·현황·대시보드 3곳 모두 `수정 요청` 으로 정합.

## 9. store-materials-status 반영 결과

| 시점 | 검수 대기 | 신규 행 |
|---|:---:|---|
| 검수요청 직후 | **1** | `매장용 상품 설명서 / [SMOKE] 매장용 설명서 검증 상품 · KO / 검수 대기 / 2026.08.12` |
| 철회 후 | **0** | 제거됨 |

기존 `hidden` 10건·태블릿 `보관` 2건은 전 과정에서 변동 없음.

## 10. 생성 데이터와 rollback · 정리 방법

| 대상 | id | 정리 결과 |
|---|---|---|
| 설명서 | `f2b153c5-27b9-439f-964d-420a59436dfb` | **철회 완료** — 편집 Drawer `철회` 버튼 → `DELETE /neture/supplier/store-descriptions/{id}` (softDelete) |
| offer | `6e50d985-51f6-4fcb-a604-3624e5079d40` | **삭제 완료** — `/supplier/products` 선택 → `일괄 삭제` → `DELETE 200 /neture/supplier/products/bulk` |
| ProductMaster | `23f51f76-…` | **미생성·미변경** (기존 행 연결만) |
| 기존 운영 데이터 | — | **무손상** (기존 hidden 설명서 10건 / 태블릿 2건 그대로) |

정리 후 `/supplier/products` = 전체 **0**, `/supplier/store-materials-status` 카운터 전부 **0**.

> 참고: 공급자 `일괄 삭제`는 `offerRepo.remove()` = **물리 삭제**다(엔티티에 `@DeleteDateColumn` 이 있어도 `remove()` 는 soft 가 아니다).
> operator cleanup 경로(`/operator/product-cleanup/recycle-bin`)의 휴지통·복원 정책과 어긋난다 → §11-b 참조.

## 11. HOLD 항목

| # | 항목 | 사유 |
|---|---|---|
| a | 상품 수정 저장 (`PRIVATE_REQUIRES_SELLER_IDS`) | 등록 계약(PRIVATE + sellerIds 비움)과 수정 검증이 충돌. F8 Distribution Engine 계약 변경 필요 → 별도 WO |
| b | 공급자 `일괄 삭제` 물리 삭제 | `remove()` 사용으로 휴지통 복원 정책과 불일치. 백엔드 삭제 계약 변경 필요 → 별도 WO |
| c | 수정 요청 · 재요청 실데이터 | operator 검수 화면 조작 필요 (WO §8) |
| d | `GET 403 /neture/supplier/spot-policies/offer/{id}` | 공급자가 자기 offer 의 스팟 정책을 못 본다. UI 는 "권한이 없습니다"로 정상 처리(4상태 준수). 권한 변경은 WO §3 금지 |

## 12. 수정 내용 (WO §7 범위)

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx` | 저장 실패 시 백엔드 error code 원문(`PRIVATE_REQUIRES_SELLER_IDS` 등)을 그대로 노출하던 것을 조치 가능한 한국어 안내로 매핑. 미등록 코드는 원문 유지(진단 가능성 보존) |

WO §7 의 나머지 항목(링크·CTA·deep link·실패/empty 분리)은 Batch 1·2 에서 이미 반영돼 이번 배치에서 추가 수정 없음.

## 13. smoke 결과 (WO §9)

| route | blank | console error | API 4xx/5xx |
|---|:---:|:---:|:---:|
| `/supplier/dashboard` | 없음 | 0 | 0 |
| `/supplier/products` | 없음 | 0 | 0 |
| `/supplier/products/new` | 없음 | 0 | 0 |
| `/supplier/products/import-assistant` | 없음 | 0 | 0 |
| `/supplier/store-descriptions` | 없음 | 0 | 0 |
| `/supplier/store-materials-status` | 없음 | 0 | 0 |
| `/supplier/tablet-screen-sets` | 없음 | 0 | 0 |
| `/supplier/signage` | 없음 | 0 | 0 |
| 상품 상세 Drawer | 없음 | 1 (403 spot-policies · §11-d) | 403 1건 (UI 정상 처리) |

- legacy · dead CTA: **0**
- QR · 태블릿 **직접 적용** UI: **없음** — 전 화면이 "실제 적용 여부와 적용 위치는 매장 경영자가 선택합니다" 문구 유지
- 상품 → 매장용 설명서 이동: **가능** (등록 완료 CTA · 상품 상세 Drawer `이 상품의 매장용 설명서 작성` 둘 다 실데이터 확인)

## 14. typecheck · build · deploy · commit · push

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` (web-neture) | **PASS** (0 error) |
| `npm run build` (web-neture) | **PASS** (41.64s) |
| api-server | **변경 없음** → 배포하지 않음 |
| 배포 | web-neture 만 (CI `detect-changes`) |
| commit / push | 아래 커밋 참조 |

## 15. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(§11-a, §11-b)

- 발견: 선행 CHECK(`…MATERIALS-STATUS-AND-REALDATA-CLOSEOUT…`) §2-1 의 "Neture 공급자 UI 로그인 401" 기록이 현재 사실과 다름.
  기록물(`docs/checks/`)은 §16-1 상 인라인 정비 대상이 아니므로 **수정하지 않고 본 문서 §2 에 정정 기록**만 남겼다.
