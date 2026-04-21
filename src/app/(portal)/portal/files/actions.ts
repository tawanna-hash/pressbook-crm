"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { portalFiles } from "@/lib/db/schema";
import { getPortalContext } from "@/lib/auth/portal-context";

export type UploadResult = {
  ok: boolean;
  message: string;
};

const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadPortalFile(
  formData: FormData,
): Promise<UploadResult> {
  const ctx = await getPortalContext();
  if (ctx.role !== "client" && ctx.role !== "staff") {
    return { ok: false, message: "Not authorized." };
  }

  const file = formData.get("file") as File | null;
  if (!file || !file.name) {
    return { ok: false, message: "No file selected." };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      message: `File is too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).`,
    };
  }

  const rawContactId = (formData.get("contactId") as string | null) ?? null;
  let contactId: string | null;
  if (ctx.role === "client") {
    contactId = ctx.contact.id;
  } else {
    contactId = rawContactId && rawContactId !== "all" ? rawContactId : null;
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  const url = `data:${mimeType};base64,${buf.toString("base64")}`;

  await db.insert(portalFiles).values({
    orgId: ctx.org.id,
    contactId,
    name: file.name,
    url,
    mimeType,
    sizeBytes: file.size,
    uploadedByUserId: ctx.role === "staff" ? ctx.user.id : null,
    uploadedByContactId: ctx.role === "client" ? ctx.contact.id : null,
  });

  revalidatePath("/portal/files");
  return { ok: true, message: `Uploaded ${file.name}.` };
}

export async function deletePortalFile(id: string): Promise<UploadResult> {
  const ctx = await getPortalContext();
  if (ctx.role !== "client" && ctx.role !== "staff") {
    return { ok: false, message: "Not authorized." };
  }

  const whereClause =
    ctx.role === "staff"
      ? and(eq(portalFiles.id, id), eq(portalFiles.orgId, ctx.org.id))
      : and(
          eq(portalFiles.id, id),
          eq(portalFiles.orgId, ctx.org.id),
          eq(portalFiles.uploadedByContactId, ctx.contact.id),
        );

  await db.delete(portalFiles).where(whereClause);
  revalidatePath("/portal/files");
  return { ok: true, message: "File deleted." };
}
