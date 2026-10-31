import Link from "next/link";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db, events, meetings, deals, quotes } from "@/db";
import { inArray } from "drizzle-orm";
import { requireUser } from "@/lib/session";
import { addDays, hhmm, mdDow, md, startOfDay, daysBetween, ymd } from "@/lib/format";
import { lastContactByCompany, dealHealth } from "@/lib/queries";
import { ICamera, IMic } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function MobileHome() {
  const u = await requireUser();
  const today = startOfDay();
  const todays = await db.query.events.findMany({
    where: and(eq(events.ownerId, u.id), gte(events.startAt, today), lt(events.startAt, addDays(today, 1))),
    with: { company: true, contact: true },
    orderBy: asc(events.startAt),
  });
  const visits = todays.filter((e) => e.type !== "TODO");
  const drafts = await db.query.meetings.findMany({ where: and(eq(meetings.ownerId, u.id), eq(meetings.status, "DRAFT")) });
  const todos = await db.query.events.findMany({
    where: and(eq(events.ownerId, u.id), eq(events.type, "TODO"), gte(events.startAt, today), lt(events.startAt, addDays(today, 8))),
    orderBy: asc(events.startAt),
  });
  const myDeals = await db.query.deals.findMany({ where: eq(deals.ownerId, u.id), with: { company: true } });
  const last = await lastContactByCompany();
  const stale = myDeals
    .map((d) => ({ d, days: last.get(d.companyId) ? daysBetween(last.get(d.companyId)!, new Date()) : 99 }))
    .filter((x) => x.days >= 14 && x.d.stage !== "수주" && x.d.stage !== "실주");

  const stalled = (await dealHealth()).filter((h) => h.deal.ownerId === u.id && h.stalled && !stale.some((x) => x.d.id === h.deal.id));

  const qTodo = await db.query.quotes.findMany({ where: and(eq(quotes.ownerId, u.id), inArray(quotes.status, ["APPROVED", "REJECTED"])), with: { company: true } });

  return (
    <div className="m-page">
      <header className="between" style={{ alignItems: "flex-start" }}>
        <div className="stack" style={{ gap: 4 }}>
          <span className="muted small">{mdDow(today)}</span>
          <h1 className="m-title">{u.name}님, 오늘 미팅 {visits.filter((v) => v.type === "MEETING").length}건</h1>
        </div>
        <Link href="/login" className="avatar" aria-label="사용자 바꾸기" title="사용자 바꾸기">{u.name.slice(0, 1)}</Link>
      </header>

      <Link href="/m/scan" className="row" style={{ gap: 14, padding: 16, borderRadius: 12, background: "var(--primary)", color: "#fff" }}>
        <span style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ICamera size={24} color="#fff" />
        </span>
        <span className="stack" style={{ gap: 2 }}>
          <b style={{ fontSize: 16 }}>명함 촬영</b>
          <span className="small" style={{ opacity: 0.85 }}>찍으면 고객카드가 자동으로 만들어집니다</span>
        </span>
      </Link>

      <div className="grid2" style={{ gap: 10 }}>
        <Link href="/m/materials" className="card stack" style={{ padding: "12px 14px", gap: 2 }}>
          <b>자료 보내기</b><span className="xs muted">브로슈어·규격서 링크 전송</span>
        </Link>
        <Link href="/m/quotes" className="card stack" style={{ padding: "12px 14px", gap: 2 }}>
          <b>내 견적</b><span className="xs muted">승인·발송·열람 확인</span>
        </Link>
      </div>

      <section className="stack" style={{ gap: 10 }}>
        <div className="between">
          <h2 className="m-section-title">오늘 일정</h2>
          <Link href="/m/schedule" className="link">전체 일정</Link>
        </div>
        {visits.length === 0 && <div className="card muted small">오늘 잡힌 일정이 없습니다.</div>}
        {visits.map((e) => {
          const mins = Math.round((e.endAt.getTime() - e.startAt.getTime()) / 60000);
          return (
            <div key={e.id} className="card stack" style={{ gap: 12 }}>
              <Link href={e.contactId ? `/m/customers/${e.contactId}` : "/m/schedule"} className="row" style={{ gap: 14, alignItems: "flex-start" }}>
                <span className="stack" style={{ gap: 0, alignItems: "center", minWidth: 48 }}>
                  <b style={{ fontSize: 15, color: e.type === "MEETING" ? "var(--primary)" : "var(--text-body)" }}>{hhmm(e.startAt)}</b>
                  <span className="xs muted">{mins}분</span>
                </span>
                <span className="stack" style={{ gap: 3 }}>
                  <b style={{ fontSize: 15 }}>{e.title}</b>
                  <span className="small muted">
                    {[e.contact ? `${e.contact.name} ${e.contact.title ?? ""}` : e.type === "INTERNAL" ? "내부 일정" : null, e.location].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </Link>
              {e.type === "MEETING" && e.companyId && (
                <div className="row">
                  {e.contactId && <Link href={`/m/customers/${e.contactId}`} className="btn sm grow">사전 브리핑</Link>}
                  <Link href={`/m/record?eventId=${e.id}`} className="btn sm soft grow"><IMic size={18} />녹음 시작</Link>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="stack" style={{ gap: 10 }}>
        <h2 className="m-section-title">해야 할 일</h2>
        <div className="card flush">
          {drafts.length + todos.length + stale.length + stalled.length + qTodo.length === 0 && <div className="list-row muted small">밀린 일이 없습니다.</div>}
          {qTodo.map((q) => (
            <Link key={q.id} href={`/m/quotes/${q.id}`} className="list-row">
              <span className={`badge ${q.status === "APPROVED" ? "primary" : "bad"}`}>{q.status === "APPROVED" ? "견적 승인됨" : "견적 반려"}</span>
              <span className="grow">{q.company.name} · {q.status === "APPROVED" ? "고객에게 보내기" : "수정 필요"}</span>
            </Link>
          ))}
          {drafts.map((m) => (
            <Link key={m.id} href={`/m/meetings/${m.id}`} className="list-row">
              <span className="badge warn">확정 필요</span><span className="grow">{m.title} 회의록 확인</span>
            </Link>
          ))}
          {todos.map((t) => (
            <Link key={t.id} href={`/m/schedule?date=${ymd(t.startAt)}`} className="list-row">
              <span className="badge info">{daysBetween(today, t.startAt) === 0 ? "오늘까지" : md(t.startAt)}</span><span className="grow">{t.title}</span>
            </Link>
          ))}
          {stalled.map((h) => (
            <Link key={h.deal.id} href="/m/customers" className="list-row">
              <span className="badge bad">딜 정체</span><span className="grow">{h.deal.company.name} · {h.deal.stage} 단계 {h.daysInStage}일째</span>
            </Link>
          ))}
          {stale.map(({ d, days }) => (
            <Link key={d.id} href="/m/customers" className="list-row">
              <span className="badge bad">연락 필요</span><span className="grow">{d.company.name} · {days >= 99 ? "접촉 기록 없음" : `${days}일째 연락 없음`}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
