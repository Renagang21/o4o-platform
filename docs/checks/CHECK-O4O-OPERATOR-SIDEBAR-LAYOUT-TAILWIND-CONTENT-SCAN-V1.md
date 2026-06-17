# CHECK — Operator 사이드바 레이아웃 회귀 (Tailwind content scan 누락)

**WO:** `WO-O4O-OPERATOR-STORES-SIDEBAR-LAYOUT-FLOW-FIX-V1`
**일자:** 2026-06-17
**범위:** Frontend 빌드 설정 전용 (layout 컴포넌트/route/menu/권한/API/backend/DB/package/lockfile/Dockerfile 변경 0)
**분류:** **표준 컴포넌트 구현 결함 아님** — `O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-V1` 을 소비하는 빌드 설정(tailwind content)의 동기화 누락.

---

## 1. 증상

Neture operator 화면(`/operator/stores`, `/admin/stores` 등)에서 desktop(≥1365px)에서도 좌측 사이드바가 본문 왼쪽에 배치되지 않고 **본문 위로 세로 적층** — "사이드바 아래에 '매장 관리' 본문" 표시.

---

## 2. 루트 원인 (정적 분석 확정)

```
OperatorAreaShell 구조 자체는 정상 (flex flex-col lg:flex-row lg:gap-6)
  ↓
lg:flex-row 클래스가 전 코드베이스에서 operator-ux-core/src/layout/OperatorAreaShell.tsx 단 한 곳에만 존재
  ↓
각 web-* 서비스 tailwind.config.js content 가 packages/operator-ux-core/src 를 스캔하지 않음
  ↓
빌드 산출 CSS 에 .lg\:flex-row 미생성
  ↓
desktop 에서도 flex-col 만 적용
  ↓
사이드바가 본문 왼쪽이 아니라 본문 위로 적층 (사이드바 자체는 lg:block 이 별도 생성돼 보임)
```

| | 경로 |
|---|---|
| 공통 shell | [packages/operator-ux-core/src/layout/OperatorAreaShell.tsx](../../packages/operator-ux-core/src/layout/OperatorAreaShell.tsx) |
| `lg:flex-row` 유일 출처 | 위 파일 (grep 결과: packages/services 전체에서 이 파일 + glycopharm src 2개 페이지뿐) |

---

## 3. 수정 — 4개 소비처 tailwind content 동기화

CLAUDE.md Shared Module Change Rule 에 따라 operator-ux-core 소비처 4개 모두 점검 → 전부 미등록 확인. 각 `tailwind.config.js` `content` 에 1줄 추가:

```js
"../../packages/operator-ux-core/src/**/*.{ts,tsx}",
```

| 서비스 | 파일 |
|---|---|
| Neture | [services/web-neture/tailwind.config.js](../../services/web-neture/tailwind.config.js) |
| GlycoPharm | [services/web-glycopharm/tailwind.config.js](../../services/web-glycopharm/tailwind.config.js) |
| K-Cosmetics | [services/web-k-cosmetics/tailwind.config.js](../../services/web-k-cosmetics/tailwind.config.js) |
| KPA-Society | [services/web-kpa-society/tailwind.config.js](../../services/web-kpa-society/tailwind.config.js) |

순수 additive(클래스 생성만 추가, 제거 없음) → 회귀 위험 없음. layout 컴포넌트는 표준에 이미 정합하므로 무수정(억지 수정 시 오히려 회귀 위험 회피).

---

## 4. 검증

- ✅ 루트 원인 정적 확정 (grep: `lg:flex-row` 단일 출처 + neture 스캔 범위 부재).
- ⏳ 시각 확인은 **재빌드 후** (Tailwind 는 빌드 시점 CSS 재생성). 배포/`vite build` 후 확인 항목:
  1. desktop ≥1365px — 사이드바 본문 왼쪽, "매장 관리" 제목은 오른쪽 본문 상단.
  2. horizontal scroll 0 (body/clientWidth 차이 없음).
  3. mobile/tablet — 사이드바 상시 노출 아님, drawer/overlay 동작 유지.
  4. operator-ux-core 사용 타 화면 1~2개 layout 회귀 없음.

---

## 5. 재발 방지

> 공통 UI 패키지(`packages/operator-ux-core` 등)에서 Tailwind class 를 직접 사용하는 경우,
> 해당 패키지를 소비하는 모든 `web-*` 앱의 `tailwind.config.js` content 배열에
> 공통 패키지 src 경로가 포함되어야 한다.
>
> 공통 shell/layout 이 정상이어도 content scan 누락 시 responsive/arbitrary class 가 CSS 로
> 생성되지 않아 런타임에서 layout 회귀가 발생할 수 있다.

**점검 명령:** 새 공통 UI 패키지 도입/이동 시
`grep -rl '<signature-class>' packages/*/src services/*/src` 로 그 class 가 소비처 스캔 범위에 들어오는지 확인.

[[feedback_shared_package_thirdparty_dep]] (third-party dep 동기화)와 동류의 "공통화 후 소비처 설정 동기화 누락" 패턴.
