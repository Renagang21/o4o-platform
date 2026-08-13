# CHECK-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1

> WO: `WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1`
> Date: 2026-08-13
> Branch: `work/commonization-my-store`
> Base: `0a2d881005df81bc521f1584860df2da49724c90` (`main`, 작업 시작 시점 최신 확인)

## 1. 기존 차이

- KPA-Society: `/store` 홈. `StoreDashboardLayout` + `StoreHomeShell` 일부 adoption. KPA 고유 KPI, Live Signals, 홍보 성과, 최근 QR 활동, 실행 흐름을 보유한다.
- K-Cosmetics: `/store` 홈. `StoreDashboardLayout` + `StoreHomeShell` 일부 adoption. 다중 매장 선택, 매장 상태, 주문/매출 KPI, 상품/사이니지/인사이트를 보유한다.
- PharmacyHub: `/store-owner` 홈. `StoreDashboardLayout`은 사용 중이었으나 홈 본문은 bespoke였다. 단일 `GET /pharmacy-hub/store-owner/dashboard`에서 매장/가입상태/장바구니/주문 요약을 읽는다.
- Neture: 이번 조사 범위에서 대응하는 `StoreHomeShell`/내 매장 홈 소비처가 확인되지 않아 적용하지 않았다.
- GlycoPharm: 공식 적용 대상에서 제외. 기존 `StoreHomeShell` 소비처를 회귀 대상으로만 확인한다.

## 2. 공통 Core / 서비스별 경계

`@o4o/store-ui-core`의 `StoreHomeShell`을 API 비의존 공통 배치 셸로 확장했다.

공통 slot:
- `headerSlot`
- `storeSelectorSlot`
- `bannerSlot`
- `statusSlot`
- `summarySlot`
- `aiSummarySlot`
- `insights`
- `activitySlot`
- `onboardingSlot`
- `quickActionsSlot`
- `beforeSections`

서비스에 남긴 것:
- route / 권한 gate
- API endpoint와 fetch
- 서비스별 문구
- KPI/통계 계산 의미
- 상태 판정과 업무 규칙
- 바로가기 URL
- 다중 매장 선택 로직

새 slot은 모두 optional이라 기존 KPA/K-Cosmetics/GlycoPharm 소비 계약을 깨지 않는다.

## 3. PharmacyHub 적용

`services/web-pharmacy-hub/src/pages/store-owner/HomePage.tsx`를 `StoreHomeShell` 소비처로 전환했다.

보존 사항:
- `/store-owner` route 불변
- `StoreOwnerShell` / `StoreDashboardLayout` 불변
- `fetchStoreDashboard()` 호출 계약 불변
- 401/403/기타 오류 문구와 처리 불변
- 매장 연결 상태(`connected` / `not_connected` / `ambiguous`) 의미 불변
- KPI 4종 값과 의미 불변
- 결제 대기 안내와 주문 링크 불변
- 최근 주문 목록 불변
- 공급 상품/장바구니/주문 내역 바로가기 불변
- DB/schema/migration 변경 없음

## 4. 로딩·오류·빈 상태·반응형 확인

정적 코드 확인:
- loading: 기존 skeleton/문구 유지
- error: 기존 오류 배너와 상태 조회 실패 표시 유지
- empty: 최근 주문 0건 시 기존 `공급 상품 둘러보기` CTA 유지
- store not connected / ambiguous: 기존 안내 유지
- responsive class(`sm:grid-cols-2`, `lg:grid-cols-4`, `lg:grid-cols-3`, flex-wrap) 유지

## 5. 회귀 확인

- `StoreHomeShell` 기존 prop을 삭제하지 않았다.
- KPA의 `onboardingSlot` 사용은 그대로 호환된다.
- K-Cosmetics의 `storeSelectorSlot` 사용은 그대로 호환된다.
- GlycoPharm의 `loading/onRefresh/bannerSlot/aiSummarySlot/insights/onInsightAction` 사용은 그대로 호환된다.
- Neture에는 대응 소비처가 없어 변경 0.

## 6. typecheck / build

현재 ChatGPT 실행 컨테이너에서 GitHub 원격 clone을 시도했으나 DNS가 차단되어(`Could not resolve host: github.com`) 브랜치를 로컬 materialize할 수 없었다. GitHub 커넥터에도 이 커밋에 연결된 CI status가 없어 실제 `pnpm` typecheck/build 실행 결과는 확보하지 못했다.

대신 저장소 정적 검증으로 다음을 확인했다.
- PharmacyHub `package.json`에 `@o4o/store-ui-core` workspace dependency 존재
- 추가된 `StoreHomeShell` prop은 전부 optional
- 기존 소비 prop 삭제/타입 축소 없음
- PharmacyHub route/API/import 경계 변경 없음

따라서 실제 로컬/CI typecheck·build는 **미실행으로 명시**하며 PASS로 허위 기록하지 않는다.

## 7. DB write / 배포

- DB write: 0
- migration: 0
- backend 변경: 0
- 배포: 0

## 8. 변경 경로

- `packages/store-ui-core/src/components/StoreHomeShell.tsx`
- `services/web-pharmacy-hub/src/pages/store-owner/HomePage.tsx`
- `docs/checks/CHECK-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1.md`

## 9. 다음 공통화 후보

다음 메뉴는 `매장 경영활용 제품(handled-products)`를 우선 제안한다.

이유:
- KPA와 PharmacyHub에 명시적 대응 기능이 존재한다.
- 공급 상품 탐색(에이전트 D 영역)과 구분되는 내 매장 소유 기능이다.
- 상품 원장/업무 의미를 유지하면서 목록·빈 상태·액션 UI의 공통 Core 경계를 잡기 적합하다.
