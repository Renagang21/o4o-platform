# CHECK-O4O-KPA-TABLET-TEMPLATE-USABILITY-REFINE-V1

> WO: `WO-O4O-KPA-TABLET-TEMPLATE-USABILITY-REFINE-V1`
> 성격: 공개 태블릿 기본 템플릿(`corner_information_basic_v1`) **사용성·가독성·반응형 정비**. 렌더/스타일만, 데이터/API/schema 무변경.
> Date: 2026-07-13

---

## 0. 결론

기본 템플릿의 실사용 화면 문제 6종을 렌더링/스타일만으로 정비하고, 두 운영 샘플에서 배포 후 viewer smoke 로 확인했다.

- **제목 세로 깨짐(피/부/관/리) 해소** — 최대 난제. 가로/세로/좁은 폭 모두 1줄 정상.
- **코너 제목 / 코너 설명을 별도 섹션으로 분리** (리뷰 반영).
- QR 안내 카드화 + 전체 URL(`https://…`) 미노출(짧은 도메인만).
- 상품 0건 empty state 카드화.
- 설명문 가독성(줄폭/줄간격/여백) + clamp() 반응형.
- API/schema/block-config/데이터 변경 0. typecheck 0. 운영 샘플 무변경.

---

## 1. 발견한 화면 문제 (before)

`before-skin-1280.png` / `before-skin-500.png` 기준:

| # | 문제 | 원인 |
|---|------|------|
| 1 | 코너 제목이 세로로 깨짐(좁은 폭에서 피/부/관/리/코/너) | `header`가 `justify-content: space-between` 1행 → 제목이 긴 설명 옆에서 좁은 폭으로 압축 |
| 2 | 설명문이 헤더에 밀집, 제목과 한 줄에 뒤섞임 | 제목/설명 동일 헤더 행 배치 |
| 3 | `모바일로 더 보기 https://kpa-society.co.kr` 전체 URL 노출 | qr_guide 를 `label + url(wordBreak:break-all)` 나열 |
| 4 | 상품 0건이 화면을 텅 비게 함 | 중앙 한 줄 텍스트만 |
| 5 | 화면 폭 대응 부족 | 고정 폰트/패딩, grid minmax(220px) 고정 |

---

## 2. 수정한 레이아웃 항목

변경 파일: **`packages/tablet-kiosk-core/src/TabletKioskPage.tsx`** (렌더 JSX + `styles` 객체만).

| 항목 | 변경 |
|------|------|
| **제목 세로 깨짐(§5.1)** | 헤더를 space-between 1행 → **세로 스택**. 제목 `word-break: keep-all`(한글 단어 보존) + `clamp(18–26px)`. 제목 행이 전체 폭 확보 → 압축·세로 깨짐 제거 |
| **제목/설명 섹션 분리(리뷰)** | 헤더 = **코너 제목(+QR 배지)만**. 코너 설명 = **별도 섹션**("코너 안내" 라벨 + 본문, 틴트 배경 `#f8fafc` + 상단 구분선, `max-height:30vh` 자체 스크롤로 상단 독점 방지). 실제 corner_description 있을 때만(legacy/GP/KCos 는 헤더 힌트 유지) |
| **설명 가독성(§5.6)** | 본문 `line-height:1.65`, `max-width:70ch`, `clamp(13–15px)`, keep-all |
| **QR 카드화(§5.3·§5.4)** | `label + 전체 URL` → **카드**(▣ 아이콘 + 라벨 + "QR을 스캔하면 이 코너 안내를 모바일에서도 확인할 수 있습니다." + **짧은 도메인 배지**). `shortHost()` 로 hostname 만 표기, 전체 `https://…` 미노출. 상단(기본)·하단(product_focus) 공통 |
| **Empty state 카드(§5.5)** | 한 줄 → **카드**(🗂️ + "이 코너의 상품을 준비 중입니다" + "코너 안내를 확인하시고, 필요한 제품은 직원에게 문의해 주세요."). `products.length===0` 일 때만(상품 들어가면 자동 미표시) |
| **반응형(§5.2)** | 폰트/패딩 `clamp()`. 상품 grid `minmax(min(220px,100%),1fr)`(narrow overflow 방지). QR 카드 flexWrap(도메인 wrap) |

