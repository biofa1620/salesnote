// 명함 사진 → 연락처 항목 (AI_PROVIDER=mock이면 가짜 결과)
import { NextResponse } from "next/server";
import { ai } from "@/lib/ai";
import { currentUser } from "@/lib/session";
import { saveFile } from "@/lib/storage";

export async function POST(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return NextResponse.json({ error: "사진이 없습니다" }, { status: 400 });
  const { relPath, buffer } = await saveFile("cards", file);
  try {
    const fields = await ai().readBusinessCard(buffer, file.type);
    return NextResponse.json({ fields, cardImage: relPath });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, cardImage: relPath }, { status: 502 });
  }
}
