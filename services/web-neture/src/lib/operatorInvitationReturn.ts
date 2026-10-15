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

const CHANNEL = 'o4o:operator-invitation-continuation:v1';
const validToken = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
/** Same-origin ephemeral transport; no token in URLs, cookies or persistent storage. */
export function serveOperatorInvitationContinuation(): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  let channel: BroadcastChannel;
  try { channel = new BroadcastChannel(CHANNEL); } catch { return () => {}; }
  channel.onmessage = ({ data }) => {
    try {
      const token = sessionStorage.getItem(OPERATOR_INVITATION_KEY);
      if (data?.kind === 'terminal' && validToken(data.token) && token === data.token) {
        sessionStorage.removeItem(OPERATOR_INVITATION_KEY);
        return;
      }
      if (data?.kind !== 'request' || typeof data.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(data.requestId)) return;
      if (validToken(token)) channel.postMessage({ kind: 'response', requestId: data.requestId, token });
    } catch { /* Storage/channel unavailable: do not offer a continuation. */ }
  };
  return () => channel.close();
}
/** Called after successful email verification. Ambiguous invitations are never guessed. */
export async function recoverOperatorInvitationContinuation(): Promise<boolean> {
  if (operatorInvitationReturnPath() === '/operator-invite') return true;
  if (typeof BroadcastChannel === 'undefined') return false;
  let channel: BroadcastChannel;
  let requestId: string;
  try { requestId = crypto.randomUUID(); channel = new BroadcastChannel(CHANNEL); }
  catch { return false; }
  const tokens = new Set<string>();
  return new Promise((resolve) => {
    channel.onmessage = ({ data }) => {
      if (data?.kind === 'response' && data.requestId === requestId && validToken(data.token)) tokens.add(data.token);
    };
    const timer = setTimeout(() => {
      channel.close();
      if (tokens.size !== 1) { resolve(false); return; }
      try { sessionStorage.setItem(OPERATOR_INVITATION_KEY, [...tokens][0]); resolve(true); }
      catch { resolve(false); }
    }, 350);
    try { channel.postMessage({ kind: 'request', requestId }); }
    catch { clearTimeout(timer); channel.close(); resolve(false); }
  });
}
export function clearOperatorInvitation(token: string): void {
  try {
    if (sessionStorage.getItem(OPERATOR_INVITATION_KEY) === token) sessionStorage.removeItem(OPERATOR_INVITATION_KEY);
  } catch { /* Storage unavailable. */ }
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ kind: 'terminal', token });
    channel.close();
  } catch { /* Optional cross-tab cleanup must not change acceptance or verification success. */ }
}
