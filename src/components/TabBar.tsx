"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ICalendar, ICamera, IHome, INote, IUsers } from "./Icons";

export function TabBar() {
  const p = usePathname();
  const on = (prefix: string, exact = false) => (exact ? p === prefix : p.startsWith(prefix)) ? "on" : "";
  return (
    <nav className="tabbar" aria-label="하단 메뉴">
      <Link href="/m" className={on("/m", true)}><IHome />홈</Link>
      <Link href="/m/customers" className={on("/m/customers")}><IUsers />고객</Link>
      <Link href="/m/scan" className="fab" aria-label="명함 촬영"><ICamera size={26} color="#fff" /></Link>
      <Link href="/m/schedule" className={on("/m/schedule")}><ICalendar />일정</Link>
      <Link href="/m/meetings" className={on("/m/meetings") || on("/m/record")}><INote />회의록</Link>
    </nav>
  );
}
