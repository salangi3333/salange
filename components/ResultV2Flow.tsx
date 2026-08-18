"use client";

import { useLayoutEffect, useState } from "react";
import OnboardingIntroV2 from "./OnboardingIntroV2";
import IntakeForm from "./IntakeForm";
import AnalyzingScreenV2 from "./AnalyzingScreenV2";
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
 */
type Stage = "intro" | "form" | "analyzing" | "result";

export default function ResultV2Flow() {
  const [stage, setStage] = useState<Stage>("intro");
  const [pendingFormData, setPendingFormData] = useState<IntakeFormData | null>(null);
  const [report, setReport] = useState<ReportResult | null>(null);

  // app/page.tsx와 동일한 안전장치 — 이전 단계에서 스크롤이 내려가 있던 채로
  // 결과 화면이 표시되면 위쪽 콘텐츠가 스킵된 것처럼 보이므로, 결과 진입
  // 시점에 스크롤을 맨 위로 되돌린다.
  useLayoutEffect(() => {
    if (stage === "result") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [stage]);

  const handleFormSubmit = (data: IntakeFormData) => {
    setPendingFormData(data);
    setStage("analyzing");
  };

  const handleAnalyzingDone = () => {
    if (!pendingFormData) return;
    const appData = buildAppData(pendingFormData);
    setReport(buildReportResult(appData));
    setStage("result");
  };

  if (stage === "intro") {
    return <OnboardingIntroV2 onEnter={() => setStage("form")} />;
  }

  if (stage === "analyzing") {
    return <AnalyzingScreenV2 name={pendingFormData?.name ?? ""} onDone={handleAnalyzingDone} />;
  }

  if (stage === "result" && report) {
    return <ResultLandingV2 report={report} />;
  }

  return <IntakeForm onSubmit={handleFormSubmit} />;
}
