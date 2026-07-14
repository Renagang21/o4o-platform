# CHECK-O4O-KPA-TABLET-TEMPLATE-THREE-PATTERNS-V1

> WO: `WO-O4O-KPA-TABLET-TEMPLATE-THREE-PATTERNS-V1`
> 성격: 태블릿 화면 템플릿 3종 추가(기존 Screen Set/Block/runtime 재사용, 새 block/migration 없음).
> Date: 2026-07-14

---

## 0. 결론

KPA 태블릿 Screen Set 에서 선택 가능한 템플릿을 2종 → **5종**으로 확장했다. 신규 3종은 **kiosk viewer 의 `template_key` 레이아웃 분기**로 구현했고(기존 sections 재배치), 화면 QR 은 기존 텍스트 안내에서 **실제 스캔 가능한 QR(client-side SVG)** 로 승격했다.

- **대기 영상형**(`idle_touch_video`): 상단 hero 영상 + "화면을 터치하세요 / Touch to start" 한/영 오버레이 + QR chip.
- **코너 소개형**(`corner_overview_qr`): 코너 설명 + 콘텐츠 + QR (상품 그리드 생략, 정적 안내).
- **제품 진열형**(`product_grid_qr`): 축약 헤더 + 밀집 상품 그리드(5~10개 수준) + 하단 QR.
- 새 block 타입 0 · DB migration 0 · public runtime API 계약 변경 0(`/tablet/screen` 은 `resolveTemplateKey` pass-through) · GP/KCos 무영향(screen=null).

---

## 1. 기존 템플릿 구조 조사 (read-only)
| 항목 | 사실 |
|------|------|
| template_key 성격 | **viewer 레이아웃 힌트**. 블록(idle_media/corner_description/content_list/product_list/qr_guide)은 편집기에서 수동 구성. 템플릿이 블록을 자동 seed 하지 않음(product_focus 선례) |
| 저장 화이트리스트(정본) | `store-tablet.routes.ts` `SET_TEMPLATE_KEYS_ALLOWED` (기존 `corner_information_basic_v1`, `product_focus`) |
| public runtime | `store-public-tablet-screen.ts resolveTemplateKey` = 임의 문자열 pass-through → 신규 key 자동 반영, **서버 runtime 코드 변경 불필요** |
| viewer 분기 | `TabletKioskPage.tsx` `templateKey` → `isProductFocus` (축약 헤더/gridFocus/하단 QR). 기본/legacy(screen=null) 불변 |
| 기존 "QR" | qr_guide 카드 = ▣ 아이콘 + 안내 문구 + shortHost 도메인. **실제 스캔 QR 아님**(client QR 의존성 부재로 과거 Deferred) |
| idle_media | 브라우즈 모드 미렌더(idle 모드 IdleOverlay 전용) |

## 2. 추가 템플릿 3종

| template_key | 표시명 | block 구성(레이아웃) | QR |
|--------------|--------|----------------------|-----|
| `idle_touch_video` | 대기 영상형 | 상단 **hero**(idle_media 첫 항목, image/video/youtube/vimeo·단일 loop) + 한/영 터치 유도 오버레이 → 그 아래 기존 섹션(설명/콘텐츠/상품) | hero 우하단 **QR chip**(qr_guide.url) |
| `corner_overview_qr` | 코너 소개형 | corner_description + content_list + QR. **상품 그리드 생략**(정적 안내) | 상단 QR 카드(실제 QR) |
| `product_grid_qr` | 제품 진열형 | 축약 헤더 + **밀집 상품 그리드**(기본 dense grid = 다건 진열, 5~10개 수준) | 하단 QR 배너(실제 QR) |

- 신규 block 타입/schema/저장 필드 추가 없음. 순수 레이아웃 분기(§7.1).

## 3. 대기 영상형 오버레이 문구 (§3.1)
- 한국어 `화면을 터치하세요` + 영어 `Touch to start` (고정 UI 문자열, 다국어 데이터 모델 무확장 §6.3).
- 오버레이 `pointerEvents:none` → 하단 콘텐츠 터치 방해 없음. 그라디언트로 영상 위 가독성 확보. hero 높이 `clamp(180px,34vh,360px)` (영상 과점유 방지).
- idle_media 항목 없으면 hero placeholder(그라디언트) + 문구만.

