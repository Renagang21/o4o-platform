# CHECK-O4O-EASY-DRUG-INFO-IMAGE-COPY-DRYRUN-V1

> **작업명**: WO-O4O-EASY-DRUG-INFO-IMAGE-COPY-TO-PRODUCTIMAGE-V1 (1단계 — read-only 조사·dry-run)
> **일자**: 2026-07-04 · **성격**: read-only 조사 CHECK — 코드/DB/migration/GCS write 0. 산출물 = 본 문서 1개. **apply·GCS copy 미실행.**
> **선행**: `CHECK-O4O-DRUG-REPRESENTATIVE-PRODUCT-GROUPING-DRYRUN-V1`(대표상품 64,672 완주), `CHECK-O4O-EASY-DRUG-INFO-SHARED-DESCRIPTION-DERIVATION-DRYRUN-V1`(설명 파생), `CHECK-O4O-EASY-DRUG-INFO-CANDIDATE-TO-MASTER-DRUGEXTENSION-DESIGN-V1 §8`(이미지 설계).
> **목적**: e약은요 외부 이미지 URL 을 O4O GCS 로 복사 → ProductImage 생성 → RepresentativeProduct.thumbnail_image_id 연결하기 위한 **운영 실측 + 다운로드 검증 + 설계 고정**. **이미지는 SKU(19,431)가 아니라 itemSeq/대표상품(2,789) 단위 1장.**

---

## 1. 한 줄 결론

**이미지 보유 e약은요 itemSeq 2,789개가 대표상품 2,789건과 100% 매칭되며, 외부 URL(nedrug.mfds.go.kr, JPEG, 200 OK)은 다운로드 가능. dry-run 기준 GCS copy·ProductImage·thumbnail 연결은 각 2,789. 단 ProductImage.master_id 가 NOT NULL 이라 대표 이미지는 대표의 멤버 master 1개에 부착하고 representative.thumbnail_image_id 로 연결한다.**

---

## 2. 스키마 실측

### ProductImage (`product_images`)
| 컬럼 | 타입 | 제약 |
|---|---|---|
| `id` | uuid | PK |
| `master_id` | uuid | **NOT NULL**, FK → product_masters ON DELETE CASCADE |
| `image_url` | text | **NOT NULL** (GCS public URL) |
| `gcs_path` | text | **NOT NULL** (외부 URL 직참조 불가 → GCS 사본 강제) |
| `sort_order` | int | default 0 |
| `is_primary` | bool | default false |
| `type` | varchar(16) | `thumbnail`\|`detail`\|`content`, default detail |

- **UNIQUE index** `idx_product_images_thumbnail_unique ON (master_id) WHERE type='thumbnail'` → master 당 thumbnail 1개.
- GCS 경로 규칙(`ImageStorageService`): `products/{masterId}/{type}/{uuid}{ext}`, 버킷 **`o4o-media-library`**(공개 read). override=`GCS_PRODUCT_IMAGE_BUCKET`.

### RepresentativeProduct.thumbnail_image_id
- `thumbnail_image_id UUID` (migration `20261202000000`) — **FK 제약 없음(soft ref)**. product_images.id 를 담되 DB 강제 아님.

**핵심 제약**: ProductImage 는 **master_id 필수** → RepresentativeProduct 직접 부착 불가. 대표 이미지 = 대표의 **멤버 master 1개**에 ProductImage(type=thumbnail) 부착 + `representative.thumbnail_image_id` 로 그 이미지 참조.

---

## 3. 운영 실측 (read-only)

| 지표 | 값 |
|---|---:|
| e약은요 candidate | 4,757 |
| candidate_image_url 보유 (distinct itemSeq) | **2,789** |
| distinct 이미지 URL | 2,789 (**중복 0**) |
| itemSeq(이미지) → RepresentativeProduct 매칭 | **2,789 (100%)**, unmatched 0 |
| 매칭 대표 중 기존 thumbnail_image_id 보유 | **0** |
| would_update_thumbnail | **2,789** |
| 기존 product_images 총수 / thumbnail | 1 / 1 (대상 master 외 무관 1건) |

> raw JSONL 은 이미지 보유 2,806행이나, candidate dedup(distinct itemSeq) 후 **2,789**. 대상 master 에 기존 thumbnail 충돌 없음(unique index 안전).

