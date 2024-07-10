/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,md,mdx}",
    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,md,mdx}",
  ],
  theme: {
    colors: {
      primary: "#398CCB",
      subtext: "#8BA1B2",
      white: "#FFF",
      black: "#000",
      gray: "#D9D9D9",
      "background-black": "#070707",
      "border-gray": "#788188",
      "border-primary": "#75ABD4"
    },
    extend: {},
  },
  darkMode: "class",
  plugins: [],
}