module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/operator-core-ui/src/modules/pharmacy-management/**/*.{ts,tsx}",
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