---

## 4. 외부 이미지 다운로드 검증

- URL 형식: `https://nedrug.mfds.go.kr/pbp/cmn/itemImageDownload/{token}`.
- 샘플 2건: **HTTP 200 / content-type `image/jpeg` / 143~224 KB / ~0.4s.** → 다운로드 가능·유효 JPEG.
- Cloud Run Job egress 로 fetch 가능(외부 인터넷 접근). 일부 URL 은 404/timeout 가능성 존재 → **실패 허용(continue-on-error) + errored 집계** 필요.

---

## 5. 생성/변경 대상 (WO 경계)

**생성/변경:**
```
ProductImage                              INSERT (대표당 1장, 멤버 master 부착, type=thumbnail)
representative_products.thumbnail_image_id UPDATE (연결)
GCS object                                (products/{masterId}/thumbnail/{uuid}.jpg copy)
```
**금지:** ProductMaster / ProductIdentifier / SharedProductDescription / ProductCandidate / SupplierProductOffer / OrganizationProductListing / StoreLocalProduct 생성·수정.

---

## 6. 설계 (확정 후보)

1. **대표당 이미지 1장** — 이미지 보유 itemSeq(=대표) 2,789 만. SKU별 19,431 생성 안 함.
2. **멤버 master 선택** = 대표의 멤버 중 **`min(master.id)`** (결정적). 그 master 에 ProductImage(type=thumbnail) 부착.
3. **ProductImage**: image_url=GCS public URL, gcs_path=`products/{masterId}/thumbnail/{uuid}.jpg`, type=`thumbnail`, is_primary=`true`, sort_order=0.
4. **thumbnail 연결**: `representative_products.thumbnail_image_id` = 새 ProductImage.id.
5. **멱등**: representative.thumbnail_image_id 이미 있으면 skip(재다운로드/재생성 안 함). 재실행 안전.
6. **실패 허용**: URL fetch 실패(404/timeout/non-image) → 해당 대표 skip + errored 집계, 배치 중단 없음.
7. **mime/ext**: 응답 content-type 기준(image/jpeg→.jpg, image/png→.png). 비이미지 응답은 skip.

---

## 7. dry-run 산출 (apply 시 예상)

| 대상 | 예상 수 |
|---|---:|
| GCS copy (wouldCopy) | **2,789** |
| ProductImage INSERT (wouldCreateImage) | **2,789** |
| representative thumbnail UPDATE (wouldUpdateThumbnail) | **2,789** |
| ProductMaster/Identifier/Description/Candidate 생성 | **0** |

---

## 8. 게이트 계획 + 미결 결정

| 게이트 | 내용 | write | 상태 |
|---|---|---|---|
| **Gate 0** (본 문서) | 스키마·매칭·다운로드·설계 실측 고정 | 0 | ✅ 완료 |
| **Gate A** (구현+dry-run) | 이미지 복사 서비스+Job 구현 → dry-run(네트워크 fetch 없이 매칭·대상 수만) | 0 | ⏸ 승인 후 |
| **Gate B** (apply) | 2,789 GCS copy + ProductImage INSERT + thumbnail UPDATE | GCS+DB | ⏸ **별도 승인 + 사전 백업** |

**미결 결정 (사용자):**
1. **멤버 master 선택**: `min(master.id)`(결정적, 권장) vs display_name 일치 master vs is_primary 보유 master.
2. **is_primary**: true(대표 썸네일, 권장) vs false.
3. **apply 채널**: Cloud Run Job 신설(egress fetch, 권장) vs local.
4. **실패 허용 정책**: continue-on-error + errored 집계(권장). 재시도 횟수(예: 1회) 여부.

---

## 9. 리스크 / 주의

- **네트워크 의존**: 2,789 외부 fetch → 일부 실패 가능. 실패는 skip+집계, 재실행으로 보완(멱등).
- **GCS write**: 2,789 object(~평균 180KB → ~500MB). 버킷 `o4o-media-library` 공개 read. gcs_path 기반 rollback(삭제) 가능.
- **thumbnail unique index**: 대상 master 에 기존 thumbnail 0 확인 → 충돌 없음. 단 재실행 시 이미 thumbnail 부착 master 는 멱등 skip.
- **rollback**: ProductImage 삭제(대상 = 이 batch 생성분) + representative.thumbnail_image_id NULL 복원 + GCS object 삭제. representative.thumbnail_image_id 는 FK 없어 수동 NULL 처리.
- **경계(CLAUDE.md §7)**: product_images/representative_products 는 콘텐츠 계층, Commerce 미참조 → 위반 아님.

