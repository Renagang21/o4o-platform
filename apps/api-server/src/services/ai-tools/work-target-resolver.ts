/**
 * Work Target Resolution — 문장 → 등재 대상(browser_site | windows_app) (WO-O4O-WORK-TARGET-DISCOVERY-AND-ACTIVATION-V0 §4~§7)
 *
 *   "약학정보원에서 찾아줘"        → { targetType: 'browser_site', targetId: 'healthkr' }
 *   "메모장에 적어줘"              → { targetType: 'windows_app',  targetId: 'windows.notepad' }
 *
 * 별칭은 각 등재부(browser site 축 · pharmacy web 등재부 · windows app 등재부)의 것을 **재사용**한다(§7) — 여기 새 별칭 표를
 * 두지 않는다. 사이트와 앱이 동시에 걸리거나 둘 다 안 걸리면 **고르지 않는다**(§6 임의 확정 금지). URL · 실행 경로가
 * targetId 가 되는 경로는 없다 — 등재 id 만 결과가 된다.
 */

import { detectRegisteredApp, detectRegisteredSite } from './ai-tool-router.js';
import { resolvePharmacyWebSite } from '../local-agent/pharmacy-web-core.js';
import { isRegisteredBrowserSite, browserSiteDisplayName } from '../local-agent/browser-site-registry.js';
import { isRegisteredWindowsApp, windowsAppDisplayName, WINDOWS_APP_REGISTRY } from '../local-agent/windows-app-registry.js';

export type WorkTargetType = 'browser_site' | 'windows_app';

export interface WorkTargetRef {
  targetType: WorkTargetType;
  targetId: string;
  displayName: string;
}

/** 등재 windows app 별칭 대조(공백 제거). 여러 앱이 걸리면 null. `detectRegisteredApp` 의 의도 키워드와 등재부 별칭을 합쳐 본다. */
function detectAppByAlias(message: string): string | null {
  const compact = message.replace(/\s+/g, '').toLowerCase();
  const hits = WINDOWS_APP_REGISTRY.filter((a) => a.aliases.some((alias) => compact.includes(alias.replace(/\s+/g, '').toLowerCase()))).map((a) => a.appId);
  const unique = [...new Set(hits)];
  return unique.length === 1 ? unique[0] : null;
}

/**
 * targetHint(등재 id)가 있으면 그것, 없으면 문장에서. 사이트 1 + 앱 0 → 사이트, 사이트 0 + 앱 1 → 앱, 그 밖은 null.
 */
export function resolveWorkTarget(request: string, targetHint?: string): WorkTargetRef | null {
  if (typeof targetHint === 'string' && targetHint.length > 0) {
    if (isRegisteredBrowserSite(targetHint)) return { targetType: 'browser_site', targetId: targetHint, displayName: browserSiteDisplayName(targetHint) };
    if (isRegisteredWindowsApp(targetHint)) return { targetType: 'windows_app', targetId: targetHint, displayName: windowsAppDisplayName(targetHint) };
    return null;
  }
  const text = String(request ?? '');
  const siteId = detectRegisteredSite(text) ?? resolvePharmacyWebSite(text);
  const appId = detectRegisteredApp(text) ?? detectAppByAlias(text);
  if (siteId && appId) return null;
  if (siteId) return { targetType: 'browser_site', targetId: siteId, displayName: browserSiteDisplayName(siteId) };
  if (appId) return { targetType: 'windows_app', targetId: appId, displayName: windowsAppDisplayName(appId) };
  return null;
}
