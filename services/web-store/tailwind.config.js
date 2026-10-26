import theme from "../../packages/store-ui-core/tailwind-theme.mjs";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "../../packages/operator-core-ui/src/**/*.{ts,tsx}",
    "../../packages/operator-ux-core/src/**/*.{ts,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/operator-ux-core/src/**/*.{ts,tsx}",
    "../../packages/store-ui-core/src/**/*.{ts,tsx}",
    "../../packages/store-products-ui/src/**/*.{ts,tsx}",
    "../../packages/store-asset-policy-core/src/**/*.{ts,tsx}",
    "../../packages/tablet-screen-set-editor/src/**/*.{ts,tsx}",
    "../../packages/tablet-kiosk-core/src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/account-ui/src/**/*.{ts,tsx}",
    "../../packages/shared-space-ui/src/**/*.{ts,tsx}",
  ],
  theme,
  plugins: [],
};
