# PartnerOps App Specification

> 최종 업데이트: 2025-12-10
> 앱 타입: Extension App

---

## 1. Overview

PartnerOps는 파트너/어필리에이트 마케팅을 위한 Extension App이다.

| 항목 | 값 |
|------|-----|
| appId | `partnerops` |
| type | Extension |
| dependsOn | `dropshipping-core` |
| version | 1.0.0 |

### 핵심 기능

- **파트너 관리**: 파트너 등록, 승인, 프로필 관리
- **링크 추적**: 어필리에이트 링크 생성 및 클릭 추적
- **전환 분석**: 주문 전환율, 퍼널 분석
- **정산 연동**: dropshipping-core 커미션 시스템 연동

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│                  PartnerOps                      │
├─────────────────────────────────────────────────┤
│  Controllers                                     │
│  ├─ DashboardController                         │
│  ├─ ProfileController                           │
│  ├─ RoutinesController (콘텐츠)                  │
│  ├─ LinksController                             │
│  ├─ ConversionsController                       │
│  └─ SettlementController                        │
├─────────────────────────────────────────────────┤
│  Event Handlers                                  │
│  ├─ order.created → recordConversion            │
│  ├─ commission.applied → updateStatus           │
│  └─ settlement.closed → markAsPaid              │
├─────────────────────────────────────────────────┤
│  Dependencies                                    │
│  └─ dropshipping-core (커미션, 정산)             │
└─────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `partnerops_partners` | 파트너 정보 |
| `partnerops_routines` | 파트너 콘텐츠 (루틴) |
| `partnerops_links` | 어필리에이트 링크 |
| `partnerops_clicks` | 클릭 기록 |
| `partnerops_conversions` | 전환 기록 |
| `partnerops_settings` | 테넌트별 설정 |

### partnerops_partners

```sql
id UUID PRIMARY KEY
tenant_id VARCHAR(255)
user_id UUID
partner_code VARCHAR(50) UNIQUE
name VARCHAR(255)
status VARCHAR(50) -- pending, approved, rejected
sns_accounts JSONB
metadata JSONB
```

### partnerops_conversions

```sql
id UUID PRIMARY KEY
partner_id UUID REFERENCES partnerops_partners
link_id UUID REFERENCES partnerops_links
order_id UUID
order_amount DECIMAL(12, 2)
commission_rate DECIMAL(5, 2)
commission_amount DECIMAL(12, 2)
status VARCHAR(50) -- pending, approved, paid
```

---

## 4. Event Integration

### Subscribes (수신)

| Event | 처리 |
|-------|------|
| `order.created` | 파트너 귀속 주문 시 전환 기록 |
| `commission.applied` | 전환 상태를 approved로 변경 |
| `settlement.closed` | 전환 상태를 paid로 변경 |

### Publishes (발행)

| Event | 시점 |
|-------|------|
| `partner.registered` | 파트너 등록 시 |
| `partner.approved` | 파트너 승인 시 |
| `partner.link.clicked` | 링크 클릭 시 |
| `partner.conversion.recorded` | 전환 기록 시 |

---

## 5. Permissions

| Permission | 설명 |
|------------|------|
| `partnerops.read` | 기본 읽기 권한 |
| `partnerops.write` | 기본 쓰기 권한 |
| `partnerops.routines.manage` | 콘텐츠 관리 |
| `partnerops.links.manage` | 링크 관리 |
| `partnerops.conversions.view` | 전환 조회 |
| `partnerops.settlement.view` | 정산 조회 |

---

## Related Documents

- [API Contract](./partnerops-api.md)
- [Routines Spec](./partnerops-routines.md)
- [Event Handlers](./partnerops-events.md)
- [Dropshipping Overview](../dropshipping/dropshipping-overview.md)

---

*Phase 12-1에서 생성*
