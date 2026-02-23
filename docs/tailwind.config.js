/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,md,mdx}",
  ],
  theme: {
    colors: {
      primary: "#398CCB",
      subtext: "#8BA1B2",
      white: "#FFF",
      black: "#000",
      gray: "#D9D9D9",
      transparent: "transparent",
      "background-black": "#070707",
      "border-gray": "#788188",
      "border-primary": "#75ABD4",
      "card-bg": "#0D0D0D",
      "card-bg-hover": "#111111",
      "card-bg-active": "#0F1215",
      "card-border": "#1A1A1A",
      "surface": "#181818",
      "surface-hover": "#1E1E1E",
      "border-hover": "#262626",
      "gradient-start": "#398CCB",
      "gradient-end": "#7EC7FF",
      success: "#4ADE80",
      muted: "#525252",
    },
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        md: "2rem",
      },
      screens: {
        "2xl": "80rem",
      },
    },
    extend: {},
  },
  darkMode: "class",
  plugins: [],
}