---

## 10. 준수 확인 (본 문서)

| 항목 | 결과 |
|---|---|
| apply·GCS copy 실행 | **0** |
| DB write | 0 |
| ProductMaster/Identifier/Description/Candidate 생성 | 0 |
| migration / Cloud Run Job 생성 | 0 |
| raw·secret 기록 | 0 (DB 검증 authorized-network 임시 등록 후 원복) |
| 병렬 세션 파일 수정 | 0 |

---

**작성**: O4O Platform 조사 CHECK · 2026-07-04 · 1단계 read-only(§1~§10) → Gate A/B apply 완료(§11~§12). serviceKey·비밀 미출력.

---

## 11. Gate A 실행 로그 (2026-07-04) — 구현 + dry-run

> 채널: Cloud Run Job `o4o-easy-drug-image-copy`. 서비스 `easy-drug-image-copy.service.ts`(fetch+GCS ImageStorageService+ProductImage INSERT+representative thumbnail/metadata UPDATE) + Job entry(commit `f851cf32d`). raw ds.query(entities:[]).

| 항목 | 값 |
|---|---|
| dry-run (exec tvrdc, 13s) | candidatesWithImage 2,789 / workItems 2,789 / wouldCopy 2,789 / skippedNoAnchor 0 / errored 0 |

**→ §3·§7 실측과 일치.** write 0.

---

## 12. Gate B 실행 로그 (2026-07-04) — **apply 완료 (WO 종결)**

| 항목 | 값 |
|---|---|
| 사전 백업 | ✅ id **1783156940641** (SUCCESSFUL, `pre-easy-drug-image-copy-20260704`) |
| APPLY 이중가드 | `EASY_DRUG_IMG_APPLY=true` + `DRUG_IMPORT_ALLOW_APPLY=I_UNDERSTAND` |
| 1차 apply (exec 2fz2m) | copied **124** / skippedFetchFailed **2,665**(전량 HTTP_429) / errored 0 — **rate-limit** |
| 스로틀 개선 (commit `7f6f43cb4`) | 429/5xx backoff(2s/5s/12s, 최대 4시도), 404 즉시 실패, 동시성 16→**4**, 청크간 300ms |
| 2차 apply (exec 87rpb, 404s, 멱등) | workItems **2,665** / copied **2,665** / errored **0** |
| **누계** | **2,789 / 2,789 (100%)** |

**검증 SQL (read-only, 사용자 기준):**

| 기준 | 결과 | 판정 |
|---|---:|:---:|
| ProductImage(thumbnail) created | **2,789** | ✅ |
| GCS path 중복 | **0** (distinct 2,789) | ✅ |
| representative thumbnail linked | **2,789** | ✅ |
| itemSeq(이미지) 성공 / 미연결 | 2,789 / **0** | ✅ 100% |
| metadata.thumbnailSource 기록 | **2,789** (selectionPolicy=min_master_id) | ✅ |
| HIRA master / Identifier / Description / Candidate | 230,841 / 703,483 / 19,431 / 4,757 **불변** | ✅ 미생성 |

**교훈(429 rate-limit)**: 외부 공공 이미지 서버(nedrug.mfds.go.kr)는 동시성 16 에서 즉시 429. **backoff + 저동시성(4) + 청크 지연**으로 2차 재실행 시 전량 성공. 멱등(thumbnail_image_id NULL 만 처리) 덕에 1차 성공분 124 는 재처리 없이 잔여만 복구.

**→ Gate B 완료. WO 종결.** e약은요 이미지 보유 품목 2,789 의 대표상품에 GCS 사본 썸네일(`products/{masterId}/thumbnail/`) + provenance 연결. 이미지 없는 itemSeq(1,968)는 DB placeholder 미생성(UI 시점 처리 — 설계 §8 원칙).

**후속(별도 WO)**: (1) 이미지 없는 대표 UI placeholder. (2) 다제조사/multiName/dupName 대표 큐레이션. (3) SharedProductDescription canonical 승격.