데이터(block config: corner_description/qr_guide label·url)는 **변경하지 않음** — 렌더링만 개선.

---

## 3. "모바일로 더 보기" / QR 안내 문구 정비

- 렌더 구조: 아이콘(▣) + **행동유도 라벨**(config label, 기본 "모바일에서 자세히 보기") + **정적 설명문** "QR을 스캔하면 이 코너 안내를 모바일에서도 확인할 수 있습니다." + **도메인 배지**(`kpa-society.co.kr`).
- 전체 URL(`https://…`)은 **미노출**. `shortHost(url)` 로 `www.` 제거한 hostname 만 작게 보조 표기.
- config 의 `label`/`url` 값 자체는 건드리지 않음(데이터 무변경). 현재 label 이 "모바일로 더 보기"라 화면엔 그대로 나오되, 카드 + 설명문 + 도메인 구성으로 어색함 해소.

---

## 4. 반응형 처리 기준

- 타이포/패딩 `clamp()` 로 폭 대응(고정 width 남용 없음).
- 상품 grid: `repeat(auto-fill, minmax(min(px,100%),1fr))` → 아주 좁은 폭에서도 한 열이 화면 밖으로 넘치지 않음, 폭 따라 1~n열 자연 대응.
- QR 카드/헤더 타이틀 행 `flex-wrap` → 좁으면 도메인/배지 아래로 줄바꿈(overflow 없음).
- 코너 설명 섹션 `max-height:30vh + overflowY:auto` → 긴 문단이 상단을 독점하지 않음.
- 검증 viewport: **1280×800(가로)** / **800×1280(세로)** / **500×800(좁은 폭)**.

---

## 5. 변경 파일 목록

```
packages/tablet-kiosk-core/src/TabletKioskPage.tsx   (렌더 JSX + styles only)
```

- 커밋: `d84e75dba`(1차 정비) + `23e6918b5`(제목/설명 섹션 분리, 리뷰 반영).

---

## 6. product_focus 영향 확인 (§6)

- `product_focus` **whitelist/blocks/새 템플릿 변경 없음**. `isProductFocus` 분기 유지.
- 공통 스타일 정비가 자연 적용된 부분: 축약 헤더(제목만)·`gridFocus`(minmax min() 반응형)·하단 QR을 동일 카드(`qrCardBottom`)로 정비. 코너 설명 섹션은 product_focus 에서 생략(기존 의도 유지).
- **live product_focus 검증은 Deferred**: 현재 어떤 screen_set 도 template_key='product_focus' 가 아니며(basic 1 + NULL 1), 전환은 관리 UI/DB write 필요(선행 WO 에서 Deferred). 정적/typecheck 로 비회귀만 확인.

---

## 7. 금지 범위 준수

| 금지 | 준수 |
|------|------|
| DB migration / API 변경 / `/screen` 응답 구조 변경 | ✅ 없음(백엔드 무변경) |
| block_type / templateKey / 새 템플릿 추가 | ✅ 없음 |
| 상품 seed / store_tablet_displays / 샘플 current 변경 | ✅ 없음(DB write 0) |
| QR 생성 기능 | ✅ 없음(placeholder 아이콘만) |
| 운영 샘플 삭제 | ✅ 보존 |
| OPL/serviceKey / Supplier·Neture 콘텐츠 혼합 | ✅ 없음 |

---

## 8. viewer smoke 결과 (배포 후, 프로덕션)

배포: main push → CI `deploy-kpa-society` **success**(run 29217323445, sha 23e6918b5). `@o4o/tablet-kiosk-core` 는 src 직접 소비 → 재배포로 반영.

