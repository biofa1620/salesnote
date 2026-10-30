"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ICamera } from "@/components/Icons";

type Fields = { name: string; company: string; department: string; title: string; phone: string; email: string; memo: string };
const EMPTY: Fields = { name: "", company: "", department: "", title: "", phone: "", email: "", memo: "" };

export default function ScanPage() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [f, setF] = useState<Fields>(EMPTY);
  const [busy, setBusy] = useState<"ocr" | "save" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setBusy("ocr"); setError(null); setNotice(null);
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("/api/ocr", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(null);
    setCardImage(data.cardImage ?? null);
    if (!res.ok) { setError(`자동 인식 실패: ${data.error}. 직접 입력해 주세요.`); return; }
    setF({ ...EMPTY, ...data.fields });
    const dup = await fetch(`/api/contacts?company=${encodeURIComponent(data.fields.company)}`).then((r) => r.json());
    if (dup.exists) setNotice(`${data.fields.company}은(는) 이미 등록된 고객사입니다 (담당자 ${dup.count}명)`);
  }

  async function save() {
    setBusy("save"); setError(null);
    const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, cardImage }) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) { setError(data.error); return; }
    router.push(`/m/customers/${data.id}`);
    router.refresh();
  }

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const field = (k: keyof Fields, label: string, type = "text") => (
    <label className="field">{label}<input className="input" type={type} value={f[k]} onChange={set(k)} /></label>
  );

  return (
    <div>
      <div style={{ background: "#171b24", padding: "16px 20px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div className="between" style={{ width: "100%", color: "#fff" }}>
          <Link href="/m" className="back" style={{ color: "#fff" }}>닫기</Link>
          <b>명함 촬영</b>
          <span style={{ width: 44 }} />
        </div>
        <button type="button" onClick={() => input.current?.click()}
          style={{ width: 280, height: 164, borderRadius: 10, border: "2px dashed #7f83f4", background: preview ? `center/cover url(${preview})` : "transparent", color: "#c5cbff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {!preview && (<><ICamera size={32} color="#c5cbff" /><span>눌러서 명함 찍기</span></>)}
        </button>
        <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onPick(e.target.files?.[0])} />
        <span className="small" style={{ color: "#c5cbff" }}>
          {busy === "ocr" ? "명함을 읽는 중…" : preview ? "인식 완료 · 내용을 확인해 주세요" : "사진을 고르거나 직접 입력해도 됩니다"}
        </span>
      </div>

      <div className="m-page" style={{ gap: 14 }}>
        {notice && <div className="badge info" style={{ padding: "10px 12px", fontWeight: 400, whiteSpace: "normal" }}>{notice}</div>}
        {error && <div className="badge bad" style={{ padding: "10px 12px", fontWeight: 400, whiteSpace: "normal" }}>{error}</div>}
        <div className="grid2">{field("name", "이름 *")}{field("company", "회사 *")}{field("department", "부서")}{field("title", "직함")}</div>
        {field("phone", "휴대폰", "tel")}
        {field("email", "이메일", "email")}
        {field("memo", "만난 곳 · 메모")}
        <div className="row">
          <button type="button" className="btn grow" onClick={() => input.current?.click()}>{preview ? "다시 촬영" : "사진 고르기"}</button>
          <button type="button" className="btn primary" style={{ flex: 2 }} disabled={!f.name || !f.company || busy !== null} onClick={save}>
            {busy === "save" ? "저장 중…" : "고객카드 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
