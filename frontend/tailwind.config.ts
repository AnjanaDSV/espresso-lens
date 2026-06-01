import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#0B0E14",
          card: "#121620",
          hover: "#1A202E",
        },
        coffee: {
          light: "#A98467",
          DEFAULT: "#7F5539",
          dark: "#5C3D2E",
          deep: "#2B1B17",
        },
        brass: {
          light: "#E9D8A6",
          DEFAULT: "#D4AF37",
          dark: "#9B7220",
        },
        titanium: {
          light: "#E2E8F0",
          DEFAULT: "#94A3B8",
          dark: "#475569",
        },
        accent: {
          red: "#EF4444",
          green: "#10B981",
          amber: "#F59E0B",
        }
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(212, 175, 55, 0.15)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      backdropBlur: {
        xs: "2px",
      }
    },
  },
  plugins: [],
};

export default config;
