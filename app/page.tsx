"use client";

import { useLayoutEffect, useState } from "react";
import OnboardingIntro from "@/components/OnboardingIntro";
import { FortuneTopic, TOPIC_LABELS } from "@/components/CharacterGuide";
import AnalyzingScreen from "@/components/AnalyzingScreen";
import IntakeForm from "@/components/IntakeForm";
import ResultLanding from "@/components/ResultLanding";
import { IntakeFormData } from "@/lib/sajuEngine";
import { buildAppData, AppData } from "@/lib/sajuContent";

// 메인 진입 흐름은 항상 "전체 사주풀이"로 바로 이동한다.
// 연애운/재물운/궁합 주제 선택 및 관련 화면(CharacterGuide, PartnerForm)은
// 삭제하지 않고 보존하되, 메인 플로우에서는 더 이상 사용하지 않는다.
const DEFAULT_TOPIC: FortuneTopic = "all";

// "loading" 단계는 AnalyzingScreen이 선녀 대사 + 오행 분석 연출을 한 화면에서
// 모두 처리하게 되면서 더 이상 쓰이지 않는다. LoadingScreen.tsx 파일은
// 삭제하지 않고 보존하되, 현재 진입 흐름에서는 사용하지 않는다.
type Stage = "gate" | "form" | "analyzing" | "result";

export default function Home() {
  const [stage, setStage] = useState<Stage>("gate");
  const [appData, setAppData] = useState<AppData | null>(null);
  const [pendingFormData, setPendingFormData] = useState<IntakeFormData | null>(null);

  // The SPA swaps the analyzing screen for the result in the same document.
  // Reset the preserved window scroll position before the result is painted so
  // its first scene is never skipped.
  useLayoutEffect(() => {
    if (stage === "result") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [stage]);

  const handleEnter = () => setStage("form");

  const handleFormSubmit = (formData: IntakeFormData) => {
    setPendingFormData(formData);
    setStage("analyzing");
  };

  const handleAnalyzingDone = () => {
    if (!pendingFormData) return;
    const data = buildAppData(pendingFormData);
    setAppData(data);
    setStage("result");
  };

  if (stage === "gate") {
    return <OnboardingIntro onEnter={handleEnter} />;
  }

  if (stage === "form") {
    return <IntakeForm onSubmit={handleFormSubmit} />;
  }

  if (stage === "analyzing") {
    return <AnalyzingScreen onDone={handleAnalyzingDone} />;
  }

  if (!appData) {
    return <IntakeForm onSubmit={handleFormSubmit} />;
  }

  return (
    <ResultLanding
      user={appData.user}
      chars={appData.chars}
      storyblocks={appData.storyblocks}
      resultQuote={appData.resultQuote}
      assetFlowPoints={appData.assetFlowPoints}
      fortuneTimelineNodes={appData.fortuneTimelineNodes}
      birthYear={appData.birthYear}
      topic={DEFAULT_TOPIC}
      topicLabel={TOPIC_LABELS[DEFAULT_TOPIC]}
      compatibility={null}
      partnerAppData={null}
    />
  );
}
