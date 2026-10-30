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
