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
        // ResultLandingV2 전환 화면(AnalyzingScreenV2) 전용 — 전부 1회만
        // 재생되고 끝나는 애니메이션이다(repeat 없음). 화면 자체가 언마운트
        // 되면(결과로 전환되면) 재생 중이었어도 즉시 사라진다 — ResultLandingV2
        // 안에서는 이 keyframe들이 전혀 쓰이지 않는다.
        resultV2FadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        resultV2ImageIn: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        // 기존 AnalyzingScreen.tsx의 오행 점 펄스(opacity/scale 물결) 모양을
        // 그대로 참고하되, repeat:Infinity 대신 유한 반복(2회)으로 바꿨다 —
        // 화면이 끝나면 언마운트되어 사라지지만, 코드 자체에도 "infinite"를
        // 남기지 않기 위함.
        resultV2DotPulse: {
          "0%, 100%": { opacity: "0.3", transform: "scale(0.85)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        scrollUp: "scrollUp 20s linear infinite",
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
        resultV2FadeIn: "resultV2FadeIn 0.4s ease-out",
        resultV2ImageIn: "resultV2ImageIn 0.5s ease-out forwards",
        // 유한 반복 2회 — "infinite" 아님. 다섯 점이 각자 다른 delay로 겹쳐
        // 돌면서 기존 화면의 "여러 색이 순서대로 밝아지는" 느낌을 낸다.
        resultV2DotPulse: "resultV2DotPulse 0.9s ease-in-out 2",
      },
    },
  },
  plugins: [],
};
