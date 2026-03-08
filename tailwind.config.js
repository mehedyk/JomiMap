/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        bengali: ['"Noto Serif Bengali"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Light theme
        parchment: {
          50:  '#fdfaf3',
          100: '#f7f0dc',
          200: '#ede0bb',
          300: '#dfc993',
          400: '#cead68',
          500: '#b8913f',
        },
        ink: {
          900: '#1a1410',
          800: '#2d2318',
          700: '#3f3222',
          600: '#5c4a30',
          500: '#7a6442',
        },
        moss: {
          500: '#4a7c59',
          600: '#3a6347',
          700: '#2d4f38',
        },
        rust: {
          500: '#c0522a',
          600: '#a3401f',
        },
        // Sepia theme accent
        sepia: {
          100: '#f4ede4',
          200: '#e8d5c0',
          500: '#8b6347',
          800: '#3d2b1f',
        },
      },
      backgroundImage: {
        'topo-pattern': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ccircle cx='50' cy='50' r='40' fill='none' stroke='%23b8913f' stroke-width='0.3' opacity='0.3'/%3E%3Ccircle cx='50' cy='50' r='30' fill='none' stroke='%23b8913f' stroke-width='0.3' opacity='0.3'/%3E%3Ccircle cx='50' cy='50' r='20' fill='none' stroke='%23b8913f' stroke-width='0.3' opacity='0.3'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
