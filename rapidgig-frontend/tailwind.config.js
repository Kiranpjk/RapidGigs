/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1C1F4A',
          50: '#f0f0f9',
          100: '#e0e1f3',
          200: '#c1c3e7',
          300: '#a2a5db',
          400: '#8387cf',
          500: '#6469c3',
          600: '#454ab7',
          700: '#363aab',
          800: '#2a2d8f',
          900: '#1C1F4A',
        },
        accent: {
          DEFAULT: '#F5C542',
          50: '#fefcf0',
          100: '#fdf9e1',
          200: '#fbf3c3',
          300: '#f9eda5',
          400: '#f7e787',
          500: '#F5C542',
          600: '#f3bf24',
          700: '#d1a520',
          800: '#af8b1c',
          900: '#8d7118',
        },
        secondary: '#2E2E52',
        text: '#FFFFFF',
        border: '#374151',
      },
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}