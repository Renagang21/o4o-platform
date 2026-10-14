import type { SocialGrant, SocialProof } from './types.js';
type Kind = 'kakao-login' | 'link-reauth' | 'link-proof';
const KEY = 'o4o-social-pending';
/** Only one pending flow per tab; no passwords, provider or O4O session tokens are persisted. */
export function redirectToKakao(grant: SocialGrant, kind: Kind): void {
  const url = new URL(grant.authorizationUrl ?? '');
  if (url.origin !== 'https://kauth.kakao.com' || url.pathname !== '/oauth/authorize' || url.searchParams.get('state') !== grant.token) throw new Error('인증 주소가 올바르지 않습니다.');
  window.sessionStorage.setItem(KEY, JSON.stringify({ token: grant.token, kind, at: Date.now() }));
  window.location.assign(url.href);
}
/** Consume and remove credentials before any asynchronous work or navigation. */
export function takeSocialCallback(expected: Kind[]): (SocialProof & { kind: Kind; cancelled: boolean }) | null {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const kind = hash.get('social_kind') as Kind;
  if (!expected.includes(kind)) return null;
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  const raw = window.sessionStorage.getItem(KEY); window.sessionStorage.removeItem(KEY);
  let pending: { token?: string; kind?: string; at?: number };
  try { pending = JSON.parse(raw ?? '{}'); } catch { throw new Error('인증을 다시 시작해 주세요.'); }
  if (pending.token !== hash.get('token') || pending.kind !== kind || typeof pending.at !== 'number' || Date.now() - pending.at > 300000 || pending.at > Date.now()) throw new Error('인증이 만료되었거나 이 화면에서 시작한 요청이 아닙니다.');
  return { token: pending.token!, code: hash.get('code') ?? undefined, kind, cancelled: hash.has('error') };
}
