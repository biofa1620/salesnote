"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  ["/admin", "대시보드"],
  ["/admin/pipeline", "파이프라인"],
  ["/admin/schedule", "팀 일정"],
  ["/admin/timeline", "활동 타임라인"],
  ["/admin/meetings", "미팅 카드"],
  ["/admin/customers", "고객사"],
  ["/admin/indicators", "선행지표"],
  ["/admin/materials", "자료실"],
] as const;

export function AdminNav() {
  const p = usePathname();
  return (
    <nav className="nav" aria-label="주 메뉴">
      {MENU.map(([href, label]) => (
        <Link key={href} href={href} className={(href === "/admin" ? p === href : p.startsWith(href)) ? "on" : ""}>{label}</Link>
      ))}
    </nav>
  );
}
