"use client";

import { motion } from "framer-motion";
import { RESULT_GUIDE_IMAGE } from "@/lib/guideImages";

/**
 * 마지막 "선녀" 장면. 결과 페이지 전용 공식 선녀 이미지(RESULT_GUIDE_IMAGE
 * — GuideScene에서 계속 등장한 바로 그 캐릭터)를 큰 이미지로 사용한다.
 * Hero(첫 시작 화면)의 HERO_GUIDE_IMAGE와는 별도 상수로 분리되어 있다.
 */
function scrollToCTA() {
  document.getElementById("main-cta")?.scrollIntoView({ behavior: "smooth" });
}

export default function FarewellOutro({
  name,
  motionOff = false,
}: {
  name: string;
  // 임시 A/B 진단 전용 — 부모(ResultLanding)가 ?scrollAB=motion-off를
  // 판정해 내려주는 값. true면 아래 구분선 scaleX를 처음부터 기존
  // 애니메이션의 최종값으로 렌더링한다. opacity와 그 전환 타이밍은 전혀
  // 건드리지 않는다. 확인 끝나면 반드시 제거할 것.
  motionOff?: boolean;
}) {
  void name; // 새 문구는 이름을 부르지 않는다 — prop 시그니처만 유지.

  const lines = [
    "지나온 삶은\n바꿀 수 없습니다.",
    "하지만",
    "이제부터는\n달라질 수 있습니다.",
  ];

  // CTA 직전 마지막 한 줄. "첫 장뿐입니다" 식 표현은 실제 페이지 구성(5개 챕터를 이미 보여준 뒤)과
  // 맞지 않아 삭제하고, 과장 없이 "지금까지는 시작이었다"는 사실만 짧게 남긴다.
  const buildupLines = [
    { text: "지금까지 본 것은,\n시작일 뿐입니다.", weight: "main" as const },
  ];

  return (
    <>
      <motion.section
        data-probe-scene="farewell"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.8 }}
        className="relative flex flex-col overflow-hidden bg-sceneBg sm:min-h-[90svh] sm:flex-row sm:items-center"
      >
        {/* 여성 이미지 — 모바일: 상단 영역 / 데스크톱: 전체 배경 + 오른쪽 강조.
            "얼굴 클로즈업"이 아니라 "붓을 든 손·책상·촛불·배경까지 보이는
            글쓰는 장면"이 한눈에 들어와야 해서, 모바일도 데스크톱과 동일한
            crop(bg-cover, 56% 20%)을 그대로 사용한다.
            모바일 높이는 h-[48svh](주소창 유무로 실제 px가 바뀌어 배경
            crop이 다시 계산되던 값) 대신, 뷰포트 높이와 무관하게 폭에서
            역산되는 aspect-ratio로 고정해 crop이 항상 동일하게 보이게 한다. */}
        <div
          className="relative aspect-[96/100] w-full shrink-0 bg-cover sm:absolute sm:inset-0 sm:h-full sm:aspect-auto"
          style={{
            backgroundImage: `url(${RESULT_GUIDE_IMAGE})`,
            backgroundPosition: "56% 20%",
          }}
        >
          {/* 모바일: 이미지 하단만 살짝 어둡게 → 대사 영역과 자연스럽게 이어짐 */}
          <div
            className="absolute inset-0 sm:hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(16,19,29,0) 60%, rgba(16,19,29,0.95) 100%)",
            }}
          />
          {/* 데스크톱: 왼쪽에서 오른쪽으로 먹색 그라데이션 — 대사가 놓이는 왼쪽을 어둡게, 얼굴이 있는 오른쪽은 밝게 유지 */}
          <div
            className="absolute inset-0 hidden sm:block"
            style={{
              background:
                "linear-gradient(90deg, rgba(16,19,29,0.98) 0%, rgba(16,19,29,0.9) 30%, rgba(16,19,29,0.45) 52%, rgba(16,19,29,0.08) 68%, rgba(16,19,29,0.15) 100%)",
            }}
          />
        </div>

        {/* 대사 영역 */}
        <div className="relative z-10 flex flex-1 flex-col justify-end gap-4 px-6 pb-14 pt-8 sm:justify-center sm:gap-6 sm:px-16 sm:py-20">
          {lines.map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{ duration: 0.6, delay: i === lines.length - 1 ? 1.5 : i * 0.6 }}
              className={`whitespace-pre-line font-serif-kr leading-relaxed tracking-[0.01em] text-sceneText ${
                i === 0
                  ? "text-[21px] font-bold sm:text-3xl"
                  : "text-[16px] text-sceneBody sm:text-xl"
              }`}
              style={{ wordBreak: "keep-all" }}
            >
              {line}
            </motion.p>
          ))}
        </div>
      </motion.section>

      {/* 화면이 천천히 어두워지며 감정이 고조되는 전환부 → 구매 CTA로 자연스럽게 연결 */}
      <div className="flex flex-col items-center gap-7 bg-sceneBg px-6 py-16 text-center sm:py-20">
        <span className="h-px w-10 bg-sceneGold/40" />

        <div className="flex flex-col gap-5">
          {buildupLines.map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{ duration: 0.6, delay: i * 0.5 }}
              className={`whitespace-pre-line font-serif-kr leading-relaxed tracking-[0.01em] ${
                line.weight === "main"
                  ? "text-[19px] font-bold text-sceneGold sm:text-2xl"
                  : "max-w-[42ch] text-[15px] text-sceneTextSub sm:text-base"
              }`}
              style={{ wordBreak: "keep-all" }}
            >
              {line.text}
            </motion.p>
          ))}
        </div>

        {/* 여운 — 마지막 문장의 무게가 가라앉을 시간을 준 뒤 버튼이 나타난다 */}
        <motion.span
          initial={{ opacity: 0, scaleX: motionOff ? 1 : 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.8, delay: 2.0 }}
          className="block h-px w-8 bg-sceneGold/30"
        />

        <motion.button
          onClick={scrollToCTA}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.05 }}
          transition={{ duration: 0.6, delay: 2.4 }}
          className="mt-1 flex items-center gap-2 rounded-pill border border-sceneGold/50 bg-sceneGold/10 px-7 py-3.5 text-[15px] font-bold text-sceneGold shadow-[0_8px_24px_rgba(212,163,74,0.18)] transition-colors active:bg-sceneGold/20"
        >
          전체 운명 기록 열기
          <span aria-hidden>→</span>
        </motion.button>
      </div>
    </>
  );
}
