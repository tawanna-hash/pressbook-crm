import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shared/sidebar";
import { getPortalRole } from "@/lib/auth/role";
import { getActiveOrg, listOrgs } from "@/lib/auth/active-org";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getPortalRole();
  if (role === "client") {
    redirect("/portal");
  }

  const [orgs, activeOrg] = await Promise.all([listOrgs(), getActiveOrg()]);

  // Override the primary brand colour on the whole dashboard tree based on
  // the active organisation. Every Tailwind utility that references
  // `--pb-navy` (buttons, focus rings, active nav, badges, etc.) will pick
  // up the active org's colour automatically.
  const orgTheme = {
    "--pb-navy": activeOrg?.brandColor ?? "#021D40",
  } as React.CSSProperties;

  return (
    <div className="min-h-screen" style={orgTheme}>
      <Sidebar orgs={orgs} activeOrgSlug={activeOrg?.slug ?? ""} />
      <main
        className="min-h-screen p-8"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        {children}
      </main>
    </div>
  );
}
