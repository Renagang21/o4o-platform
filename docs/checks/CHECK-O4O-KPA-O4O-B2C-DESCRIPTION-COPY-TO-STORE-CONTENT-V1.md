# CHECK — O4O B2C 상세설명 매장 콘텐츠 가져오기 V1

> **WO:** WO-O4O-KPA-O4O-B2C-DESCRIPTION-COPY-TO-STORE-CONTENT-V1
> **선행:** CONTENT-LINK-V1 / CONTENT-ACTIONS-V1 (연결 + by-product)
> **작성일:** 2026-06-27

---

## 1. 사전 조사 (WO §4) + 이미지 수명 결정

- **B2C 원본** = `shared_product_descriptions` (status=`canonical`, master당 1개, partial unique index).
  본문 `content`(HTML) + `summary`. **제목 필드 없음** → 사본 제목은 `ProductMaster.name` 파생.
  fallback 체인(spd→store_product_profiles→supplier_product_offers)이 있으나 import 는 **spd canonical** 기준.
- listing→master: `organization_product_listings.master_id`.
- **이미지 수명(§4 보고 대상):** 본문 내 `<img src="https://storage.googleapis.com/.../products/{masterId}/...">`
  = **영구 공개 GCS URL**(signed 아님, 1년 캐시) → §11 단기 signed URL 조건 **해당 없음**.
  단, **ProductMaster 하드삭제** 시 product_images cascade + GCS 파일 삭제 → 임베드 이미지 깨짐.
  설명서 편집/soft-delete·사본 편집/삭제로는 안 깨짐.
- **사용자 결정:** "본문-only 복사 V1"(이미지 재호스팅 없음). master 하드삭제 이미지 한계는 문서화.

## 2. 변경 (커밋)

| 영역 | 파일 | 커밋 |
|---|---|---|
| 백엔드 | store-content.controller (GET b2c-descriptions + POST import-b2c-description) | `0fdcb38b6` |
| 프론트 | assetSnapshot(b2cDescriptionApi) + ImportB2cDescriptionModal(신규) + StoreHandledProductsPage | `5e82f5355` |

**신규 DB 변경 없음.**

## 3. 복사 API (WO §7-8)

- `GET /store-contents/b2c-descriptions?listingId` — org→listing 소유 검증 후 master 의 canonical B2C 목록.
  제목=ProductMaster.name 파생. 미발행/숨김/타제품/soft-deleted 제외.
- `POST /store-contents/import-b2c-description {listingId, descriptionId}` — **클라이언트는 본문/masterId 미제출**.
  서버가 org→listing→master→description(canonical) 관계 직접 검증 후 원본을 직접 읽어 복사.
- **한 transaction**: ① canonical 원본 읽기(없으면 throw→rollback, 흔적 없음) ② 독립 direct 콘텐츠 INSERT
  (source_type=direct, content_json.html=원본 content + summary, workspace_status=draft 기본)
  ③ product_description 링크 INSERT(product_source_type=listing, **master_id 부가 보존**).
- 출처 metadata(`source_metadata`): `{ copiedFrom:'o4o_b2c_product_description', sourceRefId, masterId, copiedAt }`.

## 4. 독립성 (WO §9) — 설계 보장

복사는 **별도 DB row**(kpa_store_contents) 생성 → 원본(shared_product_descriptions)과 물리 분리.
- 사본 편집/삭제 → 원본 무변경(서로 다른 테이블/row). ✓
- 원본 편집/soft-delete → 기존 사본 본문 무변경(복사 시점 스냅샷). ✓
- 재가져오기 → 새 direct 콘텐츠 + 새 링크(독립 사본). ✓
- 한계: 원본 **master 하드삭제** 시 사본 본문(텍스트/구조)은 유지되나 임베드 이미지 URL 깨질 수 있음(§1, V1 범위 외).

## 5. 진입점 (WO §5) + 완료 UX (WO §10)