| 코너 / viewport | 결과 |
|-----------------|------|
| 피부관리 1280×800 | 제목 1줄 / "코너 안내" 별도 섹션 / QR 카드(도메인) / empty 카드 ✅ |
| 피부관리 500×800 | **제목 1줄(세로 깨짐 완전 해소)** / 섹션 분리 / QR 카드 wrap / empty 카드 ✅ |
| 피부관리 800×1280(세로) | 정상 ✅ |
| 구강관리 1280×800 | 제목 1줄 / 섹션 분리 / QR 카드 / empty 카드 ✅ |

- 공개 API 재확인: `/tablet/screen`·`/idle`·`/products`·`/settings` 전부 **200**.
- **console/network error 0** (이번 세션은 auth/me 도 200 — 태블릿 무관 노이즈조차 없음).
- 제목 세로 깨짐/URL 원문 노출/빈 empty state 모두 해소 확인.

---

## 9. before / after 스크린샷 경로

스크래치패드(`.../scratchpad/tablet-usability-refine/`):

```
before-skin-1280.png       # 제목 2줄 압축 + 설명 우측 밀집 + 전체 URL
before-skin-500.png        # 제목 완전 세로 깨짐(피/부/관/리/코/너)
after-skin-1280.png        # 제목 1줄 + 코너 안내 섹션 + QR 카드 + empty 카드
after-skin-500.png         # 좁은 폭 제목 1줄(세로 깨짐 해소)
after-skin-800x1280.png    # 세로형 태블릿 정상
after-oral-1280.png        # 구강관리 코너 after
```

---

## 10. typecheck / build

- `@o4o/tablet-kiosk-core` `tsc --noEmit`: **0**.
- 소비처(Shared Module Protocol): `web-kpa-society` / `web-glycopharm` / `web-k-cosmetics` `tsc --noEmit` **전부 0**.
- 공유 패키지 안전성: `fetchScreen` 은 **KPA 만 주입** → GP/KCos 는 `screen=null`(cornerInfo/qrGuide null) → legacy 헤더(기본 문구)·QR 카드 미표시. 레이아웃 개선만 적용, 동작 변경 없음.

---

## 11. 완료 기준 대비

| 기준 | 상태 |
|------|------|
| 피부관리 제목 세로 깨짐 해소 | ✅ (1280/800/500 전부 1줄) |
| 구강/피부 설명 가독성 개선 + 섹션 분리 | ✅ |
| QR 안내 정돈 / 전체 URL 어색 노출 해소 | ✅ (카드 + 도메인) |
| 상품 0건 empty state 개선 | ✅ (카드) |
| 기본 반응형 깨짐 없음 | ✅ (가로/세로/좁은 폭) |
| API/schema/data 변경 없음 | ✅ |
| typecheck 통과 | ✅ (pkg + 3 소비처) |
| viewer smoke 통과 | ✅ |
| CHECK commit/push | ✅ (본 문서) |

---

## 12. 다음 단계 (후속 상품 seed WO 필요성)

템플릿이 정비되어 이제 실제 상품/코너 설명을 넣을 준비가 됐다.

```
WO-O4O-KPA-TABLET-V1-USABLE-CORNER-CONTENT-SEED-V1
  - 구강관리 3~5개 / 피부관리 3~5개 상품
  - 코너 설명 실제 매장 안내용 보정
  - product_list 실제 표시 → 카드 grid 반응형 재확인(현재 0건 empty 만 검증)
  - (겸사) product_focus 세트 1개로 live 전환 smoke(선행 Deferred 해소)
```

- 상품이 들어가면 empty 카드는 자동 미표시. 상품 grid(minmax min()) 반응형은 코드상 준비됨(실데이터 검증은 seed WO 에서).

---

*태블릿 기본 템플릿 사용성·반응형 정비 · 렌더/스타일만(데이터·API 무변경) · 제목 세로 깨짐 해소 + 코너 제목/설명 섹션 분리 + QR 카드(도메인만) + empty 카드 + clamp 반응형 · 공유 패키지 3소비처 typecheck 0 · 배포 후 프로덕션 viewer smoke(1280/800/500, 양 코너) PASS · error 0 · 운영 샘플 무변경 · before/after 스크린샷 6매.*
