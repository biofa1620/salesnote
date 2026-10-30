// 세일즈노트 데이터 모델 (기획서 6절)
// DB는 하나, 테이블로 나누어 ID로 연결합니다.
// 개발: SQLite 파일 / 운영: PostgreSQL로 옮길 때는 drizzle-orm/pg-core로 같은 구조를 옮기면 됩니다.
import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date());

/** 사용자. role: REP(영업사원) | LEAD(팀장) | ADMIN(관리자) */
export const users = sqliteTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("REP"),
  team: text("team").notNull().default("비즈메시징 사업팀"),
  createdAt: createdAt(),
});

/** 고객사. 같은 회사 명함은 고객사 하나로 묶입니다. */
export const companies = sqliteTable("companies", {
  id: id(),
  name: text("name").notNull().unique(),
  industry: text("industry"),
  createdAt: createdAt(),
});

/** 담당자(명함). 등록한 영업사원이 아니라 회사 소유입니다. */
export const contacts = sqliteTable("contacts", {
  id: id(),
  companyId: text("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  department: text("department"),
  title: text("title"),
  phone: text("phone"),
  email: text("email"),
  memo: text("memo"),
  cardImage: text("card_image"), // 파일 저장소 경로 (uploads/cards/...)
  createdById: text("created_by_id").notNull().references(() => users.id),
  createdAt: createdAt(),
});

/** 딜(영업기회). stage: 발굴 | 미팅 | 제안 | 협상 | 수주 | 실주 */
export const deals = sqliteTable("deals", {
  id: id(),
  companyId: text("company_id").notNull().references(() => companies.id),
  ownerId: text("owner_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("발굴"),
  probability: integer("probability"), // 2단계 수주확률. MVP는 단계 기본값을 씁니다.
  lostReason: text("lost_reason"),
  createdAt: createdAt(),
});

/** 일정. type: MEETING(고객 미팅) | INTERNAL(내부) | TODO(할 일) */
export const events = sqliteTable("events", {
  id: id(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  companyId: text("company_id").references(() => companies.id),
  contactId: text("contact_id").references(() => contacts.id),
  dealId: text("deal_id").references(() => deals.id),
  title: text("title").notNull(),
  type: text("type").notNull().default("MEETING"),
  startAt: integer("start_at", { mode: "timestamp" }).notNull(),
  endAt: integer("end_at", { mode: "timestamp" }).notNull(),
  location: text("location"),
  accompany: text("accompany"), // 동행 요청: REQUESTED | ACCEPTED | DECLINED
  source: text("source"), // AI: 회의록에서 찾은 일정
  createdAt: createdAt(),
});

/** 미팅 + 녹취록 + AI 요약 카드. status: DRAFT(확인 필요) | CONFIRMED(확정) */
export const meetings = sqliteTable("meetings", {
  id: id(),
  eventId: text("event_id").references(() => events.id),
  companyId: text("company_id").notNull().references(() => companies.id),
  dealId: text("deal_id").references(() => deals.id),
  ownerId: text("owner_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  attendees: text("attendees"),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  durationSec: integer("duration_sec").notNull().default(0),
  audioPath: text("audio_path"), // 녹음 원본. 보관 기간 뒤 자동 삭제 (scripts/cleanup-audio.ts)
  audioDeletedAt: integer("audio_deleted_at", { mode: "timestamp" }),
  transcript: text("transcript", { mode: "json" }).$type<TranscriptLine[]>(),
  summary: text("summary", { mode: "json" }).$type<MeetingSummary>(),
  status: text("status").notNull().default("DRAFT"),
  createdAt: createdAt(),
});

/** 팀장 코칭 코멘트 */
export const comments = sqliteTable("comments", {
  id: id(),
  meetingId: text("meeting_id").notNull().references(() => meetings.id),
  authorId: text("author_id").notNull().references(() => users.id),
  text: text("text").notNull(),
  createdAt: createdAt(),
});

/** 활동 이력 (활동 타임라인). type: MEETING | CALL | CARD | SCHEDULE */
export const activities = sqliteTable("activities", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id),
  companyId: text("company_id").references(() => companies.id),
  contactId: text("contact_id").references(() => contacts.id),
  type: text("type").notNull(),
  text: text("text").notNull(),
  sub: text("sub"),
  link: text("link"),
  createdAt: createdAt(),
});

export type TranscriptLine = { speaker: string; text: string };
export type MeetingSummary = {
  points: string[]; // 핵심 요약 3줄
  products: string; // 관심 상품
  budget: string; // 예산·일정
  decisionMaker: string; // 의사결정자
  competitor: string; // 경쟁사 언급
  concern: string; // 우려 사항
  nextActions: { text: string; due?: string }[]; // 다음 할 일
};

export const usersRelations = relations(users, ({ many }) => ({
  deals: many(deals),
  events: many(events),
  meetings: many(meetings),
  activities: many(activities),
}));
export const companiesRelations = relations(companies, ({ many }) => ({
  contacts: many(contacts),
  deals: many(deals),
  events: many(events),
  meetings: many(meetings),
  activities: many(activities),
}));
export const contactsRelations = relations(contacts, ({ one }) => ({
  company: one(companies, { fields: [contacts.companyId], references: [companies.id] }),
  createdBy: one(users, { fields: [contacts.createdById], references: [users.id] }),
}));
export const dealsRelations = relations(deals, ({ one }) => ({
  company: one(companies, { fields: [deals.companyId], references: [companies.id] }),
  owner: one(users, { fields: [deals.ownerId], references: [users.id] }),
}));
export const eventsRelations = relations(events, ({ one }) => ({
  owner: one(users, { fields: [events.ownerId], references: [users.id] }),
  company: one(companies, { fields: [events.companyId], references: [companies.id] }),
  contact: one(contacts, { fields: [events.contactId], references: [contacts.id] }),
  meeting: one(meetings),
}));
export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  owner: one(users, { fields: [meetings.ownerId], references: [users.id] }),
  company: one(companies, { fields: [meetings.companyId], references: [companies.id] }),
  event: one(events, { fields: [meetings.eventId], references: [events.id] }),
  comments: many(comments),
}));
export const commentsRelations = relations(comments, ({ one }) => ({
  meeting: one(meetings, { fields: [comments.meetingId], references: [meetings.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
}));
export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, { fields: [activities.userId], references: [users.id] }),
  company: one(companies, { fields: [activities.companyId], references: [companies.id] }),
}));
