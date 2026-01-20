/**
 * Signage Extension - Router Base
 *
 * WO-SIGNAGE-PHASE3-DEV-FOUNDATION
 *
 * Extension Router Factory
 * 각 Extension은 이 Factory를 사용하여 Router를 생성합니다.
 *
 * API 경로 패턴: /api/signage/:serviceKey/ext/{extension}/...
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { DataSource } from 'typeorm';
import type { ExtensionType } from './extension.types.js';
import { requireExtensionEnabled, createExtensionGuards } from './extension.guards.js';
import { createCoreAdapter, CoreExtensionAdapter } from './extension.adapter.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extension Request - Request 객체에 Extension 정보 추가
 */
export interface ExtensionRequest extends Request {
  extensionType: ExtensionType;
  extensionRole?: 'operator' | 'store' | 'admin' | 'partner';
  serviceKey: string;
  organizationId?: string;
  coreAdapter: CoreExtensionAdapter;
}

/**
 * Extension Router Options
 */
export interface ExtensionRouterOptions {
  extensionType: ExtensionType;
  dataSource: DataSource;
}

/**
 * Extension Route Handler
 */
export type ExtensionRouteHandler = (
  req: ExtensionRequest,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

/**
 * Extension Route Definition
 */
export interface ExtensionRouteDefinition {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  guards?: ('operator' | 'store' | 'storeRead')[];
  handler: ExtensionRouteHandler;
}

// ============================================================================
// EXTENSION ROUTER FACTORY
// ============================================================================

/**
 * Extension Router Factory
 *
 * Extension Router를 생성하고 공통 미들웨어를 적용합니다.
 */
export function createExtensionRouter(options: ExtensionRouterOptions): Router {
  const { extensionType, dataSource } = options;
  const router = Router({ mergeParams: true });
  const guards = createExtensionGuards(extensionType);

  // Core Adapter 인스턴스 생성
  const coreAdapter = createCoreAdapter(dataSource, extensionType);

  // ========== COMMON MIDDLEWARE ==========

  // Extension 활성화 확인 (모든 라우트에 적용)
  router.use(requireExtensionEnabled(extensionType));

  // Extension Request 확장 미들웨어
  router.use((req: Request, res: Response, next: NextFunction) => {
    const extReq = req as ExtensionRequest;
    extReq.extensionType = extensionType;
    extReq.serviceKey = req.params.serviceKey;
    extReq.organizationId = (req as any).organizationId || (req as any).user?.organizationId;
    extReq.coreAdapter = coreAdapter;
    next();
  });

  return router;
}

/**
 * Guard 미들웨어 조합
 */
export function applyGuards(
  extensionType: ExtensionType,
  guardTypes: ('operator' | 'store' | 'storeRead')[],
): ((req: Request, res: Response, next: NextFunction) => void)[] {
  const guards = createExtensionGuards(extensionType);
  const middlewares: ((req: Request, res: Response, next: NextFunction) => void)[] = [];

  for (const guardType of guardTypes) {
    switch (guardType) {
      case 'operator':
        middlewares.push(guards.operator);
        break;
      case 'store':
        middlewares.push(guards.store);
        break;
      case 'storeRead':
        middlewares.push(guards.storeRead);
        break;
    }
  }

  return middlewares;
}

// ============================================================================
// EXTENSION ROUTES REGISTRATION HELPER
// ============================================================================

/**
 * Extension 라우트 등록 헬퍼
 *
 * Route Definition 배열을 받아서 Router에 등록합니다.
 */
export function registerExtensionRoutes(
  router: Router,
  extensionType: ExtensionType,
  routes: ExtensionRouteDefinition[],
): void {
  for (const route of routes) {
    const guards = route.guards ? applyGuards(extensionType, route.guards) : [];
    const handlers = [...guards, route.handler as any];

    switch (route.method) {
      case 'get':
        router.get(route.path, ...handlers);
        break;
      case 'post':
        router.post(route.path, ...handlers);
        break;
      case 'put':
        router.put(route.path, ...handlers);
        break;
      case 'patch':
        router.patch(route.path, ...handlers);
        break;
      case 'delete':
        router.delete(route.path, ...handlers);
        break;
    }
  }
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Extension 성공 응답
 */
export function sendExtensionSuccess<T>(
  res: Response,
  data: T,
  meta?: Record<string, unknown>,
): void {
  res.json({
    data,
    meta,
  });
}

/**
 * Extension 목록 응답
 */
export function sendExtensionList<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  extensionType: ExtensionType,
): void {
  res.json({
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
      extension: extensionType,
    },
  });
}

/**
 * Extension 에러 응답
 */
export function sendExtensionError(
  res: Response,
  statusCode: number,
  errorCode: string,
  message: string,
  extensionType?: ExtensionType,
): void {
  res.status(statusCode).json({
    error: errorCode,
    message,
    statusCode,
    extension: extensionType,
  });
}
