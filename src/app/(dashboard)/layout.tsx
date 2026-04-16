import { Sidebar } from "@/components/shared/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main
        className="min-h-screen p-8"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        {children}
      </main>
    </div>
  );
}
