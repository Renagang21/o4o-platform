# CHECK — KPA Operator Dashboard Local Layout Override Implement V1

## 범위

- 공통 `OperatorDashboardLayout`과 공통 block 계약은 변경하지 않았다.
- KPA 전용 composer를 추가하고 KPA 운영자 대시보드만 opt-in 했다.
- API, 권한, KPI 종류, route, DB는 변경하지 않았다.

## 구현 결과

KPA 화면의 block 순서는 다음과 같다.

1. Action Queue — 항목이 있을 때만 렌더
2. KPI
3. Quick Actions
4. AI Summary — 항목이 있을 때만 렌더
5. Activity
6. 2축 네비게이션
7. 역할 안내

공통의 `ActionQueueBlock`, `KpiGrid`, `QuickActionBlock`, `AiSummaryBlock`,
`ActivityLogBlock`을 그대로 조합했으며 block markup은 복사하지 않았다.
`OperatorDashboardConfig` 데이터 계약과 기존 링크도 그대로 유지했다.

## 역할·반응형·타 서비스 영향

- `kpa:operator`와 `kpa:admin`은 기존 API 응답과 권한 분기를 그대로 사용한다.
- composer는 두 역할 모두 동일한 우선순위로 전달받은 데이터만 렌더한다.
- grid, 카드, 반응형 동작은 기존 공통 block component가 담당하므로 새 breakpoint나
  고정 폭을 추가하지 않았다.
- GP, KCos, Neture가 사용하는 공통 `OperatorDashboardLayout` 및 공통 exports/types는
  수정하지 않았다.

## 변경 파일

- `services/web-kpa-society/src/components/kpa-operator/KpaOperatorDashboardLayout.tsx`
- `services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx`
- `docs/investigations/CHECK-O4O-KPA-OPERATOR-DASHBOARD-LOCAL-LAYOUT-OVERRIDE-IMPLEMENT-V1.md`

## 검증

- `git diff --check` — PASS
- `pnpm --filter @o4o/web-kpa-society exec tsc --noEmit` — PASS
- `pnpm --filter @o4o/web-kpa-society run build` — PASS
- Deploy Web Services workflow — PASS (KPA만 배포, 타 web service job은 skip)
- `https://kpa-society.co.kr/operator` — HTTP 200
- Cloud Run service URL `/operator` — HTTP 200
- 배포 이미지와 구현 commit SHA 일치 — PASS
- 빈 Queue/AI 조건, block 순서, 두 역할 공통 composer 적용은 source/typecheck/build로 확인했다.
- 데스크톱·모바일은 기존 공통 block의 responsive grid를 그대로 재사용하고 고정 폭이나
  신규 breakpoint가 없음을 확인했다. 이 세션에 연결 가능한 인증 브라우저가 없어
  운영 viewport의 시각적 캡처는 수행하지 못했다.

## Git·배포 이력

- 설계 CHECK commit: `472f41516e9cc4f04a8dd288d97848ed51a5a6b5`
- 구현 commit: `ed3630c1430a21cb2f478b2f11c37382624c95a3`
- 배포 workflow: `30146461632` — success
- Cloud Run revision: `kpa-society-web-01698-rjz`
- 배포 image: `gcr.io/netureyoutube/kpa-society-web:ed3630c1430a21cb2f478b2f11c37382624c95a3`
- 운영 smoke: canonical/Cloud Run `/operator` HTTP 200

## 보존·제외

- 기존 dirty `docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md`는 수정·stage하지 않았다.
- 기존 untracked `.codex/`, `apps/api-server/_msm.mjs`,
  `apps/api-server/_msmx.mjs`는 수정·stage하지 않았다.
