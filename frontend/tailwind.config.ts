import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        foreground: "#f4f4f5",
        card: {
          DEFAULT: "#18181b",
          foreground: "#f4f4f5",
        },
        popover: {
          DEFAULT: "#18181b",
          foreground: "#f4f4f5",
        },
        primary: {
          DEFAULT: "#10b981", // Emerald accent
          foreground: "#09090b",
        },
        secondary: {
          DEFAULT: "#27272a",
          foreground: "#f4f4f5",
        },
        muted: {
          DEFAULT: "#27272a",
          foreground: "#a1a1aa",
        },
        accent: {
          DEFAULT: "#27272a",
          foreground: "#f4f4f5",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#f4f4f5",
        },
        border: "#27272a",
        input: "#27272a",
        ring: "#10b981",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
