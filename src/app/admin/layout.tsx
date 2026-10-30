import { AdminNav } from "@/components/AdminNav";
import { requireLead } from "@/lib/session";
import { logout } from "@/app/actions";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireLead();
  const members = await db.$count(users, eq(users.role, "REP"));
  return (
    <div className="admin">
      <aside className="sidebar">
        <div className="brand"><i>S</i>세일즈노트</div>
        <AdminNav />
        <div className="team-box">
          <b>{u.team}</b>
          <span className="muted">{u.name} · 팀원 {members}명</span>
          <form action={logout}><button className="link" style={{ marginTop: 6 }}>로그아웃</button></form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
