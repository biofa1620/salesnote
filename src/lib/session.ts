// MVP용 간단 로그인: 사용자를 고르면 쿠키에 ID를 저장합니다.
// 운영 전에 사내 계정(SSO 등) 인증으로 교체해야 합니다.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";

export const SESSION_COOKIE = "sn_uid";

export async function currentUser() {
  const uid = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!uid) return null;
  return (await db.query.users.findFirst({ where: eq(users.id, uid) })) ?? null;
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireLead() {
  const u = await requireUser();
  if (u.role === "REP") redirect("/login?need=lead"); // 영업사원 계정으로 팀장 웹에 오면 계정 고르기로
  return u;
}
