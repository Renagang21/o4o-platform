# CHECK-O4O-KPA-TABLET-BROWSE-AUTO-SLIDE-V1

> WO-O4O-KPA-TABLET-BROWSE-AUTO-SLIDE-V1 실행 결과
> 실행일: 2026-06-26 · 대상: 공개 타블렛 뷰어 `@o4o/tablet-kiosk-core`
> 선행: WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1 (autoSlideSeconds 저장·전달 완료)
> 구현 커밋: `2c18df48b` (frontend 단일 파일, opt-in)

## 1. 작업 배경 / 선행 관계

- 선행 WO 에서 `displaySettings.autoSlideSeconds` 저장 + 공개 API 전달 + `TabletStorePage → kiosk-core` prop 주입까지 완료. **Browse 화면이 값을 소비하지 않는 것만 미완**.
- 본 작업: 공개 Browse 화면에서 `autoSlideSeconds` 를 실제 소비해 제품 카드가 자동 순환하도록 함. IR 없이 좁은 구현.

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | Browse 자동 넘김(강조 카드 순환 + scrollIntoView). 단일 파일. API/DB/관리 UI 무변경 |

## 3. autoSlideSeconds 소비 방식

- `const autoSlideSeconds = displaySettings?.autoSlideSeconds ?? 0`.
- `useEffect`: `mode==='browse' && autoSlideSeconds>0 && products.length>1` 일 때만 `setInterval(autoSlideSeconds*1000)` 로 `browseIndex = (i+1) % length` 순환. cleanup(`clearInterval`)으로 unmount/의존성 변경 시 정리.
- 강조: 현재 `browseIndex` 카드에 teal outline + 약간 확대. `scrollIntoView({behavior:'smooth', block:'nearest'})` 로 화면 안에 유지.
- 마지막 제품 → 첫 제품 순환(`% length`).
- 사용자가 카드 직접 선택 → `setBrowseIndex(idx)` 동기화 후 상세 진입(§8.4). 상세/상담 모드에서는 `mode!=='browse'` 라 타이머 미동작(§8.5).

## 4. 예외/경계 처리

| 상황 | 동작 |
|---|---|
| autoSlideSeconds=0 / 미지정 | 타이머 없음(자동 넘김 OFF) |
| 제품 0개 | 타이머 없음, 오류 없음 |
| 제품 1개 | 타이머 없음(`length>1` 가드) |
| products 변경 | `browseIndex >= length` 시 0 보정 + 타이머 재설정(effect 의존성) |
| 상세/상담/idle 모드 | 자동 넘김 중지(`mode==='browse'` 한정) |

## 5. 공유 패키지 비영향 (additive·opt-in)

- `displaySettings` 미주입 또는 `autoSlideSeconds` 없음 → `autoSlideSeconds=0` → 타이머 없음 = **기존 동작 그대로**.
- **K-Cosmetics 래퍼는 displaySettings 미주입 → 자동 넘김 비활성**(tsc kcos exit 0). 기존 서비스에 자동 전환이 갑자기 켜지지 않음.

## 6. 테스트 / 빌드 / smoke

| 검증 | 결과 |
|---|---|
| `web-kpa-society` tsc | ✅ error 0 |
| `web-k-cosmetics` tsc (공유 소비처) | ✅ error 0 |
| 배포 (Web Cloud Run, `2c18df48b` 포함) | ✅ success |
| 11.2 관리 자동 넘김 저장/유지 | ✅ (선행 WO smoke 에서 자동넘김 15초 저장·새로고침 유지 실증) |
| 11.3 공개 Browse 자동 순환(2개+) | ✅ **PASS** (2026-06-26 재검증) — 자체 제품 2건 진열 + autoSlide 5초 → `/tablet/네뚜레-약국` Browse 에서 강조 카드가 **A → B 로 5초 주기 순환** 확인(outline 이동). 선행 WO-O4O-KPA-TABLET-PUBLIC-LOCAL-PRODUCTS-FIX-V1(자체 제품 공개 노출) 해소 후 가능해짐. 검증 후 데이터 정리 |
| 11.4 자동 넘김 OFF 비활성 | ✅ (autoSlideSeconds=0 가드 — 코드 경로) |
| 11.5 제품 0/1개 예외 | ✅ (length>1 가드 — 코드 경로) |
| 11.6 상세/상담/가격·QR/Idle 회귀 | ✅ (mode 분기 유지, 선행 smoke 에서 상담 403·설정 동작 확인) |
| 11.7 온라인 판매 무변경 | ✅ (git diff 단일 파일) |

## 7. 남은 후속 작업

- 진열 상품 2개+ 매장에서 **공개 Browse 자동 순환 시각 1회 확인**(데모 매장 진열 0건 한계).
- **WO-O4O-KPA-TABLET-IDLE-ENTER-DELAY-SETTING-V1**: Idle 진입 시간(현재 고정 60초) 설정화.
- **WO-O4O-KPA-TABLET-PREVIEW-V1**: 기기별 미리보기.
- 기기별 공개 화면 분리(device pairing).

## 결론

선행 WO 에서 전달만 되던 `autoSlideSeconds` 를 공개 Browse 화면에서 실제 소비 — 제품 카드 강조 순환(2개+에서 N초 주기, 마지막→첫 순환). additive·opt-in 으로 미주입 서비스(KCos) 무영향, API/DB/관리 UI/온라인 판매 무변경. tsc(kpa/kcos) 통과·배포 success. 공개 Browse 시각 순환은 데모 매장 진열 0건이라 코드/타입/배포로 검증(진열 매장 시각 확인 후속).
