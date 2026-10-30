// 명함 저장: 고객사가 없으면 만들고, 담당자와 '명함 등록' 활동을 남깁니다.
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, companies, contacts, activities } from "@/db";
import { currentUser } from "@/lib/session";

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const b = await req.json();
  const name = String(b.name ?? "").trim();
  const companyName = String(b.company ?? "").trim();
  if (!name || !companyName) return NextResponse.json({ error: "이름과 회사는 꼭 입력해 주세요" }, { status: 400 });

  let company = await db.query.companies.findFirst({ where: eq(companies.name, companyName) });
  if (!company) [company] = await db.insert(companies).values({ name: companyName }).returning();

  const [c] = await db
    .insert(contacts)
    .values({
      companyId: company.id, name, department: b.department || null, title: b.title || null,
      phone: b.phone || null, email: b.email || null, memo: b.memo || null,
      cardImage: b.cardImage || null, createdById: u.id,
    })
    .returning();
  await db.insert(activities).values({
    userId: u.id, companyId: company.id, contactId: c.id, type: "CARD",
    text: `${company.name} ${name}${b.title ? " " + b.title : ""} 명함 등록`, sub: b.memo || null,
  });
  return NextResponse.json({ id: c.id });
}

/** 같은 회사에 이미 등록된 담당자 수 (중복 안내용) */
export async function GET(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const name = new URL(req.url).searchParams.get("company") ?? "";
  const company = await db.query.companies.findFirst({ where: eq(companies.name, name), with: { contacts: true } });
  return NextResponse.json({ exists: !!company, count: company?.contacts.length ?? 0 });
}
