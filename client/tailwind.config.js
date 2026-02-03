/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C3AED', // Violet-600
          hover: '#5B21B6', // Violet-700
          light: '#A78BFA', // Violet-400
          tint: '#EDE9FE', // Violet-100
          subtle: '#F5F3FF', // Violet-50
        },
        violet: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          400: '#A78BFA',
          600: '#7C3AED',
          700: '#5B21B6',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        success: '#10B981', // Green-500
        error: '#EF4444', // Red-500
        warning: '#F59E0B', // Amber-500
        info: '#3B82F6', // Blue-500
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
