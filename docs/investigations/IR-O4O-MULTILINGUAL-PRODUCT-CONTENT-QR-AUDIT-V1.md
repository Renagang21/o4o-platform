# IR-O4O-MULTILINGUAL-PRODUCT-CONTENT-QR-AUDIT-V1

> **유형:** Investigation / read-only audit  
> **범위:** 다국어 상품 콘텐츠와 QR-code 연결 가능성 조사. 코드/API/DB/UI 변경 없음.  
> **작성일:** 2026-06-21  
> **결론:** 기존 QR 엔티티(`store_qr_codes`)는 이미 영속·재편집 구조이며, landingType `product|promotion|page|link`를 가진다. 다국어 상품 콘텐츠 V1의 핵심은 새 QR 시스템이 아니라 **store-scoped 다국어 콘텐츠 페이지 저장소**와 기존 QR의 `page` 또는 `product` 연결 보완이다.

---

## 1. 사용자 기준

이번 IR의 기획 기준은 다음으로 고정한다.

1. 상품 정보는 표준 설명서가 아니라 **마케팅 콘텐츠 페이지**다.
2. 콘텐츠 항목을 `기본 안내/특징/용도/사용 방법/주의사항`처럼 O4O가 강제 분류하지 않는다.
3. 마케터/운영자가 만든 자유 콘텐츠 페이지를 O4O가 저장·전달한다.
4. 같은 상품이라도 언어별 콘텐츠는 단순 번역본이 아니라 독립 마케팅 콘텐츠일 수 있다.
5. 공급자 자료는 오프라인으로 받고, 운영자가 등록해 매장 허브에 진열한다.
6. 매장은 기존 흐름처럼 허브 콘텐츠를 가져와 내 매장에서 사용한다.
7. DSL 업체 연동은 QR 이미지 전달 방식으로 별도 사업자 확인 중이며 본 IR 범위 밖이다.
8. 파트너/가이드 수수료와 제휴마케팅 QR 상세는 파트너 기능 이후로 보류한다.

---

## 2. 지원 언어 V1

V1 언어 목록은 다음으로 본다.

```text
한국어 기본
en: English
zh: 中文
ja: 日本語
vi: Tiếng Việt
th: ภาษาไทย
id: Bahasa Indonesia
```

고객 첫 화면은 한국 고객 중심으로 단순화한다.

```text
한국어
Foreign Language
```

`Foreign Language` 선택 후 외국어 버튼을 표시한다.

```text
English
中文
日本語
Tiếng Việt
ภาษาไทย
Bahasa Indonesia
```

---

## 3. 기존 QR 구조 조사

### 3.1 QR은 단순 목록이 아니라 영속 엔티티

선행 IR 기준 QR 제작 흐름은 다음 구조다.

```text
operator_qr_templates
→ HUB /store-hub/qr
→ import
→ store_qr_codes
→ /qr/public/:slug
→ 이미지/인쇄/전단/스캔통계
```

선행 IR은 QR을 “단순 QR 목록”이 아니라 **영속 재편집 엔티티**로 판정했다. QR은 `store_qr_codes`에 저장되며 `landingType product|promotion|page|link`와 `landingTargetId`를 가진다.

### 3.2 store_qr_codes 현재 필드

현재 `StoreQrCode`는 다음 핵심 필드를 가진다.

```text
organization_id
type
title
description
library_item_id
landing_type
landing_target_id
slug
is_active
```

즉, QR은 이미 다음 기능을 갖는다.

```text
매장 scope
랜딩 유형
랜딩 대상
public slug
활성/비활성
```

### 3.3 public QR 랜딩

`GET /qr/public/:slug`는 QR 데이터를 조회하고 스캔 이벤트를 기록한다. `landingType === 'product'`일 때는 `supplier_product_offers` 또는 `organization_product_listings`를 통해 상품명, 브랜드, 가격, 기본 설명을 포함한다.

현재 product QR은 상품 기본 정보 조회에 가깝고, 다국어 마케팅 콘텐츠 페이지 조회 구조는 아니다.

### 3.4 QR 생성 validation

`POST /pharmacy/qr`는 현재 `landingType`을 다음 4종으로 제한한다.

```text
product
promotion
page
link
```

따라서 다국어 상품 콘텐츠 V1은 새 landingType을 만들기보다 기존 `page` 또는 `product` 흐름을 활용하는 것이 우선이다.

---

## 4. 운영자 QR 템플릿 현재 구조

운영자 QR 템플릿(`operator_qr_templates`)은 HUB 발행 청사진이다. 현재 targetType은 다음 2종이다.

```text
url
content
```

`content`는 다시 다음 kind를 가진다.

```text
blog
cms
pop
```

가져오기 시 변환 규칙은 다음이다.

```text
targetType='url'     → store_qr_codes.landingType='link'
targetType='content' → store_qr_codes.landingType='page'
```

즉, 운영자 HUB → 매장 QR 사본 흐름은 이미 존재한다. 다만 다국어 상품 콘텐츠를 가리키는 `content kind`는 현재 없다.

---

