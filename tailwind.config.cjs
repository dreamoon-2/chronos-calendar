/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f3f1ff',
          100: '#e6e2ff',
          200: '#cfc7ff',
          300: '#ab9cfb',
          400: '#8a74f4',
          500: '#6a52ec',
          600: '#5b4be3',
          700: '#4b3cc0',
          800: '#3d319c',
          900: '#32287c',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
