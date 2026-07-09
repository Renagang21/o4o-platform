# O4O 제품 사진 기반 제품 단위 등록 Agent Guide V1

> 상태: Active · V1 (2026-07-09) · 진입: [DOCUMENT-INDEX](../common/DOCUMENT-INDEX.md)
> 대응 WO: `WO-O4O-PRODUCT-UNIT-PHOTO-TO-DESCRIPTION-QR-GUIDE-AND-FLOW-AUDIT-V2`
> 조사 근거: [IR-O4O-PRODUCT-UNIT-PHOTO-TO-DESCRIPTION-QR-FLOW-AUDIT-V2](../../investigations/IR-O4O-PRODUCT-UNIT-PHOTO-TO-DESCRIPTION-QR-FLOW-AUDIT-V2.md)
> 설명서 단계는 [O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1](O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1.md) 참조.

---

## 1. 목적

제품 사진이 제공됐을 때, agent가 정보를 추출하고 기존 제품 존재 여부를 조사한 뒤 분류를 결정하고 등록 판정을 내리는 기준을 정의한다.

**이 가이드는 사진만으로 곧바로 제품을 등록하지 않는다.** 추출 → 조사 → 분류 → 판정 → (승인 후) 등록의 게이트를 거친다.

---

## 2. 적용 대상 / 제외 대상

적용:
```text
건강기능식품
일반식품
기타 일반 제품
```

제외 (자동화하지 않음, 별도 트랙으로 이관):
```text
의약품 / 처방의약품 / 의약품으로 보이는 제품
분류 불명확 제품
```

---

## 3. 입력 자료

```text
전면 사진
후면 사진 (표시사항)
바코드 사진
표시사항 사진 (성분·기능성·주의사항)
필요 시 추가 사진 (측면·구성품)
```

---

## 4. 제품 정보 추출 기준

사진에서 다음을 추출하되, **사진에 없는 정보는 임의로 만들지 않는다.**

```text
제품명 / 브랜드 / 바코드
식품유형·제품유형
내용량 / 포장 단위
제조원 / 수입원 / 판매원
원산지 / 제조국
원재료 / (건기식) 기능성 원료·함량
섭취/사용 방법
보관 방법 / 주의사항
```

> ⚠️ 현재 O4O에는 **사진→정보 자동 추출(OCR)이 배선되어 있지 않다.** Google Vision OCR 코드(`product-ocr.service.ts`)와 `product_ocr_texts` 테이블은 존재하나 호출처가 없고, 바코드 이미지 인식도 없다(IR §3.4). 따라서 현 단계 추출은 **사람 관측/수동 입력 또는 후속 OCR 파이프라인 WO** 를 전제로 한다.

---

## 5. 기존 제품 존재 여부 확인

다음 순서로 조회한다(모두 read-only).

```text
1. barcode exact         → product_identifiers.normalizedValue (normalizeIdentifier 정규화 후)
2. ProductIdentifier      → identifierType/identifierValue
3. ProductMaster name      → GET /store/products/search 또는 /neture/products/library/search
4. StoreLocalProduct       → 매장 자체 등록 중복
5. 유사명 후보             → 부분 일치 후보 제시(자동 확정 금지)
```

재사용 API:
- `GET /api/v1/store/products/search` (`store-product-library.controller.ts`)
- `GET /api/v1/neture/products/library/search` (`product-library.controller.ts`)

---

## 5-A. 식약처(MFDS) 인허가 제품 행정처분 확인 게이트 (필수)

**식약처 인허가 대상 제품**(건강기능식품 · 식품 · 의약외품 · 의료기기 · 화장품 등 MFDS 허가/신고/보고 품목)이 **§5 자체 제품 검색에서 발견되지 않으면**, 등록 판정 전에 **행정처분(회수·판매중지·부적합·허가취소 등) 여부를 별도 검색으로 확인**한다.

```text
[게이트]
자체 검색 결과 없음 (신규 후보)
  └ 식약처 인허가 대상 제품인가?
       ├ 예 → 행정처분/회수·판매중지 별도 검색 (아래 소스)
       │        ├ 처분 있음 → 작업 중단(blocked_admin_action) + 개발자에게 알림
       │        └ 처분 없음/확인 불가 → §6 분류·§7 판정으로 진행
       └ 아니오(일반 제품) → §6 진행
```

### 행정처분/회수 확인 소스 (근거: [IR-O4O-GOVERNMENT-PRODUCT-DATA-SOURCE-AUDIT-V1](../../investigations/IR-O4O-GOVERNMENT-PRODUCT-DATA-SOURCE-AUDIT-V1.md))

| 제품군 | 회수·판매중지 소스 | 검색키 |
|---|---|---|
| 의약품 | data.go.kr `15059114` 의약품 회수·판매중지 정보 | 품목명·업체명·일자 |
| 식품(국내) | `15074318`/`I0490` 식품 회수·판매중지 | 품목보고번호·등록일 (바코드 반환만) |
| 수입식품 | `15095378` 수입식품 회수·판매중지 | 제품명·업체명·**바코드(BRCD_NO) 검색 지원** |
| 화장품 | 전용 회수 API 부재 → 기능성화장품 보고(A10) `CANCEL_*`/취하 상태 또는 MFDS 포털 | 제품명·보고번호 |
| 의료기기·의약외품 | MFDS 행정처분 포털/공개 API | 품목·업체 |

