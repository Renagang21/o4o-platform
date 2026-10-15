/** Tokens remain tab-local and never enter login/signup URLs. */
export const OPERATOR_INVITATION_KEY = 'o4o_operator_invite';
export function operatorInvitationReturnPath(): '/' | '/operator-invite' {
  try {
    return /^[a-f0-9]{64}$/.test(sessionStorage.getItem(OPERATOR_INVITATION_KEY) ?? '')
      ? '/operator-invite' : '/';
  } catch {
    return '/';
  }
}
