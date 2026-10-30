import { asc } from "drizzle-orm";
import { db, companies } from "@/db";
import { Recorder } from "@/components/Recorder";

export default async function RecordPage({ searchParams }: { searchParams: Promise<{ eventId?: string; contactId?: string }> }) {
  const sp = await searchParams;
  const ev = sp.eventId ? await db.query.events.findFirst({ where: (t, { eq }) => eq(t.id, sp.eventId!), with: { company: true, contact: true } }) : null;
  const ct = sp.contactId ? await db.query.contacts.findFirst({ where: (t, { eq }) => eq(t.id, sp.contactId!), with: { company: true } }) : null;
  const list = await db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(asc(companies.name));
  const company = ev?.company ?? ct?.company ?? null;
  const person = ev?.contact ?? ct ?? null;
  return (
    <Recorder
      companies={list}
      eventId={ev?.id ?? null}
      defaultCompanyId={company?.id ?? ""}
      defaultTitle={ev ? ev.title.replace(" · ", " ") : company ? `${company.name} 미팅` : ""}
      attendees={person ? `${person.name} ${person.title ?? ""}`.trim() : ""}
    />
  );
}