StoreHandledProductsPage 의 **O4O 기반 제품(listing) 행에만** "O4O 상세설명 가져오기" 버튼
(매장 경영활용 제품 미노출). 모달: 원본 선택(제목/언어/상태/수정일, **자동선택 없음**, 재가져오기 안내) →
완료 화면(**가져온 콘텐츠 편집 / 연결 콘텐츠 보기 / 목록**). 성공 시 `linkedContentCount` 갱신, 드로어 연동.
빈 상태: "가져올 수 있는 O4O 상세설명이 없습니다." listing/master/UUID 미노출.

## 6. 콘텐츠 품질 (WO §11)

원본 `content` HTML 무손실 복사(표/이미지/링크 보존). 렌더 시 기존 표준 sanitizer(ContentRenderer/DOMPurify)로
script/event/iframe 제거(기존 정책). 이미지 URL = 영구 공개(단기 signed 아님) → 복사 완료 처리 적격.

## 7. 비범위 (WO §12) 확인

원본 수정 / 실시간 동기화 / 기본·대표 지정 / 타블렛 자동선택 / 온라인 상세 교체 / local 지원 / 다제품 동시연결 — **없음**. ✅

## 8. typecheck

| 대상 | 결과 |
|---|---|
| api-server | **PASS** |
| web-kpa-society | **PASS** |

## 9. API smoke — negative/validation **ALL PASS** (2026-06-27, prod, renagang21)

배포: 백엔드가 frontend-only tip 커밋으로 API deploy skip → **수동 workflow_dispatch 재배포**(run 28282177134) 후 검증.

| 검증 | 결과 |
|---|---|
| `GET /b2c-descriptions?listingId=<random>` → **404 LISTING_NOT_FOUND**(org 스코프) | ✓ |
| `GET /b2c-descriptions?listingId=<bad uuid>` → **400 VALIDATION_ERROR** | ✓ |
| `POST /import-b2c-description {random listing}` → **404**(org 스코프) | ✓ |
| `POST /import-b2c-description {bad uuids}` → **400** | ✓ |

→ 신규 엔드포인트 라이브 + org 스코프/UUID 검증 정상.

**positive 복사 경로(org→listing→master→canonical desc 검증, transaction 복사 + 링크 + master_id + source_metadata):**
**코드 RCA + 설계상 독립성 보장**. renagang21 KPA 매장에 **O4O listing 0건**이라 라이브 positive 보류
(positive 검증엔 listing + 해당 master 의 canonical B2C 설명이 필요 — 타블렛 WO 와 동일 test-store 한계).

## 10. browser smoke — **보류 (O4O listing 부재)**

"O4O 상세설명 가져오기" 버튼은 **listing 행에만** 조건부 렌더(`it.sourceType === 'listing'`, §5 매장 경영활용 제품 미노출) — 정적·타입 검증 완료.
라이브 흐름(버튼→원본 선택→복사→완료→드로어)은 test 매장에 O4O listing 이 없어 보류.

## 11. 후속 / 한계

- 이미지 완전 독립(master 하드삭제 대응) = 별도 WO(이미지 매장 GCS 재호스팅).
- 재가져오기 중복 이력 정밀 감지(by-product 에 source_metadata 노출) = 후속 개선 후보.

---

## 상태

- 구현 / typecheck(api-server + web-kpa): **완료**
- 배포: `0fdcb38b6`(백엔드, 수동 재배포) + `5e82f5355`(프론트) → success
- API smoke: **negative/validation ALL PASS**, positive=코드 RCA + 독립성 설계 보장(라이브 보류)
- browser smoke: **보류**(test 매장 O4O listing 부재)
- 데이터 변경 없음(negative smoke 는 흔적 0). 신규 DB 없음.
- **한계:** positive 라이브 검증은 test 매장에 O4O listing+canonical B2C 설명 확보 시 수행.
