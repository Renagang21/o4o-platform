import type { ServiceScope } from '../utils/serviceScope.js';
import type { Request, RequestHandler } from 'express';
import type { CentralOperationService } from '@o4o/types';
import { AppDataSource } from '../database/connection.js';
import { assertCentralOperationRequest } from '../services/admin/central-operation-menu-grants.js';
import { OperationError } from '../services/operations/operation-audit.js';

export function centralRequestAuthMethod(req: Request): string | undefined {
  return (req as Request & {authMethod?: string}).authMethod;
}

/** UI paths are not authority. This classifies the actual protected API requested on any service host. */
export function centralApiMenus(service: CentralOperationService, req: Pick<Request, 'originalUrl' | 'method'>): string[] {
  const path = req.originalUrl.split('?')[0].replace(/\/$/, '');
  const menu = (area: string) => [`${service}.${area}`];
  if (path.includes('/home-presentation/')) return menu('home');
  if (/\/operator-inbox\//.test(path)) return menu('inbox');
  if (service === 'neture' && /\/operator\/members(?:\/|$)/.test(path)) {
    if (req.method === 'DELETE' && new URL(req.originalUrl,'http://localhost').searchParams.get('mode') === 'hard') return menu('membership-cleanup');
    return req.method === 'GET' ? ['neture.service-members','neture.membership-cleanup'] : menu('service-members');
  }
  if (/\/service-members(?:\/|$)|\/operator\/members(?:\/|$)/.test(path)) return service === 'community' && req.method === 'GET' ? ['community.members','community.erase-members'] : menu('members');
  if (/\/admin\/services\/[^/]+\/(?:legal-profile|policies)/.test(path)) return menu('legal');
  if (/\/admin\/services\/[^/]+\/contact-settings/.test(path)) return menu('contact-settings');
  if (/\/admin\/services\/[^/]+\/contact-inquiries/.test(path)) return menu(service === 'lecture' ? 'contact' : 'inbox');
  if (service === 'funding' && /\/neture\/operator\/market-trial(?:\/|$)/.test(path)) return menu('funding');
  if (service === 'supplier') {
    if (/\/neture\/admin\/suppliers(?:\/|$)/.test(path)) return menu('governance');
    if (req.method === 'GET' && /\/neture\/operator\/suppliers\/[^/]+\/active-fundings$/.test(path)) return ['supplier.suppliers','supplier.governance'];
    if (/\/neture\/operator\/supplier/.test(path)) return menu('suppliers');
  }
  if (service === 'lecture') {
    if (/\/admin\/services\/lecture\/legacy-education-requests/.test(path)) return menu('contact');
    if (/\/lms\/instructor\/applications(?:\/|$)/.test(path)) return menu('instructors');
    if (/\/lms\/(?:operator\/)?certificates(?:\/|$)/.test(path)) return menu('certificates');
    if (/\/lms\/(?:operator\/)?courses(?:\/|$)/.test(path)) return menu('courses');
    if (/\/lms\/contact/.test(path)) return menu('contact');
  }
  if (service === 'community') {
    if (/\/community\/management\/(boards|members)\/[^/]+(?:\/deletion-plan)?$/.test(path) && (req.method === 'DELETE' || path.endsWith('/deletion-plan'))) return menu(path.includes('/management/members/') ? 'erase-members' : 'erase-boards');
    if (path.endsWith('/community/management/boards') && req.method === 'GET') return ['community.boards','community.erase-boards'];

    if (/\/community\/(?:home|news|editorial)/.test(path)) return menu('editorial');
    if (/\/(?:communities|community)\/.*public-read/.test(path)) return menu('forums');
    if (/\/community\/(?:management|operator)\/(?:boards|members)/.test(path)) return menu('boards');
  }
  if (service === 'neture') {
    if (req.method === 'GET' && /\/neture\/operator\/pharmacy-documents\/[^/]+$/.test(path)) return menu('pharmacies');
    if (/\/neture\/admin\/service-approvals(?:\/|$)/.test(path)) return menu('service-approval-management');
    if (/\/neture\/admin\/settlements(?:\/|$)/.test(path)) return menu('settlements');
    if (/\/neture\/community\/manage(?:\/|$)/.test(path)) return menu('community-advertising');
    if (/\/neture\/operator\/approval-analytics$/.test(path)) return menu('service-product-approvals');
    if (/\/neture\/operator\/products(?:\/|$)/.test(path)) return ['neture.products','neture.product-approvals'];
    if (/\/neture\/operator\/product-cleanup\/(?:soft-delete\/|batch-soft-delete$)/.test(path)) return ['neture.products','neture.product-approvals'];
    if (/\/neture\/operator\/product-cleanup\/pending-offers\//.test(path)) return menu('service-product-approvals');
    const areas: Array<[RegExp, string]> = [
      [/\/neture\/operator\/product-cleanup(?:\/|$)/, 'cleanup'],
      [/\/neture\/operator\/categor(?:ies|y-mapping-rules)(?:\/|$)/, 'category-mapping'],
      [/\/forum\/admin\//, 'forum-deleted'],
      [/\/forum\/operator\/categories\/[^/]+\/(?:hard|delete-check)$/, 'forum-deleted'],
      [/\/forum\/operator\/analytics\//, 'forum-analytics'],
      [/\/forum\/operator\/(?:delete-requests|categories)(?:\/|$)/, 'forum-delete'],
      [/\/forum\/operator\/requests(?:\/|$)/, 'forums'],
      [/\/neture\/operator\/(?:all-offers|supply-products)(?:\/|$)/, 'products'],
      [/\/neture\/operator\/service-approvals(?:\/|$)/, 'service-product-approvals'],
      [/\/neture\/admin\/homepage-contents(?:\/|$)/, 'cms'],
      [/\/neture\/operator\/ai-report(?:\/|$)/, 'ai-report'],
      [/\/guide\/contents(?:\/|$)/, 'guides'],
      [/\/neture\/operator\/registrations(?:\/|$)/, 'applications'],
      [/\/qualifications\/pharmacist\/review(?:\/|$)/, 'qualifications'],
      [/\/pharmacy-memberships(?:\/|$)/, 'pharmacies'],
      [/\/contact-messages(?:\/|$)/, 'legacy-contact'],
      [/\/product-candidates(?:\/|$)/, 'candidates'],
      [/\/product-service-approvals(?:\/|$)/, 'service-product-approvals'],
      [/\/product-approvals(?:\/|$)/, 'product-approvals'],
      [/\/operator\/products(?:\/|$)/, 'products'],
      [/\/operator\/stores(?:\/|$)/, 'stores'],
      [/\/operator\/orders(?:\/|$)/, 'orders'],
      [/\/operator\/analytics(?:\/|$)/, 'analytics'],
      [/\/guide-contents(?:\/|$)/, 'guides'],
      [/\/homepage(?:\/|$)/, 'cms'],
      [/\/operator\/actions\/execute\/inquiries-mark-read$/, 'legacy-contact'],
      [/\/operator\/actions(?:\/|$)/, 'actions'],
    ];
    for (const [pattern, area] of areas) if (pattern.test(path)) return menu(area);
  }
  return []; // An unmapped operator API cannot silently inherit a menu grant.
}

export function centralOperationRequest(service: CentralOperationService, resolve: (req: Request) => string[] = req => centralApiMenus(service,req), db: Parameters<typeof assertCentralOperationRequest>[0] = AppDataSource): RequestHandler {
  return async (req,res,next) => {
    try {
      const actor = (req as Request & { user?: { id?: string } }).user?.id;
      if (!actor) { res.status(401).json({success:false,code:'AUTH_REQUIRED'}); return; }
      await assertCentralOperationRequest(db,actor,service,resolve(req),centralRequestAuthMethod(req));
      next();
    } catch (failure) {
      if (failure instanceof OperationError) { res.status(failure.status).json({success:false,code:failure.code,error:failure.message}); return; }
      res.status(503).json({success:false,code:'CENTRAL_MENU_ACCESS_UNAVAILABLE',error:'업무 위임을 확인하지 못했습니다. 다시 조회해 주세요.'});
    }
  };
}
export function withCentralOperationMenus(service: CentralOperationService, existing: (scope: string) => RequestHandler): (scope: string) => RequestHandler {
  const restrict = centralOperationRequest(service);
  return scope => {
    const guard = existing(scope);
    if (!/:(admin|operator)$/.test(scope)) return guard;
    return async (req,res,next) => {
      // Preserve the guard's awaitable lifecycle through the additional lookup.
      // Express callbacks do not automatically await a promise returned by next.
      let restriction: Promise<unknown> | undefined;
      await guard(req,res,error => {
        if (error) { next(error); return; }
        restriction = Promise.resolve(restrict(req,res,next));
      });
      await restriction;
    };
  };
}

/** Generic operator APIs keep their original service isolation; narrow only central Neture work. */
export function centralScopedNetureRequest(db: Parameters<typeof assertCentralOperationRequest>[0] = AppDataSource): RequestHandler {
  const restrict = centralOperationRequest('neture', undefined, db);
  return (req,res,next) => {
    const scope = (req as Request & {serviceScope?:ServiceScope}).serviceScope;
    if (!scope) { res.status(503).json({success:false,code:'SERVICE_SCOPE_UNAVAILABLE'}); return; }
    // Query/data scope cannot remove a current central assignment from authorization,
    // including ID-based writes. The restriction itself checks DB provenance and
    // preserves the existing gate for actors without a central Neture assignment.
    return restrict(req,res,next);
  };
}
