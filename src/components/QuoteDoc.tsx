// 견적서 본문 (앱 미리보기·고객용 링크·인쇄에서 함께 씁니다)
// 표: 품목 | 단가 | 발송량 | 금액 | 비고, 아래에 합계
import { won, VAT_RATE } from "@/lib/quotes";

type Item = { name: string; unit: string; qty: number; unitPrice: number; note: string | null };
export type QuoteDocData = {
  title: string; version: number; createdAt: Date; validUntil: Date | null; note: string | null;
  toCompany: string; toContact: string | null;
  seller: { name: string; ceo: string; address: string; bizNo: string; logo: string | null };
  sellerPerson: string; sellerTeam: string; sellerEmail: string; sellerPhone: string | null;
  items: Item[]; total: number;
};
const d = (x: Date) => `${x.getFullYear()}년 ${x.getMonth() + 1}월 ${x.getDate()}일`;

export function QuoteDoc({ q }: { q: QuoteDocData }) {
  const vat = Math.round(q.total * VAT_RATE);
  const cell: React.CSSProperties = { padding: "8px 6px", borderBottom: "1px solid var(--border)", verticalAlign: "top" };
  const num: React.CSSProperties = { ...cell, textAlign: "right", whiteSpace: "nowrap" };
  const head: React.CSSProperties = { ...cell, background: "var(--bg)", fontWeight: 600, color: "var(--text-body)", fontSize: 12, borderTop: "1.5px solid var(--text)" };
  const sum: React.CSSProperties = { ...cell, fontWeight: 600 };
  const line = (k: string, v: string | null | undefined) =>
    v ? (
      <div style={{ display: "flex", gap: 8 }}>
        <span className="muted" style={{ minWidth: 52, flexShrink: 0 }}>{k}</span>
        <span style={{ wordBreak: "break-all" }}>{v}</span>
      </div>
    ) : null;

  return (
    <article className="card stack quote-doc" style={{ gap: 18, padding: 20 }}>
      <div className="between" style={{ alignItems: "center", gap: 12 }}>
        {q.seller.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.seller.logo} alt={q.seller.name} style={{ height: 28, width: "auto", maxWidth: 160, objectFit: "contain" }} />
        ) : (
          <b style={{ fontSize: 15 }}>{q.seller.name}</b>
        )}
        <span className="xs muted" style={{ textAlign: "right" }}>{d(q.createdAt)}{q.version > 1 ? ` · ${q.version}차` : ""}</span>
      </div>
      <h1 style={{ fontSize: 24, letterSpacing: "0.3em", textAlign: "center", margin: "4px 0" }}>견 적 서</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
        <div className="stack" style={{ gap: 4, flex: "1 1 180px", minWidth: 0 }}>
          <span className="xs muted">받는 분</span>
          <b style={{ fontSize: 16 }}>{q.toCompany} 귀중</b>
          {q.toContact && <span>{q.toContact} 님</span>}
          <span className="small" style={{ marginTop: 6 }}>아래와 같이 견적합니다.</span>
        </div>
        <div className="stack" style={{ gap: 3, flex: "1 1 220px", minWidth: 0, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
          <span className="xs muted">공급자</span>
          {line("상호", q.seller.name)}
          {line("대표이사", q.seller.ceo)}
          {line("사업자번호", q.seller.bizNo)}
          {line("주소", q.seller.address)}
          {line("담당", `${q.sellerTeam} ${q.sellerPerson}`)}
          {line("연락처", q.sellerPhone)}
          {line("이메일", q.sellerEmail)}
        </div>
      </div>

      <div className="between" style={{ alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
        <b style={{ fontSize: 15 }}>{q.title}</b>
        <span className="small">합계 금액 <b style={{ fontSize: 16 }}>{won(q.total + vat)}</b> <span className="muted">(부가세 포함)</span></span>
      </div>

      <div className="scroll-x">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr>
              <th style={{ ...head, textAlign: "left" }}>품목</th>
              <th style={{ ...head, textAlign: "right" }}>단가</th>
              <th style={{ ...head, textAlign: "right" }}>발송량</th>
              <th style={{ ...head, textAlign: "right" }}>금액</th>
              <th style={{ ...head, textAlign: "left" }}>비고</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((i, k) => (
              <tr key={k}>
                <td style={cell}>{i.name}</td>
                <td style={num}>{won(i.unitPrice)}</td>
                <td style={num}>{i.qty.toLocaleString()}{i.unit}</td>
                <td style={num}>{won(i.qty * i.unitPrice)}</td>
                <td style={{ ...cell, color: "var(--text-body)" }}>{i.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td style={sum} colSpan={3}>공급가액</td><td style={{ ...sum, ...{ textAlign: "right", whiteSpace: "nowrap" } }}>{won(q.total)}</td><td style={sum} /></tr>
            <tr><td style={{ ...cell, color: "var(--muted)" }} colSpan={3}>부가세 (10%)</td><td style={{ ...num, color: "var(--muted)" }}>{won(vat)}</td><td style={cell} /></tr>
            <tr>
              <td style={{ ...sum, fontSize: 14, borderBottom: "1.5px solid var(--text)" }} colSpan={3}>합계</td>
              <td style={{ ...sum, fontSize: 14, textAlign: "right", whiteSpace: "nowrap", borderBottom: "1.5px solid var(--text)" }}>{won(q.total + vat)}</td>
              <td style={{ ...sum, borderBottom: "1.5px solid var(--text)" }} />
            </tr>
          </tfoot>
        </table>
      </div>

      {q.note && <p className="small" style={{ margin: 0, color: "var(--text-body)" }}>조건: {q.note}</p>}
      {q.validUntil && <p className="xs muted" style={{ margin: 0 }}>이 견적은 {d(q.validUntil)}까지 유효합니다.</p>}
    </article>
  );
}
