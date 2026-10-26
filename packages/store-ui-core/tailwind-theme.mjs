/** Shared design tokens for the store and pharmacy business applications. */
export default {
  extend: {
    colors: {
      primary: {
        50: "#eff6ff",
        100: "#dbeafe",
        200: "#bfdbfe",
        300: "#93c5fd",
        400: "#60a5fa",
        500: "#3b82f6",
        600: "#2563eb",
        700: "#1d4ed8",
        800: "#1e40af",
        900: "#1e3a8a",
        DEFAULT: "var(--color-primary)",
        light: "var(--color-primary-light)",
        dark: "var(--color-primary-dark)",
        darker: "var(--color-primary-darker)",
      },
      text: {
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        tertiary: "var(--color-text-tertiary)",
        disabled: "var(--color-text-disabled)",
        inverse: "var(--color-text-inverse)",
      },
      bg: {
        primary: "var(--color-bg-primary)",
        secondary: "var(--color-bg-secondary)",
        tertiary: "var(--color-bg-tertiary)",
        hover: "var(--color-bg-hover)",
        active: "var(--color-bg-active)",
      },
      border: {
        DEFAULT: "var(--color-border-default)",
        strong: "var(--color-border-strong)",
        focus: "var(--color-border-focus)",
      },
      icon: {
        DEFAULT: "var(--color-icon-default)",
        secondary: "var(--color-icon-secondary)",
        hover: "var(--color-icon-hover)",
        active: "var(--color-icon-active)",
        success: "var(--color-icon-success)",
        warning: "var(--color-icon-warning)",
        error: "var(--color-icon-error)",
      },
      btn: {
        "primary-bg": "var(--color-btn-primary-bg)",
        "primary-text": "var(--color-btn-primary-text)",
        "primary-hover": "var(--color-btn-primary-hover)",
        "secondary-bg": "var(--color-btn-secondary-bg)",
        "secondary-text": "var(--color-btn-secondary-text)",
        "secondary-border": "var(--color-btn-secondary-border)",
        "secondary-hover": "var(--color-btn-secondary-hover)",
        "ghost-bg": "var(--color-btn-ghost-bg)",
        "ghost-text": "var(--color-btn-ghost-text)",
        "ghost-hover": "var(--color-btn-ghost-hover)",
      },
      card: {
        bg: "var(--color-card-bg)",
        border: "var(--color-card-border)",
        "hover-border": "var(--color-card-hover-border)",
      },
      success: "var(--color-success)",
      warning: "var(--color-warning)",
      error: "var(--color-error)",
      info: "var(--color-info)",
    },
    spacing: {
      "dt-1": "var(--space-1)",
      "dt-2": "var(--space-2)",
      "dt-3": "var(--space-3)",
      "dt-4": "var(--space-4)",
      "dt-5": "var(--space-5)",
      "dt-6": "var(--space-6)",
      "dt-7": "var(--space-7)",
    },
    borderRadius: {
      "dt-sm": "var(--radius-sm)",
      "dt-md": "var(--radius-md)",
      "dt-lg": "var(--radius-lg)",
      "dt-xl": "var(--radius-xl)",
      "dt-full": "var(--radius-full)",
    },
    boxShadow: {
      "dt-sm": "var(--shadow-sm)",
      "dt-md": "var(--shadow-md)",
      "dt-lg": "var(--shadow-lg)",
    },
    transitionDuration: {
      "dt-fast": "150ms",
      "dt-normal": "200ms",
      "dt-slow": "300ms",
    },
    fontFamily: {
      sans: [
        "Pretendard Variable",
        "Pretendard",
        "-apple-system",
        "BlinkMacSystemFont",
        "Segoe UI",
        "Roboto",
        "sans-serif",
      ],
    },
    animation: {
      "fade-in": "fadeIn 0.5s ease-out",
      "slide-up": "slideUp 0.5s ease-out",
      "slide-in-right": "slideInRight 0.3s ease-out",
      marquee: "marquee 30s linear infinite",
    },
    keyframes: {
      fadeIn: {
        "0%": {
          opacity: "0",
        },
        "100%": {
          opacity: "1",
        },
      },
      slideUp: {
        "0%": {
          opacity: "0",
          transform: "translateY(20px)",
        },
        "100%": {
          opacity: "1",
          transform: "translateY(0)",
        },
      },
      slideInRight: {
        "0%": {
          opacity: "0",
          transform: "translateX(20px)",
        },
        "100%": {
          opacity: "1",
          transform: "translateX(0)",
        },
      },
      marquee: {
        "0%": {
          transform: "translateX(0)",
        },
        "100%": {
          transform: "translateX(-50%)",
        },
      },
    },
  },
};
