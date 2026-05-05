import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#FFE81F',
      },
      fontFamily: {
        starwars: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
