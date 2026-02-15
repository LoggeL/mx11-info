import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#242a64",
          darker: "#272a63",
        },
      },
    },
  },
  plugins: [],
};

export default config;
