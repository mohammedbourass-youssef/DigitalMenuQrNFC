/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
        accent: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Nunito', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        arabic: ['Cairo', 'Nunito', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        sheet: '1.75rem',
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(0, 0, 0, 0.06)',
        'soft-lg': '0 12px 32px -8px rgba(0, 0, 0, 0.18)',
        panel: '0 -8px 32px rgba(0, 0, 0, 0.16)',
      },
    },
  },
  plugins: [],
};