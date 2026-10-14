/** Public error messages never contain an OAuth code, provider response, or credential. */
export class SocialAuthError extends Error {
  constructor(readonly code: string, message: string, readonly statusCode = 400, readonly serviceAccess?: unknown) {
    super(message);
    this.name = 'SocialAuthError';
  }
}
export const invalidSocialFlow = () => new SocialAuthError(
  'SOCIAL_FLOW_INVALID', '인증 요청이 만료되었거나 사용할 수 없습니다. 다시 시작해 주세요.', 401,
);
