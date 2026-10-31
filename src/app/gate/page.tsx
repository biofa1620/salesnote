// 접속 코드 입력 화면 (ACCESS_CODE가 설정된 서버에서만 보입니다)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function enter(f: FormData) {
  "use server";
  const code = process.env.ACCESS_CODE;
  const next = String(f.get("next") || "/login");
  if (!code || String(f.get("code") ?? "").trim() !== code) redirect(`/gate?error=1&next=${encodeURIComponent(next)}`);
  const jar = await cookies();
  jar.set("sn_access", code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  // 아직 사용자를 고르지 않았으면 고르기 화면으로 먼저 보냅니다.
  redirect(jar.get("sn_uid") && next.startsWith("/") ? next : "/login");
}

export default async function Gate({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "72px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="brand" style={{ padding: 0 }}><i>S</i>세일즈노트</div>
      <div className="stack" style={{ gap: 4 }}>
        <h1 style={{ fontSize: 22 }}>접속 코드를 입력해 주세요</h1>
        <p className="muted small" style={{ margin: 0 }}>시범 운영 중인 서비스입니다. 코드는 담당자에게 받으세요.</p>
      </div>
      <form action={enter} className="stack">
        <input type="hidden" name="next" value={sp.next ?? "/login"} />
        <label className="field">접속 코드<input className="input" name="code" type="password" autoComplete="off" required autoFocus /></label>
        {sp.error && <span className="badge bad">코드가 맞지 않습니다</span>}
        <button className="btn primary block">들어가기</button>
      </form>
    </main>
  );
}
