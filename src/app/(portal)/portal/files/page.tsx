import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { Download, FileText, User } from "lucide-react";
import { db } from "@/lib/db";
import { contacts, portalFiles, users } from "@/lib/db/schema";
import { getPortalContext } from "@/lib/auth/portal-context";
import { UploadButton } from "./upload-button";
import { DeletePortalFileButton } from "./delete-button";

export const dynamic = "force-dynamic";

function formatBytes(n: number | null | undefined): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PortalFilesPage() {
  const ctx = await getPortalContext();
  if (ctx.role !== "client" && ctx.role !== "staff") return null;

  const whereClause =
    ctx.role === "client"
      ? and(
          eq(portalFiles.orgId, ctx.org.id),
          or(
            eq(portalFiles.contactId, ctx.contact.id),
            isNull(portalFiles.contactId),
          ),
        )
      : eq(portalFiles.orgId, ctx.org.id);

  const rows = await db
    .select({
      id: portalFiles.id,
      name: portalFiles.name,
      url: portalFiles.url,
      mimeType: portalFiles.mimeType,
      sizeBytes: portalFiles.sizeBytes,
      createdAt: portalFiles.createdAt,
      contactId: portalFiles.contactId,
      uploadedByUserId: portalFiles.uploadedByUserId,
      uploadedByContactId: portalFiles.uploadedByContactId,
      uploaderStaffName: users.name,
      uploaderClientFirst: contacts.firstName,
      uploaderClientLast: contacts.lastName,
    })
    .from(portalFiles)
    .leftJoin(users, eq(users.id, portalFiles.uploadedByUserId))
    .leftJoin(contacts, eq(contacts.id, portalFiles.uploadedByContactId))
    .where(whereClause)
    .orderBy(desc(portalFiles.createdAt))
    .limit(500);

  const clientOptions =
    ctx.role === "staff"
      ? await db
          .select({
            id: contacts.id,
            firstName: contacts.firstName,
            lastName: contacts.lastName,
            company: contacts.company,
          })
          .from(contacts)
          .where(and(
            eq(contacts.orgId, ctx.org.id),
            eq(contacts.type, "client"),
          ))
          .orderBy(asc(contacts.firstName))
      : [];

  const clientList = clientOptions.map((c) => ({
    id: c.id,
    name:
      [c.firstName, c.lastName].filter(Boolean).join(" ") +
      (c.company ? ` — ${c.company}` : ""),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Files</h1>
          <p className="mt-1 text-sm text-muted">
            {ctx.role === "client"
              ? "Files shared with you, and files you've shared with your agency."
              : "Every file in the portal — upload new ones or share with specific clients."}
          </p>
        </div>
        <UploadButton role={ctx.role} clientOptions={clientList} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-sm">
          <FileText className="mx-auto mb-3 h-7 w-7 text-muted" />
          <p className="text-sm text-muted">No files yet. Upload one to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[#FAFBFC] text-[10px] uppercase tracking-wider text-muted">
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Shared with</th>
                <th className="px-4 py-3 text-left font-semibold">Uploaded by</th>
                <th className="px-4 py-3 text-right font-semibold">Size</th>
                <th className="px-4 py-3 text-left font-semibold">Added</th>
                <th className="w-10 px-2 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((f) => {
                const uploader =
                  f.uploaderStaffName ??
                  ([f.uploaderClientFirst, f.uploaderClientLast].filter(Boolean).join(" ") || "—");
                const scope = f.contactId ? "Private" : "All clients";
                return (
                  <tr key={f.id} className="hover:bg-[#FAFBFC]">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <a
                        href={f.url}
                        download={f.name}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 hover:text-pb-navy hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted" />
                        {f.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted">{scope}</td>
                    <td className="px-4 py-3 text-muted">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {uploader}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted">
                      {formatBytes(f.sizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(f.createdAt)}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={f.url}
                          download={f.name}
                          aria-label="Download"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-[#F3F4F6] hover:text-foreground"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        {(ctx.role === "staff" ||
                          (ctx.role === "client" && f.uploadedByContactId === ctx.contact.id)) && (
                          <DeletePortalFileButton id={f.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
