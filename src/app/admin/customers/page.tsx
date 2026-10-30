import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, companies, deals } from "@/db";
import { STAGES, STAGE_PROB, daysBetween, hhmm, md, relDay } from "@/lib/format";
import { lastContactByCompany } from "@/lib/queries";
import { CompanyInfoPanel } from "@/components/CompanyInfoPanel";

export const dynamic = "force-dynamic";
const GRID = "minmax(0,1.6fr) minmax(0,.8fr) minmax(0,.8fr) minmax(0,1.1fr)";

export default async function Customers({ searchParams }: { searchParams: Promise<{ id?: string; q?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const now = new Date();
  const list = await db.query.companies.findMany({ with: { contacts: { with: { createdBy: true } }, deals: { with: { owner: true }, orderBy: desc(deals.createdAt) } }, orderBy: asc(companies.name) });
  const last = await lastContactByCompany();
  const rows = list
    .filter((c) => !q || c.name.includes(q) || c.contacts.some((p) => p.name.includes(q)))
    .map((c) => {
      const lc = last.get(c.id);
      const days = lc ? daysBetween(lc, now) : null;
      return { c, deal: c.deals[0], lc, days, warn: days === null || days >= 14 };
    });
  const sel = rows.find((r) => r.c.id === sp.id) ?? rows[0];

  let acts: { at: Date; text: string }[] = [];
  let next: { at: Date; title: string } | undefined;
  if (sel) {
    const id = sel.c.id;
    const [a, ms, evs] = await Promise.all([
      db.query.activities.findMany({ where: (t, { eq }) => eq(t.companyId, id), with: { user: true } }),
      db.query.meetings.findMany({ where: (t, { eq }) => eq(t.companyId, id) }),
      db.query.events.findMany({ where: (t, { eq }) => eq(t.companyId, id) }),
    ]);
    acts = [
      ...a.filter((x) => x.type !== "MEETING").map((x) => ({ at: x.createdAt, text: `${x.user.name} · ${x.text}` })),
      ...ms.map((m) => ({ at: m.startedAt, text: `${m.title} · ${m.status === "CONFIRMED" ? "회의록 확정" : "회의록 확인 필요"}` })),
    ].sort((x, y) => y.at.getTime() - x.at.getTime()).slice(0, 6);
    const n = evs.filter((e) => e.startAt > now).sort((x, y) => x.startAt.getTime() - y.startAt.getTime())[0];
    next = n ? { at: n.startAt, title: n.title } : undefined;
  }
  const stageIdx = sel?.deal ? STAGES.indexOf(sel.deal.stage as (typeof STAGES)[number]) : -1;

  return (
    <>
      <header className="page-head">
        <div className="stack" style={{ gap: 4 }}>
          <span className="small muted">팀이 등록한 명함이 고객사별로 모입니다</span>
          <h1 className="page-title">고객사</h1>
        </div>
        <form className="field" action="/admin/customers">
          <label htmlFor="cq">검색</label>
          <input id="cq" name="q" className="input" style={{ width: 240, height: 38, fontSize: 14 }} placeholder="고객사·담당자 이름" defaultValue={q} />
        </form>
      </header>

      <div className="cols">
        <section className="card flush col-3 scroll-x" aria-label="고객사 목록">
          <div style={{ minWidth: 520 }}>
            <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--border)" }} className="xs muted">
              <span>고객사</span><span>담당 영업</span><span>단계</span><span>최근 접촉</span>
            </div>
            {rows.length === 0 && <div className="list-row muted">찾는 고객사가 없습니다.</div>}
            {rows.map(({ c, deal, days, warn }) => (
              <Link key={c.id} href={`/admin/customers?id=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`pick-row ${sel?.c.id === c.id ? "on" : ""}`} style={{ gridTemplateColumns: GRID }}>
                <span className="stack" style={{ gap: 2 }}><b>{c.name}</b><span className="xs muted">{c.industry ?? "업종 미입력"} · 담당자 {c.contacts.length}명</span></span>
                <span>{deal?.owner.name ?? "-"}</span>
                <span>{deal?.stage ?? "-"}</span>
                <span style={warn ? { color: "var(--bad)", fontWeight: 600 } : undefined}>
                  {days === null ? "기록 없음" : days === 0 ? "오늘" : days === 1 ? "어제" : `${days}일 전`}{warn && days !== null ? " · 연락 필요" : ""}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {sel && (
          <article className="card col-2 stack" style={{ padding: 22, gap: 18, flexBasis: 360 }}>
            <div className="stack" style={{ gap: 4 }}>
              <h2 style={{ fontSize: 20 }}>{sel.c.name}</h2>
              <span className="small muted">{sel.c.industry ?? "업종 미입력"}{sel.deal ? ` · 담당 영업 ${sel.deal.owner.name}` : ""}</span>
            </div>
            {sel.deal ? (
              <section className="stack" style={{ gap: 10, padding: "14px 16px", borderRadius: 10, background: "var(--bg)" }}>
                <div className="between"><b>{sel.deal.title}</b><span className="badge primary">{sel.deal.stage}</span></div>
                <div className="stage-bar">{STAGES.map((s, i) => <span key={s} className={i <= stageIdx ? "on" : ""}><i />{s}</span>)}</div>
                <span className="xs muted">단계 기준 수주확률 {STAGE_PROB[sel.deal.stage] ?? 0}%</span>
              </section>
            ) : <span className="small muted">진행 중인 딜이 없습니다.</span>}

            <CompanyInfoPanel key={sel.c.id} compact companyId={sel.c.id} bizNo={sel.c.bizNo} info={sel.c.info ?? null} />

            <section className="stack" style={{ gap: 8 }}>
              <h3 style={{ fontSize: 14 }}>담당자 (명함)</h3>
              {sel.c.contacts.map((p) => (
                <div key={p.id} className="row" style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
                  <span className="avatar sm">{p.name.slice(0, 1)}</span>
                  <span className="grow stack" style={{ gap: 1 }}><b>{p.name}</b><span className="xs muted">{[p.department, p.title].filter(Boolean).join(" · ")}</span></span>
                  <span className="xs muted">등록 {p.createdBy.name}</span>
                </div>
              ))}
            </section>

            <section className="stack" style={{ gap: 8 }}>
              <h3 style={{ fontSize: 14 }}>최근 활동</h3>
              {acts.length === 0 && <span className="small muted">기록이 없습니다.</span>}
              {acts.map((a, i) => (
                <div key={i} className="row" style={{ alignItems: "flex-start", gap: 12 }}>
                  <span className="small muted" style={{ minWidth: 64 }}>{relDay(a.at, now)}</span><span style={{ color: "var(--text-body)" }}>{a.text}</span>
                </div>
              ))}
            </section>

            <div className="between" style={{ paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <span className="muted">다음 일정</span>
              {next ? <b>{md(next.at)} {hhmm(next.at)} · {next.title}</b> : <b style={{ color: "var(--bad)" }}>없음 · 일정 등록 필요</b>}
            </div>
          </article>
        )}
      </div>
    </>
  );
}
