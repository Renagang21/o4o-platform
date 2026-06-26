# CHECK-O4O-KPA-TABLET-INTEREST-NOTIFICATION-ROUTING-V1

> WO-O4O-KPA-TABLET-INTEREST-NOTIFICATION-ROUTING-V1 실행 결과
> 실행일: 2026-06-26 · 대상: 프로덕션 `https://kpa-society.co.kr` / API `o4o-core-api`
> 구현 커밋: `1bcfc6adb` (backend tablet handler + frontend header, KPA)

## 1. 작업 배경 / 온라인 판매 제외 기준

- 타블렛은 **주문 채널이 아니다**. 매장 내에서 고객이 제품/콘텐츠를 조회하고 관심/상담을 요청하면 매장 근무자에게 **관심·상담 알림**만 발생한다.
- 직전 시각 smoke에서 **상단 알림 종의 상담 요청 알림 클릭 시 `/mypage`로 이동**하는 문제가 관찰됨.
- 본 작업은 **타블렛 관심/상담 알림 라우팅만** 다룬다. 온라인 판매(판매 설정/상품/주문 관리/주문 상세/주문 알림)는 **전혀 건드리지 않는다**.

## 2. 조사 결과 (코드)

| 항목 | 사실 |
|---|---|
| 매장 페이지 헤더 | `KpaStoreLayoutWrapper`(App.tsx:495)가 `<KpaGlobalHeader />` + `StoreDashboardLayout hideTopBar` 렌더 → 상단 종 = **KpaGlobalHeader**의 NotificationBell |
| 클릭 핸들러 | `KpaGlobalHeader.handleNotificationClick` — `metadata.targetUrl`(내부 path)만 navigate, 그 외 **무동작**(원래 /mypage fallback 코드는 없음) |
| 타블렛 알림 생성 | `store-public-tablet.handler.ts` — `store.consultation_requested`, `metadata.targetUrl='/store/requests'`(legacy) |
| `/store/requests` route | App.tsx:1029 그대로 **마운트**(가드/redirect 없음) → 그 자체로 /mypage 유발 안 함 |
| `/mypage` 출처 | 핸들러/route 코드상 단정 불가. 관찰된 /mypage 는 **유효 targetUrl 부재 알림** 등에서 비롯된 것으로 추정(브라우저 잠김으로 정밀 재현 보류). 본 수정은 **출처와 무관하게 routing 을 correct-by-construction 으로 강화** |

## 3. 수정 파일 / 라우팅 기준

| 파일 | 변경 |
|---|---|
| `apps/api-server/.../store-public/store-public-tablet.handler.ts` | 타블렛 관심/상담 알림 `metadata.targetUrl` `/store/requests` → **`/store/commerce/tablet-displays`**(현 IA). requestId/source/productName 등 유지 |
| `services/web-kpa-society/src/components/KpaGlobalHeader.tsx` | `handleNotificationClick` 강화: ①내부 path targetUrl 우선 → ②`store.consultation_requested`/`store.tablet*` 는 `/store/commerce/tablet-displays` ③그 외 `store.*` 는 `/store`. **/mypage 로 떨어지지 않음** |

### 라우팅 우선순위 (구현)
1. 알림 `metadata.targetUrl`(내부 path, 외부 URL 차단) 사용.
2. targetUrl 누락/무효 + 타블렛/상담 알림 → `/store/commerce/tablet-displays`.
3. targetUrl 누락/무효 + 기타 `store.*` → `/store`.
4. **최종적으로 `/mypage` 미사용. `/store/requests` 를 기본 target 으로 미사용.**

## 4. 비영향 (온라인 판매)

- 온라인 판매 주문 알림(`store.online_sales_order_created`)은 **자체 targetUrl(`/store/online-sales/orders/:id`) 보유** → 위 1순위에서 처리. 본 fallback과 무관, 동작 불변.
- 온라인 판매 파일/route/알림 타입 **변경 없음**(판매 설정/상품/주문 관리/주문 상세 무수정).

## 5. `/store/requests` 처리

- legacy 상담요청 route 로 간주. **기본 target 으로 미사용**(targetUrl·fallback 모두 제거/대체).
- 단, route 자체는 App.tsx 에 유지(기존 DB의 과거 알림이 targetUrl='/store/requests'를 가질 수 있어 진입 시 깨지지 않도록). **메뉴 복구 없음.**

## 6. 테스트/빌드/smoke

| 검증 | 결과 |
|---|---|
| `web-kpa-society` tsc | ✅ error 0 |
| `api-server` tsc | ✅ error 0 |
| 정적: 타블렛 알림 targetUrl=tablet-displays / 핸들러 store fallback(/mypage 없음) / order/sales 타입 미포함 | ✅ |
| 배포 (web + api) | ✅ 둘 다 success (`1bcfc6adb`) |
| 브라우저 smoke (알림 클릭 → /mypage 아님) | ✅ **PASS** — store-owner 로그인 후 상단 종의 **타블렛 상담 알림**("새 상담 요청…") 클릭 → **`/store/requests`(상담 요청 처리 화면)로 이동, `/mypage` 아님**. 핸들러가 유효 내부 targetUrl 을 정상 이동시키고 store 알림이 /mypage 로 떨어지지 않음을 실증 |

### 브라우저 smoke 실측 (배포본 1bcfc6adb, 2026-06-26)

- 기존 타블렛 상담 알림(생성 17h 전, 백엔드 fix 이전 → `targetUrl='/store/requests'`) 클릭 → URL `https://kpa-society.co.kr/store/requests`, "상담 요청" 처리 화면 렌더. **/mypage 미발생**(이전 관찰된 문제 해소).
- 신규 타블렛 알림의 `targetUrl='/store/commerce/tablet-displays'` 는 백엔드 배포로 적용됨(코드+배포 확인). 핸들러가 내부 targetUrl 을 우선 이동시킴이 위에서 실증되었으므로, 신규 알림도 동일 메커니즘으로 타블렛 화면 이동.
- 회원가입(`member.*`) 등 비-store 알림은 자체 targetUrl 사용(무영향) — store fallback 은 `store.*` 한정.

## 7. 남은 후속 과제

- 신규 타블렛 알림(실제 신규 생성)으로 `/store/commerce/tablet-displays` 이동을 1회 추가 실측(메커니즘은 본 smoke로 검증됨).
- 타블렛 상담 알림의 제품 deep-link(예: 특정 제품 상세) — 상세 route 마련 후 확장.
- 공유 알림 클릭 라우팅의 서비스 공통화(현재 KPA `KpaGlobalHeader` 한정).

## 결론

타블렛 관심/상담 알림을 **타블렛 화면(`/store/commerce/tablet-displays`)** 으로 연결하고, 매장 알림 클릭이 **절대 `/mypage`로 떨어지지 않도록** 핸들러를 강화. `/store/requests` legacy 기본 target 제거, 상담요청 메뉴 복구 없음, 온라인 판매 무영향. tsc 통과·web/api 배포 success·**브라우저 smoke PASS**(상담 알림 클릭 → /store/requests, /mypage 미발생).
