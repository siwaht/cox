/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised: 'var(--color-surface-raised)',
          overlay: 'var(--color-surface-overlay)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          active: 'var(--color-border-active)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          muted: 'var(--color-accent-muted)',
          soft: 'var(--color-accent-soft)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
          soft: 'var(--color-success-soft)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          soft: 'var(--color-warning-soft)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          soft: 'var(--color-danger-soft)',
        },
        // Semantic text colors that flip with theme
        txt: {
          primary: 'var(--color-txt-primary)',
          secondary: 'var(--color-txt-secondary)',
          muted: 'var(--color-txt-muted)',
          faint: 'var(--color-txt-faint)',
          ghost: 'var(--color-txt-ghost)',
        },
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'block-in': 'blockIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        blockIn: { from: { opacity: '0', transform: 'scale(0.92) translateY(8px)' }, to: { opacity: '1', transform: 'scale(1) translateY(0)' } },
        bounceIn: { '0%': { opacity: '0', transform: 'scale(0.8)' }, '60%': { opacity: '1', transform: 'scale(1.04)' }, '100%': { transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};
