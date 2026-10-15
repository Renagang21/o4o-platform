/** Tokens remain tab-local and never enter login/signup URLs. */
export const OPERATOR_INVITATION_KEY = 'o4o_operator_invite';
let volatileToken = '';
let memoryOnly = false;
const validToken = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function readOperatorInvitation(): string {
  if (memoryOnly) return volatileToken;
  try {
    const stored = sessionStorage.getItem(OPERATOR_INVITATION_KEY);
    return validToken(stored) ? stored : '';
  } catch { memoryOnly = true; return volatileToken; }
}
export function rememberOperatorInvitation(token: string): void {
  if (!validToken(token)) return;
  volatileToken = token;
  try { sessionStorage.setItem(OPERATOR_INVITATION_KEY, token); memoryOnly = false; } catch { memoryOnly = true; }
}
export function clearOperatorInvitationEntry(): void {
  volatileToken = '';
  try { sessionStorage.removeItem(OPERATOR_INVITATION_KEY); memoryOnly = false; } catch { memoryOnly = true; }
}
export function operatorInvitationReturnPath(): '/' | '/operator-invite' {
  return validToken(readOperatorInvitation()) ? '/operator-invite' : '/';
}

const CHANNEL = 'o4o:operator-invitation-continuation:v1';
/** Same-origin ephemeral transport; no token in URLs, cookies or persistent storage. */
export function serveOperatorInvitationContinuation(): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  let channel: BroadcastChannel;
  try { channel = new BroadcastChannel(CHANNEL); } catch { return () => {}; }
  channel.onmessage = ({ data }) => {
    try {
      const token = readOperatorInvitation();
      if (data?.kind === 'terminal' && validToken(data.token) && token === data.token) {
        clearOperatorInvitationEntry();
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
      rememberOperatorInvitation([...tokens][0]); resolve(true);
    }, 350);
    try { channel.postMessage({ kind: 'request', requestId }); }
    catch { clearTimeout(timer); channel.close(); resolve(false); }
  });
}
export function clearOperatorInvitation(token: string): void {
  if (readOperatorInvitation() === token) clearOperatorInvitationEntry();
  else if (volatileToken === token) volatileToken = '';
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ kind: 'terminal', token });
    channel.close();
  } catch { /* Optional cross-tab cleanup must not change acceptance or verification success. */ }
}
