/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  safelist: [
    'bg-pink-50', 'bg-pink-100', 'bg-pink-200', 'bg-rose-100', 'bg-rose-500',
    'text-rose-900', 'text-rose-500', 'text-rose-400', 'text-rose-300', 'text-rose-950',
    'border-pink-200', 'border-rose-200',
    'hover:bg-rose-400', 'hover:bg-rose-100',
  ],
  plugins: [],
}
