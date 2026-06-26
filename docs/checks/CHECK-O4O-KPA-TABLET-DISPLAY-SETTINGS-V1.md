# CHECK-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1

> WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1 실행 결과
> 실행일: 2026-06-26 · 대상: 프로덕션 `https://kpa-society.co.kr` / API `o4o-core-api`
> 선행 IR: IR-O4O-KPA-TABLET-CONFIGURATION-CURRENT-STATE-AUDIT-V1
> 구현 커밋: `dd581403b` (backend+migration + KPA frontend + 공유 tablet-kiosk-core opt-in)

## 1. 작업 배경 / 선행 IR 요약

- 선행 조사: `타블렛 구성`은 제품 배치·Idle 재생목록은 있으나 **전시 설정(가격/QR/상담버튼/자동넘김)이 미구현**.
- 본 작업: `타블렛 구성` 화면 내부에 **전시 설정**(매장 공통)을 추가하고 공개 고객 화면에 반영. 타블렛=주문 채널 아님(전시·안내 노출 규칙).

## 2. DB / API 변경

| 종류 | 내용 |
|---|---|
| **migration** | `20261127000000-CreateStoreTabletDisplaySettings` — `store_tablet_display_settings`(organization_id UNIQUE, show_price/show_qr/show_consultation_button/auto_slide_seconds/idle_slide_seconds) |
| **관리 API** | `GET/PUT /api/v1/store/tablet-display-settings` (requireAuth+requirePharmacyOwner+org scope, upsert). `/tablets/:id` 충돌 회피 위해 별도 세그먼트 |
| **공개 API** | `GET /api/v1/stores/:slug/tablet/settings` (no auth, 행 없으면 기본값) |
| **상담 OFF 방어** | `POST /:slug/tablet/interest` — `source='tablet'` + `show_consultation_button=false` 시 **403 CONSULTATION_DISABLED**. QR page CTA(source='qr')는 제외 |

저장 방식: **A안 신규 테이블**(org당 1행). 기존 store-tablet.routes raw SQL 스타일과 동일. 기기별 설정은 device pairing 이후 확장.

## 3. 전시 설정 항목 (V1, 매장 공통)

| 항목 | 값 | 기본 |
|---|---|---|
| 가격 표시 | ON/OFF | ON |
| QR 표시 | ON/OFF | ON |
| 상담 요청 버튼 | ON/OFF | ON |
| 자동 넘김 시간 | 사용 안 함/5/10/15/30초 | 10초 |
| Idle 화면 전환 시간 | 5/10/15/30초 | 10초 |

## 4. 관리 화면 변경

- `StoreTabletDisplaysPage`에 **'전시 설정' 카드** 추가(Idle 재생목록 다음). 토글 3 + select 2 + '전시 설정 저장'. 저장 성공/실패 toast. 새로고침 후 GET으로 유지.
- 별도 사이드바 메뉴 없음(타블렛 구성 내부 섹션). 기존 기능(타블렛 목록/진열/Idle/내 매장 제품 연결) 유지.

## 5. 공개 고객 화면 반영

공유 컴포넌트 `@o4o/tablet-kiosk-core`(`TabletKioskPage`)에 **opt-in `displaySettings` prop** 추가 — 미지정 시 기존 동작(전부 표시, idle 5s). KPA 래퍼(`TabletStorePage`)가 `GET /tablet/settings` 조회 후 주입.

| 설정 | 공개 반영 |
|---|---|
| 가격 표시 OFF | 제품 카드/상세 가격 영역 숨김 (`displaySettings?.showPrice !== false`) |
| QR 표시 OFF | 'QR 코드로 접속' 배지 숨김 (`&& showQr !== false`) |
| 상담 버튼 OFF | 상세 '직원에게 안내 요청' 버튼 숨김 + **API 403 방어** |
| Idle 전환 시간 | IdleOverlay 이미지 전환 fallback(`durationMs ?? idleSlideSeconds*1000 ?? 5000`) |
| 자동 넘김(Browse) | **공개 뷰어에 Browse auto-slide 구조 없음 → 저장만, 반영은 후속**(§9) |

> K-Cosmetics 래퍼는 `displaySettings` 미주입 → 기존 동작 그대로(tsc kcos exit 0). **공유 변경은 순수 additive·opt-in.**

## 6. 상담 요청 OFF 처리

- 공개 UI: 상담 버튼 숨김.
- API: `POST /:slug/tablet/interest` 가 `source='tablet'`이고 설정이 OFF면 **403**(직접 호출 방어). QR page CTA는 별도 흐름이라 영향 없음.

## 7. 온라인 판매 비영향

- 변경 파일에 온라인 판매(판매 설정/상품/주문 관리/주문 알림) 없음. "주문/구매/결제/장바구니/온라인 판매" 사용자 노출 문구 없음. 전시 설정은 주문/결제와 무관.

## 8. 테스트 / 빌드 / smoke

| 검증 | 결과 |
|---|---|
| tsc `web-kpa-society` / `web-k-cosmetics` / `api-server` | ✅ 전부 error 0 |
| 배포 (web + api) | ✅ 둘 다 success (`dd581403b`). API 배포에 migration 자동 실행 포함 |
| 14.6 온라인 판매 무변경 | ✅ (git diff) |
| 14.1~14.5 브라우저 시각 smoke (관리 저장 / 공개 반영 / 상담 403 / 회귀) | ⬜ **보류** — Playwright 영속 프로필이 다른 Chrome 세션에 재점유되어 launch 실패(로컬 환경 제약). 프로필 해제 후 재검증 필요 |

> 비고: tsc(kpa/kcos/api) 전부 통과 + web/api 배포 success. 공개 뷰어 변경은 opt-in prop(미지정 시 기존 동작)이라 KCos 회귀 위험 낮음. 관리 저장/공개 반영/상담 403 의 시각 확인만 프로필 점유로 보류.

## 9. 남은 후속 과제

- **Browse 자동 넘김(auto-slide)**: 공개 뷰어에 제품 카드 자동 전환 구조가 없어 V1은 설정 저장만. 공개 Browse auto-advance 구현은 후속.
- Idle 진입 시간(현재 고정 60초)도 전시 설정화 후보(현재 미포함).
- 기기별 전시 설정 — `TABLET-DEVICE-SCOPED-PUBLIC-VIEW` 이후.
- 후속: **WO-O4O-KPA-TABLET-PREVIEW-V1**(기기별 미리보기), **WO-O4O-KPA-TABLET-INTEREST-REQUEST-UX-V1**(상담 대기 건수/바로가기).

## 결론

매장 공통 타블렛 전시 설정(가격/QR/상담버튼/자동넘김/idle전환)을 신규 테이블 + 관리 API/UI + 공개 API로 추가하고, 공개 뷰어(공유 kiosk-core)에 opt-in prop으로 반영. 상담 OFF는 UI 숨김 + API 403 방어. 자동 넘김은 공개 구조 부재로 저장만(후속). K-Cosmetics/온라인 판매 무영향, tsc 전부 통과.
