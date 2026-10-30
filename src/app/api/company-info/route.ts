// 기업 정보 연동: GET = 회사명으로 후보 찾기, POST = 고른 후보의 재무·신용·공시·뉴스 저장
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, companies } from "@/db";
import { companyInfo } from "@/lib/company-info";
import { currentUser } from "@/lib/session";

export async function GET(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("companyId") ?? "";
  const c = await db.query.companies.findFirst({ where: eq(companies.id, id) });
  if (!c) return NextResponse.json({ error: "고객사가 없습니다" }, { status: 404 });
  try {
    return NextResponse.json({ candidates: await companyInfo().search(c.name) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  const { companyId, candidateId } = await req.json();
  const c = await db.query.companies.findFirst({ where: eq(companies.id, companyId) });
  if (!c) return NextResponse.json({ error: "고객사가 없습니다" }, { status: 404 });
  try {
    const { bizNo, info } = await companyInfo().fetch(candidateId, c.name);
    await db.update(companies).set({ bizNo, info }).where(eq(companies.id, companyId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
