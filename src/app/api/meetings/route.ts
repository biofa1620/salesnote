// 미팅 녹음 업로드 → 음성인식 → AI 요약 → 미팅 카드(확인 필요) 생성
import { NextResponse } from "next/server";
import { db, meetings, activities } from "@/db";
import { ai } from "@/lib/ai";
import { currentUser } from "@/lib/session";
import { saveFile } from "@/lib/storage";

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const f = await req.formData();
  const companyId = String(f.get("companyId") ?? "");
  const company = await db.query.companies.findFirst({ where: (t, { eq }) => eq(t.id, companyId) });
  if (!company) return NextResponse.json({ error: "고객사를 골라 주세요" }, { status: 400 });

  const eventId = (f.get("eventId") as string) || null;
  const durationSec = Number(f.get("durationSec") ?? 0);
  const audio = f.get("audio");
  let audioPath: string | null = null;
  let buffer: Buffer = Buffer.alloc(0);
  let mime = "audio/webm";
  if (audio instanceof File && audio.size > 0) {
    const saved = await saveFile("audio", audio);
    audioPath = saved.relPath;
    buffer = saved.buffer;
    mime = audio.type || mime;
  }

  try {
    const transcript = await ai().transcribe(buffer, mime);
    const summary = await ai().summarize({ companyName: company.name, transcript });
    const startedAt = new Date(Date.now() - durationSec * 1000);
    const title = String(f.get("title") ?? "").trim() || `${company.name} 미팅`;
    const [m] = await db
      .insert(meetings)
      .values({
        eventId, companyId, ownerId: u.id, title, attendees: (f.get("attendees") as string) || null,
        startedAt, durationSec, audioPath, transcript, summary, status: "DRAFT",
      })
      .returning();
    await db.insert(activities).values({
      userId: u.id, companyId, type: "MEETING", text: `${title} 회의록 생성`,
      sub: `${Math.max(1, Math.round(durationSec / 60))}분 녹음 · AI 요약 확인 필요`, link: `/admin/meetings?id=${m.id}`,
    });
    return NextResponse.json({ id: m.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
