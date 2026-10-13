/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#F0F9F4',
          100: '#DCF2E4',
          200: '#B8E5CA',
          300: '#86D1A6',
          400: '#52B87F',
          500: '#2E9B5F',
          600: '#207C4A',
          700: '#1A633C',
          800: '#144D34', // Hero forest green
          900: '#0E3624',
          950: '#061D13',
          dark: '#082317',
          accent: '#34d399',
        },
        surface: {
          canvas: '#ECEEEB',
          card: '#ffffff',
          sidebar: '#F7F9F8',
          border: '#E8ECE9',
          muted: '#7A8B81',
          text: '#11241A',
        }
      },
    },
  },
  plugins: [],
}
