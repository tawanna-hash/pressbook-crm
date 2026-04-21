"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  FileUp,
  Link2,
  Mail,
  Printer,
  Receipt,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAgreement } from "./actions";
import {
  AD_SIZES,
  EBLAST_PACKAGES,
  FREQUENCIES,
  PAYMENT_MODES,
  withCardSurcharge,
  type PaymentMode,
} from "./options";

export type Flow = "upload" | "email" | "print";

export type ClientOption = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
};

type FlowConfig = {
  title: string;
  subtitle: string;
  primaryLabel: string;
  icon: React.ReactNode;
};

const FLOW_CONFIG: Record<Flow, FlowConfig> = {
  upload: {
    title: "Upload Signed Agreement",
    subtitle: "Attach a signed PDF or image. Marked Signed with today's date.",
    primaryLabel: "Save & Mark Signed",
    icon: <FileUp className="h-[18px] w-[18px]" />,
  },
  email: {
    title: "New Email Agreement",
    subtitle:
      "Fill advertiser info, pick payment, and send. Status becomes Sent.",
    primaryLabel: "Save & Queue Email",
    icon: <Mail className="h-[18px] w-[18px]" />,
  },
  print: {
    title: "New Print Agreement",
    subtitle:
      "Insertion order + terms. Save as Draft, then open printable to sign.",
    primaryLabel: "Save & Open Printable",
    icon: <Printer className="h-[18px] w-[18px]" />,
  },
};

type Attachment = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
};

