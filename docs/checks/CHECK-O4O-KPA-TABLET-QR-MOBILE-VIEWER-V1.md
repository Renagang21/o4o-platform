# CHECK-O4O-KPA-TABLET-QR-MOBILE-VIEWER-V1 (WO-B)

> WO: `WO-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1` / **WO-B (모바일 세로 뷰어)**
> 성격: 구현 — screen_set QR 소비자 모바일 세로형 뷰어. 대기영상(idle_media) 제외.
> 선행: `CHECK-O4O-KPA-TABLET-QR-LANDING-CONTRACT-V1`(백엔드 계약 + 공용 resolver)
> Date: 2026-07-15

---

## 0. 결론

screen_set QR 을 스캔한 소비자가 **태블릿과 같은 Screen Set 원본**을 **모바일 세로 화면**으로 보는 `PublicScreenSetViewer` 를 구현했다. 콘텐츠를 복사/재작성하지 않고, 채널별로 렌더만 분리한다.

```
태블릿  : 대기영상(idle_media) → 터치 안내 → 본 콘텐츠
QR 모바일: (대기영상 없이) 코너 설명 → 정보 콘텐츠 → 제품 목록 → 상세
```

- **`idle_media` 제외**(태블릿 전용). `qr_guide` QR 이미지도 제외(모바일 자기 QR 중복 방지). `product_content`(비활성) 제외.
- sections 는 공용 resolver 가 그대로 반환 → **제외는 뷰어에서만**(백엔드/resolver/API 무변경).
- 무인증 접근 유지. web typecheck 0.

---

## 1. 변경 (프론트 only)
```
services/web-kpa-society/src/pages/qr/PublicScreenSetViewer.tsx   (신규 모바일 세로 뷰어)
services/web-kpa-society/src/pages/qr/QrLandingPage.tsx           (landingType='screen_set' 분기)
services/web-kpa-society/src/api/storeQr.ts                       (QrScreenSet/Section 타입 + screenSet 필드)
```
- 백엔드/공용 resolver/`/qr/public/:slug`/DB/migration **무변경**(계약은 선행 WO 에서 배포 완료).

## 2. 렌더 구조 (§요구 순서)
`/qr/:slug` → `QrLandingPage` → `landingType==='screen_set'` → `PublicScreenSetViewer(screenSet)`:
- **코너 헤더**: `screenSet.name` + corner_description body.
- **코너 콘텐츠**(content_list): 카드(썸네일·출처 배지·제목·요약·관련상품). 상세 있는 카드 탭 → **모달**(`ContentRenderer`, DOMPurify — raw innerHTML 금지).
- **제품**(product_list): 2열 그리드 카드(이미지·이름·가격). (상품 상세는 별도 fetch 필요 → 이번 범위 밖, 후속.)
- 섹션은 `sortOrder` 순. 기존 video/page 분기와 동일 패턴(모바일 카드 UI, theme colors).

## 3. 채널 분리 — idle/qr 제외 (§대기 동영상 정정 반영)
| 블록 | 태블릿 | QR 모바일 |
|------|:-----:|:--------:|
| idle_media(대기영상) | 렌더 | **제외**(태블릿 전용) |
| qr_guide QR 이미지 | 렌더 | **제외**(자기 QR 중복 방지) |
| product_content(비활성) | 생략 | 제외 |
| corner_description / content_list / product_list | 렌더 | 렌더 |
- 공용 sections resolver 는 idle_media 를 그대로 반환할 수 있으나 `PublicScreenSetViewer` 에서 필터(`filter(blockType !== 'idle_media' && !== 'qr_guide' && !== 'product_content')`).

## 4. 완료 기준 대비 (정정된 §완료 기준)
| 기준 | 상태 |
|------|------|
| screen_set QR 응답이 모바일 세로 화면으로 표시 | ✅ (PublicScreenSetViewer 세로 레이아웃) |
| idle_media QR 모바일에서 제외 | ✅ (필터) |
| 코너 설명·콘텐츠·제품부터 바로 표시 | ✅ (헤더→콘텐츠→제품, 대기화면 없음) |
| 모바일에서 QR 이미지 중복 표시 안 함 | ✅ (qr_guide QR 미렌더) |
| 소비자 무인증 접근 유지 | ✅ (공개 /qr/:slug, 인증 없음) |

## 5. 검증
- web-kpa-society `tsc --noEmit`: **0**. content_list 카드 필드(itemId/sourceBadge/title/summary/thumbnailUrl/hasDetail/detail.html/relatedProductName)·product 필드(id/type/name/price/priceDisplay/imageUrl) = resolver 산출과 일치.
- web deploy(cfd320906): **success** (run 29384073894).
- **태블릿 runtime 회귀 없음**(배포 후 read-only): `/tablet/screen` 구강 content_list 5 / 피부 4 불변, idle_media는 태블릿 sections 에 **그대로 존재**(제외는 모바일 뷰어 전용 — 백엔드 무변경 확인).
- **QrLandingPage 무회귀 sanity**: 존재하지 않는 slug `/qr/__nonexistent__` → 정상 "QR 정보를 찾을 수 없습니다" 에러 카드 렌더(신규 screen_set 분기/import 가 페이지를 깨지 않음). 3 console error = 예상된 QR 404 만.
- **라이브 뷰어 smoke — DEFERRED**: 실제 렌더 확인에는 `screen_set` QR row 가 필요한데, 생성(`POST /pharmacy/qr` landingType='screen_set')은 **매장 owner 인증** 필요 → 자동 로그인 금지 → Deferred. 인증 세션(또는 후속 WO-C 자동 QR·WO-D 백필) 확보 후 확인 항목:
  1. screen_set QR 생성 → `/qr/{slug}` 접속(무인증) → 세로 화면.
  2. 대기영상 없음, 코너 설명/콘텐츠/제품부터 표시.
  3. content_list 카드 탭 → 상세 모달(ContentRenderer). 닫기.
  4. qr_guide QR 이미지 미표시. console error 0.
  5. 태블릿 `/tablet/{slug}?tabletId=` 는 여전히 대기영상 포함(회귀 없음).

## 6. 후속
```
WO-C  Screen Set 저장 시 QR 자동 연결(ensureScreenSetQr) + 태블릿 QR URL 자동 도출
WO-D  기존 콘텐츠 백필 + 실제 태블릿→QR 모바일 smoke(인증 세션)
(선택) QR 모바일 상품 상세(product 상세 fetch)
```

---

*screen_set QR 모바일 세로 뷰어 PublicScreenSetViewer — 태블릿과 같은 원본(sections) 소비, **대기영상(idle_media)·qr_guide QR·product_content 제외**, 코너 설명→콘텐츠 카드(상세 모달 ContentRenderer)→제품 그리드, 무인증. 백엔드/resolver/API 무변경(제외는 뷰어 only). web tsc0. 라이브 smoke=screen_set QR 생성이 owner 인증 필요 → DEFERRED.*
