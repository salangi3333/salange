/** 풀이 입력 지문(SHA-256) — 서버 전용(Node crypto). 브라우저에서 쓰는 intake.ts 와 분리해 두었다. */
import { createHash } from "crypto";
import type { OrderSubject, ProfileData, SubjectPerson } from "./intake";

const canonPerson = (p: SubjectPerson) => [p.name, p.callName, p.gender, p.calendarType, p.isLeapMonth, p.year, p.month, p.day, p.hour, p.minute, p.timeUnknown];
const canonProfile = (p: ProfileData) => [p.relation, p.jobType, p.jobDetail, [...p.concernCats], p.concernText];
const sha = (v: unknown): string => createHash("sha256").update(JSON.stringify(v), "utf8").digest("hex");

/** 사주 계산에 실제로 쓰는 값만(toV2Intake 와 같은 규칙: 시간 모름이면 시·분은 null/0). 이름·호칭·역할·프로필(직업·관계·고민)은 계산 입력이 아니므로 뺀다. */
const canonSajuPerson = (p: SubjectPerson) => [p.gender, p.calendarType, p.calendarType === "lunar" && p.isLeapMonth, p.year, p.month, p.day, p.timeUnknown ? null : p.hour, p.timeUnknown ? 0 : p.minute, p.timeUnknown];

/**
 * 같은 사주 계산 입력인지 판별하는 지문(신청 횟수 제한 전용). 이름·호칭·직업·고민 문장이 달라도 출생정보·성별·양력/음력·윤달·시간 구분이 같으면 같은 값이다.
 * 주문에 저장하지 않고 필요할 때마다 저장된 대상자 정보에서 다시 계산한다(주문 증명·중복 판정에 쓰는 subjectsSha256 과 별개이며 그 값은 바꾸지 않는다).
 * 로그·응답에 내보내지 않는다(비교에만 쓴다).
 */
export const sajuInputSha256 = (subjects: readonly OrderSubject[]): string => sha(["commerce-saju-input", 1, subjects.map((s) => canonSajuPerson(s.person))]);

/** 풀이 입력 전체(대상자 목록 + 프로필)의 지문. 같은 내용이면 항상 같은 값이다. 역할과 순서도 지문에 들어간다. */
export const subjectsSha256 = (subjects: readonly OrderSubject[], profile: ProfileData): string =>
  sha(["commerce-intake", 1, subjects.map((s) => [s.role, s.order, canonPerson(s.person)]), canonProfile(profile)]);
