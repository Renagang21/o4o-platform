# CHECK-O4O-KPA-TABLET-STORE-UX-AND-SAMPLE-GUIDE-FIX-V1

> WO: `WO-O4O-KPA-TABLET-STORE-UX-AND-SAMPLE-GUIDE-FIX-V1`
> 성격: 프론트(근무자 UX) + 백엔드(QR 정합) + 데이터(샘플).
> Date: 2026-07-17

---

## 0. 결론

**§1·§2·§3·§5 = PASS (배포본 실측 검증 완료).** **§4(샘플 실이미지) = 사진 수령 대기** — 피부·구강 코너에 맞는 실제 상품 사진이 플랫폼에 존재하지 않음이 조사로 확정되어(전량 전신 OTC 정·캡슐 사진), 사용자가 실제 제품 사진을 제공하기로 결정. 그 사진을 받는 즉시 local `thumbnail_url` 에 적용해 마무리한다. §4 문안은 이미 실사용 수준(코너 설명·콘텐츠 카드 자연스러움 실측 확인).

근무자 관점 핵심 달성: **모든 코너를 한 화면에서 보고(현황판), 한 번에 바꾸고(1동작 교체), 한 종류 미리보기로 확인.** 내부 용어 0.

배포 커밋: `5159917cc`(§1-§3·§5) → `15f3e6a4b`(board 기본화면) → `3626629c5`(되돌리기) → `ac3cc128c`(휴대전화 390px). 웹·API 배포 success.

---

## 1. §1 매장 코너 현황판 (기본 화면)

- 태블릿 관리 진입 = **코너 카드 그리드**가 기본 화면(로드 시 자동 선택 제거 — 그전엔 곧장 상세뷰라 현황판이 안 보였음).
- 카드 = 코너명 + **"지금 나오는 화면"**(대표 미리보기, 경량 — kiosk 상시 렌더 아님) + `화면 바꾸기` + `미리보기`.
- 내부 용어(Screen Set / template_key / current / 연결 / 블록 수) **미노출** — 실측 `internalTerms=none`.
- 카드 본문 클릭 = 상세 설정(관리) 진입(보조).
- 실측: 코너 2개(구강관리·피부관리) 카드, `화면 바꾸기 2 / 미리보기 2`, `지금 나오는 화면` 표시. 스크린샷 `v1-board.png`.

## 2. §2 화면 바꾸기 (1동작)

- 카드 `화면 바꾸기` → 모달: 현재 화면 **"지금 사용 중"**, 다른 화면 각 **"이 화면으로 바꾸기"**, **"+ 다른 화면 골라 넣기"**(미연결 화면 검색).
- 교체 = **한 번**. `applyCurrentScreenSet` 이 연결 보장 + current 적용을 원자 처리(2단계·용어 없음).
- 변경 직후 **성공 토스트 + 되돌리기**(액션 토스트는 8s 유지). 되돌리기 = 직전 화면 재적용(없으면 해제).
- 실측(실제 저장): apply `POST current-screen-set 200` + 토스트 "…화면을 '…'로 바꿨어요" + **되돌리기 버튼** → 클릭 시 undo `POST 200` + "이전 화면으로 되돌렸어요". 스크린샷 `v2-swap.png` / `v2b-swap-applied.png`.
- 검증 후 코너 current = 보호 세트로 복원(안전 복원 포함).

## 3. §3 미리보기 (1종)

- 미리보기 오버레이 1종: 상단 **`태블릿` / `휴대전화` 전환** + 보조 **`새 창에서 열기` · `주소 복사`** + `닫기`.
- 휴대전화 보기 = **390px 폰 프레임**(kiosk `embedded`로 부모 박스 채움 — 그전엔 viewport-fixed라 전체폭). 실측 스크린샷 `v3-preview-tablet.png` / `v3-preview-mobile.png`(390px 중앙 프레임 확인).
- 카드·상세 모두 이 모달을 연다. 상세의 "태블릿에서 화면 열기"는 실제 태블릿 실행용으로 존치.

## 4. §5 QR 정합 (백엔드+프론트)

- **상품 parity**: resolver `product_list` 가 QR(tabletContext 없음)에서도 `current_screen_set_id` 로 코너 태블릿을 도출해 supplier 를 진열(`store_tablet_displays`, configured)로 제한 → 태블릿과 동일 집합. (local 은 기존부터 진열 제한.)
- **QR 대기영상 제거**: resolver 가 QR 경로에서 `idle_media` 섹션 미출력 + `PublicScreenSetViewer` idle-first 렌더 제거. 대기화면은 무조작 태블릿 전용(태블릿 대기·자동복귀 유지).
- 실측(공개 API, 비로그인): QR 피부(`tablet-corner-9`) `sections=[corner_description, content_list, product_list, qr_guide]`, **`idle_media present? false`**, **`product_list=3`(후시딘·비판텐·마데카솔)=코너 진열과 정확히 일치**(이전 8개+가글 혼입 → 3개). 로그인 튕김 false, 오류 0. 스크린샷 `v5-qr-skin.png` / `v5-qr-oral.png`.

