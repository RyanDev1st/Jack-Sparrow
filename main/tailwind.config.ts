import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#020611',
          900: '#07142B',
          800: '#142647',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
