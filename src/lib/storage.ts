// 파일 저장소. MVP는 로컬 폴더(UPLOAD_DIR), 운영은 S3 같은 객체 저장소로 바꾸면 됩니다.
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

const root = () => path.resolve(process.env.UPLOAD_DIR ?? "./uploads");

export async function saveFile(folder: "cards" | "audio", file: File) {
  const ext = (file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
  const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const dir = path.join(root(), folder);
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buf);
  return { relPath: `${folder}/${name}`, buffer: buf };
}

export async function deleteFile(relPath: string) {
  await unlink(path.join(root(), relPath)).catch(() => undefined);
}
