import type { Response } from 'express';

export const PHARMACY_HUB_SERVICE_KEY = 'pharmacy-hub';

export function isPharmacyHubRole(role: unknown): boolean {
  return typeof role === 'string' && role.startsWith(`${PHARMACY_HUB_SERVICE_KEY}:`);
}

export class ServiceRetiredError extends Error {
  readonly code = 'SERVICE_RETIRED';
  readonly httpStatus = 410;

  constructor() {
    super('종료된 서비스에는 신규 역할 부여나 가입 활성화를 할 수 없습니다.');
    this.name = 'ServiceRetiredError';
  }
}

export function sendServiceRetiredResponse(res: Response, error: unknown): boolean {
  if (!(error instanceof ServiceRetiredError)) return false;
  res.status(error.httpStatus).json({ success: false, error: error.message, code: error.code });
  return true;
}
