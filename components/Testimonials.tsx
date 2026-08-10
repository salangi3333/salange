"use client";

import { motion } from "framer-motion";
import { Star, ThumbsUp } from "lucide-react";
import { Testimonial } from "@/types";

function scrollToCTA() {
  document.getElementById("main-cta")?.scrollIntoView({ behavior: "smooth" });
}

export default function Testimonials({
  list,
  totalPaid,
  discountPrice,
  discountRate,
}: {
  list: Testimonial[];
  totalPaid: number;
  discountPrice: string;
  discountRate: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto max-w-content bg-sceneBg px-6 py-16"
    >
      <div className="text-center">
        <h2 className="font-serif-kr text-2xl font-bold leading-snug text-sceneText">
          먼저 경험한 사람들의
          <br />
          솔직한 이야기
        </h2>
        <span className="mt-4 inline-block rounded-pill bg-accentRed px-3 py-1 text-xs font-bold text-white">
          누적 {totalPaid.toLocaleString()}건 결제 인증
        </span>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {list.map((t, idx) => (
          <div key={idx} className="rounded-card bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-textMain">{t.headline}</h3>

            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < t.rating
                        ? "fill-accentGoldTo text-accentGoldTo"
                        : "fill-gray-200 text-gray-200"
                    }
                  />
                ))}
              </div>
              <span className="rounded-pill bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-800">
                {t.paymentBadge}
              </span>
            </div>

            <p className="mt-2 text-xs text-textSub">
              {t.authorMasked} · {t.daysAgo}
            </p>

            <p className="mt-3 text-[15px] leading-relaxed text-textMain">
              {t.body.map((b, i) =>
                b.highlight ? (
                  <strong key={i} className="text-accentRed">
                    {b.text}
                  </strong>
                ) : (
                  <span key={i}>{b.text}</span>
                )
              )}
            </p>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-2">
                {t.hashtags.map((tag) => (
                  <span key={tag} className="text-xs text-accentRed">
                    {tag}
                  </span>
                ))}
              </div>
              <span className="flex items-center gap-1 text-xs text-textSub">
                <ThumbsUp size={12} />
                {t.helpfulCount}명 도움됨
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 rounded-card bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="rounded-pill bg-accentRed px-2 py-0.5 text-xs font-bold text-white">
            {discountRate}
          </span>
          <span className="text-2xl font-bold text-textMain">
            {discountPrice}
          </span>
        </div>
        <button
          onClick={scrollToCTA}
          className="w-full rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo py-3.5 text-sm font-bold text-dark"
        >
          지금 전체 사주 풀이 받기 →
        </button>
      </div>
    </motion.section>
  );
}
