/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBase: '#0a0a0f',
        primaryPuple: '#8b5cf6',
        primaryBlue: '#3b82f6',
        borderGlow: 'rgba(139, 92, 246, 0.4)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
