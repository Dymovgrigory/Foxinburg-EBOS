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
          purple: '#3A2953',
          'purple-light': '#4d3869',
          'purple-dark': '#251636',
          'purple-darker': '#1a1026',
          gold: '#F5ED75',
          'gold-light': '#FFF5A0',
          'gold-dark': '#E5D94E',
          white: '#FFFFFF',
          dark: '#2A2A2A',
          light: '#F8F7FA',
          background: '#F8F7FA',
          border: '#E8E4F0',
          gray: '#6B6B7B',
          graphite: '#2A2A2A',
          success: '#22C55E',
          'success-rgb': '34, 197, 94',
          warning: '#F59E0B',
          'warning-rgb': '245, 158, 11',
          error: '#EF4444',
          'error-rgb': '239, 68, 68',
          info: '#3B82F6',
          'info-rgb': '59, 130, 246',
          sidebar: {
            bg: 'var(--fox-sidebar-bg)',
            text: 'var(--fox-sidebar-text)',
            muted: 'var(--fox-sidebar-muted)',
            border: 'var(--fox-sidebar-border)',
            active: {
              bg: 'var(--fox-sidebar-active-bg)',
              text: 'var(--fox-sidebar-active-text)',
            },
            hover: {
              bg: 'var(--fox-sidebar-hover-bg)',
            },
          }
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'Montserrat', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Montserrat', 'DM Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'h1': ['42px', { lineHeight: '1.15', fontWeight: '700' }],
        'h2': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'h3': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.55', fontWeight: '400' }],
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
        'fox': '0 4px 20px rgba(58, 41, 83, 0.08)',
        'fox-md': '0 8px 30px rgba(58, 41, 83, 0.10)',
        'fox-lg': '0 12px 40px rgba(58, 41, 83, 0.12)',
        'card': '0 1px 3px rgba(58, 41, 83, 0.05), 0 4px 16px rgba(58, 41, 83, 0.05)',
        'glow-gold': '0 0 40px rgba(249, 228, 166, 0.25)',
        'glow-purple': '0 0 60px rgba(58, 41, 83, 0.20)',
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
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-in': 'slide-in 200ms ease-out',
        'float': 'float 5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
