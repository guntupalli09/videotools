/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /* Spacing rhythm: 4, 8, 12, 16, 24, 32, 48px only (Tailwind: 1=4px, 2=8px, 3=12px, 4=16px, 6=24px, 8=32px, 12=48px) */
      spacing: {
        'section': '32px',
        'section-lg': '48px',
        'component': '24px',
        'component-sm': '16px',
        'micro': '8px',
      },
      colors: {
        /* Studio Pro: one indigo accent; blue scale remapped so existing blue-* classes inherit indigo */
        primary: {
          DEFAULT: '#6366F1',
          hover: '#4F46E5',
          light: '#818CF8',
          tint: '#E0E7FF',
          subtle: '#EEF2FF',
        },
        blue: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#6366F1',
          700: '#4F46E5',
          800: '#4338CA',
          900: '#312E81',
          950: '#1E1B4B',
        },
        gray: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E4E4E7',
          300: '#D4D4D8',
          400: '#A1A1AA',
          500: '#71717A',
          600: '#52525B',
          700: '#3F3F46',
          800: '#27272A',
          900: '#18181B',
          950: '#0A0A0B',
        },
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#6366F1',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'card-elevated': '0 4px 12px -2px rgb(0 0 0 / 0.06), 0 2px 6px -2px rgb(0 0 0 / 0.04)',
        'nav': '0 1px 3px 0 rgb(0 0 0 / 0.04)',
        'input': '0 0 0 3px rgb(99 102 241 / 0.15)',
        'accent': '0 8px 24px rgb(99 102 241 / 0.28)',
        'accent-hover': '0 12px 32px rgb(99 102 241 / 0.38)',
      },
      transitionDuration: {
        '200': '200ms',
        '250': '250ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionProperty: {
        'motion': 'transform, opacity, box-shadow',
      },
    },
  },
  plugins: [],
}
