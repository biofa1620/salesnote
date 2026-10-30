import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, meetings, comments } from "@/db";
import { addActionToSchedule, saveMeeting } from "@/app/actions";
import { requireUser } from "@/lib/session";
import { addDays, hhmm, md, ymd } from "@/lib/format";
import { IBack, ISpark } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function MeetingCard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const editing = (await searchParams).edit === "1";
  const m = await db.query.meetings.findFirst({ where: eq(meetings.id, id), with: { company: true, owner: true } });
  if (!m) notFound();
  const cms = await db.query.comments.findMany({ where: eq(comments.meetingId, id), with: { author: true }, orderBy: asc(comments.createdAt) });
  const s = m.summary ?? { points: [], products: "", budget: "", decisionMaker: "", competitor: "", concern: "", nextActions: [] };
  const mine = m.ownerId === u.id;
  const hidden = (
    <>
      <input type="hidden" name="id" value={m.id} />
      <input type="hidden" name="points" value={s.points.join("\n")} />
      {(["products", "budget", "decisionMaker", "competitor", "concern"] as const).map((k) => <input key={k} type="hidden" name={k} value={s[k]} />)}
      <input type="hidden" name="nextActions" value={s.nextActions.map((a) => (a.due ? `${a.text} | ${a.due}` : a.text)).join("\n")} />
    </>
  );

  return (
    <div>
      <div className="m-head">
        <div className="between">
          <Link href="/m/meetings" className="back" aria-label="뒤로"><IBack /></Link>
          <span className={`badge ${m.status === "CONFIRMED" ? "ok" : "warn"} row`} style={{ gap: 4 }}>
            {m.status === "CONFIRMED" ? "확정" : <><ISpark size={14} color="var(--warn)" />AI 작성 · 확인 필요</>}
          </span>
        </div>
        <h1 style={{ fontSize: 20 }}>{m.title}</h1>
        <span className="small muted">{md(m.startedAt)} {hhmm(m.startedAt)} · {Math.max(1, Math.round(m.durationSec / 60))}분{m.attendees ? ` · ${m.attendees}` : ""}</span>
      </div>

      {editing && mine ? (
        <form action={saveMeeting} className="m-page" style={{ gap: 14 }}>
          <input type="hidden" name="id" value={m.id} />
          <label className="field">핵심 요약 (한 줄에 하나)<textarea className="input" name="points" rows={4} defaultValue={s.points.join("\n")} /></label>
          <div className="grid2">
            <label className="field">관심 상품<input className="input" name="products" defaultValue={s.products} /></label>
            <label className="field">예산·일정<input className="input" name="budget" defaultValue={s.budget} /></label>
            <label className="field">의사결정자<input className="input" name="decisionMaker" defaultValue={s.decisionMaker} /></label>
            <label className="field">경쟁사 언급<input className="input" name="competitor" defaultValue={s.competitor} /></label>
          </div>
          <label className="field">우려 사항<textarea className="input" name="concern" rows={2} defaultValue={s.concern} /></label>
          <label className="field">다음 할 일 (한 줄에 하나, 기한은 | 뒤에)<textarea className="input" name="nextActions" rows={3} defaultValue={s.nextActions.map((a) => (a.due ? `${a.text} | ${a.due}` : a.text)).join("\n")} /></label>
          <div className="row">
            <button className="btn grow" name="intent" value="save">저장</button>
            <button className="btn primary" style={{ flex: 1.4 }} name="intent" value="confirm">확정하고 팀에 공유</button>
          </div>
        </form>
      ) : (
        <div className="m-page" style={{ gap: 12 }}>
          <section className="card stack" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 15 }}>핵심 요약</h2>
            <ul className="points">{s.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </section>
          <section className="card facts" style={{ background: "#fff" }}>
            <span><small>관심 상품</small><b>{s.products || "-"}</b></span>
            <span><small>예산·일정</small><b>{s.budget || "-"}</b></span>
            <span><small>의사결정자</small><b>{s.decisionMaker || "-"}</b></span>
            <span><small>경쟁사 언급</small><b>{s.competitor || "-"}</b></span>
          </section>
          {s.concern && <section className="concern"><h3>우려 사항</h3><span>{s.concern}</span></section>}
          <section className="card stack" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 15 }}>다음 할 일</h2>
            {s.nextActions.length === 0 && <span className="small muted">없음</span>}
            {s.nextActions.map((a, i) => (
              <form key={i} action={addActionToSchedule} className="stack" style={{ gap: 6, paddingBottom: 10, borderBottom: "1px solid var(--subtle)" }}>
                <span>{a.text}{a.due && <span className="small muted"> · {a.due}</span>}</span>
                {mine && (
                  <div className="row">
                    <input type="hidden" name="meetingId" value={m.id} />
                    <input type="hidden" name="text" value={`${m.company.name} · ${a.text}`} />
                    <label className="sr-only" htmlFor={`d${i}`}>날짜</label>
                    <input id={`d${i}`} className="input grow" style={{ height: 36, fontSize: 14 }} type="date" name="date" defaultValue={ymd(addDays(new Date(), 3))} />
                    <button className="btn sm">일정에 추가</button>
                  </div>
                )}
              </form>
            ))}
          </section>

          {cms.length > 0 && (
            <section className="card stack" style={{ gap: 10 }}>
              <h2 style={{ fontSize: 15 }}>팀장 코멘트</h2>
              {cms.map((c) => (
                <div key={c.id} className="row" style={{ alignItems: "flex-start" }}>
                  <span className="avatar sm">{c.author.name.slice(0, 1)}</span>
                  <span className="stack" style={{ gap: 2 }}><span className="small bold">{c.author.name} <span className="muted" style={{ fontWeight: 400 }}>{md(c.createdAt)} {hhmm(c.createdAt)}</span></span><span>{c.text}</span></span>
                </div>
              ))}
            </section>
          )}

          <details className="card">
            <summary className="bold" style={{ cursor: "pointer" }}>녹취록 보기</summary>
            <div className="stack" style={{ marginTop: 12 }}>
              {m.audioPath && !m.audioDeletedAt && <audio controls src={`/api/files/${m.audioPath}`} style={{ width: "100%" }} />}
              {m.audioDeletedAt && <span className="xs muted">녹음 원본은 보관 기간이 지나 삭제되었습니다.</span>}
              {(m.transcript ?? []).map((l, i) => (
                <div key={i} className="stack" style={{ gap: 2 }}>
                  <span className="xs bold" style={{ color: l.speaker === "나" ? "var(--ok)" : "var(--primary)" }}>{l.speaker}</span>
                  <span>{l.text}</span>
                </div>
              ))}
            </div>
          </details>

          {mine && (
            <div className="row">
              <Link href={`/m/meetings/${m.id}?edit=1`} className="btn grow">수정</Link>
              {m.status !== "CONFIRMED" && (
                <form action={saveMeeting} style={{ flex: 1.4, display: "flex" }}>
                  {hidden}
                  <button className="btn primary grow" name="intent" value="confirm">확정하고 팀에 공유</button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
