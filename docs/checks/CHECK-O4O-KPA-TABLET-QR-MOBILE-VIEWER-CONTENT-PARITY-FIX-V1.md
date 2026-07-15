# CHECK-O4O-KPA-TABLET-QR-MOBILE-VIEWER-CONTENT-PARITY-FIX-V1

> WO: `WO-O4O-KPA-TABLET-QR-MOBILE-VIEWER-CONTENT-PARITY-FIX-V1`
> 성격: 보정 — WO-B 모바일 뷰어 채널 필터를 확정 방향으로. QR 모바일 제외는 `qr_guide` 하나뿐.
> 선행: `CHECK-O4O-KPA-TABLET-QR-MOBILE-VIEWER-V1`(WO-B)
> Date: 2026-07-15

---

## 0. 결론

QR 모바일 화면이 태블릿 Screen Set의 **공통 콘텐츠를 누락 없이** 소비하도록 WO-B 뷰어의 채널 필터를 보정했다. 두 채널 차이는 콘텐츠 유무가 아니라 배치·이용 방식이다.

- **`idle_media` 모바일 표시**(상단 안내 미디어, 터치 진입 없이 아래 본문 스크롤).
- **`product_content` 제외 해제**(공통 원본의 일부, 산출 데이터 있으면 ContentRenderer/카드).
- **`qr_guide` 만 제외**(모바일 자기 QR 중복 방지).
- API/DB/공용 resolver/태블릿 kiosk **무변경**. web typecheck 0.

---

## 1. 블록 처리 기준 (§5, 보정 후)
| 블록 | 태블릿 | QR 모바일 | 뷰어 처리 |
|------|:-----:|:--------:|-----------|
| idle_media | 표시 | **표시** | 상단 미디어(image/video/youtube·vimeo) + 안내 문구 |
| corner_description | 표시 | 표시 | 헤더(코너명 + body) |
| content_list | 표시 | 표시 | 카드 + 상세 모달(ContentRenderer) |
| product_list | 표시 | 표시 | 2열 제품 그리드 |
| product_content | 표시 | **표시** | 방어적 렌더(본문 있으면 ContentRenderer/카드) |
| health_info | 표시 | 표시 | 정적 텍스트 |
| qr_guide | 표시 | **제외** | 모바일 미표시(자기 QR 중복 방지) |
| staff_inquiry | 기존 정책 | 기존 정책 | 변경 없음 |

- 필터: `blockType !== 'qr_guide'` **하나만** 제외(+ idle_media·corner_description 은 별도 위치에서 렌더하므로 본문 루프에서만 분리, 화면에는 표시됨).

## 2. idle_media 모바일 렌더 (§1·§2)
- 상단 `IdleMediaBlock` — idle_media 첫 항목: `image`→`<img>`, `video`→`<video controls playsInline>`, `youtube|vimeo`→`<iframe>`(`toVideoEmbed` 재사용, web-kpa-society 기존 유틸).
- **터치 진입 강제 없음** — 영상 아래 본문(코너 설명→콘텐츠→제품)을 바로 스크롤.
- 안내 문구: **"이 코너의 안내 영상을 확인하세요 / Watch this corner introduction"**. 태블릿의 "화면을 터치하세요"는 **미사용**(§2).

## 3. product_content 모바일 렌더 (§3)
- 제외 해제. 공용 resolver 산출(`data`)에 `title`/`summary`/`html`(또는 `body`)가 있으면 **기존 `ContentRenderer`(DOMPurify) / 카드**로 렌더.
- **현재 resolver 산출 = `{ productRef, contentId }` 참조만**(본문 없음) → 표시 본문이 없으면 미표시. 이는 **태블릿과 동일**(TabletKioskPage 도 product_content 렌더 브랜치 없음 — dormant). resolver 변경/fetch/콘텐츠 복사 없이, 데이터가 채워지면 자동 렌더되도록 방어적 처리(§금지사항 준수).

## 4. qr_guide 제외 유지 (§4)
- QR 로 진입한 모바일에서 같은 QR 이미지를 다시 표시하지 않는다.

## 5. 변경 파일 (프론트 only)
```
services/web-kpa-society/src/pages/qr/PublicScreenSetViewer.tsx
```
- API/DB/migration/공용 resolver(`store-public-screen-set-resolve.ts`)/`/qr/public/:slug`/태블릿 kiosk/운영 샘플 **무변경**(§금지사항 준수). `toVideoEmbed` 는 기존 유틸 재사용.

## 6. 검증
| 항목 | 결과 |
|------|------|
| web-kpa-society tsc | **0** |
| web deploy(032168adf) | ✅ **success** (run 29389484870) |
| QrLandingPage 무회귀 sanity | ✅ (없는 slug → 정상 에러 카드, 보정이 페이지 미파손) |
| 태블릿 sections/runtime 불변 | ✅ (프론트 뷰어만 변경, 백엔드 미접촉) |
| idle item 타입/toVideoEmbed | ✅ (image/video/youtube/vimeo) |

- **라이브 뷰어 smoke — DEFERRED(WO-D)**: 실제 렌더에는 `screen_set` QR row 필요 → 생성이 매장 owner 인증 → 자동 로그인 금지 → Deferred. 인증/후속 확보 시 확인:
  1. `/qr/{slug}` 무인증 → 상단 idle 영상 표시, 아래로 코너 설명→콘텐츠→제품 스크롤(터치 진입 없음).
  2. idle 문구 "이 코너의 안내 영상을 확인하세요 / Watch..."(터치 문구 아님).
  3. product_content 본문 있으면 표시(현재 참조만이면 미표시 = 태블릿 동일).
  4. qr_guide QR 미표시. content_list 상세 모달 정상. console error 0.
  5. 태블릿 `/tablet/{slug}?tabletId=` 대기영상·터치 흐름 불변.

## 7. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| 공통 Screen Set 콘텐츠 그대로 소비 | ✅ |
| idle_media 포함 | ✅ |
| product_content 포함(비제외) | ✅ (방어적 렌더, 데이터 의존) |
| qr_guide 만 제외 | ✅ |
| API·DB·태블릿 runtime 변경 없음 | ✅ |
| commit/push·배포 | ✅ (032168adf · web deploy success) |

## 8. 후속
```
WO-C  Screen Set 저장 시 QR 자동 연결 + 태블릿 메인 QR URL 자동 도출
WO-D  기존 콘텐츠 백필 + 실제 태블릿→QR 모바일 smoke(인증)
```

---

*WO-B 채널 필터 보정 — QR 모바일 제외는 qr_guide 하나. idle_media=상단 안내 미디어(터치 진입 없음, "안내 영상을 확인하세요" 문구, toVideoEmbed 재사용). product_content=제외 해제·방어적 ContentRenderer 렌더(현 resolver 참조만→미표시, 태블릿과 동일). API/DB/resolver/kiosk 무변경. web tsc0. 라이브 smoke=screen_set QR 필요→WO-D Deferred.*
