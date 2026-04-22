import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  consumeMagicLink,
  peekMagicLink,
} from "@/lib/auth/portal-session";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ token?: string }>;

/**
 * Landing page for emailed magic links. Consumes the token (single-use)
 * and drops the visitor straight into /portal. Renders a helpful error
 * state if the link is stale, already used, or unknown.
 */
export default async function PortalEnterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token } = await searchParams;

  if (!token) {
    return <InvalidLinkCard title="No link token" />;
  }

  // Peek first so we can render a tailored message without consuming
  // the token on an already-consumed visit (idempotent error UI).
  const peek = await peekMagicLink(token);
  if (peek.status !== "ok") {
    return <InvalidLinkCard title={messageFor(peek.status)} />;
  }

  const result = await consumeMagicLink(token);
  if (!result.ok) {
    return <InvalidLinkCard title={messageFor(result.reason)} />;
  }

  redirect("/portal");
}

function InvalidLinkCard({ title }: { title: string }) {
  return (
    <div className="mt-8 rounded-[var(--rlg)] border border-border bg-card p-8 shadow-[var(--sh-xs)]">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(245,158,11,0.12)]">
        <AlertCircle className="h-5 w-5 text-pb-amber" />
      </div>
      <h1 className="mb-1 text-xl font-bold text-text">{title}</h1>
      <p className="text-[13px] leading-relaxed text-text-2">
        Magic links work one time and expire quickly. Reply to the email
        that brought you here, or contact your agency rep — they can send
        you a fresh link in seconds.
      </p>
      <div className="mt-4 flex items-center gap-2 text-[12px] text-text-3">
        <CheckCircle2 className="h-3.5 w-3.5" />
        No account or password needed — everything happens through the
        link in your inbox.
      </div>
      <div className="mt-6 text-[12.5px]">
        <Link href="/portal" className="font-semibold text-pb-navy underline">
          Back to portal
        </Link>
      </div>
    </div>
  );
}

function messageFor(
  status: "not_found" | "link_expired" | "already_consumed",
): string {
  switch (status) {
    case "not_found":
      return "That link isn't valid";
    case "link_expired":
      return "That link expired";
    case "already_consumed":
      return "That link has already been used";
  }
}
