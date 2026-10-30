import Link from "next/link";
import { and, eq, gte, lt } from "drizzle-orm";
import { db, events } from "@/db";
import { requireUser } from "@/lib/session";
import { hhmm, ymd, md } from "@/lib/format";
import { MonthCalendar, type CalEvent } from "@/components/MonthCalendar";
import { ISpark } from "@/components/Icons";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = { MEETING: "고객 미팅", INTERNAL: "내부", TODO: "할 일" };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ month?: string; date?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const today = new Date();
  const base = sp.date ? new Date(`${sp.date}T00:00`) : sp.month ? new Date(`${sp.month}-01T00:00`) : today;
  const year = base.getFullYear(), month = base.getMonth();
  const from = new Date(year, month, -6), to = new Date(year, month + 1, 7);
  const rows = await db.query.events.findMany({
    where: and(eq(events.ownerId, u.id), gte(events.startAt, from), lt(events.startAt, to)),
    with: { contact: true, meeting: true },
  });
  const list: CalEvent[] = rows.map((e) => ({
    id: e.id, dateKey: ymd(e.startAt), time: hhmm(e.startAt), endTime: hhmm(e.endAt), title: e.title, type: e.type,
    sub: [`${hhmm(e.startAt)}–${hhmm(e.endAt)}`, TYPE_LABEL[e.type], e.contact ? `${e.contact.name} ${e.contact.title ?? ""}` : null, e.location].filter(Boolean).join(" · "),
    href: e.meeting ? `/m/meetings/${e.meeting.id}` : e.contactId ? `/m/customers/${e.contactId}` : undefined,
  }));
  const aiTodos = rows.filter((e) => e.source === "AI" && e.startAt >= today);
  const initialSel = sp.date ?? (today.getFullYear() === year && today.getMonth() === month ? ymd(today) : ymd(new Date(year, month, 1)));

  return (
    <div>
      <MonthCalendar key={`${year}-${month}`} year={year} month={month} events={list} initialSel={initialSel} todayKey={ymd(today)} />
      {aiTodos.length > 0 && (
        <div className="m-page" style={{ paddingTop: 0 }}>
          <div className="card stack" style={{ borderColor: "#c5cbff", gap: 8 }}>
            <span className="row xs bold" style={{ color: "var(--primary)", gap: 6 }}><ISpark size={16} color="var(--primary)" />회의록에서 찾아 등록한 일정</span>
            {aiTodos.map((e) => (
              <Link key={e.id} href={`/m/schedule?date=${ymd(e.startAt)}`} className="between small">
                <span>{e.title}</span><span className="muted">{md(e.startAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
