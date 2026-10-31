import { sellerName } from "./quotes";
import type { QuoteDocData } from "@/components/QuoteDoc";

type Q = {
  title: string; version: number; createdAt: Date; validUntil: Date | null; note: string | null; total: number;
  company: { name: string }; contact: { name: string; title: string | null } | null;
  owner: { name: string; team: string; email: string };
  items: { name: string; unit: string; qty: number; unitPrice: number; sort: number }[];
};
export function toDoc(q: Q): QuoteDocData {
  return {
    title: q.title, version: q.version, createdAt: q.createdAt, validUntil: q.validUntil, note: q.note, total: q.total,
    toCompany: q.company.name, toContact: q.contact ? `${q.contact.name} ${q.contact.title ?? ""}`.trim() : null,
    seller: sellerName(), sellerPerson: q.owner.name, sellerTeam: q.owner.team, sellerEmail: q.owner.email,
    items: [...q.items].sort((a, b) => a.sort - b.sort),
  };
}
