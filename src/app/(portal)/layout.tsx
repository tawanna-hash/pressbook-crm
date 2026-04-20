import { redirect } from "next/navigation";
import { PortalSidebar } from "@/components/shared/portal-sidebar";
import { getPortalRole } from "@/lib/auth/role";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getPortalRole();
  // Middleware already requires auth. Staff members belong in the CRM at /.
  if (role === "staff") {
    redirect("/");
  }

  return (
    <div className="min-h-screen">
      <PortalSidebar />
      <main
        className="min-h-screen p-8"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        {children}
      </main>
    </div>
  );
}
