# CHECK-O4O-KPA-OPERATOR-MENU-NAME-AND-FUNCTION-ALIGNMENT-V1

> WO: `WO-O4O-KPA-OPERATOR-MENU-NAME-AND-FUNCTION-ALIGNMENT-V1`
> 성격: KPA 운영자 매장 HUB 자료 메뉴명↔실제 기능 점검, 오해 분명한 항목만 정비.
> **route·권한·API·DB·기능 변경 0.** Date: 2026-07-24 · commit `cdc3363ce`(1파일) · Deploy Web success · smoke PASS

## 0. 결론 — ✅ PASS (오해 1건만 최소 수정)

6개 매장 HUB 자료 메뉴를 route→화면→제목/기능으로 점검. 오해가 분명한 **태블렛 화면 페이지 제목 1건**만
정렬(HUB prefix 일관 + '태블릿'→'태블렛' 통일). 나머지는 일치 또는 의도적 canonical → 무수정·보고.

## 1. 메뉴명 ↔ 실제 기능 대응표

| 메뉴 라벨 | route | 페이지 H1 | 관리 데이터 | 판정 |
|---|---|---|---|---|
| 매장 HUB 블로그 | /operator/blog | `매장 HUB 블로그` | blog posts | ✅ 일치 |
| 매장 HUB POP | /operator/pop | `매장 HUB POP` | pop posts | ✅ 일치 |
| 매장 HUB QR-code | /operator/qr | `매장 HUB QR-code` | QR **템플릿**(매장 복사 시 slug 발급) | ⚠️ 의도적 canonical(무수정) |
| 매장 HUB 동영상 | /operator/video | `매장 HUB 동영상 (QR 전용)` | video(외부 URL, QR 전용) | ✅ 부가어만 차이(무수정) |
| 매장 HUB 다국어 상품 콘텐츠 | /operator/multilingual-product-contents | `매장 HUB 다국어 상품 콘텐츠` | 다국어 상품 콘텐츠 원본 | ✅ 일치 |
| 매장 HUB 태블렛 화면 | /operator/tablet/screen-sets | ~~`태블릿 화면 세트 원본`~~→`매장 HUB 태블렛 화면 세트 원본` | 태블렛 화면 세트 원본 | 🔧 **수정** |

## 2. 변경한 명칭 (1건)

- `OperatorTabletScreenSetsPage.tsx` H1 `태블릿 화면 세트 원본` → **`매장 HUB 태블렛 화면 세트 원본`** + 부제 `태블릿`→`태블렛`.
  - ① **HUB prefix 추가** — 유일하게 prefix 없던 페이지, 다른 5개 매장 HUB 자료 페이지 H1과 일관.
  - ② **'태블릿'→'태블렛' 철자 통일** — 사용자가 선행 WO(TABLET-VIEWER-LANGUAGE)에서 지시한 '태블렛' 통일의
    누락분 완성(메뉴 라벨은 이미 '태블렛'). H1+부제 2곳.
  - ③ '세트 원본' 성격은 제목·부제에 보존(기능 오인 방지). 메뉴 라벨('매장 HUB 태블렛 화면')·route·기능 불변.

## 3. 변경하지 않은 항목 (이유)

- **블로그·POP·다국어 상품 콘텐츠**: 메뉴 라벨 = 페이지 H1 verbatim, 부제 = 기능 일치. 정상.
- **QR-code**: 페이지가 QR "템플릿" 관리(매장 복사 시 실제 store_qr_codes slug 발급)이나 메뉴 주석에
  `canonical 항목명 'QR-code' 유지` 명시 + 부제가 템플릿 구분을 공개 → **의도적 canonical 용어**. 익숙한 명칭
  불필요 변경 금지 원칙 + 사용자 정책(canonical) 존중 → 무수정.
- **동영상**: H1 `(QR 전용)` 부가어만 메뉴보다 상세, 오해 아님. '동영상'은 익숙한 명칭 → 무수정.
- **중복 메뉴·legacy 명칭 없음**: 6개 route 전부 distinct, 라벨이 존재하지 않는 기능을 가리키는 항목 0.

## 4. 검증

### 정적
- 메뉴·페이지 제목·부제 일치(태블렛) · route/권한/API/DB/기능 무변경 · 신규 메뉴 0 ·
  typecheck(web-kpa-society) 0 · KPA build 0.

### 브라우저 smoke (kpa-society, 운영자 sohae2100)
- `/operator/tablet/screen-sets` → H1 **'매장 HUB 태블렛 화면 세트 원본'** · 구 철자('태블릿') 잔존 **0** ·
  부제 '태블렛' 통일 · console 기능 오류 0(로그인 초기 무관 리소스 404 제외).

## 5. KPA 외 영향

- 변경 파일 = `OperatorTabletScreenSetsPage.tsx`(web-kpa-society operator 전용 페이지). 공통 컴포넌트·메뉴 config
  미변경 → GP/KCos/Neture 무영향. 메뉴 라벨(operatorMenuGroups) 무변경.

## 6. 커밋

- 코드 `cdc3363ce`(OperatorTabletScreenSetsPage.tsx) · 본 CHECK.
