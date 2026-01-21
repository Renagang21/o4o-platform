# Digital Signage Role Definition V1.2

> Version: 1.2
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
4. **Clear Responsibility Boundaries**: Each party is responsible only for their defined scope

---

## 2. Role Responsibility Matrix

| Subject | Create | Select | Arrange | Control | Responsibility |
|---------|--------|--------|---------|---------|----------------|
| **Platform** | - | - | - | System/Permissions | Infrastructure only |
| **HQ Operator** | Global Content | - | - | Forced Ads (isForced) | Forced content only |
| **Store (Pharmacy)** | - | Own Content | Display Arrangement | - | **Playback results** |

### 2.1 Detailed Responsibilities

#### Platform (Neture/o4o)
- System-level settings management
- Extension management (install/remove)
- Permission and access control
- **Does NOT**:
  - Create or arrange content directly
  - Take responsibility for individual store playback results
  - Manage store-level display configurations

#### HQ Operator
- Creates global content (HQ Playlists, Media, Templates)
- Manages content production pipeline
- Sets `isForced` flag on mandatory advertisements
- **Does NOT**:
  - Select content on behalf of stores
  - Arrange store display configurations
  - Access individual store data
  - Take responsibility for non-forced content playback

#### Store (Pharmacy/Medical Institution)
- Clones global content to local store
- Selects which content to use from cloned items
- Arranges content order and display layout
- Manages local schedules and devices
- **Primary responsibility for**:
  - All playback results in their store
  - Content selection decisions
  - Display arrangement outcomes

---

## 3. Responsibility Structure Declaration

### 3.1 Official Responsibility Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESPONSIBILITY BOUNDARIES                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Platform (Neture/o4o)                                          │
│  ├─ Infrastructure & System                                      │
│  └─ NOT responsible for: content, arrangement, playback results │
│                                                                  │
│  HQ Operator                                                     │
│  ├─ Global content provision                                     │
│  ├─ Forced content (isForced=true) ONLY                         │
│  └─ NOT responsible for: store selections, arrangements         │
│                                                                  │
│  Store (Pharmacy)                                                │
│  ├─ Content selection decisions                                  │
│  ├─ Display arrangement                                          │
│  └─ PRIMARY RESPONSIBILITY for: in-store playback results       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Terms of Service Key Statement

The following statement MUST be reflected in Terms of Service:

> Digital Signage 콘텐츠는 각 매장이 선택·편성한 결과에 따라 노출됩니다.
> 플랫폼 및 운영자는 강제 노출 콘텐츠(isForced)를 제외한
> 개별 매장의 편성 결과에 대해 직접적인 책임을 지지 않습니다.

**English translation:**
> Digital Signage content is displayed according to each store's selection and arrangement.
> The platform and operators are not directly responsible for individual store
> arrangement results, except for forced content (isForced).

### 3.3 Forced Content Responsibility

| Content Type | Responsible Party |
|--------------|-------------------|
| isForced = true | HQ Operator / Platform |
| isForced = false (or not set) | Store |

---

## 4. Content Flow Model

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

### 4.1 Clone
- Store copies HQ/Supplier/Community content to local library
- Cloned content becomes store-owned copy
- Original remains unchanged in global repository

### 4.2 Select
- Store chooses which cloned items to activate
- Selection is autonomous store decision
- No HQ approval required for selection

### 4.3 Arrange
- Store determines display order and schedule
- Store manages channel/slot assignments
- **Exception**: `isForced` items maintain minimum presence

### 4.4 Play
- Content plays according to store arrangement
- Forced items are included per HQ specification
- All other content follows store preferences
- **Store bears responsibility for playback results**

---

## 5. Forced Content (isForced) Specification

### 5.1 Purpose
Forced content is the **minimal control mechanism** for HQ to ensure critical advertisements or announcements reach all displays.

### 5.2 Constraints
| Action | Allowed | Reason |
|--------|---------|--------|
| Remove forced item | **No** | HQ protection |
| Edit forced content | **No** | HQ protection |
| Change forced item order | **Yes** (among forced items only) | Minimal flexibility |
| Disable forced item | **No** | HQ protection |

### 5.3 Responsibility for Forced Content

Forced content (isForced = true) is the **only area** where:
- HQ/Platform bears responsibility
- Store cannot modify or remove
- Complaints should be directed to HQ, not store

---

## 6. UI Phrase Standards

### 6.1 Store UI Standard Phrases

#### Button Phrases
| Context | Standard Phrase (KO) | Standard Phrase (EN) |
|---------|---------------------|----------------------|
| Clone from global | 내 Signage에 추가 | Add to My Signage |
| Clone action | 내 라이브러리로 가져오기 | Import to My Library |
| Arrange to channel | 채널에 배치 | Place in Channel |
| Forced content indicator | 필수 노출 콘텐츠 | Required Content |

