// 파이프라인 칸반 + 딜 정체·누수 경보 (추가 기능 3번)
import Link from "next/link";
import { dealHealth, STALL_DAYS } from "@/lib/queries";
import { STAGES, STAGE_PROB, md } from "@/lib/format";
import { setDealStage } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Pipeline() {
  const all = await dealHealth();
  const cols = [...STAGES, "실주"];
  const warn = all.filter((h) => h.warn);

  return (
    <>
      <header className="page-head">
        <div className="stack" style={{ gap: 4 }}>
          <span className="small muted">같은 단계에 {STALL_DAYS}일 이상 머물렀거나 다음 일정이 없는 딜은 빨간색으로 표시됩니다</span>
          <h1 className="page-title">파이프라인</h1>
        </div>
        <div className="row wrap">
          <span className="badge bad">경고 {warn.length}건</span>
          <span className="badge gray">진행 중 {all.filter((h) => h.deal.stage !== "수주" && h.deal.stage !== "실주").length}건</span>
        </div>
      </header>

      <div className="scroll-x">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, minmax(220px, 1fr))`, gap: 12, minWidth: cols.length * 232 }}>
          {cols.map((stage) => {
            const list = all.filter((h) => h.deal.stage === stage).sort((a, b) => Number(b.warn) - Number(a.warn) || b.daysInStage - a.daysInStage);
            return (
              <section key={stage} className="stack" style={{ gap: 10, background: "var(--subtle)", borderRadius: 12, padding: 10, alignSelf: "start" }} aria-label={`${stage} 단계`}>
                <div className="between" style={{ padding: "2px 4px" }}>
                  <b>{stage}</b>
                  <span className="xs muted">{list.length}건 · 기본 확률 {STAGE_PROB[stage]}%</span>
                </div>
                {list.length === 0 && <span className="xs muted" style={{ padding: 4 }}>없음</span>}
                {list.map((h) => (
                  <article key={h.deal.id} className="card stack" style={{ gap: 6, padding: 12, borderColor: h.warn ? "var(--bad-line)" : undefined, boxShadow: h.warn ? "inset 3px 0 0 var(--bad-line)" : undefined }}>
                    <Link href={`/admin/customers?id=${h.deal.companyId}`} className="stack" style={{ gap: 2 }}>
                      <b>{h.deal.company.name}</b>
                      <span className="small" style={{ color: "var(--text-body)" }}>{h.deal.title}</span>
                    </Link>
                    <span className="xs muted">담당 {h.deal.owner.name} · 이 단계 {h.daysInStage}일째</span>
                    {h.stalled && <span className="badge bad" style={{ alignSelf: "flex-start" }}>{h.daysInStage}일째 정체</span>}
                    {h.noNext && <span className="badge bad" style={{ alignSelf: "flex-start" }}>후속 일정 없음</span>}
                    {h.next && <span className="xs" style={{ color: "var(--text-body)" }}>다음: {md(h.next.startAt)} {h.next.title}</span>}
                    <form action={setDealStage} className="row" style={{ marginTop: 2 }}>
                      <input type="hidden" name="dealId" value={h.deal.id} />
                      <label className="sr-only" htmlFor={`st-${h.deal.id}`}>단계 변경</label>
                      <select id={`st-${h.deal.id}`} name="stage" defaultValue={h.deal.stage} className="input grow" style={{ height: 32, fontSize: 13, padding: "0 8px" }}>
                        {cols.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <button className="btn sm" style={{ height: 32 }}>이동</button>
                    </form>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
