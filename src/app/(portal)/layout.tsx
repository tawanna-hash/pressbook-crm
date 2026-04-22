import Link from "next/link";
import { PortalSidebar } from "@/components/shared/portal-sidebar";
import { getPortalContext } from "@/lib/auth/portal-context";
import { stopImpersonation } from "@/app/(dashboard)/back-office/portals/actions";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPortalContext();

  // Unauthenticated and "unknown" users don't get the client portal
  // shell (sidebar, banner). Each child page decides how to handle an
  // unauthenticated visitor — typically by showing a small "ask your
  // agency for a fresh link" card. This also lets /portal/enter render
  // bare while it consumes its token.
  if (ctx.role === "unauthenticated" || ctx.role === "unknown") {
    return (
      <div className="min-h-screen bg-muted-bg px-4 py-10">
        <div className="mx-auto max-w-2xl">{children}</div>
      </div>
    );
  }

  const isImpersonating = ctx.role === "client" && Boolean(ctx.impersonation);
  const impersonatedName =
    ctx.role === "client"
      ? [ctx.contact.firstName, ctx.contact.lastName]
          .filter(Boolean)
          .join(" ") || ctx.contact.email || "this client"
      : "";
  const impersonatedEmail =
    ctx.role === "client"
      ? ctx.contact.portalEmail || ctx.contact.email || ""
      : "";

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
        {isImpersonating && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r)] border border-[rgba(220,38,38,0.35)] bg-[rgba(220,38,38,0.08)] px-4 py-2.5 text-[12.5px] text-[color:#7f1d1d]">
            <div>
              <span className="font-semibold">Impersonating</span>{" "}
              {impersonatedName}
              {impersonatedEmail ? (
                <span className="opacity-80"> ({impersonatedEmail})</span>
              ) : null}
              . Actions you take are performed as the client.
            </div>
            <form action={stopImpersonation}>
              <button
                type="submit"
                className="rounded-[var(--r)] border border-[rgba(220,38,38,0.4)] bg-white px-2.5 py-1 text-[12px] font-semibold text-[color:#7f1d1d] shadow-[var(--sh-xs)] hover:bg-[rgba(220,38,38,0.06)]"
              >
                Exit Impersonation
              </button>
            </form>
          </div>
        )}
        {ctx.role === "staff" && (
          <div className="mb-5 rounded-[var(--r)] border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)] px-4 py-2 text-[12.5px] text-[color:#8a6900]">
            Staff preview — this is what {ctx.org.name}&apos;s clients see.
            To view as a specific client, use{" "}
            <Link href="/back-office/portals" className="font-semibold underline">
              Back Office → Client Portals
            </Link>
            . Back to <Link href="/" className="font-semibold underline">Dashboard</Link>.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
