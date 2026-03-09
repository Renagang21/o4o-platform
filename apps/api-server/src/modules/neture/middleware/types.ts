/**
 * Neture Domain — Shared Request Types
 *
 * 중복 정의 제거를 위한 공통 타입.
 * neture.routes.ts, neture-library.routes.ts 에서 공유.
 */

import type { Request } from 'express';

/** Authenticated user request */
export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    role: string;
    supplierId?: string;
  };
};

/** Request with supplierId set by requireActiveSupplier / requireLinkedSupplier middleware */
export type SupplierRequest = AuthenticatedRequest & {
  supplierId: string;
};

/** Request with partnerId set by requireActivePartner / requireLinkedPartner middleware */
export type PartnerRequest = AuthenticatedRequest & {
  partnerId: string;
};
