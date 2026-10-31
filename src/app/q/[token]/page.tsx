// 고객이 받는 견적서 링크 (로그인 없이 열림). 열면 열람 기록이 남습니다. 인쇄 버튼으로 PDF 저장 가능.
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db, quotes, activities } from "@/db";
import { toDoc } from "@/lib/quote-doc";
import { QuoteDoc } from "@/components/QuoteDoc";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "견적서", robots: { index: false } };

export default async function PublicQuote({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const q = await db.query.quotes.findFirst({ where: eq(quotes.token, token), with: { company: true, contact: true, owner: true, items: true } });
  // 승인·발송 전 견적은 고객에게 보이지 않습니다.
  if (!q || q.status !== "SENT") notFound();
  if (q.openCount === 0) {
    await db.insert(activities).values({
      userId: q.ownerId, companyId: q.companyId, contactId: q.contactId, type: "QUOTE",
      text: `${q.company.name}${q.contact ? ` ${q.contact.name}` : ""}이(가) '${q.title}' 견적서를 열람`, sub: "보낸 견적서를 고객이 처음 열었습니다", link: "/admin/quotes",
    });
  }
  await db.update(quotes).set({ openCount: sql`${quotes.openCount} + 1`, firstOpenedAt: q.firstOpenedAt ?? new Date() }).where(eq(quotes.id, q.id));
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      <QuoteDoc q={toDoc(q)} />
      <PrintButton />
    </main>
  );
}
