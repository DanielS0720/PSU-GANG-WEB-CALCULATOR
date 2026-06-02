import type { Config } from "tailwindcss";

// Tailwind v4 is CSS-first: tokens live in src/app/globals.css under @theme.
// This file only declares content sources for class scanning.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
};

export default config;
