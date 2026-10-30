import Link from "next/link";
import { asc, like, or } from "drizzle-orm";
import { db, contacts } from "@/db";
import { relDay } from "@/lib/format";
import { lastContactByCompany } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim() ?? "";
  const list = await db.query.contacts.findMany({
    where: q ? or(like(contacts.name, `%${q}%`), like(contacts.email, `%${q}%`)) : undefined,
    with: { company: true, createdBy: true },
    orderBy: asc(contacts.name),
  });
  const all = q
    ? (await db.query.contacts.findMany({ with: { company: true, createdBy: true } })).filter(
        (c) => c.company.name.includes(q) && !list.some((x) => x.id === c.id)
      )
    : [];
  const rows = [...list, ...all];
  const last = await lastContactByCompany();

  return (
    <div>
      <div className="m-head" style={{ paddingTop: 24 }}>
        <h1 className="m-title">고객</h1>
        <form>
          <label className="sr-only" htmlFor="q">고객 검색</label>
          <input id="q" name="q" defaultValue={q} className="input" placeholder="이름·회사 검색" />
        </form>
      </div>
      <div className="m-page" style={{ gap: 10 }}>
        <span className="small muted">팀 전체 명함 {rows.length}명</span>
        <div className="card flush">
          {rows.length === 0 && <div className="list-row muted small">찾는 고객이 없습니다.</div>}
          {rows.map((c) => {
            const lc = last.get(c.companyId);
            return (
              <Link key={c.id} href={`/m/customers/${c.id}`} className="list-row">
                <span className="avatar">{c.name.slice(0, 1)}</span>
                <span className="grow stack" style={{ gap: 2 }}>
                  <b>{c.name} {c.title}</b>
                  <span className="small muted">{c.company.name}{c.department ? ` · ${c.department}` : ""}</span>
                </span>
                <span className="xs muted" style={{ textAlign: "right" }}>{lc ? relDay(lc) : "-"}<br />등록 {c.createdBy.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
