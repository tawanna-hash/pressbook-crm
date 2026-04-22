import { notFound } from "next/navigation";
import {
  CreditCard,
  FileText,
  FolderOpen,
  MapPin,
  PartyPopper,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPortalContext } from "@/lib/auth/portal-context";
import { finishOnboarding } from "./actions";

export const dynamic = "force-dynamic";

const QUICK_TOUR = [
  {
    title: "Shared Files",
    href: "/portal/files",
    icon: FolderOpen,
    detail: "Upload and download files between us and you.",
  },
  {
    title: "Forms",
    href: "/portal/collect",
    icon: FileText,
    detail: "Quick forms we use to gather ad details and preferences.",
  },
  {
    title: "Billing",
    href: "/portal/billing",
    icon: CreditCard,
    detail: "Agreements, invoices, and one-click Stripe payments.",
  },
  {
    title: "Team & Locations",
    href: "/portal/team",
    icon: Users,
    detail: "Meet the people on your account and our office addresses.",
  },
];

export default async function PortalWelcomePage() {
  const ctx = await getPortalContext();
  if (ctx.role !== "client") notFound();

  const contact = ctx.contact;
  const fullName =
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
    "there";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: ctx.org.brandColor + "1a" }}
        >
          <PartyPopper
            className="h-6 w-6"
            style={{ color: ctx.org.brandColor }}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">
            Welcome to your {ctx.org.name} portal, {fullName}
          </h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            Take a minute to confirm your info below, then you&rsquo;re set.
            You can come back any time by clicking a fresh magic link from
            our team.
          </p>
        </div>
      </div>

      <form
        action={finishOnboarding}
        className="rounded-[var(--rlg)] border border-border bg-card p-6 shadow-[var(--sh-xs)]"
      >
        <h2 className="mb-3 text-[15px] font-semibold text-text">
          Confirm your details
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="First Name"
            name="firstName"
            defaultValue={contact.firstName ?? ""}
            required
          />
          <Field
            label="Last Name"
            name="lastName"
            defaultValue={contact.lastName ?? ""}
          />
          <Field
            label="Company"
            name="company"
            defaultValue={contact.company ?? ""}
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            defaultValue={contact.phone ?? ""}
          />
        </div>
        <p className="mt-3 text-[11.5px] text-text-3">
          We pre-filled what we have on file. Edit anything that&rsquo;s
          off — we&rsquo;ll update your account when you continue.
        </p>
        <div className="mt-5 flex items-center justify-end">
          <Button type="submit" variant="primary" size="md">
            Continue to My Portal
          </Button>
        </div>
      </form>

      <div>
        <h2 className="mb-3 text-[14px] font-semibold text-text">
          What you&rsquo;ll find in here
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_TOUR.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.title}
                className="flex items-start gap-3 rounded-[var(--rlg)] border border-border bg-card p-4 shadow-[var(--sh-xs)]"
              >
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[var(--r)] bg-muted-bg-2 text-pb-navy">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-text">
                    {t.title}
                  </div>
                  <div className="text-[12.5px] text-text-2">{t.detail}</div>
                </div>
              </div>
            );
          })}
          <div className="flex items-start gap-3 rounded-[var(--rlg)] border border-dashed border-border bg-muted-bg/40 p-4">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[var(--r)] bg-muted-bg-2 text-pb-navy">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[14px] font-semibold text-text">
                Location
              </div>
              <div className="text-[12.5px] text-text-2">
                {ctx.org.address
                  ? `${ctx.org.address}${
                      ctx.org.city ? `, ${ctx.org.city}` : ""
                    }`
                  : "Addresses and office info are under Portal → Location."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-text-2">
        {label}
        {required && <span className="ml-1 text-pb-red">*</span>}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-1 w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-pb-navy"
      />
    </div>
  );
}
