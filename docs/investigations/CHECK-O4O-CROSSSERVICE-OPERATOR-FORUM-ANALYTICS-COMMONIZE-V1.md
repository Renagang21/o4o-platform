# CHECK — WO-O4O-CROSSSERVICE-OPERATOR-FORUM-ANALYTICS-COMMONIZE-V1

> KPA-Society / GlycoPharm / K-Cosmetics operator **Forum 분석 화면**을 단일 공통 콘솔로 추출.
>
> 선행:
> - IR-O4O-CROSSSERVICE-OPERATOR-FORUM-MENU-UIUX-PARITY-AUDIT-V1
> - WO-...-FORUM-MENU-LABEL-ORDER-PARITY-V1 (`80a869ec8`)
> - WO-...-FORUM-BASE-ROUTE-ALIAS-PARITY-V1 (`03acbaae4`)
>
> - 일자: 2026-06-16
> - 범위: forum-analytics 화면 공통화 only (조회 전용). hub/목록 관리 이식·route/menu 변경 없음.
> - 대상: `packages/operator-core-ui`, `web-kpa-society`, `web-glycopharm`, `web-k-cosmetics`
> - 제외: Neture, backend/API/DB, capability, route/menu, forum 운영 hub / 목록 관리 이식

---

## 1. 변경 전 3서비스 forum-analytics 구조 비교

세 화면은 **거의 완전한 복제**였다. 동일 요소:

- page title `포럼 분석` + description `포럼 운영 현황과 트렌드를 확인하세요`
- 6개 KPI 카드(총 포럼 / 활성 포럼 / 총 게시글 / 신청 대기 / 승인 완료 / 삭제 대기)
- 일별 신청 트렌드 막대 차트(최근 30일, 승인/기타 2색 스택 + 범례)
- 최근 활동 피드(최근 15건, status 색 dot + 신청자→검토자 + 코멘트)
- loading(Loader2) / empty('데이터가 없습니다' · '최근 활동이 없습니다') 상태
- `Promise.all([getSummary(), getTrend(30), getActivity(15)])` 데이터 로드 + 동일 narrowing(`s.data` / `t.data.daily` / `Array.isArray(a.data)`)
- **period filter / refresh 버튼 없음** (3서비스 공통 — 원래 없음)

**유일한 서비스 차이 (2가지):**

| 차이 | KPA | GlycoPharm | K-Cosmetics |
|---|---|---|---|
| accent 색 | blue (활성 포럼 카드만 emerald) | teal | pink |
| API import | `../../api/forum` | `@/services/api` | `@/services/forumApi` |

API 메서드 시그니처/응답 shape는 동일 (`getSummary`/`getTrend(days)`/`getActivity(limit)`, 공통 `/api/v1/forum/operator/analytics/*`). 차이는 TS 반환 타입뿐(GP=`apiClient.get<unknown>`, KPA/KCos=envelope `any`) — 런타임 접근 동일.

---

## 2. 공통 컴포넌트 위치

`packages/operator-core-ui/src/modules/forum-analytics/`
- `OperatorForumAnalyticsPage.tsx` — presentation + state orchestration
- `types.ts` — `ForumAnalyticsSummary/TrendDay/ActivityItem`, `ForumAnalyticsClient`(adapter), `ForumAnalyticsAccent`, `OperatorForumAnalyticsPageProps`
- `index.ts` — public export

기존 forum 모듈(`forum-requests` / `forum-delete-requests`)과 동일한 module 구조.

**export 경로:** 기존 모듈 관례대로 `package.json` 의 `exports` 맵에 subpath 추가
(`"./modules/forum-analytics": "./src/modules/forum-analytics/index.ts"`).
→ `src/index.ts` 에는 추가하지 않음 (기존 forum 모듈들도 root index 에 없음 — 관례 준수). WO 의 "src/index.ts export" 항목은 실제 코드베이스 관례(subpath exports)로 대체.

---

## 3. 공통화 방식

- 공통 콘솔이 loading/empty/KPI/트렌드/활동 **presentation + 데이터 로드**를 담당.
- 데이터 접근은 기존 페이지와 **런타임 동일** (`s.data` / `t.data?.daily` / `Array.isArray(a.data)`). `client` adapter 의 data 는 loose(`unknown`)로 두고 콘솔이 narrowing — 기존 GP 의 `as` 캐스트와 동일 의미.
- 서비스 wrapper 는 `accent` + `client`(기존 `forumAnalyticsApi`) 만 주입하는 thin wrapper.

---

## 4. 서비스별 wrapper / config 차이

| 서비스 | accent(iconText / barColor / activeForumText / activeForumBg) | client |
|---|---|---|
| KPA | `text-blue-600` / `bg-blue-500` / `text-emerald-600` / `bg-emerald-50` | `forumAnalyticsApi` (`../../api/forum`) |
| GlycoPharm | `text-teal-600` / `bg-teal-500` / `text-teal-600` / `bg-teal-50` | `forumAnalyticsApi` (`@/services/api`) |
| K-Cosmetics | `text-pink-600` / `bg-pink-500` / `text-pink-600` / `bg-pink-50` | `forumAnalyticsApi` (`@/services/forumApi`) |

