"use server";
// 화면의 입력 폼이 부르는 서버 함수 모음
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, events, activities, meetings, comments, deals, materials, shares, type MeetingSummary } from "@/db";
import { saveFile } from "@/lib/storage";
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
  const d = await db.query.deals.findFirst({ where: eq(deals.id, id) });
  if (!d || d.stage === stage) return;
  await db.update(deals).set({ stage, stageChangedAt: new Date() }).where(eq(deals.id, id));
  revalidatePath("/", "layout");
}

/** 자료실에 자료 등록 (팀장) */
export async function uploadMaterial(f: FormData) {
  const u = await requireLead();
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const { relPath } = await saveFile("materials", file);
  await db.insert(materials).values({
    title: str(f, "title") ?? file.name, category: str(f, "category") ?? "브로슈어",
    description: str(f, "description"), filePath: relPath, fileName: file.name, createdById: u.id,
  });
  revalidatePath("/", "layout");
}

/** 자료 전송 링크 만들기. 돌려준 주소를 휴대폰 '공유하기'로 카카오톡·문자에 보냅니다. */
export async function createShare(materialId: string, contactId: string | null) {
  const u = await requireUser();
  const mat = await db.query.materials.findFirst({ where: eq(materials.id, materialId) });
  if (!mat) throw new Error("자료가 없습니다");
  const contact = contactId ? await db.query.contacts.findFirst({ where: (t, { eq }) => eq(t.id, contactId), with: { company: true } }) : null;
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await db.insert(shares).values({ token, materialId, userId: u.id, contactId: contact?.id ?? null, companyId: contact?.companyId ?? null });
  await db.insert(activities).values({
    userId: u.id, companyId: contact?.companyId ?? null, contactId: contact?.id ?? null, type: "SHARE",
    text: contact ? `${contact.company.name} ${contact.name} ${contact.title ?? ""}에게 '${mat.title}' 전송`.replace(/\s+/g, " ") : `'${mat.title}' 링크 전송`,
    sub: "아직 열람 안 함",
  });
  revalidatePath("/", "layout");
  return { path: `/s/${token}`, title: mat.title };
}

export async function logout() {
  const { cookies } = await import("next/headers");
  (await cookies()).delete("sn_uid");
  redirect("/login");
}
