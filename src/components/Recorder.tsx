"use client";
// 미팅 녹음 → 업로드 → 음성인식 → AI 회의록 카드
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = { companies: { id: string; name: string }[]; eventId: string | null; defaultCompanyId: string; defaultTitle: string; attendees: string };

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function Recorder(p: Props) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(p.defaultCompanyId);
  const [title, setTitle] = useState(p.defaultTitle);
  const [state, setState] = useState<"idle" | "rec" | "paused" | "upload">("idle");
  const [sec, setSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const noMic = useRef(false);

  useEffect(() => {
    if (state !== "rec") return;
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  async function start() {
    setError(null);
    if (!companyId) { setError("고객사를 먼저 골라 주세요."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.start(1000);
      rec.current = r;
    } catch {
      // 마이크를 쓸 수 없는 환경(HTTP 접속, 권한 거부)에서도 흐름을 시험할 수 있게 합니다.
      noMic.current = true;
      setError("마이크를 쓸 수 없어 녹음 없이 진행합니다. (HTTPS 접속과 마이크 권한이 필요합니다)");
    }
    setState("rec");
  }

  function pause() {
    if (state === "rec") { rec.current?.pause(); setState("paused"); }
    else if (state === "paused") { rec.current?.resume(); setState("rec"); }
  }

  async function stop() {
    setState("upload");
    const r = rec.current;
    if (r && r.state !== "inactive") {
      await new Promise<void>((res) => { r.onstop = () => res(); r.stop(); });
      r.stream.getTracks().forEach((t) => t.stop());
    }
    const fd = new FormData();
    fd.append("companyId", companyId);
    fd.append("title", title.trim());
    fd.append("attendees", p.attendees);
    fd.append("durationSec", String(Math.max(sec, 1)));
    if (p.eventId) fd.append("eventId", p.eventId);
    if (chunks.current.length) {
      const type = chunks.current[0].type || "audio/webm";
      fd.append("audio", new File(chunks.current, `meeting.${type.includes("mp4") ? "m4a" : "webm"}`, { type }));
    }
    const res = await fetch("/api/meetings", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setState("idle"); return; }
    router.push(`/m/meetings/${data.id}`);
    router.refresh();
  }

  const live = state === "rec" || state === "paused";
  return (
    <div className="m-page" style={{ background: "#fff", minHeight: "calc(100dvh - 92px)", gap: 18 }}>
      <div className="between">
        <span className="small muted">미팅 녹음</span>
        {live && <span className="row small bold" style={{ color: "var(--bad)", gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 99, background: "var(--bad-line)" }} />{state === "rec" ? "녹음 중" : "일시정지"}</span>}
      </div>

      <label className="field">고객사
        <select className="input" value={companyId} onChange={(e) => setCompanyId(e.target.value)} disabled={live || state === "upload"}>
          <option value="">고르기</option>
          {p.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="field">미팅 이름<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 한빛물산 서비스 소개 미팅" /></label>
      {p.attendees && <span className="small muted">참석 {p.attendees}</span>}

      <div className="rec-timer">{fmt(sec)}</div>
      <div className="wave" aria-hidden="true">
        {[14, 26, 40, 22, 54, 62, 38, 24, 46, 58, 30, 18, 36, 54, 62, 44, 28, 50, 60, 34, 20, 42, 52, 30, 16].map((h, i) => (
          <span key={i} style={{ height: live ? h : 6, opacity: state === "rec" ? 1 : 0.4, transition: "height .3s" }} />
        ))}
      </div>

      {error && <div className="badge warn" style={{ whiteSpace: "normal", fontWeight: 400, padding: "8px 12px" }}>{error}</div>}

      {state === "upload" ? (
        <div className="card stack" style={{ alignItems: "center" }}><b>회의록을 만드는 중…</b><span className="small muted">녹취 → 요약까지 잠시 걸립니다</span></div>
      ) : (
        <div className="row" style={{ justifyContent: "space-around" }}>
          <button type="button" className="btn" disabled={!live} onClick={pause} style={{ width: 96 }}>{state === "paused" ? "계속" : "일시정지"}</button>
          {live ? (
            <button type="button" className="rec-btn" onClick={stop} aria-label="녹음 종료하고 회의록 만들기"><span className="sq" /></button>
          ) : (
            <button type="button" className="rec-btn" onClick={start} aria-label="녹음 시작"><span className="ci" /></button>
          )}
          <span style={{ width: 96 }} className="xs muted">{live ? "■ 종료 · 회의록 만들기" : "● 녹음 시작"}</span>
        </div>
      )}
      <p className="xs muted" style={{ textAlign: "center", margin: 0 }}>녹음 원본은 3개월 후 자동 삭제되고 회의록은 계속 보관됩니다</p>
    </div>
  );
}
