import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { asc } from "drizzle-orm";
import { db, users } from "@/db";
import { SESSION_COOKIE } from "@/lib/session";

// MVP용 로그인: 계정을 고르면 바로 들어갑니다. 운영 전에 사내 인증으로 바꿔야 합니다.
async function login(formData: FormData) {
  "use server";
  const id = String(formData.get("uid"));
  const u = await db.query.users.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  if (!u) return;
  (await cookies()).set(SESSION_COOKIE, u.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(u.role === "REP" ? "/m" : "/admin");
}

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const list = await db.select().from(users).orderBy(asc(users.role), asc(users.name));
  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "56px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="brand" style={{ padding: 0 }}><i>S</i>세일즈노트</div>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 22 }}>누구로 들어갈까요?</h1>
        <p className="muted small" style={{ margin: 0 }}>시범 운영용 로그인입니다. 팀장은 관리 웹, 영업사원은 모바일 앱으로 들어갑니다.</p>
      </div>
      <form action={login} className="card flush">
        {list.map((u) => (
          <button key={u.id} name="uid" value={u.id} className="list-row" style={{ width: "100%", background: "none", border: 0, borderBottom: "1px solid var(--subtle)", cursor: "pointer", textAlign: "left" }}>
            <span className="avatar">{u.name.slice(0, 1)}</span>
            <span className="grow"><b>{u.name}</b><br /><span className="muted small">{u.team}</span></span>
            <span className={`badge ${u.role === "REP" ? "gray" : "primary"}`}>{u.role === "REP" ? "영업사원 · 앱" : "팀장 · 웹"}</span>
          </button>
        ))}
      </form>
    </main>
  );
}