## 4. 제품 진열형 제품 수/배치 (§3.3)
- 기본 dense grid(`styles.grid`, 다열) 재사용 → product_focus(gridFocus 대형 타일)보다 **더 많은 제품 노출**. 이미지 영역도 기본(작게) → 진열 밀도 확보.
- 제품 수 정책은 **불변**(product_list 계약·조회 규칙 그대로, §3.3). 5개 미만/10개 초과 처리 = 기존 product_list 규칙 준수(이번 WO 미변경).

## 5. QR 표시 방식 (§2.2·§7.3)
- **실제 스캔 QR**: `qrcode.react` 의 `QRCodeSVG` 로 `qr_guide.url`(운영자 설정)을 렌더. 그 화면(코너 안내)을 여는 QR — 상품 개별 QR 아님.
- 백엔드/QR entity/저장 모델 추가 0. 이미 존재하는 qr_guide.url 만 소비. url 없으면 ▣ 아이콘 fallback.
- 위치: 기본/코너 소개형=상단 카드, product 레이아웃=하단 배너, 대기 영상형=hero 우하단 chip(공통 흰 여백 박스로 스캔 안정성). 공통 헬퍼 `QrImage`.
- **의존성 추가**: `qrcode.react@^4.2.0` → `@o4o/tablet-kiosk-core` dependencies(이미 lockfile resolved, additive). kiosk-core 는 소스 소비 → 모든 소비처 transitive 해결. **GP/KCos 는 fetchScreen KPA 전용 → screen=null → qrGuide 없음 → QR/템플릿 경로 미실행**(추가 번들만, 코드 무동작).

## 6. 선택 UI (§5)
- `TabletScreenSetManager.tsx` `TEMPLATE_OPTIONS` 에 3종 추가(각 label + 적합 화면 설명). 기존 select 편집기 그대로 노출. preview 전면 개편 없음(§5 단서).

## 7. 변경 파일
```
packages/tablet-kiosk-core/package.json                         (qrcode.react dep 추가)
packages/tablet-kiosk-core/src/TabletKioskPage.tsx              (3 레이아웃 분기 + QrImage + IdleTouchHero + styles)
apps/api-server/src/routes/platform/store-tablet.routes.ts      (SET_TEMPLATE_KEYS_ALLOWED +3)
services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx (TEMPLATE_OPTIONS +3)
pnpm-lock.yaml                                                  (qrcode.react → kiosk-core, additive)
apps/api-server/.../__tests__/shared-product-description.cosmetic-guard.test.ts (사전 존재 목 버그 수정)
```
- 동시 세션 WIP(store-content.controller.ts / assetSnapshot.ts / StoreContentsSelector.tsx) 미접촉.

## 8. API/DB/migration 무변경
- DB migration 0. store_tablet* 스키마·Block config·content_list schema·public `/tablet/screen` 응답 계약 **불변**. 서버 변경 = 저장 화이트리스트 배열 확장뿐(신규 값 허용, 계약 변경 아님).

## 9. 부수 수정 (사전 존재 버그)
- `shared-product-description.cosmetic-guard.test.ts`: setCanonical 트랜잭션 목 manager 에 `query()` 부재(canonical-replace 감사로그 WO da119c31d 가 `manager.query` 도입) → `TypeError: manager.query is not a function`. **템플릿과 무관**. 목에 `query: async () => []` 추가 → 10/10 PASS. CI 녹색 복구.

## 10. typecheck / 테스트
| 대상 | 결과 |
|------|------|
| `@o4o/tablet-kiosk-core` tsc | 0 |
| `@o4o/web-kpa-society` tsc | 0 |
| `@o4o/web-k-cosmetics` tsc (소비처) | 0 |
| api-server build(tsconfig.build.json, `src/scripts/**` 제외) | store-tablet.routes 0 (drug-otc 스크립트 오류는 사전 존재·build 제외) |
| jest 태블릿(`store-tablet-content-list-block`, `store-public-tablet-screen`) | PASS |
| jest `shared-product-description.cosmetic-guard` | 10/10 PASS(수정 후) |

