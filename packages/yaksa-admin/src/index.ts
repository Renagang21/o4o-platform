/**
 * yaksa-admin - 지부/분회 관리자 센터
 *
 * === 정체성 정의 (변경 불가) ===
 *
 * yaksa-admin은
 * 데이터를 생성하거나 편집하는 곳이 아니라,
 * 각 Yaksa 서비스에 이미 존재하는 데이터를
 * '승인(Approval)'하고 '조회(Overview)'하는 관제 센터다.
 *
 * === Scope Fixation ===
 *
 * [Scope Included]
 * - Membership Approval (membership-yaksa)
 * - Reporting Review (reporting-yaksa)
 * - Officer Role Assign (organization-core + membership-yaksa)
 * - Education Status Overview (lms-yaksa, READ ONLY)
 * - Fee Payment Overview (annualfee-yaksa, READ ONLY)
 *
 * [Scope Excluded - DO NOT IMPLEMENT]
 * - Board / Announcement CRUD (use forum-yaksa)
 * - File Repository / DMS
 * - Accounting / Expense / Budget
 * - SMS / Message System
 * - CMS / Homepage Builder
 * - KPA Direct Integration
 */

// Manifest
export { yaksaAdminManifest, manifest } from './manifest.js';

// Lifecycle
export { install } from './lifecycle/install.js';
export { activate } from './lifecycle/activate.js';
export { deactivate } from './lifecycle/deactivate.js';

// Backend
export { createRoutes } from './backend/index.js';
