# CHECK-O4O-KPA-TABLET-PRODUCT-DETAIL-DESIGN-AND-QR-V1

> WO: `WO-O4O-KPA-TABLET-PRODUCT-DETAIL-DESIGN-AND-QR-V1`
> 성격: 프론트(kiosk-core) — 태블릿 상품 상세를 2단 레이아웃으로 정비 + QR 상시 표시.
> Date: 2026-07-16

---

## 0. 결론

**PASS.** 상품 상세를 헤더(뒤로·코너명·QR) + 2단(이미지 40% / 정보 60%) 으로 정비했고, 가격이 `12000.00` 로 새던 결함을 함께 고쳤다. 배포본에서 실제 진입해 스크린샷으로 확인. **QR/가격 데이터 계약·API·DB 무변경.**

## 1. 변경

`packages/tablet-kiosk-core/src/TabletKioskPage.tsx` (detail view `mode==='detail'`):
- **헤더 추가**: `← 뒤로` · 코너명 · **QR 카드**("휴대전화로 이어서 보기" + QR). QR = `qrGuide.url`(현재 코너 콘텐츠의 모바일 화면 = screen-set QR).
- **2단 본문**: 왼쪽 이미지(카드형 4:3 배경/보더) + 분류 배지 / 오른쪽 상품명·가격·설명·안내 카드. inline 스타일만 쓰는 패키지라 media query 대신 **flexWrap + flexBasis(1:2)** → 넓은 태블릿=2단, 좁은 폭(모바일)=자동 세로 적층.
- **가격 포맷 결함 수정**: local 상품은 `priceDisplay = price_display`("12000.00" 원시 문자열)만 있어 그대로 노출됐다 → `formatPrice(number|string)` 정규화 + `productPriceText` 헬퍼(숫자→`12,000원`, 비숫자 라벨은 그대로, 없으면 `가격 문의`). 상세 + 카드 그리드 양쪽 적용.
- **시각 계층**: 상품명 26/800, 가격 24/800(파랑), 본문 최대폭 1180 중앙 정렬. 안내 문구는 기존 별도 카드(guideNote) 유지.

## 2. QR 연결 대상

WO: "QR = 현재 태블릿 콘텐츠의 모바일 화면. 가능하면 상품 상세 deep link."
→ `qrGuide.url`(= 코너 screen-set QR → `/qr/{slug}` 모바일 화면)을 사용했다. **WO 가 허용한 대체안**과 정확히 일치한다.
상품별 deep link(모바일에서 그 상품 상세로 바로)는 모바일 뷰어(PublicScreenSetViewer)에 상품 파라미터 지원이 없어 이번 범위 밖 → 후속. 코너 모바일 화면 연결로도 "다른 손님이 자기 폰으로 이어서 보기" 요구는 충족.

## 3. 실패 기준 대비 (배포본 실측)

대상: 구강 코너에 진열 상품(케어가글액 local, 8,500원) 추가 후 상세 진입.

| 실패 기준 | 결과 |
|-----------|:----:|
| 상세 화면에 QR 없음 | ✅ 해소 — 헤더 우상단 QR 카드 |
| 가격이 `12000.00` 로 표시 | ✅ 해소 — **`8,500원`** (`.00` 노출 false) |
| 이미지 아래 정보 평면 나열 | ✅ 해소 — 좌우 2단 |
| 상품명·설명·안내 구분 약함 | ✅ 해소 — 명(26/800)·가격(24/800)·설명·안내 카드 위계 |
| 모바일·태블릿 레이아웃 깨짐 | ✅ 해소 — flexWrap 로 태블릿 2단 / 390px 세로 적층 |

## 4. 검증

| 항목 | 결과 |
|------|------|
| 소비처 tsc (kpa / k-cosmetics / glycopharm) | ✅ 전부 EXIT=0 |
| KPA `vite build` | ✅ EXIT=0 |
| 배포 | ✅ Deploy Web Services success (run 29542299700) |
| 상품 상세 진입(태블릿 1280) | ✅ 헤더+QR+2단+`8,500원` 스크린샷 확인 |
| 가격 `.00` 노출 | ✅ **false** (상세·전 템플릿 카드) |
| console / pageerror / API 4xx·5xx | ✅ 0건 |

> 상세 뷰의 template-layout 분기는 screen set 소비(KPA)에서만 활성 → k-cosmetics/glycopharm 은 legacy 경로라 무영향(tsc 로 확인).

## 5. 데이터 상태

구강 코너에 검증용 진열 상품을 추가했다(케어가글액 local = 8,500원, 온토픽). 상품 상세 진입 경로 확보 목적이며 **삭제하지 않고 존치**(현재 진열 0건이던 데모를 실사용에 가깝게 함). supplier 2건은 카탈로그 병합 전이라 `product_name=null` → 화면 미렌더.

## 6. 후속

```
상품별 모바일 deep link(PublicScreenSetViewer 상품 파라미터) — 요구 확인 시
설명 중복(description===summary) dedup — 데이터 성격, 별도 판단
```

---

*상품 상세 = 헤더(뒤로·코너명·QR) + 2단(이미지 40%/정보 60%, flexWrap 반응형). 가격 결함(price_display "12000.00" raw 노출) → formatPrice 정규화, "8,500원" 실측. QR=코너 screen-set 모바일 화면. API·DB·데이터 계약 무변경. tsc0·build0·배포 success·스크린샷 확인.*
