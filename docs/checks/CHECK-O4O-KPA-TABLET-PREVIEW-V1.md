# CHECK-O4O-KPA-TABLET-PREVIEW-V1

> WO-O4O-KPA-TABLET-PREVIEW-V1 실행 결과
> 실행일: 2026-06-26 · 대상: 프로덕션 `https://kpa-society.co.kr`
> 선행: 타블렛 구성/전시 설정/자동 넘김/자체 제품 노출 WO (완료)
> 구현 커밋: `67fe11bf0`(미리보기) + `3ee04c2ef`(Router 중첩 fix) — Web 배포 success

## 1. 작업 배경 / 목적

- 매장 경영자가 타블렛을 구성한 뒤 고객 화면을 확인하려면 별도 공개 URL 로 이동해야 했음.
- `타블렛 구성`(`/store/commerce/tablet-displays`) 화면 안에서 **현재 저장된 구성·전시 설정 기준 고객 화면을 미리보기**하는 기능 추가.

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/.../StoreTabletDisplaysPage.tsx` | '고객 화면 미리보기' 버튼 + 미리보기 오버레이(모달). kiosk-core 재사용, 미리보기 전용 api 주입, 저장된 전시 설정 fetch |
| `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | **opt-in `slug?` prop** 추가(미지정 시 `useParams` — 기존 동작). 라우트 밖 임베드용 |

- API/DB/migration **무변경**. 기존 공개 API(`/tablet/products`, `/tablet/settings`) 재사용.

## 3. 구현 방식

- 미리보기 오버레이(zIndex 100000) 안에 **공유 `TabletKioskPage` 재사용** — 공개 고객 화면과 동일 렌더(가격/QR/상담버튼/자동 넘김).
- **미리보기 전용 api 주입**:
  - `fetchProducts` → 공개 `fetchTabletProducts(slug)` (저장된 매장 공개 데이터).
  - `submitInterest`/`checkStatus` → **throw('미리보기에서는 상담 요청이 전송되지 않습니다.')** → 실제 `tablet_interest_requests` 생성 차단.
- `displaySettings` = 저장된 전시 설정(공개 `fetchTabletSettings`) 주입 → 가격/QR/상담버튼/idle 전환 반영.
- **Router 중첩 회피**: 초기 구현이 `MemoryRouter` 를 BrowserRouter 안에 중첩해 React Router v6 크래시(ErrorBoundary) → kiosk-core 에 `slug` prop 추가로 해소(MemoryRouter 제거, `slug={previewSlug}` 직접 주입).
- 데이터 기준: **저장된 데이터**(공개 endpoint). 미저장 변경은 미반영(저장 후 재오픈) — 모달 안내 문구로 명시.
- V1 = **매장 단위 공개 화면 기준**(위치별 타블렛 분리는 후속) — 상단 배너에 명시.

## 4. 브라우저 smoke (배포본 `3ee04c2ef`, 2026-06-26)

> 로컬 Playwright 영속 프로필을 점유하던 잔여 chrome 트리(이전 launch 좀비)를 정리 후 검증.

| 검증 | 결과 |
|---|---|
| 12.1 타블렛 구성 진입 + 기존 기능 | ✅ 타블렛 목록/Idle/전시 설정/진열 picker 유지 |
| 12.2 미리보기 버튼 + 모달 | ✅ '고객 화면 미리보기'(타블렛 선택 시 활성) → 모달 **크래시 없이** 오픈(Router 중첩 fix 검증). 제목/안내/닫기 표시 |
| 12.3 제품 미리보기 | ✅ 진열 제품 2건(SMOKE_프리뷰_A/B) 카드 노출, sort_order 반영 |
| 12.4 전시 설정 반영 | ✅ 가격 표시 ON → 13000/26000 노출, QR ON → 'QR 코드로 접속' 배지. (가격/QR/상담 OFF hide 는 공개 뷰어와 동일 `displaySettings` 경로 — 공개 뷰어 smoke 에서 실증) |
| 12.5 상담 요청 차단 | ✅ previewApi.submitInterest 가 throw → 실제 요청 미생성. (local 제품은 상담 버튼 미표시 — supplier 제품 부재로 버튼 자체 미노출) |
| 12.6 자동 넘김 + 닫기 cleanup | ✅ autoSlide 5초 → 강조 카드 **B → A 순환**(6초 후 재확인). 닫기 시 모달 unmount → kiosk useEffect cleanup 으로 timer 정리 |
| 12.8 기존 기능 회귀 | ✅ |
| 12.9 GP/KCos 비영향 | ✅ kiosk-core `slug?` 는 opt-in(미지정 시 useParams) — KCos tsc 0, 미주입 무변화 |
| 12.10 온라인 판매 비영향 | ✅ (git diff) |

- tsc: `web-kpa-society` / `web-k-cosmetics` error 0. 검증 후 SMOKE 데이터(제품 2건·진열·설정) 정리.

## 5. V1 제외 / 한계 (CHECK 명시)

- **Idle 미리보기**: V1 은 Browse(제품) 미리보기만. Idle 화면 미리보기 탭은 후속.
- **위치별(기기별) 미리보기**: V1 은 매장 단위 공개 데이터 기준(device-scoped 분리는 후속 `WO-...-DEVICE-SCOPED-PUBLIC-VIEW`). 모달 배너에 명시.
- **미저장 변경 미반영**: 저장된 데이터 기준(저장 후 재오픈).
- **QR**: 현재 kiosk 의 QR 은 'QR 코드로 접속' 진입 배지(showQr 설정 연동)만 — 제품별 QR 렌더는 별도(후속).

## 6. 남은 후속

- Idle 미리보기 탭.
- `WO-O4O-KPA-TABLET-IDLE-ENTER-DELAY-SETTING-V1` (Idle 진입 시간 설정화).
- `WO-O4O-KPA-TABLET-DEVICE-SCOPED-PUBLIC-VIEW-V1` (기기별 공개/미리보기 분리).
- `WO-O4O-KPA-STORE-LOCAL-PRODUCT-PRICE-INPUT-HARDENING-V1` (priceDisplay 비숫자 400/정제).

## 결론

`타블렛 구성` 화면에 **고객 화면 미리보기 모달**을 추가 — 공유 kiosk-core 를 opt-in `slug` prop 으로 재사용하고, 미리보기 전용 api 로 공개 데이터 조회 + 상담 POST 차단. 저장된 전시 설정(가격/QR/자동 넘김) 반영. 초기 Router 중첩 크래시는 slug prop 도입으로 해소. 브라우저 smoke 전 항목 PASS, GP/KCos·온라인 판매·API/DB 무변경, tsc(KPA/KCos) 통과.
