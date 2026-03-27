/**
 * AppError — O4O Platform 표준 에러 클래스
 *
 * WO-O4O-APP-ERROR-MINIMAL-STANDARD-V1
 *
 * 기존 throw new Error() 대신 선택적으로 사용.
 * Global Error Handler가 자동으로 errorCode/statusCode/details를 인식.
 *
 * @example
 * throw new AppError('NOT_FOUND', '상품을 찾을 수 없습니다', 404);
 * throw new AppError('BUSINESS_ERROR', '재고 부족', 400, { stock: 3 });
 */

import type { ErrorCode } from './error-codes.js';

export class AppError extends Error {
  public readonly errorCode: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(
    errorCode: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any,
  ) {
    super(message);

    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}
