// 영업 활동 선행지표 비교 (추가 기능 4번)
// 결과(수주)보다 앞서 움직이는 활동량을 팀원별로 비교합니다.
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { addDays, md, startOfDay, weekRange } from "@/lib/format";

export const dynamic = "force-dynamic";

type Metric = { key: string; label: string; unit: string; desc: string; lowerIsBetter?: boolean; fmt?: (n: number) => string };
const METRICS: Metric[] = [
  { key: "cards", label: "신규 명함 등록", unit: "장", desc: "새로 만난 고객 수" },
  { key: "meetings", label: "고객 미팅", unit: "건", desc: "녹음·회의록이 남은 미팅" },
  { key: "calls", label: "통화 기록", unit: "건", desc: "앱에서 남긴 통화" },
  { key: "shares", label: "자료 전송", unit: "건", desc: "브로슈어·규격서 링크 전송" },
  { key: "quotes", label: "견적 발송", unit: "건", desc: "고객에게 보낸 견적서" },
  { key: "confirmRate", label: "회의록 확정률", unit: "%", desc: "미팅 중 회의록을 확정한 비율" },
  { key: "followDays", label: "후속 조치 속도", unit: "일", desc: "미팅 후 같은 고객에게 다음 행동까지 평균 일수", lowerIsBetter: true, fmt: (n) => n.toFixed(1) },
];

export default async function Indicators({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const p = (await searchParams).p === "4w" ? "4w" : "week";
  const now = new Date();
  const from = p === "week" ? weekRange(now).from : startOfDay(addDays(now, -27));
  const inP = (d: Date) => d >= from && d <= now;

  const reps = await db.query.users.findMany({ where: eq(users.role, "REP") });
  const [contacts, meetings, acts, shares, events, quotes] = await Promise.all([
    db.query.contacts.findMany(), db.query.meetings.findMany(), db.query.activities.findMany(),
    db.query.shares.findMany(), db.query.events.findMany(), db.query.quotes.findMany(),
  ]);

  const rows = reps.map((r) => {
    const ms = meetings.filter((m) => m.ownerId === r.id && inP(m.startedAt));
    // 후속 조치 속도: 미팅 뒤 같은 고객사에 대해 그 영업사원이 남긴 첫 행동(통화·자료·일정 등록)까지 걸린 일수
    const gaps = ms
      .map((m) => {
        const after = [
          ...acts.filter((a) => a.userId === r.id && a.companyId === m.companyId && a.type !== "MEETING" && a.createdAt > m.startedAt).map((a) => a.createdAt),
          ...events.filter((e) => e.ownerId === r.id && e.companyId === m.companyId && e.createdAt > m.startedAt).map((e) => e.createdAt),
        ].sort((a, b) => a.getTime() - b.getTime())[0];
        return after ? (after.getTime() - m.startedAt.getTime()) / 86400000 : null;
      })
      .filter((x): x is number => x !== null);
    return {
      r,
      v: {
        cards: contacts.filter((c) => c.createdById === r.id && inP(c.createdAt)).length,
        meetings: ms.length,
        calls: acts.filter((a) => a.userId === r.id && a.type === "CALL" && inP(a.createdAt)).length,
        shares: shares.filter((s) => s.userId === r.id && inP(s.createdAt)).length,
        quotes: quotes.filter((q) => q.ownerId === r.id && q.sentAt && inP(q.sentAt)).length,
        confirmRate: ms.length ? Math.round((ms.filter((m) => m.status === "CONFIRMED").length / ms.length) * 100) : 0,
        followDays: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : NaN,
      } as Record<string, number>,
    };
  });

  return (
    <>
      <header className="page-head">
        <div className="stack" style={{ gap: 4 }}>
          <span className="small muted">{md(from)} – {md(now)} · 팀원 {reps.length}명</span>
          <h1 className="page-title">선행지표 비교</h1>
        </div>
        <div className="row">
          <Link href="/admin/indicators" className={`chip ${p === "week" ? "on" : ""}`} style={{ display: "inline-flex", alignItems: "center" }}>이번 주</Link>
          <Link href="/admin/indicators?p=4w" className={`chip ${p === "4w" ? "on" : ""}`} style={{ display: "inline-flex", alignItems: "center" }}>최근 4주</Link>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {METRICS.map((mt) => {
          const vals = rows.map((x) => x.v[mt.key]).filter((n) => !Number.isNaN(n));
          const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          const max = Math.max(mt.unit === "%" ? 100 : 1, ...vals);
          const fmt = mt.fmt ?? ((n: number) => String(Math.round(n)));
          return (
            <section key={mt.key} className="card stack" style={{ gap: 12 }}>
              <div className="stack" style={{ gap: 2 }}>
                <div className="between"><h2 style={{ fontSize: 15 }}>{mt.label}</h2><span className="xs muted">팀 평균 {Number.isInteger(avg) ? avg : avg.toFixed(1)}{mt.unit}</span></div>
                <span className="xs muted">{mt.desc}{mt.lowerIsBetter ? " · 짧을수록 좋음" : ""}</span>
              </div>
              <div className="stack" style={{ gap: 8 }} role="list">
                {rows.map(({ r, v }) => {
                  const n = v[mt.key];
                  const none = Number.isNaN(n);
                  const good = !none && (mt.lowerIsBetter ? n <= avg : n >= avg);
                  return (
                    <div key={r.id} role="listitem" style={{ display: "grid", gridTemplateColumns: "56px 1fr 56px", alignItems: "center", gap: 8 }}>
                      <span className="small">{r.name}</span>
                      <span style={{ position: "relative", height: 14, background: "var(--subtle)", borderRadius: 4 }}>
                        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: none ? 0 : `${(n / max) * 100}%`, borderRadius: 4, background: good ? "var(--primary)" : "#9cc8e8" }} />
                        <span aria-hidden="true" style={{ position: "absolute", top: -3, bottom: -3, left: `${(avg / max) * 100}%`, width: 2, background: "var(--text)" }} />
                      </span>
                      <span className="small bold" style={{ textAlign: "right" }}>{none ? "-" : `${fmt(n)}${mt.unit}`}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <p className="xs muted" style={{ margin: 0 }}>
        세로선은 팀 평균, 진한 막대는 평균 이상(후속 조치 속도는 평균 이하)입니다. 고객 회신 속도는 메일 연동(2단계) 후에 추가됩니다.
      </p>
    </>
  );
}
