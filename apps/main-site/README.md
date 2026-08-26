# O4O Platform - main-site (NextGen 잔여 shell)

> **상태: RETIRED_RUNTIME (2026-08-20)**
> Cloud Run `o4o-main-site` 와 `deploy-main-site.yml` 은 폐기됐다.
> 이 source 는 참고·재사용 자산으로만 남으며 **배포 대상이 아니다.**
> 근거: [WO-O4O-MAIN-SITE-DECOMMISSION-FINAL-CLOSURE-V1-CHECK](../../docs/checks/WO-O4O-MAIN-SITE-DECOMMISSION-FINAL-CLOSURE-V1-CHECK.md)
> (`ci-pipeline.yml` 의 build 검증에는 계속 포함돼 컴파일 가능 상태를 유지한다.)

> **NextGen ViewRenderer 프레임워크는 2026-08-26 전면 은퇴했다 (RETIRE_CONFIRMED).**
> 근거: [WO-O4O-MAIN-SITE-NEXTGEN-VIEWRENDERER-DOMAIN-CENSUS-AND-RETIREMENT-V1-CHECK](../../docs/checks/WO-O4O-MAIN-SITE-NEXTGEN-VIEWRENDERER-DOMAIN-CENSUS-AND-RETIREMENT-V1-CHECK.md)
> 재등록 방지 계약: `apps/api-server/src/__tests__/main-site-nextgen-viewrenderer-retirement.spec.ts`

## 은퇴한 축 — NextGen ViewRenderer 프레임워크

아래 축은 `src/main.tsx` 에서 도달 불가였고, 빌드 산출물(`dist/assets/*.js`)에도
단 한 번도 나타나지 않았다. 197개 파일을 한 번에 제거했다.

| 제거 대상 | 파일 | 역할 |
|---|---:|---|
| `src/view/` | 7 | ViewRenderer core (loader · renderer · route-generator · helpers · types) |
| `src/views/*.json` | 32 | View JSON 페이지 정의 |
| `src/generator/` | 10 | View JSON 생성 CLI + 규칙 |
| `src/ai/` | 7 | 자연어 → View JSON 생성기 |
| `src/shortcodes/_functions/` | 21 | FunctionRegistry 등록 대상 |
| `src/components/registry/` | 3 | FunctionRegistry · UIComponentRegistry |
| `src/components/ViewRenderer.tsx` | 1 | 렌더링 진입점 |
| `src/components/blocks/` | 60 | BlockRegistry · BlockRenderer 및 블록 구현 |
| `src/components/ui/` | 42 | UIComponentRegistry 등록 대상 |
| `src/layouts/` (`MainLayout` 제외) | 6 | Default · Dashboard · Shop · Auth · Minimal + registry |
| `src/lib/cms/` | 5 | View JSON ↔ CMS adapter · loader |
| `src/lib/analytics/` | 3 | 위 UI 전용 이벤트 트래커 |

`package.json` 의 `generate:view` · `generate:ai` · `list:views` · `delete:view` 4개
스크립트는 삭제된 CLI 를 가리키므로 함께 제거했다.

**은퇴 사유 (측정값):**

- **runtime 도달 0** — `src/main.tsx` 에서 정적으로 도달하는 파일은 27개이고 그중
  NextGen 축은 **0개**다. 실제 라우터는 `src/router/index.tsx` 의 명시적 Route 표이며,
  `views/*.json` 기반 route 생성(`view/route-generator.ts`)은 어디에서도 호출되지 않는다.
- **번들 부재** — 빌드 산출물에서 `ViewRenderer` · `FunctionRegistry` ·
  `UIComponentRegistry` · `generateRoutes` · `viewGenerator` · `analyzeIntent` ·
  `DashboardLayout` 문자열이 **모두 0회**.
- **닫힌 dead loop** — `generator/` · `ai/` CLI 는 `views/*.json` 을 만들지만
  그 JSON 을 렌더링하는 코드가 없다.
- **외부 소비 0** — `apps/main-site` 는 어떤 workspace 패키지의 의존성도 아니다.
  `apps/admin-dashboard/src/pages/preview/ViewPreview.tsx` 는 주석만 남았을 뿐
  자체 `ViewSchema` 타입을 갖고 있고 main-site 를 import 하지 않는다.
- **기능 변경 정지** — 마지막 기능 커밋은 2025-12-08 이고, 이후 2026 커밋은
  lint baseline chore 와 App Store 병렬축 은퇴(WO 선행분)뿐이다.

## 남아 있는 것

`src/main.tsx` → `src/router/index.tsx` 의 명시적 Route 표로 동작하는 7개 페이지
(auth · dashboard · forum · lms · seller dashboard)와 그 공통 컴포넌트·context 뿐이다.

## 개발

```bash
pnpm dev        # http://localhost:5175
pnpm build
pnpm typecheck
```