#### Status Phrases
| Status | Standard Phrase (KO) | Standard Phrase (EN) |
|--------|---------------------|----------------------|
| Playing | 현재 방영 중 | Now Playing |
| Inactive | 편성됨 (비활성) | Scheduled (Inactive) |
| Forced | 필수 노출 (제거 불가) | Required (Cannot Remove) |
| HQ Source | 본부 제공 콘텐츠 | HQ Provided Content |
| Supplier Source | 공급자 제공 콘텐츠 | Supplier Provided Content |
| Community Source | 다른 약국 공유 | Shared by Other Stores |

### 6.2 HQ/Operator UI Standard Phrases

#### Prohibited Phrases
These phrases imply incorrect responsibility and MUST NOT be used:

| Prohibited | Reason |
|------------|--------|
| "매장 적용" (Apply to Store) | Implies HQ arranges for stores |
| "매장에 배포" (Deploy to Store) | Implies forced distribution |
| "매장 관리" (Manage Store) | Implies HQ manages store content |
| "대신 운영" (Operate on behalf) | Violates autonomy principle |

#### Correct Phrases
| Context | Correct Phrase (KO) | Correct Phrase (EN) |
|---------|---------------------|----------------------|
| Publish content | 글로벌 라이브러리에 추가 | Add to Global Library |
| Make available | 복제 가능 콘텐츠로 제공 | Provide as Clonable Content |
| Set forced | 필수 노출로 지정 | Mark as Required |

---

## 7. Community Content Sharing Rules

### 7.1 Definition
Community is a mechanism for **stores to share content with each other** through the global library.
It is NOT a direct distribution or forced deployment system.

### 7.2 Sharing Flow

```
┌──────────┐     Share      ┌──────────────┐     Curate     ┌──────────────┐
│ Store A  │ ─────────────> │  Community   │ ─────────────> │   Global     │
│ (Create) │                │   Queue      │                │   Library    │
└──────────┘                └──────────────┘                └──────────────┘
                                                                   │
                                                                   │ Clone
                                                                   ▼
                                                            ┌──────────┐
                                                            │ Store B  │
                                                            │ (Select) │
                                                            └──────────┘
```

### 7.3 Rules

| Rule | Description |
|------|-------------|
| Ownership | Original creator retains ownership |
| Modification | Only original creator can modify/delete |
| Cloning | Other stores clone to their own library |
| Responsibility | Each store responsible for their cloned copy |
| Forced | Community content CANNOT be forced |
| Auto-deploy | Community content CANNOT auto-deploy |

### 7.4 Prohibited Actions for Community Content

- Setting isForced = true on community content
- Auto-distributing to stores without clone action
- Directly "applying" to specific stores
- Modifying other stores' community content

---

## 8. Key Clarifications

### 8.1 What This Document Removes

> **"운영자가 대신 운영한다"** (Operator runs on behalf of store)

This statement is **removed** from all documentation. The Store is the autonomous subject, not a passive recipient.

### 8.2 What This Document Affirms

| Statement | Status |
|-----------|--------|
| Store selects its own content | **Correct** |
| Store arranges its own displays | **Correct** |
| Store is responsible for playback results | **Correct** |
| HQ creates content for clone | **Correct** |
| HQ controls via isForced only | **Correct** |
| HQ is responsible for forced content | **Correct** |
| HQ manages store displays | **Incorrect** |
| Operator arranges store content | **Incorrect** |
| Platform is responsible for all playback | **Incorrect** |

---

## 9. Final Declaration (v1.2)

> **Digital Signage는
> 매장이 선택·배치하고
> 운영자는 선택 가능한 환경만 제공하며
> 플랫폼은 강제 광고를 제외한 편성 결과에 개입하지 않는다.**

**English:**
> **In Digital Signage,
> stores select and arrange content,
> operators only provide a selectable environment,
> and the platform does not intervene in arrangement results except for forced ads.**

---

## 10. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-17 | Initial role structure (V3) |
| 1.1 | 2026-01-19 | Explicit Clone→Select→Arrange→Play model; Store as subject; Removed "대신 운영" concept |
| 1.2 | 2026-01-19 | Added responsibility structure; Terms of Service requirements; UI phrase standards; Community rules |

---

## 11. Related Documents

- [Role Structure V3](./ROLE-STRUCTURE-V3.md)
- [Role Access Policy V1](./ROLE-ACCESS-POLICY-V1.md)
- [Core/Extension Structure V1](./CORE-EXTENSION-STRUCTURE-V1.md)
- [Pharmacy Signage Guide V1](./PHARMACY-SIGNAGE-GUIDE-V1.md)
- [HQ Operator Signage Guide V1](./HQ-OPERATOR-SIGNAGE-GUIDE-V1.md)
- [Signage Terms & Responsibility V1](./SIGNAGE-TERMS-RESPONSIBILITY-V1.md)
- [Community Content Rules V1](./COMMUNITY-CONTENT-RULES-V1.md)
- [TV Playback Policy V1](./TV-PLAYBACK-POLICY-V1.md)
- [Signage Metrics Responsibility V1](./SIGNAGE-METRICS-RESPONSIBILITY-V1.md)

---

*Last Updated: 2026-01-19*
