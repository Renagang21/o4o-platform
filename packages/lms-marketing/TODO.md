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

### ✅ Phase R6 – Product Info Delivery Module (Complete)
- [x] ProductContent entity with targeting support
- [x] ProductContentService (CRUD + publish + getForUser)
- [x] ProductContentController with REST API
- [x] API endpoints at /api/v1/lms-marketing/product
- [x] Database table: lms_marketing_product_contents
- [x] Hook: publishProductInfo, getProductContentsForUser

### ✅ Phase R7 – Marketing Quiz Campaign Module (Complete)
- [x] MarketingQuizCampaign entity with questions, rewards, targeting
- [x] MarketingQuizCampaignService (CRUD + publish + attempt recording)
- [x] MarketingQuizCampaignController with REST API
- [x] API endpoints at /api/v1/lms-marketing/quiz-campaign
- [x] Database table: lms_marketing_quiz_campaigns
- [x] Campaign targeting (by role, region, seller type)
- [x] Campaign scheduling (start/end dates)
- [x] Hooks: createQuizCampaign, getQuizCampaignsForUser
- [x] Frontend viewer: QuizCampaignViewerPage in main-site

---

## Next Phases

### ✅ Phase R8 – Survey Campaign Module (Complete)
- [x] SurveyCampaign entity (wraps Survey with campaign metadata)
- [x] SurveyCampaignService (CRUD + publish + response recording + statistics)
- [x] SurveyCampaignController with REST API
- [x] API endpoints at /api/v1/lms-marketing/survey-campaign
- [x] Database table: lms_marketing_survey_campaigns
- [x] Campaign targeting (by role, region, seller type)
- [x] Campaign scheduling (start/end dates)
- [x] Anonymous response support
- [x] Hooks: createSurveyCampaign, getSurveyCampaignsForUser
- [x] Frontend viewer: SurveyCampaignViewerPage in main-site
- [x] Survey question types: single_choice, multiple_choice, text, textarea, rating, scale, date, email, phone

### ✅ Phase R9 – Engagement Dashboard for Suppliers (Complete)
- [x] SupplierInsightsService with analytics methods
  - getDashboardSummary (overview, by type, recent activity)
  - getCampaignPerformance (filterable by type, status, date range)
  - getEngagementTrends (day/week/month period)
  - getCampaignAnalytics (detailed quiz/survey analytics)
  - exportCampaignData (JSON/CSV export)
  - getTopCampaigns
  - getRecentActivity
- [x] SupplierInsightsController with REST API
- [x] API endpoints at /api/v1/lms-marketing/insights
- [x] Hooks: getCampaignAnalytics, getSupplierDashboard, getEngagementTrends
- [x] Campaign performance reports
- [x] Export functionality (JSON/CSV)

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

### Phase R8 (Implemented)
```
GET    /api/v1/lms-marketing/survey-campaign           # List campaigns
GET    /api/v1/lms-marketing/survey-campaign/active    # Active campaigns for user
GET    /api/v1/lms-marketing/survey-campaign/supplier/:supplierId  # By supplier
GET    /api/v1/lms-marketing/survey-campaign/:id       # Get by ID
GET    /api/v1/lms-marketing/survey-campaign/:id/stats # Get statistics
POST   /api/v1/lms-marketing/survey-campaign           # Create campaign
POST   /api/v1/lms-marketing/survey-campaign/:id/submit # Submit response
PUT    /api/v1/lms-marketing/survey-campaign/:id       # Update campaign
POST   /api/v1/lms-marketing/survey-campaign/:id/publish   # Publish
POST   /api/v1/lms-marketing/survey-campaign/:id/unpublish # Unpublish
POST   /api/v1/lms-marketing/survey-campaign/:id/end   # End campaign
DELETE /api/v1/lms-marketing/survey-campaign/:id       # Delete (soft)
```

### Phase R9 (Implemented)
```
GET    /api/v1/lms-marketing/insights/dashboard/:supplierId        # Dashboard summary
GET    /api/v1/lms-marketing/insights/performance/:supplierId      # Campaign performance list
GET    /api/v1/lms-marketing/insights/trends/:supplierId           # Engagement trends
GET    /api/v1/lms-marketing/insights/activity/:supplierId         # Recent activity
GET    /api/v1/lms-marketing/insights/top/:supplierId              # Top campaigns
GET    /api/v1/lms-marketing/insights/campaign/:type/:campaignId   # Campaign analytics
GET    /api/v1/lms-marketing/insights/export/:supplierId           # Export data
```

---

## Notes

- Uses LMS-Core's ContentBundle as the base content structure
- All engagement is logged via LMS-Core's EngagementLoggingService
- Supplier-scoped: each supplier manages their own campaigns
- Platform-wide analytics available for admins
