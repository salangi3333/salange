// 2장 전용 판정 보정 계층(scratch). 기존 계산 엔진은 한 글자도 바꾸지 않고, 엔진이 이미 계산한 배열만 읽는다.
//
// 보정 1) 중복 제거: 지지에 배우자성이 있으면 그 지지의 본기가 지장간 배열에 한 번 더 잡힌다(같은 글자를
//         visible 로 한 번, hidden/rooted 로 한 번 센 것). 같은 글자이므로 지장간 쪽 본기 항목은 세지 않는다.
//         중기·여기, 그리고 지지에 별이 없는 자리의 본기는 그대로 센다.
// 보정 2) 종류 합산: 정관·편관(정재·편재)이 실제로 모두 있으면 둘을 합쳐서 표현 방식을 판정한다.
//         한쪽만 있으면 그 종류만 센다. 어느 종류가 "우세"인지는 판단하지 않는다(엔진에 강약 판정 근거 없음).
// 판정식은 엔진(exposureShapeOf)과 동일하다: 가장 많은 값이 유일하게 앞서면 그 형태, 아니면 none.
import type { SpouseStarProfile, SpouseStarPositionHit } from "../lib/spouseStarAnalysis";

export type JudgedShape = "visible" | "rooted" | "hidden" | "none";
export type Presence = "both" | "A" | "B" | "none";

export interface JudgedStar {
  presence: Presence;
  visible: number;
  rooted: number;
  hidden: number;
  removedDuplicates: number;
  shape: JudgedShape;
}

function shapeOf(v: number, r: number, h: number): JudgedShape {
  if (v > r && v > h) return "visible";
  if (h > v && h > r) return "hidden";
  if (r > v && r > h) return "rooted";
  return "none";
}

export function judgeSpouseStar(star: SpouseStarProfile): JudgedStar {
  let v = 0, r = 0, h = 0, removed = 0;
  const present: boolean[] = [];
  for (const sb of star.subtypes) {
    const branchStages = new Set(sb.visible.filter((x: SpouseStarPositionHit) => x.slot === "지지").map((x) => x.stage));
    const isDuplicate = (x: SpouseStarPositionHit) => x.hidePosition === "본기" && branchStages.has(x.stage);
    const rootedKept = sb.rooted.filter((x) => !isDuplicate(x));
    const hiddenKept = sb.hidden.filter((x) => !isDuplicate(x));
    removed += sb.rooted.length - rootedKept.length + (sb.hidden.length - hiddenKept.length);
    v += sb.visible.length; r += rootedKept.length; h += hiddenKept.length;
    present.push(sb.visible.length + sb.rooted.length + sb.hidden.length > 0);
  }
  const presence: Presence = present[0] && present[1] ? "both" : present[0] ? "A" : present[1] ? "B" : "none";
  return { presence, visible: v, rooted: r, hidden: h, removedDuplicates: removed, shape: shapeOf(v, r, h) };
}
