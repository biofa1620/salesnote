"use client";
// 자료 즉시 전송 (추가 기능 5번): 링크를 만들고 휴대폰 '공유하기'로 카카오톡·문자에 보냅니다.
// 회사 메시징 인프라를 쓰지 않으며, 고객이 링크를 열면 열람 기록이 남습니다.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createShare } from "@/app/actions";

export function ShareButton({ materialId, contactId, contactLabel }: { materialId: string; contactId: string | null; contactLabel?: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "copied" | "shared">("idle");
  const [url, setUrl] = useState<string | null>(null);

  async function go() {
    setState("busy");
    const r = await createShare(materialId, contactId);
    const full = `${location.origin}${r.path}`;
    setUrl(full);
    const text = `${contactLabel ? contactLabel + "님, " : ""}요청하신 '${r.title}' 자료입니다.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: r.title, text, url: full });
        setState("shared");
      } else {
        await navigator.clipboard.writeText(`${text}\n${full}`);
        setState("copied");
      }
    } catch {
      setState("copied");
    }
    router.refresh();
  }

  return (
    <div className="stack" style={{ gap: 6, alignItems: "flex-end", flexShrink: 0, width: 96 }}>
      <button type="button" className="btn soft sm" onClick={go} disabled={state === "busy"}>
        {state === "busy" ? "링크 만드는 중…" : state === "shared" ? "보냄 ✓" : "보내기"}
      </button>
      {state === "copied" && url && (
        <span className="xs muted" style={{ textAlign: "right" }}>
          복사됨 · <a className="link" href={`sms:?&body=${encodeURIComponent(url)}`}>문자로</a>
        </span>
      )}
    </div>
  );
}
