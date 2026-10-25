/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FFF8F5',
        surface: '#FFFFFF',
        ink: '#1F1A2B',
        muted: '#6B6478',
        line: '#E9E3EE',
        plum: { DEFAULT: '#6D2E6B', hover: '#571F55', soft: '#F6EEF6' },
        teal: { DEFAULT: '#0F766E', soft: '#E6F4F2' },
        tierA: { fg: '#B42318', bg: '#FEF3F2' },
        tierB: { fg: '#B54708', bg: '#FFFAEB' },
        noflag: { fg: '#027A48', bg: '#ECFDF3' }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'Cambria', 'serif']
      },
      borderRadius: { card: '16px' },
      boxShadow: {
        soft: '0 1px 2px rgba(31,26,43,0.04), 0 4px 16px rgba(31,26,43,0.06)'
      }
    }
  },
  plugins: []
};
