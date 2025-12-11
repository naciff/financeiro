export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: "#359EFF",
        "background-light": "#f5f7f8",
        "background-dark": "#0f1923",
        "surface-light": "#FFFFFF",
        "surface-dark": "#1F2937",
        "border-light": "#E5E7EB",
        "border-dark": "#374151",
        "text-main-light": "#111827",
        "text-main-dark": "#F9FAFB",
        "text-muted-light": "#6B7280",
        "text-muted-dark": "#9CA3AF",
        profit: "#10B981",
        loss: "#EF4444",
        neutral: "#3B82F6",
        // Keep existing colors for safety/compatibility
        'fourtek': {
          green: '#00CC00',
          blue: '#0066CC',
          'green-hover': '#00B300',
          'blue-hover': '#0052A3',
          'green-light': '#33D633',
          'blue-light': '#3385D6',
        }
      },
      fontFamily: {
        display: "Spline Sans",
        body: ["Inter", "sans-serif"]
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem"
      },
      animation: {
        'scale-in': 'scaleIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
