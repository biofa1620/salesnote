import fs from "node:fs";
import path from "node:path";
import { seller } from "./quotes";
import type { QuoteDocData } from "@/components/QuoteDoc";

type Q = {
  title: string; version: number; createdAt: Date; validUntil: Date | null; note: string | null; total: number; sellerPhone: string | null;
  company: { name: string }; contact: { name: string; title: string | null } | null;
  owner: { name: string; team: string; email: string };
  items: { name: string; unit: string; qty: number; unitPrice: number; note: string | null; sort: number }[];
};

/** 로고 파일이 실제로 있을 때만 경로를 돌려줍니다 (없으면 회사명 글자로 표시) */
function logoPath(logo: string): string | null {
  if (!logo) return null;
  if (/^https?:\/\//.test(logo)) return logo;
  return fs.existsSync(path.join(process.cwd(), "public", logo.replace(/^\//, ""))) ? logo : null;
}

export function toDoc(q: Q): QuoteDocData {
  const s = seller();
  return {
    title: q.title, version: q.version, createdAt: q.createdAt, validUntil: q.validUntil, note: q.note, total: q.total,
    toCompany: q.company.name, toContact: q.contact ? `${q.contact.name} ${q.contact.title ?? ""}`.trim() : null,
    seller: { ...s, logo: logoPath(s.logo) },
    sellerPerson: q.owner.name, sellerTeam: q.owner.team, sellerEmail: q.owner.email, sellerPhone: q.sellerPhone,
    items: [...q.items].sort((a, b) => a.sort - b.sort).map((i) => ({ name: i.name, unit: i.unit, qty: i.qty, unitPrice: i.unitPrice, note: i.note })),
  };
}
