# Operator OS Baseline v1

> **Tag**: `o4o-operator-os-baseline-v1`
> **Date**: 2026-02-16
> **Status**: FROZEN
> **CLAUDE.md Section**: 20

---

## 1. Frozen Core Packages

| Package | Version | Role |
|---------|---------|------|
| `@o4o/security-core` | baseline | Service Scope Guard, role validation |
| `@o4o/hub-core` | baseline | Hub layout, Signal, QuickAction system |
| `@o4o/ai-core` | baseline | AI Insight orchestration |
| `@o4o/action-log-core` | baseline | Trigger execution history |
| `@o4o/asset-copy-core` | baseline | CMS content copy engine |

### Allowed Changes

- Bug fixes
- Performance improvements
- Documentation updates
- Test additions

### Prohibited Changes (Work Order Required)

- Type/interface structural changes
- New exports
- Dependency changes
- API contract changes

---

## 2. Hub UX Baseline

> Reference: `docs/platform/hub/HUB-UX-GUIDELINES-V1.md`

### Hub Classification

| Grade | Definition | Services |
|-------|-----------|----------|
| Operating OS | Signal + QuickAction + AI + ActionLog complete loop | Neture, GlycoPharm |
| Lightweight Hub | Signal + Navigation cards, minimal Trigger | KPA |
| Strategic Hub | Cross-service aggregation + Proxy Trigger | Platform |

### Signal Coverage at Freeze

| Service | Target | Achieved | Status |
|---------|--------|----------|--------|
| Neture | 70% | 80% | PASS |
| GlycoPharm | 70% | 90% | PASS |
| KPA | 40% | 42% | PASS |
| Platform | N/A | N/A | N/A |

### Fetch Pattern

| Service | Pattern | Status |
|---------|---------|--------|
| Neture | Promise.allSettled | PASS |
| GlycoPharm | Promise.allSettled | PASS |
| KPA | Promise.allSettled | PASS |
| Platform | Promise.allSettled | PASS |

---

## 3. Trigger Baseline

### Neture (8 triggers)

| Key | Endpoint | ActionLog |
|-----|----------|-----------|
| `neture.trigger.review_pending` | review-pending | Yes |
| `neture.trigger.auto_product` | auto-product | Yes |
| `neture.trigger.copy_best_content` | copy-best-content | Yes |
| `neture.trigger.refresh_settlement` | refresh-settlement | Yes |
| `neture.trigger.refresh_ai` | ai-refresh | Yes |
| `neture.trigger.approve_supplier` | approve-supplier | Yes |
| `neture.trigger.manage_partnership` | manage-partnership | Yes |
| `neture.trigger.audit_review` | audit-review | Yes |

### GlycoPharm (4 triggers)

| Key | Endpoint | ActionLog |
|-----|----------|-----------|
| `glycopharm.trigger.care_review` | care-review | Yes |
| `glycopharm.trigger.create_session` | coaching-auto-create | Yes |
| `glycopharm.trigger.refresh_ai` | ai-refresh | Yes |
| `glycopharm.trigger.review_requests` | (navigate) | No |

### KPA (2 triggers, navigate-only)

| Key | Target | ActionLog |
|-----|--------|-----------|
| `kpa.navigate.members_pending` | /operator/members | No |
| `kpa.navigate.org_approvals` | /demo/admin/dashboard | No |

### Platform (1 proxy trigger)

| Key | Endpoint | ActionLog |
|-----|----------|-----------|
| `platform.hub.trigger` | POST /v1/platform/hub/trigger | Yes |

---

## 4. Security Baseline

### Service Scope Configs

| Config | Service | Platform Bypass |
|--------|---------|----------------|
| `KPA_SCOPE_CONFIG` | kpa | Yes |
| `NETURE_SCOPE_CONFIG` | neture | Yes |
| `GLYCOPHARM_SCOPE_CONFIG` | glycopharm | Yes |
| `PLATFORM_SCOPE_CONFIG` | platform | No |

### Display Controller Isolation (GlycoPharm)

- All 14 endpoints enforce `pharmacy_id` isolation
- Admin bypass: `glycopharm:admin`, `platform:admin`, `platform:super_admin`
- Server-forced `pharmacy_id` on CREATE
- Ownership verification on UPDATE/DELETE

---

## 5. Included Commits

| Hash | Description |
|------|-------------|
| `e4c53aca7` | GlycoPharm AI Hub + Signal + QuickAction |
| `df8dc4596` | Neture AI Hub expansion |
| `968709184` | Platform Hub (cross-service aggregation) |
| `a0b1d92df` | Action Log Core |
| `b31678529` | Operator architecture stabilization |
| `73948d30e` | Retail Stable v1.0 |
| `055540c35` | Hub UX Guidelines alignment |

---

## 6. Change History

| Date | Version | Change |
|------|---------|--------|
| 2026-02-16 | v1.0 | Initial baseline freeze |

---

*This document is governed by CLAUDE.md Section 20.*
