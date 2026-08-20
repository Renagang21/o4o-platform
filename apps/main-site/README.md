# O4O Platform - NextGen Frontend

> **상태: RETIRED_RUNTIME (2026-08-20)**
> Cloud Run `o4o-main-site` 와 `deploy-main-site.yml` 은 폐기됐다.
> 이 source 는 참고·재사용 자산으로만 남으며 **배포 대상이 아니다.**
> 근거: [WO-O4O-MAIN-SITE-DECOMMISSION-FINAL-CLOSURE-V1-CHECK](../../docs/checks/WO-O4O-MAIN-SITE-DECOMMISSION-FINAL-CLOSURE-V1-CHECK.md)
> (`ci-pipeline.yml` 의 build 검증에는 계속 포함돼 컴파일 가능 상태를 유지한다.)

Complete rewrite of the O4O Platform frontend using View-based architecture.

## Architecture

- **View Schema**: JSON-based page definitions
- **ViewRenderer**: Core rendering engine that interprets View JSON
- **Component Registry**: Centralized registry for Function and UI components
- **Layout System**: Reusable layout components (DefaultLayout, DashboardLayout, etc.)

## Key Features

- ✅ View JSON-based rendering (replaces Page/Theme/BlockEditor)
- ✅ Function Component system (replaces shortcodes)
- ✅ UI Component registry
- ✅ 5 Layout types (Default, Dashboard, Shop, Auth, Minimal)
- ✅ fetch規칙 자동 처리 (react-query)
- ✅ 조건부/반복 렌더링 지원

## Directory Structure

```
src/
  ├── view/              # ViewRenderer core
  │   ├── renderer.tsx   # Main ViewRenderer
  │   ├── loader.ts      # View JSON loader
  │   ├── types.ts       # Type definitions
  │   └── helpers/       # Helper functions
  ├── components/
  │   └── registry/      # Component registries
  ├── layouts/           # Layout components
  └── views/             # View JSON files
```

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Server will run on http://localhost:5175

### Build

```bash
pnpm build
```

## Creating New Views

1. Create a JSON file in `src/views/`
2. Define layout and components
3. Add URL mapping in `src/view/loader.ts`

Example:

```json
{
  "viewId": "my-page",
  "layout": { "type": "DefaultLayout" },
  "components": [
    {
      "type": "MyComponent",
      "props": { ... }
    }
  ]
}
```

## Adding Components

### UI Component

1. Create component in `src/components/registry/ui.ts`
2. Add to `UIComponentRegistry`

### Function Component

1. Create function in `src/components/registry/function.ts`
2. Add to `FunctionRegistry`

## Documentation

See `/docs/nextgen-frontend/` for complete specifications:

- `specs/view-schema.md` - View Schema specification
- `specs/routing-view-architecture.md` - Routing architecture
- `specs/component-registry-spec.md` - Component registry
- `specs/layout-system-spec.md` - Layout system
- `implementation/view-renderer-plan.md` - Implementation guide

## Status

🚧 **In Development** - This is the NextGen rewrite, running in parallel with the existing main-site.

Once completed, this will replace the current main-site entirely.
