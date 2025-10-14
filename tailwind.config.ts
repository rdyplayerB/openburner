import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#E4572E',
          'orange-light': '#FF8C61',
          'orange-dark': '#C94A26',
        },
        text: {
          primary: '#1E1E1E',
        },
        bg: {
          base: '#FAFAFA',
        },
        amber: {
          warning: '#E1A31E',
        },
      },
      boxShadow: {
        'glow-orange': '0 0 20px rgba(228, 87, 46, 0.3)',
        'glow-orange-lg': '0 0 30px rgba(228, 87, 46, 0.4)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'card-lg': '0 4px 12px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};
export default config;

