"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { IntakeFormData } from "@/lib/sajuEngine";

export default function IntakeForm({
  onSubmit,
}: {
  onSubmit: (data: IntakeFormData) => void;
}) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthHour, setBirthHour] = useState("");
  const [birthMinute, setBirthMinute] = useState("");
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("이름을 입력해주세요");
      return;
    }

    const year = Number(birthYear);
    const month = Number(birthMonth);
    const day = Number(birthDay);

    if (
      !birthYear ||
      !birthMonth ||
      !birthDay ||
      year < 1900 ||
      year > 2100 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      setError("생년월일을 정확히 입력해주세요 (예: 1997 / 9 / 12)");
      return;
    }
    let hour: number | null = null;
    let minute = 0;

    if (!timeUnknown) {
      const h12 = Number(birthHour);
      const m = Number(birthMinute);
      if (!birthHour || !birthMinute || h12 < 1 || h12 > 12 || m < 0 || m > 59) {
        setError("태어난 시간을 정확히 입력하거나 '시간 모름'을 선택해주세요");
        return;
      }
      hour = ampm === "AM" ? (h12 === 12 ? 0 : h12) : h12 === 12 ? 12 : h12 + 12;
      minute = m;
    }

    setError("");
    onSubmit({
      name: name.trim(),
      gender,
      calendarType,
      isLeapMonth: calendarType === "lunar" ? isLeapMonth : false,
      year,
      month,
      day,
      hour,
      minute,
      timeUnknown,
    });
  };

  return (
    <section className="mx-auto flex min-h-screen max-w-content flex-col justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <p className="text-sm text-textSub">무료로 확인하는</p>
        <h1 className="mt-2 font-serif-kr text-3xl font-bold text-textMain">
          나의 사주 원본 분석
        </h1>
        <p className="mt-3 text-sm text-textSub">
          정보를 입력하면 타고난 사주팔자를 바로 풀이해드립니다
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        onSubmit={handleSubmit}
        className="mt-10 flex flex-col gap-6 rounded-card bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-textMain">이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력해주세요"
            className="rounded-box border border-bg bg-bg/50 px-4 py-3 text-sm text-textMain outline-none focus:border-accentGoldTo"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-textMain">성별</label>
          <div className="flex gap-2">
            {(["female", "male"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 rounded-box border px-4 py-3 text-sm font-medium transition ${
                  gender === g
                    ? "border-accentRed bg-accentRed/10 text-accentRed"
                    : "border-bg bg-bg/50 text-textSub"
                }`}
              >
                {g === "female" ? "여성" : "남성"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-textMain">생년월일</label>
          <div className="flex gap-2">
            {(["solar", "lunar"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCalendarType(type)}
                className={`flex-1 rounded-box border px-4 py-2.5 text-sm font-medium transition ${
                  calendarType === type
                    ? "border-accentRed bg-accentRed/10 text-accentRed"
                    : "border-bg bg-bg/50 text-textSub"
                }`}
              >
                {type === "solar" ? "양력" : "음력"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1 rounded-box border border-bg bg-bg/50 px-3 py-3">
              <input
                value={birthYear}
                onChange={(e) =>
                  setBirthYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))
                }
                inputMode="numeric"
                placeholder="1997"
                maxLength={4}
                className="w-full bg-transparent text-sm text-textMain outline-none"
              />
              <span className="text-xs text-textSub">년</span>
            </div>
            <div className="flex flex-1 items-center gap-1 rounded-box border border-bg bg-bg/50 px-3 py-3">
              <input
                value={birthMonth}
                onChange={(e) =>
                  setBirthMonth(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))
                }
                inputMode="numeric"
                placeholder="9"
                maxLength={2}
                className="w-full bg-transparent text-sm text-textMain outline-none"
              />
              <span className="text-xs text-textSub">월</span>
            </div>
            <div className="flex flex-1 items-center gap-1 rounded-box border border-bg bg-bg/50 px-3 py-3">
              <input
                value={birthDay}
                onChange={(e) =>
                  setBirthDay(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))
                }
                inputMode="numeric"
                placeholder="12"
                maxLength={2}
                className="w-full bg-transparent text-sm text-textMain outline-none"
              />
              <span className="text-xs text-textSub">일</span>
            </div>
          </div>
          {calendarType === "lunar" && (
            <label className="flex items-center gap-2 text-xs text-textSub">
              <input
                type="checkbox"
                checked={isLeapMonth}
                onChange={(e) => setIsLeapMonth(e.target.checked)}
              />
              윤달입니다
            </label>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-textMain">태어난 시간</label>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              {(["AM", "PM"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={timeUnknown}
                  onClick={() => setAmpm(v)}
                  className={`rounded-box border px-3 py-3 text-sm font-medium transition disabled:opacity-40 ${
                    ampm === v
                      ? "border-accentRed bg-accentRed/10 text-accentRed"
                      : "border-bg bg-bg/50 text-textSub"
                  }`}
                >
                  {v === "AM" ? "오전" : "오후"}
                </button>
              ))}
            </div>
            <div className="flex flex-1 items-center gap-1 rounded-box border border-bg bg-bg/50 px-3 py-3">
              <input
                value={birthHour}
                onChange={(e) =>
                  setBirthHour(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))
                }
                inputMode="numeric"
                placeholder="8"
                maxLength={2}
                disabled={timeUnknown}
                className="w-full bg-transparent text-sm text-textMain outline-none disabled:opacity-40"
              />
              <span className="text-xs text-textSub">시</span>
            </div>
            <div className="flex flex-1 items-center gap-1 rounded-box border border-bg bg-bg/50 px-3 py-3">
              <input
                value={birthMinute}
                onChange={(e) =>
                  setBirthMinute(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))
                }
                inputMode="numeric"
                placeholder="30"
                maxLength={2}
                disabled={timeUnknown}
                className="w-full bg-transparent text-sm text-textMain outline-none disabled:opacity-40"
              />
              <span className="text-xs text-textSub">분</span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-textSub">
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(e) => setTimeUnknown(e.target.checked)}
            />
            시간 모름 (시주 없이 풀이합니다)
          </label>
        </div>

        {error && <p className="text-xs text-accentRed">{error}</p>}

        <button
          type="submit"
          className="mt-2 rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo py-4 text-base font-bold text-dark"
        >
          내 사주 확인하기 →
        </button>
      </motion.form>
    </section>
  );
}
