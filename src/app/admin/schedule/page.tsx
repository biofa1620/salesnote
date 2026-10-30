import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, users, events } from "@/db";
import { answerAccompany } from "@/app/actions";
import { addDays, hhmm, md, ymd, weekRange } from "@/lib/format";

export const dynamic = "force-dynamic";
const DOW = ["월", "화", "수", "목", "금", "토", "일"];

export default async function TeamSchedule({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const offset = Number((await searchParams).w ?? 0) || 0;
  const now = new Date();
  const { from } = weekRange(addDays(now, offset * 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const reps = await db.query.users.findMany({ where: eq(users.role, "REP"), orderBy: asc(users.name) });
  const evs = await db.query.events.findMany({ with: { meeting: true, owner: true, company: true }, orderBy: asc(events.startAt) });
  const week = evs.filter((e) => e.startAt >= from && e.startAt < addDays(from, 7));
  const showWeekend = week.some((e) => e.startAt.getDay() % 6 === 0);
  const cols = showWeekend ? days : days.slice(0, 5);
  const cls = (e: (typeof week)[number]) =>
    e.type === "INTERNAL" ? "internal" : e.type === "TODO" ? "todo"
      : e.accompany === "REQUESTED" ? "accompany"
      : e.type === "MEETING" && e.endAt < now && !e.meeting ? "norecord" : "";
  const label = (e: (typeof week)[number]) =>
    `${hhmm(e.startAt)} ${e.company?.name ?? e.title}${e.accompany === "REQUESTED" ? " · 동행 요청" : e.accompany === "ACCEPTED" ? " · 팀장 동행" : ""}${cls(e) === "norecord" ? " · 회의록 없음" : ""}`;
  const requests = evs.filter((e) => e.accompany === "REQUESTED" && e.endAt >= now);
  const visits = week.filter((e) => e.type === "MEETING");
  const past = visits.filter((e) => e.endAt < now);

  return (
    <>
      <header className="page-head">
        <div className="stack" style={{ gap: 4 }}>
          <span className="small muted">{md(from)} – {md(addDays(from, 6))}</span>
          <h1 className="page-title">팀 일정</h1>
        </div>
        <div className="row wrap" style={{ gap: 16 }}>
          <div className="legend">
            <span><i style={{ background: "var(--primary)" }} />고객 미팅</span>
            <span><i style={{ background: "var(--faint)" }} />내부 일정</span>
            <span><i style={{ background: "var(--warn-line)" }} />동행 요청</span>
            <span><i style={{ background: "var(--bad-line)" }} />회의록 없음</span>
          </div>
          <div className="row">
            <Link className="btn sm" href={`/admin/schedule?w=${offset - 1}`}>지난주</Link>
            <Link className="btn sm" href="/admin/schedule">이번 주</Link>
            <Link className="btn sm" href={`/admin/schedule?w=${offset + 1}`}>다음 주</Link>
          </div>
        </div>
      </header>

      <div className="cols">
        <section className="card flush col-3 scroll-x" style={{ flexGrow: 3 }}>
          <table className="tbl" style={{ minWidth: 760, tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ width: 92 }}>팀원</th>
                {cols.map((d, i) => (
                  <th key={i} style={ymd(d) === ymd(now) ? { color: "var(--primary)", fontWeight: 600 } : undefined}>
                    {DOW[i]} {d.getDate()}{ymd(d) === ymd(now) ? " · 오늘" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reps.map((r) => (
                <tr key={r.id}>
                  <td className="bold">{r.name}</td>
                  {cols.map((d, i) => (
                    <td key={i} style={{ padding: 8, background: ymd(d) === ymd(now) ? "#fbfcfd" : undefined }}>
                      {week.filter((e) => e.ownerId === r.id && ymd(e.startAt) === ymd(d)).map((e) => (
                        <div key={e.id} className={`ev ${cls(e)}`} title={e.title}>{label(e)}</div>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="col-1 stack" style={{ gap: 16 }}>
          <div className="card stack" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 16 }}>동행 요청</h2>
            {requests.length === 0 && <span className="small muted">대기 중인 요청이 없습니다.</span>}
            {requests.map((e) => (
              <div key={e.id} className="stack" style={{ gap: 6, paddingBottom: 10, borderBottom: "1px solid var(--subtle)" }}>
                <b>{e.owner.name} · {e.company?.name ?? e.title}</b>
                <span className="small muted">{md(e.startAt)} {hhmm(e.startAt)}{e.location ? ` · ${e.location}` : ""}</span>
                <form action={answerAccompany} className="row">
                  <input type="hidden" name="eventId" value={e.id} />
                  <button className="btn sm grow" name="answer" value="decline">어려움</button>
                  <button className="btn sm primary grow" name="answer" value="accept">동행 수락</button>
                </form>
              </div>
            ))}
          </div>
          <div className="card stack" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 16 }}>이번 주 미팅 계획 대비</h2>
            <div className="between"><span>예정된 고객 미팅</span><b>{visits.length}건</b></div>
            <div className="between"><span>지난 미팅 중 회의록 확정</span><b>{past.filter((e) => e.meeting?.status === "CONFIRMED").length}건</b></div>
            <div className="between" style={{ color: "var(--bad)" }}><span>회의록 없음</span><b>{past.filter((e) => !e.meeting).length}건</b></div>
          </div>
        </section>
      </div>
    </>
  );
}
