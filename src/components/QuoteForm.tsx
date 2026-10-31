"use client";
// 견적 작성 (앱). 정가와 다른 단가가 하나라도 있으면 팀장 승인 요청으로 저장됩니다.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createQuote } from "@/app/actions";
import { totals, won } from "@/lib/quotes";
import { IPlus } from "./Icons";

type Product = { id: string; name: string; unit: string; listPrice: number };
type Row = { productId: string; qty: number; unitPrice: number };

export function QuoteForm(p: {
  products: Product[]; contactId: string; contactLabel: string; defaultTitle: string;
  parent?: { id: string; title: string; note: string | null; items: Row[]; rejectReason: string | null } | null;
}) {
  const router = useRouter();
  const first = p.products[0];
  const [title, setTitle] = useState(p.parent?.title ?? p.defaultTitle);
  const [note, setNote] = useState(p.parent?.note ?? "");
  const [validDays, setValidDays] = useState(14);
  const [rows, setRows] = useState<Row[]>(p.parent?.items ?? (first ? [{ productId: first.id, qty: 1, unitPrice: first.listPrice }] : []));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const byId = (id: string) => p.products.find((x) => x.id === id)!;
  const draft = rows.map((r) => ({ ...byId(r.productId), productId: r.productId, qty: r.qty, unitPrice: r.unitPrice }));
  const t = useMemo(() => totals(draft), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await createQuote({ contactId: p.contactId, title, note, validDays, parentId: p.parent?.id ?? null, items: rows });
      router.push(`/m/quotes/${r.id}`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="m-page" style={{ gap: 14 }}>
      {p.parent?.rejectReason && <div className="alert bad"><span className="t">반려 사유</span><span className="small">{p.parent.rejectReason}</span></div>}
      <span className="small muted">받는 분: {p.contactLabel}</span>
      <label className="field">견적 제목<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>

      <section className="stack" style={{ gap: 10 }}>
        <h2 style={{ fontSize: 15 }}>품목</h2>
        {rows.map((r, i) => {
          const pr = byId(r.productId);
          const off = r.unitPrice !== pr.listPrice;
          const rate = pr.listPrice ? Math.round(((r.unitPrice - pr.listPrice) / pr.listPrice) * 100) : 0;
          return (
            <div key={i} className="card stack" style={{ gap: 8, padding: 12, borderColor: off ? "var(--warn-line)" : undefined }}>
              <div className="row">
                <label className="sr-only" htmlFor={`p${i}`}>상품</label>
                <select id={`p${i}`} className="input grow" value={r.productId} onChange={(e) => set(i, { productId: e.target.value, unitPrice: byId(e.target.value).listPrice })}>
                  {p.products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
                {rows.length > 1 && <button type="button" className="btn sm" aria-label="품목 빼기" onClick={() => setRows(rows.filter((_, k) => k !== i))}>빼기</button>}
              </div>
              <div className="grid2" style={{ gap: 8 }}>
                <label className="field">수량 ({pr.unit})<input className="input" type="number" inputMode="numeric" min={1} value={r.qty} onChange={(e) => set(i, { qty: Number(e.target.value) })} /></label>
                <label className="field">단가 (정가 {won(pr.listPrice)})<input className="input" type="number" inputMode="numeric" min={0} value={r.unitPrice} onChange={(e) => set(i, { unitPrice: Number(e.target.value) })} /></label>
              </div>
              <div className="between small">
                {off ? <span className="badge warn">정가 대비 {rate > 0 ? "+" : ""}{rate}%</span> : <span className="badge gray">정가</span>}
                <b>{won(r.qty * r.unitPrice)}</b>
              </div>
            </div>
          );
        })}
        <button type="button" className="btn sm" onClick={() => first && setRows([...rows, { productId: first.id, qty: 1, unitPrice: first.listPrice }])}><IPlus size={16} />품목 추가</button>
      </section>

      <div className="grid2">
        <label className="field">유효 기간 (일)<input className="input" type="number" min={1} value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} /></label>
        <span />
      </div>
      <label className="field">조건·메모 (견적서에 표시)<input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 1년 약정, 월 30만 건 기준" /></label>

      <section className="card stack" style={{ gap: 6 }}>
        <div className="between small"><span className="muted">정가 합계</span><span>{won(t.totalList)}</span></div>
        {t.total !== t.totalList && <div className="between small"><span className="muted">정가 대비</span><span style={{ color: "var(--warn)" }}>{won(t.total - t.totalList)}</span></div>}
        <div className="between"><b>견적 합계 (부가세 별도)</b><b style={{ fontSize: 17 }}>{won(t.total)}</b></div>
        <div className="between small"><span className="muted">부가세 포함</span><span>{won(t.total + t.vat)}</span></div>
      </section>

      {t.needsApproval ? (
        <div className="badge warn" style={{ whiteSpace: "normal", fontWeight: 400, padding: "10px 12px" }}>정가와 다른 단가가 있어 팀장 승인을 받은 뒤 보낼 수 있습니다.</div>
      ) : (
        <div className="badge ok" style={{ whiteSpace: "normal", fontWeight: 400, padding: "10px 12px" }}>모두 정가라 저장 후 바로 보낼 수 있습니다.</div>
      )}
      {err && <span className="badge bad">{err}</span>}
      <button type="button" className="btn primary block" disabled={busy || rows.length === 0} onClick={submit}>
        {busy ? "저장 중…" : t.needsApproval ? "팀장에게 승인 요청" : "견적 저장"}
      </button>
    </div>
  );
}
