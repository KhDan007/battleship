/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        board: {
          empty: 'var(--bg-cell-empty)',
          ship: 'var(--bg-cell-ship)',
          hit: 'var(--bg-cell-hit)',
          miss: 'var(--bg-cell-miss)',
          sunk: 'var(--bg-cell-sunk)',
        },
        accent: {
          blue: 'var(--accent-blue)',
          green: 'var(--accent-green)',
          red: 'var(--accent-red)',
          yellow: 'var(--accent-yellow)',
          amber: 'var(--accent-amber)',
          emerald: 'var(--accent-emerald)',
        },
      },
    },
  },
  plugins: [],
};
