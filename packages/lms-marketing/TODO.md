# LMS-Marketing TODO

## Overview

Marketing LMS Extension for O4O Platform
- Product info delivery to sellers/consumers
- Marketing quiz/survey campaigns
- Engagement capture and analytics

---

## Phase Status

### ✅ Phase R5 – Bootstrap (Complete)
- [x] Package structure created
- [x] manifest.ts
- [x] backend/index.ts with factory functions
- [x] Lifecycle hooks (install, activate, deactivate, uninstall)
- [x] AppStore registration

---

## Next Phases

### Phase R6 – Product Info Delivery Module
- [ ] ProductInfoBundle entity (if needed, or use ContentBundle)
- [ ] ProductInfoService
- [ ] ProductInfoController
- [ ] Supplier publishing UI
- [ ] Consumer/Seller viewing integration
- [ ] Engagement logging for product info views

### Phase R7 – Marketing Quiz Campaign Module
- [ ] QuizCampaign entity (wraps Quiz with campaign metadata)
- [ ] QuizCampaignService
- [ ] QuizCampaignController
- [ ] Campaign targeting (by user segment, organization)
- [ ] Campaign scheduling (start/end dates)
- [ ] Engagement logging for quiz participation

### Phase R8 – Survey Campaign Module
- [ ] SurveyCampaign entity (wraps Survey with campaign metadata)
- [ ] SurveyCampaignService
- [ ] SurveyCampaignController
- [ ] Market research survey templates
- [ ] Response aggregation
- [ ] Engagement logging for survey participation

### Phase R9 – Engagement Dashboard for Suppliers
- [ ] AnalyticsService
- [ ] AnalyticsController
- [ ] Dashboard UI components
- [ ] Real-time engagement metrics
- [ ] Campaign performance reports
- [ ] Export functionality

### Phase R10 – Supplier Content Publishing UI (Admin)
- [ ] Admin dashboard pages
- [ ] Campaign creation wizard
- [ ] Content preview
- [ ] Publishing workflow
- [ ] Campaign management (pause, resume, end)

### Phase R11 – Consumer/Seller Campaign Viewer Integration
- [ ] Integration with main-site
- [ ] Campaign discovery page
- [ ] Personalized campaign recommendations
- [ ] Campaign completion tracking
- [ ] Rewards/incentives system (optional)

---

## Dependencies

### Required Core
- `lms-core` - ContentBundle, Quiz, Survey, EngagementLog

### No Yaksa Dependencies
- This extension is independent from Yaksa LMS
- Can be used by any supplier type (cosmetics, tourism, healthcare, etc.)

---

## API Endpoints (Planned)

### Phase R6
```
GET    /api/v1/marketing/product-info
POST   /api/v1/marketing/product-info
GET    /api/v1/marketing/product-info/:id
PUT    /api/v1/marketing/product-info/:id
DELETE /api/v1/marketing/product-info/:id
POST   /api/v1/marketing/product-info/:id/publish
```

### Phase R7
```
GET    /api/v1/marketing/campaigns/quiz
POST   /api/v1/marketing/campaigns/quiz
GET    /api/v1/marketing/campaigns/quiz/:id
PUT    /api/v1/marketing/campaigns/quiz/:id
DELETE /api/v1/marketing/campaigns/quiz/:id
POST   /api/v1/marketing/campaigns/quiz/:id/publish
POST   /api/v1/marketing/campaigns/quiz/:id/end
```

### Phase R8
```
GET    /api/v1/marketing/campaigns/survey
POST   /api/v1/marketing/campaigns/survey
GET    /api/v1/marketing/campaigns/survey/:id
PUT    /api/v1/marketing/campaigns/survey/:id
DELETE /api/v1/marketing/campaigns/survey/:id
POST   /api/v1/marketing/campaigns/survey/:id/publish
POST   /api/v1/marketing/campaigns/survey/:id/end
```

### Phase R9
```
GET    /api/v1/marketing/analytics/campaigns/:id
GET    /api/v1/marketing/analytics/supplier/:supplierId
GET    /api/v1/marketing/analytics/engagement/summary
GET    /api/v1/marketing/analytics/engagement/trends
```

---

## Notes

- Uses LMS-Core's ContentBundle as the base content structure
- All engagement is logged via LMS-Core's EngagementLoggingService
- Supplier-scoped: each supplier manages their own campaigns
- Platform-wide analytics available for admins
