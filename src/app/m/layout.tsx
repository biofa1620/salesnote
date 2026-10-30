import { TabBar } from "@/components/TabBar";
import { requireUser } from "@/lib/session";

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="m-shell">
      {children}
      <TabBar />
    </div>
  );
}
