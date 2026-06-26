module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        bg: {
          app: "#050505",
          surface: "#111111",
          surfaceHover: "#1A1A1A",
        },
        accent: {
          orange: "#F97316",
          orangeHover: "#EA580C",
          cyan: "#00F0FF",
          green: "#22C55E",
          red: "#EF4444",
          amber: "#F59E0B",
        },
        ink: {
          primary: "#FAFAFA",
          secondary: "#A1A1AA",
          muted: "#52525B",
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "2px",
      },
      boxShadow: {
        glowCyan: "0 0 0 1px rgba(0,240,255,0.5), 0 0 32px -4px rgba(0,240,255,0.5)",
        glowOrange: "0 0 0 1px rgba(249,115,22,0.6), 0 0 32px -4px rgba(249,115,22,0.55)",
        glowGreen: "0 0 0 1px rgba(34,197,94,0.55), 0 0 24px -6px rgba(34,197,94,0.55)",
      },
      keyframes: {
        pulseRing: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0,240,255,0.4)" },
          "50%": { boxShadow: "0 0 0 10px rgba(0,240,255,0)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "47%": { opacity: "1" },
          "50%": { opacity: "0.6" },
          "53%": { opacity: "1" },
        },
        edgeFlow: {
          "0%": { strokeDashoffset: "20" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.8s ease-out infinite",
        flicker: "flicker 4s linear infinite",
        edgeFlow: "edgeFlow 1.2s linear infinite",
      },
    },
  },
  plugins: [],
};
