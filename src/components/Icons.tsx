// 선 아이콘 모음 (시안과 같은 모양)
type P = { size?: number; color?: string };
const base = (size = 22, color = "currentColor") => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color,
  strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
});
export const IHome = (p: P) => <svg {...base(p.size, p.color)}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>;
export const IUsers = (p: P) => <svg {...base(p.size, p.color)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2" /></svg>;
export const ICamera = (p: P) => <svg {...base(p.size, p.color)}><path d="M4 7h3l2-2.5h6L17 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></svg>;
export const ICalendar = (p: P) => <svg {...base(p.size, p.color)}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>;
export const INote = (p: P) => <svg {...base(p.size, p.color)}><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 8.5h8M8 12.5h8M8 16.5h5" /></svg>;
export const IMic = (p: P) => <svg {...base(p.size, p.color)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>;
export const IPhone = (p: P) => <svg {...base(p.size, p.color)}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" /></svg>;
export const IMail = (p: P) => <svg {...base(p.size, p.color)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6 8.5 7 8.5-7" /></svg>;
export const IBack = (p: P) => <svg {...base(p.size, p.color)}><path d="M15 5l-7 7 7 7" /></svg>;
export const IPlus = (p: P) => <svg {...base(p.size, p.color)}><path d="M12 5v14M5 12h14" /></svg>;
export const ISpark = (p: P) => <svg {...base(p.size, p.color)}><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /></svg>;
export const IChevron = (p: P & { up?: boolean }) => (
  <svg {...base(p.size ?? 14, p.color)} style={p.up ? undefined : { transform: "rotate(180deg)" }}><path d="M6 15l6-6 6 6" /></svg>
);
