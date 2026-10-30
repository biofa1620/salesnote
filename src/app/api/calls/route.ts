// 통화 후 메모 저장. 음성 메모는 글자로 바꾼 뒤 파일은 저장하지 않습니다 (통화 녹음은 하지 않음).
import { NextResponse } from "next/server";
import { db, activities } from "@/db";
import { ai } from "@/lib/ai";
import { currentUser } from "@/lib/session";

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const f = await req.formData();
  const contactId = String(f.get("contactId") ?? "");
  const contact = await db.query.contacts.findFirst({ where: (t, { eq }) => eq(t.id, contactId), with: { company: true } });
  if (!contact) return NextResponse.json({ error: "고객이 없습니다" }, { status: 404 });
  let memo = String(f.get("memo") ?? "").trim();
  const audio = f.get("audio");
  if (!memo && audio instanceof File && audio.size > 0) {
    try {
      memo = await ai().transcribeMemo(Buffer.from(await audio.arrayBuffer()), audio.type);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
  }
  const minutes = Math.max(0, Math.round(Number(f.get("durationSec") ?? 0) / 60));
  await db.insert(activities).values({
    userId: u.id, companyId: contact.companyId, contactId, type: "CALL",
    text: `${contact.company.name} ${contact.name} ${contact.title ?? ""} 통화${minutes ? ` ${minutes}분` : ""}`.replace(/\s+/g, " ").trim(),
    sub: memo ? `메모: ${memo}` : "메모 없음",
  });
  return NextResponse.json({ ok: true, memo });
}