> ⚠️ **현재 O4O에는 이 행정처분 확인이 자동 배선되어 있지 않다.** 위 OpenAPI는 조사(IR)에서 식별됐을 뿐 등록 파이프라인에 연결돼 있지 않다. 따라서 현 단계 확인은 **사람 관측 또는 후속 파이프라인 WO**를 전제로 하며, agent는 확인이 불가하면 `review_required`로 보류하고 임의로 "처분 없음"으로 단정하지 않는다.

### 처분 발견 시 동작

- **작업을 중단한다** (등록·설명서·QR 어떤 후속도 진행하지 않음).
- **개발자에게 알린다** — 제품명·바코드·업체명·처분 종류(회수/판매중지/부적합/허가취소)·출처·확인 일자를 작업 로그(§9)에 남기고 개발자 통지.
- 판정 = `blocked_admin_action`.

---

## 6. 제품 분류 결정

O4O 분류 필드(`product-type.util.ts`)에 매핑한다.

| 트랙 분류 | O4O regulatoryType | 표시 분류 |
|---|---|---|
| 건강기능식품 (hff) | `HEALTH_FUNCTIONAL` | `health_functional` |
| 일반식품 (general_food) | `GENERAL` ⚠️ | `general` |
| 기타 일반 제품 (general_product) | `GENERAL` ⚠️ | `general` |
| 분류 불명 (unknown) | — | `unknown` |
| 규제 가능성 (possible_regulated) | QUASI_DRUG/MEDICAL_DEVICE 후보 | 보류 |
| 의약품 가능 (drug_possible) | `DRUG` 후보 | **차단** |

⚠️ **SOURCE GAP**: `GENERAL` 은 일반식품과 기타 제품을 구분하지 못한다(IR §3.2). 세분류는 태그/서브카테고리로 보완해야 하며 후속 WO 대상(`WO-O4O-PRODUCT-CLASSIFICATION-FOOD-SUBTYPE-V1`).

건강기능식품 여부는 제품명·외형만으로 확정하지 말고 **표시사항 또는 공공 원천**으로 확인한다.

---

## 7. 등록 판정

```text
registerable          기존 제품 연결 또는 신규 등록 가능
source_required       정보 부족 → 원천 확인 필요
review_required       분류/중복/행정처분 확인 불가 → 사람 검토
blocked_drug_track    의약품 가능성 → 의약품 트랙 이관
blocked_regulated     의약외품/의료기기 가능성 → 규제 트랙
blocked_admin_action  식약처 행정처분(회수/판매중지/부적합/허가취소) 확인 → 작업 중단 + 개발자 통지 (§5-A)
```

---

## 8. 등록 기준

```text
기존 제품이면        → 연결 (매장 등록: POST /store/products/list masterId, idempotent)
신규 제품이면        → 후보 생성 (ProductCandidate / MobileProductDraft) → 검토 → 승격
정보 부족이면        → 등록 보류 (source_required)
```

**현 구조 제약 (IR §3.1)**:
- 신규 ProductMaster 직접 생성 경로는 **candidate 승격(`approveAsNewProductMaster`)을 경유**하며 현재 **drug 소스로 게이트**되어 있다. non-drug 직접 생성은 후속 WO 필요.
- 사진 수집은 `MobileProductDraft`(사진/식별자 수집 → candidate)가 설계된 파이프라인이며 **직접 master를 만들지 않는다.**
- 매장 진열 목적만이면 `StoreLocalProduct`(매장 자체 제품) 등록이 즉시 가능(중앙 master 없이).

권장 흐름: **매장 로컬 등록(StoreLocalProduct)을 우선 경로**로 두고, 중앙 ProductMaster 승격은 별도 검토/승인 트랙으로 분리.

---

## 9. 작업 로그 형식

각 제품 처리 시 다음을 남긴다(내부용).

```text
입력 사진:            [목록]
추출 정보:            제품명/브랜드/바코드/유형/내용량/제조원/원산지/원재료/...
누락 정보:            [확인 안 된 항목]
기존 제품 조회 결과:   exact / identifier / name / local / 유사후보
분류 결정:            hff / general_food / general_product / unknown / possible_regulated / drug_possible
등록 판정:            registerable / source_required / review_required / blocked_*
후속 조치:            연결 / 후보 생성 / 보류 / 이관
근거 메모:            각 정보의 출처(사진/표시사항/공공 원천/DB)
```

---

## 10. 보류 기준

[설명서 가이드 §10](O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1.md)과 동일 원칙. 의약품 가능·분류 불명·바코드/제품명 불명·표시사항 부족·중복 가능·회수/부적합 확인 시 보류.

---

## 절대 원칙 (한눈에)

```text
사진만으로 바로 등록하지 않는다 (추출→조사→분류→판정→승인).
사진에 없는 정보는 만들지 않는다.
제품명·외형만으로 분류 확정 금지 (표시사항/공공 원천 확인).
의약품 가능성 → 자동화 중단, 의약품 트랙 이관.
식약처 인허가 제품이 자체 검색에 없으면 행정처분 별도 확인 → 처분 있으면 작업 중단 + 개발자 통지(§5-A).
행정처분 확인 불가 시 임의로 "처분 없음" 단정 금지 → review_required.
신규 master 직접 생성은 현재 candidate 승격 경유(drug-gated) — non-drug는 후속 WO.
매장 진열만이면 StoreLocalProduct 우선.
본 가이드 단계는 조사·판정 기준이며 DB write를 지시하지 않는다.
```
