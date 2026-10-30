const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export const pad = (n: number) => String(n).padStart(2, "0");
export const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const md = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
export const mdDow = (d: Date) => `${md(d)} ${DOW[d.getDay()]}요일`;

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const daysBetween = (a: Date, b: Date) =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);

/** "오늘", "어제", "3일 전", "10월 5일" */
export function relDay(d: Date, now = new Date()) {
  const n = daysBetween(d, now);
  if (n === 0) return "오늘";
  if (n === 1) return "어제";
  if (n > 1 && n < 7) return `${n}일 전`;
  return md(d);
}

export const STAGES = ["발굴", "미팅", "제안", "협상", "수주"] as const;
/** MVP 수주확률: 단계 기본값 (기획서 5절 1단계) */
export const STAGE_PROB: Record<string, number> = { 발굴: 10, 미팅: 20, 제안: 40, 협상: 70, 수주: 100, 실주: 0 };

/** 이번 주 (월요일 0시 ~ 다음 주 월요일 0시) */
export function weekRange(now = new Date()) {
  const s = startOfDay(now);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return { from: s, to: addDays(s, 7) };
}