// ── Three tiles ──
export function ThreeFlowButtons({ clients }: { clients: ClientOption[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <FlowCard flow="upload" clients={clients} tone="navy" />
      <FlowCard flow="email" clients={clients} tone="green" />
      <FlowCard flow="print" clients={clients} tone="amber" />
    </div>
  );
}

function FlowCard({
  flow,
  clients,
  tone,
}: {
  flow: Flow;
  clients: ClientOption[];
  tone: "navy" | "green" | "amber";
}) {
  const [open, setOpen] = useState(false);
  const cfg = FLOW_CONFIG[flow];
  const toneClasses = {
    navy: "bg-pb-navy/10 text-pb-navy",
    green: "bg-[rgba(34,139,99,0.12)] text-[rgb(22,101,72)]",
    amber: "bg-[rgba(255,199,0,0.15)] text-[color:#8a6900]",
  }[tone];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full flex-col items-start gap-2 rounded-[var(--rlg)] border border-border bg-card p-4 text-left shadow-[var(--sh-xs)] transition-shadow hover:shadow-[var(--sh-sm)]"
      >
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-[var(--r)] ${toneClasses}`}
        >
          {cfg.icon}
        </div>
        <div className="text-[14px] font-semibold text-text">{cfg.title}</div>
        <div className="text-[12px] leading-snug text-text-2">
          {cfg.subtitle}
        </div>
      </button>
      {open && (
        <FlowModal
          flow={flow}
          clients={clients}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ── Shared modal ──
function FlowModal({
  flow,
  clients,
  onClose,
}: {
  flow: Flow;
  clients: ClientOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const cfg = FLOW_CONFIG[flow];

  // Advertiser info (all flows)
  const [contactId, setContactId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [repName, setRepName] = useState("");
  const [advertiserEmail, setAdvertiserEmail] = useState("");
  const [advertiserPhone, setAdvertiserPhone] = useState("");
  const [advertiserAddress, setAdvertiserAddress] = useState("");

  // Ad fields (email + print flows)
  const [adSize, setAdSize] = useState<string>(AD_SIZES[0]);
  const [frequency, setFrequency] = useState<string>(FREQUENCIES[0]);
  const [adRate, setAdRate] = useState("");

  // Sign date (upload flow) / Sign date (print flow)
  const today = new Date().toISOString().slice(0, 10);
  const [signDate, setSignDate] = useState(today);

  // Billing (email flow)
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("card");
  const [selectedEblast, setSelectedEblast] = useState<Set<string>>(new Set());

  // Upload flow
  const [signedDoc, setSignedDoc] = useState<Attachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Extra attachments (email + print)
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const multiRef = useRef<HTMLInputElement>(null);

  // Send-to (email flow)
  const [sentToEmail, setSentToEmail] = useState("");

  // Notes
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ id: string } | null>(null);
  const [pending, start] = useTransition();

  function onClientChange(id: string) {
    setContactId(id);
    const match = clients.find((c) => c.id === id);
    if (match) {
      if (match.company && !companyName) setCompanyName(match.company);
      if (match.email && !advertiserEmail) setAdvertiserEmail(match.email);
      if (match.email && flow === "email" && !sentToEmail)
        setSentToEmail(match.email);
      if (match.email && !billingEmail) setBillingEmail(match.email);
    }
  }

  async function handleSignedFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4_000_000)
      return setError("File is over 4 MB. Use a smaller PDF or image.");
    setSignedDoc({
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      dataUrl: await fileToDataUrl(file),
    });
    setError(null);
  }

  async function handleMultiFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const converted: Attachment[] = [];
    for (const f of files) {
      if (f.size > 4_000_000) {
        setError(`"${f.name}" is over 4 MB — skipped.`);
        continue;
      }
      converted.push({
        filename: f.name,
        mimeType: f.type,
        sizeBytes: f.size,
        dataUrl: await fileToDataUrl(f),
      });
    }
    setAttachments((prev) => [...prev, ...converted]);
    if (multiRef.current) multiRef.current.value = "";
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleEblast(id: string) {
    setSelectedEblast((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Live order total for the Email flow.
  const adRateCents = (() => {
    const s = adRate.trim().replace(/[$,\s]/g, "");
    if (!s) return 0;
    if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return 0;
    const [whole, frac = ""] = s.split(".");
    return (
      Number.parseInt(whole, 10) * 100 + Number.parseInt(frac.padEnd(2, "0"), 10)
    );
  })();
  const eblastCents = [...selectedEblast].reduce((sum, id) => {
    const pkg = EBLAST_PACKAGES.find((p) => p.id === id);
    return sum + (pkg?.priceCents ?? 0);
  }, 0);
  const subtotal = adRateCents + eblastCents;
  const total =
    paymentMode === "card" ? withCardSurcharge(subtotal) : subtotal;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (flow === "upload" && !signedDoc) {
      setError("Attach the signed document first.");
      return;
    }
    if (flow === "email" && !sentToEmail) {
      setError("Send-to email is required.");
      return;
    }
    if (!contactId && !companyName.trim()) {
      setError("Pick a client or enter a company name.");
      return;
    }

    const fd = new FormData();
    fd.set("flow", flow);
    fd.set("contactId", contactId);
    fd.set("companyName", companyName);
    fd.set("repName", repName);
    fd.set("advertiserEmail", advertiserEmail);
    fd.set("advertiserPhone", advertiserPhone);
    fd.set("advertiserAddress", advertiserAddress);
    fd.set("adSize", adSize);
    fd.set("frequency", frequency);
    fd.set("adRate", adRate);
    fd.set("signDate", signDate);
    fd.set("billingName", billingName);
    fd.set("billingEmail", billingEmail);
    fd.set("paymentMode", paymentMode);
    fd.set("sentToEmail", sentToEmail);
    fd.set("notes", notes);
    fd.set("eblastPackages", JSON.stringify([...selectedEblast]));

    // Attachments payload (combine the signed doc with any extras)
    const allAttachments: Attachment[] = [];
    if (signedDoc) allAttachments.push(signedDoc);
    allAttachments.push(...attachments);
    fd.set("attachments", JSON.stringify(allAttachments));

    start(async () => {
      const res = await createAgreement(fd);
      if (res.ok && res.id) {
        setSuccessInfo({ id: res.id });
        if (flow === "print") window.open(`/agreements/${res.id}/print`, "_blank");
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }

  if (successInfo) {
    return (
      <ModalShell cfg={cfg} onClose={onClose}>
        <div className="px-5 py-6 sm:px-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(34,139,99,0.12)] text-[rgb(34,139,99)]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h3 className="text-center text-[15px] font-semibold text-text">
            {flow === "upload" && "Signed agreement saved"}
            {flow === "email" && "Email agreement saved"}
            {flow === "print" && "Print agreement saved"}
          </h3>
          <p className="mt-1 text-center text-[12.5px] text-text-2">
            {flow === "upload" &&
              "Marked Signed. You can edit details from the list."}
            {flow === "email" &&
              "Status is Sent. Send the printable link with your usual email tool — automatic sending is coming when Stripe + email keys are added."}
            {flow === "print" &&
              "A printable view opened in a new tab. Save or print from there."}
          </p>
          {(flow === "email" || flow === "print") && (
            <div className="mt-4 flex flex-col gap-2 rounded-[var(--r)] border border-border bg-muted-bg/40 px-3 py-3 text-[12px] sm:flex-row sm:items-center">
              <span className="font-semibold text-text-2">Printable link</span>
              <code className="flex-1 truncate rounded bg-card px-2 py-1 text-[11.5px] tabular-nums text-text ring-1 ring-border">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/agreements/${successInfo.id}/print`
                  : `/agreements/${successInfo.id}/print`}
              </code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (typeof navigator === "undefined") return;
                  navigator.clipboard
                    .writeText(
                      `${window.location.origin}/agreements/${successInfo.id}/print`,
                    )
                    .catch(() => {});
                }}
              >
                Copy
              </Button>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-muted-bg/30 px-5 py-3.5 sm:px-6">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => {
              onClose();
              router.refresh();
            }}
          >
            Done
          </Button>
          <Link
            href={`/agreements/${successInfo.id}/print`}
            target="_blank"
            className="inline-flex"
          >
            <Button type="button" variant="primary" size="md">
              Open Printable
            </Button>
          </Link>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell cfg={cfg} onClose={onClose}>
      <form
        onSubmit={handleSubmit}
        className="max-h-[calc(100vh-220px)] space-y-5 overflow-y-auto px-5 py-5 sm:px-6"
      >
        {/* Upload-only: signed file picker up top */}
        {flow === "upload" && (
          <Field label="Signed document" required>
            {signedDoc ? (
              <div className="flex items-center justify-between rounded-[var(--r)] border border-border bg-muted-bg/40 px-3 py-2 text-[12.5px] text-text">
                <span className="inline-flex items-center gap-2 truncate">
                  <FileText className="h-3.5 w-3.5 text-pb-navy" />
                  <span className="truncate">{signedDoc.filename}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSignedDoc(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-text-2 hover:bg-[rgba(219,25,36,0.08)] hover:text-pb-red"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--r)] border-2 border-dashed border-border bg-muted-bg/30 px-6 py-8 text-center hover:bg-muted-bg/50">
                <FileUp className="h-6 w-6 text-text-3" />
                <span className="text-[13px] font-medium text-text">
                  Choose PDF or image
                </span>
                <span className="text-[11.5px] text-text-3">Max 4 MB</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/*,.doc,.docx"
                  className="hidden"
                  onChange={handleSignedFile}
                />
              </label>
            )}
          </Field>
        )}

        {/* ── Advertiser Info (all flows) ── */}
        <Section label="Advertiser Information">
          <Field label="Existing client (optional)">
            <div className="relative">
              <select
                value={contactId}
                onChange={(e) => onClientChange(e.target.value)}
                className="w-full appearance-none rounded-[var(--r)] border border-border bg-card px-3 py-2 pr-9 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              >
                <option value="">— Pick a client to auto-fill —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
            </div>
          </Field>

          <Row2>
            <Field label="Company Name" required>
              <TextInput
                value={companyName}
                onChange={setCompanyName}
                placeholder="Acme Inc."
              />
            </Field>
            <Field label="Representative">
              <TextInput
                value={repName}
                onChange={setRepName}
                placeholder="Full name"
              />
            </Field>
          </Row2>

          <Row2>
            <Field label="Email">
              <TextInput
                value={advertiserEmail}
                onChange={setAdvertiserEmail}
                placeholder="contact@acme.com"
                type="email"
              />
            </Field>
            <Field label="Phone">
              <TextInput
                value={advertiserPhone}
                onChange={setAdvertiserPhone}
                placeholder="000-000-0000"
              />
            </Field>
          </Row2>

          <Field label="Mailing Address">
            <TextInput
              value={advertiserAddress}
              onChange={setAdvertiserAddress}
              placeholder="Street, Suite, City, State ZIP"
            />
          </Field>
        </Section>

        {/* ── Insertion Order (email + print) ── */}
        {flow !== "upload" && (
          <Section label="Insertion Order">
            <Row2>
              <Field label="Ad Size">
                <SelectInput
                  value={adSize}
                  onChange={setAdSize}
                  options={AD_SIZES as unknown as string[]}
                />
              </Field>
              <Field label="Frequency">
                <SelectInput
                  value={frequency}
                  onChange={setFrequency}
                  options={FREQUENCIES as unknown as string[]}
                />
              </Field>
            </Row2>

            <Row2>
              <Field label="Ad Rate (USD / issue)">
                <MoneyInput value={adRate} onChange={setAdRate} />
              </Field>
              <Field label="Sign Date">
                <TextInput
                  type="date"
                  value={signDate}
                  onChange={setSignDate}
                />
              </Field>
            </Row2>
          </Section>
        )}

        {/* Upload-flow date + status */}
        {flow === "upload" && (
          <Section label="Signed Details">
            <Row2>
              <Field label="Signed Date">
                <TextInput type="date" value={signDate} onChange={setSignDate} />
              </Field>
              <Field label="Ad Rate (optional)">
                <MoneyInput value={adRate} onChange={setAdRate} />
              </Field>
            </Row2>
          </Section>
        )}

        {/* ── e-Blast packages (email only) ── */}
        {flow === "email" && (
          <Section label="e-Blast Packages (optional)">
            <div className="space-y-2">
              {EBLAST_PACKAGES.map((pkg) => {
                const checked = selectedEblast.has(pkg.id);
                return (
                  <label
                    key={pkg.id}
                    className={`block cursor-pointer rounded-[var(--r)] border px-3 py-3 transition-colors ${
                      checked
                        ? "border-pb-navy bg-pb-navy/5 ring-2 ring-[rgba(2,29,64,0.12)]"
                        : "border-border bg-card hover:bg-muted-bg"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEblast(pkg.id)}
                        className="mt-0.5 h-4 w-4 accent-[#021D40]"
                      />
                      <div className="flex-1">
                        <div className="text-[13px] font-semibold text-text">
                          {pkg.name}
                        </div>
                        <ul className="mt-1 space-y-0.5 text-[12px] text-text-2">
                          {pkg.features.map((f) => (
                            <li key={f}>✓ {f}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── Billing + Payment (email only) ── */}
        {flow === "email" && (
          <Section label="Billing">
            <Row2>
              <Field label="Billing Contact">
                <TextInput value={billingName} onChange={setBillingName} />
              </Field>
              <Field label="Billing Email">
                <TextInput
                  value={billingEmail}
                  onChange={setBillingEmail}
                  type="email"
                />
              </Field>
            </Row2>

            <Field label="Payment Mode">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {PAYMENT_MODES.map((m) => {
                  const active = paymentMode === m.value;
                  const Icon =
                    m.value === "card"
                      ? CreditCard
                      : m.value === "link"
                        ? Link2
                        : m.value === "invoice"
                          ? Receipt
                          : Wallet;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPaymentMode(m.value)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-[var(--r)] border px-2 py-2 text-[11.5px] font-medium transition-colors ${
                        active
                          ? "border-pb-navy bg-pb-navy/5 text-pb-navy ring-2 ring-[rgba(2,29,64,0.12)]"
                          : "border-border bg-card text-text-2 hover:bg-muted-bg"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Payment mode hints */}
            {paymentMode === "card" && (
              <Hint tone="navy">
                Card will be charged on send. A 3% surcharge is added. Stripe
                Elements mount goes here once <code>STRIPE_SECRET_KEY</code> is
                set.
              </Hint>
            )}
            {paymentMode === "link" && (
              <Hint tone="blue">
                A Stripe payment-link URL will be generated and included as a
                &ldquo;Pay Now&rdquo; button in the email.
              </Hint>
            )}
            {paymentMode === "invoice" && (
              <Hint tone="green">
                A Stripe invoice will be created and sent to the billing email.
              </Hint>
            )}
            {paymentMode === "check" && (
              <Hint tone="amber">
                Payment by check. No card charge. Make checks payable to{" "}
                <strong>Caxton Publications, Inc.</strong> — P.O. Box 81366,
                Austin, TX 78708-1366.
              </Hint>
            )}

            {/* Send-to email + order summary */}
            <Field label="Send To Email" required>
              <TextInput
                value={sentToEmail}
                onChange={setSentToEmail}
                type="email"
                placeholder="contact@acme.com"
              />
            </Field>

            {subtotal > 0 && (
              <div className="rounded-[var(--r)] border border-border bg-muted-bg/40 px-3 py-3 text-[12.5px]">
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-text-2">
                  Order Summary
                </div>
                <SummaryRow label="Ad Rate" cents={adRateCents} />
                {eblastCents > 0 && (
                  <SummaryRow label="e-Blast Add-ons" cents={eblastCents} />
                )}
                {paymentMode === "card" && (
                  <SummaryRow
                    label="Card Surcharge (3%)"
                    cents={total - subtotal}
                  />
                )}
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                  <span className="font-semibold text-text">Total</span>
                  <span className="text-[14px] font-bold text-pb-navy tabular-nums">
                    {formatMoney(total)}
                  </span>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* ── Attachments (email + print) ── */}
        {flow !== "upload" && (
          <Section label="Attachments">
            <div className="flex flex-col items-center gap-2 rounded-[var(--r)] border-2 border-dashed border-border bg-muted-bg/30 px-4 py-5 text-center">
              <FileUp className="h-5 w-5 text-text-3" />
              <span className="text-[12.5px] text-text-2">
                Attach any files to include with the agreement (up to 4 MB each)
              </span>
              <input
                ref={multiRef}
                type="file"
                multiple
                onChange={handleMultiFiles}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => multiRef.current?.click()}
              >
                + Add files
              </Button>
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] text-text-2"
                  >
                    <FileText className="h-3 w-3" />
                    {a.filename}
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="rounded-full p-0.5 hover:bg-[rgba(219,25,36,0.08)] hover:text-pb-red"
                      aria-label={`Remove ${a.filename}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Notes */}
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Anything worth capturing…"
            className="w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text placeholder:text-text-3 focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
          />
        </Field>

        {error && (
          <div className="flex items-start gap-2 rounded-[var(--r)] border border-pb-red/30 bg-[rgba(219,25,36,0.06)] px-3 py-2 text-[12.5px] text-pb-red">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="-mx-5 flex items-center justify-end gap-2 border-t border-border bg-muted-bg/30 px-5 py-3.5 sm:-mx-6 sm:px-6">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={pending}>
            {pending ? "Saving…" : cfg.primaryLabel}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Sub-pieces ───────────────────────────────────────────────
function ModalShell({
  cfg,
  onClose,
  children,
}: {
  cfg: FlowConfig;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-[var(--rlg)] bg-card shadow-[var(--sh-lg)] ring-1 ring-black/5">
        <div className="relative border-b border-border px-5 py-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[var(--r)] bg-pb-navy/10 text-pb-navy">
              {cfg.icon}
            </div>
            <div className="text-[15px] font-semibold text-text">
              {cfg.title}
            </div>
            <div className="max-w-md text-[12px] leading-relaxed text-text-2">
              {cfg.subtitle}
            </div>
          </div>
          <div className="absolute right-4 top-4 sm:right-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="border-b border-border pb-2 text-[10.5px] font-semibold uppercase tracking-wider text-text-2">
        {label}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-text-2">
        {label}
        {required && <span className="ml-0.5 text-pb-red">*</span>}
      </label>
      {children}
    </div>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text placeholder:text-text-3 focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-[var(--r)] border border-border bg-card px-3 py-2 pr-9 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-3">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1500.00"
        className="w-full rounded-[var(--r)] border border-border bg-card py-2 pl-7 pr-3 text-[13px] tabular-nums text-text placeholder:text-text-3 focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
      />
    </div>
  );
}

function SummaryRow({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex items-center justify-between text-[12px] text-text-2">
      <span>{label}</span>
      <span className="tabular-nums text-text">{formatMoney(cents)}</span>
    </div>
  );
}

function Hint({
  tone,
  children,
}: {
  tone: "navy" | "blue" | "green" | "amber";
  children: React.ReactNode;
}) {
  const cls = {
    navy: "border-pb-navy/30 bg-pb-navy/5 text-pb-navy",
    blue: "border-blue-300/40 bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200",
    green:
      "border-[rgba(34,139,99,0.3)] bg-[rgba(34,139,99,0.08)] text-[rgb(22,101,72)]",
    amber:
      "border-[rgba(255,199,0,0.35)] bg-[rgba(255,199,0,0.1)] text-[color:#8a6900]",
  }[tone];
  return (
    <div
      className={`rounded-[var(--r)] border px-3 py-2 text-[11.5px] leading-relaxed ${cls}`}
    >
      {children}
    </div>
  );
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}
