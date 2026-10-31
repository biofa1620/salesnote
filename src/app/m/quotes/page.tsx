import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, quotes } from "@/db";
import { requireUser } from "@/lib/session";
import { relDay } from "@/lib/format";
import { QUOTE_STATUS, won } from "@/lib/quotes";
import { IBack } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function MyQuotes() {
  const u = await requireUser();
  const list = await db.query.quotes.findMany({ where: eq(quotes.ownerId, u.id), with: { company: true, contact: true }, orderBy: desc(quotes.createdAt) });
  return (
    <div>
      <div className="m-head">
        <div className="row"><Link href="/m" className="back" aria-label="뒤로"><IBack /></Link><h1 style={{ fontSize: 18 }}>내 견적</h1></div>
        <span className="small muted">새 견적은 고객카드의 '견적 작성'에서 만듭니다.</span>
      </div>
      <div className="m-page" style={{ gap: 10 }}>
        {list.length === 0 && <div className="card muted small">아직 견적이 없습니다.</div>}
        {list.map((q) => (
          <Link key={q.id} href={`/m/quotes/${q.id}`} className="card stack" style={{ gap: 6 }}>
            <div className="between">
              <span className="xs muted">{q.company.name}{q.contact ? ` ${q.contact.name}` : ""} · {relDay(q.createdAt)}</span>
              <span className={`badge ${QUOTE_STATUS[q.status].cls}`}>{QUOTE_STATUS[q.status].label}</span>
            </div>
            <b>{q.title}{q.version > 1 ? ` (${q.version}차)` : ""}</b>
            <div className="between small"><span className="muted">{q.status === "SENT" ? (q.openCount ? `고객 열람 ${q.openCount}회` : "고객 미열람") : q.status === "REJECTED" ? "반려 · 수정 필요" : ""}</span><b>{won(q.total)}</b></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
