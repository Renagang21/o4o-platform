# Digital Signage Role Definition V1.1

> Version: 1.1
> Date: 2026-01-19
> Status: Active (Official)
> Reference: ROLE-STRUCTURE-V3, CORE-EXTENSION-STRUCTURE-V1

---

## 1. Overview

This document defines the **official role responsibilities** for the Digital Signage system.
It establishes the **Clone → Select → Arrange → Play** model where the Store (medical institution/pharmacy) is the primary subject of content selection and arrangement.

### Core Principles

1. **Store is the Selection/Arrangement Subject**: The Store autonomously selects and arranges content
2. **HQ Creates, Store Chooses**: HQ produces global content; Store decides what to use
3. **Minimal Control Only via isForced**: HQ's only control mechanism is forced ads (isForced flag)

---

## 2. Role Responsibility Matrix

| Subject | Create | Select | Arrange | Control |
|---------|--------|--------|---------|---------|
| **Platform Admin** | - | - | - | System/Permissions |
| **HQ Operator** | Global Content | - | - | Forced Ads (isForced) |
| **Store (Pharmacy)** | - | Own Content | Display Arrangement | - |

### 2.1 Detailed Responsibilities

#### Platform Admin
- System-level settings management
- Extension management (install/remove)
- Permission and access control
- **NOT responsible for**: Content creation, content selection, display arrangement

#### HQ Operator
- Creates global content (HQ Playlists, Media, Templates)
- Manages content production pipeline
- Sets `isForced` flag on mandatory advertisements
- **NOT responsible for**: Store-level content selection, display arrangement, store data access

#### Store (Pharmacy/Medical Institution)
- Clones global content to local store
- Selects which content to use from cloned items
- Arranges content order and display layout
- Manages local schedules and devices
- **NOT responsible for**: Creating global content, bypassing forced content

---

## 3. Content Flow Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Clone → Select → Arrange → Play          │
└─────────────────────────────────────────────────────────────┘

┌──────────┐     Clone      ┌──────────┐     Select     ┌──────────┐
│    HQ    │ ─────────────> │  Store   │ ─────────────> │  Store   │
│ (Create) │                │ (Library)│                │ (Active) │
└──────────┘                └──────────┘                └──────────┘
                                                              │
                                                              │ Arrange
                                                              ▼
                                                        ┌──────────┐
                                                        │ Display  │
                                                        │  (Play)  │
                                                        └──────────┘
```

### 3.1 Clone
- Store copies HQ/Supplier/Community content to local library
- Cloned content becomes store-owned copy
- Original remains unchanged in global repository

### 3.2 Select
- Store chooses which cloned items to activate
- Selection is autonomous store decision
- No HQ approval required for selection

### 3.3 Arrange
- Store determines display order and schedule
- Store manages channel/slot assignments
- **Exception**: `isForced` items maintain minimum presence

### 3.4 Play
- Content plays according to store arrangement
- Forced items are included per HQ specification
- All other content follows store preferences

---

## 4. Forced Content (isForced) Specification

### 4.1 Purpose
Forced content is the **minimal control mechanism** for HQ to ensure critical advertisements or announcements reach all displays.

### 4.2 Constraints
| Action | Allowed | Reason |
|--------|---------|--------|
| Remove forced item | **No** | HQ protection |
| Edit forced content | **No** | HQ protection |
| Change forced item order | **Yes** (among forced items only) | Minimal flexibility |
| Disable forced item | **No** | HQ protection |

### 4.3 Implementation
```typescript
// Forced item detection
interface PlaylistItem {
  isForced: boolean;  // Set by HQ Operator
  // ...other fields
}

// Store cannot modify these properties on forced items:
// - isForced flag
// - Content reference (mediaId, etc.)
// - Duration (for timed content)
```

---

## 5. Key Clarifications

### 5.1 What This Document Removes

> **"운영자가 대신 운영한다"** (Operator runs on behalf of store)

This statement is **removed** from all documentation. The Store is the autonomous subject, not a passive recipient.

### 5.2 What This Document Affirms

| Statement | Status |
|-----------|--------|
| Store selects its own content | **Correct** |
| Store arranges its own displays | **Correct** |
| HQ creates content for clone | **Correct** |
| HQ controls via isForced only | **Correct** |
| HQ manages store displays | **Incorrect** |
| Operator arranges store content | **Incorrect** |

---

## 6. Integration with Existing Documents

### 6.1 ROLE-STRUCTURE-V3.md
- Section 2.3 (Store): Aligns with this document
- Forced Items constraint defined in Section 5.3

### 6.2 ROLE-ACCESS-POLICY-V1.md
- Section 5 (Store Access Policy): Aligns with this document
- Section 5.3 details forced item restrictions

### 6.3 CORE-EXTENSION-STRUCTURE-V1.md
- Core handles Clone/Select/Arrange/Play mechanics
- Extensions do not modify role boundaries

---

## 7. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-17 | Initial role structure (V3) |
| 1.1 | 2026-01-19 | Explicit Clone→Select→Arrange→Play model; Store as subject; Removed "대신 운영" concept |

---

## 8. Related Documents

- [Role Structure V3](./ROLE-STRUCTURE-V3.md)
- [Role Access Policy V1](./ROLE-ACCESS-POLICY-V1.md)
- [Core/Extension Structure V1](./CORE-EXTENSION-STRUCTURE-V1.md)
- [Pharmacy Signage Guide](./PHARMACY-SIGNAGE-GUIDE-V1.md)
- [HQ Operator Signage Guide](./HQ-OPERATOR-SIGNAGE-GUIDE-V1.md)

---

*Last Updated: 2026-01-19*
