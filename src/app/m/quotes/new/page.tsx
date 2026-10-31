import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, products, quotes } from "@/db";
import { QuoteForm } from "@/components/QuoteForm";
import { IBack } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function NewQuote({ searchParams }: { searchParams: Promise<{ contactId?: string; from?: string }> }) {
  const sp = await searchParams;
  const parent = sp.from ? await db.query.quotes.findFirst({ where: eq(quotes.id, sp.from), with: { items: true } }) : null;
  const contactId = parent?.contactId ?? sp.contactId;
  if (!contactId) notFound();
  const contact = await db.query.contacts.findFirst({ where: (t, { eq }) => eq(t.id, contactId), with: { company: true } });
  if (!contact) notFound();
  const list = await db.query.products.findMany({ where: eq(products.active, true), orderBy: asc(products.name) });
  return (
    <div>
      <div className="m-head">
        <div className="row">
          <Link href={`/m/customers/${contact.id}`} className="back" aria-label="뒤로"><IBack /></Link>
          <h1 style={{ fontSize: 18 }}>{parent ? `견적 수정 (${parent.version + 1}차)` : "견적 작성"}</h1>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="m-page"><div className="card muted">등록된 상품이 없습니다. 팀장 웹 '견적' 화면에서 상품과 정가를 먼저 등록해 주세요.</div></div>
      ) : (
        <QuoteForm
          products={list.map((p) => ({ id: p.id, name: p.name, unit: p.unit, listPrice: p.listPrice }))}
          contactId={contact.id}
          contactLabel={`${contact.company.name} ${contact.name} ${contact.title ?? ""}`.trim()}
          defaultTitle={`${contact.company.name} 견적`}
          parent={parent ? {
            id: parent.id, title: parent.title, note: parent.note, rejectReason: parent.rejectReason,
            items: parent.items.filter((i) => i.productId && list.some((p) => p.id === i.productId)).sort((a, b) => a.sort - b.sort)
              .map((i) => ({ productId: i.productId!, qty: i.qty, unitPrice: i.unitPrice })),
          } : null}
        />
      )}
    </div>
  );
}
