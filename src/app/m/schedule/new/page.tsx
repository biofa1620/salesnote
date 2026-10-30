import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, companies } from "@/db";
import { createEvent } from "@/app/actions";
import { ymd } from "@/lib/format";
import { IBack } from "@/components/Icons";

export default async function NewEvent({ searchParams }: { searchParams: Promise<{ date?: string; contactId?: string }> }) {
  const sp = await searchParams;
  const contact = sp.contactId ? await db.query.contacts.findFirst({ where: (t, { eq }) => eq(t.id, sp.contactId!), with: { company: true } }) : null;
  const list = await db.select().from(companies).orderBy(asc(companies.name));
  return (
    <div>
      <div className="m-head">
        <div className="row"><Link href="/m/schedule" className="back" aria-label="뒤로"><IBack /></Link><h1 style={{ fontSize: 18 }}>일정 추가</h1></div>
      </div>
      <form action={createEvent} className="m-page" style={{ gap: 14 }}>
        <label className="field">제목<input className="input" name="title" required defaultValue={contact ? `${contact.company.name} · 미팅` : ""} /></label>
        <label className="field">종류
          <select className="input" name="type" defaultValue="MEETING">
            <option value="MEETING">고객 미팅</option><option value="INTERNAL">내부 일정</option><option value="TODO">할 일</option>
          </select>
        </label>
        <label className="field">고객사 (고객 미팅은 꼭 골라 주세요)
          <select className="input" name="companyId" defaultValue={contact?.companyId ?? ""}>
            <option value="">선택 안 함</option>
            {list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {contact && <input type="hidden" name="contactId" value={contact.id} />}
        <label className="field">날짜<input className="input" type="date" name="date" required defaultValue={sp.date ?? ymd(new Date())} /></label>
        <div className="grid2">
          <label className="field">시작<input className="input" type="time" name="start" defaultValue="10:00" /></label>
          <label className="field">종료<input className="input" type="time" name="end" defaultValue="11:00" /></label>
        </div>
        <label className="field">장소<input className="input" name="location" placeholder="예: 고객사 회의실, 화상 미팅" /></label>
        <label className="row small" style={{ color: "var(--text-body)" }}><input type="checkbox" name="accompany" style={{ width: 18, height: 18 }} />팀장 동행 요청</label>
        <button className="btn primary block">저장</button>
      </form>
    </div>
  );
}
