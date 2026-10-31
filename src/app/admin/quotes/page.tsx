// 견적 승인 (정가 외 금액은 팀장 승인) + 상품·정가 관리
import { asc, desc } from "drizzle-orm";
import { db, quotes, products } from "@/db";
import { decideQuote, saveProduct } from "@/app/actions";
import { hhmm, md, relDay } from "@/lib/format";
import { QUOTE_STATUS, won } from "@/lib/quotes";

export const dynamic = "force-dynamic";

export default async function Quotes() {
  const all = await db.query.quotes.findMany({ with: { company: true, contact: true, owner: true, items: true }, orderBy: desc(quotes.createdAt) });
  const pending = all.filter((q) => q.status === "PENDING");
  const prods = await db.query.products.findMany({ orderBy: asc(products.name) });
  const now = new Date();
  const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);

  return (
    <>
      <header className="page-head">
        <div className="stack" style={{ gap: 4 }}>
          <span className="small muted">정가와 다른 단가가 들어간 견적은 팀장 승인 뒤에 고객에게 보낼 수 있습니다</span>
          <h1 className="page-title">견적</h1>
        </div>
        <span className={`badge ${pending.length ? "warn" : "gray"}`}>승인 대기 {pending.length}건</span>
      </header>

      <section className="stack" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 17 }}>승인 대기</h2>
        {pending.length === 0 && <div className="card muted">대기 중인 견적이 없습니다.</div>}
        {pending.map((q) => (
          <article key={q.id} className="card stack" style={{ gap: 12, borderColor: "var(--warn-line)" }}>
            <div className="between wrap">
              <div className="stack" style={{ gap: 2 }}>
                <b style={{ fontSize: 16 }}>{q.company.name} · {q.title}{q.version > 1 ? ` (${q.version}차)` : ""}</b>
                <span className="small muted">{q.owner.name} · {relDay(q.createdAt, now)} {hhmm(q.createdAt)}{q.note ? ` · 조건: ${q.note}` : ""}</span>
              </div>
              <div className="stack" style={{ gap: 0, alignItems: "flex-end" }}>
                <b style={{ fontSize: 18 }}>{won(q.total)}</b>
                <span className="small" style={{ color: "var(--warn)" }}>정가 {won(q.totalList)} 대비 {pct(q.total, q.totalList)}%</span>
              </div>
            </div>
            <div className="scroll-x">
              <table className="tbl" style={{ minWidth: 560 }}>
                <thead><tr><th>품목</th><th className="num">수량</th><th className="num">정가</th><th className="num">견적 단가</th><th className="num">차이</th><th className="num">금액</th></tr></thead>
                <tbody>
                  {[...q.items].sort((a, b) => a.sort - b.sort).map((i) => (
                    <tr key={i.id}>
                      <td>{i.name}</td><td className="num">{i.qty.toLocaleString()}{i.unit}</td><td className="num">{won(i.listPrice)}</td>
                      <td className="num" style={i.unitPrice !== i.listPrice ? { color: "var(--warn)", fontWeight: 600 } : undefined}>{won(i.unitPrice)}</td>
                      <td className="num">{i.unitPrice === i.listPrice ? "-" : `${pct(i.unitPrice, i.listPrice)}%`}</td>
                      <td className="num">{won(i.qty * i.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form action={decideQuote} className="row wrap">
              <input type="hidden" name="quoteId" value={q.id} />
              <label className="sr-only" htmlFor={`r-${q.id}`}>반려 사유</label>
              <input id={`r-${q.id}`} name="reason" className="input grow" style={{ height: 40, fontSize: 14, minWidth: 220 }} placeholder="반려할 때 사유 (예: 할인 폭 5% 이내로)" />
              <button className="btn sm" name="decision" value="reject" style={{ height: 40 }}>반려</button>
              <button className="btn sm primary" name="decision" value="approve" style={{ height: 40 }}>승인</button>
            </form>
          </article>
        ))}
      </section>

      <div className="cols">
        <section className="card flush col-3 scroll-x">
          <table className="tbl" style={{ minWidth: 620 }}>
            <thead><tr><th>견적</th><th>담당</th><th className="num">금액</th><th>상태</th><th>고객 열람</th></tr></thead>
            <tbody>
              {all.map((q) => (
                <tr key={q.id}>
                  <td><b>{q.company.name}</b> · {q.title}{q.version > 1 ? ` (${q.version}차)` : ""}<br /><span className="xs muted">{md(q.createdAt)}{q.needsApproval ? " · 정가 외" : " · 정가"}</span></td>
                  <td>{q.owner.name}</td>
                  <td className="num">{won(q.total)}</td>
                  <td><span className={`badge ${QUOTE_STATUS[q.status].cls}`}>{QUOTE_STATUS[q.status].label}</span>{q.status === "REJECTED" && q.rejectReason && <><br /><span className="xs muted">{q.rejectReason}</span></>}</td>
                  <td className="small">{q.status === "SENT" ? (q.openCount ? <span style={{ color: "var(--ok)", fontWeight: 600 }}>{q.openCount}회</span> : "미열람") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card col-1 stack" style={{ gap: 10 }}>
          <h2 style={{ fontSize: 16 }}>상품·정가</h2>
          <span className="xs muted">정가(부가세 별도)를 바꾸면 이후 작성하는 견적부터 적용됩니다. 처음 값은 샘플입니다.</span>
          {prods.map((p) => (
            <form key={p.id} action={saveProduct} className="stack" style={{ gap: 6, paddingBottom: 10, borderBottom: "1px solid var(--subtle)" }}>
              <input type="hidden" name="id" value={p.id} />
              <input className="input" name="name" defaultValue={p.name} aria-label="상품명" style={{ height: 36, fontSize: 14 }} />
              <div className="row">
                <input className="input grow" name="listPrice" type="number" min={0} defaultValue={p.listPrice} aria-label="정가(원)" style={{ height: 36, fontSize: 14 }} />
                <input className="input" name="unit" defaultValue={p.unit} aria-label="단위" style={{ height: 36, fontSize: 14, width: 56 }} />
                <button className="btn sm">저장</button>
              </div>
            </form>
          ))}
          <form action={saveProduct} className="stack" style={{ gap: 6 }}>
            <span className="small bold">새 상품</span>
            <input className="input" name="name" placeholder="상품명" required style={{ height: 36, fontSize: 14 }} />
            <div className="row">
              <input className="input grow" name="listPrice" type="number" min={0} placeholder="정가(원)" required style={{ height: 36, fontSize: 14 }} />
              <input className="input" name="unit" placeholder="건" style={{ height: 36, fontSize: 14, width: 56 }} />
              <button className="btn sm primary">추가</button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
