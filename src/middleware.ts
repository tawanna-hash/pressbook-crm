import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that do NOT require a Clerk session. The client portal is
// gated by its own magic-link session cookie (see lib/auth/portal-session.ts),
// not by Clerk, so the entire /portal(.*) tree is public as far as
// Clerk is concerned. Staff users happen to also hit /portal when
// impersonating, but their Clerk session is validated there anyway.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/cron(.*)",
  // Service-token-gated read-only exports used by the Caxton CRM
  // importer. Each route validates `Authorization: Bearer
  // $CRON_SECRET` itself; Clerk should not redirect them to /sign-in.
  "/api/admin/export-agreements",
  "/api/admin/export-invoices",
  "/portal(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
