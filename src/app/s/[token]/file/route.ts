import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, shares } from "@/db";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await db.query.shares.findFirst({ where: eq(shares.token, token), with: { material: true } });
  if (!s) return new Response("없음", { status: 404 });
  const root = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
  const file = path.join(root, s.material.filePath);
  if (!file.startsWith(root)) return new Response("없음", { status: 404 });
  const buf = await readFile(file).catch(() => null);
  if (!buf) return new Response("파일이 없습니다", { status: 404 });
  const type = s.material.fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream";
  return new Response(buf, { headers: { "Content-Type": type, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(s.material.fileName)}` } });
}
