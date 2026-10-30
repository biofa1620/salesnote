"use client";
// 월간 미니 달력 + 날짜별 일정 (구글 캘린더처럼 날짜를 누르면 아래에 그날 일정이 나옵니다)
import Link from "next/link";
import { useMemo, useState } from "react";
import { IChevron, IPlus } from "./Icons";

export type CalEvent = { id: string; dateKey: string; time: string; endTime: string; title: string; sub: string; type: string; href?: string };

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function MonthCalendar({ year, month, events, initialSel, todayKey }: {
  year: number; month: number; events: CalEvent[]; initialSel: string; todayKey: string;
}) {
  const [sel, setSel] = useState(initialSel);
  const [open, setOpen] = useState(true);

  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) m.set(e.dateKey, [...(m.get(e.dateKey) ?? []), e]);
    return m;
  }, [events]);

  const weeks = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    const last = new Date(year, month + 1, 0);
    const out: Date[][] = [];
    for (let d = new Date(start); d <= last || d.getDay() !== 0; ) {
      const w: Date[] = [];
      for (let i = 0; i < 7; i++) { w.push(new Date(d)); d.setDate(d.getDate() + 1); }
      out.push(w);
    }
    return out;
  }, [year, month]);

  const shown = open ? weeks : weeks.filter((w) => w.some((d) => key(d) === sel));
  const list = (byDay.get(sel) ?? []).slice().sort((a, b) => a.time.localeCompare(b.time));
  const selDate = new Date(`${sel}T00:00`);
  const prev = new Date(year, month - 1, 1), next = new Date(year, month + 1, 1);
  const mk = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

  return (
    <>
      <div className="m-head" style={{ paddingTop: 24, paddingLeft: 16, paddingRight: 16, gap: 12 }}>
        <div className="between" style={{ padding: "0 4px" }}>
          <div className="row" style={{ gap: 2 }}>
            <Link href={`/m/schedule?month=${mk(prev)}`} className="back" aria-label="이전 달" style={{ marginLeft: -8 }}><span style={{ transform: "rotate(-90deg)", display: "inline-flex" }}><IChevron up size={20} /></span></Link>
            <h1 className="m-title">{year}년 {month + 1}월</h1>
            <Link href={`/m/schedule?month=${mk(next)}`} className="back" aria-label="다음 달" style={{ marginLeft: 0 }}><span style={{ transform: "rotate(90deg)", display: "inline-flex" }}><IChevron up size={20} /></span></Link>
          </div>
          <Link href={`/m/schedule/new?date=${sel}`} className="btn primary sm"><IPlus size={16} color="#fff" />일정 추가</Link>
        </div>
        <div className="cal-head">{DOW.map((d, i) => <span key={d} className={i === 0 ? "sun" : i === 6 ? "sat" : ""}>{d}</span>)}</div>
        <div>
          {shown.map((w, wi) => (
            <div key={wi} className="cal-week">
              {w.map((d) => {
                const k = key(d);
                const inMonth = d.getMonth() === month;
                const has = byDay.has(k);
                const cls = ["cal-day", d.getDay() === 0 ? "sun" : d.getDay() === 6 ? "sat" : "", inMonth ? "" : "out", k === todayKey ? "today" : "", k === sel ? "sel" : ""].join(" ");
                return (
                  <button key={k} type="button" className={cls} onClick={() => setSel(k)} aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일${has ? ", 일정 있음" : ""}`} aria-pressed={k === sel}>
                    <span className="n">{d.getDate()}</span>
                    <span className={`d ${has ? "has" : ""}`} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <button type="button" className="chip row" style={{ alignSelf: "center", height: 32, background: "var(--subtle)", border: 0, gap: 4 }} onClick={() => setOpen(!open)}>
          {open ? "주간으로 접기" : "월간 펼치기"}<IChevron up={open} />
        </button>
      </div>

      <div className="m-page" style={{ paddingTop: 18, gap: 10 }}>
        <div className="between">
          <h2 style={{ fontSize: 16 }}>{selDate.getMonth() + 1}월 {selDate.getDate()}일 {DOW[selDate.getDay()]}요일{sel === todayKey ? " · 오늘" : ""}</h2>
          <span className="small muted">일정 {list.length}건</span>
        </div>
        {list.length === 0 && (
          <div className="card stack" style={{ alignItems: "center", borderStyle: "dashed", padding: 24, gap: 8 }}>
            <span className="muted">이날은 일정이 없습니다</span>
            <Link href={`/m/schedule/new?date=${sel}`} className="link">+ 이날 일정 추가</Link>
          </div>
        )}
        {list.map((e) => {
          const cls = `event-card ${e.type === "INTERNAL" ? "internal" : e.type === "TODO" ? "todo" : ""}`;
          const inner = (
            <>
              <span className="event-time">{e.time}</span>
              <span className="stack" style={{ gap: 3 }}>
                <b style={{ fontSize: 15 }}>{e.title}</b>
                <span className="small muted">{e.sub}</span>
              </span>
            </>
          );
          return e.href ? <Link key={e.id} href={e.href} className={cls}>{inner}</Link> : <div key={e.id} className={cls}>{inner}</div>;
        })}
      </div>
    </>
  );
}
