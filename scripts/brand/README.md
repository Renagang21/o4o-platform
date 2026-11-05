# O4O service marks

The representative `neture.co.kr/` keeps its original green **N** favicon by explicit user choice.
The shared O4O outline in `packages/auth-react/src/assets/o4o-logo.svg` is also preserved.
Derived service marks share its original blue palette; only the white badge glyph changes.

Run from the repository root with SETUP's pinned Node/pnpm and installed dependencies:

```sh
node scripts/brand/generate-service-icons.mjs
node --test scripts/brand/__tests__/service-icons.test.mjs
```

The generator writes each application's `public/brand/<key>/` assets. It does not overwrite master/legacy files.
Edit the generator, regenerate, and commit the resulting vectors and rasters together.
No new dependencies or font downloads are required. Favicon wordmarks are vector outlines, not font text.
Horizontal logo labels remain SVG text with a Korean system-font fallback; use the mark plus the existing UI service name in application headers.

Outputs: SVG mark/horizontal logo/favicon, ICO (16/32/48 PNG entries), 16/32/48/192/512 PNG,
180px Apple touch icon, safe-zone maskable 512px PNG and a service-specific manifest.
At 16px the badge is enlarged and the hospital glyph becomes H; SVG uses its viewport media query,
and the 16px PNG/ICO entry is rendered explicitly with the compact geometry.
Use new `/brand/<key>/` URLs instead of relying on a cached legacy `/favicon.ico`.

Service keys and glyphs: admin/shield, neture/leaf, pharmacy/cross, hospital-pharmacy/hospital,
lecture/play, partner/links, store/shop, account/person, kpa-branch/branches,
supplier/box, funding/bars, community/speech, carepharm/heart, drugstore/mortar,
pharmacy-coop/people. These are visual identifiers, never authorization/service-membership keys.
Custom branch/store logos remain under their existing owners' control.

Neture's representative home restores the N mark after SPA navigation; service pages and independent hosts
use their derivatives. Pharmacy profiles select both the favicon and manifest from existing business configuration.
KPA's `/kpa/` asset base remains supported.
