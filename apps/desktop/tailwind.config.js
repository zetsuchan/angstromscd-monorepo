/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'liquid-glass': {
          light: 'rgba(255, 255, 255, 0.05)',
          DEFAULT: 'rgba(255, 255, 255, 0.1)',
          dark: 'rgba(255, 255, 255, 0.15)',
        }
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'liquid-morph': 'liquid-morph 0.3s ease-in-out',
        'glass-shimmer': 'glass-shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        'liquid-morph': {
          '0%': { transform: 'scale(1)', borderRadius: '0.5rem' },
          '50%': { transform: 'scale(0.98)', borderRadius: '1rem' },
          '100%': { transform: 'scale(1)', borderRadius: '0.5rem' },
        },
        'glass-shimmer': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
    },
  },
  plugins: [],
}