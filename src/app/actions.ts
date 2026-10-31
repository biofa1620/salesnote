"use server";
// 화면의 입력 폼이 부르는 서버 함수 모음
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, events, activities, meetings, comments, deals, materials, shares, products, quotes, quoteItems, type MeetingSummary } from "@/db";
import { inArray } from "drizzle-orm";
import { STAGES } from "@/lib/format";
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

/* ───────────── 견적 ───────────── */

/** 견적 저장. 정가는 서버의 상품 마스터 값으로 다시 계산합니다 (화면 값을 믿지 않음). */
export async function createQuote(input: {
  contactId: string; title: string; validDays: number; note: string; parentId?: string | null;
  items: { productId: string; qty: number; unitPrice: number }[];
}) {
  const u = await requireUser();
  const contact = await db.query.contacts.findFirst({ where: (t, { eq }) => eq(t.id, input.contactId), with: { company: true } });
  if (!contact) throw new Error("고객이 없습니다");
  const rows = input.items.filter((i) => i.productId && i.qty > 0);
  if (rows.length === 0) throw new Error("품목을 하나 이상 넣어 주세요");
  const master = await db.query.products.findMany({ where: inArray(products.id, rows.map((r) => r.productId)) });
  const items = rows.map((r, i) => {
    const p = master.find((m) => m.id === r.productId);
    if (!p) throw new Error("없는 상품이 있습니다");
    return { productId: p.id, name: p.name, unit: p.unit, qty: Math.round(r.qty), listPrice: p.listPrice, unitPrice: Math.max(0, Math.round(r.unitPrice)), sort: i };
  });
  const totalList = items.reduce((a, i) => a + i.qty * i.listPrice, 0);
  const total = items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
  const needsApproval = items.some((i) => i.unitPrice !== i.listPrice);
  const parent = input.parentId ? await db.query.quotes.findFirst({ where: eq(quotes.id, input.parentId) }) : null;
  const deal = await db.query.deals.findFirst({ where: eq(deals.companyId, contact.companyId) });
  const [q] = await db
    .insert(quotes)
    .values({
      token: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      companyId: contact.companyId, contactId: contact.id, dealId: deal?.id ?? null, ownerId: u.id,
      title: input.title.trim() || `${contact.company.name} 견적`,
      version: parent ? parent.version + 1 : 1, parentId: parent?.id ?? null,
      status: needsApproval ? "PENDING" : "APPROVED", needsApproval, totalList, total,
      validUntil: new Date(Date.now() + Math.max(1, input.validDays || 14) * 86400000),
      note: input.note.trim() || null,
    })
    .returning();
  await db.insert(quoteItems).values(items.map((i) => ({ ...i, quoteId: q.id })));
  await db.insert(activities).values({
    userId: u.id, companyId: contact.companyId, contactId: contact.id, type: "QUOTE",
    text: `${contact.company.name} '${q.title}'${q.version > 1 ? ` ${q.version}차` : ""} ${needsApproval ? "승인 요청" : "작성"}`,
    sub: needsApproval ? "정가 외 금액 포함 · 팀장 승인 필요" : "정가 견적 · 바로 발송 가능", link: "/admin/quotes",
  });
  revalidatePath("/", "layout");
  return { id: q.id };
}

/** 팀장 승인·반려 */
export async function decideQuote(f: FormData) {
  const lead = await requireLead();
  const id = str(f, "quoteId")!;
  const ok = str(f, "decision") === "approve";
  const q = await db.query.quotes.findFirst({ where: eq(quotes.id, id), with: { company: true } });
  if (!q || q.status !== "PENDING") return;
  await db.update(quotes).set(ok
    ? { status: "APPROVED", approvedById: lead.id, approvedAt: new Date(), rejectReason: null }
    : { status: "REJECTED", approvedById: lead.id, approvedAt: new Date(), rejectReason: str(f, "reason") ?? "사유 없음" }
  ).where(eq(quotes.id, id));
  await db.insert(activities).values({
    userId: q.ownerId, companyId: q.companyId, type: "QUOTE",
    text: `${q.company.name} '${q.title}' ${ok ? "승인" : "반려"} (${lead.name})`,
    sub: ok ? "이제 고객에게 보낼 수 있습니다" : `사유: ${str(f, "reason") ?? "사유 없음"}`, link: "/admin/quotes",
  });
  revalidatePath("/", "layout");
}

/** 견적 발송 표시 (휴대폰 공유하기로 링크를 보낸 뒤 호출). 딜이 제안 전 단계면 '제안'으로 올립니다. */
export async function markQuoteSent(quoteId: string) {
  const u = await requireUser();
  const q = await db.query.quotes.findFirst({ where: eq(quotes.id, quoteId), with: { company: true, contact: true } });
  if (!q || q.ownerId !== u.id || (q.status !== "APPROVED" && q.status !== "SENT")) throw new Error("보낼 수 없는 견적입니다");
  const first = q.status === "APPROVED";
  await db.update(quotes).set({ status: "SENT", sentAt: q.sentAt ?? new Date() }).where(eq(quotes.id, quoteId));
  if (first) {
    await db.insert(activities).values({
      userId: u.id, companyId: q.companyId, contactId: q.contactId, type: "QUOTE",
      text: `${q.company.name}${q.contact ? ` ${q.contact.name}` : ""}에게 '${q.title}' 발송`, sub: "아직 열람 안 함", link: "/admin/quotes",
    });
    if (q.dealId) {
      const d = await db.query.deals.findFirst({ where: eq(deals.id, q.dealId) });
      if (d && STAGES.indexOf(d.stage as (typeof STAGES)[number]) > -1 && STAGES.indexOf(d.stage as (typeof STAGES)[number]) < STAGES.indexOf("제안")) {
        await db.update(deals).set({ stage: "제안", stageChangedAt: new Date() }).where(eq(deals.id, d.id));
      }
    }
  }
  revalidatePath("/", "layout");
  return { path: `/q/${q.token}`, title: q.title };
}

/** 상품·정가 등록/수정 (팀장) */
export async function saveProduct(f: FormData) {
  await requireLead();
  const id = str(f, "id");
  const v = { name: str(f, "name") ?? "상품", unit: str(f, "unit") ?? "건", listPrice: Math.max(0, Math.round(Number(str(f, "listPrice") ?? 0))), active: f.get("active") !== "off" };
  if (id) await db.update(products).set(v).where(eq(products.id, id));
  else await db.insert(products).values(v);
  revalidatePath("/", "layout");
}

export async function logout() {
  const { cookies } = await import("next/headers");
  (await cookies()).delete("sn_uid");
  redirect("/login");
}
