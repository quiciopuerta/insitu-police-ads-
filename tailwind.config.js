/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./utils/**/*.{js,ts,jsx,tsx}",
    "./types/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: { 
      fontFamily: { 
        sans: ["Inter", "sans-serif"],
        headline: ["Space Grotesk", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Public Sans", "sans-serif"]
      },
      colors: {
        "inverse-on-surface": "#614d75",
        "primary-fixed": "#ae8dff",
        "on-secondary-fixed-variant": "#69379c",
        "surface-dim": "#170529",
        "secondary-fixed-dim": "#dab4ff",
        "error-container": "#a70138",
        "primary": "#ba9eff",
        "secondary-dim": "#bb87f1",
        "on-surface": "#f2dfff",
        "surface": "#170529",
        "outline": "#826d97",
        "on-primary": "#39008c",
        "primary-fixed-dim": "#a27cff",
        "on-tertiary": "#6a0934",
        "primary-container": "#ae8dff",
        "surface-tint": "#ba9eff",
        "surface-variant": "#33184d",
        "surface-container-highest": "#33184d",
        "on-primary-fixed-variant": "#370086",
        "outline-variant": "#534067",
        "on-tertiary-fixed-variant": "#701039",
        "inverse-primary": "#6e39db",
        "background": "#170529",
        "error-dim": "#d73357",
        "on-background": "#f2dfff",
        "on-primary-container": "#2b006e",
        "secondary": "#c08cf7",
        "on-primary-fixed": "#000000",
        "on-tertiary-fixed": "#380018",
        "on-secondary-container": "#e3c4ff",
        "surface-container-lowest": "#000000",
        "tertiary-fixed-dim": "#f67ca3",
        "on-secondary": "#390068",
        "on-error": "#490013",
        "error": "#ff6e84",
        "tertiary-fixed": "#ff8eb0",
        "tertiary-dim": "#f0779d",
        "primary-dim": "#8553f3",
        "tertiary-container": "#fd81a8",
        "on-secondary-fixed": "#4b147d",
        "surface-container-high": "#2b1344",
        "surface-bright": "#3a1e57",
        "on-tertiary-container": "#59002a",
        "surface-container-low": "#1d0832",
        "on-error-container": "#ffb2b9",
        "secondary-container": "#5e2c91",
        "secondary-fixed": "#e4c6ff",
        "surface-container": "#240e3b",
        "inverse-surface": "#fff7ff",
        "tertiary": "#ff97b5",
        "on-surface-variant": "#baa2cf",
        magenta: "#ff477b",
        cyan: "#00F2FE"
      },
      animation: {
        'gradient-x': 'gradient-x 3s ease infinite',
        'blob-pulse': 'blob-pulse 10s ease-in-out infinite alternate',
        'border-sweep': 'border-sweep 4s linear infinite',
        'neon-pulse': 'neon-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'typing': 'typing 3.5s steps(40, end) infinite',
        'reveal-up': 'reveal-up 0.8s ease-out forwards',
        'shimmer': 'shimmer 2s infinite',
        'float-1': 'float-1 8s ease-in-out infinite',
        'float-2': 'float-2 10s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'blob-pulse': {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        'border-sweep': {
          '0%': { 'background-position': '0% 0%' },
          '100%': { 'background-position': '200% 200%' },
        },
        'neon-pulse': {
          '0%, 100%': { 'box-shadow': '0 0 15px rgba(255, 71, 123, 0.4)' },
          '50%': { 'box-shadow': '0 0 30px rgba(255, 71, 123, 0.8)' },
        },
        'typing': {
          'from': { width: '0' },
          'to': { width: '100%' }
        },
        'reveal-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' }
        },
        'float-1': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-15px) rotate(2deg)' }
        },
        'float-2': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(-2deg)' }
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 40px rgba(186, 158, 255, 0.2), inset 0 0 20px rgba(186, 158, 255, 0.1)' },
          '50%': { boxShadow: '0 0 60px rgba(186, 158, 255, 0.4), inset 0 0 30px rgba(186, 158, 255, 0.2)' }
        }
      }
    },
  },
  plugins: [],
}
