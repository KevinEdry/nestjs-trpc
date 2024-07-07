const {nextui} = require("@nextui-org/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,md,mdx}",
    "../node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,md,mdx}",
  ],
  theme: {
    colors: {
      primary: "#398CCB",
    },
    extend: {},
  },
  darkMode: "class",
  plugins: [nextui({
    themes: {
      dark: {
        colors: {
          primary: "#398CCB"
        }
      }
    }
  })],
}