## 11. 배포
- web deploy(aeef6d1ab): **success** (run 29312190703).
- api deploy(aeef6d1ab): **success** (run 29312190731).

## 12. 브라우저 smoke
- **공개 viewer 회귀 PASS(운영 샘플, read-only)**: 배포 후 `/tablet/screen` 구강 templateKey=corner_information_basic_v1·content_list 5, 피부 4 — **불변**. 신규 템플릿이 기존 세트에 영향 없음.
- **QR 승격 실렌더 PASS(구강 viewer)**: qr_guide 카드의 ▣ 아이콘 → **실제 스캔 가능한 QR 코드**(SVG) 렌더 확인(스크린샷). "모바일로 더 보기" + 도메인 유지, content_list 5카드·코너 설명 정상, **console error 0**. 기존 basic 템플릿 상단 QR 카드에 즉시 반영(회귀 없음).
- **신규 3종 실화면**: 운영 샘플은 basic 템플릿이라 신규 3종 실화면 확인은 **관리 화면에서 세트 template_key 변경(write) 필요 → 인증 세션 필요**. 세션 없음(자동 로그인 금지) → **DEFERRED**(§13 항목).

## 13. 인증 세션 확인 항목 (DEFERRED 시)
1. 화면 세트 편집 → 템플릿 select 에 대기 영상형/코너 소개형/제품 진열형 노출·선택·저장(400 없음).
2. 대기 영상형: idle_media 있는 세트 → hero 영상 + "화면을 터치하세요/Touch to start" + QR chip. 오버레이가 하단 터치 방해 안 함.
3. 코너 소개형: 코너 설명 + 콘텐츠 카드 + 실제 QR, 상품 그리드 미노출.
4. 제품 진열형: 제품 다건(5~10) 밀집 그리드 + 하단 실제 QR.
5. 세 템플릿 QR 스캔 → qr_guide.url 로 연결. QR 가독(겹침/과소 없음).
6. 반응형(390/768/1024): hero/그리드/QR 배치·가로 overflow 없음.
7. 기본/상품 집중형(기존 2종) 회귀 없음. console error 0.

## 14. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| 템플릿 3종 추가 | ✅ |
| 선택 UI 3종 노출 | ✅ |
| 대기 영상형 한/영 터치 문구 | ✅ |
| 코너 소개형 코너 내용 + QR | ✅ |
| 제품 진열형 5~10 배치 | ✅ (dense grid) |
| 세 템플릿 화면 QR 표시 | ✅ (실제 스캔 QR) |
| 기존 Screen Set 구조 재사용 | ✅ |
| API 변경 0 또는 최소 | ✅ (화이트리스트만) |
| DB migration 0 | ✅ |
| public runtime 회귀 0 | ✅ (구강 5/피부 4 불변, QR 승격 회귀 없음) |
| typecheck | ✅ |
| 배포 | ✅ (web+api success) |
| 신규 템플릿 화면 smoke | ⏸ DEFERRED(인증 필요) |
| CHECK commit/push | ✅ |

## 15. 후속 후보 (§14)
```
1. 템플릿 미리보기(썸네일/축소 렌더) 정교화
2. 템플릿별 설명 문구 개선
3. MAKE/RUN 분리 설계
4. 인증 세션 신규 템플릿 실화면 smoke(§13) — DEFERRED 해소
```

---

*태블릿 템플릿 3종(대기 영상형 idle_touch_video / 코너 소개형 corner_overview_qr / 제품 진열형 product_grid_qr) = template_key viewer 레이아웃 분기(새 block/migration 0). 화면 QR = qr_guide.url 기반 실제 스캔 QR(qrcode.react, 백엔드/entity 0, GP/KCos screen=null 무동작). 서버=저장 화이트리스트 +3, 프론트=선택 UI +3. 부수=cosmetic-guard 목 query() 사전버그 수정(10/10). typecheck 0·태블릿/guard 테스트 PASS. 신규 템플릿 실화면 smoke=인증 필요 DEFERRED.*
