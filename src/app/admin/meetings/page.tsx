import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, meetings, comments, events } from "@/db";
import { addComment } from "@/app/actions";
import { hhmm, md, relDay } from "@/lib/format";

export const dynamic = "force-dynamic";

type Status = "DRAFT" | "CONFIRMED" | "MISSING";
const ST: Record<Status, { label: string; cls: string }> = {
  DRAFT: { label: "확인 필요", cls: "warn" },
  CONFIRMED: { label: "확정", cls: "ok" },
  MISSING: { label: "회의록 없음", cls: "bad" },
};

export default async function MeetingCards({ searchParams }: { searchParams: Promise<{ id?: string; tab?: string; q?: string }> }) {
  const sp = await searchParams;
  const now = new Date();
  const ms = await db.query.meetings.findMany({ with: { company: true, owner: true }, orderBy: desc(meetings.startedAt) });
  // 지난 고객 미팅 일정 중 회의록이 없는 것도 '회의록 없음' 카드로 보여 줍니다.
  const missing = (await db.query.events.findMany({ where: eq(events.type, "MEETING"), with: { meeting: true, company: true, owner: true } }))
    .filter((e) => e.endAt < now && !e.meeting && e.company);
  type Card = { id: string; title: string; who: string; at: Date; status: Status; one: string };
  const cards: Card[] = [
    ...ms.map((m) => ({ id: m.id, title: m.title, who: m.owner.name, at: m.startedAt, status: m.status as Status, one: m.summary?.points.slice(0, 2).join(". ") ?? "" })),
    ...missing.map((e) => ({ id: `ev_${e.id}`, title: e.title.replace(" · ", " "), who: e.owner.name, at: e.startAt, status: "MISSING" as Status, one: "회의록이 작성되지 않았습니다." })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const q = sp.q?.trim() ?? "";
  const tab = (sp.tab as Status) || "";
  const shown = cards.filter((c) => (!tab || c.status === tab) && (!q || c.title.includes(q) || c.who.includes(q)));
  const selId = sp.id ?? shown[0]?.id;
  const sel = cards.find((c) => c.id === selId);
  const m = sel && sel.status !== "MISSING" ? ms.find((x) => x.id === sel.id) : null;
  const ev = sel?.status === "MISSING" ? missing.find((e) => `ev_${e.id}` === sel.id) : null;
  const cms = m ? await db.query.comments.findMany({ where: eq(comments.meetingId, m.id), with: { author: true }, orderBy: asc(comments.createdAt) }) : [];
  const link = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ tab: tab || undefined, q: q || undefined, ...p })) if (v) u.set(k, v);
    return `/admin/meetings?${u}`;
  };

  return (
    <>
      <header className="page-head">
        <div className="stack" style={{ gap: 4 }}>
          <span className="small muted">팀원들의 AI 회의록을 확인하고 코멘트로 코칭합니다</span>
          <h1 className="page-title">미팅 카드</h1>
        </div>
        <form className="field" action="/admin/meetings">
          <label htmlFor="mq">검색</label>
          {tab && <input type="hidden" name="tab" value={tab} />}
          <input id="mq" name="q" className="input" style={{ width: 240, height: 38, fontSize: 14 }} placeholder="고객사·팀원 이름" defaultValue={q} />
        </form>
      </header>

      <div className="row wrap" role="group" aria-label="상태">
        <Link href={link({ tab: undefined, id: undefined })} className={`chip ${!tab ? "on" : ""}`} style={{ display: "inline-flex", alignItems: "center" }}>전체 {cards.length}</Link>
        {(Object.keys(ST) as Status[]).map((k) => (
          <Link key={k} href={link({ tab: k, id: undefined })} className={`chip ${tab === k ? "on" : ""}`} style={{ display: "inline-flex", alignItems: "center" }}>
            {ST[k].label} {cards.filter((c) => c.status === k).length}
          </Link>
        ))}
      </div>

      <div className="cols">
        <section className="col-2 stack" style={{ gap: 10, flexBasis: 380 }} aria-label="미팅 목록">
          {shown.length === 0 && <div className="card muted">해당하는 미팅이 없습니다.</div>}
          {shown.map((c) => (
            <Link key={c.id} href={link({ id: c.id })} className={`pick-card ${c.id === selId ? "on" : ""}`}>
              <span className="between"><span className="xs muted">{c.who} · {relDay(c.at, now)} {hhmm(c.at)}</span><span className={`badge ${ST[c.status].cls}`}>{ST[c.status].label}</span></span>
              <b style={{ fontSize: 15 }}>{c.title}</b>
              <span className="small" style={{ color: "var(--text-body)" }}>{c.one}</span>
            </Link>
          ))}
        </section>

        {sel && (
          <article className="card col-3 stack" style={{ padding: 24, gap: 18 }}>
            <div className="stack" style={{ gap: 6 }}>
              <span className={`badge ${ST[sel.status].cls}`} style={{ alignSelf: "flex-start" }}>{ST[sel.status].label}</span>
              <h2 style={{ fontSize: 20 }}>{sel.title}</h2>
              <span className="small muted">{sel.who} · {md(sel.at)} {hhmm(sel.at)}{m ? ` · ${Math.max(1, Math.round(m.durationSec / 60))}분${m.attendees ? ` · ${m.attendees}` : ""}` : ""}</span>
            </div>

            {m?.summary && (
              <>
                <section className="stack" style={{ gap: 8 }}>
                  <h3 style={{ fontSize: 14 }}>핵심 요약</h3>
                  <ul className="points">{m.summary.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
                </section>
                <section className="facts">
                  <span><small>관심 상품</small><b>{m.summary.products || "-"}</b></span>
                  <span><small>예산·일정</small><b>{m.summary.budget || "-"}</b></span>
                  <span><small>의사결정자</small><b>{m.summary.decisionMaker || "-"}</b></span>
                  <span><small>경쟁사 언급</small><b>{m.summary.competitor || "-"}</b></span>
                </section>
                {m.summary.concern && <section className="concern"><h3>우려 사항</h3><span>{m.summary.concern}</span></section>}
                <section className="stack" style={{ gap: 8 }}>
                  <h3 style={{ fontSize: 14 }}>다음 할 일</h3>
                  {m.summary.nextActions.map((a, i) => (
                    <div key={i} className="between" style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
                      <span>{a.text}</span><span className="small muted">{a.due ?? "기한 없음"}</span>
                    </div>
                  ))}
                </section>
                <details>
                  <summary className="bold" style={{ cursor: "pointer" }}>녹취록 보기</summary>
                  <div className="stack" style={{ marginTop: 10 }}>
                    {(m.transcript ?? []).map((l, i) => <span key={i}><b className="small" style={{ color: "var(--primary)" }}>{l.speaker}</b> {l.text}</span>)}
                  </div>
                </details>
              </>
            )}

            {ev && (
              <div className="alert bad" style={{ padding: 18, gap: 8 }}>
                <span className="t">미팅은 있었지만 회의록이 없습니다</span>
                <span className="small">{ev.owner.name} 님이 녹음이나 음성 메모를 남기지 않았습니다. 담당자에게 작성을 요청해 주세요.</span>
              </div>
            )}

            {m && (
              <section className="stack" style={{ gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <h3 style={{ fontSize: 14 }}>코멘트 {cms.length}</h3>
                {cms.map((c) => (
                  <div key={c.id} className="row" style={{ alignItems: "flex-start" }}>
                    <span className="avatar sm">{c.author.name.slice(0, 1)}</span>
                    <span className="stack" style={{ gap: 2 }}>
                      <span className="small bold">{c.author.name} <span className="muted" style={{ fontWeight: 400 }}>{relDay(c.createdAt, now)} {hhmm(c.createdAt)}</span></span>
                      <span style={{ color: "var(--text-body)" }}>{c.text}</span>
                    </span>
                  </div>
                ))}
                <form action={addComment} className="row">
                  <input type="hidden" name="meetingId" value={m.id} />
                  <label className="sr-only" htmlFor="cmt">코멘트 입력</label>
                  <input id="cmt" name="text" className="input grow" style={{ height: 40, fontSize: 14 }} placeholder="코칭 코멘트를 남기세요" required />
                  <button className="btn primary sm" style={{ height: 40 }}>등록</button>
                </form>
              </section>
            )}
          </article>
        )}
      </div>
    </>
  );
}
