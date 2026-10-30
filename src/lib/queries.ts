import { db } from "@/db";

/** 고객사별 마지막 접촉일 (활동·미팅·지난 일정 중 가장 최근) */
export async function lastContactByCompany() {
  const now = new Date();
  const map = new Map<string, Date>();
  const bump = (id: string | null, d: Date) => {
    if (!id || d > now) return;
    const cur = map.get(id);
    if (!cur || d > cur) map.set(id, d);
  };
  for (const a of await db.query.activities.findMany()) bump(a.companyId, a.createdAt);
  for (const m of await db.query.meetings.findMany()) bump(m.companyId, m.startedAt);
  for (const e of await db.query.events.findMany()) if (e.type !== "TODO") bump(e.companyId, e.startAt);
  return map;
}

export const STALL_DAYS = 10;

/** 딜 건강 상태: 같은 단계에 머문 일수, 다음 일정, 경고 (추가 기능 3번) */
export async function dealHealth() {
  const now = new Date();
  const ds = await db.query.deals.findMany({ with: { company: true, owner: true } });
  const evs = await db.query.events.findMany();
  return ds.map((d) => {
    const next = evs
      .filter((e) => e.companyId === d.companyId && e.startAt > now)
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0];
    const closed = d.stage === "수주" || d.stage === "실주";
    const daysInStage = Math.floor((now.getTime() - d.stageChangedAt.getTime()) / 86400000);
    const stalled = !closed && daysInStage >= STALL_DAYS;
    const noNext = !closed && !next;
    return { deal: d, daysInStage, next, stalled, noNext, warn: stalled || noNext };
  });
}
