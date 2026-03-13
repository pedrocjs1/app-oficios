/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{tsx,ts}", "./components/**/*.{tsx,ts}"],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B1A',
          50: '#FFF3EB',
          100: '#FFE0CC',
          200: '#FFC199',
          300: '#FFA266',
          400: '#FF8333',
          500: '#FF6B1A',
          600: '#E55A0F',
          700: '#CC4A08',
          800: '#993800',
          900: '#662500',
        },
        secondary: {
          DEFAULT: '#1A3C5E',
          50: '#E8EDF2',
          100: '#C5D3E0',
          200: '#8DA7C1',
          300: '#567BA3',
          400: '#2E5680',
          500: '#1A3C5E',
          600: '#15324F',
          700: '#102840',
          800: '#0B1E31',
          900: '#061422',
        },
      },
      fontFamily: {
        heading: ['Poppins_600SemiBold'],
        body: ['Inter_400Regular'],
        'body-medium': ['Inter_500Medium'],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
      },
    },
  },
  plugins: [],
};

