# IR-AI-INSIGHT-WIRING-V1

## pharmacy-ai-insight Package Wiring Investigation

> **Step 1-3**: AI Package Wiring Check
> **Date**: 2026-02-13
> **Type**: Investigation Report (Read-Only)

---

## 1. Package Overview

| Item | Value |
|------|-------|
| Package | `@o4o/pharmacy-ai-insight` |
| Location | `packages/pharmacy-ai-insight/` |
| App ID | `pharmacy-ai-insight` |
| Type | `feature` |
| Manifest Status | `active` |
| Service Groups | `['yaksa']` |

---

## 2. Package Structure

```
packages/pharmacy-ai-insight/
├── src/
│   ├── backend/
│   │   ├── controllers/
│   │   │   ├── InsightController.ts      ← Express router factory
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── AiInsightService.ts       ← AI insight generation engine
│   │   │   ├── ProductHintService.ts     ← Product type hint engine
│   │   │   └── index.ts
│   │   ├── dto/
│   │   │   └── index.ts                  ← Input/Output type contracts
│   │   ├── utils/
│   │   │   ├── glucoseUtils.ts           ← TIR, CV, pattern calculation
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── frontend/
│   │   ├── pages/
│   │   │   ├── SummaryPage.tsx           ← React UI (uses MOCK data)
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── lifecycle/
│   │   ├── activate.ts
│   │   ├── deactivate.ts
│   │   ├── install.ts
│   │   ├── uninstall.ts
│   │   └── index.ts
│   ├── manifest.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

---

## 3. Backend Engines

### 3-A. AiInsightService

**Purpose**: Generate AI-powered insights from glucose data

**Key Method**: `generateInsight(input: AiInsightInput): AiInsightOutput`

**Output**:
- 3-5 summary cards with tone (neutral/positive/cautious)
- Pattern observations (variability, time-of-day trends, TIR)
- CTA suggestions
- **Principle**: Observation-based, NOT medical conclusions

### 3-B. ProductHintService

**Purpose**: Product TYPE hints (not specific product recommendations)

**Key Method**: `getProductHints(input): ProductHint[]`

**Based on**:
- Glucose data patterns (high variability -> monitoring devices)
- Purchase history (previous categories)
- Seasonal factors (summer/winter)
- Returns top 3 hints by priority
- **Principle**: `isRecommendation: false` (reference only)

### 3-C. glucoseUtils.ts

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `calculateTIR()` | `number[]` (glucose readings) | TIR percentage | Time In Range calculation |
| `calculateCV()` | `number[]` | CV percentage | Coefficient of Variation |
| `getVariabilityLevel()` | CV number | `'low'|'moderate'|'high'` | Variability classification |
| `getPatternDescription()` | pattern type | string | Human-readable pattern text |
| `getTimeSlot()` | hour number | slot name | 6 time-of-day slots |

### 3-D. InsightController

**Declared Routes**:
- `GET /api/v1/pharmacy-ai-insight/summary` - Full insight
- `POST /api/v1/pharmacy-ai-insight/patterns` - Pattern analysis only
- `POST /api/v1/pharmacy-ai-insight/product-hints` - Product hints only

**Auth**: Requires pharmacy authentication

---

## 4. Integration Status

### 4-A. API Server (`apps/api-server`)

| Check | Result | Detail |
|-------|--------|--------|
| In `package.json` dependencies | **NO** | Not listed |
| Import in any route file | **NO** | Zero imports found |
| Import in main.ts | **NO** | Not mounted |
| Import in any service file | **NO** | Zero references |
| In deploy-api.yml build layers | **NO** | Not built during CI |
| Listed in appsCatalog.ts | **YES** | Lines 477-488 (metadata only) |

**Conclusion**: Backend is **completely disconnected** from api-server. The controller, services, and utils exist in the package but are never instantiated or called at runtime.

### 4-B. Admin Dashboard (`apps/admin-dashboard`)

| Check | Result | Detail |
|-------|--------|--------|
| In `package.json` dependencies | **YES** | `"@o4o/pharmacy-ai-insight": "file:../../packages/pharmacy-ai-insight"` |
| Route registration in App.tsx | **YES** | Line 217 (lazy import), lines 1538-1549 |
| Menu entry | **YES** | `admin-menu.static.tsx` line 368 |
| Permission mapping | **YES** | `rolePermissions.ts` lines 92-94, `pharmacy-ai-insight.read` |
| Uses real API | **NO** | SummaryPage.tsx uses **hardcoded mock data** (line 163-229) |

**Routes registered**:
- `/pharmacy-ai-insight` - Main entry
- `/pharmacy-ai-insight/summary` - Summary page
- Both wrapped in `AppRouteGuard` with `pharmacy-ai-insight.read` permission

### 4-C. Frontend Mock Data

`SummaryPage.tsx` renders a complete UI but uses mock data:
- Summary cards: hardcoded array
- Pattern observations: hardcoded array
- Product hints: hardcoded array
- No `fetch()` or `authClient.api.*` calls

---

## 5. Manifest Declarations (Dormant)

The manifest declares resources that do NOT exist at runtime:

### Declared Tables (Not Created)
- `pharmacy_ai_insight_sessions`
- `pharmacy_ai_insight_settings`

### Declared Permissions
- `pharmacy-ai-insight.read`
- `pharmacy-ai-insight.generate`
- `pharmacy-ai-insight.products.view`

### Declared Dependencies
- Core: `organization-core`
- Optional: `dropshipping-core`, `digital-signage-core`

---

## 6. Root Cause Analysis

### Why is it disconnected?

1. **No CGM data source**: The package's `glucoseUtils.ts` expects `number[]` glucose readings as input, but no data pipeline exists to provide them (see `IR-GLYCOPHARM-ARCH-BASELINE-V1.md` GAP-L1-01~04)

2. **Extension activation system not operational**: The package has lifecycle hooks (`activate.ts`, `deactivate.ts`) but the platform's extension activation system doesn't call them

3. **Chicken-and-egg**: Backend can't be activated without data -> data tables don't exist -> no point mounting routes

---

## 7. What Would Be Needed to Activate

### Minimum Viable Activation Path

```
1. Create cgm_patients, cgm_patient_summaries tables (migration)
2. Implement CGM data ingestion endpoint (manual/file upload)
3. Add @o4o/pharmacy-ai-insight to api-server package.json
4. Mount InsightController routes in main.ts
5. Add to deploy-api.yml build layers
6. Replace SummaryPage mock data with real API calls
```

### Effort Estimate

| Task | Complexity |
|------|-----------|
| Data tables (migration) | Low |
| Data ingestion API | Medium |
| Backend route mounting | Low |
| Frontend API integration | Low |
| End-to-end data flow | High (CGM vendor integration) |

---

## 8. Summary

| Aspect | Status |
|--------|--------|
| Package builds | YES |
| Backend services implemented | YES |
| Utility functions (TIR, CV) work | YES (pure functions) |
| Backend mounted in api-server | **NO** |
| Frontend routes exist | YES (admin-dashboard) |
| Frontend calls API | **NO** (mock data) |
| Database tables exist | **NO** |
| CI/CD includes package | **NO** |
| **Overall Runtime Status** | **DORMANT** |

**The package is fully built but completely dormant at runtime. It serves as a design prototype / specification rather than operational code.**

---

*Investigation Report - Read-Only, No Code Changes*
*Version: 1.0*
*Status: Complete*
