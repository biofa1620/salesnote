"use client";
// 통화 후 메모 팝업 (추가 기능 2번 간이판)
// 휴대폰 웹 앱은 일반 전화의 수신·발신을 감지할 수 없어서, 앱의 '전화' 버튼으로 건 통화만 대상으로 합니다.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CALL_KEY } from "./CallButton";
import { IMic } from "./Icons";

type Pending = { contactId: string; label: string; start: number };

export function CallMemoPopup() {
  const router = useRouter();
  const [p, setP] = useState<Pending | null>(null);
  const [dur, setDur] = useState(0);
  const [memo, setMemo] = useState("");
  const [rec, setRec] = useState<number | null>(null); // 남은 초
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;
      try {
        const raw = sessionStorage.getItem(CALL_KEY);
        if (!raw) return;
        const v = JSON.parse(raw) as Pending;
        const sec = Math.round((Date.now() - v.start) / 1000);
        if (sec < 3) return; // 전화 앱으로 넘어가기 전
        setP(v);
        setDur(sec);
      } catch {}
    };
    check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => { document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, []);

  useEffect(() => {
    if (rec === null) return;
    if (rec <= 0) { mr.current?.state === "recording" && mr.current.stop(); return; }
    const t = setTimeout(() => setRec(rec - 1), 1000);
    return () => clearTimeout(t);
  }, [rec]);

  function close() {
    try { sessionStorage.removeItem(CALL_KEY); } catch {}
    setP(null); setMemo(""); setRec(null); setErr(null);
  }

  async function send(audio?: Blob) {
    if (!p) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("contactId", p.contactId);
    fd.append("durationSec", String(dur));
    if (memo.trim()) fd.append("memo", memo.trim());
    if (audio) fd.append("audio", new File([audio], "memo.webm", { type: audio.type || "audio/webm" }));
    const res = await fetch("/api/calls", { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) { setErr((await res.json()).error); return; }
    close();
    router.refresh();
  }

  async function voice() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRec(null);
        send(new Blob(chunks.current, { type: chunks.current[0]?.type || "audio/webm" }));
      };
      r.start();
      mr.current = r;
      setRec(10);
    } catch {
      setErr("마이크를 쓸 수 없습니다. 한 줄 메모로 남겨 주세요.");
    }
  }

  if (!p) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="call-memo-title" style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(16,24,40,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px" }}>
      <div className="card stack" style={{ width: "100%", maxWidth: 448, gap: 12, boxShadow: "0 16px 40px -8px rgba(16,24,40,.18)" }}>
        <div className="stack" style={{ gap: 2 }}>
          <span className="xs muted">통화 종료 · 약 {Math.max(1, Math.round(dur / 60))}분</span>
          <h2 id="call-memo-title" style={{ fontSize: 17 }}>{p.label} 통화 메모</h2>
        </div>
        {rec !== null ? (
          <div className="stack" style={{ alignItems: "center", padding: 12 }}>
            <b style={{ fontSize: 32 }}>{rec}초</b>
            <span className="small muted">말씀하세요. 10초 뒤 자동으로 저장됩니다</span>
            <button type="button" className="btn sm" onClick={() => mr.current?.stop()}>지금 저장</button>
          </div>
        ) : (
          <>
            <button type="button" className="btn soft block" onClick={voice} disabled={busy}><IMic size={18} />10초 음성 메모</button>
            <label className="field">또는 한 줄 메모
              <input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 견적 회신 다음 주 화요일" />
            </label>
            {err && <span className="badge bad" style={{ whiteSpace: "normal", fontWeight: 400 }}>{err}</span>}
            <div className="row">
              <button type="button" className="btn grow" onClick={() => send()} disabled={busy}>메모 없이 기록</button>
              <button type="button" className="btn primary grow" onClick={() => send()} disabled={busy || !memo.trim()}>{busy ? "저장 중…" : "저장"}</button>
            </div>
            <button type="button" className="link" style={{ alignSelf: "center" }} onClick={close}>기록하지 않기</button>
          </>
        )}
      </div>
    </div>
  );
}
