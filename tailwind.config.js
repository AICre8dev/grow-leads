/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      colors: {
        grow: {
          bg: 'rgb(var(--grow-bg) / <alpha-value>)',
          surface: 'rgb(var(--grow-surface) / <alpha-value>)',
          card: 'rgb(var(--grow-card) / <alpha-value>)',
          border: 'rgb(var(--grow-border) / <alpha-value>)',
          'border-hover': 'rgb(var(--grow-border-hover) / <alpha-value>)',
          accent: 'rgb(var(--grow-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--grow-accent-hover) / <alpha-value>)',
          text: 'rgb(var(--grow-text) / <alpha-value>)',
          'text-secondary': 'rgb(var(--grow-text-secondary) / <alpha-value>)',
          'text-muted': 'rgb(var(--grow-text-muted) / <alpha-value>)',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
        }
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'progress-fill': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-out-right': {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(100%)' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
        'progress-fill': 'progress-fill 1s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'slide-out-right': 'slide-out-right 0.3s ease-in forwards',
        'modal-in': 'modal-in 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
}
