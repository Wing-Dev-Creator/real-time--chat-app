/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f1c2c",
        ocean: "#19475f",
        mint: "#6dd2ad",
        sand: "#f7f5e9"
      },
      boxShadow: {
        panel: "0 25px 60px -20px rgba(16, 26, 34, 0.35)"
      }
    }
  },
  plugins: []
};