## 5. §4 샘플 재정비 — 이미지 조사 결과 & 대기

**보호 샘플 무변경**(삭제·보관·초기화 안 함). 편집 전 현재 상태 백업 완료(`sample-backup-*.json`: 6개 local 상품 + thumbnail_url).

**실이미지 조사(프로덕션 read-only)**:
- 6개 샘플 상품 thumbnail = 외부 `placehold.co` 색+영문명, 가글 3종은 `%250A`(이중 인코딩) → **`%0A` 리터럴 깨짐**(휴대전화 미리보기에서 "Mint%0AGargle" 실측).
- 후시딘·비판텐·마데카솔·가글 등 **샘플 상품명 실이미지 = 0**. `product_images` 실이미지 2,791건은 **전량 전신 OTC 정·캡슐 사진**(GCS `o4o-media-library`)으로 피부·구강 코너 부적합. 매장 자료함 실사진 = 없음(테스트용 sample.webp만).
- supplier 경로는 이미지 하드코딩 `[]`라 막힘(Path B). Path A(local thumbnail_url) 만 유효.

**결정**: 지어내거나 무관한 약 사진을 붙이면 교보재 신뢰가 깨지므로, **사용자가 실제 제품 사진을 제공** → 받는 즉시 local `thumbnail_url` 에 적용(placehold·%0A 제거). §4 문안(코너 설명·콘텐츠 카드)은 실측상 이미 자연스러워 재작성 불필요.

## 6. 검증 항목 대비 (실패 기준)

| # | 항목 | 결과 |
|---|------|:----:|
| 1 | 첫 화면 모든 코너 카드로 현재 화면 확인 | ✅ |
| 2 | 교체 = 화면 바꾸기 → 이 화면으로 바꾸기로 끝 | ✅ (POST 200, 실저장) |
| 3 | 연결·current·Screen Set 용어 미노출 | ✅ (internalTerms=none) |
| 4 | 코너 미리보기 태블릿·휴대전화 1종 | ✅ (390px 프레임) |
| 5 | 피부·구강 샘플 실제 상품 이미지 | ⏳ 사진 수령 대기(실이미지 부재 확정) |
| 6 | placehold·색상영문·%0A 잔존 없음 | ⏳ 사진 적용 시 제거 |
| 7 | 샘플 설명·상품 구성 자연스러움 | ✅ (문안 실사용 수준) |
| 8 | 태블릿·QR 상품 집합·이미지 일치 | ✅ (QR=코너 진열 3개 동일) |
| 9 | QR 대기영상 먼저 표시 안 됨 | ✅ (idle_media 미출력) |
| 10 | console·pageerror·API 오류 없음 | ✅ (0) |

## 7. 하지 않은 것 / 무변경

자동 전환·예약·계절 스케줄러·신규 샘플/복제 기능 미구현. 카드마다 kiosk 상시 렌더 안 함(경량 대표). 외부 placeholder 미사용. 보호 샘플 삭제·초기화 없음. 스키마/마이그레이션 변경 0. ProductMaster 무변경. 태블릿 대기화면·자동복귀 유지.

## 8. 빌드/검증

- frontend `tsc --noEmit` EXIT=0 / api-server `tsconfig.build` EXIT=0.
- 웹·API Cloud Run 배포 success. 배포본 브라우저 실측(약국 경영자 계정, kpa-society.co.kr): board / swap 실저장+되돌리기 / preview 태블릿·휴대전화 / QR 비로그인·parity·idle제거, console·network 오류 0.
- 스크린샷: PC 관리(`v1-board`, `v2-swap`, `v2b-swap-applied`), 미리보기(`v3-preview-tablet`, `v3-preview-mobile` 390px), QR 모바일 390px(`v5-qr-skin`, `v5-qr-oral`).

---

*근무자 UX = 코너 현황판(한눈에) + 1동작 교체(연결·용어 없음, 되돌리기) + 미리보기 1종(태블릿/휴대전화 390px). QR = 태블릿과 상품 동일(진열 3개) + 대기영상 first 제거. §4 실이미지는 플랫폼 부재 확정 → 사용자 실사진 제공 후 local thumbnail_url 적용 예정(문안은 이미 실사용 수준). 스키마·ProductMaster·보호샘플 무변경.*
