module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/operator-core-ui/src/**/*.{ts,tsx}",
    "../../packages/operator-ux-core/src/**/*.{ts,tsx}",
    "../../packages/shared-space-ui/src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          600: "#176b58",
          700: "#145b4b",
        },
      },
    },
  },
  plugins: [],
};
