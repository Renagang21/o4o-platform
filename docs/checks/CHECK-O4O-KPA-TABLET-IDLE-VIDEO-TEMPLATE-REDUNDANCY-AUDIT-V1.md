# CHECK-O4O-KPA-TABLET-IDLE-VIDEO-TEMPLATE-REDUNDANCY-AUDIT-V1

> IR: `대기 영상형`(idle_touch_video) 템플릿이 다른 템플릿과 중복인지, 고유 렌더가 있는지 코드·라이브 기준 조사.
> 성격: **조사 전용(read-only)**. 코드·DB 변경 0.

---

## 1. 판정 — **중복 아님 → 유지** (5 템플릿 유지)

`대기 영상형`은 kiosk 렌더러에 **고유 렌더 분기(`IdleTouchHero`)가 존재**하며, 사용자가 제시한 "유지 가능 조건"(터치 후에도 영상이 주요 영역으로 유지 / QR·터치 안내 배치 차이)에 실제로 부합한다.

---

## 2. 렌더 차이 (코드 근거)

kiosk-core [TabletKioskPage.tsx](../../packages/tablet-kiosk-core/src/TabletKioskPage.tsx):

| 항목 | idle_touch_video (대기 영상형) | 다른 템플릿 |
|------|-------------------------------|-------------|
| 상단 hero 영상 배너 | **있음** — `{isIdleTouch && <IdleTouchHero …/>}` ([:855-861](../../packages/tablet-kiosk-core/src/TabletKioskPage.tsx)) | 없음 |
| hero 영역 | `heroWrap` height **clamp(180px, 34vh, 360px)**, 영상 `objectFit:cover`, 없으면 gradient placeholder ([:1838-1858](../../packages/tablet-kiosk-core/src/TabletKioskPage.tsx)) | — |
| 터치 유도 | hero 오버레이 한/영 터치 안내 + 하단 hint bar([:1859-1903](../../packages/tablet-kiosk-core/src/TabletKioskPage.tsx)) | 기본 헤더 힌트("궁금한 상품을 터치해…")만 |
| QR 배치 | hero 내 **QR chip**(qrUrl/qrLabel 전달). floating QR 억제: `showFloatingQr = … && !isIdleTouch`([:504](../../packages/tablet-kiosk-core/src/TabletKioskPage.tsx)) | 우상단 floating QR 버튼 |
| 터치 후 | hero 영상 **상단에 유지** + 그 아래 코너 설명/콘텐츠/상품 섹션 이어짐([:852-854](../../packages/tablet-kiosk-core/src/TabletKioskPage.tsx)) | 영상은 idle 오버레이(무조작)로만, 터치 후엔 사라짐 |

**핵심**: 모든 템플릿의 `idle_media`는 무조작 시 **전체화면 idle 오버레이**로 재생되고 터치하면 사라진다(공통). `대기 영상형`만 추가로 **터치 후 콘텐츠 화면 최상단에 영상 hero(34vh)를 유지**한다 → 사용자가 든 유효 차별점("터치 후에도 영상이 주요 영역으로 유지", "QR·터치 안내 배치 차이")과 정확히 일치. → **중복 아님.**

- 참고: 영상 URL 없이 저장해도 hero는 gradient placeholder로 렌더되어 레이아웃 골격은 유지된다(이름-기능 불일치 아님).

## 3. templateKey 분기 요약
`templateKey`([:489-505](../../packages/tablet-kiosk-core/src/TabletKioskPage.tsx)): `isProductFocus`/`isProductGrid`(→`isProductLayout` 축약헤더+하단QR) / `isCornerOverview`(→`hideProductsBody` 상품그리드 생략) / `isIdleTouch`(→hero + floating QR 억제). 5종 모두 **서로 다른 레이아웃 분기**를 가진다.

## 4. 기존 사용 Screen Set
- 라이브 목록(사용자 제공 스크린샷, 2026-07-19)에 **`피부관리 대기 영상형`·`구강관리 대기 영상형`**(보호 샘플군) 이 이 템플릿을 사용 중. → 제거 시 **보호 샘플 파손** + 전환 필요. 유지가 안전.
- 정확한 사용 수는 아래 read-only 쿼리로 확인 가능(참고용, 미실행):
```sql
SELECT template_key, count(*) FROM store_tablet_screen_sets
 WHERE deleted_at IS NULL GROUP BY template_key ORDER BY 2 DESC;
```

---

## 5. 기록: "영상·이미지" 문구 부정확 (별개 정비 대상)

- 대기 화면 단계 안내([TabletScreenSetManager.tsx:95](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx)): "자동으로 재생할 **영상·이미지**입니다."
- 그러나 실제 입력 UI는 **YouTube/Vimeo URL 하나만** 받음(WO-O4O-KPA-TABLET-IDLE-VIDEO-URL-ONLY-V1, [:187-188](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx)·[:857-858](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx)). 이미지 업로드·선택 기능 없음. `idleSummary`도 "동영상 1개 (YouTube/Vimeo)"/"지정 안 함(기본 화면)"([:818](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx)).
- → 안내 문구가 현재 기능과 불일치. **"영상·이미지" → "영상"(또는 "대기 영상")** 으로 정정 권장.
- (참고: 내부 IdlePlaylistItem 타입은 image/video/youtube/vimeo 지원하나, 매장 입력 UI는 영상 URL 전용으로 축소됨 — 데이터 계약 문제 아님, **문구만** 부정확.)

---

## 6. 후속 제안
- **템플릿 유지**(5→4 축소 안 함). 대기 영상형은 고유 렌더 보유.
- **최소 문구 정정 WO(선택)**: 대기 화면 단계 안내 "영상·이미지"→"영상". 코드 1줄, DB/기능 무관. (이 IR 범위 밖 — 승인 시 별도 처리.)

## 7. 산출물
- 본 CHECK. 코드·DB 변경 0.
