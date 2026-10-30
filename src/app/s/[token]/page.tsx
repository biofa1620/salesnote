// 고객이 받는 자료 링크 (로그인 없이 열림). 열면 열람 횟수가 기록되고 영업사원 타임라인에 남습니다.
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db, shares, activities } from "@/db";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function SharedMaterial({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await db.query.shares.findFirst({ where: eq(shares.token, token), with: { material: true, user: true, contact: true, company: true } });
  if (!s) notFound();
  const first = s.openCount === 0;
  await db.update(shares).set({ openCount: sql`${shares.openCount} + 1`, firstOpenedAt: s.firstOpenedAt ?? new Date() }).where(eq(shares.id, s.id));
  if (first) {
    await db.insert(activities).values({
      userId: s.userId, companyId: s.companyId, contactId: s.contactId, type: "SHARE",
      text: `${s.company?.name ?? "고객"}${s.contact ? ` ${s.contact.name}` : ""}이(가) '${s.material.title}'을(를) 열람`,
      sub: "보낸 자료를 고객이 처음 열었습니다",
    });
  }
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "48px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <span className="badge primary" style={{ alignSelf: "flex-start" }}>{s.material.category}</span>
      <h1 style={{ fontSize: 22 }}>{s.material.title}</h1>
      {s.material.description && <p className="muted" style={{ margin: 0 }}>{s.material.description}</p>}
      <a className="btn primary block" href={`/s/${token}/file`}>자료 열기 · {s.material.fileName}</a>
      <p className="small muted" style={{ margin: 0 }}>보낸 사람: {s.user.name} ({s.user.team})</p>
    </main>
  );
}
