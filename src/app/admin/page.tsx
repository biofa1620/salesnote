import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, users, meetings, activities } from "@/db";
import { addDays, daysBetween, hhmm, md, relDay, weekRange } from "@/lib/format";
import { lastContactByCompany, dealHealth } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const now = new Date();
  const { from, to } = weekRange(now);
  const inWeek = (d: Date) => d >= from && d < to;

  const reps = await db.query.users.findMany({ where: eq(users.role, "REP") });
  const allMeetings = await db.query.meetings.findMany({ with: { company: true, owner: true, comments: true }, orderBy: desc(meetings.startedAt) });
  const allEvents = await db.query.events.findMany();
  const allContacts = await db.query.contacts.findMany();
  const allActs = await db.query.activities.findMany({ with: { user: true, company: true }, orderBy: desc(activities.createdAt) });
  const allDeals = await db.query.deals.findMany({ with: { company: true, owner: true } });
  const last = await lastContactByCompany();

  const weekVisits = allEvents.filter((e) => e.type === "MEETING" && inWeek(e.startAt) && e.startAt <= now);
  const weekMeetings = allMeetings.filter((m) => inWeek(m.startedAt));
  const confirmed = weekMeetings.filter((m) => m.status === "CONFIRMED").length;
  const newCards = allContacts.filter((c) => inWeek(c.createdAt)).length;
  const newCompanies = new Set(allContacts.filter((c) => inWeek(c.createdAt)).map((c) => c.companyId)).size;
  const open = allDeals.filter((d) => d.stage !== "수주" && d.stage !== "실주");
  const stale = open
    .map((d) => ({ d, days: last.get(d.companyId) ? daysBetween(last.get(d.companyId)!, now) : 99 }))
    .filter((x) => x.days >= 14);
  const futureByCompany = new Set(allEvents.filter((e) => e.startAt > now && e.companyId).map((e) => e.companyId));
  const noNext = open.filter((d) => !futureByCompany.has(d.companyId) && !stale.some((s) => s.d.id === d.id));
  const stalled = (await dealHealth()).filter((h) => h.stalled && !stale.some((x) => x.d.id === h.deal.id));
  const competitor = allMeetings.filter((m) => daysBetween(m.startedAt, now) <= 7 && m.summary?.competitor === "있음");

  const rows = reps.map((r) => {
    const mv = weekVisits.filter((e) => e.ownerId === r.id).length;
    const mm = weekMeetings.filter((m) => m.ownerId === r.id);
    const latest = allActs.find((a) => a.userId === r.id);
    return {
      r,
      visits: Math.max(mv, mm.length),
      cards: allContacts.filter((c) => c.createdById === r.id && inWeek(c.createdAt)).length,
      records: `${mm.filter((m) => m.status === "CONFIRMED").length}/${Math.max(mv, mm.length)}`,
      missing: mv > mm.length,
      latest: latest ? `${latest.text} · ${relDay(latest.createdAt, now)}` : "-",
    };
  });

  return (
    <>
      <header className="page-head">
        <div className="stack" style={{ gap: 4 }}>
          <span className="small muted">{md(from)} – {md(addDays(to, -1))}</span>
          <h1 className="page-title">이번 주 팀 영업 현황</h1>
        </div>
        <Link href="/admin/timeline" className="btn sm">활동 전체 보기</Link>
      </header>

      <section className="kpis" aria-label="주요 지표">
        <div className="card kpi"><span className="small muted">고객 미팅</span><b>{weekVisits.length}건</b><span className="xs muted">이번 주 지난 미팅 기준</span></div>
        <div className="card kpi"><span className="small muted">신규 명함</span><b>{newCards}장</b><span className="xs muted">고객사 {newCompanies}곳</span></div>
        <div className="card kpi"><span className="small muted">회의록 확정률</span><b>{weekVisits.length ? Math.round((confirmed / weekVisits.length) * 100) : 0}%</b><span className="xs muted">미팅 {weekVisits.length}건 중 확정 {confirmed}건</span></div>
        <div className="card kpi"><span className="small muted">관리 필요 고객</span><b style={{ color: stale.length ? "var(--bad)" : undefined }}>{stale.length}곳</b><span className="xs muted">14일 이상 연락 없음</span></div>
      </section>

      <div className="cols">
        <section className="card col-2 stack" style={{ gap: 12 }}>
          <h2 style={{ fontSize: 17 }}>팀원별 활동 (이번 주)</h2>
          <div className="scroll-x">
            <table className="tbl" style={{ minWidth: 560 }}>
              <thead><tr><th>팀원</th><th className="num">미팅</th><th className="num">신규 명함</th><th className="num">회의록 확정</th><th>최근 활동</th></tr></thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.r.id}>
                    <td className="bold">{x.r.name}</td>
                    <td className="num">{x.visits}</td>
                    <td className="num">{x.cards}</td>
                    <td className="num" style={x.missing ? { color: "var(--bad)", fontWeight: 600 } : undefined}>{x.records}</td>
                    <td className="muted">{x.latest}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card col-1 stack" style={{ gap: 10 }}>
          <h2 style={{ fontSize: 17 }}>살펴볼 고객</h2>
          {stale.length + competitor.length + noNext.length + stalled.length === 0 && <span className="small muted">지금은 없습니다.</span>}
          {stale.map(({ d, days }) => (
            <Link key={d.id} href={`/admin/customers?id=${d.companyId}`} className="alert bad">
              <span className="t">{d.company.name} · {days >= 99 ? "접촉 기록 없음" : `${days}일째 연락 없음`}</span>
              <span className="small">담당 {d.owner.name} · {d.title}</span>
            </Link>
          ))}
          {stalled.map((h) => (
            <Link key={h.deal.id} href="/admin/pipeline" className="alert bad">
              <span className="t">{h.deal.company.name} · {h.deal.stage} 단계 {h.daysInStage}일째 정체</span>
              <span className="small">담당 {h.deal.owner.name} · {h.deal.title}</span>
            </Link>
          ))}
          {competitor.map((m) => (
            <Link key={m.id} href={`/admin/meetings?id=${m.id}`} className="alert warn">
              <span className="t">{m.company.name} · 경쟁사 언급</span>
              <span className="small">담당 {m.owner.name} · {relDay(m.startedAt, now)} 미팅</span>
            </Link>
          ))}
          {noNext.map((d) => (
            <Link key={d.id} href={`/admin/customers?id=${d.companyId}`} className="alert warn">
              <span className="t">{d.company.name} · 다음 일정 없음</span>
              <span className="small">담당 {d.owner.name} · {d.stage} 단계</span>
            </Link>
          ))}
        </section>
      </div>

      <section className="stack" style={{ gap: 14 }}>
        <div className="between"><h2 style={{ fontSize: 17 }}>최근 미팅 카드</h2><Link href="/admin/meetings" className="link">전체 보기</Link></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {allMeetings.slice(0, 3).map((m) => (
            <Link key={m.id} href={`/admin/meetings?id=${m.id}`} className="card stack" style={{ gap: 8 }}>
              <div className="between"><span className="xs muted">{m.owner.name} · {relDay(m.startedAt, now)} {hhmm(m.startedAt)}</span><span className={`badge ${m.status === "CONFIRMED" ? "ok" : "warn"}`}>{m.status === "CONFIRMED" ? "확정" : "확인 필요"}</span></div>
              <b style={{ fontSize: 15 }}>{m.title}</b>
              <span className="small" style={{ color: "var(--text-body)" }}>{m.summary?.points.slice(0, 2).join(". ")}</span>
              <span className="link">{m.comments.length ? `코멘트 ${m.comments.length}` : "코멘트 남기기"}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
