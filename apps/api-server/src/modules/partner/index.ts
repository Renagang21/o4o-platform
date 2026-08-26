/**
 * Partner Module Index
 * WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1
 * WO-PARTNER-APPLICATION-V1
 */

// Entities
export * from './entities/index.js';

// Services
export * from './services/index.js';

// Guards
export * from './guards/partner-context.guard.js';

// Controller
export * from './partner.controller.js';

// Routes
export { default as partnerDashboardRoutes } from './partner-dashboard.routes.js';
// WO-O4O-PARTNER-APPLICATION-ENTITY-TABLE-CONTRACT-ROOT-CAUSE-AND-PRODUCTION-CLOSURE-V1:
//   partnerApplicationRoutes 은퇴 — `/api/v1/partner` 마운트에 가려 도달 불가였고
//   대상 테이블(partner_applications)도 존재한 적이 없다. canonical = cosmetics stores apply.
