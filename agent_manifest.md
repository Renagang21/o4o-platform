# Antigravity Agent Manifest

## 🤖 Active Agents

| Agent Name | Role | Branch | Focus |
| :--- | :--- | :--- | :--- |
| **Agent-Yaksa** | Yaksa App Dev | `feature/yaksa-report-suite` | Annual Reporting Form & API Integration |
| **Agent-Cosmetics** | Cosmetic Retail Dev | `feature/cos-retail-ui` | Product Details UI, Reviews, Recommendations |
| **Agent-Platform-Refactor** | Core Refactoring | `refactor/cms-appstore-core-v2` | CMS Core Optimization, AppStore Structure |

## 🛡️ Coding Guidelines (STRICT)

### 1. File Paths
- **NO ABSOLUTE PATHS**: Never use `/home/...` or `C:\Users\...` in code.
- **Relative Paths**: Use `./components/Button` or `../utils/api`.
- **Aliases**: Use project aliases (e.g., `@/components`, `~server`) defined in `tsconfig.json` or `package.json`.

### 2. Git Flow
- Base Branch: `develop`
- PR Target: `develop`
- **Priority**: `Agent-Platform-Refactor` changes must be merged/stabilized first if conflicts arise.

### 3. Synchronization
- Daily: Pull `develop` -> Rebase/Merge to Feature Branch -> Resolve Conflicts -> Push.
