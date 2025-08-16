/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 토스 브랜드 컬러 (파란색 계열)
        primary: {
          50: '#f0f7ff',
          100: '#e0f0ff',
          200: '#bae0ff',
          300: '#7cc5ff',
          400: '#36a3ff',
          500: '#0064ff', // 토스 메인 컬러
          600: '#0052cc',
          700: '#004299',
          800: '#003380',
          900: '#002266',
        },
        // 다크 모드 컬러 (토스 스타일)
        dark: {
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#e8eaed',
          300: '#dadce0',
          400: '#bdc1c6',
          500: '#9aa0a6',
          600: '#80868b',
          700: '#5f6368',
          800: '#3c4043',
          900: '#202124', // 토스 다크 모드 배경
        },
        // 라이트 모드 컬러 (토스 스타일)
        light: {
          50: '#ffffff',
          100: '#f8f9fa',
          200: '#f1f3f4',
          300: '#e8eaed',
          400: '#dadce0',
          500: '#bdc1c6',
          600: '#9aa0a6',
          700: '#5f6368',
          800: '#3c4043',
          900: '#202124',
        },
        // 토스 특화 컬러
        toss: {
          blue: '#0064ff',
          blueLight: '#e0f0ff',
          gray: '#f8f9fa',
          grayDark: '#202124',
          success: '#00c851',
          warning: '#ff9500',
          error: '#ff3b30',
        }
      }
    },
  },
  plugins: [],
} 