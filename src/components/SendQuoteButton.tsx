"use client";
// 승인된 견적을 휴대폰 '공유하기'로 카카오톡·문자·메일에 링크로 보냅니다.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { markQuoteSent } from "@/app/actions";

export function SendQuoteButton({ quoteId, contactLabel, again }: { quoteId: string; contactLabel?: string; again?: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const r = await markQuoteSent(quoteId);
      const full = `${location.origin}${r.path}`;
      setUrl(full);
      const text = `${contactLabel ? contactLabel + "님, " : ""}요청하신 견적서입니다: ${r.title}`;
      if (navigator.share) {
        await navigator.share({ title: r.title, text, url: full }).catch(() => undefined);
        setMsg("보냈습니다");
      } else {
        await navigator.clipboard.writeText(`${text}\n${full}`).catch(() => undefined);
        setMsg("링크를 복사했습니다");
      }
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="stack" style={{ gap: 6 }}>
      <button type="button" className={`btn block ${again ? "" : "primary"}`} disabled={busy} onClick={go}>{busy ? "준비 중…" : again ? "링크 다시 보내기" : "견적서 보내기 (카카오톡·문자·메일)"}</button>
      {msg && (
        <span className="xs muted" style={{ textAlign: "center" }}>
          {msg}{url && <> · <a className="link" href={`mailto:?subject=${encodeURIComponent("견적서")}&body=${encodeURIComponent(url)}`}>메일로</a> · <a className="link" href={`sms:?&body=${encodeURIComponent(url)}`}>문자로</a></>}
        </span>
      )}
    </div>
  );
}