## 5. 기존 상품설명 저장소 제약

선행 `CHECK-O4O-PRODUCT-DESCRIPTION-STORE-SCOPE-BRIDGE-V1`의 핵심 결론은 다음이다.

```text
product_ai_contents = master-global 저장소
organization_id / store_id / targetKind 없음
```

따라서 같은 ProductMaster를 여러 매장이 취급하면 같은 설명을 공유하게 된다. 매장별 상품 설명 또는 매장별 다국어 마케팅 콘텐츠 저장소로 쓰기에는 부적합하다.

선행 권장안은 store-scoped 신규 테이블이다.

```text
store_product_descriptions
- organization_id
- target_kind ('local'|'listing')
- target_id
- content
- UNIQUE (organization_id, target_kind, target_id)
```

이번 다국어 상품 콘텐츠도 같은 제약을 받는다. 즉, `product_ai_contents`에 언어별 페이지를 얹는 방식은 부적합하다.

---

## 6. 기존 제품 콘텐츠 presentation 제약

선행 `IR-O4O-PRODUCT-CONTENT-PRESENTATION-DESIGN-V1`은 제품-콘텐츠 연결이 현재 두 갈래임을 확인했다.

```text
product_marketing_assets = 제품과 자산 연결 junction
ProductAiContent = 제품 바인딩 AI 콘텐츠
```

또한 콘텐츠 리스트 행에 productId/productName/tags가 없고, 콘텐츠 API에 productId/tag 필터가 없으며, “용도 B2B/B2C/공통”을 받칠 데이터 필드도 없다고 판정했다.

이번 사용자 기준에서는 **콘텐츠 유형/용도 고정 분류를 만들지 않는다**는 방향이 확정되었으므로, 기존 IR의 `usage_segment`류 필드는 V1에서 보류한다.

---

## 7. 다국어 상품 콘텐츠 저장 방향

### 7.1 콘텐츠 유형 고정 분류 없음

O4O가 다음 항목을 강제하지 않는다.

```text
기본 안내
특징
용도
사용 방법
주의사항
포장·가격
비교 설명
```

대신 자유 콘텐츠 페이지를 저장한다.

### 7.2 권장 개념 모델

```text
MultilingualProductContentGroup
- id
- organizationId
- targetKind: local | listing
- targetId: localProductId | organizationProductListingId
- source: operator_hub | store_created | supplier_offline_imported
- status: draft | published | archived

MultilingualProductContentPage
- id
- groupId
- locale: ko | en | zh | ja | vi | th | id
- title
- body / blocks / html / json content
- assets: ordered image/video/file refs
- buttons: optional CTA refs
- isDefault
- isPublished
```

실제 구현에서는 기존 `store_product_descriptions` 권장안과 합칠 수도 있고, 별도 `store_product_content_groups/pages`로 둘 수도 있다. V1 설계상 중요한 것은 다음이다.

```text
상품은 하나
언어별 콘텐츠 페이지는 여러 개
각 언어 페이지는 독립 마케팅 콘텐츠
매장 scope 저장
```

### 7.3 왜 group/page 구조가 필요한가

QR에서 언어를 바꾸면 같은 상품의 다른 언어 페이지로 이동해야 한다.

```text
제품 A 콘텐츠 그룹
├ 한국어 페이지
├ 영어 페이지
├ 중국어 페이지
├ 일본어 페이지
├ 베트남어 페이지
├ 태국어 페이지
└ 인도네시아어 페이지
```

이를 위해 언어별 페이지를 같은 그룹으로 묶는 key가 필요하다.

---

## 8. QR 연결 방식 판단

### 8.1 새 landingType 신설은 V1에서 보류

현재 landingType이 `product|promotion|page|link`로 충분히 범용적이므로, V1에서는 새 landingType `multilingualProduct` 같은 값을 바로 만들지 않는다.

### 8.2 권장 V1 연결

가장 단순한 V1은 다음이다.

```text
QR landingType = page
landingTargetId = multilingual content group id 또는 public page slug
```

공개 랜딩은 이 target을 읽고 언어 선택 후 해당 언어 페이지를 표시한다.

대안은 다음이다.

```text
QR landingType = product
landingTargetId = listing/local target
추가 매핑으로 product → content group resolve
```

하지만 현재 `store_qr_codes`에는 추가 metadata가 없고 `landingTargetId` 하나뿐이므로, V1에서는 `page` 연결이 더 안전하다.

### 8.3 product QR와의 관계

기존 product QR은 계속 유지한다. 다국어 마케팅 콘텐츠는 다음 중 하나로 연결한다.

```text
A. QR 생성 시 page 타입으로 다국어 콘텐츠 그룹 직접 연결
B. product QR 랜딩에서 연결된 다국어 콘텐츠 그룹이 있으면 콘텐츠 화면으로 유도
```

V1 추천은 A다. B는 상품 상세/매장상품 리스트와의 연결을 더 건드리므로 후속으로 본다.

---

## 9. QR 모바일 UX V1

### 9.1 첫 방문

