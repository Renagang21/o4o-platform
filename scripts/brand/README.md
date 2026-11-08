# Neture service marks

All service icons share one mark: the Neture **R + leaf** (`scripts/brand/source/neture-r-mark.svg`,
a vector trace of the approved logo). Sub-domain services add a coloured badge with their own glyph
at the bottom-right; the badge colour is what tells browser tabs apart at 16px.
The representative `neture.co.kr/` home and the `neture` profile use the R mark without a badge.

Run from the repository root with SETUP's pinned Node/pnpm and installed dependencies:

```sh
node scripts/brand/generate-service-icons.mjs
node --test scripts/brand/__tests__/service-icons.test.mjs
```

The generator writes each application's `public/brand/<key>/` assets and the representative home's
`services/web-neture/public/favicon.svg` / `favicon.png`. Edit the generator (or the source mark),
regenerate, and commit the resulting vectors and rasters together. The test checks the committed files
match the generator output.
No new dependencies or font downloads are required. Favicons are vector paths, not font text.
Horizontal logo labels remain SVG text with a Korean system-font fallback; use the mark plus the existing UI service name in application headers.
`packages/auth-react/src/assets/o4o-logo.svg` (login presentation) is not touched by this generator.

Outputs: SVG mark/horizontal logo/favicon, ICO (16/32/48 PNG entries), 16/32/48/192/512 PNG,
180px Apple touch icon, safe-zone maskable 512px PNG and a service-specific manifest (`theme_color` = badge colour).
At 16px the R moves up-left and the badge grows; the hospital glyph becomes H. SVG uses its viewport media query,
and the 16px PNG/ICO entry is rendered explicitly with the compact geometry.

Service keys, glyphs and badge colours:

| key | glyph | colour | key | glyph | colour |
|---|---|---|---|---|---|
| neture | — (no badge) | `#16462c` | carepharm | heart | `#c026d3` |
| admin | shield | `#1e293b` | pharmacy-coop | people | `#7c3aed` |
| account | person | `#6b7280` | kpa-branch | branches | `#92400e` |
| store | shop | `#0284c7` | lecture | play | `#2563eb` |
| supplier | box | `#ea580c` | partner | links | `#a16207` |
| pharmacy | cross | `#dc2626` | community | speech | `#0891b2` |
| hospital-pharmacy | hospital | `#0d9488` | funding | bars | `#059669` |
| drugstore | mortar | `#65a30d` | | | |

Colours that open side by side on one host (Neture: supplier/funding/community/CarePharm;
pharmacy app: pharmacy/CarePharm/Drugstore) are kept in clearly different hues.
These are visual identifiers, never authorization/service-membership keys.
Custom branch/store logos remain under their existing owners' control.

Neture's representative home shows the badge-free R after SPA navigation; service pages and independent hosts
use their derivatives. Pharmacy profiles select both the favicon and manifest from existing business configuration.
KPA's `/kpa/` asset base remains supported.
