/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: '#0f1117', raised: '#161922', overlay: '#1e2130' },
        border: { DEFAULT: '#262940', active: '#5b5fc7' },
        accent: { DEFAULT: '#5b5fc7', hover: '#6e72d4', muted: '#3d4076', soft: '#5b5fc714' },
        success: { DEFAULT: '#2ea043', soft: '#2ea04318' },
        warning: { DEFAULT: '#d29922', soft: '#d2992218' },
        danger: { DEFAULT: '#f85149', soft: '#f8514918' },
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};