```text
QR 스캔
→ 한국어 / Foreign Language
→ 외국어 선택 시 언어 목록
→ 해당 언어 콘텐츠 페이지 표시
```

### 9.2 언어 유지

같은 매장에서는 선택 언어를 유지한다.

```text
localStorage key: o4o:{storeSlug}:preferredLocale
```

다른 매장에서는 다시 선택하게 할 수 있다. 매장별 지원 언어가 다를 수 있기 때문이다.

### 9.3 fallback

```text
선택 언어 페이지 있음 → 해당 페이지 표시
없음 → 영어 페이지
영어 없음 → 한국어 페이지
```

---

## 10. 내 매장 상품 리스트 표시

새 관리 흐름을 만들지 않고 기존 내 매장 상품 리스트에 배지를 추가한다.

```text
[다국어 지원]
[언어 4개]
[QR 연결됨]
[타블렛 사용 가능]
```

상세 또는 hover에서는 언어별 상태를 볼 수 있다.

```text
한국어: 있음
English: 있음
中文: 있음
日本語: 없음
Tiếng Việt: 없음
ภาษาไทย: 없음
Bahasa Indonesia: 없음
```

---

## 11. 운영자 / 허브 / 매장 흐름

기존 흐름을 유지한다.

```text
운영자가 콘텐츠 등록
→ 매장 허브에 진열
→ 매장이 가져오기
→ 매장용 사본으로 사용
→ QR/타블렛에 연결
```

공급자 자료는 오프라인으로 수령하고 운영자가 등록한다. 공급자 직접 제작/업로드/정산 흐름은 본 IR 범위가 아니다.

가져오기 정책은 기존 기준을 따른다.

```text
매장 가져가기 = 복사
운영자 HUB 게시 = 노출
```

---

## 12. 타블렛 / TV / 로봇 관계

V1에서는 QR 모바일 표시가 우선이다. 다만 콘텐츠 저장 구조는 타블렛/TV/로봇 재사용을 막지 않아야 한다.

```text
같은 콘텐츠 페이지 그룹
→ QR 모바일: 세로 카드/스크롤
→ 타블렛: 큰 카드/터치형
→ TV/DSL: 이미지 중심 표시 또는 QR 노출
→ 로봇: 후속 음성/화면 연동
```

이번 IR의 구현 후보는 QR + 다국어 콘텐츠 저장/표시까지이며, 타블렛은 후속 WO로 분리한다.

---

## 13. 제외 범위

```text
파트너/가이드 수수료 계산
제휴마케팅 QR 템플릿 상세
DSL/POS API 연동
콘텐츠 항목 표준 분류
실시간 AI 번역
공급자 직접 업로드 포털
로봇 음성 질의
TV/DSL 자동 배포
```

---

## 14. 권장 WO 순서

### 1. Storage

```text
WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-STORAGE-V1
```

내용:

```text
store-scoped 다국어 상품 콘텐츠 그룹/페이지 저장소
locale: ko/en/zh/ja/vi/th/id
이미지 여러 장 순서 저장 가능
자유 콘텐츠 페이지 저장
```

### 2. Operator/Hub import

```text
WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-V1
```

내용:

```text
운영자 등록
매장 허브 진열
내 매장 가져오기=복사
```

### 3. Store product badge

```text
WO-O4O-STORE-PRODUCT-MULTILINGUAL-BADGES-V1
```

내용:

```text
내 매장 상품 리스트에 다국어 지원/언어 수/QR 연결 표시
```

### 4. QR landing

```text
WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1
```

내용:

```text
기존 QR page 흐름에서 다국어 콘텐츠 그룹 연결
한국어/Foreign Language 선택
언어 유지
fallback
```

### 5. Tablet

```text
WO-O4O-MULTILINGUAL-PRODUCT-TABLET-CONTENT-V1
```

내용:

```text
같은 콘텐츠 페이지를 타블렛 화면에서 표시
QR로 휴대폰 이어보기
```

---

## 15. 최종 판정

1. 기존 QR 구조는 재사용 가능하다.
2. 새 QR 시스템보다 다국어 콘텐츠 저장소가 선행되어야 한다.
3. `product_ai_contents`는 master-global이므로 매장별 다국어 마케팅 콘텐츠 저장소로 쓰면 안 된다.
4. V1은 `landingType='page'`로 다국어 콘텐츠 그룹을 연결하는 방식이 가장 안전하다.
5. 콘텐츠 유형 고정 분류는 만들지 않는다.
6. 매장 상품 리스트에는 다국어 지원 배지를 추가해야 한다.
7. 파트너/DSL/로봇/TV는 후속 확장으로 둔다.

---

## 16. 요약

```text
상품별 B2C 다국어 콘텐츠는 “번역 필드”가 아니라
매장 scope의 언어별 자유 마케팅 콘텐츠 페이지 그룹으로 저장한다.

QR-code는 기존 store_qr_codes를 유지하고,
우선 landingType='page'로 해당 콘텐츠 그룹을 가리키게 한다.

고객은 QR 모바일 랜딩에서 한국어/Foreign Language를 선택하고,
같은 매장에서는 선택 언어가 유지된다.
```
