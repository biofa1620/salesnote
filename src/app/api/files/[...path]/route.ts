// 업로드 파일(명함 사진·녹음) 보기. 로그인한 사용자만 접근할 수 있습니다.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { currentUser } from "@/lib/session";

const TYPES: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", webm: "audio/webm", m4a: "audio/mp4", mp4: "audio/mp4", ogg: "audio/ogg", wav: "audio/wav" };

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await currentUser())) return new Response("로그인이 필요합니다", { status: 401 });
  const parts = (await params).path;
  if (parts.some((p) => p.includes("..")) || !["cards", "audio", "materials"].includes(parts[0])) return new Response("없음", { status: 404 });
  const root = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
  try {
    const buf = await readFile(path.join(root, ...parts));
    const ext = parts.at(-1)!.split(".").pop()!.toLowerCase();
    return new Response(buf, { headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": "private, no-store" } });
  } catch {
    return new Response("없음", { status: 404 });
  }
}
