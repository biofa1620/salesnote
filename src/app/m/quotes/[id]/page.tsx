import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, quotes } from "@/db";
import { requireUser } from "@/lib/session";
import { hhmm, md } from "@/lib/format";
import { QUOTE_STATUS, won } from "@/lib/quotes";
import { toDoc } from "@/lib/quote-doc";
import { QuoteDoc } from "@/components/QuoteDoc";
import { SendQuoteButton } from "@/components/SendQuoteButton";
import { IBack } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function QuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const q = await db.query.quotes.findFirst({ where: eq(quotes.id, id), with: { company: true, contact: true, owner: true, items: true, approvedBy: true } });
  if (!q) notFound();
  const mine = q.ownerId === u.id;
  const st = QUOTE_STATUS[q.status];
  const label = q.contact ? `${q.contact.name} ${q.contact.title ?? ""}`.trim() : undefined;
  return (
    <div>
      <div className="m-head">
        <div className="between">
          <Link href={q.contactId ? `/m/customers/${q.contactId}` : "/m/quotes"} className="back" aria-label="뒤로"><IBack /></Link>
          <span className={`badge ${st.cls}`}>{st.label}</span>
        </div>
        <h1 style={{ fontSize: 19 }}>{q.title}{q.version > 1 ? ` (${q.version}차)` : ""}</h1>
        <span className="small muted">{q.company.name}{label ? ` ${label}` : ""} · {won(q.total)} (부가세 별도)</span>
      </div>
      <div className="m-page" style={{ gap: 14 }}>
        {q.status === "PENDING" && <div className="alert warn"><span className="t">팀장 승인 대기 중</span><span className="small">정가와 다른 단가가 있어 승인 후 보낼 수 있습니다. 정가 합계 {won(q.totalList)}</span></div>}
        {q.status === "REJECTED" && (
          <div className="alert bad">
            <span className="t">반려됨{q.approvedBy ? ` · ${q.approvedBy.name}` : ""}</span>
            <span className="small">사유: {q.rejectReason}</span>
            {mine && <Link href={`/m/quotes/new?from=${q.id}`} className="btn sm primary" style={{ alignSelf: "flex-start", marginTop: 6 }}>수정해서 다시 요청</Link>}
          </div>
        )}
        {q.status === "SENT" && (
          <div className="alert" style={{ background: q.openCount ? "var(--ok-bg)" : "var(--subtle)" }}>
            <span className="t" style={{ color: q.openCount ? "var(--ok)" : "var(--text-body)" }}>{q.openCount ? `고객이 ${q.openCount}회 열람했습니다` : "아직 고객이 열어 보지 않았습니다"}</span>
            <span className="small">발송 {q.sentAt ? `${md(q.sentAt)} ${hhmm(q.sentAt)}` : ""}{q.firstOpenedAt ? ` · 첫 열람 ${md(q.firstOpenedAt)} ${hhmm(q.firstOpenedAt)}` : ""}</span>
          </div>
        )}
        {mine && (q.status === "APPROVED" || q.status === "SENT") && <SendQuoteButton quoteId={q.id} contactLabel={label} again={q.status === "SENT"} />}
        <QuoteDoc q={toDoc(q)} />
        {mine && q.status === "SENT" && <Link href={`/m/quotes/new?from=${q.id}`} className="btn block">수정 견적 만들기</Link>}
      </div>
    </div>
  );
}
