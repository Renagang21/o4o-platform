import { PHARMACY_BRAND_KEY } from './brand';

/** Cosmetic identity only; this never changes service keys, sessions or authorization. */
export function applyServiceBrandIdentity() {
  const key = PHARMACY_BRAND_KEY;
  for (const [id, file] of [['o4o-service-icon', 'favicon.svg'], ['o4o-service-ico', 'favicon.ico'], ['o4o-service-touch', 'apple-touch-icon.png']]) {
    const link = document.getElementById(id) as HTMLLinkElement | null;
    if (link) link.href = `${import.meta.env.BASE_URL}brand/${key}/${file}`;
  }
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifest) manifest.href = `${import.meta.env.BASE_URL}brand/${key}/manifest.webmanifest`;
}
