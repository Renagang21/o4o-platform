export type ServicePolicyStatus = 'draft' | 'published' | 'archived';
export type ServicePolicyLifecycleAction = 'archive' | 'restore';

export class ServicePolicyLifecycleError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(
    code: string,
    message: string,
    httpStatus = 409,
  ) {
    super(message);
    this.name = 'ServicePolicyLifecycleError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/**
 * 법적 문서는 감사 이력을 보존해야 하므로 물리 삭제 대신 archive/restore만 허용한다.
 * 게시 중인 문서는 실수로 공개에서 사라지지 않도록 먼저 게시 해제해야 한다.
 */
export function resolveServicePolicyLifecycle(
  currentStatus: string,
  action: ServicePolicyLifecycleAction,
): ServicePolicyStatus {
  if (action === 'archive') {
    if (currentStatus === 'published') {
      throw new ServicePolicyLifecycleError(
        'PUBLISHED_POLICY_CANNOT_BE_ARCHIVED',
        '게시 중인 문서는 먼저 게시 해제해야 합니다.',
      );
    }
    if (currentStatus === 'archived') {
      throw new ServicePolicyLifecycleError('POLICY_ALREADY_ARCHIVED', '이미 보관된 문서입니다.');
    }
    if (currentStatus !== 'draft') {
      throw new ServicePolicyLifecycleError('INVALID_POLICY_STATUS', '현재 상태에서는 문서를 보관할 수 없습니다.');
    }
    return 'archived';
  }

  if (currentStatus !== 'archived') {
    throw new ServicePolicyLifecycleError('POLICY_NOT_ARCHIVED', '보관된 문서만 복원할 수 있습니다.');
  }
  return 'draft';
}
