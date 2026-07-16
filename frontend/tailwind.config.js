/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0B0F19', // Dark Navy
          card: '#161C2A', // Navy Card
          light: '#F8FAFC', // Soft Light Background
          gray: '#E2E8F0', // Slate Gray
          emerald: '#10B981', // Emerald Primary
          'emerald-dark': '#059669', // Emerald Hover
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
