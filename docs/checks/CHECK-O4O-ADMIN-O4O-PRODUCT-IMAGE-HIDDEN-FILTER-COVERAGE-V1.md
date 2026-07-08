# CHECK-O4O-ADMIN-O4O-PRODUCT-IMAGE-HIDDEN-FILTER-COVERAGE-V1

Status: DONE — 숨긴 이미지(product_images.deleted_at) read path 전수 조사 + 최소 수정 (2026-07-08)
WO: `WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-HIDDEN-FILTER-COVERAGE-V1`
선행: `WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-SOFT-DELETE-RESTORE-V1`(soft delete/복원 완료) · `...-IMAGE-ACTION-V1`(추가/대표) · `...-IMAGE-ACTION-DESIGN-V1`

Scope: **read path 전용.** 숨긴 이미지(`deleted_at IS NOT NULL`)가 대표/gallery/count/EXISTS/fallback/OCR/Store 등 모든 조회 경로에서 제외되는지 조사하고 실제 누출만 최소 수정. **본 WO로 Product Image Management Phase 1 종료.**

---

## 1. 핵심 안전 모델 (invariant)

`product-master-image.controller.ts` 의 숨김(soft delete) action 은 **숨길 때 `isPrimary = false` 로 함께 clear** 한다 (line 274: `{ deletedAt, deletedBy, isPrimary: false, ... }`). 대표를 숨기면 남은 active 중 다음(sortOrder ASC)이 자동 승계.

→ **불변식: 숨긴 이미지는 절대 `is_primary = true` 가 아니다.**

이 불변식 때문에 조회 경로의 안전성이 갈린다:

- **`is_primary = true` 로만 조회하는 경로 (class B)** → 불변식으로 자동 안전 (숨긴 이미지는 매칭 불가).
- **`is_primary` 필터 없이 count / EXISTS / gallery / fallback(ORDER BY LIMIT 1) 하는 경로 (class C/D/E/F)** → 숨긴 이미지가 그대로 누출 → **수정 필요.**

---

## 2. 전수 조사 결과 (product_images 조회 31파일 grep)

### 이미 안전 (Class A — `deleted_at IS NULL` 이미 존재, 선행 WO 처리)
| 경로 | 종류 |
| --- | --- |
| product-library.controller.ts:47 / :100 | 공유 상세 대표+gallery |
| product-ocr.service.ts:80 | OCR gallery (is_primary=false + deleted_at) |
| product-image-quality.service.ts:52 | 이미지 상태 뷰 |
| product-master-audit-log.service.ts:88 | 작업 이력 |
| store-product-library.controller.ts:134 / :387 | 매장 상품 목록 대표 + 상세 gallery |
| product-master-image.controller.ts (admin CRUD) | 숨김 포함 **의도적**(복원 UI). 변경 없음 |

### Class B — `is_primary = true` 만 조회 → 불변식으로 안전, 수정 없음
StoreConsoleController:369 · ProductConsoleController:109 · store-product-library:320 · product-pop-pdf.controller:80 · neture.routes:424/479/537 · inventory.service:22/41 · offer.service:746/1541/1778/1951 · offer-service-approval:266 · seller.service:73/203 · supplier-order.service:127 · partner.service:170
→ 숨김 시 `is_primary=false` 이므로 대표 조회에 숨긴 이미지가 나오지 않음. **defense-in-depth 로 `deleted_at IS NULL` 추가는 후속(선택)** — §7 원칙(Offer/PDF/shared 무리한 확대 금지)에 따라 이번 미포함.

---

## 3. 수정한 경로 (14건 / 7파일) — 실제 누출

### Class F (fallback: `ORDER BY is_primary DESC … LIMIT 1`, is_primary 필터 없음)
활성 대표가 없으면 숨긴 이미지를 대표처럼 집어옴 → **가장 위험**.
| 파일:행 | 수정 |
| --- | --- |
| pharmacy-products.controller.ts:162 | `AND pi.deleted_at IS NULL` (약국 카탈로그/홈 피드 카드) |
| store-handled-products.routes.ts:106 | `AND pi.deleted_at IS NULL` (취급제품 통합뷰 listing) |
| store-product-library.controller.ts:589 | 대표 삭제 후 승계 subquery `AND deleted_at IS NULL` (숨긴 이미지 대표 승격 차단 → 불변식 보호) |

### Class E (gallery: is_primary 필터 없이 전 이미지 나열)
| ProductConsoleController.ts:269 | operator 콘솔 상품 상세 이미지 목록 `AND deleted_at IS NULL` |

### Class D (EXISTS: 숨긴 이미지만 있어도 "이미지 있음" 처리)
| offer.service.ts:1334 | 완성도 점수 EXISTS |
| offer.service.ts:1419 / :1421 | `hasImage` 필터 EXISTS / NOT EXISTS |
| offer-service-approval.service.ts:177 / :256 | 완성도 점수 EXISTS |
| ProductConsoleController.ts:130 | 콘솔 통계 `with_image` EXISTS |

