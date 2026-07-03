# CHECK-O4O-KPA-TABLET-PUBLIC-DISPLAY-SOURCE-ALIGNMENT-V1

> 작업 완료 보고서 · 2026-07-03
> WO: `docs/work-orders/WO-O4O-KPA-TABLET-PUBLIC-DISPLAY-SOURCE-ALIGNMENT-V1.md`

## 1. 사전 조사 결과
- 공개 supplier(`queryTabletVisibleProducts`): TABLET channel 4중 gate 통과 상품 **전체** 반환. `store_tablet_displays`는 first active tablet 기준 **content_id attach 용도로만** LEFT JOIN(content_id IS NOT NULL).
- 공개 local(handler): `store_local_products` **active 전체** 반환(org+is_active). 역시 std는 content attach용.
- 결과 불일치: 편성에서 제외한 local이 공개에 계속 노출 / 순서 편성과 불일치 가능.
- 다국어(`selectedContentTranslations`, ready/published만) 필드는 이미 응답 포함(직전 WO). 미리보기는 실제 공개 endpoint 사용.

## 2. 최종 공개 product set 기준
- **configured**(first active tablet 존재 + visible display row ≥ 1): 공개 집합 = 그 태블릿의 `is_visible=true` display rows에 포함된 상품만, 순서 = `display.sort_order`.
- **legacy_fallback**(active tablet 없음 or visible row 0): 기존 legacy 집합 유지(supplier=TABLET gate 전체, local=active 전체).

## 3. 변경 파일
| 파일 | 변경 |
|---|---|
| `apps/api-server/src/routes/platform/store-public/store-public-utils.ts` | `resolveTabletDisplaySource()` 추가. `queryTabletVisibleProducts`에 `firstTabletId`/`configured` 옵션 — configured면 visible disp INNER 필터 + `disp.sort_order` 정렬(JS 재정렬, DISTINCT ON 호환), count 반영. content attach를 std→disp.content_id 로 정합. 캐시키에 ft/cfg 포함 |
| `apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts` | displaySource 산출 후 supplier util + local 쿼리 공유. local도 disp 필터/정렬. 응답 additive `tabletDisplaySource`/`tabletDisplayTabletId` |
| `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` | 공개 반영 기준 안내(저장 구성만 표시 · 첫 활성 태블릿 기준) + 미리보기 문구 보강 |
| 문서 | WO + 본 CHECK |

## 4. 정책 유지/회귀 확인
- **supplier commerce gate 불변**: listing org/service_key/is_active + channel active + channel TABLET/APPROVED + supplier/product active. configured는 여기에 disp 필터만 **추가**(약화 아님).
- **local active 전체 노출 회귀 해소**: configured면 disp 있는 local만.
- **selected content / 다국어**: 정책 불변. content attach는 disp.content_id 링크 유효 시, ready/published 번역만 노출, draft/status/model 미유출.
- **fallback**: active tablet 없음/visible 0 → legacy 그대로(기존 매장 회귀 방지).
- 마이그레이션/신규 테이블 없음. kiosk-core 미변경 → KCos/GP 무영향.

## 5. 검증 결과
### 5.1 typecheck
| 대상 | 결과 |
|---|---|
| api-server | ✅ PASS |
| web-kpa-society | ✅ PASS |
| (kiosk-core 미변경 → KCos/GP typecheck 불요) | — |

### 5.2 API/브라우저 E2E

> 배포 후 기록.

- [ ] configured: local 2개 중 1개만 visible 저장 → 공개 응답 localProducts에 그 1개만, `tabletDisplaySource:'configured'`
- [ ] 순서 = 편성 sort_order
- [ ] display rows 제거(visible 0) → `legacy_fallback`, 기존 동작
- [ ] supplier gate 유지(가능 시)
- [ ] 테스트 데이터 정리

## 6. 미착수(범위 밖)
device pairing / per-tablet public URL, QR Core, 소비자 관리, 상담/주문/결제, 사이니지 통합, GP/KCos 확장, 신규 마이그레이션. 전체 혼합(supplier+local) 단일 순서는 현행 분리 응답 유지(필요 시 후속).
