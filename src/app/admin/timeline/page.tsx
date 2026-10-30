import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, users, activities } from "@/db";
import { hhmm, mdDow, relDay, ymd, daysBetween } from "@/lib/format";

export const dynamic = "force-dynamic";

const T: Record<string, { label: string; cls: string; dot: string }> = {
  MEETING: { label: "미팅", cls: "primary", dot: "var(--primary)" },
  CALL: { label: "통화", cls: "ok", dot: "var(--ok)" },
  CARD: { label: "명함", cls: "warn", dot: "var(--warn)" },
  SCHEDULE: { label: "일정", cls: "info", dot: "var(--info)" },
};

export default async function Timeline({ searchParams }: { searchParams: Promise<{ type?: string; user?: string }> }) {
  const sp = await searchParams;
  const type = sp.type && T[sp.type] ? sp.type : "";
  const reps = await db.query.users.findMany({ where: eq(users.role, "REP") });
  const all = await db.query.activities.findMany({ with: { user: true, company: true }, orderBy: desc(activities.createdAt), limit: 300 });
  const list = all.filter((a) => (!type || a.type === type) && (!sp.user || a.userId === sp.user));
  const groups = new Map<string, typeof list>();
  for (const a of list) groups.set(ymd(a.createdAt), [...(groups.get(ymd(a.createdAt)) ?? []), a]);
  const recent = all.filter((a) => daysBetween(a.createdAt, new Date()) <= 2 && (!sp.user || a.userId === sp.user));
  const q = (k: string, v: string) => {
    const p = new URLSearchParams({ ...(sp.user ? { user: sp.user } : {}), ...(type ? { type } : {}), [k]: v });
    if (!v) p.delete(k);
    return `/admin/timeline?${p}`;
  };

  return (
    <>
      <header className="page-head">
        <div className="stack" style={{ gap: 4 }}>
          <span className="small muted">팀원들의 명함·미팅·통화·일정 기록이 시간순으로 쌓입니다</span>
          <h1 className="page-title">활동 타임라인</h1>
        </div>
        <div className="row wrap">
          <Link href={q("user", "")} className={`chip ${!sp.user ? "on" : ""}`} style={{ display: "inline-flex", alignItems: "center" }}>전체 팀원</Link>
          {reps.map((r) => <Link key={r.id} href={q("user", r.id)} className={`chip ${sp.user === r.id ? "on" : ""}`} style={{ display: "inline-flex", alignItems: "center" }}>{r.name}</Link>)}
        </div>
      </header>

      <div className="row wrap" role="group" aria-label="활동 유형">
        <Link href={q("type", "")} className={`chip ${!type ? "on" : ""}`} style={{ display: "inline-flex", alignItems: "center" }}>전체</Link>
        {Object.entries(T).map(([k, v]) => (
          <Link key={k} href={q("type", k)} className={`chip ${type === k ? "on" : ""}`} style={{ display: "inline-flex", alignItems: "center" }}>{k === "MEETING" ? "미팅·회의록" : v.label}</Link>
        ))}
      </div>

      <div className="cols">
        <section className="col-3 stack" style={{ gap: 20 }}>
          {groups.size === 0 && <div className="card muted" style={{ textAlign: "center", borderStyle: "dashed" }}>해당하는 활동이 없습니다</div>}
          {[...groups.entries()].map(([day, items]) => (
            <div key={day} className="stack" style={{ gap: 8 }}>
              <h2 style={{ fontSize: 14, color: "var(--text-body)" }}>{relDay(items[0].createdAt)} · {mdDow(items[0].createdAt)}</h2>
              <div className="card flush">
                {items.map((a) => {
                  const inner = (
                    <>
                      <span className="small muted" style={{ minWidth: 44 }}>{hhmm(a.createdAt)}</span>
                      <span className={`badge ${T[a.type]?.cls ?? "gray"}`}>{T[a.type]?.label ?? a.type}</span>
                      <span className="grow stack" style={{ gap: 2 }}>
                        <span><b>{a.user.name}</b> · {a.text}</span>
                        {a.sub && <span className="small muted">{a.sub}</span>}
                      </span>
                    </>
                  );
                  const href = a.link ?? (a.companyId ? `/admin/customers?id=${a.companyId}` : undefined);
                  return href ? <Link key={a.id} href={href} className="list-row" style={{ alignItems: "flex-start" }}>{inner}</Link>
                    : <div key={a.id} className="list-row" style={{ alignItems: "flex-start" }}>{inner}</div>;
                })}
              </div>
            </div>
          ))}
        </section>
        <aside className="card col-1 stack" style={{ gap: 12 }}>
          <h2 style={{ fontSize: 16 }}>최근 3일 활동</h2>
          {Object.entries(T).map(([k, v]) => (
            <div key={k} className="between">
              <span className="row" style={{ color: "var(--text-body)" }}><i style={{ width: 8, height: 8, borderRadius: 99, background: v.dot }} />{v.label}</span>
              <b>{recent.filter((a) => a.type === k).length}건</b>
            </div>
          ))}
          <p className="xs muted" style={{ margin: 0 }}>통화는 앱에서 남긴 통화 기록만 표시됩니다. 통화 녹음은 하지 않습니다.</p>
        </aside>
      </div>
    </>
  );
}
