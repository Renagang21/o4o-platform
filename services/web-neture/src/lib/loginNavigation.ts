/** One owner for the coordination between explicit login navigation and the default redirect. */
const EXPLICIT_NAV_KEY = 'neture_login_explicit_nav';
export function claimLoginNavigation(): void {
  sessionStorage.setItem(EXPLICIT_NAV_KEY, '1');
}
export function cancelLoginNavigation(): void {
  sessionStorage.removeItem(EXPLICIT_NAV_KEY);
}
export function consumeLoginNavigation(): boolean {
  if (!sessionStorage.getItem(EXPLICIT_NAV_KEY)) return false;
  cancelLoginNavigation();
  return true;
}
