"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import OnboardingIntroV2 from "./OnboardingIntroV2";
import IntakeForm from "./IntakeForm";
import AnalyzingScreenV2 from "./AnalyzingScreenV2";
import ConfirmInfoScreen from "./ConfirmInfoScreen";
import ResultLandingV2 from "./ResultLandingV2";
import { IntakeFormData } from "@/lib/sajuEngine";
import { buildAppData } from "@/lib/sajuContent";
import { buildReportResult, ReportResult } from "@/lib/reportMapper";

/**
 * ResultLandingV2용 오프닝 → 입력 → 전환 → 결과 흐름. 기존 app/page.tsx의
 * gate → form → analyzing → result SPA 패턴과 같은 방식(클라이언트 state로
 * 단계 전환)을 쓰지만, 이 파일은 app/page.tsx를 전혀 건드리지 않는 완전히
 * 독립된 컴포넌트다. OnboardingIntroV2/IntakeForm/AnalyzingScreenV2는 각각
 * 기존 화면을 참고해 새로 작성했거나(오프닝/분석) 수정 없이 그대로
 * 재사용했고(입력폼), 계산도 기존 calculateSaju → buildAppData 파이프라인
 * 그대로 재사용한다 — 이 파일은 그 결과를 buildReportResult()로 한 번 더
 * 매핑해 ResultLandingV2에 넘기는 역할만 한다. 새 명리 계산 없음.
 *
 * DB + reportId + 영구 재접속 구조(승인된 작업) — confirm 화면에서
 * "이대로 사주 풀이 보기"를 누르면 이제는 그 자리에서 바로 결과를 렌더링
 * 하지 않고, 서버(POST /api/reports)에 입력값을 보내 reportId를 발급받은
 * 뒤 `/result-v2/{reportId}`(app/result-v2/[reportId]/page.tsx)로 이동한다.
 * 그 페이지가 DB에서 입력값을 복원해 이 파일과 동일한 buildAppData →
 * buildReportResult 파이프라인을 서버에서 다시 호출한다 — 계산 로직은
 * 어디에도 복제하지 않았다. 이 파일 안의 client-side 미리보기(analyzing→
 * confirm 사이 report state)는 새로고침 복구용이 아니라 "확인 화면에 뭘
 * 보여줄지" 계산 용도로만 그대로 남겨둔다.
 */
type Stage = "intro" | "form" | "analyzing" | "confirm" | "result" | "error";

export default function ResultV2Flow() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [pendingFormData, setPendingFormData] = useState<IntakeFormData | null>(null);
  const [report, setReport] = useState<ReportResult | null>(null);
  // 존재하지 않는 날짜/윤달처럼 calculateSaju가 방어 검증에 걸려 Error를
  // throw했을 때의 메시지 — 화면이 깨지는 대신 이 문구로 안내한다.
  const [calcError, setCalcError] = useState<string>("");
  // report 생성 API(POST /api/reports) 호출 중 상태 — confirm 화면 버튼을
  // 비활성화해서 중복 클릭으로 report가 여러 개 만들어지는 것을 막는다.
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSubmitError, setReportSubmitError] = useState("");
  // React state 갱신은 비동기라 setSubmittingReport(true) 직후 두 번째
  // 클릭 이벤트가 아직 이전 값을 볼 수 있다 — ref로 즉시 반영되는 잠금을
  // 하나 더 둬서 그 틈을 막는다(빠른 연속 클릭 방지).
  const submittingRef = useRef(false);

  // app/page.tsx와 동일한 안전장치 — 이전 단계에서 스크롤이 내려가 있던 채로
  // 다음 화면이 표시되면 위쪽 콘텐츠가 스킵된 것처럼 보이므로, confirm/결과
  // 진입 시점에 스크롤을 맨 위로 되돌린다.
  useLayoutEffect(() => {
    if (stage === "confirm" || stage === "result") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [stage]);

  const handleFormSubmit = (data: IntakeFormData) => {
    setPendingFormData(data);
    setStage("analyzing");
  };

  // 분석 화면이 끝나면 결과를 미리 계산해 두고, 곧바로 결과로 넘기지 않고
  // 입력한 기본 정보를 확인하는 화면(confirm)을 먼저 보여준다.
  const handleAnalyzingDone = () => {
    if (!pendingFormData) return;
    // calculateSaju가 방어 검증(validateBirthDate)에서 걸리면 한국어 메시지가
    // 담긴 Error를 던진다 — 여기서 잡아 결과 화면이 깨지지 않게 하고,
    // 사용자를 다시 입력 화면으로 안내한다.
    try {
      const appData = buildAppData(pendingFormData);
      setReport(buildReportResult(appData, pendingFormData.gender));
      setStage("confirm");
    } catch (e) {
      setCalcError(e instanceof Error ? e.message : "입력하신 생년월일을 다시 확인해주세요.");
      setStage("error");
    }
  };

  const handleRetryFromError = () => {
    setCalcError("");
    setPendingFormData(null);
    setStage("form");
  };

  const handleConfirmed = async () => {
    if (!pendingFormData) return;
    // 빠른 연속 클릭 방지 — 이미 진행 중이면 새 요청을 만들지 않는다.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setReportSubmitError("");
    setSubmittingReport(true);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingFormData),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.reportId) {
        setReportSubmitError(
          (data && typeof data.error === "string" && data.error) ||
            "리포트 생성에 실패했습니다. 잠시 후 다시 시도해주세요."
        );
        submittingRef.current = false;
        setSubmittingReport(false);
        return;
      }

      // 성공 시에는 submittingReport를 되돌리지 않는다 — 페이지 이동이
      // 일어나기 전까지 버튼이 계속 비활성 상태로 남아 중복 클릭을 막는다.
      router.push(`/result-v2/${data.reportId}`);
    } catch {
      setReportSubmitError("네트워크 오류로 리포트를 생성하지 못했습니다. 다시 시도해주세요.");
      submittingRef.current = false;
      setSubmittingReport(false);
    }
  };

  if (stage === "intro") {
    return <OnboardingIntroV2 onEnter={() => setStage("form")} />;
  }

  if (stage === "analyzing") {
    return <AnalyzingScreenV2 name={pendingFormData?.name ?? ""} onDone={handleAnalyzingDone} />;
  }

  if (stage === "error") {
    return (
      <section className="mx-auto flex min-h-screen max-w-content flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-serif-kr text-lg font-bold text-textMain">{calcError}</p>
        <button
          type="button"
          onClick={handleRetryFromError}
          className="mt-2 rounded-pill bg-gradient-to-r from-accentGoldFrom to-accentGoldTo px-6 py-3 text-sm font-bold text-dark"
        >
          다시 입력하기
        </button>
      </section>
    );
  }

  if (stage === "confirm" && pendingFormData) {
    return (
      <ConfirmInfoScreen
        data={pendingFormData}
        onConfirm={handleConfirmed}
        submitting={submittingReport}
        errorMessage={reportSubmitError}
      />
    );
  }

  if (stage === "result" && report) {
    return <ResultLandingV2 report={report} />;
  }

  return <IntakeForm onSubmit={handleFormSubmit} />;
}
