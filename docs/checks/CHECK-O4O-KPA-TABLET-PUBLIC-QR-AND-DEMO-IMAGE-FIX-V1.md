# CHECK-O4O-KPA-TABLET-PUBLIC-QR-AND-DEMO-IMAGE-FIX-V1

> WO: `WO-O4O-KPA-TABLET-PUBLIC-QR-AND-DEMO-IMAGE-FIX-V1`
> 성격: 프론트(kiosk QR UI) + 데이터(데모 상품 이미지).
> Date: 2026-07-16

---

## 0. 결론

**PASS.** 고객용 태블릿의 QR 을 상시 노출 카드 → **우상단 작은 '휴대전화로 보기' 버튼 + 모달**로 단순화(QR 이미지는 모달에서만). QR 은 **비로그인 공개 화면**(`/qr/{slug}`)으로 연결. 피부·구강 데모 상품 6개에 **서로 구분되는 이미지**를 적용(Skin/Oral Care placeholder 제거). **공용 ProductMaster 무변경**(store_local_products 만).

## 1. 태블릿 QR UI (kiosk-core)

`TabletKioskPage.tsx`:
- **코너명 전용 헤더 밴드 제거** — screen-set 소비자(KPA, `qrGuide.url` 있음)에서만. 제목은 코너 설명 섹션이 담당. legacy(GP/KCos, `qrGuide` 없음)는 기존 헤더 유지 → **무영향**.
- **큰 QR 카드 + 상시 QR 이미지 제거** → 우상단 작은 **`▣ 휴대전화로 보기` 버튼**(`floatingQrBtn`, position:absolute).
- 버튼 클릭 → **QR 모달**(`qrModalOpen`) — QR 이미지(`QrImage size=200`)는 **모달에서만**.
- `idle_touch` 는 상단 hero 의 QR chip 유지 → 별도 버튼 없이 헤더만 숨김.
- 별도 제목/QR 섹션 신설 없음.

## 2. QR 공개 접근

- QR url = 서버가 Screen Set `public_qr_slug` 로 도출 → `/qr/{slug}` (`PublicScreenSetViewer`).
- **비로그인/시크릿에서 로그인 없이 바로 열림** — 실측 `/qr/tablet-corner`·`/qr/tablet-corner-2` 로그인 튕김 **false**, 콘텐츠 노출.
- 관리·수정·전환 기능 미노출(공개 뷰어). 일반 O4O 상품 설명서 로그인 정책 무변경.

## 3. 데모 상품 이미지 (store_local_products, PUT /local-products/:id)

반복되던 `Oral Care`/`Skin Care` **카테고리 placeholder 제거**. 상품별 **서로 다른 색 + 상품명 라벨**:

| 상품 | 이미지 |
|------|--------|
| 케어가글액(박하향) | Mint (민트) |
| 케어가글액(사과향) | Apple (레드) |
| 케어가글액(유칼립투스향) | Eucalyptus (스카이) |
| 후시딘연고 | Fucidin (바이올렛) |
| 비판텐연고 | Bepanthen (앰버) |
| 마데카솔겔 | Madecassol (틸) |

- 우선순위: 상품 대표 이미지/O4O 미디어 없음 → **구분되는 임시 샘플 이미지**(WO 3순위).
- 같은 이미지 반복 없음, 카테고리명만 placeholder 아님, 색·라벨로 시각 구분.
- 한글은 placehold.co 렌더 불가(??? 표시) → **ASCII 상품명 라벨**로 적용(1차 한글 시도 후 정정).
- `thumbnailUrl` + `images[0]` 갱신(`thumbnail_url || images[0]` 우선순위 대응). **ProductMaster 미변경**.

## 4. 실패 기준 대비 (배포본 실측)

| 실패 기준 | 결과 |
|-----------|:----:|
| 큰 QR 카드 남음 | ✅ 없음 (상시 QR svg 0) |
| 코너명 전용 상단 영역 남음 | ✅ 없음 (헤더밴드 h1 0) |
| QR 접속 시 로그인 요구 | ✅ 없음 (시크릿 로그인 튕김 false) |
| QR 이미지 평소 상시 노출 | ✅ 없음 (모달에서만) |
| 동일 placeholder 반복 | ✅ 없음 (6종 상이) |
| 피부·구강 이미지 미구분 | ✅ 구분 (색+라벨) |

## 5. 검증

| 항목 | 결과 |
|------|------|
| 우상단 작은 '휴대전화로 보기' 버튼만 | ✅ |
| 버튼 → QR 모달 | ✅ modal QR svg 1 + "휴대전화로 이어서 보기" |
| 시크릿 QR 접속 로그인 없이 모바일 화면 | ✅ |
| 피부 상품 3 서로 다른 이미지 | ✅ Fucidin/Bepanthen/Madecassol (색·라벨 상이) |
| 구강 상품 3 서로 다른 이미지 | ✅ Mint/Apple/Eucalyptus (색·라벨 상이) |
| 상품 상세 이미지 | ✅ |
| console/pageerror/API 오류 | ✅ 0 |
| 소비처 3곳 tsc / KPA build | ✅ EXIT=0 |

## 6. 유지 / 무변경

Screen Set·코너 연결 / 상품 상세 진입 / 기존 QR slug / 관리자 인증·편집 / 태블릿·QR 모바일 콘텐츠 구조 유지. ProductMaster·DB migration·QR 계약 무변경.

---

*태블릿 QR = 우상단 작은 버튼 → 모달(QR 모달 전용). 코너명 헤더밴드 제거(KPA screen-set 한정, legacy 무영향). QR=/qr/{slug} 비로그인 공개. 데모 상품 6개 상품별 구분 이미지(색+ASCII 라벨, placeholder 카테고리 제거, ProductMaster 불변). 실측 QR버튼·모달·시크릿접근·이미지구분·오류0.*
