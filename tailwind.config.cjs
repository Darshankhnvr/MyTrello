/** @type {import('tailwindcss').Config} */
module.exports = {
  // Limit scanned files to project source folders to avoid scanning node_modules
  content: [
    './index.html',
    './*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './context/**/*.{ts,tsx,js,jsx}',
    './services/**/*.{ts,tsx,js,jsx}',
    './components/**/**/*.{ts,tsx,js,jsx}',
    './Modals/**/*.{ts,tsx,js,jsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};
