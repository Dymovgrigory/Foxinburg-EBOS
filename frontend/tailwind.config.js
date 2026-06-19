/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fox: {
          purple: '#3A2953',
          'purple-light': '#4A3568',
          'purple-dark': '#2A1E3D',
          gold: '#F5ED75',
          'gold-light': '#FFF5A0',
          'gold-dark': '#E5DD65',
          white: '#FFFFFF',
          dark: '#2A2A2A',
          light: '#FAF8FD',
          border: '#E8E0F0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
      },
      boxShadow: {
        'fox': '0 4px 20px rgba(58, 41, 83, 0.15)',
        'fox-lg': '0 8px 30px rgba(58, 41, 83, 0.2)',
      }
    },
  },
  plugins: [],
}
