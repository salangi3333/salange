"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 로그인 폼(클라이언트 전용) — app/admin/login/page.tsx(서버 컴포넌트)가
 * 세션 확인 후 미인증 상태일 때만 이 컴포넌트를 렌더링한다. 기존 로직을
 * 그대로 옮긴 것뿐, 동작 변경 없음.
 */
export default function AdminLoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/admin/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("비밀번호가 올바르지 않습니다.");
        setSubmitting(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-center text-xl font-bold text-textMain">관리자 로그인</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="current-password"
          placeholder="관리자 비밀번호"
          className="rounded-box border border-bg bg-bg/50 px-4 py-3 text-sm text-textMain outline-none focus:border-accentGoldTo"
        />
        {error && <p className="text-xs text-accentRed">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !password}
          className="rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo py-3 text-sm font-bold text-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "확인 중..." : "로그인"}
        </button>
      </form>
    </section>
  );
}
