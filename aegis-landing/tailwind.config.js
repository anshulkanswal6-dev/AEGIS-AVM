/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        aegis: {
          primary: '#aef98e',
          secondary: '#9ee07e',
        }
      }
    },
  },
  plugins: [],
}
