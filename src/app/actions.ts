"use server";
// 화면의 입력 폼이 부르는 서버 함수 모음
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, events, activities, meetings, comments, deals, type MeetingSummary } from "@/db";
import { requireLead, requireUser } from "@/lib/session";
import { md, hhmm } from "@/lib/format";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

/** 일정 추가 */
export async function createEvent(f: FormData) {
  const u = await requireUser();
  const date = str(f, "date")!;
  const start = new Date(`${date}T${str(f, "start") ?? "09:00"}`);
  const end = new Date(`${date}T${str(f, "end") ?? "10:00"}`);
  const companyId = str(f, "companyId");
  const contactId = str(f, "contactId");
  const type = str(f, "type") ?? "MEETING";
  const title = str(f, "title") ?? "새 일정";
  const [ev] = await db
    .insert(events)
    .values({
      ownerId: u.id, companyId, contactId, title, type, startAt: start,
      endAt: end > start ? end : new Date(start.getTime() + 3600000),
      location: str(f, "location"),
      accompany: f.get("accompany") ? "REQUESTED" : null,
      source: str(f, "source"),
    })
    .returning();
  await db.insert(activities).values({
    userId: u.id, companyId, contactId, type: "SCHEDULE",
    text: `${title} 일정 등록`, sub: `${md(start)} ${hhmm(start)}${ev.location ? " · " + ev.location : ""}`,
  });
  revalidatePath("/", "layout");
  redirect(`/m/schedule?date=${date}`);
}

/** 통화 기록 (통화 녹음은 하지 않고 메모만 남깁니다) */
export async function logCall(f: FormData) {
  const u = await requireUser();
  const contactId = str(f, "contactId")!;
  const contact = await db.query.contacts.findFirst({ where: (t, { eq }) => eq(t.id, contactId), with: { company: true } });
  if (!contact) return;
  const minutes = Number(str(f, "minutes") ?? "0");
  await db.insert(activities).values({
    userId: u.id, companyId: contact.companyId, contactId, type: "CALL",
    text: `${contact.company.name} ${contact.name} ${contact.title ?? ""} 통화${minutes ? ` ${minutes}분` : ""}`.replace(/\s+/g, " "),
    sub: str(f, "memo") ? `메모: ${str(f, "memo")}` : "메모 없음",
  });
  revalidatePath("/", "layout");
}

/** 회의록 수정·확정 */
export async function saveMeeting(f: FormData) {
  const u = await requireUser();
  const id = str(f, "id")!;
  const m = await db.query.meetings.findFirst({ where: (t, { eq }) => eq(t.id, id), with: { company: true } });
  if (!m || m.ownerId !== u.id) return;
  const lines = (k: string) => (str(f, k) ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  const summary: MeetingSummary = {
    points: lines("points"),
    products: str(f, "products") ?? "",
    budget: str(f, "budget") ?? "",
    decisionMaker: str(f, "decisionMaker") ?? "",
    competitor: str(f, "competitor") ?? "",
    concern: str(f, "concern") ?? "",
    nextActions: lines("nextActions").map((t) => {
      const [text, due] = t.split("|").map((s) => s.trim());
      return due ? { text, due } : { text };
    }),
  };
  const confirm = f.get("intent") === "confirm";
  await db.update(meetings).set({ summary, status: confirm ? "CONFIRMED" : m.status }).where(eq(meetings.id, id));
  if (confirm && m.status !== "CONFIRMED") {
    await db.insert(activities).values({
      userId: u.id, companyId: m.companyId, type: "MEETING",
      text: `${m.title} 회의록 확정`, sub: `다음 할 일 ${summary.nextActions.length}건`, link: `/admin/meetings?id=${id}`,
    });
  }
  revalidatePath("/", "layout");
  redirect(`/m/meetings/${id}`);
}

/** 회의록의 '다음 할 일'을 일정에 추가 */
export async function addActionToSchedule(f: FormData) {
  const u = await requireUser();
  const meetingId = str(f, "meetingId")!;
  const m = await db.query.meetings.findFirst({ where: (t, { eq }) => eq(t.id, meetingId) });
  if (!m) return;
  const date = str(f, "date")!;
  const start = new Date(`${date}T09:00`);
  await db.insert(events).values({
    ownerId: u.id, companyId: m.companyId, title: str(f, "text")!, type: "TODO",
    startAt: start, endAt: new Date(start.getTime() + 1800000), source: "AI",
  });
  revalidatePath("/", "layout");
}

/** 팀장 코멘트 */
export async function addComment(f: FormData) {
  const u = await requireLead();
  const meetingId = str(f, "meetingId")!;
  const text = str(f, "text");
  if (!text) return;
  await db.insert(comments).values({ meetingId, authorId: u.id, text });
  revalidatePath("/", "layout");
}

/** 팀장 동행 요청 응답 */
export async function answerAccompany(f: FormData) {
  await requireLead();
  const id = str(f, "eventId")!;
  const answer = str(f, "answer") === "accept" ? "ACCEPTED" : "DECLINED";
  await db.update(events).set({ accompany: answer }).where(eq(events.id, id));
  revalidatePath("/", "layout");
}

/** 딜 단계 변경 */
export async function setDealStage(f: FormData) {
  await requireUser();
  const id = str(f, "dealId")!;
  const stage = str(f, "stage")!;
  await db.update(deals).set({ stage }).where(eq(deals.id, id));
  revalidatePath("/", "layout");
}

export async function logout() {
  const { cookies } = await import("next/headers");
  (await cookies()).delete("sn_uid");
  redirect("/login");
}
