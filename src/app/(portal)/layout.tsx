import { redirect } from "next/navigation";
import { PortalSidebar } from "@/components/shared/portal-sidebar";
import { getPortalContext } from "@/lib/auth/portal-context";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPortalContext();

  if (ctx.role === "unauthenticated") {
    redirect("/sign-in?redirect=/portal");
  }

  if (ctx.role === "unknown") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-10 text-center">
        <h1 className="mb-2 text-2xl font-bold text-text">Account not linked</h1>
        <p className="max-w-md text-[13px] text-text-2">
          You&apos;re signed in as <span className="font-semibold">{ctx.clerkEmail}</span>,
          but we don&apos;t have a client or staff record for that address yet.
          Contact your agency rep to finish setup.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PortalSidebar
        org={{
          name: ctx.org.name,
          brandColor: ctx.org.brandColor,
          logoUrl: ctx.org.logoUrl,
        }}
        role={ctx.role}
      />
      <main
        className="min-h-screen p-8"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        {ctx.role === "staff" && (
          <div className="mb-5 rounded-[var(--r)] border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] px-4 py-2 text-[12.5px] text-[color:#8a6900]">
            Staff preview — this is what {ctx.org.name}&apos;s clients see.
            Back to <a href="/" className="font-semibold underline">Dashboard</a>.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
