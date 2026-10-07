import type { Config } from 'tailwindcss';

/**
 * Women Builders visual system (designer handoff R3).
 * The legacy `gray`, `brand`, `red`, `green`, `yellow` and `blue` scales are remapped onto the
 * designer's tokens, so any class still using them lands on the new palette.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#1F3D2B', deep: '#0E2418' },
        ink: { DEFAULT: '#1F3D2B', muted: '#2E4A39', subtle: '#4D6B58' },
        cream: '#FBF4EC',
        paper: '#FFFFFF',
        line: '#EADCCB',
        'line-soft': '#F1E7DA',
        field: '#CFC2AE',
        rose: '#C2557A',
        wash: '#F3EADF',
        butter: { DEFAULT: '#F2D774', tint: '#F9EDBE' },
        founder: { DEFAULT: '#F4B8C8', tint: '#FBE3EA' },
        operator: { DEFAULT: '#D9CCF5', tint: '#EFE9FB' },
        investor: { DEFAULT: '#F2D774', tint: '#F9EDBE' },
        builder: { DEFAULT: '#C9D9A8', tint: '#E6EED6' },
        success: { DEFAULT: '#1E6B3E', bg: '#E3F0E1' },
        info: { DEFAULT: '#24527D', bg: '#E2ECF7' },
        warning: { DEFAULT: '#7A4E00', bg: '#FBEFC4', body: '#5E3C00' },
        danger: { DEFAULT: '#A8281B', bg: '#FBE4E1', edge: '#6E160C' },

        // Legacy scales, remapped.
        brand: { 50: '#F3EADF', 100: '#EADCCB', 200: '#EADCCB', 500: '#2E5A40', 600: '#1F3D2B', 700: '#1F3D2B' },
        gray: {
          50: '#FBF4EC', 100: '#F3EADF', 200: '#EADCCB', 300: '#CFC2AE', 400: '#A99F90',
          500: '#4D6B58', 600: '#4D6B58', 700: '#2E4A39', 800: '#1F3D2B', 900: '#1F3D2B',
        },
        red: { 50: '#FBE4E1', 100: '#FBE4E1', 200: '#F0B9B2', 500: '#A8281B', 600: '#A8281B', 700: '#A8281B', 800: '#6E160C', 900: '#6E160C' },
        green: { 50: '#E3F0E1', 100: '#E3F0E1', 200: '#B9D9B4', 600: '#1E6B3E', 700: '#1E6B3E', 800: '#1E6B3E', 900: '#1E6B3E' },
        yellow: { 50: '#FBEFC4', 100: '#FBEFC4', 200: '#F2D774', 300: '#F2D774', 500: '#7A4E00', 700: '#7A4E00', 800: '#7A4E00', 900: '#5E3C00' },
        blue: { 50: '#E2ECF7', 200: '#B7CCE3', 900: '#24527D' },
      },
      fontFamily: {
        display: ['"Young Serif"', 'Georgia', 'serif'],
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { chip: '8px', field: '14px', card: '24px', panel: '32px' },
      boxShadow: {
        press: '0 4px 0 #0E2418',
        'press-sm': '0 3px 0 #0E2418',
        lift: '0 10px 26px rgba(31,61,43,.08)',
        collage: '0 24px 50px rgba(31,61,43,.16)',
        dialog: '0 24px 60px rgba(31,61,43,.25)',
        focus: '0 0 0 3px #FBF4EC, 0 0 0 6px #C2557A',
        'focus-field': '0 0 0 4px #FBE3EA',
      },
      keyframes: {
        spin360: { to: { transform: 'rotate(360deg)' } },
        marquee: { to: { transform: 'translateX(-50%)' } },
      },
      animation: { 'spin-slow': 'spin360 22s linear infinite', marquee: 'marquee 40s linear infinite' },
    },
  },
  plugins: [],
};

export default config;
