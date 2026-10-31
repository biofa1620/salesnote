import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, contacts, activities, meetings, events, deals, quotes } from "@/db";
import { QUOTE_STATUS, won } from "@/lib/quotes";
import { logCall, setDealStage } from "@/app/actions";
import { STAGES, hhmm, md, relDay } from "@/lib/format";
import { IBack, ICalendar, IMail, IMic, INote } from "@/components/Icons";
import { CallButton } from "@/components/CallButton";
import { CompanyInfoPanel } from "@/components/CompanyInfoPanel";
import { STALL_DAYS } from "@/lib/queries";

export const dynamic = "force-dynamic";

const btn = (on: boolean): React.CSSProperties => ({ height: 60, borderRadius: 10, background: on ? "var(--primary-soft)" : "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 12, fontWeight: on ? 600 : 400, color: on ? "var(--primary)" : "var(--text-body)" });

type Item = { at: Date; kind: string; title: string; sub?: string | null; href?: string; future?: boolean };

export default async function CustomerCard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db.query.contacts.findFirst({ where: eq(contacts.id, id), with: { company: true, createdBy: true } });
  if (!c) notFound();
  const deal = await db.query.deals.findFirst({ where: eq(deals.companyId, c.companyId), orderBy: desc(deals.createdAt) });
  const now = new Date();
  const items: Item[] = [];
  for (const e of await db.query.events.findMany({ where: eq(events.companyId, c.companyId) }))
    if (e.startAt > now) items.push({ at: e.startAt, kind: e.type === "TODO" ? "할 일" : "예정", title: e.title, sub: e.location, future: true });
  for (const m of await db.query.meetings.findMany({ where: eq(meetings.companyId, c.companyId) }))
    items.push({ at: m.startedAt, kind: "미팅 · AI 회의록", title: m.title, sub: m.summary?.points[0], href: `/m/meetings/${m.id}` });
  for (const a of await db.query.activities.findMany({ where: eq(activities.companyId, c.companyId) }))
    if (a.type !== "MEETING") items.push({ at: a.createdAt, kind: { CALL: "통화", CARD: "명함 등록", SCHEDULE: "일정", SHARE: "자료 전송", QUOTE: "견적" }[a.type] ?? a.type, title: a.text, sub: a.sub });
  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  const qs = await db.query.quotes.findMany({ where: eq(quotes.companyId, c.companyId), orderBy: desc(quotes.createdAt), limit: 3 });
  const stalledDays = deal ? Math.floor((now.getTime() - deal.stageChangedAt.getTime()) / 86400000) : 0;
  const hasNext = items.some((it) => it.future);
  const stageIdx = deal ? STAGES.indexOf(deal.stage as (typeof STAGES)[number]) : -1;

  return (
    <div>
      <div className="m-head">
        <div className="between">
          <Link href="/m/customers" className="back" aria-label="뒤로"><IBack /></Link>
          <span className="small muted">명함 등록 {md(c.createdAt)} · {c.createdBy.name}</span>
        </div>
        <div className="row" style={{ gap: 14 }}>
          <span className="avatar lg">{c.name.slice(0, 1)}</span>
          <div className="stack" style={{ gap: 2 }}>
            <b style={{ fontSize: 20 }}>{c.name} {c.title}</b>
            <span className="muted">{c.company.name}{c.department ? ` · ${c.department}` : ""}</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 8 }}>
          <CallButton contactId={c.id} phone={c.phone} label={`${c.company.name} ${c.name} ${c.title ?? ""}`.trim()} style={btn(false)} />
          {[
            { href: c.email ? `mailto:${c.email}` : "#", icon: <IMail size={20} color="var(--primary)" />, label: "메일" },
            { href: `/m/schedule/new?contactId=${c.id}`, icon: <ICalendar size={20} color="var(--primary)" />, label: "일정" },
            { href: `/m/materials?contactId=${c.id}`, icon: <INote size={20} color="var(--primary)" />, label: "자료" },
            { href: `/m/record?contactId=${c.id}`, icon: <IMic size={20} color="var(--primary)" />, label: "녹음", on: true },
          ].map((a) => (
            <Link key={a.label} href={a.href} style={btn(!!a.on)}>{a.icon}{a.label}</Link>
          ))}
        </div>
      </div>

      <div className="m-page">
        {(c.phone || c.email || c.memo) && (
          <div className="card stack small" style={{ gap: 4 }}>
            {c.phone && <span>휴대폰 {c.phone}</span>}
            {c.email && <span>이메일 {c.email}</span>}
            {c.memo && <span className="muted">메모: {c.memo}</span>}
          </div>
        )}

        {deal && (
          <div className="card stack" style={{ gap: 10 }}>
            <div className="between"><span className="xs muted">진행 중인 딜</span><span className="badge primary">{deal.stage} 단계</span></div>
            {stalledDays >= STALL_DAYS && deal.stage !== "수주" && deal.stage !== "실주" && (
              <span className="badge bad" style={{ whiteSpace: "normal" }}>{deal.stage} 단계에서 {stalledDays}일째 멈춰 있습니다</span>
            )}
            {!hasNext && deal.stage !== "수주" && deal.stage !== "실주" && (
              <Link href={`/m/schedule/new?contactId=${c.id}`} className="badge bad" style={{ whiteSpace: "normal" }}>후속 일정이 없습니다 · 일정 잡기</Link>
            )}
            <b style={{ fontSize: 15 }}>{deal.title}</b>
            <div className="stage-bar">
              {STAGES.map((s, i) => <span key={s} className={i <= stageIdx ? "on" : ""}><i />{s}</span>)}
            </div>
            <form action={setDealStage} className="row">
              <input type="hidden" name="dealId" value={deal.id} />
              <label className="sr-only" htmlFor="stage">단계 변경</label>
              <select id="stage" name="stage" defaultValue={deal.stage} className="input grow" style={{ height: 36, fontSize: 14 }}>
                {[...STAGES, "실주"].map((s) => <option key={s}>{s}</option>)}
              </select>
              <button className="btn sm">단계 변경</button>
            </form>
          </div>
        )}

        <section className="card stack" style={{ gap: 8 }}>
          <div className="between"><h2 style={{ fontSize: 15 }}>견적</h2><Link href={`/m/quotes/new?contactId=${c.id}`} className="btn sm primary">견적 작성</Link></div>
          {qs.length === 0 && <span className="small muted">아직 견적이 없습니다.</span>}
          {qs.map((q) => (
            <Link key={q.id} href={`/m/quotes/${q.id}`} className="between small" style={{ padding: "8px 0", borderTop: "1px solid var(--subtle)" }}>
              <span className="grow">{q.title}{q.version > 1 ? ` (${q.version}차)` : ""}<br /><span className="xs muted">{won(q.total)}{q.status === "SENT" ? ` · ${q.openCount ? `열람 ${q.openCount}회` : "미열람"}` : ""}</span></span>
              <span className={`badge ${QUOTE_STATUS[q.status].cls}`}>{QUOTE_STATUS[q.status].label}</span>
            </Link>
          ))}
        </section>

        <CompanyInfoPanel companyId={c.companyId} bizNo={c.company.bizNo} info={c.company.info ?? null} />

        <details className="card">
          <summary className="bold" style={{ cursor: "pointer" }}>통화 기록 직접 남기기</summary>
          <form action={logCall} className="stack" style={{ marginTop: 12 }}>
            <input type="hidden" name="contactId" value={c.id} />
            <label className="field">통화 시간(분)<input className="input" name="minutes" type="number" min="0" inputMode="numeric" /></label>
            <label className="field">한 줄 메모<input className="input" name="memo" placeholder="예: 견적 회신 일정 확인" /></label>
            <button className="btn primary">기록</button>
          </form>
        </details>

        <section className="stack" style={{ gap: 4 }}>
          <h2 className="m-section-title" style={{ marginBottom: 8 }}>타임라인</h2>
          {items.length === 0 && <span className="small muted">아직 기록이 없습니다.</span>}
          <div className="timeline">
            {items.map((it, i) => {
              const body = (
                <>
                  <span className="xs bold" style={{ color: it.future ? "var(--primary)" : "var(--muted)" }}>{relDay(it.at, now)} {hhmm(it.at)} · {it.kind}</span>
                  <span className="bold">{it.title}</span>
                  {it.sub && <span className="small muted">{it.sub}</span>}
                </>
              );
              return (
                <div key={i} className="tl-item">
                  <div className="tl-rail"><span className={`tl-dot ${it.future ? "on" : ""}`} />{i < items.length - 1 && <span className="tl-line" />}</div>
                  {it.href ? <Link href={it.href} className="tl-body"><div className="card stack" style={{ gap: 4, padding: 12 }}>{body}</div></Link> : <div className="tl-body">{body}</div>}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
