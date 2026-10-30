"use client";
// 기업 신용·재무·공시·뉴스 (추가 기능 1번)
// 명함에는 사업자번호가 없는 경우가 많아, 회사명으로 찾은 후보 중 맞는 회사를 한 번 확인합니다.
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanyInfo } from "@/db/schema";

type Cand = { id: string; name: string; bizNo: string; ceo: string; address: string };
const won = (eok?: number) => (eok === undefined ? "-" : eok >= 10000 ? `${(eok / 10000).toFixed(1)}조 원` : `${eok.toLocaleString()}억 원`);

export function CompanyInfoPanel({ companyId, bizNo, info, compact }: { companyId: string; bizNo: string | null; info: CompanyInfo | null; compact?: boolean }) {
  const router = useRouter();
  const [cands, setCands] = useState<Cand[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function search() {
    setBusy(true); setErr(null);
    const r = await fetch(`/api/company-info?companyId=${companyId}`);
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setErr(d.error); return; }
    setCands(d.candidates);
  }
  async function pick(id: string) {
    setBusy(true);
    const r = await fetch("/api/company-info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, candidateId: id }) });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error); return; }
    setCands(null);
    router.refresh();
  }

  return (
    <section className={compact ? "stack" : "card stack"} style={{ gap: 10 }}>
      <div className="between">
        <h3 style={{ fontSize: compact ? 14 : 15 }}>기업 정보</h3>
        {info && <button type="button" className="link" onClick={search} disabled={busy}>다시 불러오기</button>}
      </div>
      {!info && !cands && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="small muted">매출·영업이익·신용등급·공시·뉴스를 불러와 고객카드에 붙입니다.</span>
          <button type="button" className="btn sm soft" onClick={search} disabled={busy}>{busy ? "찾는 중…" : "기업 정보 불러오기"}</button>
        </div>
      )}
      {cands && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="small bold">맞는 회사를 골라 주세요</span>
          {cands.map((c) => (
            <button key={c.id} type="button" onClick={() => pick(c.id)} disabled={busy} className="pick-card" style={{ padding: 12 }}>
              <b>{c.name}</b>
              <span className="xs muted">사업자 {c.bizNo} · {c.ceo} · {c.address}</span>
            </button>
          ))}
          <button type="button" className="link" onClick={() => setCands(null)}>취소</button>
        </div>
      )}
      {err && <span className="badge bad" style={{ whiteSpace: "normal", fontWeight: 400 }}>{err}</span>}
      {info && !cands && (
        <>
          <div className="facts" style={{ background: compact ? "var(--surface)" : "var(--bg)", border: compact ? "1px solid var(--border)" : 0 }}>
            <span><small>매출액 ({info.fiscalYear})</small><b>{won(info.revenue)}</b></span>
            <span><small>영업이익</small><b style={{ color: (info.operatingProfit ?? 0) < 0 ? "var(--bad)" : undefined }}>{won(info.operatingProfit)}</b></span>
            <span><small>신용등급</small><b>{info.creditGrade ?? "-"}</b></span>
            <span><small>사업자번호</small><b>{bizNo ?? "-"}</b></span>
          </div>
          {info.disclosures.length > 0 && (
            <div className="stack" style={{ gap: 4 }}>
              <span className="xs muted">최근 공시</span>
              {info.disclosures.slice(0, 3).map((d, i) => <span key={i} className="small">{d.date} · {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="link">{d.title}</a> : d.title}</span>)}
            </div>
          )}
          {info.news.length > 0 && (
            <div className="stack" style={{ gap: 4 }}>
              <span className="xs muted">최근 뉴스</span>
              {info.news.slice(0, 3).map((n, i) => <span key={i} className="small">{n.date} · {n.url ? <a href={n.url} target="_blank" rel="noreferrer" className="link">{n.title}</a> : n.title}{n.press ? ` (${n.press})` : ""}</span>)}
            </div>
          )}
          <span className="xs muted">출처: {info.source} · {info.updatedAt.slice(0, 10)} 기준</span>
        </>
      )}
    </section>
  );
}
