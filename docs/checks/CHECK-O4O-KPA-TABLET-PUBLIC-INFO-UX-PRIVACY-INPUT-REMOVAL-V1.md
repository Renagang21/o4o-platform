# CHECK-O4O-KPA-TABLET-PUBLIC-INFO-UX-PRIVACY-INPUT-REMOVAL-V1

> 작업 완료 보고서
>
> 작업 제목: **O4O KPA 태블릿 공용 안내 UX 정비: 개인정보 입력·상담 요청 제거**
>
> 관련 WO: `docs/work-orders/WO-O4O-KPA-TABLET-PUBLIC-INFO-UX-PRIVACY-INPUT-REMOVAL-V1.md`
>
> 작성일: 2026-07-03

---

## 1. 요약

태블릿 V1을 **입력 장치가 아니라 공용 안내 장치**로 정리했다.

- 공개 태블릿 상품 상세에서 **개인정보 입력(이름/요청사항) UI 제거**
- **상담 요청 버튼 기본 미노출** — 매장이 `showConsultationButton=true`로 명시적으로 켠 경우에만 노출(개인정보 없이 관심만 전송)
- 상품 상세 최종 행동을 **"이 화면을 직원에게 보여주세요"** 안내로 전환
- 관리자 편성 화면의 상담 요청 문구를 **후속/비권장 기능**으로 정리 + 기본 OFF
- 콘텐츠 미연결 시 **기본 상품 설명 폴백 안내** 보강

QR Core / 소비자 관리 / 앱 / 디지털 사이니지 통합은 손대지 않았다.

---

## 2. 변경 파일 목록

| 계층 | 파일 | 변경 |
|---|---|---|
| 공통 런타임 | `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | 이름/요청사항 input 제거, `customerName`/`customerNote` state·action 정리, 상담 버튼 게이팅 `=== true`(명시적 opt-in)로 변경, 상세 CTA/로컬 안내 문구 변경, `styles.input` 제거, 헤더 주석 갱신 |
| KPA 편성 화면 | `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` | 전시 설정 초기값 `showConsultationButton: false`, 상담 버튼 토글 문구를 후속/비권장으로 정리, 콘텐츠 미연결 폴백 안내 보강 |
| 관리 API | `apps/api-server/src/routes/platform/store-tablet.routes.ts` | `DISPLAY_SETTINGS_DEFAULT.showConsultationButton: false` (신규 기본값) |
| 공개 API | `apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts` | settings fallback `showConsultationButton: false` |
| 문서 | `docs/work-orders/WO-...-V1.md`, `docs/checks/CHECK-...-V1.md` | WO 저장소 반영 + 본 CHECK |

`packages/tablet-kiosk-core/src/types.ts`는 변경하지 않았다(`TabletInterestSubmitBody`의 `customerName?`/`customerNote?`는 optional이라 후속 호환용으로 유지).

---

## 3. 제거/숨김 처리한 개인정보 입력 흐름

- 상세 뷰의 `이름 (선택사항)` / `요청 사항 (선택사항)` `<input>` 2개 완전 제거.
- reducer의 `UPDATE_CUSTOMER_NAME` / `UPDATE_CUSTOMER_NOTE` action, `RuntimeState.customerName/customerNote`, `initialState` 필드, 각 전이(`BACK_TO_BROWSE`/`SUBMIT_SUCCESS`/`RESET_TO_BROWSE`/`IDLE_EXIT`)의 클리어 로직, 미사용 `styles.input` 제거 → 미사용 state/action 잔재 없음(WO §9.1).
- `handleSubmitInterest`는 `masterId`만 전송하도록 변경(이름/요청사항 미전송).

## 4. 상담 요청 버튼 기본 비활성화 방식

- 게이팅을 `displaySettings?.showConsultationButton !== false` → **`=== true`**로 변경.
  - `displaySettings` 미주입(기본 wrapper / K-Cosmetics) 또는 필드 미설정 → **버튼 미노출**.
  - 매장이 명시적으로 `true`로 켠 경우에만 노출(후속 호환).
- `submitInterest` / `submitted` / status polling 흐름과 공개 상담 API는 삭제하지 않고 남김(WO §6.2 · §9.3).
- 신규 기본값(프론트 초기값 + 백엔드 GET/공개 fallback) 모두 `false`.
  - **주의(WO §6.3)**: 기존 `store_tablet_display_settings` row가 `true`인 매장은 계속 노출될 수 있음. DB 일괄 마이그레이션은 이번 범위 밖(별도 판단). 마이그레이션 파일(DEFAULT true)은 이미 적용되어 수정하지 않음.

## 5. 태블릿 상세 화면 최종 문구

- 공급 제품: 파란 안내 박스 — **"이 제품이 궁금하신가요? / 이 화면을 직원에게 보여주세요."**
- 매장 자체 제품: **"이 제품은 매장에서 직접 안내하는 상품입니다. 이 화면을 직원에게 보여주세요."**
- 하단 action bar: 상담 opt-in이 아닌 경우 `돌아가기`만 표시.

## 6. 관리자 편성 화면 문구 변경

- 상담 토글 라벨: `상담 요청 버튼 (후속 기능 · 권장하지 않음)`
- 설명: 태블릿 V1은 공용 안내 화면으로 개인정보 입력·상담 접수를 받지 않으며, 상담/개인정보는 후속 모바일 앱/PWA 기능에서 다룸. 기본 꺼짐, 켜더라도 개인정보 없이 관심만 전송.
- 콘텐츠 미연결 안내: `이 제품에 연결된 설명 콘텐츠가 없습니다. 태블릿에는 기본 상품 설명이 표시됩니다. 상품별 설명을 별도로 보여주려면 먼저 상품 설명 콘텐츠를 만들고 이 제품에 연결하세요.`

---

## 7. 검증 결과

### 7.1 정적 검증 (typecheck)

| 대상 | 결과 |
|---|---|
| `services/web-kpa-society` (`tsc --noEmit`) | ✅ PASS (에러 없음) |
| `apps/api-server` (`tsc --noEmit`) | ✅ PASS (tablet 관련 에러 없음) |
| `services/web-k-cosmetics` (공통 패키지 소비처) | ✅ PASS (tablet 관련 에러 없음) |

공통 패키지 변경이므로 소비처(KPA / K-Cosmetics) 모두 typecheck 확인 완료.

### 7.2 화면 검증 (브라우저)

> 배포 후 실제 브라우저 검증 결과를 기록한다.

- [ ] `/tablet/:slug` 공개 화면: 이름/요청사항 input 없음, 상담 버튼 기본 미노출, "직원에게 이 화면 보여주기" 안내 표시, 목록/상세/돌아가기/idle 정상
- [ ] `/store/commerce/tablet-displays` 관리 화면: 전시 설정 상담 토글 기본 OFF·문구 정리, 콘텐츠 미연결 폴백 안내, 미리보기에 개인정보/상담 UI 미노출

---

## 8. 미구현(범위 밖) 기록

- **QR Core** — 생성/저장/통계/메뉴 미수정(WO §7). `showQr`/QR 배지는 기존 유지.
- **소비자 관리 / 개인정보 / 상담 접수** — 후속 모바일 앱/PWA 또는 O4O 소비자 관리 기능에서 별도 설계(WO §4.3).
- **디지털 사이니지 통합** — 태블릿 idle 자체 minimal player 구조 유지(WO §8).
- **주문/장바구니/결제 / 앱 / 스마트 글래스** — 미착수.
- **기존 DB row 마이그레이션** — 별도 판단 대기.
