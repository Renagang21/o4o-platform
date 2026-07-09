# CHECK-O4O-PRODUCT-UNIT-PHOTO-TO-DESCRIPTION-QR-GUIDE-AND-FLOW-AUDIT-V2

> 대응 WO: `WO-O4O-PRODUCT-UNIT-PHOTO-TO-DESCRIPTION-QR-GUIDE-AND-FLOW-AUDIT-V2`
> 실행일: 2026-07-09 · 성격: 조사(read-only) + 문서 정비. **DB write 0 / 제품 등록 0 / QR 생성 0 / migration 0 / deploy 0.**

---

## 1. 작성/수정한 문서

| 유형 | 파일 | 비고 |
|---|---|---|
| 신규 IR | `docs/investigations/IR-O4O-PRODUCT-UNIT-PHOTO-TO-DESCRIPTION-QR-FLOW-AUDIT-V2.md` | 조사·설계 기록(불변) |
| 신규 Guide | `docs/guides/products/O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1.md` | 제품 단위 설명서(예제 톤 반영) |
| 신규 Guide | `docs/guides/products/O4O-PRODUCT-UNIT-REGISTRATION-FROM-PHOTO-AGENT-GUIDE-V1.md` | 사진 기반 등록 |
| 신규 CHECK | 본 문서 | — |
| 수정 | `docs/guides/common/DOCUMENT-INDEX.md` | 5축 진입점에 제품 단위 트랙 등록(9-a) |
| 수정 | `docs/guides/products/health-functional-food/README.md` | 스캐폴드 → 제품 단위 가이드 포인터 |

> **문서 배치 정합성**: WO §9는 flat-root(`docs/guides/`)를 지정했으나, 저장소의 canonical **콘텐츠 문서 5축 아키텍처**(DOCUMENT-INDEX)에 정렬해 `docs/guides/products/`로 배치했다(사용자 승인: "5축 구조에 정렬"). SSOT 원칙 준수, 파일명은 WO 유지.

---

## 2. 조사한 화면/API/테이블

**제품 등록**: `product_masters`(ProductMaster.entity), `product_identifiers`, `store_local_products`, `organization_product_listings`, `MobileProductDraft` · API `GET /store/products/search`, `POST /store/products/list`, `GET /neture/products/library/search`, `POST /operator/product-candidates/:id/promote-master`(drug-gated) · 프론트 `/store/handled-products`, `/store/my-products`, `/store/commerce/local-products`, admin `/admin/o4o-product-db/*`(read-only).

**설명서**: `shared_product_descriptions`(SPD, master 단위, description_type/status/language), `product_candidate_description_drafts`, `store_multilingual_product_content_groups/pages`(ko/zh page).

**미디어/OCR**: `media_assets`(버킷 o4o-media-library) + MediaPicker · OCR `product-ocr.service.ts`+`product_ocr_texts`(**dormant/미배선**), 바코드 인식 없음.

**QR/디자인**: `store_qr_codes` + `/qr/:slug`(동적 생성·비저장), landingType(product/promotion/page/link/video/tablet), 다국어 서브시스템 별도 publicKey(미브리지).

---

## 3. 핵심 결론

- **제품 단위 트랙 정의**: 제품 1건 = 설명서 1건 (건기식/일반식품/기타 제품 공통 패턴). 차이는 구조가 아니라 확인 원천·설명 초점.
- **의약품 제외 원칙**: 의약품은 성분·함량·제형·투여경로·허가 기준 공통 그룹 트랙(별도). 의약품으로 보이면 자동화 중단·이관.
- **건기식/식품/기타 처리**: 건기식=기능성 원료·표시사항 범위, 일반식품=맛·원재료·보관(기능성 표현 금지), 기타=사용 목적·방법·관리.
- **하단 전문인 상담 문구 반영**: 모든 설명서 하단 고정 문구(ko/zh) 반영. "위축 장치"가 아니라 매장 전문인 상담 연결용.
- **예제 샘플 참조 원칙**: 아쿠아셀 알티지 오메가-3 The Pure를 문체·구조 참조 기준으로 §5.2에 반영. 예제는 사실 기준 아님(사실은 원천 확인).
- **설명서/중국어/QR 연결 가능성**: 저장 계층(SPD·다국어 page·QR)은 대부분 존재. 언어별 QR은 브리지 필요, 제품 리스트 행별 액션은 신규 UI 필요.
- **식약처 행정처분 확인 게이트 (추가, 사용자 요청)**: 식약처 인허가 제품이 자체 검색에 없으면 행정처분(회수/판매중지/부적합/허가취소) 별도 검색 → 처분 있으면 **작업 중단 + 개발자 통지**(`blocked_admin_action`). 등록 가이드 §5-A + 설명서 가이드 §10 반영. 근거 소스=IR-O4O-GOVERNMENT-PRODUCT-DATA-SOURCE-AUDIT-V1(의약품 15059114·식품 15074318·수입식품 15095378 바코드검색·화장품 CANCEL_*). ⚠ 현재 미배선→사람 관측/후속 WO 전제, 확인 불가 시 "처분 없음" 단정 금지(review_required).

---

## 4. 개발 필요 항목 (IR §11)

D1 다국어↔QR 브리지 · D2 제품 리스트 행별 설명서/QR 액션 · D3 non-drug master 생성 경로 · D4 사진 OCR 배선+바코드 · D5 일반식품/기타 세분류 · D6 locale 표준(zh) 정렬.

---

## 5. 후속 WO 제안

- `WO-O4O-PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1`
- `WO-O4O-PRODUCT-UNIT-MULTILINGUAL-DESCRIPTION-QR-LINK-V1`
- `WO-O4O-PRODUCT-UNIT-DESCRIPTION-DRAFT-GENERATION-V1`
- `WO-O4O-PRODUCT-UNIT-REGISTRATION-FROM-PHOTO-UI-V1`
- `WO-O4O-PRODUCT-UNIT-PHOTO-OCR-PIPELINE-V1`
- `WO-O4O-PRODUCT-CLASSIFICATION-FOOD-SUBTYPE-V1`

---

## 6. 금지사항 준수

```text
DB write        0
제품 등록        0 (ProductMaster/Identifier/StoreLocalProduct/listing 생성 0)
설명서 write      0 (SPD/draft/다국어 page write 0)
QR 생성          0
OCR 신규 구현      0
migration        0
deploy           0
```

read-only 조사(코드 정적 분석) + 문서 작성만 수행. 코드/DB/QR 무변경.
