/**
 * Reporting-Yaksa Routes
 */

export { templateRoutes } from './templateRoutes.js';
export {
  memberReportRoutes,
  adminReportRoutes,
  reportRoutes,
} from './reportRoutes.js';

// 모든 라우트 통합
import { templateRoutes } from './templateRoutes.js';
import { reportRoutes } from './reportRoutes.js';

export const allRoutes = [...templateRoutes, ...reportRoutes];
