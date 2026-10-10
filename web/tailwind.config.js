/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['"Schibsted Grotesk"', "system-ui", "sans-serif"] },
      colors: {
        ink: "#12212b",
        muted: "#5f6f7a",
        line: "#dde3e8",
        wash: "#f1f6f6",
        accent: "#0f766e",
      },
    },
  },
  plugins: [],
};