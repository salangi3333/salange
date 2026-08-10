/**
 * 선녀 이미지 경로를 두 용도로 명확히 분리해서 관리한다.
 * 절대 하나의 상수/경로를 공유하지 않는다 — Hero(첫 시작 화면)와
 * 결과 페이지는 서로 다른 이미지를 쓰며, 한쪽을 바꿔도 다른 쪽에
 * 영향이 가지 않아야 한다.
 */

/** 첫 시작 화면(Hero / OnboardingIntro) 전용 원본 이미지. 절대 결과
 * 페이지 이미지로 교체하지 않는다. */
export const HERO_GUIDE_IMAGE = "/intro-character.webp";

/** 결과 페이지 내부(로딩 원형 이미지, 챕터 상단 프로필, 선녀 대사 옆
 * 프로필, 엔딩 큰 이미지)에서만 사용하는 공식 선녀 이미지 — 분홍 한복을
 * 입고 붓으로 글을 쓰는 원본(선녀2.png)을 그대로 사용한다. */
export const RESULT_GUIDE_IMAGE = "/result-guide-character.webp";
