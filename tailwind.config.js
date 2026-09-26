/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        padel: {
          dark: '#0B0F19',
          card: '#131B2E',
          border: '#1E293B',
          lime: '#CCFF00', // Padel Neon Lime
          'lime-dark': '#A3CC00',
          blue: '#00D2FF',
          accent: '#00E599',
          danger: '#FF3366',
          warning: '#FFAA00'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
