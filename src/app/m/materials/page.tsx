import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db, materials, shares } from "@/db";
import { requireUser } from "@/lib/session";
import { relDay } from "@/lib/format";
import { ShareButton } from "@/components/ShareButton";
import { IBack } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function MaterialsPage({ searchParams }: { searchParams: Promise<{ contactId?: string }> }) {
  const u = await requireUser();
  const { contactId } = await searchParams;
  const contact = contactId ? await db.query.contacts.findFirst({ where: (t, { eq }) => eq(t.id, contactId), with: { company: true } }) : null;
  const list = await db.query.materials.findMany({ orderBy: asc(materials.category) });
  const sent = await db.query.shares.findMany({ where: eq(shares.userId, u.id), with: { material: true, contact: true, company: true }, orderBy: desc(shares.createdAt), limit: 8 });
  const label = contact ? `${contact.name} ${contact.title ?? ""}`.trim() : undefined;

  return (
    <div>
      <div className="m-head">
        <div className="row">
          <Link href={contact ? `/m/customers/${contact.id}` : "/m"} className="back" aria-label="뒤로"><IBack /></Link>
          <h1 style={{ fontSize: 18 }}>자료 보내기</h1>
        </div>
        <span className="small muted">
          {contact ? `${contact.company.name} ${label}님에게 보낼 자료를 고르세요.` : "보낼 자료를 고르면 카카오톡·문자로 링크를 보낼 수 있습니다."}
        </span>
      </div>
      <div className="m-page" style={{ gap: 12 }}>
        <div className="card flush">
          {list.length === 0 && <div className="list-row muted small">등록된 자료가 없습니다. 팀장 웹 '자료실'에서 올려 주세요.</div>}
          {list.map((m) => (
            <div key={m.id} className="list-row" style={{ alignItems: "flex-start" }}>
              <span className="grow stack" style={{ gap: 2 }}>
                <span className="row"><span className="badge gray">{m.category}</span><b>{m.title}</b></span>
                {m.description && <span className="small muted">{m.description}</span>}
              </span>
              <ShareButton materialId={m.id} contactId={contact?.id ?? null} contactLabel={label} />
            </div>
          ))}
        </div>

        <section className="stack" style={{ gap: 8 }}>
          <h2 className="m-section-title" style={{ fontSize: 15 }}>내가 보낸 자료</h2>
          <div className="card flush">
            {sent.length === 0 && <div className="list-row muted small">아직 보낸 자료가 없습니다.</div>}
            {sent.map((s) => (
              <div key={s.id} className="list-row">
                <span className="grow stack" style={{ gap: 2 }}>
                  <b className="small">{s.material.title}</b>
                  <span className="xs muted">{s.company ? `${s.company.name} ${s.contact?.name ?? ""}` : "받는 사람 미지정"} · {relDay(s.createdAt)}</span>
                </span>
                <span className={`badge ${s.openCount ? "ok" : "gray"}`}>{s.openCount ? `열람 ${s.openCount}회` : "미열람"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
