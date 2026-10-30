import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, meetings } from "@/db";
import { requireUser } from "@/lib/session";
import { hhmm, relDay } from "@/lib/format";
import { IMic } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function MyMeetings() {
  const u = await requireUser();
  const list = await db.query.meetings.findMany({ where: eq(meetings.ownerId, u.id), with: { company: true, comments: true }, orderBy: desc(meetings.startedAt) });
  return (
    <div>
      <div className="m-head" style={{ paddingTop: 24 }}>
        <div className="between">
          <h1 className="m-title">회의록</h1>
          <Link href="/m/record" className="btn soft sm"><IMic size={16} />새 녹음</Link>
        </div>
      </div>
      <div className="m-page" style={{ gap: 10 }}>
        {list.length === 0 && <div className="card muted small">아직 회의록이 없습니다. 미팅 때 녹음을 시작해 보세요.</div>}
        {list.map((m) => (
          <Link key={m.id} href={`/m/meetings/${m.id}`} className="card stack" style={{ gap: 6 }}>
            <div className="between">
              <span className="xs muted">{relDay(m.startedAt)} {hhmm(m.startedAt)} · {Math.max(1, Math.round(m.durationSec / 60))}분</span>
              <span className={`badge ${m.status === "CONFIRMED" ? "ok" : "warn"}`}>{m.status === "CONFIRMED" ? "확정" : "확인 필요"}</span>
            </div>
            <b style={{ fontSize: 15 }}>{m.title}</b>
            {m.summary?.points[0] && <span className="small" style={{ color: "var(--text-body)" }}>{m.summary.points[0]}</span>}
            {m.comments.length > 0 && <span className="xs bold" style={{ color: "var(--primary)" }}>팀장 코멘트 {m.comments.length}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