accent 값은 wrapper 소스(서비스 트리)에 **리터럴 className** 으로 존재 → 각 서비스 Tailwind content 스캔 포함 → 생성 보장.

---

## 5. 보존된 기능

- 6 KPI / 트렌드 차트(2색 스택·범례) / 최근 활동 피드 / loading / empty 상태 — 모두 동일.
- 데이터 로드 호출(getSummary·getTrend(30)·getActivity(15)) 동일.
- accent 별 색 표현 픽셀 동일 (KPA blue+emerald, GP teal, KCos pink).

---

## 6. 추가하지 않은 기능

- refresh 버튼 (원래 없음 → 미추가).
- period/날짜 필터 (원래 없음 → 미추가).
- 신규 지표 / mutation(승인·삭제·수정) — 없음. **조회 전용 유지.**
- 신규 API 호출 — 없음.

---

## 7. route / menu / capability / API / backend / DB 무변경 확인

- route: `/operator/forum-analytics` 3서비스 불변 (App.tsx / OperatorRoutes.tsx 미수정, 기존 default export 이름·시그니처 유지 → import 불변).
- menu: `operatorMenuGroups.ts` 미수정 (`포럼 분석` 라벨·순서 그대로).
- capability/adminOnly: 미변경.
- API endpoint / backend / DB / migration: 미변경. 서비스 `forumAnalyticsApi` 정의 파일 미수정.
- Neture: 미접촉.

---

## 8. TypeScript 결과

- `@o4o/operator-core-ui` (`tsc --noEmit`): forum-analytics 모듈 에러 **0**. (잔여 1건은 사전 baseline — 타 패키지 `error-handling/.../useApiErrorHandler.ts` `ImportMeta.env`, 본 작업 무관.)
- `web-kpa-society` / `web-glycopharm` / `web-k-cosmetics` (`tsc --noEmit`): `ForumAnalytics` 관련 에러 **0**. 신규 subpath `@o4o/operator-core-ui/modules/forum-analytics` module-not-found 없음 → export 맵/타입/`client` 할당 정상.

---

## 9. build 결과

`pnpm --filter <svc> build` (vite) — 3서비스 모두 **성공(exit 0)**:

| 서비스 | 결과 |
|---|---|
| `@o4o/web-k-cosmetics` | ✓ built in 21.39s |
| `glycopharm-web` | ✓ built in 36.29s |
| `@o4o/web-kpa-society` | ✓ built in 32.15s |

→ 신규 공통 모듈 subpath 해석 + Tailwind 클래스 생성 + 번들링 정상.

---

## 10. smoke 결과 / 보류 사유

- 브라우저 smoke: 보류(배포 후 권장). build PASS + accent 리터럴/inline-style 분석으로 픽셀 동등 확인.
- Tailwind 주의: `operator-core-ui` 는 3서비스 tailwind content 글롭에 **미포함**. 따라서 공통 콘솔의 arbitrary-value 클래스(`min-w-[28px]` / `text-[9px]` / `rotate-[-45deg]` / `origin-top-left`)는 **inline style 로 변환**해 purge 회귀 차단. semantic scale 색(indigo/yellow/green/red/orange 50·500·600)은 각 서비스 타 파일에서 사용 확인 → 생성 보장. accent 색은 wrapper 리터럴.
- 배포 후 권장: KPA/GP/KCos `/operator/forum-analytics` 접근 → 제목/6 KPI/트렌드/활동 또는 empty 정상, accent 색 정상, console/pageerror/4xx 없음.

---

## 11. 남은 차이와 사유

- KPA `활성 포럼` 카드만 emerald(타 서비스는 accent 동일색) — 기존 디자인 보존 위해 `activeForumText/Bg` 를 별도 accent 필드로 유지. 추후 디자인 통일 시 별도 판단.
- forum-analytics 외 forum 운영 hub / 목록 관리 화면 공통화·이식은 본 WO 범위 외(§12).

---

## 12. 후속 WO 후보

1. 포럼 운영 hub (`OperatorForumPage`) GlycoPharm / K-Cosmetics 이식 — route/page 신설 동반, 사업 필요성 판단 선행. 이식 시 GP/KCos `/operator/forum` redirect → 실 hub 승격.
2. 포럼 목록 관리 (`forum-categories`) GlycoPharm / K-Cosmetics 이식.

---

## 13. 완료 판정

- ✅ 공통 콘솔 `OperatorForumAnalyticsPage` 추출, 3서비스 thin wrapper 수렴
- ✅ accent + client 만 서비스 차이로 분리, 기능/지표/데이터 접근 픽셀·런타임 동일
- ✅ route/menu/capability/API/backend/DB 불변, 조회 전용 유지, mutation 0
- ✅ TypeScript 3서비스 + 패키지 클린(신규 에러 0), build 3서비스 PASS
- ✅ Neture 미영향, 다른 세션 WIP 미포함

**완료 고정 가능.**
