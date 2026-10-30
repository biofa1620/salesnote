// 자료실 (추가 기능 5번): 팀장이 자료를 올리면 영업사원이 앱에서 고객에게 링크로 보냅니다.
import { asc, desc } from "drizzle-orm";
import { db, materials, shares } from "@/db";
import { uploadMaterial } from "@/app/actions";
import { relDay } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Materials() {
  const list = await db.query.materials.findMany({ with: { shares: true }, orderBy: asc(materials.category) });
  const recent = await db.query.shares.findMany({ with: { material: true, user: true, company: true, contact: true }, orderBy: desc(shares.createdAt), limit: 10 });
  return (
    <>
      <header className="page-head">
        <div className="stack" style={{ gap: 4 }}>
          <span className="small muted">영업사원이 미팅 중 고객에게 카카오톡·문자 링크로 바로 보내는 자료입니다</span>
          <h1 className="page-title">자료실</h1>
        </div>
      </header>
      <div className="cols">
        <section className="col-3 stack" style={{ gap: 16 }}>
          <div className="card flush scroll-x">
            <table className="tbl" style={{ minWidth: 520 }}>
              <thead><tr><th>자료</th><th>분류</th><th className="num">전송</th><th className="num">고객 열람</th><th>파일</th></tr></thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id}>
                    <td><b>{m.title}</b>{m.description && <><br /><span className="small muted">{m.description}</span></>}</td>
                    <td><span className="badge gray">{m.category}</span></td>
                    <td className="num">{m.shares.length}</td>
                    <td className="num">{m.shares.filter((s) => s.openCount > 0).length}</td>
                    <td><a className="link" href={`/api/files/${m.filePath}`} target="_blank" rel="noreferrer">{m.fileName}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card stack" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 16 }}>최근 전송</h2>
            {recent.length === 0 && <span className="small muted">아직 전송 기록이 없습니다.</span>}
            {recent.map((s) => (
              <div key={s.id} className="between small" style={{ borderBottom: "1px solid var(--subtle)", paddingBottom: 8 }}>
                <span>{s.user.name} → {s.company ? `${s.company.name} ${s.contact?.name ?? ""}` : "받는 사람 미지정"} · {s.material.title}</span>
                <span className="row"><span className="muted">{relDay(s.createdAt)}</span><span className={`badge ${s.openCount ? "ok" : "gray"}`}>{s.openCount ? `열람 ${s.openCount}회` : "미열람"}</span></span>
              </div>
            ))}
          </div>
        </section>
        <form action={uploadMaterial} className="card col-1 stack" style={{ gap: 12 }}>
          <h2 style={{ fontSize: 16 }}>자료 올리기</h2>
          <label className="field">제목<input className="input" name="title" required placeholder="예: 알림톡 템플릿 가이드" /></label>
          <label className="field">분류
            <select className="input" name="category"><option>브로슈어</option><option>가이드</option><option>규격서</option><option>사례</option><option>기타</option></select>
          </label>
          <label className="field">설명<input className="input" name="description" placeholder="한 줄 설명" /></label>
          <label className="field">파일 (PDF 권장)<input className="input" style={{ paddingTop: 8 }} type="file" name="file" required /></label>
          <button className="btn primary">올리기</button>
          <span className="xs muted">고객에게 가는 링크는 로그인 없이 열리므로, 외부에 공개해도 되는 자료만 올려 주세요.</span>
        </form>
      </div>
    </>
  );
}
