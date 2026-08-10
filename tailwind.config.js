/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F5EFE6",
        bgCard: "#FFFFFF",
        textMain: "#2B2320",
        textSub: "#8A7F72",
        accentRed: "#B5342A",
        accentGoldFrom: "#E7C07E",
        accentGoldTo: "#B8823C",
        dark: "#241C18",
        wood: "#4C7A4A",
        fire: "#C0392B",
        earth: "#8A6D3B",
        metal: "#8C8C88",
        water: "#3B6EA5",

        // Scene palette — used only by the immersive story experience
        // (전체/연애 결과). Warm dark stage + ivory "scroll" cards, kept
        // separate from the tokens above so the existing wealth/compatibility
        // screens are unaffected. "고급 동양 판타지" design concept.
        // Single source of truth for the result-page color system — reused
        // across every StoryScene component instead of per-screen hex values.
        sceneBg: "#171412",
        sceneBgAlt: "#1C1815",
        sceneInk: "#10131D",
        // 아이보리 카드 vs 진한 브라운 배경 — 대비를 확실히 만들기 위한 값.
        sceneCard: "#F7F0E6",
        sceneCardText: "#2B2622",
        sceneCardMuted: "#8B7257",
        // Warm off-white for headings/body instead of pure white, so gold/red
        // keyword emphasis actually stands out against the page text.
        sceneText: "#FFF7EA",
        sceneBody: "#F1EBE2",
        sceneTextSub: "#CBBFB1",
        sceneSilver: "#CDD6EA",
        sceneGold: "#D4A34A",
        sceneGoldLight: "#E8B55B",
        sceneRed: "#D84A3A",
        sceneRedDeep: "#B8332A",
        scenePlum: "#8B6B8F",
        sceneApricot: "#C98F6D",
      },
      fontFamily: {
        serifKr: ["'Noto Serif KR'", "serif"],
        sans: ["'Pretendard'", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        card: "22px",
        pill: "999px",
        box: "8px",
      },
      maxWidth: {
        content: "560px",
        // Wider reading column for the immersive StoryScene body copy only.
        content2: "720px",
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #E7C07E 0%, #B8823C 100%)",
      },
      keyframes: {
        scrollUp: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        scrollUp: "scrollUp 20s linear infinite",
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
