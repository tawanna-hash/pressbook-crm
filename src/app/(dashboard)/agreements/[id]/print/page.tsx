import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  agreementAttachments,
  agreements,
  contacts,
  organizations,
} from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { termsForOrg } from "../../terms";
import { PrintActions } from "./print-actions";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export default async function PrintableAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const org = await getActiveOrg();
  if (!org) notFound();

  const [row] = await db
    .select({
      id: agreements.id,
      type: agreements.type,
      status: agreements.status,
      startDate: agreements.startDate,
      endDate: agreements.endDate,
      amount: agreements.amount,
      notes: agreements.notes,
      signedDocument: agreements.signedDocument,
      signedAt: agreements.signedAt,
      sentToEmail: agreements.sentToEmail,
      createdAt: agreements.createdAt,
      companyName: agreements.companyName,
      repName: agreements.repName,
      advertiserEmail: agreements.advertiserEmail,
      advertiserPhone: agreements.advertiserPhone,
      advertiserAddress: agreements.advertiserAddress,
      adSize: agreements.adSize,
      frequency: agreements.frequency,
      adRate: agreements.adRate,
      signDate: agreements.signDate,
      expDate: agreements.expDate,
      renewalNoticeDate: agreements.renewalNoticeDate,
      billingName: agreements.billingName,
      billingEmail: agreements.billingEmail,
      paymentMode: agreements.paymentMode,
      isUploaded: agreements.isUploaded,
      eblastPackages: agreements.eblastPackages,
      clientFirstName: contacts.firstName,
      clientLastName: contacts.lastName,
      clientEmail: contacts.email,
      clientCompany: contacts.company,
      clientAddress: contacts.address,
      orgName: organizations.name,
      orgBrand: organizations.brandColor,
      orgSlug: organizations.slug,
      orgDomain: organizations.domain,
    })
    .from(agreements)
    .leftJoin(contacts, eq(contacts.id, agreements.contactId))
    .leftJoin(organizations, eq(organizations.id, agreements.orgId))
    .where(and(eq(agreements.id, id), eq(agreements.orgId, org.id)))
    .limit(1);

  if (!row) notFound();

  const attachments = await db
    .select({
      id: agreementAttachments.id,
      filename: agreementAttachments.filename,
      mimeType: agreementAttachments.mimeType,
      dataUrl: agreementAttachments.dataUrl,
    })
    .from(agreementAttachments)
    .where(eq(agreementAttachments.agreementId, id))
    .orderBy(asc(agreementAttachments.uploadedAt));

  const advertiserDisplayName =
    row.companyName ||
    [row.clientFirstName, row.clientLastName].filter(Boolean).join(" ") ||
    row.clientCompany ||
    "—";

  const terms = termsForOrg(row.orgSlug);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; }
          article { page-break-inside: avoid; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Action bar (hidden on print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-[var(--r)] border border-border bg-card p-3 shadow-[var(--sh-xs)]">
          <div className="text-[12.5px] text-text-2">
            Printable agreement · created {formatDate(row.createdAt)}
          </div>
          <PrintActions />
        </div>

        {/* Letterhead */}
        <article className="rounded-[var(--rlg)] border border-border bg-card p-10 shadow-[var(--sh-xs)]">
          <header className="mb-8 flex items-start justify-between border-b border-border pb-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-[var(--r)] text-[14px] font-extrabold text-white"
                style={{ backgroundColor: row.orgBrand ?? "#021D40" }}
              >
                {(row.orgName ?? "PB").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[16px] font-bold text-text">
                  {row.orgName}
                </div>
                {row.orgDomain && (
                  <div className="text-[11.5px] text-text-2">{row.orgDomain}</div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-2">
                Advertising Agreement
              </div>
              <div className="mt-0.5 text-[11.5px] tabular-nums text-text-2">
                #{row.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </header>

          <h1 className="mb-1 text-[24px] font-bold text-text">
            {advertiserDisplayName}
          </h1>
          <p className="mb-6 text-[13px] text-text-2">
            Status:{" "}
            <span className="font-semibold text-text">
              {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
            </span>
            {row.signedAt && (
              <>
                {" · Signed "}
                <span className="font-semibold text-text">
                  {formatDate(row.signedAt)}
                </span>
              </>
            )}
            {row.isUploaded && (
              <>
                {" · Uploaded"}
              </>
            )}
          </p>

          {/* Parties */}
          <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <section>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-2">
                Publisher
              </div>
              <div className="text-[13px] font-semibold text-text">
                {row.orgName}
              </div>
              {row.orgDomain && (
                <div className="text-[12px] text-text-2">{row.orgDomain}</div>
              )}
            </section>

            <section>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-2">
                Advertiser
              </div>
              <div className="text-[13px] font-semibold text-text">
                {row.companyName ?? advertiserDisplayName}
              </div>
              {row.repName && (
                <div className="text-[12px] text-text-2">
                  Attn: {row.repName}
                </div>
              )}
              {(row.advertiserEmail || row.clientEmail) && (
                <div className="text-[12px] text-text-2">
                  {row.advertiserEmail ?? row.clientEmail}
                </div>
              )}
              {row.advertiserPhone && (
                <div className="text-[12px] text-text-2">
                  {row.advertiserPhone}
                </div>
              )}
              {(row.advertiserAddress || row.clientAddress) && (
                <div className="mt-0.5 whitespace-pre-wrap text-[12px] text-text-2">
                  {row.advertiserAddress ?? row.clientAddress}
                </div>
              )}
            </section>
          </div>

          {/* Insertion Order */}
          <section className="mb-6 rounded-[var(--r)] border border-border bg-muted-bg/40 p-4">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-2">
              Insertion Order
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <TermCell label="Ad Size" value={row.adSize ?? "—"} />
              <TermCell label="Frequency" value={row.frequency ?? "—"} />
              <TermCell label="Ad Rate" value={formatMoney(row.adRate)} />
              <TermCell label="Sign Date" value={formatDate(row.signDate)} />
              <TermCell label="Start" value={formatDate(row.startDate)} />
              <TermCell label="Expiration" value={formatDate(row.expDate)} />
              <TermCell
                label="Renewal Notice Due"
                value={formatDate(row.renewalNoticeDate)}
              />
              <TermCell
                label="Payment"
                value={row.paymentMode ? row.paymentMode.charAt(0).toUpperCase() + row.paymentMode.slice(1) : "—"}
              />
            </div>
          </section>

          {/* Billing (if any) */}
          {(row.billingName || row.billingEmail) && (
            <section className="mb-6">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-2">
                Billing Contact
              </div>
              <div className="text-[13px] text-text">{row.billingName}</div>
              <div className="text-[12px] text-text-2">{row.billingEmail}</div>
            </section>
          )}

          {/* e-Blast add-ons (if any) */}
          {(row.eblastPackages as string[] | null)?.length ? (
            <section className="mb-6">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-2">
                e-Blast Add-ons
              </div>
              <ul className="list-disc pl-5 text-[12.5px] text-text">
                {(row.eblastPackages as string[]).map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Notes */}
          <section className="mb-8">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-2">
              Notes
            </div>
            {row.notes ? (
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text">
                {row.notes}
              </p>
            ) : (
              <p className="text-[12.5px] italic text-text-3">
                (No additional notes.)
              </p>
            )}
          </section>

          {/* Signature block */}
          <section className="grid grid-cols-1 gap-10 border-t border-border pt-8 sm:grid-cols-2">
            <SignatureLine role="Publisher signature" name={row.orgName ?? ""} />
            <SignatureLine
              role="Advertiser signature"
              name={advertiserDisplayName}
            />
          </section>

          <footer className="mt-10 text-center text-[10.5px] text-text-3">
            {row.orgName} · Agreement #{row.id.slice(0, 8).toUpperCase()}
          </footer>
        </article>

        {/* Terms of Agreement — on its own page when printing */}
        <article className="page-break rounded-[var(--rlg)] border border-border bg-card p-10 shadow-[var(--sh-xs)]">
          <h2 className="mb-4 text-[15px] font-bold uppercase tracking-wider text-text">
            Terms of Agreement
          </h2>
          <pre className="whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed text-text-2">
            {terms}
          </pre>
        </article>

        {/* Attachments (and the legacy single-file slot) */}
        {(attachments.length > 0 || row.signedDocument) && (
          <div className="rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)]">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-text-2">
              Attached documents
            </div>
            <div className="space-y-4">
              {attachments.map((a) => (
                <AttachmentView key={a.id} {...a} />
              ))}
              {row.signedDocument && !attachments.length && (
                <AttachmentView
                  id="legacy"
                  filename={`signed-${row.id}`}
                  mimeType={
                    row.signedDocument.startsWith("data:application/pdf")
                      ? "application/pdf"
                      : row.signedDocument.startsWith("data:image/")
                        ? "image/*"
                        : null
                  }
                  dataUrl={row.signedDocument}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function TermCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-2">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] font-medium text-text">{value}</div>
    </div>
  );
}

function SignatureLine({ role, name }: { role: string; name: string }) {
  return (
    <div>
      <div className="mb-1 h-8 border-b border-text" />
      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-2">
        {role}
      </div>
      <div className="mt-0.5 text-[12.5px] text-text">{name}</div>
      <div className="mt-1 flex items-end gap-3 text-[11px] text-text-3">
        <div className="h-4 flex-1 border-b border-border" />
        <span>Date</span>
      </div>
    </div>
  );
}

function AttachmentView({
  filename,
  mimeType,
  dataUrl,
}: {
  id: string;
  filename: string;
  mimeType: string | null;
  dataUrl: string | null;
}) {
  if (!dataUrl) return null;
  if (mimeType?.startsWith("application/pdf") || dataUrl.startsWith("data:application/pdf")) {
    return (
      <div>
        <div className="mb-1 text-[11.5px] text-text-2">{filename}</div>
        <object
          data={dataUrl}
          type="application/pdf"
          className="h-[600px] w-full rounded-[var(--r)] border border-border"
        >
          <a href={dataUrl} download={filename} className="text-[13px] font-medium text-pb-navy hover:underline">
            Download PDF
          </a>
        </object>
      </div>
    );
  }
  if (mimeType?.startsWith("image/") || dataUrl.startsWith("data:image/")) {
    return (
      <div>
        <div className="mb-1 text-[11.5px] text-text-2">{filename}</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt={filename}
          className="w-full rounded-[var(--r)] border border-border"
        />
      </div>
    );
  }
  return (
    <a
      href={dataUrl}
      download={filename}
      className="inline-flex items-center gap-2 text-[13px] font-medium text-pb-navy hover:underline"
    >
      📎 {filename}
    </a>
  );
}
