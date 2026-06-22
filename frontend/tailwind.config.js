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
        fox: {
          purple: '#1c0e36',
          'purple-light': '#2d1b4e',
          'purple-dark': '#130827',
          gold: '#F9E4A6',
          'gold-light': '#FFF3D6',
          'gold-dark': '#E8CF8A',
          white: '#FFFFFF',
          dark: '#2D2D3A',
          light: '#F5F3FA',
          background: '#F5F3FA',
          border: '#E8E4F0',
          gray: '#6B6B7B',
          graphite: '#2D2D3A',
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'h1': ['42px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['32px', { lineHeight: '1.25', fontWeight: '700' }],
        'h3': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      borderRadius: {
        'card': '16px',
        'button': '14px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'pill': '9999px',
      },
      boxShadow: {
        'fox': '0 4px 20px rgba(28, 14, 54, 0.10)',
        'fox-md': '0 8px 30px rgba(28, 14, 54, 0.12)',
        'fox-lg': '0 12px 40px rgba(28, 14, 54, 0.14)',
        'card': '0 1px 3px rgba(28, 14, 54, 0.06), 0 4px 16px rgba(28, 14, 54, 0.06)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-in': 'slide-in 200ms ease-out',
      },
    },
  },
  plugins: [],
}
