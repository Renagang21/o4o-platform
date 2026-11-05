import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CURRENT_HOST_PROFILE, type HostProfile } from '../lib/hostProfile';

export function resolveServiceBrand(profile: HostProfile, pathname: string) {
  if (profile !== 'main') return profile;
  return pathname === '/' ? 'main' : 'neture';
}

/** Presentation only: keep the representative O4O home mark and distinguish service tabs. */
export function ServiceBrandIdentity() {
  const { pathname } = useLocation();
  useEffect(() => {
    const key = resolveServiceBrand(CURRENT_HOST_PROFILE, pathname);
    const icon = document.querySelector<HTMLLinkElement>('#o4o-service-icon');
    if (icon) icon.href = key === 'main' ? '/favicon.svg' : `/brand/${key}/favicon.svg`;
    for (const [id, rel, file] of [['o4o-service-ico', 'icon', 'favicon.ico'], ['o4o-service-touch', 'apple-touch-icon', 'apple-touch-icon.png']]) {
      document.getElementById(id)?.remove();
      if (key === 'main') continue;
      const link = document.createElement('link');
      link.id = id; link.rel = rel; link.href = `/brand/${key}/${file}`;
      if (rel === 'icon') { link.type = 'image/x-icon'; link.setAttribute('sizes', '16x16 32x32 48x48'); }
      document.head.append(link);
    }
  }, [pathname]);
  return null;
}
