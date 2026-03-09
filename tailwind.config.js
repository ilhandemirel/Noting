/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        notion: {
          bg: '#FFFFFF',
          sidebar: '#F7F6F3',
          text: '#37352F',
          gray: '#E3E2DE',
          hover: '#EBEBEA',
          border: '#E3E2DE',
          placeholder: '#B4B4B0',
          secondary: '#787774',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
