// 견적서 본문 (앱 미리보기·고객용 링크·인쇄에서 함께 씁니다)
import { won, VAT_RATE } from "@/lib/quotes";

type Item = { name: string; unit: string; qty: number; unitPrice: number };
export type QuoteDocData = {
  title: string; version: number; createdAt: Date; validUntil: Date | null; note: string | null;
  toCompany: string; toContact: string | null; seller: string; sellerPerson: string; sellerTeam: string; sellerEmail: string;
  items: Item[]; total: number;
};
const d = (x: Date) => `${x.getFullYear()}년 ${x.getMonth() + 1}월 ${x.getDate()}일`;

export function QuoteDoc({ q }: { q: QuoteDocData }) {
  const vat = Math.round(q.total * VAT_RATE);
  const cell: React.CSSProperties = { padding: "8px 6px", borderBottom: "1px solid var(--border)" };
  const num: React.CSSProperties = { ...cell, textAlign: "right", whiteSpace: "nowrap" };
  return (
    <article className="card stack quote-doc" style={{ gap: 16, padding: 20 }}>
      <div className="between" style={{ alignItems: "flex-start" }}>
        <h1 style={{ fontSize: 22, letterSpacing: "0.2em" }}>견 적 서</h1>
        <span className="xs muted" style={{ textAlign: "right" }}>{d(q.createdAt)}{q.version > 1 ? ` · ${q.version}차` : ""}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13 }}>
        <div className="stack" style={{ gap: 2, flex: "1 1 140px", minWidth: 0 }}>
          <span className="xs muted">받는 분</span>
          <b style={{ fontSize: 15 }}>{q.toCompany} 귀중</b>
          {q.toContact && <span>{q.toContact} 님</span>}
        </div>
        <div className="stack" style={{ gap: 2, flex: "1 1 140px", minWidth: 0 }}>
          <span className="xs muted">공급자</span>
          <b style={{ fontSize: 15 }}>{q.seller}</b>
          <span>{q.sellerTeam} {q.sellerPerson}</span>
          <span className="muted" style={{ wordBreak: "break-all" }}>{q.sellerEmail}</span>
        </div>
      </div>
      <b style={{ fontSize: 15 }}>{q.title}</b>
      <div className="scroll-x">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
              <th style={cell}>품목</th><th style={num}>수량</th><th style={num}>단가</th><th style={num}>금액</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((i, k) => (
              <tr key={k}>
                <td style={cell}>{i.name}</td>
                <td style={num}>{i.qty.toLocaleString()}{i.unit}</td>
                <td style={num}>{won(i.unitPrice)}</td>
                <td style={num}>{won(i.qty * i.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="stack" style={{ gap: 4, fontSize: 14, alignItems: "flex-end" }}>
        <span>공급가액 {won(q.total)}</span>
        <span className="muted">부가세 {won(vat)}</span>
        <b style={{ fontSize: 18 }}>합계 {won(q.total + vat)}</b>
      </div>
      {q.note && <p className="small" style={{ margin: 0, color: "var(--text-body)" }}>조건: {q.note}</p>}
      {q.validUntil && <p className="xs muted" style={{ margin: 0 }}>이 견적은 {d(q.validUntil)}까지 유효합니다.</p>}
    </article>
  );
}
