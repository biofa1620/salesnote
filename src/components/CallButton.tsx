"use client";
// 앱에서 건 전화: 통화를 마치고 앱으로 돌아오면 메모 팝업이 뜹니다 (CallMemoPopup).
import { IPhone } from "./Icons";

export const CALL_KEY = "sn_pending_call";

export function CallButton({ contactId, label, phone, style }: { contactId: string; label: string; phone: string | null; style?: React.CSSProperties }) {
  return (
    <a
      href={phone ? `tel:${phone}` : undefined}
      aria-disabled={!phone}
      onClick={() => {
        if (!phone) return;
        try {
          sessionStorage.setItem(CALL_KEY, JSON.stringify({ contactId, label, start: Date.now() }));
        } catch {}
      }}
      style={style}
    >
      <IPhone size={20} color="var(--primary)" />전화
    </a>
  );
}