### Class C (COUNT: 숨긴 이미지 과다 집계 / 자동대표 결정 오류)
| store-product-library.controller.ts:322 | 매장 상품 목록 `imageCount` |
| store-product-library.controller.ts:485 | 매장 업로드 자동대표 결정 COUNT (숨김 포함 시 no-active-primary 유발) |
| offer-service-approval.service.ts:271 | 검수 큐 `imageCount` |
| product-import-common.service.ts:209 | import 자동대표 결정 COUNT (동일 no-active-primary 방지) |

수정 형태는 전부 최소 — 기존 조건에 `AND deleted_at IS NULL` 만 추가 (§6 원칙).

---

## 4. 수정 불필요 / 의도적 제외

| 경로 | 사유 |
| --- | --- |
| csv-import.service.ts:1180 | orphan master **삭제 대상** gcs_path 수집 → CASCADE 로 사라질 대상이므로 숨김 포함이 정상 |
| shared-product-description.service.ts:567 | `WHERE id = $1` 특정 thumbnailImageId 단건 조회. gallery/count/exists/fallback 누출 클래스 아님. SPD 썸네일이 숨김 이미지를 가리킬 edge → **후속 분리**(§7) |
| store-product-library.controller.ts:468/542/569 | 매장 자체 이미지 CRUD by-id/by-type. 대상 id 는 이미 `deleted_at IS NULL` 필터된 목록(:387)에서 선택 → 숨긴 이미지 미노출 |
| store-product-library **hard delete**(:472/:578) | 매장 측 레거시 hard-delete 이미지 관리(별도 메커니즘). §3 hard delete 무접촉 |

---

## 5. 후속 WO 분리 (§7)

무리하게 확대하지 않고 CHECK 기록만:
- **Class B defense-in-depth**: Offer/PDF/seller/partner/inventory/neture.routes 의 `is_primary=true` 대표 조회에 `deleted_at IS NULL` 추가(불변식으로 현재 안전, 명시화만). 
- **SPD 썸네일**: `shared-product-description.service.ts:567` 단건 조회에 숨김 반영 여부.
- 위 2건은 실사용 노출 없음 → Phase 2 로 분류.

---

## 6. 검증

### typecheck / build
- `apps/api-server` : 수정 7파일 **에러 0** (tsc). 잔여 tsc 에러는 전부 `src/scripts/drug-otc-*`(병렬 세션 커밋, 무접촉)이며 `tsconfig.build.json` 이 `src/scripts/**/*` 제외 → 프로덕션 build 영향 없음.
- `pnpm run build` (tsc -p tsconfig.build.json) : **EXIT 0**.
- `git diff --check` : CLEAN.

### 코드 경로 정적 검증 (숨긴 이미지 제외 확인)
| 검증 | 결과 |
| --- | --- |
| 대표 조회 | is_primary=false 불변식 + fallback 3건 `deleted_at IS NULL` → 숨긴 대표 미노출 |
| gallery | ProductConsole:269 / product-library / store-library 전부 `deleted_at IS NULL` |
| count | store-library:322/485 · offer-approval:271 · import:209 제외 적용 |
| EXISTS | offer.service ×3 · offer-approval ×2 · ProductConsole ×1 제외 적용 |
| OCR | product-ocr.service:80 기존 `deleted_at IS NULL` (변경 불필요) |
| Product Library | product-library.controller 기존 `deleted_at IS NULL` |
| Store Product | store-product-library 목록/상세/count/승계 모두 제외 적용 |

> smoke: 본 WO 는 read-path 정적 커버리지 수정으로, 정적 경로 검증 + build 통과로 확정. 실 브라우저 숨김→대표승계→gallery/count 확인은 선행 SOFT-DELETE-RESTORE WO 에서 완료된 write action 위에서 동작.

---

## 7. 산출물 / 완료 기준

| 항목 | 결과 |
| --- | --- |
| 조사 경로 | product_images 조회 31파일 전수 |
| 수정 경로 | 14건 / 7파일 (Class C/D/E/F) |
| 수정 불필요 | Class A(선행 처리) + Class B(불변식) + cleanup/by-id |
| 후속 분리 | Class B defense-in-depth · SPD 썸네일 |
| DB write / migration | **0** |
| ProductMaster / schema / 대표정책 / audit | 무변경 |
| typecheck / build / diff --check | 통과 |

---

## 8. 완료 선언

**Product Image Management Phase 1 완료.**

남는 작업 = Image Replace · Thumbnail Sync · AI Image · External Import → 전부 **Phase 2 이상**.
Class B defense-in-depth 및 SPD 썸네일 edge 도 Phase 2 로 분류.
